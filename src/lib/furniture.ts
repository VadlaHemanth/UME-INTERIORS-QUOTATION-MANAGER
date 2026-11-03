/** One vocabulary shared by imports, the editor, customer quotations and PDFs. */
export const FURNITURE_VOCABULARY = [
  ['Kitchen Base Cabinet', 'base cabinet, lower kitchen cabinet, under-counter cabinet'],
  ['Kitchen Overhead Wall Cabinet', 'wall cabinet, overhead cabinet, upper kitchen cabinet'],
  ['Kitchen Full-Height Utility Cabinet', 'tall kitchen cabinet, pantry cabinet, full-height kitchen cabinet'],
  ['Wardrobe Cabinet', 'box-type wardrobe, modular wardrobe, bedroom cupboard'],
  ['Wardrobe Frame and Shutters', 'frame-type wardrobe, wardrobe frame and shutter'],
  ['Loft Frame and Shutters', 'loft, loft frame and shutter, kitchen loft'],
  ['Internal Wardrobe Locker', 'locker inside wardrobe, inside wardrobe box locker'],
  ['Dressing Table', 'dressing unit, dressing table'],
  ['Study Table', 'study table workstation, study desk'],
  ['Wall-Mounted Folding Table', 'folding table, wall folding table'],
  ['Wash Area Utility Cabinet', 'wash area wardrobe, wash-area cabinet'],
  ['Breakfast Counter Cabinet', 'breakfast counter console, breakfast counter cabinet'],
  ['Crockery Overhead Display Cabinet', 'mini crockery unit, crockery overhead display unit'],
  ['TV Console Cabinet', 'TV unit, TV media unit, TV media console'],
  ['Pooja Mandir Cabinet', 'pooja mandir, pooja mandir unit'],
  ['Wall Panelling Under Loft', 'wood wall paneling under loft, wall panelling under loft'],
  ['Breakfast Counter Wall Panelling', 'breakfast counter wall paneling'],
  ['Upper Pillar Wall Panelling', 'upper pillar wall paneling'],
  ['Additional Internal Drawer', 'additional drawer, extra drawer, additional internal drawer unit'],
  ['Shoe Storage Cabinet', 'shoe rack, shoe cabinet, foyer shoe unit'],
  ['Bookshelf', 'book shelf, book storage unit'],
  ['Wall-Mounted Folding Bed', 'wall mount bed, wall-mounted bed, folding wall bed'],
  ['Wall Panelling', 'wood wall paneling, plywood wall paneling'],
  ['Wall Panelling Below Wall Cabinets', 'wood wall paneling under wall cabinet'],
  ['Louvered Wall Panelling', 'louvers wall paneling, louver wall paneling'],
  ['TV Wall Panelling Above Main Door', 'tv unit wall paneling above main door, tv unit wood wall paneling with louvers above main door'],
  ['Mirror Backing Panel', 'mirror wall paneling, mirror backing panel'],
  ['Gypsum False Ceiling', 'false ceiling saint gobain, gypsum false ceiling'],
] as const;

const key = (text: string) => text.toLowerCase().replace(/paneling/g, 'panelling').replace(/shutters/g, 'shutter').replace(/[^a-z0-9]+/g, ' ').trim();
const aliases = new Map<string, string>();
for (const [name, synonyms] of FURNITURE_VOCABULARY) {
  for (const alias of [name, ...synonyms.split(',')]) aliases.set(key(alias), name);
}

export function canonicalFurnitureName(raw: string, workType = '', room = ''): string {
  const name = raw.trim().replace(/\s+/g, ' ');
  const n = key(name);
  const wt = key(workType);
  // Preserve distinctions that affect scope. A pull-out basket is never an overhead cabinet.
  if (/tandem|pull out|ss.*basket|stainless.*basket/.test(n)) {
    if (/ss|stainless/.test(n) && /tandem/.test(n)) return /304/.test(n) ? 'Tandem Drawers / SS 304 Pull-Out Baskets' : 'Tandem Drawers / Stainless-Steel Pull-Out Baskets';
    return /tandem/.test(n) ? 'Tandem Drawer System' : /304/.test(n) ? 'SS 304 Pull-Out Basket' : 'Stainless-Steel Pull-Out Basket';
  }
  if (/^wardrobe$|^cupboard$/.test(n)) return wt.includes('frame') ? 'Wardrobe Frame and Shutters' : 'Wardrobe Cabinet';
  if (/^base cabinet( unit)?$/.test(n)) return /kitchen/i.test(room) ? 'Kitchen Base Cabinet' : 'Base Cabinet';
  if (/^wall cabinet( unit)?$/.test(n)) return /kitchen/i.test(room) ? 'Kitchen Overhead Wall Cabinet' : 'Wall Cabinet';
  if (/opposite.*kitchen|kitchen.*opposite/.test(n)) return 'Kitchen Full-Height Utility Cabinet';
  if (/loft/.test(n) && !/panelling|under|light/.test(n)) return 'Loft Frame and Shutters';
  if (/tv/.test(n) && /louver/.test(n) && !/panelling|door/.test(n)) return 'TV Console Cabinet with Louvers';
  if (/pooja/.test(n) && /cnc|glass|door/.test(n)) return 'Pooja Entrance Frame and CNC / Glass Doors';
  if (/pillar/.test(n) && /panelling/.test(n)) return 'Upper Pillar Wall Panelling';
  if (/breakfast/.test(n) && /panelling/.test(n)) return 'Breakfast Counter Wall Panelling';
  if (/under loft/.test(n) && /panelling/.test(n)) return 'Wall Panelling Under Loft';
  if (/crockery/.test(n) && /mini|above|overhead|upper/.test(n)) return 'Crockery Overhead Display Cabinet';
  return aliases.get(n) || name;
}
