import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, User, CheckCircle2, ArrowRight } from 'lucide-react';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyParsedRequest?: (data: any) => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  onApplyParsedRequest
}) => {
  const [messages, setMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; data?: any }>>([
    {
      sender: 'ai',
      text: '¡Hola! Soy el asistente inteligente de CONEXA. Contame qué servicio o solución estás buscando en tu ciudad y te ayudo a formatear la solicitud o encontrar al profesional indicado.'
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim()) return;

    const userText = inputPrompt.trim();
    setInputPrompt('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/parse-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: userText })
      });
      const data = await res.json();

      let replyText = `Interpreté tu necesidad como **${data.professionName || 'Servicio'}** en la categoría **${data.category || 'General'}**.`;
      if (data.urgency === 'URGENTE') replyText += ' 🚨 Marcado con Urgencia.';

      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: replyText,
          data
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'Pude comprender tu solicitud. Podés completarla o buscar directamente en la lista de profesionales.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in overflow-y-auto text-xs">
      <div 
        id="ai-assistant-modal-container"
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full my-auto border border-slate-200 overflow-hidden flex flex-col h-[520px] relative"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30 text-blue-300">
              <Sparkles size={20} className="animate-spin-slow" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Asistente Inteligente CONEXA IA</h3>
              <p className="text-[10px] text-blue-300">Impulsado por Gemini AI</p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="text-slate-300 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.sender === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Bot size={15} />
                </div>
              )}

              <div className={`max-w-[85%] rounded-2xl p-3 shadow-2xs ${
                m.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none font-medium' 
                  : 'bg-white text-slate-900 border border-slate-200 rounded-bl-none space-y-2'
              }`}>
                <p className="leading-relaxed">{m.text}</p>

                {m.data && onApplyParsedRequest && (
                  <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-blue-950 space-y-1 mt-2">
                    <p className="font-bold text-xs">📋 Solicitud Formateada:</p>
                    <p className="font-semibold text-slate-800">"{m.data.title}"</p>
                    <p className="text-[11px] text-slate-600">{m.data.description}</p>
                    <button
                      onClick={() => {
                        onApplyParsedRequest(m.data);
                        onClose();
                      }}
                      className="w-full mt-1.5 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 text-[11px]"
                    >
                      <span>Usar este formato para publicar</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2 items-center text-slate-500 italic text-xs p-2">
              <Bot size={16} className="animate-bounce text-blue-600" />
              <span>Analizando con IA...</span>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSendPrompt} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Ej: Necesito un contador para anotarme en el Monotributo..."
            className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            disabled={isLoading || !inputPrompt.trim()}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md disabled:opacity-50"
            aria-label="Enviar prompt"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
