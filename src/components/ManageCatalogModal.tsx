import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Plus,
  Download,
  Upload,
  RotateCcw,
  Check,
  Sparkles,
  Trash2,
  Pencil,
  Save,
  ChevronUp,
  ChevronDown,
  Search,
  FolderPlus,
  Image as ImageIcon,
  ArrowLeft,
} from 'lucide-react';
import {
  createProductThumbnailSvg,
  type Product,
  type ThumbnailIconType,
} from '../data/products';
import { computeUpcCheckDigit } from '../utils/inventoryLogic';
import { BarcodeSVG } from './BarcodeSVG';

export type CatalogModalTab = 'products' | 'categories' | 'json';

interface ManageCatalogModalProps {
  isOpen: boolean;
  initialTab?: CatalogModalTab;
  initialEditingProduct?: Product | null;
  products: Product[];
  categories: string[];
  onClose: () => void;
  onAddProduct: (newProduct: Product) => void;
  onUpdateProduct: (updatedProduct: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onAddCategory: (categoryName: string) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
  onReorderCategories: (nextCategories: string[]) => void;
  onDeleteCategory: (categoryName: string) => void;
  onImportCatalog: (importedProducts: Product[], importedCategories?: string[]) => void;
  onResetCatalogToDefaults: () => void;
}

const THUMBNAIL_PALETTES: Array<{
  bgStart: string;
  bgEnd: string;
  accent: string;
  icon: ThumbnailIconType;
}> = [
  { bgStart: '#0284c7', bgEnd: '#0369a1', accent: '#0284c7', icon: 'can' },
  { bgStart: '#0f766e', bgEnd: '#115e59', accent: '#0d9488', icon: 'bottle' },
  { bgStart: '#d97706', bgEnd: '#b45309', accent: '#d97706', icon: 'sack' },
  { bgStart: '#2563eb', bgEnd: '#1d4ed8', accent: '#2563eb', icon: 'carton' },
  { bgStart: '#059669', bgEnd: '#047857', accent: '#059669', icon: 'gloves' },
  { bgStart: '#4f46e5', bgEnd: '#4338ca', accent: '#4f46e5', icon: 'eggs' },
];

export const ManageCatalogModal: React.FC<ManageCatalogModalProps> = ({
  isOpen,
  initialTab = 'products',
  initialEditingProduct = null,
  products,
  categories,
  onClose,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddCategory,
  onRenameCategory,
  onReorderCategories,
  onDeleteCategory,
  onImportCatalog,
  onResetCatalogToDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<CatalogModalTab>(initialTab);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Product Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Beverages');
  const [customCategory, setCustomCategory] = useState('');
  const [upc, setUpc] = useState(() => computeUpcCheckDigit('04900005010'));
  const [unit, setUnit] = useState('Case');
  const [image, setImage] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Categories Tab State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryOriginal, setEditingCategoryOriginal] = useState<string | null>(null);
  const [editingCategoryDraft, setEditingCategoryDraft] = useState('');
  const [categoryFeedback, setCategoryFeedback] = useState('');

  // JSON Tab State
  const [jsonText, setJsonText] = useState('');
  const [jsonStatus, setJsonStatus] = useState('');

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const generateRandomUpcString = () => {
    const randomEleven =
      '0' +
      Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
    return computeUpcCheckDigit(randomEleven);
  };

  const resetProductFormToCreate = (defaultCat?: string) => {
    setEditingProductId(null);
    setName('');
    setCategory(defaultCat || categories[0] || 'Beverages');
    setCustomCategory('');
    setUpc(generateRandomUpcString());
    setUnit('Case');
    setImage('');
    setFormError('');
  };

  const loadProductIntoForm = (product: Product) => {
    setActiveTab('products');
    setEditingProductId(product.id);
    setName(product.name);
    if (categories.includes(product.category)) {
      setCategory(product.category);
      setCustomCategory('');
    } else {
      setCategory('__custom__');
      setCustomCategory(product.category);
    }
    setUpc(product.upc);
    setUnit(product.unit || 'Each');
    setImage(product.image || '');
    setFormError('');
    setFormSuccess('');
    requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  // Sync modal state when opened or when initialEditingProduct / initialTab changes
  useEffect(() => {
    if (!isOpen) return;
    setFormError('');
    setFormSuccess('');
    setCategoryFeedback('');
    setJsonStatus('');
    setEditingCategoryOriginal(null);
    if (initialEditingProduct) {
      loadProductIntoForm(initialEditingProduct);
    } else {
      setActiveTab(initialTab);
      resetProductFormToCreate(categories[0]);
    }
  }, [isOpen, initialTab, initialEditingProduct]);

  if (!isOpen) return null;

  const isSingleProductQuickEdit = Boolean(
    initialEditingProduct && editingProductId === initialEditingProduct.id
  );

  const handleCancelEdit = () => {
    if (initialEditingProduct) {
      onClose();
    } else {
      resetProductFormToCreate();
    }
  };

  const handleGenerateRandomUpc = () => {
    setUpc(generateRandomUpcString());
    setFormError('');
  };

  const handleGenerateGraphicThumbnail = () => {
    const cleanTitle = (name.trim() || 'ITEM').slice(0, 10).toUpperCase();
    const cleanSub = (unit.trim() || 'STOCK').slice(0, 12);
    const palette =
      THUMBNAIL_PALETTES[Math.floor(Math.random() * THUMBNAIL_PALETTES.length)];
    const dataUri = createProductThumbnailSvg(
      cleanTitle,
      cleanSub,
      palette.bgStart,
      palette.bgEnd,
      palette.accent,
      palette.icon
    );
    setImage(dataUri);
  };

  const handleProductFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Please enter a product name.');
      return;
    }

    const finalCategory =
      category === '__custom__' ? customCategory.trim() : category.trim();
    if (!finalCategory) {
      setFormError('Please select or enter a category.');
      return;
    }

    const digitsOnly = upc.replace(/\D/g, '');
    if (digitsOnly.length < 11 || digitsOnly.length > 12) {
      setFormError('UPC must be 11 or 12 numeric digits.');
      return;
    }

    const normalizedUpc =
      digitsOnly.length === 11 ? computeUpcCheckDigit(digitsOnly) : digitsOnly;

    if (!categories.includes(finalCategory)) {
      onAddCategory(finalCategory);
    }

    if (editingProductId) {
      const updatedProduct: Product = {
        id: editingProductId,
        name: trimmedName,
        category: finalCategory,
        upc: normalizedUpc,
        unit: unit.trim() || 'Each',
        image: image.trim(),
      };
      onUpdateProduct(updatedProduct);

      // If the user tapped the pencil icon on a card to edit that specific product,
      // close the modal upon saving so they return directly to counting.
      if (isSingleProductQuickEdit) {
        onClose();
        return;
      }

      setFormSuccess(`Updated "${updatedProduct.name}".`);
      setEditingProductId(null);
      resetProductFormToCreate(finalCategory);
    } else {
      const newProduct: Product = {
        id: `custom-${Date.now()}`,
        name: trimmedName,
        category: finalCategory,
        upc: normalizedUpc,
        unit: unit.trim() || 'Each',
        image: image.trim(),
      };
      onAddProduct(newProduct);
      resetProductFormToCreate(finalCategory);
      setFormSuccess(`Added "${newProduct.name}" to ${newProduct.category}.`);
    }
  };

  // Category Handlers
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryFeedback('');
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setCategoryFeedback(`Category "${trimmed}" already exists.`);
      return;
    }
    onAddCategory(trimmed);
    setNewCategoryName('');
    setCategoryFeedback(`Added category "${trimmed}".`);
  };

  const handleStartRenameCategory = (cat: string) => {
    setEditingCategoryOriginal(cat);
    setEditingCategoryDraft(cat);
    setCategoryFeedback('');
  };

  const handleSaveRenameCategory = (oldName: string) => {
    const trimmed = editingCategoryDraft.trim();
    if (!trimmed) return;
    if (trimmed !== oldName) {
      onRenameCategory(oldName, trimmed);
      setCategoryFeedback(`Renamed "${oldName}" to "${trimmed}".`);
    }
    setEditingCategoryOriginal(null);
    setEditingCategoryDraft('');
  };

  const handleMoveCategory = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;
    const copy = [...categories];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    onReorderCategories(copy);
  };

  // JSON Export/Import Handlers
  const serializeCatalog = () =>
    JSON.stringify({ categories, products }, null, 2);

  const handleExportDownload = () => {
    const serialized = serializeCatalog();
    setJsonText(serialized);
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-catalog-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setJsonStatus('Catalog exported as JSON file.');
  };

  const handleImportSubmit = () => {
    setJsonStatus('');
    try {
      const parsed = JSON.parse(jsonText);
      const rawProducts = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.products)
        ? parsed.products
        : null;
      const rawCategories = Array.isArray(parsed?.categories)
        ? parsed.categories.map((c: unknown) => String(c).trim()).filter(Boolean)
        : undefined;

      if (!rawProducts || rawProducts.length === 0) {
        setJsonStatus('Error: JSON must contain a non-empty array of products.');
        return;
      }

      const validated: Product[] = rawProducts.map((item: Record<string, unknown>, idx: number) => {
        if (!item || typeof item.name !== 'string' || !item.name.trim()) {
          throw new Error(`Item at index ${idx} is missing a valid "name".`);
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
      });

      onImportCatalog(validated, rawCategories);
      setJsonStatus(`Successfully imported ${validated.length} products.`);
    } catch (err) {
      setJsonStatus(
        err instanceof Error ? `Invalid JSON: ${err.message}` : 'Invalid JSON format.'
      );
    }
  };

  const filteredCatalogProducts = products.filter((p) => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.upc.includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-catalog-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[calc(100dvh-16px)] sm:max-h-[90dvh] rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Modal Header with both Back button and Close X button */}
        <div className="flex items-center justify-between gap-2 px-3.5 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to inventory"
              className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition touch-manipulation select-none shrink-0"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Back</span>
            </button>
            <div className="min-w-0">
              <h2
                id="manage-catalog-title"
                className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white truncate"
              >
                {isSingleProductQuickEdit
                  ? 'Edit Product'
                  : 'Manage Catalog & Categories'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {products.length} products · {categories.length} categories
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close catalog manager"
            className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 touch-manipulation select-none shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Mode Tabs: Products, Categories, Import/Export JSON */}
        <div className="px-3.5 sm:px-5 pt-2.5 pb-2.5 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`flex-1 min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-bold transition touch-manipulation select-none whitespace-nowrap ${
              activeTab === 'products'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Products ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex-1 min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-bold transition touch-manipulation select-none whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Categories ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setJsonText(serializeCatalog());
              setActiveTab('json');
            }}
            className={`flex-1 min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-bold transition touch-manipulation select-none whitespace-nowrap ${
              activeTab === 'json'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Import / Export
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          ref={scrollContainerRef}
          className="p-3.5 sm:p-5 overflow-y-auto overflow-x-hidden flex-1 space-y-4"
        >
          {activeTab === 'products' && (
            <>
              {/* Add / Edit Product Form */}
              <form
                onSubmit={handleProductFormSubmit}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {editingProductId ? 'Edit Product Information' : 'Add New Product'}
                  </h3>
                  {editingProductId && (
                    <button
                      type="button"
                      onClick={() => resetProductFormToCreate()}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline touch-manipulation whitespace-nowrap"
                    >
                      + Switch to New Product
                    </button>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="new-product-name"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Product Name *
                  </label>
                  <input
                    id="new-product-name"
                    type="text"
                    required
                    placeholder="e.g., Almond Croissant Tray (24ct)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="new-product-category"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Category *
                    </label>
                    <select
                      id="new-product-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-emerald-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__custom__">+ New Category...</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="new-product-unit"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Counting Unit
                    </label>
                    <input
                      id="new-product-unit"
                      type="text"
                      placeholder="Case, Each, Box, Bag..."
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-emerald-500"
                    />
                  </div>
                </div>

                {category === '__custom__' && (
                  <div>
                    <label
                      htmlFor="new-product-custom-category"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      New Category Name *
                    </label>
                    <input
                      id="new-product-custom-category"
                      type="text"
                      placeholder="e.g., Walk-In Freezer"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label
                      htmlFor="new-product-upc"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      12-Digit UPC Number *
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateRandomUpc}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 touch-manipulation whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>Generate UPC</span>
                    </button>
                  </div>
                  <input
                    id="new-product-upc"
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    value={upc}
                    onChange={(e) => setUpc(e.target.value.replace(/\D/g, ''))}
                    placeholder="12-digit numeric UPC"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-emerald-500"
                  />
                  {upc.length >= 6 && (
                    <div className="mt-2 flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                        Barcode Preview
                      </span>
                      <div className="max-w-[60%] overflow-hidden flex justify-end">
                        <BarcodeSVG upc={upc} height={24} width={1.15} displayValue={false} />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label
                      htmlFor="new-product-image"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Thumbnail URL (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateGraphicThumbnail}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 touch-manipulation whitespace-nowrap"
                    >
                      <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>Generate Graphic</span>
                    </button>
                  </div>
                  <input
                    id="new-product-image"
                    type="text"
                    placeholder="Paste image URL or click Generate Graphic"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-emerald-500"
                  />
                </div>

                {formError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-600 dark:text-rose-300">
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 min-w-[140px] min-h-[44px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition touch-manipulation select-none"
                  >
                    {editingProductId ? (
                      <>
                        <Save className="w-4 h-4 stroke-[2.5] shrink-0" />
                        <span>Save Changes</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                        <span>Add Product</span>
                      </>
                    )}
                  </button>

                  {editingProductId && (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="min-h-[44px] px-3.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center transition touch-manipulation select-none"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onDeleteProduct(editingProductId);
                          if (isSingleProductQuickEdit) {
                            onClose();
                          } else {
                            resetProductFormToCreate();
                            setFormSuccess('Product removed from catalog.');
                          }
                        }}
                        aria-label="Delete currently edited product"
                        className="min-h-[44px] px-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center gap-1 transition touch-manipulation select-none"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              </form>

              {/* Existing Products Directory for Quick Editing / Deleting */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    All Products in Catalog ({products.length})
                  </h3>
                  <div className="relative flex-1 sm:max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Filter catalog to edit..."
                      aria-label="Filter catalog products"
                      className="w-full min-h-[36px] pl-8 pr-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-2 focus:outline-emerald-500"
                    />
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                  {filteredCatalogProducts.map((p) => {
                    const isBeingEdited = editingProductId === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`px-3 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                          isBeingEdited
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/40'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1">
                            <span>{p.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>{p.unit || 'Each'}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{p.upc}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => loadProductIntoForm(p)}
                            aria-label={`Edit ${p.name} in catalog`}
                            className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition touch-manipulation select-none"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProduct(p.id)}
                            aria-label={`Delete ${p.name}`}
                            className="min-w-[36px] min-h-[36px] rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center justify-center transition touch-manipulation select-none"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-4">
              {/* Add Category Form */}
              <form
                onSubmit={handleAddCategorySubmit}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <label
                  htmlFor="add-category-input"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Create New Category
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="add-category-input"
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Walk-In Freezer..."
                    className="flex-1 min-w-0 min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-emerald-500"
                  />
                  <button
                    type="submit"
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition touch-manipulation select-none whitespace-nowrap shrink-0"
                  >
                    <FolderPlus className="w-4 h-4 shrink-0" />
                    <span>Add Category</span>
                  </button>
                </div>
              </form>

              {categoryFeedback && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{categoryFeedback}</span>
                </div>
              )}

              {/* Categories List with Rename, Reorder, and Delete */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
                  Existing Categories (Rename, Reorder, or Remove)
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                  {categories.map((cat, idx) => {
                    const itemCount = products.filter((p) => p.category === cat).length;
                    const isRenaming = editingCategoryOriginal === cat;

                    return (
                      <div
                        key={cat}
                        className="px-3 py-2.5 flex items-center justify-between gap-2"
                      >
                        {isRenaming ? (
                          <div className="flex-1 min-w-0 flex items-center gap-1.5">
                            <input
                              type="text"
                              aria-label={`New name for category ${cat}`}
                              value={editingCategoryDraft}
                              onChange={(e) => setEditingCategoryDraft(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveRenameCategory(cat);
                                } else if (e.key === 'Escape') {
                                  setEditingCategoryOriginal(null);
                                }
                              }}
                              className="flex-1 min-w-0 min-h-[38px] px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-950 border border-emerald-500 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-2 focus:outline-emerald-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRenameCategory(cat)}
                              aria-label={`Save category ${cat}`}
                              className="min-h-[38px] px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 touch-manipulation select-none shrink-0"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategoryOriginal(null)}
                              className="min-h-[38px] px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold touch-manipulation select-none shrink-0"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                {cat}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {itemCount} {itemCount === 1 ? 'product' : 'products'}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleMoveCategory(idx, -1)}
                                disabled={idx === 0}
                                aria-label={`Move category ${cat} up`}
                                className="min-w-[32px] min-h-[32px] rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 flex items-center justify-center touch-manipulation select-none"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveCategory(idx, 1)}
                                disabled={idx === categories.length - 1}
                                aria-label={`Move category ${cat} down`}
                                className="min-w-[32px] min-h-[32px] rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 flex items-center justify-center touch-manipulation select-none"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartRenameCategory(cat)}
                                aria-label={`Edit category ${cat}`}
                                className="min-h-[32px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition touch-manipulation select-none"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Rename</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteCategory(cat);
                                  setCategoryFeedback(`Removed category "${cat}".`);
                                }}
                                disabled={categories.length <= 1}
                                aria-label={`Delete category ${cat}`}
                                className="min-w-[32px] min-h-[32px] rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-30 flex items-center justify-center transition touch-manipulation select-none"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportDownload}
                  className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition touch-manipulation select-none"
                >
                  <Download className="w-4 h-4" />
                  <span>Download JSON</span>
                </button>
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition touch-manipulation select-none"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import JSON Below</span>
                </button>
              </div>

              <div>
                <label
                  htmlFor="catalog-json-textarea"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Catalog &amp; Categories JSON Data
                </label>
                <textarea
                  id="catalog-json-textarea"
                  rows={7}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-2 focus:outline-emerald-500"
                />
              </div>

              {jsonStatus && (
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {jsonStatus}
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Restore original 12 sample products?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onResetCatalogToDefaults();
                    setJsonStatus('Restored default 12 sample products and categories.');
                  }}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 touch-manipulation select-none shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Modal Footer: Always-visible Close / Done button for one-handed mobile use */}
        <div className="px-3.5 sm:px-5 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/95 shrink-0 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Changes save automatically to device
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition touch-manipulation select-none shrink-0"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Done &amp; Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
