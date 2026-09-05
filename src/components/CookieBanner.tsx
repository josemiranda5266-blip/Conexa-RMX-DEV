import React, { useState, useEffect } from 'react';
import { Shield, Cookie, Check, X, Settings2 } from 'lucide-react';

export const CookieBanner: React.FC<{ onOpenPrivacy: () => void }> = ({ onOpenPrivacy }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  useEffect(() => {
    const consent = localStorage.getItem('conexa_cookie_consent');
    if (!consent) {
      // Delay slightly for smooth entering
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('conexa_cookie_consent', JSON.stringify({
      necessary: true,
      analytics: true,
      timestamp: new Date().toISOString()
    }));
    setIsVisible(false);
  };

  const handleAcceptNecessaryOnly = () => {
    localStorage.setItem('conexa_cookie_consent', JSON.stringify({
      necessary: true,
      analytics: false,
      timestamp: new Date().toISOString()
    }));
    setIsVisible(false);
  };

  const handleSaveCustom = () => {
    localStorage.setItem('conexa_cookie_consent', JSON.stringify({
      necessary: true,
      analytics: analyticsEnabled,
      timestamp: new Date().toISOString()
    }));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-3xl p-5 shadow-2xl text-white space-y-4 animate-in slide-in-from-bottom-5 duration-300">
      
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-red-600/10 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
          <Cookie className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-extrabold text-white">Privacidad & Cookies</h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-zinc-300 border border-slate-700">
              Ley 25.326
            </span>
          </div>
          <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
            Utilizamos cookies técnicas y analíticas esenciales para garantizar la seguridad de tus pagos en custodia, autenticación y funcionamiento de la plataforma.
          </p>
        </div>
      </div>

      {showConfig && (
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-slate-800 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Cookies Técnicas Esenciales</span>
              <span className="text-[10px] text-zinc-400">Requeridas para sesiones, cotizaciones y custodia de pagos</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded">
              Obligatorias
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
            <div>
              <span className="font-bold text-white block">Cookies Analíticas & Rendimiento</span>
              <span className="text-[10px] text-zinc-400">Para optimizar tiempos de carga y respuesta de profesionales</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={analyticsEnabled}
                onChange={e => setAnalyticsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center gap-2">
          {showConfig ? (
            <button
              type="button"
              onClick={handleSaveCustom}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer text-center"
            >
              Guardar Preferencias
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all cursor-pointer text-center"
              >
                Aceptar Todas
              </button>
              <button
                type="button"
                onClick={handleAcceptNecessaryOnly}
                className="py-2.5 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold text-xs border border-slate-700 transition-all cursor-pointer text-center"
              >
                Solo Necesarias
              </button>
            </>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="hover:text-white underline cursor-pointer flex items-center gap-1"
          >
            <Settings2 className="w-3 h-3" />
            <span>{showConfig ? 'Ocultar ajustes' : 'Personalizar cookies'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenPrivacy}
            className="hover:text-white underline cursor-pointer"
          >
            Ver Política de Privacidad
          </button>
        </div>
      </div>

    </div>
  );
};
