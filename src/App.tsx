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
import { Quote } from './types';
import { ShieldCheck, Loader2 } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeView, setActiveView, isLoading } = useApp();

  // Modals state
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
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
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-800/80 bg-zinc-900/50 py-6 text-xs text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white tracking-tight">CONEXA RMX</span>
            <span>— Plataforma Argentina de Servicios & Garantía Escrow</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            <span className="flex items-center gap-1 text-zinc-300">
              <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
              100% Pagos Protegidos
            </span>
            <span>·</span>
            <span>Autenticación Unificada Firebase & Dual-Profile</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
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
