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
 * IfnewName already exists (case-insensitive match to another category), merges them cleanly.
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


