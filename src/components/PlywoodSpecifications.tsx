import React from 'react';
import { getPackageDisplayName,type StudioCatalogue } from '../lib/catalogue';
import type { PlywoodGrade } from '../lib/schema';
import { DEFAULT_HARDWARE_SCOPE,hardwareBrands,packageWarrantyLabel,PLYWOOD_WARRANTY_CONDITIONS } from '../lib/commercial-spec';
import './plywood-comparison.css';

export function plywoodProductDescription(spec:string):string {
  return spec.replace(/\s*\(?\s*(?:up to\s*)?\d+\s*-?\s*(?:years?|yrs?)\s*(?:manufacturer|brand)\s*warranty\s*\)?/gi,'').replace(/\s*[—–-]\s*$/,'').trim();
}
export function compactPlywoodProduct(brand:{name:string;spec:string;warrantyYears:number}){
  const name=brand.name.replace(new RegExp(`\\s*\\(${brand.warrantyYears}\\s*(?:yrs?|years?)\\)`,'gi'),'').trim();
  let spec=plywoodProductDescription(brand.spec).replace(/\bplywood\b/gi,'').replace(/\s*\(as per selected product\)/gi,'');
  for(const match of name.matchAll(/\(([^)]+)\)/g)){
    const escaped=match[1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    spec=spec.replace(new RegExp(`\\b${escaped}(?:\\s+Series)?(?=\\s+(?:BWP|BWR|Marine|Commercial|Grade|710|303)\\b)`,'gi'),'');
  }
  return {name,spec:spec.replace(/\s+/g,' ').replace(/^[—–\s-]+|[—–\s-]+$/g,'').trim()};
}
export function PlywoodSpecifications({catalogue,grades,selectedGrade,print=false}:{catalogue:StudioCatalogue;grades:PlywoodGrade[];selectedGrade?:PlywoodGrade|null;print?:boolean}) {
  const packages=(['Base','Normal','Premium'] as const).filter(grade=>grades.includes(grade));
  return <section className={`plywood-comparison${print?' plywood-print':''}`} aria-label="Plywood and hardware by package" data-package-count={packages.length}>
    <div className="plywood-comparison-heading"><h2>Plywood & hardware</h2><p>Package options and manufacturer warranty.</p>{!print&&packages.length>1&&<p className="plywood-swipe-hint">Swipe across to compare packages.</p>}</div>
    <div className="plywood-comparison-scroll" tabIndex={print?-1:0} role="region" aria-label="Compare package materials">
      <table className="plywood-comparison-table"><thead><tr>{packages.map(grade=><th className="plywood-package" data-selected={selectedGrade===grade} key={grade} scope="col"><div><h3>{getPackageDisplayName(grade)}</h3>{selectedGrade===grade&&<span className="plywood-package-selected">Selected</span>}</div><p>{packageWarrantyLabel(catalogue.grades[grade])||'Warranty under manufacturer terms'}</p></th>)}</tr></thead>
      <tbody><tr>{packages.map(grade=><td data-selected={selectedGrade===grade} key={grade}><h4>Plywood options · brand warranty</h4><ul className="plywood-product-list">{catalogue.grades[grade].approvedBrands.map((brand,index)=><li className="plywood-option" key={index}><div><strong aria-label={brand.name}>{compactPlywoodProduct(brand).name}</strong><span className="plywood-option-warranty">{brand.warrantyYears>0?`${brand.warrantyYears} years`:'Manufacturer terms'}</span></div>{compactPlywoodProduct(brand).spec.toLowerCase().replace(/[^a-z0-9]/g,'')!==compactPlywoodProduct(brand).name.toLowerCase().replace(/[^a-z0-9]/g,'')&&<p>{compactPlywoodProduct(brand).spec||brand.spec}</p>}</li>)}</ul>{!catalogue.grades[grade].approvedBrands.length&&<p className="plywood-empty">Plywood specification to be confirmed by UME.</p>}</td>)}</tr>
      <tr className="plywood-hardware-row">{packages.map(grade=>{const brands=hardwareBrands(catalogue,grade);return <td data-selected={selectedGrade===grade} key={grade}><h4>Hardware · preferred order</h4><p><strong>{brands[0]}</strong>{brands.length>1?` · ${brands.slice(1).join(' · ')}`:''}</p></td>;})}</tr></tbody></table>
    </div>
    <p className="plywood-hardware-note">{catalogue.hardwareScope||DEFAULT_HARDWARE_SCOPE}</p>
    <p className="plywood-warranty-note">Brands are alternative options. {PLYWOOD_WARRANTY_CONDITIONS}</p>
  </section>;
}
