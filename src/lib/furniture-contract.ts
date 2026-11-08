/** UME's approved product dictionary. Titles identify function; specifications identify confirmed construction. */
export const FURNITURE_VOCABULARY = [
  ['Kitchen Base Cabinet','base cabinet, lower kitchen cabinet, under-counter cabinet, base cabinet unit'],
  ['Kitchen Overhead Wall Cabinet','kitchen wall cabinet, kitchen overhead cabinet, upper kitchen cabinet'],
  ['Kitchen Storage Cabinet','opposite-side kitchen cabinet, kitchen storage unit'],
  ['Kitchen Tall Cabinet','tall kitchen cabinet, tall kitchen unit'],
  ['Kitchen Tall Utility Cabinet','tall kitchen utility cabinet'],
  ['Kitchen Full-Height Utility Cabinet','full-height kitchen utility cabinet'],
  ['Kitchen Pantry Cabinet','kitchen pantry cupboard, pantry cabinet'],
  ['Tall Pantry Pull-Out System','pantry pull-out mechanism, tall larder pull-out'],
  ['Soft-Close Kitchen Drawer System','tandem basket, tandem drawer, tandem drawer system, soft-close tandem drawer'],
  ['Kitchen Drawer Systems / Stainless-Steel Baskets','tandem or SS baskets, tandem and SS baskets'],
  ['Wooden Kitchen Drawer','wooden kitchen drawer, plywood kitchen drawer'],
  ['Stainless-Steel Pull-Out Basket','SS basket, stainless steel basket'],
  ['SS 304 Pull-Out Basket','SS304 basket, grade 304 stainless-steel basket'],
  ['Pull-Out Basket','pull-out basket'],
  ['Wardrobe Cabinet','box-type wardrobe, box wardrobe, bedroom wardrobe cabinet'],
  ['Wardrobe Frame and Shutters','frame-type wardrobe, wardrobe frame and shutter'],
  ['Loft Storage Cabinet','box-type loft cabinet, loft box cabinet'],
  ['Loft Frame and Shutters','loft frame and shutter, loft shutter closure'],
  ['Low-Roof Frame and Shutters','low roof frame and shutter, low-ceiling storage frame and shutters'],
  ['High-Level Closure Panel','fixed loft cover panel, high-level filler panel'],
  ['Internal Wardrobe Locker','locker inside wardrobe, inside wardrobe box locker'],
  ['Internal Wardrobe Storage Compartment','inside wardrobe storage compartment'],
  ['Internal Wardrobe Drawer','drawer inside wardrobe'],
  ['Additional Internal Drawer','additional drawer, extra drawer, additional internal drawer unit'],
  ['Dressing Table','dressing unit, dressing table'],
  ['Study Table','study table workstation, study desk'],
  ['Wall-Mounted Folding Table','wall folding table, wall-mounted fold-down table'],
  ['Folding Table Fittings','folding table brackets, folding table mechanism only'],
  ['Wash Area Utility Cabinet','wash area wardrobe, wash-area cabinet, laundry utility cabinet'],
  ['Utility Storage Cabinet','utility storage cabinet'],
  ['Breakfast Counter Cabinet','breakfast counter console, breakfast counter cabinet'],
  ['Crockery Cabinet','crockery storage cabinet, crockery unit'],
  ['Crockery Base Cabinet','lower crockery cabinet'],
  ['Crockery Overhead Cabinet','overhead crockery cabinet, upper crockery cabinet'],
  ['Crockery Overhead Display Cabinet','crockery overhead display unit, overhead crockery display cabinet'],
  ['Display Cabinet','display storage cabinet'],
  ['Bathroom Vanity Cabinet','washbasin cabinet, wash basin unit, basin cabinet'],
  ['Shoe Storage Cabinet','shoe cabinet, foyer shoe cabinet'],
  ['Shoe Rack','open shoe rack, shoe rack'],
  ['TV Console Cabinet','TV console, TV base cabinet, media console cabinet'],
  ['TV Wall Cabinet','upper TV cabinet'],
  ['TV Wall Panelling','TV backing panel, TV back panel, TV wall paneling'],
  ['TV Console Cabinet with Louvers','TV console cabinet with louvres'],
  ['TV Unit with Louvers','TV unit with louvers, TV unit with louvres'],
  ['Pooja Mandir Cabinet','pooja cabinet, pooja mandir, pooja mandir unit'],
  ['Pooja Cabinet CNC Shutters','CNC shutters for pooja cabinet'],
  ['Pooja Cabinet Glass Shutters','glass shutters for pooja cabinet'],
  ['Pooja Entrance CNC Doors','CNC pooja entrance doors'],
  ['Pooja Entrance Glass Doors','glass pooja entrance doors'],
  ['Pooja Entrance CNC Doors with Glass Inserts','CNC pooja entrance doors with glass inserts'],
  ['Wall Panelling','wood wall paneling, plywood wall paneling'],
  ['Wall Panelling Under Loft','wood wall paneling under loft, wall panelling below loft'],
  ['Wall Panelling Below Wall Cabinets','wood wall paneling under wall cabinet'],
  ['Breakfast Counter Wall Panelling','breakfast counter wall paneling'],
  ['Pillar Wall Panelling','pillar cladding, column panelling'],
  ['Upper Pillar Wall Panelling','upper pillar wall paneling'],
  ['Louvered Wall Panelling','louvers wall paneling, louver wall paneling, decorative louvre wall panelling'],
  ['Fluted Wall Panelling','decorative fluted wall paneling'],
  ['Slatted Wall Panelling','decorative slat wall paneling'],
  ['TV Wall Panelling Above Main Door','tv unit wall paneling above main door, tv unit wood wall paneling with louvers above main door'],
  ['Mirror Backing Panel','mirror wall paneling, mirror backing panel'],
  ['Bookshelf','book shelf, open book storage'],
  ['Wall-Mounted Bed','wall mount bed, fixed wall-mounted bed'],
  ['Wall-Mounted Folding Bed','folding wall bed, wall-mounted fold-away bed'],
  ['Gypsum False Ceiling','false ceiling saint gobain, gypsum false ceiling'],
] as const;

export const OWNER_FRAME_TYPE_DEFINITION='Frames and shutters appropriate to the unit, with inside and outside laminate finish. Internal lining, shelves and partitions are included only when specified for that unit.';
export const KITCHEN_FITTINGS_DEFINITION='Soft-close tandem-type kitchen drawer systems or stainless-steel pull-out baskets, with the specified fittings. Keep the confirmed product or expressly offered alternative; do not infer a brand, model or steel grade.';
export const KITCHEN_DEFAULT_LESSON='For each new quotation containing kitchen scope, include six kitchen drawer/basket units total by default using work_type "Tandem or SS baskets" and unit "each", unless the owner specifies a different count or excludes them. Six is the total, not six of each alternative. Use a factual count-item size_text, and never invent a brand, model, steel grade or physical dimension.';
export const COUNT_ITEM_LESSON='Completed room items need meaningful English size_text. Countable items may use "Per drawer system", "Per pull-out basket" or "Per additional drawer" with measure.per_item 1. Unknown required geometry stays null with a clarification until resolved; never invent "Standard size" or turn individual units into multi-piece sets. Suggested add-ons may keep unknown dimensions null.';

const key=(value:string)=>value.toLowerCase().replace(/\bt\s*\.\s*v\.?/g,'tv').replace(/ward\s+robe/g,'wardrobe').replace(/cabinate/g,'cabinet').replace(/paneling/g,'panelling').replace(/shutters/g,'shutter').replace(/[^a-z0-9]+/g,' ').trim();
const aliases=new Map<string,string>();
for(const [name,synonyms] of FURNITURE_VOCABULARY)for(const alias of [name,...synonyms.split(',')])aliases.set(key(alias),name);
const titles=new Map<string,string>(FURNITURE_VOCABULARY.map(([name])=>[key(name),name]));
export function furnitureConstruction(workType:string):'box'|'frame'|null {
  if(typeof workType!=='string')return null;
  const type=key(workType);
  return type==='box type'?'box':['frame type','loft frame and shutter','low roof frame and shutter'].includes(type)?'frame':null;
}
export function furnitureConstructionConflict(name:string,source:string,workType:string):boolean {
  if(!furnitureConstruction(workType))return false;
  const text=key(`${name} ${source}`),box=/\bbox type\b|\bbox construction\b|\bloft storage cabinet\b/.test(text),frame=/\bframe type\b|\bframe and shutter\b/.test(text);
  if(box&&frame)return !/\b(?:wardrobe|loft|dressing|cabinet).+\band\b.+\b(?:wardrobe|loft|dressing|cabinet)\b/.test(key(name));
  return furnitureConstruction(workType)==='box'&&frame||furnitureConstruction(workType)==='frame'&&box;
}

/** Conditional aliases never add material, mounting, height, locks or components. */
export function canonicalFurnitureName(raw:string,workType='',room='',source=''):string {
  const name=raw.trim().replace(/\s+/g,' '),n=key(name),wt=key(workType),context=key(source),inKitchen=/kitchen/.test(key(room));
  if(!name)return name;
  // Preserve the scope of explicitly combined furniture and its existing billing basis.
  if(/wardrobe/.test(n)&&/dressing/.test(n)&&/\band\b/.test(n))return 'Wardrobe and Dressing Unit';
  if(/wardrobe/.test(n)&&/loft/.test(n)&&/\band\b/.test(n))return 'Wardrobe and Loft Unit';
  if(/^wardrobe$|^wardrobe cabinet$|^modular wardrobe$|^bedroom cupboard$/.test(n))return furnitureConstruction(workType)==='frame'?'Wardrobe Frame and Shutters':furnitureConstruction(workType)==='box'?'Wardrobe Cabinet':'Wardrobe';
  const exact=titles.get(n);
  if(exact==='Kitchen Drawer Systems / Stainless-Steel Baskets')return exact;
  if(/\btandem\b/.test(n)&&/\bss\b|stainless/.test(n))return 'Kitchen Drawer Systems / Stainless-Steel Baskets';
  if(/\btandem\b/.test(n))return 'Soft-Close Kitchen Drawer System';
  if(/\bbasket\b|\bbaskets\b/.test(n)){
    if(/drawer/.test(n)&&!/tandem/.test(n))return exact||name;
    const ss=/\bss\b|\bss304\b|stainless/.test(n)||/\b(?:stainless steel|ss) (?:wire )?(?:pull out )?basket\b|basket (?:made (?:of|from) )?(?:stainless steel|ss)\b/.test(context);
    const grade=ss&&(/\b304\b|\bss304\b/.test(n)||/^confirmed ss ?304 grade$|\b(?:ss ?304|grade 304|304 grade) (?:stainless steel )?(?:wire )?(?:pull out )?basket\b|basket (?:made (?:of|from) )?(?:ss ?304|grade 304)\b/.test(context));
    if(grade)return 'SS 304 Pull-Out Basket';
    if(ss)return 'Stainless-Steel Pull-Out Basket';
    return 'Pull-Out Basket';
  }
  if(exact)return exact;
  if(/\bwooden\b|\bplywood\b/.test(n)&&/drawer/.test(n))return inKitchen?'Wooden Kitchen Drawer':'Internal Wardrobe Drawer';
  if(/\bframe type\b/.test(n)&&/wardrobe/.test(n))return 'Wardrobe Frame and Shutters';
  if(/^(?:kitchen )?(?:base|lower|under counter) cabinet(?: unit)?$/.test(n))return inKitchen||/kitchen/.test(n)?'Kitchen Base Cabinet':'Base Cabinet';
  if(/^(?:kitchen )?(?:wall|overhead|upper) cabinet(?: unit)?$/.test(n))return inKitchen||/kitchen/.test(n)?'Kitchen Overhead Wall Cabinet':'Wall Cabinet';
  if(/kitchen/.test(n)&&/cabinet|unit/.test(n)){
    if(/full height/.test(n)&&/utility/.test(n))return 'Kitchen Full-Height Utility Cabinet';
    if(/tall/.test(n))return /utility/.test(n)?'Kitchen Tall Utility Cabinet':'Kitchen Tall Cabinet';
    if(/pantry/.test(n))return 'Kitchen Pantry Cabinet';
    if(/opposite/.test(n))return 'Kitchen Storage Cabinet';
  }
  if(/low roof/.test(n)&&/frame|shutter/.test(`${n} ${wt}`))return 'Low-Roof Frame and Shutters';
  if(/loft/.test(n)&&!/panelling|under|below|light/.test(n)){
    if(/fixed|filler|cover panel/.test(n))return 'High-Level Closure Panel';
    if(/frame|shutter/.test(n)&&!/box/.test(n))return 'Loft Frame and Shutters';
    if(/^(?:box(?: type)? loft|loft (?:box|storage) cabinet)/.test(n))return 'Loft Storage Cabinet';
    if(furnitureConstruction(workType)==='box')return 'Loft Storage Cabinet';
    if(furnitureConstruction(workType)==='frame')return 'Loft Frame and Shutters';
    return name; // A bare loft does not choose its construction.
  }
  if(/pooja|puja/.test(n)&&/cnc|glass|door|shutter/.test(n)){
    const cabinet=/cabinet/.test(n)&&!/entrance/.test(n);
    if(cabinet)return /glass/.test(n)&&!/cnc/.test(n)?'Pooja Cabinet Glass Shutters':/cnc/.test(n)&&!/glass/.test(n)?'Pooja Cabinet CNC Shutters':name;
    if(/entrance|room/.test(n)){
      if(/cnc/.test(n)&&/glass/.test(n)&&!/\bor\b|\//.test(name.toLowerCase()))return 'Pooja Entrance CNC Doors with Glass Inserts';
      if(/cnc/.test(n)&&!/glass/.test(n))return 'Pooja Entrance CNC Doors';
      if(/glass/.test(n)&&!/cnc/.test(n))return 'Pooja Entrance Glass Doors';
    }
    return name;
  }
  if(/pillar|column/.test(n)&&/panelling|cladding/.test(n))return /upper/.test(n)?'Upper Pillar Wall Panelling':'Pillar Wall Panelling';
  if(/breakfast/.test(n)&&/panelling/.test(n))return 'Breakfast Counter Wall Panelling';
  if(/under loft|below loft/.test(n)&&/panelling/.test(n))return 'Wall Panelling Under Loft';
  if(/crockery/.test(n)){
    if(/overhead|upper|wall mounted|above/.test(n))return /display/.test(n)?'Crockery Overhead Display Cabinet':'Crockery Overhead Cabinet';
    if(/base|lower/.test(n))return 'Crockery Base Cabinet';
    if(/mini/.test(n))return 'Crockery Cabinet';
  }
  if(/^folding table$/.test(n)&&wt==='folding table')return 'Wall-Mounted Folding Table';
  return aliases.get(n)||name;
}

const nouns:Record<string,string>={
  'Wardrobe Cabinet':'wardrobe','Wardrobe Frame and Shutters':'the wardrobe','Loft Storage Cabinet':'loft storage cabinet',
  'Kitchen Base Cabinet':'kitchen base storage','Kitchen Overhead Wall Cabinet':'kitchen overhead storage','Kitchen Storage Cabinet':'kitchen storage',
  'Kitchen Tall Cabinet':'tall kitchen storage','Kitchen Tall Utility Cabinet':'tall kitchen utility storage','Kitchen Full-Height Utility Cabinet':'full-height kitchen utility storage','Kitchen Pantry Cabinet':'kitchen pantry storage',
  'Dressing Table':'dressing table','Study Table':'study table','Wash Area Utility Cabinet':'wash-area utility storage','Utility Storage Cabinet':'utility storage',
  'Breakfast Counter Cabinet':'breakfast-counter storage','Crockery Cabinet':'crockery storage','Crockery Base Cabinet':'crockery base storage','Crockery Overhead Cabinet':'overhead crockery storage','Crockery Overhead Display Cabinet':'overhead crockery display storage',
  'Bathroom Vanity Cabinet':'bathroom vanity storage','Shoe Storage Cabinet':'shoe storage','TV Console Cabinet':'TV console storage','TV Wall Cabinet':'TV wall storage','Pooja Mandir Cabinet':'pooja mandir storage','Internal Wardrobe Locker':'the internal wardrobe locker','Internal Wardrobe Storage Compartment':'the internal wardrobe storage compartment','Bookshelf':'book storage',
};
export function standardFurnitureSpecification(name:string,workType:string):string|null {
  if(key(workType)==='tandem or ss baskets'){
    if(name==='Soft-Close Kitchen Drawer System')return 'Soft-close kitchen drawer system (tandem type), with the specified runners and fittings.';
    if(name==='Stainless-Steel Pull-Out Basket')return 'Stainless-steel pull-out basket with the specified fittings.';
    if(name==='SS 304 Pull-Out Basket')return 'Grade 304 stainless-steel pull-out basket with the specified fittings.';
    if(name==='Kitchen Drawer Systems / Stainless-Steel Baskets')return 'Soft-close kitchen drawer systems or stainless-steel pull-out baskets, with the specified fittings.';
  }
  const construction=furnitureConstruction(workType),noun=nouns[name];
  if(name==='Loft Frame and Shutters'&&construction==='frame')return 'Loft frame and shutters with inside and outside laminate finish.';
  if(name==='Low-Roof Frame and Shutters'&&construction==='frame')return 'Frame and shutters for the low-roof storage opening, with inside and outside laminate finish.';
  if(construction==='box'&&name==='Loft Storage Cabinet')return 'Box-type loft storage cabinet with inside and outside laminate finish.';
  if(!construction||!noun)return null;
  return construction==='box'?`Box-type construction for ${noun}, with inside and outside laminate finish.`:`Frame-and-shutter construction for ${noun}, with inside and outside laminate finish.`;
}

/** Lock generic wording, preserve every meaningful exception and confirmed component. */
export function formatFurnitureSpecification(raw:string,name:string,workType:string,room=''):string {
  const title=canonicalFurnitureName(name,workType,room,raw),standard=standardFurnitureSpecification(title,workType);
  const cleaned=raw.trim().replace(/\bbox[- ]type\b/gi,'Box-type').replace(/\bframe[- ]type\b/gi,'Frame-and-shutter').replace(/draws\b/gi,'drawers').replace(/\s+/g,' ');
  const text=cleaned.replace(/[. ]+$/,'');
  if(furnitureConstructionConflict(name,raw,workType))return text?text+'.':'See the agreed item specification.';
  // Only vocabulary/finish words may be replaced. Numbers, locations, special
  // materials, shelves, locks, glass, models and operation details are retained.
  const common=new Set('a an the for of box type frame and shutter shutters construction cabinet carcass with inside outside internal external laminate laminated finish finished high glossy gloss sf matte modular unit storage furniture wardrobe cupboard study dressing table kitchen base lower under counter overhead wall upper tall utility full height pantry breakfast crockery display wash area laundry shoe tv console pooja mandir book bookshelf locker compartment loft on both faces'.split(' '));
  const hardware=new Set('a an the of for with and or soft close kitchen drawer drawers system systems tandem type ss stainless steel pull out basket baskets runner runners specified fittings fitting hardware channels telescopic installation unit units one two three four five six seven eight nine ten'.split(' '));
  if(title==='SS 304 Pull-Out Basket'){hardware.add('304');hardware.add('grade');hardware.add('ss304');}
  const plain=key(text).split(' ').filter(Boolean),generic=plain.length>0&&plain.every(word=>(furnitureConstruction(workType)?common:hardware).has(word));
  if(standard&&generic)return standard;
  if(!text)return standard||'See the agreed item specification.';
  const construction=furnitureConstruction(workType);
  if(construction&&!/^(?:Box-type|Frame-and-shutter|Frame and shutters|Loft frame and shutters)/i.test(text))return `${construction==='box'?'Box-type':'Frame-and-shutter'} construction. ${text}.`;
  return text+'.';
}

export function retypeFurnitureSpecification(raw:string,name:string,oldType:string,newType:string,room=''):string {
  const oldName=canonicalFurnitureName(name,oldType,room,raw),oldStandard=standardFurnitureSpecification(oldName,oldType);
  if(oldStandard&&formatFurnitureSpecification(raw,oldName,oldType,room)===oldStandard){
    const family=/^Wardrobe (?:Cabinet|Frame and Shutters)$/.test(name)?'Wardrobe':/^Loft (?:Storage Cabinet|Frame and Shutters)$/.test(name)?'Loft':name;
    const newName=canonicalFurnitureName(family,newType,room);
    return standardFurnitureSpecification(newName,newType)||raw;
  }
  return raw; // Custom components/finishes require explicit review, never silent removal.
}

export function normalizedAssistantLessons(lessons:readonly string[]=[]):string[] {
  const result:string[]=[];let kitchen=false,count=false;
  for(const lesson of lessons){
    if(/^Modular kitchen tandem drawer units/i.test(lesson)&&/default quantity:\s*6/.test(lesson)){if(!kitchen)result.push(KITCHEN_DEFAULT_LESSON);kitchen=true;continue;}
    if(/^Every room item must have a non-empty English string in size_text/i.test(lesson)){if(!count)result.push(COUNT_ITEM_LESSON);count=true;continue;}
    if(lesson.trim()&&!result.includes(lesson.trim()))result.push(lesson.trim());
  }
  return result;
}

export function buildFurnitureContractInstructions():string {
  return `APPROVED NAMING AND SPECIFICATION CONTRACT
Use this one dictionary in every quotation. Repeat exactly the same canonical name and base sentence for the same confirmed product/construction; change wording only when the actual scope changes. Cabinet type must explicitly appear in source_text_en, not only in the rate key. No new construction JSON field is needed.
${FURNITURE_VOCABULARY.map(([name,aliases])=>`- ${name}: ${aliases}.${nouns[name]?` Exact template function: "${nouns[name]}".`:''}`).join('\n')}

FIXED CONSTRUCTION-FIRST WORDING
- Box type: "Box-type construction for [confirmed furniture function], with inside and outside laminate finish."
- Frame type: "Frame-and-shutter construction for [confirmed furniture function], with inside and outside laminate finish."
- Loft closure: "Loft frame and shutters with inside and outside laminate finish."
- Box loft: "Box-type loft storage cabinet with inside and outside laminate finish."
- Low-roof closure: "Frame and shutters for the low-roof storage opening, with inside and outside laminate finish."
- Tandem: "Soft-close kitchen drawer system (tandem type), with the specified runners and fittings."
- SS basket: "Stainless-steel pull-out basket with the specified fittings."
For the Box type and Frame type templates, use the dictionary's exact template function verbatim, not a new synonym. The special loft/low-roof and fitting sentences above take precedence over the general template. This keeps an otherwise identical unit's complete base sentence the same in every quotation.
These laminate sentences describe the approved standard scope. Preserve actual acrylic/veneer/paint/glass/WPC finishes and confirmed exceptions instead of rewriting them as laminate. A bare nickname must not select construction or rates. A Frame type kitchen base/wall or crockery unit is valid: its functional title stays fixed and its specification says Frame-and-shutter. ${OWNER_FRAME_TYPE_DEFINITION} Box type does not silently add a stated number of shelves, locks, partitions, doors or a particular depth. Do not call Frame type an American face-frame/frameless cabinet.

SS means stainless steel. Owner usage "tandem basket" maps to Soft-Close Kitchen Drawer System; it is distinct from an SS pull-out basket and does not promise Blum, TANDEMBOX, a particular model, steel grade, load rating or metal-side construction. Confirmed branded products keep their actual brand/model in the specification. Only say SS 304 if grade 304 was confirmed. Telescopic channels are not automatically soft-close. If the owner expressly offers tandem or SS as alternatives, use Kitchen Drawer Systems / Stainless-Steel Baskets and retain the alternative in the specification; six total is not six of each. Do not invent the split of an approved mixture.

SAFE ALIASES AND SCOPE
Pull-out does not mean stainless-steel basket. Opposite-side does not mean tall/full-height. Mini crockery does not prove overhead/display. A locker nickname does not prove a supplied lock. Shoe Rack stays distinct from a closed cabinet. TV unit may be a composition; do not silently reduce it to a console. Pooja cabinet shutters are not room-entrance doors, and CNC/glass alternatives are not automatically supplied together. Keep box lofts, front closures and fixed panels distinct. Preserve material, face-finish, dimensions, location and components. Never auto-split a combined wardrobe/dressing, loft/wardrobe or TV item or reallocate its measured frontage, PVC basis or price without approval. Name/rate construction conflicts need one consolidated owner clarification. Do not rename machine work_type keys or change rates to correct English.

OWNER KITCHEN DEFAULT AND SIZE_TEXT
${KITCHEN_DEFAULT_LESSON}
An expressly saved later owner default takes precedence over the original six-unit default; a project-only quantity change does not rewrite the reusable default.
${COUNT_ITEM_LESSON}
Keep measure.unit each and measure.per_item 1 for individually billed fittings; quantity is multiplied once. Preserve approved set or lumpsum billing instead of converting individual units to sets. Missing actual square-foot dimensions must remain unresolved, not be replaced with Standard size. Suggested add-ons outside the agreed room scope may retain null measurements until accepted. Your final JSON must contain real confirmed text, never literal [template placeholders].

FINAL WORDING CHECK
Before the compact review and final JSON: canonical title; construction-first specification; confirmed exceptions retained; correct work_type/unit/count; unchanged saved rates; no duplicated six-unit allowance; linked furniture and room order preserved; no shared app-generated policy duplicated. Use the approved dictionary in the app and copied setup. For an unlisted recurring product, obtain one clear name and scope from the owner; when the owner asks to remember it, use the supported root assistant_memory_updates for a reusable name/alias rule with no customer details. Do not invent a furniture_catalogue JSON field. The owner imports the correction and copies the refreshed setup for new chats. The app preserves clear unlisted names; chat memory alone does not update an external Gem or guarantee persistence across new chats.`;
}
