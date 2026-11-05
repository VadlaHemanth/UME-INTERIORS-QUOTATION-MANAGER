import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { GradeInfo } from '../lib/catalogue';
import { packageWarrantyLabel } from '../lib/commercial-spec';
import './package-warranty.css';

export function PackageWarrantyLabel({ grade }: { grade: GradeInfo }) {
  const label = packageWarrantyLabel(grade);
  if (!label) return null;
  return <span className="package-warranty-label"><ShieldCheck size={14} aria-hidden="true"/><span>{label}</span></span>;
}
