import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { createStartupCheck } from './startup-check.mjs';

test('startup dependency retries stop after a finite budget', async () => {
  let attempts = 0;
  const changes = [];
  const check = createStartupCheck({
    check: async () => { attempts += 1; throw new Error('Unavailable test dependency'); },
    onChange: (state) => changes.push(state),
    retryDelays: [5, 5],
  });
  await check.start();
  const deadline = Date.now() + 1000;
  while (attempts < 3 && Date.now() < deadline) await delay(10);
  await delay(20);
  assert.equal(attempts, 3);
  assert.equal(changes.length, 3);
  assert.equal(check.snapshot().status, 'unavailable');
  assert.equal(check.snapshot().nextRetryAt, null);
  check.stop();
});

test('shutdown cancels a scheduled dependency retry and ignores late checks', async () => {
  let finish;
  const changes = [];
  const check = createStartupCheck({
    check: () => new Promise((resolve) => { finish = resolve; }),
    onChange: (state) => changes.push(state),
    retryDelays: [5],
  });
  const pending = check.start();
  check.stop();
  finish({ entries: [] });
  await pending;
  await delay(15);
  assert.deepEqual(changes, []);

  let attempts = 0;
  const retrying = createStartupCheck({
    check: async () => { attempts += 1; throw new Error('Unavailable test dependency'); },
    onChange() {}, retryDelays: [20],
  });
  await retrying.start();
  retrying.stop();
  await delay(40);
  assert.equal(attempts, 1);
});
