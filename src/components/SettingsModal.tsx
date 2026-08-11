import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Shield, Lock, Download, Trash2, Bell, Eye, EyeOff, X, CheckCircle2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentUser } = useApp();
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentUser, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `conexa_datos_${currentUser.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setDownloaded(true);
  };

  const handleDeleteAccount = () => {
    if (confirm("¿Estás seguro de solicitar la eliminación definitiva de tu cuenta y datos privados de CONEXA? Esta acción es irreversible.")) {
      alert("Solicitud recibida. Tus datos serán dados de baja conforme a la normativa de Protección de Datos Personales.");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in overflow-y-auto text-xs">
      <div 
        id="settings-modal-container"
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full my-auto border border-slate-200 overflow-hidden space-y-4 p-6 relative max-h-[90vh] overflow-y-auto"
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Cerrar modal"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-slate-100 rounded-2xl text-slate-800">
            <Shield size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Privacidad & Configuración</h3>
            <p className="text-slate-500">Ajustes de datos personales y protección de cuenta.</p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Lock size={15} className="text-emerald-600" />
              <span>Privacidad de Datos Personales</span>
            </h4>
            <p className="text-slate-600 leading-relaxed">
              Tus datos privados (teléfono {currentUser.phonePrivate} y domicilio exacto) están encriptados y guardados de forma estrictamente confidencial.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Download size={15} className="text-blue-600" />
              <span>Descargar mis Datos (Habeas Data)</span>
            </h4>
            <p className="text-slate-600">
              Obtené una copia completa en formato JSON de la información almacenada sobre tu usuario.
            </p>
            <button
              onClick={handleExportData}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5"
            >
              <Download size={14} />
              <span>{downloaded ? '¡Datos Descargados!' : 'Descargar Archivo de Datos'}</span>
            </button>
          </div>

          <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 space-y-2">
            <h4 className="font-bold text-rose-900 flex items-center gap-1.5">
              <Trash2 size={15} className="text-rose-600" />
              <span>Eliminación de Cuenta</span>
            </h4>
            <p className="text-rose-800">
              Podés solicitar el borrado permanente de tu perfil, historial de chats y calificaciones asociadas.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5"
            >
              <Trash2 size={14} />
              <span>Eliminar mi Cuenta Definitivamente</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
