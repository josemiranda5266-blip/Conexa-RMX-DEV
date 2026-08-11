import React, { useState } from 'react';
import { Search, Briefcase, ArrowRight, ShieldCheck, CheckCircle2, Sparkles, X, UserCheck, Wrench } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClient: () => void;
  onSelectProfessional: () => void;
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectClient,
  onSelectProfessional
}) => {
  const { currentUser } = useApp();
  const [showExplanation, setShowExplanation] = useState(false);

  if (!isOpen) return null;

  const hasPro = currentUser.hasProfessionalProfile || currentUser.isProfessional;

  const handleProfessionalClick = () => {
    if (hasPro) {
      onSelectProfessional();
    } else {
      setShowExplanation(true);
    }
  };

  const handleClose = () => {
    setShowExplanation(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        id="role-selection-card"
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 border border-slate-200 relative overflow-hidden"
      >
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X size={20} />
        </button>

        {!showExplanation ? (
          <>
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs">
                <Sparkles size={14} className="text-blue-600" />
                <span>Cuenta Unificada CONEXA</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                ¿Cómo querés usar CONEXA?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Una misma cuenta te permite buscar servicios como Cliente y ofrecer servicios como Profesional.
              </p>
            </div>

            {/* Two Large Distinct Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: Cliente */}
              <div 
                onClick={onSelectClient}
                className="group relative p-5 bg-gradient-to-b from-blue-50/80 to-indigo-50/40 rounded-3xl border-2 border-blue-200 hover:border-blue-600 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 group-hover:scale-110 transition-transform">
                    <Search size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold tracking-wider uppercase text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                      BUSCAR Y CONTRATAR
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1.5 group-hover:text-blue-700 transition-colors">
                      👤 MODO CLIENTE
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Encontrá profesionales, chateá y solicitá presupuestos.
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectClient();
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <span>ENTRAR COMO CLIENTE</span>
                  <ArrowRight size={15} />
                </button>
              </div>

              {/* Card 2: Profesional */}
              <div 
                onClick={handleProfessionalClick}
                className="group relative p-5 bg-gradient-to-b from-emerald-50/80 to-teal-50/40 rounded-3xl border-2 border-emerald-200 hover:border-emerald-600 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 group-hover:scale-110 transition-transform">
                    <Wrench size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold tracking-wider uppercase text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                      OFRECER SERVICIOS
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1.5 group-hover:text-emerald-700 transition-colors">
                      🧰 MODO PROFESIONAL
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Mostrá tus servicios, recibí solicitudes y enviá presupuestos.
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProfessionalClick();
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <span>ENTRAR COMO PROFESIONAL</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* Footer info banner */}
            <div className="mt-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-600">
              <ShieldCheck size={18} className="text-blue-600 shrink-0" />
              <p className="leading-tight">
                <strong>Privacidad Garantizada:</strong> Tu teléfono y domicilio no se muestran públicamente en ningún caso.
              </p>
            </div>
          </>
        ) : (
          /* Step 2: Explanation before professional form */
          <div className="space-y-5 animate-fade-in">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
                <Wrench size={28} />
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                Creá tu perfil profesional
              </h2>
              <p className="text-sm text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 py-2 px-3 rounded-2xl max-w-md mx-auto">
                «Convertí tu cuenta CONEXA en una cuenta de Cliente + Profesional.»
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <p><strong>Cuenta Unificada:</strong> No necesitas crear un usuario separado ni ingresar una nueva contraseña.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <p><strong>Privacidad Protegida:</strong> Tu teléfono y domicilio exacto continúan ocultos y protegidos.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <UserCheck size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                <p><strong>Control Total:</strong> Podrás cambiar de modo al instante desde el selector del menú superior en cualquier momento.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={() => setShowExplanation(false)}
                className="w-full sm:w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Volver atrás
              </button>
              <button
                onClick={() => {
                  setShowExplanation(false);
                  onSelectProfessional();
                }}
                className="w-full sm:w-1/2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <span>CREAR PERFIL PROFESIONAL</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
