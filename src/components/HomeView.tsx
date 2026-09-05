import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Zap,
  Wrench,
  Snowflake,
  Key,
  Paintbrush,
  Hammer,
  Package,
  Laptop,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  DollarSign,
  ArrowRight,
  Star,
  PlusCircle,
  FileCheck,
  AlertCircle,
  Scale,
  RotateCcw,
  QrCode,
  FileText,
  Shield,
  BookOpen
} from 'lucide-react';
import { CategoryInfo } from '../types';
import { isUserCandidateProfessional } from '../domain/professionalEligibility';
import { RevocationModal } from './RevocationModal';
import { AfipDataFiscalModal } from './AfipDataFiscalModal';

const ICON_MAP: Record<string, React.ReactNode> = {
  Zap: <Zap className="w-6 h-6 text-amber-500" />,
  Wrench: <Wrench className="w-6 h-6 text-sky-500" />,
  Snowflake: <Snowflake className="w-6 h-6 text-cyan-500" />,
  Key: <Key className="w-6 h-6 text-emerald-500" />,
  Paintbrush: <Paintbrush className="w-6 h-6 text-purple-500" />,
  Hammer: <Hammer className="w-6 h-6 text-orange-500" />,
  SquareGantt: <Package className="w-6 h-6 text-yellow-600" />,
  Laptop: <Laptop className="w-6 h-6 text-indigo-500" />
};

export const HomeView: React.FC<{
  onOpenNewRequest: () => void;
  onSelectCategory: (catId: string) => void;
  onOpenSubmitQuote: (requestId: string) => void;
}> = ({ onOpenNewRequest, onSelectCategory, onOpenSubmitQuote }) => {
  const { categories, requests, users, currentUser, setActiveView, setSelectedRequestId, setLegalInitialTab } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRevocationOpen, setIsRevocationOpen] = useState(false);
  const [isDataFiscalOpen, setIsDataFiscalOpen] = useState(false);

  const openLegalTab = (tab: string) => {
    setLegalInitialTab(tab);
    setActiveView('legal');
  };

  const verifiedPros = users.filter(isUserCandidateProfessional);
  const openRequests = requests.filter(r => r.status === 'PENDING' || r.status === 'QUOTES_RECEIVED').slice(0, 4);

  return (
    <div className="space-y-10 pb-16">
      
      {/* Hero Section */}
      <section id="hero-banner" className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-zinc-950 via-slate-900 to-blue-950 text-white p-8 md:p-12 border border-slate-800/80 shadow-2xl shadow-black">
        {/* Subtle glowing background accents */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-red-600/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold backdrop-blur-xs">
            <ShieldCheck className="w-4 h-4 text-red-500" />
            <span>Red Nacional de Profesionales Matriculados & Verificados</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Solucioná cualquier arreglo o refacción con <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-blue-400">Garantía Escrow</span>.
          </h1>

          <p className="text-zinc-300 text-base md:text-lg max-w-2xl leading-relaxed">
            Publicá tu necesidad en segundos. Recibí cotizaciones formales de especialistas verificados en tu zona y pagá con total seguridad: los fondos solo se liberan cuando estás 100% conforme.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              id="hero-btn-request"
              onClick={onOpenNewRequest}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-red-600/30 border border-red-500/50 transition-all flex items-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Pedir Presupuesto Gratis</span>
            </button>

            <button
              id="hero-btn-pros"
              onClick={() => setActiveView('professionals')}
              className="px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white font-semibold text-sm sm:text-base border border-slate-700 backdrop-blur-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Ver Profesionales Verificados</span>
              <ArrowRight className="w-4 h-4 text-red-400" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs text-zinc-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
              <span>Garantía de Satisfacción</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
              <span>Matrículas & Antecedentes</span>
            </div>
            <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
              <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
              <span>Pago en Cuotas con Mercado Pago</span>
            </div>
          </div>
        </div>
      </section>

      {/* Escrow Guarantee Highlight */}
      <section className="bg-gradient-to-r from-slate-900 via-zinc-900 to-blue-950 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-600/30 border border-red-500/40">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base md:text-lg">Protección Escrow CONEXA</h3>
            <p className="text-sm text-zinc-300 mt-1 max-w-2xl">
              Tu dinero queda retenido en una cuenta en custodia segura hasta que el profesional culmine la tarea y vos confirmes la recepción conforme. Cero riesgos de anticipos perdidos.
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveView('transactions')}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 whitespace-nowrap shadow-xs cursor-pointer transition-colors"
        >
          Conocer Cómo Funciona
        </button>
      </section>

      {/* Categories Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Rubros y Especialidades</h2>
            <p className="text-xs text-zinc-400">Seleccioná un rubro para solicitar presupuestos o ver profesionales disponibles</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-red-500/60 hover:bg-slate-900 transition-all text-left group cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md"
            >
              <div className="flex items-center justify-between w-full mb-3">
                <div className="w-11 h-11 rounded-xl bg-zinc-950 border border-slate-800 flex items-center justify-center group-hover:scale-110 group-hover:border-red-500/40 transition-all">
                  {ICON_MAP[cat.iconName] || <Wrench className="w-6 h-6 text-red-500" />}
                </div>
                {cat.popular && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-950/80 text-red-400 border border-red-800/50">
                    Popular
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-white text-sm group-hover:text-red-400 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">
                  {cat.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Live Requests & Top Pros Dual Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Open Requests Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Solicitudes Recientes en Tu Zona</h2>
              <p className="text-xs text-zinc-400">Clientes esperando cotizaciones de especialistas</p>
            </div>
            <button
              onClick={() => setActiveView('requests')}
              className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {openRequests.map(req => (
              <div
                key={req.id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-zinc-950 text-zinc-300 border border-zinc-800 capitalize">
                        {req.category}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        req.urgency === 'EMERGENCY' ? 'bg-red-950 text-red-300 border border-red-800' :
                        req.urgency === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {req.urgency === 'EMERGENCY' ? 'Urgencia 24hs' : req.urgency === 'HIGH' ? 'Alta Prioridad' : 'Normal'}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-base">{req.title}</h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{req.description}</p>
                  </div>
                  {req.budgetArs && (
                    <div className="text-right shrink-0">
                      <div className="text-xs text-zinc-400">Presupuesto ref.</div>
                      <div className="font-bold text-white text-sm">${req.budgetArs.toLocaleString('es-AR')}</div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80 text-xs text-zinc-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      {req.zone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      {req.quotesCount} {req.quotesCount === 1 ? 'presupuesto' : 'presupuestos'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isUserCandidateProfessional(currentUser) ? (
                      <button
                        onClick={() => onOpenSubmitQuote(req.id)}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                      >
                        Enviar Cotización
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedRequestId(req.id);
                          setActiveView('requests');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-200 font-semibold text-xs transition-colors cursor-pointer border border-slate-700"
                      >
                        Ver Detalle
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verified Pros Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Profesionales Top</h2>
              <p className="text-xs text-zinc-400">Verificados y calificados</p>
            </div>
            <button
              onClick={() => setActiveView('professionals')}
              className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {verifiedPros.map(pro => (
              <div
                key={pro.id}
                className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xs flex items-center gap-3.5"
              >
                <img
                  src={pro.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100'}
                  alt={pro.name}
                  className="w-12 h-12 rounded-xl object-cover border border-red-500/30 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-white text-sm truncate">{pro.name}</h3>
                    {pro.isProfessionalVerified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">{pro.matricula || pro.zone}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {pro.rating || 5.0}
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-zinc-300 font-medium">{pro.completedJobs || 12} trabajos</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 border border-slate-800 text-xs text-zinc-200 space-y-3">
            <div className="font-bold text-white flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-red-400" />
              <span>¿Sos profesional matriculado?</span>
            </div>
            <p className="text-zinc-300 leading-relaxed">
              Sumate a CONEXA RMX para recibir solicitudes directas, cobrar seguro vía Mercado Pago y construir tu reputación online.
            </p>
            <button
              onClick={() => setActiveView('verification')}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs shadow-md shadow-red-600/20 border border-red-500/40 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Activar Modo Profesional</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Argentine Legal Compliance Section */}
      <section className="bg-slate-900/60 rounded-3xl p-6 sm:p-8 border border-slate-800/80 shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Transparencia & Marco Legal en Argentina</h3>
              <p className="text-xs text-zinc-400">Protección del consumidor, custodia de fondos y privacidad de datos</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRevocationOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Botón de Arrepentimiento</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDataFiscalOpen(true)}
              className="px-3 py-2 rounded-xl bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1"
            >
              <QrCode className="w-3.5 h-3.5 text-sky-400" />
              <span>Data Fiscal F.960/D</span>
            </button>
          </div>
        </div>

        {/* Legal Link Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <button
            type="button"
            onClick={() => openLegalTab('terms')}
            className="p-3.5 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-slate-800 text-left transition-all cursor-pointer group"
          >
            <FileText className="w-4 h-4 text-red-500 mb-1.5" />
            <div className="font-bold text-white group-hover:text-red-400">Términos y Condiciones</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Locación de servicios & comisiones</div>
          </button>

          <button
            type="button"
            onClick={() => openLegalTab('privacy')}
            className="p-3.5 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-slate-800 text-left transition-all cursor-pointer group"
          >
            <Shield className="w-4 h-4 text-emerald-400 mb-1.5" />
            <div className="font-bold text-white group-hover:text-emerald-300">Protección de Datos</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Ley 25.326 · Órgano de Control AAIP</div>
          </button>

          <button
            type="button"
            onClick={() => openLegalTab('consumer')}
            className="p-3.5 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-slate-800 text-left transition-all cursor-pointer group"
          >
            <Scale className="w-4 h-4 text-amber-400 mb-1.5" />
            <div className="font-bold text-white group-hover:text-amber-300">Defensa del Consumidor</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Ley 24.240 · Ventanilla Única Federal</div>
          </button>

          <button
            type="button"
            onClick={() => openLegalTab('complaints')}
            className="p-3.5 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-slate-800 text-left transition-all cursor-pointer group"
          >
            <BookOpen className="w-4 h-4 text-sky-400 mb-1.5" />
            <div className="font-bold text-white group-hover:text-sky-300">Libro de Quejas Digital</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Registro oficial de reclamos</div>
          </button>
        </div>
      </section>

      {/* Modals */}
      <RevocationModal
        isOpen={isRevocationOpen}
        onClose={() => setIsRevocationOpen(false)}
      />

      <AfipDataFiscalModal
        isOpen={isDataFiscalOpen}
        onClose={() => setIsDataFiscalOpen(false)}
      />

    </div>
  );
};
