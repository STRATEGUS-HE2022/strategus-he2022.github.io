import assert from 'node:assert/strict';
import { test } from 'node:test';
import { comparePeople, familyName } from '../src/lib/people.ts';

const person = (id, order) => ({ id, data: { name: id, order } });

test('familyName is the last token', () => {
  assert.equal(familyName('Franco Fummi'), 'Fummi');
  assert.equal(familyName("Nicola Dall'Ora"), "Dall'Ora");
});

test('comparePeople orders by order, then family name, then full name', () => {
  const list = [person('Zed Alpha', 100), person('Ann Beta', 1), person('Bob Alpha', 100)];
  assert.deepEqual(list.sort(comparePeople).map((p) => p.id), ['Ann Beta', 'Bob Alpha', 'Zed Alpha']);
  const noOrder = [person('B B', undefined), person('A A', 50)];
  assert.deepEqual(noOrder.sort(comparePeople).map((p) => p.id), ['A A', 'B B'], 'a missing order defaults to 100');
});
