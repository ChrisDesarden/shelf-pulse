import React, { useState } from 'react';
import { X, Minus, Plus, Package, ScanBarcode, Pencil, ArrowLeft } from 'lucide-react';
import type { Product } from '../data/products';
import { useLanguage } from '../i18n/LanguageContext';
import {
  translateBarcodeLabel,
  translateCategory,
  translateProductName,
  translateUnit,
} from '../i18n/translations';
import { getBarcodeFormatLabel } from '../utils/inventoryLogic';
import { BarcodeSVG } from './BarcodeSVG';

interface BarcodeLightboxModalProps {
  product: Product | null;
  quantity: number;
  onClose: () => void;
  onQuantityChange: (productId: string, nextQuantity: number) => void;
  onEditProduct?: (product: Product) => void;
}

export const BarcodeLightboxModal: React.FC<BarcodeLightboxModalProps> = ({
  product,
  quantity,
  onClose,
  onQuantityChange,
  onEditProduct,
}) => {
  const { locale, t } = useLanguage();
  const [imgError, setImgError] = useState(false);

  if (!product) return null;

  const displayName = translateProductName(product.name, locale);
  const displayCategory = translateCategory(product.category, locale);
  const displayUnit = translateUnit(product.unit, locale);

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
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <ScanBarcode className="w-4 h-4 shrink-0" />
              <span>{t.handheldScannerMode}</span>
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
            aria-label={t.backDone}
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

        {/* Quick Quantity Adjustment inside Lightbox */}
        <div className="mt-3.5 flex items-center justify-between gap-2.5 pt-3 border-t border-slate-200/70 dark:border-white/[0.08]">
          <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
            {t.currentCountLabel(displayUnit)}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onQuantityChange(product.id, Math.max(0, quantity - 1))}
              disabled={quantity <= 0}
              aria-label={`Decrease lightbox quantity for ${displayName}`}
              className="min-w-[42px] min-h-[42px] rounded-2xl glass-pill text-slate-900 dark:text-white disabled:opacity-40 flex items-center justify-center touch-manipulation select-none"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="w-12 text-center font-mono text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => onQuantityChange(product.id, quantity + 1)}
              aria-label={`Increase lightbox quantity for ${displayName}`}
              className="min-w-[42px] min-h-[42px] rounded-2xl futuristic-cta flex items-center justify-center touch-manipulation select-none"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mt-3.5 flex items-center gap-2">
          {onEditProduct && (
            <button
              type="button"
              onClick={() => {
                const target = product;
                onClose();
                onEditProduct(target);
              }}
              className="min-h-[44px] px-3.5 rounded-2xl glass-pill text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition touch-manipulation select-none shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{t.editInfo}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-2xl futuristic-cta font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition touch-manipulation select-none"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.backDone}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

