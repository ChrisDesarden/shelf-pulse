import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { INITIAL_PRODUCTS } from '../data/products';
import {
  computeInventoryMetrics,
  filterProducts,
  formatInventorySummaryText,
  getCategories,
  getCountedProducts,
  computeUpcCheckDigit,
  isValidUpcA,
  computeEan8CheckDigit,
  isValidEan8,
  computeUpcE8,
  toCanonicalUpcE8,
  expandUpcEToUpcA12,
  compressUpcAToUpcE8,
  isValidUpcE,
  getBarcodeFormatLabel,
  mergeCategories,
  renameCategoryInCatalog,
  deleteCategoryInCatalog,
  updateProductInCatalog,
  formatInventoryCsv,
  serializeCompleteBackup,
  parseCompleteBackup,
  normalizeScannedUpc,
  encodeUpcABits,
  encodeEan8Bits,
  encodeUpcEBits,
  decodeUpcFromLuminanceRow,
  decodeBarcodeFromRgbaImage,
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

test('filterProducts filters by product name (English and Spanish), UPC, and category', () => {
  const byName = filterProducts(INITIAL_PRODUCTS, 'oat milk', 'All');
  assert.equal(byName.length, 1);
  assert.equal(byName[0].id, 'col-01');

  const bySpanishName = filterProducts(INITIAL_PRODUCTS, 'avena', 'All');
  assert.equal(bySpanishName.length, 1);
  assert.equal(bySpanishName[0].id, 'col-01');

  const bySpanishCategory = filterProducts(INITIAL_PRODUCTS, 'bebidas', 'All');
  assert.equal(bySpanishCategory.length, 3);

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

test('formatInventorySummaryText formats grouped and flat lists with optional UPC in English and Spanish', () => {
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

  const groupedSpanish = formatInventorySummaryText(INITIAL_PRODUCTS, quantities, {
    dateString: '30 oct 2026',
    groupByCategory: true,
    includeUpc: false,
    locale: 'es',
  });

  const expectedGroupedSpanish = [
    '📦 Conteo de Inventario - 30 oct 2026',
    '',
    'Bebidas',
    '- Agua Mineral con Gas (24x355mL): 6',
    '- Concentrado Cold Brew Espresso (6x1L): 2',
    '',
    'Refrigerados y Lácteos',
    '- Leche de Avena Edición Barista (12x32oz): 9',
  ].join('\n');

  assert.equal(groupedSpanish, expectedGroupedSpanish);

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

test('serializeCompleteBackup and parseCompleteBackup round-trip categories, products (including short UPCs), photo links, and quantities', () => {
  const customCategories = ['Walk-In Freezer', 'Beverages', 'Dry Goods', 'Cooler / Dairy', 'Supplies'];
  const productsWithShortUpc = [
    ...INITIAL_PRODUCTS,
    {
      id: 'short-01',
      name: 'Espresso Shot Can (Mini)',
      category: 'Beverages',
      upc: '04210009', // 8-digit UPC-E
      image: '',
      unit: 'Can',
    },
    {
      id: 'short-02',
      name: 'Organic Bananas PLU',
      category: 'Dry Goods',
      upc: '94011', // 5-digit PLU
      image: '',
      unit: 'Bunch',
    },
  ];
  const quantities = { 'bev-01': 7, 'short-01': 12 };
  const serialized = serializeCompleteBackup(productsWithShortUpc, customCategories, quantities);
  const parsed = parseCompleteBackup(serialized);

  assert.deepEqual(parsed.categories, customCategories);
  assert.equal(parsed.products.length, 14);
  assert.equal(parsed.products[12].upc, '04210009');
  assert.equal(parsed.products[13].upc, '94011');
  assert.deepEqual(parsed.quantities, quantities);
});

test('normalizeScannedUpc preserves smaller UPCs (4-digit PLU, 6-digit, 8-digit UPC-E/EAN-8) as well as 12-digit UPC-A', () => {
  assert.equal(normalizeScannedUpc('4011'), '4011');
  assert.equal(normalizeScannedUpc('123456'), '123456');
  assert.equal(normalizeScannedUpc('04210009'), '04210009');
  assert.equal(normalizeScannedUpc('96385074'), '96385074');
  assert.equal(normalizeScannedUpc('012000161155'), '012000161155');
  assert.equal(normalizeScannedUpc('0012000161155'), '012000161155');
  assert.equal(normalizeScannedUpc('01200016115'), '012000161155');
  assert.equal(normalizeScannedUpc(''), null);
});

test('getBarcodeFormatLabel identifies UPC-A, UPC-E, EAN-8, and short UPCs accurately', () => {
  const upcE8 = computeUpcE8('421000');
  const ean8 = computeEan8CheckDigit('9638507');
  assert.equal(isValidUpcE(upcE8), true);
  assert.equal(isValidEan8(ean8), true);
  assert.equal(getBarcodeFormatLabel('012000161155'), 'UPC-A (12-Digit)');
  assert.equal(getBarcodeFormatLabel(upcE8), 'UPC-E (8-Digit)');
  assert.equal(getBarcodeFormatLabel(ean8), 'EAN-8 (8-Digit)');
  assert.equal(getBarcodeFormatLabel('123456'), 'UPC-E / Short (6-Digit)');
  assert.equal(getBarcodeFormatLabel('4011'), 'Short UPC (4-Digit)');
});

test('encodeUpcABits, encodeEan8Bits, encodeUpcEBits and decodeUpcFromLuminanceRow decode 12-digit UPC-A, 8-digit EAN-8, and 8-digit UPC-E in both orientations', () => {
  for (const product of INITIAL_PRODUCTS) {
    const bits = encodeUpcABits(product.upc);
    const luminance: number[] = [];
    for (const bit of bits) {
      const lum = bit === '1' ? 20 : 240;
      luminance.push(lum, lum, lum, lum);
    }

    assert.equal(decodeUpcFromLuminanceRow(luminance), product.upc);
    assert.equal(decodeUpcFromLuminanceRow([...luminance].reverse()), product.upc);
  }

  // Verify 8-digit EAN-8 scanline decoding
  const sampleEan8 = computeEan8CheckDigit('9638507');
  const ean8Bits = encodeEan8Bits(sampleEan8);
  const ean8Lum: number[] = [];
  for (const bit of ean8Bits) {
    const lum = bit === '1' ? 15 : 245;
    ean8Lum.push(lum, lum, lum, lum);
  }
  assert.equal(decodeUpcFromLuminanceRow(ean8Lum), sampleEan8);
  assert.equal(decodeUpcFromLuminanceRow([...ean8Lum].reverse()), sampleEan8);

  // Verify 8-digit UPC-E scanline decoding
  const sampleUpcE = computeUpcE8('425261');
  const upcEBits = encodeUpcEBits(sampleUpcE);
  const upcELum: number[] = [];
  for (const bit of upcEBits) {
    const lum = bit === '1' ? 15 : 245;
    upcELum.push(lum, lum, lum, lum);
  }
  assert.equal(decodeUpcFromLuminanceRow(upcELum), sampleUpcE);
  assert.equal(decodeUpcFromLuminanceRow([...upcELum].reverse()), sampleUpcE);
});

test('handles 0 499770 4 UPC-E barcode across 6-digit, 7-digit, 8-digit, and 12-digit UPC-A forms', () => {
  assert.equal(computeUpcE8('499770'), '04997704');
  assert.equal(toCanonicalUpcE8('04997704'), '04997704');
  assert.equal(toCanonicalUpcE8('499770'), '04997704');
  assert.equal(toCanonicalUpcE8('0499770'), '04997704');
  assert.equal(toCanonicalUpcE8('4997704'), '04997704');
  assert.equal(normalizeScannedUpc('04997704'), '04997704');
  assert.equal(normalizeScannedUpc('0499770'), '04997704');
  assert.equal(normalizeScannedUpc('4997704'), '04997704');
  assert.equal(expandUpcEToUpcA12('04997704'), '049000009774');
  assert.equal(expandUpcEToUpcA12('499770'), '049000009774');
  assert.equal(compressUpcAToUpcE8('049000009774'), '04997704');
});

test('decodeBarcodeFromRgbaImage accurately decodes 04997704 from real tilted blue-ink barcode photo', () => {
  const buf = fs.readFileSync('public/assets/aistudio/image_20333dd8.png');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const idatChunks: Buffer[] = [];
  let offset = 8;
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') {
      idatChunks.push(buf.subarray(offset + 8, offset + 8 + len));
    }
    offset += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = 3;
  const stride = width * bpp;
  const rgba = new Uint8ClampedArray(width * height * 4);
  const prevRow = new Uint8Array(stride);
  const currRow = new Uint8Array(stride);
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };
  let srcIdx = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[srcIdx++];
    for (let i = 0; i < stride; i++) {
      const x = raw[srcIdx++];
      const a = i >= bpp ? currRow[i - bpp] : 0;
      const b = prevRow[i];
      const c = i >= bpp ? prevRow[i - bpp] : 0;
      let val = x;
      if (filter === 1) val = (x + a) & 255;
      else if (filter === 2) val = (x + b) & 255;
      else if (filter === 3) val = (x + ((a + b) >> 1)) & 255;
      else if (filter === 4) val = (x + paeth(a, b, c)) & 255;
      currRow[i] = val;
    }
    for (let x = 0; x < width; x++) {
      const dst = (y * width + x) * 4;
      rgba[dst] = currRow[x * 3];
      rgba[dst + 1] = currRow[x * 3 + 1];
      rgba[dst + 2] = currRow[x * 3 + 2];
      rgba[dst + 3] = 255;
    }
    prevRow.set(currRow);
  }

  assert.equal(decodeBarcodeFromRgbaImage(rgba, width, height), '04997704');
});

