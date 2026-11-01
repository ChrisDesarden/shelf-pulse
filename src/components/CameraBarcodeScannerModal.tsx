import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Camera,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ScanBarcode,
} from 'lucide-react';
import {
  computeUpcCheckDigit,
  computeUpcE8,
  decodeUpcFromLuminanceRow,
  getBarcodeFormatLabel,
  normalizeScannedUpc,
} from '../utils/inventoryLogic';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (upc: string) => void;
  title?: string;
}

// Type declaration for browser BarcodeDetector API where supported
interface DetectedBarcode {
  rawValue: string;
  format?: string;
}
interface NativeBarcodeDetector {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats: string[] }): NativeBarcodeDetector;
    };
  }
}

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onDetected,
  title = 'Scan Product Barcode',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraState, setCameraState] = useState<'starting' | 'active' | 'error'>('starting');
  const [cameraError, setCameraError] = useState<string>('');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [photoScanStatus, setPhotoScanStatus] = useState<string>('');

  const stopCameraStream = () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {
          // Ignore track stop errors
        }
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const triggerDetectedSuccess = (upcString: string) => {
    const normalized = normalizeScannedUpc(upcString);
    if (!normalized) return false;
    setScannedResult(normalized);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(60);
      } catch {
        // Ignore vibration errors
      }
    }
    stopCameraStream();
    window.setTimeout(() => {
      onDetected(normalized);
    }, 350);
    return true;
  };

  /**
   * Scans an HTMLVideoElement or HTMLImageElement frame using both native BarcodeDetector (if available)
   * and our multi-scanline 1D UPC-A / EAN-13 luminance decoder.
   */
  const decodeFrameSource = async (
    source: HTMLVideoElement | HTMLImageElement,
    width: number,
    height: number
  ): Promise<string | null> => {
    if (width <= 0 || height <= 0) return null;

    // 1. Try native hardware BarcodeDetector API first if available
    if (typeof window !== 'undefined' && window.BarcodeDetector) {
      try {
        const detector = new window.BarcodeDetector({
          formats: [
            'upc_a',
            'upc_e',
            'ean_13',
            'ean_8',
            'code_128',
            'code_39',
            'code_93',
            'itf',
            'codabar',
          ],
        });
        const results = await detector.detect(source);
        if (results && results.length > 0) {
          for (const res of results) {
            const code = normalizeScannedUpc(res.rawValue);
            if (code) return code;
          }
        }
      } catch {
        // Fallback to canvas scanline decoder below
      }
    }

    // 2. Pure TypeScript multi-scanline 1D UPC-A / EAN-13 canvas luminance decoder
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const targetW = Math.min(640, width);
    const targetH = Math.min(480, height);
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, targetW, targetH);

    // Sample 9 horizontal scanlines across the middle band (where the barcode is aimed)
    const scanYRatios = [0.5, 0.45, 0.55, 0.4, 0.6, 0.35, 0.65, 0.3, 0.7];
    const rowLuminance = new Uint8Array(targetW);

    for (const ratio of scanYRatios) {
      const y = Math.max(0, Math.min(targetH - 1, Math.floor(targetH * ratio)));
      const imgData = ctx.getImageData(0, y, targetW, 1).data;
      for (let x = 0; x < targetW; x++) {
        const idx = x * 4;
        // Standard BT.601 luma
        rowLuminance[x] = Math.round(
          0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2]
        );
      }
      const decoded = decodeUpcFromLuminanceRow(rowLuminance);
      if (decoded) {
        return decoded;
      }
    }

    return null;
  };

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      return;
    }

    let cancelled = false;
    let scanIntervalId: number | undefined;
    setScannedResult(null);
    setPhotoScanStatus('');
    setCameraState('starting');
    setCameraError('');

    const startCamera = async () => {
      stopCameraStream();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (!cancelled) {
          setCameraState('error');
          setCameraError(
            'Live camera streaming is not supported in this browser context. Use "Scan from Photo" below.'
          );
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (cancelled) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraState('active');

        // Poll video frames every 160ms (~6 FPS) for low battery impact & instant recognition
        scanIntervalId = window.setInterval(async () => {
          if (cancelled || !videoRef.current) return;
          const v = videoRef.current;
          if (v.readyState < 2 || v.videoWidth === 0) return;

          const code = await decodeFrameSource(v, v.videoWidth, v.videoHeight);
          if (code && !cancelled) {
            if (scanIntervalId) window.clearInterval(scanIntervalId);
            triggerDetectedSuccess(code);
          }
        }, 160);
      } catch (err) {
        if (!cancelled) {
          setCameraState('error');
          setCameraError(
            err instanceof Error && err.name === 'NotAllowedError'
              ? 'Camera permission was denied. Allow camera access or tap "Scan from Photo" below.'
              : 'Could not access camera stream. You can take a barcode photo or test scan below.'
          );
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (scanIntervalId) window.clearInterval(scanIntervalId);
      stopCameraStream();
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoScanStatus('Scanning barcode from photo...');

    const imgUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      const code = await decodeFrameSource(img, img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(imgUrl);
      if (code) {
        setPhotoScanStatus(`Detected ${getBarcodeFormatLabel(code)}: ${code}!`);
        triggerDetectedSuccess(code);
      } else {
        setPhotoScanStatus(
          'Could not detect a clear barcode (UPC-E, EAN-8, or UPC-A) in that image. Try moving closer to the barcode.'
        );
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(imgUrl);
      setPhotoScanStatus('Failed to load image file.');
    };
    img.src = imgUrl;
    e.target.value = '';
  };

  const handleSimulateSampleScan = () => {
    const randomEleven =
      '0' +
      Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
    const validUpc = computeUpcCheckDigit(randomEleven);
    triggerDetectedSuccess(validUpc);
  };

  const handleSimulateShortUpcScan = () => {
    const randomSix = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
    const validUpcE = computeUpcE8(randomSix);
    triggerDetectedSuccess(validUpcE);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-scanner-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[calc(100dvh-20px)] overflow-y-auto overflow-x-hidden rounded-3xl bg-slate-900 border border-slate-700 p-4 sm:p-5 shadow-2xl text-white flex flex-col gap-3.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back from camera scanner"
              className="min-h-[38px] px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition touch-manipulation select-none shrink-0"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Back</span>
            </button>
            <div className="min-w-0">
              <h2
                id="camera-scanner-title"
                className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5 truncate"
              >
                <ScanBarcode className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{title}</span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close camera scanner"
            className="min-w-[38px] min-h-[38px] rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200 touch-manipulation select-none shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewfinder Box */}
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border-2 border-slate-700 flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover ${
              cameraState === 'active' ? 'opacity-100' : 'opacity-20'
            }`}
          />

          {/* Hidden canvas for multi-scanline 1D barcode decoding */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Target Reticle & Laser Scanline Overlay */}
          {cameraState === 'active' && !scannedResult && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-5">
              <div className="w-full max-w-[260px] h-32 rounded-2xl border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(2,6,23,0.52)] relative flex items-center justify-center overflow-hidden">
                {/* Laser scanline */}
                <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_#10b981]" />
              </div>
              <span className="mt-2.5 px-2.5 py-1 rounded-full bg-slate-950/85 text-[11px] font-semibold text-emerald-300 border border-emerald-500/40">
                Align barcode (Short UPC, UPC-E, EAN-8, or 12-Digit) inside box
              </span>
            </div>
          )}

          {/* Starting / Error / Success Overlay States */}
          {cameraState === 'starting' && !scannedResult && (
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
              <Camera className="w-8 h-8 text-emerald-400 mb-2" />
              <p className="text-xs font-semibold text-slate-200">
                Starting rear camera barcode scanner...
              </p>
            </div>
          )}

          {cameraState === 'error' && !scannedResult && (
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
              <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
              <p className="text-xs font-semibold text-slate-200 max-w-xs leading-relaxed">
                {cameraError}
              </p>
            </div>
          )}

          {scannedResult && (
            <div className="absolute inset-0 bg-emerald-950/95 flex flex-col items-center justify-center p-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2" />
              <div className="text-xs uppercase tracking-wider font-extrabold text-emerald-300">
                Barcode Scanned!
              </div>
              <div className="mt-1 font-mono text-xl font-extrabold text-white tracking-widest">
                {scannedResult}
              </div>
            </div>
          )}
        </div>

        {/* Camera Controls & Photo Capture Fallback */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
            }
            className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition touch-manipulation select-none"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Flip Camera</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition touch-manipulation select-none"
          >
            <ImageIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Scan from Photo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoFileChange}
            className="hidden"
          />
        </div>

        {photoScanStatus && (
          <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-200 text-center">
            {photoScanStatus}
          </div>
        )}

        {/* Quick Test Scan (8-Digit & 12-Digit) & Close Footer */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSimulateShortUpcScan}
              data-testid="simulate-short-barcode-scan-btn"
              className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1 transition touch-manipulation select-none whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Test 8-Digit</span>
            </button>
            <button
              type="button"
              onClick={handleSimulateSampleScan}
              data-testid="simulate-barcode-scan-btn"
              className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1 transition touch-manipulation select-none whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Test 12-Digit</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition touch-manipulation select-none"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
