import test from 'node:test';
import assert from 'node:assert/strict';
import {quotationFileName} from './document-filename';

test('PDF names start with customer and quotation number, with a distinct work-order suffix',()=>{
  assert.equal(quotationFileName('K. Vidya Sagar Reddy','UME-26-0015'),'K. Vidya Sagar Reddy - UME-26-0015');
  assert.equal(quotationFileName('Anita Rao','UME-26-0015',true),'Anita Rao - UME-26-0015 - Work Order');
  assert.equal(quotationFileName(null,null),'Customer - Quotation Preview');
  assert.equal(quotationFileName('  A/B: C*?  ','UME/26:0015'),'A B C - UME 26 0015');
  assert.doesNotMatch(quotationFileName('Name\u202e/\n'.repeat(100),'X'.repeat(120)),/[<>:"/\\|?*\p{Cc}\p{Cf}]/u);
  assert.ok(quotationFileName('A'.repeat(500),'B'.repeat(500),true).length<190);
});
