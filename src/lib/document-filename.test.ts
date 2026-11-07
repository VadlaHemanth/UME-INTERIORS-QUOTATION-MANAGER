import test from 'node:test';
import assert from 'node:assert/strict';
import {quotationFileName} from './document-filename';

test('PDF names start with document type, customer and quotation number',()=>{
  assert.equal(quotationFileName('K. Vidya Sagar Reddy','UME-26-0015'),'Quotation - K. Vidya Sagar Reddy - UME-26-0015');
  assert.equal(quotationFileName('Anita Rao','UME-26-0015',true),'Work Order - Anita Rao - UME-26-0015');
  assert.equal(quotationFileName(null,null),'Quotation - Customer - Preview');
  assert.equal(quotationFileName('  A/B: C*?  ','UME/26:0015'),'Quotation - A B C - UME 26 0015');
  assert.doesNotMatch(quotationFileName('Name\u202e/\n'.repeat(100),'X'.repeat(120)),/[<>:"/\\|?*\p{Cc}\p{Cf}]/u);
  assert.ok(quotationFileName('A'.repeat(500),'B'.repeat(500),true).length<190);
});
