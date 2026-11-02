import React, { useState, useEffect } from 'react';
import {
  X,
  Minus,
  Plus,
  Package,
  ScanBarcode,
  Pencil,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import type { Product } from '../data/products';
import { useLanguage } from '../i18n/LanguageContext';
import {
  translateBarcodeLabel,
  translateCategory,
  translateProductName,
  translateUnit,
} from '../i18n/translations';
import {
  getBarcodeFormatLabel,
  getCategoryNavigation,
} from '../utils/inventoryLogic';
import { BarcodeSVG } from './BarcodeSVG';

interface BarcodeLightboxModalProps {
  product: Product | null;
  products?: Product[];
  quantity: number;
  onClose: () => void;
  onQuantityChange: (productId: string, nextQuantity: number) => void;
  onSelectProduct?: (product: Product) => void;
  onEditProduct?: (product: Product) => void;
}

export const BarcodeLightboxModal: React.FC<BarcodeLightboxModalProps> = ({
  product,
  products = [],
  quantity,
  onClose,
  onQuantityChange,
  onSelectProduct,
  onEditProduct,
}) => {
  const { locale, t } = useLanguage();
  const [imgError, setImgError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState<string>(String(quantity));

  useEffect(() => {
    setImgError(false);
    setIsEditing(false);
    setDraftValue(String(quantity));
  }, [product?.id]);

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(String(quantity));
    }
  }, [quantity, isEditing]);

  if (!product) return null;

  const displayName = translateProductName(product.name, locale);
  const displayCategory = translateCategory(product.category, locale);
  const displayUnit = translateUnit(product.unit, locale);

  const { currentIndex, totalInCategory, prevProduct, nextProduct } =
    getCategoryNavigation(products, product);

  const prevDisplayName = prevProduct
    ? translateProductName(prevProduct.name, locale)
    : '';
  const nextDisplayName = nextProduct
    ? translateProductName(nextProduct.name, locale)
    : '';

  const handleDecrement = () => {
    const next = Math.max(0, quantity - 1);
    onQuantityChange(product.id, next);
  };

  const handleIncrement = () => {
    const next = quantity + 1;
    onQuantityChange(product.id, next);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditing(true);
    setDraftValue(String(quantity));
    e.target.select();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setDraftValue('');
      return;
    }
    const digitsOnly = raw.replace(/[^\d]/g, '');
    if (digitsOnly === '') {
      setDraftValue('');
      return;
    }
    const parsed = Math.min(99999, Math.max(0, parseInt(digitsOnly, 10)));
    setDraftValue(String(parsed));
    onQuantityChange(product.id, parsed);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (draftValue.trim() === '') {
      setDraftValue('0');
      onQuantityChange(product.id, 0);
    } else {
      const parsed = Math.min(99999, Math.max(0, parseInt(draftValue, 10) || 0));
      setDraftValue(String(parsed));
      onQuantityChange(product.id, parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xl flex items-center justify-center p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-product-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[calc(100dvh-20px)] overflow-y-auto overflow-x-hidden rounded-[28px] glass-modal p-4 sm:p-6 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <ScanBarcode className="w-4 h-4 shrink-0" />
                <span>{t.handheldScannerMode}</span>
              </div>
              {totalInCategory > 0 && (
                <span
                  data-testid="lightbox-category-position"
                  className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/25"
                >
                  {t.categoryPositionBadge(
                    currentIndex + 1,
                    totalInCategory,
                    displayCategory
                  )}
                </span>
              )}
            </div>
            <h2
              id="lightbox-product-title"
              className="mt-1 text-base sm:text-xl font-bold leading-snug text-slate-900 dark:text-white"
            >
              {displayName}
            </h2>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>{displayCategory}</span>
              {product.unit && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {t.unitPrefix} {displayUnit}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeScannerAria}
            className="min-w-[42px] min-h-[42px] rounded-2xl glass-pill flex items-center justify-center text-slate-700 dark:text-slate-200 transition touch-manipulation select-none shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Enlarged Product Image */}
        <div className="mt-3 w-32 h-32 sm:w-48 sm:h-48 mx-auto rounded-3xl overflow-hidden bg-slate-100/80 dark:bg-slate-800/80 border border-white/60 dark:border-white/[0.1] shadow-sm flex items-center justify-center">
          {!imgError && product.image ? (
            <img
              src={product.image}
              alt={displayName}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-center text-slate-500">
              <Package className="w-10 h-10 text-emerald-500 mb-1.5" />
              <span className="text-xs font-semibold">{displayName}</span>
            </div>
          )}
        </div>

        {/* High-contrast Scannable Barcode Pad */}
        <div className="mt-3.5 rounded-2xl bg-white p-3 sm:p-4 border border-slate-200/90 shadow-inner flex flex-col items-center justify-center overflow-hidden">
          <div className="max-w-full overflow-hidden flex justify-center">
            <BarcodeSVG
              upc={product.upc}
              height={64}
              width={2.0}
              displayValue={true}
              fontSize={15}
              className="border-0 shadow-none max-w-full"
            />
          </div>
          <div className="mt-1 font-mono text-xs font-semibold text-slate-600 tracking-widest">
            {translateBarcodeLabel(getBarcodeFormatLabel(product.upc), locale)} / {product.upc}
          </div>
        </div>

        {/* Quick Quantity Adjustment & Direct Manual Count Input inside Lightbox */}
        <div className="mt-3.5 flex items-center justify-between gap-2.5 pt-3 border-t border-slate-200/70 dark:border-white/[0.08]">
          <label
            htmlFor="lightbox-quantity-input"
            className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300"
          >
            {t.currentCountLabel(displayUnit)}
          </label>
          <div className="flex items-center rounded-2xl p-1 gap-1.5 shrink-0 bg-slate-100/85 dark:bg-slate-900/75 border border-white/70 dark:border-white/[0.08] shadow-inner">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={quantity <= 0}
              aria-label={`Decrease lightbox quantity for ${displayName}`}
              className="min-w-[42px] min-h-[42px] rounded-xl glass-pill text-slate-900 dark:text-white disabled:opacity-40 flex items-center justify-center touch-manipulation select-none transition active:scale-95"
            >
              <Minus className="w-5 h-5" />
            </button>

            <input
              id="lightbox-quantity-input"
              data-testid="lightbox-quantity-input"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={0}
              max={99999}
              aria-label={`Quantity for ${displayName}`}
              value={isEditing ? draftValue : String(quantity)}
              onFocus={handleFocus}
              onChange={handleInputChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={`w-16 sm:w-20 min-h-[42px] text-center font-mono text-lg sm:text-xl font-extrabold rounded-xl px-1.5 transition focus:outline-2 focus:outline-emerald-500 ${
                quantity > 0
                  ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35'
                  : 'bg-white/75 dark:bg-slate-800/75 text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/[0.08]'
              }`}
            />

            <button
              type="button"
              onClick={handleIncrement}
              aria-label={`Increase lightbox quantity for ${displayName}`}
              className="min-w-[42px] min-h-[42px] rounded-xl futuristic-cta flex items-center justify-center touch-manipulation select-none transition active:scale-95"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bottom Action Row: Edit Info + Split Back (Previous Product) & Next (Next Product) in Category */}
        <div className="mt-3.5 flex items-center gap-2">
          {onEditProduct && (
            <button
              type="button"
              onClick={() => {
                const target = product;
                onClose();
                onEditProduct(target);
              }}
              className="min-h-[44px] px-3 sm:px-3.5 rounded-2xl glass-pill text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition touch-manipulation select-none shrink-0"
            >
              <Pencil className="w-3.5 h-3.5 shrink-0" />
              <span>{t.editInfo}</span>
            </button>
          )}

          <div className="flex-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="lightbox-prev-btn"
              disabled={!prevProduct || !onSelectProduct}
              onClick={() => {
                if (prevProduct && onSelectProduct) {
                  onSelectProduct(prevProduct);
                }
              }}
              aria-label={
                prevProduct ? t.prevProductAria(prevDisplayName) : t.prevProductBtn
              }
              title={prevProduct ? prevDisplayName : undefined}
              className="min-h-[44px] px-2.5 rounded-2xl glass-pill text-slate-900 dark:text-white hover:border-emerald-500/40 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-[0.98] touch-manipulation select-none"
            >
              <ArrowLeft className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
              <span className="truncate">{t.prevProductBtn}</span>
            </button>

            <button
              type="button"
              data-testid="lightbox-next-btn"
              disabled={!nextProduct || !onSelectProduct}
              onClick={() => {
                if (nextProduct && onSelectProduct) {
                  onSelectProduct(nextProduct);
                }
              }}
              aria-label={
                nextProduct ? t.nextProductAria(nextDisplayName) : t.nextProductBtn
              }
              title={nextProduct ? nextDisplayName : undefined}
              className="min-h-[44px] px-2.5 rounded-2xl futuristic-cta disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-[0.98] touch-manipulation select-none"
            >
              <span className="truncate">{t.nextProductBtn}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
