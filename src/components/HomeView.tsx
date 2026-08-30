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
  AlertCircle
} from 'lucide-react';
import { CategoryInfo } from '../types';

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
  const { categories, requests, users, currentUser, setActiveView, setSelectedRequestId } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const verifiedPros = users.filter(u => u.isProfessional);
  const openRequests = requests.filter(r => r.status === 'PENDING' || r.status === 'QUOTES_RECEIVED').slice(0, 4);

  return (
    <div className="space-y-10 pb-16">
      
      {/* Hero Section */}
      <section id="hero-banner" className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white p-8 md:p-12 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-semibold backdrop-blur-xs">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Red Nacional de Profesionales Matriculados & Verificados</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Solucioná cualquier arreglo o refacción con <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-300">Garantía Escrow</span>.
          </h1>

          <p className="text-slate-300 text-base md:text-lg max-w-2xl leading-relaxed">
            Publicá tu necesidad en segundos. Recibí cotizaciones formales de especialistas verificados en tu zona y pagá con total seguridad: los fondos solo se liberan cuando estás 100% conforme.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              id="hero-btn-request"
              onClick={onOpenNewRequest}
              className="px-6 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm sm:text-base shadow-lg shadow-sky-500/25 transition-all flex items-center gap-2.5 cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Pedir Presupuesto Gratis</span>
            </button>

            <button
              id="hero-btn-pros"
              onClick={() => setActiveView('professionals')}
              className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm sm:text-base border border-white/20 backdrop-blur-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Ver Profesionales Verificados</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-700/60 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Garantía de Satisfacción</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Matrículas & Antecedentes</span>
            </div>
            <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Pago en Cuotas con Mercado Pago</span>
            </div>
          </div>
        </div>
      </section>

      {/* Escrow Guarantee Highlight */}
      <section className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base md:text-lg">Protección Escrow CONEXA</h3>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Tu dinero queda retenido en una cuenta en custodia segura hasta que el profesional culmine la tarea y vos confirmes la recepción conforme. Cero riesgos de anticipos perdidos.
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveView('transactions')}
          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold whitespace-nowrap shadow-xs cursor-pointer"
        >
          Conocer Cómo Funciona
        </button>
      </section>

      {/* Categories Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Rubros y Especialidades</h2>
            <p className="text-xs text-slate-500">Seleccioná un rubro para solicitar presupuestos o ver profesionales disponibles</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-sky-400 hover:shadow-md transition-all text-left group cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between w-full mb-3">
                <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {ICON_MAP[cat.iconName] || <Wrench className="w-6 h-6 text-sky-600" />}
                </div>
                {cat.popular && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                    Popular
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm group-hover:text-sky-700 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
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
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Solicitudes Recientes en Tu Zona</h2>
              <p className="text-xs text-slate-500">Clientes esperando cotizaciones de especialistas</p>
            </div>
            <button
              onClick={() => setActiveView('requests')}
              className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {openRequests.map(req => (
              <div
                key={req.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 capitalize">
                        {req.category}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        req.urgency === 'EMERGENCY' ? 'bg-red-100 text-red-800' :
                        req.urgency === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {req.urgency === 'EMERGENCY' ? 'Urgencia 24hs' : req.urgency === 'HIGH' ? 'Alta Prioridad' : 'Normal'}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">{req.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{req.description}</p>
                  </div>
                  {req.budgetArs && (
                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-400">Presupuesto ref.</div>
                      <div className="font-bold text-slate-900 text-sm">${req.budgetArs.toLocaleString('es-AR')}</div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {req.zone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {req.quotesCount} {req.quotesCount === 1 ? 'presupuesto' : 'presupuestos'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {currentUser.role === 'PROFESSIONAL' ? (
                      <button
                        onClick={() => onOpenSubmitQuote(req.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Enviar Cotización
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedRequestId(req.id);
                          setActiveView('requests');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
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
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Profesionales Top</h2>
              <p className="text-xs text-slate-500">Verificados y calificados</p>
            </div>
            <button
              onClick={() => setActiveView('professionals')}
              className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {verifiedPros.map(pro => (
              <div
                key={pro.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5"
              >
                <img
                  src={pro.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100'}
                  alt={pro.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{pro.name}</h3>
                    {pro.isProfessionalVerified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{pro.matricula || pro.zone}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      {pro.rating || 5.0}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 font-medium">{pro.completedJobs || 12} trabajos</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 text-xs text-sky-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-sky-700" />
              <span>¿Sos profesional matriculado?</span>
            </div>
            <p className="text-sky-800 leading-relaxed">
              Sumate a CONEXA RMX para recibir solicitudes directas, cobrar seguro vía Mercado Pago y construir tu reputación online.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
