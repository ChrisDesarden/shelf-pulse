export interface Product {
  id: string;
  name: string;
  category: string;
  upc: string; // 12-digit numeric string
  image: string; // URL to product photo, with clean fallback placeholder if broken/empty
  unit?: string; // e.g., "Case", "Each", "Box", "Bag"
}

export const INITIAL_CATEGORIES: string[] = [
  'Beverages',
  'Dry Goods',
  'Cooler / Dairy',
  'Supplies',
];

export type ThumbnailIconType =
  | 'can'
  | 'bottle'
  | 'sack'
  | 'oil'
  | 'pasta'
  | 'carton'
  | 'butter'
  | 'eggs'
  | 'roll'
  | 'wrap'
  | 'gloves';

export function createProductThumbnailSvg(
  label: string,
  sublabel: string,
  bgStart: string,
  bgEnd: string,
  accent: string,
  iconType: ThumbnailIconType
): string {
  let illustration = '';
  switch (iconType) {
    case 'can':
      illustration = `
        <rect x="54" y="34" width="52" height="84" rx="10" fill="#ffffff" fill-opacity="0.92" stroke="${accent}" stroke-width="4"/>
        <rect x="58" y="28" width="44" height="8" rx="4" fill="#cbd5e1"/>
        <rect x="54" y="58" width="52" height="28" fill="${accent}" fill-opacity="0.85"/>
        <circle cx="80" cy="100" r="5" fill="${accent}"/>
      `;
      break;
    case 'bottle':
      illustration = `
        <path d="M68 24H92V40L104 56V114C104 118.418 100.418 122 96 122H64C59.5817 122 56 118.418 56 114V56L68 40V24Z" fill="#ffffff" fill-opacity="0.92" stroke="${accent}" stroke-width="4"/>
        <rect x="64" y="18" width="32" height="8" rx="3" fill="${accent}"/>
        <rect x="58" y="66" width="44" height="32" fill="${accent}" fill-opacity="0.85"/>
      `;
      break;
    case 'sack':
      illustration = `
        <path d="M52 40C52 33 60 28 80 28C100 28 108 33 108 40L114 112C114 118 108 122 100 122H60C52 122 46 118 46 112L52 40Z" fill="#ffffff" fill-opacity="0.92" stroke="${accent}" stroke-width="4"/>
        <rect x="56" y="62" width="48" height="30" rx="6" fill="${accent}" fill-opacity="0.85"/>
        <path d="M56 40H104" stroke="${accent}" stroke-width="3" stroke-dasharray="4 4"/>
      `;
      break;
    case 'oil':
      illustration = `
        <rect x="52" y="42" width="56" height="78" rx="8" fill="#ffffff" fill-opacity="0.92" stroke="${accent}" stroke-width="4"/>
        <rect x="70" y="26" width="20" height="16" rx="4" fill="${accent}"/>
        <path d="M96 42C108 42 112 52 104 62" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
        <circle cx="80" cy="80" r="16" fill="${accent}" fill-opacity="0.85"/>
      `;
      break;
    case 'pasta':
      illustration = `
        <rect x="46" y="34" width="68" height="86" rx="8" fill="#ffffff" fill-opacity="0.92" stroke="${accent}" stroke-width="4"/>
        <rect x="56" y="48" width="48" height="32" rx="6" fill="${accent}" fill-opacity="0.25" stroke="${accent}" stroke-width="2"/>
        <line x1="64" y1="56" x2="64" y2="72" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
        <line x1="74" y1="56" x2="74" y2="72" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
        <line x1="86" y1="56" x2="86" y2="72" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
        <line x1="96" y1="56" x2="96" y2="72" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
        <rect x="56" y="90" width="48" height="16" rx="4" fill="${accent}"/>
      `;
      break;
    case 'carton':
      illustration = `
        <path d="M52 50L68 28H92L108 50V116C108 120 104 122 100 122H60C56 122 52 120 52 116V50Z" fill="#ffffff" fill-opacity="0.94" stroke="${accent}" stroke-width="4"/>
        <path d="M52 50H108" stroke="${accent}" stroke-width="3"/>
        <circle cx="88" cy="39" r="5" fill="${accent}"/>
        <rect x="60" y="66" width="40" height="32" rx="6" fill="${accent}" fill-opacity="0.85"/>
      `;
      break;
    case 'butter':
      illustration = `
        <rect x="38" y="52" width="84" height="54" rx="8" fill="#ffffff" fill-opacity="0.94" stroke="${accent}" stroke-width="4"/>
        <path d="M38 68H122" stroke="${accent}" stroke-width="3"/>
        <rect x="52" y="76" width="56" height="18" rx="4" fill="${accent}" fill-opacity="0.85"/>
      `;
      break;
    case 'eggs':
      illustration = `
        <rect x="36" y="64" width="88" height="44" rx="10" fill="#ffffff" fill-opacity="0.94" stroke="${accent}" stroke-width="4"/>
        <ellipse cx="56" cy="56" rx="11" ry="15" fill="#ffffff" stroke="${accent}" stroke-width="4"/>
        <ellipse cx="80" cy="56" rx="11" ry="15" fill="#ffffff" stroke="${accent}" stroke-width="4"/>
        <ellipse cx="104" cy="56" rx="11" ry="15" fill="#ffffff" stroke="${accent}" stroke-width="4"/>
        <rect x="48" y="78" width="64" height="16" rx="4" fill="${accent}" fill-opacity="0.85"/>
      `;
      break;
    case 'roll':
      illustration = `
        <ellipse cx="80" cy="48" rx="32" ry="14" fill="#ffffff" stroke="${accent}" stroke-width="4"/>
        <path d="M48 48V102C48 110 62 116 80 116C98 116 112 110 112 102V48" fill="#ffffff" fill-opacity="0.92" stroke="${accent}" stroke-width="4"/>
        <ellipse cx="80" cy="48" rx="12" ry="5" fill="${accent}"/>
        <rect x="58" y="74" width="44" height="20" rx="4" fill="${accent}" fill-opacity="0.85"/>
      `;
      break;
    case 'wrap':
      illustration = `
        <rect x="68" y="20" width="24" height="108" rx="6" fill="${accent}"/>
        <rect x="54" y="34" width="52" height="80" rx="8" fill="#ffffff" fill-opacity="0.92" stroke="${accent}" stroke-width="4"/>
        <line x1="58" y1="54" x2="102" y2="54" stroke="${accent}" stroke-width="3"/>
        <line x1="58" y1="74" x2="102" y2="74" stroke="${accent}" stroke-width="3"/>
        <line x1="58" y1="94" x2="102" y2="94" stroke="${accent}" stroke-width="3"/>
      `;
      break;
    case 'gloves':
      illustration = `
        <rect x="40" y="44" width="80" height="68" rx="10" fill="#ffffff" fill-opacity="0.92" stroke="${accent}" stroke-width="4"/>
        <ellipse cx="80" cy="64" rx="22" ry="10" fill="${accent}" fill-opacity="0.25" stroke="${accent}" stroke-width="3"/>
        <rect x="52" y="84" width="56" height="16" rx="4" fill="${accent}" fill-opacity="0.85"/>
      `;
      break;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="320" height="320">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bgStart}"/>
        <stop offset="100%" stop-color="${bgEnd}"/>
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="24" fill="url(#g)"/>
    ${illustration}
    <text x="80" y="84" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="11" fill="#ffffff" letter-spacing="0.5">${label}</text>
    <rect x="20" y="130" width="120" height="20" rx="6" fill="#0f172a" fill-opacity="0.55"/>
    <text x="80" y="144" text-anchor="middle" font-family="monospace" font-weight="700" font-size="10" fill="#f8fafc">${sublabel}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const INITIAL_PRODUCTS: Product[] = [
  // Beverages (3 items)
  {
    id: 'bev-01',
    name: 'Sparkling Mineral Water (24x355mL)',
    category: 'Beverages',
    upc: '012000161155',
    unit: 'Case',
    image: createProductThumbnailSvg('SPARKLING', '24 x 355mL', '#0284c7', '#0369a1', '#0284c7', 'can'),
  },
  {
    id: 'bev-02',
    name: 'Cold Brew Espresso Concentrate (6x1L)',
    category: 'Beverages',
    upc: '021000658831',
    unit: 'Case',
    image: createProductThumbnailSvg('COLD BREW', '6 x 1 Liter', '#0f766e', '#115e59', '#0d9488', 'bottle'),
  },
  {
    id: 'bev-03',
    name: 'Organic Blood Orange Soda (12x12oz)',
    category: 'Beverages',
    upc: '038000138416',
    unit: 'Case',
    image: createProductThumbnailSvg('CITRUS', '12 x 12oz', '#ea580c', '#c2410c', '#ea580c', 'can'),
  },

  // Dry Goods (3 items)
  {
    id: 'dry-01',
    name: 'Artisan 00 Pizza & Bread Flour (50lb)',
    category: 'Dry Goods',
    upc: '041196910759',
    unit: 'Bag',
    image: createProductThumbnailSvg('00 FLOUR', '50 lb Sack', '#d97706', '#b45309', '#d97706', 'sack'),
  },
  {
    id: 'dry-02',
    name: 'Extra Virgin Cold-Pressed Olive Oil (3L)',
    category: 'Dry Goods',
    upc: '051000012517',
    unit: 'Each',
    image: createProductThumbnailSvg('EVOO TIN', '3 Liter Tin', '#65a30d', '#4d7c0f', '#65a30d', 'oil'),
  },
  {
    id: 'dry-03',
    name: 'Bronze-Die Rigatoni Pasta (20x1lb)',
    category: 'Dry Goods',
    upc: '076808280081',
    unit: 'Case',
    image: createProductThumbnailSvg('RIGATONI', '20 x 1 lb', '#ca8a04', '#a16207', '#ca8a04', 'pasta'),
  },

  // Cooler / Dairy (3 items)
  {
    id: 'col-01',
    name: 'Barista Edition Oat Milk (12x32oz)',
    category: 'Cooler / Dairy',
    upc: '085269008059',
    unit: 'Case',
    image: createProductThumbnailSvg('OAT MILK', '12 x 32oz', '#2563eb', '#1d4ed8', '#2563eb', 'carton'),
  },
  {
    id: 'col-02',
    name: 'Unsalted Sweet Cream Butter (36x1lb)',
    category: 'Cooler / Dairy',
    upc: '034500151368',
    unit: 'Case',
    image: createProductThumbnailSvg('AA BUTTER', '36 x 1 lb', '#0891b2', '#0e7490', '#0891b2', 'butter'),
  },
  {
    id: 'col-03',
    name: 'Pasture-Raised Large Eggs (15 Dozen)',
    category: 'Cooler / Dairy',
    upc: '019156522106',
    unit: 'Box',
    image: createProductThumbnailSvg('GRADE A', '15 Dozen', '#4f46e5', '#4338ca', '#4f46e5', 'eggs'),
  },

  // Supplies (3 items)
  {
    id: 'sup-01',
    name: 'Thermal POS Receipt Paper Rolls (50ct)',
    category: 'Supplies',
    upc: '071641046726',
    unit: 'Box',
    image: createProductThumbnailSvg('POS ROLLS', '50 x 80mm', '#475569', '#334155', '#475569', 'roll'),
  },
  {
    id: 'sup-02',
    name: 'Heavy-Duty 80G Stretch Wrap (4x1500ft)',
    category: 'Supplies',
    upc: '051131071858',
    unit: 'Case',
    image: createProductThumbnailSvg('STRETCH', '4 x 1500ft', '#64748b', '#475569', '#64748b', 'wrap'),
  },
  {
    id: 'sup-03',
    name: 'Powder-Free Nitrile Gloves Large (10x100)',
    category: 'Supplies',
    upc: '036000434491',
    unit: 'Case',
    image: createProductThumbnailSvg('NITRILE L', '10 x 100ct', '#059669', '#047857', '#059669', 'gloves'),
  },
];
