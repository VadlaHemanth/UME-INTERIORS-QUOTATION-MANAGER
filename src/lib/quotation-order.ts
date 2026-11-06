import type { PricedQuotationSnapshot } from './pricing';
import { canonicalFurnitureName } from './furniture';

/** Sort only the presentation. Original room/item indices remain payment/selection identities. */
type NamedRoom={name:string|null};
type NamedFurniture={name:string|null;workType?:string|null;work_type?:string|null};
const words=(value:string|null|undefined)=>(value||'').toLowerCase().replace(/paneling/g,'panelling').replace(/[^a-z0-9]+/g,' ').trim();

export function roomWalkthroughPriority(name:string|null):number {
  const text=words(name);
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
    if(/\btv\b|television|media/.test(name)&&!/panelling|backdrop/.test(name))return 0;
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
    if(/tandem|basket|pull out/.test(name+' '+work))return 10;
    if(/overhead|wall cabinet/.test(name)&&!/crockery|panelling/.test(name))return 20;
    if(/full height|pantry|tall/.test(name))return 30;
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
  return items.map((item,index)=>({item,index})).sort((a,b)=>furnitureWalkthroughPriority(a.item,roomName)-furnitureWalkthroughPriority(b.item,roomName)||a.index-b.index).map(entry=>entry.item);
}
export const roomDisplayNumber=(index:number)=>String(index+1).padStart(2,'0');
export function quotationDisplayRooms(rooms:PricedQuotationSnapshot['rooms']):PricedQuotationSnapshot['rooms'] {
  return orderQuotationRooms(rooms).map(room=>({...room,items:orderQuotationFurniture(room.items,room.name)}));
}
