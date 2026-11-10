import type { DraftItem, QuotationDraftV2 } from './schema';

export const SHOE_STORAGE_ROOM='Entrance & Shoe Storage';
export const isShoeStorage=(item:{name:string|null})=>/\bshoe\b|\bfootwear\b/i.test(item.name||'');

/** Reorganise an editable draft; remap every room/item reference before publication. */
export function normalizeFurnitureLayout(draft:QuotationDraftV2):QuotationDraftV2 {
  const next=structuredClone(draft);
  if(!Array.isArray(draft.rooms)||draft.rooms.some(room=>!Array.isArray(room?.items)))return next;
  // Do not erase a malformed relationship while relocating; let validation explain it.
  for(const room of draft.rooms)for(const [index,item] of room.items.entries()){
    let parent=item.parent_item_index;const visited=new Set([index]);
    while(parent!=null){if(!Number.isSafeInteger(parent)||parent<0||parent>=room.items.length||visited.has(parent))return next;visited.add(parent);parent=room.items[parent].parent_item_index;}
  }
  let target=next.rooms.findIndex(room=>/\bshoe\b|\bfootwear\b/i.test(room.name||''));
  const moved=new Set<string>();
  for(const [ri,room] of draft.rooms.entries()){
    if(ri===target)continue;
    for(const [ii,item] of room.items.entries()){
      let cursor:number|null|undefined=ii;const visited=new Set<number>();
      while(typeof cursor==='number'&&Number.isInteger(cursor)&&cursor>=0&&cursor<room.items.length&&!visited.has(cursor)){
        visited.add(cursor);
        if(isShoeStorage(room.items[cursor])){moved.add(`${ri}/${ii}`);break;}
        cursor=room.items[cursor].parent_item_index;
      }
    }
  }
  if(!moved.size)return next;
  if(target<0){target=next.rooms.length;next.rooms.push({name:SHOE_STORAGE_ROOM,recommended:null,items:[]});}
  const origins=next.rooms.map((room,ri)=>room.items.map((_,ii)=>({ri,ii})));
  for(let ri=0;ri<draft.rooms.length;ri++){
    const keep:DraftItem[]=[],keepOrigins:{ri:number;ii:number}[]=[];
    for(const [ii,item] of draft.rooms[ri].items.entries()){
      if(moved.has(`${ri}/${ii}`)){next.rooms[target].items.push(structuredClone(item));origins[target].push({ri,ii});}
      else{keep.push(next.rooms[ri].items[ii]);keepOrigins.push({ri,ii});}
    }
    if(ri!==target){next.rooms[ri].items=keep;origins[ri]=keepOrigins;}
  }
  const finalRooms=next.rooms.map((room,index)=>({room,origins:origins[index],oldIndex:index})).filter(entry=>entry.room.items.length||!draft.rooms[entry.oldIndex]?.items.length);
  const byItem=new Map<string,{ri:number;ii:number}>();
  for(const [ri,entry] of finalRooms.entries())for(const [ii,origin] of entry.origins.entries())byItem.set(`${origin.ri}/${origin.ii}`,{ri,ii});
  const targetFinal=finalRooms.findIndex(entry=>entry.oldIndex===target);
  const roomMap=new Map<number,number>(draft.rooms.map((_,ri)=>[ri,finalRooms.findIndex(entry=>entry.oldIndex===ri)]));
  for(const [ri,index] of roomMap)if(index<0)roomMap.set(ri,targetFinal);
  for(const [ri,entry] of finalRooms.entries())for(const [ii,item] of entry.room.items.entries()){
    const origin=entry.origins[ii],parent=draft.rooms[origin.ri]?.items[origin.ii]?.parent_item_index;
    if(parent!=null){const mapped=byItem.get(`${origin.ri}/${parent}`);if(mapped?.ri===ri)item.parent_item_index=mapped.ii;else delete item.parent_item_index;}
  }
  const remapPath=(path:string)=>path.replace(/^\/rooms\/(\d+)(?:\/items\/(\d+))?/,(_all,ri,ii)=>{
    const point=ii===undefined?null:byItem.get(`${ri}/${ii}`);
    return point?`/rooms/${point.ri}/items/${point.ii}`:`/rooms/${roomMap.get(Number(ri))??ri}${ii===undefined?'':`/items/${ii}`}`;
  });
  if(Array.isArray(next.owner_requests))next.owner_requests=next.owner_requests.map(request=>({...request,path:remapPath(request.path)}));
  if(Array.isArray(next.needs_clarification))next.needs_clarification=next.needs_clarification.map(request=>({...request,path:remapPath(request.path)}));
  if(Array.isArray(next.suggested_addons))next.suggested_addons=next.suggested_addons.map(addon=>{
    const parent=addon.item.parent_item_index==null?null:byItem.get(`${addon.room_index}/${addon.item.parent_item_index}`);
    return {...addon,room_index:parent?.ri??roomMap.get(addon.room_index)??addon.room_index,item:{...addon.item,...(parent?{parent_item_index:parent.ii}:{})}};
  });
  next.rooms=finalRooms.map(entry=>entry.room);
  return next;
}

/** Remove scope and keep its index-based links and review pointers aligned. */
export function removeQuotationScope(draft: QuotationDraftV2, roomIndex: number, itemIndex?: number): QuotationDraftV2 {
  const next = structuredClone(draft);
  const remapParent = (item: DraftItem) => {
    if (itemIndex === undefined || item.parent_item_index == null) return;
    if (item.parent_item_index === itemIndex) {
      item.parent_item_index = null;
      item.manual_parent = true;
    } else if (item.parent_item_index > itemIndex) {
      item.parent_item_index--;
    }
  };
  if (itemIndex === undefined) {
    next.rooms.splice(roomIndex, 1);
    next.suggested_addons = next.suggested_addons?.filter(addon => addon.room_index !== roomIndex);
    next.suggested_addons?.forEach(addon => { if (addon.room_index > roomIndex) addon.room_index--; });
  } else {
    const room = next.rooms[roomIndex];
    room.items.splice(itemIndex, 1);
    room.items.forEach(remapParent);
    next.suggested_addons?.filter(addon => addon.room_index === roomIndex).forEach(addon => remapParent(addon.item));
  }
  const remapReviews = <T extends { path: string }>(reviews: T[]): T[] => reviews.flatMap(review => {
    const match = /^\/rooms\/(\d+)(?:\/items\/(\d+))?(?=\/|$)/.exec(review.path);
    if (!match) return [review];
    const room = Number(match[1]);
    const item = match[2] === undefined ? undefined : Number(match[2]);
    if (room === roomIndex && (itemIndex === undefined || item === itemIndex)) return [];
    if (itemIndex === undefined && room > roomIndex) {
      return [{...review, path: review.path.replace(/^\/rooms\/\d+/, '/rooms/' + (room - 1))}];
    }
    if (room === roomIndex && itemIndex !== undefined && item !== undefined && item > itemIndex) {
      return [{...review, path: review.path.replace(/^\/rooms\/\d+\/items\/\d+/, '/rooms/' + room + '/items/' + (item - 1))}];
    }
    return [review];
  });
  next.owner_requests = remapReviews(next.owner_requests);
  next.needs_clarification = remapReviews(next.needs_clarification);
  return next;
}
