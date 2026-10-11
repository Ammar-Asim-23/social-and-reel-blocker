import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SerialQueue } from '../src/serialQueue';

test('rapid mutations run in order and see the previous committed value', async () => {
  const q = new SerialQueue();
  let value = 0;
  const first = q.run(async () => {
    await new Promise((resolve) => setTimeout(resolve, 15));
    value = 10;
  });
  const second = q.run(async () => {
    value += 5;
    return value;
  });
  await first;
  assert.equal(await second, 15);
});
test('a rejected mutation does not poison later operations', async () => {
  const q = new SerialQueue();
  await assert.rejects(
    q.run(async () => {
      throw new Error('Storage unavailable');
    }),
  );
  assert.equal(await q.run(async () => 'recovered'), 'recovered');
});
