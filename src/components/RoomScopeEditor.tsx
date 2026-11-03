import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { StudioCatalogue } from '../lib/catalogue';
import { formatCleanItemDescription, getPackageDisplayName } from '../lib/catalogue';
import { canonicalFurnitureName } from '../lib/furniture';
import type { DraftItem, QuotationDraftV2 } from '../lib/schema';
import { formatINR, getUnitRateForItem } from '../lib/pricing';

export function RoomScopeEditor({ draft, catalogue, onChange }: { draft:QuotationDraftV2; catalogue:StudioCatalogue; onChange:(value:QuotationDraftV2)=>void }) {
  const [openRooms,setOpenRooms] = useState(new Set([0]));
  const update = (roomIndex:number,itemIndex:number,patch:Partial<DraftItem>) => {
    const next=structuredClone(draft); Object.assign(next.rooms[roomIndex].items[itemIndex],patch); onChange(next);
  };
  return <section className="scope-editor" aria-labelledby="scope-editor-title">
    <header><div><h3 id="scope-editor-title">Rooms and furniture</h3><p>Add the scope, then check measurements and billing units.</p></div><button type="button" onClick={() => { const next=structuredClone(draft); next.rooms.push({name:`Room ${next.rooms.length+1}`,recommended:null,items:[]}); setOpenRooms(previous=>new Set([...previous,next.rooms.length-1])); onChange(next); }}><Plus size={16}/> Add room</button></header>
    {draft.rooms.map((room,ri) => <details className="scope-room" key={ri} open={openRooms.has(ri)} onToggle={e=>{const opened=e.currentTarget.open; setOpenRooms(previous=>{if(previous.has(ri)===opened)return previous; const next=new Set(previous); opened?next.add(ri):next.delete(ri); return next;});}}>
      <summary><strong>{room.name || `Room ${ri+1}`}</strong><span>{room.items.length} item{room.items.length===1?'':'s'}</span></summary>
      <div className="scope-room-content">
        <div className="scope-room-heading"><label className="owner-field">Room name<input value={room.name || ''} onChange={e=>{const next=structuredClone(draft);next.rooms[ri].name=e.target.value;onChange(next);}}/></label><button type="button" className="scope-delete" onClick={()=>{const next=structuredClone(draft);next.rooms.splice(ri,1);onChange(next);}}><Trash2 size={16}/> Remove room</button></div>
        {room.items.map((item,ii)=>{
          const grade=draft.recommended?.grade || 'Base';
          const amount=getUnitRateForItem(item,grade,draft.recommended?.protection || 'Standard','SF',catalogue)*(item.measure.per_item || 0)*(item.quantity || 0);
          return <article className="scope-item" key={ii}>
            <header><strong>{item.name || 'New furniture item'}</strong><button type="button" className="scope-delete" aria-label={`Remove ${item.name || 'furniture item'}`} onClick={()=>{const next=structuredClone(draft);next.rooms[ri].items.splice(ii,1);onChange(next);}}><Trash2 size={16}/> Remove</button></header>
            <div className="scope-item-fields">
              <label className="owner-field scope-wide">Furniture name<input list="ume-furniture-names" value={item.name || ''} placeholder="e.g. Kitchen Overhead Wall Cabinet" onChange={e=>update(ri,ii,{name:e.target.value || null})} onBlur={()=>update(ri,ii,{name:canonicalFurnitureName(item.name || '',item.work_type || '',room.name || '')})}/></label>
              <label className="owner-field scope-wide">Construction / rate type<select value={item.work_type || ''} onChange={e=>{const wt=catalogue.workTypes[e.target.value];update(ri,ii,{work_type:e.target.value,measure:{unit:wt.unit,per_item:['each','lumpsum'].includes(wt.unit)?1:item.measure.per_item}});}}><option value="">Choose work type</option>{Object.entries(catalogue.workTypes).map(([key,wt])=><option key={key} value={key}>{wt.label}</option>)}</select></label>
              <label className="owner-field scope-wide">Dimensions<input value={item.size_text || ''} placeholder="Height × width, e.g. 7 ft × 8 ft" onChange={e=>update(ri,ii,{size_text:e.target.value || null})}/></label>
              <label className="owner-field">Billing unit<select value={item.measure.unit || 'sq_ft'} onChange={e=>update(ri,ii,{measure:{unit:e.target.value,per_item:['each','lumpsum'].includes(e.target.value)?1:item.measure.per_item}})}><option value="sq_ft">Square feet</option><option value="running_ft">Running feet</option><option value="each">Per piece</option><option value="lumpsum">Lump sum</option></select></label>
              <label className="owner-field">{item.measure.unit==='sq_ft'?'Area per item (sq ft)':item.measure.unit==='running_ft'?'Length per item (ft)':'Billable units per item'}<input type="number" min="0" step="0.01" value={item.measure.per_item ?? ''} onChange={e=>update(ri,ii,{measure:{...item.measure,per_item:e.target.value===''?null:Number(e.target.value)}})}/></label>
              <label className="owner-field">Quantity<input type="number" min="1" step="1" value={item.quantity ?? ''} onChange={e=>update(ri,ii,{quantity:e.target.value===''?null:Number(e.target.value)})}/></label>
              <div className="scope-item-price"><span>{getPackageDisplayName(grade)} estimate</span><strong>{formatINR(amount)}</strong></div>
              <label className="owner-field scope-wide">Specification<textarea rows={2} value={item.source_text_en || ''} placeholder="Construction and confirmed finish. Dimensions are shown separately." onChange={e=>update(ri,ii,{source_text_en:e.target.value})} onBlur={()=>{if(item.source_text_en.trim())update(ri,ii,{source_text_en:formatCleanItemDescription(item.source_text_en,item.name || '',item.work_type || '',room.name || '')});}}/></label>
            </div>
            <label className="scope-optional"><input type="checkbox" checked={Boolean(item.optional)} onChange={e=>update(ri,ii,{optional:e.target.checked})}/><span>Optional addition <small>Outside the base total until the customer selects it.</small></span></label>
          </article>;
        })}
        {!room.items.length && <p className="scope-empty">No furniture added to this room yet.</p>}
        <button type="button" className="scope-add-item" onClick={()=>{const next=structuredClone(draft);next.rooms[ri].items.push({name:null,work_type:'Box type',size_text:null,measure:{unit:'sq_ft',per_item:null},quantity:1,optional:false,source_text_en:''});onChange(next);}}><Plus size={16}/> Add furniture</button>
      </div>
    </details>)}
  </section>;
}
