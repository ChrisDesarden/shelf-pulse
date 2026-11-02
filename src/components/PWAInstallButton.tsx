import React, { useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useLanguage } from '../i18n/LanguageContext';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { locale, t } = useLanguage();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="min-h-[40px] px-3 py-1.5 rounded-2xl futuristic-cta active:scale-[0.98] text-xs font-semibold flex items-center gap-1.5 transition touch-manipulation select-none whitespace-nowrap shrink-0"
        aria-label={t.installApp}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">{t.installApp}</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="min-h-[40px] px-2.5 py-1.5 rounded-2xl glass-pill text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 transition touch-manipulation select-none whitespace-nowrap shrink-0"
        aria-label={isIOS ? t.installOnIos : t.installPwa}
        title={t.addToHomeScreen}
      >
        <Download className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="hidden sm:inline">{isIOS ? t.installOnIos : t.installPwa}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xl p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl glass-modal p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/70 dark:border-white/[0.08]">
              <h3 id="pwa-guide-title" className="text-base font-bold text-slate-900 dark:text-white">
                {t.addToHomeScreen}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-w-[36px] min-h-[36px] rounded-xl glass-pill flex items-center justify-center text-slate-500 touch-manipulation"
                aria-label={t.cancel}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === 'es' ? (
                  <>
                    Instala <strong>Inventario Diario</strong> como aplicación sin conexión de pantalla completa:
                  </>
                ) : (
                  <>
                    Install <strong>Daily Inventory</strong> as a full-screen offline app for warehouse and cooler counting:
                  </>
                )}
              </p>
              <div className="flex items-start gap-3 p-3 rounded-2xl glass-pill">
                <Share className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white text-xs">1. iOS Safari</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {locale === 'es' ? (
                      <>
                        Toca el icono <strong>Compartir</strong> en la barra inferior y selecciona <strong>Agregar a inicio</strong>.
                      </>
                    ) : (
                      <>
                        Tap the <strong>Share</strong> icon in the bottom toolbar, then select <strong>Add to Home Screen</strong>.
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-2xl glass-pill">
                <PlusSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white text-xs">2. Android Chrome</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {locale === 'es' ? (
                      <>
                        Toca el menú <strong>⋮</strong> del navegador y selecciona <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla principal</strong>.
                      </>
                    ) : (
                      <>
                        Tap the browser menu <strong>⋮</strong> and select <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-2xl futuristic-cta text-sm font-semibold transition touch-manipulation select-none"
            >
              {t.gotIt}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

