import React from 'react';
import { ShieldCheck, Award, Lock } from 'lucide-react';

interface TrustBadgeProps {
  isIdentityVerified?: boolean;
  isProfessionalVerified?: boolean;
  trustScore?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({ 
  isIdentityVerified, 
  isProfessionalVerified,
  trustScore,
  size = 'md' 
}) => {
  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 15;
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <div className="flex flex-wrap items-center gap-1.5 my-0.5">
      {isIdentityVerified && (
        <span 
          id="badge-identity-verified"
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium ${textSize}`}
          title="Identidad verificada mediante DNI o documento oficial"
        >
          <ShieldCheck size={iconSize} className="text-emerald-600" />
          <span>🟢 Identidad verificada</span>
        </span>
      )}

      {isProfessionalVerified && (
        <span 
          id="badge-pro-verified"
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-medium ${textSize}`}
          title="Profesional verificado con matrícula, título o documentación comercial habilitante"
        >
          <Award size={iconSize} className="text-blue-600" />
          <span>🔵 Profesional verificado</span>
        </span>
      )}

      {trustScore !== undefined && trustScore > 0 && (
        <span 
          id="badge-trust-score"
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold ${textSize}`}
          title="Nivel de Confianza calculado por verificaciones, cumplimiento e historial sin reportes"
        >
          <Lock size={iconSize} className="text-amber-600" />
          <span>Confianza: <strong className="text-slate-900">{trustScore}%</strong></span>
        </span>
      )}
    </div>
  );
};
