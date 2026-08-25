import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ServiceRequest } from '../types';
import {
  FileText, Clock, MapPin, AlertCircle, Play, CheckCircle2,
  CreditCard, MessageSquare
} from 'lucide-react';

interface RequestsListProps {
  onSendQuoteForRequest: (req: ServiceRequest) => void;
  onOpenChatWithClient: (userId: string) => void;
}

const requestStatusLabel: Record<ServiceRequest['status'], string> = {
  REQUEST_CREATED: 'Solicitud abierta',
  QUOTES_RECEIVED: 'Presupuestos recibidos',
  PROFESSIONAL_SELECTED: 'Profesional seleccionado',
  PAYMENT_PENDING: 'Pago pendiente',
  IN_PROGRESS: 'Trabajo en curso',
  COMPLETED: 'Completado',
  REVIEW_PENDING: 'Esperando reseña',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado'
};

const transactionStatusLabel: Record<string, string> = {
  PAYMENT_PENDING: 'Pago pendiente',
  PAID: 'Pago confirmado',
  SERVICE_IN_PROGRESS: 'Servicio en curso',
  SERVICE_COMPLETED: 'Servicio completado',
  SETTLED: 'Liquidado',
  REFUNDED: 'Reembolsado',
  CANCELLED: 'Cancelado',
  CHARGEBACK: 'Contracargo'
};

export const RequestsList: React.FC<RequestsListProps> = ({
  onSendQuoteForRequest,
  onOpenChatWithClient
}) => {
  const {
    requests,
    quotes,
    transactions,
    acceptQuote,
    createMercadoPagoCheckout,
    connectMercadoPago,
    startJob,
    completeJob,
    currentUser
  } = useApp();
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  if (!currentUser) return null;

  const isPro = currentUser.role === 'PROFESSIONAL';

  const runJobAction = async (requestId: string, action: () => Promise<void>, successMessage: string) => {
    setActionError(null);
    setBusyRequestId(requestId);
    try {
      await action();
      setActionError(successMessage);
    } catch (error: any) {
      setActionError(error?.message || 'No se pudo completar la operación.');
    } finally {
      setBusyRequestId(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {actionError && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 text-xs flex items-start justify-between gap-2 shadow-xs">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Estado de operación</p>
              <p className="mt-0.5 leading-relaxed">{actionError}</p>
            </div>
          </div>
          <button onClick={() => setActionError(null)} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Cerrar aviso">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-white/60 pb-3 gap-3">
        <div>
          <h2 className="font-bold text-slate-900 text-lg">Solicitudes de Servicios Locales</h2>
          <p className="text-xs text-slate-500">
            {isPro ? 'Oportunidades de trabajo y trabajos contratados' : 'Tus publicaciones y presupuestos recibidos'}
          </p>
        </div>
        {isPro && (
          <button
            onClick={() => runJobAction('mercado-pago', connectMercadoPago, 'Mercado Pago: iniciando vinculación…')}
            className="shrink-0 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-sm"
          >
            Conectar Mercado Pago
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requests.map(req => {
          const reqQuotes = quotes.filter(q => q.requestId === req.id);
          const transaction = transactions.find(t => t.serviceRequestId === req.id);
          const isMyRequest = req.clientId === currentUser.id;
          const isAssignedPro = isPro && transaction?.professionalId === currentUser.id;
          const canStart = isAssignedPro && req.status === 'PROFESSIONAL_SELECTED' && transaction?.status === 'PAID';
          const canComplete = isAssignedPro && req.status === 'IN_PROGRESS' && transaction?.status === 'SERVICE_IN_PROGRESS';

          return (
            <div key={req.id} className="bg-white/70 backdrop-blur-md rounded-3xl border border-white/80 shadow-md p-4 space-y-3 relative">
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1 min-w-0">
                  {req.isDemoData && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300/80 px-2 py-0.5 rounded-full inline-block">
                      🧪 DEMO
                    </span>
                  )}
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-blue-500/10 text-blue-700 border-blue-200">
                    {req.urgency === 'URGENTE' ? '🚨 Urgente' : 'Normal'} • {req.category}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base leading-snug">{req.title}</h3>
                </div>
                {req.estimatedBudgetArs && (
                  <div className="bg-white/80 border border-white/80 px-3 py-1 rounded-2xl text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block font-semibold">Presupuesto</span>
                    <span className="font-bold text-slate-900 text-xs">${req.estimatedBudgetArs.toLocaleString('es-AR')}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{req.description}</p>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-100/80 font-medium">
                <span className="flex items-center gap-1"><MapPin size={13} className="text-rose-500" />{req.approxLocation}</span>
                <span className="flex items-center gap-1"><Clock size={13} className="text-blue-500" />{req.preferredDate}</span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-2xl border border-white/60 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <FileText size={16} className="text-blue-600" />
                    {requestStatusLabel[req.status]}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {reqQuotes.length} {reqQuotes.length === 1 ? 'presupuesto' : 'presupuestos'}
                  </span>
                </div>

                {transaction && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-600">
                    <CreditCard size={14} className="text-emerald-600" />
                    <span>{transactionStatusLabel[transaction.status] || transaction.status}</span>
                  </div>
                )}

                {isAssignedPro && canStart && (
                  <button
                    disabled={busyRequestId === req.id}
                    onClick={() => runJobAction(req.id, () => startJob(req.id), 'Trabajo iniciado correctamente.')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md"
                  >
                    <Play size={15} />
                    {busyRequestId === req.id ? 'Iniciando…' : 'Iniciar trabajo'}
                  </button>
                )}

                {isAssignedPro && canComplete && (
                  <button
                    disabled={busyRequestId === req.id}
                    onClick={() => runJobAction(req.id, () => completeJob(req.id), 'Trabajo marcado como completado. Ahora queda pendiente la reseña del cliente.')}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md"
                  >
                    <CheckCircle2 size={15} />
                    {busyRequestId === req.id ? 'Guardando…' : 'Completar trabajo'}
                  </button>
                )}

                {isAssignedPro && !canStart && !canComplete && ['PROFESSIONAL_SELECTED', 'IN_PROGRESS'].includes(req.status) && transaction && (
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {transaction.status === 'PAYMENT_PENDING' ? 'El trabajo quedará habilitado cuando Mercado Pago confirme el pago.' : 'La transición siguiente depende del estado comercial confirmado por el backend.'}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {isPro && !isMyRequest && !isAssignedPro ? (
                  <button onClick={() => onSendQuoteForRequest(req)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md">Enviar Presupuesto</button>
                ) : (
                  <button onClick={() => setSelectedRequest(req)} className="flex-1 py-2 border border-white/80 bg-white/60 hover:bg-white text-slate-800 font-bold text-xs rounded-xl shadow-2xs">Ver detalle</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto text-xs">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-lg w-full my-auto border border-white/80 p-6 space-y-4 max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setSelectedRequest(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5" aria-label="Cerrar">✕</button>
            <div>
              <span className="font-bold text-blue-600 uppercase text-[10px] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">Detalle del trabajo</span>
              <h3 className="font-bold text-slate-900 text-lg mt-2">{selectedRequest.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{requestStatusLabel[selectedRequest.status]}</p>
            </div>

            <div className="space-y-3">
              {quotes.filter(q => q.requestId === selectedRequest.id).map(q => (
                <div key={q.id} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={q.professionalAvatar} alt={q.professionalName} className="w-9 h-9 rounded-full object-cover border border-white" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{q.professionalName}</p>
                        <p className="text-[10px] text-emerald-700 font-semibold">⭐ {q.professionalRating} / 5</p>
                      </div>
                    </div>
                    <span className="font-extrabold text-slate-900 text-sm shrink-0">${q.priceArs.toLocaleString('es-AR')} ARS</span>
                  </div>

                  <p className="text-slate-700 leading-relaxed">{q.description}</p>
                  <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-600 space-y-1 border border-slate-200/60">
                    <p><strong>Insumos:</strong> {q.materialsIncluded || 'No especificado'}</p>
                    <p><strong>Garantía:</strong> {q.warrantyInfo || 'No especificada'}</p>
                    <p><strong>Estado:</strong> {q.status}</p>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => onOpenChatWithClient(q.professionalId)} className="flex-1 py-2 border border-slate-300 font-bold text-slate-700 rounded-xl hover:bg-white flex items-center justify-center gap-1.5">
                      <MessageSquare size={14} /> Chat
                    </button>
                    {q.status === 'PENDING' && isMyRequest && (
                      <button
                        onClick={async () => {
                          setActionError(null);
                          const checkoutWindow = window.open('about:blank', '_blank');
                          try {
                            const transaction = await acceptQuote(q.id);
                            if (transaction?.id) {
                              const initPoint = await createMercadoPagoCheckout(transaction.id);
                              if (checkoutWindow) checkoutWindow.location.href = initPoint;
                              else window.location.assign(initPoint);
                            }
                          } catch (error: any) {
                            if (checkoutWindow && !checkoutWindow.closed) checkoutWindow.close();
                            setActionError(error?.message || 'No se pudo aceptar el presupuesto.');
                          }
                        }}
                        className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md flex items-center justify-center gap-1.5"
                      >
                        <CreditCard size={14} /> Aceptar y pagar
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {quotes.filter(q => q.requestId === selectedRequest.id).length === 0 && (
                <p className="text-center text-slate-500 py-6">Todavía no hay presupuestos para esta solicitud.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};