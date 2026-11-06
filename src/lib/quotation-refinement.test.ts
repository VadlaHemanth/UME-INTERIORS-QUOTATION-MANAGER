import assert from 'node:assert/strict';
import test from 'node:test';
import {orderQuotationFurniture,furnitureRelationshipLabel,quotationDisplayRooms} from './quotation-order';
import {normalizeFurnitureLayout,SHOE_STORAGE_ROOM} from './furniture-layout';
import {beginQuotationEdit,completeQuoteDates,expiryFromIssue,formatQuotationDate,parseQuotationDate,validityBetween} from './quotation-dates';
import {carryAgreedSelection} from './quote-workflow';
import {validateQuotationDraftV2,type DraftItem} from './schema';
import {calculateQuotationPricing,computeCustomerSelectionTotal,selectedRoomItems,selectedRoomPackageAmount} from './pricing';
import {VIDYA_SAGAR_REDDY_DRAFT} from './historicalData';
import {prepareQuotationDraft} from './quotation-presentation';
import {buildDynamicGemInstructions,DEFAULT_UME_CATALOGUE,extractAndMergeRateCardFromDraft} from './catalogue';
import {hardwareBrands,upgradeCatalogue} from './commercial-spec';

const item=(name:string,parent:number|null=null,optional=false):DraftItem=>({name,work_type:/loft/i.test(name)?'Loft - frame and shutter':'Box type',size_text:'2 ft × 3 ft',measure:{unit:'sq_ft',per_item:6},quantity:1,optional,source_text_en:'Confirmed construction with inside and outside laminate finish.',parent_item_index:parent});
function home(){const d=structuredClone(VIDYA_SAGAR_REDDY_DRAFT);d.customer={name:'QA Owner Approved',phone:'9000000000',site:'QA Hyderabad'};d.quote={number:null,date:null,valid_until:null,validity_days:30,notes:[]};d.is_demo=false;d.owner_requests=[];d.needs_clarification=[];d.suggested_addons=[];return d;}

test('linked lofts stay with their own cabinet in Hall and bedroom without changing source identities',()=>{
 const hall=[item('Shoe Storage Cabinet'),item('Loft Frame and Shutters',3),item('Vanity Cabinet'),item('Crockery Cabinet'),item('TV Console Cabinet')];
 assert.deepEqual(orderQuotationFurniture(hall,'Hall').map(i=>hall.indexOf(i)),[4,3,1,2,0]);
 const bedroom=[item('Wardrobe Cabinet'),item('Loft Frame and Shutters',0),item('Loft Frame and Shutters',3),item('Dressing Table'),item('Study Table')];
 const before=structuredClone(bedroom);
 assert.deepEqual(orderQuotationFurniture(bedroom,'Master Bedroom').map(i=>bedroom.indexOf(i)),[0,1,3,2,4]);
 assert.equal(furnitureRelationshipLabel(bedroom[2],bedroom),'Above Dressing Table');assert.deepEqual(bedroom,before);
});
test('an explicit loft location survives canonical naming and an ambiguous multi-loft import requires review',()=>{
 const d=home();d.rooms=[{name:'Master Bedroom',recommended:null,items:[item('Wardrobe Cabinet'),item('Loft above Wardrobe'),item('Dressing Table'),item('Loft above Dressing Table')]}];
 const prepared=prepareQuotationDraft(d,DEFAULT_UME_CATALOGUE);assert.equal(prepared.rooms[0].items[1].parent_item_index,0);assert.equal(prepared.rooms[0].items[3].parent_item_index,2);assert.equal(validateQuotationDraftV2(prepared).readyForPublish,true);
 for(const i of d.rooms[0].items)if(/loft/i.test(i.name||''))i.name='Loft Frame and Shutters';
 const issues=validateQuotationDraftV2(d).issues.filter(i=>i.path.endsWith('/parent_item_index'));assert.equal(issues.length,2);assert.equal(validateQuotationDraftV2(d).readyForPublish,false);
 d.rooms[0].items[1].parent_item_index=3;d.rooms[0].items[3].parent_item_index=1;assert.ok(validateQuotationDraftV2(d).issues.some(i=>i.code==='SCHEMA_MISMATCH'&&i.path.endsWith('/parent_item_index')));
});
test('shoe storage and its loft move together, remapping paths, suggestions and confirmed optional choices',()=>{
 const d=home();d.rooms=[{name:'Hall and Dining',recommended:null,items:[item('TV Console Cabinet'),item('Crockery Cabinet'),item('Loft Frame and Shutters',1),item('Shoe Storage Cabinet',null,true),item('Loft Frame and Shutters',3,true)]},{name:'Master Bedroom',recommended:null,items:[item('Wardrobe Cabinet')]}];
 d.owner_requests=[{path:'/rooms/0/items/3/name',text:'Confirm requested cabinet finish.'}];d.needs_clarification=[{path:'/rooms/0/items/4/size_text',question:'Confirm the size.'}];d.suggested_addons=[{room_index:0,item:item('Additional Internal Drawer',3,true),reason:'Requested storage organisation.'}];
 const before=structuredClone(d),next=normalizeFurnitureLayout(d);assert.deepEqual(d,before);assert.equal(next.rooms[2].name,SHOE_STORAGE_ROOM);assert.equal(next.rooms[0].items.length,3);assert.equal(next.rooms[2].items[1].parent_item_index,0);assert.equal(next.owner_requests[0].path,'/rooms/2/items/0/name');assert.equal(next.needs_clarification[0].path,'/rooms/2/items/1/size_text');assert.equal(next.suggested_addons![0].room_index,2);assert.equal(next.suggested_addons![0].item.parent_item_index,0);assert.deepEqual(normalizeFurnitureLayout(next),next);
 const selection={wholeHomeSelection:{grade:'Premium',protection:'Standard',finish:'SF',brand_preference:null},mixByRoom:true,roomSelections:{0:{grade:'Normal',protection:'With PVC',finish:'SF',brand_preference:null}},selectedOptionalPointers:['/rooms/0/items/3','/rooms/0/items/4'],acceptedTermsAt:null} as const;
 const oldSelection={...selection,selectedOptionalPointers:[...selection.selectedOptionalPointers]};const carried=carryAgreedSelection(d,next,oldSelection);assert.deepEqual(carried.selectedOptionalPointers,['/rooms/2/items/0','/rooms/2/items/1']);assert.equal(carried.roomSelections[2].grade,'Normal');
 assert.equal(computeCustomerSelectionTotal(calculateQuotationPricing(d),oldSelection).grandTotal,computeCustomerSelectionTotal(calculateQuotationPricing(next),carried).grandTotal);
});
test('moving a shoe-only room removes its empty shell and keeps all items and references',()=>{
 const d=home();d.rooms=[{name:'Hall',recommended:null,items:[item('Shoe Storage Cabinet')]},{name:'Kitchen',recommended:null,items:[item('Kitchen Base Cabinet')]}];d.needs_clarification=[{path:'/rooms/0/items/0/size_text',question:'Confirm size'}];const next=normalizeFurnitureLayout(d);assert.deepEqual(next.rooms.map(r=>r.name),['Kitchen',SHOE_STORAGE_ROOM]);assert.equal(next.needs_clarification[0].path,'/rooms/1/items/0/size_text');assert.equal(next.rooms.flatMap(r=>r.items).length,2);
});
test('a loft explicitly named above shoe storage moves with it before canonical naming',()=>{
 const d=home();d.rooms=[{name:'Hall',recommended:null,items:[item('TV Console Cabinet'),item('Shoe Storage Cabinet'),item('Loft above Shoe Storage Cabinet')]}];const next=prepareQuotationDraft(d,DEFAULT_UME_CATALOGUE);assert.equal(next.rooms[0].items.length,1);assert.equal(next.rooms[1].name,SHOE_STORAGE_ROOM);assert.equal(next.rooms[1].items[1].parent_item_index,0);assert.equal(next.rooms[1].items[1].name,'Loft Frame and Shutters');
});
test('identically sized optional lofts retain the correct agreed parent after an external row reorder',()=>{
 const d=home();d.rooms=[{name:'Master Bedroom',recommended:null,items:[item('Wardrobe Cabinet'),item('Loft Frame and Shutters',0,true),item('Dressing Table'),item('Loft Frame and Shutters',2,true)]}];const next=structuredClone(d);next.rooms[0].items=[next.rooms[0].items[0],next.rooms[0].items[2],next.rooms[0].items[3],next.rooms[0].items[1]];next.rooms[0].items[2].parent_item_index=1;next.rooms[0].items[3].parent_item_index=0;
 const selection={wholeHomeSelection:{grade:'Normal',protection:'Standard',finish:'SF',brand_preference:null},mixByRoom:false,roomSelections:{},selectedOptionalPointers:['/rooms/0/items/3'],acceptedTermsAt:null} as const;assert.deepEqual(carryAgreedSelection(d,next,{...selection,selectedOptionalPointers:[...selection.selectedOptionalPointers]}).selectedOptionalPointers,['/rooms/0/items/2']);
});
test('date controls use calendar days, DD-MM-YYYY display and consistent 26/28/30-day expiries across leap/year boundaries',()=>{
 assert.equal(expiryFromIssue('2026-12-11',26),'2027-01-06');assert.equal(expiryFromIssue('2028-02-01',28),'2028-02-29');assert.equal(expiryFromIssue('2026-11-06',30),'2026-12-06');assert.equal(formatQuotationDate('2026-11-06'),'06-11-2026');assert.equal(parseQuotationDate('06112026'),'2026-11-06');assert.equal(parseQuotationDate('06/11/2026'),'2026-11-06');assert.equal(parseQuotationDate('31-02-2026'),null);assert.equal(validityBetween('2026-12-11','2027-01-06'),26);
 const opened=beginQuotationEdit({number:'KEEP',date:'2025-01-01',valid_until:'2025-02-01',validity_days:31},'2026-11-06');assert.equal(opened.number,'KEEP');assert.equal(opened.date,'2026-11-06');assert.equal(opened.valid_until,'2026-12-06');assert.equal(opened.validity_days,30);
 assert.equal(completeQuoteDates({number:null,date:'2026-11-06',valid_until:null,validity_days:26},'2026-01-01').valid_until,'2026-12-02');
 const d=home();d.quote={...d.quote,date:'2026-11-06',valid_until:'2026-12-06',validity_days:26};assert.ok(validateQuotationDraftV2(d).issues.some(i=>i.path==='/quote/valid_until'));d.quote.valid_until='2026-12-02';assert.equal(validateQuotationDraftV2(d).readyForPublish,true);
});
test('hardware upgrade preserves owner rates, custom brands, business identity and saved corrections',()=>{
 const c=structuredClone(DEFAULT_UME_CATALOGUE);c.version='ume-catalogue-2026.11.v10';c.workTypes['Box type'].rates.Base.Standard=999;c.grades.Premium.hardwareBrands=['Owner Preferred Brand'];c.assistantLessons=['Ask about ambiguous loft positions.'];const before=structuredClone(c);const next=upgradeCatalogue(c);assert.equal(next.workTypes['Box type'].rates.Base.Standard,999);assert.deepEqual(next.grades.Premium.hardwareBrands,['Owner Preferred Brand']);assert.deepEqual(next.company,c.company);assert.deepEqual(next.assistantLessons,c.assistantLessons);assert.deepEqual(c,before);assert.deepEqual(hardwareBrands(DEFAULT_UME_CATALOGUE,'Normal'),['Godrej','Berlin','Ebco','Nimmi']);assert.deepEqual(hardwareBrands(DEFAULT_UME_CATALOGUE,'Premium'),['Hettich','Sleek','Godrej','Berlin','Ebco','Nimmi']);
});
test('reusable rates and approved lessons feed the next assistant setup once without promoting item-only prices',()=>{
 const d=home();d.assistant_memory_updates=['Keep each dressing loft with its own dressing table.'];d.rate_card_updates={'Box type':{label:'Box type',unit:'sq_ft',rates:{Base:{Standard:975,'With PVC':1075},Normal:{Standard:1175,'With PVC':1275},Premium:{Standard:1375,'With PVC':1475}}}};
 const first=extractAndMergeRateCardFromDraft(DEFAULT_UME_CATALOGUE,d);assert.equal(first.assistantMemoryChanged,true);const again=extractAndMergeRateCardFromDraft(first.catalogue,d);assert.equal(again.catalogue.assistantLessons?.length,1);const prompt=buildDynamicGemInstructions(again.catalogue);assert.match(prompt,/\| Box type \| sq_ft \| 975 \| 1175 \| 1375/);assert.match(prompt,/Keep each dressing loft with its own dressing table/);assert.equal((prompt.match(/\| Box type \| sq_ft \|/g)||[]).length,1);
 const oneJob=home();oneJob.rooms[0].items[0].custom_rates={Base:777,Normal:888,Premium:999};assert.deepEqual(extractAndMergeRateCardFromDraft(first.catalogue,oneJob).catalogue.workTypes,first.catalogue.workTypes);
});
test('assistant review arithmetic uses only confirmed scope and excludes optional work until selected',()=>{
 const d=home();d.rooms=[{name:'Hall',recommended:null,items:[item('TV Console Cabinet'),item('Loft Frame and Shutters',0),{...item('Shoe Storage Cabinet',null,true),measure:{unit:'sq_ft',per_item:20}}]}];const snapshot=calculateQuotationPricing(d);assert.equal(snapshot.baseWholeHomeTotals.Base__Standard__SF,10200);assert.equal(snapshot.baseWholeHomeTotals.Normal__Standard__SF,12300);assert.equal(snapshot.baseWholeHomeTotals.Premium__Standard__SF,14400);assert.equal(snapshot.optionalAddOnTotals.Base__Standard__SF,19000);
});
test('room comparison prices and unit counts include chosen optional work, matching the selected total',()=>{
 const d=home();d.rooms=[{name:SHOE_STORAGE_ROOM,recommended:null,items:[item('Shoe Storage Cabinet',null,true)]}];const snapshot=calculateQuotationPricing(d);const room=snapshot.rooms[0];const selection={grade:'Normal',protection:'Standard',finish:'SF',brand_preference:null} as const;assert.equal(selectedRoomPackageAmount(room,selection,[]),0);assert.equal(selectedRoomItems(room,[]).length,0);const pointers=['/rooms/0/items/0'];assert.equal(selectedRoomItems(room,pointers).length,1);assert.equal(selectedRoomPackageAmount(room,selection,pointers),6900);assert.equal(selectedRoomPackageAmount(room,selection,pointers),computeCustomerSelectionTotal(snapshot,{wholeHomeSelection:selection,mixByRoom:false,selectedOptionalPointers:pointers}).grandTotal);
});
test('confirmed scope omits an optional-only entrance room until its work is agreed',()=>{
 const d=home();d.rooms=[{name:'Hall',recommended:null,items:[item('TV Console Cabinet')]},{name:SHOE_STORAGE_ROOM,recommended:null,items:[item('Shoe Storage Cabinet',null,true)]}];const snapshot=calculateQuotationPricing(d);assert.equal(quotationDisplayRooms(snapshot.rooms).length,2);assert.deepEqual(quotationDisplayRooms(snapshot.rooms,[]).map(r=>r.name),['Hall']);assert.equal(quotationDisplayRooms(snapshot.rooms,['/rooms/1/items/0']).length,2);assert.equal(snapshot.rooms.length,2);
});
