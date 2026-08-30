import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, ShieldCheck, DollarSign, Clock, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

export const SubmitQuoteModal: React.FC<{
  isOpen: boolean;
  requestId: string | null;
  onClose: () => void;
}> = ({ isOpen, requestId, onClose }) => {
  const { requests, submitQuote } = useApp();

  const targetRequest = requests.find(r => r.id === requestId);

  const [priceArs, setPriceArs] = useState('');
  const [description, setDescription] = useState('');
  const [materialsIncluded, setMaterialsIncluded] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('2 a 3 horas de trabajo');
  const [availableStartDate, setAvailableStartDate] = useState('Mañana a convenir');
  const [warrantyInfo, setWarrantyInfo] = useState('6 meses de garantía escrita en mano de obra');
  const [termsAndConditions, setTermsAndConditions] = useState('Pago retenido en Garantía Escrow CONEXA hasta conformidad.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !targetRequest) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(priceArs);
    if (!price || price <= 0) {
      setError('Por favor ingresá un monto válido en Pesos Argentinos.');
      return;
    }
    if (description.trim().length < 5) {
      setError('Por favor describí qué incluye tu trabajo.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await submitQuote({
        requestId: targetRequest.id,
        clientId: targetRequest.clientId,
        professionalId: '',
        professionalName: '',
        priceArs: price,
        description: description.trim(),
        materialsIncluded: materialsIncluded.trim() || undefined,
        estimatedTime: estimatedTime.trim() || undefined,
        availableStartDate: availableStartDate.trim() || undefined,
        warrantyInfo: warrantyInfo.trim() || undefined,
        termsAndConditions: termsAndConditions.trim() || undefined
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al enviar el presupuesto.');
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Presupuesto Formal Protegido por CONEXA</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Enviar Cotización Profesional
          </h2>
          <p className="text-xs text-slate-500">
            Para la solicitud: <strong className="text-slate-800">{targetRequest.title}</strong>
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          
          {/* Price */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Monto Total de la Cotización (ARS $)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-base">$</span>
              <input
                type="number"
                placeholder="Ej: 85000"
                value={priceArs}
                onChange={e => setPriceArs(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white text-slate-900 font-extrabold text-base"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Incluye mano de obra y cobertura por seguro CONEXA.</span>
          </div>

          {/* Scope Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Detalle del trabajo y metodología</label>
            <textarea
              rows={3}
              placeholder="Explicá el diagnóstico previo, procedimiento técnico que vas a realizar, pruebas de seguridad..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white text-slate-800 font-medium resize-none"
            />
          </div>

          {/* Materials Included */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Materiales e insumos incluidos</label>
            <input
              type="text"
              placeholder="Ej: Llaves térmicas Schneider 2x25A, peines de conexión ignífugos..."
              value={materialsIncluded}
              onChange={e => setMaterialsIncluded(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white text-slate-800 font-medium"
            />
          </div>

          {/* Duration & Availability */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Tiempo estimado</label>
              <input
                type="text"
                value={estimatedTime}
                onChange={e => setEstimatedTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Disponibilidad para iniciar</label>
              <input
                type="text"
                value={availableStartDate}
                onChange={e => setAvailableStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-800 font-medium"
              />
            </div>
          </div>

          {/* Warranty */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Garantía ofrecida</label>
            <input
              type="text"
              value={warrantyInfo}
              onChange={e => setWarrantyInfo(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-800 font-medium"
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
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Cotización Formal'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
