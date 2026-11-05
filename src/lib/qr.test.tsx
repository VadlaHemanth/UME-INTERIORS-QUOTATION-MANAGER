import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import jsQR from 'jsqr';
import { DeterministicQrCode } from '../components/BrandMark';
import { DEFAULT_UME_CATALOGUE } from './catalogue';
import { VIDYA_SAGAR_REDDY_DRAFT } from './historicalData';
import { calculateQuotationPricing } from './pricing';

function scanRenderedSvgQr(svg: string): string | undefined {
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

function scanRenderedQr(value: string): string | undefined {
  return scanRenderedSvgQr(renderToStaticMarkup(<DeterministicQrCode value={value} label="Scan test" />));
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


test('the PDF booking QR uses the edited bank recipient and the actual quotation booking amount', async () => {
  // Native PDF styles are irrelevant to encoding; load the real component with only CSS imports omitted.
  const stylesheetHook = registerHooks({
    load(url, context, nextLoad) {
      return url.endsWith('.css')
        ? { format: 'module', source: '', shortCircuit: true }
        : nextLoad(url, context);
    },
  });
  try {
    const { PrintableA4Sheet } = await import('../components/PrintableA4Sheet');
    const catalogue = structuredClone(DEFAULT_UME_CATALOGUE);
    catalogue.company.bank.upiId = 'edited.payments@bank';
    catalogue.company.bank.accountName = 'Edited Interior Account / Test Recipient';
    const draft = structuredClone(VIDYA_SAGAR_REDDY_DRAFT);
    draft.quote.notes=[];draft.owner_requests=[];
    catalogue.materialWording={materialsAndLabour:'Materials and installation labour are included.',externalLaminate:'Approved external laminate finish.',internalLaminate:'Approved internal liner finish.',handles:'Included handles'};
    draft.quote.number = 'UME-TEST-EDITED-BANK';
    const snapshot = calculateQuotationPricing(draft, catalogue);
    const html = renderToStaticMarkup(<PrintableA4Sheet
      publicId="edited-bank-quote" revision={1} draft={draft} snapshot={snapshot} catalogue={catalogue}
      wholeHomeSelection={{ grade: 'Premium', protection: 'Standard', finish: 'High Gloss', brand_preference: null }}
      mixByRoom={false} roomSelections={{}} selectedOptionalPointers={[]}
      approvedDiscountRupees={0} verifiedPaidRupees={0}
    />);
    const svg = /<svg\b[^>]*\baria-label="UPI booking"[^>]*>[\s\S]*?<\/svg>/.exec(html)?.[0];
    assert.match(html,/Basic ₹4,000 each; Standard ₹5,000 each; Premium ₹6,000 each/);
    assert.match(html,/Materials and installation labour are included/);
    assert.match(html,/Approved external laminate finish/);
    assert.match(html,/Fevicol and Jeevanjor/);
    assert.match(html,/Up to 15 years plywood warranty/);
    assert.match(html,/Up to 30 years plywood warranty/);
    assert.match(html,/For UME INTERIORS \(Umamaheshwara Enterprises\)/);
    assert.doesNotMatch(html,/Fevicol Marine|Jivanjor|\bSH\b/);
    assert.ok(svg, 'the real PDF source markup must contain its booking QR');
    const decoded = scanRenderedSvgQr(svg);
    assert.ok(decoded, 'the actual PDF booking QR must be scannable');
    const url = new URL(decoded);
    assert.equal(url.protocol, 'upi:');
    assert.equal(url.hostname, 'pay');
    assert.equal(url.searchParams.get('pa'), 'edited.payments@bank');
    assert.equal(url.searchParams.get('pn'), 'Edited Interior Account / Test Recipient');
    assert.equal(url.searchParams.get('am'), '50000');
    assert.equal(url.searchParams.get('cu'), 'INR');
    assert.equal(url.searchParams.get('tn'), 'Booking UME-TEST-EDITED-BANK');
    assert.notEqual(url.searchParams.get('pa'), DEFAULT_UME_CATALOGUE.company.bank.upiId);
    assert.notEqual(url.searchParams.get('pn'), DEFAULT_UME_CATALOGUE.company.bank.accountName);
    const preview = renderToStaticMarkup(<PrintableA4Sheet
      isPreview publicId="preview" revision={1} draft={draft} snapshot={snapshot} catalogue={catalogue}
      wholeHomeSelection={{grade:'Base',protection:'Standard',finish:'SF',brand_preference:null}}
      mixByRoom={false} roomSelections={{}} selectedOptionalPointers={[]} approvedDiscountRupees={0} verifiedPaidRupees={0}
    />);
    assert.doesNotMatch(preview,/aria-label="UPI booking"/);
    assert.doesNotMatch(preview,/aria-label="Online quotation"/);
    assert.match(preview,/Unpublished preview/);
  } finally {
    stylesheetHook.deregister();
  }
});
