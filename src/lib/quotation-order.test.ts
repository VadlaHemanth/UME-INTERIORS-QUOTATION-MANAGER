import assert from 'node:assert/strict';
import test from 'node:test';
import { orderQuotationRooms, orderQuotationFurniture, quotationDisplayRooms, roomDisplayNumber } from './quotation-order';
import {calculateQuotationPricing,computeCustomerSelectionTotal} from './pricing';
import {VIDYA_SAGAR_REDDY_DRAFT} from './historicalData';

test('walkthrough order starts Hall, Pooja and Kitchen without inventing rooms or changing equal-priority order',()=>{
  const rooms=['Guest Bedroom','Kitchen','Master Bedroom','Children Bedroom','Pooja','Hall and Dining','Bedroom 2','Bedroom 1','Utility','Balcony','Other A','Other B'].map(name=>({name}));
  const before=structuredClone(rooms);
  assert.deepEqual(orderQuotationRooms(rooms).map(r=>r.name),['Hall and Dining','Pooja','Kitchen','Master Bedroom','Children Bedroom','Guest Bedroom','Bedroom 2','Bedroom 1','Utility','Balcony','Other A','Other B']);
  assert.deepEqual(rooms,before);
  assert.deepEqual(orderQuotationRooms([{name:'Kitchen'}]),[{name:'Kitchen'}]);
  assert.equal(roomDisplayNumber(0),'01');assert.equal(roomDisplayNumber(10),'11');
});

test('hall units start with TV, crockery and vanity; kitchen and bedroom units follow construction order',()=>{
  const items=['Vanity Cabinet','TV Wall Panelling','Crockery Cabinet','TV Console Cabinet','Additional Internal Drawer'].map((name,itemIndex)=>({name,itemIndex}));
  assert.deepEqual(orderQuotationFurniture(items,'Hall').map(i=>i.itemIndex),[3,2,0,1,4]);
  assert.deepEqual(items.map(i=>i.itemIndex),[0,1,2,3,4]);
  assert.deepEqual(orderQuotationFurniture([{name:'Kitchen Loft'},{name:'Kitchen Overhead Wall Cabinet'},{name:'Kitchen Base Cabinet'},{name:'Tandem Drawer System'}],'Kitchen').map(i=>i.name),['Kitchen Base Cabinet','Tandem Drawer System','Kitchen Overhead Wall Cabinet','Kitchen Loft']);
  assert.deepEqual(orderQuotationFurniture([{name:'Kitchen Loft'},{name:'Opposite-side kitchen cabinet unit'},{name:'Kitchen Overhead Wall Cabinet'}],'Kitchen').map(i=>i.name),['Kitchen Overhead Wall Cabinet','Opposite-side kitchen cabinet unit','Kitchen Loft']);
  assert.deepEqual(orderQuotationFurniture([{name:'Dressing Table'},{name:'Loft Frame and Shutters'},{name:'Wardrobe Cabinet'},{name:'Study Table'}],'Master Bedroom').map(i=>i.name),['Wardrobe Cabinet','Loft Frame and Shutters','Dressing Table','Study Table']);
});

test('view sorting preserves immutable snapshot indices, mixed packages, optional pointers and prices',()=>{
  const snapshot=calculateQuotationPricing(VIDYA_SAGAR_REDDY_DRAFT);
  const before=structuredClone(snapshot);
  const parameters={wholeHomeSelection:{grade:'Premium',protection:'Standard',finish:'SF',brand_preference:null},mixByRoom:true,roomSelections:{4:{grade:'Normal',protection:'With PVC',finish:'SF',brand_preference:null}},selectedOptionalPointers:['/rooms/4/items/2']} as const;
  const calc=computeCustomerSelectionTotal(snapshot,{...parameters,selectedOptionalPointers:[...parameters.selectedOptionalPointers]});
  const displayed=quotationDisplayRooms(snapshot.rooms);
  assert.deepEqual(displayed.map(r=>r.roomIndex),[4,3,2,0,1]);
  for(const room of displayed)for(const item of room.items)assert.equal(item,snapshot.rooms[room.roomIndex].items[item.itemIndex]);
  assert.deepEqual(snapshot,before);
  assert.deepEqual(computeCustomerSelectionTotal(snapshot,{...parameters,selectedOptionalPointers:[...parameters.selectedOptionalPointers]}),calc);
});
