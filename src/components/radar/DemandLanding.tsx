import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Shield, Sparkles, CheckCircle, ArrowRight, Star, MapPin, UserCheck, Lock, Radio } from 'lucide-react';

interface DemandLandingProps {
  opportunityId?: string;
  categoryName?: string;
  city?: string;
  onCloseLanding?: () => void;
}

export const DemandLanding: React.FC<DemandLandingProps> = ({
  opportunityId = 'RAD-101',
  categoryName = 'Electricidad',
  city = 'Santiago del Estero',
  onCloseLanding
}) => {
  const { radarOpportunities, users, convertRadarOpportunity, setCurrentUser, createServiceRequest } = useApp();

  const opp = radarOpportunities.find(o => o.id === opportunityId) || radarOpportunities[0];
  const [isConverted, setIsConverted] = useState(false);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);

  // Filter top matched professionals from mock data
  const matchedPros = users.filter(u => u.role === 'PROFESSIONAL' && u.isProfessionalVerified).slice(0, 3);

  const handleConvertAction = () => {
    convertRadarOpportunity(opp.id, 'user-converted-1');
    setIsConverted(true);
  };

  const handleCreateInstantRequest = () => {
    createServiceRequest({
      title: `Solicitud Urgente: ${opp.subcategory || opp.category}`,
      category: opp.category,
      professionName: opp.subcategory || opp.category,
      description: opp.description,
      location: {
        city: opp.city,
        province: opp.province,
        neighborhoodPrivate: opp.neighborhood,
        exactAddressPrivate: ''
      },
      urgency: opp.urgency === 'EMERGENCY' ? 'URGENTE' : 'ESTE_MES'
    });
    setIsCreatingRequest(true);
    setTimeout(() => {
      if (onCloseLanding) onCloseLanding();
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Banner */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-500/20">
              C
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-lg text-white">CONEXA</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <Radio size={10} className="animate-pulse" /> DEMANDA VERIFICADA
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Red segura de profesionales verificados en Argentina</p>
            </div>
          </div>

          {onCloseLanding && (
            <button
              onClick={onCloseLanding}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-xl border border-slate-700 transition-colors"
            >
              Ir a la App
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8 flex-1">
        {/* Opportunity Card Preview */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <span className="text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
              <Sparkles size={12} /> Oportunidad Seleccionada #{opp.id}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
              <MapPin size={12} className="text-emerald-400" /> {opp.city} — {opp.neighborhood || 'Zona Centro'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-3">
            ¿Necesitás un especialista en <span className="text-emerald-400">{opp.category}</span> en {opp.city}?
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed mb-6 bg-slate-950/50 p-4 rounded-2xl border border-slate-800 italic">
            "{opp.description}"
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 flex items-center gap-2.5">
              <Shield className="text-emerald-400 shrink-0" size={18} />
              <div>
                <p className="font-bold text-white">Identidad Verificada</p>
                <p className="text-slate-400 text-[10px]">Documentación oficial validada</p>
              </div>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 flex items-center gap-2.5">
              <Lock className="text-emerald-400 shrink-0" size={18} />
              <div>
                <p className="font-bold text-white">Privacidad Resguardada</p>
                <p className="text-slate-400 text-[10px]">Tu número y datos no son públicos</p>
              </div>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 flex items-center gap-2.5">
              <CheckCircle className="text-emerald-400 shrink-0" size={18} />
              <div>
                <p className="font-bold text-white">Sin Comisiones</p>
                <p className="text-slate-400 text-[10px]">Presupuestos transparentes sin recargos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Matched Professionals List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <UserCheck className="text-emerald-400" size={20} />
              Profesionales Recomendados Cercanos ({matchedPros.length})
            </h2>
            <span className="text-xs text-slate-400">Verificados en {opp.city}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {matchedPros.map((pro) => (
              <div key={pro.id} className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 space-y-3 transition-all">
                <div className="flex items-center gap-3">
                  <img
                    src={pro.avatar}
                    alt={pro.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/50"
                  />
                  <div>
                    <h3 className="font-bold text-white text-sm">{pro.name}</h3>
                    <p className="text-xs text-emerald-400 font-semibold">{pro.professionName}</p>
                    <div className="flex items-center gap-1 mt-0.5 text-amber-400 text-xs font-bold">
                      <Star size={12} fill="currentColor" /> {pro.rating} <span className="text-slate-400 font-normal">({pro.reviewCount} opiniones)</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2">{pro.bioPrivate || 'Especialista verificado con amplia experiencia en trabajos residenciales y comerciales.'}</p>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
                  <span className="flex items-center gap-1"><MapPin size={11} className="text-emerald-400" /> {pro.location.city}</span>
                  <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Responde rápido</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Conversion Box */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
          <h3 className="text-xl sm:text-2xl font-black text-white">
            {isConverted ? "¡Excelente! Ya estás conectado a CONEXA" : "Conectá con profesionales de confianza sin compartir tu teléfono públicamente"}
          </h3>
          <p className="text-emerald-100 text-xs sm:text-sm max-w-xl mx-auto">
            {isConverted
              ? "Hemos preparado tu solicitud de presupuesto para que los profesionales verificados te respondan sin compromiso."
              : "Registrate en segundos como Cliente. Publicá tu necesidad y recibí presupuestos claros de profesionales verificados en tu zona."}
          </p>

          {!isConverted ? (
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleConvertAction}
                className="w-full sm:w-auto px-8 py-4 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105"
              >
                <span>Continuar como Cliente Gratis</span>
                <ArrowRight size={18} className="text-emerald-400" />
              </button>
            </div>
          ) : (
            <div className="pt-2 space-y-3 animate-fade-in">
              <button
                onClick={handleCreateInstantRequest}
                disabled={isCreatingRequest}
                className="px-8 py-4 bg-white text-slate-950 hover:bg-slate-100 font-extrabold text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 mx-auto cursor-pointer transition-all"
              >
                {isCreatingRequest ? (
                  <span>Creando Solicitud en la App...</span>
                ) : (
                  <>
                    <CheckCircle size={18} className="text-emerald-600" />
                    <span>Publicar esta necesidad en CONEXA</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 text-slate-500 text-[11px] py-6 px-4 text-center space-y-1">
        <p>© 2026 CONEXA — Red de Servicios Profesionales en Argentina. Todos los derechos reservados.</p>
        <p className="text-slate-600">Procesado con privacidad por el módulo CONEXA RADAR (Garantía PII Free & Anti-Spam).</p>
      </footer>
    </div>
  );
};
