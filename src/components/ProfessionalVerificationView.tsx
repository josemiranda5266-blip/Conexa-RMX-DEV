import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  FileCheck,
  Upload,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Award,
  Sparkles,
  ArrowRight,
  FileText,
  UserCheck,
  Check
} from 'lucide-react';

export const ProfessionalVerificationView: React.FC<{
  onOpenAuthModal?: () => void;
}> = ({ onOpenAuthModal }) => {
  const { currentUser, updateUserProfile, setActiveView } = useApp();

  const [name, setName] = useState(currentUser.name || '');
  const [cuit, setCuit] = useState(currentUser.cuit || '');
  const [matricula, setMatricula] = useState(currentUser.matricula || '');
  const [rubro, setRubro] = useState(currentUser.rubro || 'electricidad');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [zone, setZone] = useState(currentUser.zone || '');
  const [bio, setBio] = useState(currentUser.bio || '');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentUser.email) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    if (!cuit.trim()) {
      setErrorMsg('Por favor ingresá tu CUIT o CUIL.');
      return;
    }
    if (!matricula.trim()) {
      setErrorMsg('Por favor ingresá tu número de matrícula o certificación.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update in AppContext / Firestore with dual-profile activation
      await updateUserProfile({
        name: name.trim() || currentUser.name,
        cuit: cuit.trim(),
        matricula: matricula.trim(),
        rubro,
        phone: phone.trim(),
        zone: zone.trim(),
        bio: bio.trim(),
        isProfessionalVerified: true,
        isProfessional: true,
        hasProfessionalProfile: true,
        pendingVerification: true
      });

      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Hubo un inconveniente al registrar la verificación. Intentalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-zinc-950 to-blue-950 rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950 border border-blue-800 text-blue-300 text-xs font-bold">
            <Award className="w-4 h-4 text-blue-400" />
            <span>Verificación Oficial de Especialistas</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Activá tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-blue-400">Modo Profesional</span> en CONEXA
          </h1>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Mantené tu cuenta para solicitar presupuestos personales y desbloqueá el envío de presupuestos formales, cobros protegidos por custodia de Mercado Pago y la insignia de matriculado.
          </p>
        </div>
      </div>

      {isSuccess ? (
        <div className="bg-slate-900/90 border border-emerald-500/50 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl font-extrabold text-white">¡Modo Profesional Activado!</h2>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Tu perfil ha quedado registrado con la credencial <span className="font-bold text-white">{matricula}</span>. Ya podés cotizar solicitudes de clientes y recibir pagos garantizados.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => setActiveView('requests')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Ver Solicitudes para Cotizar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveView('profile')}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-200 font-semibold text-xs sm:text-sm border border-slate-700 transition-colors cursor-pointer"
            >
              <span>Configurar Mercado Pago</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form */}
          <div className="lg:col-span-8 bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <FileCheck className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-extrabold text-white">Formulario de Validación Profesional</h2>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!currentUser.email && (
              <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-800 text-amber-200 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Debés tener una cuenta para validar tu perfil profesional.</span>
                </div>
                {onOpenAuthModal && (
                  <button
                    type="button"
                    onClick={onOpenAuthModal}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs cursor-pointer shrink-0"
                  >
                    Iniciar Sesión
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Nombre Completo / Razón Social</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej: Marcelo Rossi"
                    required
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">CUIT / CUIL</label>
                  <input
                    type="text"
                    value={cuit}
                    onChange={e => setCuit(e.target.value)}
                    placeholder="20-XXXXXXXX-X"
                    required
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Rubro Principal</label>
                  <select
                    value={rubro}
                    onChange={e => setRubro(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-red-500 cursor-pointer"
                  >
                    <option value="electricidad">Electricidad e Instalaciones</option>
                    <option value="plomeria">Plomería y Destapaciones</option>
                    <option value="gas">Gasista Matriculado</option>
                    <option value="climatizacion">Climatización / Aire Acondicionado</option>
                    <option value="albanileria">Albañilería y Construcción</option>
                    <option value="pintura">Pintura e Impermeabilizaciones</option>
                    <option value="cerrajeria">Cerrajería de Urgencia</option>
                    <option value="tecnologia">Cámaras y Redes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Nº de Matrícula o Certificado</label>
                  <input
                    type="text"
                    value={matricula}
                    onChange={e => setMatricula(e.target.value)}
                    placeholder="Ej: COPITEC Mat. #84920"
                    required
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Teléfono / WhatsApp de Contacto</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+54 9 11 ..."
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Zona de Cobertura</label>
                  <input
                    type="text"
                    value={zone}
                    onChange={e => setZone(e.target.value)}
                    placeholder="Ej: CABA y Zona Norte"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Resumen de Experiencia & Especialidad</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Contale a los clientes tus años de oficio, herramientas e instrumental..."
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              {/* PDF / File Attachment Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300">
                  Adjuntar Comprobante de Matrícula o DNI (PDF / Imagen)
                </label>
                <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-zinc-950/60 rounded-2xl p-4 text-center cursor-pointer relative transition-all">
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5 text-zinc-400">
                    <Upload className="w-6 h-6 text-red-400" />
                    <span className="text-xs font-semibold text-zinc-300">
                      {fileName ? `Archivo seleccionado: ${fileName}` : 'Hacé clic o arrastrá tu comprobante (PDF o imagen)'}
                    </span>
                    <span className="text-[10px] text-zinc-400">Formatos admitidos: PDF, JPG, PNG (máx. 10MB)</span>
                  </div>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-red-600/30 border border-red-500/50 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Verificando datos...' : 'Enviar y Activar Modo Profesional'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Benefits Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-400" />
                <span>Beneficios del Profesional Verificado</span>
              </h3>

              <div className="space-y-3 text-xs text-zinc-300">
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-400 shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Cotizaciones Ilimitadas</span>
                    <span>Accedé a todas las solicitudes de tu zona y enviá presupuestos al instante.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-400 shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Cobros con Escrow</span>
                    <span>El cliente deposita los fondos antes de que arranques: cero riesgos de impago.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-400 shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Doble Perfil Activo</span>
                    <span>Podés seguir contratando otros especialistas como cliente sin cambiar de cuenta.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-slate-800 text-[11px] text-zinc-400">
              CONEXA RMX audita y valida las certificaciones emitidas por colegios y organismos oficiales de la República Argentina.
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
