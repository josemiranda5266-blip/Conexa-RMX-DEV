import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MessageSquarePlus, X, Smile, AlertCircle, Bug, Lightbulb, CheckCircle2, Sparkles } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { submitFeedback } = useApp();
  const [category, setCategory] = useState<'LIKE' | 'PROBLEM' | 'BUG' | 'SUGGESTION'>('LIKE');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    submitFeedback(category, comment);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setComment('');
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div 
        id="feedback-modal-card"
        className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 relative overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-3 animate-fade-in">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="font-bold text-lg text-slate-900">¡Gracias por tu feedback!</h3>
            <p className="text-xs text-slate-500">Tus sugerencias nos ayudan a hacer CONEXA más segura y útil durante la beta.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                  <MessageSquarePlus size={16} />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                  CONEXA Beta Feedback
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Enviar Opinión o Problema</h3>
              <p className="text-xs text-slate-500">Contanos cómo fue tu experiencia usando la plataforma.</p>
            </div>

            {/* Category selection */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCategory('LIKE')}
                className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                  category === 'LIKE' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Smile size={18} className="text-emerald-500 shrink-0" />
                <span className="text-xs font-bold">Me gusta</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('PROBLEM')}
                className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                  category === 'PROBLEM' ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <AlertCircle size={18} className="text-amber-500 shrink-0" />
                <span className="text-xs font-bold">Tengo problemas</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('BUG')}
                className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                  category === 'BUG' ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-xs' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Bug size={18} className="text-rose-500 shrink-0" />
                <span className="text-xs font-bold">Error técnico</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('SUGGESTION')}
                className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                  category === 'SUGGESTION' ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-xs' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Lightbulb size={18} className="text-indigo-500 shrink-0" />
                <span className="text-xs font-bold">Sugerencia</span>
              </button>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tu comentario</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Escribí aquí tus observaciones o sugerencias..."
                rows={3}
                required
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
              />
            </div>

            <button
              type="submit"
              disabled={!comment.trim()}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-2xl text-xs transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <Sparkles size={14} className="text-amber-300" />
              <span>Enviar Feedback</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
