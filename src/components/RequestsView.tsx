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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Solicitudes de Trabajo</h1>
          <p className="text-sm text-slate-500">
            {currentUser.role === 'CLIENT'
              ? 'Gestioná tus pedidos de presupuesto y seguí el avance de tus obras.'
              : 'Explorá requerimientos de clientes, cotizá y gestioná tus órdenes activas.'}
          </p>
        </div>

        {currentUser.role === 'CLIENT' && (
          <button
            onClick={onOpenNewRequest}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-sm transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nueva Solicitud</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por título, zona o palabras clave..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition-all"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 text-slate-700 cursor-pointer"
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
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="font-semibold text-slate-800 text-sm">No se encontraron solicitudes</div>
              <p className="text-xs text-slate-500">Probá ajustando los filtros de búsqueda o creá una nueva solicitud.</p>
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
                      ? 'bg-sky-50/70 border-sky-400 ring-1 ring-sky-400 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 capitalize">
                      {req.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                      req.status === 'REVIEW_PENDING' ? 'bg-purple-100 text-purple-800' :
                      req.status === 'PROFESSIONAL_SELECTED' ? 'bg-blue-100 text-blue-800' :
                      req.status === 'QUOTES_RECEIVED' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {req.status === 'COMPLETED' ? 'Finalizado' :
                       req.status === 'REVIEW_PENDING' ? 'Revisión Pendiente' :
                       req.status === 'PROFESSIONAL_SELECTED' ? 'Asignado' :
                       req.status === 'QUOTES_RECEIVED' ? `${req.quotesCount} Presupuestos` :
                       'En Espera'}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">{req.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{req.description}</p>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {req.zone}
                    </span>
                    {req.budgetArs ? (
                      <span className="font-semibold text-slate-800">${req.budgetArs.toLocaleString('es-AR')}</span>
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
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
              
              {/* Header & Status */}
              <div className="space-y-3 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 capitalize">
                    {selectedRequest.category}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    selectedRequest.urgency === 'EMERGENCY' ? 'bg-red-100 text-red-800' :
                    selectedRequest.urgency === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    Prioridad: {selectedRequest.urgency}
                  </span>
                </div>

                <h2 className="text-xl font-extrabold text-slate-900 leading-snug">
                  {selectedRequest.title}
                </h2>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {selectedRequest.zone} {selectedRequest.address ? `(${selectedRequest.address})` : ''}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Publicado hace unas horas
                  </span>
                  {selectedRequest.budgetArs && (
                    <span className="flex items-center gap-1.5 font-bold text-slate-800">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Presupuesto estimado: ${selectedRequest.budgetArs.toLocaleString('es-AR')}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Descripción de la necesidad</h4>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {selectedRequest.description}
                </p>
              </div>

              {/* Action Banner according to status */}
              {selectedRequest.status === 'PROFESSIONAL_SELECTED' && associatedTx && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-700" />
                      <span>Trabajo en progreso — Fondos en Garantía Escrow CONEXA</span>
                    </div>
                    <span className="font-extrabold text-blue-800">${associatedTx.amountArs.toLocaleString('es-AR')}</span>
                  </div>
                  <p className="text-blue-700">
                    Los fondos están retenidos. Cuando el profesional complete el trabajo, podrás verificar el resultado y liberar el pago.
                  </p>
                  
                  {currentUser.role === 'PROFESSIONAL' && (
                    <button
                      disabled={isProcessing}
                      onClick={() => handleCompleteJob(selectedRequest.id)}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      {isProcessing ? 'Procesando...' : 'Marcar Trabajo como Finalizado'}
                    </button>
                  )}
                </div>
              )}

              {selectedRequest.status === 'REVIEW_PENDING' && associatedTx && (
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-purple-700" />
                      <span>¡El profesional finalizó la tarea!</span>
                    </div>
                    <span className="font-bold text-purple-900">${associatedTx.amountArs.toLocaleString('es-AR')}</span>
                  </div>
                  <p className="text-purple-700">
                    Revisá la calidad del trabajo. Al presionar el botón liberarás los fondos retenidos al profesional y podrás dejarle una reseña pública.
                  </p>
                  {currentUser.role === 'CLIENT' && (
                    <button
                      disabled={isProcessing}
                      onClick={() => handleReleasePayment(associatedTx.id, selectedRequest.id, associatedTx.professionalId)}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      {isProcessing ? 'Liberando...' : 'Liberar Pago & Dejar Calificación'}
                    </button>
                  )}
                </div>
              )}

              {/* Quotes Section */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    Cotizaciones Recibidas ({requestQuotes.length})
                  </h3>

                  {isUserCandidateProfessional(currentUser) && (selectedRequest.status === 'PENDING' || selectedRequest.status === 'QUOTES_RECEIVED') ? (
                    <button
                      onClick={() => onOpenSubmitQuote(selectedRequest.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      Enviar Cotización Formal
                    </button>
                  ) : null}
                </div>

                {requestQuotes.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-300 text-center space-y-2">
                    <p className="text-xs text-slate-500">Aún no hay cotizaciones para esta solicitud.</p>
                    {isUserCandidateProfessional(currentUser) && (
                      <button
                        onClick={() => onOpenSubmitQuote(selectedRequest.id)}
                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
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
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        {/* Quote Header */}
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <img
                              src={quote.professionalAvatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100'}
                              alt={quote.professionalName}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-slate-900 text-sm">{quote.professionalName}</h4>
                                {quote.professionalVerified && (
                                  <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                  {quote.professionalRating || 5.0}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs text-slate-500">Monto total ARS</div>
                            <div className="font-extrabold text-slate-900 text-lg">
                              ${quote.priceArs.toLocaleString('es-AR')}
                            </div>
                          </div>
                        </div>

                        {/* Quote Body */}
                        <div className="py-3 text-xs text-slate-700 space-y-2">
                          <p className="font-medium text-slate-800">{quote.description}</p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            {quote.materialsIncluded && (
                              <div>
                                <span className="font-semibold text-slate-800">Materiales:</span> {quote.materialsIncluded}
                              </div>
                            )}
                            {quote.estimatedTime && (
                              <div>
                                <span className="font-semibold text-slate-800">Tiempo estimado:</span> {quote.estimatedTime}
                              </div>
                            )}
                            {quote.availableStartDate && (
                              <div>
                                <span className="font-semibold text-slate-800">Inicio disponible:</span> {quote.availableStartDate}
                              </div>
                            )}
                            {quote.warrantyInfo && (
                              <div>
                                <span className="font-semibold text-slate-800">Garantía:</span> {quote.warrantyInfo}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quote Footer Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <button
                            onClick={() => handleStartChat(quote.professionalId, selectedRequest.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chatear con el profesional</span>
                          </button>

                          {currentUser.role === 'CLIENT' && quote.status === 'PENDING' && selectedRequest.status !== 'COMPLETED' && (
                            <button
                              onClick={() => onOpenEscrowModal(quote)}
                              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              <span>Aceptar y Custodiar Pago</span>
                            </button>
                          )}

                          {quote.status === 'ACCEPTED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
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
            <div className="h-full flex items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
              Seleccioná una solicitud para ver detalles y cotizaciones
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
