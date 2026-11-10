import React, { useId, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { StudioCatalogue } from '../lib/catalogue';
import { getPackageDisplayName } from '../lib/catalogue';
import { removeQuotationScope } from '../lib/furniture-layout';
import type { DraftItem, QuotationDraftV2 } from '../lib/schema';
import { formatINR, getUnitRateForItem } from '../lib/pricing';
import { orderQuotationRooms, orderQuotationFurniture } from '../lib/quotation-order';
import { RateAmount } from './RateCardEditor';
import {canonicalFurnitureName,FURNITURE_VOCABULARY,retypeFurnitureSpecification} from '../lib/furniture-contract';

export function RoomScopeEditor({ draft, catalogue, onChange }: { draft:QuotationDraftV2; catalogue:StudioCatalogue; onChange:(value:QuotationDraftV2)=>void }) {
  const namesListId = useId();
  const titleId = useId();
  // Recompute order after a structural change. Typing a name or choosing a
  // parent must keep the focused input and the next click in the same place.
  const structure = draft.rooms.map(room => room.items.length).join(',');
  const editorOrder = useMemo(() => orderQuotationRooms(draft.rooms).map(room => ({
    roomIndex: draft.rooms.indexOf(room),
    itemIndices: orderQuotationFurniture(room.items, room.name).map(item => room.items.indexOf(item)),
  })), [structure]);
  const [openRooms, setOpenRooms] = useState(() => new Set(editorOrder.slice(0, 1).map(room => room.roomIndex)));
  const update = (roomIndex:number,itemIndex:number,patch:Partial<DraftItem>) => {
    const next=structuredClone(draft); Object.assign(next.rooms[roomIndex].items[itemIndex],patch); onChange(next);
  };
  return <section className="scope-editor" aria-labelledby={titleId}>
    <datalist id={namesListId}>{FURNITURE_VOCABULARY.map(([name]) => <option key={name} value={name}/>)}</datalist>
    <header><div><h3 id={titleId}>Rooms and furniture</h3><p>Add the scope, then check measurements and billing units.</p></div><button type="button" onClick={() => { const next=structuredClone(draft); next.rooms.push({name:`Room ${next.rooms.length+1}`,recommended:null,items:[]}); setOpenRooms(previous=>new Set([...previous,next.rooms.length-1])); onChange(next); }}><Plus size={16}/> Add room</button></header>
    {editorOrder.map(({roomIndex:ri,itemIndices}) => {const room=draft.rooms[ri];return <details className="scope-room" key={ri} open={openRooms.has(ri)} onToggle={e=>{const opened=e.currentTarget.open; setOpenRooms(previous=>{if(previous.has(ri)===opened)return previous; const next=new Set(previous); opened?next.add(ri):next.delete(ri); return next;});}}>
      <summary><strong>{room.name || `Room ${ri+1}`}</strong><span>{room.items.length} item{room.items.length===1?'':'s'}</span></summary>
      <div className="scope-room-content">
        <div className="scope-room-heading"><label className="owner-field">Room name<input value={room.name || ''} onChange={e=>{const next=structuredClone(draft);next.rooms[ri].name=e.target.value;onChange(next);}}/></label><button type="button" className="scope-delete" onClick={()=>{setOpenRooms(previous=>new Set([...previous].filter(index=>index!==ri).map(index=>index>ri?index-1:index)));onChange(removeQuotationScope(draft,ri));}}><Trash2 size={16}/> Remove room</button></div>
        {itemIndices.map(ii=>{const item=room.items[ii];
          const grade=draft.recommended?.grade || 'Base';
          const amount=getUnitRateForItem(item,grade,draft.recommended?.protection || 'Standard',draft.recommended?.finish || 'SF',catalogue)*(item.measure.per_item || 0)*(item.quantity || 0);
          return <article className="scope-item" key={ii}>
            <header><strong>{item.name || 'New furniture item'}</strong><button type="button" className="scope-delete" aria-label={`Remove ${item.name || 'furniture item'}`} onClick={()=>{onChange(removeQuotationScope(draft,ri,ii));}}><Trash2 size={16}/> Remove</button></header>
            <div className="scope-item-fields">
              <label className="owner-field scope-wide">Furniture name<input list={namesListId} value={item.name || ''} placeholder="e.g. Kitchen Overhead Wall Cabinet" onChange={e=>update(ri,ii,{name:e.target.value || null,owner_text:{...item.owner_text,name:true}})}/></label>
              <label className="owner-field scope-wide">Construction / rate type<select value={item.work_type || ''} onChange={event=>{
                const workType = event.target.value;
                const work = catalogue.workTypes[workType];
                if (!work) { update(ri,ii,{work_type:null}); return; }
                const specification = item.owner_text?.specification
                  ? item.source_text_en
                  : retypeFurnitureSpecification(item.source_text_en,item.name||'',item.work_type||'',workType,room.name||'');
                const baseName = /^Wardrobe (?:Cabinet|Frame and Shutters)$/.test(item.name||'') ? 'Wardrobe'
                  : /^Loft (?:Storage Cabinet|Frame and Shutters)$/.test(item.name||'') ? 'Loft' : item.name||'';
                const unitChanged = work.unit !== item.measure.unit;
                update(ri,ii,{
                  work_type:workType,
                  name:specification!==item.source_text_en&&!item.owner_text?.name?canonicalFurnitureName(baseName,workType,room.name||''):item.name,
                  source_text_en:specification,
                  ...(unitChanged?{custom_rates:null,measure:{unit:work.unit,per_item:['each','lumpsum'].includes(work.unit)?1:null}}:{}),
                });
              }}><option value="">Choose work type</option>{item.work_type&&!catalogue.workTypes[item.work_type]&&<option value={item.work_type}>{item.work_type} · rates missing</option>}{Object.entries(catalogue.workTypes).map(([key,wt])=><option key={key} value={key}>{wt.label}</option>)}</select><span>Box-type or frame-and-shutter construction is stated in the specification. Custom component details stay editable.</span></label>
              <label className="owner-field scope-wide">Dimensions<input value={item.size_text || ''} placeholder="Height × width, e.g. 7 ft × 8 ft" onChange={e=>update(ri,ii,{size_text:e.target.value || null})}/></label>
              <label className="owner-field scope-wide">Main unit / show immediately after<select aria-label={`Main unit for ${item.name||'furniture item'} ${ii+1}`} value={item.parent_item_index??''} onChange={event=>update(ri,ii,{parent_item_index:event.target.value===''?null:Number(event.target.value),manual_parent:true})}><option value="">No linked main unit</option>{room.items.map((other,index)=>index!==ii?<option key={index} value={index}>{other.name||'Unnamed item'} · item {index+1}</option>:null)}</select><span>For a loft, choose the wardrobe, dressing table or crockery cabinet below it. Related work stays together.</span></label>
              <label className="owner-field">Billing unit<select value={item.measure.unit || ''} onChange={e=>update(ri,ii,{measure:{unit:e.target.value||null,per_item:['each','lumpsum'].includes(e.target.value)?1:null},custom_rates:null})}><option value="">Choose billing unit</option><option value="sq_ft">Square feet</option><option value="running_ft">Running feet</option><option value="each">Per piece</option><option value="lumpsum">Lump sum</option></select></label>
              <label className="owner-field">{item.measure.unit==='sq_ft'?'Area per item (sq ft)':item.measure.unit==='running_ft'?'Length per item (ft)':'Billable units per item'}<input type="number" min="0" step="0.01" value={item.measure.per_item ?? ''} onChange={e=>update(ri,ii,{measure:{...item.measure,per_item:e.target.value===''?null:Number(e.target.value)}})}/></label>
              <label className="owner-field">Quantity<input type="number" min="1" step="1" value={item.quantity ?? ''} onChange={e=>update(ri,ii,{quantity:e.target.value===''?null:Number(e.target.value)})}/></label>
              <div className="scope-item-price"><span>{getPackageDisplayName(grade)} estimate</span><strong>{formatINR(amount)}</strong></div>
              <details className="scope-unit-rates scope-wide">
                <summary>Item rates <span>{item.custom_rates ? 'Custom for this item' : 'Saved rate card'}</span></summary>
                <p>Change a package rate for this furniture item only. Other items and future quotations keep the saved rates. PVC protection is added separately at the applicable rate.</p>
                <div className="scope-unit-rate-fields">{(['Base','Normal','Premium'] as const).map(packageGrade=><label className="owner-field" key={packageGrade}>{getPackageDisplayName(packageGrade)} · ₹{item.measure.unit==='sq_ft'?'/ sq.ft':item.measure.unit==='running_ft'?'/ running ft':item.measure.unit==='lumpsum'?' lump sum':'/ piece'}<RateAmount label={`${item.name || 'Furniture item'} ${ii+1} ${getPackageDisplayName(packageGrade)} item rate`} value={getUnitRateForItem(item,packageGrade,'Standard','SF',catalogue)} disabled={false} onChange={rate=>update(ri,ii,{custom_rates:{...item.custom_rates,[packageGrade]:rate}})}/></label>)}</div>
                {item.custom_rates && <button type="button" onClick={()=>update(ri,ii,{custom_rates:null})}>Reset item to saved rates</button>}
              </details>
              <label className="owner-field scope-wide">Specification<textarea rows={2} value={item.source_text_en || ''} placeholder="Construction and confirmed finish. Dimensions are shown separately." onChange={e=>update(ri,ii,{source_text_en:e.target.value,owner_text:{...item.owner_text,specification:true}})}/></label>
            </div>
            <label className="scope-optional"><input type="checkbox" checked={Boolean(item.optional)} onChange={e=>update(ri,ii,{optional:e.target.checked})}/><span>Optional addition <small>Outside the base total until the customer selects it.</small></span></label>
          </article>;
        })}
        {!room.items.length && <p className="scope-empty">No furniture added to this room yet.</p>}
        <button type="button" className="scope-add-item" onClick={()=>{const next=structuredClone(draft);next.rooms[ri].items.push({name:null,work_type:'Box type',size_text:null,measure:{unit:'sq_ft',per_item:null},quantity:1,optional:false,source_text_en:''});onChange(next);}}><Plus size={16}/> Add furniture</button>
      </div>
    </details>;})}
  </section>;
}
