import type { QuotationDraftV2, ResolvedPackageSelection } from './schema';

export interface AgreedSelection {
  wholeHomeSelection: ResolvedPackageSelection;
  mixByRoom: boolean;
  roomSelections: Record<number, ResolvedPackageSelection>;
  selectedOptionalPointers: string[];
  acceptedTermsAt: string | null;
}
export interface FinalizedWorkOrder {
  confirmedAt: string;
  sourceRevision: number;
  selection: AgreedSelection;
  totalRupees: number;
}
/** Only agreement-changing fields participate; presentation and save timestamps do not. */
export function agreedSelectionIdentity(selection:AgreedSelection):string {
  const packageKey=(value:ResolvedPackageSelection)=>[value.grade,value.protection,value.finish,value.brand_preference||null];
  return JSON.stringify([packageKey(selection.wholeHomeSelection),selection.mixByRoom,Object.entries(selection.roomSelections||{}).sort(([a],[b])=>Number(a)-Number(b)).map(([key,value])=>[key,packageKey(value)]),[...(selection.selectedOptionalPointers||[])].sort()]);
}
export function indiaDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function quoteExpiry(issueDate = indiaDate()): string {
  return new Date(new Date(`${issueDate}T00:00:00Z`).getTime()+30*86400000).toISOString().slice(0,10);
}
export function nextQuoteNumber(drafts: { draft: QuotationDraftV2 }[], now = new Date()): string {
  const prefix = `UME-${indiaDate(now).slice(2, 4)}-`;
  const used = new Set(drafts.map(q => q.draft.quote.number));
  let sequence = 1;
  while (used.has(`${prefix}${String(sequence).padStart(4, '0')}`)) sequence++;
  return `${prefix}${String(sequence).padStart(4, '0')}`;
}
export function latestRecord<T extends { publicId: string; supersededByPublicId?: string }>(records: T[], id: string): T | undefined {
  const byId = new Map(records.map(q => [q.publicId, q]));
  let record = byId.get(id);
  const visited = new Set<string>();
  while (record?.supersededByPublicId && !visited.has(record.publicId)) {
    visited.add(record.publicId);
    const next = byId.get(record.supersededByPublicId);
    if (!next) break;
    record = next;
  }
  return record;
}
export function seriesIds<T extends { publicId: string; previousPublicId?: string; supersededByPublicId?: string }>(records: T[], id: string): Set<string> {
  const ids = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const q of records) if (ids.has(q.publicId) || (q.previousPublicId && ids.has(q.previousPublicId)) || (q.supersededByPublicId && ids.has(q.supersededByPublicId))) {
      for (const linked of [q.publicId, q.previousPublicId, q.supersededByPublicId]) if (linked && !ids.has(linked)) { ids.add(linked); changed = true; }
    }
  }
  return ids;
}

/** Carry agreed choices by room/item identity when an owner reorders a revision. */
export function carryAgreedSelection(previous: QuotationDraftV2, next: QuotationDraftV2, selection: AgreedSelection): AgreedSelection {
  const result = structuredClone(selection);
  result.roomSelections = {};
  result.selectedOptionalPointers = [];
  for (const [ri, room] of next.rooms.entries()) {
    const oldIndex = previous.rooms.findIndex(old => old.name?.toLowerCase() === room.name?.toLowerCase());
    if (oldIndex < 0) continue;
    if (selection.roomSelections[oldIndex]) result.roomSelections[ri] = structuredClone(selection.roomSelections[oldIndex]);
    for (const [ii,item] of room.items.entries()) {
      const oldItem = previous.rooms[oldIndex].items.findIndex(old => old.name?.toLowerCase() === item.name?.toLowerCase() && old.work_type === item.work_type);
      if (oldItem >= 0 && selection.selectedOptionalPointers.includes(`/rooms/${oldIndex}/items/${oldItem}`)) result.selectedOptionalPointers.push(`/rooms/${ri}/items/${ii}`);
    }
  }
  return result;
}
