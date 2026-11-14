
import type { PlywoodGrade } from './schema';

export const PACKAGE_TIERS = {
  Base: { name: 'Standard', slug: 'standard', label: 'Budget-Friendly', caption: 'Comfort and functional interiors' },
  Normal: { name: 'Premium', slug: 'premium', label: 'Most Popular', caption: 'Elegant and modern interiors' },
  Premium: { name: 'Luxury', slug: 'luxury', label: 'Luxury Experience', caption: 'Exclusive and high-end interiors' },
} as const satisfies Record<PlywoodGrade, { name: string; slug: string; label: string; caption: string }>;

export type PackageDisplayName = (typeof PACKAGE_TIERS)[PlywoodGrade]['name'];

export function getPackageDisplayName(grade: PlywoodGrade): PackageDisplayName {
  return PACKAGE_TIERS[grade].name;
}

const LEGACY_LINK_GRADES: ReadonlyMap<string, PlywoodGrade> = new Map([
  ['base', 'Base'], ['basic', 'Base'], ['normal', 'Normal'], ['standard', 'Normal'], ['premium', 'Premium'],
]);

/** New links use tier. Existing pkg/package/default links keep their original meaning. */
export function packageLinkGrade(params: URLSearchParams): PlywoodGrade | undefined {
  const tier = params.get('tier');
  if (tier !== null) {
    return (Object.keys(PACKAGE_TIERS) as PlywoodGrade[]).find(grade => PACKAGE_TIERS[grade].slug === tier.toLowerCase());
  }
  const legacy = params.get('pkg') || params.get('package') || params.get('default');
  const token = legacy?.toLowerCase().match(/(?:^|[^a-z])(premium|normal|standard|base|basic)(?=$|[^a-z])/)?.[1];
  return token ? LEGACY_LINK_GRADES.get(token) : undefined;
}

/** Historical payment entries stored only a formatted label. Keep names inside brand or room text intact. */
export function legacyPaymentPackageLabel(label: string): string {
  const names: Record<string, PackageDisplayName> = {
    Basic: getPackageDisplayName('Base'), Base: getPackageDisplayName('Base'),
    Standard: getPackageDisplayName('Normal'), Normal: getPackageDisplayName('Normal'),
    Premium: getPackageDisplayName('Premium'),
  };
  if (label.startsWith('Room-Wise Mix (')) {
    return label.replace(/: (Basic|Base|Standard|Normal|Premium)(?=\/(?:\+PVC|No-PVC)\/)/g, (_, name) => ': ' + names[name]);
  }
  return label.replace(/^(Basic|Base|Standard|Normal|Premium)(?=$|\s*(?:·|\bPackage\b|\())/, (_, name) => names[name]);
}

