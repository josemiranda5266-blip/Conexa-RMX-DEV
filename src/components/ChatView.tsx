import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  MessageSquare,
  Send,
  ShieldCheck,
  CheckCircle2,
  FileText,
  User as UserIcon,
  Clock,
  DollarSign
} from 'lucide-react';
import { Quote, User } from '../types';

export const ChatView: React.FC<{
  onOpenEscrowModal: (quote: Quote) => void;
}> = ({ onOpenEscrowModal }) => {
  const {
    conversations,
    messages,
    users,
    currentUser,
    selectedConversationId,
    setSelectedConversationId,
    sendMessage,
    requests
  } = useApp();

  const [inputMessage, setInputMessage] = useState('');

  const activeConv = conversations.find(c => c.id === selectedConversationId) || conversations[0] || null;
  
  // Find other participant
  const otherUserId = activeConv?.participantIds.find(id => id !== currentUser.id) || '';
  const otherUser: User = users.find(u => u.id === otherUserId) || {
    id: otherUserId,
    name: 'Usuario CONEXA',
    email: 'contacto@conexa.com.ar',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    role: 'PROFESSIONAL',
    isProfessionalVerified: true
  };

  const activeMessages = activeConv ? messages.filter(m => m.conversationId === activeConv.id) : [];
  const targetReq = activeConv?.serviceRequestId ? requests.find(r => r.id === activeConv.serviceRequestId) : null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConv) return;
    const textToSend = inputMessage.trim();
    setInputMessage('');
    await sendMessage(activeConv.id, textToSend, 'TEXT');
  };

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-md overflow-hidden h-[calc(100vh-180px)] min-h-[500px] flex flex-col md:flex-row">
      
      {/* Sidebar: Conversation List */}
      <div className="w-full md:w-80 border-r border-slate-800 flex flex-col bg-zinc-950/60">
        <div className="p-4 border-b border-slate-800">
          <h2 className="font-extrabold text-white text-base">Mensajes & Negociación</h2>
          <span className="text-xs text-zinc-400">{conversations.length} conversaciones activas</span>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-slate-800/60">
          {conversations.map(conv => {
            const partnerId = conv.participantIds.find(id => id !== currentUser.id);
            const partner = users.find(u => u.id === partnerId);
            const partnerName = partner?.name || 'Contacto CONEXA';
            const partnerAvatar = partner?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
            const isSelected = activeConv?.id === conv.id;

            return (
              <button
                key={conv.id}
                onClick={() => setSelectedConversationId(conv.id)}
                className={`w-full p-4 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                  isSelected ? 'bg-gradient-to-r from-slate-900 to-blue-950 border-l-4 border-red-500' : 'hover:bg-slate-900/60'
                }`}
              >
                <img
                  src={partnerAvatar}
                  alt={partnerName}
                  className="w-10 h-10 rounded-full object-cover border border-slate-800 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs sm:text-sm text-white truncate">{partnerName}</span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">{conv.lastMessage || 'Conversación'}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Panel */}
      {activeConv ? (
        <div className="flex-1 flex flex-col h-full bg-slate-900/80">
          
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-zinc-950/80 z-10">
            <div className="flex items-center gap-3">
              <img
                src={otherUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={otherUser.name}
                className="w-10 h-10 rounded-full object-cover border border-slate-800"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white">{otherUser.name}</h3>
                  {otherUser.isProfessionalVerified && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800/60">Verificado</span>
                  )}
                </div>
                {targetReq && (
                  <span className="text-[11px] text-zinc-400 block truncate max-w-sm">
                    Re: {targetReq.title}
                  </span>
                )}
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Garantía Escrow Activa</span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-zinc-950/40">
            {activeMessages.map(msg => {
              const isMe = msg.senderId === currentUser.id;

              if (msg.type === 'SYSTEM') {
                return (
                  <div key={msg.id} className="text-center my-3">
                    <span className="inline-block px-3 py-1 rounded-full bg-slate-800 text-zinc-300 border border-slate-700 text-[11px] font-semibold">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              if (msg.type === 'QUOTE_PROPOSAL' && msg.quoteData) {
                const quote = msg.quoteData;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-2`}
                  >
                    <div className="max-w-md w-full p-5 rounded-2xl bg-zinc-950 border border-slate-800 shadow-md space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                          Propuesta Formal de Cotización
                        </span>
                        <span className="font-extrabold text-white text-base">
                          ${quote.priceArs.toLocaleString('es-AR')}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                        {quote.description}
                      </p>

                      {quote.materialsIncluded && (
                        <div className="text-[11px] bg-slate-900 p-2 rounded-lg text-zinc-300 border border-slate-800">
                          <strong className="text-white">Materiales:</strong> {quote.materialsIncluded}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-zinc-400">
                        <span>Garantía: {quote.warrantyInfo || '6 meses'}</span>
                        
                        {currentUser.role === 'CLIENT' && quote.status === 'PENDING' && (
                          <button
                            onClick={() => onOpenEscrowModal(quote)}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1 border border-red-500/40"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Aceptar</span>
                          </button>
                        )}
                        {quote.status === 'ACCEPTED' && (
                          <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Aceptado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-sm sm:max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isMe
                        ? 'bg-gradient-to-r from-red-600 to-red-700 text-white rounded-br-xs shadow-md border border-red-500/40'
                        : 'bg-zinc-950 text-zinc-200 border border-slate-800 rounded-bl-xs shadow-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1 px-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Message Input Box */}
          <form onSubmit={handleSend} className="p-3 sm:p-4 border-t border-slate-800 bg-zinc-950 flex items-center gap-2">
            <input
              type="text"
              placeholder="Escribí un mensaje..."
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-900/90 border border-slate-800 rounded-xl focus:outline-none focus:border-red-500/60 focus:bg-slate-900 transition-all text-white placeholder-zinc-500"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all border border-red-500/40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </form>

        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 text-zinc-400 text-sm">
          Seleccioná una conversación para empezar a chatear.
        </div>
      )}

    </div>
  );
};
