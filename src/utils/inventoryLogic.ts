import type { Product } from '../data/products';
import {
  translateCategory,
  translateProductName,
  translateUnit,
  type Locale,
} from '../i18n/translations';

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
 * Filters products by search query (matching Product Name or UPC in English or Spanish) and selected category.
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

    const nameEn = product.name.toLowerCase();
    const nameEs = translateProductName(product.name, 'es').toLowerCase();
    const catEn = product.category.toLowerCase();
    const catEs = translateCategory(product.category, 'es').toLowerCase();
    const upcMatches = product.upc.toLowerCase().includes(normalizedQuery);

    if (
      nameEn.includes(normalizedQuery) ||
      nameEs.includes(normalizedQuery) ||
      catEn.includes(normalizedQuery) ||
      catEs.includes(normalizedQuery) ||
      upcMatches
    ) {
      return true;
    }

    // Also match across canonical 8-digit UPC-E and expanded 12-digit UPC-A equivalents
    const canonicalE = toCanonicalUpcE8(product.upc);
    if (canonicalE) {
      if (canonicalE.includes(normalizedQuery)) return true;
      const expandedA = expandUpcEToUpcA12(canonicalE);
      if (expandedA && expandedA.includes(normalizedQuery)) return true;
    }
    return false;
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

export interface CategoryNavigationResult {
  categoryProducts: Product[];
  currentIndex: number;
  totalInCategory: number;
  prevProduct: Product | null;
  nextProduct: Product | null;
}

/**
 * Returns the list of products in the same category as currentProduct,
 * along with the previous and next product in that category (wrapping around when > 1 item).
 */
export function getCategoryNavigation(
  products: Product[],
  currentProduct: Product | null
): CategoryNavigationResult {
  if (!currentProduct) {
    return {
      categoryProducts: [],
      currentIndex: -1,
      totalInCategory: 0,
      prevProduct: null,
      nextProduct: null,
    };
  }

  const categoryProducts = products.filter(
    (p) => p.category === currentProduct.category
  );
  const totalInCategory = categoryProducts.length;
  const currentIndex = categoryProducts.findIndex(
    (p) => p.id === currentProduct.id
  );

  if (currentIndex === -1 || totalInCategory <= 1) {
    return {
      categoryProducts,
      currentIndex,
      totalInCategory,
      prevProduct: null,
      nextProduct: null,
    };
  }

  const prevIndex = (currentIndex - 1 + totalInCategory) % totalInCategory;
  const nextIndex = (currentIndex + 1) % totalInCategory;

  return {
    categoryProducts,
    currentIndex,
    totalInCategory,
    prevProduct: categoryProducts[prevIndex],
    nextProduct: categoryProducts[nextIndex],
  };
}

export interface SummaryFormatOptions {
  dateString: string;
  groupByCategory: boolean;
  includeUpc: boolean;
  locale?: Locale;
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
  const locale: Locale = options.locale || 'en';
  const counted = getCountedProducts(products, quantities);
  const header =
    locale === 'es'
      ? `📦 Conteo de Inventario - ${options.dateString}`
      : `📦 Inventory Count - ${options.dateString}`;

  if (counted.length === 0) {
    return locale === 'es'
      ? `${header}\n\nSin artículos contados.`
      : `${header}\n\nNo items counted.`;
  }

  const formatLine = (product: Product, quantity: number): string => {
    const upcPrefix = options.includeUpc ? `[${product.upc}] ` : '';
    const displayName = translateProductName(product.name, locale);
    return `- ${upcPrefix}${displayName}: ${quantity}`;
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
    const displayCategory = translateCategory(category, locale);
    sections.push(`${displayCategory}\n${lines.join('\n')}`);
  }

  return `${header}\n\n${sections.join('\n\n')}`;
}

/**
 * Calculates the 12th UPC-A check digit for an 11-digit numeric string,
 * or normalizes an 11-digit prefix into a valid 12-digit UPC-A string.
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
 * Calculates the 8th EAN-8 check digit for a 7-digit numeric string.
 */
export function computeEan8CheckDigit(sevenDigits: string): string {
  const clean = sevenDigits.replace(/\D/g, '').padStart(7, '0').slice(0, 7);
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const digit = Number(clean[i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  const check = (10 - (sum % 10)) % 10;
  return `${clean}${check}`;
}

/**
 * Checks whether a string is a valid 8-digit EAN-8 barcode with matching modulo-10 check digit.
 */
export function isValidEan8(upc: string): boolean {
  if (!/^\d{8}$/.test(upc)) return false;
  return computeEan8CheckDigit(upc.slice(0, 7)) === upc;
}

/**
 * Expands a 6-digit UPC-E payload (number system 0) into its equivalent 11-digit UPC-A prefix.
 */
export function expandUpcEToUpcA11(sixDigits: string): string {
  const d = sixDigits.replace(/\D/g, '').padStart(6, '0').slice(0, 6);
  const last = d[5];
  if (last === '0' || last === '1' || last === '2') {
    return `0${d.slice(0, 2)}${last}0000${d.slice(2, 5)}`;
  }
  if (last === '3') {
    return `0${d.slice(0, 3)}00000${d.slice(3, 5)}`;
  }
  if (last === '4') {
    return `0${d.slice(0, 4)}00000${d[4]}`;
  }
  return `0${d.slice(0, 5)}0000${last}`;
}

/**
 * Builds a valid 8-digit UPC-E barcode string ('0' + 6 digits + check digit) from a 6-digit payload.
 */
export function computeUpcE8(sixDigits: string): string {
  const clean6 = sixDigits.replace(/\D/g, '').padStart(6, '0').slice(0, 6);
  const upcA12 = computeUpcCheckDigit(expandUpcEToUpcA11(clean6));
  const checkDigit = upcA12[11];
  return `0${clean6}${checkDigit}`;
}

/**
 * Converts a 6-digit ('499770'), 7-digit ('0499770' or '4997704'), or 8-digit ('04997704')
 * UPC-E input into its canonical 8-digit GS1 UPC-E string ('04997704').
 * Returns null if the input is not a UPC-E code.
 */
export function toCanonicalUpcE8(upc: string): string | null {
  const clean = (upc || '').trim();
  if (!/^\d+$/.test(clean)) return null;

  // 8-digit starting with '0': valid UPC-E (or 0-prefixed 8-digit that isn't EAN-8)
  if (/^0\d{7}$/.test(clean)) {
    const expected = computeUpcE8(clean.slice(1, 7));
    if (expected === clean) return clean;
    if (!isValidEan8(clean)) return expected;
    return null;
  }

  // 6-digit middle payload (e.g. '499770' -> '04997704')
  if (/^\d{6}$/.test(clean)) {
    return computeUpcE8(clean);
  }

  // 7-digit starting with '0' (left '0' + 6 middle digits, missing right check digit, e.g. '0499770' -> '04997704')
  if (/^0\d{6}$/.test(clean)) {
    return computeUpcE8(clean.slice(1, 7));
  }

  // 7-digit with 6 middle digits + valid right check digit, missing left '0' (e.g. '4997704' -> '04997704')
  if (/^\d{7}$/.test(clean)) {
    const candidate = computeUpcE8(clean.slice(0, 6));
    if (candidate === `0${clean}`) {
      return candidate;
    }
  }

  return null;
}

/**
 * Expands any valid 6-, 7-, or 8-digit UPC-E code into its full 12-digit UPC-A equivalent.
 */
export function expandUpcEToUpcA12(upcE: string): string | null {
  const canonical8 = toCanonicalUpcE8(upcE);
  if (!canonical8) return null;
  return computeUpcCheckDigit(expandUpcEToUpcA11(canonical8.slice(1, 7)));
}

/**
 * Compresses a 12-digit UPC-A code (starting with '0') into its 8-digit UPC-E equivalent
 * if the manufacturer/item number is zero-suppressible per GS1 rules.
 */
export function compressUpcAToUpcE8(upcA: string): string | null {
  const clean = (upcA || '').trim();
  if (!isValidUpcA(clean) || !clean.startsWith('0')) return null;

  let payload6: string | null = null;
  const d1 = clean[1];
  const d2 = clean[2];
  const d3 = clean[3];
  const d4 = clean[4];
  const d5 = clean[5];
  const d6 = clean[6];
  const d7 = clean[7];
  const d8 = clean[8];
  const d9 = clean[9];
  const d10 = clean[10];

  if ((d3 === '0' || d3 === '1' || d3 === '2') && d4 === '0' && d5 === '0' && d6 === '0' && d7 === '0') {
    payload6 = `${d1}${d2}${d8}${d9}${d10}${d3}`;
  } else if (d4 === '0' && d5 === '0' && d6 === '0' && d7 === '0' && d8 === '0') {
    payload6 = `${d1}${d2}${d3}${d9}${d10}3`;
  } else if (d5 === '0' && d6 === '0' && d7 === '0' && d8 === '0' && d9 === '0') {
    payload6 = `${d1}${d2}${d3}${d4}${d10}4`;
  } else if (
    d5 !== '0' &&
    d6 === '0' &&
    d7 === '0' &&
    d8 === '0' &&
    d9 === '0' &&
    Number(d10) >= 5 &&
    Number(d10) <= 9
  ) {
    payload6 = `${d1}${d2}${d3}${d4}${d5}${d10}`;
  }

  if (!payload6) return null;
  const candidateE8 = computeUpcE8(payload6);
  const roundTripA12 = computeUpcCheckDigit(expandUpcEToUpcA11(payload6));
  return roundTripA12 === clean ? candidateE8 : null;
}

/**
 * Checks whether a string is a valid 6-digit, 7-digit, or 8-digit UPC-E code.
 */
export function isValidUpcE(upc: string): boolean {
  const clean = (upc || '').trim();
  if (/^\d{6}$/.test(clean)) return true;
  if (/^0\d{7}$/.test(clean)) {
    return computeUpcE8(clean.slice(1, 7)) === clean;
  }
  if (/^\d{7}$/.test(clean)) {
    return toCanonicalUpcE8(clean) !== null;
  }
  return false;
}

/**
 * Returns a human-readable label describing the barcode format for any short or standard UPC.
 */
export function getBarcodeFormatLabel(upc: string): string {
  const clean = (upc || '').trim();
  if (!clean) return 'Barcode';
  if (isValidUpcA(clean)) return 'UPC-A (12-Digit)';
  if (/^0\d{7}$/.test(clean) && isValidUpcE(clean)) return 'UPC-E (8-Digit)';
  if (isValidEan8(clean)) return 'EAN-8 (8-Digit)';
  if (/^0\d{7}$/.test(clean) && toCanonicalUpcE8(clean)) return 'UPC-E (8-Digit)';
  if (/^\d{6}$/.test(clean)) return 'UPC-E / Short (6-Digit)';
  if (/^\d{7}$/.test(clean) && toCanonicalUpcE8(clean)) return 'UPC-E (7-Digit -> 8-Digit)';
  if (/^\d{13}$/.test(clean)) return 'EAN-13 (13-Digit)';
  if (/^\d+$/.test(clean)) return `Short UPC (${clean.length}-Digit)`;
  return `Code 128 (${clean.length}-Char)`;
}

/**
 * Normalizes a scanned or entered barcode string while preserving smaller UPCs
 * (such as 4-digit PLU, 6-digit or 8-digit UPC-E, 8-digit EAN-8, 10-digit SKU, 12-digit UPC-A, or 13-digit EAN-13)
 * and automatically completing 7-digit partial UPC-E entries (e.g. '0499770' or '4997704' -> '04997704').
 */
export function normalizeScannedUpc(rawCode: string): string | null {
  const trimmed = String(rawCode || '').trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length > 0) {
    // Camera scanners often report 12-digit UPC-A codes as 13-digit EAN-13 with a leading '0'
    if (digits.length === 13 && digits.startsWith('0') && isValidUpcA(digits.slice(1))) {
      return digits.slice(1);
    }
    // 11-digit UPC-A prefix missing its modulo-10 check digit
    if (digits.length === 11) {
      return computeUpcCheckDigit(digits);
    }
    // 7-digit UPC-E missing either its right check digit ('0499770') or its left '0' ('4997704')
    if (digits.length === 7) {
      const canonicalUpcE = toCanonicalUpcE8(digits);
      if (canonicalUpcE) {
        return canonicalUpcE;
      }
    }
    // Preserve any valid numeric barcode length from 1 to 14 digits (short PLU, 6-digit, 8-digit UPC-E/EAN-8, 12-digit UPC-A, etc.)
    if (digits.length >= 1 && digits.length <= 14) {
      return digits;
    }
    return digits.slice(0, 14);
  }

  // Fallback for alphanumeric Code128 / Code39 barcodes
  const cleanAlpha = trimmed.replace(/[^A-Za-z0-9-_]/g, '').slice(0, 20);
  return cleanAlpha || null;
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
  dateString: string,
  locale: Locale = 'en'
): string {
  const counted = getCountedProducts(products, quantities);
  const escapeCsv = (val: string | number): string => {
    const str = String(val ?? '');
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerCols =
    locale === 'es'
      ? ['Fecha', 'Categoría', 'Nombre del Producto', 'UPC', 'Unidad', 'Cantidad']
      : ['Date', 'Category', 'Product Name', 'UPC', 'Unit', 'Quantity'];

  const rows: string[] = [headerCols.join(',')];

  for (const { product, quantity } of counted) {
    rows.push(
      [
        escapeCsv(dateString),
        escapeCsv(translateCategory(product.category, locale)),
        escapeCsv(translateProductName(product.name, locale)),
        escapeCsv(product.upc),
        escapeCsv(translateUnit(product.unit || 'Each', locale)),
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
      const rawUpcStr = String(item.upc || '').trim();
      const cleanUpc =
        normalizeScannedUpc(rawUpcStr) ||
        computeUpcCheckDigit(String(idx + 1).padStart(11, '0'));
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
 * 1D UPC-A / UPC-E / EAN-8 / EAN-13 bit tables for pure TypeScript scanline barcode decoding & encoding.
 * L-codes (left odd parity), G-codes (left even parity), R-codes (right).
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

const UPCE_PARITY_BY_CHECK_DIGIT: string[] = [
  'GGGLLL',
  'GGLGLL',
  'GGLLGL',
  'GGLLLG',
  'GLGGLL',
  'GLLGGL',
  'GLLLGG',
  'GLGLGL',
  'GLGLLG',
  'GLLGLG',
];

const UPCE_PARITY_LOOKUP: Record<string, number> = {
  GGGLLL: 0,
  GGLGLL: 1,
  GGLLGL: 2,
  GGLLLG: 3,
  GLGGLL: 4,
  GLLGGL: 5,
  GLLLGG: 6,
  GLGLGL: 7,
  GLGLLG: 8,
  GLLGLG: 9,
};

/**
 * Encodes a 12-digit UPC-A string into its 95-module binary bar string ('1' = dark bar, '0' = light space),
 * surrounded by 9-module quiet zones.
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

/**
 * Encodes an 8-digit EAN-8 string into its 67-module binary bar string surrounded by 9-module quiet zones.
 */
export function encodeEan8Bits(ean8: string): string {
  const digits = ean8.replace(/\D/g, '');
  const normalized =
    digits.length === 8 && isValidEan8(digits)
      ? digits
      : computeEan8CheckDigit(digits);
  let bits = '000000000101'; // Quiet zone + start guard
  for (let i = 0; i < 4; i++) {
    bits += UPC_L_CODES[Number(normalized[i])];
  }
  bits += '01010'; // Center guard
  for (let i = 4; i < 8; i++) {
    bits += UPC_R_CODES[Number(normalized[i])];
  }
  bits += '101000000000'; // End guard + quiet zone
  return bits;
}

/**
 * Encodes a 6-digit, 7-digit, or 8-digit UPC-E barcode into its 51-module binary bar string surrounded by quiet zones.
 */
export function encodeUpcEBits(upcE: string): string {
  const canonical8 = toCanonicalUpcE8(upcE) || computeUpcE8(upcE.replace(/\D/g, '').slice(0, 6));
  const payload6 = canonical8.slice(1, 7);
  const checkDigit = Number(canonical8[7]);
  const parityPattern = UPCE_PARITY_BY_CHECK_DIGIT[checkDigit];

  let bits = '000000000101'; // Quiet zone + start guard (101)
  for (let i = 0; i < 6; i++) {
    const d = Number(payload6[i]);
    bits += parityPattern[i] === 'G' ? UPC_G_CODES[d] : UPC_L_CODES[d];
  }
  bits += '010101000000000'; // 6-module UPC-E end guard (010101) + quiet zone
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
  mode: 'left' | 'right',
  expectedModuleWidth?: number
): { digit: number; parity: 'L' | 'G' | 'R'; error: number } | null {
  const total = r0 + r1 + r2 + r3;
  if (total <= 0) return null;
  if (expectedModuleWidth && expectedModuleWidth > 0) {
    const digitMod = total / 7;
    if (Math.abs(digitMod - expectedModuleWidth) > expectedModuleWidth * 0.65) {
      return null;
    }
  }
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

  if (bestDigit === -1 || bestError > 2.05) return null;
  return { digit: bestDigit, parity: bestParity, error: bestError };
}

function hasQuietZones(
  runs: Array<{ bit: 0 | 1; len: number }>,
  startIndex: number,
  endIndexInclusive: number,
  moduleWidth: number
): boolean {
  const minQuiet = moduleWidth * 2.2;
  if (startIndex > 0) {
    const prev = runs[startIndex - 1];
    if (prev.bit !== 0 || prev.len < minQuiet) return false;
  }
  if (endIndexInclusive < runs.length - 1) {
    const next = runs[endIndexInclusive + 1];
    if (next.bit !== 0 || next.len < minQuiet) return false;
  }
  return true;
}

function tryDecodeUpcAOrEan13(
  runs: Array<{ bit: 0 | 1; len: number }>
): string | null {
  if (runs.length < 59) return null;

  for (let s = 0; s <= runs.length - 59; s++) {
    if (runs[s].bit !== 1) continue;

    const gStart = (runs[s].len + runs[s + 1].len + runs[s + 2].len) / 3;
    if (gStart <= 0) continue;
    if (
      Math.abs(runs[s].len - gStart) > gStart * 0.85 ||
      Math.abs(runs[s + 1].len - gStart) > gStart * 0.85 ||
      Math.abs(runs[s + 2].len - gStart) > gStart * 0.85
    ) {
      continue;
    }

    if (!hasQuietZones(runs, s, s + 58, gStart)) continue;

    const cIdx = s + 27;
    const gCenter =
      (runs[cIdx].len +
        runs[cIdx + 1].len +
        runs[cIdx + 2].len +
        runs[cIdx + 3].len +
        runs[cIdx + 4].len) /
      5;
    if (
      Math.abs(gCenter - gStart) > gStart * 0.65 ||
      Math.abs(runs[cIdx + 1].len - gCenter) > gCenter * 0.9 ||
      Math.abs(runs[cIdx + 2].len - gCenter) > gCenter * 0.9 ||
      Math.abs(runs[cIdx + 3].len - gCenter) > gCenter * 0.9
    ) {
      continue;
    }

    const eIdx = s + 56;
    const gEnd = (runs[eIdx].len + runs[eIdx + 1].len + runs[eIdx + 2].len) / 3;
    if (Math.abs(gEnd - gStart) > gStart * 0.65) continue;

    const avgMod = (gStart + gCenter + gEnd) / 3;
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
        'left',
        avgMod
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
        'right',
        avgMod
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
      const ean13 = `${firstDigit}${twelveDigits}`;
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += Number(ean13[i]) * (i % 2 === 0 ? 1 : 3);
      }
      const check = (10 - (sum % 10)) % 10;
      if (check === Number(ean13[12])) {
        return ean13;
      }
    }
  }
  return null;
}

function tryDecodeEan8(
  runs: Array<{ bit: 0 | 1; len: number }>
): string | null {
  if (runs.length < 43) return null;

  for (let s = 0; s <= runs.length - 43; s++) {
    if (runs[s].bit !== 1) continue;

    const gStart = (runs[s].len + runs[s + 1].len + runs[s + 2].len) / 3;
    if (gStart <= 0) continue;
    if (
      Math.abs(runs[s].len - gStart) > gStart * 0.85 ||
      Math.abs(runs[s + 1].len - gStart) > gStart * 0.85 ||
      Math.abs(runs[s + 2].len - gStart) > gStart * 0.85
    ) {
      continue;
    }

    if (!hasQuietZones(runs, s, s + 42, gStart)) continue;

    const cIdx = s + 19;
    const gCenter =
      (runs[cIdx].len +
        runs[cIdx + 1].len +
        runs[cIdx + 2].len +
        runs[cIdx + 3].len +
        runs[cIdx + 4].len) /
      5;
    if (
      Math.abs(gCenter - gStart) > gStart * 0.65 ||
      Math.abs(runs[cIdx + 1].len - gCenter) > gCenter * 0.9 ||
      Math.abs(runs[cIdx + 2].len - gCenter) > gCenter * 0.9 ||
      Math.abs(runs[cIdx + 3].len - gCenter) > gCenter * 0.9
    ) {
      continue;
    }

    const eIdx = s + 40;
    const gEnd = (runs[eIdx].len + runs[eIdx + 1].len + runs[eIdx + 2].len) / 3;
    if (Math.abs(gEnd - gStart) > gStart * 0.65) continue;

    const avgMod = (gStart + gCenter + gEnd) / 3;
    let leftDigits = '';
    let valid = true;
    for (let d = 0; d < 4; d++) {
      const idx = s + 3 + d * 4;
      const m = matchFourRunsToDigit(
        runs[idx].len,
        runs[idx + 1].len,
        runs[idx + 2].len,
        runs[idx + 3].len,
        'left',
        avgMod
      );
      if (!m || m.parity !== 'L') {
        valid = false;
        break;
      }
      leftDigits += String(m.digit);
    }
    if (!valid) continue;

    let rightDigits = '';
    for (let d = 0; d < 4; d++) {
      const idx = s + 24 + d * 4;
      const m = matchFourRunsToDigit(
        runs[idx].len,
        runs[idx + 1].len,
        runs[idx + 2].len,
        runs[idx + 3].len,
        'right',
        avgMod
      );
      if (!m) {
        valid = false;
        break;
      }
      rightDigits += String(m.digit);
    }
    if (!valid) continue;

    const eightDigits = `${leftDigits}${rightDigits}`;
    if (isValidEan8(eightDigits)) {
      return eightDigits;
    }
  }
  return null;
}

function tryDecodeUpcE(
  runs: Array<{ bit: 0 | 1; len: number }>
): string | null {
  if (runs.length < 33) return null;

  for (let s = 0; s <= runs.length - 33; s++) {
    if (runs[s].bit !== 1) continue;

    const gStart = (runs[s].len + runs[s + 1].len + runs[s + 2].len) / 3;
    if (gStart <= 0) continue;
    if (
      Math.abs(runs[s].len - gStart) > gStart * 0.85 ||
      Math.abs(runs[s + 1].len - gStart) > gStart * 0.85 ||
      Math.abs(runs[s + 2].len - gStart) > gStart * 0.85
    ) {
      continue;
    }

    if (!hasQuietZones(runs, s, s + 32, gStart)) continue;

    // End guard 010101 at s + 27 .. s + 32
    const eIdx = s + 27;
    const gEnd =
      (runs[eIdx].len +
        runs[eIdx + 1].len +
        runs[eIdx + 2].len +
        runs[eIdx + 3].len +
        runs[eIdx + 4].len +
        runs[eIdx + 5].len) /
      6;
    if (
      Math.abs(gEnd - gStart) > gStart * 0.65 ||
      Math.abs(runs[eIdx].len - gEnd) > gEnd * 0.9 ||
      Math.abs(runs[eIdx + 1].len - gEnd) > gEnd * 0.9 ||
      Math.abs(runs[eIdx + 2].len - gEnd) > gEnd * 0.9 ||
      Math.abs(runs[eIdx + 3].len - gEnd) > gEnd * 0.9 ||
      Math.abs(runs[eIdx + 4].len - gEnd) > gEnd * 0.9 ||
      Math.abs(runs[eIdx + 5].len - gEnd) > gEnd * 0.9
    ) {
      continue;
    }

    const avgMod = (gStart + gEnd) / 2;
    let payload6 = '';
    let paritySeq = '';
    let valid = true;
    let totalError = 0;
    for (let d = 0; d < 6; d++) {
      const idx = s + 3 + d * 4;
      const m = matchFourRunsToDigit(
        runs[idx].len,
        runs[idx + 1].len,
        runs[idx + 2].len,
        runs[idx + 3].len,
        'left',
        avgMod
      );
      if (!m) {
        valid = false;
        break;
      }
      payload6 += String(m.digit);
      paritySeq += m.parity;
      totalError += m.error;
    }
    if (!valid || totalError / 6 > 1.35) continue;

    const checkDigit = UPCE_PARITY_LOOKUP[paritySeq];
    if (checkDigit === undefined) continue;

    const candidateUpcE8 = `0${payload6}${checkDigit}`;
    if (isValidUpcE(candidateUpcE8)) {
      return candidateUpcE8;
    }
  }
  return null;
}

function tryDecodeAllFormatsFromRuns(
  forwardRuns: Array<{ bit: 0 | 1; len: number }>,
  reverseRuns: Array<{ bit: 0 | 1; len: number }>
): string | null {
  return (
    tryDecodeUpcAOrEan13(forwardRuns) ||
    tryDecodeUpcAOrEan13(reverseRuns) ||
    tryDecodeEan8(forwardRuns) ||
    tryDecodeEan8(reverseRuns) ||
    tryDecodeUpcE(forwardRuns) ||
    tryDecodeUpcE(reverseRuns)
  );
}

/**
 * Decodes a 1D barcode (12-digit UPC-A, 13-digit EAN-13, 8-digit EAN-8, or 8-digit UPC-E)
 * from a 1D luminance array (0 = black, 255 = white).
 * Uses both global midpoint thresholding and local adaptive moving-window thresholding
 * to handle plastic glare, shadows, and uneven illumination, in both forward and upside-down orientations.
 */
export function decodeUpcFromLuminanceRow(luminance: ArrayLike<number>): string | null {
  const len = luminance.length;
  if (len < 51) return null;

  let minLum = 255;
  let maxLum = 0;
  for (let i = 0; i < len; i++) {
    const v = luminance[i];
    if (v < minLum) minLum = v;
    if (v > maxLum) maxLum = v;
  }

  const dynamicRange = maxLum - minLum;
  if (dynamicRange < 28) return null;

  const extractRunsWithFixedThreshold = (
    thresh: number,
    reverse: boolean
  ): Array<{ bit: 0 | 1; len: number }> => {
    const runs: Array<{ bit: 0 | 1; len: number }> = [];
    let currentBit: 0 | 1 =
      (reverse ? luminance[len - 1] : luminance[0]) < thresh ? 1 : 0;
    let count = 0;

    for (let i = 0; i < len; i++) {
      const val = reverse ? luminance[len - 1 - i] : luminance[i];
      const bit: 0 | 1 = val < thresh ? 1 : 0;
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

  // 1. Standard midpoint threshold
  const midThreshold = (minLum + maxLum) / 2;
  const midResult = tryDecodeAllFormatsFromRuns(
    extractRunsWithFixedThreshold(midThreshold, false),
    extractRunsWithFixedThreshold(midThreshold, true)
  );
  if (midResult) return midResult;

  // 2. Local adaptive moving-window thresholding (defeats plastic glare, shadows, and uneven lighting)
  const prefix = new Float64Array(len + 1);
  for (let i = 0; i < len; i++) {
    prefix[i + 1] = prefix[i] + luminance[i];
  }

  for (const radiusDivisor of [26, 46]) {
    const radius = Math.max(6, Math.floor(len / radiusDivisor));
    const bits = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      const left = Math.max(0, i - radius);
      const right = Math.min(len - 1, i + radius);
      const localMean = (prefix[right + 1] - prefix[left]) / (right - left + 1);
      bits[i] = luminance[i] < localMean - 1.5 ? 1 : 0;
    }

    const buildRunsFromBits = (reverse: boolean): Array<{ bit: 0 | 1; len: number }> => {
      const runs: Array<{ bit: 0 | 1; len: number }> = [];
      let currentBit: 0 | 1 = (reverse ? bits[len - 1] : bits[0]) as 0 | 1;
      let count = 0;
      for (let i = 0; i < len; i++) {
        const b = (reverse ? bits[len - 1 - i] : bits[i]) as 0 | 1;
        if (b === currentBit) {
          count++;
        } else {
          runs.push({ bit: currentBit, len: count });
          currentBit = b;
          count = 1;
        }
      }
      if (count > 0) runs.push({ bit: currentBit, len: count });
      return runs;
    };

    const adaptiveResult = tryDecodeAllFormatsFromRuns(
      buildRunsFromBits(false),
      buildRunsFromBits(true)
    );
    if (adaptiveResult) return adaptiveResult;
  }

  // 3. Multi-level global thresholds for heavy ink spread or bright specular highlights
  for (const frac of [0.42, 0.58]) {
    const thresh = minLum + dynamicRange * frac;
    const res = tryDecodeAllFormatsFromRuns(
      extractRunsWithFixedThreshold(thresh, false),
      extractRunsWithFixedThreshold(thresh, true)
    );
    if (res) return res;
  }

  return null;
}

/**
 * Decodes a 1D barcode from an RGBA pixel buffer (width x height) by sampling horizontal
 * and slightly tilted scanlines (handling ±6° camera rotation and blue/colored ink)
 * and returning the barcode with multi-scanline consensus.
 */
export function decodeBarcodeFromRgbaImage(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): string | null {
  if (width < 51 || height < 4) return null;

  const yRatios = [
    0.5, 0.45, 0.55, 0.4, 0.6, 0.35, 0.65, 0.3, 0.7, 0.25, 0.75, 0.32, 0.38, 0.42, 0.48,
  ];
  const slopes = [0, 0.05, -0.05, 0.09, -0.09];
  const rowLuminance = new Uint8Array(width);
  const votes = new Map<string, number>();

  for (const slope of slopes) {
    const dyTotal = slope * width;
    for (const ratio of yRatios) {
      const centerY = height * ratio;
      // Red/Green weighted luma so dark-blue ink barcodes have maximum contrast against white labels
      for (let x = 0; x < width; x++) {
        const y = Math.max(
          0,
          Math.min(height - 1, Math.round(centerY + ((x - width / 2) / width) * dyTotal))
        );
        const idx = (y * width + x) * 4;
        rowLuminance[x] = Math.round(
          0.42 * rgba[idx] + 0.46 * rgba[idx + 1] + 0.12 * rgba[idx + 2]
        );
      }

      const decoded = decodeUpcFromLuminanceRow(rowLuminance);
      if (decoded) {
        const nextCount = (votes.get(decoded) || 0) + 1;
        votes.set(decoded, nextCount);
        if (nextCount >= 3) {
          return decoded;
        }
      }
    }
  }

  let bestCode: string | null = null;
  let bestVotes = 0;
  for (const [code, count] of votes.entries()) {
    if (count > bestVotes) {
      bestVotes = count;
      bestCode = code;
    }
  }
  return bestCode;
}

