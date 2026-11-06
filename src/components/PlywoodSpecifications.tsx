import React from 'react';
import { getPackageDisplayName, type StudioCatalogue } from '../lib/catalogue';
import type { PlywoodGrade } from '../lib/schema';
import { packageWarrantyLabel, PLYWOOD_WARRANTY_CONDITIONS } from '../lib/commercial-spec';
import './plywood-comparison.css';

export function plywoodProductDescription(spec:string):string {
  return spec.replace(/\s*\(?\s*(?:up to\s*)?\d+\s*-?\s*(?:years?|yrs?)\s*(?:manufacturer|brand)\s*warranty\s*\)?/gi,'').replace(/\s*[—–-]\s*$/,'').trim();
}

export function PlywoodSpecifications({ catalogue, grades, selectedGrade }: { catalogue: StudioCatalogue; grades: PlywoodGrade[]; selectedGrade?:PlywoodGrade|null }) {
  const packages=(['Base','Normal','Premium'] as const).filter(grade=>grades.includes(grade));
  return <section className="plywood-comparison" aria-label="Plywood and manufacturer warranties by package">
    <div className="plywood-comparison-heading"><h2>Which plywood is included?</h2><p>Compare the plywood options and manufacturer warranty in each package.</p></div>
    <div className="plywood-comparison-grid" data-package-count={packages.length}>{packages.map(grade=>{
      const info=catalogue.grades[grade];
      return <article className="plywood-package" data-selected={selectedGrade===grade} key={grade}>
        <header><h3>{getPackageDisplayName(grade)} Package</h3>{selectedGrade===grade&&<span className="plywood-package-selected">Selected</span>}</header>
        <p className="plywood-package-summary">{packageWarrantyLabel(info)||'No fixed warranty period listed'}</p>
        <div className="plywood-option-head" aria-hidden="true"><span>Plywood option</span><span>Brand warranty</span></div>
        <dl>{info.approvedBrands.map((brand,index)=><div className="plywood-option" key={index}>
          <dt><strong>{brand.name}</strong><span>{plywoodProductDescription(brand.spec)||brand.spec}</span></dt>
          <dd>{brand.warrantyYears>0?<><strong>{brand.warrantyYears} years</strong><span className="plywood-option-accessible">manufacturer warranty</span></>:<span>Manufacturer terms</span>}</dd>
        </div>)}</dl>
        {!info.approvedBrands.length&&<p className="plywood-empty">Plywood specification to be confirmed by UME.</p>}
      </article>;
    })}</div>
    <p className="plywood-warranty-note">The listed brands are options, not all supplied together. {PLYWOOD_WARRANTY_CONDITIONS}</p>
  </section>;
}
