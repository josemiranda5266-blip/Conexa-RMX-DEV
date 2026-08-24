import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, X, AlertCircle, FileText, Calendar, DollarSign, MapPin } from 'lucide-react';

interface ServiceRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServiceRequestForm: React.FC<ServiceRequestFormProps> = ({
  isOpen,
  onClose
}) => {
  const { categories, professions, createServiceRequest, currentUser } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || 'Hogar & Construcción');
  const [professionName, setProfessionName] = useState('Electricista');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'NORMAL' | 'ALTA' | 'URGENTE'>('NORMAL');
  const [estimatedBudget, setEstimatedBudget] = useState<string>('35000');
  const [preferredDate, setPreferredDate] = useState('Esta semana');
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('Por la mañana');
  const [naturalPrompt, setNaturalPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  if (!isOpen) return null;

  const handleAiAutoFill = async () => {
    if (!naturalPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/gemini/parse-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: naturalPrompt })
      });
      const data = await res.json();
      if (data.title) setTitle(data.title);
      if (data.category) setCategory(data.category);
      if (data.professionName) setProfessionName(data.professionName);
      if (data.description) setDescription(data.description);
      if (data.urgency) setUrgency(data.urgency);
      if (data.estimatedBudgetArs) setEstimatedBudget(data.estimatedBudgetArs.toString());
    } catch (err) {
      console.error('Error generating request via AI:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    createServiceRequest({
      title: title.trim(),
      category,
      professionName,
      description: description.trim(),
      approxLocation: `📍 ${currentUser.location.approxZone}`,
      preferredDate,
      preferredTimeSlot,
      estimatedBudgetArs: Number(estimatedBudget) || undefined,
      urgency
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        id="service-request-form-modal"
        className="bg-white/85 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-xl w-full my-auto border border-white/80 overflow-hidden space-y-4 p-6 relative max-h-[90vh] overflow-y-auto"
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-white/80 transition-colors border border-transparent hover:border-slate-200"
          aria-label="Cerrar modal"
        >
          <X size={20} />
        </button>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50/80 backdrop-blur-sm border border-blue-200 px-3 py-1 rounded-full">
            Servicio a Domicilio
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-1.5">Publicar Solicitud de Servicio</h2>
          <p className="text-xs text-slate-500">Recibirás presupuestos de profesionales cercanos verificados.</p>
        </div>

        {/* AI Generator Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-purple-50/80 backdrop-blur-md border border-blue-200/80 space-y-2 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
            <Sparkles size={16} className="text-blue-600 animate-spin-slow" />
            <span>Asistente Inteligente CONEXA IA</span>
          </div>
          <p className="text-[11px] text-slate-600">Escribí con tus palabras qué necesitás y la IA formateará la solicitud:</p>
          <div className="flex gap-2">
            <input 
              type="text"
              value={naturalPrompt}
              onChange={(e) => setNaturalPrompt(e.target.value)}
              placeholder='Ej: "Necesito arreglar una pérdida de agua en el baño urgente"'
              className="flex-1 text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
            />
            <button
              type="button"
              onClick={handleAiAutoFill}
              disabled={isAiLoading || !naturalPrompt.trim()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shrink-0 flex items-center gap-1 shadow-sm"
            >
              {isAiLoading ? 'Analizando...' : 'Auto-completar'}
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-800 block mb-1">Título de la necesidad *</label>
            <input 
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Instalación de luminarias LED en living"
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-medium"
              >
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Profesión deseada</label>
              <input
                type="text"
                value={professionName}
                onChange={(e) => setProfessionName(e.target.value)}
                placeholder="Ej: Plomero / Electricista"
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1">Descripción detallada *</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describí las tareas, problemas o requerimientos específicos..."
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-medium text-slate-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">Nivel de Urgencia</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-medium"
              >
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Fecha preferida</label>
              <input 
                type="text"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                placeholder="Ej: Mañana"
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Presupuesto ARS (Aprox)</label>
              <input 
                type="number"
                value={estimatedBudget}
                onChange={(e) => setEstimatedBudget(e.target.value)}
                placeholder="35000"
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-medium"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-slate-600 flex items-center gap-2">
            <MapPin size={16} className="text-rose-500 shrink-0" />
            <span>Zona de publicación: <strong>{currentUser.location.approxZone}</strong> (Tu domicilio exacto permanecerá oculto).</span>
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
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 transition-all"
            >
              Publicar Solicitud
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
