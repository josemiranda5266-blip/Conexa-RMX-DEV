import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Search,
  CheckCircle2,
  Star,
  MapPin,
  ShieldCheck,
  Award,
  MessageSquare,
  FileCheck,
  ChevronRight,
  Sparkles,
  Phone,
  Mail
} from 'lucide-react';
import { User } from '../types';
import { isUserCandidateProfessional } from '../domain/professionalEligibility';

export const ProfessionalsView: React.FC<{
  onOpenNewRequest: () => void;
}> = ({ onOpenNewRequest }) => {
  const { users, categories, createConversation, setSelectedConversationId, setActiveView, reviews } = useApp();

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [selectedPro, setSelectedPro] = useState<User | null>(null);

  const pros = users.filter(isUserCandidateProfessional);

  const filteredPros = pros.filter(pro => {
    if (onlyVerified && !pro.isProfessionalVerified) return false;
    if (categoryFilter !== 'ALL' && (!pro.categories || !pro.categories.includes(categoryFilter))) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        pro.name.toLowerCase().includes(q) ||
        pro.zone?.toLowerCase().includes(q) ||
        pro.bio?.toLowerCase().includes(q) ||
        pro.matricula?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleStartChat = (proId: string) => {
    const convId = createConversation(proId);
    setSelectedConversationId(convId);
    setActiveView('messages');
  };

  const proReviews = selectedPro ? reviews.filter(r => r.professionalId === selectedPro.id) : [];

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Directorio de Profesionales Verificados</h1>
          <p className="text-sm text-zinc-400">
            Especialistas con matrícula comprobada, antecedentes validados y cobertura de Garantía Escrow.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, matrícula, zona..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-zinc-950 border border-slate-800 rounded-xl focus:outline-none focus:border-red-500/60 focus:bg-zinc-900 text-white transition-all"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm bg-zinc-950 border border-slate-800 rounded-xl focus:outline-none focus:border-red-500/60 text-zinc-200 cursor-pointer"
          >
            <option value="ALL">Todas las especialidades</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300 cursor-pointer select-none px-3 py-2 bg-zinc-950 rounded-xl border border-slate-800">
          <input
            type="checkbox"
            checked={onlyVerified}
            onChange={e => setOnlyVerified(e.target.checked)}
            className="rounded text-red-600 focus:ring-red-500 bg-zinc-900 border-slate-700"
          />
          <span>Solo Matriculados Verificados</span>
        </label>
      </div>

      {/* Grid of Professionals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPros.map(pro => (
          <div
            key={pro.id}
            className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-md hover:shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              
              {/* Header Info */}
              <div className="flex items-start gap-3.5">
                <img
                  src={pro.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120'}
                  alt={pro.name}
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-800 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-white text-base truncate">{pro.name}</h3>
                    {pro.isProfessionalVerified && (
                      <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                  </div>
                  
                  {pro.matricula && (
                    <span className="inline-block text-[11px] font-bold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded-md mt-0.5 border border-emerald-800">
                      {pro.matricula}
                    </span>
                  )}

                  <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {pro.rating || 5.0} ({pro.reviewCount || 10})
                    </span>
                    <span>·</span>
                    <span className="font-medium text-zinc-300">{pro.completedJobs || 15} trabajos</span>
                  </div>
                </div>
              </div>

              {/* Bio & Zone */}
              <div className="space-y-2">
                <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                  {pro.bio || 'Especialista matriculado con experiencia integral en instalaciones, reparaciones y mantenimiento garantizado.'}
                </p>

                <div className="flex items-center gap-1.5 text-xs text-zinc-400 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{pro.zone || 'CABA y Gran Buenos Aires'}</span>
                </div>
              </div>

              {/* Categories badges */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {pro.categories?.map(catId => {
                  const catInfo = categories.find(c => c.id === catId);
                  return (
                    <span key={catId} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-950 text-zinc-300 border border-slate-800 capitalize">
                      {catInfo?.name || catId}
                    </span>
                  );
                })}
              </div>

            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-4 mt-4 border-t border-slate-800">
              <button
                onClick={() => handleStartChat(pro.id)}
                className="px-3 py-2 rounded-xl bg-zinc-950 hover:bg-slate-800 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-800 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Mensaje</span>
              </button>

              <button
                onClick={onOpenNewRequest}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold shadow-md shadow-red-600/30 flex items-center justify-center gap-1.5 border border-red-500/40 transition-all cursor-pointer"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Cotizar</span>
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
