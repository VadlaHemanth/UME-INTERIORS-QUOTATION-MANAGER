import type { StudioCatalogue } from './catalogue';

export type CompanySettings = StudioCatalogue['company'];
export type CompanySettingsValidation = {
  valid: boolean;
  errors: Record<string, string>;
  company?: CompanySettings;
};

/** Keep unsaved edits to rates or instructions when other catalogue settings are saved. */
export function syncCatalogueDraft(previousSaved: StudioCatalogue, incoming: StudioCatalogue, localDraft: StudioCatalogue): StudioCatalogue {
  const unchanged = (before: unknown, after: unknown) => JSON.stringify(before) === JSON.stringify(after);
  const next = structuredClone(incoming);
  for (const [key, work] of Object.entries(localDraft.workTypes)) {
    if (unchanged(previousSaved.workTypes[key], incoming.workTypes[key])) {
      next.workTypes[key] = structuredClone(work);
    }
  }
  if (unchanged(previousSaved.assistantLessons,incoming.assistantLessons)) {
    next.assistantLessons = structuredClone(localDraft.assistantLessons);
  }
  return next;
}

/** Accept a website address with or without its http(s) prefix. */
export function companyWebsiteUrl(value: string): string | undefined {
  const address = value.trim();
  if (!address || /\s/.test(address)) return undefined;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(address) ? address : `https://${address}`);
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

/** Format checks only: bank and UPI ownership still need to be checked by the owner. */
export function validateCompanySettings(value: unknown): CompanySettingsValidation {
  const errors: Record<string, string> = {};
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  const rawBank = source.bank;
  const bank = rawBank && typeof rawBank === 'object' && !Array.isArray(rawBank)
    ? rawBank as Record<string, unknown> : {};
  const read = (key: string, label: string, required = true, max = 240, record = source, prefix = '') => {
    const input = record[key];
    const path = `${prefix}${key}`;
    if (typeof input !== 'string') {
      errors[path] = `Enter ${label}.`;
      return '';
    }
    const text = input.trim();
    if (required && !text) errors[path] = `Enter ${label}.`;
    else if (text.length > max) errors[path] = `Keep ${label} within ${max} characters.`;
    else if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) errors[path] = `Remove unsupported characters from ${label}.`;
    return text;
  };
  const company: CompanySettings = {
    brandName: read('brandName', 'your display business name'),
    legalName: read('legalName', 'your legal business name'),
    subtitle: read('subtitle', 'your business description', false),
    proprietor: read('proprietor', 'the proprietor’s name'),
    phone: read('phone', 'your contact number', true, 64),
    whatsapp: read('whatsapp', 'your WhatsApp number', true, 64),
    address: read('address', 'your business address', true, 1000),
    domain: read('domain', 'your website address', false, 500),
    bank: {
      bankName: read('bankName', 'your bank name', true, 240, bank, 'bank.'),
      accountName: read('accountName', 'the account holder name', true, 240, bank, 'bank.'),
      accountNumber: read('accountNumber', 'your account number', true, 64, bank, 'bank.'),
      ifsc: read('ifsc', 'your IFSC', true, 11, bank, 'bank.').toUpperCase(),
      branch: read('branch', 'your bank branch', false, 240, bank, 'bank.'),
      upiId: read('upiId', 'your UPI ID', true, 128, bank, 'bank.'),
      upiLimitRupees: typeof bank.upiLimitRupees === 'number' ? bank.upiLimitRupees : Number.NaN,
    },
  };

  for (const [key, label] of [['phone', 'contact number'], ['whatsapp', 'WhatsApp number']] as const) {
    const number = company[key];
    const digits = number.replace(/\D/g, '');
    if (number && (!/^\+?[\d\s().-]+$/.test(number) || digits.length < 7 || digits.length > 15)) {
      errors[key] = `Enter a valid ${label} with its country code.`;
    }
  }
  company.whatsapp = company.whatsapp.replace(/\D/g, '');
  if (company.whatsapp && (!/^[1-9]\d{10,14}$/.test(company.whatsapp))) errors.whatsapp = 'Include the country code, for example 919491661555 (91 for India).';
  if (company.domain && !companyWebsiteUrl(company.domain)) errors.domain = 'Enter a website address such as umeinteriors.com or https://umeinteriors.com.';
  if (company.bank.accountNumber && !/^[a-z\d][a-z\d -]*$/i.test(company.bank.accountNumber)) errors['bank.accountNumber'] = 'Use letters, digits, spaces or hyphens for the account number.';
  if (company.bank.ifsc && !/^[A-Z]{4}0[A-Z\d]{6}$/.test(company.bank.ifsc)) errors['bank.ifsc'] = 'Enter the 11-character IFSC shown by your bank.';
  if (company.bank.upiId && !/^[a-z\d][a-z\d._-]*@[a-z\d][a-z\d.-]*$/i.test(company.bank.upiId)) errors['bank.upiId'] = 'Enter a UPI ID such as name@bank.';
  if (!Number.isSafeInteger(company.bank.upiLimitRupees) || company.bank.upiLimitRupees <= 0) errors['bank.upiLimitRupees'] = 'Enter a whole rupee amount greater than zero.';

  const valid = Object.keys(errors).length === 0;
  return valid ? { valid, errors, company } : { valid, errors };
}
