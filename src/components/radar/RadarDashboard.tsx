import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { RadarOpportunity, ApprovalMode } from '../../types';
import { NewOpportunityModal } from './NewOpportunityModal';
import { RadarTestLab } from './RadarTestLab';
import { 
  Radio, Sparkles, Filter, Search, CheckCircle, Clock, 
  Send, UserCheck, MapPin, AlertCircle, TrendingUp, ShieldCheck, 
  Code, Copy, ExternalLink, Zap, BarChart2, Eye, FileText, ChevronRight,
  Database, RefreshCw, Check, Globe, Layers, ArrowUpRight, AlertTriangle, ShieldAlert, Table
} from 'lucide-react';

interface RadarDashboardProps {
  onOpenLandingPreview?: () => void;
}

export const RadarDashboard: React.FC<RadarDashboardProps> = ({ onOpenLandingPreview }) => {
  const { 
    radarOpportunities, 
    radarStats, 
    approvalMode, 
    setApprovalMode, 
    updateRadarOpportunity, 
    addRadarOpportunity,
    deleteRadarOpportunity 
  } = useApp();

  // Environment State: Default to 'simulation' as required for RADAR TEST LAB
  const [environment, setEnvironment] = useState<'simulation' | 'production'>('simulation');

  // Backend Health State
  const [backendHealth, setBackendHealth] = useState<'OPERATIVE' | 'ERROR'>('OPERATIVE');
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Production Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingActionTitle, setPendingActionTitle] = useState('');
  const [pendingActionCallback, setPendingActionCallback] = useState<(() => void) | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'TEST_LAB' | 'OPPORTUNITIES' | 'HISTORY' | 'MAP' | 'ANALYTICS' | 'CONNECTORS' | 'N8N'>('TEST_LAB');

  // Filters for History / Management
  const [selectedEnvFilter, setSelectedEnvFilter] = useState<'ALL' | 'simulation' | 'production'>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedUrgencyFilter, setSelectedUrgencyFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals / Inspectors
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [inspectedOpportunity, setInspectedOpportunity] = useState<RadarOpportunity | null>(null);
  const [copiedCurlId, setCopiedCurlId] = useState<string | null>(null);

  // Check Backend Health on Mount & periodically
  const checkBackendHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await fetch('/api/radar/stats');
      if (res.ok) {
        setBackendHealth('OPERATIVE');
      } else {
        setBackendHealth('ERROR');
      }
    } catch {
      setBackendHealth('ERROR');
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  // Request Confirmation for Production Actions
  const handleConfirmProductionAction = (actionTitle: string, onConfirm: () => void) => {
    setPendingActionTitle(actionTitle);
    setPendingActionCallback(() => onConfirm);
    setIsConfirmModalOpen(true);
  };

  const executeConfirmedProductionAction = () => {
    if (pendingActionCallback) {
      pendingActionCallback();
    }
    setIsConfirmModalOpen(false);
    setPendingActionCallback(null);
  };

  // Filtered Opportunities Logic
  const filteredOpportunities = radarOpportunities.filter(opp => {
    const isSimOpp = opp.environment === 'simulation' || opp.is_test || opp.source === 'radar_test';
    const oppEnv = isSimOpp ? 'simulation' : 'production';

    const matchesEnv = selectedEnvFilter === 'ALL' || oppEnv === selectedEnvFilter;
    const matchesCat = selectedCategoryFilter === 'ALL' || opp.category === selectedCategoryFilter;
    const matchesUrgency = selectedUrgencyFilter === 'ALL' || opp.urgency === selectedUrgencyFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || opp.status === selectedStatusFilter;
    const matchesSearch = !searchQuery.trim() || 
      opp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesEnv && matchesCat && matchesUrgency && matchesStatus && matchesSearch;
  });

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCurlId(id);
    setTimeout(() => setCopiedCurlId(null), 2000);
  };

  const handleDispatchContact = (opp: RadarOpportunity) => {
    const executeDispatch = () => {
      updateRadarOpportunity(opp.id, {
        status: 'CONTACTED',
        conversionStatus: 'PENDING',
        notes: `Contacto despachado en modo ${approvalMode} (Entorno: ${opp.environment || 'simulation'}).`
      });
    };

    if (opp.environment === 'production' || environment === 'production') {
      handleConfirmProductionAction('Despachar contacto en PRODUCCIÓN', executeDispatch);
    } else {
      executeDispatch();
    }
  };

  const handleMarkConverted = (opp: RadarOpportunity) => {
    const executeConvert = () => {
      updateRadarOpportunity(opp.id, {
        status: 'CONVERTED',
        conversionStatus: 'CONVERTED',
        notes: 'Oportunidad convertida exitosamente.'
      });
    };

    if (opp.environment === 'production' || environment === 'production') {
      handleConfirmProductionAction('Convertir usuario en PRODUCCIÓN', executeConvert);
    } else {
      executeConvert();
    }
  };

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in">
      {/* Top Header & Health Indicator */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                <Radio size={24} className="animate-pulse" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-black text-white tracking-tight">CONEXA RADAR</h1>
                  
                  {/* Health Indicator Badge */}
                  <button
                    onClick={checkBackendHealth}
                    className={`text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                      backendHealth === 'OPERATIVE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    }`}
                    title="Hacer clic para verificar estado de la API"
                  >
                    <span>RADAR</span>
                    {backendHealth === 'OPERATIVE' ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-extrabold">🟢 OPERATIVO</span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-400 font-extrabold">🔴 ERROR</span>
                    )}
                    {isCheckingHealth && <RefreshCw size={10} className="animate-spin ml-1" />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 font-medium pt-0.5">
                  Motor inteligente de detección, clasificación con IA y conversión de demanda real de servicios.
                </p>
              </div>
            </div>
          </div>

          {/* Operational Environment & Mode Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Environment Toggle: SIMULATION vs PRODUCTION */}
            <div className="bg-slate-800 p-1.5 rounded-2xl border border-slate-700 flex items-center gap-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 px-2">Modo:</span>
              <button
                onClick={() => setEnvironment('simulation')}
                className={`px-3 py-1.5 rounded-xl font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                  environment === 'simulation'
                    ? 'bg-amber-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🧪 SIMULACIÓN</span>
              </button>
              <button
                onClick={() => {
                  handleConfirmProductionAction('Activar MODO PRODUCCIÓN', () => {
                    setEnvironment('production');
                  });
                }}
                className={`px-3 py-1.5 rounded-xl font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                  environment === 'production'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🟢 PRODUCCIÓN</span>
              </button>
            </div>

            {/* Approval Mode Toggle */}
            <div className="bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700 flex items-center gap-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 px-1">Despacho:</span>
              <button
                onClick={() => setApprovalMode('AUTOMÁTICO')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  approvalMode === 'AUTOMÁTICO'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                AUTO
              </button>
              <button
                onClick={() => setApprovalMode('ASISTIDO')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  approvalMode === 'ASISTIDO'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ASISTIDO
              </button>
              <button
                onClick={() => setApprovalMode('MANUAL')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  approvalMode === 'MANUAL'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                MANUAL
              </button>
            </div>

            {/* Quick Actions */}
            <button
              onClick={() => setActiveTab('TEST_LAB')}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles size={16} />
              <span>⚡ Probador Test Lab</span>
            </button>

            {onOpenLandingPreview && (
              <button
                onClick={onOpenLandingPreview}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Globe size={16} className="text-emerald-400" />
                <span>Ver Landing</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 8 Core Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Detectadas</p>
          <p className="text-xl font-black text-slate-900">{radarStats.totalDetected}</p>
          <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
            <ArrowUpRight size={10} /> +{radarStats.detectionRatePerDay}/día
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Nuevas</p>
          <p className="text-xl font-black text-emerald-600">{radarStats.newOpportunities}</p>
          <p className="text-[10px] text-slate-500 font-medium">Por clasificar</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Alta Intención</p>
          <p className="text-xl font-black text-amber-600">{radarStats.highIntentCount}</p>
          <p className="text-[10px] text-slate-500 font-medium">Score ≥ 80</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Contactadas</p>
          <p className="text-xl font-black text-blue-600">{radarStats.contactedCount}</p>
          <p className="text-[10px] text-slate-500 font-medium">Asistidas</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Convertidas</p>
          <p className="text-xl font-black text-emerald-700">{radarStats.convertedUsers}</p>
          <p className="text-[10px] text-slate-500 font-medium">Usuarios creados</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Solicitudes</p>
          <p className="text-xl font-black text-purple-600">{radarStats.requestsGenerated}</p>
          <p className="text-[10px] text-slate-500 font-medium">En app CONEXA</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Completados</p>
          <p className="text-xl font-black text-teal-600">{radarStats.servicesCompleted}</p>
          <p className="text-[10px] text-slate-500 font-medium">Trabajos con éxito</p>
        </div>

        <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-emerald-400 uppercase">Tasa Conv.</p>
          <p className="text-xl font-black text-white">{radarStats.conversionRate}%</p>
          <p className="text-[10px] text-slate-400 font-medium">Objetivo: 25%</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar gap-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('TEST_LAB')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'TEST_LAB'
              ? 'border-emerald-600 text-emerald-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Zap size={16} className="text-amber-500 animate-pulse" />
          <span>🧪 Radar Test Lab (Simulador)</span>
        </button>

        <button
          onClick={() => setActiveTab('OPPORTUNITIES')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'OPPORTUNITIES'
              ? 'border-emerald-600 text-emerald-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Radio size={16} />
          <span>Oportunidades ({filteredOpportunities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'HISTORY'
              ? 'border-emerald-600 text-emerald-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Table size={16} />
          <span>Tabla Historial</span>
        </button>

        <button
          onClick={() => setActiveTab('MAP')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'MAP'
              ? 'border-emerald-600 text-emerald-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin size={16} />
          <span>Mapa de Demanda</span>
        </button>

        <button
          onClick={() => setActiveTab('ANALYTICS')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'ANALYTICS'
              ? 'border-emerald-600 text-emerald-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart2 size={16} />
          <span>Analítica & Growth AI</span>
        </button>

        <button
          onClick={() => setActiveTab('CONNECTORS')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'CONNECTORS'
              ? 'border-emerald-600 text-emerald-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers size={16} />
          <span>Fuentes & Conectores</span>
        </button>

        <button
          onClick={() => setActiveTab('N8N')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'N8N'
              ? 'border-emerald-600 text-emerald-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Code size={16} />
          <span>Workflows n8n</span>
        </button>
      </div>

      {/* TAB 0: RADAR TEST LAB */}
      {activeTab === 'TEST_LAB' && (
        <RadarTestLab
          currentEnvironment={environment}
          onAddOpportunityToState={addRadarOpportunity}
          onConfirmProductionAction={handleConfirmProductionAction}
        />
      )}

      {/* TAB 1: OPPORTUNITIES & MANAGEMENT */}
      {activeTab === 'OPPORTUNITIES' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar texto, ID o ciudad..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={selectedEnvFilter}
                onChange={(e) => setSelectedEnvFilter(e.target.value as any)}
                className="p-2 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-800"
              >
                <option value="ALL">Todos los Modos</option>
                <option value="simulation">🧪 Simulación</option>
                <option value="production">🟢 Producción</option>
              </select>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="p-2 bg-slate-50 rounded-xl border border-slate-200 font-medium"
              >
                <option value="ALL">Todas las Categorías</option>
                <option value="Electricidad">Electricidad</option>
                <option value="Plomería">Plomería</option>
                <option value="Gas">Gas</option>
                <option value="Refrigeración">Refrigeración</option>
                <option value="Informática">Informática</option>
                <option value="Cerrajería">Cerrajería</option>
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="p-2 bg-slate-50 rounded-xl border border-slate-200 font-medium"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="QUALIFIED">Calificadas (Score ≥80)</option>
                <option value="READY_TO_CONTACT">Listas para Contacto</option>
                <option value="CONTACTED">Contactadas</option>
                <option value="CONVERTED">Convertidas</option>
              </select>
            </div>

            <span className="text-slate-500 text-[11px] font-semibold">
              Mostrando {filteredOpportunities.length} de {radarOpportunities.length} oportunidades
            </span>
          </div>

          {/* Opportunities Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOpportunities.map((opp) => {
              const isTestOpp = opp.environment === 'simulation' || opp.is_test || opp.source === 'radar_test';

              return (
                <div key={opp.id} className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Top Badge Line */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 text-xs">{opp.id}</span>
                        <span className="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-emerald-200">
                          {opp.category} • {opp.subcategory}
                        </span>
                        {isTestOpp && (
                          <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-2 py-0.5 rounded-md border border-amber-300">
                            🧪 SIMULACIÓN
                          </span>
                        )}
                      </div>

                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                        opp.intentScore >= 90
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : opp.intentScore >= 80
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        Score Intención: {opp.intentScore}/100
                      </span>
                    </div>

                    {/* Description Box */}
                    <p className="text-slate-800 text-xs font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      "{opp.description}"
                    </p>

                    {/* Location & Source */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2 font-medium">
                      <span className="flex items-center gap-1 text-slate-700 font-bold">
                        <MapPin size={12} className="text-emerald-600" /> {opp.city} ({opp.neighborhood || 'Centro'})
                      </span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">{opp.source}</span>
                    </div>

                    {/* AI Diagnosis */}
                    <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1.5 text-[11px]">
                      <p className="font-extrabold text-emerald-400 flex items-center gap-1.5">
                        <Sparkles size={12} />
                        Diagnóstico Gemini AI:
                      </p>
                      <p className="text-slate-300 leading-snug">{opp.aiAnalysis.reasoning}</p>
                      <p className="text-slate-400 text-[10px] italic pt-1 border-t border-slate-800">
                        Sugerencia: "{opp.aiAnalysis.recommendedResponseText}"
                      </p>
                    </div>

                    {/* Matched Professional */}
                    {opp.matchedProfessionals && opp.matchedProfessionals.length > 0 && (
                      <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <img
                            src={opp.matchedProfessionals[0].avatar}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-emerald-500"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{opp.matchedProfessionals[0].name}</p>
                            <p className="text-[10px] text-emerald-800 font-medium">Match CONEXA: {opp.matchedProfessionals[0].matchScore}%</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-900 bg-emerald-200/80 px-2 py-0.5 rounded-md">
                          {opp.matchedProfessionals[0].matchReasons[0]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <button
                      onClick={() => setInspectedOpportunity(opp)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={14} />
                      <span>Detalles</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {opp.status !== 'CONVERTED' ? (
                        <>
                          <button
                            onClick={() => handleDispatchContact(opp)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center gap-1 shadow-xs cursor-pointer text-[11px]"
                          >
                            <Send size={12} className="text-emerald-400" />
                            <span>Despachar ({approvalMode})</span>
                          </button>

                          <button
                            onClick={() => handleMarkConverted(opp)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1 shadow-xs cursor-pointer text-[11px]"
                          >
                            <CheckCircle size={12} />
                            <span>Convertir</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-emerald-700 font-extrabold flex items-center gap-1 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 text-[11px]">
                          <CheckCircle size={12} /> Convertido
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: HISTORY TABLE WITH FILTERS */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Table className="text-emerald-600" size={20} />
                Historial de Oportunidades & Atribución
              </h3>
              <p className="text-xs text-slate-500">
                Registro auditado de todas las oportunidades detectadas, procesadas y simulación.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedEnvFilter}
                onChange={(e) => setSelectedEnvFilter(e.target.value as any)}
                className="p-2 bg-slate-50 rounded-xl border border-slate-200 font-extrabold text-slate-800"
              >
                <option value="ALL">Todos los Modos</option>
                <option value="simulation">🧪 Simulación</option>
                <option value="production">🟢 Producción</option>
              </select>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="p-2 bg-slate-50 rounded-xl border border-slate-200 font-medium"
              >
                <option value="ALL">Todas las Categorías</option>
                <option value="Electricidad">Electricidad</option>
                <option value="Plomería">Plomería</option>
                <option value="Gas">Gas</option>
                <option value="Refrigeración">Refrigeración</option>
                <option value="Informática">Informática</option>
                <option value="Cerrajería">Cerrajería</option>
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="p-2 bg-slate-50 rounded-xl border border-slate-200 font-medium"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="QUALIFIED">Calificadas</option>
                <option value="CONTACTED">Contactadas</option>
                <option value="CONVERTED">Convertidas</option>
              </select>
            </div>
          </div>

          {/* History Data Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                  <th className="p-3">ID / Fecha</th>
                  <th className="p-3">Fuente</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3">Intención</th>
                  <th className="p-3">Urgencia</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Match</th>
                  <th className="p-3">Conversión</th>
                  <th className="p-3">Modo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] font-medium">
                {filteredOpportunities.map((opp) => {
                  const isTestOpp = opp.environment === 'simulation' || opp.is_test || opp.source === 'radar_test';

                  return (
                    <tr key={opp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <span className="font-mono font-black text-slate-900 block">{opp.id}</span>
                        <span className="text-slate-400 text-[10px]">{opp.detectedAt}</span>
                      </td>

                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-bold text-[10px]">
                          {opp.source}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="font-bold text-slate-900">{opp.category}</span>
                        <span className="text-slate-500 text-[10px] block">{opp.subcategory}</span>
                      </td>

                      <td className="p-3">
                        <span className={`font-black ${
                          opp.intentScore >= 80 ? 'text-emerald-700' : 'text-slate-700'
                        }`}>
                          {opp.intentScore}/100 ({opp.aiAnalysis.intent})
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="font-bold text-amber-700">{opp.urgency}</span>
                      </td>

                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-800 font-extrabold px-2 py-0.5 rounded-md">
                          {opp.status}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="text-slate-700 font-bold">
                          {opp.matchedProfessionals?.length || 0} pros
                        </span>
                      </td>

                      <td className="p-3">
                        <span className={`font-extrabold px-2 py-0.5 rounded-md ${
                          opp.conversionStatus === 'CONVERTED'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {opp.conversionStatus}
                        </span>
                      </td>

                      <td className="p-3">
                        {isTestOpp ? (
                          <span className="bg-amber-100 text-amber-900 font-black px-2 py-0.5 rounded-md text-[10px] border border-amber-200">
                            🧪 Simulación
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-900 font-black px-2 py-0.5 rounded-md text-[10px] border border-emerald-200">
                            🟢 Producción
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DEMAND MAP */}
      {activeTab === 'MAP' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <MapPin className="text-emerald-600" size={20} />
                Mapa de Calor y Concentración de Demanda
              </h2>
              <p className="text-xs text-slate-500">Distribución geográfica aproximada preservando la privacidad por diseño.</p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold bg-slate-100 p-1.5 rounded-xl">
              <span className="px-2 py-1 bg-white rounded-lg shadow-xs text-emerald-800">Piloto: Santiago del Estero & NOA</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual Cluster Representation */}
            <div className="lg:col-span-2 bg-slate-950 rounded-2xl p-6 text-white min-h-[350px] flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
                  GPS Cluster Density Engine
                </span>
                <span className="text-[10px] text-slate-400">Puntos anonimizados por radio de 2km</span>
              </div>

              {/* Map Nodes Simulation */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 my-6">
                <div className="bg-slate-900/90 border border-emerald-500/40 p-4 rounded-2xl space-y-2 hover:border-emerald-400 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-white">Santiago - Centro</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <p className="text-2xl font-black text-emerald-400">58 Oportunidades</p>
                  <p className="text-[10px] text-slate-400">Rubro principal: Electricidad y Cerrajería</p>
                </div>

                <div className="bg-slate-900/90 border border-emerald-500/40 p-4 rounded-2xl space-y-2 hover:border-emerald-400 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-white">Banda Norte / La Banda</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  </div>
                  <p className="text-2xl font-black text-amber-400">34 Oportunidades</p>
                  <p className="text-[10px] text-slate-400">Rubro principal: Plomería e Instalaciones Gas</p>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-white">Córdoba - N. Córdoba</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  </div>
                  <p className="text-2xl font-black text-blue-400">18 Oportunidades</p>
                  <p className="text-[10px] text-slate-400">Rubro principal: Gasistas Matriculados</p>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-900 pt-3">
                <span>Total Oportunidades Mapeadas: {radarOpportunities.length}</span>
                <span className="text-emerald-400 font-bold">98.4% Precisión Geo</span>
              </div>
            </div>

            {/* City Ranking List */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900">Demanda por Zonas Clave</h3>
              <div className="space-y-2 text-xs">
                {Object.entries(radarStats.byLocation).map(([loc, count]) => (
                  <div key={loc} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-800">{loc}</span>
                    <span className="font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">{count} posts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ANALYTICS & GROWTH AI */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6">
          {/* Conversion Funnel Box */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="text-emerald-600" size={20} />
              Embudo de Detección y Conversión de Demanda (Funnel CONEXA)
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
              <div className="bg-slate-900 text-white p-3 rounded-2xl space-y-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold">1. Detección</p>
                <p className="text-lg font-black text-white">148</p>
                <p className="text-[9px] text-emerald-400 font-bold">100% Base</p>
              </div>

              <div className="bg-slate-800 text-white p-3 rounded-2xl space-y-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold">2. Calificación</p>
                <p className="text-lg font-black text-emerald-400">137</p>
                <p className="text-[9px] text-slate-300">92.4% Score≥80</p>
              </div>

              <div className="bg-slate-800 text-white p-3 rounded-2xl space-y-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold">3. Contacto</p>
                <p className="text-lg font-black text-blue-400">116</p>
                <p className="text-[9px] text-slate-300">85.2% Despacho</p>
              </div>

              <div className="bg-slate-800 text-white p-3 rounded-2xl space-y-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold">4. Respuesta</p>
                <p className="text-lg font-black text-amber-400">67</p>
                <p className="text-[9px] text-slate-300">58.0% Clic Landing</p>
              </div>

              <div className="bg-slate-800 text-white p-3 rounded-2xl space-y-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold">5. Registro</p>
                <p className="text-lg font-black text-purple-400">42</p>
                <p className="text-[9px] text-slate-300">47.1% Nuevos Usr</p>
              </div>

              <div className="bg-slate-800 text-white p-3 rounded-2xl space-y-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold">6. Solicitud</p>
                <p className="text-lg font-black text-teal-400">38</p>
                <p className="text-[9px] text-slate-300">82.1% Creadas</p>
              </div>

              <div className="bg-emerald-600 text-white p-3 rounded-2xl space-y-1 shadow-md">
                <p className="text-[10px] text-emerald-100 uppercase font-black">7. Servicio OK</p>
                <p className="text-lg font-black text-white">29</p>
                <p className="text-[9px] text-emerald-100 font-bold">28.3% Conv. Total</p>
              </div>
            </div>
          </div>

          {/* CONEXA GROWTH AI Insights */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-400 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700 flex items-center gap-1.5">
                <Sparkles size={14} /> CONEXA GROWTH AI ENGINE
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Recomendaciones estratégicas en tiempo real</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {radarStats.growthInsights.map((insight, idx) => (
                <div key={idx} className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-1">
                  <p className="font-extrabold text-emerald-400">Insight #{idx + 1}</p>
                  <p className="text-slate-200 font-medium leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CONNECTORS & SOURCES */}
      {activeTab === 'CONNECTORS' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers className="text-emerald-600" size={20} />
              Conectores de Fuentes de Demanda Permitidas
            </h2>
            <p className="text-xs text-slate-500">Integraciones oficiales cumpliendo la normativa de la plataforma y sin scraping robótico.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Meta Graph API Box */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900 text-sm">Meta Graph API (Oficial)</span>
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Conectado</span>
              </div>
              <p className="text-slate-600">Recibe comentarios en páginas de Facebook e Instagram oficiales de CONEXA mediante webhooks autorizados.</p>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700">
                Webhook Status: 200 OK (Ping: 12ms)
              </div>
            </div>

            {/* Webhook Endpoint Box */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900 text-sm">Webhook Receptor Universal</span>
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Activo</span>
              </div>
              <p className="text-slate-600">Endpoint listo para n8n, Zapier o sistemas de captura propia.</p>
              <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-xl font-mono text-[11px] flex items-center justify-between">
                <span>POST /api/radar/opportunity</span>
                <button
                  onClick={() => handleCopyText("http://localhost:3000/api/radar/opportunity", "webhook-endpoint")}
                  className="p-1 hover:text-white"
                >
                  <Copy size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: N8N WORKFLOWS GUIDE */}
      {activeTab === 'N8N' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Zap className="text-amber-500" size={20} />
              Workflows de Integración con n8n
            </h2>
            <p className="text-xs text-slate-500">
              Guía técnica con endpoints, payload JSON y cURL para conectar tus automatizaciones en n8n con CONEXA RADAR.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Workflow 1 */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-amber-400 text-sm">Workflow 1: Detección & Clasificación con IA</span>
                <span className="bg-slate-800 text-slate-300 text-[10px] px-2.5 py-0.5 rounded-full border border-slate-700">POST /api/radar/analyze</span>
              </div>
              <p className="text-slate-300">
                Toma publicaciones o formularios y llama a la IA para determinar categoría, urgencia y score de intención.
              </p>
              <div className="bg-slate-950 p-3 rounded-xl font-mono text-[11px] text-emerald-400 flex items-center justify-between overflow-x-auto">
                <code>curl -X POST http://localhost:3000/api/radar/analyze -H "Content-Type: application/json" -d '&#123;"description":"Necesito plomero urgente en Santiago del Estero","city":"Santiago del Estero"&#125;'</code>
                <button
                  onClick={() => handleCopyText('curl -X POST http://localhost:3000/api/radar/analyze -H "Content-Type: application/json" -d \'{"description":"Necesito plomero urgente en Santiago del Estero","city":"Santiago del Estero"}\'', 'wf1')}
                  className="p-1 text-slate-400 hover:text-white ml-2"
                >
                  {copiedCurlId === 'wf1' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Workflow 2 */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-amber-400 text-sm">Workflow 2: Registro de Oportunidad Alta Intención</span>
                <span className="bg-slate-800 text-slate-300 text-[10px] px-2.5 py-0.5 rounded-full border border-slate-700">POST /api/radar/opportunity</span>
              </div>
              <p className="text-slate-300">
                Registra la oportunidad en la base de datos de CONEXA y desencadena el scoring de profesionales cercanos.
              </p>
              <div className="bg-slate-950 p-3 rounded-xl font-mono text-[11px] text-emerald-400 flex items-center justify-between overflow-x-auto">
                <code>curl -X POST http://localhost:3000/api/radar/opportunity -H "Content-Type: application/json" -d '&#123;"source":"n8n","description":"Electricista matriculado","city":"Santiago del Estero"&#125;'</code>
                <button
                  onClick={() => handleCopyText('curl -X POST http://localhost:3000/api/radar/opportunity -H "Content-Type: application/json" -d \'{"source":"n8n","description":"Electricista matriculado","city":"Santiago del Estero"}\'', 'wf2')}
                  className="p-1 text-slate-400 hover:text-white ml-2"
                >
                  {copiedCurlId === 'wf2' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Inspector Modal */}
      {inspectedOpportunity && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 text-xs shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="font-black text-slate-900 text-sm">Inspector Oportunidad #{inspectedOpportunity.id}</span>
              <button onClick={() => setInspectedOpportunity(null)} className="p-1 text-slate-400 hover:text-slate-800">✕</button>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-slate-900">Texto Original (Sanitizado PII Free):</p>
              <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 italic">"{inspectedOpportunity.description}"</p>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[9px] block">UBICACIÓN</span>
                <span className="font-bold text-slate-900">{inspectedOpportunity.city}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[9px] block">FUENTE</span>
                <span className="font-bold text-slate-900">{inspectedOpportunity.source}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1">
              <p className="font-extrabold text-emerald-400 text-[11px]">Explicación de Diagnóstico Gemini AI:</p>
              <p className="text-slate-300 text-[11px]">{inspectedOpportunity.aiAnalysis.reasoning}</p>
            </div>

            <button
              onClick={() => setInspectedOpportunity(null)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl cursor-pointer"
            >
              Cerrar Inspector
            </button>
          </div>
        </div>
      )}

      {/* Production Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl border border-rose-200">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-2.5 bg-rose-100 rounded-2xl">
                <AlertTriangle size={24} />
              </span>
              <div>
                <h3 className="font-black text-slate-900 text-base">Acción en PRODUCCIÓN</h3>
                <p className="text-slate-500 font-medium">Atención: Modo Real Seleccionado</p>
              </div>
            </div>

            <p className="text-slate-800 font-extrabold text-sm bg-rose-50 p-3.5 rounded-2xl border border-rose-100">
              ¿Confirmás ejecutar esta acción en producción?
            </p>
            <p className="text-slate-600 leading-relaxed font-medium">
              Acción a ejecutar: <strong className="text-slate-900">{pendingActionTitle}</strong>. Esto interactuará con registros reales de la plataforma CONEXA.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={executeConfirmedProductionAction}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
              >
                Sí, Confirmar en Producción
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
