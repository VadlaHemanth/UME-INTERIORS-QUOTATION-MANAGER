/**
 * Shared v2 Dictation Schema, TypeScript Types, Unicode & Glossary Validator,
 * Romanised Telugu/Hindi Leak Detector, Placeholder Gate, and v1->v2 Migrator.
 */

import { validateAddonSuggestions } from './addon-suggestions';
import { expiryFromIssue } from './quotation-dates';
import {furnitureConstructionConflict} from './furniture-contract';

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
  /** Calendar days after the issue date. Dates remain ISO in JSON and storage. */
  validity_days?: number;
  /** Approved quotation-specific notes shown in the online document and PDF. */
  notes?: string[];
  /** Owner-controlled customer-facing badge for the selected default package. */
  show_recommended_package?: boolean;
  /** Preferred flag for the standard floor-plan preliminary estimate notice. */
  is_floor_plan_estimate?: boolean;
  /** Legacy import fields retained for existing quotations and JSON. */
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
  /** Zero-based index of the main unit in this same room, e.g. a loft's wardrobe. */
  parent_item_index?: number | null;
  /**
   * Legacy import metadata only. New assistant JSON and published quotations
   * omit this field: the applicable contact-area protection is determined by
   * the selected work type in the rate card, not by a per-item checkbox.
   */
  pvc?: ItemPVC;
  optional: boolean | null;
  source_text_en: string;
  custom_rates?: ItemCustomRates | null;
  /** The studio preserves text the owner explicitly edits. */
  owner_text?: { name?: true; specification?: true };
  /** A null main unit can be an explicit choice rather than a request to infer one. */
  manual_parent?: true;
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
  /** Reusable, owner-approved process corrections; never customer or payment data. */
  assistant_memory_updates?: string[];
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

/** Reject malformed imports before formatters or editors read nested fields. */
export function quotationDraftShapeIssue(draft: unknown): ValidationIssue | undefined {
  const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const fail = (path: string, expected: string): ValidationIssue => ({
    path, severity:'error', code:'SCHEMA_MISMATCH', message:'Expected ' + expected + ' at ' + (path || 'the quotation root') + '.',
  });
  const text = (value: unknown) => value == null || typeof value === 'string';
  if (!record(draft)) return fail('', 'a quotation object');
  if (!record(draft.customer)) return fail('/customer', 'a customer object');
  if (!record(draft.quote)) return fail('/quote', 'a quotation details object');
  for (const key of ['name','site','phone']) if (!text(draft.customer[key])) return fail('/customer/' + key, 'text or null');
  for (const key of ['number','date','valid_until']) if (!text(draft.quote[key])) return fail('/quote/' + key, 'text or null');
  if (draft.quote.notes !== undefined && (!Array.isArray(draft.quote.notes) || draft.quote.notes.some(note => typeof note !== 'string'))) return fail('/quote/notes', 'a list of notes');
  if (draft.recommended != null) {
    const value = draft.recommended;
    if (!record(value) || !text(value.brand_preference) ||
      (value.grade != null && !['Base','Normal','Premium'].includes(value.grade as string)) ||
      (value.protection != null && !['Standard','With PVC'].includes(value.protection as string)) ||
      (value.finish != null && !['SF','High Gloss'].includes(value.finish as string))) return fail('/recommended', 'valid package options or null');
  }
  if (!Array.isArray(draft.rooms)) return fail('/rooms', 'a list of rooms');
  for (const [ri, room] of draft.rooms.entries()) {
    const roomPath = '/rooms/' + ri;
    if (!record(room) || !text(room.name) || !Array.isArray(room.items)) return fail(roomPath, 'a room with a name and an items list');
    for (const [ii, item] of room.items.entries()) {
      const path = roomPath + '/items/' + ii;
      if (!record(item)) return fail(path, 'a furniture item');
      for (const key of ['name','work_type','size_text']) if (!text(item[key])) return fail(path + '/' + key, 'text or null');
      if (!text(item.source_text_en)) return fail(path + '/source_text_en', 'specification text or null');
      if (!record(item.measure) || !text(item.measure.unit)) return fail(path + '/measure', 'a measurement object with a billing unit');
      if (item.measure.per_item != null && typeof item.measure.per_item !== 'number') return fail(path + '/measure/per_item', 'a number or null');
      if (item.quantity != null && typeof item.quantity !== 'number') return fail(path + '/quantity', 'a number or null');
      if (item.optional != null && typeof item.optional !== 'boolean') return fail(path + '/optional', 'true, false or null');
    }
  }
  for (const [key, field] of [['owner_requests','text'], ['needs_clarification','question']]) {
    const list = draft[key];
    if (!Array.isArray(list)) return fail('/' + key, 'a list');
    for (const [index, entry] of list.entries()) {
      if (!record(entry) || typeof entry.path !== 'string' || typeof entry[field] !== 'string') return fail('/' + key + '/' + index, 'a review entry with a path and message');
    }
  }
}

export function validateQuotationDraftV2(
  draft: unknown,
  options: { reviewedOwnerRequests?: boolean } = {}
): ValidationResult {
  const issues: ValidationIssue[] = [];

  const shapeIssue = quotationDraftShapeIssue(draft);
  if (shapeIssue) return { validForDraft:false, readyForPublish:false, issues:[shapeIssue] };

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
  if(d.assistant_memory_updates!==undefined&&(!Array.isArray(d.assistant_memory_updates)||d.assistant_memory_updates.length>20||d.assistant_memory_updates.some(line=>typeof line!=='string'||!line.trim()||line.length>500)))issues.push({path:'/assistant_memory_updates',severity:'error',code:'SCHEMA_MISMATCH',message:'Reusable assistant corrections must be up to 20 short text rules, at most 500 characters each.'});

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
    if (d.quote.notes !== undefined) {
      if (!Array.isArray(d.quote.notes) || d.quote.notes.length > 30 || d.quote.notes.some(note => typeof note !== 'string' || note.length > 3000)) {
        issues.push({path:'/quote/notes',severity:'error',code:'SCHEMA_MISMATCH',message:'Quotation notes must be a list of up to 30 English notes, each within 3,000 characters.'});
      } else d.quote.notes.forEach((note,index) => checkStringField(note, `/quote/notes/${index}`, false));
    }
    if (
      d.quote.show_recommended_package !== undefined &&
      typeof d.quote.show_recommended_package !== 'boolean'
    ) {
      issues.push({
        path: '/quote/show_recommended_package',
        severity: 'error',
        code: 'SCHEMA_MISMATCH',
        message: 'Set show_recommended_package to true or false.',
      });
    }
    if (d.quote.is_floor_plan_estimate !== undefined && typeof d.quote.is_floor_plan_estimate !== 'boolean') {
      issues.push({
        path: '/quote/is_floor_plan_estimate', severity: 'error', code: 'SCHEMA_MISMATCH',
        message: 'Set is_floor_plan_estimate to true or false.',
      });
    }
    if (d.quote.is_floor_plan_estimate === true && d.quote.estimate_basis !== undefined && d.quote.estimate_basis !== 'floor_plan') {
      issues.push({
        path: '/quote/estimate_basis', severity: 'error', code: 'SCHEMA_MISMATCH',
        message: 'A floor-plan estimate cannot also use a different legacy estimate basis.',
      });
    }
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
    if(d.quote.validity_days!==undefined&&(!Number.isSafeInteger(d.quote.validity_days)||d.quote.validity_days<1||d.quote.validity_days>3650))issues.push({path:'/quote/validity_days',severity:'error',code:'INVALID_DATE',message:'Validity must be a whole number of days from 1 to 3,650.'});
    if(d.quote.date&&d.quote.valid_until&&isValidCalendarDate(d.quote.date)&&isValidCalendarDate(d.quote.valid_until)){
      if(d.quote.valid_until<=d.quote.date)issues.push({path:'/quote/valid_until',severity:'error',code:'INVALID_DATE',message:'Valid until must be after the issue date.'});
      else if(d.quote.validity_days!==undefined&&expiryFromIssue(d.quote.date,d.quote.validity_days)!==d.quote.valid_until)issues.push({path:'/quote/valid_until',severity:'error',code:'INVALID_DATE',message:'The expiry date must match the issue date plus the selected validity days.'});
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
          const parent=item.parent_item_index;
          if(parent==null&&/loft|low roof/i.test(`${item.name} ${item.work_type}`)&&!/panelling|under loft/i.test(item.name||'')&&room.items.filter(other=>/loft|low roof/i.test(`${other.name} ${other.work_type}`)&&!/panelling|under loft/i.test(other.name||'')).length>1&&room.items.filter(other=>!/loft/i.test(`${other.name} ${other.work_type}`)&&/wardrobe|dressing|crockery|vanity/i.test(other.name||'')).length>1)issues.push({path:`${iPath}/parent_item_index`,severity:'publish_blocker',code:'MISSING_REQUIRED_FIELD',message:`Choose the main unit for "${item.name}" in ${room.name}. Each loft must stay with the wardrobe, dressing table or cabinet it belongs above.`});
          if(parent!=null){
            let invalid=!Number.isSafeInteger(parent)||parent<0||parent>=room.items.length||parent===iIdx;
            let cursor:number|null|undefined=parent;const seen=new Set([iIdx]);
            while(!invalid&&cursor!=null){if(seen.has(cursor)){invalid=true;break;}seen.add(cursor);cursor=room.items[cursor]?.parent_item_index;}
            if(invalid)issues.push({path:`${iPath}/parent_item_index`,severity:'error',code:'SCHEMA_MISMATCH',message:'Choose another furniture item in this room as the main unit. Links cannot refer to themselves or form a loop.'});
          }
          checkStringField(item.name, `${iPath}/name`, true);
          checkStringField(item.work_type, `${iPath}/work_type`, true);
          checkStringField(item.size_text, `${iPath}/size_text`, true);
          checkStringField(item.source_text_en, `${iPath}/source_text_en`, true);
          if(furnitureConstructionConflict(item.name||'',item.source_text_en||'',item.work_type||''))issues.push({path:`${iPath}/work_type`,severity:'publish_blocker',code:'SCHEMA_MISMATCH',message:`The construction wording for "${item.name||'item'}" conflicts with its selected rate type. Confirm Box type or Frame type, then make the specification and rate selection agree. Prices are not changed automatically.`});
          if (item.custom_rates != null) {
            if (typeof item.custom_rates !== 'object' || Array.isArray(item.custom_rates)) {
              issues.push({path:`${iPath}/custom_rates`,severity:'publish_blocker',code:'SCHEMA_MISMATCH',message:'Item rates must be an object containing confirmed package prices.'});
            } else for (const [key,rate] of Object.entries(item.custom_rates)) {
              if (!['Base','Normal','Premium','pvc_adder'].includes(key) || typeof rate!=='number' || !Number.isFinite(rate) || rate<0) issues.push({path:`${iPath}/custom_rates/${key}`,severity:'publish_blocker',code:'SCHEMA_MISMATCH',message:'Use a confirmed, non-negative number for each item rate (Standard: Base, Premium: Normal, Luxury: Premium, optional PVC extra: pvc_adder).'});
            }
          }

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
            !Number.isFinite(item.measure.per_item) || item.measure.per_item <= 0
          ) {
            issues.push({
              path: `${iPath}/measure/per_item`,
              severity: 'publish_blocker',
              code: 'INVALID_MEASUREMENT',
              message: `Missing or non-positive billable measure (per_item) for "${item.name || 'item'}" in ${room.name || 'room'}.`,
            });
          }
          if (item.quantity === null || item.quantity === undefined || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
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
          // `pvc` was a legacy per-item entry. It is intentionally ignored on
          // import: applicable protection now comes from the work-type rate
          // card, so an old PVC field can never block a quotation.
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
      ...(Array.isArray(raw.quote?.notes) ? { notes: raw.quote.notes } : {}),
      ...(raw.quote?.show_recommended_package !== undefined
        ? { show_recommended_package: raw.quote.show_recommended_package }
        : {}),
      ...(raw.quote?.is_floor_plan_estimate !== undefined ? { is_floor_plan_estimate: raw.quote.is_floor_plan_estimate } : {}),
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
