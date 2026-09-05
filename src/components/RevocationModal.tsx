import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  ArrowRight,
  Clock,
  ExternalLink,
  DollarSign
} from 'lucide-react';

interface RevocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedTransactionId?: string;
  preselectedRequestId?: string;
}

export const RevocationModal: React.FC<RevocationModalProps> = ({
  isOpen,
  onClose,
  preselectedTransactionId,
  preselectedRequestId
}) => {
  const { currentUser, transactions, requests, processRevocation } = useApp();

  const [email, setEmail] = useState(currentUser.email || '');
  const [name, setName] = useState(currentUser.name || '');
  const [selectedTxId, setSelectedTxId] = useState(preselectedTransactionId || '');
  const [selectedReqId, setSelectedReqId] = useState(preselectedRequestId || '');
  const [customRef, setCustomRef] = useState('');
  const [reason, setReason] = useState('Derecho de arrepentimiento - Revocación dentro del plazo de 10 días corridos');
  const [detail, setDetail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ trackingCode: string; message: string } | null>(null);

  if (!isOpen) return null;

  // Active client transactions eligible for revocation (Held or pending within 10 days)
  const eligibleTransactions = transactions.filter(
    t => t.clientId === currentUser.id && (t.status === 'PAYMENT_HELD' || t.status === 'SERVICE_COMPLETED')
  );

  const eligibleRequests = requests.filter(
    r => r.clientId === currentUser.id && r.status !== 'COMPLETED' && r.status !== 'CANCELLED'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      alert('Por favor completá tu nombre y correo electrónico.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullReason = `${reason}. Detalle adicional: ${detail || 'Sin detalles adicionales'}. Ref externa: ${customRef || 'N/A'}`;
      const res = await processRevocation({
        transactionId: selectedTxId || undefined,
        requestId: selectedReqId || undefined,
        reason: fullReason,
        email: email.trim(),
        name: name.trim()
      });

      setResult({
        trackingCode: res.trackingCode,
        message: res.message
      });
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al procesar la revocación. Por favor intentá nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setResult(null);
    setDetail('');
    setCustomRef('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 relative my-8 animate-in fade-in zoom-in duration-150">
        
        {/* Header with official Resolution label */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800 text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                <span>Resolución 271/2020 SCI</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Botón de Arrepentimiento
              </h2>
              <p className="text-xs text-zinc-400">
                Revocación de la Aceptación · Ley 24.240 de Defensa del Consumidor
              </p>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          /* Confirmation Screen */
          <div className="space-y-6 py-2 text-center">
            <div className="w-16 h-16 rounded-3xl bg-emerald-950 border border-emerald-500 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-950/50">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white">
                Trámite de Revocación Registrado
              </h3>
              <p className="text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
                Conforme al Art. 34 de la Ley 24.240 y la Res. 271/2020 de la Secretaría de Comercio Interior, tu solicitud ha sido admitida sin costo ni penalidad alguna.
              </p>
            </div>

            {/* Tracking code certificate box */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-slate-800 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-semibold">Código de Identificación de Trámite:</span>
                <span className="font-mono font-black text-amber-400 text-sm">{result.trackingCode}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-2">
                <span className="text-zinc-400">Notificado al email:</span>
                <span className="font-mono text-white text-xs">{email}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-2">
                <span className="text-zinc-400">Estado de Reintegro Escrow:</span>
                <span className="text-emerald-400 font-bold">PROCESADO / EN DEVOLUCIÓN</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Conserve su código de trámite. Si abonó mediante Mercado Pago o tarjeta, la reversión del importe en custodia se reflejará en el medio de pago original de acuerdo a los plazos bancarios vigentes.
            </p>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs sm:text-sm cursor-pointer shadow-lg shadow-red-600/30 transition-all"
            >
              Cerrar y Volver a la Plataforma
            </button>
          </div>
        ) : (
          /* Submission Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Legal notification banner */}
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-900/60 text-amber-200/90 text-xs leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Plazo legal de 10 días corridos</span>
              </div>
              <p className="text-[11px] text-zinc-300">
                Usted tiene derecho a revocar la contratación dentro del plazo de 10 (diez) días corridos contados a partir de la aceptación del presupuesto o del pago en garantía, siempre que el servicio técnico no haya sido completamente ejecutado.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Nombre y Apellido</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="Titular de la contratación"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Email de Contacto</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="ejemplo@correo.com"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Select Transaction if available */}
            {eligibleTransactions.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Seleccionar Pago en Custodia a Reintegrar (Opcional)
                </label>
                <select
                  value={selectedTxId}
                  onChange={e => setSelectedTxId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">-- No especificar o ingresar referencia manual --</option>
                  {eligibleTransactions.map(t => (
                    <option key={t.id} value={t.id}>
                      Pago #{t.id} - ${t.amountArs.toLocaleString('es-AR')} ARS
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Select Request if available */}
            {eligibleRequests.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Seleccionar Solicitud de Servicio a Cancelar (Opcional)
                </label>
                <select
                  value={selectedReqId}
                  onChange={e => setSelectedReqId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">-- Ninguna --</option>
                  {eligibleRequests.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.category})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Manual reference code */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Número de Presupuesto, Factura o Código de Operación
              </label>
              <input
                type="text"
                value={customRef}
                onChange={e => setCustomRef(e.target.value)}
                placeholder="Ej: COT-2026-8492 / MP-9481920 / Presupuesto Gasista"
                className="w-full px-3.5 py-2 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {/* Motivo de arrepentimiento */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Motivo de la Revocación
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3.5 py-2 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="Derecho de arrepentimiento - Revocación dentro del plazo de 10 días corridos">
                  Ejercicio voluntario del derecho de arrepentimiento (10 días)
                </option>
                <option value="Servicio no requerido o reprogramado">
                  Ya no requiero el servicio solicitado
                </option>
                <option value="Falta de acuerdo en fecha u horario con el profesional">
                  Imposibilidad de coordinar agenda u horario
                </option>
                <option value="Presupuesto o alcance modificado">
                  Cambio en las condiciones de la obra o presupuesto
                </option>
                <option value="Error involuntario al realizar el pago o solicitud">
                  Error al realizar la solicitud o pago
                </option>
                <option value="Otro motivo">
                  Otro motivo
                </option>
              </select>
            </div>

            {/* Comentario adicional */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Detalle o Comentario Adicional (Opcional)
              </label>
              <textarea
                rows={2}
                value={detail}
                onChange={e => setDetail(e.target.value)}
                placeholder="Explicación breve para el legajo..."
                className="w-full px-3.5 py-2 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <span className="text-[10px] text-zinc-500">
                Sin costo ni gastos para el consumidor
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isSubmitting ? 'Procesando...' : 'Confirmar Arrepentimiento'}</span>
                </button>
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
