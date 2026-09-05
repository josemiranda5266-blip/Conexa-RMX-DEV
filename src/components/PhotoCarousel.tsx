import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Trash2,
  Plus,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';

interface PhotoCarouselProps {
  photos: string[];
  title?: string;
  editable?: boolean;
  onRemovePhoto?: (index: number) => void;
  onAddPhotoClick?: () => void;
  aspectRatio?: 'video' | 'square' | 'wide';
  className?: string;
}

export const PhotoCarousel: React.FC<PhotoCarouselProps> = ({
  photos = [],
  title = 'Trabajo realizado',
  editable = false,
  onRemovePhoto,
  onAddPhotoClick,
  aspectRatio = 'video',
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const validPhotos = photos.filter(p => typeof p === 'string' && p.trim().length > 0);
  const total = validPhotos.length;

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex(prev => (prev === 0 ? total - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex(prev => (prev === total - 1 ? 0 : prev + 1));
  };

  const handleDotClick = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(idx);
  };

  const ratioClass =
    aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === 'wide'
      ? 'aspect-[21/9]'
      : 'aspect-[16/10]';

  if (total === 0) {
    return (
      <div className={`rounded-2xl border border-slate-800/80 bg-zinc-950/60 p-6 flex flex-col items-center justify-center text-center ${ratioClass} ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-zinc-500 mb-2">
          <ImageIcon className="w-6 h-6" />
        </div>
        <p className="text-xs font-semibold text-zinc-400">Sin fotos de trabajos adjuntas</p>
        {editable && onAddPhotoClick && (
          <button
            type="button"
            onClick={onAddPhotoClick}
            className="mt-3 px-3.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Fotos</span>
          </button>
        )}
      </div>
    );
  }

  // Ensure current index is within range
  const safeIndex = Math.min(currentIndex, total - 1);
  const currentPhoto = validPhotos[safeIndex] || validPhotos[0];

  return (
    <div className={`relative group select-none ${className}`}>
      {/* Main Slide Box */}
      <div
        onClick={() => setIsLightboxOpen(true)}
        className={`relative overflow-hidden rounded-2xl bg-zinc-950 border border-slate-800 cursor-pointer shadow-md ${ratioClass}`}
      >
        <img
          src={currentPhoto}
          alt={`${title} - foto ${safeIndex + 1}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradient Overlay for Controls Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

        {/* Counter Badge */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-white text-[11px] font-bold flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>
            {safeIndex + 1} / {total}
          </span>
        </div>

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsLightboxOpen(true);
          }}
          className="absolute top-3 right-3 p-2 rounded-xl bg-black/70 hover:bg-black text-white/90 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer"
          title="Ver en pantalla completa"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Delete button (Editable mode) */}
        {editable && onRemovePhoto && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemovePhoto(safeIndex);
              if (safeIndex > 0 && safeIndex === total - 1) {
                setCurrentIndex(safeIndex - 1);
              }
            }}
            className="absolute bottom-3 right-3 p-2 rounded-xl bg-red-950/90 hover:bg-red-900 text-red-300 border border-red-700/80 backdrop-blur-md transition-all cursor-pointer"
            title="Eliminar esta foto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Navigation Arrows (if more than 1 photo) */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/60 hover:bg-black/90 text-white/90 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer opacity-90 group-hover:opacity-100 hover:scale-110"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/60 hover:bg-black/90 text-white/90 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer opacity-90 group-hover:opacity-100 hover:scale-110"
              aria-label="Siguiente foto"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Dots Indicators at bottom center */}
        {total > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
            {validPhotos.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => handleDotClick(idx, e)}
                className={`transition-all rounded-full cursor-pointer ${
                  idx === safeIndex
                    ? 'w-4 h-1.5 bg-red-500'
                    : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Ir a foto ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Fullscreen Modal */}
      {isLightboxOpen && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-in fade-in duration-200"
        >
          {/* Lightbox Topbar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-6xl flex items-center justify-between text-white pb-4 border-b border-white/10"
          >
            <div>
              <h3 className="text-base font-bold text-white">{title}</h3>
              <p className="text-xs text-zinc-400">
                Foto {safeIndex + 1} de {total} de trabajos verificados
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Center Image Stage */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl flex-1 flex items-center justify-center p-2 sm:p-6"
          >
            <img
              src={currentPhoto}
              alt={`${title} - pantalla completa`}
              className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
            />

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-black/70 hover:bg-black text-white border border-white/20 backdrop-blur-md cursor-pointer transition-all hover:scale-110"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-black/70 hover:bg-black text-white border border-white/20 backdrop-blur-md cursor-pointer transition-all hover:scale-110"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Thumbnail Strip */}
          {total > 1 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl flex items-center justify-center gap-2 overflow-x-auto py-3 px-4 rounded-2xl bg-zinc-950/80 border border-white/10"
            >
              {validPhotos.map((photo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative shrink-0 w-16 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    idx === safeIndex
                      ? 'border-red-500 scale-105 shadow-md shadow-red-500/30'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={photo}
                    alt={`miniatura ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
