import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Check,
  Sparkles,
  Layers,
  ChevronRight,
  Filter
} from 'lucide-react';
import { CategoryInfo } from '../types';
import { ALL_RUBROS_CATALOG, RUBRO_GROUPS } from '../data/rubrosData';
import { RubroIcon } from './RubroIcon';

interface RubroSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRubro: (rubro: CategoryInfo) => void;
  selectedRubroId?: string;
  alreadyAddedRubroIds?: string[];
  title?: string;
  subtitle?: string;
}

export const RubroSelectorModal: React.FC<RubroSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectRubro,
  selectedRubroId,
  alreadyAddedRubroIds = [],
  title = 'Buscar y Seleccionar Rubro Profesional',
  subtitle = 'Explorá más de 40 especialidades y oficios certificados con cobertura nacional.'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');

  const filteredRubros = useMemo(() => {
    return ALL_RUBROS_CATALOG.filter(rubro => {
      // Group filter
      if (selectedGroup !== 'ALL' && rubro.categoryGroup !== selectedGroup) {
        return false;
      }

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = rubro.name.toLowerCase().includes(q);
        const matchesDesc = rubro.description.toLowerCase().includes(q);
        const matchesGroup = rubro.categoryGroup?.toLowerCase().includes(q);
        const matchesKeywords = rubro.keywords?.some(k => k.toLowerCase().includes(q));

        return matchesName || matchesDesc || matchesGroup || matchesKeywords;
      }

      return true;
    });
  }, [searchQuery, selectedGroup]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative my-8 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800 shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-800/60 text-red-300 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Catálogo Completo de Rubros</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{title}</h2>
            <p className="text-xs text-zinc-400">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-red-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por rubro, oficio o palabra clave (ej: trifásica, durlock, split, cerrajero, cctv, fletes)..."
              autoFocus
              className="w-full pl-10 pr-10 py-3 bg-zinc-950 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Group Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedGroup('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedGroup === 'ALL'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-slate-800'
              }`}
            >
              Todos ({ALL_RUBROS_CATALOG.length})
            </button>

            {RUBRO_GROUPS.map(group => {
              const count = ALL_RUBROS_CATALOG.filter(r => r.categoryGroup === group.id).length;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedGroup(group.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedGroup === group.id
                      ? 'bg-slate-800 text-white border border-slate-600 font-bold'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-slate-800'
                  }`}
                >
                  <span>{group.name}</span>
                  <span className="text-[10px] opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[50vh]">
          {filteredRubros.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3 bg-zinc-950/40 rounded-2xl border border-slate-800/80">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-zinc-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">No encontramos rubros con "{searchQuery}"</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Probá buscando con términos más generales como "electricidad", "plomería", "reformas", "gas" o seleccioná otra categoría.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGroup('ALL');
                }}
                className="mt-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-zinc-200 transition-colors cursor-pointer"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredRubros.map(rubro => {
                const isSelected = selectedRubroId === rubro.id;
                const isAlreadyAdded = alreadyAddedRubroIds.includes(rubro.id);

                return (
                  <div
                    key={rubro.id}
                    onClick={() => {
                      onSelectRubro(rubro);
                      onClose();
                    }}
                    className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-red-950/40 border-red-500 shadow-md shadow-red-500/10'
                        : isAlreadyAdded
                        ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        : 'bg-zinc-950/80 hover:bg-slate-900 border-slate-800/90 hover:border-red-500/50 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:scale-105 group-hover:border-red-500/40 transition-all shrink-0">
                          <RubroIcon iconName={rubro.iconName} className="w-4 h-4 text-red-400" />
                        </div>

                        <div className="flex items-center gap-1">
                          {rubro.popular && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800/40">
                              Popular
                            </span>
                          )}
                          {isAlreadyAdded && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/40 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              En tu perfil
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="font-bold text-white text-xs sm:text-sm group-hover:text-red-400 transition-colors leading-snug">
                        {rubro.name}
                      </h3>

                      <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {rubro.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-zinc-500">
                      <span className="capitalize">{rubro.categoryGroup?.replace('-', ' ')}</span>
                      <span className="text-red-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center">
                        Seleccionar <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <span>Mostrando {filteredRubros.length} rubros</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
