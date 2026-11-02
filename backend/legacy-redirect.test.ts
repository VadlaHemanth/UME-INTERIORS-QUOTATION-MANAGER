import test from 'node:test';
import assert from 'node:assert/strict';
import redirect from '../worker/legacy-redirect';

test('old customer links preserve their exact path and package selection on the renamed Worker', async () => {
  for (const method of ['GET', 'HEAD']) {
    const response = await redirect.fetch(new Request('https://ume-interiors-quotation-studio.umeinteriors.workers.dev/q/private-token?pkg=standard', { method }));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), 'https://quotation.umeinteriors.workers.dev/q/private-token?pkg=standard');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('stale old-host submissions are not forwarded to the new host', async () => {
  const response = await redirect.fetch(new Request('https://ume-interiors-quotation-studio.umeinteriors.workers.dev/api/studio/auth', { method: 'POST', body: 'private-credential' }));
  assert.equal(response.status, 409);
  assert.equal(response.headers.get('location'), null);
  assert.ok(!(await response.text()).includes('private-credential'));
});
