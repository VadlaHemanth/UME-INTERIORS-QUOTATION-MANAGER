/**
 * Shared v2 Dictation Schema, TypeScript Types, Unicode & Glossary Validator,
 * Romanised Telugu/Hindi Leak Detector, Placeholder Gate, and v1->v2 Migrator.
 */

import { validateAddonSuggestions } from './addon-suggestions';

export type InputLanguageCode = 'te' | 'hi' | 'en';
export type PlywoodGrade = 'Base' | 'Normal' | 'Premium';
export type ProtectionOption = 'Standard' | 'With PVC';
export type FinishOption = 'High Gloss' | 'SF';
export type BillableUnit = 'sq_ft' | 'running_ft' | 'each' | 'lumpsum';

export interface PackageSelection {
  grade: PlywoodGrade | null;
  protection: ProtectionOption | null;
  finish: FinishOption | null;
  brand_preference: string | null;
}

export interface ResolvedPackageSelection {
  grade: PlywoodGrade;
  protection: ProtectionOption;
  finish: FinishOption;
  brand_preference: string | null;
}

export interface CustomerInfo {
  name: string | null;
  site: string | null;
  phone: string | null;
}

export const MAX_QUOTATION_ESTIMATE_NOTE_LENGTH = 1000;

export interface QuoteMeta {
  number: string | null;
  date: string | null;
  valid_until: string | null;
  estimate_basis?: 'floor_plan' | 'site_measurement';
  estimate_note?: string | null;
}

export interface ItemMeasure {
  unit: BillableUnit | string | null;
  per_item: number | null;
}

export interface ItemPVC {
  eligible: boolean | null;
  parts: string[];
}

export interface ItemCustomRates {
  Base?: number;
  Normal?: number;
  Premium?: number;
  pvc_adder?: number;
}

export interface DraftItem {
  name: string | null;
  work_type: string | null;
  size_text: string | null;
  measure: ItemMeasure;
  quantity: number | null;
  pvc: ItemPVC;
  optional: boolean | null;
  source_text_en: string;
  custom_rates?: ItemCustomRates | null;
}

export interface DraftRoom {
  name: string | null;
  recommended: PackageSelection | null;
  items: DraftItem[];
}

export interface OwnerRequest {
  path: string;
  text: string;
}

export interface ClarificationItem {
  path: string;
  question: string;
}

export interface SuggestedAddon {
  room_index: number;
  reason: string;
  item: DraftItem;
}

export interface QuotationDraftV2 {
  schema_version: 'quotation-studio.draft.v2';
  output_language: 'en';
  is_demo: boolean;
  languages: InputLanguageCode[];
  customer: CustomerInfo;
  quote: QuoteMeta;
  recommended: PackageSelection | null;
  rooms: DraftRoom[];
  owner_requests: OwnerRequest[];
  needs_clarification: ClarificationItem[];
  rate_card_updates?: Record<string, any>;
  suggested_addons?: SuggestedAddon[];
}

export interface ValidationIssue {
  path: string;
  severity: 'error' | 'warning' | 'publish_blocker';
  code:
    | 'SCHEMA_MISMATCH'
    | 'NON_LATIN_SCRIPT'
    | 'UNTRANSLATED_ROMANISED_WORD'
    | 'PLACEHOLDER_TEXT'
    | 'MISSING_REQUIRED_FIELD'
    | 'UNRESOLVED_CLARIFICATION'
    | 'UNREVIEWED_OWNER_REQUEST'
    | 'DEMO_RECORD'
    | 'INVALID_DATE'
    | 'INVALID_POINTER'
    | 'INVALID_MEASUREMENT';
  message: string;
}

export interface ValidationResult {
  validForDraft: boolean;
  readyForPublish: boolean;
  issues: ValidationIssue[];
}

// Unicode Latin + Common + Inherited regex matching Appendix schema
const LATIN_SCRIPT_REGEX = /^[\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}\s]+$/u;

// JSON Pointer regex (root "" or "/segment/0/...")
const JSON_POINTER_REGEX = /^(?:\/(?:[^~/]|~[01])+)*$/;

// YYYY-MM-DD calendar date validation
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Common Romanised Telugu & Hindi carpentry words that must never leak into English v2 JSON
const ROMANISED_LEAK_WORDS: Record<string, string> = {
  rendu: 'two (2)',
  moodu: 'three (3)',
  nalugu: 'four (4)',
  aidu: 'five (5)',
  aaru: 'six (6)',
  okati: 'one (1)',
  okatinnara: '1.5',
  adugulu: 'feet (ft)',
  adugu: 'foot (ft)',
  angulalu: 'inches (in)',
  almara: 'wardrobe / cupboard',
  kabat: 'cupboard / cabinet',
  kitiki: 'window',
  vaakili: 'doorway / entrance',
  devudi: 'pooja',
  gadi: 'room',
  vantillu: 'kitchen',
  lopala: 'inside',
  bayata: 'outside',
  goda: 'wall',
  painunchi: 'from top',
  kindha: 'bottom / under',
  dedh: '1.5',
  dhai: '2.5',
  saadhe: 'plus half (.5)',
  kamra: 'room',
  rasoi: 'kitchen',
  darwaza: 'door',
  khidki: 'window',
  almari: 'wardrobe',
  deewar: 'wall',
  neeche: 'under / bottom',
  upar: 'above / top',
};

// Prohibited drafting placeholders on customer-facing fields
const PLACEHOLDER_PATTERNS: RegExp[] = [
  /\bapproval pending\b/i,
  /\bmanufacturer to be confirmed\b/i,
  /\bTBC\b/i,
  /\bTBD\b/i,
  /\blorem ipsum\b/i,
  /\bN\/A\b/i,
  /\bdummy\b/i,
  /\bXXX+\b/i,
  /\[[^\]]+\]/,
];

export function isValidCalendarDate(dateStr: string): boolean {
  if (!ISO_DATE_REGEX.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function detectUntranslatedTokens(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const found: string[] = [];
  for (const token of tokens) {
    if (ROMANISED_LEAK_WORDS[token]) {
      found.push(`"${token}" (translate to ${ROMANISED_LEAK_WORDS[token]})`);
    }
  }
  return Array.from(new Set(found));
}

export function detectPlaceholders(text: string): string | null {
  for (const pattern of PLACEHOLDER_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

export function validateQuotationDraftV2(
  draft: unknown,
  options: { reviewedOwnerRequests?: boolean } = {}
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!draft || typeof draft !== 'object') {
    return {
      validForDraft: false,
      readyForPublish: false,
      issues: [
        {
          path: '',
          severity: 'error',
          code: 'SCHEMA_MISMATCH',
          message: 'Root payload must be a JSON object.',
        },
      ],
    };
  }

  const d = draft as Partial<QuotationDraftV2>;

  if (d.schema_version !== 'quotation-studio.draft.v2') {
    issues.push({
      path: '/schema_version',
      severity: 'error',
      code: 'SCHEMA_MISMATCH',
      message: `Expected schema_version "quotation-studio.draft.v2", received "${String(d.schema_version)}".`,
    });
  }

  if (d.output_language !== 'en') {
    issues.push({
      path: '/output_language',
      severity: 'error',
      code: 'SCHEMA_MISMATCH',
      message: 'output_language must always be "en".',
    });
  }

  if (d.is_demo === true) {
    issues.push({
      path: '/is_demo',
      severity: 'publish_blocker',
      code: 'DEMO_RECORD',
      message: 'This job is marked is_demo=true. Practice/demo records cannot be published to a live customer link.',
    });
  }

  if (!Array.isArray(d.languages) || d.languages.length === 0) {
    issues.push({
      path: '/languages',
      severity: 'error',
      code: 'SCHEMA_MISMATCH',
      message: 'languages array must include at least one input code ("te", "hi", "en").',
    });
  } else {
    const unique = new Set(d.languages);
    if (unique.size !== d.languages.length) {
      issues.push({
        path: '/languages',
        severity: 'error',
        code: 'SCHEMA_MISMATCH',
        message: 'languages array must contain distinct language codes only.',
      });
    }
  }

  const checkStringField = (val: string | null | undefined, path: string, requiredForPublish = true) => {
    if (val === null || val === undefined || val.trim() === '') {
      if (requiredForPublish) {
        issues.push({
          path,
          severity: 'publish_blocker',
          code: 'MISSING_REQUIRED_FIELD',
          message: `Required English value is missing at ${path}.`,
        });
      }
      return;
    }
    if (!LATIN_SCRIPT_REGEX.test(val)) {
      issues.push({
        path,
        severity: 'error',
        code: 'NON_LATIN_SCRIPT',
        message: `Non-Latin script characters detected at ${path}. Every human-readable field must be English only.`,
      });
    }
    const leaks = detectUntranslatedTokens(val);
    if (leaks.length > 0) {
      issues.push({
        path,
        severity: 'error',
        code: 'UNTRANSLATED_ROMANISED_WORD',
        message: `Untranslated Romanised Telugu/Hindi detected at ${path}: ${leaks.join(', ')}.`,
      });
    }
    const placeholder = detectPlaceholders(val);
    if (placeholder) {
      issues.push({
        path,
        severity: 'publish_blocker',
        code: 'PLACEHOLDER_TEXT',
        message: `Drafting placeholder "${placeholder}" detected at ${path}. Replace before publishing.`,
      });
    }
  };

  const addonValidation = validateAddonSuggestions(d);
  for (const message of addonValidation.errors) {
    issues.push({ path: '/suggested_addons', severity: 'error', code: 'SCHEMA_MISMATCH', message });
  }

  // Customer checks
  if (!d.customer) {
    issues.push({
      path: '/customer',
      severity: 'error',
      code: 'SCHEMA_MISMATCH',
      message: 'customer object is required.',
    });
  } else {
    checkStringField(d.customer.name, '/customer/name', true);
    checkStringField(d.customer.site, '/customer/site', true);
    if (d.customer.phone !== null && d.customer.phone !== undefined && d.customer.phone !== '') {
      checkStringField(d.customer.phone, '/customer/phone', false);
    }
  }

  // Quote meta checks
  if (d.quote) {
    if (d.quote.estimate_basis !== undefined && !['floor_plan', 'site_measurement'].includes(d.quote.estimate_basis)) {
      issues.push({
        path: '/quote/estimate_basis', severity: 'error', code: 'SCHEMA_MISMATCH',
        message: 'Choose floor_plan or site_measurement for the quotation basis, or omit the field when it is unknown.',
      });
    }
    if (d.quote.estimate_note !== undefined && d.quote.estimate_note !== null) {
      if (typeof d.quote.estimate_note !== 'string') {
        issues.push({
          path: '/quote/estimate_note', severity: 'error', code: 'SCHEMA_MISMATCH',
          message: 'The quotation note must be English text or null.',
        });
      } else {
        checkStringField(d.quote.estimate_note, '/quote/estimate_note', false);
        if (d.quote.estimate_note.length > MAX_QUOTATION_ESTIMATE_NOTE_LENGTH) {
          issues.push({
            path: '/quote/estimate_note', severity: 'error', code: 'SCHEMA_MISMATCH',
            message: `Keep the quotation note within ${MAX_QUOTATION_ESTIMATE_NOTE_LENGTH} characters.`,
          });
        }
      }
    }
    if (d.quote.date && !isValidCalendarDate(d.quote.date)) {
      issues.push({
        path: '/quote/date',
        severity: 'error',
        code: 'INVALID_DATE',
        message: `Invalid date "${d.quote.date}" at /quote/date. Use YYYY-MM-DD.`,
      });
    }
    if (d.quote.valid_until && !isValidCalendarDate(d.quote.valid_until)) {
      issues.push({
        path: '/quote/valid_until',
        severity: 'error',
        code: 'INVALID_DATE',
        message: `Invalid date "${d.quote.valid_until}" at /quote/valid_until. Use YYYY-MM-DD.`,
      });
    }
  }

  // Recommended package checks
  if (!d.recommended) {
    issues.push({
      path: '/recommended',
      severity: 'publish_blocker',
      code: 'MISSING_REQUIRED_FIELD',
      message: 'Whole-home recommended package is missing.',
    });
  } else {
    checkStringField(d.recommended.grade, '/recommended/grade', true);
    checkStringField(d.recommended.protection, '/recommended/protection', true);
    checkStringField(d.recommended.finish, '/recommended/finish', true);
    if (d.recommended.brand_preference) {
      checkStringField(d.recommended.brand_preference, '/recommended/brand_preference', false);
    }
  }

  // Rooms & Items checks
  if (!Array.isArray(d.rooms) || d.rooms.length === 0) {
    issues.push({
      path: '/rooms',
      severity: 'publish_blocker',
      code: 'MISSING_REQUIRED_FIELD',
      message: 'At least one room with confirmed carpentry items is required to publish.',
    });
  } else {
    d.rooms.forEach((room, rIdx) => {
      const rPath = `/rooms/${rIdx}`;
      checkStringField(room.name, `${rPath}/name`, true);

      if (!Array.isArray(room.items) || room.items.length === 0) {
        issues.push({
          path: `${rPath}/items`,
          severity: 'publish_blocker',
          code: 'MISSING_REQUIRED_FIELD',
          message: `Room "${room.name || rIdx}" has no items.`,
        });
      } else {
        room.items.forEach((item, iIdx) => {
          const iPath = `${rPath}/items/${iIdx}`;
          checkStringField(item.name, `${iPath}/name`, true);
          checkStringField(item.work_type, `${iPath}/work_type`, true);
          checkStringField(item.size_text, `${iPath}/size_text`, true);
          checkStringField(item.source_text_en, `${iPath}/source_text_en`, true);

          if (!item.measure || !item.measure.unit) {
            issues.push({
              path: `${iPath}/measure/unit`,
              severity: 'publish_blocker',
              code: 'MISSING_REQUIRED_FIELD',
              message: `Missing billable unit for "${item.name || 'item'}" in ${room.name || 'room'}.`,
            });
          }
          if (
            !item.measure ||
            item.measure.per_item === null ||
            item.measure.per_item === undefined ||
            item.measure.per_item <= 0
          ) {
            issues.push({
              path: `${iPath}/measure/per_item`,
              severity: 'publish_blocker',
              code: 'INVALID_MEASUREMENT',
              message: `Missing or non-positive billable measure (per_item) for "${item.name || 'item'}" in ${room.name || 'room'}.`,
            });
          }
          if (item.quantity === null || item.quantity === undefined || item.quantity <= 0) {
            issues.push({
              path: `${iPath}/quantity`,
              severity: 'publish_blocker',
              code: 'INVALID_MEASUREMENT',
              message: `Quantity must be a positive integer for "${item.name || 'item'}".`,
            });
          }
          if (item.optional === null || item.optional === undefined) {
            issues.push({
              path: `${iPath}/optional`,
              severity: 'publish_blocker',
              code: 'MISSING_REQUIRED_FIELD',
              message: `Confirm whether "${item.name || 'item'}" is base scope (optional=false) or an add-on (optional=true).`,
            });
          }
          if (!item.pvc || item.pvc.eligible === null || item.pvc.eligible === undefined) {
            issues.push({
              path: `${iPath}/pvc/eligible`,
              severity: 'publish_blocker',
              code: 'MISSING_REQUIRED_FIELD',
              message: `Confirm PVC eligibility for "${item.name || 'item'}".`,
            });
          } else if (item.pvc.eligible && (!Array.isArray(item.pvc.parts) || item.pvc.parts.length === 0)) {
            issues.push({
              path: `${iPath}/pvc/parts`,
              severity: 'publish_blocker',
              code: 'MISSING_REQUIRED_FIELD',
              message: `Item "${item.name || 'item'}" is marked PVC-eligible; list the confirmed wall-contact or wet-area parts.`,
            });
          } else if (Array.isArray(item.pvc.parts)) {
            item.pvc.parts.forEach((p, pIdx) => {
              checkStringField(p, `${iPath}/pvc/parts/${pIdx}`, true);
            });
          }
        });
      }
    });
  }

  // Needs clarification check
  if (Array.isArray(d.needs_clarification)) {
    d.needs_clarification.forEach((clar, cIdx) => {
      if (!JSON_POINTER_REGEX.test(clar.path) && clar.path !== '') {
        issues.push({
          path: `/needs_clarification/${cIdx}/path`,
          severity: 'error',
          code: 'INVALID_POINTER',
          message: `Invalid JSON Pointer "${clar.path}".`,
        });
      }
      checkStringField(clar.question, `/needs_clarification/${cIdx}/question`, true);
      issues.push({
        path: clar.path || `/needs_clarification/${cIdx}`,
        severity: 'publish_blocker',
        code: 'UNRESOLVED_CLARIFICATION',
        message: `Unresolved question: ${clar.question}`,
      });
    });
  }

  // Owner requests check
  if (Array.isArray(d.owner_requests) && d.owner_requests.length > 0) {
    d.owner_requests.forEach((req, rIdx) => {
      checkStringField(req.text, `/owner_requests/${rIdx}/text`, true);
      if (!options.reviewedOwnerRequests) {
        issues.push({
          path: req.path || `/owner_requests/${rIdx}`,
          severity: 'publish_blocker',
          code: 'UNREVIEWED_OWNER_REQUEST',
          message: `Owner review required for special request: "${req.text}"`,
        });
      }
    });
  }

  const hasSchemaOrLanguageErrors = issues.some((i) => i.severity === 'error');
  const hasPublishBlockers = issues.some(
    (i) => i.severity === 'error' || i.severity === 'publish_blocker'
  );

  return {
    validForDraft: !hasSchemaOrLanguageErrors,
    readyForPublish: !hasPublishBlockers,
    issues,
  };
}

/**
 * Private migration path for legacy v1 drafts -> English-only v2 draft
 */
export function migrateV1ToV2Draft(raw: Record<string, any>): QuotationDraftV2 {
  const translateRomanTokens = (str: string): string => {
    return str
      .replace(/\brendu\b/gi, 'two')
      .replace(/\bmoodu\b/gi, 'three')
      .replace(/\bokatinnara\b/gi, '1.5')
      .replace(/\badugulu\b/gi, 'ft')
      .replace(/\badugu\b/gi, 'ft')
      .replace(/\bdedh\b/gi, '1.5')
      .replace(/\balmara\b/gi, 'wardrobe')
      .replace(/\bvantillu\b/gi, 'Kitchen');
  };

  const rooms: DraftRoom[] = Array.isArray(raw.rooms)
    ? raw.rooms.map((r: any) => ({
        name: r.name ? translateRomanTokens(String(r.name)) : null,
        recommended: r.recommended
          ? {
              grade: r.recommended.grade ?? null,
              protection: r.recommended.protection ?? null,
              finish: r.recommended.finish ?? null,
              brand_preference: r.recommended.brand_preference ?? null,
            }
          : null,
        items: Array.isArray(r.items)
          ? r.items.map((it: any) => ({
              name: it.name ? translateRomanTokens(String(it.name)) : null,
              work_type: it.work_type ? translateRomanTokens(String(it.work_type)) : 'Box type',
              size_text: it.size_text ? translateRomanTokens(String(it.size_text)) : null,
              measure: {
                unit: it.measure?.unit ?? it.unit ?? null,
                per_item: typeof it.measure?.per_item === 'number' ? it.measure.per_item : it.area_sqft ?? null,
              },
              quantity: typeof it.quantity === 'number' ? it.quantity : 1,
              pvc: {
                eligible: typeof it.pvc?.eligible === 'boolean' ? it.pvc.eligible : Boolean(it.pvc_eligible),
                parts: Array.isArray(it.pvc?.parts) ? it.pvc.parts.map((p: any) => translateRomanTokens(String(p))) : [],
              },
              optional: typeof it.optional === 'boolean' ? it.optional : false,
              source_text_en: translateRomanTokens(
                String(it.source_text_en || it.source_text || `${it.name || 'Item'} per spoken scope.`)
              ),
            }))
          : [],
      }))
    : [];

  return {
    schema_version: 'quotation-studio.draft.v2',
    output_language: 'en',
    // Real customer work is the default; explicit legacy practice flags remain practice.
    is_demo: raw.is_demo === true || raw.is_demo === 'true',
    languages: Array.isArray(raw.languages) && raw.languages.length > 0 ? raw.languages : ['en'],
    customer: {
      name: raw.customer?.name ?? null,
      site: raw.customer?.site ?? null,
      phone: raw.customer?.phone ?? null,
    },
    quote: {
      number: raw.quote?.number ?? null,
      date: raw.quote?.date ?? null,
      valid_until: raw.quote?.valid_until ?? null,
      ...(raw.quote?.estimate_basis !== undefined ? { estimate_basis: raw.quote.estimate_basis } : {}),
      ...(raw.quote?.estimate_note !== undefined ? { estimate_note: raw.quote.estimate_note } : {}),
    },
    recommended: raw.recommended
      ? {
          grade: raw.recommended.grade ?? null,
          protection: raw.recommended.protection ?? null,
          finish: raw.recommended.finish ?? null,
          brand_preference: raw.recommended.brand_preference ?? null,
        }
      : {
          grade: 'Premium',
          protection: 'Standard',
          finish: 'High Gloss',
          brand_preference: null,
        },
    rooms,
    owner_requests: Array.isArray(raw.owner_requests)
      ? raw.owner_requests.map((o: any) => ({
          path: String(o.path || ''),
          text: translateRomanTokens(String(o.text || '')),
        }))
      : [],
    needs_clarification: Array.isArray(raw.needs_clarification)
      ? raw.needs_clarification.map((c: any) => ({
          path: String(c.path || ''),
          question: translateRomanTokens(String(c.question || '')),
        }))
      : [],
  };
}
