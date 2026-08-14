import React, { useState } from 'react';
import { Shield, EyeOff, CheckCircle2, ChevronRight, X } from 'lucide-react';

export const PrivacyBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div id="privacy-banner-card" className="bg-slate-900/85 backdrop-blur-xl text-white rounded-3xl p-5 shadow-2xl border border-white/20 my-3 transition-all relative overflow-hidden">
      <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none"></div>
      
      <button 
        onClick={() => setDismissed(true)}
        className="absolute top-3.5 right-3.5 text-slate-300 hover:text-white bg-white/10 p-1.5 rounded-full hover:bg-white/20 transition-colors border border-white/10"
        aria-label="Cerrar aviso"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3.5 pr-6">
        <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl shrink-0 mt-0.5 border border-emerald-500/30 backdrop-blur-md">
          <Shield size={22} />
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-100 text-base">Red Privada CONEXA</h4>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 backdrop-blur-md">
              Privacy by Design
            </span>
          </div>
          <p className="text-slate-300/90 leading-relaxed text-xs sm:text-sm">
            Tu número telefónico y domicilio exacto <strong className="text-white">NO se muestran públicamente</strong>. Encontrá profesionales, conversá en privado y compartí tus datos de contacto solo cuando vos lo decidas voluntariamente.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-xs text-slate-300 font-medium">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 size={13} /> Teléfono oculto por defecto
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 size={13} /> Ubicación en zona aproximada
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 size={13} /> Sin reseñas falsas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
