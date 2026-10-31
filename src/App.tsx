import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  X,
  Settings2,
  RotateCcw,
  Sun,
  Moon,
  Contrast,
  AlertTriangle,
  PackageSearch,
  FolderCog,
  Layout,
  Globe,
} from 'lucide-react';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, type Product } from './data/products';
import {
  computeInventoryMetrics,
  deleteCategoryInCatalog,
  filterProducts,
  groupProductsByCategory,
  mergeCategories,
  renameCategoryInCatalog,
  updateProductInCatalog,
  type QuantityMap,
} from './utils/inventoryLogic';
import { ProductCard } from './components/ProductCard';
import { BarcodeLightboxModal } from './components/BarcodeLightboxModal';
import { ManageCatalogModal, type CatalogModalTab } from './components/ManageCatalogModal';
import { SummaryView } from './components/SummaryView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { WebsiteShowcaseView } from './components/WebsiteShowcaseView';
import { GitHubDeployModal } from './components/GitHubDeployModal';

const STORAGE_KEYS = {
  CATALOG: 'daily_inventory_catalog_v1',
  CATEGORIES: 'daily_inventory_categories_v1',
  QUANTITIES: 'daily_inventory_quantities_v1',
  THEME: 'daily_inventory_theme_v1',
  LAYOUT_MODE: 'daily_inventory_layout_mode_v1',
} as const;

type ThemeMode = 'light' | 'dark' | 'contrast';
type LayoutMode = 'workspace' | 'website';

export default function App() {
  // Load persisted product catalog or fallback to INITIAL_PRODUCTS
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATALOG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to initial catalog
    }
    return INITIAL_PRODUCTS;
  });

  // Load persisted categories list or fallback to INITIAL_CATEGORIES merged with products
  const [storedCategories, setStoredCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to initial categories
    }
    return INITIAL_CATEGORIES;
  });

  // Load persisted daily quantities
  const [quantities, setQuantities] = useState<QuantityMap>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.QUANTITIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {
      // Fallback to empty quantities
    }
    return {};
  });

  // Load theme mode: light, dark, or high-contrast warehouse mode
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME) as ThemeMode | null;
      if (saved === 'light' || saved === 'dark' || saved === 'contrast') {
        return saved;
      }
    } catch {
      // Default to dark mode for warehouse/mobile battery savings
    }
    return 'dark';
  });

  // Layout mode: 'workspace' (default full app) or 'website' (interactive handheld frame + web portal)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LAYOUT_MODE) as LayoutMode | null;
      if (saved === 'workspace' || saved === 'website') {
        return saved;
      }
    } catch {
      // Default to workspace
    }
    return 'workspace';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeView, setActiveView] = useState<'count' | 'summary'>('count');
  const [lightboxProduct, setLightboxProduct] = useState<Product | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageModalTab, setManageModalTab] = useState<CatalogModalTab>('products');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

  // Merged categories (preserves custom/empty categories and order)
  const categories = useMemo(
    () => mergeCategories(storedCategories, products),
    [storedCategories, products]
  );

  // Sync catalog to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(products));
    } catch {
      // Ignore quota errors
    }
  }, [products]);

  // Sync categories to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch {
      // Ignore quota errors
    }
  }, [categories]);

  // Sync quantities to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.QUANTITIES, JSON.stringify(quantities));
    } catch {
      // Ignore quota errors
    }
  }, [quantities]);

  // Sync theme mode to documentElement class and localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'dark' || themeMode === 'contrast') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, themeMode);
    } catch {
      // Ignore storage errors
    }
  }, [themeMode]);

  // Sync layout mode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LAYOUT_MODE, layoutMode);
    } catch {
      // Ignore storage errors
    }
  }, [layoutMode]);

  const highContrast = themeMode === 'contrast';

  // Formatted date for header & plain text export
  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());
  }, []);

  // Live metrics
  const metrics = useMemo(
    () => computeInventoryMetrics(products, quantities),
    [products, quantities]
  );

  // Filtered products
  const filteredProducts = useMemo(
    () => filterProducts(products, searchQuery, selectedCategory),
    [products, searchQuery, selectedCategory]
  );

  // Grouped products when "All" is selected and no search query is active
  const groupedProducts = useMemo(
    () => groupProductsByCategory(filteredProducts, categories),
    [filteredProducts, categories]
  );

  const handleQuantityChange = (productId: string, nextQuantity: number) => {
    const cleanQty = Math.max(0, Math.floor(Number(nextQuantity) || 0));
    setQuantities((prev) => {
      const next = { ...prev };
      if (cleanQty <= 0) {
        delete next[productId];
      } else {
        next[productId] = cleanQty;
      }
      return next;
    });
  };

  const handleConfirmReset = () => {
    setQuantities({});
    setIsResetConfirmOpen(false);
  };

  const handleOpenManageProducts = () => {
    setEditingProduct(null);
    setManageModalTab('products');
    setIsManageModalOpen(true);
  };

  const handleOpenManageCategories = () => {
    setEditingProduct(null);
    setManageModalTab('categories');
    setIsManageModalOpen(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    setManageModalTab('products');
    setIsManageModalOpen(true);
  };

  const handleAddProduct = (newProduct: Product) => {
    setProducts((prev) => [newProduct, ...prev]);
    setStoredCategories((prev) =>
      prev.includes(newProduct.category) ? prev : [...prev, newProduct.category]
    );
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts((prev) => updateProductInCatalog(prev, updatedProduct));
    setStoredCategories((prev) =>
      prev.includes(updatedProduct.category) ? prev : [...prev, updatedProduct.category]
    );
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setQuantities((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const handleAddCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    setStoredCategories((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
  };

  const handleRenameCategory = (oldName: string, newName: string) => {
    const result = renameCategoryInCatalog(categories, products, oldName, newName);
    setStoredCategories(result.categories);
    setProducts(result.products);
    if (selectedCategory === oldName) {
      setSelectedCategory(newName.trim());
    }
  };

  const handleReorderCategories = (nextCategories: string[]) => {
    setStoredCategories(nextCategories);
  };

  const handleDeleteCategory = (categoryName: string) => {
    const result = deleteCategoryInCatalog(categories, products, categoryName);
    setStoredCategories(result.categories);
    setProducts(result.products);
    if (selectedCategory === categoryName) {
      setSelectedCategory('All');
    }
  };

  const handleImportCatalog = (
    importedProducts: Product[],
    importedCategories?: string[]
  ) => {
    setProducts(importedProducts);
    if (importedCategories && importedCategories.length > 0) {
      setStoredCategories(importedCategories);
    } else {
      setStoredCategories(mergeCategories([], importedProducts));
    }
    setSelectedCategory('All');
  };

  const handleResetCatalogToDefaults = () => {
    setProducts(INITIAL_PRODUCTS);
    setStoredCategories(INITIAL_CATEGORIES);
    setSelectedCategory('All');
  };

  const cycleThemeMode = () => {
    setThemeMode((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'contrast';
      return 'light';
    });
  };

  if (activeView === 'summary' && layoutMode === 'workspace') {
    return (
      <div
        className={
          highContrast
            ? 'min-h-screen bg-black text-white'
            : 'min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100'
        }
      >
        <OfflineIndicator />
        <SummaryView
          products={products}
          quantities={quantities}
          formattedDate={formattedDate}
          highContrast={highContrast}
          onBackToEdit={() => setActiveView('count')}
        />
      </div>
    );
  }

  const isGroupedView = selectedCategory === 'All' && searchQuery.trim() === '';
  const isFramed = layoutMode === 'website';

  // Core counting & search content (reused in both Full-Screen Workspace and Interactive Website Phone Frame)
  const renderCountingWorkspace = (insidePhoneFrame: boolean) => {
    if (activeView === 'summary' && insidePhoneFrame) {
      return (
        <SummaryView
          products={products}
          quantities={quantities}
          formattedDate={formattedDate}
          highContrast={highContrast}
          onBackToEdit={() => setActiveView('count')}
        />
      );
    }

    const gridColsClass = insidePhoneFrame
      ? 'grid grid-cols-1 gap-2.5'
      : 'grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3';

    return (
      <>
        {/* Search & Category Filter Workspace Toolbar */}
        <section
          aria-label="Search and Category Filters"
          className={`border-b ${
            highContrast
              ? 'bg-slate-950 border-slate-700'
              : 'bg-white dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800/80'
          }`}
        >
          <div className={`${insidePhoneFrame ? 'px-3' : 'max-w-7xl mx-auto px-3 sm:px-6'} py-3 space-y-2.5`}>
            {/* Real-time Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by product name or 12-digit UPC barcode..."
                aria-label="Search products by name or UPC"
                className={`w-full min-h-[44px] pl-10 pr-11 py-2 rounded-xl text-sm transition focus:outline-2 focus:outline-emerald-500 ${
                  highContrast
                    ? 'bg-black text-white border-2 border-white placeholder:text-slate-400'
                    : 'bg-slate-100/90 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 placeholder:text-slate-400'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 touch-manipulation select-none"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Horizontal Scrollable Category Tabs with Active Count Indicator + Quick Edit Categories Button */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <div
                role="tablist"
                aria-label="Product Categories"
                className="flex items-center gap-1.5"
              >
                {(['All', ...categories] as string[]).map((cat) => {
                  const isSelected = selectedCategory === cat;
                  const activeCount =
                    cat === 'All'
                      ? metrics.productsCounted
                      : metrics.categoryCounts[cat] || 0;

                  return (
                    <button
                      key={cat}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setSelectedCategory(cat)}
                      className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition touch-manipulation select-none whitespace-nowrap shrink-0 ${
                        highContrast
                          ? isSelected
                            ? 'bg-emerald-400 text-slate-950 border-2 border-white'
                            : 'bg-slate-900 text-white border border-slate-600'
                          : isSelected
                          ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{cat}</span>
                      {activeCount > 0 && (
                        <span
                          className={`font-mono text-[11px] font-extrabold px-1.5 py-0.2 rounded-md ${
                            highContrast
                              ? isSelected
                                ? 'bg-slate-950 text-emerald-300'
                                : 'bg-emerald-400 text-slate-950'
                              : isSelected
                              ? 'bg-emerald-500 dark:bg-slate-950 text-white'
                              : 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {activeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleOpenManageCategories}
                aria-label="Edit Categories"
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition touch-manipulation select-none whitespace-nowrap shrink-0 border ${
                  highContrast
                    ? 'bg-slate-900 text-emerald-300 border-emerald-400'
                    : 'bg-transparent border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
              >
                <FolderCog className="w-3.5 h-3.5 shrink-0" />
                <span>Edit Categories</span>
              </button>
            </div>
          </div>
        </section>

        {/* Main Product Counting List */}
        <main className={`${insidePhoneFrame ? 'px-3 pb-20' : 'max-w-7xl mx-auto px-3 sm:px-6 pb-6'} pt-4`}>
          {filteredProducts.length === 0 ? (
            <div className="my-12 max-w-md mx-auto text-center p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <PackageSearch className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                No matching products found
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {searchQuery
                  ? `No items match "${searchQuery}" in ${selectedCategory}.`
                  : `No products in category "${selectedCategory}" yet.`}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 touch-manipulation select-none"
                  >
                    Clear Search
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleOpenManageProducts}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold touch-manipulation select-none"
                >
                  + Add Product
                </button>
              </div>
            </div>
          ) : isGroupedView ? (
            <div className="space-y-6">
              {groupedProducts.map(({ category, items }) => {
                const countedInGroup = metrics.categoryCounts[category] || 0;
                return (
                  <section key={category} aria-label={category} className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <h2
                        className={`text-sm sm:text-base font-extrabold tracking-tight ${
                          highContrast
                            ? 'text-emerald-300'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {category}
                      </h2>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        {countedInGroup} of {items.length} counted
                      </span>
                    </div>

                    <div className={gridColsClass}>
                      {items.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          quantity={quantities[product.id] || 0}
                          highContrast={highContrast}
                          compact={insidePhoneFrame}
                          onQuantityChange={handleQuantityChange}
                          onOpenLightbox={setLightboxProduct}
                          onEditProduct={handleOpenEditProduct}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Showing {filteredProducts.length}{' '}
                  {filteredProducts.length === 1 ? 'product' : 'products'}
                  {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
                </h2>
              </div>

              <div className={gridColsClass}>
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    quantity={quantities[product.id] || 0}
                    highContrast={highContrast}
                    compact={insidePhoneFrame}
                    onQuantityChange={handleQuantityChange}
                    onOpenLightbox={setLightboxProduct}
                    onEditProduct={handleOpenEditProduct}
                  />
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Bottom Action Bar */}
        <footer
          className={`${
            insidePhoneFrame ? 'sticky bottom-0 left-0 right-0' : 'fixed bottom-0 left-0 right-0'
          } z-30 h-16 border-t backdrop-blur-md flex items-center ${
            highContrast
              ? 'bg-black border-t-2 border-white text-white'
              : 'bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className={`${insidePhoneFrame ? 'px-3' : 'max-w-7xl mx-auto px-3 sm:px-6'} w-full flex items-center justify-between gap-2`}>
            {/* Left: Reset Button */}
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              disabled={metrics.productsCounted === 0}
              aria-label="Reset all quantities"
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 touch-manipulation select-none whitespace-nowrap shrink-0 ${
                metrics.productsCounted === 0
                  ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  : highContrast
                  ? 'bg-rose-950 text-rose-200 border-2 border-rose-400'
                  : 'bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/70 text-rose-600 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/70'
              }`}
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Reset</span>
            </button>

            {/* Center: Live Counter showing X Products Counted and Y Total Units */}
            <div
              className={`flex ${
                insidePhoneFrame ? 'flex-col' : 'flex-col sm:flex-row sm:gap-3'
              } items-center justify-center text-center min-w-0`}
              aria-live="polite"
            >
              <div className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                  {metrics.productsCounted}
                </span>{' '}
                Products Counted
              </div>
              {!insidePhoneFrame && (
                <span
                  className="hidden sm:inline text-slate-300 dark:text-slate-700"
                  aria-hidden="true"
                >
                  ·
                </span>
              )}
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                <span className="font-mono text-slate-900 dark:text-white font-extrabold">
                  {metrics.totalUnits}
                </span>{' '}
                Total Units
              </div>
            </div>

            {/* Right: Prominent Primary Button "Finish Work ->" */}
            <button
              type="button"
              disabled={metrics.productsCounted === 0}
              onClick={() => setActiveView('summary')}
              className={`min-h-[44px] px-3.5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition active:scale-[0.98] touch-manipulation select-none whitespace-nowrap shrink-0 ${
                metrics.productsCounted === 0
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  : highContrast
                  ? 'bg-emerald-400 text-slate-950 border-2 border-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
              }`}
            >
              <span>Finish Work -&gt;</span>
            </button>
          </div>
        </footer>
      </>
    );
  };

  return (
    <div
      className={
        highContrast
          ? `min-h-screen bg-black text-white ${isFramed ? 'pb-10' : 'pb-24'}`
          : `min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${
              isFramed ? 'pb-10' : 'pb-24'
            }`
      }
    >
      <OfflineIndicator />

      {/* Compact Sticky Top Header (respects 15% mobile sticky cap alongside bottom bar) */}
      <header
        className={`sticky top-0 z-30 h-14 border-b backdrop-blur-md flex items-center ${
          highContrast
            ? 'bg-black border-b-2 border-white text-white'
            : 'bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 flex items-center justify-between gap-2">
          {/* Left: App Title & Formatted Date */}
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2 min-w-0">
            <h1 className="text-sm sm:text-lg font-extrabold tracking-tight leading-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
              Daily Inventory
            </h1>
            <span
              className={`text-[11px] sm:text-xs font-mono leading-tight whitespace-nowrap ${
                highContrast
                  ? 'text-emerald-300 font-bold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className="hidden sm:inline" aria-hidden="true">
                ·{' '}
              </span>
              {formattedDate}
            </span>
          </div>

          {/* Right: Website View Toggle, GitHub Setup, Install PWA, Theme Mode, Manage Catalog */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                setLayoutMode((prev) =>
                  prev === 'workspace' ? 'website' : 'workspace'
                )
              }
              aria-label={
                isFramed ? 'Switch to Full Workspace' : 'Switch to Website View'
              }
              title="Toggle Interactive Website Showcase & Handheld Frame"
              className={`min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition touch-manipulation select-none whitespace-nowrap shrink-0 border ${
                isFramed
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Layout className="w-3.5 h-3.5 shrink-0" />
              <span>{isFramed ? 'Full View' : 'Website View'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsGitHubModalOpen(true)}
              aria-label="GitHub Push & Pages Guide"
              title="GitHub Push & GitHub Pages Instructions"
              className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition touch-manipulation select-none whitespace-nowrap shrink-0"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="hidden lg:inline">GitHub</span>
            </button>

            <PWAInstallButton />

            <button
              type="button"
              onClick={cycleThemeMode}
              aria-label={`Switch display mode (current: ${themeMode})`}
              title="Toggle Light / Dark / High-Contrast Warehouse Mode"
              className={`min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition touch-manipulation select-none whitespace-nowrap shrink-0 ${
                highContrast
                  ? 'bg-emerald-400 text-slate-950 border-2 border-white'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {themeMode === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
              {themeMode === 'dark' && <Moon className="w-4 h-4 text-sky-400" />}
              {themeMode === 'contrast' && <Contrast className="w-4 h-4 text-slate-950" />}
            </button>

            <button
              type="button"
              onClick={handleOpenManageProducts}
              aria-label="Manage Catalog"
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition touch-manipulation select-none whitespace-nowrap shrink-0 ${
                highContrast
                  ? 'bg-slate-900 text-white border-2 border-white hover:bg-slate-800'
                  : 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-800 dark:border-slate-700'
              }`}
            >
              <Settings2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Manage Catalog</span>
            </button>
          </div>
        </div>
      </header>

      {/* Render either Interactive Website Showcase View or Full-Width Counting Workspace */}
      {isFramed ? (
        <WebsiteShowcaseView
          products={products}
          categories={categories}
          quantities={quantities}
          metrics={metrics}
          formattedDate={formattedDate}
          selectedCategory={selectedCategory}
          highContrast={highContrast}
          onSelectCategory={setSelectedCategory}
          onOpenManageProducts={handleOpenManageProducts}
          onOpenManageCategories={handleOpenManageCategories}
          onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
          onOpenResetConfirm={() => setIsResetConfirmOpen(true)}
          onExitWebsiteView={() => setLayoutMode('workspace')}
        >
          {renderCountingWorkspace(true)}
        </WebsiteShowcaseView>
      ) : (
        renderCountingWorkspace(false)
      )}

      {/* Full-Screen Barcode & Photo Lightbox Modal */}
      <BarcodeLightboxModal
        product={lightboxProduct}
        quantity={lightboxProduct ? quantities[lightboxProduct.id] || 0 : 0}
        onClose={() => setLightboxProduct(null)}
        onQuantityChange={handleQuantityChange}
        onEditProduct={handleOpenEditProduct}
      />

      {/* Manage Catalog & Categories Modal */}
      <ManageCatalogModal
        isOpen={isManageModalOpen}
        initialTab={manageModalTab}
        initialEditingProduct={editingProduct}
        products={products}
        categories={categories}
        onClose={() => {
          setIsManageModalOpen(false);
          setEditingProduct(null);
        }}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
        onAddCategory={handleAddCategory}
        onRenameCategory={handleRenameCategory}
        onReorderCategories={handleReorderCategories}
        onDeleteCategory={handleDeleteCategory}
        onImportCatalog={handleImportCatalog}
        onResetCatalogToDefaults={handleResetCatalogToDefaults}
      />

      {/* GitHub Push & GitHub Pages Deployment Modal */}
      <GitHubDeployModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
      />

      {/* Reset Confirmation Modal ("Clear all quantities for today?") */}
      {isResetConfirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-confirm-title"
          onClick={() => setIsResetConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2
              id="reset-confirm-title"
              className="text-lg font-extrabold text-slate-900 dark:text-white"
            >
              Clear all quantities for today?
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              This will reset all {metrics.productsCounted} counted products ({metrics.totalUnits} total units) back to 0. Custom catalog items will be kept.
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-bold transition touch-manipulation select-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition touch-manipulation select-none"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
