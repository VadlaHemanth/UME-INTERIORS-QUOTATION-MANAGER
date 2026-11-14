import assert from 'node:assert/strict';
import test from 'node:test';
import {FURNITURE_VOCABULARY,canonicalFurnitureName,formatFurnitureSpecification,furnitureConstructionConflict,standardFurnitureSpecification,retypeFurnitureSpecification,KITCHEN_DEFAULT_LESSON,COUNT_ITEM_LESSON,OWNER_FRAME_TYPE_DEFINITION,KITCHEN_FITTINGS_DEFINITION} from './furniture-contract';
import {DEFAULT_UME_CATALOGUE,buildDynamicGemInstructions,formatCleanItemDescription} from './catalogue';
import {upgradeCatalogue} from './commercial-spec';
import {prepareQuotationDraft} from './quotation-presentation';
import {calculateQuotationPricing} from './pricing';
import {validateQuotationDraftV2} from './schema';
import {VIDYA_SAGAR_REDDY_DRAFT} from './historicalData';

test('approved dictionary is idempotent and aliases do not invent materials, height, mounting or components',()=>{
  const rows=[
    ['tandem basket','Tandem or SS baskets','Kitchen','Soft-Close Kitchen Drawer System'],
    ['SS basket','Tandem or SS baskets','Kitchen','Stainless-Steel Pull-Out Basket'],
    ['SS304 basket','Tandem or SS baskets','Kitchen','SS 304 Pull-Out Basket'],
    ['Pull-Out Wooden Drawer','Tandem or SS baskets','Kitchen','Wooden Kitchen Drawer'],
    ['Pantry pull-out mechanism','','Kitchen','Tall Pantry Pull-Out System'],
    ['Opposite-Side Kitchen Cabinet','Box type','Kitchen','Kitchen Storage Cabinet'],
    ['Mini Crockery Unit','Box type','Hall','Crockery Cabinet'],
    ['Box-Type Loft Storage Cabinet','Box type','Bedroom','Loft Storage Cabinet'],
    ['Lower Pillar Wall Panelling','Wood wall paneling','Hall','Pillar Wall Panelling'],
    ['Pooja Cabinet CNC Shutters','Pooja CNC / glass door paneling','Pooja','Pooja Cabinet CNC Shutters'],
    ['shoe rack','','Entrance','Shoe Rack'],
    ['wall-mounted bed','','Bedroom','Wall-Mounted Bed'],
  ];
  for(const [input,type,room,expected] of rows)assert.equal(canonicalFurnitureName(input,type,room),expected,input);
  for(const [name] of FURNITURE_VOCABULARY){assert.equal(canonicalFurnitureName(canonicalFurnitureName(name)),canonicalFurnitureName(name),name);assert.equal(canonicalFurnitureName(name.toUpperCase()),canonicalFurnitureName(name),name);}
  assert.equal(canonicalFurnitureName('SS basket','Tandem or SS baskets','Kitchen','Confirmed SS304 grade'),'SS 304 Pull-Out Basket');
  assert.equal(canonicalFurnitureName('Pull-Out Basket','Tandem or SS baskets','Kitchen','Basket with stainless-steel channels.'),'Pull-Out Basket');
  assert.equal(canonicalFurnitureName('SS basket','Tandem or SS baskets','Kitchen','Stainless-steel basket with SS304 screws.'),'Stainless-Steel Pull-Out Basket');
  assert.equal(canonicalFurnitureName('pull cabinet','Box type','Kitchen'),'pull cabinet');
  assert.equal(canonicalFurnitureName('Wardrobe','','Bedroom'),'Wardrobe');
});

test('like-for-like cabinet facts use fixed construction-first wording across aliases and repeated preparation',()=>{
  const expected='Box-type wardrobe with inside and outside laminate finish.';
  for(const [name,source] of [['box-type wardrobe','Box type wardrobe with inside laminate and outside laminate finish'],['Wardrobe Cabinet','Wardrobe cabinet with inside and outside laminate finish.']]){
    const result=formatCleanItemDescription(source,name,'Box type','Bedroom');assert.equal(result,expected);assert.equal(formatCleanItemDescription(result,name,'Box type','Bedroom'),result);
  }
  assert.equal(formatFurnitureSpecification('Kitchen base cabinet with inside and outside laminate finish.','Kitchen Base Cabinet','Frame type','Kitchen'),'Frame and shutters for the kitchen base cabinet, with inside and outside laminate finish.');
  assert.equal(standardFurnitureSpecification('Wardrobe Frame and Shutters','Frame type'),'Wardrobe frame and shutters with inside and outside laminate finish.');
  const source='Cabinet with confirmed 24 inch depth, 6 mm tinted glass and two lockable drawers, finished in acrylic.';
  const result=formatCleanItemDescription(source,'Wardrobe Cabinet','Box type','Bedroom');
  assert.ok(result.startsWith('Box-type cabinet'));assert.ok(result.includes(source.slice(1)));assert.doesNotMatch(result,/inside and outside laminate/);
  assert.equal(formatCleanItemDescription(result,'Wardrobe Cabinet','Box type','Bedroom'),result);
  assert.equal(formatCleanItemDescription('Six tandem baskets with hardware fitting.','tandem basket','Tandem or SS baskets','Kitchen'),'Soft-close kitchen drawer system (tandem type), with the specified runners and fittings.');
  assert.equal(formatCleanItemDescription('SS baskets with hardware fitting.','SS basket','Tandem or SS baskets','Kitchen'),'Stainless-steel pull-out basket with the specified fittings.');
  assert.match(formatCleanItemDescription('SS304 wire basket with 450 mm runners.','SS basket','Tandem or SS baskets','Kitchen'),/wire basket with 450 mm runners/);
});

test('revised quotation descriptions remove redundant type prefixes while preserving mounting and specified door scope',()=>{
  const rows=[
    ['TV Console Cabinet','Box type','Box-type construction. TV media console cabinet with inside and outside laminate finish.','Box-type TV console cabinet with inside and outside laminate finish.'],
    ['Kitchen Overhead Wall Cabinet','Box type','Box-type construction. Overhead wall-mounted kitchen cabinet with inside and outside laminate finish.','Box-type kitchen overhead wall cabinet with inside and outside laminate finish.'],
    ['Loft Frame and Shutters','Loft - frame and shutter','Frame-and-shutter construction. Overhead kitchen loft framing and shutter enclosure with inside and outside laminate finish.','Loft frame and shutters with inside and outside laminate finish.'],
    ['Soft-Close Kitchen Drawer System','Tandem or SS baskets','Modular kitchen soft-close tandem drawer systems with channels and fittings.','Soft-close kitchen drawer system (tandem type), with the specified runners and fittings.'],
    ['Wash Area Utility Cabinet','Box type','Box-type construction. Wall-mounted utility storage cabinet with inside and outside laminate finish.','Box-type wall-mounted utility storage cabinet with inside and outside laminate finish.'],
    ['Wardrobe Frame and Shutters','Frame type','Frame-and-shutter construction. Wall-anchored wardrobe framework and shutters with inside and outside laminate finish.','Wall-anchored wardrobe frame and shutters with inside and outside laminate finish.'],
  ];
  for(const [name,type,source,expected] of rows){const result=formatCleanItemDescription(source,name,type,'Kitchen');assert.equal(result,expected);assert.equal(formatCleanItemDescription(result,name,type,'Kitchen'),result);}
  const source='Pooja entrance door framing and double shutters incorporating CNC jali cut-outs and laminate finish.';
  assert.equal(canonicalFurnitureName('Pooja CNC / Glass Door Paneling','Pooja CNC / glass door paneling','Pooja',source),'Pooja Entrance CNC Doors');
  assert.equal(formatCleanItemDescription(source,'Pooja Entrance CNC Doors','Pooja CNC / glass door paneling','Pooja'),source);
  assert.equal(canonicalFurnitureName('Pooja CNC / Glass Door Paneling','Pooja CNC / glass door paneling','Pooja','Design to be confirmed.'),'Pooja CNC / Glass Door Paneling');
  assert.equal(canonicalFurnitureName('TV Unit with Wall Panelling','Box type','Hall'),'TV Unit with Wall Panelling');
});

test('changing construction updates standard sentences but preserves bespoke specifications for owner review',()=>{
  const box=standardFurnitureSpecification('Wardrobe Cabinet','Box type')!;
  assert.equal(retypeFurnitureSpecification(box,'Wardrobe Cabinet','Box type','Frame type','Bedroom'),standardFurnitureSpecification('Wardrobe Frame and Shutters','Frame type'));
  const loft=standardFurnitureSpecification('Loft Frame and Shutters','Loft - frame and shutter')!;
  assert.equal(retypeFurnitureSpecification(loft,'Loft Frame and Shutters','Loft - frame and shutter','Box type','Bedroom'),standardFurnitureSpecification('Loft Storage Cabinet','Box type'));
  const custom='Box-type wardrobe with 6 mm glass doors.';
  assert.equal(retypeFurnitureSpecification(custom,'Wardrobe Cabinet','Box type','Frame type','Bedroom'),custom);
});

test('plain wording covers confirmed room work and unaccepted suggestions without losing storage details or changing prices',()=>{
  const rows=[
    ['Study Table','Study table workstation with storage and inside and outside laminate finish.','Box-type study table with storage and inside and outside laminate finish.'],
    ['Study Table','Study table workstation with drawer storage and inside and outside laminate finish.','Box-type study table with drawers and inside and outside laminate finish.'],
    ['Breakfast Counter Cabinet','Breakfast counter console with inside and outside laminate finish.','Box-type breakfast counter cabinet with inside and outside laminate finish.'],
    ['Dressing Table','Dressing table with storage and inside and outside laminate finish.','Box-type dressing table with storage and inside and outside laminate finish.'],
  ];
  for(const [name,source,expected]of rows){const result=formatCleanItemDescription(source,name,'Box type','Hall');assert.equal(result,expected);assert.equal(formatCleanItemDescription(result,name,'Box type','Hall'),result);}
  const detailed='Study table workstation with 2 lockable drawers, 18 inch cabinet depth and 6 mm glass, using Owner Premium Series hinges.';
  const detailedResult=formatCleanItemDescription(detailed,'Study Table','Box type','Bedroom');assert.match(detailedResult,/2 lockable drawers/);assert.match(detailedResult,/18 inch cabinet depth/);assert.match(detailedResult,/6 mm glass/);assert.match(detailedResult,/Owner Premium Series hinges/);assert.doesNotMatch(detailedResult,/workstation/);
  const d=structuredClone(VIDYA_SAGAR_REDDY_DRAFT);d.suggested_addons=[{room_index:0,reason:'A study table workstation with storage could hold books; confirm it is needed.',item:{name:'study table workstation',work_type:'Box type',size_text:null,measure:{unit:'sq_ft',per_item:null},quantity:null,optional:true,source_text_en:'Study table workstation with drawer storage and inside and outside laminate finish.'}}];
  const before=structuredClone(d),after=prepareQuotationDraft(d,DEFAULT_UME_CATALOGUE);assert.deepEqual(d,before);assert.deepEqual(calculateQuotationPricing(after).baseWholeHomeTotals,calculateQuotationPricing(before).baseWholeHomeTotals);assert.equal(after.suggested_addons![0].item.name,'Study Table');assert.match(after.suggested_addons![0].item.source_text_en,/study table with drawers/);assert.equal(after.suggested_addons![0].item.quantity,null);assert.equal(after.suggested_addons![0].item.measure.per_item,null);assert.doesNotMatch(after.suggested_addons![0].reason,/workstation/);assert.deepEqual(prepareQuotationDraft(after,DEFAULT_UME_CATALOGUE),after);
  const setup=buildDynamicGemInstructions(DEFAULT_UME_CATALOGUE);assert.match(setup,/PLAIN ENGLISH FOR THE WHOLE QUOTATION/);assert.match(setup,/Study table with storage/);assert.match(setup,/Study table with drawers/);assert.match(setup,/package named Standard, Premium or Luxury/);assert.match(setup,/Pooja entrance doors/);assert.match(setup,/Wash area cabinet/);assert.match(setup,/Shoe storage/);
});

test('plain TV-unit wording preserves the included decorative choice and keeps console-only scope distinct',()=>{
  assert.equal(canonicalFurnitureName('TV media unit','Box type','Hall'),'TV Unit');
  assert.equal(canonicalFurnitureName('television unit','Box type','Hall'),'TV Unit');
  assert.equal(canonicalFurnitureName('TV console cabinet','Box type','Hall'),'TV Console Cabinet');
  const included='Box-type TV unit with inside and outside laminate finish, and decorative louvers or charcoal panelling, as selected.';
  assert.equal(formatCleanItemDescription(included,'TV Unit','Box type','Hall'),included);
  assert.equal(formatCleanItemDescription(included.replace('Box-type ',''),'TV Unit','Box type','Hall'),included,'TV acronym keeps its capital letters');
  const chosen='Box-type TV unit with inside and outside laminate finish, and decorative louvers.';
  assert.equal(formatCleanItemDescription(chosen,'TV Unit','Box type','Hall'),chosen);
  assert.doesNotMatch(standardFurnitureSpecification('TV Console Cabinet','Box type')!,/charcoal|louver|wall panelling/);
  assert.doesNotMatch(standardFurnitureSpecification('TV Unit','Box type')!,/charcoal|louver|wall panelling/,'display clean-up does not insert new scope into a historical record');
  const draft=structuredClone(VIDYA_SAGAR_REDDY_DRAFT);draft.rooms[0].items[0].name='TV Unit';draft.rooms[0].items[0].work_type='Box type';draft.rooms[0].items[0].source_text_en=included;
  const after=prepareQuotationDraft(draft,DEFAULT_UME_CATALOGUE);assert.deepEqual(calculateQuotationPricing(after).baseWholeHomeTotals,calculateQuotationPricing(draft).baseWholeHomeTotals);assert.equal(after.rooms[0].items.length,draft.rooms[0].items.length);assert.equal(after.rooms[0].items[0].source_text_en,included);
  const setup=buildDynamicGemInstructions(DEFAULT_UME_CATALOGUE);assert.ok(setup.includes(included));assert.match(setup,/decorative louvers or charcoal panelling is included/i);assert.match(setup,/do not create a second paid panel item/);assert.match(setup,/Do not copy assistant_memory_updates from an old quotation/);
});

test('construction conflicts block publication while combined approved scope and custom rate definitions remain intact',()=>{
  const draft=structuredClone(VIDYA_SAGAR_REDDY_DRAFT);const item=draft.rooms[0].items[0];
  item.name='Wardrobe Cabinet';item.work_type='Box type';item.source_text_en='Frame-type wardrobe with inside and outside laminate finish.';
  const prepared=prepareQuotationDraft(draft,DEFAULT_UME_CATALOGUE);
  assert.ok(validateQuotationDraftV2(prepared).issues.some(issue=>issue.path==='/rooms/0/items/0/work_type'&&/construction wording/.test(issue.message)));
  assert.match(prepared.rooms[0].items[0].source_text_en,/Frame-and-shutter/);
  assert.equal(furnitureConstructionConflict('Wardrobe Frame and Shutters','Box-type wardrobe.','Frame type'),true);
  assert.equal(furnitureConstructionConflict('Wardrobe and Dressing Unit','Box-type wardrobe and frame-type dressing unit.','Box type'),false);
  assert.equal(furnitureConstructionConflict('Custom furniture','Box-type and frame-type fabrication.','Owner composite work'),false);
  assert.equal(formatCleanItemDescription('Box-type construction. Cabinet with inside and outside laminate finish.','Kitchen Base Cabinet','Frame type','Kitchen'),'Box-type construction. Cabinet with inside and outside laminate finish.','conflicting construction evidence must remain visible to the publish gate');
  item.name='Wardrobe and Dressing Unit';item.source_text_en='Combined wardrobe and dressing table with acrylic doors and a mirror.';item.custom_rates={Base:900,Normal:1200,Premium:1500};
  const before=calculateQuotationPricing(draft);const after=prepareQuotationDraft(draft,DEFAULT_UME_CATALOGUE);
  assert.equal(after.rooms[0].items.length,draft.rooms[0].items.length);assert.match(after.rooms[0].items[0].source_text_en,/acrylic doors and a mirror/);assert.deepEqual(calculateQuotationPricing(after).baseWholeHomeTotals,before.baseWholeHomeTotals);assert.deepEqual(after.rooms[0].items[0].custom_rates,item.custom_rates);
});

test('each-item labels fix missing text without inventing dimensions, multiplying sets or inserting extra scope',()=>{
  const draft=structuredClone(VIDYA_SAGAR_REDDY_DRAFT);const item=draft.rooms[2].items.find(item=>item.work_type==='Tandem or SS baskets')!;
  item.name='tandem basket';item.measure={unit:'each',per_item:null};item.quantity=5;item.size_text=null;
  const after=prepareQuotationDraft(draft,DEFAULT_UME_CATALOGUE),fittings=after.rooms[2].items.find(item=>item.work_type==='Tandem or SS baskets')!;
  assert.equal(fittings.name,'Soft-Close Kitchen Drawer System');assert.equal(fittings.size_text,'Per drawer system');assert.equal(fittings.measure.per_item,1);assert.equal(fittings.quantity,5);
  assert.equal(after.rooms.flatMap(room=>room.items).length,draft.rooms.flatMap(room=>room.items).length);
  assert.deepEqual(prepareQuotationDraft(after,DEFAULT_UME_CATALOGUE),after);
});

test('v12 migration preserves every saved rate and material, updates only stock wording, and deduplicates approved defaults',()=>{
  const catalogue=structuredClone(DEFAULT_UME_CATALOGUE);catalogue.version='ume-catalogue-2026.11.v11';
  catalogue.workTypes['Box type'].rates.Base.Standard=1000;catalogue.workTypes['Box type'].rates.Normal.Standard=1200;catalogue.workTypes['Box type'].rates.Premium.Standard=1400;
  catalogue.workTypes['Frame type'].plainEnglishDefinition='Wall-anchored framework with shutters, internal lining, and external decorative laminate finish.';
  catalogue.workTypes['Tandem or SS baskets'].plainEnglishDefinition='Modular kitchen tandem drawers or stainless steel wire pull-out baskets including hardware channels and fitting.';
  catalogue.assistantLessons=["Modular kitchen tandem drawer units (work_type: 'Tandem or SS baskets', unit: 'each', default quantity: 6) must be included by default in the kitchen for every new quotation, whether explicitly dictated or not.","Modular kitchen tandem drawer units (work_type: 'Tandem or SS baskets', unit: 'each', default quantity: 6, size_text: 'Standard unit') must be included by default in the kitchen for every new quotation, whether explicitly dictated or not.",'Every room item must have a non-empty English string in size_text (never null). For countable items billed as each/lumpsum, use Standard unit.','Keep this owner-specific rule.'];
  const before=structuredClone(catalogue),after=upgradeCatalogue(catalogue);
  assert.equal(after.version,DEFAULT_UME_CATALOGUE.version);assert.equal(after.workTypes['Frame type'].plainEnglishDefinition,OWNER_FRAME_TYPE_DEFINITION);assert.equal(after.workTypes['Tandem or SS baskets'].plainEnglishDefinition,KITCHEN_FITTINGS_DEFINITION);
  assert.deepEqual(after.assistantLessons,[KITCHEN_DEFAULT_LESSON,COUNT_ITEM_LESSON,'Keep this owner-specific rule.']);
  for(const key of Object.keys(catalogue.workTypes))assert.deepEqual(after.workTypes[key].rates,catalogue.workTypes[key].rates);
  assert.deepEqual(after.grades,catalogue.grades);assert.deepEqual(after.company,catalogue.company);assert.deepEqual(catalogue,before);assert.equal(upgradeCatalogue(after),after);
  catalogue.workTypes['Frame type'].plainEnglishDefinition='Owner custom frame definition with an explicitly specified partition.';assert.equal(upgradeCatalogue(catalogue).workTypes['Frame type'].plainEnglishDefinition,catalogue.workTypes['Frame type'].plainEnglishDefinition);
  const instructions=buildDynamicGemInstructions(after);assert.match(instructions,/APPROVED NAMING AND SPECIFICATION CONTRACT/);assert.match(instructions,/six kitchen drawer\/basket units total/);assert.match(instructions,/Frames and shutters appropriate to the unit/);assert.doesNotMatch(instructions,/must be included by default in the kitchen for every new quotation, whether explicitly dictated or not/);assert.ok(instructions.includes('| Box type | sq_ft | 1000 | 1200 | 1400 |'));
});
