import React from 'react';
import { Home, Search, Map, MessageSquare, User, PlusCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export type MainTab = 'INICIO' | 'BUSCAR' | 'MAPA' | 'MENSAJES' | 'PERFIL';

interface NavigationProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  onCreateRequestClick: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  onCreateRequestClick
}) => {
  const { conversations } = useApp();
  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/75 backdrop-blur-xl border-t border-white/60 shadow-2xl shadow-slate-900/10">
      <div className="max-w-md mx-auto px-6 py-2.5 flex items-center justify-between relative">
        {/* Tab 1: Inicio */}
        <button
          onClick={() => onTabChange('INICIO')}
          className={`flex flex-col items-center gap-0.5 text-xs font-bold transition-all ${
            activeTab === 'INICIO' ? 'text-blue-600 scale-105' : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Inicio"
        >
          <Home size={20} />
          <span>Inicio</span>
        </button>

        {/* Tab 2: Buscar */}
        <button
          onClick={() => onTabChange('BUSCAR')}
          className={`flex flex-col items-center gap-0.5 text-xs font-bold transition-all ${
            activeTab === 'BUSCAR' ? 'text-blue-600 scale-105' : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Buscar"
        >
          <Search size={20} />
          <span>Buscar</span>
        </button>

        {/* Center Floating Action Button: Publicar Solicitud */}
        <button
          onClick={onCreateRequestClick}
          className="relative -top-6 p-3.5 bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white rounded-full shadow-xl shadow-blue-600/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-4 border-white/90 backdrop-blur-md"
          title="Publicar Solicitud de Servicio"
          aria-label="Publicar Solicitud"
        >
          <PlusCircle size={26} />
        </button>

        {/* Tab 3: Mapa */}
        <button
          onClick={() => onTabChange('MAPA')}
          className={`flex flex-col items-center gap-0.5 text-xs font-bold transition-all ${
            activeTab === 'MAPA' ? 'text-blue-600 scale-105' : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Mapa"
        >
          <Map size={20} />
          <span>Mapa</span>
        </button>

        {/* Tab 4: Mensajes */}
        <button
          onClick={() => onTabChange('MENSAJES')}
          className={`flex flex-col items-center gap-0.5 text-xs font-bold transition-all relative ${
            activeTab === 'MENSAJES' ? 'text-blue-600 scale-105' : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Mensajes"
        >
          <div className="relative">
            <MessageSquare size={20} />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center shadow-xs">
                {totalUnread}
              </span>
            )}
          </div>
          <span>Mensajes</span>
        </button>
      </div>
    </div>
  );
};
