import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { getPackageDisplayName, type StudioCatalogue } from '../lib/catalogue';
import { additionalMaterialLines,DEFAULT_HARDWARE_SCOPE,hardwareBrands, materialWording, packageAllowances, type MaterialWording } from '../lib/commercial-spec';
import { ALL_GRADES } from '../lib/pricing';
import type { PlywoodGrade } from '../lib/schema';

const editableMaterials = (catalogue: StudioCatalogue) => ({...structuredClone(catalogue),materialWording:materialWording(catalogue),commonMaterials:additionalMaterialLines(catalogue)});
export function MaterialSettings({ catalogue, onSave, onDirtyChange, onBusyChange }: { catalogue: StudioCatalogue; onSave: (value: StudioCatalogue) => Promise<void>; onDirtyChange?: (dirty:boolean)=>void; onBusyChange?: (busy:boolean)=>void }) {
  const [draft, setDraft] = useState(() => editableMaterials(catalogue));
  const [savedState,setSavedState] = useState(()=>JSON.stringify(editableMaterials(catalogue)));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const formRef=useRef<HTMLFormElement>(null);
  const resizeDescriptions=()=>{
    formRef.current?.querySelectorAll('textarea').forEach(field=>{
      if (!field.getClientRects().length) return;
      field.style.height='auto';field.style.height=`${Math.max(80,Math.min(360,field.scrollHeight+2))}px`;
    });
  };
  useLayoutEffect(resizeDescriptions);
  useEffect(()=>{
    const form=formRef.current;
    form?.addEventListener('toggle',resizeDescriptions,true);window.addEventListener('resize',resizeDescriptions);
    return()=>{form?.removeEventListener('toggle',resizeDescriptions,true);window.removeEventListener('resize',resizeDescriptions);};
  },[]);
  const dirty = JSON.stringify(draft) !== savedState;
  useEffect(()=>{onDirtyChange?.(dirty);},[dirty,onDirtyChange]);
  useEffect(()=>{onBusyChange?.(busy);},[busy,onBusyChange]);
  const update = (grade: PlywoodGrade, apply: (info: StudioCatalogue['grades'][PlywoodGrade]) => void) => {
    setDraft(previous => { const next = structuredClone(previous); apply(next.grades[grade]); return next; }); setMessage('');
  };
  return <form ref={formRef} className="material-settings" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const saved = structuredClone(draft);
      for(const grade of ALL_GRADES)saved.grades[grade].hardwareBrands=[...new Set(hardwareBrands(saved,grade).map(brand=>brand.trim()).filter(Boolean))];
      const drawers = saved.workTypes['Additional internal drawer'];
      if (drawers) for (const grade of ALL_GRADES) drawers.rates[grade] = {Standard:packageAllowances(saved.grades[grade]).extraDrawerRupees,'With PVC':packageAllowances(saved.grades[grade]).extraDrawerRupees};
      await onSave(saved); setDraft(saved);setSavedState(JSON.stringify(saved));
      setMessage('Specifications and wording saved. New quotations and published revisions use these details.');
    }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save. Please try again.'); }
    finally { setBusy(false); }
  }}>
    <div className="business-section-heading"><h2>Packages and materials</h2><p>Edit allowances, plywood products and the wording printed in your documents. Additional drawer charges appear automatically.</p></div>
    {ALL_GRADES.map(grade => { const info = draft.grades[grade]; const allowance = packageAllowances(info); return <details className="material-package" key={grade} open={grade === 'Base'}>
      <summary><strong>{getPackageDisplayName(grade)} package</strong><span>{info.approvedBrands.length} plywood options</span><ChevronDown size={18}/></summary>
      <div className="material-package-body">
      <div className="business-fields">
        {([['handleRupees', 'Handle allowance (₹ each)'], ['laminateSheetRupees', 'Laminate allowance (₹ per sheet)'], ['extraDrawerRupees', 'Additional drawer (₹ each)'], ['includedBedroomDrawersMin', 'Included bedroom drawers: minimum'], ['includedBedroomDrawersMax', 'Included bedroom drawers: maximum']] as const).map(([key, label]) => <div className="business-field" key={key}><label htmlFor={`${grade}-${key}`}>{label}</label><input id={`${grade}-${key}`} type="number" min="0" step="1" required value={allowance[key]} onChange={e => update(grade, value => { value.allowances = { ...packageAllowances(value), [key]: Number(e.target.value) }; })}/></div>)}
        {(['tagline', 'termiteProofBadge', 'warrantyBanner', 'plainEnglishSummary'] as const).map(key => <div className="business-field business-field-wide" key={key}><label htmlFor={`${grade}-${key}`}>{({tagline:'Package description',termiteProofBadge:'Plywood grade',warrantyBanner:'Warranty summary',plainEnglishSummary:'Material specification'})[key]}</label><textarea id={`${grade}-${key}`} rows={2} value={info[key]} required onChange={e => update(grade, value => { value[key] = e.target.value; })}/></div>)}
      </div>
      <h3>Plywood brands, grades and warranty</h3>
      <div className="business-field"><label htmlFor={`${grade}-hardware-brands`}>Hardware brands · preferred order</label><textarea id={`${grade}-hardware-brands`} rows={3} value={hardwareBrands(draft,grade).join('\n')} onChange={event=>update(grade,value=>{value.hardwareBrands=event.target.value.split('\n');})}/><p className="business-field-hint">One brand per line. First is preferred. Applies to the hardware scope below; handles have their own allowance.</p></div>
      {info.approvedBrands.map((brand, index) => <div className="material-brand" key={index}>
        <div className="business-fields">
          <div className="business-field"><label htmlFor={`${grade}-brand-${index}`}>Brand / product {index + 1}</label><textarea rows={2} id={`${grade}-brand-${index}`} value={brand.name} required onChange={e => update(grade, value => { value.approvedBrands[index].name = e.target.value; })}/></div>
          <div className="business-field"><label htmlFor={`${grade}-warranty-${index}`}>Manufacturer warranty (years)</label><input id={`${grade}-warranty-${index}`} type="number" min="0" max="100" value={brand.warrantyYears} onChange={e => update(grade, value => { value.approvedBrands[index].warrantyYears = Number(e.target.value); })}/></div>
          <div className="business-field business-field-wide"><label htmlFor={`${grade}-spec-${index}`}>Grade / series / specification</label><textarea rows={2} id={`${grade}-spec-${index}`} value={brand.spec} required onChange={e => update(grade, value => { value.approvedBrands[index].spec = e.target.value; })}/></div>
        </div>
        <button type="button" className="settings-cancel" disabled={info.approvedBrands.length <= 1} onClick={() => update(grade, value => { value.approvedBrands.splice(index, 1); })}>Remove product</button>
      </div>)}
      <button type="button" className="settings-cancel" onClick={() => update(grade, value => { value.approvedBrands.push({name:'',spec:'',warrantyYears:0,boardToneHex:'#b98b68',grainAccentHex:'#795338'}); })}>Add plywood product</button>
      <h3>Other included allowances</h3>
      {(allowance.additionalAllowances || []).map((entry, index) => <div className="material-extra" key={index}>
        <div className="business-field business-field-wide"><label htmlFor={`${grade}-extra-${index}-name`}>Allowance name</label><textarea rows={2} id={`${grade}-extra-${index}-name`} required value={entry.name} onChange={e => update(grade, value => { value.allowances!.additionalAllowances![index].name = e.target.value; })}/></div>
        <div className="business-field"><label htmlFor={`${grade}-extra-${index}-amount`}>Amount (₹)</label><input id={`${grade}-extra-${index}-amount`} type="number" min="0" value={entry.amountRupees} onChange={e => update(grade, value => { value.allowances!.additionalAllowances![index].amountRupees = Number(e.target.value); })}/></div>
        <div className="business-field"><label htmlFor={`${grade}-extra-${index}-unit`}>Applies to</label><input id={`${grade}-extra-${index}-unit`} placeholder="per item / per set" required value={entry.unit} onChange={e => update(grade, value => { value.allowances!.additionalAllowances![index].unit = e.target.value; })}/></div>
        <button type="button" className="settings-cancel" onClick={() => update(grade, value => { value.allowances!.additionalAllowances!.splice(index,1); })}>Remove</button>
      </div>)}
      <button type="button" className="settings-cancel" onClick={() => update(grade, value => { value.allowances = packageAllowances(value); value.allowances.additionalAllowances = [...(value.allowances.additionalAllowances || []), {name:'',amountRupees:0,unit:'per item'}]; })}>Add allowance</button>
      </div>
    </details>; })}
    <details className="material-package material-wording">
      <summary><strong>Materials and hardware wording</strong><span>Online and PDF</span><ChevronDown size={18}/></summary>
      <div className="material-package-body">
        <p className="material-help">Edit these sentences once for future quotations and revisions. Sheet and handle amounts are added from the package allowances above.</p>
        <div className="business-fields">
          {([['materialsAndLabour','Materials and labour statement'],['externalLaminate','External laminate specification'],['internalLaminate','Internal laminate specification'],['handles','Handle allowance label']] as [keyof MaterialWording,string][]).map(([key,label]) => <div className="business-field business-field-wide" key={key}><label htmlFor={`material-wording-${key}`}>{label}</label><textarea id={`material-wording-${key}`} rows={key === 'handles' ? 2 : 3} required maxLength={2000} value={draft.materialWording[key]} onChange={event=>{setDraft(previous=>({...previous,materialWording:{...previous.materialWording,[key]:event.target.value}}));setMessage('');}}/></div>)}
        </div>
        <h3>Other materials and hardware</h3>
        <div className="business-field"><label htmlFor="hardware-scope">Included hardware scope</label><textarea id="hardware-scope" rows={4} maxLength={2000} required value={draft.hardwareScope||DEFAULT_HARDWARE_SCOPE} onChange={event=>setDraft(previous=>({...previous,hardwareScope:event.target.value}))}/><p className="business-field-hint">Use soft-close bedroom wardrobe sliding-door fittings, tandem systems, soft-close hinges and telescopic channels. Channels may or may not be soft-close. Do not imply that sliding room-entry doors or handles are included.</p></div>
        {draft.commonMaterials.map((line,index)=><div className="material-brand" key={index}><div className="business-field"><label htmlFor={`material-line-${index}`}>Material specification {index + 1}</label><textarea id={`material-line-${index}`} required rows={3} maxLength={2000} value={line} onChange={event=>{setDraft(previous=>({...previous,commonMaterials:previous.commonMaterials.map((value,i)=>i===index?event.target.value:value)}));setMessage('');}}/></div><button type="button" className="settings-cancel" onClick={()=>setDraft(previous=>({...previous,commonMaterials:previous.commonMaterials.filter((_,i)=>i!==index)}))}>Remove material</button></div>)}
        <button type="button" className="settings-cancel" onClick={()=>setDraft(previous=>({...previous,commonMaterials:[...previous.commonMaterials,'']}))}>Add material specification</button>
      </div>
    </details>
    <p className="business-payment-note">Manufacturer warranties follow the selected product, certificate, invoice and warranty conditions. BWR remains BWR; changing package names does not change the plywood grade.</p>
    {message && <p role="status" className="settings-status">{message}</p>}
    <div className="business-save-area"><div className="business-save-actions"><span>Published documents keep their saved specifications. Publish a quotation update to apply changes.</span><button className="settings-save" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save specifications and wording'}</button></div></div>
  </form>;
}
