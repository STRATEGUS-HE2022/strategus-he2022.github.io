#!/usr/bin/env node
/**
 * Remove metadata from an image without touching a single pixel.
 *
 *   node scripts/strip-image-metadata.mjs [--check] <file…>
 *
 * Every photograph that enters this repository must carry no EXIF, GPS, IPTC or XMP
 * data (see docs/team.md). This tool rewrites the container and drops the
 * metadata segments; the compressed image data is copied byte for byte, so there is
 * no re-encoding and no quality loss.
 *
 * Kept on purpose: JFIF/JFXX headers, ICC colour profiles and the Adobe colour
 * transform marker (needed to render the colours correctly), and the PNG colour
 * chunks. Dropped: EXIF (incl. GPS), IPTC/Photoshop, XMP, comments, timestamps.
 *
 * `--check` reports what would be dropped and exits 1 if anything would be, so it
 * can be used as a gate. No dependencies — plain Node, works everywhere npm works.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** JPEG APPn/COM segments that must survive: colour management, not metadata. */
function keepJpegSegment(marker, payload) {
  if (marker === 0xe0) return true; // APP0 — JFIF / JFXX
  if (marker === 0xe2 && payload.subarray(0, 11).toString('latin1') === 'ICC_PROFILE') return true;
  if (marker === 0xee && payload.subarray(0, 5).toString('latin1') === 'Adobe') return true;
  return false;
}

function jpegSegmentName(marker, payload) {
  const tag = payload.subarray(0, 32).toString('latin1').split('\0')[0];
  if (marker === 0xfe) return 'comment';
  if (marker === 0xe1 && tag.startsWith('Exif')) return 'EXIF';
  if (marker === 0xe1 && tag.startsWith('http://ns.adobe')) return 'XMP';
  if (marker === 0xed) return 'IPTC/Photoshop';
  return `APP${marker - 0xe0}`;
}

/** Rewrite a JPEG without its metadata segments. */
function stripJpeg(buf) {
  if (buf.readUInt16BE(0) !== 0xffd8) throw new Error('not a JPEG (no SOI marker)');
  const out = [buf.subarray(0, 2)];
  const dropped = [];
  let i = 2;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) throw new Error(`malformed JPEG: expected a marker at byte ${i}`);
    const marker = buf[i + 1];
    // Stand-alone markers carry no length field.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      out.push(buf.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (marker === 0xd9) break; // EOI
    const length = buf.readUInt16BE(i + 2);
    const end = i + 2 + length;
    if (marker === 0xda) {
      // Start of scan: the entropy-coded data follows, copy the rest verbatim.
      out.push(buf.subarray(i));
      i = buf.length;
      break;
    }
    const isMetadata = marker === 0xfe || (marker >= 0xe1 && marker <= 0xef);
    const payload = buf.subarray(i + 4, end);
    if (isMetadata && !keepJpegSegment(marker, payload)) {
      dropped.push(`${jpegSegmentName(marker, payload)} (${length + 2} B)`);
    } else {
      out.push(buf.subarray(i, end));
    }
    i = end;
  }
  if (i < buf.length) out.push(buf.subarray(i));
  return { data: Buffer.concat(out), dropped };
}

/** PNG ancillary chunks that carry metadata rather than colour information. */
const PNG_METADATA_CHUNKS = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);

function stripPng(buf) {
  const out = [buf.subarray(0, 8)];
  const dropped = [];
  let i = 8;
  while (i + 8 <= buf.length) {
    const length = buf.readUInt32BE(i);
    const type = buf.subarray(i + 4, i + 8).toString('latin1');
    const end = i + 12 + length;
    if (PNG_METADATA_CHUNKS.has(type)) dropped.push(`${type} (${length} B)`);
    else out.push(buf.subarray(i, end));
    i = end;
    if (type === 'IEND') break;
  }
  return { data: Buffer.concat(out), dropped };
}

/** WebP metadata lives in RIFF chunks plus two flag bits in VP8X. */
function stripWebp(buf) {
  const chunks = [];
  const dropped = [];
  let i = 12; // 'RIFF' + size + 'WEBP'
  while (i + 8 <= buf.length) {
    const fourcc = buf.subarray(i, i + 4).toString('latin1');
    const size = buf.readUInt32LE(i + 4);
    const end = i + 8 + size + (size % 2); // chunks are padded to an even length
    if (fourcc === 'EXIF' || fourcc === 'XMP ') {
      dropped.push(`${fourcc.trim()} (${size} B)`);
    } else if (fourcc === 'VP8X') {
      const chunk = Buffer.from(buf.subarray(i, end));
      const flags = chunk[8];
      const cleared = flags & ~0x0c; // bit 0x08 = EXIF present, 0x04 = XMP present
      if (cleared !== flags) dropped.push('VP8X metadata flags');
      chunk[8] = cleared;
      chunks.push(chunk);
    } else {
      chunks.push(buf.subarray(i, end));
    }
    i = end;
  }
  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(body.length + 4, 4);
  header.write('WEBP', 8, 'latin1');
  return { data: Buffer.concat([header, body]), dropped };
}

const STRIPPERS = { '.jpg': stripJpeg, '.jpeg': stripJpeg, '.png': stripPng, '.webp': stripWebp };

/** Strip `buffer`, dispatching on the file extension. Exported for the unit tests. */
export function stripImageMetadata(buffer, extension) {
  const strip = STRIPPERS[extension.toLowerCase()];
  if (!strip) throw new Error(`unsupported image type "${extension}" (use .jpg, .jpeg, .png or .webp)`);
  return strip(buffer);
}

// --- Command line ---------------------------------------------------------------
const args = process.argv.slice(2);
const check = args.includes('--check');
const files = args.filter((a) => !a.startsWith('--'));

if (import.meta.url === `file://${process.argv[1]}`) {
  if (files.length === 0) {
    console.error('usage: node scripts/strip-image-metadata.mjs [--check] <file…>');
    process.exit(2);
  }
  let found = 0;
  for (const file of files) {
    const before = readFileSync(file);
    const { data, dropped } = stripImageMetadata(before, path.extname(file));
    if (dropped.length === 0) {
      console.log(`✓ ${file}: no metadata`);
      continue;
    }
    found++;
    if (check) {
      console.error(`✗ ${file}: ${dropped.join(', ')}`);
    } else {
      writeFileSync(file, data);
      console.log(`✓ ${file}: removed ${dropped.join(', ')} (${before.length} → ${data.length} B, pixels unchanged)`);
    }
  }
  if (check && found > 0) {
    console.error(`\n${found} file(s) still carry metadata — run without --check to remove it.`);
    process.exit(1);
  }
}
