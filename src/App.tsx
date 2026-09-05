import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { RequestsView } from './components/RequestsView';
import { ProfessionalsView } from './components/ProfessionalsView';
import { ChatView } from './components/ChatView';
import { TransactionsView } from './components/TransactionsView';
import { ProfessionalVerificationView } from './components/ProfessionalVerificationView';
import { NewRequestModal } from './components/NewRequestModal';
import { SubmitQuoteModal } from './components/SubmitQuoteModal';
import { EscrowPaymentModal } from './components/EscrowPaymentModal';
import { ReviewModal } from './components/ReviewModal';
import { ProfileView } from './components/ProfileView';
import { AuthModal } from './components/AuthModal';
import { LegalCenterView } from './components/LegalCenterView';
import { CookieBanner } from './components/CookieBanner';
import { RevocationModal } from './components/RevocationModal';
import { AfipDataFiscalModal } from './components/AfipDataFiscalModal';
import { Quote } from './types';
import { ShieldCheck, Loader2, RotateCcw, QrCode, Scale, Shield, FileText, ExternalLink } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeView, setActiveView, setLegalInitialTab, isLoading } = useApp();

  // Modals state
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isGlobalRevocationOpen, setIsGlobalRevocationOpen] = useState(false);
  const [isGlobalDataFiscalOpen, setIsGlobalDataFiscalOpen] = useState(false);
  const [submitQuoteRequestId, setSubmitQuoteRequestId] = useState<string | null>(null);
  const [escrowQuote, setEscrowQuote] = useState<Quote | null>(null);
  const [reviewModalData, setReviewModalData] = useState<{ requestId: string; proId: string } | null>(null);

  const handleOpenNewRequest = () => setIsNewRequestOpen(true);
  const handleOpenAuthModal = () => setIsAuthOpen(true);
  const handleOpenSubmitQuote = (requestId: string) => setSubmitQuoteRequestId(requestId);
  const handleOpenEscrow = (quote: Quote) => setEscrowQuote(quote);
  const handleOpenReview = (requestId: string, proId: string) => setReviewModalData({ requestId, proId });

  const handleSelectCategory = (catId: string) => {
    setActiveView('requests');
  };

  const handleOpenLegalTab = (tab: string) => {
    setLegalInitialTab(tab);
    setActiveView('legal');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white shadow-xl shadow-red-600/30 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white tracking-tight">Cargando CONEXA RMX</h2>
          <p className="text-xs text-zinc-400">Verificando sesión segura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      
      {/* Top Navigation Header */}
      <Header
        onOpenNewRequest={handleOpenNewRequest}
        onOpenAuthModal={handleOpenAuthModal}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeView === 'home' && (
          <HomeView
            onOpenNewRequest={handleOpenNewRequest}
            onSelectCategory={handleSelectCategory}
            onOpenSubmitQuote={handleOpenSubmitQuote}
          />
        )}

        {activeView === 'requests' && (
          <RequestsView
            onOpenNewRequest={handleOpenNewRequest}
            onOpenSubmitQuote={handleOpenSubmitQuote}
            onOpenEscrowModal={handleOpenEscrow}
            onOpenReviewModal={handleOpenReview}
          />
        )}

        {activeView === 'professionals' && (
          <ProfessionalsView onOpenNewRequest={handleOpenNewRequest} />
        )}

        {activeView === 'messages' && (
          <ChatView onOpenEscrowModal={handleOpenEscrow} />
        )}

        {activeView === 'transactions' && (
          <TransactionsView onOpenReviewModal={handleOpenReview} />
        )}

        {activeView === 'profile' && (
          <ProfileView onOpenAuthModal={handleOpenAuthModal} />
        )}

        {activeView === 'verification' && (
          <ProfessionalVerificationView onOpenAuthModal={handleOpenAuthModal} />
        )}

        {activeView === 'legal' && (
          <LegalCenterView />
        )}
      </main>

      {/* Comprehensive Argentine Legal Compliance Footer */}
      <footer className="mt-auto border-t border-zinc-800/90 bg-slate-950/90 py-8 text-xs text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* Top Footer Row: Identity, Badges & Botón de Arrepentimiento */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-base tracking-tight">CONEXA RMX</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-zinc-300 border border-slate-700">
                  Argentina
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Plataforma de intermediación de servicios técnicos y custodia fiduciaria Escrow. Operada por CONEXA RMX SERVICIOS DIGITALES S.A.S. (CUIT 30-71829340-9).
              </p>
            </div>

            {/* Legal Obligation Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsGlobalRevocationOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Botón de Arrepentimiento (Res. 271/2020)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGlobalDataFiscalOpen(true)}
                className="px-3 py-2 rounded-xl bg-sky-950/80 hover:bg-sky-900/80 border border-sky-800/80 text-sky-300 font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5 text-sky-400" />
                <span>Data Fiscal AFIP F.960/D</span>
              </button>
            </div>
          </div>

          {/* Middle Footer: Links to Legal Topics */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <button
                onClick={() => handleOpenLegalTab('terms')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Términos y Condiciones
              </button>
              <button
                onClick={() => handleOpenLegalTab('privacy')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Privacidad & Datos (Ley 25.326)
              </button>
              <button
                onClick={() => handleOpenLegalTab('escrow')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Garantía Escrow & Mercado Pago
              </button>
              <button
                onClick={() => handleOpenLegalTab('consumer')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Defensa del Consumidor (Ley 24.240)
              </button>
              <button
                onClick={() => handleOpenLegalTab('complaints')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Libro de Quejas Digital
              </button>
              <button
                onClick={() => handleOpenLegalTab('deletion')}
                className="hover:text-red-400 transition-colors cursor-pointer"
              >
                Baja de Cuenta (Res. 316/2018)
              </button>
            </div>

            <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
              <span>Órgano de Control AAIP · CABA, Argentina</span>
            </div>
          </div>

          {/* Bottom Disclaimer */}
          <div className="pt-2 text-[10px] text-zinc-500 leading-relaxed border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} CONEXA RMX. Todos los derechos reservados.</span>
            <span>La aceptación de presupuestos y servicios queda sujeta a los términos y condiciones de la plataforma.</span>
          </div>

        </div>
      </footer>

      {/* Cookie Consent Banner */}
      <CookieBanner onOpenPrivacy={() => handleOpenLegalTab('privacy')} />

      {/* Global Modals */}
      <RevocationModal
        isOpen={isGlobalRevocationOpen}
        onClose={() => setIsGlobalRevocationOpen(false)}
      />

      <AfipDataFiscalModal
        isOpen={isGlobalDataFiscalOpen}
        onClose={() => setIsGlobalDataFiscalOpen(false)}
      />

      <NewRequestModal
        isOpen={isNewRequestOpen}
        onClose={() => setIsNewRequestOpen(false)}
      />

      <SubmitQuoteModal
        isOpen={!!submitQuoteRequestId}
        requestId={submitQuoteRequestId}
        onClose={() => setSubmitQuoteRequestId(null)}
      />

      <EscrowPaymentModal
        isOpen={!!escrowQuote}
        quote={escrowQuote}
        onClose={() => setEscrowQuote(null)}
      />

      <ReviewModal
        isOpen={!!reviewModalData}
        requestId={reviewModalData?.requestId || null}
        professionalId={reviewModalData?.proId || null}
        onClose={() => setReviewModalData(null)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
