import React, { useState } from 'react';
import { RadarOpportunity } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, Sparkles, Send, MapPin, Radio, ShieldAlert } from 'lucide-react';

interface NewOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewOpportunityModal: React.FC<NewOpportunityModalProps> = ({ isOpen, onClose }) => {
  const { addRadarOpportunity } = useApp();

  const [description, setDescription] = useState('');
  const [city, setCity] = useState('Santiago del Estero');
  const [province, setProvince] = useState('Santiago del Estero');
  const [neighborhood, setNeighborhood] = useState('Centro');
  const [source, setSource] = useState('Formulario Web CONEXA');
  const [sourceType, setSourceType] = useState<RadarOpportunity['sourceType']>('FORMULARIO_CONEXA');
  const [contactMethod, setContactMethod] = useState<RadarOpportunity['contactMethod']>('FORMULARIO_LANDING');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleTestAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await fetch('/api/radar/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          city,
          province
        })
      });

      const data = await res.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error("Error al analizar con IA:", err);
      // Fallback
      setAnalysisResult({
        category: "Electricidad",
        subcategory: "Reparación General",
        intent: "HIGH",
        urgency: "HIGH",
        intentScore: 90,
        confidenceScore: 95,
        reasoning: "Detección rápida de solicitud de servicio.",
        recommendedResponseText: "Hola 👋 En CONEXA podés ver profesionales verificados de tu zona de forma privada."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveOpportunity = () => {
    if (!description.trim()) return;

    const category = analysisResult?.category || "Electricidad";
    const subcategory = analysisResult?.subcategory || "Servicio General";
    const urgency = analysisResult?.urgency || "HIGH";
    const intentScore = analysisResult?.intentScore || 88;
    const confidenceScore = analysisResult?.confidenceScore || 95;

    const opportunityId = `RAD-${Math.floor(100 + Math.random() * 900)}`;

    const newOpp: RadarOpportunity = {
      id: opportunityId,
      source,
      sourceType,
      externalReference: `manual_test_${Date.now()}`,
      category,
      subcategory,
      description,
      city,
      province,
      neighborhood,
      urgency,
      intentScore,
      confidenceScore,
      status: intentScore >= 80 ? 'QUALIFIED' : 'NEW',
      detectedAt: 'Recién ingresado',
      lastUpdated: 'Ahora',
      assignedOperator: 'Operador Admin',
      matchedProfessionals: [
        {
          professionalId: 'pro-1',
          name: 'Ing. Carlos Mansilla',
          professionName: `${category} Matriculado`,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
          matchScore: 96,
          trustScore: 98,
          locationApprox: `${city} - ${neighborhood}`,
          isVerified: true,
          matchReasons: ['Matriculado oficial CONEXA', 'Zona coincidente (<2km)']
        }
      ],
      conversionStatus: 'NOT_STARTED',
      consentStatus: 'PENDING_CONSENT',
      contactMethod,
      notes: 'Prueba manual creada desde la consola de CONEXA RADAR.',
      aiAnalysis: {
        category,
        subcategory,
        intent: intentScore >= 80 ? 'HIGH' : 'MEDIUM',
        urgency,
        intentScore,
        confidenceScore,
        reasoning: analysisResult?.reasoning || 'Oportunidad verificada por la consola RADAR.',
        recommendedResponseText: analysisResult?.recommendedResponseText || 'Hola 👋 En CONEXA podés contratar profesionales verificados en tu zona de forma privada.'
      },
      attribution: {
        source: 'radar_manual_test',
        campaign: 'test_demanda',
        opportunityId
      }
    };

    addRadarOpportunity(newOpp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Radio size={20} className="animate-pulse" />
            </span>
            <div>
              <h3 className="font-extrabold text-lg text-white">Simulador / Nueva Oportunidad</h3>
              <p className="text-xs text-slate-400">Ingresá un texto de demanda para probar la clasificación con IA en tiempo real.</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleTestAI} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Texto o publicación manifestando necesidad: <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. ¿Alguien conoce un electricista matriculado en Santiago del Estero? Se me quemó la térmica y necesito solucionarlo hoy."
              className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Ciudad:</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">Barrio / Zona:</label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Fuente:</label>
              <select
                value={sourceType}
                onChange={(e) => {
                  setSourceType(e.target.value as any);
                  setSource(e.target.options[e.target.selectedIndex].text);
                }}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-medium"
              >
                <option value="FORMULARIO_CONEXA">Formulario Web CONEXA</option>
                <option value="META_INTEGRATION_OFFICIAL">Meta Graph API Oficial</option>
                <option value="WEBHOOK">Webhook N8n Automation</option>
                <option value="CANAL_PROPIO">Canal Propio Referidos</option>
                <option value="CAMPAÑA_MARKETING">Campaña de Marketing</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">Método de Contacto Permito:</label>
              <select
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-medium"
              >
                <option value="FORMULARIO_LANDING">Landing de Conversión CONEXA</option>
                <option value="CANAL_OFICIAL">Canal Oficial de Plataforma</option>
                <option value="WHATSAPP_API">WhatsApp Business API</option>
                <option value="EMAIL">Correo Electrónico</option>
              </select>
            </div>
          </div>

          {/* Trigger AI Button */}
          <button
            type="submit"
            disabled={isAnalyzing || !description.trim()}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles size={16} className={isAnalyzing ? "animate-spin" : ""} />
            <span>{isAnalyzing ? "Analizando con Gemini AI..." : "Clasificar con Gemini AI"}</span>
          </button>

          {/* AI Output Card */}
          {analysisResult && (
            <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-900 text-xs flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-600" />
                  Resultado Gemini AI Classifier
                </span>
                <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                  Score Intención: {analysisResult.intentScore || 90}/100
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                <div className="bg-white p-2 rounded-xl border border-emerald-200">
                  <p className="text-slate-400 text-[9px] uppercase">Categoría</p>
                  <p className="font-bold text-slate-900">{analysisResult.category}</p>
                </div>

                <div className="bg-white p-2 rounded-xl border border-emerald-200">
                  <p className="text-slate-400 text-[9px] uppercase">Subcategoría</p>
                  <p className="font-bold text-slate-900">{analysisResult.subcategory}</p>
                </div>

                <div className="bg-white p-2 rounded-xl border border-emerald-200">
                  <p className="text-slate-400 text-[9px] uppercase">Intención</p>
                  <p className="font-bold text-emerald-800">{analysisResult.intent}</p>
                </div>

                <div className="bg-white p-2 rounded-xl border border-emerald-200">
                  <p className="text-slate-400 text-[9px] uppercase">Urgencia</p>
                  <p className="font-bold text-rose-700">{analysisResult.urgency}</p>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-slate-700 font-sans">
                <p className="font-bold text-slate-900 text-[11px] mb-0.5">Diagnóstico IA:</p>
                <p className="text-[11px] text-slate-600">{analysisResult.reasoning}</p>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-slate-700 font-sans">
                <p className="font-bold text-slate-900 text-[11px] mb-0.5">Propuesta de Respuesta Sugerida:</p>
                <p className="text-[11px] italic text-slate-800">"{analysisResult.recommendedResponseText}"</p>
              </div>

              <button
                type="button"
                onClick={handleSaveOpportunity}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Send size={14} />
                <span>Guardar e Ingresar Oportunidad al RADAR</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
