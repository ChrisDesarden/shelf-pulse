import React, { useState } from 'react';
import { Minus, Plus, Maximize2, Package, Pencil } from 'lucide-react';
import type { Product } from '../data/products';
import { BarcodeSVG } from './BarcodeSVG';

interface ProductCardProps {
  product: Product;
  quantity: number;
  highContrast: boolean;
  compact?: boolean;
  onQuantityChange: (productId: string, nextQuantity: number) => void;
  onOpenLightbox: (product: Product) => void;
  onEditProduct: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantity,
  highContrast,
  compact = false,
  onQuantityChange,
  onOpenLightbox,
  onEditProduct,
}) => {
  const [imgError, setImgError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(String(quantity));

  const isActive = quantity > 0;

  const handleDecrement = () => {
    if (quantity <= 0) return;
    onQuantityChange(product.id, Math.max(0, quantity - 1));
  };

  const handleIncrement = () => {
    onQuantityChange(product.id, quantity + 1);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditing(true);
    setDraftValue(String(quantity));
    const target = e.currentTarget;
    requestAnimationFrame(() => {
      target.select();
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.currentTarget.select();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    if (raw === '') {
      setDraftValue('');
      onQuantityChange(product.id, 0);
      return;
    }
    const parsed = Math.min(99999, Math.max(0, parseInt(raw, 10) || 0));
    setDraftValue(String(parsed));
    onQuantityChange(product.id, parsed);
  };

  const handleBlur = () => {
    setIsEditing(false);
    setDraftValue(String(quantity));
  };

  const cardSurfaceClass = highContrast
    ? isActive
      ? 'bg-emerald-950/90 border-2 border-emerald-400 text-white'
      : 'bg-slate-950 border-2 border-slate-600 text-white'
    : isActive
    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/70 dark:border-emerald-500/60'
    : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800';

  return (
    <article
      className={`rounded-2xl p-3 transition-colors flex overflow-hidden ${
        compact ? 'flex-col gap-2.5' : 'flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 sm:p-3.5'
      } ${cardSurfaceClass}`}
      data-testid={`product-card-${product.id}`}
    >
      {/* Top / Left section: Thumbnail + Product Name, Category/Unit, Monospace UPC, and Quick Edit */}
      <div className={`flex items-start ${compact ? '' : 'sm:items-center'} gap-3 flex-1 min-w-0`}>
        <button
          type="button"
          onClick={() => onOpenLightbox(product)}
          className={`relative ${
            compact ? 'w-16 h-16' : 'w-16 h-16 sm:w-20 sm:h-20'
          } rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group focus-visible:outline-2 focus-visible:outline-emerald-500 touch-manipulation select-none`}
          aria-label={`Enlarge ${product.name} photo and barcode`}
        >
          {!imgError && product.image ? (
            <img
              src={product.image}
              alt={product.name}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 p-1.5 text-center">
              <Package className="w-6 h-6 mb-0.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-semibold leading-tight line-clamp-2">
                {product.name}
              </span>
            </div>
          )}
          <span className="absolute bottom-1 right-1 w-5 h-5 rounded-md bg-slate-950/75 text-white flex items-center justify-center opacity-90 group-hover:bg-emerald-600 transition-colors">
            <Maximize2 className="w-3 h-3" />
          </span>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`text-sm ${
                compact ? '' : 'sm:text-base'
              } font-bold leading-snug line-clamp-2 min-w-0 flex-1 ${
                highContrast ? 'text-white' : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {product.name}
            </h3>

            <button
              type="button"
              onClick={() => onEditProduct(product)}
              aria-label={`Edit ${product.name}`}
              title="Edit product details"
              className={`min-w-[34px] min-h-[34px] p-1.5 rounded-lg flex items-center justify-center shrink-0 transition touch-manipulation select-none ${
                highContrast
                  ? 'bg-slate-800 text-emerald-300 border border-slate-500 hover:bg-slate-700'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100/70 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            className={`mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs ${
              highContrast
                ? 'text-slate-200 font-medium'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <span>{product.category}</span>
            {product.unit && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {product.unit}
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span
              className={`font-mono text-xs tracking-wider select-all whitespace-nowrap ${
                highContrast
                  ? 'text-emerald-300 font-bold'
                  : 'text-slate-600 dark:text-slate-300 font-semibold'
              }`}
            >
              UPC {product.upc}
            </span>
          </div>

          {/* Desktop/Tablet inline barcode below UPC (only when not in compact phone frame) */}
          {!compact && (
            <div className="hidden sm:block mt-1.5">
              <button
                type="button"
                onClick={() => onOpenLightbox(product)}
                className="text-left focus-visible:outline-2 focus-visible:outline-emerald-500 rounded-md touch-manipulation"
                aria-label={`Scan barcode ${product.upc} for ${product.name}`}
              >
                <BarcodeSVG upc={product.upc} height={24} width={1.2} displayValue={false} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom / Right section: Mobile Barcode + Touch-friendly quantity control (- / input / +) */}
      <div
        className={`flex items-center justify-between ${
          compact
            ? 'pt-2 border-t border-slate-100 dark:border-slate-800/80'
            : 'sm:justify-end pt-2 sm:pt-0 border-t border-slate-100 dark:border-slate-800/80 sm:border-t-0'
        } gap-2 shrink-0 min-w-0`}
      >
        {/* Mobile crisp SVG barcode aligned left of the quantity controls */}
        <button
          type="button"
          onClick={() => onOpenLightbox(product)}
          className={`${
            compact ? 'block' : 'sm:hidden'
          } text-left focus-visible:outline-2 focus-visible:outline-emerald-500 rounded-md touch-manipulation min-w-0 max-w-[48%] overflow-hidden`}
          aria-label={`Scan barcode ${product.upc} for ${product.name}`}
        >
          <BarcodeSVG upc={product.upc} height={24} width={1.1} displayValue={false} />
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={quantity <= 0}
            aria-label={`Decrease quantity for ${product.name}`}
            className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center transition active:scale-95 touch-manipulation select-none ${
              quantity <= 0
                ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 cursor-not-allowed border border-slate-200/60 dark:border-slate-800'
                : highContrast
                ? 'bg-slate-800 text-white border-2 border-white hover:bg-slate-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Minus className="w-5 h-5 stroke-[2.5]" />
          </button>

          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={0}
            max={99999}
            aria-label={`Quantity for ${product.name}`}
            value={isEditing ? draftValue : String(quantity)}
            onFocus={handleFocus}
            onClick={handleClick}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className={`w-14 min-h-[44px] h-11 rounded-xl text-center font-mono text-base font-bold transition focus:outline-2 focus:outline-emerald-500 touch-manipulation ${
              highContrast
                ? isActive
                  ? 'bg-emerald-500 text-slate-950 border-2 border-white'
                  : 'bg-slate-900 text-white border-2 border-slate-500'
                : isActive
                ? 'bg-emerald-600 text-white border border-emerald-700 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700'
            }`}
          />

          <button
            type="button"
            onClick={handleIncrement}
            aria-label={`Increase quantity for ${product.name}`}
            className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center transition active:scale-95 touch-manipulation select-none ${
              highContrast
                ? 'bg-emerald-400 text-slate-950 border-2 border-white hover:bg-emerald-300 font-bold'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
            }`}
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </article>
  );
};
