import React, { useEffect, useRef, useState } from 'react';
import { getPackageDisplayName, type StudioCatalogue } from '../lib/catalogue';
import { ALL_GRADES } from '../lib/pricing';
import { editPackageRate } from '../lib/rate-card';
import './rate-card-editor.css';

const unitLabels = {sq_ft:'per sq.ft',running_ft:'per running ft',each:'each',lumpsum:'lump sum'};

export function RateAmount({ value, label, disabled, onChange }: {value:number;label:string;disabled:boolean;onChange:(value:number)=>void}) {
  const [text,setText]=useState(String(value));
  const focused=useRef(false);
  useEffect(()=>{if(!focused.current)setText(String(value));},[value]);
  return <input type="number" inputMode="decimal" min="0" step="0.01" aria-label={label} value={text} disabled={disabled}
    onFocus={()=>{focused.current=true;}}
    onChange={event=>{const next=event.target.value;setText(next);if(next!==''&&event.target.validity.valid&&Number.isFinite(Number(next)))onChange(Number(next));}}
    onBlur={()=>{focused.current=false;setText(String(value));}}/>;
}

export function RateCardEditor({catalogue,workTypeKeys,disabled=false,onChange}:{catalogue:StudioCatalogue;workTypeKeys:string[];disabled?:boolean;onChange:(catalogue:StudioCatalogue)=>void}) {
  const [query,setQuery]=useState('');
  const visibleKeys=workTypeKeys.filter(key=>{const work=catalogue.workTypes[key];return work&&`${key} ${work.label}`.toLowerCase().includes(query.trim().toLowerCase());});
  const update=(key:string,change:(work:StudioCatalogue['workTypes'][string])=>void)=>{const next=structuredClone(catalogue);change(next.workTypes[key]);onChange(next);};
  return <div className="rate-editor">
    <label className="rate-editor-search"><span>Find a work type</span><input type="search" aria-label="Search work types" placeholder="Cabinet, loft, wall panelling…" value={query} onChange={event=>setQuery(event.target.value)}/></label>
    <p className="rate-editor-help">Prices are in rupees per stated unit. PVC extra is added once to each package’s base rate. Frame, loft and low-roof closures share base rates; their PVC extras stay separate. SF matte and high-gloss use the same rate.</p>
    <div className="rate-editor-table-wrap"><table className="rate-editor-table">
      <thead><tr><th scope="col">Work type / unit</th>{ALL_GRADES.map(grade=><th scope="col" key={grade}>{getPackageDisplayName(grade)} (₹)</th>)}<th scope="col">PVC extra (₹)</th></tr></thead>
      <tbody>{visibleKeys.map(key=>{const work=catalogue.workTypes[key];const extras=ALL_GRADES.map(grade=>Math.max(0,work.rates[grade]['With PVC']-work.rates[grade].Standard));const differs=new Set(extras).size>1;return <tr key={key}>
        <td className="rate-editor-name"><strong>{work.label}</strong><span>{unitLabels[work.unit]}</span></td>
        {ALL_GRADES.map(grade=><td key={grade}><label><span className="rate-editor-mobile-label">{getPackageDisplayName(grade)} (₹)</span><RateAmount label={`${work.label} ${getPackageDisplayName(grade)} rate`} value={work.rates[grade].Standard} disabled={disabled} onChange={amount=>onChange(editPackageRate(catalogue,key,grade,amount))}/></label></td>)}
        <td className="rate-editor-pvc"><label><span className="rate-editor-mobile-label">PVC extra (₹)</span><RateAmount label={`${work.label} PVC Extra rate`} value={extras[2]} disabled={disabled} onChange={amount=>update(key,target=>{target.pvcDefaultEligible=amount>0;for(const grade of ALL_GRADES)target.rates[grade]['With PVC']=target.rates[grade].Standard+amount;})}/></label>{differs&&<small>Extras vary: {ALL_GRADES.map((grade,index)=>`${getPackageDisplayName(grade)} ₹${extras[index]}`).join(' · ')}. Editing applies one extra to all three.</small>}</td>
      </tr>;})}</tbody>
    </table></div>
    {!visibleKeys.length&&<p className="rate-editor-empty" role="status">No work types match. Clear the search or show all work types.</p>}
  </div>;
}
