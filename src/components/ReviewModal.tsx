import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Star, X, CheckCircle2 } from 'lucide-react';

interface ReviewModalProps {
  professionalId: string;
  professionalName: string;
  jobId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  professionalId,
  professionalName,
  jobId,
  isOpen,
  onClose
}) => {
  const { currentUser, addReview } = useApp();

  const [comment, setComment] = useState('');
  const [overall, setOverall] = useState(5);
  const [quality, setQuality] = useState(5);
  const [punctuality, setPunctuality] = useState(5);
  const [treatment, setTreatment] = useState(5);
  const [price, setPrice] = useState(5);
  const [compliance, setCompliance] = useState(5);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    addReview({
      jobId,
      clientId: currentUser.id,
      clientName: currentUser.name,
      clientAvatar: currentUser.avatar,
      professionalId,
      comment: comment.trim(),
      overallRating: overall,
      qualityRating: quality,
      punctualityRating: punctuality,
      treatmentRating: treatment,
      priceRating: price,
      complianceRating: compliance
    });

    onClose();
  };

  const StarRatingSelector = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div className="flex items-center justify-between text-xs py-1">
      <span className="font-semibold text-slate-700">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star 
              size={18} 
              className={star <= value ? 'text-amber-500 fill-amber-500' : 'text-slate-300'} 
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        id="review-modal-container"
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full my-auto border border-slate-200 overflow-hidden space-y-4 p-6 relative max-h-[90vh] overflow-y-auto text-xs"
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Cerrar modal"
        >
          <X size={18} />
        </button>

        <div>
          <span className="font-bold text-emerald-700 uppercase tracking-wider text-[10px] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Trabajo Verificado CONEXA
          </span>
          <h3 className="font-bold text-slate-900 text-lg mt-1">Calificar a {professionalName}</h3>
          <p className="text-slate-500">Tu opinión nos ayuda a proteger la red de reseñas fraudulentas.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
            <h4 className="font-bold text-slate-900 mb-2">Evaluación por dimensiones:</h4>
            <StarRatingSelector label="⭐ Calificación General" value={overall} onChange={setOverall} />
            <StarRatingSelector label="Calidad del Trabajo" value={quality} onChange={setQuality} />
            <StarRatingSelector label="Puntualidad" value={punctuality} onChange={setPunctuality} />
            <StarRatingSelector label="Trato y Atención" value={treatment} onChange={setTreatment} />
            <StarRatingSelector label="Precio / Valor" value={price} onChange={setPrice} />
            <StarRatingSelector label="Cumplimiento de lo pactado" value={compliance} onChange={setCompliance} />
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1">Comentario sobre la experiencia *</label>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Contanos qué tal resultó el trabajo..."
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-medium text-slate-900"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              Publicar Calificación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
