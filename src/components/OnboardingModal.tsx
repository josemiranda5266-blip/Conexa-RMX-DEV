import React from 'react';
import { ShieldCheck, PhoneOff, MapPin, Search, ArrowRight, X, CheckCircle2, Wrench, MessageSquare, DollarSign, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleMode?: 'CLIENT' | 'PROFESSIONAL';
  onStartProSetup?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ 
  isOpen, 
  onClose,
  roleMode,
  onStartProSetup
}) => {
  const { currentUser } = useApp();
  if (!isOpen) return null;

  const activeMode = roleMode || currentUser.activeMode || (currentUser.isProfessional ? 'PROFESSIONAL' : 'CLIENT');

  const CLIENT_ITEMS = [
    {
      title: 'Encontrá profesionales cerca tuyo',
      desc: 'Buscá especialistas certificados en Santiago del Estero según tu necesidad.',
      icon: <Search className="text-blue-600" size={20} />
    },
    {
      title: 'Chateá sin compartir inicialmente tu teléfono',
      desc: 'Mantené tu número privado hasta que decidas compartirlo con el profesional.',
      icon: <PhoneOff className="text-purple-600" size={20} />
    },
    {
      title: 'Solicitá presupuestos',
      desc: 'Recibí propuestas claras, detalladas y sin costo compromiso.',
      icon: <DollarSign className="text-emerald-600" size={20} />
    },
    {
      title: 'Elegí con quién trabajar',
      desc: 'Compará calificaciones, opiniones reales y experiencia verificada.',
      icon: <CheckCircle2 className="text-teal-600" size={20} />
    }
  ];

  const PRO_ITEMS = [
    {
      title: 'Mostrá lo que hacés',
      desc: 'Publicá tus servicios, especialidades y fotos de trabajos realizados.',
      icon: <Wrench className="text-emerald-600" size={20} />
    },
    {
      title: 'Recibí solicitudes cercanas',
      desc: 'Visualizá clientes que necesitan tus servicios en tu zona de cobertura.',
      icon: <MapPin className="text-blue-600" size={20} />
    },
    {
      title: 'Enviá presupuestos',
      desc: 'Enviá cotizaciones directamente al chat de clientes interesados.',
      icon: <DollarSign className="text-indigo-600" size={20} />
    },
    {
      title: 'Construí tu reputación',
      desc: 'Suma opiniones positivas y destaca con tu insignia de verificación.',
      icon: <Star className="text-amber-500" size={20} />
    }
  ];

  const items = activeMode === 'PROFESSIONAL' ? PRO_ITEMS : CLIENT_ITEMS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        id="onboarding-modal-card"
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 relative max-h-[90vh] overflow-y-auto"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="space-y-5">
          <div className="text-center space-y-2">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border ${
              activeMode === 'PROFESSIONAL' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-blue-700 bg-blue-50 border-blue-200'
            }`}>
              {activeMode === 'PROFESSIONAL' ? '🧰 Modo Profesional CONEXA' : '👤 Modo Cliente CONEXA'}
            </span>

            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {activeMode === 'PROFESSIONAL' ? 'Mostrá lo que hacés y conseguí trabajo' : 'Encontrá profesionales cerca tuyo'}
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Conexiones locales transparentes con protección de teléfono y domicilio.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {items.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shrink-0 shadow-2xs">
                  {item.icon}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{item.title}</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-100/90 rounded-2xl border border-slate-200 text-slate-600 text-[11px] flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-600 shrink-0" />
            <span>Tus datos personales (teléfono y dirección) están protegidos y nunca son públicos.</span>
          </div>

          {activeMode === 'PROFESSIONAL' ? (
            <button
              onClick={() => {
                onClose();
                if (onStartProSetup) onStartProSetup();
              }}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
            >
              <span>CREAR MI PERFIL PROFESIONAL</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
            >
              <span>EMPEZAR</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
