import React, { useState } from 'react';
import {
  Smartphone,
  Maximize2,
  Copy,
  Check,
  FileSpreadsheet,
  FileText,
  Settings2,
  FolderCog,
  RotateCcw,
  Globe,
  CheckCircle2,
  ScanBarcode,
} from 'lucide-react';
import type { Product } from '../data/products';
import {
  formatInventoryCsv,
  formatInventorySummaryText,
  getCountedProducts,
  type InventoryMetrics,
  type QuantityMap,
} from '../utils/inventoryLogic';

interface WebsiteShowcaseViewProps {
  products: Product[];
  categories: string[];
  quantities: QuantityMap;
  metrics: InventoryMetrics;
  formattedDate: string;
  selectedCategory: string;
  highContrast: boolean;
  onSelectCategory: (category: string) => void;
  onOpenManageProducts: () => void;
  onOpenManageCategories: () => void;
  onOpenGitHubModal: () => void;
  onOpenResetConfirm: () => void;
  onExitWebsiteView: () => void;
  children: React.ReactNode;
}

export const WebsiteShowcaseView: React.FC<WebsiteShowcaseViewProps> = ({
  products,
  categories,
  quantities,
  metrics,
  formattedDate,
  selectedCategory,
  highContrast,
  onSelectCategory,
  onOpenManageProducts,
  onOpenManageCategories,
  onOpenGitHubModal,
  onOpenResetConfirm,
  onExitWebsiteView,
  children,
}) => {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const countedList = getCountedProducts(products, quantities);

  const plainTextSummary = formatInventorySummaryText(products, quantities, {
    dateString: formattedDate,
    groupByCategory: true,
    includeUpc: false,
  });

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(plainTextSummary);
      setCopiedSummary(true);
      setExportFeedback('Copied formatted inventory summary to clipboard!');
      window.setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = plainTextSummary;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedSummary(true);
      setExportFeedback('Copied formatted inventory summary to clipboard!');
      window.setTimeout(() => setCopiedSummary(false), 2500);
    }
  };

  const handleDownloadCsv = () => {
    const csvContent = formatInventoryCsv(products, quantities, formattedDate);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-count-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportFeedback('Downloaded inventory count as CSV spreadsheet.');
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([plainTextSummary], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-count-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportFeedback('Downloaded plain-text inventory report.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left / Center Column: Interactive Mobile Device Frame (420px wide container with 390px inner viewport) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[414px] flex items-center justify-between mb-2.5 px-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Smartphone className="w-4 h-4" />
              <span>Interactive Handheld PWA Frame (390px)</span>
            </div>
            <button
              type="button"
              onClick={onExitWebsiteView}
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 flex items-center gap-1 touch-manipulation"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full-Screen View</span>
            </button>
          </div>

          {/* Sleek Titanium / Glass Phone Bezel */}
          <div
            className="w-full max-w-[414px] rounded-[44px] p-3 glass-modal bg-slate-900/90 dark:bg-slate-900/85 border-2 border-slate-700/80 dark:border-white/15 shadow-2xl"
            data-testid="interactive-mobile-frame"
          >
            {/* Dynamic Island / Speaker Pill */}
            <div className="w-24 h-1.5 bg-slate-700 dark:bg-slate-600 rounded-full mx-auto mb-2.5" />

            {/* Live Interactive App Viewport */}
            <div className="w-full h-[740px] rounded-[32px] overflow-y-auto overflow-x-hidden ambient-canvas border border-slate-800/80 relative">
              {children}
            </div>
          </div>
        </div>

        {/* Right Column: Live Web Control Center, Category Breakdown, & Exports */}
        <div className="lg:col-span-7 space-y-5">
          {/* Web Header Card */}
          <section
            className={`rounded-3xl p-6 ${
              highContrast
                ? 'bg-slate-950 border-2 border-white text-white'
                : 'glass-card'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <ScanBarcode className="w-4 h-4" />
                  <span>Interactive Web &amp; GitHub Pages Portal</span>
                </div>
                <h2 className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Daily Team Inventory Hub
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl">
                  Use the interactive mobile device on the left or manage categories, products, and spreadsheet exports directly from this web dashboard. All changes sync instantaneously to local storage.
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenGitHubModal}
                className="min-h-[42px] px-4 py-2 rounded-2xl glass-pill text-slate-900 dark:text-white text-xs font-bold flex items-center gap-2 transition touch-manipulation select-none shrink-0"
              >
                <Globe className="w-4 h-4 text-emerald-500" />
                <span>GitHub Pages Setup</span>
              </button>
            </div>

            {/* 3 KPI Metric Strip */}
            <div className="mt-5 grid grid-cols-3 gap-3 pt-5 border-t border-slate-200/60 dark:border-white/[0.08]">
              <div className="p-3.5 rounded-2xl glass-pill">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Products Counted
                </div>
                <div className="mt-1 font-mono text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {metrics.productsCounted}{' '}
                  <span className="text-sm font-normal text-slate-400">
                    / {products.length}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl glass-pill">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Total Units
                </div>
                <div className="mt-1 font-mono text-2xl font-extrabold text-slate-900 dark:text-white">
                  {metrics.totalUnits}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl glass-pill">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Active Categories
                </div>
                <div className="mt-1 font-mono text-2xl font-extrabold text-slate-900 dark:text-white">
                  {
                    Object.values(metrics.categoryCounts).filter((count) => count > 0)
                      .length
                  }{' '}
                  <span className="text-sm font-normal text-slate-400">
                    / {categories.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Catalog & Category Management Actions */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenManageProducts}
                className="min-h-[42px] px-4 py-2 rounded-2xl futuristic-cta text-xs font-bold flex items-center gap-1.5 transition touch-manipulation select-none"
              >
                <Settings2 className="w-4 h-4" />
                <span>+ Add / Edit Products</span>
              </button>

              <button
                type="button"
                onClick={onOpenManageCategories}
                className="min-h-[42px] px-4 py-2 rounded-2xl glass-pill text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition touch-manipulation select-none"
              >
                <FolderCog className="w-4 h-4 text-emerald-500" />
                <span>Manage Categories</span>
              </button>

              <button
                type="button"
                onClick={onOpenResetConfirm}
                disabled={metrics.productsCounted === 0}
                className="min-h-[42px] px-3.5 py-2 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 disabled:opacity-40 text-xs font-bold flex items-center gap-1.5 transition touch-manipulation select-none"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Counts</span>
              </button>
            </div>
          </section>

          {/* Live Category Breakdown & Filter Table */}
          <section
            className={`rounded-3xl p-5 ${
              highContrast
                ? 'bg-slate-950 border-2 border-white text-white'
                : 'glass-card'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Category Progress (Click to Filter Handheld View)
              </h3>
              {selectedCategory !== 'All' && (
                <button
                  type="button"
                  onClick={() => onSelectCategory('All')}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Show All Categories
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {categories.map((cat) => {
                const itemsInCat = products.filter((p) => p.category === cat);
                const countedInCat = metrics.categoryCounts[cat] || 0;
                const unitsInCat = itemsInCat.reduce(
                  (sum, p) => sum + (quantities[p.id] || 0),
                  0
                );
                const pct =
                  itemsInCat.length > 0
                    ? Math.round((countedInCat / itemsInCat.length) * 100)
                    : 0;
                const isSelected = selectedCategory === cat;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      onSelectCategory(isSelected ? 'All' : cat)
                    }
                    className={`p-3.5 rounded-2xl text-left transition touch-manipulation select-none ${
                      isSelected
                        ? 'glass-card-active'
                        : 'glass-pill hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {cat}
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {countedInCat}/{itemsInCat.length} items · {unitsInCat}u
                      </span>
                    </div>
                    <div className="mt-2 w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Live Web Export & Plain Text Summary Box */}
          <section
            className={`rounded-3xl p-5 space-y-3.5 ${
              highContrast
                ? 'bg-slate-950 border-2 border-white text-white'
                : 'glass-card'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Live Export &amp; Report Preview
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {countedList.length === 0
                    ? 'Increment any product on the left to populate the live report.'
                    : `${countedList.length} counted products ready for clipboard or CSV export.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-2xl futuristic-cta text-xs font-bold flex items-center gap-1.5 transition touch-manipulation select-none"
                >
                  {copiedSummary ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="min-h-[38px] px-3 py-1.5 rounded-2xl glass-pill text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition touch-manipulation select-none"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Download .CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="min-h-[38px] px-3 py-1.5 rounded-2xl glass-pill text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition touch-manipulation select-none"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Download .TXT</span>
                </button>
              </div>
            </div>

            {exportFeedback && (
              <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{exportFeedback}</span>
              </div>
            )}

            <pre className="p-4 rounded-2xl bg-slate-950/90 text-slate-100 font-mono text-xs overflow-x-auto border border-white/10 leading-relaxed max-h-60">
              {plainTextSummary}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
};
