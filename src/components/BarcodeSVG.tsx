import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import {
  isValidEan8,
  isValidUpcA,
  isValidUpcE,
  toCanonicalUpcE8,
} from '../utils/inventoryLogic';

interface BarcodeSVGProps {
  upc: string;
  height?: number;
  width?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}

export const BarcodeSVG: React.FC<BarcodeSVGProps> = ({
  upc,
  height = 28,
  width = 1.35,
  displayValue = false,
  fontSize = 12,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cleanUpc = (upc || '').trim();

  useEffect(() => {
    if (!svgRef.current || !cleanUpc) return;

    const canonicalUpcE = toCanonicalUpcE8(cleanUpc);
    const isUpcEFormat =
      Boolean(canonicalUpcE) &&
      (isValidUpcE(cleanUpc) || !isValidEan8(cleanUpc));

    const preferredFormat = isValidUpcA(cleanUpc)
      ? 'UPC'
      : isUpcEFormat
      ? 'UPCE'
      : isValidEan8(cleanUpc)
      ? 'EAN8'
      : /^\d{13}$/.test(cleanUpc)
      ? 'EAN13'
      : 'CODE128';

    const valueToEncode =
      preferredFormat === 'UPCE' && canonicalUpcE ? canonicalUpcE : cleanUpc;

    try {
      JsBarcode(svgRef.current, valueToEncode, {
        format: preferredFormat,
        lineColor: '#020617',
        background: '#ffffff',
        width,
        height,
        displayValue,
        font: 'JetBrains Mono, monospace',
        fontSize,
        textMargin: 3,
        margin: 4,
      });
    } catch {
      try {
        JsBarcode(svgRef.current, cleanUpc, {
          format: 'CODE128',
          lineColor: '#020617',
          background: '#ffffff',
          width,
          height,
          displayValue,
          font: 'JetBrains Mono, monospace',
          fontSize,
          textMargin: 3,
          margin: 4,
        });
      } catch {
        // Leave SVG empty if string cannot be encoded
      }
    }
  }, [cleanUpc, height, width, displayValue, fontSize]);

  return (
    <div
      className={`inline-flex items-center justify-center bg-white rounded-md px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}
      title={`Barcode ${cleanUpc}`}
    >
      <svg
        ref={svgRef}
        className="max-w-full h-auto block"
        role="img"
        aria-label={`Barcode for UPC ${cleanUpc}`}
      />
    </div>
  );
};

