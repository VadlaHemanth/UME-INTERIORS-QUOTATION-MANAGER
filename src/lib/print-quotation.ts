/** Prepare the same A4 pages shown in the preview before native printing. */
export async function printQuotation(): Promise<void> {
  window.dispatchEvent(new Event('ume:prepare-print'));
  await document.fonts.ready;
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const previousTitle = document.title;
  const title = Array.from(document.querySelectorAll<HTMLElement>('[data-document-title]')).find(element => element.getClientRects().length > 0)?.dataset.documentTitle;
  if (title) document.title = title;
  const restore = () => { document.title = previousTitle; window.removeEventListener('afterprint', restore); };
  window.addEventListener('afterprint', restore, {once:true});
  window.print();
}
