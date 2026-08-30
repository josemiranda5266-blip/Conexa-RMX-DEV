import React from 'react';
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
  FileCheck
} from 'lucide-react';

export const TransactionsView: React.FC<{
  onOpenReviewModal: (requestId: string, proId: string) => void;
}> = ({ onOpenReviewModal }) => {
  const { transactions, requests, currentUser, releasePayment, connectMercadoPago } = useApp();

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

  return (
    <div className="space-y-8 pb-16">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Garantía Escrow & Movimientos</h1>
          <p className="text-sm text-slate-500">
            Seguimiento de fondos retenidos en custodia, liberaciones de pago y comisiones.
          </p>
        </div>

        {currentUser.role === 'PROFESSIONAL' && !currentUser.mpConnected && (
          <button
            onClick={connectMercadoPago}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Vincular Cuenta Mercado Pago</span>
          </button>
        )}
      </div>

      {/* Escrow Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>En Custodia Escrow</span>
            <Lock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">${totalHeld.toLocaleString('es-AR')}</div>
          <p className="text-[11px] text-slate-400">Fondos protegidos hasta conformidad del cliente</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Fondos Liberados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">${totalReleased.toLocaleString('es-AR')}</div>
          <p className="text-[11px] text-slate-400">Acreditados exitosamente a profesionales</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Tasa de Protección CONEXA</span>
            <ShieldCheck className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">10%</div>
          <p className="text-[11px] text-slate-400">Incluye seguro de caución y arbitraje</p>
        </div>

      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">Historial de Transacciones</h3>
          <span className="text-xs text-slate-500">{transactions.length} registros</span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Aún no hay transacciones registradas.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {transactions.map(tx => {
              const req = requests.find(r => r.id === tx.serviceRequestId);

              return (
                <div key={tx.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-400 font-semibold">{tx.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        tx.status === 'RELEASED' ? 'bg-emerald-100 text-emerald-800' :
                        tx.status === 'SERVICE_COMPLETED' ? 'bg-purple-100 text-purple-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {tx.status === 'RELEASED' ? 'Liberado al Profesional' :
                         tx.status === 'SERVICE_COMPLETED' ? 'Servicio Finalizado (Pendiente de Liberación)' :
                         'Retenido en Custodia Escrow'}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm">
                      {req?.title || 'Servicio Profesional CONEXA'}
                    </h4>

                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>{tx.paymentMethod || 'Mercado Pago'}</span>
                      <span>·</span>
                      <span>{new Date(tx.createdAt).toLocaleDateString('es-AR')}</span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center shrink-0">
                    <div className="text-right">
                      <div className="font-extrabold text-slate-900 text-base sm:text-lg">
                        ${tx.amountArs.toLocaleString('es-AR')}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Neto Profesional: ${tx.netProfessionalArs.toLocaleString('es-AR')}
                      </div>
                    </div>

                    {currentUser.role === 'CLIENT' && (tx.status === 'PAYMENT_HELD' || tx.status === 'SERVICE_COMPLETED') && (
                      <button
                        onClick={() => handleRelease(tx.id, tx.serviceRequestId, tx.professionalId)}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        Liberar Fondos
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
