import React, { useState, useRef, useEffect } from 'react';
import { Conversation, Message, Quote } from '../types';
import { useApp } from '../context/AppContext';
import { ShareDataModal } from './ShareDataModal';
import { TrustBadge } from './TrustBadge';
import { 
  Send, PhoneCall, MapPin, FileText, Lock, ShieldAlert, 
  MoreVertical, CheckCheck, UserX, AlertTriangle, ArrowLeft, Paperclip, CheckCircle2 
} from 'lucide-react';

interface ChatWindowProps {
  conversation: Conversation;
  onBack: () => void;
  onRequestQuoteClick?: () => void;
  onViewQuoteDetail?: (quote: Quote) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  onBack,
  onRequestQuoteClick,
  onViewQuoteDetail
}) => {
  const { 
    currentUser, messages, sendMessage, sharePhoneWithUser, 
    shareAddressWithUser, reportUser, blockUser 
  } = useApp();

  const [inputMessage, setInputMessage] = useState('');
  const [showSharePhoneModal, setShowSharePhoneModal] = useState(false);
  const [showShareAddressModal, setShowShareAddressModal] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<any>('SPAM');
  const [reportText, setReportText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const convMessages = messages[conversation.id] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages]);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendMessage(conversation.id, inputMessage.trim(), 'TEXT');
    setInputMessage('');
  };

  const handleConfirmSharePhone = () => {
    sharePhoneWithUser(conversation.id, conversation.otherUser.id);
    setShowSharePhoneModal(false);
  };

  const handleConfirmShareAddress = () => {
    shareAddressWithUser(conversation.id, conversation.otherUser.id);
    setShowShareAddressModal(false);
  };

  const handleSubmitReport = () => {
    reportUser(conversation.otherUser.id, reportReason, reportText || 'Reporte enviado desde chat');
    setShowReportModal(false);
    setShowOverflowMenu(false);
    alert('Reporte enviado a los administradores de CONEXA para revisión.');
  };

  const handleBlockUser = () => {
    if (confirm(`¿Estás seguro de bloquear a ${conversation.otherUser.name}? No podrán enviarse mensajes.`)) {
      blockUser(conversation.otherUser.id);
      setShowOverflowMenu(false);
      onBack();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/60 backdrop-blur-xl rounded-3xl border border-white/80 overflow-hidden shadow-2xl">
      {/* Top Chat Bar */}
      <div className="bg-slate-900/90 backdrop-blur-xl text-white p-3.5 sm:p-4 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-transparent hover:border-white/10"
            aria-label="Volver"
          >
            <ArrowLeft size={20} />
          </button>

          <img 
            src={conversation.otherUser.avatar} 
            alt={conversation.otherUser.name} 
            className="w-10 h-10 rounded-full object-cover border-2 border-white/30 shadow-xs"
          />

          <div>
            <h3 className="font-bold text-sm sm:text-base text-white leading-tight flex items-center gap-1.5">
              <span>{conversation.otherUser.name}</span>
            </h3>
            <p className="text-xs text-blue-300 font-semibold truncate">
              {conversation.otherUser.profession || 'Usuario Particular'}
            </p>
          </div>
        </div>

        {/* Menu & Options */}
        <div className="relative flex items-center gap-1">
          <button
            onClick={() => setShowOverflowMenu(!showOverflowMenu)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Menú de opciones"
          >
            <MoreVertical size={20} />
          </button>

          {showOverflowMenu && (
            <div className="absolute right-0 top-12 w-48 bg-white/85 backdrop-blur-2xl text-slate-900 rounded-2xl shadow-2xl border border-white/80 p-2 z-30 space-y-1 animate-fade-in text-xs font-semibold">
              <button
                onClick={() => {
                  setShowReportModal(true);
                  setShowOverflowMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100/80 flex items-center gap-2 text-amber-700"
              >
                <AlertTriangle size={15} />
                Reportar usuario
              </button>
              <button
                onClick={handleBlockUser}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100/80 flex items-center gap-2 text-rose-600"
              >
                <UserX size={15} />
                Bloquear usuario
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Triggers Bar (Privacy Controls) */}
      <div className="bg-white/60 backdrop-blur-md border-b border-white/60 p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 font-bold text-[11px] backdrop-blur-md">
          <Lock size={12} className="text-emerald-600" />
          <span>Privacidad activa: Datos personales ocultos</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setShowSharePhoneModal(true)}
            className="px-3 py-1.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-900 font-bold flex items-center gap-1.5 transition-all shrink-0 border border-emerald-500/20 backdrop-blur-md"
          >
            <PhoneCall size={13} />
            <span>Compartir teléfono</span>
          </button>

          <button
            onClick={() => setShowShareAddressModal(true)}
            className="px-3 py-1.5 rounded-2xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-900 font-bold flex items-center gap-1.5 transition-all shrink-0 border border-blue-500/20 backdrop-blur-md"
          >
            <MapPin size={13} />
            <span>Compartir domicilio</span>
          </button>

          {onRequestQuoteClick && (
            <button
              onClick={onRequestQuoteClick}
              className="px-3 py-1.5 rounded-2xl bg-slate-900/90 hover:bg-slate-900 text-white font-bold flex items-center gap-1.5 transition-all shrink-0 border border-white/20 shadow-xs"
            >
              <FileText size={13} />
              <span>Pedir Presupuesto</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {convMessages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const isSystem = msg.type === 'SYSTEM';

          if (isSystem) {
            return (
              <div key={msg.id} className="my-2 p-3 bg-slate-200/80 rounded-2xl border border-slate-300/60 text-center text-xs text-slate-700 font-medium space-y-1">
                <p>{msg.content}</p>
              </div>
            );
          }

          if (msg.type === 'QUOTE_PROPOSAL' && msg.quoteData) {
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} my-2`}>
                <div className="max-w-md w-full bg-white rounded-2xl border border-blue-200 shadow-md p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-blue-700 flex items-center gap-1">
                      <FileText size={14} /> Presupuesto Formal CONEXA
                    </span>
                    <span className="font-bold text-slate-900 text-base">
                      ${msg.quoteData.priceArs.toLocaleString('es-AR')} ARS
                    </span>
                  </div>

                  <p className="text-xs text-slate-700">{msg.quoteData.description}</p>
                  
                  <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded-xl">
                    <p>🛠️ <strong>Materiales:</strong> {msg.quoteData.materialsIncluded}</p>
                    <p>⏱️ <strong>Tiempo estimado:</strong> {msg.quoteData.estimatedTime}</p>
                    <p>🛡️ <strong>Garantía:</strong> {msg.quoteData.warrantyInfo}</p>
                  </div>

                  {onViewQuoteDetail && (
                    <button
                      onClick={() => onViewQuoteDetail(msg.quoteData!)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Ver Detalle / Aceptar Presupuesto
                    </button>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl p-3.5 shadow-sm text-sm ${
                isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-900 border border-slate-200/80 rounded-bl-none'
              }`}>
                <p className="leading-relaxed whitespace-pre-line">{msg.content}</p>
                <div className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                  <span>{msg.createdAt}</span>
                  {isMe && <CheckCheck size={13} />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSendText} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Escribí un mensaje privado..."
          className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim()}
          className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl shadow-md transition-all flex items-center justify-center shrink-0"
          aria-label="Enviar mensaje"
        >
          <Send size={18} />
        </button>
      </form>

      {/* Share Phone Confirmation Modal */}
      <ShareDataModal
        isOpen={showSharePhoneModal}
        type="PHONE"
        recipientName={conversation.otherUser.name}
        userPhonePrivate={currentUser.phonePrivate}
        userAddressPrivate={currentUser.location.exactAddressPrivate || ''}
        onConfirm={handleConfirmSharePhone}
        onCancel={() => setShowSharePhoneModal(false)}
      />

      {/* Share Address Confirmation Modal */}
      <ShareDataModal
        isOpen={showShareAddressModal}
        type="ADDRESS"
        recipientName={conversation.otherUser.name}
        userPhonePrivate={currentUser.phonePrivate}
        userAddressPrivate={currentUser.location.exactAddressPrivate || ''}
        onConfirm={handleConfirmShareAddress}
        onCancel={() => setShowShareAddressModal(false)}
      />

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Reportar a {conversation.otherUser.name}</h3>
            
            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700">Motivo del reporte</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value as any)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-medium"
              >
                <option value="SPAM">Spam o mensajes no solicitados</option>
                <option value="ESTAFA">Intento de estafa o cobrar por fuera</option>
                <option value="ACOSO">Acoso o conducta inapropiada</option>
                <option value="PERFIL_FALSO">Perfil falso o datos engañosos</option>
                <option value="OTRO">Otro motivo</option>
              </select>

              <label className="font-semibold text-slate-700 block pt-2">Detalles adicionales</label>
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Describí brevemente lo sucedido..."
                className="w-full p-2.5 border border-slate-300 rounded-xl h-24 bg-slate-50 text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setShowReportModal(false)} 
                className="flex-1 py-2.5 border border-slate-300 rounded-xl font-semibold text-xs text-slate-700"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmitReport} 
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-semibold text-xs hover:bg-rose-700"
              >
                Enviar Reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
