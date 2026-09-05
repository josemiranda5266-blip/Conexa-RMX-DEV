import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  PlusCircle,
  Search,
  Filter,
  MapPin,
  Clock,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  MessageSquare,
  Star,
  FileText,
  UserCheck,
  Send
} from 'lucide-react';
import { ServiceRequest, Quote, RequestStatus } from '../types';
import { isUserCandidateProfessional } from '../domain/professionalEligibility';

export const RequestsView: React.FC<{
  onOpenNewRequest: () => void;
  onOpenSubmitQuote: (requestId: string) => void;
  onOpenEscrowModal: (quote: Quote) => void;
  onOpenReviewModal: (requestId: string, proId: string) => void;
}> = ({ onOpenNewRequest, onOpenSubmitQuote, onOpenEscrowModal, onOpenReviewModal }) => {
  const {
    requests,
    quotes,
    currentUser,
    categories,
    selectedRequestId,
    setSelectedRequestId,
    createConversation,
    setActiveView,
    setSelectedConversationId,
    completeJob,
    transactions,
    releasePayment
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter requests
  const filteredRequests = requests.filter(req => {
    if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && req.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        req.title.toLowerCase().includes(q) ||
        req.description.toLowerCase().includes(q) ||
        req.zone.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedRequest = requests.find(r => r.id === selectedRequestId) || filteredRequests[0] || null;
  const requestQuotes = selectedRequest ? quotes.filter(q => q.requestId === selectedRequest.id) : [];
  const associatedTx = selectedRequest ? transactions.find(t => t.serviceRequestId === selectedRequest.id) : null;

  const handleStartChat = (targetUserId: string, reqId: string) => {
    const convId = createConversation(targetUserId, reqId);
    setSelectedConversationId(convId);
    setActiveView('messages');
  };

  const handleCompleteJob = async (reqId: string) => {
    setIsProcessing(true);
    try {
      await completeJob(reqId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReleasePayment = async (txId: string, reqId: string, proId: string) => {
    setIsProcessing(true);
    try {
      await releasePayment(txId);
      onOpenReviewModal(reqId, proId);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Solicitudes de Trabajo</h1>
          <p className="text-sm text-zinc-400">
            {currentUser.role === 'CLIENT'
              ? 'Gestioná tus pedidos de presupuesto y seguí el avance de tus obras.'
              : 'Explorá requerimientos de clientes, cotizá y gestioná tus órdenes activas.'}
          </p>
        </div>

        {currentUser.role === 'CLIENT' && (
          <button
            onClick={onOpenNewRequest}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm shadow-md shadow-red-600/30 border border-red-500/50 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nueva Solicitud</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por título, zona o palabras clave..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-zinc-950 border border-slate-800 rounded-xl focus:outline-none focus:border-red-500/60 focus:bg-zinc-900 text-white transition-all"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm bg-zinc-950 border border-slate-800 rounded-xl focus:outline-none focus:border-red-500/60 text-zinc-200 cursor-pointer"
          >
            <option value="ALL">Todos los rubros</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'QUOTES_RECEIVED', label: 'Con Presupuestos' },
            { id: 'PROFESSIONAL_SELECTED', label: 'En Progreso' },
            { id: 'REVIEW_PENDING', label: 'Por Calificar' },
            { id: 'COMPLETED', label: 'Completadas' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-xs border border-red-500/40'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Layout: Request List + Detailed View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Requests List Column */}
        <div className="lg:col-span-5 space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="p-8 bg-slate-900/80 rounded-2xl border border-slate-800 text-center space-y-3">
              <FileText className="w-10 h-10 text-zinc-600 mx-auto" />
              <div className="font-semibold text-white text-sm">No se encontraron solicitudes</div>
              <p className="text-xs text-zinc-400">Probá ajustando los filtros de búsqueda o creá una nueva solicitud.</p>
            </div>
          ) : (
            filteredRequests.map(req => {
              const isSelected = selectedRequest?.id === req.id;
              return (
                <div
                  key={req.id}
                  onClick={() => setSelectedRequestId(req.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-gradient-to-br from-slate-900 to-blue-950 border-red-500/80 ring-1 ring-red-500/50 shadow-md'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-950 text-zinc-300 border border-zinc-800 capitalize">
                      {req.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      req.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      req.status === 'REVIEW_PENDING' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                      req.status === 'PROFESSIONAL_SELECTED' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                      req.status === 'QUOTES_RECEIVED' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-zinc-950 text-zinc-400 border border-zinc-800'
                    }`}>
                      {req.status === 'COMPLETED' ? 'Finalizado' :
                       req.status === 'REVIEW_PENDING' ? 'Revisión Pendiente' :
                       req.status === 'PROFESSIONAL_SELECTED' ? 'Asignado' :
                       req.status === 'QUOTES_RECEIVED' ? `${req.quotesCount} Presupuestos` :
                       'En Espera'}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm leading-snug line-clamp-1">{req.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{req.description}</p>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-zinc-400" />
                      {req.zone}
                    </span>
                    {req.budgetArs ? (
                      <span className="font-bold text-white">${req.budgetArs.toLocaleString('es-AR')}</span>
                    ) : (
                      <span>A convenir</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Request Full Detail & Quotes Column */}
        <div className="lg:col-span-7">
          {selectedRequest ? (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-md">
              
              {/* Header & Status */}
              <div className="space-y-3 pb-4 border-b border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-950 text-red-400 border border-red-800/60 capitalize">
                    {selectedRequest.category}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    selectedRequest.urgency === 'EMERGENCY' ? 'bg-red-950 text-red-300 border border-red-800' :
                    selectedRequest.urgency === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    'bg-zinc-950 text-zinc-400 border border-zinc-800'
                  }`}>
                    Prioridad: {selectedRequest.urgency}
                  </span>
                </div>

                <h2 className="text-xl font-extrabold text-white leading-snug">
                  {selectedRequest.title}
                </h2>

                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <MapPin className="w-4 h-4 text-zinc-400" />
                    {selectedRequest.zone} {selectedRequest.address ? `(${selectedRequest.address})` : ''}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    Publicado hace unas horas
                  </span>
                  {selectedRequest.budgetArs && (
                    <span className="flex items-center gap-1.5 font-bold text-white">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      Presupuesto estimado: ${selectedRequest.budgetArs.toLocaleString('es-AR')}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Descripción de la necesidad</h4>
                <p className="text-sm text-zinc-200 leading-relaxed bg-zinc-950 p-4 rounded-xl border border-slate-800">
                  {selectedRequest.description}
                </p>
              </div>

              {/* Action Banner according to status */}
              {selectedRequest.status === 'PROFESSIONAL_SELECTED' && associatedTx && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950 to-slate-900 border border-blue-800 text-xs text-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold flex items-center gap-1.5 text-white">
                      <ShieldCheck className="w-4 h-4 text-blue-400" />
                      <span>Trabajo en progreso — Fondos en Garantía Escrow CONEXA</span>
                    </div>
                    <span className="font-extrabold text-blue-300">${associatedTx.amountArs.toLocaleString('es-AR')}</span>
                  </div>
                  <p className="text-zinc-300">
                    Los fondos están retenidos. Cuando el profesional complete el trabajo, podrás verificar el resultado y liberar el pago.
                  </p>
                  
                  {isUserCandidateProfessional(currentUser) && (
                    <button
                      disabled={isProcessing}
                      onClick={() => handleCompleteJob(selectedRequest.id)}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs transition-all cursor-pointer border border-red-500/40"
                    >
                      {isProcessing ? 'Procesando...' : 'Marcar Trabajo como Finalizado'}
                    </button>
                  )}
                </div>
              )}

              {selectedRequest.status === 'REVIEW_PENDING' && associatedTx && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950 to-slate-900 border border-purple-800 text-xs text-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold flex items-center gap-1.5 text-white">
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                      <span>¡El profesional finalizó la tarea!</span>
                    </div>
                    <span className="font-bold text-purple-300">${associatedTx.amountArs.toLocaleString('es-AR')}</span>
                  </div>
                  <p className="text-zinc-300">
                    Revisá la calidad del trabajo. Al presionar el botón liberarás los fondos retenidos al profesional y podrás dejarle una reseña pública.
                  </p>
                  {currentUser.role === 'CLIENT' && (
                    <button
                      disabled={isProcessing}
                      onClick={() => handleReleasePayment(associatedTx.id, selectedRequest.id, associatedTx.professionalId)}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold text-xs transition-all cursor-pointer"
                    >
                      {isProcessing ? 'Liberando...' : 'Liberar Pago & Dejar Calificación'}
                    </button>
                  )}
                </div>
              )}

              {/* Quotes Section */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">
                    Cotizaciones Recibidas ({requestQuotes.length})
                  </h3>

                  {isUserCandidateProfessional(currentUser) && (selectedRequest.status === 'PENDING' || selectedRequest.status === 'QUOTES_RECEIVED') ? (
                    <button
                      onClick={() => onOpenSubmitQuote(selectedRequest.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      Enviar Cotización Formal
                    </button>
                  ) : null}
                </div>

                {requestQuotes.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center space-y-2 bg-zinc-950/60">
                    <p className="text-xs text-zinc-400">Aún no hay cotizaciones para esta solicitud.</p>
                    {isUserCandidateProfessional(currentUser) && (
                      <button
                        onClick={() => onOpenSubmitQuote(selectedRequest.id)}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-500 cursor-pointer"
                      >
                        Sé el primero en cotizar
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requestQuotes.map(quote => (
                      <div
                        key={quote.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          quote.status === 'ACCEPTED'
                            ? 'bg-gradient-to-br from-slate-900 to-blue-950 border-red-500/80'
                            : 'bg-zinc-950/80 border-slate-800'
                        }`}
                      >
                        {/* Quote Header */}
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-3">
                            <img
                              src={quote.professionalAvatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100'}
                              alt={quote.professionalName}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-800"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-white text-sm">{quote.professionalName}</h4>
                                {quote.professionalVerified && (
                                  <UserCheck className="w-3.5 h-3.5 text-red-400" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-zinc-400">
                                <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  {quote.professionalRating || 5.0}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs text-zinc-400">Monto total ARS</div>
                            <div className="font-extrabold text-white text-lg">
                              ${quote.priceArs.toLocaleString('es-AR')}
                            </div>
                          </div>
                        </div>

                        {/* Quote Body */}
                        <div className="py-3 text-xs text-zinc-300 space-y-2">
                          <p className="font-medium text-white">{quote.description}</p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                            {quote.materialsIncluded && (
                              <div>
                                <span className="font-semibold text-zinc-200">Materiales:</span> {quote.materialsIncluded}
                              </div>
                            )}
                            {quote.estimatedTime && (
                              <div>
                                <span className="font-semibold text-zinc-200">Tiempo estimado:</span> {quote.estimatedTime}
                              </div>
                            )}
                            {quote.availableStartDate && (
                              <div>
                                <span className="font-semibold text-zinc-200">Inicio disponible:</span> {quote.availableStartDate}
                              </div>
                            )}
                            {quote.warrantyInfo && (
                              <div>
                                <span className="font-semibold text-zinc-200">Garantía:</span> {quote.warrantyInfo}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quote Footer Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                          <button
                            onClick={() => handleStartChat(quote.professionalId, selectedRequest.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chatear con el profesional</span>
                          </button>

                          {currentUser.role === 'CLIENT' && quote.status === 'PENDING' && selectedRequest.status !== 'COMPLETED' && (
                            <button
                              onClick={() => onOpenEscrowModal(quote)}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              <span>Aceptar y Custodiar Pago</span>
                            </button>
                          )}

                          {quote.status === 'ACCEPTED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Presupuesto Aceptado</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-12 bg-slate-900/80 rounded-2xl border border-slate-800 text-zinc-400 text-sm">
              Seleccioná una solicitud para ver detalles y cotizaciones
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
