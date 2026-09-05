import React, { useState } from 'react';
import {
  Award,
  Clock,
  MapPin,
  FileText,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { ProfessionalSpecialty } from '../types';
import { RubroIcon } from './RubroIcon';
import { PhotoCarousel } from './PhotoCarousel';
import { ALL_RUBROS_CATALOG } from '../data/rubrosData';

interface ProfessionCardProps {
  profession: ProfessionalSpecialty;
  isOwner?: boolean;
  onEdit?: (prof: ProfessionalSpecialty) => void;
  onDelete?: (profId: string) => void;
  onRequestQuote?: (prof: ProfessionalSpecialty) => void;
  className?: string;
}

export const ProfessionCard: React.FC<ProfessionCardProps> = ({
  profession,
  isOwner = false,
  onEdit,
  onDelete,
  onRequestQuote,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const rubroInfo = ALL_RUBROS_CATALOG.find(r => r.id === profession.rubroId);
  const iconName = rubroInfo?.iconName || 'Briefcase';

  const descriptionLength = profession.description?.length || 0;
  const shouldTruncate = descriptionLength > 280;

  const displayDescription =
    shouldTruncate && !isExpanded
      ? `${profession.description.slice(0, 280)}...`
      : profession.description;

  return (
    <div className={`p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5 hover:border-slate-700 transition-all ${className}`}>
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-slate-800 flex items-center justify-center shrink-0 shadow-inner">
            <RubroIcon iconName={iconName} className="w-6 h-6 text-red-500" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-800/60 text-red-300 text-[10px] font-extrabold">
                {profession.rubroName || rubroInfo?.name || 'Oficio Profesional'}
              </span>

              {profession.matricula && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-300 text-[10px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-400" />
                  <span>{profession.matricula}</span>
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
              {profession.title}
            </h3>

            {/* Badges / Meta */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 pt-1">
              {typeof profession.experienceYears === 'number' && (
                <div className="flex items-center gap-1 text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{profession.experienceYears} años de experiencia</span>
                </div>
              )}

              {profession.coverageZone && (
                <div className="flex items-center gap-1 text-zinc-300">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{profession.coverageZone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Owner Controls */}
        {isOwner && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(profession)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="Editar especialidad"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(profession.id)}
                className="p-2 rounded-xl bg-red-950/40 hover:bg-red-950 text-red-400 hover:text-red-300 border border-red-900/50 transition-all cursor-pointer text-xs"
                title="Eliminar especialidad"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Extensive Description */}
      <div className="space-y-2 bg-zinc-950/60 p-4 rounded-2xl border border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-red-400" />
            <span>Descripción del Servicio & Experiencia</span>
          </span>
        </div>

        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
          {displayDescription}
        </p>

        {shouldTruncate && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 pt-1 cursor-pointer"
          >
            <span>{isExpanded ? 'Mostrar menos' : 'Leer descripción completa'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Work Photos Carousel */}
      {profession.photos && profession.photos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Galería de Trabajos Realizados ({profession.photos.length})</span>
            </span>
          </div>

          <PhotoCarousel
            photos={profession.photos}
            title={`${profession.title} - Trabajos`}
            aspectRatio="wide"
          />
        </div>
      )}

      {/* Client CTA if requested */}
      {!isOwner && onRequestQuote && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => onRequestQuote(profession)}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all cursor-pointer"
          >
            Solicitar Presupuesto en este Rubro
          </button>
        </div>
      )}

    </div>
  );
};
