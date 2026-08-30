import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Wrench,
  ShieldCheck,
  MessageSquare,
  FileText,
  DollarSign,
  Users,
  Activity,
  PlusCircle,
  Search,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

export const Header: React.FC<{ onOpenNewRequest: () => void }> = ({ onOpenNewRequest }) => {
  const { currentUser, switchRole, activeView, setActiveView, requests, conversations } = useApp();

  const unreadMessagesCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const pendingRequestsCount = requests.filter(r => r.status === 'QUOTES_RECEIVED' || r.status === 'PENDING').length;

  return (
    <header id="header-main" className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <button
              id="btn-nav-logo"
              onClick={() => setActiveView('home')}
              className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xl tracking-tight text-slate-900">CONEXA</span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">RMX</span>
                </div>
                <span className="text-[11px] font-medium text-slate-500 block -mt-0.5">Servicios Profesionales Verificados</span>
              </div>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              id="nav-btn-home"
              onClick={() => setActiveView('home')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeView === 'home'
                  ? 'bg-sky-50 text-sky-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Inicio
            </button>
            <button
              id="nav-btn-requests"
              onClick={() => setActiveView('requests')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeView === 'requests'
                  ? 'bg-sky-50 text-sky-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Solicitudes</span>
              {pendingRequestsCount > 0 && (
                <span className="px-1.5 py-0.2 text-[11px] font-bold rounded-full bg-sky-600 text-white">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
            <button
              id="nav-btn-pros"
              onClick={() => setActiveView('professionals')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeView === 'professionals'
                  ? 'bg-sky-50 text-sky-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Profesionales</span>
            </button>
            <button
              id="nav-btn-messages"
              onClick={() => setActiveView('messages')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeView === 'messages'
                  ? 'bg-sky-50 text-sky-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Mensajes</span>
              {unreadMessagesCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>
            <button
              id="nav-btn-transactions"
              onClick={() => setActiveView('transactions')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeView === 'transactions'
                  ? 'bg-sky-50 text-sky-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Garantía & Pagos</span>
            </button>
            <button
              id="nav-btn-audit"
              onClick={() => setActiveView('audit')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeView === 'audit'
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Auditoría RMX</span>
            </button>
          </nav>

          {/* Right Actions & Role Switcher */}
          <div className="flex items-center gap-3">
            {/* Primary Action Button */}
            {currentUser.role === 'CLIENT' ? (
              <button
                id="btn-publish-request"
                onClick={onOpenNewRequest}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold shadow-sm shadow-sky-600/20 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Pedir Presupuesto</span>
              </button>
            ) : currentUser.role === 'PROFESSIONAL' ? (
              <button
                id="btn-find-jobs"
                onClick={() => setActiveView('requests')}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Explorar Trabajos</span>
              </button>
            ) : null}

            {/* Role Switcher Pill */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                id="btn-role-client"
                onClick={() => switchRole('CLIENT')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  currentUser.role === 'CLIENT'
                    ? 'bg-white text-sky-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cliente
              </button>
              <button
                id="btn-role-pro"
                onClick={() => switchRole('PROFESSIONAL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  currentUser.role === 'PROFESSIONAL'
                    ? 'bg-white text-emerald-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Profesional
              </button>
              <button
                id="btn-role-admin"
                onClick={() => switchRole('ADMIN')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-white text-purple-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Auditor
              </button>
            </div>

            {/* User Avatar Card */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
              <div className="hidden xl:block text-left text-xs">
                <div className="font-semibold text-slate-800 leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-slate-500 capitalize">
                  {currentUser.role === 'CLIENT' ? 'Cliente' : currentUser.role === 'PROFESSIONAL' ? 'Profesional Verificado' : 'Auditor Conexa'}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
