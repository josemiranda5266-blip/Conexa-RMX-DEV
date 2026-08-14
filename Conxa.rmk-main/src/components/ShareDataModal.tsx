import React from 'react';
import { PhoneCall, MapPin, ShieldAlert, CheckCircle, X } from 'lucide-react';

interface ShareDataModalProps {
  isOpen: boolean;
  type: 'PHONE' | 'ADDRESS';
  recipientName: string;
  userPhonePrivate: string;
  userAddressPrivate: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ShareDataModal: React.FC<ShareDataModalProps> = ({
  isOpen,
  type,
  recipientName,
  userPhonePrivate,
  userAddressPrivate,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const isPhone = type === 'PHONE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div 
        id="share-data-modal-container"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-5 relative"
      >
        <button 
          onClick={onCancel} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Cerrar modal"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${isPhone ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
            {isPhone ? <PhoneCall size={26} /> : <MapPin size={26} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {isPhone ? 'Compartir teléfono privado' : 'Compartir domicilio exacto'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">Control de privacidad CONEXA</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm space-y-2">
          <p className="text-slate-700 leading-relaxed">
            ¿Querés compartir tu {isPhone ? 'número de teléfono' : 'domicilio exacto'} con <strong className="text-slate-900">{recipientName}</strong>?
          </p>
          <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-slate-800 text-center font-semibold text-base">
            {isPhone ? userPhonePrivate : userAddressPrivate}
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
          <ShieldAlert size={18} className="shrink-0 text-amber-600 mt-0.5" />
          <p>
            Al presionar <strong>Compartir</strong>, este dato se enviará ÚNICAMENTE en este chat privado. Podés deshabilitarlo o bloquear al usuario en cualquier momento.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
              isPhone 
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
            }`}
          >
            <CheckCircle size={16} />
            Compartir ahora
          </button>
        </div>
      </div>
    </div>
  );
};
