import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  DollarSign,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  CreditCard,
  Building,
  Sparkles,
  FileCheck,
  RotateCcw,
  Scale
} from 'lucide-react';
import { RevocationModal } from './RevocationModal';

export const TransactionsView: React.FC<{
  onOpenReviewModal: (requestId: string, proId: string) => void;
}> = ({ onOpenReviewModal }) => {
  const { transactions, requests, currentUser, releasePayment, connectMercadoPago, setLegalInitialTab, setActiveView } = useApp();
  const [revocationModalOpen, setRevocationModalOpen] = useState(false);
  const [selectedTxIdForRevocation, setSelectedTxIdForRevocation] = useState<string | undefined>();
  const [selectedReqIdForRevocation, setSelectedReqIdForRevocation] = useState<string | undefined>();

  const totalHeld = transactions
    .filter(t => t.status === 'PAYMENT_HELD' || t.status === 'SERVICE_COMPLETED')
    .reduce((acc, t) => acc + t.amountArs, 0);

  const totalReleased = transactions
    .filter(t => t.status === 'RELEASED')
    .reduce((acc, t) => acc + t.amountArs, 0);

  const handleRelease = async (txId: string, reqId: string, proId: string) => {
    await releasePayment(txId);
    onOpenReviewModal(reqId, proId);
  };

  const handleOpenRevoke = (txId: string, reqId: string) => {
    setSelectedTxIdForRevocation(txId);
    setSelectedReqIdForRevocation(reqId);
    setRevocationModalOpen(true);
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Garantía Escrow & Movimientos</h1>
          <p className="text-sm text-zinc-400">
            Seguimiento de fondos retenidos en custodia, liberaciones de pago y comisiones.
          </p>
        </div>

        {currentUser.role === 'PROFESSIONAL' && !currentUser.mpConnected && (
          <button
            onClick={connectMercadoPago}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-600/30 transition-all cursor-pointer border border-red-500/40"
          >
            <CreditCard className="w-4 h-4" />
            <span>Vincular Cuenta Mercado Pago</span>
          </button>
        )}
      </div>

      {/* Escrow Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold">
            <span>En Custodia Escrow</span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">${totalHeld.toLocaleString('es-AR')}</div>
          <p className="text-[11px] text-zinc-400">Fondos protegidos hasta conformidad del cliente</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold">
            <span>Fondos Liberados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">${totalReleased.toLocaleString('es-AR')}</div>
          <p className="text-[11px] text-zinc-400">Acreditados exitosamente a profesionales</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold">
            <span>Tasa de Protección CONEXA</span>
            <ShieldCheck className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">10%</div>
          <p className="text-[11px] text-zinc-400">Incluye seguro de caución y arbitraje</p>
        </div>

      </div>

      {/* Transactions List */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-base">Historial de Transacciones</h3>
          <span className="text-xs text-zinc-400">{transactions.length} registros</span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-sm">
            Aún no hay transacciones registradas.
          </div>
        ) : (
          <div className="divide-y divide-slate-800 overflow-x-auto">
            {transactions.map(tx => {
              const req = requests.find(r => r.id === tx.serviceRequestId);

              return (
                <div key={tx.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-zinc-400 font-semibold">{tx.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        tx.status === 'RELEASED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        tx.status === 'SERVICE_COMPLETED' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                        'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {tx.status === 'RELEASED' ? 'Liberado al Profesional' :
                         tx.status === 'SERVICE_COMPLETED' ? 'Servicio Finalizado (Pendiente de Liberación)' :
                         'Retenido en Custodia Escrow'}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-sm">
                      {req?.title || 'Servicio Profesional CONEXA'}
                    </h4>

                    <div className="text-xs text-zinc-400 flex items-center gap-3">
                      <span>{tx.paymentMethod || 'Mercado Pago'}</span>
                      <span>·</span>
                      <span>{new Date(tx.createdAt).toLocaleDateString('es-AR')}</span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center shrink-0">
                    <div className="text-right">
                      <div className="font-extrabold text-white text-base sm:text-lg">
                        ${tx.amountArs.toLocaleString('es-AR')}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Neto Profesional: ${tx.netProfessionalArs.toLocaleString('es-AR')}
                      </div>
                    </div>

                    {currentUser.role === 'CLIENT' && (tx.status === 'PAYMENT_HELD' || tx.status === 'SERVICE_COMPLETED') && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => handleOpenRevoke(tx.id, tx.serviceRequestId)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                          title="Revocar contratación dentro del plazo legal de 10 días (Res. 271/2020)"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-400" />
                          <span>Arrepentimiento</span>
                        </button>

                        <button
                          onClick={() => handleRelease(tx.id, tx.serviceRequestId, tx.professionalId)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                        >
                          Liberar Fondos
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Revocation Modal */}
      <RevocationModal
        isOpen={revocationModalOpen}
        onClose={() => {
          setRevocationModalOpen(false);
          setSelectedTxIdForRevocation(undefined);
          setSelectedReqIdForRevocation(undefined);
        }}
        preselectedTransactionId={selectedTxIdForRevocation}
        preselectedRequestId={selectedReqIdForRevocation}
      />

    </div>
  );
};
