import React, { useState } from 'react';
import { getPackageDisplayName, type StudioCatalogue } from '../lib/catalogue';
import { packageAllowances } from '../lib/commercial-spec';
import { ALL_GRADES } from '../lib/pricing';
import type { PlywoodGrade } from '../lib/schema';

export function MaterialSettings({ catalogue, onSave }: { catalogue: StudioCatalogue; onSave: (value: StudioCatalogue) => Promise<void> }) {
  const [draft, setDraft] = useState(() => structuredClone(catalogue));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const update = (grade: PlywoodGrade, apply: (info: StudioCatalogue['grades'][PlywoodGrade]) => void) => {
    setDraft(previous => { const next = structuredClone(previous); apply(next.grades[grade]); return next; }); setMessage('');
  };
  return <form className="material-settings" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const saved = structuredClone(draft);
      const drawers = saved.workTypes['Additional internal drawer'];
      if (drawers) for (const grade of ALL_GRADES) drawers.rates[grade] = {Standard:packageAllowances(saved.grades[grade]).extraDrawerRupees,'With PVC':packageAllowances(saved.grades[grade]).extraDrawerRupees};
      await onSave(saved); setDraft(saved);
      setMessage('Package specifications saved. New publications use these details. Copy the updated assistant instructions for future chats.');
    }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save. Please try again.'); }
    finally { setBusy(false); }
  }}>
    <div className="business-section-heading"><h2>Packages and materials</h2><p>Set included allowances, plywood products and warranty periods. These details appear in quotations and work orders.</p></div>
    {ALL_GRADES.map(grade => { const info = draft.grades[grade]; const allowance = packageAllowances(info); return <details className="material-package" key={grade} open={grade === 'Base'}>
      <summary>{getPackageDisplayName(grade)} package <span>{info.approvedBrands.length} plywood options</span></summary>
      <div className="business-fields">
        {([['handleRupees', 'Handle allowance (₹ each)'], ['laminateSheetRupees', 'Laminate allowance (₹ per sheet)'], ['extraDrawerRupees', 'Additional drawer (₹ each)'], ['includedBedroomDrawersMin', 'Included bedroom drawers: minimum'], ['includedBedroomDrawersMax', 'Included bedroom drawers: maximum']] as const).map(([key, label]) => <div className="business-field" key={key}><label htmlFor={`${grade}-${key}`}>{label}</label><input id={`${grade}-${key}`} type="number" min="0" step="1" required value={allowance[key]} onChange={e => update(grade, value => { value.allowances = { ...packageAllowances(value), [key]: Number(e.target.value) }; })}/></div>)}
        {(['tagline', 'termiteProofBadge', 'warrantyBanner', 'plainEnglishSummary'] as const).map(key => <div className="business-field business-field-wide" key={key}><label htmlFor={`${grade}-${key}`}>{({tagline:'Package description',termiteProofBadge:'Plywood grade',warrantyBanner:'Warranty summary',plainEnglishSummary:'Material specification'})[key]}</label><input id={`${grade}-${key}`} value={info[key]} required onChange={e => update(grade, value => { value[key] = e.target.value; })}/></div>)}
      </div>
      <h3>Plywood brands, grades and warranty</h3>
      {info.approvedBrands.map((brand, index) => <div className="material-brand" key={index}>
        <div className="business-fields">
          <div className="business-field"><label htmlFor={`${grade}-brand-${index}`}>Brand / product</label><input id={`${grade}-brand-${index}`} value={brand.name} required onChange={e => update(grade, value => { value.approvedBrands[index].name = e.target.value; })}/></div>
          <div className="business-field"><label htmlFor={`${grade}-warranty-${index}`}>Manufacturer warranty (years)</label><input id={`${grade}-warranty-${index}`} type="number" min="0" max="100" value={brand.warrantyYears} onChange={e => update(grade, value => { value.approvedBrands[index].warrantyYears = Number(e.target.value); })}/></div>
          <div className="business-field business-field-wide"><label htmlFor={`${grade}-spec-${index}`}>Grade / series / specification</label><input id={`${grade}-spec-${index}`} value={brand.spec} required onChange={e => update(grade, value => { value.approvedBrands[index].spec = e.target.value; })}/></div>
        </div>
        <button type="button" className="settings-cancel" disabled={info.approvedBrands.length <= 1} onClick={() => update(grade, value => { value.approvedBrands.splice(index, 1); })}>Remove product</button>
      </div>)}
      <button type="button" className="settings-cancel" onClick={() => update(grade, value => { value.approvedBrands.push({name:'',spec:'',warrantyYears:0,boardToneHex:'#b98b68',grainAccentHex:'#795338'}); })}>Add plywood product</button>
      <h3>Other included allowances</h3>
      {(allowance.additionalAllowances || []).map((entry, index) => <div className="material-extra" key={index}>
        <input aria-label={`${getPackageDisplayName(grade)} allowance name ${index+1}`} placeholder="Allowance name" required value={entry.name} onChange={e => update(grade, value => { value.allowances!.additionalAllowances![index].name = e.target.value; })}/>
        <input aria-label={`${getPackageDisplayName(grade)} allowance amount ${index+1}`} type="number" min="0" value={entry.amountRupees} onChange={e => update(grade, value => { value.allowances!.additionalAllowances![index].amountRupees = Number(e.target.value); })}/>
        <input aria-label={`${getPackageDisplayName(grade)} allowance unit ${index+1}`} placeholder="per item / per set" required value={entry.unit} onChange={e => update(grade, value => { value.allowances!.additionalAllowances![index].unit = e.target.value; })}/>
        <button type="button" className="settings-cancel" onClick={() => update(grade, value => { value.allowances!.additionalAllowances!.splice(index,1); })}>Remove</button>
      </div>)}
      <button type="button" className="settings-cancel" onClick={() => update(grade, value => { value.allowances = packageAllowances(value); value.allowances.additionalAllowances = [...(value.allowances.additionalAllowances || []), {name:'',amountRupees:0,unit:'per item'}]; })}>Add allowance</button>
    </details>; })}
    <p className="business-payment-note">Manufacturer warranties follow the selected product, certificate, invoice and warranty conditions. BWR remains BWR; changing package names does not change the plywood grade.</p>
    {message && <p role="status" className="settings-status">{message}</p>}
    <div className="business-save-actions"><button className="settings-save" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save package specifications'}</button></div>
  </form>;
}
