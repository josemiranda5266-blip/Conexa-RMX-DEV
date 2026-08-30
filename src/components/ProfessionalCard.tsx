import React from 'react';
import { UserProfile } from '../types';
import { TrustBadge } from './TrustBadge';
import { Star, MapPin, Briefcase, MessageSquare, Heart, Clock, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ProfessionalCardProps {
  professional: UserProfile;
  onViewDetail: (pro: UserProfile) => void;
  onContact: (pro: UserProfile) => void;
}

export const ProfessionalCard: React.FC<ProfessionalCardProps> = ({
  professional,
  onViewDetail,
  onContact
}) => {
  const { favorites, toggleFavorite } = useApp();
  const isFav = favorites.includes(professional.id);

  return (
    <div 
      id={`pro-card-${professional.id}`}
      className="bg-white/70 backdrop-blur-md rounded-3xl border border-white/80 shadow-md hover:shadow-2xl hover:border-blue-400/50 hover:bg-white/85 transition-all duration-300 p-4 relative group flex flex-col justify-between hover:-translate-y-0.5"
    >
      {/* Top Header */}
      <div>
        {professional.isDemoData && (
          <div className="mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300/80 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
              <span>🧪</span>
              <span>DATOS DE DEMOSTRACIÓN — BETA</span>
            </span>
          </div>
        )}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={professional.avatar} 
                alt={professional.name} 
                className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm"
              />
              <span 
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  professional.availabilityStatus === 'DISPONIBLE' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                title={`Estado: ${professional.availabilityStatus}`}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-blue-600 transition-colors">
                  {professional.name}
                </h3>
              </div>
              {professional.businessName && (
                <p className="text-xs font-semibold text-slate-500">{professional.businessName}</p>
              )}
              <div className="flex items-center gap-1 text-xs font-semibold text-blue-700 mt-0.5">
                <Briefcase size={13} />
                <span>{professional.professionName || 'Profesional'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(professional.id);
            }}
            className={`p-2 rounded-2xl transition-all ${
              isFav 
                ? 'bg-rose-500/10 text-rose-600 border border-rose-200/80' 
                : 'bg-white/60 text-slate-400 hover:text-slate-600 border border-white/80 hover:bg-white'
            }`}
            title={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            aria-label="Guardar favorito"
          >
            <Heart size={16} className={isFav ? 'fill-current' : ''} />
          </button>
        </div>

        {/* Verification Badges */}
        <TrustBadge 
          isIdentityVerified={professional.isIdentityVerified}
          isProfessionalVerified={professional.isProfessionalVerified}
          trustScore={professional.trustScore}
          size="sm"
        />

        {/* Stats & Location Bar */}
        <div className="grid grid-cols-2 gap-2 my-3 p-2.5 bg-slate-50/70 backdrop-blur-sm rounded-2xl border border-white/60 text-xs shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
            <Star size={14} className="text-amber-500 fill-amber-500 shrink-0" />
            <span>{professional.rating} <span className="text-slate-400 font-normal">({professional.reviewCount} op.)</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
            <span className="text-slate-900 font-bold">{professional.jobsCompleted}</span>
            <span className="text-slate-500 font-normal">trabajos</span>
          </div>
          <div className="col-span-2 flex items-center gap-1.5 text-slate-600 font-medium truncate pt-1 border-t border-slate-200/60">
            <MapPin size={13} className="text-rose-500 shrink-0" />
            <span className="truncate">📍 {professional.location.approxZone}</span>
          </div>
        </div>

        {/* Description snippet */}
        {professional.description && (
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
            {professional.description}
          </p>
        )}

        {/* Specialties tags */}
        {professional.specialties && professional.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {professional.specialties.slice(0, 3).map((spec, idx) => (
              <span key={idx} className="text-[11px] font-semibold bg-white/80 backdrop-blur-sm text-slate-700 px-2.5 py-0.5 rounded-full border border-white/80 shadow-2xs">
                {spec}
              </span>
            ))}
            {professional.specialties.length > 3 && (
              <span className="text-[11px] text-slate-400 self-center">
                +{professional.specialties.length - 3} más
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-2 border-t border-slate-100/80 flex items-center gap-2 mt-2">
        <button
          onClick={() => onViewDetail(professional)}
          className="flex-1 py-2.5 px-3 rounded-2xl border border-white/80 bg-white/50 backdrop-blur-sm text-slate-700 font-bold text-xs hover:bg-white hover:shadow-xs transition-all flex items-center justify-center gap-1"
        >
          <span>Ver perfil</span>
          <ChevronRight size={14} />
        </button>

        <button
          onClick={() => onContact(professional)}
          className="flex-1 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5 border border-white/20 active:scale-95"
        >
          <MessageSquare size={14} />
          <span>Contactar</span>
        </button>
      </div>
    </div>
  );
};
