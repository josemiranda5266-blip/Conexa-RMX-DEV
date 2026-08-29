import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Shield, Lock, Download, Trash2, Bell, Eye, EyeOff, X, CheckCircle2, CreditCard, AlertCircle, LogIn } from 'lucide-react';
import { auth } from '../lib/firebase';
import { isProfessionalCapable } from '../domain/professionalMatching';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentUser, deleteAccount, connectMercadoPago, getMercadoPagoStatus, authLoading, authSessionReady, openAuthPortal } = useApp();
  const [downloaded, setDownloaded] = useState(false);
  const [mpStatus, setMpStatus] = useState<{ connected: boolean; mpUserId?: string | null; loading?: boolean; unauthenticated?: boolean } | null>(null);
  const [loadingMp, setLoadingMp] = useState(false);
  const [mpError, setMpError] = useState<string | null>(null);

  const isPro = currentUser ? isProfessionalCapable(currentUser) : false;

  useEffect(() => {
    if (isOpen && currentUser && isPro && authSessionReady) {
      setLoadingMp(true);
      getMercadoPagoStatus()
        .then(res => setMpStatus(res))
        .catch(err => console.warn('Error al verificar estado de Mercado Pago:', err))
        .finally(() => setLoadingMp(false));
    }
  }, [isOpen, currentUser, authLoading, authSessionReady, isPro]);

  if (!isOpen || !currentUser) return null;

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

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    if (confirm("¿Estás seguro de solicitar la eliminación definitiva de tu cuenta y datos privados de CONEXA? Esta acción es irreversible.")) {
      const success = await deleteAccount(currentUser.id);
      if (success) {
        alert("Tu cuenta y datos asociados han sido eliminados de manera definitiva conforme a la normativa vigente.");
        onClose();
      }
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
          {isPro && (
            <div className="p-3.5 bg-sky-50 rounded-2xl border border-sky-200 space-y-2">
              <h4 className="font-bold text-sky-900 flex items-center gap-1.5">
                <CreditCard size={15} className="text-sky-600" />
                <span>Cobros con Mercado Pago Marketplace</span>
              </h4>
              <p className="text-sky-800 leading-relaxed">
                {mpStatus?.connected 
                  ? 'Tu cuenta de Mercado Pago está vinculada y lista para recibir cobros directamente.' 
                  : 'Vinculá tu cuenta para recibir pagos directos de clientes al aceptar presupuestos.'}
              </p>
              {mpError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2 animate-fade-in">
                  <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-rose-900">Error al vincular Mercado Pago</p>
                    <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">{mpError}</p>
                  </div>
                  <button 
                    onClick={() => setMpError(null)} 
                    className="text-rose-400 hover:text-rose-600 font-bold text-xs"
                    aria-label="Cerrar mensaje de error"
                  >
                    ✕
                  </button>
                </div>
              )}

              {authLoading || loadingMp ? (
                <p className="text-slate-500 text-[11px] animate-pulse">Verificando sesión de autenticación...</p>
              ) : (currentUser && (!auth?.currentUser || !authSessionReady)) ? (
                <p className="text-slate-500 text-[11px] animate-pulse">Sincronizando sesión...</p>
              ) : (!auth?.currentUser || !authSessionReady) ? (
                <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                  <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="font-bold text-xs">Sesión de Firebase Auth requerida</p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Para vincular Mercado Pago primero debés iniciar sesión.
                    </p>
                    <button
                      onClick={() => {
                        onClose();
                        openAuthPortal();
                      }}
                      className="mt-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <LogIn size={13} />
                      <span>Iniciar sesión</span>
                    </button>
                  </div>
                </div>
              ) : (mpStatus && (mpStatus as any).errorCode) ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2">
                  <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="font-bold text-rose-950 text-xs">Error de Diagnóstico del Servidor</p>
                    <p className="text-[11px] text-rose-850 leading-relaxed">
                      {(mpStatus as any).errorCode === 'INVALID_FIREBASE_ID_TOKEN' ? (
                        'Tu sesión está activa, pero el servidor no pudo validar la credencial de Firebase.'
                      ) : (mpStatus as any).errorCode === 'FIREBASE_ADMIN_NOT_CONFIGURED' ? (
                        'El backend de Firebase Admin no está configurado en el servidor o el proyecto no coincide.'
                      ) : (mpStatus as any).errorCode === 'FIREBASE_FIRESTORE_ERROR' ? (
                        'El servicio de base de datos Firestore del backend no está disponible o devolvió un error de permisos.'
                      ) : (mpStatus as any).errorCode === 'MERCADO_PAGO_NOT_CONFIGURED' ? (
                        'Mercado Pago no está correctamente configurado en el servidor.'
                      ) : (
                        `Error reportado: ${(mpStatus as any).error || (mpStatus as any).errorCode}`
                      )}
                    </p>
                    <p className="text-[9px] font-mono text-rose-500 mt-1">
                      Código: {(mpStatus as any).errorCode} {(mpStatus as any).detail ? `| ${(mpStatus as any).detail}` : ''}
                    </p>
                  </div>
                </div>
              ) : mpStatus?.connected ? (
                <div className="flex items-center gap-2 text-emerald-700 font-bold bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <CheckCircle2 size={15} />
                  <span>Cuenta Vinculada {mpStatus.mpUserId ? `(ID: ${mpStatus.mpUserId})` : ''}</span>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    setMpError(null);
                    try {
                      await connectMercadoPago();
                    } catch (err: any) {
                      setMpError(err?.message || 'No se pudo iniciar la conexión con Mercado Pago.');
                    }
                  }}
                  className="w-full py-2 bg-sky-600 hover:bg-sky-700 active:scale-98 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <CreditCard size={14} />
                  <span>Vincular Cuenta de Mercado Pago</span>
                </button>
              )}
            </div>
          )}

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
