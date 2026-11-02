export type PaymentImageShareResult = 'shared' | 'cancelled' | 'unsupported' | 'insecure' | 'failed';

type FileShareNavigator = Pick<Navigator, 'share' | 'canShare'>;

/** Invoke within the original tap. Sharing files alone keeps WhatsApp in image mode. */
export async function sharePaymentImage(
  image: File,
  quotationNumber: string,
  shareNavigator: Partial<FileShareNavigator>,
  secureContext: boolean,
): Promise<PaymentImageShareResult> {
  if (!secureContext) return 'insecure';
  if (!shareNavigator.share) return 'unsupported';
  const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[image.type];
  if (!extension || !image.size) return 'unsupported';
  const reference = quotationNumber.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64) || 'quotation';
  // Give the target app a predictable filename matching the image's MIME type.
  const file = new File([image], `UME-payment-${reference}.${extension}`, { type: image.type, lastModified: image.lastModified });
  const payload: ShareData = { files: [file] };
  try {
    if (shareNavigator.canShare && !shareNavigator.canShare(payload)) return 'unsupported';
    await shareNavigator.share(payload);
    return 'shared';
  } catch (error) {
    return (error as { name?: string })?.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
