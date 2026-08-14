import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Award, Upload, CheckCircle2, X } from 'lucide-react';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentUser, submitVerification } = useApp();
  const [activeType, setActiveType] = useState<'IDENTITY' | 'PROFESSIONAL'>('IDENTITY');
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSimulatedUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName) return;

    setIsUploading(true);
    setTimeout(() => {
      submitVerification(
        activeType,
        fileName,
        'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=400'
      );
      setIsUploading(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in overflow-y-auto text-xs">
      <div 
        id="verification-modal-container"
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full my-auto border border-slate-200 overflow-hidden space-y-4 p-6 relative max-h-[90vh] overflow-y-auto"
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Cerrar modal"
        >
          <X size={18} />
        </button>

        <div>
          <span className="font-bold text-blue-600 uppercase tracking-wider text-[10px] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            Insignias de Confianza
          </span>
          <h3 className="font-bold text-slate-900 text-lg mt-1">Verificación de Cuenta</h3>
          <p className="text-slate-500">Obtené las insignias oficiales para mayor reputación y confianza.</p>
        </div>

        {submitted ? (
          <div className="p-6 text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-200">
            <CheckCircle2 size={48} className="text-emerald-600 mx-auto" />
            <h4 className="font-bold text-emerald-900 text-sm">¡Documentación Enviada!</h4>
            <p className="text-emerald-800 leading-relaxed">
              El equipo de administración de CONEXA revisará tu documentación en las próximas 24 horas hábiles.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl"
            >
              Entendido
            </button>
          </div>
        ) : (
          <>
            {/* Type Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl font-bold">
              <button
                type="button"
                onClick={() => setActiveType('IDENTITY')}
                className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeType === 'IDENTITY' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                <ShieldCheck size={16} />
                <span>🟢 Identidad</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveType('PROFESSIONAL')}
                className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeType === 'PROFESSIONAL' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                <Award size={16} />
                <span>🔵 Profesional</span>
              </button>
            </div>

            <form onSubmit={handleSimulatedUpload} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-slate-700 space-y-1">
                {activeType === 'IDENTITY' ? (
                  <>
                    <h4 className="font-bold text-slate-900">Verificación de Identidad (🟢)</h4>
                    <p>Adjuntá una foto clara de tu DNI o Documento Nacional de Identidad (Frente y Dorso).</p>
                  </>
                ) : (
                  <>
                    <h4 className="font-bold text-slate-900">Verificación Profesional (🔵)</h4>
                    <p>Adjuntá tu carnet de matrícula, título habilitante, registro municipal o certificado comercial.</p>
                  </>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Nombre o número del documento / matrícula *</label>
                <input
                  type="text"
                  required
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder={activeType === 'IDENTITY' ? 'Ej: DNI N° 38.123.456 - Frente' : 'Ej: Matrícula COPIT SdE N° 4412'}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-medium text-slate-900"
                />
              </div>

              <div className="p-4 border-2 border-dashed border-slate-300 rounded-2xl text-center space-y-2 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <Upload size={24} className="mx-auto text-slate-400" />
                <p className="font-bold text-slate-700">Arrastrá tu archivo o haz clic para adjuntar</p>
                <p className="text-[10px] text-slate-400">PDF, JPG o PNG de hasta 10MB</p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !fileName}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 transition-all"
                >
                  {isUploading ? 'Subiendo...' : 'Enviar a Revisión'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
