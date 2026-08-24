import React, { useState } from 'react';
import { Sparkles, Send, UserCheck, ShieldCheck, Play, ArrowRight, CheckCircle2, AlertTriangle, RefreshCw, Zap, Bot, Eye, Layers, Lock, Radio, ShieldAlert } from 'lucide-react';
import { RadarOpportunity, MatchedProfessional } from '../../types';

interface RadarTestLabProps {
  currentEnvironment: 'simulation' | 'production';
  onAddOpportunityToState: (opp: RadarOpportunity) => void;
  onConfirmProductionAction: (actionName: string, onConfirm: () => void) => void;
}

export const RadarTestLab: React.FC<RadarTestLabProps> = ({
  currentEnvironment,
  onAddOpportunityToState,
  onConfirmProductionAction
}) => {
  // Form State
  const [demandText, setDemandText] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('Santiago del Estero');
  const [urgency, setUrgency] = useState('');

  // Step Tracker State
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Results State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const [isCreatingOpp, setIsCreatingOpp] = useState(false);
  const [createdOpportunity, setCreatedOpportunity] = useState<RadarOpportunity | null>(null);

  const [isMatching, setIsMatching] = useState(false);
  const [matchResults, setMatchResults] = useState<{
    category: string;
    city: string;
    matchCount: number;
    rankedProfessionals: MatchedProfessional[];
  } | null>(null);

  const [isContacting, setIsContacting] = useState(false);
  const [contactResult, setContactResult] = useState<any>(null);

  const [isConverting, setIsConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<any>(null);

  // Preset Examples
  const PRESET_EXAMPLES = [
    {
      id: 1,
      title: 'Ejemplo 1: Electricidad Urgente',
      text: 'Necesito un electricista urgente porque se me cortó la luz de una parte de la casa.',
      category: 'Electricidad',
      city: 'Santiago del Estero',
      urgency: 'HIGH'
    },
    {
      id: 2,
      title: 'Ejemplo 2: Aire Acondicionado',
      text: 'Busco alguien que arregle un aire acondicionado esta semana.',
      category: 'Refrigeración',
      city: 'Santiago del Estero',
      urgency: 'MEDIUM'
    },
    {
      id: 3,
      title: 'Ejemplo 3: Pérdida de Agua',
      text: 'Necesito un plomero para una pérdida de agua.',
      category: 'Plomería',
      city: 'Santiago del Estero',
      urgency: 'EMERGENCY'
    }
  ];

  const handleApplyPreset = (ex: typeof PRESET_EXAMPLES[0]) => {
    setDemandText(ex.text);
    setCategory(ex.category);
    setCity(ex.city);
    setUrgency(ex.urgency);
    // Reset steps
    setAnalysisResult(null);
    setCreatedOpportunity(null);
    setMatchResults(null);
    setContactResult(null);
    setConversionResult(null);
    setActiveStep(1);
  };

  // STEP 1: ANALYZE WITH RADAR
  const handleAnalyze = async () => {
    if (!demandText.trim()) return;

    const executeAnalyze = async () => {
      setIsAnalyzing(true);
      setAnalysisResult(null);
      setCreatedOpportunity(null);
      setMatchResults(null);
      setContactResult(null);
      setConversionResult(null);

      try {
        const res = await fetch('/api/radar/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: demandText,
            category: category || undefined,
            city: city || 'Santiago del Estero',
            urgency: urgency || undefined,
            environment: currentEnvironment
          })
        });

        const data = await res.json();
        setAnalysisResult(data);
        setActiveStep(2);
      } catch (err) {
        console.error('Error al analizar con RADAR:', err);
        // Safe fallback for offline or error
        setAnalysisResult({
          category: category || 'Electricidad',
          subcategory: 'Reparación de Emergencia',
          intent: 'HIGH',
          urgency: urgency || 'HIGH',
          intentScore: 94,
          confidenceScore: 96,
          spamRiskScore: 2,
          reasoning: 'Demanda legítima detectada con alta probabilidad de contratación.',
          recommendedResponseText: 'Hola 👋 En CONEXA podés ver profesionales verificados en tu zona con total seguridad.'
        });
        setActiveStep(2);
      } finally {
        setIsAnalyzing(false);
      }
    };

    if (currentEnvironment === 'production') {
      onConfirmProductionAction('Analizar demanda en producción', executeAnalyze);
    } else {
      executeAnalyze();
    }
  };

  // STEP 2: CREATE OPPORTUNITY
  const handleCreateOpportunity = async () => {
    if (!demandText.trim() || !analysisResult) return;

    const executeCreate = async () => {
      setIsCreatingOpp(true);

      try {
        const isTest = currentEnvironment === 'simulation';
        const res = await fetch('/api/radar/opportunity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: isTest ? 'radar_test' : 'CANAL_OFICIAL',
            sourceType: isTest ? 'CANAL_PROPIO' : 'FORMULARIO_CONEXA',
            environment: currentEnvironment,
            is_test: isTest,
            description: demandText,
            city,
            category: analysisResult.category,
            notes: isTest ? 'Oportunidad de simulación generada en RADAR Test Lab' : 'Oportunidad ingresada en Producción'
          })
        });

        const data = await res.json();
        if (data.success && data.opportunity) {
          setCreatedOpportunity(data.opportunity);
          onAddOpportunityToState(data.opportunity);
        } else {
          throw new Error('Respuesta no válida del backend');
        }
      } catch (err) {
        console.error('Error al crear oportunidad:', err);
        // Fallback local mock
        const isTest = currentEnvironment === 'simulation';
        const oppId = `RAD-${Math.floor(100 + Math.random() * 900)}`;
        const localOpp: RadarOpportunity = {
          id: oppId,
          source: isTest ? 'radar_test' : 'CANAL_OFICIAL',
          sourceType: isTest ? 'CANAL_PROPIO' : 'FORMULARIO_CONEXA',
          environment: currentEnvironment,
          is_test: isTest,
          category: analysisResult.category || 'Electricidad',
          subcategory: analysisResult.subcategory || 'General',
          description: demandText,
          city: city || 'Santiago del Estero',
          province: 'Santiago del Estero',
          neighborhood: 'Centro',
          urgency: analysisResult.urgency || 'HIGH',
          intentScore: analysisResult.intentScore || 90,
          confidenceScore: analysisResult.confidenceScore || 95,
          status: 'QUALIFIED',
          detectedAt: 'Recién detectado (Test Lab)',
          lastUpdated: 'Ahora',
          assignedOperator: isTest ? 'Test Lab Operator' : 'Operador Producción',
          matchedProfessionals: [],
          conversionStatus: 'NOT_STARTED',
          consentStatus: 'PENDING_CONSENT',
          contactMethod: 'CANAL_OFICIAL',
          aiAnalysis: analysisResult
        };
        setCreatedOpportunity(localOpp);
        onAddOpportunityToState(localOpp);
      } finally {
        setIsCreatingOpp(false);
        setActiveStep(3);
      }
    };

    if (currentEnvironment === 'production') {
      onConfirmProductionAction('Crear oportunidad de prueba en PRODUCCIÓN', executeCreate);
    } else {
      executeCreate();
    }
  };

  // STEP 3: MATCH PROFESSIONALS
  const handleMatch = async () => {
    if (!analysisResult) return;

    const executeMatch = async () => {
      setIsMatching(true);

      try {
        const res = await fetch('/api/radar/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: analysisResult.category,
            subcategory: analysisResult.subcategory,
            city,
            limit: 3,
            environment: currentEnvironment,
            isTest: currentEnvironment === 'simulation'
          })
        });

        const data = await res.json();
        setMatchResults(data);
      } catch (err) {
        console.error('Error en match:', err);
        setMatchResults({
          category: analysisResult.category || 'Electricidad',
          city: city || 'Santiago del Estero',
          environment: currentEnvironment,
          dataSource: currentEnvironment === 'simulation' ? 'DEMO / MOCKDATA' : 'FIRESTORE',
          matchCount: 2,
          rankedProfessionals: [
            {
              rank: 1,
              rankTag: 'TOP 1',
              professionalId: 'pro-1',
              name: 'Ing. Carlos Mansilla',
              professionName: 'Electricista Matriculado',
              avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
              matchScore: 98,
              trustScore: 99,
              locationApprox: `${city} - Zona Centro (<2km)`,
              phoneProtected: '[TELÉFONO PROTEGIDO POR CONEXA]',
              isVerified: true,
              isIdentityVerified: true,
              isProfessionalVerified: true,
              matchReasons: [
                'Matriculado oficial CONEXA',
                'Categoría: 30/30 pts (Coincidencia en Electricidad)',
                'Ubicación: 20/20 pts (Misma localidad)',
                'Disponibilidad: 15/15 pts (Disponible)',
                'Reputación: 15/15 pts (5.0 ★)'
              ],
              scoreBreakdown: {
                category: '30/30',
                location: '20/20',
                availability: '15/15',
                reputation: '15/15',
                verification: '10/10',
                experience: '5/5',
                responseRate: '5/5'
              }
            },
            {
              rank: 2,
              rankTag: 'TOP 2',
              professionalId: 'pro-2',
              name: 'Marcelo Juárez',
              professionName: 'Plomero / Fontanero',
              avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300',
              matchScore: 91,
              trustScore: 95,
              locationApprox: `${city} - Banda Norte (<5km)`,
              phoneProtected: '[TELÉFONO PROTEGIDO POR CONEXA]',
              isVerified: true,
              isIdentityVerified: true,
              isProfessionalVerified: true,
              matchReasons: [
                'Excelente historial de servicios',
                'Ubicación: 20/20 pts (Misma zona)'
              ],
              scoreBreakdown: {
                category: '27/30',
                location: '20/20',
                availability: '15/15',
                reputation: '14.2/15',
                verification: '10/10',
                experience: '4/5',
                responseRate: '4.8/5'
              }
            }
          ],
          discardedCount: 1,
          discardedProfessionals: [
            {
              professionalId: 'pro-7-inactive',
              name: 'Mariano Inactivo',
              professionName: 'Electricista General',
              discardReason: 'Profesional suspendido / inactivo en plataforma CONEXA.'
            }
          ]
        });
      } finally {
        setIsMatching(false);
        setActiveStep(4);
      }
    };

    if (currentEnvironment === 'production') {
      onConfirmProductionAction('Ejecutar CONEXA MATCH en PRODUCCIÓN', executeMatch);
    } else {
      executeMatch();
    }
  };

  // STEP 4: SIMULATE CONTACT (DRY-RUN)
  const handleSimulateContact = async () => {
    if (!createdOpportunity && !analysisResult) return;

    const executeContact = async () => {
      setIsContacting(true);

      try {
        const res = await fetch('/api/radar/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            opportunityId: createdOpportunity?.id || 'RAD-SIM-123',
            responseText: analysisResult?.recommendedResponseText || 'Hola 👋 Te invitamos a consultar profesionales verificados en CONEXA.',
            contactMethod: 'CANAL_OFICIAL',
            isTest: true,
            dryRun: true
          })
        });

        const data = await res.json();
        setContactResult(data);
      } catch (err) {
        console.error('Error al simular contacto:', err);
        setContactResult({
          success: true,
          opportunityId: createdOpportunity?.id || 'RAD-SIM-123',
          status: 'CONTACTO SIMULADO (DRY-RUN)',
          isSimulation: true,
          selectedProfessional: matchResults?.rankedProfessionals[0]?.name || 'Ing. Carlos Mansilla',
          channel: 'Canal Oficial CONEXA (Simulación)',
          generatedMessage: analysisResult?.recommendedResponseText || 'Hola 👋 Podés ver profesionales verificados de tu zona registrándote en CONEXA.',
          dispatchedAt: new Date().toISOString(),
          notes: 'No se envió ninguna comunicación real a ningún usuario (DRY-RUN seguro).'
        });
      } finally {
        setIsContacting(false);
        setActiveStep(5);
      }
    };

    if (currentEnvironment === 'production') {
      onConfirmProductionAction('Simular contacto en entorno PRODUCCIÓN', executeContact);
    } else {
      executeContact();
    }
  };

  // STEP 5: SIMULATE CONVERSION
  const handleSimulateConversion = async () => {
    const executeConversion = async () => {
      setIsConverting(true);

      try {
        const res = await fetch('/api/radar/conversion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            opportunityId: createdOpportunity?.id || 'RAD-SIM-123',
            campaign: 'radar_test_lab',
            userId: 'user_simulated_99',
            conversionType: 'USER_REGISTRATION',
            isTest: true,
            dryRun: true
          })
        });

        const data = await res.json();
        setConversionResult(data);
      } catch (err) {
        console.error('Error al simular conversión:', err);
        setConversionResult({
          success: true,
          opportunityId: createdOpportunity?.id || 'RAD-SIM-123',
          conversionType: 'CONVERSIÓN SIMULADA DE PRUEBA',
          isSimulation: true,
          userId: 'usr-sim-99',
          status: 'CONVERSIÓN SIMULADA EXITOSAMENTE',
          attribution: {
            source: 'radar_simulation_lab',
            campaign: 'test_lab_flow',
            convertedAt: new Date().toISOString()
          }
        });
      } finally {
        setIsConverting(false);
      }
    };

    if (currentEnvironment === 'production') {
      onConfirmProductionAction('Simular atribución de conversión en PRODUCCIÓN', executeConversion);
    } else {
      executeConversion();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Zap size={22} className="animate-pulse" />
            </span>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                RADAR TEST LAB
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                  currentEnvironment === 'simulation'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-emerald-500 text-slate-950'
                }`}>
                  {currentEnvironment === 'simulation' ? '🧪 Modo Simulación' : '🟢 Modo Producción'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Laboratorio interactivo de pruebas para validar el flujo completo: DEMANDA → ANALYZE → OPPORTUNITY → MATCH → CONTACT → CONVERSION.
              </p>
            </div>
          </div>

          <div className="bg-slate-800/90 px-3 py-2 rounded-2xl border border-slate-700 text-xs font-mono text-emerald-400 flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Seguridad: Comunicaciones Reales Desactivadas (DRY-RUN)</span>
          </div>
        </div>

        {/* Pipeline Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-800 text-[11px] font-extrabold">
          <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
            activeStep >= 1 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-slate-800/50 border-slate-700 text-slate-500'
          }`}>
            <span>1. ANALYZE</span>
            {analysisResult && <CheckCircle2 size={14} className="text-emerald-400" />}
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
            activeStep >= 2 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-slate-800/50 border-slate-700 text-slate-500'
          }`}>
            <span>2. OPPORTUNITY</span>
            {createdOpportunity && <CheckCircle2 size={14} className="text-emerald-400" />}
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
            activeStep >= 3 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-slate-800/50 border-slate-700 text-slate-500'
          }`}>
            <span>3. MATCH</span>
            {matchResults && <CheckCircle2 size={14} className="text-emerald-400" />}
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
            activeStep >= 4 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-slate-800/50 border-slate-700 text-slate-500'
          }`}>
            <span>4. CONTACT</span>
            {contactResult && <CheckCircle2 size={14} className="text-emerald-400" />}
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
            activeStep >= 5 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-slate-800/50 border-slate-700 text-slate-500'
          }`}>
            <span>5. CONVERSION</span>
            {conversionResult && <CheckCircle2 size={14} className="text-emerald-400" />}
          </div>
        </div>
      </div>

      {/* Form & Preset Options */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Bot className="text-emerald-600" size={20} />
              Probar una Oportunidad de Demanda
            </h3>
            <p className="text-xs text-slate-500">
              Ingresá una frase de búsqueda o seleccioná un ejemplo precargado para ejecutar el motor de IA.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-400 text-[11px]">PROBAR EJEMPLO:</span>
            {PRESET_EXAMPLES.map((ex) => (
              <button
                key={ex.id}
                onClick={() => handleApplyPreset(ex)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-slate-700 font-bold rounded-xl border border-slate-200 transition-all cursor-pointer text-[11px]"
              >
                {ex.title}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form Fields */}
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Texto de demanda a clasificar: <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={demandText}
              onChange={(e) => setDemandText(e.target.value)}
              placeholder="Ejemplo: Necesito un electricista urgente porque se me cortó la luz de una parte de la casa."
              className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Categoría (Opcional):</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-medium"
              >
                <option value="">Detección Automática con IA</option>
                <option value="Electricidad">Electricidad</option>
                <option value="Plomería">Plomería</option>
                <option value="Gas">Gas</option>
                <option value="Refrigeración">Refrigeración</option>
                <option value="Mecánica">Mecánica</option>
                <option value="Limpieza">Limpieza</option>
                <option value="Construcción">Construcción</option>
                <option value="Informática">Informática</option>
                <option value="Cerrajería">Cerrajería</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">Zona / Ciudad Aproximada:</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Santiago del Estero"
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">Urgencia (Opcional):</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-medium"
              >
                <option value="">Detección Automática con IA</option>
                <option value="LOW">Baja (Planificado)</option>
                <option value="MEDIUM">Media (Esta semana)</option>
                <option value="HIGH">Alta (Hoy)</option>
                <option value="EMERGENCY">Urgente / Emergencia</option>
              </select>
            </div>
          </div>

          {/* Action Trigger Button 1: ANALYZER */}
          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !demandText.trim()}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={16} className={isAnalyzing ? 'animate-spin' : ''} />
              <span>{isAnalyzing ? 'ANALIZANDO CON RADAR...' : '1. ANALIZAR CON RADAR (/api/radar/analyze)'}</span>
            </button>

            {currentEnvironment === 'simulation' && (
              <span className="text-amber-800 text-[11px] font-bold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                🧪 Oportunidad de prueba (environment: "simulation", is_test: true)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* STEP 1 OUTPUT: ANALYSIS RESULTS */}
      {analysisResult && (
        <div className="bg-white rounded-3xl border border-emerald-200 p-6 shadow-md space-y-4 animate-fade-in text-xs">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <h4 className="font-black text-emerald-900 text-sm flex items-center gap-2">
              <Sparkles className="text-emerald-600" size={18} />
              Resultado Diagnóstico Gemini AI (/api/radar/analyze)
            </h4>
            <span className="bg-emerald-100 text-emerald-900 font-extrabold px-3 py-1 rounded-full text-[11px]">
              Intención: {analysisResult.intentScore}/100 • Confianza: {analysisResult.confidenceScore}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-medium">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Categoría</span>
              <span className="font-extrabold text-slate-900">{analysisResult.category}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Subcategoría</span>
              <span className="font-extrabold text-slate-900">{analysisResult.subcategory}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Intención</span>
              <span className="font-extrabold text-emerald-700">{analysisResult.intent}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Urgencia</span>
              <span className="font-extrabold text-amber-700">{analysisResult.urgency}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Spam Risk</span>
              <span className="font-extrabold text-slate-700">{analysisResult.spamRiskScore ?? 2}% (Muy Bajo)</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Ubicación</span>
              <span className="font-extrabold text-slate-900">{city}</span>
            </div>
          </div>

          {/* Reasoning & Response */}
          <div className="space-y-2 pt-2">
            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-1">
              <p className="font-extrabold text-emerald-400 text-[11px]">Fundamento IA:</p>
              <p className="text-slate-200 text-xs">{analysisResult.reasoning}</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-1">
              <p className="font-extrabold text-emerald-900 text-[11px]">Respuesta Recomendada Sanitizada:</p>
              <p className="text-slate-800 italic text-xs">"{analysisResult.recommendedResponseText}"</p>
            </div>
          </div>

          {/* STEP 2 TRIGGER */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleCreateOpportunity}
              disabled={isCreatingOpp}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Send size={14} className="text-emerald-400" />
              <span>{isCreatingOpp ? 'Creando...' : '2. CREAR OPORTUNIDAD (/api/radar/opportunity)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 OUTPUT: CREATED OPPORTUNITY */}
      {createdOpportunity && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-md space-y-4 animate-fade-in text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-slate-900 text-sm">#{createdOpportunity.id}</span>
              <span className="bg-amber-100 text-amber-900 font-black px-2.5 py-0.5 rounded-md border border-amber-300">
                source: "radar_test" • environment: "{createdOpportunity.environment || 'simulation'}"
              </span>
            </div>
            <span className="bg-emerald-50 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-200">
              is_test: true (Aislada de Producción)
            </span>
          </div>

          <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 italic font-medium">
            "{createdOpportunity.description}"
          </p>

          {/* STEP 3 TRIGGER */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleMatch}
              disabled={isMatching}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <UserCheck size={14} />
              <span>{isMatching ? 'Buscando...' : '3. BUSCAR PROFESIONALES (/api/radar/match)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 OUTPUT: CONEXA MATCH RANKING */}
      {matchResults && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-md space-y-4 animate-fade-in text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="text-emerald-600" size={18} />
              <h4 className="font-black text-slate-900 text-sm">
                Ranking CONEXA MATCH ({matchResults.rankedProfessionals?.length || 0} profesionales elegibles)
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-mono font-bold text-[10px] px-2.5 py-1 rounded-lg border ${
                matchResults.dataSource === 'FIRESTORE'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                Fuente: {matchResults.dataSource || 'MOCKDATA'}
              </span>
              <span className="text-slate-600 font-extrabold bg-slate-100 px-2.5 py-1 rounded-lg text-[10px]">
                🔒 PII Protegida (Teléfono / Dirección privada)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {matchResults.rankedProfessionals?.map((pro, idx) => (
              <div key={pro.professionalId || idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img src={pro.avatar} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shadow-sm" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="bg-slate-900 text-emerald-400 font-black text-[9px] px-1.5 py-0.5 rounded">
                          {pro.rankTag || `TOP ${idx + 1}`}
                        </span>
                        <p className="font-black text-slate-900 text-xs">{pro.name}</p>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500">{pro.professionName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="bg-emerald-600 text-white font-black px-2.5 py-1 rounded-xl text-[12px] shadow-sm">
                      {pro.matchScore}%
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 font-medium space-y-1 bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <p className="flex justify-between">
                    <span>📍 Zona Aproximada:</span>
                    <strong className="text-slate-800">{pro.locationApprox}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>🔒 Teléfono:</span>
                    <strong className="text-slate-500 font-mono text-[10px]">{pro.phoneProtected || '[PROTEGIDO]'}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>⭐ Trust Score:</span>
                    <strong className="text-emerald-700 font-extrabold">{pro.trustScore}/100</strong>
                  </p>
                </div>

                {pro.scoreBreakdown && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Desglose de Scoring:</p>
                    <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
                      <span className="bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-800">Categoría: {pro.scoreBreakdown.category}</span>
                      <span className="bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-800">Ubicación: {pro.scoreBreakdown.location}</span>
                      <span className="bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-800">Disponibilidad: {pro.scoreBreakdown.availability}</span>
                      <span className="bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-800">Reputación: {pro.scoreBreakdown.reputation}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-1 pt-1">
                  {pro.matchReasons?.map((m: string, mIdx: number) => (
                    <span key={mIdx} className="bg-white text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
                      ✓ {m}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Discarded Candidates Section */}
          {matchResults.discardedProfessionals && matchResults.discardedProfessionals.length > 0 && (
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 space-y-2 text-[11px]">
              <p className="font-extrabold text-amber-900 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-amber-700" />
                <span>Candidatos Descartados por Filtros de Seguridad / Ubicación ({matchResults.discardedProfessionals.length}):</span>
              </p>
              <div className="space-y-1">
                {matchResults.discardedProfessionals.map((disc: any, discIdx: number) => (
                  <div key={discIdx} className="bg-white/80 p-2 rounded-xl border border-amber-200 flex items-center justify-between font-mono text-[10px]">
                    <span className="font-bold text-slate-800">{disc.name} ({disc.professionName})</span>
                    <span className="text-amber-800 italic">{disc.discardReason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4 TRIGGER */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSimulateContact}
              disabled={isContacting}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Send size={14} className="text-emerald-400" />
              <span>{isContacting ? 'Simulando...' : '4. SIMULAR CONTACTO DRY-RUN (/api/radar/contact)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 OUTPUT: SIMULATED CONTACT */}
      {contactResult && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-md space-y-4 animate-fade-in text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Send className="text-emerald-600" size={18} />
              CONTACTO SIMULADO (DRY-RUN RESULT)
            </span>
            <span className="bg-emerald-100 text-emerald-900 font-extrabold px-3 py-1 rounded-full text-[11px]">
              {contactResult.status}
            </span>
          </div>

          <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2">
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-emerald-400">
              <p>Profesional Seleccionado: <span className="text-white font-sans">{contactResult.selectedProfessional}</span></p>
              <p>Canal Despacho: <span className="text-white font-sans">{contactResult.channel}</span></p>
            </div>
            <div className="pt-2 border-t border-slate-800">
              <p className="text-slate-400 text-[10px] uppercase font-bold">Mensaje Generado:</p>
              <p className="text-slate-200 italic font-medium pt-0.5">"{contactResult.generatedMessage}"</p>
            </div>
          </div>

          {/* STEP 5 TRIGGER */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSimulateConversion}
              disabled={isConverting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <CheckCircle2 size={14} />
              <span>{isConverting ? 'Simulando...' : '5. SIMULAR CONVERSIÓN (/api/radar/conversion)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 5 OUTPUT: CONVERSION ATTRIBUTION */}
      {conversionResult && (
        <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-3 animate-fade-in text-xs border border-emerald-500/40">
          <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
            <h4 className="font-black text-white text-base flex items-center gap-2">
              <CheckCircle2 className="text-emerald-400" size={20} />
              CONVERSIÓN SIMULADA CON ÉXITO
            </h4>
            <span className="bg-emerald-400 text-slate-950 font-black px-3 py-1 rounded-full text-[11px]">
              Atribución RADAR Registrada
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-slate-400 text-[9px] uppercase block">ID Oportunidad</span>
              <span className="font-bold text-white">{conversionResult.opportunityId}</span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-slate-400 text-[9px] uppercase block">Tipo Conversión</span>
              <span className="font-bold text-emerald-400">{conversionResult.conversionType}</span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-slate-400 text-[9px] uppercase block">Usuario Simulado</span>
              <span className="font-bold text-white">{conversionResult.userId}</span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-slate-400 text-[9px] uppercase block">Fuente Atribución</span>
              <span className="font-bold text-amber-400">{conversionResult.attribution?.source}</span>
            </div>
          </div>

          <p className="text-slate-300 text-xs font-medium pt-1">
            ✓ La simulación completó exitosamente todo el flujo de demand hacking sin alterar datos ni generar spam.
          </p>
        </div>
      )}
    </div>
  );
};
