import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Sparkles, AlertCircle, PlusCircle, Image, MapPin } from 'lucide-react';
import { UrgencyLevel } from '../types';

export const NewRequestModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { categories, createRequest, setSelectedRequestId, setActiveView } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories[0]?.id || 'electricidad');
  const [description, setDescription] = useState('');
  const [zone, setZone] = useState('Palermo, CABA');
  const [address, setAddress] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('MEDIUM');
  const [budgetArs, setBudgetArs] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Por favor ingresá un título descriptivo.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Por favor detallá tu necesidad con al menos 10 caracteres.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const created = await createRequest({
        title: title.trim(),
        category,
        description: description.trim(),
        zone: zone.trim(),
        address: address.trim() || undefined,
        urgency,
        budgetArs: budgetArs ? Number(budgetArs) : undefined,
      });

      setSelectedRequestId(created.id);
      setActiveView('requests');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al publicar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-800 relative my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950 text-red-300 border border-red-800/60 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Publicación Rápida & Gratuita</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Pedir Presupuesto de Servicio
          </h2>
          <p className="text-xs text-zinc-400">
            Completá los detalles y comenzá a recibir cotizaciones formales de especialistas en tu zona.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          
          {/* Rubro */}
          <div>
            <label className="block font-bold text-zinc-300 mb-1.5">Rubro / Especialidad</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl focus:outline-none focus:border-red-500/60 text-white font-medium cursor-pointer"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block font-bold text-zinc-300 mb-1.5">Título del trabajo</label>
            <input
              type="text"
              placeholder="Ej: Cambio de disyuntor y térmicas en Palermo"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl focus:outline-none focus:border-red-500/60 text-white font-medium placeholder-zinc-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-zinc-300 mb-1.5">Descripción detallada</label>
            <textarea
              rows={4}
              placeholder="Describí qué falla o qué tarea se necesita realizar, medidas aproximadas, marcas o modelos de equipos..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl focus:outline-none focus:border-red-500/60 text-white font-medium resize-none placeholder-zinc-500"
            />
          </div>

          {/* Zone & Urgency Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-zinc-300 mb-1.5">Zona / Barrio</label>
              <input
                type="text"
                placeholder="Ej: Belgrano, CABA"
                value={zone}
                onChange={e => setZone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl focus:outline-none focus:border-red-500/60 text-white font-medium placeholder-zinc-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-300 mb-1.5">Urgencia requerida</label>
              <select
                value={urgency}
                onChange={e => setUrgency(e.target.value as UrgencyLevel)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl focus:outline-none focus:border-red-500/60 text-white font-medium cursor-pointer"
              >
                <option value="LOW">Flexible / Sin apuro</option>
                <option value="MEDIUM">Esta semana (Estándar)</option>
                <option value="HIGH">Alta prioridad (Próximas 48hs)</option>
                <option value="EMERGENCY">Urgencia Inmediata (24hs)</option>
              </select>
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block font-bold text-zinc-300 mb-1.5">Presupuesto estimado (ARS, opcional)</label>
            <input
              type="number"
              placeholder="Ej: 75000"
              value={budgetArs}
              onChange={e => setBudgetArs(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl focus:outline-none focus:border-red-500/60 text-white font-medium placeholder-zinc-500"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold shadow-md shadow-red-600/30 border border-red-500/40 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Publicando...' : 'Publicar Solicitud'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
