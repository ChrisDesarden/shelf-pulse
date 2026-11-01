import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_PRODUCTS } from '../data/products';
import {
  computeInventoryMetrics,
  filterProducts,
  formatInventorySummaryText,
  getCategories,
  getCountedProducts,
  computeUpcCheckDigit,
  isValidUpcA,
  mergeCategories,
  renameCategoryInCatalog,
  deleteCategoryInCatalog,
  updateProductInCatalog,
  formatInventoryCsv,
  serializeCompleteBackup,
  parseCompleteBackup,
  normalizeScannedUpc,
  encodeUpcABits,
  decodeUpcFromLuminanceRow,
} from './inventoryLogic';

test('INITIAL_PRODUCTS has 12 realistic items across 4 categories with valid 12-digit UPCs', () => {
  assert.equal(INITIAL_PRODUCTS.length, 12);
  const categories = getCategories(INITIAL_PRODUCTS);
  assert.deepEqual(categories, ['Beverages', 'Dry Goods', 'Cooler / Dairy', 'Supplies']);
  for (const product of INITIAL_PRODUCTS) {
    assert.match(product.upc, /^\d{12}$/);
    assert.equal(isValidUpcA(product.upc), true, `Expected valid UPC-A for ${product.name} (${product.upc})`);
  }
});

test('computeInventoryMetrics accurately counts active products, total units, and category badges', () => {
  const quantities = {
    'bev-01': 5,
    'bev-02': 3,
    'dry-01': 0,
    'col-01': 12,
  };
  const metrics = computeInventoryMetrics(INITIAL_PRODUCTS, quantities);
  assert.equal(metrics.productsCounted, 3);
  assert.equal(metrics.totalUnits, 20);
  assert.equal(metrics.categoryCounts['Beverages'], 2);
  assert.equal(metrics.categoryCounts['Dry Goods'], 0);
  assert.equal(metrics.categoryCounts['Cooler / Dairy'], 1);
  assert.equal(metrics.categoryCounts['Supplies'], 0);
});

test('filterProducts filters by product name, UPC, and category', () => {
  const byName = filterProducts(INITIAL_PRODUCTS, 'oat milk', 'All');
  assert.equal(byName.length, 1);
  assert.equal(byName[0].id, 'col-01');

  const byUpc = filterProducts(INITIAL_PRODUCTS, '071641', 'All');
  assert.equal(byUpc.length, 1);
  assert.equal(byUpc[0].id, 'sup-01');

  const byCategory = filterProducts(INITIAL_PRODUCTS, '', 'Dry Goods');
  assert.equal(byCategory.length, 3);
});

test('getCountedProducts strictly excludes items with quantity 0', () => {
  const quantities = {
    'bev-01': 4,
    'bev-02': 0,
    'sup-03': 2,
  };
  const counted = getCountedProducts(INITIAL_PRODUCTS, quantities);
  assert.equal(counted.length, 2);
  assert.deepEqual(
    counted.map((c) => ({ id: c.product.id, qty: c.quantity })),
    [
      { id: 'bev-01', qty: 4 },
      { id: 'sup-03', qty: 2 },
    ]
  );
});

test('formatInventorySummaryText formats grouped and flat lists with optional UPC', () => {
  const quantities = {
    'bev-01': 6,
    'bev-02': 2,
    'dry-01': 0,
    'col-01': 9,
  };

  const groupedDefault = formatInventorySummaryText(INITIAL_PRODUCTS, quantities, {
    dateString: 'Oct 30, 2026',
    groupByCategory: true,
    includeUpc: false,
  });

  const expectedGrouped = [
    '📦 Inventory Count - Oct 30, 2026',
    '',
    'Beverages',
    '- Sparkling Mineral Water (24x355mL): 6',
    '- Cold Brew Espresso Concentrate (6x1L): 2',
    '',
    'Cooler / Dairy',
    '- Barista Edition Oat Milk (12x32oz): 9',
  ].join('\n');

  assert.equal(groupedDefault, expectedGrouped);

  const flatWithUpc = formatInventorySummaryText(INITIAL_PRODUCTS, quantities, {
    dateString: 'Oct 30, 2026',
    groupByCategory: false,
    includeUpc: true,
  });

  const expectedFlatWithUpc = [
    '📦 Inventory Count - Oct 30, 2026',
    '',
    '- [012000161155] Sparkling Mineral Water (24x355mL): 6',
    '- [021000658831] Cold Brew Espresso Concentrate (6x1L): 2',
    '- [085269008059] Barista Edition Oat Milk (12x32oz): 9',
  ].join('\n');

  assert.equal(flatWithUpc, expectedFlatWithUpc);
});

test('computeUpcCheckDigit generates valid 12-digit UPC-A codes', () => {
  const code = computeUpcCheckDigit('01200016115');
  assert.equal(code, '012000161155');
  assert.equal(isValidUpcA(code), true);
});

test('mergeCategories preserves explicit categories including empty ones and appends product categories', () => {
  const merged = mergeCategories(['Walk-In Freezer', 'Beverages'], INITIAL_PRODUCTS);
  assert.deepEqual(merged, [
    'Walk-In Freezer',
    'Beverages',
    'Dry Goods',
    'Cooler / Dairy',
    'Supplies',
  ]);
});

test('renameCategoryInCatalog updates category list and reassigns all matching products', () => {
  const baseCategories = ['Beverages', 'Dry Goods', 'Cooler / Dairy', 'Supplies'];
  const { categories, products } = renameCategoryInCatalog(
    baseCategories,
    INITIAL_PRODUCTS,
    'Beverages',
    'Craft Drinks'
  );
  assert.deepEqual(categories, ['Craft Drinks', 'Dry Goods', 'Cooler / Dairy', 'Supplies']);
  const renamedItems = products.filter((p) => p.category === 'Craft Drinks');
  assert.equal(renamedItems.length, 3);
  assert.equal(products.filter((p) => p.category === 'Beverages').length, 0);
});

test('deleteCategoryInCatalog removes category and reassigns products to fallback category', () => {
  const baseCategories = ['Beverages', 'Dry Goods', 'Cooler / Dairy', 'Supplies'];
  const { categories, products } = deleteCategoryInCatalog(
    baseCategories,
    INITIAL_PRODUCTS,
    'Beverages'
  );
  assert.equal(categories.includes('Beverages'), false);
  assert.equal(products.filter((p) => p.category === 'Beverages').length, 0);
  assert.equal(products.filter((p) => p.category === 'Dry Goods').length, 6);
});

test('updateProductInCatalog updates product fields in place', () => {
  const target = {
    ...INITIAL_PRODUCTS[0],
    name: 'Sparkling Mineral Water (12x750mL)',
    unit: 'Box',
  };
  const updated = updateProductInCatalog(INITIAL_PRODUCTS, target);
  assert.equal(updated[0].name, 'Sparkling Mineral Water (12x750mL)');
  assert.equal(updated[0].unit, 'Box');
  assert.equal(updated.length, 12);
});

test('formatInventoryCsv outputs valid CSV rows only for counted products', () => {
  const quantities = {
    'bev-01': 4,
    'dry-01': 0,
    'col-01': 8,
  };
  const csv = formatInventoryCsv(INITIAL_PRODUCTS, quantities, 'Oct 31, 2026');
  const lines = csv.split('\n');
  assert.equal(lines.length, 3);
  assert.equal(lines[0], 'Date,Category,Product Name,UPC,Unit,Quantity');
  assert.match(lines[1], /^"Oct 31, 2026",Beverages,Sparkling Mineral Water \(24x355mL\),012000161155,Case,4$/);
  assert.match(lines[2], /^"Oct 31, 2026",Cooler \/ Dairy,Barista Edition Oat Milk \(12x32oz\),085269008059,Case,8$/);
});

test('serializeCompleteBackup and parseCompleteBackup round-trip categories, products, photo links, UPCs, and quantities', () => {
  const customCategories = ['Walk-In Freezer', 'Beverages', 'Dry Goods', 'Cooler / Dairy', 'Supplies'];
  const quantities = { 'bev-01': 7, 'col-02': 3 };
  const serialized = serializeCompleteBackup(INITIAL_PRODUCTS, customCategories, quantities);
  const parsed = parseCompleteBackup(serialized);

  assert.deepEqual(parsed.categories, customCategories);
  assert.equal(parsed.products.length, 12);
  assert.equal(parsed.products[0].upc, INITIAL_PRODUCTS[0].upc);
  assert.equal(parsed.products[0].image, INITIAL_PRODUCTS[0].image);
  assert.deepEqual(parsed.quantities, quantities);
});

test('normalizeScannedUpc normalizes UPC-A, EAN-13 with leading zero, and 11-digit strings', () => {
  assert.equal(normalizeScannedUpc('012000161155'), '012000161155');
  assert.equal(normalizeScannedUpc('0012000161155'), '012000161155');
  assert.equal(normalizeScannedUpc('01200016115'), '012000161155');
  assert.equal(normalizeScannedUpc(''), null);
});

test('encodeUpcABits and decodeUpcFromLuminanceRow decode all 12 product UPCs in both forward and upside-down orientations', () => {
  for (const product of INITIAL_PRODUCTS) {
    const bits = encodeUpcABits(product.upc);
    // Simulate a 4x scaled camera scanline (4 pixels per barcode module, dark = 20, light = 240)
    const luminance: number[] = [];
    for (const bit of bits) {
      const lum = bit === '1' ? 20 : 240;
      luminance.push(lum, lum, lum, lum);
    }

    const decodedForward = decodeUpcFromLuminanceRow(luminance);
    assert.equal(decodedForward, product.upc, `Failed forward decode for ${product.name}`);

    const decodedReversed = decodeUpcFromLuminanceRow([...luminance].reverse());
    assert.equal(decodedReversed, product.upc, `Failed upside-down decode for ${product.name}`);
  }
});
