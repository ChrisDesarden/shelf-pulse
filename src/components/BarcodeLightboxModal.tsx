import React, { useState } from 'react';
import { X, Minus, Plus, Package, ScanBarcode, Pencil } from 'lucide-react';
import type { Product } from '../data/products';
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
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-product-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <ScanBarcode className="w-4 h-4" />
              <span>Handheld Scanner Mode</span>
            </div>
            <h2
              id="lightbox-product-title"
              className="mt-1 text-lg sm:text-xl font-bold leading-snug text-slate-900 dark:text-white"
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
            className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition touch-manipulation select-none shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Enlarged Product Image */}
        <div className="mt-4 w-44 h-44 sm:w-52 sm:h-52 mx-auto rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
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
              <Package className="w-12 h-12 text-emerald-500 mb-2" />
              <span className="text-xs font-semibold">{product.name}</span>
            </div>
          )}
        </div>

        {/* High-contrast Scannable Barcode Pad */}
        <div className="mt-5 rounded-2xl bg-white p-4 border-2 border-slate-300 shadow-inner flex flex-col items-center justify-center">
          <BarcodeSVG
            upc={product.upc}
            height={76}
            width={2.3}
            displayValue={true}
            fontSize={16}
            className="border-0 shadow-none"
          />
          <div className="mt-1 font-mono text-xs font-semibold text-slate-600 tracking-widest">
            UPC-A / {product.upc}
          </div>
        </div>

        {/* Quick Quantity Adjustment inside Lightbox */}
        <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Current Count ({product.unit || 'Units'})
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onQuantityChange(product.id, Math.max(0, quantity - 1))}
              disabled={quantity <= 0}
              aria-label={`Decrease lightbox quantity for ${product.name}`}
              className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-40 flex items-center justify-center touch-manipulation select-none"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="w-14 text-center font-mono text-xl font-bold text-slate-900 dark:text-white">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => onQuantityChange(product.id, quantity + 1)}
              aria-label={`Increase lightbox quantity for ${product.name}`}
              className="min-w-[44px] min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center touch-manipulation select-none"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          {onEditProduct && (
            <button
              type="button"
              onClick={() => {
                const target = product;
                onClose();
                onEditProduct(target);
              }}
              className="min-h-[48px] px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition touch-manipulation select-none shrink-0"
            >
              <Pencil className="w-4 h-4" />
              <span>Edit Info</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-xl bg-slate-900 dark:bg-emerald-600 hover:opacity-95 text-white font-semibold text-sm transition touch-manipulation select-none"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
};
