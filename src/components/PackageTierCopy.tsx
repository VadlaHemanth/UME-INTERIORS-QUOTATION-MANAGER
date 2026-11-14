
import { PACKAGE_TIERS } from '../lib/package-tiers';
import type { PlywoodGrade } from '../lib/schema';
import './package-tier.css';

export function PackageTierCopy({ grade }: { grade: PlywoodGrade }) {
  const { caption, label } = PACKAGE_TIERS[grade];
  return <span className="package-tier-copy" data-grade={grade}>
    <span className="package-tier-caption">{caption}</span>
    <span className="package-tier-label">{label}</span>
  </span>;
}

