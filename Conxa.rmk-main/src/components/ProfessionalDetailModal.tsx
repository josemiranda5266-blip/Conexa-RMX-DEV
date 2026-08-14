import React, { useState } from 'react';
import { UserProfile, Review } from '../types';
import { TrustBadge } from './TrustBadge';
import { 
  X, Star, MapPin, Briefcase, MessageSquare, FileText, 
  Clock, Shield, CheckCircle2, Award, Image as ImageIcon, Heart, PhoneOff 
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ProfessionalDetailModalProps {
  professional: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (pro: UserProfile) => void;
  onRequestQuote: (pro: UserProfile) => void;
}

export const ProfessionalDetailModal: React.FC<ProfessionalDetailModalProps> = ({
  professional,
  isOpen,
  onClose,
  onStartChat,
  onRequestQuote
}) => {
  const { reviews, favorites, toggleFavorite } = useApp();
  const [activeTab, setActiveTab] = useState<'SERVICIOS' | 'PORTFOLIO' | 'RESEÑAS' | 'ZONA'>('SERVICIOS');

  if (!isOpen || !professional) return null;

  const proReviews = reviews.filter(r => r.professionalId === professional.id);
  const isFav = favorites.includes(professional.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        id={`pro-detail-modal-${professional.id}`}
        className="bg-white/85 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-2xl w-full my-auto border border-white/80 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Top Cover Banner */}
        <div className="bg-slate-900/90 backdrop-blur-xl p-6 text-white relative border-b border-white/10">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-slate-300 hover:text-white bg-white/10 p-2 rounded-full transition-colors border border-white/10"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative shrink-0">
              <img 
                src={professional.avatar} 
                alt={professional.name} 
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-lg"
              />
              <span 
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 ${
                  professional.availabilityStatus === 'DISPONIBLE' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </div>

            <div className="space-y-1">
              {professional.isDemoData && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full inline-block mb-1">
                  🧪 DATOS DE DEMOSTRACIÓN — BETA
                </span>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{professional.name}</h2>
                <button
                  onClick={() => toggleFavorite(professional.id)}
                  className={`p-1.5 rounded-xl transition-all ${
                    isFav ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-white/10 text-slate-300 hover:text-white border border-white/10'
                  }`}
                  aria-label="Favorito"
                >
                  <Heart size={16} className={isFav ? 'fill-current' : ''} />
                </button>
              </div>

              {professional.businessName && (
                <p className="text-sm font-semibold text-blue-300">{professional.businessName}</p>
              )}

              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <Briefcase size={14} className="text-blue-400" />
                <span>{professional.professionName || 'Profesional de Servicios'}</span>
              </div>

              <TrustBadge 
                isIdentityVerified={professional.isIdentityVerified}
                isProfessionalVerified={professional.isProfessionalVerified}
                trustScore={professional.trustScore}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Private Data Warning Strip */}
        <div className="bg-emerald-500/10 backdrop-blur-md border-b border-emerald-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-900 font-medium">
          <div className="flex items-center gap-2">
            <PhoneOff size={15} className="text-emerald-700 shrink-0" />
            <span>Número telefónico y dirección exacta protegidos por CONEXA</span>
          </div>
          <span className="hidden sm:inline font-bold text-emerald-700">Privacidad Activa</span>
        </div>

        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-3 divide-x divide-slate-200/60 bg-white/50 backdrop-blur-sm border-b border-white/60 text-center py-3">
          <div>
            <div className="flex items-center justify-center gap-1 font-bold text-slate-900 text-base">
              <Star size={16} className="text-amber-500 fill-amber-500" />
              <span>{professional.rating}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">{professional.reviewCount} opiniones</p>
          </div>
          <div>
            <p className="font-bold text-slate-900 text-base">{professional.jobsCompleted}</p>
            <p className="text-[11px] text-slate-500 font-medium">Trabajos hechos</p>
          </div>
          <div>
            <p className="font-bold text-emerald-700 text-base">{professional.trustScore}%</p>
            <p className="text-[11px] text-slate-500 font-medium">Nivel Confianza</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/60 bg-white/40 backdrop-blur-md px-4">
          <button
            onClick={() => setActiveTab('SERVICIOS')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'SERVICIOS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Servicios ({professional.servicesOffered?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('PORTFOLIO')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'PORTFOLIO' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Portfolio ({professional.portfolioImages?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('RESEÑAS')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'RESEÑAS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Reseñas ({proReviews.length})
          </button>
          <button
            onClick={() => setActiveTab('ZONA')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'ZONA' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Zona & Horarios
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Tab: Servicios */}
          {activeTab === 'SERVICIOS' && (
            <div className="space-y-3">
              {professional.description && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                  <h4 className="font-bold text-slate-900 mb-1">Presentación Profesional</h4>
                  <p>{professional.description}</p>
                </div>
              )}

              <h4 className="font-bold text-slate-900 text-sm pt-1">Servicios Ofrecidos</h4>
              
              {professional.servicesOffered && professional.servicesOffered.length > 0 ? (
                <div className="space-y-2">
                  {professional.servicesOffered.map(service => (
                    <div key={service.id} className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-blue-300 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <h5 className="font-bold text-slate-900 text-sm">{service.title}</h5>
                        {service.approxPriceArs && (
                          <span className="font-bold text-blue-700 text-xs bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg shrink-0">
                            Desde ${service.approxPriceArs.toLocaleString('es-AR')} ARS
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{service.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">
                  Consultá las especialidades y cotización personalizada por el chat interno.
                </p>
              )}
            </div>
          )}

          {/* Tab: Portfolio */}
          {activeTab === 'PORTFOLIO' && (
            <div className="space-y-3">
              {professional.portfolioImages && professional.portfolioImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {professional.portfolioImages.map((imgUrl, i) => (
                    <div key={i} className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm aspect-video bg-slate-100">
                      <img src={imgUrl} alt={`Trabajo ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <ImageIcon size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs">El profesional no ha subido fotografías de portfolio aún.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Reseñas */}
          {activeTab === 'RESEÑAS' && (
            <div className="space-y-3">
              {proReviews.length > 0 ? (
                proReviews.map(rev => (
                  <div key={rev.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <img src={rev.clientAvatar} alt={rev.clientName} className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{rev.clientName}</p>
                          <p className="text-[10px] text-slate-400">{rev.createdAt}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 text-amber-900 font-bold text-xs">
                        <Star size={12} className="text-amber-500 fill-amber-500" />
                        <span>{rev.overallRating}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>
                    {rev.isVerifiedJob && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-100/60 px-2 py-0.5 rounded-md">
                        <CheckCircle2 size={11} /> Trabajo Verificado en CONEXA
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-6">Aún no posee reseñas registradas en la plataforma.</p>
              )}
            </div>
          )}

          {/* Tab: Zona & Horarios */}
          {activeTab === 'ZONA' && (
            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <MapPin size={16} className="text-rose-500" />
                  <span>Zona de Cobertura Aproximada</span>
                </div>
                <p>📍 {professional.location.approxZone} (Radio aproximado de {professional.workZoneRadiusKm || 20} km)</p>
                <p className="text-slate-500 text-[11px]">
                  Por seguridad, la dirección exacta no se expone. El profesional acude a domicilio previa aprobación explícita de ubicación.
                </p>
              </div>

              {professional.workingHours && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <Clock size={16} className="text-blue-600" />
                    <span>Horarios de Atención</span>
                  </div>
                  <p className="font-semibold text-slate-800">{professional.workingHours}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-white/60 backdrop-blur-md border-t border-white/60 flex flex-col sm:flex-row items-center gap-2">
          <button
            onClick={() => {
              onClose();
              onRequestQuote(professional);
            }}
            className="w-full sm:flex-1 py-3 px-4 rounded-2xl border border-white/80 bg-white/60 hover:bg-white text-slate-800 font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-2"
          >
            <FileText size={16} />
            <span>Solicitar Presupuesto</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onStartChat(professional);
            }}
            className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 border border-white/20 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <MessageSquare size={16} />
            <span>Hablar por Chat Privado</span>
          </button>
        </div>
      </div>
    </div>
  );
};
