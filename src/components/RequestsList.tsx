import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ServiceRequest, Quote } from '../types';
import { 
  FileText, Clock, DollarSign, MapPin, CheckCircle2, 
  MessageSquare, ChevronRight, AlertCircle, Sparkles 
} from 'lucide-react';

interface RequestsListProps {
  onSendQuoteForRequest: (req: ServiceRequest) => void;
  onOpenChatWithClient: (clientId: string) => void;
}

export const RequestsList: React.FC<RequestsListProps> = ({
  onSendQuoteForRequest,
  onOpenChatWithClient
}) => {
  const { requests, quotes, acceptQuote, currentUser } = useApp();
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  const isPro = currentUser.role === 'PROFESSIONAL';

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-white/60 pb-3">
        <div>
          <h2 className="font-bold text-slate-900 text-lg">Solicitudes de Servicios Locales</h2>
          <p className="text-xs text-slate-500">
            {isPro ? 'Oportunidades de trabajo cerca de tu zona de cobertura' : 'Tus publicaciones y presupuestos recibidos'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requests.map(req => {
          const reqQuotes = quotes.filter(q => q.requestId === req.id);
          const isMyReq = req.clientId === currentUser.id;

          return (
            <div 
              key={req.id} 
              className="bg-white/70 backdrop-blur-md rounded-3xl border border-white/80 shadow-md hover:shadow-xl hover:border-blue-400/40 transition-all p-4.5 space-y-3 relative"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1">
                  {req.isDemoData && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300/80 px-2 py-0.5 rounded-full inline-block mr-1">
                      🧪 SOLICITUD DE EJEMPLO — DEMO
                    </span>
                  )}
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border backdrop-blur-md ${
                    req.urgency === 'URGENTE' 
                      ? 'bg-rose-500/10 text-rose-700 border-rose-200' 
                      : 'bg-blue-500/10 text-blue-700 border-blue-200'
                  }`}>
                    {req.urgency === 'URGENTE' ? '🚨 Urgente' : 'Normal'} • {req.category}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base leading-snug">{req.title}</h3>
                </div>

                {req.estimatedBudgetArs && (
                  <div className="bg-white/80 backdrop-blur-sm border border-white/80 px-3 py-1 rounded-2xl text-right shrink-0 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block font-semibold">Presupuesto Est.</span>
                    <span className="font-bold text-slate-900 text-xs">${req.estimatedBudgetArs.toLocaleString('es-AR')}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                {req.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-100/80 font-medium">
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-rose-500" />
                  {req.approxLocation}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={13} className="text-blue-500" />
                  {req.preferredDate}
                </span>
              </div>

              {/* Quotes info strip */}
              <div className="p-3 bg-slate-50/70 backdrop-blur-sm rounded-2xl border border-white/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" />
                  <span className="font-bold text-slate-800">
                    {reqQuotes.length} {reqQuotes.length === 1 ? 'presupuesto enviado' : 'presupuestos recibidos'}
                  </span>
                </div>

                {isPro && !isMyReq ? (
                  <button
                    onClick={() => onSendQuoteForRequest(req)}
                    className="py-1.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all border border-white/20 active:scale-95"
                  >
                    Enviar Presupuesto
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedRequest(req)}
                    className="py-1.5 px-3 border border-white/80 bg-white/60 hover:bg-white text-slate-800 font-bold text-xs rounded-xl transition-all shadow-2xs"
                  >
                    Ver Presupuestos ({reqQuotes.length})
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Request Modal / Quotes Breakdown */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto text-xs">
          <div className="bg-white/85 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-lg w-full my-auto border border-white/80 p-6 space-y-4 max-h-[90vh] overflow-y-auto relative">
            <button 
              onClick={() => setSelectedRequest(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-white/80 border border-transparent hover:border-slate-200 transition-colors"
            >
              ✕
            </button>

            <div>
              <span className="font-bold text-blue-600 uppercase text-[10px] bg-blue-50/80 backdrop-blur-sm px-3 py-1 rounded-full border border-blue-200">
                Presupuestos Recibidos
              </span>
              <h3 className="font-bold text-slate-900 text-lg mt-1">{selectedRequest.title}</h3>
            </div>

            <div className="space-y-3">
              {quotes.filter(q => q.requestId === selectedRequest.id).map(q => (
                <div key={q.id} className="p-4 bg-white/70 backdrop-blur-sm border border-white/80 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <img src={q.professionalAvatar} alt={q.professionalName} className="w-9 h-9 rounded-full object-cover border border-white" />
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{q.professionalName}</p>
                        <p className="text-[10px] text-emerald-700 font-semibold">⭐ {q.professionalRating} / 5</p>
                      </div>
                    </div>
                    <span className="font-extrabold text-slate-900 text-base">
                      ${q.priceArs.toLocaleString('es-AR')} ARS
                    </span>
                  </div>

                  <p className="text-slate-700 leading-relaxed">{q.description}</p>

                  <div className="p-2.5 bg-slate-50/80 rounded-xl text-[11px] text-slate-600 space-y-1 border border-slate-200/60">
                    <p><strong>Insumos:</strong> {q.materialsIncluded}</p>
                    <p><strong>Garantía:</strong> {q.warrantyInfo}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onOpenChatWithClient(q.professionalId)}
                      className="flex-1 py-2 border border-slate-300 font-bold text-slate-700 rounded-xl hover:bg-white"
                    >
                      Conversar en Chat
                    </button>
                    <button
                      onClick={() => {
                        acceptQuote(q.id);
                        alert(`¡Presupuesto de ${q.professionalName} aceptado con éxito!`);
                        setSelectedRequest(null);
                      }}
                      className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md border border-white/20"
                    >
                      Aceptar Presupuesto
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
