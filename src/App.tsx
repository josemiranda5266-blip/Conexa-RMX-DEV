import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Navigation, MainTab } from './components/Navigation';
import { PrivacyBanner } from './components/PrivacyBanner';
import { ProfessionalCard } from './components/ProfessionalCard';
import { ProfessionalDetailModal } from './components/ProfessionalDetailModal';
import { MapComponent } from './components/MapComponent';
import { ChatWindow } from './components/ChatWindow';
import { ServiceRequestForm } from './components/ServiceRequestForm';
import { RequestsList } from './components/RequestsList';
import { QuoteModal } from './components/QuoteModal';
import { ReviewModal } from './components/ReviewModal';
import { VerificationModal } from './components/VerificationModal';
import { AdminPanel } from './components/AdminPanel';
import { AiAssistantModal } from './components/AiAssistantModal';
import { SettingsModal } from './components/SettingsModal';
import { FeedbackModal } from './components/FeedbackModal';
import { OnboardingModal } from './components/OnboardingModal';
import { RoleSelectionModal } from './components/RoleSelectionModal';
import { BecomeProfessionalModal } from './components/BecomeProfessionalModal';
import { DemandLanding } from './components/radar/DemandLanding';
import { AuthPortal } from './components/AuthPortal';
import { UserProfile, ServiceRequest, Quote } from './types';
import { 
  Search, SlidersHorizontal, MapPin, Briefcase, Star, 
  ShieldCheck, MessageSquare, PlusCircle, CheckCircle2, Heart, Award, Sparkles, Filter,
  MessageSquarePlus, HelpCircle, Check, AlertCircle, Wrench, Droplet, Car, Sparkle, Home, Smartphone,
  Users, User, ArrowRight, X
} from 'lucide-react';


const MainAppContent: React.FC = () => {
  const { 
    currentUser, users, categories, professions, searchQuery, setSearchQuery, 
    selectedCategory, setSelectedCategory, selectedProfession, setSelectedProfession,
    selectedCity, setSelectedCity, maxDistanceKm, setMaxDistanceKm, onlyVerified, setOnlyVerified,
    conversations, createConversation, favorites, requests, switchActiveMode,
    isAuthPortalOpen, closeAuthPortal 
  } = useApp();

  // Navigation State
  const [activeTab, setActiveTab] = useState<MainTab>('INICIO');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Modals State
  const [selectedProfessional, setSelectedProfessional] = useState<UserProfile | null>(null);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [isServiceRequestFormOpen, setIsServiceRequestFormOpen] = useState(false);
  const [quoteTargetRequest, setQuoteTargetRequest] = useState<ServiceRequest | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isLandingPreviewOpen, setIsLandingPreviewOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [isRoleSelectionModalOpen, setIsRoleSelectionModalOpen] = useState(false);
  const [isBecomeProModalOpen, setIsBecomeProModalOpen] = useState(false);
  const [onboardingRoleMode, setOnboardingRoleMode] = useState<'CLIENT' | 'PROFESSIONAL'>('CLIENT');

  const filteredProfessionals = users.filter(u => {
    if (!u.isProfessional) return false;
    if (u.isBlocked) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchProf = u.professionName?.toLowerCase().includes(q);
      const matchDesc = u.description?.toLowerCase().includes(q);
      const matchSpec = u.specialties?.some(s => s.toLowerCase().includes(q));
      if (!matchName && !matchProf && !matchDesc && !matchSpec) return false;
    }
    if (selectedCategory) {
      const profsInCat = professions.filter(p => p.categoryId === selectedCategory).map(p => p.name.toLowerCase());
      const uProf = u.professionName?.toLowerCase() || '';
      const matchCat = profsInCat.some(pName => uProf.includes(pName));
      if (!matchCat) return false;
    }
    if (onlyVerified && (!u.isIdentityVerified || !u.isProfessionalVerified)) return false;
    return true;
  });

  const handleStartChatWithPro = (pro: UserProfile) => {
    const convId = createConversation(pro.id);
    setActiveConversationId(convId);
    setActiveTab('MENSAJES');
  };

  const handleRequestQuote = (pro: UserProfile) => {
    setIsServiceRequestFormOpen(true);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/50 to-sky-100/60 flex items-center justify-center p-4">
        <AuthPortal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/50 to-sky-100/60 text-slate-900 font-sans pb-28 relative overflow-x-hidden selection:bg-blue-500 selection:text-white">
      <div className="fixed -top-32 -left-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="fixed top-1/3 -right-32 w-[30rem] h-[30rem] bg-indigo-500/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed -bottom-32 left-1/4 w-[32rem] h-[32rem] bg-emerald-500/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <Header 
        onOpenAiAssistant={() => setIsAiModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenVerifications={() => setIsVerificationModalOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        onOpenRegisterModal={() => setIsRoleSelectionModalOpen(true)}
        onOpenBecomePro={() => setIsBecomeProModalOpen(true)}
      />
      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <PrivacyBanner />
        {isLandingPreviewOpen ? (
          <DemandLanding onCloseLanding={() => setIsLandingPreviewOpen(false)} />
        ) : isAdminPanelOpen ? (
          <div className="space-y-4">
            <button onClick={() => setIsAdminPanelOpen(false)} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/60 shadow-xs">← Volver a la aplicación principal</button>
            <AdminPanel onOpenLandingPreview={() => setIsLandingPreviewOpen(true)} />
          </div>
        ) : (
          <>
            {activeTab === 'INICIO' && (
              <div className="space-y-6 animate-fade-in">
                {(currentUser.activeMode === 'PROFESSIONAL' || (!currentUser.activeMode && currentUser.isProfessional)) ? (
                  <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900/90 to-teal-950/90 backdrop-blur-xl text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-emerald-500/30 relative overflow-hidden space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full inline-flex items-center gap-1.5"><Wrench size={13} />🧰 Modo Profesional • {selectedCity}</span>
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Encontrá nuevos trabajos</h2>
                        <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-xl">Revisá solicitudes de clientes cercanos, enviá presupuestos y gestioná tus proyectos con privacidad protegida.</p>
                      </div>
                      <button onClick={() => switchActiveMode('CLIENT')} className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-blue-200 border border-white/20 font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-colors shrink-0 backdrop-blur-md cursor-pointer"><span>👤 Cambiar a Modo Cliente</span></button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                      <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15"><p className="text-[10px] text-emerald-300 font-extrabold uppercase tracking-wider">Solicitudes Cercanas</p><p className="text-xl sm:text-2xl font-black text-white mt-0.5">{requests.length} <span className="text-xs font-semibold text-slate-300">pedidos</span></p></div>
                      <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15"><p className="text-[10px] text-blue-300 font-extrabold uppercase tracking-wider">Presupuestos Enviados</p><p className="text-xl sm:text-2xl font-black text-white mt-0.5">2 <span className="text-xs font-semibold text-slate-300">activos</span></p></div>
                      <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15"><p className="text-[10px] text-amber-300 font-extrabold uppercase tracking-wider">Reputación</p><p className="text-xl sm:text-2xl font-black text-white mt-0.5">{currentUser.rating || 4.9} ★ <span className="text-xs font-semibold text-slate-300">({currentUser.reviewCount || 87})</span></p></div>
                      <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15"><p className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-wider">Trabajos Realizados</p><p className="text-xl sm:text-2xl font-black text-white mt-0.5">{currentUser.jobsCompleted || 127} <span className="text-xs font-semibold text-slate-300">listos</span></p></div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button onClick={() => setActiveTab('BUSCAR')} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-2xl text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"><span>Ver Solicitudes Compatibles ({requests.length})</span></button>
                      <button onClick={() => setIsBecomeProModalOpen(true)} className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs border border-white/20 transition-colors cursor-pointer">Editar Mi Perfil Profesional</button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/80 backdrop-blur-xl text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 relative overflow-hidden">
                    <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
                    <div className="max-w-2xl space-y-3 relative z-10">
                      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md text-blue-300 border border-white/20 px-3 py-1 rounded-full inline-flex items-center gap-1">📍 {selectedCity} • Conexión Privada</span><button onClick={() => { setOnboardingRoleMode('CLIENT'); setIsOnboardingModalOpen(true); }} className="text-[11px] font-bold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-400/30 px-3 py-1 rounded-full flex items-center gap-1 transition-colors cursor-pointer"><HelpCircle size={13} />¿Cómo funciona la privacidad?</button></div>{currentUser.hasProfessionalProfile || currentUser.isProfessional ? <button onClick={() => switchActiveMode('PROFESSIONAL')} className="text-[11px] font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full flex items-center gap-1 transition-colors cursor-pointer"><Wrench size={13} />Cambiar a Modo Profesional 🧰</button> : null}</div>
                      <h2 className="text-2xl sm:text-3xl font-black leading-tight text-white tracking-tight">Contame qué necesitás...</h2>
                      <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed">Encontrá profesionales confiables en Santiago del Estero. Chateá primero sin revelar tu teléfono ni domicilio.</p>
                      <div className="pt-2 flex flex-col sm:flex-row gap-2"><div className="relative flex-1"><Search size={18} className="absolute left-3.5 top-3.5 text-slate-400" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder='Ej: "Contame qué necesitás..." (Electricista, Plomero, Mecánico)' className="w-full pl-10 pr-4 py-3 bg-white/90 backdrop-blur-md text-slate-900 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 border border-white/50 shadow-lg" /></div><button onClick={() => setActiveTab('BUSCAR')} className="py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-blue-600/30 transition-all shrink-0 border border-white/20 active:scale-95 cursor-pointer">Buscar Profesionales</button></div>
                      <div className="pt-2 flex items-center gap-1.5 flex-wrap text-[11px]"><span className="text-slate-400 font-semibold">¿Qué necesitás hoy?:</span>{[{label:'🔧 Electricista',term:'electricista'},{label:'🚰 Plomero',term:'plomero'},{label:'🚗 Mecánico',term:'mecánico'},{label:'🧹 Limpieza',term:'limpieza'},{label:'🏠 Albañil',term:'albañil'},{label:'📱 Técnico',term:'técnico'}].map((chip,idx)=><button key={idx} onClick={()=>{setSearchQuery(chip.term);setActiveTab('BUSCAR');}} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 rounded-xl font-medium transition-colors cursor-pointer">{chip.label}</button>)}</div>
                    </div>
                  </div>
                )}
                <div className="space-y-3"><div className="flex justify-between items-center"><h3 className="font-bold text-slate-900 text-base flex items-center gap-2"><span>Categorías Principales</span></h3>{selectedCategory && <button onClick={() => setSelectedCategory(null)} className="text-xs text-blue-600 font-semibold hover:underline bg-white/60 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/60">Limpiar filtro</button>}</div><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">{categories.map(cat=><button key={cat.id} onClick={()=>{setSelectedCategory(selectedCategory===cat.id?null:cat.id);setActiveTab('BUSCAR');}} className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between space-y-2 ${selectedCategory===cat.id?'bg-blue-600/90 backdrop-blur-md text-white border-blue-400/60 shadow-lg shadow-blue-600/25 scale-[1.02]':'bg-white/60 backdrop-blur-md text-slate-800 border-white/70 hover:bg-white/80 hover:border-blue-300 hover:shadow-md'}`}><div className={`p-2 rounded-xl w-fit ${selectedCategory===cat.id?'bg-white/20 backdrop-blur-sm':'bg-blue-500/10 text-blue-600'}`}><Briefcase size={18}/></div><div><p className="font-bold text-xs leading-tight">{cat.name}</p><p className={`text-[10px] mt-0.5 ${selectedCategory===cat.id?'text-blue-100':'text-slate-500'}`}>{cat.description.slice(0,32)}...</p></div></button>)}</div></div>
                <div className="space-y-3"><div className="flex justify-between items-center"><div><h3 className="font-bold text-slate-900 text-base">Profesionales Destacados en {selectedCity}</h3><p className="text-xs text-slate-500">Con verificación de identidad y calificaciones en trabajos previos</p></div><button onClick={()=>setActiveTab('BUSCAR')} className="text-xs text-blue-600 font-bold hover:underline bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/60 shadow-2xs">Ver todos ({filteredProfessionals.length}) →</button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filteredProfessionals.slice(0,6).map(pro=><ProfessionalCard key={pro.id} professional={pro} onViewDetail={p=>{setSelectedProfessional(p);setIsProModalOpen(true);}} onContact={p=>handleStartChatWithPro(p)}/>)}</div></div>
                <RequestsList onSendQuoteForRequest={req=>{setQuoteTargetRequest(req);setIsQuoteModalOpen(true);}} onOpenChatWithClient={clientId=>{const convId=createConversation(clientId);setActiveConversationId(convId);setActiveTab('MENSAJES');}} />
              </div>
            )}
            {activeTab === 'BUSCAR' && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-white/70 backdrop-blur-xl p-4 rounded-3xl border border-white/80 shadow-xl shadow-slate-900/5 space-y-3"><div className="flex flex-col sm:flex-row gap-2"><div className="relative flex-1"><Search size={18} className="absolute left-3.5 top-3 text-slate-400"/><input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Buscar por profesión, especialidad o nombre..." className="w-full pl-10 pr-4 py-2.5 bg-white/80 backdrop-blur-md border border-white/80 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"/></div><button onClick={()=>setOnlyVerified(!onlyVerified)} className={`px-3.5 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shrink-0 ${onlyVerified?'bg-emerald-600 text-white shadow-md shadow-emerald-600/20':'bg-white/80 backdrop-blur-md text-slate-700 hover:bg-white border border-white/80'}`}><ShieldCheck size={16}/><span>Solo Verificados</span></button></div><div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold pt-1"><span className="text-slate-400 shrink-0">Categoría:</span><button onClick={()=>setSelectedCategory(null)} className={`px-3.5 py-1 rounded-full border shrink-0 transition-all ${!selectedCategory?'bg-slate-900 text-white border-slate-900 shadow-sm':'bg-white/60 backdrop-blur-md text-slate-700 border-white/80 hover:bg-white'}`}>Todas</button></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filteredProfessionals.map(pro=><ProfessionalCard key={pro.id} professional={pro} onViewDetail={p=>{setSelectedProfessional(p);setIsProModalOpen(true);}} onContact={p=>handleStartChatWithPro(p)}/>)}</div>
              </div>
            )}
            {activeTab === 'MAPA' && <MapComponent professionals={filteredProfessionals} selectedCity={selectedCity} maxDistanceKm={maxDistanceKm} onSelectProfessional={p=>{setSelectedProfessional(p);setIsProModalOpen(true);}} />}
            {activeTab === 'MENSAJES' && <ChatWindow conversationId={activeConversationId} />}
            {activeTab === 'PERFIL' && <div className="bg-white rounded-3xl p-6 shadow-sm">Perfil de usuario</div>}
          </>
        )}
      </main>
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} onCreateRequestClick={() => setIsServiceRequestFormOpen(true)} />
      {selectedProfessional && <ProfessionalDetailModal professional={selectedProfessional} isOpen={isProModalOpen} onClose={() => setIsProModalOpen(false)} onRequestQuote={handleRequestQuote} onContact={handleStartChatWithPro} />}
      {isServiceRequestFormOpen && <ServiceRequestForm onClose={() => setIsServiceRequestFormOpen(false)} />}
      {quoteTargetRequest && <QuoteModal request={quoteTargetRequest} isOpen={isQuoteModalOpen} onClose={() => {setIsQuoteModalOpen(false);setQuoteTargetRequest(null);}} />}
      <ReviewModal isOpen={false} onClose={()=>{}} />
      <VerificationModal isOpen={isVerificationModalOpen} onClose={()=>setIsVerificationModalOpen(false)} />
      <AiAssistantModal isOpen={isAiModalOpen} onClose={()=>setIsAiModalOpen(false)} />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={()=>setIsSettingsModalOpen(false)} />
      <FeedbackModal isOpen={isFeedbackModalOpen} onClose={()=>setIsFeedbackModalOpen(false)} />
      <OnboardingModal isOpen={isOnboardingModalOpen} onClose={()=>setIsOnboardingModalOpen(false)} role={onboardingRoleMode} />
      <RoleSelectionModal isOpen={isRoleSelectionModalOpen} onClose={()=>setIsRoleSelectionModalOpen(false)} />
      <BecomeProfessionalModal isOpen={isBecomeProModalOpen} onClose={()=>setIsBecomeProModalOpen(false)} />
      {isAuthPortalOpen && <AuthPortal />}
    </div>
  );
};

export const App: React.FC = () => <AppProvider><MainAppContent /></AppProvider>;
