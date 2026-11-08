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
  ['TV Unit','TV unit, television unit, TV media unit'],
  ['TV Unit with Wall Panelling','combined TV cabinet and wall panelling, complete TV unit with wall panel'],
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
export const TV_DECOR_DEFAULT_LESSON='For new complete TV units, decorative louvers or charcoal panelling is included in the TV unit scope and its agreed price, as selected. State this included alternative in the TV item specification; do not add a separate paid recommendation or charge for the same scope. An explicit owner exclusion or console-only brief takes precedence. This default does not establish a specific panel product, brand, material, thickness or changed rate.';

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
  // A rate-category label is not a product title. Resolve only from explicit item facts.
  if(n===key('Pooja CNC / glass door paneling')){
    const entrance=/\bentrance\b/.test(context),cabinet=/\bcabinet\b/.test(context),cnc=/\bcnc\b/.test(context),glass=/\bglass\b/.test(context);
    if(entrance&&cnc&&!glass)return 'Pooja Entrance CNC Doors';
    if(entrance&&glass&&!cnc)return 'Pooja Entrance Glass Doors';
    if(cabinet&&cnc&&!glass)return 'Pooja Cabinet CNC Shutters';
    if(cabinet&&glass&&!cnc)return 'Pooja Cabinet Glass Shutters';
    return name;
  }
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
  'Wardrobe Cabinet':'wardrobe','Wardrobe Frame and Shutters':'wardrobe','Loft Storage Cabinet':'loft storage cabinet',
  'Kitchen Base Cabinet':'kitchen base cabinet','Kitchen Overhead Wall Cabinet':'kitchen overhead wall cabinet','Kitchen Storage Cabinet':'kitchen storage cabinet',
  'Kitchen Tall Cabinet':'tall kitchen cabinet','Kitchen Tall Utility Cabinet':'tall kitchen utility cabinet','Kitchen Full-Height Utility Cabinet':'full-height kitchen utility cabinet','Kitchen Pantry Cabinet':'kitchen pantry cabinet',
  'Dressing Table':'dressing table','Study Table':'study table','Wash Area Utility Cabinet':'wash-area utility cabinet','Utility Storage Cabinet':'utility storage cabinet',
  'Breakfast Counter Cabinet':'breakfast counter cabinet','Crockery Cabinet':'crockery cabinet','Crockery Base Cabinet':'crockery base cabinet','Crockery Overhead Cabinet':'crockery overhead cabinet','Crockery Overhead Display Cabinet':'crockery overhead display cabinet',
  'Bathroom Vanity Cabinet':'bathroom vanity cabinet','Shoe Storage Cabinet':'shoe storage cabinet','TV Unit':'TV unit','TV Console Cabinet':'TV console cabinet','TV Wall Cabinet':'TV wall cabinet','Pooja Mandir Cabinet':'pooja mandir cabinet','Internal Wardrobe Locker':'internal wardrobe locker','Internal Wardrobe Storage Compartment':'internal wardrobe storage compartment','Bookshelf':'bookshelf',
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
  if(construction==='frame'&&name==='Wardrobe Frame and Shutters')return 'Wardrobe frame and shutters with inside and outside laminate finish.';
  if(!construction||!noun)return null;
  return construction==='box'?`Box-type ${noun} with inside and outside laminate finish.`:`Frame and shutters for the ${noun}, with inside and outside laminate finish.`;
}

/** Remove familiar redundant phrases without discarding confirmed components. */
export function simplifyFurnitureLanguage(raw:string):string {
  const phrases:[RegExp,string][]=[
    [/\bstudy\s+table\s+work\s*station\b/gi,'study table'],[/\bstudy\s+work\s*station\b/gi,'study table'],
    [/\bTV\s+media\s+console\s+cabinet\b/gi,'TV console cabinet'],
    [/\bbreakfast\s+counter\s+console(?:\s+cabinet)?\b/gi,'breakfast counter cabinet'],
    [/\bwith\s+(?:drawer\s+storage|storage\s+drawers)\b/gi,'with drawers'],
    [/\bwardrobe\s+framework\b/gi,'wardrobe frame'],[/\bcarcass\s+depth\b/gi,'cabinet depth'],
    [/\bcarcass\s+cabinet\b/gi,'cabinet'],[/\bcarcasses\b/gi,'cabinet bodies'],[/\bcarcass\b/gi,'cabinet body'],
    [/\boutside\s+decorative\s+laminate\s+finish\b/gi,'outside laminate finish'],
  ];
  let text=raw;
  for(const [pattern,replacement] of phrases)text=text.replace(pattern,match=>match[0]===match[0].toUpperCase()?replacement[0].toUpperCase()+replacement.slice(1):replacement);
  return text.replace(/\s+/g,' ').trim();
}

/** Lock generic wording, preserve every meaningful exception and confirmed component. */
export function formatFurnitureSpecification(raw:string,name:string,workType:string,room=''):string {
  const title=canonicalFurnitureName(name,workType,room,raw),standard=standardFurnitureSpecification(title,workType);
  const supplied=simplifyFurnitureLanguage(raw).replace(/\bbox[- ]type\b/gi,'Box-type').replace(/\bframe[- ]type\b/gi,'Frame-and-shutter').replace(/draws\b/gi,'drawers');
  const cleaned=supplied.replace(/^(?:Box[- ]type|Frame[- ]and[- ]shutter) construction\.\s*/i,'');
  const text=cleaned.replace(/[. ]+$/,'');
  if(furnitureConstructionConflict(name,raw,workType))return supplied?supplied.replace(/[. ]+$/,'')+'.':'See the agreed item specification.';
  // Only vocabulary/finish words may be replaced. Numbers, locations, special
  // materials, shelves, locks, glass, models and operation details are retained.
  const common=new Set('a an the for of box type frame and shutter shutters construction cabinet carcass with inside outside internal external laminate laminated finish finished high glossy gloss sf matte modular unit storage furniture wardrobe cupboard study dressing table kitchen base lower under counter overhead wall upper tall utility full height pantry breakfast crockery display wash area laundry shoe tv console media pooja mandir book bookshelf locker compartment loft on both faces'.split(' '));
  if(title==='Kitchen Overhead Wall Cabinet')common.add('mounted'); // Already explicit in this title.
  if(title==='Loft Frame and Shutters'||title==='Low-Roof Frame and Shutters')for(const word of ['framing','enclosure'])common.add(word);
  const hardware=new Set('a an the of for with and or soft close modular kitchen drawer drawers system systems tandem type ss stainless steel pull out basket baskets runner runners specified fittings fitting hardware channels telescopic installation unit units one two three four five six seven eight nine ten'.split(' '));
  if(title==='SS 304 Pull-Out Basket'){hardware.add('304');hardware.add('grade');hardware.add('ss304');}
  const plain=key(text).split(' ').filter(Boolean),generic=plain.length>0&&plain.every(word=>(furnitureConstruction(workType)?common:hardware).has(word));
  if(standard&&generic&&['Study Table','Dressing Table'].includes(title)&&/\bstorage\b/.test(key(text)))return standard.replace('with inside and outside laminate finish','with storage and inside and outside laminate finish');
  if(standard&&generic)return standard;
  if(!text)return standard||'See the agreed item specification.';
  const construction=furnitureConstruction(workType);
  if(construction&&!/\b(?:Box-type|Frame-and-shutter|frame(?:work)? and shutters|frame and shutter)\b/i.test(text)){
    if(construction==='box'&&/^(?:wall[- ]mounted |floor[- ]standing |under[- ]counter )?(?:cabinet|wardrobe|dressing|study|utility|kitchen|tv|crockery|shoe|pooja|storage)\b/i.test(text))return `Box-type ${/^TV\b/.test(text)?text:text[0].toLowerCase()+text.slice(1)}.`;
    return `${construction==='box'?'Box-type':'Frame-and-shutter'} unit: ${text}.`;
  }
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

export function buildPlainLanguageInstructions():string {
  return `PLAIN ENGLISH FOR THE WHOLE QUOTATION
Apply this to EVERY room, furniture name, item specification, proposed add-on, recommendation reason, job-specific note, review table and owner question. The goal is for a customer to understand what is supplied on the first reading. Use familiar words and short factual sentences. This is not limited to the study table or TV unit.
Use the approved functional name, then only the confirmed construction, useful storage/features and finish. Do not stack synonyms such as study table workstation desk, TV media entertainment console cabinet, wardrobe storage solution or breakfast counter console unit. Reuse the same plain term for the same product. Keep the approved dictionary's scope distinctions; do not rename every cabinet to storage or every pull-out to basket.
Avoid sales language such as bespoke, curated, luxurious, sophisticated, elevated aesthetic, enhanced ambience, premium look, seamless integration, state-of-the-art or ergonomic design without specific confirmed facts. A genuine package named Premium, exact manufacturer/product name or an owner-confirmed technical feature must remain unchanged. Do not delete a product name merely because it contains an adjective.

| Work | Plain wording to follow when those facts are confirmed |
|---|---|
| Study table, storage unspecified | Study table with storage. Do not invent drawers or shelves. |
| Study table, drawers confirmed | Study table with drawers. Keep any confirmed number, locks or drawer fittings. |
| Box-type study table | Box-type study table with storage and inside and outside laminate finish. Say drawers instead of storage when drawers are confirmed. |
| Folding study table | Wall-mounted folding table with laminate finish. Keep confirmed brackets, size and load details; do not add heavy-duty as praise. |
| Complete TV unit | TV Unit; use the approved Box-type TV unit sentence and its included louvers/charcoal choice. Do not call the full setup a media console. |
| Crockery storage | Crockery cabinet with storage. Use overhead or display only when confirmed; do not add showcase, glass or lighting. |
| Kitchen lower cabinets | Box-type kitchen base cabinet with inside and outside laminate finish. |
| Kitchen upper cabinets | Box-type kitchen overhead wall cabinet with inside and outside laminate finish. |
| Kitchen tall/pantry storage | Tall kitchen storage cabinet; retain a confirmed pantry/food-storage or full-height function rather than inventing one. |
| Kitchen drawer systems | Soft-close kitchen drawer system (tandem type). Keep the agreed count and confirmed fittings; SS basket is a different product. |
| Wardrobe | Box-type wardrobe, or wardrobe frame and shutters, with the confirmed laminate finish. |
| Loft and low-roof storage | Loft frame and shutters, low-roof frame and shutters, or box-type loft storage cabinet, according to the confirmed work. |
| Storage inside wardrobe | Wardrobe storage compartment, locker or drawer, as confirmed. Do not promise a lock from the word locker alone. |
| Dressing table | Dressing table with storage; mention a mirror or drawers only when included. |
| Pooja | Pooja cabinet; Pooja entrance doors with CNC-cut design or glass, as actually specified. Keep cabinet shutters separate from entrance doors. |
| Breakfast counter | Breakfast counter cabinet with storage. Do not add console or a countertop material unless confirmed. |
| Wash area / washbasin | Wash area cabinet or cabinet below the washbasin. Keep their actual locations and supplied scope distinct. |
| Shoe storage | Shoe storage cabinet for a closed cabinet; shoe rack for an open rack. |
| Wall / pillar panels | Wall panelling or pillar panelling, with the confirmed material and finish. Use below/above only for the actual location. |
| Mirror, bookshelf, bed and ceiling | Use the exact confirmed object: mirror backing panel, bookshelf, wall-mounted bed, folding bed or gypsum false ceiling. Do not add multifunctional, luxury, floating or space-saving mechanisms. |

These are writing patterns, not a list of mandatory furniture, included features or new work_type keys. Keep the existing canonical product title and exact machine rate key. Preserve all confirmed dimensions, counts, drawer/shelf details, locks, soft-close mechanisms, material/grade/thickness, brands, mounting, combined work and Box/Frame type. Shorter wording must not broaden, reduce, duplicate or reprice the work. For example, two lockable drawers must not become generic storage; unspecified storage must not become two drawers.
Use cabinet body or cabinet depth instead of carcass when the meaning is the same. Use laminate finish instead of an inflated phrase about aesthetic appeal. Technical terms needed for accuracy stay, with a short ordinary explanation where useful. A plain name does not prove a different material, warranty, rate or construction.
Keep each add-on reason to a direct benefit and a relevant condition, usually one short sentence: "Adds space for books; confirm the wall space." Do not claim it will transform the home, enhance the aesthetic or suit a guessed household habit. Do not repeat the item name as a longer sales pitch. Keep unknown measurements null and respect all existing optional-scope rules.
For owner questions use direct wording such as "What are the height and width?" or "Does this include drawers?" Collect missing facts together instead of a formal interview for each item. Use simple text for genuine job-specific notes. Standard bank/payment/material/warranty/terms sections remain app-generated; do not rewrite, duplicate, weaken or invent them in JSON to achieve simpler language.
Before final JSON, read EVERY title, source_text_en, suggested_addons reason/specification and approved note. Replace wordy phrases with the shortest accurate wording, check that no included detail or scope changed, and remove unsupported praise. Do not change customer names, brand/product names, Basic/Standard/Premium labels, machine keys, pricing or package policy during this language pass.`;
}

/** Interview checklist, never an automatic bill of quantities or customer note. */
export function buildCommonScopeInstructions():string {
  return `USUAL HOME SCOPE TEMPLATE AND OMISSION CHECK
Act as a careful quotation assistant, not just a transcription tool. At the start of a new quotation, compare the brief with this reusable room checklist. Offer the relevant usual scope and ask the owner to keep it or change it; proactively flag common work that was not mentioned. This checklist is a starting proposal, not proof that every home needs or includes every unit.

| Supplied room | Usual scope to review | Related work to check only when relevant |
|---|---|---|
| Hall / Living & Dining | TV Unit, including the saved louvers/charcoal choice; Crockery Cabinet | Distinct additional panelling only if outside the included TV scope; loft above the confirmed TV/crockery unit; Bathroom Vanity Cabinet only for a supplied dining washbasin area |
| Pooja | Pooja Mandir Cabinet | Cabinet shutters versus entrance doors; CNC, glass or combined work only when specified; related panels |
| Kitchen | Kitchen Base Cabinet; Kitchen Overhead Wall Cabinet; the saved six drawer/basket units total | Loft and its linked panelling; opposite-side storage; tall/utility storage; Wash Area Utility Cabinet; Breakfast Counter Cabinet and its wall panelling; Crockery Overhead Display Cabinet, only where needed |
| Master / other bedrooms | Wardrobe; its confirmed loft; Dressing Table | Loft above dressing; Internal Wardrobe Locker or storage compartment; Study Table or Wall-Mounted Folding Table if needed |
| Children's Bedroom | Wardrobe; its confirmed loft; Study Table | Dressing Table, internal storage and other related work only when requested or confirmed |
| Study / Office | Study Table | Bookshelf and other storage only if needed |
| Utility / Wash Area / Bathroom | Wash Area Utility Cabinet or Bathroom Vanity Cabinet, as appropriate to the actual room | Confirm the unit's location and construction; do not treat a laundry cabinet and a basin cabinet as the same work |
| Entrance & Shoe Storage — last | Shoe Storage Cabinet or Shoe Rack, according to the actual request | Only the confirmed related work; retain its actual indoor/outdoor location |

SMART DEFAULTS — KEEP CONFIRMED DETAILS, ASK ONLY ABOUT GAPS
1. Establish whether this is a full-home quotation, selected-room/unit work, or an existing quotation revision. Use rooms identified by the owner or a readable supplied plan; do not create absent rooms. A narrow request such as "only the kitchen overhead cabinet" limits the scope and excludes unrelated template items, including the normal six-unit allowance. A plan establishes a review reference, not proof that all furniture is commissioned or that unlabelled dimensions/construction are confirmed.
2. Carry current saved rates, approved standard construction/finish wording and expressly saved reusable defaults automatically. Tell the owner briefly which defaults are being used instead of asking the same rate/material questions for every item. Six kitchen drawer/basket units TOTAL is the existing numeric scope default; the included TV louvers/charcoal choice follows the approved TV rule below. An explicit project count or exclusion wins. The template above supplies no other automatic measurements, quantities, room counts, construction choice or prices.
3. Before creating final JSON, make a scope coverage pass for EACH supplied room. Separate Confirmed, Using saved default, Not mentioned — confirm, and Excluded / not applicable. Keep an internal exclusion list for this job; a deliberate exclusion is not an oversight. Mention only relevant missing candidates. Never say the owner definitely forgot an item merely because it appears in the template.
4. On the initial scope pass, use ONE compact interview table: Room | Confirmed / usual default | Not mentioned — confirm | Missing facts. Ask one combined question, for example: "Keep this usual scope? Please list only changes or exclusions, and the missing dimensions/counts together." If the owner says "same", "keep it" or "use my usual template", that confirms only the clearly displayed proposed scope and stated saved defaults; it does not invent missing measurements, quantities, construction, rooms or optional upgrades. Offer the matching saved defaults and ask only the remaining gaps. Avoid repeating the whole table after each answer.
5. An unmentioned checklist candidate stays outside rooms[].items and totals until confirmed. Do not turn it into a charge, a mandatory clarification, an owner request or a customer-facing note. If the owner accepts it, add the actual item with the correct canonical title, confirmed construction and linked parent, then collect all missing required facts in one batch. If required agreed-scope facts remain unknown, keep them null and use precise supported needs_clarification paths. Unaccepted suggestions are not missing agreed scope.
6. Check assemblies before asking: a combined TV unit, Wardrobe and Loft Unit, Wardrobe and Dressing Unit, or named cabinet may already cover related work. Preserve combined scope and billing; ask once if coverage is ambiguous. Never add a second loft, count an internal component twice, assume a lock/mirror/door, or add separate charged wardrobe drawers merely because the package already includes a drawer allowance. Each confirmed loft follows its own main unit using parent_item_index; Entrance & Shoe Storage remains last.
7. For an existing quotation, its confirmed rooms/items and deliberate omissions are the starting template. Apply the requested changes only; do not rebuild it from the full-home checklist, replace approved exceptions, or insert the kitchen default a second time. When a change affects a parent link, count, measure or price, review the affected rows and totals together.
8. Once the omission check is answered, preserve the answers and proceed. The final ordinary review remains the existing THREE tables; include only confirmed scope and saved defaults in Room scope. Summarise any still-relevant scope question briefly with the one combined review question, not a fourth full checklist. Do not demand another confirmation when all applicable facts were already confirmed. On an explicit final-JSON request, return the supported object with unresolved agreed facts if necessary; do not silently accept template candidates.
9. Treat a new choice as job-only unless the owner explicitly asks to remember it for future quotations. For an expressly reusable scope rule, emit supported assistant_memory_updates with a concise customer-free instruction, such as "For new full-home kitchen quotations, include four drawer/basket units total unless changed by the owner." Keep later saved defaults above the original template; never save this customer's dimensions, site, identity or excluded rooms as a universal rule. The owner imports/saves the rule and refreshes the Gem/Custom GPT setup for new chats; do not claim that chat memory silently updates it.

OMISSION-CHECK EXAMPLES
- Kitchen base/overhead cabinets supplied but drawer/basket count not mentioned: show the saved six TOTAL as the carried default and invite one change/exclusion; do not add six of each or duplicate an existing fitting line.
- Owner explicitly says five baskets: keep five and ask no six-unit question. Owner says no lofts: record that exclusion for this job and stop suggesting lofts.
- Bedroom wardrobe supplied but loft/dressing not discussed: ask once whether those usual elements are required. Their omission alone is not a publication blocker and never invents an item.
- Full home versus kitchen-only: ask about relevant supplied rooms only. Do not add Hall, Pooja, bedrooms or shoe storage to a kitchen-only quotation.
- Owner says "keep all as shown" but a wardrobe's Height × Width or construction is missing: keep the confirmed scope and saved prices; collect those missing facts together, without guessing dimensions or Box/Frame type.
- A useful new idea beyond the reviewed scope may go in tailored suggested_addons with optional:true and null unknowns. Do not repeat declined checklist items as recommendations or add accepted scope a second time.`;
}

export function buildFurnitureContractInstructions():string {
  return `APPROVED NAMING AND SPECIFICATION CONTRACT
Use this one dictionary in every quotation. Repeat exactly the same canonical name and base sentence for the same confirmed product/construction; change wording only when the actual scope changes. Cabinet type must explicitly appear in source_text_en, not only in the rate key. No new construction JSON field is needed.
Never copy a broad work_type category such as Pooja CNC / glass door paneling as the furniture name. Name the confirmed product instead: entrance CNC doors, entrance glass doors or cabinet shutters. A slash in a rate category does not confirm that both materials are supplied. Preserve explicitly confirmed double shutters, glass thickness or CNC work; ask once when the actual product is unclear.
${FURNITURE_VOCABULARY.map(([name,aliases])=>`- ${name}: ${aliases}.${nouns[name]?` Exact template function: "${nouns[name]}".`:''}`).join('\n')}

${buildPlainLanguageInstructions()}

FIXED CUSTOMER-FRIENDLY WORDING
Use direct, familiar sentences. Do not inflate "TV unit" into "TV media console cabinet" or add "construction for" to every item. TV Unit is the normal title for the complete TV arrangement; TV Console Cabinet is reserved for an explicitly cabinet-only/console-only scope. "Media" is unnecessary unless it describes a real distinction supplied by the owner. Preserve an explicitly confirmed combined TV Unit with Wall Panelling identity in an existing revision rather than narrowing it to a console.
- Box type: "Box-type [confirmed furniture function] with inside and outside laminate finish."
- Frame type: "Frame and shutters for the [confirmed furniture function], with inside and outside laminate finish."
- Frame wardrobe: "Wardrobe frame and shutters with inside and outside laminate finish."
- Loft closure: "Loft frame and shutters with inside and outside laminate finish."
- Box loft: "Box-type loft storage cabinet with inside and outside laminate finish."
- Low-roof closure: "Frame and shutters for the low-roof storage opening, with inside and outside laminate finish."
- Tandem: "Soft-close kitchen drawer system (tandem type), with the specified runners and fittings."
- SS basket: "Stainless-steel pull-out basket with the specified fittings."
For the Box type and Frame type templates, use the dictionary's exact template function verbatim, not a new synonym. The special loft/low-roof and fitting sentences above take precedence over the general template. This keeps an otherwise identical unit's complete base sentence the same in every quotation.
These laminate sentences describe the approved standard scope. Preserve actual acrylic/veneer/paint/glass/WPC finishes and confirmed exceptions instead of rewriting them as laminate. A bare nickname must not select construction or rates. A Frame type kitchen base/wall or crockery unit is valid: its functional title stays fixed and its specification states frame and shutters. ${OWNER_FRAME_TYPE_DEFINITION} Box type does not silently add a stated number of shelves, locks, partitions, doors or a particular depth. Do not call Frame type an American face-frame/frameless cabinet.

INCLUDED TV DECOR — OWNER-CONFIRMED DEFAULT
${TV_DECOR_DEFAULT_LESSON}
For a normal new Box type TV unit, use: "Box-type TV unit with inside and outside laminate finish, and decorative louvers or charcoal panelling, as selected." If the owner has selected one finish, state only that confirmed finish. The inside/outside laminate describes the cabinet; decorative louvers/charcoal describe the included feature treatment. Do not replace all laminate with charcoal, promise both treatments together, infer wooden/PVC/WPC construction or a brand from "charcoal", or add an unapproved grade/model/thickness. Use this included choice without asking the owner again for every new full TV unit. An expressly cabinet-only scope or owner exception is different; preserve that limit.
The included finish is part of the agreed TV unit price: do not create a second paid panel item, suggest the same louvers/charcoal in suggested_addons, multiply the wall area twice or change Box type rates. A genuine separate extra or special material/rate must be explicitly approved. Do not silently add this new scope to historical records; preserve their recorded facts unless the owner revises them. The JSON item carries this scope sentence; it is not a generic quote.notes entry.

SS means stainless steel. Owner usage "tandem basket" maps to Soft-Close Kitchen Drawer System; it is distinct from an SS pull-out basket and does not promise Blum, TANDEMBOX, a particular model, steel grade, load rating or metal-side construction. Confirmed branded products keep their actual brand/model in the specification. Only say SS 304 if grade 304 was confirmed. Telescopic channels are not automatically soft-close. If the owner expressly offers tandem or SS as alternatives, use Kitchen Drawer Systems / Stainless-Steel Baskets and retain the alternative in the specification; six total is not six of each. Do not invent the split of an approved mixture.

SAFE ALIASES AND SCOPE
Do not add the standalone prefixes "Box-type construction." or "Frame-and-shutter construction." before an otherwise complete sentence. Use the exact base sentence above or integrate the confirmed type naturally with bespoke details. Retain wall-mounted/wall-anchored facts when they distinguish the actual unit. A TV Console Cabinet is the cabinet scope; a complete cabinet plus wall-panel assembly uses TV Unit with Wall Panelling, only after the owner confirms that combined scope. A conspicuously wall-sized console measurement is a reason to ask once about scope/orientation, not a reason to silently rename, resize, split or reprice it. Never convert decimal feet to feet-and-inches.
parent_item_index groups related work; it does not mean every child is ABOVE its parent. A loft can be above its main cabinet; Wall Panelling Under Loft is BELOW its linked loft; an internal component is inside its cabinet. Do not write a contradictory relationship into the specification or create a separate charged panel merely to fix a label.
Pull-out does not mean stainless-steel basket. Opposite-side does not mean tall/full-height. Mini crockery does not prove overhead/display. A locker nickname does not prove a supplied lock. Shoe Rack stays distinct from a closed cabinet. TV unit may be a composition; do not silently reduce it to a console. Pooja cabinet shutters are not room-entrance doors, and CNC/glass alternatives are not automatically supplied together. Keep box lofts, front closures and fixed panels distinct. Preserve material, face-finish, dimensions, location and components. Never auto-split a combined wardrobe/dressing, loft/wardrobe or TV item or reallocate its measured frontage, PVC basis or price without approval. Name/rate construction conflicts need one consolidated owner clarification. Do not rename machine work_type keys or change rates to correct English.

OWNER KITCHEN DEFAULT AND SIZE_TEXT
${KITCHEN_DEFAULT_LESSON}
An expressly saved later owner default takes precedence over the original six-unit default; a project-only quantity change does not rewrite the reusable default.
${COUNT_ITEM_LESSON}
Keep measure.unit each and measure.per_item 1 for individually billed fittings; quantity is multiplied once. Preserve approved set or lumpsum billing instead of converting individual units to sets. Missing actual square-foot dimensions must remain unresolved, not be replaced with Standard size. Suggested add-ons outside the agreed room scope may retain null measurements until accepted. Your final JSON must contain real confirmed text, never literal [template placeholders].

FINAL WORDING CHECK
Before the compact review and final JSON: canonical title; construction-first specification; confirmed exceptions retained; correct work_type/unit/count; unchanged saved rates; no duplicated six-unit allowance; linked furniture and room order preserved; no shared app-generated policy duplicated. Use the approved dictionary in the app and copied setup. For an unlisted recurring product, obtain one clear name and scope from the owner; when the owner asks to remember it, use the supported root assistant_memory_updates for a reusable name/alias rule with no customer details. Do not invent a furniture_catalogue JSON field. The owner imports the correction and copies the refreshed setup for new chats. The app preserves clear unlisted names; chat memory alone does not update an external Gem or guarantee persistence across new chats.`;
}
