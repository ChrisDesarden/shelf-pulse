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
  compressUpcAToUpcE8,
  computeUpcCheckDigit,
  computeUpcE8,
  decodeBarcodeFromRgbaImage,
  getBarcodeFormatLabel,
  normalizeScannedUpc,
  toCanonicalUpcE8,
} from '../utils/inventoryLogic';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (upc: string) => void;
  title?: string;
}

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

  const decodeFrameSource = async (
    source: HTMLVideoElement | HTMLImageElement,
    width: number,
    height: number
  ): Promise<string | null> => {
    if (width <= 0 || height <= 0) return null;

    const canvas = canvasRef.current;
    if (canvas) {
      const maxW = source instanceof HTMLImageElement ? 1280 : 960;
      const scale = width > maxW ? maxW / width : 1;
      const targetW = Math.max(64, Math.round(width * scale));
      const targetH = Math.max(32, Math.round(height * scale));
      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(source, 0, 0, targetW, targetH);
        const imgData = ctx.getImageData(0, 0, targetW, targetH).data;
        const decodedFromBars = decodeBarcodeFromRgbaImage(imgData, targetW, targetH);
        if (decodedFromBars) {
          return decodedFromBars;
        }
      }
    }

    if (typeof window !== 'undefined' && window.BarcodeDetector) {
      try {
        const detector = new window.BarcodeDetector({
          formats: [
            'upc_e',
            'upc_a',
            'ean_8',
            'ean_13',
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
            if (res.format === 'upc_e') {
              const upcE8 =
                toCanonicalUpcE8(res.rawValue) ||
                compressUpcAToUpcE8(res.rawValue) ||
                normalizeScannedUpc(res.rawValue);
              if (upcE8) return upcE8;
            }
            const code = normalizeScannedUpc(res.rawValue);
            if (code) return code;
          }
        }
      } catch {
        // Ignore native detector errors
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
      className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-xl flex items-center justify-center p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-scanner-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[calc(100dvh-20px)] overflow-y-auto overflow-x-hidden rounded-[28px] glass-modal p-4 sm:p-5 text-slate-900 dark:text-white flex flex-col gap-3.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back from camera scanner"
              className="min-h-[38px] px-2.5 py-1 rounded-2xl glass-pill text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition touch-manipulation select-none shrink-0"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Back</span>
            </button>
            <div className="min-w-0">
              <h2
                id="camera-scanner-title"
                className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 truncate"
              >
                <ScanBarcode className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <span className="truncate">{title}</span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close camera scanner"
            className="min-w-[38px] min-h-[38px] rounded-2xl glass-pill flex items-center justify-center text-slate-700 dark:text-slate-200 touch-manipulation select-none shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewfinder Box */}
        <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-slate-950 border border-white/15 shadow-inner flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover ${
              cameraState === 'active' ? 'opacity-100' : 'opacity-20'
            }`}
          />

          <canvas ref={canvasRef} className="hidden" />

          {/* Target Reticle & Laser Scanline Overlay */}
          {cameraState === 'active' && !scannedResult && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-5">
              <div className="w-full max-w-[260px] h-32 rounded-2xl border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(2,6,23,0.52)] relative flex items-center justify-center overflow-hidden">
                <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_#10b981]" />
              </div>
              <span className="mt-2.5 px-2.5 py-1 rounded-full bg-slate-950/85 text-[11px] font-semibold text-emerald-300 border border-emerald-500/40">
                Align barcode (Short UPC, UPC-E, EAN-8, or 12-Digit) inside box
              </span>
            </div>
          )}

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
            className="min-h-[42px] px-3 py-2 rounded-2xl glass-pill text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition touch-manipulation select-none"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <span>Flip Camera</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[42px] px-3 py-2 rounded-2xl glass-pill text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition touch-manipulation select-none"
          >
            <ImageIcon className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 shrink-0" />
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
          <div className="p-2.5 rounded-2xl glass-pill text-xs text-slate-800 dark:text-slate-200 text-center">
            {photoScanStatus}
          </div>
        )}

        {/* Quick Test Scan (8-Digit & 12-Digit) & Close Footer */}
        <div className="pt-2 border-t border-slate-200/70 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSimulateShortUpcScan}
              data-testid="simulate-short-barcode-scan-btn"
              className="min-h-[40px] px-2.5 py-1.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 transition touch-manipulation select-none whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Test 8-Digit</span>
            </button>
            <button
              type="button"
              onClick={handleSimulateSampleScan}
              data-testid="simulate-barcode-scan-btn"
              className="min-h-[40px] px-2.5 py-1.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 transition touch-manipulation select-none whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Test 12-Digit</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-1.5 rounded-2xl glass-pill text-slate-800 dark:text-white text-xs font-bold transition touch-manipulation select-none"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
