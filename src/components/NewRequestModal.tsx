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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Publicación Rápida & Gratuita</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Pedir Presupuesto de Servicio
          </h2>
          <p className="text-xs text-slate-500">
            Completá los detalles y comenzá a recibir cotizaciones formales de especialistas en tu zona.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          
          {/* Rubro */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Rubro / Especialidad</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-medium"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Título del trabajo</label>
            <input
              type="text"
              placeholder="Ej: Cambio de disyuntor y térmicas en Palermo"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Descripción detallada</label>
            <textarea
              rows={4}
              placeholder="Describí qué falla o qué tarea se necesita realizar, medidas aproximadas, marcas o modelos de equipos..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-medium resize-none"
            />
          </div>

          {/* Zone & Urgency Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Zona / Barrio</label>
              <input
                type="text"
                placeholder="Ej: Belgrano, CABA"
                value={zone}
                onChange={e => setZone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Urgencia requerida</label>
              <select
                value={urgency}
                onChange={e => setUrgency(e.target.value as UrgencyLevel)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-medium"
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
            <label className="block font-bold text-slate-700 mb-1.5">Presupuesto estimado (ARS, opcional)</label>
            <input
              type="number"
              placeholder="Ej: 75000"
              value={budgetArs}
              onChange={e => setBudgetArs(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-medium"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Publicando...' : 'Publicar Solicitud'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
