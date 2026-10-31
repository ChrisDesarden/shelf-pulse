import React, { useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-semibold flex items-center gap-1.5 transition touch-manipulation select-none whitespace-nowrap shrink-0 shadow-xs"
        aria-label="Install App"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="min-h-[40px] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition touch-manipulation select-none whitespace-nowrap shrink-0"
        aria-label={isIOS ? 'Install on iOS' : 'PWA Home Screen Guide'}
        title="Add to Home Screen instructions"
      >
        <Download className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="hidden sm:inline">{isIOS ? 'Install on iOS' : 'Install PWA'}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xl">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 id="pwa-guide-title" className="text-base font-bold text-slate-900 dark:text-white">
                Add to Home Screen
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 touch-manipulation"
                aria-label="Close install guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Install <strong>Daily Inventory</strong> as a full-screen offline app for warehouse and cooler counting:
              </p>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <Share className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white text-xs">1. iOS Safari</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Tap the <strong>Share</strong> icon in the bottom toolbar, then select <strong>Add to Home Screen</strong>.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <PlusSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white text-xs">2. Android Chrome</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Tap the browser menu <strong>⋮</strong> and select <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-sm font-semibold hover:opacity-95 transition touch-manipulation select-none"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
