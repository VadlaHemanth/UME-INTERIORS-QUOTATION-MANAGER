import type { PricedQuotationSnapshot } from './pricing';
import { canonicalFurnitureName } from './furniture';

/** Sort only the presentation. Original room/item indices remain payment/selection identities. */
type NamedRoom={name:string|null};
type NamedFurniture={name:string|null;workType?:string|null;work_type?:string|null;itemIndex?:number;parentItemIndex?:number|null;parent_item_index?:number|null;sourceTextEn?:string;source_text_en?:string;manualParent?:true;manual_parent?:true;ownerText?:{name?:true}};
const words=(value:string|null|undefined)=>(value||'').toLowerCase().replace(/paneling/g,'panelling').replace(/[^a-z0-9]+/g,' ').trim();
const isTvAssembly=(name:string|null|undefined)=>/^tv (?:unit|console cabinet) with\b/.test(words(name));

export function roomWalkthroughPriority(name:string|null):number {
  const text=words(name);
  // Shoe storage follows even custom/unrecognised rooms (priority 100).
  if(/\bshoes?\b|\bfootwear\b/.test(text))return 1000;
  if(/\bhall\b|\bliving\b|\blounge\b|\bfoyer\b|\bentrance\b/.test(text))return 0;
  if(/\bdining\b/.test(text))return 1;
  if(/\bpooja\b|\bpuja\b|\bprayer\b|\bmandir\b/.test(text))return 10;
  if(/\bkitchen\b/.test(text))return 20;
  if(/\bmaster\b|\bprimary\b/.test(text)&&/bed|suite/.test(text))return 30;
  if(/child|kid/.test(text)&&/bed|room/.test(text))return 40;
  if(/guest/.test(text)&&/bed|room/.test(text))return 50;
  if(/bedroom|bed room/.test(text))return 60;
  if(/study|office/.test(text))return 70;
  if(/utility|wash area|laundry/.test(text))return 80;
  if(/balcony|terrace/.test(text))return 90;
  return 100;
}
export function furnitureWalkthroughPriority(item:NamedFurniture,roomName:string|null):number {
  const name=words(canonicalFurnitureName(item.name||'',item.workType||item.work_type||'',roomName||'')),work=words(item.workType||item.work_type),room=words(roomName);
  if(/hall|living|lounge|dining|foyer|entrance/.test(room)) {
    if(/\btv\b|television|media/.test(name)&&(!/panelling|backdrop/.test(name)||isTvAssembly(name)))return 0;
    if(/crockery/.test(name))return 10;
    if(/vanity|wash basin|washbasin/.test(name))return 20;
    if(/\btv\b|television|media/.test(name)&&/panelling|backdrop/.test(name))return 30;
    if(/shoe|foyer/.test(name))return 40;
    return 100;
  }
  if(/pooja|puja|prayer|mandir/.test(room)) {
    if(/mandir|cabinet/.test(name)&&!/cnc|glass|door/.test(name))return 0;
    if(/cnc|glass|door/.test(name))return 10;
    return 100;
  }
  if(/kitchen/.test(room)) {
    if(/base cabinet|under counter|lower cabinet/.test(name))return 0;
    if(/tandem|basket|pull out|drawer system|wooden kitchen drawer/.test(name+' '+work))return 10;
    if(/overhead|wall cabinet/.test(name)&&!/crockery|panelling/.test(name))return 20;
    if(/full height|pantry|tall|kitchen storage cabinet/.test(name))return 30;
    if(/loft/.test(name+' '+work)&&!/panelling/.test(name+' '+work))return 40;
    if(/under loft/.test(name))return 50;
    if(/wash area|wash cabinet/.test(name))return 60;
    if(/breakfast/.test(name)&&!/panelling/.test(name))return 70;
    if(/breakfast/.test(name)&&/panelling/.test(name))return 80;
    if(/crockery/.test(name))return 90;
    if(/pillar/.test(name))return 100;
    return 150;
  }
  if(/bed|child|kid|guest|master|primary/.test(room)) {
    if(/wardrobe|cupboard/.test(name)&&!/locker|loft|drawer/.test(name))return 0;
    if(/loft/.test(name+' '+work)&&!/panelling/.test(name))return 10;
    if(/locker/.test(name))return 20;
    if(/dressing|vanity/.test(name))return 30;
    if(/study|desk/.test(name))return 40;
    if(/\bbed\b/.test(name))return 50;
    if(/folding table/.test(name+' '+work))return 60;
    return 100;
  }
  return 100;
}
export function orderQuotationRooms<T extends NamedRoom>(rooms:readonly T[]):T[] {
  return rooms.map((room,index)=>({room,index})).sort((a,b)=>roomWalkthroughPriority(a.room.name)-roomWalkthroughPriority(b.room.name)||a.index-b.index).map(entry=>entry.room);
}
export function orderQuotationFurniture<T extends NamedFurniture>(items:readonly T[],roomName:string|null):T[] {
  const entries=items.map((item,index)=>({item,index,id:item.itemIndex??index}));
  const byId=new Map(entries.map(entry=>[entry.id,entry]));
  const parents=new Map<number,number>();
  const isLoft=(item:T)=>/loft|low roof/i.test(`${item.name} ${item.workType||item.work_type||''}`)&&!/panelling|under loft/i.test(item.name||'');
  for(const entry of entries){
    const explicit=entry.item.parentItemIndex??entry.item.parent_item_index;
    if(explicit!=null&&explicit!==entry.id&&byId.has(explicit)){parents.set(entry.id,explicit);continue;}
    if(entry.item.manualParent===true||entry.item.manual_parent===true)continue;
    const related=/panelling|backdrop|locker/i.test(entry.item.name||'')&&!isTvAssembly(entry.item.name);
    if(!isLoft(entry.item)&&!related)continue;
    const text=words(`${entry.item.name} ${entry.item.sourceTextEn||entry.item.source_text_en||''}`);
    const location=/dressing|vanity/.test(text)?/dressing|vanity/:/crockery/.test(text)?/crockery/:/wardrobe|cupboard/.test(text)?/wardrobe|cupboard/:/\btv\b|media/.test(text)?/\btv\b|media/:/breakfast/.test(text)?/breakfast/:null;
    const candidates=entries.filter(candidate=>candidate!==entry&&!isLoft(candidate.item)&&!/panelling|backdrop|locker/i.test(candidate.item.name||'')&&(!location||location.test(words(candidate.item.name))));
    const anchors=location?candidates:isLoft(entry.item)?candidates.filter(candidate=>/hall|living|dining/i.test(roomName||'')?/crockery/i.test(candidate.item.name||''):/bed/i.test(roomName||'')?/wardrobe|dressing/i.test(candidate.item.name||''):false):[];
    if(anchors.length===1)parents.set(entry.id,anchors[0].id);
  }
  // Recover gracefully when reading legacy/corrupt cycles; new drafts fail validation.
  for(const [child,parent] of parents){let cursor:number|undefined=parent;const seen=new Set([child]);while(cursor!==undefined){if(seen.has(cursor)){parents.delete(child);break;}seen.add(cursor);cursor=parents.get(cursor);}}
  const sort=(a:typeof entries[number],b:typeof entries[number])=>furnitureWalkthroughPriority(a.item,roomName)-furnitureWalkthroughPriority(b.item,roomName)||a.index-b.index;
  const result:T[]=[],visited=new Set<number>();
  const visit=(entry:typeof entries[number])=>{if(visited.has(entry.id))return;visited.add(entry.id);result.push(entry.item);entries.filter(child=>parents.get(child.id)===entry.id).sort(sort).forEach(visit);};
  entries.filter(entry=>!parents.has(entry.id)).sort(sort).forEach(visit);
  entries.forEach(visit);
  return result;
}
export function furnitureRelationshipLabel(item:NamedFurniture,items:readonly NamedFurniture[]):string|null {
  const index=item.parentItemIndex??item.parent_item_index;
  if(index==null)return null;
  const parent=items.find((candidate,i)=>(candidate.itemIndex??i)===index);
  if(!parent||parent===item)return null;
  const name=words(item.name),source=words(item.sourceTextEn||item.source_text_en),parentName=words(parent.name);
  const panelling=/panelling|backdrop|panel\b/.test(name);
  const direction=panelling&&/\bunder\b|\bbelow\b/.test(name+' '+source)&&/loft/.test(parentName)?'Below':panelling?'Grouped with':/loft|low roof/i.test(`${item.name} ${item.workType||item.work_type||''}`)?'Above':/locker|internal.*drawer/.test(name)?'Inside':'Grouped with';
  return `${direction} ${parent.ownerText?.name===true?parent.name:canonicalFurnitureName(parent.name||'',parent.workType||parent.work_type||'','',parent.sourceTextEn||parent.source_text_en||'')}`;
}
export const roomDisplayNumber=(index:number)=>String(index+1).padStart(2,'0');
export function quotationDisplayRooms(rooms:PricedQuotationSnapshot['rooms'],agreedOptionalPointers?:readonly string[]):PricedQuotationSnapshot['rooms'] {
  return orderQuotationRooms(rooms).filter(room=>agreedOptionalPointers===undefined||room.items.some(item=>!item.optional||agreedOptionalPointers.includes(`/rooms/${room.roomIndex}/items/${item.itemIndex}`))).map(room=>({...room,items:orderQuotationFurniture(room.items,room.name)}));
}
