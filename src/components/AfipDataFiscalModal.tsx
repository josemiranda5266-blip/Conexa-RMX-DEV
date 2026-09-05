import React from 'react';
import {
  QrCode,
  Building,
  ShieldCheck,
  CheckCircle2,
  FileText,
  X,
  ExternalLink,
  MapPin,
  Calendar,
  Hash
} from 'lucide-react';

interface AfipDataFiscalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AfipDataFiscalModal: React.FC<AfipDataFiscalModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 border-2 border-sky-600 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 relative my-8 animate-in fade-in zoom-in duration-150 font-sans">
        
        {/* Top Header - Formulario 960/D */}
        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sky-600 rounded-2xl text-white font-black flex items-center justify-center text-sm tracking-wider shadow-md">
              AFIP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-sky-800 bg-sky-100 px-2 py-0.5 rounded-md">
                  FORMULARIO 960/D
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">DATA FISCAL</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                Constancia de Identificación Fiscal
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Official Data Fiscal Badge Box */}
        <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            
            {/* Simulated interactive QR Code Data Fiscal */}
            <div className="w-28 h-28 bg-white p-2 rounded-xl border border-sky-300 shadow-sm flex flex-col items-center justify-center shrink-0">
              <QrCode className="w-20 h-20 text-sky-950" />
              <span className="text-[8px] font-mono text-sky-800 mt-1 font-bold">AFIP F.960/D</span>
            </div>

            {/* Entity Fiscal Data */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-start gap-1">
                <span className="text-slate-500 font-medium">Razón Social:</span>
                <span className="font-extrabold text-slate-900">CONEXA RMX SERVICIOS DIGITALES S.A.S.</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">CUIT:</span>
                <span className="font-mono font-black text-sky-800 bg-sky-100/80 px-1.5 py-0.5 rounded">
                  30-71829340-9
                </span>
              </div>

              <div className="flex items-start gap-1">
                <span className="text-slate-500 font-medium">Domicilio Fiscal:</span>
                <span className="font-medium text-slate-800">Av. del Libertador 4980, Piso 8, CABA, Argentina</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">Condición IVA:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  IVA Responsable Inscripto
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">Actividad Principal:</span>
                <span className="font-medium text-slate-800">Servicios de Intermediación Digital (620900)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Regulatory Information Note */}
        <div className="text-[11px] text-slate-600 leading-relaxed space-y-2 border-t border-slate-200 pt-3">
          <p>
            <strong>Cumplimiento RG AFIP N° 3377/12:</strong> La presente constancia interactiva acredita la inscripción tributaria, situación impositiva regular y habilitación legal para la prestación de servicios de plataforma digital en todo el territorio de la República Argentina.
          </p>
          <p className="text-slate-500 text-[10px]">
            Los profesionales independientes y prestadores de servicios matriculados adheridos emiten sus propios comprobantes de facturación (Factura A / B / C) por los trabajos realizados directamente a los clientes.
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <a
            href="https://www.afip.gob.ar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1"
          >
            <span>Verificar en AFIP / ARCA</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-sm transition-all"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
