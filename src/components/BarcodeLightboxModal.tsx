import React, { useState } from 'react';
import { X, Minus, Plus, Package, ScanBarcode, Pencil, ArrowLeft } from 'lucide-react';
import type { Product } from '../data/products';
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
  const [imgError, setImgError] = useState(false);

  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-product-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[calc(100dvh-20px)] overflow-y-auto overflow-x-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xl text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <ScanBarcode className="w-4 h-4 shrink-0" />
              <span>Handheld Scanner Mode</span>
            </div>
            <h2
              id="lightbox-product-title"
              className="mt-1 text-base sm:text-xl font-bold leading-snug text-slate-900 dark:text-white"
            >
              {product.name}
            </h2>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>{product.category}</span>
              {product.unit && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Unit: {product.unit}</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close scanner lightbox"
            className="min-w-[42px] min-h-[42px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition touch-manipulation select-none shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Enlarged Product Image */}
        <div className="mt-3 w-32 h-32 sm:w-48 sm:h-48 mx-auto rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
          {!imgError && product.image ? (
            <img
              src={product.image}
              alt={product.name}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-center text-slate-500">
              <Package className="w-10 h-10 text-emerald-500 mb-1.5" />
              <span className="text-xs font-semibold">{product.name}</span>
            </div>
          )}
        </div>

        {/* High-contrast Scannable Barcode Pad */}
        <div className="mt-3.5 rounded-2xl bg-white p-3 sm:p-4 border-2 border-slate-300 shadow-inner flex flex-col items-center justify-center overflow-hidden">
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
            {getBarcodeFormatLabel(product.upc)} / {product.upc}
          </div>
        </div>

        {/* Quick Quantity Adjustment inside Lightbox */}
        <div className="mt-3.5 flex items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
            Current Count ({product.unit || 'Units'})
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onQuantityChange(product.id, Math.max(0, quantity - 1))}
              disabled={quantity <= 0}
              aria-label={`Decrease lightbox quantity for ${product.name}`}
              className="min-w-[42px] min-h-[42px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-40 flex items-center justify-center touch-manipulation select-none"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="w-12 text-center font-mono text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => onQuantityChange(product.id, quantity + 1)}
              aria-label={`Increase lightbox quantity for ${product.name}`}
              className="min-w-[42px] min-h-[42px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center touch-manipulation select-none"
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
              className="min-h-[44px] px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition touch-manipulation select-none shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Info</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-xl bg-slate-900 dark:bg-emerald-600 hover:opacity-95 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition touch-manipulation select-none"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back / Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
