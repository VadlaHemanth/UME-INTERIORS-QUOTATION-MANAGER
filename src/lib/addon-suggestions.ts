import type { DraftItem, QuotationDraftV2, SuggestedAddon } from './schema';
import { canonicalFurnitureName } from './furniture';

export const MAX_ADDON_SUGGESTIONS = 12;
export interface AddonSuggestionValidation {
  valid: boolean;
  suggestions: SuggestedAddon[];
  errors: string[];
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function english(value: unknown, limit: number, nullable = false): boolean {
  return (nullable && value === null) || (typeof value === 'string' && value.trim().length > 0 && value.length <= limit && /^[\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}\s]+$/u.test(value));
}
function positive(value: unknown, integer = false): boolean {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value > 0 && (!integer || Number.isInteger(value)));
}
function identity(value: unknown, roomName = ''): string | null {
  if (!record(value) || typeof value.name !== 'string' || typeof value.work_type !== 'string') return null;
  const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return `${normalize(canonicalFurnitureName(value.name,value.work_type,roomName))}|${normalize(value.work_type)}`;
}

function validItem(value: unknown): value is DraftItem {
  if (!record(value) || !english(value.name, 160) || !english(value.work_type, 160) || !english(value.size_text, 300, true) || !english(value.source_text_en, 2000)) return false;
  if (value.optional !== true || !positive(value.quantity, true) || !record(value.measure)) return false;
  if (![null, 'sq_ft', 'running_ft', 'each', 'lumpsum'].includes(value.measure.unit as any) || !positive(value.measure.per_item)) return false;
  // PVC applicability is resolved internally from the published work-type
  // rate card. An assistant recommendation must never need to invent a
  // per-item PVC eligibility decision or a contact-area list.
  if (value.custom_rates != null) {
    if (!record(value.custom_rates)) return false;
    for (const [key, rate] of Object.entries(value.custom_rates)) {
      if (!['Base', 'Normal', 'Premium', 'pvc_adder'].includes(key) || typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0) return false;
    }
  }
  return true;
}

// Recommendations are owner-side ideas, not quoted scope. Unknown measurements
// are allowed here; the normal draft validator checks them after acceptance.
export function validateAddonSuggestions(draft: unknown): AddonSuggestionValidation {
  const errors: string[] = [];
  const suggestions: SuggestedAddon[] = [];
  if (!record(draft)) return { valid: false, suggestions, errors: ['Quotation must be an object.'] };
  if (draft.suggested_addons === undefined) return { valid: true, suggestions, errors };
  if (!Array.isArray(draft.suggested_addons)) return { valid: false, suggestions, errors: ['suggested_addons must be an array.'] };
  if (draft.suggested_addons.length > MAX_ADDON_SUGGESTIONS) errors.push(`Include at most ${MAX_ADDON_SUGGESTIONS} suggested add-ons.`);
  const rooms = Array.isArray(draft.rooms) ? draft.rooms : [];
  const seen = new Set<string>();
  draft.suggested_addons.slice(0, MAX_ADDON_SUGGESTIONS).forEach((value, index) => {
    const label = `Suggested add-on ${index + 1}`;
    if (!record(value) || !Number.isInteger(value.room_index) || (value.room_index as number) < 0 || (value.room_index as number) >= rooms.length) {
      errors.push(`${label} must reference an existing room index.`);
      return;
    }
    if (!english(value.reason, 800) || !validItem(value.item)) {
      errors.push(`${label} needs an English reason and a structurally valid optional item; use null for unknown measurements and quantities.`);
      return;
    }
    const room = rooms[value.room_index as number];
    if (!record(room) || !Array.isArray(room.items)) {
      errors.push(`${label} must reference a room with an items array.`);
      return;
    }
    const roomName = typeof room.name === 'string' ? room.name : '';
    const key = `${value.room_index}:${identity(value.item,roomName)}`;
    if (seen.has(key) || room.items.some((item) => identity(item,roomName) === identity(value.item,roomName))) {
      errors.push(`${label} duplicates an item in the room or another recommendation.`);
      return;
    }
    seen.add(key);
    suggestions.push(structuredClone(value) as unknown as SuggestedAddon);
  });
  return { valid: errors.length === 0, suggestions, errors };
}

export function getAddonSuggestions(draft: unknown): SuggestedAddon[] {
  const result = validateAddonSuggestions(draft);
  return result.valid ? result.suggestions : [];
}

export function acceptAddonSuggestion(draft: QuotationDraftV2, index: number): QuotationDraftV2 {
  const result = validateAddonSuggestions(draft);
  if (!result.valid) throw new Error(result.errors.join(' '));
  if (!Number.isInteger(index) || index < 0 || index >= result.suggestions.length) throw new Error('Choose an existing add-on recommendation.');
  const next = structuredClone(draft);
  const suggestion = next.suggested_addons![index];
  next.rooms[suggestion.room_index].items.push({ ...suggestion.item, optional: true });
  next.suggested_addons = next.suggested_addons!.filter((_, suggestionIndex) => suggestionIndex !== index);
  return next;
}

export function rejectAddonSuggestion(draft: QuotationDraftV2, index: number): QuotationDraftV2 {
  const next = structuredClone(draft);
  if (Array.isArray(next.suggested_addons) && Number.isInteger(index) && index >= 0) next.suggested_addons = next.suggested_addons.filter((_, suggestionIndex) => suggestionIndex !== index);
  return next;
}
