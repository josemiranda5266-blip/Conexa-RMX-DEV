import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Quote } from '../types';
import {
  X,
  ShieldCheck,
  CreditCard,
  Lock,
  CheckCircle2,
  AlertCircle,
  Building,
  HelpCircle,
  QrCode
} from 'lucide-react';

export const EscrowPaymentModal: React.FC<{
  isOpen: boolean;
  quote: Quote | null;
  onClose: () => void;
}> = ({ isOpen, quote, onClose }) => {
  const { acceptQuote, setSelectedRequestId, setActiveView } = useApp();

  const [paymentMethod, setPaymentMethod] = useState<'mp_card' | 'mp_debit' | 'mp_transfer'>('mp_card');
  const [installments, setInstallments] = useState('1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !quote) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const methodLabel =
        paymentMethod === 'mp_card'
          ? `Mercado Pago (Tarjeta de Crédito en ${installments} cuotas)`
          : paymentMethod === 'mp_debit'
          ? 'Mercado Pago (Tarjeta de Débito)'
          : 'Mercado Pago (Transferencia / Dinero en cuenta)';

      await acceptQuote(quote.id, methodLabel);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        setSelectedRequestId(quote.requestId);
        setActiveView('requests');
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const calculatedInstallmentPrice = Math.round(quote.priceArs / Number(installments));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900">¡Pago en Custodia Confirmado!</h3>
            <p className="text-sm text-slate-600 max-w-xs mx-auto">
              El profesional fue notificado para iniciar la tarea. Tus fondos están 100% resguardados por la Garantía Escrow CONEXA.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Modal Title */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Garantía Escrow CONEXA</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Aceptar y Custodiar Pago
              </h2>
              <p className="text-xs text-slate-500">
                Profesional: <strong className="text-slate-800">{quote.professionalName}</strong>
              </p>
            </div>

            {/* Price Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Presupuesto acordado:</span>
                <span className="font-bold text-slate-900">${quote.priceArs.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-emerald-700">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Protección al comprador CONEXA:
                </span>
                <span className="font-bold">Gratis ($0)</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">Total a abonar en custodia:</span>
                <span className="font-extrabold text-slate-900 text-lg sm:text-xl">
                  ${quote.priceArs.toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            {/* Mercado Pago Payment Method Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Método de Pago Seguro (Mercado Pago Argentina)
              </label>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mp_card')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                    paymentMethod === 'mp_card'
                      ? 'border-sky-500 bg-sky-50/60 font-bold text-sky-900 ring-1 ring-sky-500'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-sky-600" />
                  <span>Crédito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('mp_debit')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                    paymentMethod === 'mp_debit'
                      ? 'border-sky-500 bg-sky-50/60 font-bold text-sky-900 ring-1 ring-sky-500'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <Building className="w-5 h-5 text-sky-600" />
                  <span>Débito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('mp_transfer')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                    paymentMethod === 'mp_transfer'
                      ? 'border-sky-500 bg-sky-50/60 font-bold text-sky-900 ring-1 ring-sky-500'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-sky-600" />
                  <span>Transferencia</span>
                </button>
              </div>

              {paymentMethod === 'mp_card' && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cuotas con tarjeta</label>
                  <select
                    value={installments}
                    onChange={e => setInstallments(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800"
                  >
                    <option value="1">1 pago de ${quote.priceArs.toLocaleString('es-AR')} (Sin interés)</option>
                    <option value="3">3 cuotas fijas de ${calculatedInstallmentPrice.toLocaleString('es-AR')}</option>
                    <option value="6">6 cuotas fijas de ${Math.round(quote.priceArs / 6).toLocaleString('es-AR')}</option>
                    <option value="12">12 cuotas fijas de ${Math.round(quote.priceArs / 12).toLocaleString('es-AR')}</option>
                  </select>
                </div>
              )}
            </div>

            {/* Escrow Guarantee Explanation */}
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                El dinero <strong>no se le acredita de forma inmediata al profesional</strong>. Permanece seguro en custodia hasta que vos verifiques y des tu conformidad final tras culminar el trabajo.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirm}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isProcessing ? 'Procesando...' : 'Confirmar y Custodiar'}</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
