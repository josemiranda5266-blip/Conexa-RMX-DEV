import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Star, CheckCircle2, AlertCircle } from 'lucide-react';

export const ReviewModal: React.FC<{
  isOpen: boolean;
  requestId: string | null;
  professionalId: string | null;
  onClose: () => void;
}> = ({ isOpen, requestId, professionalId, onClose }) => {
  const { addReview, users } = useApp();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !requestId || !professionalId) return null;

  const targetPro = users.find(u => u.id === professionalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim().length < 5) {
      setError('Por favor escribí un comentario breve sobre el trabajo recibido.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await addReview({
        serviceRequestId: requestId,
        professionalId,
        rating,
        comment: comment.trim()
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al enviar la calificación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-2 mb-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2">
            <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Calificar Profesional
          </h2>
          <p className="text-xs text-slate-500">
            Tu opinión es fundamental para mantener la calidad en la comunidad CONEXA.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Star selector */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 cursor-pointer transition-transform hover:scale-125 focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-slate-700">
              {rating === 5 ? 'Excelente (5/5)' :
               rating === 4 ? 'Muy Bueno (4/5)' :
               rating === 3 ? 'Bueno (3/5)' :
               rating === 2 ? 'Regular (2/5)' : 'Insatisfecho (1/5)'}
            </span>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Comentario sobre la puntualidad, prolijidad y resultado
            </label>
            <textarea
              rows={4}
              placeholder="Contanos tu experiencia con el profesional..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 focus:bg-white text-slate-800 font-medium resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              Omitir
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Guardando...' : 'Publicar Calificación'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
