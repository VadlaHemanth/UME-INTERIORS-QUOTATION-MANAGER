import React, { useMemo } from 'react';
import QRCode from 'qrcode';
import { FinishOption, PlywoodGrade, ProtectionOption } from '../lib/schema';

/**
 * Official UME Interiors Logo Mark (AAA.png / umeinteriors.com)
 */
export const UmeLogoMark: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'pdf' }> = ({ size = 'md' }) => {
  const dimensions =
    size === 'sm'
      ? 'h-9 max-w-[125px]'
      : size === 'pdf'
      ? 'h-[68px] max-w-[160px]'
      : size === 'lg'
      ? 'h-14 max-w-[155px]'
      : 'h-10 max-w-[138px]';

  return (
    <div className="inline-flex items-center justify-start select-none shrink-0">
      <img
        src="/assets/ume-logo.png"
        alt="Umamaheshwara Interiors"
        referrerPolicy="no-referrer"
        className={`${dimensions} w-auto object-contain object-left block shrink-0`}
      />
    </div>
  );
};

/**
 * 1. Architectural Isometric Multi-Ply Calibrated Plywood Core Cutaway
 */
export const PlywoodBoardSwatch: React.FC<{
  grade: PlywoodGrade;
  protection: ProtectionOption;
  finish: FinishOption;
  boardToneHex?: string;
  grainAccentHex?: string;
}> = ({
  grade,
  protection,
  finish,
  boardToneHex = '#9E6B47',
  grainAccentHex = '#5C371E',
}) => {
  const plies = grade === 'Premium' ? 13 : grade === 'Normal' ? 11 : 9;
  const gradeBadge =
    grade === 'Premium'
      ? 'BWP 710 Marine Grade'
      : grade === 'Normal'
      ? 'BWR 710 / 303 Grade'
      : 'BWP 710 / 303 Grade';

  return (
    <div className="w-full bg-white border border-[#E4DFD7] rounded-lg overflow-hidden flex flex-col justify-between">
      {/* Top Visual Canvas: Isometric Layered Plywood Sample */}
      <div className="relative h-44 bg-[#1B1816] border-b border-[#E4DFD7] p-4 flex items-center justify-center overflow-hidden">
        <svg
          className="w-full h-full max-w-[300px]"
          viewBox="0 0 300 155"
          role="img"
          aria-label={`${grade} Grade ${plies}-Ply Calibrated Plywood Cutaway`}
        >
          {/* Subtle architectural grid lines */}
          <line x1="15" y1="138" x2="285" y2="138" stroke="#332E2A" strokeWidth="1" />
          <line x1="25" y1="20" x2="25" y2="145" stroke="#332E2A" strokeWidth="1" strokeDasharray="3 3" />

          {/* Bottom 6mm PVC / Back Layer (when With PVC is active) */}
          {protection === 'With PVC' && (
            <g>
              <polygon
                points="46,112 166,134 252,98 132,76"
                fill="#F4EFE6"
                stroke="#8C1D40"
                strokeWidth="1.2"
              />
              <polygon
                points="46,112 166,134 166,141 46,119"
                fill="#E5DEC9"
                stroke="#8C1D40"
                strokeWidth="1"
              />
              <polygon
                points="166,134 252,98 252,105 166,141"
                fill="#D4CCB4"
                stroke="#8C1D40"
                strokeWidth="1"
              />
            </g>
          )}

          {/* Main 18mm Multi-Ply Hardwood Core Block — Left Edge (Showing Plies) */}
          <polygon
            points="46,82 166,104 166,130 46,108"
            fill={boardToneHex}
            stroke={grainAccentHex}
            strokeWidth="1"
          />
          {/* Individual Veneer Ply Striations on Left Edge */}
          <line x1="46" y1="87" x2="166" y2="109" stroke={grainAccentHex} strokeWidth="1.4" />
          <line x1="46" y1="92" x2="166" y2="114" stroke="#D9B38C" strokeWidth="1" />
          <line x1="46" y1="97" x2="166" y2="119" stroke={grainAccentHex} strokeWidth="1.4" />
          <line x1="46" y1="102" x2="166" y2="124" stroke="#D9B38C" strokeWidth="1" />

          {/* Main 18mm Multi-Ply Core Block — Right Edge (Showing End-Grain Plies) */}
          <polygon
            points="166,104 252,68 252,94 166,130"
            fill="#7D5033"
            stroke={grainAccentHex}
            strokeWidth="1"
          />
          <line x1="166" y1="109" x2="252" y2="73" stroke="#472916" strokeWidth="1.4" />
          <line x1="166" y1="114" x2="252" y2="78" stroke="#C69C72" strokeWidth="1" />
          <line x1="166" y1="119" x2="252" y2="83" stroke="#472916" strokeWidth="1.4" />
          <line x1="166" y1="124" x2="252" y2="88" stroke="#C69C72" strokeWidth="1" />

          {/* Top Hardwood Face of Plywood Core */}
          <polygon
            points="46,82 166,104 252,68 132,46"
            fill={boardToneHex}
            stroke="#C69C72"
            strokeWidth="1"
          />
          {/* Woodgrain lines on core top */}
          <path d="M85,68 Q135,78 190,65" fill="none" stroke={grainAccentHex} strokeWidth="1" opacity="0.55" />
          <path d="M70,78 Q130,89 210,74" fill="none" stroke={grainAccentHex} strokeWidth="1" opacity="0.55" />

          {/* Stepped Cutaway Layer: 0.8mm White Inner Liner + 1.0mm Exterior Decorative Laminate */}
          <polygon
            points="58,72 162,91 236,60 132,41"
            fill="#F9F8F6"
            stroke="#D6D1C7"
            strokeWidth="1"
          />
          <polygon
            points="68,64 158,81 222,54 132,37"
            fill={finish === 'High Gloss' ? '#3B2316' : '#5E3A24'}
            stroke="#C59B27"
            strokeWidth="1.2"
          />
          {finish === 'High Gloss' && (
            <polygon points="105,45 130,41 165,74 140,78" fill="#FFFFFF" fillOpacity="0.22" />
          )}

          {/* Callout Labels inside SVG */}
          <g fontFamily="Plus Jakarta Sans, sans-serif" fontSize="9.5" fontWeight="600">
            {/* Callout 1: Outer 1mm Laminate */}
            <line x1="145" y1="52" x2="178" y2="25" stroke="#C59B27" strokeWidth="1" />
            <circle cx="145" cy="52" r="2.2" fill="#C59B27" />
            <rect x="178" y="13" width="112" height="18" rx="3" fill="#262320" stroke="#C59B27" strokeWidth="0.8" />
            <text x="184" y="25" fill="#F6F4F0">1.0mm {finish} Sheet</text>

            {/* Callout 2: 18mm Calibrated Core */}
            <line x1="96" y1="104" x2="64" y2="132" stroke="#F6F4F0" strokeWidth="1" />
            <circle cx="96" cy="104" r="2.2" fill="#F6F4F0" />
            <rect x="8" y="124" width="114" height="18" rx="3" fill="#262320" stroke="#68625B" strokeWidth="0.8" />
            <text x="14" y="136" fill="#F6F4F0">{plies}-Ply 18mm Core</text>
          </g>
        </svg>

        <span className="absolute top-3 left-3 text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded bg-[#262320] text-[#E6C665] border border-[#C59B27]/40">
          {gradeBadge}
        </span>
      </div>

      {/* Bottom Specification Details */}
      <div className="p-4 space-y-2.5 bg-white">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-[#141210]">
            {grade} Grade Calibrated Core
          </h4>
          <span className="text-xs font-mono font-semibold text-[#8C1D40]">
            {plies} Plies · 18mm
          </span>
        </div>
        <p className="text-xs text-[#68625B] leading-relaxed">
          {grade === 'Premium'
            ? '100% Boiling Water Proof (IS:710) marine hardwood core with 30/25/21-year company warranty.'
            : grade === 'Normal'
            ? 'Company-warranted BWR 710 (wet zones) & 303 (dry rooms) calibrated core with 20/15/10-year cover.'
            : 'Dependable BWP 710 & 303 commercial plywood core pressed with 0.8mm inner liner & 1mm outer laminate.'}
        </p>
        <div className="pt-2 border-t border-[#EFECE6] flex items-center justify-between text-[11px] text-[#68625B]">
          <span>Inner Liner: <strong className="text-[#141210]">0.8mm White</strong></span>
          <span>Adhesive: <strong className="text-[#141210]">Fevicol Marine</strong></span>
        </div>
      </div>
    </div>
  );
};

/**
 * 2. Architectural Cutaway Diagram: 6mm Waterproof High-Density PVC Wall & Wet-Zone Shield
 *    Clearly justifies and visualizes HOW and WHERE the 6mm PVC sheet protects the woodwork from wall dampness & termites.
 */
export const PvcProtectionSwatch: React.FC<{
  protection: ProtectionOption;
}> = ({ protection }) => {
  const isPvc = protection === 'With PVC';

  return (
    <div
      className={`w-full bg-white border rounded-lg overflow-hidden flex flex-col justify-between ${
        isPvc ? 'border-[#8C1D40]' : 'border-[#E4DFD7]'
      }`}
    >
      {/* Top Visual Canvas: Detailed Architectural Wall-to-Cabinet Cross-Section */}
      <div className="relative h-44 bg-[#1B1816] border-b border-[#E4DFD7] p-4 flex items-center justify-center overflow-hidden">
        <svg
          className="w-full h-full max-w-[310px]"
          viewBox="0 0 310 155"
          role="img"
          aria-label="6mm High-Density Waterproof PVC Wall and Wet-Area Barrier Diagram"
        >
          {/* 1. LEFT: Exterior / Bathroom Masonry Brick Wall */}
          <g>
            <rect x="10" y="18" width="44" height="116" rx="2" fill="#3A3532" stroke="#524B46" strokeWidth="1" />
            {/* Brick Mortar Lines */}
            <line x1="10" y1="38" x2="54" y2="38" stroke="#262320" strokeWidth="1.5" />
            <line x1="10" y1="58" x2="54" y2="58" stroke="#262320" strokeWidth="1.5" />
            <line x1="10" y1="78" x2="54" y2="78" stroke="#262320" strokeWidth="1.5" />
            <line x1="10" y1="98" x2="54" y2="98" stroke="#262320" strokeWidth="1.5" />
            <line x1="10" y1="118" x2="54" y2="118" stroke="#262320" strokeWidth="1.5" />
            <line x1="32" y1="18" x2="32" y2="38" stroke="#262320" strokeWidth="1.5" />
            <line x1="24" y1="38" x2="24" y2="58" stroke="#262320" strokeWidth="1.5" />
            <line x1="36" y1="58" x2="36" y2="78" stroke="#262320" strokeWidth="1.5" />
            <line x1="26" y1="78" x2="26" y2="98" stroke="#262320" strokeWidth="1.5" />

            {/* Dampness / Seepage Waves inside Masonry Wall */}
            <circle cx="44" cy="48" r="3" fill="#38BDF8" opacity="0.85" />
            <circle cx="40" cy="70" r="2.5" fill="#38BDF8" opacity="0.75" />
            <circle cx="45" cy="90" r="3" fill="#38BDF8" opacity="0.85" />
            <circle cx="42" cy="110" r="2.5" fill="#38BDF8" opacity="0.75" />
            {/* Blocked arrows at the PVC boundary */}
            <path d="M48,48 L58,48" stroke="#38BDF8" strokeWidth="1.5" />
            <path d="M48,90 L58,90" stroke="#38BDF8" strokeWidth="1.5" />
          </g>

          {/* 2. CENTER-LEFT: 6mm Waterproof High-Density PVC Barrier Sheet (Wall Back & Bottom Wet Plinth) */}
          <g>
            {/* Vertical 6mm PVC Back Panel against Wall */}
            <rect
              x="60"
              y="18"
              width="14"
              height="116"
              rx="2"
              fill={isPvc ? '#F5EFE6' : '#8A5A3B'}
              stroke={isPvc ? '#C59B27' : '#5C371E'}
              strokeWidth="1.6"
            />
            {/* Bottom 6mm PVC Wet-Area / Under-Sink Base Shield */}
            <rect
              x="76"
              y="120"
              width="118"
              height="14"
              rx="2"
              fill={isPvc ? '#F5EFE6' : '#8A5A3B'}
              stroke={isPvc ? '#C59B27' : '#5C371E'}
              strokeWidth="1.6"
            />
            {/* Shield Lock Badge on the PVC Barrier */}
            {isPvc && (
              <g transform="translate(55, 62)">
                <rect x="0" y="0" width="24" height="24" rx="12" fill="#8C1D40" stroke="#F5EFE6" strokeWidth="1.2" />
                <path d="M8,12 L11,15 L16,9" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )}
          </g>

          {/* 3. CENTER: 18mm Calibrated BWP Plywood Cabinet Carcass & Internal Shelves */}
          <g>
            {/* Top Carcass Panel */}
            <rect x="76" y="18" width="118" height="12" rx="1.5" fill="#9E6B47" stroke="#5C371E" strokeWidth="1" />
            {/* Middle Adjustable Shelf with 0.8mm White Liner */}
            <rect x="76" y="68" width="110" height="10" rx="1.5" fill="#9E6B47" stroke="#5C371E" strokeWidth="1" />
            <line x1="76" y1="68" x2="186" y2="68" stroke="#FFFFFF" strokeWidth="1.8" />
            {/* Interior Dry Zone Label */}
            <rect x="86" y="38" width="92" height="22" rx="3" fill="#262320" stroke="#3A3532" strokeWidth="0.8" />
            <text x="94" y="52" fill="#E5DEC9" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="9.5" fontWeight="600">
              100% Dry Cabinet
            </text>
          </g>

          {/* 4. RIGHT: 1.0mm Exterior Laminated Shutter + Handle */}
          <g>
            <rect x="198" y="18" width="14" height="116" rx="2" fill="#4A2C1B" stroke="#C59B27" strokeWidth="1.2" />
            {/* Brushed Gold Handle Profile */}
            <rect x="214" y="56" width="4" height="36" rx="1.5" fill="#C59B27" />
          </g>

          {/* 5. Engineering Callout Annotations on Right */}
          <g fontFamily="Plus Jakarta Sans, sans-serif" fontSize="9" fontWeight="600">
            {/* Callout to 6mm PVC Back Panel */}
            <line x1="67" y1="26" x2="225" y2="26" stroke="#C59B27" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx="67" cy="26" r="2.2" fill="#C59B27" />
            <rect x="225" y="16" width="78" height="20" rx="3" fill="#8C1D40" />
            <text x="231" y="29" fill="#FFFFFF">6mm PVC Back</text>

            {/* Callout to Bottom Wet Shield */}
            <line x1="150" y1="127" x2="225" y2="127" stroke="#C59B27" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx="150" cy="127" r="2.2" fill="#C59B27" />
            <rect x="225" y="117" width="78" height="20" rx="3" fill="#262320" stroke="#C59B27" strokeWidth="0.8" />
            <text x="231" y="130" fill="#E6C665">Wet Sink Shield</text>

            {/* Bottom Legend */}
            <text x="10" y="148" fill="#9CA3AF">Masonry Wall</text>
            <text x="82" y="148" fill="#E6C665">
              {isPvc ? '6mm PVC Moisture & Termite Shield' : 'Standard Plywood Back Panel'}
            </text>
          </g>
        </svg>

        <span
          className={`absolute top-3 left-3 text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded ${
            isPvc
              ? 'bg-[#8C1D40] text-white'
              : 'bg-[#262320] text-[#D6D1C7] border border-[#524B46]'
          }`}
        >
          {isPvc ? '6mm Waterproof PVC Active' : 'Standard All-Plywood'}
        </span>
      </div>

      {/* Bottom Explanation & Protected Zones */}
      <div className="p-4 space-y-2.5 bg-white">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-[#141210]">
            {isPvc ? 'With 6mm PVC Wall & Wet Shield' : 'Standard All-Plywood Carcass'}
          </h4>
          <span
            className={`text-xs font-mono font-semibold ${
              isPvc ? 'text-[#8C1D40]' : 'text-[#68625B]'
            }`}
          >
            {isPvc ? '100% Damp Proof' : 'Dry Wall Spec'}
          </span>
        </div>
        <p className="text-xs text-[#68625B] leading-relaxed">
          {isPvc
            ? 'Installs 6mm high-density waterproof PVC sheets on wall-touching wardrobe backs, loft wall frames, and kitchen under-sink wet zones so wall seepage or termites never touch the plywood.'
            : 'Uses full calibrated plywood across all carcass sides, back panels, and shutters. Ideal for dry interior walls without plumbing or seepage.'}
        </p>
        <div className="pt-2 border-t border-[#EFECE6] flex items-center justify-between text-[11px] text-[#68625B]">
          <span>Zones: <strong className="text-[#141210]">Wall Back · Sink · Loft</strong></span>
          <span>Brands: <strong className="text-[#141210]"> Century / Green / Alstone</strong></span>
        </div>
      </div>
    </div>
  );
};

/**
 * 3. Architectural Dual-Swatch Sample Board: 1.0mm SF Suede Matte vs. 1.0mm High Gloss Mirror Finish
 */
export const LaminateFinishSwatch: React.FC<{
  finish: FinishOption;
  active?: boolean;
}> = ({ finish, active = false }) => {
  const isGloss = finish === 'High Gloss';

  return (
    <div
      className={`w-full bg-white border rounded-lg overflow-hidden flex flex-col justify-between ${
        active ? 'border-[#8C1D40]' : 'border-[#E4DFD7]'
      }`}
    >
      {/* Top Visual Canvas: Dual Swatch Sample Board on Travertine */}
      <div className="relative h-44 bg-[#1B1816] border-b border-[#E4DFD7] p-4 flex items-center justify-center overflow-hidden">
        <svg
          className="w-full h-full max-w-[300px]"
          viewBox="0 0 300 155"
          role="img"
          aria-label={`1.0mm ${finish} Exterior Laminate Swatch`}
        >
          {/* Left Sample Swatch: Warm Architectural Teak / Walnut */}
          <g>
            <rect
              x="22"
              y="22"
              width="118"
              height="108"
              rx="6"
              fill={isGloss ? '#5A341E' : '#6E4429'}
              stroke={isGloss ? '#C59B27' : '#8C6244'}
              strokeWidth="1.5"
            />
            {/* Woodgrain cathedral curves */}
            <path d="M44,22 Q58,75 40,130" fill="none" stroke="#381E0E" strokeWidth="1.3" opacity="0.55" />
            <path d="M80,22 Q65,70 86,130" fill="none" stroke="#381E0E" strokeWidth="1.1" opacity="0.5" />
            <path d="M112,22 Q124,78 108,130" fill="none" stroke="#381E0E" strokeWidth="1.3" opacity="0.55" />

            {/* Specular Mirror Highlight when High Gloss */}
            {isGloss && (
              <polygon points="48,22 76,22 38,130 22,130" fill="#FFFFFF" fillOpacity="0.24" />
            )}

            <rect x="30" y="104" width="102" height="18" rx="3" fill="#141210" fillOpacity="0.82" />
            <text x="38" y="116" fill="#F6F4F0" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="9.5" fontWeight="600">
              Warm Walnut 1.0mm
            </text>
          </g>

          {/* Right Sample Swatch: Champagne Cashmere Neutral */}
          <g>
            <rect
              x="154"
              y="22"
              width="124"
              height="108"
              rx="6"
              fill={isGloss ? '#F3EFEA' : '#E5DFD5'}
              stroke={isGloss ? '#C59B27' : '#C2B9AC'}
              strokeWidth="1.5"
            />
            {isGloss ? (
              <>
                <polygon points="182,22 214,22 174,130 154,130" fill="#FFFFFF" fillOpacity="0.65" />
                <polygon points="222,22 232,22 192,130 182,130" fill="#FFFFFF" fillOpacity="0.4" />
              </>
            ) : (
              /* Subtle Suede Matte Micro-Grain */
              <>
                <line x1="164" y1="45" x2="268" y2="45" stroke="#D2C9BA" strokeWidth="0.8" strokeDasharray="2 3" />
                <line x1="164" y1="72" x2="268" y2="72" stroke="#D2C9BA" strokeWidth="0.8" strokeDasharray="3 2" />
                <line x1="164" y1="95" x2="268" y2="95" stroke="#D2C9BA" strokeWidth="0.8" strokeDasharray="2 3" />
              </>
            )}

            <rect x="162" y="104" width="108" height="18" rx="3" fill="#141210" fillOpacity="0.86" />
            <text x="170" y="116" fill="#F6F4F0" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="9.5" fontWeight="600">
              {isGloss ? 'High Gloss Mirror' : 'SF Suede Matte'}
            </text>
          </g>
        </svg>

        <span className="absolute top-3 left-3 text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded bg-[#262320] text-[#E6C665] border border-[#C59B27]/40">
          1.0mm Exterior · {finish}
        </span>
      </div>

      {/* Bottom Finish Info */}
      <div className="p-4 space-y-2.5 bg-white">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-[#141210]">
            {isGloss ? '1.0mm High Gloss Mirror Finish' : '1.0mm SF Suede Matte Finish'}
          </h4>
          <span className="text-xs font-mono font-semibold text-[#8C1D40]">
            ₹1,500 / Sheet
          </span>
        </div>
        <p className="text-xs text-[#68625B] leading-relaxed">
          {isGloss
            ? 'Reflective mirror-sheen acrylic-look laminate that visually expands rooms and wipes clean effortlessly.'
            : 'Velvety, low-glare architectural matte texture that resists fingerprints, smudges, and harsh overhead glare.'}
        </p>
        <div className="pt-2 border-t border-[#EFECE6] flex items-center justify-between text-[11px] text-[#68625B]">
          <span>Choice: <strong className="text-[#141210]">Any Brand Catalogue</strong></span>
          <span>Hinges: <strong className="text-[#141210]">Soft-Close Included</strong></span>
        </div>
      </div>
    </div>
  );
};

/** Standards-compliant QR modules, encoded locally with a four-module quiet zone. */
export const DeterministicQrCode: React.FC<{
  value: string;
  size?: number;
  label?: string;
}> = ({ value, size = 112, label }) => {
  const modules = useMemo(() => QRCode.create(value, { errorCorrectionLevel: 'M' }).modules, [value]);
  const quietZone = 4;
  const viewSize = modules.size + quietZone * 2;
  const path = useMemo(() => {
    const cells: string[] = [];
    for (let row = 0; row < modules.size; row++) {
      for (let column = 0; column < modules.size; column++) {
        if (modules.get(row, column)) {
          cells.push(`M${column + quietZone},${row + quietZone}h1v1h-1z`);
        }
      }
    }
    return cells.join('');
  }, [modules]);
  return (
    <figure className="qr-code inline-flex flex-col items-center shrink-0 m-0">
      <svg width={size} height={size} viewBox={`0 0 ${viewSize} ${viewSize}`}
        className="block bg-white border border-[#E4DFD7] rounded-md"
        role="img" aria-label={label || 'QR code'} shapeRendering="crispEdges">
        <title>{label || 'QR code'}</title>
        <rect width={viewSize} height={viewSize} fill="#ffffff" />
        <path d={path} fill="#111111" />
      </svg>
      {label && <figcaption className="mt-1 text-[10px] text-center font-medium text-[#5C645F]">{label}</figcaption>}
    </figure>
  );
};
