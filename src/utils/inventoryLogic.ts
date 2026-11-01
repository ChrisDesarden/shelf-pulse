import type { Product } from '../data/products';

export type QuantityMap = Record<string, number>;

export interface InventoryMetrics {
  productsCounted: number;
  totalUnits: number;
  categoryCounts: Record<string, number>;
}

/**
 * Computes live inventory totals and per-category active item counts (items with quantity > 0).
 */
export function computeInventoryMetrics(
  products: Product[],
  quantities: QuantityMap
): InventoryMetrics {
  let productsCounted = 0;
  let totalUnits = 0;
  const categoryCounts: Record<string, number> = {};

  for (const product of products) {
    if (!(product.category in categoryCounts)) {
      categoryCounts[product.category] = 0;
    }
    const qty = Math.max(0, Math.floor(Number(quantities[product.id]) || 0));
    if (qty > 0) {
      productsCounted += 1;
      totalUnits += qty;
      categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
    }
  }

  return {
    productsCounted,
    totalUnits,
    categoryCounts,
  };
}

/**
 * Extracts unique categories in order of appearance.
 */
export function getCategories(products: Product[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of products) {
    const cat = p.category.trim();
    if (cat && !seen.has(cat)) {
      seen.add(cat);
      result.push(cat);
    }
  }
  return result;
}

/**
 * Filters products by search query (matching Product Name or UPC) and selected category.
 */
export function filterProducts(
  products: Product[],
  searchQuery: string,
  selectedCategory: string
): Product[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return products.filter((product) => {
    const matchesCategory =
      selectedCategory === 'All' || product.category === selectedCategory;
    if (!matchesCategory) return false;

    if (!normalizedQuery) return true;

    const nameMatches = product.name.toLowerCase().includes(normalizedQuery);
    const upcMatches = product.upc.toLowerCase().includes(normalizedQuery);
    const categoryMatches = product.category.toLowerCase().includes(normalizedQuery);
    return nameMatches || upcMatches || categoryMatches;
  });
}

/**
 * Groups an array of products by their category, respecting orderedCategories when provided.
 */
export function groupProductsByCategory(
  products: Product[],
  orderedCategories?: string[]
): Array<{ category: string; items: Product[] }> {
  const groups = new Map<string, Product[]>();
  if (orderedCategories) {
    for (const cat of orderedCategories) {
      groups.set(cat, []);
    }
  }
  for (const product of products) {
    const list = groups.get(product.category) || [];
    list.push(product);
    groups.set(product.category, list);
  }
  return Array.from(groups.entries())
    .filter(([, items]) => items.length > 0)
    .map(([category, items]) => ({
      category,
      items,
    }));
}

/**
 * Returns only products that have a counted quantity >= 1.
 */
export function getCountedProducts(
  products: Product[],
  quantities: QuantityMap
): Array<{ product: Product; quantity: number }> {
  const result: Array<{ product: Product; quantity: number }> = [];
  for (const product of products) {
    const qty = Math.max(0, Math.floor(Number(quantities[product.id]) || 0));
    if (qty >= 1) {
      result.push({ product, quantity: qty });
    }
  }
  return result;
}

export interface SummaryFormatOptions {
  dateString: string;
  groupByCategory: boolean;
  includeUpc: boolean;
}

/**
 * Formats the counted inventory into the exact plain-text export string.
 * Strictly excludes any product with a quantity of 0.
 *
 * Default Plain Text Copy Format:
 * 📦 Inventory Count - [Today's Date]
 *
 * [Category Name]
 * - [Product Name]: [Quantity]
 * - [Product Name]: [Quantity]
 */
export function formatInventorySummaryText(
  products: Product[],
  quantities: QuantityMap,
  options: SummaryFormatOptions
): string {
  const counted = getCountedProducts(products, quantities);
  const header = `📦 Inventory Count - ${options.dateString}`;

  if (counted.length === 0) {
    return `${header}\n\nNo items counted.`;
  }

  const formatLine = (product: Product, quantity: number): string => {
    const upcPrefix = options.includeUpc ? `[${product.upc}] ` : '';
    return `- ${upcPrefix}${product.name}: ${quantity}`;
  };

  if (!options.groupByCategory) {
    const lines = counted.map(({ product, quantity }) => formatLine(product, quantity));
    return `${header}\n\n${lines.join('\n')}`;
  }

  const categoryMap = new Map<string, string[]>();
  for (const { product, quantity } of counted) {
    const lines = categoryMap.get(product.category) || [];
    lines.push(formatLine(product, quantity));
    categoryMap.set(product.category, lines);
  }

  const sections: string[] = [];
  for (const [category, lines] of categoryMap.entries()) {
    sections.push(`${category}\n${lines.join('\n')}`);
  }

  return `${header}\n\n${sections.join('\n\n')}`;
}

/**
 * Calculates the 12th UPC-A check digit for an 11-digit numeric string,
 * or normalizes any numeric input into a valid 12-digit UPC-A string.
 */
export function computeUpcCheckDigit(elevenDigits: string): string {
  const clean = elevenDigits.replace(/\D/g, '').padStart(11, '0').slice(0, 11);
  let oddSum = 0;
  let evenSum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = Number(clean[i]);
    if (i % 2 === 0) {
      oddSum += digit;
    } else {
      evenSum += digit;
    }
  }
  const total = oddSum * 3 + evenSum;
  const check = (10 - (total % 10)) % 10;
  return `${clean}${check}`;
}

/**
 * Checks whether a string is a valid 12-digit UPC-A code with matching modulo-10 check digit.
 */
export function isValidUpcA(upc: string): boolean {
  if (!/^\d{12}$/.test(upc)) return false;
  return computeUpcCheckDigit(upc.slice(0, 11)) === upc;
}

/**
 * Normalizes a scanned barcode string (UPC-A 12-digit, EAN-13 starting with 0, or 11-digit)
 * into a clean 12-digit numeric UPC string.
 */
export function normalizeScannedUpc(rawCode: string): string | null {
  const digits = String(rawCode || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 13 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (digits.length === 12) {
    return digits;
  }
  if (digits.length === 11) {
    return computeUpcCheckDigit(digits);
  }
  if (digits.length >= 6 && digits.length <= 14) {
    return digits.slice(0, 12).padStart(12, '0');
  }
  return null;
}

/**
 * Merges explicitly stored categories with any categories present on products,
 * preserving the explicit category order and appending any unseen product categories.
 */
export function mergeCategories(
  storedCategories: string[],
  products: Product[]
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of storedCategories) {
    const cat = raw.trim();
    if (cat && !seen.has(cat)) {
      seen.add(cat);
      result.push(cat);
    }
  }

  for (const p of products) {
    const cat = p.category.trim();
    if (cat && !seen.has(cat)) {
      seen.add(cat);
      result.push(cat);
    }
  }

  return result;
}

/**
 * Renames a category across both the category list and all products belonging to that category.
 */
export function renameCategoryInCatalog(
  categories: string[],
  products: Product[],
  oldName: string,
  newName: string
): { categories: string[]; products: Product[] } {
  const trimmedOld = oldName.trim();
  const trimmedNew = newName.trim();
  if (!trimmedOld || !trimmedNew || trimmedOld === trimmedNew) {
    return { categories, products };
  }

  const updatedCategories: string[] = [];
  const seen = new Set<string>();

  for (const cat of categories) {
    const nextCat = cat === trimmedOld ? trimmedNew : cat;
    if (!seen.has(nextCat)) {
      seen.add(nextCat);
      updatedCategories.push(nextCat);
    }
  }

  if (!seen.has(trimmedNew)) {
    updatedCategories.push(trimmedNew);
  }

  const updatedProducts = products.map((product) =>
    product.category === trimmedOld
      ? { ...product, category: trimmedNew }
      : product
  );

  return {
    categories: updatedCategories,
    products: updatedProducts,
  };
}

/**
 * Deletes a category from the list and reassigns any products in that category to a fallback category.
 */
export function deleteCategoryInCatalog(
  categories: string[],
  products: Product[],
  categoryToDelete: string,
  fallbackCategory = 'Uncategorized'
): { categories: string[]; products: Product[] } {
  const target = categoryToDelete.trim();
  const remainingCategories = categories.filter((c) => c !== target);
  const affectedCount = products.filter((p) => p.category === target).length;

  if (affectedCount === 0) {
    return {
      categories: remainingCategories,
      products,
    };
  }

  const targetFallback =
    remainingCategories[0] || fallbackCategory.trim() || 'Uncategorized';
  const finalCategories = remainingCategories.includes(targetFallback)
    ? remainingCategories
    : [...remainingCategories, targetFallback];

  const updatedProducts = products.map((p) =>
    p.category === target ? { ...p, category: targetFallback } : p
  );

  return {
    categories: finalCategories,
    products: updatedProducts,
  };
}

/**
 * Updates an existing product in the catalog by ID.
 */
export function updateProductInCatalog(
  products: Product[],
  updatedProduct: Product
): Product[] {
  return products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p));
}

/**
 * Formats counted inventory items (quantity >= 1) as a RFC-4180 compliant CSV string
 * for spreadsheet export on the web.
 */
export function formatInventoryCsv(
  products: Product[],
  quantities: QuantityMap,
  dateString: string
): string {
  const counted = getCountedProducts(products, quantities);
  const escapeCsv = (val: string | number): string => {
    const str = String(val ?? '');
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows: string[] = [
    ['Date', 'Category', 'Product Name', 'UPC', 'Unit', 'Quantity'].join(','),
  ];

  for (const { product, quantity } of counted) {
    rows.push(
      [
        escapeCsv(dateString),
        escapeCsv(product.category),
        escapeCsv(product.name),
        escapeCsv(product.upc),
        escapeCsv(product.unit || 'Each'),
        escapeCsv(quantity),
      ].join(',')
    );
  }

  return rows.join('\n');
}

/**
 * Complete single-file backup payload containing categories, products (with photo links & UPCs),
 * and daily quantities so teammates can share and import identical inventory setups.
 */
export interface CompleteInventoryBackup {
  appName: string;
  schemaVersion: number;
  exportedAt: string;
  categories: string[];
  products: Product[];
  quantities: QuantityMap;
}

export function serializeCompleteBackup(
  products: Product[],
  categories: string[],
  quantities: QuantityMap = {}
): string {
  const payload: CompleteInventoryBackup = {
    appName: 'Daily Inventory',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    categories: mergeCategories(categories, products),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      upc: p.upc,
      image: p.image || '',
      unit: p.unit || 'Each',
    })),
    quantities,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseCompleteBackup(jsonString: string): {
  products: Product[];
  categories: string[];
  quantities?: QuantityMap;
} {
  const parsed = JSON.parse(jsonString);
  const rawProducts = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.products)
    ? parsed.products
    : null;

  if (!rawProducts || rawProducts.length === 0) {
    throw new Error('Backup file must contain a non-empty list of products.');
  }

  const validatedProducts: Product[] = rawProducts.map(
    (item: Record<string, unknown>, idx: number) => {
      if (!item || typeof item.name !== 'string' || !item.name.trim()) {
        throw new Error(`Product at index ${idx} is missing a valid "name".`);
      }
      const rawUpc = String(item.upc || '').replace(/\D/g, '');
      const cleanUpc =
        rawUpc.length === 12
          ? rawUpc
          : computeUpcCheckDigit(rawUpc.padStart(11, '0'));
      return {
        id: String(item.id || `imp-${idx}-${Date.now()}`),
        name: item.name.trim(),
        category: String(item.category || 'General').trim(),
        upc: cleanUpc,
        image: String(item.image || ''),
        unit: item.unit ? String(item.unit).trim() : 'Each',
      };
    }
  );

  const rawCategories = Array.isArray(parsed?.categories)
    ? parsed.categories.map((c: unknown) => String(c).trim()).filter(Boolean)
    : [];

  const mergedCats = mergeCategories(rawCategories, validatedProducts);

  let validatedQuantities: QuantityMap | undefined;
  if (parsed?.quantities && typeof parsed.quantities === 'object' && !Array.isArray(parsed.quantities)) {
    validatedQuantities = {};
    for (const [k, v] of Object.entries(parsed.quantities as Record<string, unknown>)) {
      const n = Math.max(0, Math.floor(Number(v) || 0));
      if (n > 0) {
        validatedQuantities[k] = n;
      }
    }
  }

  return {
    products: validatedProducts,
    categories: mergedCats,
    quantities: validatedQuantities,
  };
}

/**
 * 1D UPC-A / EAN-13 bit tables for pure TypeScript scanline barcode decoding & encoding.
 * L-codes (left odd parity), G-codes (left even parity for EAN-13), R-codes (right).
 */
const UPC_L_CODES = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
];

const UPC_G_CODES = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
];

const UPC_R_CODES = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100',
];

const EAN13_PARITY_TABLE: Record<string, number> = {
  LLLLLL: 0,
  LLGLGG: 1,
  LLGGLG: 2,
  LLGGGL: 3,
  LGLLGG: 4,
  LGGLLG: 5,
  LGGGLL: 6,
  LGLGLG: 7,
  LGLGGL: 8,
  LGGLGL: 9,
};

/**
 * Encodes a 12-digit UPC-A string into its 95-module binary bar string ('1' = dark bar, '0' = light space),
 * surrounded by 9-module quiet zones. Useful for testing and verification.
 */
export function encodeUpcABits(upc: string): string {
  const normalized =
    upc.replace(/\D/g, '').length === 12
      ? upc.replace(/\D/g, '')
      : computeUpcCheckDigit(upc);
  let bits = '000000000101'; // Quiet zone + start guard
  for (let i = 0; i < 6; i++) {
    bits += UPC_L_CODES[Number(normalized[i])];
  }
  bits += '01010'; // Center guard
  for (let i = 6; i < 12; i++) {
    bits += UPC_R_CODES[Number(normalized[i])];
  }
  bits += '101000000000'; // End guard + quiet zone
  return bits;
}

function bitStringToRunLengths(bits: string): number[] {
  const runs: number[] = [];
  let current = bits[0];
  let count = 0;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === current) {
      count++;
    } else {
      runs.push(count);
      current = bits[i];
      count = 1;
    }
  }
  if (count > 0) runs.push(count);
  return runs;
}

const L_RUNS = UPC_L_CODES.map(bitStringToRunLengths);
const G_RUNS = UPC_G_CODES.map(bitStringToRunLengths);
const R_RUNS = UPC_R_CODES.map(bitStringToRunLengths);

function matchFourRunsToDigit(
  r0: number,
  r1: number,
  r2: number,
  r3: number,
  mode: 'left' | 'right'
): { digit: number; parity: 'L' | 'G' | 'R'; error: number } | null {
  const total = r0 + r1 + r2 + r3;
  if (total <= 0) return null;
  const n0 = (r0 / total) * 7;
  const n1 = (r1 / total) * 7;
  const n2 = (r2 / total) * 7;
  const n3 = (r3 / total) * 7;

  let bestDigit = -1;
  let bestParity: 'L' | 'G' | 'R' = mode === 'left' ? 'L' : 'R';
  let bestError = Infinity;

  if (mode === 'left') {
    for (let d = 0; d < 10; d++) {
      const pL = L_RUNS[d];
      const errL =
        Math.abs(n0 - pL[0]) +
        Math.abs(n1 - pL[1]) +
        Math.abs(n2 - pL[2]) +
        Math.abs(n3 - pL[3]);
      if (errL < bestError) {
        bestError = errL;
        bestDigit = d;
        bestParity = 'L';
      }

      const pG = G_RUNS[d];
      const errG =
        Math.abs(n0 - pG[0]) +
        Math.abs(n1 - pG[1]) +
        Math.abs(n2 - pG[2]) +
        Math.abs(n3 - pG[3]);
      if (errG < bestError) {
        bestError = errG;
        bestDigit = d;
        bestParity = 'G';
      }
    }
  } else {
    for (let d = 0; d < 10; d++) {
      const pR = R_RUNS[d];
      const errR =
        Math.abs(n0 - pR[0]) +
        Math.abs(n1 - pR[1]) +
        Math.abs(n2 - pR[2]) +
        Math.abs(n3 - pR[3]);
      if (errR < bestError) {
        bestError = errR;
        bestDigit = d;
        bestParity = 'R';
      }
    }
  }

  if (bestDigit === -1 || bestError > 2.2) return null;
  return { digit: bestDigit, parity: bestParity, error: bestError };
}

function tryDecodeRuns(
  runs: Array<{ bit: 0 | 1; len: number }>
): string | null {
  if (runs.length < 59) return null;

  for (let s = 0; s <= runs.length - 59; s++) {
    if (runs[s].bit !== 1) continue;

    // Start guard: 101 (runs[s], runs[s+1], runs[s+2])
    const gStart = (runs[s].len + runs[s + 1].len + runs[s + 2].len) / 3;
    if (gStart <= 0) continue;
    if (
      Math.abs(runs[s].len - gStart) > gStart * 0.85 ||
      Math.abs(runs[s + 1].len - gStart) > gStart * 0.85 ||
      Math.abs(runs[s + 2].len - gStart) > gStart * 0.85
    ) {
      continue;
    }

    // Center guard: 01010 at s + 27 .. s + 31
    const cIdx = s + 27;
    const gCenter =
      (runs[cIdx].len +
        runs[cIdx + 1].len +
        runs[cIdx + 2].len +
        runs[cIdx + 3].len +
        runs[cIdx + 4].len) /
      5;
    if (
      Math.abs(runs[cIdx + 1].len - gCenter) > gCenter * 0.9 ||
      Math.abs(runs[cIdx + 2].len - gCenter) > gCenter * 0.9 ||
      Math.abs(runs[cIdx + 3].len - gCenter) > gCenter * 0.9
    ) {
      continue;
    }

    let leftDigits = '';
    let paritySeq = '';
    let valid = true;

    for (let d = 0; d < 6; d++) {
      const idx = s + 3 + d * 4;
      const m = matchFourRunsToDigit(
        runs[idx].len,
        runs[idx + 1].len,
        runs[idx + 2].len,
        runs[idx + 3].len,
        'left'
      );
      if (!m) {
        valid = false;
        break;
      }
      leftDigits += String(m.digit);
      paritySeq += m.parity;
    }
    if (!valid) continue;

    let rightDigits = '';
    for (let d = 0; d < 6; d++) {
      const idx = s + 32 + d * 4;
      const m = matchFourRunsToDigit(
        runs[idx].len,
        runs[idx + 1].len,
        runs[idx + 2].len,
        runs[idx + 3].len,
        'right'
      );
      if (!m) {
        valid = false;
        break;
      }
      rightDigits += String(m.digit);
    }
    if (!valid) continue;

    const firstDigit = EAN13_PARITY_TABLE[paritySeq];
    if (firstDigit === undefined) continue;

    const twelveDigits = `${leftDigits}${rightDigits}`;
    if (firstDigit === 0) {
      if (isValidUpcA(twelveDigits)) {
        return twelveDigits;
      }
    } else {
      // Verify EAN-13 modulo-10 check digit
      const ean13 = `${firstDigit}${twelveDigits}`;
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += Number(ean13[i]) * (i % 2 === 0 ? 1 : 3);
      }
      const check = (10 - (sum % 10)) % 10;
      if (check === Number(ean13[12])) {
        return twelveDigits;
      }
    }
  }

  return null;
}

/**
 * Decodes a 12-digit UPC-A barcode from a 1D luminance array (0 = black, 255 = white).
 * Automatically handles both forward and upside-down barcode orientations.
 */
export function decodeUpcFromLuminanceRow(luminance: ArrayLike<number>): string | null {
  const len = luminance.length;
  if (len < 95) return null;

  let minLum = 255;
  let maxLum = 0;
  for (let i = 0; i < len; i++) {
    const v = luminance[i];
    if (v < minLum) minLum = v;
    if (v > maxLum) maxLum = v;
  }

  if (maxLum - minLum < 35) return null;
  const threshold = (minLum + maxLum) / 2;

  const extractRuns = (reverse: boolean): Array<{ bit: 0 | 1; len: number }> => {
    const runs: Array<{ bit: 0 | 1; len: number }> = [];
    let currentBit: 0 | 1 =
      (reverse ? luminance[len - 1] : luminance[0]) < threshold ? 1 : 0;
    let count = 0;

    for (let i = 0; i < len; i++) {
      const val = reverse ? luminance[len - 1 - i] : luminance[i];
      const bit: 0 | 1 = val < threshold ? 1 : 0;
      if (bit === currentBit) {
        count++;
      } else {
        runs.push({ bit: currentBit, len: count });
        currentBit = bit;
        count = 1;
      }
    }
    if (count > 0) {
      runs.push({ bit: currentBit, len: count });
    }
    return runs;
  };

  return tryDecodeRuns(extractRuns(false)) || tryDecodeRuns(extractRuns(true));
}
