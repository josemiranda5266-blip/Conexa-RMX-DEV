import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = ''
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const titleSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl'
  };

  const badgeSizes = {
    sm: 'text-[10px] px-1 py-0.2',
    md: 'text-xs px-1.5 py-0.5',
    lg: 'text-sm px-2 py-0.5',
    xl: 'text-base px-2.5 py-1'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Custom Invented CONEXA Emblem */}
      <div className={`relative ${iconSizes[size]} shrink-0 rounded-xl bg-gradient-to-br from-slate-900 via-slate-950 to-red-950 p-0.5 border border-red-500/40 shadow-lg shadow-red-600/20 group hover:border-red-500 transition-all flex items-center justify-center`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full p-1.5 text-white drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Connection Ring - Navy & Red */}
          <circle cx="50" cy="50" r="42" stroke="url(#conexa-grad-1)" strokeWidth="6" opacity="0.8" />
          
          {/* Interlocking 'C' and 'X' Connection Node */}
          <path
            d="M32 28 C18 40, 18 60, 32 72 L45 72 C35 60, 35 40, 45 28 Z"
            fill="url(#conexa-red)"
          />
          <path
            d="M68 28 C82 40, 82 60, 68 72 L55 72 C65 60, 65 40, 55 28 Z"
            fill="url(#conexa-navy)"
          />
          {/* Center Connection Bridge Spark */}
          <circle cx="50" cy="50" r="8" fill="#ffffff" />
          <path d="M42 50 L58 50 M50 42 L50 58" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />

          <defs>
            <linearGradient id="conexa-grad-1" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ef4444" />
              <stop offset="0.5" stopColor="#1e3a8a" />
              <stop offset="1" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="conexa-red" x1="20" y1="20" x2="50" y2="80" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f87171" />
              <stop offset="1" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="conexa-navy" x1="50" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3b82f6" />
              <stop offset="1" stopColor="#0f172a" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div>
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-black tracking-tight text-white ${titleSizes[size]}`}>
            CONEXA
          </span>
          <span className={`font-extrabold rounded-md bg-gradient-to-r from-red-600 to-red-700 text-white shadow-xs border border-red-500/40 tracking-wider ${badgeSizes[size]}`}>
            RMX
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 block mt-0.5 tracking-tight">
            Red de Servicios & Garantía Escrow
          </span>
        )}
      </div>
    </div>
  );
};
