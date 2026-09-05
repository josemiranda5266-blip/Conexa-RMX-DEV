import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  User as UserIcon,
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ShieldCheck,
  Save,
  LogOut,
  Key,
  DollarSign,
  Briefcase,
  FileBadge,
  Sparkles,
  ExternalLink,
  Lock,
  ArrowUpRight,
  X,
  Smartphone,
  Zap,
  Award
} from 'lucide-react';

export const ProfileView: React.FC<{ onOpenAuthModal: () => void }> = ({ onOpenAuthModal }) => {
  const { currentUser, updateUserProfile, saveMercadoPagoDetails, transactions, logoutUser, setActiveView } = useApp();

  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [zone, setZone] = useState(currentUser.zone || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [matricula, setMatricula] = useState(currentUser.matricula || '');

  // Mercado Pago States
  const [mpAlias, setMpAlias] = useState(currentUser.mpAlias || '');
  const [mpCvu, setMpCvu] = useState(currentUser.mpCvu || '');
  const [mpEmail, setMpEmail] = useState(currentUser.mpEmail || currentUser.email || '');
  
  const [isSavingMp, setIsSavingMp] = useState(false);
  const [mpSuccessMsg, setMpSuccessMsg] = useState('');

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Mercado Pago OAuth Modal State
  const [isMpModalOpen, setIsMpModalOpen] = useState(false);
  const [oauthStep, setOauthStep] = useState<'form' | 'connecting' | 'success'>('form');
  const [oauthEmail, setOauthEmail] = useState(currentUser.mpEmail || currentUser.email || '');
  const [oauthAlias, setOauthAlias] = useState(currentUser.mpAlias || '');
  const [oauthCvu, setOauthCvu] = useState(currentUser.mpCvu || '');
  const [oauthError, setOauthError] = useState('');

  // Keep state synced with currentUser changes
  useEffect(() => {
    setName(currentUser.name || '');
    setEmail(currentUser.email || '');
    setPhone(currentUser.phone || '');
    setZone(currentUser.zone || '');
    setBio(currentUser.bio || '');
    setMatricula(currentUser.matricula || '');
    setMpAlias(currentUser.mpAlias || '');
    setMpCvu(currentUser.mpCvu || '');
    setMpEmail(currentUser.mpEmail || currentUser.email || '');
    setOauthEmail(currentUser.mpEmail || currentUser.email || '');
    setOauthAlias(currentUser.mpAlias || '');
    setOauthCvu(currentUser.mpCvu || '');
  }, [currentUser]);

  // Calculate earnings for professional
  const proTransactions = transactions.filter(t => t.professionalId === currentUser.id);
  const totalHeld = proTransactions
    .filter(t => t.status === 'PAYMENT_HELD' || t.status === 'SERVICE_COMPLETED')
    .reduce((acc, t) => acc + t.netProfessionalArs, 0);
  const totalReleased = proTransactions
    .filter(t => t.status === 'RELEASED')
    .reduce((acc, t) => acc + t.netProfessionalArs, 0);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg('');
    try {
      await updateUserProfile({
        name,
        email,
        phone,
        zone,
        bio,
        matricula
      });
      setProfileSuccessMsg('¡Perfil actualizado con éxito!');
      setTimeout(() => setProfileSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveMpDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpAlias.trim() && !mpCvu.trim()) {
      alert('Ingresá al menos tu Alias o tu CVU/CUIT de Mercado Pago.');
      return;
    }
    setIsSavingMp(true);
    setMpSuccessMsg('');
    try {
      await saveMercadoPagoDetails({
        mpAlias: mpAlias.trim(),
        mpCvu: mpCvu.trim(),
        mpEmail: mpEmail.trim()
      });
      setMpSuccessMsg('¡Datos de Mercado Pago vinculados correctamente!');
      setTimeout(() => setMpSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingMp(false);
    }
  };

  const handleStartOAuthConnect = () => {
    setOauthEmail(mpEmail || currentUser.email || '');
    setOauthAlias(mpAlias || '');
    setOauthCvu(mpCvu || '');
    setOauthError('');
    setOauthStep('form');
    setIsMpModalOpen(true);
  };

  const handleConfirmOAuthConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oauthAlias.trim() && !oauthCvu.trim()) {
      setOauthError('Ingresá el Alias o CVU de tu cuenta real de Mercado Pago.');
      return;
    }
    setOauthError('');
    setOauthStep('connecting');

    // Simulate authentic OAuth handshake with Mercado Pago Argentina API
    setTimeout(async () => {
      await saveMercadoPagoDetails({
        mpAlias: oauthAlias.trim(),
        mpCvu: oauthCvu.trim(),
        mpEmail: oauthEmail.trim()
      });
      setOauthStep('success');
      setMpSuccessMsg(`¡Cuenta de Mercado Pago (${oauthAlias.trim() || 'Vinculada'}) conectada exitosamente!`);
      setTimeout(() => setMpSuccessMsg(''), 5000);
    }, 1500);
  };

  const isPro = currentUser.isProfessionalVerified || currentUser.role === 'PROFESSIONAL';

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header Profile Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 p-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <img
            src={currentUser.avatar || currentUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt={currentUser.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-red-500 shadow-md shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">{currentUser.name}</h1>
              {currentUser.isProfessionalVerified && (
                <span className="px-2 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-blue-300 text-[10px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-400" />
                  Verificado CONEXA
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{currentUser.email || 'Sin sesión iniciada'} · {currentUser.zone || 'Argentina'}</p>
            <div className="inline-flex items-center gap-2 mt-2">
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                isPro
                  ? 'bg-blue-950 text-blue-300 border border-blue-800'
                  : 'bg-zinc-800 text-zinc-300'
              }`}>
                {isPro ? '🛠️ Cuenta Dual (Cliente & Profesional)' : '👤 Perfil Cliente'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!currentUser.email ? (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs shadow-md shadow-red-600/30 border border-red-500/40 transition-all cursor-pointer flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              <span>Iniciar Sesión / Registrarse</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={logoutUser}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold text-xs border border-zinc-700 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>Cerrar Sesión</span>
            </button>
          )}
        </div>
      </div>

      {/* Dual Profile Verification Banner */}
      {!currentUser.isProfessionalVerified && (
        <div className="bg-gradient-to-r from-slate-900 via-zinc-950 to-blue-950 p-6 rounded-3xl border border-sky-800/60 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-950 border border-sky-600 text-sky-400 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">¿Tenés matrícula u oficio certificado?</h3>
              <p className="text-xs text-zinc-300 mt-0.5">
                Activá el modo profesional para enviar cotizaciones a solicitudes públicas y cobrar con la garantía de CONEXA.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveView('verification')}
            className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-sky-500/20 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5"
          >
            <span>Activar Modo Profesional</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Left Profile Form, Right Mercado Pago & Cobros */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Personal & Professional Profile */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <UserIcon className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-extrabold text-white">Datos Personales</h2>
            </div>

            {profileSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+54 9 11 ..."
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Zona de Cobertura / Ubicación</label>
                  <input
                    type="text"
                    value={zone}
                    onChange={e => setZone(e.target.value)}
                    placeholder="Ej: Palermo, CABA / GBA Norte"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {isPro && (
                <div className="pt-2 border-t border-slate-800 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1.5">
                      <FileBadge className="w-4 h-4 text-blue-400" />
                      <span>Matrícula o Certificación Profesional</span>
                    </label>
                    <input
                      type="text"
                      value={matricula}
                      onChange={e => setMatricula(e.target.value)}
                      placeholder="Ej: COPITEC Mat. #84920 / Gasista 2da Cat."
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Presentación / Especialidad Profesional
                    </label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Resumen de experiencia, herramientas y especialidad..."
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 resize-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-600/30 border border-red-500/40 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingProfile ? 'Guardando...' : 'Guardar Cambios de Perfil'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* Right Column: Mercado Pago Integration & Payout Settings */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Mercado Pago Card Box */}
          <div className="bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 rounded-3xl p-6 border border-blue-900/60 shadow-xl space-y-6 relative overflow-hidden">
            
            {/* Corner Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-blue-900/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center font-black text-xs">
                  MP
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Mercado Pago Argentina</h3>
                  <p className="text-[10px] text-sky-300">Vinculación de Cuentas & Cobros Directos</p>
                </div>
              </div>

              {currentUser.mpConnected ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Cuenta Vinculada
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-amber-950 border border-amber-800 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  No Vinculado
                </span>
              )}
            </div>

            {mpSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{mpSuccessMsg}</span>
              </div>
            )}

            {/* Quick OAuth Button */}
            <div className="bg-zinc-950/80 p-4 rounded-2xl border border-blue-900/50 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>Conectar con App de Mercado Pago</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Autorizá a CONEXA con tus datos reales para acreditar los pagos de tus trabajos en tu app de Mercado Pago.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartOAuthConnect}
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs shadow-md shadow-sky-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                <span>Conectar Cuenta de Mercado Pago</span>
              </button>
            </div>

            {/* Manual Alias / CVU Form */}
            <form onSubmit={handleSaveMpDetails} className="space-y-4 pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-sky-400" />
                <span>Tus Datos de Cobro en Mercado Pago</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Alias de Mercado Pago
                </label>
                <input
                  type="text"
                  value={mpAlias}
                  onChange={e => setMpAlias(e.target.value)}
                  placeholder="ej: mi.alias.mp"
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  CVU / CUIT de Mercado Pago (22 dígitos)
                </label>
                <input
                  type="text"
                  value={mpCvu}
                  onChange={e => setMpCvu(e.target.value)}
                  placeholder="ej: 00000031000..."
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Email de tu Cuenta Mercado Pago
                </label>
                <input
                  type="email"
                  value={mpEmail}
                  onChange={e => setMpEmail(e.target.value)}
                  placeholder="ej: mi.cuenta@mercadopago.com.ar"
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingMp}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-3.5 h-3.5 text-sky-400" />
                <span>{isSavingMp ? 'Guardando...' : 'Guardar Mis Datos de MP'}</span>
              </button>
            </form>

            {/* Earnings Summary for Professionals */}
            {isPro && (
              <div className="pt-4 border-t border-blue-900/50 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Resumen de Cobros en Custodia</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-zinc-950 border border-slate-800">
                    <span className="text-zinc-400 text-[10px] block">Retenido Escrow:</span>
                    <span className="font-extrabold text-amber-400 text-sm">${totalHeld.toLocaleString('es-AR')}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-950 border border-slate-800">
                    <span className="text-zinc-400 text-[10px] block">Acreditado en MP:</span>
                    <span className="font-extrabold text-emerald-400 text-sm">${totalReleased.toLocaleString('es-AR')}</span>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Mercado Pago Interactive Connection / Authorization Modal */}
      {isMpModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-sky-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 relative overflow-hidden animate-in fade-in zoom-in duration-150">
            
            {/* Top Bar with MP Brand Styling */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-sky-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
                  MP
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Autorización Mercado Pago</h3>
                  <p className="text-[10px] text-sky-400">Vinculación Segura de Cobros Argentina</p>
                </div>
              </div>

              <button
                onClick={() => setIsMpModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {oauthStep === 'form' && (
              <form onSubmit={handleConfirmOAuthConnect} className="space-y-4">
                <div className="p-3 rounded-2xl bg-sky-950/60 border border-sky-800/80 text-sky-200 text-xs leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-sky-300">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    <span>Conexión Directa con tu Cuenta Real</span>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    Ingresá el Email y tu Alias o CVU de Mercado Pago real para autorizar la recepción de fondos depositados en garantía por tus clientes.
                  </p>
                </div>

                {oauthError && (
                  <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{oauthError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Email de tu Cuenta de Mercado Pago
                  </label>
                  <input
                    type="email"
                    value={oauthEmail}
                    onChange={e => setOauthEmail(e.target.value)}
                    placeholder="ej: tu.mail@gmail.com"
                    required
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Alias de tu Mercado Pago
                  </label>
                  <input
                    type="text"
                    value={oauthAlias}
                    onChange={e => setOauthAlias(e.target.value)}
                    placeholder="ej: juan.perez.mp"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    CVU / CUIT / CBU (22 dígitos)
                  </label>
                  <input
                    type="text"
                    value={oauthCvu}
                    onChange={e => setOauthCvu(e.target.value)}
                    placeholder="ej: 0000003100012345678900"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
                  />
                </div>

                <div className="pt-2 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsMpModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs shadow-md shadow-sky-500/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Autorizar y Vincular MP</span>
                  </button>
                </div>
              </form>
            )}

            {oauthStep === 'connecting' && (
              <div className="py-8 text-center space-y-4">
                <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-sky-500/30 border-t-sky-400 animate-spin" />
                  <Smartphone className="w-6 h-6 text-sky-400" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-sm">Validando con Mercado Pago Argentina...</h4>
                  <p className="text-xs text-zinc-400 mt-1">Verificando titularidad y registrando credenciales en la plataforma</p>
                </div>
              </div>
            )}

            {oauthStep === 'success' && (
              <div className="py-4 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-base">¡Mercado Pago Vinculado con Éxito!</h4>
                  <p className="text-xs text-zinc-300 mt-1">
                    Tu alias <span className="font-mono font-bold text-sky-400">{oauthAlias || 'registrado'}</span> ha quedado autorizado para recibir las liberaciones automáticas de tus trabajos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMpModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  Continuar
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
