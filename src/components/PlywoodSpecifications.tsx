import React from 'react';
import { getPackageDisplayName, type StudioCatalogue } from '../lib/catalogue';
import type { PlywoodGrade } from '../lib/schema';

export function PlywoodSpecifications({ catalogue, grades }: { catalogue: StudioCatalogue; grades: PlywoodGrade[] }) {
  return <div className="plywood-specifications">{[...new Set(grades)].map(grade => <details key={grade}>
    <summary>{getPackageDisplayName(grade)} · Plywood and warranty</summary>
    <ul>{catalogue.grades[grade].approvedBrands.map((brand,index) => <li key={index}><strong>{brand.name}</strong><span>{brand.spec}</span><span>{brand.warrantyYears > 0 ? `${brand.warrantyYears} years manufacturer warranty · brand certificate and invoice apply` : 'Warranty as stated by the selected manufacturer; no fixed period is promised'}</span></li>)}</ul>
  </details>)}</div>;
}
