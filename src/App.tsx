import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { RequestsView } from './components/RequestsView';
import { ProfessionalsView } from './components/ProfessionalsView';
import { ChatView } from './components/ChatView';
import { TransactionsView } from './components/TransactionsView';
import { AuditView } from './components/AuditView';
import { NewRequestModal } from './components/NewRequestModal';
import { SubmitQuoteModal } from './components/SubmitQuoteModal';
import { EscrowPaymentModal } from './components/EscrowPaymentModal';
import { ReviewModal } from './components/ReviewModal';
import { Quote } from './types';
import { ShieldCheck, Heart } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeView, setActiveView } = useApp();

  // Modals state
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [submitQuoteRequestId, setSubmitQuoteRequestId] = useState<string | null>(null);
  const [escrowQuote, setEscrowQuote] = useState<Quote | null>(null);
  const [reviewModalData, setReviewModalData] = useState<{ requestId: string; proId: string } | null>(null);

  const handleOpenNewRequest = () => setIsNewRequestOpen(true);
  const handleOpenSubmitQuote = (requestId: string) => setSubmitQuoteRequestId(requestId);
  const handleOpenEscrow = (quote: Quote) => setEscrowQuote(quote);
  const handleOpenReview = (requestId: string, proId: string) => setReviewModalData({ requestId, proId });

  const handleSelectCategory = (catId: string) => {
    setActiveView('requests');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      
      {/* Top Navigation Header */}
      <Header onOpenNewRequest={handleOpenNewRequest} />

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

        {activeView === 'audit' && (
          <AuditView />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800 tracking-tight">CONEXA RMX</span>
            <span>— Plataforma Argentina de Servicios & Garantía Escrow</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              100% Pagos Protegidos
            </span>
            <span>·</span>
            <span>Versión 2026.1 Unified Core</span>
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
