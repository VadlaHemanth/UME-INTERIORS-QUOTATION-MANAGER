import test from 'node:test';
import assert from 'node:assert/strict';
import { sharePaymentImage } from './payment-image-share';

const screenshot = () => new File([new Uint8Array([137,80,78,71,13,10,26,10])], 'camera-file', { type: 'image/png' });

test('payment sharing passes the actual image without text or links, and starts within the tap', async () => {
  const original = screenshot();
  let attached: File | undefined;
  let invoked = false;
  const operation = sharePaymentImage(original, 'UME/2026 1024', {
    canShare(data) { return Boolean(data?.files?.length); },
    async share(data) {
      invoked = true;
      assert.deepEqual(Object.keys(data!), ['files']);
      attached = data!.files![0];
    },
  }, true);
  assert.equal(invoked, true, 'file sharing must begin before any asynchronous saving or conversion');
  assert.equal(await operation, 'shared');
  assert.equal(attached!.name, 'UME-payment-UME-2026-1024.png');
  assert.equal(attached!.type, 'image/png');
  assert.deepEqual(await attached!.arrayBuffer(), await original.arrayBuffer());
});

test('unavailable or insecure sharing never falls back to sending a text-only message', async () => {
  let invoked = false;
  const api = { canShare: () => false, share: async () => { invoked = true; } };
  assert.equal(await sharePaymentImage(screenshot(), 'Q', api, true), 'unsupported');
  assert.equal(await sharePaymentImage(screenshot(), 'Q', api, false), 'insecure');
  assert.equal(await sharePaymentImage(screenshot(), 'Q', {}, true), 'unsupported');
  assert.equal(invoked, false);
});

test('share cancellation and target-app rejection are handled separately without claiming delivery', async () => {
  assert.equal(await sharePaymentImage(screenshot(), 'Q', { share: async () => { throw new DOMException('Cancelled', 'AbortError'); } }, true), 'cancelled');
  assert.equal(await sharePaymentImage(screenshot(), 'Q', { share: async () => { throw new DOMException('Blocked', 'NotAllowedError'); } }, true), 'failed');
  assert.equal(await sharePaymentImage(screenshot(), 'Q', { canShare: () => { throw new TypeError('Unsupported data'); }, share: async () => {} }, true), 'failed');
});
