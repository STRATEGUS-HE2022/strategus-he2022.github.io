# Security

This repository is public and contains only publishable source content and static website
assets.

## Never commit

- credentials, tokens or environment files
- databases, dumps, archives or backups
- private contact information (the tests reject e-mail addresses and telephone numbers
  anywhere but the `email` field of a team member)
- photographs whose publication has not been approved by the person shown
- build output (`dist/`) or dependencies (`node_modules/`)

`npm run verify` (also run by CI) fails when such a file is tracked by Git or present in the
working tree, and when any tracked file exceeds 200 KB.

## If sensitive data is committed accidentally

Do not merely delete it in a later commit. Treat it as exposed, rotate any affected
credentials, and remove it from Git history before continuing publication.
