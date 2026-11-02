import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import jsQR from 'jsqr';
import { DeterministicQrCode } from '../components/BrandMark';

function scanRenderedQr(value: string): string | undefined {
  const svg = renderToStaticMarkup(<DeterministicQrCode value={value} label="Scan test" />);
  const viewSize = Number(/viewBox="0 0 (\d+) \d+"/.exec(svg)?.[1]);
  assert.ok(viewSize > 21, 'renderer must include the QR quiet zone');
  const scale = 8;
  const width = viewSize * scale;
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
  const path = /<path d="([^"]+)"/.exec(svg)?.[1] || '';
  const modules = [...path.matchAll(/M(\d+),(\d+)h1v1h-1z/g)];
  assert.ok(modules.length > 100, 'renderer must output encoded modules');
  for (const [, column, row] of modules) {
    const x = Number(column), y = Number(row);
    assert.ok(x >= 4 && y >= 4 && x < viewSize - 4 && y < viewSize - 4,
      'four-module quiet zone must remain clear');
    for (let dy = 0; dy < scale; dy++) {
      for (let dx = 0; dx < scale; dx++) {
        const offset = ((y * scale + dy) * width + x * scale + dx) * 4;
        pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
      }
    }
  }
  return jsQR(pixels, width, width)?.data;
}

test('the actual rendered payment QR scans to the approved UPI recipient and booking amount', () => {
  const payload = `upi://pay?${new URLSearchParams({
    pa: '9177389543@oksbi', pn: 'UMAMAHESHWARA ENTERPRISES / V. SUBHASH',
    am: '50000', cu: 'INR', tn: 'Booking UME-2026-1042',
  })}`;
  const decoded = scanRenderedQr(payload);
  assert.equal(decoded, payload);
  const url = new URL(decoded!);
  assert.equal(url.searchParams.get('pa'), '9177389543@oksbi');
  assert.equal(url.searchParams.get('am'), '50000');
  assert.equal(url.searchParams.get('cu'), 'INR');
});

test('online quotation QR scans to its exact private URL', () => {
  const url = 'https://ume-interiors.workers.dev/q/ume1a2b3c4d5e6f1234567890abcdef1234';
  assert.equal(scanRenderedQr(url), url);
});
