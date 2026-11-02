import React, { useState } from 'react';
import { Copy, Check, Share2, Layers, List, Barcode } from 'lucide-react';
import type { Product } from '../data/products';
import {
  formatInventorySummaryText,
  getCountedProducts,
  type QuantityMap,
} from '../utils/inventoryLogic';
import { BarcodeSVG } from './BarcodeSVG';

interface SummaryViewProps {
  products: Product[];
  quantities: QuantityMap;
  formattedDate: string;
  highContrast: boolean;
  onBackToEdit: () => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  products,
  quantities,
  formattedDate,
  highContrast,
  onBackToEdit,
}) => {
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [includeUpc, setIncludeUpc] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const countedItems = getCountedProducts(products, quantities);
  const totalUnits = countedItems.reduce((acc, item) => acc + item.quantity, 0);

  const plainTextSummary = formatInventorySummaryText(products, quantities, {
    dateString: formattedDate,
    groupByCategory,
    includeUpc,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const fallbackCopyTextToClipboard = (text: string): boolean => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch {
      success = false;
    }
    document.body.removeChild(textArea);
    return success;
  };

  const handleCopy = async () => {
    let copiedOk = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(plainTextSummary);
        copiedOk = true;
      } catch {
        copiedOk = fallbackCopyTextToClipboard(plainTextSummary);
      }
    } else {
      copiedOk = fallbackCopyTextToClipboard(plainTextSummary);
    }

    if (copiedOk) {
      setCopied(true);
      showToast('Copied to Clipboard!');
      window.setTimeout(() => setCopied(false), 2500);
    } else {
      showToast('Copy failed — please select and copy from the preview box.');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Inventory Count - ${formattedDate}`,
          text: plainTextSummary,
        });
        showToast('Shared inventory summary.');
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    await handleCopy();
    showToast('Share sheet unavailable on this browser — copied to clipboard instead!');
  };

  const groupedCountedItems = React.useMemo(() => {
    const map = new Map<string, Array<{ product: Product; quantity: number }>>();
    for (const entry of countedItems) {
      const list = map.get(entry.product.category) || [];
      list.push(entry);
      map.set(entry.product.category, list);
    }
    return Array.from(map.entries());
  }, [countedItems]);

  return (
    <div className="min-h-screen flex flex-col pb-32">
      {/* Sticky Top Frosted Glass Header */}
      <header
        className={`sticky top-0 z-30 border-b ${
          highContrast
            ? 'bg-slate-950 border-slate-700 text-white'
            : 'glass-bar'
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToEdit}
            className={`min-h-[44px] px-3.5 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 transition active:scale-95 touch-manipulation select-none whitespace-nowrap shrink-0 ${
              highContrast
                ? 'bg-slate-800 text-white border-2 border-white'
                : 'glass-pill text-slate-900 dark:text-white'
            }`}
          >
            <span>&lt;- Back to Edit</span>
          </button>

          <div className="text-right min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
              Inventory Summary
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {countedItems.length} Products · {totalUnits} Total Units
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-4 space-y-5">
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl futuristic-cta px-4 py-3 text-sm font-bold flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Formatting Controls Card */}
        <section
          aria-label="Export Formatting Controls"
          className={`rounded-3xl p-4 ${
            highContrast
              ? 'bg-slate-900 border-2 border-slate-600 text-white'
              : 'glass-card'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setGroupByCategory(true)}
                className={`flex-1 sm:flex-initial min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition touch-manipulation select-none whitespace-nowrap ${
                  groupByCategory
                    ? 'futuristic-cta'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Group by Category</span>
              </button>
              <button
                type="button"
                onClick={() => setGroupByCategory(false)}
                className={`flex-1 sm:flex-initial min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition touch-manipulation select-none whitespace-nowrap ${
                  !groupByCategory
                    ? 'futuristic-cta'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Flat List</span>
              </button>
            </div>

            <label className="min-h-[44px] px-3.5 py-2 rounded-2xl glass-pill flex items-center justify-between sm:justify-start gap-3 cursor-pointer touch-manipulation select-none">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <Barcode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Include UPC in copied text</span>
              </span>
              <input
                type="checkbox"
                checked={includeUpc}
                onChange={(e) => setIncludeUpc(e.target.checked)}
                className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
              />
            </label>
          </div>
        </section>

        {/* Two-column layout on desktop: Left = Visual Summary Cards, Right = Plain Text Copy Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <section className="lg:col-span-7 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 px-1">
              Counted Items ({countedItems.length})
            </h2>

            {groupByCategory ? (
              <div className="space-y-4">
                {groupedCountedItems.map(([category, entries]) => (
                  <div
                    key={category}
                    className={`rounded-3xl overflow-hidden ${
                      highContrast
                        ? 'bg-slate-950 border-2 border-slate-600'
                        : 'glass-card'
                    }`}
                  >
                    <div className="px-4 py-2.5 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/70 dark:border-white/[0.07] flex items-center justify-between">
                      <h3 className="text-xs font-extrabold tracking-wide text-slate-800 dark:text-slate-200">
                        {category}
                      </h3>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        {entries.length} {entries.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-200/60 dark:divide-white/[0.06]">
                      {entries.map(({ product, quantity }) => (
                        <div
                          key={product.id}
                          className="px-4 py-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {product.name}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                UPC {product.upc}
                              </span>
                              <BarcodeSVG
                                upc={product.upc}
                                height={20}
                                width={1.05}
                                displayValue={false}
                              />
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-mono text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                              {quantity}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {product.unit || 'Units'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`rounded-3xl overflow-hidden divide-y divide-slate-200/60 dark:divide-white/[0.06] ${
                  highContrast
                    ? 'bg-slate-950 border-2 border-slate-600'
                    : 'glass-card'
                }`}
              >
                {countedItems.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {product.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {product.category} · <span className="font-mono">UPC {product.upc}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                        {quantity}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {product.unit || 'Units'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between px-1">
              <label
                htmlFor="plain-text-preview"
                className="text-sm font-bold text-slate-700 dark:text-slate-300"
              >
                Plain Text Preview (Exact Copy Output)
              </label>
            </div>
            <textarea
              id="plain-text-preview"
              readOnly
              rows={Math.max(8, Math.min(18, plainTextSummary.split('\n').length + 2))}
              value={plainTextSummary}
              onClick={(e) => e.currentTarget.select()}
              className={`w-full rounded-3xl p-4 font-mono text-xs sm:text-sm leading-relaxed border focus:outline-2 focus:outline-emerald-500 ${
                highContrast
                  ? 'bg-slate-950 border-2 border-white text-emerald-300'
                  : 'glass-card bg-slate-900/90 dark:bg-slate-950/80 text-slate-100 border-white/10'
              }`}
            />
          </section>
        </div>
      </main>

      {/* Sticky Bottom Copy & Share Frosted Glass Bar */}
      <footer
        className={`fixed bottom-0 left-0 right-0 z-30 border-t ${
          highContrast
            ? 'bg-slate-950 border-t-2 border-white'
            : 'glass-bar'
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className={`flex-1 min-h-[52px] px-5 py-3 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2.5 transition active:scale-[0.99] touch-manipulation select-none ${
              copied
                ? 'bg-emerald-500 text-slate-950 shadow-lg'
                : 'futuristic-cta'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 stroke-[3]" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5 stroke-[2.5]" />
                <span>Copy to Clipboard</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleShare}
            aria-label="Share inventory count"
            className={`min-h-[52px] px-5 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] touch-manipulation select-none shrink-0 ${
              highContrast
                ? 'bg-slate-800 text-white border-2 border-white'
                : 'glass-pill text-slate-900 dark:text-white'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Share...</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
