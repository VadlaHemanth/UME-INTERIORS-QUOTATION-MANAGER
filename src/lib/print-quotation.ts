/** Prepare the same A4 pages shown in the preview before native printing. */
export async function printQuotation(): Promise<void> {
  window.dispatchEvent(new Event('ume:prepare-print'));
  await document.fonts.ready;
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  window.print();
}
