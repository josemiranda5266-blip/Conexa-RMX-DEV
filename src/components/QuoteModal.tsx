import React, { useState } from 'react';
import { ServiceRequest } from '../types';
import { useApp } from '../context/AppContext';
import { FileText, DollarSign, Clock, ShieldCheck, X } from 'lucide-react';

interface QuoteModalProps {
  request: ServiceRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QuoteModal: React.FC<QuoteModalProps> = ({
  request,
  isOpen,
  onClose
}) => {
  const { currentUser, submitQuote } = useApp();

  const [priceArs, setPriceArs] = useState<number>(45000);
  const [description, setDescription] = useState('');
  const [materialsIncluded, setMaterialsIncluded] = useState('Insumos de montaje y conectores incluidos.');
  const [estimatedTime, setEstimatedTime] = useState('2 a 3 horas');
  const [availableStartDate, setAvailableStartDate] = useState('Mañana por la mañana');
  const [warrantyInfo, setWarrantyInfo] = useState('6 meses de garantía escrita.');
  const [termsAndConditions, setTermsAndConditions] = useState('Pago al finalizar el trabajo.');

  if (!isOpen || !request) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceArs || !description.trim()) return;

    submitQuote({
      requestId: request.id,
      professionalId: currentUser.id,
      professionalName: currentUser.name,
      professionalAvatar: currentUser.avatar,
      professionalRating: currentUser.rating,
      professionalVerified: !!currentUser.isProfessionalVerified,
      priceArs: Number(priceArs),
      description: description.trim(),
      materialsIncluded,
      estimatedTime,
      availableStartDate,
      warrantyInfo,
      termsAndConditions
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        id={`quote-modal-${request.id}`}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full my-auto border border-slate-200 overflow-hidden space-y-4 p-6 relative max-h-[90vh] overflow-y-auto text-xs"
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Cerrar modal"
        >
          <X size={18} />
        </button>

        <div className="space-y-1">
          <span className="font-bold text-blue-600 uppercase tracking-wider text-[10px] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            Presupuesto Comercial
          </span>
          <h3 className="font-bold text-slate-900 text-lg">Enviar Presupuesto para Trabajo</h3>
          <p className="text-slate-500 text-xs">Solicitud: <strong className="text-slate-800">{request.title}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div>
            <label className="font-bold text-slate-800 block mb-1">Precio Total Estimado ($ ARS) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold text-slate-400">$</span>
              <input 
                type="number"
                required
                value={priceArs}
                onChange={(e) => setPriceArs(Number(e.target.value))}
                placeholder="45000"
                className="w-full pl-8 p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-bold text-slate-900 text-base"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1">Detalle del Servicio y Trabajos Incluidos *</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explicá en detalle qué tareas vas a realizar..."
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-medium text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">Insumos y Materiales</label>
              <input
                type="text"
                value={materialsIncluded}
                onChange={(e) => setMaterialsIncluded(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Tiempo Estimado</label>
              <input
                type="text"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">Inicio Disponible</label>
              <input
                type="text"
                value={availableStartDate}
                onChange={(e) => setAvailableStartDate(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Garantía Ofrecida</label>
              <input
                type="text"
                value={warrantyInfo}
                onChange={(e) => setWarrantyInfo(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-medium"
              />
            </div>
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
              Enviar Presupuesto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
