import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Logo } from './Logo';
import {
  MessageSquare,
  FileText,
  DollarSign,
  Users,
  PlusCircle,
  User as UserIcon,
  CreditCard,
  Menu,
  X,
  Home,
  LogOut,
  ShieldCheck,
  Award,
  Zap,
  ChevronDown
} from 'lucide-react';

export const Header: React.FC<{
  onOpenNewRequest: () => void;
  onOpenAuthModal?: () => void;
}> = ({ onOpenNewRequest, onOpenAuthModal }) => {
  const { currentUser, activeView, setActiveView, requests, conversations, logoutUser } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadMessagesCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const pendingRequestsCount = requests.filter(r => r.status === 'QUOTES_RECEIVED' || r.status === 'PENDING').length;

  const navItems = [
    { id: 'home', label: 'Inicio', icon: Home, color: 'text-zinc-300' },
    { id: 'requests', label: 'Solicitudes', icon: FileText, color: 'text-red-500', badge: pendingRequestsCount },
    { id: 'professionals', label: 'Profesionales', icon: Users, color: 'text-blue-400' },
    { id: 'messages', label: 'Mensajes', icon: MessageSquare, color: 'text-red-400', badgeDot: unreadMessagesCount > 0 },
    { id: 'transactions', label: 'Garantía & Pagos', icon: DollarSign, color: 'text-emerald-400' },
  ];

  const handleSelectView = (viewId: any) => {
    setActiveView(viewId);
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    await logoutUser();
  };

  const isAuthenticated = Boolean(currentUser && currentUser.email);

  return (
    <header id="header-main" className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* CONEXA Brand Logo */}
          <button
            id="btn-nav-logo"
            onClick={() => handleSelectView('home')}
            className="text-left group cursor-pointer focus:outline-none shrink-0"
          >
            <Logo size="md" />
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => handleSelectView(item.id)}
                  className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-slate-900 to-blue-950 text-white border border-red-500/40 shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="px-1.5 py-0.2 text-[10px] font-extrabold rounded-full bg-red-600 text-white animate-pulse">
                      {item.badge}
                    </span>
                  ) : null}
                  {item.badgeDot ? (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Right Actions & User Avatar Dropdown */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* New Request Quick Button */}
            <button
              onClick={onOpenNewRequest}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs shadow-md shadow-red-600/20 border border-red-500/40 transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Pedir Presupuesto</span>
            </button>

            {isAuthenticated ? (
              /* User Dropdown Menu */
              <div className="relative" ref={dropdownRef}>
                <button
                  id="btn-user-dropdown"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-slate-700 transition-all cursor-pointer"
                  aria-expanded={dropdownOpen}
                >
                  <div className="relative">
                    <img
                      src={currentUser.avatar || currentUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-full object-cover border border-red-500/40"
                    />
                    {currentUser.isProfessionalVerified && (
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-600 rounded-full border border-zinc-950 flex items-center justify-center text-[8px] text-white">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:block text-left text-xs max-w-[120px]">
                    <div className="font-bold text-zinc-100 truncate">{currentUser.name}</div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      {currentUser.isProfessionalVerified ? '⭐ Profesional' : 'Cliente'}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>

                {/* Dropdown Box */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 py-2 z-50 animate-in fade-in zoom-in duration-150">
                    
                    {/* User Info Header */}
                    <div className="px-4 py-2.5 border-b border-slate-800">
                      <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                      <p className="text-xs text-zinc-400 truncate">{currentUser.email}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                          currentUser.isProfessionalVerified
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}>
                          {currentUser.isProfessionalVerified ? '🛠️ Profesional Verificado' : '👤 Cliente'}
                        </span>
                        {currentUser.mpConnected && (
                          <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-0.5">
                            • MP Vinculado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Menu Actions */}
                    <div className="py-1">
                      <button
                        onClick={() => handleSelectView('profile')}
                        className="w-full text-left px-4 py-2.5 text-xs sm:text-sm text-zinc-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <UserIcon className="w-4 h-4 text-zinc-400" />
                        <span>Mi Perfil & Datos</span>
                      </button>

                      <button
                        onClick={() => handleSelectView('profile')}
                        className="w-full text-left px-4 py-2.5 text-xs sm:text-sm text-zinc-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4 text-sky-400" />
                        <span>Cobros Mercado Pago</span>
                      </button>

                      {!currentUser.isProfessionalVerified ? (
                        <button
                          onClick={() => handleSelectView('verification')}
                          className="w-full text-left px-4 py-2.5 text-xs sm:text-sm text-sky-300 hover:text-sky-200 hover:bg-sky-950/50 font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Zap className="w-4 h-4 text-sky-400" />
                          <span>⚡ Activar Modo Profesional</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSelectView('verification')}
                          className="w-full text-left px-4 py-2.5 text-xs sm:text-sm text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/40 font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>Matrícula & Certificación</span>
                        </button>
                      )}
                    </div>

                    {/* Logout Button */}
                    <div className="pt-1 border-t border-slate-800">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-xs sm:text-sm text-red-400 hover:text-red-300 hover:bg-red-950/40 flex items-center gap-2.5 transition-colors cursor-pointer font-semibold"
                      >
                        <LogOut className="w-4 h-4 text-red-400" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>
            ) : (
              /* Guest Login Button */
              onOpenAuthModal && (
                <button
                  onClick={onOpenAuthModal}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-extrabold shadow-md shadow-red-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Ingresar / Registrarse</span>
                </button>
              )
            )}

            {/* Mobile Menu Hamburger Button */}
            <button
              id="btn-mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-red-400" /> : <Menu className="w-5 h-5 text-zinc-300" />}
            </button>
          </div>
        </div>

        {/* Scrollable Sub-Header Nav Bar for Mobile Screens */}
        <div className="flex md:hidden overflow-x-auto py-2 border-t border-zinc-900 no-scrollbar gap-1.5 text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectView(item.id)}
                className={`whitespace-nowrap px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
                  isActive
                    ? 'bg-blue-900/80 text-white border border-blue-500/50 shadow-xs'
                    : 'bg-zinc-900/60 text-zinc-300 border border-zinc-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-zinc-800/80 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectView(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition-all ${
                    isActive
                      ? 'bg-blue-950 text-white border border-blue-500/40'
                      : 'text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}

            <div className="pt-2 border-t border-zinc-900 px-1 space-y-2">
              <button
                onClick={() => handleSelectView('profile')}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 text-xs font-bold text-zinc-200 flex items-center gap-2 cursor-pointer border border-slate-800"
              >
                <UserIcon className="w-4 h-4 text-sky-400" />
                <span>Mi Perfil & Mercado Pago</span>
              </button>

              {!currentUser.isProfessionalVerified && (
                <button
                  onClick={() => handleSelectView('verification')}
                  className="w-full py-2.5 px-3 rounded-xl bg-sky-950/80 text-xs font-bold text-sky-300 flex items-center gap-2 cursor-pointer border border-sky-800"
                >
                  <Zap className="w-4 h-4 text-sky-400" />
                  <span>⚡ Activar Modo Profesional</span>
                </button>
              )}

              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 rounded-xl bg-red-950/60 border border-red-800 text-xs font-bold text-red-200 hover:text-white flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span>Cerrar Sesión ({currentUser.name})</span>
                </button>
              ) : onOpenAuthModal ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuthModal();
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-xs font-extrabold text-white flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <UserIcon className="w-4 h-4 text-white" />
                  <span>Iniciar Sesión / Registrarse</span>
                </button>
              ) : null}
            </div>
          </div>
        )}

      </div>
    </header>
  );
};
