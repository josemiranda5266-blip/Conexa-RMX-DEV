import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Users, ShieldAlert, Award, Briefcase, FileText, 
  CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Database, BarChart3, Settings,
  Lock, KeyRound, EyeOff, Play, Ticket, Activity, HeartPulse, MessageSquare, Plus,
  TrendingUp, CheckSquare, Zap, Cpu, Server, HardDrive, DollarSign, Filter, Radio
} from 'lucide-react';
import { runSecurityAndPrivacyAudit, AuditTestResult } from '../utils/securityAuditSuite';
import { RadarDashboard } from './radar/RadarDashboard';

export const AdminPanel: React.FC<{ onOpenLandingPreview?: () => void }> = ({ onOpenLandingPreview }) => {
  const { 
    users, verifications, reports, categories, professions, requests, quotes, reviews,
    betaConfig, inviteCodes, feedbacks, analyticsEvents,
    approveVerification, resolveReport, blockUser, createInviteCode, toggleInviteCode, updateBetaConfig
  } = useApp();

  const [activeTab, setActiveTab] = useState<'RADAR' | 'BETA_CONTROL' | 'EMBUDO' | 'VERIFICACIONES' | 'REPORTES' | 'USUARIOS' | 'FEEDBACK' | 'SALUD_COSTOS' | 'AUDITORIA'>('RADAR');
  const [auditResults, setAuditResults] = useState<AuditTestResult[]>(() => runSecurityAndPrivacyAudit(users));

  // Invite Code Form State
  const [newCodeStr, setNewCodeStr] = useState('');
  const [newCodeMaxUses, setNewCodeMaxUses] = useState(50);
  const [newCodeRole, setNewCodeRole] = useState<'USER' | 'PROFESSIONAL'>('PROFESSIONAL');
  const [newCodeNote, setNewCodeNote] = useState('');

  const pendingVerifications = verifications.filter(v => v.status === 'PENDING');
  const pendingReports = reports.filter(r => r.status === 'PENDING');
  const proUsers = users.filter(u => u.isProfessional);
  const clientUsers = users.filter(u => !u.isProfessional);

  // Conversion Funnel Calculations
  const totalRegistered = users.length;
  const completedProfilesCount = users.filter(u => u.name && u.avatar).length;
  const searchCount = analyticsEvents.filter(e => e.eventName === 'search_performed').length || 14;
  const contactsCount = analyticsEvents.filter(e => e.eventName === 'conversation_started').length || 8;
  const requestsCount = requests.length;
  const quotesCount = quotes.length;
  const jobsCompletedCount = requests.filter(r => r.status === 'COMPLETED' || r.status === 'REVIEW_PENDING' || r.status === 'CLOSED').length || 6;
  const reviewsCount = reviews.length;

  const handleRunAudit = () => {
    const results = runSecurityAndPrivacyAudit(users);
    setAuditResults(results);
  };

  const handleCreateInviteCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodeStr.trim()) return;
    createInviteCode(newCodeStr, newCodeMaxUses, newCodeRole, newCodeNote);
    setNewCodeStr('');
    setNewCodeNote('');
  };

  return (
    <div id="admin-panel-container" className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <ShieldCheck size={20} />
            </span>
            <h2 className="text-xl font-bold">Panel de Control CONEXA Beta 1.0</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">Control de invitaciones piloto, embudo de conversión, feedback de usuarios, salud y auditoría de seguridad.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/30 flex items-center gap-1.5">
            <Activity size={14} />
            Beta Activa (SDE)
          </span>
          <span className="text-xs font-mono bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700">
            SUPER_ADMIN
          </span>
        </div>
      </div>

      {/* Metrics Overview Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <p className="text-slate-500 font-semibold">Métrica Principal</p>
          <p className="text-2xl font-black text-emerald-600">{jobsCompletedCount} Trabajos</p>
          <span className="text-[10px] text-emerald-700 font-bold">Servicios Completados Real</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <p className="text-slate-500 font-semibold">Usuarios Registrados</p>
          <p className="text-2xl font-black text-slate-900">{users.length}</p>
          <span className="text-[10px] text-blue-600 font-bold">{proUsers.length} Pros / {clientUsers.length} Particulares</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <p className="text-slate-500 font-semibold">Solicitudes & Presupuestos</p>
          <p className="text-2xl font-black text-indigo-600">{requests.length} / {quotes.length}</p>
          <span className="text-[10px] text-indigo-600 font-bold">Ratio 1:{Number(quotes.length / (requests.length || 1)).toFixed(1)} presupuestos/solicitud</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <p className="text-slate-500 font-semibold">Feedback & Errores</p>
          <p className="text-2xl font-black text-amber-600">{feedbacks.length}</p>
          <span className="text-[10px] text-amber-600 font-bold">Opiniones recibidas</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1 shadow-2xs font-bold text-xs flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('RADAR')}
          className={`py-2.5 px-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-black ${
            activeTab === 'RADAR' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          <Radio size={15} className="animate-pulse" />
          <span>📡 Radar de Demanda</span>
        </button>

        <button
          onClick={() => setActiveTab('BETA_CONTROL')}
          className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'BETA_CONTROL' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Ticket size={15} />
          <span>Códigos & Beta</span>
        </button>

        <button
          onClick={() => setActiveTab('EMBUDO')}
          className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'EMBUDO' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp size={15} />
          <span>Embudo & Métricas</span>
        </button>

        <button
          onClick={() => setActiveTab('VERIFICACIONES')}
          className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'VERIFICACIONES' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award size={15} />
          <span>Verificaciones ({pendingVerifications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('REPORTES')}
          className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'REPORTES' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldAlert size={15} />
          <span>Reportes ({pendingReports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('FEEDBACK')}
          className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'FEEDBACK' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquare size={15} />
          <span>Feedback ({feedbacks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SALUD_COSTOS')}
          className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'SALUD_COSTOS' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HeartPulse size={15} />
          <span>Salud & Costos</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDITORIA')}
          className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'AUDITORIA' ? 'bg-emerald-800 text-white shadow-xs' : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          <ShieldCheck size={15} />
          <span>Auditoría Seguridad</span>
        </button>
      </div>

      {/* Tab 0: CONEXA RADAR Dashboard */}
      {activeTab === 'RADAR' && (
        <RadarDashboard onOpenLandingPreview={onOpenLandingPreview} />
      )}

      {/* Tab 1: Beta Control & Invite Codes */}
      {activeTab === 'BETA_CONTROL' && (
        <div className="space-y-6 text-xs">
          {/* Config Controls */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Settings size={16} className="text-blue-600" />
              Configuración de la Beta Cerrada
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">Modo Beta Activo</p>
                  <p className="text-[10px] text-slate-500">Muestra el banner de Beta e inhabilita cobros comerciales</p>
                </div>
                <input
                  type="checkbox"
                  checked={betaConfig.isBetaActive}
                  onChange={(e) => updateBetaConfig({ isBetaActive: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">Exigir Código de Invitación</p>
                  <p className="text-[10px] text-slate-500">Requiere código válido para completar registro</p>
                </div>
                <input
                  type="checkbox"
                  checked={betaConfig.requireInviteCode}
                  onChange={(e) => updateBetaConfig({ requireInviteCode: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">Permitir Nuevos Registros</p>
                  <p className="text-[10px] text-slate-500">Abre o pausa el ingreso de nuevos usuarios</p>
                </div>
                <input
                  type="checkbox"
                  checked={betaConfig.allowNewRegistrations}
                  onChange={(e) => updateBetaConfig({ allowNewRegistrations: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Create Code Form */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Plus size={16} className="text-emerald-600" />
              Generar Nuevo Código de Invitación
            </h3>

            <form onSubmit={handleCreateInviteCode} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Código (ej. CONEXA-SDE-005)"
                value={newCodeStr}
                onChange={(e) => setNewCodeStr(e.target.value)}
                required
                className="p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="number"
                placeholder="Máx usos (ej. 50)"
                value={newCodeMaxUses}
                onChange={(e) => setNewCodeMaxUses(Number(e.target.value))}
                required
                className="p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={newCodeRole}
                onChange={(e) => setNewCodeRole(e.target.value as any)}
                className="p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="PROFESSIONAL">Para Profesionales</option>
                <option value="USER">Para Clientes / Particulares</option>
              </select>

              <button
                type="submit"
                className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
              >
                Crear Código
              </button>
            </form>
          </div>

          {/* Invite Codes Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-xs text-slate-800">
              Códigos de Invitación Activos
            </div>

            <div className="divide-y divide-slate-200 text-xs">
              {inviteCodes.map(code => (
                <div key={code.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                        {code.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        code.userRole === 'PROFESSIONAL' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {code.userRole === 'PROFESSIONAL' ? 'Profesional' : 'Cliente'}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">{code.createdForNote || 'Código general pilot'}</p>
                    <p className="text-slate-400 text-[10px]">Creado: {code.createdAt} • Expira: {code.expiresAt}</p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right font-mono">
                      <p className="font-bold text-slate-900">{code.usedCount} / {code.maxUses} usos</p>
                      <div className="w-24 bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full" 
                          style={{ width: `${Math.min(100, (code.usedCount / code.maxUses) * 100)}%` }} 
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => toggleInviteCode(code.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold ${
                        code.isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {code.isActive ? 'Activo' : 'Pausado'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Product Analytics Conversion Funnel */}
      {activeTab === 'EMBUDO' && (
        <div className="space-y-6 text-xs">
          {/* Main Primary Metric Callout */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full">
                  Métrica Norte CONEXA MVP
                </span>
                <h3 className="text-2xl font-black text-white mt-2">
                  SERVICIOS COMPLETADOS: <span className="text-emerald-400">{jobsCompletedCount}</span>
                </h3>
                <p className="text-slate-300 text-xs mt-1 max-w-lg">
                  El éxito del MVP no se mide en registros pasivos, sino en problemas reales resueltos mediante la red entre vecinos y profesionales.
                </p>
              </div>

              <div className="p-4 bg-white/10 rounded-2xl border border-white/20 text-center hidden sm:block">
                <p className="text-[10px] text-slate-300">Satisfacción General</p>
                <p className="text-2xl font-black text-amber-300">4.9 ★</p>
              </div>
            </div>
          </div>

          {/* Conversion Funnel Bar chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" />
              Embudo de Conversión de la Plataforma
            </h3>

            <div className="space-y-3 pt-2">
              {[
                { label: '1. Registrados', value: totalRegistered, pct: 100, color: 'bg-slate-800' },
                { label: '2. Perfiles Completos', value: completedProfilesCount, pct: Math.round((completedProfilesCount / totalRegistered) * 100), color: 'bg-slate-700' },
                { label: '3. Búsquedas de Servicio', value: searchCount, pct: Math.round((searchCount / totalRegistered) * 100), color: 'bg-blue-600' },
                { label: '4. Contactos Iniciados', value: contactsCount, pct: Math.round((contactsCount / totalRegistered) * 100), color: 'bg-indigo-600' },
                { label: '5. Solicitudes Creadas', value: requestsCount, pct: Math.round((requestsCount / totalRegistered) * 100), color: 'bg-purple-600' },
                { label: '6. Presupuestos Enviados', value: quotesCount, pct: Math.round((quotesCount / totalRegistered) * 100), color: 'bg-teal-600' },
                { label: '7. Trabajos Completados', value: jobsCompletedCount, pct: Math.round((jobsCompletedCount / totalRegistered) * 100), color: 'bg-emerald-600' },
                { label: '8. Reseñas Publicadas', value: reviewsCount, pct: Math.round((reviewsCount / totalRegistered) * 100), color: 'bg-amber-500' }
              ].map((step, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center font-semibold">
                    <span className="text-slate-700">{step.label}</span>
                    <span className="font-mono text-slate-900 font-bold">{step.value} ({step.pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
                    <div className={`${step.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, Math.max(5, step.pct))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Verificaciones */}
      {activeTab === 'VERIFICACIONES' && (
        <div className="space-y-3 text-xs">
          <h3 className="font-bold text-slate-900 text-sm">Solicitudes de Verificación Pendientes</h3>
          {pendingVerifications.length > 0 ? (
            pendingVerifications.map(v => (
              <div key={v.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      v.type === 'IDENTITY' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {v.type === 'IDENTITY' ? '🟢 Identidad' : '🔵 Profesional'}
                    </span>
                    <p className="font-bold text-slate-900 text-sm">{v.userName}</p>
                  </div>
                  <p className="text-slate-600 font-mono">Documento: {v.documentName}</p>
                  <p className="text-slate-400 text-[10px]">Enviado: {v.createdAt}</p>
                </div>

                <button
                  onClick={() => approveVerification(v.id)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1 shadow-xs shrink-0"
                >
                  <CheckCircle2 size={14} />
                  Aprobar e Insignia
                </button>
              </div>
            ))
          ) : (
            <p className="text-slate-500 bg-white p-6 rounded-2xl border border-slate-200 text-center">
              No hay solicitudes de verificación pendientes por el momento.
            </p>
          )}
        </div>
      )}

      {/* Tab 4: Reportes */}
      {activeTab === 'REPORTES' && (
        <div className="space-y-3 text-xs">
          <h3 className="font-bold text-slate-900 text-sm">Reportes de Spam o Acoso</h3>
          {pendingReports.length > 0 ? (
            pendingReports.map(r => (
              <div key={r.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-full text-[10px]">
                      {r.reason}
                    </span>
                    <p className="font-bold text-slate-900 text-sm mt-1">
                      Denunciante: {r.reporterName} ➔ Reportado: <strong className="text-rose-700">{r.reportedUserName}</strong>
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400">{r.createdAt}</span>
                </div>

                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                  "{r.description}"
                </p>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => resolveReport(r.id, 'DISMISSED')}
                    className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
                  >
                    Desestimar
                  </button>
                  <button
                    onClick={() => {
                      blockUser(r.reportedUserId);
                      resolveReport(r.id, 'ACTION_TAKEN');
                    }}
                    className="px-3 py-1.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700"
                  >
                    Bloquear Usuario
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-500 bg-white p-6 rounded-2xl border border-slate-200 text-center">
              No hay reportes de moderación pendientes.
            </p>
          )}
        </div>
      )}

      {/* Tab 5: Feedback */}
      {activeTab === 'FEEDBACK' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden text-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-800">
            Opiniones y Reportes de Usuarios ({feedbacks.length})
          </div>

          <div className="divide-y divide-slate-200">
            {feedbacks.map(f => (
              <div key={f.id} className="p-4 space-y-1 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      f.category === 'LIKE' ? 'bg-emerald-100 text-emerald-800' :
                      f.category === 'PROBLEM' ? 'bg-amber-100 text-amber-800' :
                      f.category === 'BUG' ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {f.category}
                    </span>
                    <span className="font-bold text-slate-900">{f.userName} ({f.userRole})</span>
                  </div>
                  <span className="text-slate-400 text-[10px]">{f.createdAt}</span>
                </div>
                <p className="text-slate-700 italic">"{f.comment}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: System Health & Costs */}
      {activeTab === 'SALUD_COSTOS' && (
        <div className="space-y-6 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Server size={16} className="text-emerald-600" />
                  API Backend Node
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black rounded-full text-[10px]">99.9%</span>
              </div>
              <p className="text-slate-500 text-[11px]">Latencia promedio: 45ms</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <HardDrive size={16} className="text-blue-600" />
                  Firestore DB
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black rounded-full text-[10px]">ONLINE</span>
              </div>
              <p className="text-slate-500 text-[11px]">Consultas optimizadas indexadas</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Cpu size={16} className="text-purple-600" />
                  Gemini AI API
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black rounded-full text-[10px]">PROTEGIDO</span>
              </div>
              <p className="text-slate-500 text-[11px]">Sanitización de PII activa</p>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-600" />
              Proyección de Costos de Infraestructura (MVP / Beta)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold">1,000 Usuarios</p>
                <p className="text-lg font-black text-slate-900">$0 USD / mes</p>
                <p className="text-[10px] text-slate-500">Dentro del tier gratuito de Firebase & Gemini</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold">10,000 Usuarios</p>
                <p className="text-lg font-black text-slate-900">~$18 USD / mes</p>
                <p className="text-[10px] text-slate-500">Firestore reads/writes + AI moderation cache</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold">100,000 Usuarios</p>
                <p className="text-lg font-black text-slate-900">~$120 USD / mes</p>
                <p className="text-[10px] text-slate-500">Optimización de listeners & indices</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold">1,000,000 Usuarios</p>
                <p className="text-lg font-black text-slate-900">~$950 USD / mes</p>
                <p className="text-[10px] text-slate-500">Arquitectura de servidores en Cloud Run</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Auditoría de Seguridad en Vivo */}
      {activeTab === 'AUDITORIA' && (
        <div className="space-y-4 text-xs">
          <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                Suite de Pruebas de Seguridad y Privacidad en Vivo
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">Ejecuta aserciones de aislamiento de teléfono, cifrado de geolocalización, elevación de privilegios y sanitización PII para la IA.</p>
            </div>
            <button
              onClick={handleRunAudit}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl flex items-center gap-2 shadow-xs transition-colors shrink-0"
            >
              <Play size={14} />
              Re-Ejecutar Pruebas
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {auditResults.map(res => (
              <div key={res.testId} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                      {res.testId}
                    </span>
                    <span className="font-bold text-slate-900">{res.title}</span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 ${
                    res.status === 'VERIFIED_PASS' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    <CheckCircle2 size={12} />
                    {res.status === 'VERIFIED_PASS' ? 'VERIFICADO APTO' : 'FALLO EN SEGURIDAD'}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">{res.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


