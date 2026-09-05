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
  Check,
  Plus,
  Layers,
  Search
} from 'lucide-react';
import { ProfessionalSpecialty } from '../types';
import { ProfessionCard } from './ProfessionCard';
import { ProfessionModal } from './ProfessionModal';
import { RubroSelectorModal } from './RubroSelectorModal';
import { RubroIcon } from './RubroIcon';
import { ALL_RUBROS_CATALOG, getRubroById, PRESET_WORK_PHOTOS } from '../data/rubrosData';

export const ProfessionalVerificationView: React.FC<{
  onOpenAuthModal?: () => void;
}> = ({ onOpenAuthModal }) => {
  const { currentUser, updateUserProfile, setActiveView } = useApp();

  const [name, setName] = useState(currentUser.name || '');
  const [cuit, setCuit] = useState(currentUser.cuit || '');
  const [matricula, setMatricula] = useState(currentUser.matricula || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [zone, setZone] = useState(currentUser.zone || '');
  const [bio, setBio] = useState(currentUser.bio || '');

  // Multi-professions state
  const [professions, setProfessions] = useState<ProfessionalSpecialty[]>(() => {
    if (currentUser.professions && currentUser.professions.length > 0) {
      return currentUser.professions;
    }
    // Default initial template based on user's rubro or electricity
    const initialRubroId = currentUser.rubro || 'electricidad';
    const rubroInfo = getRubroById(initialRubroId) || ALL_RUBROS_CATALOG[0];
    return [
      {
        id: `prof-${Date.now()}`,
        rubroId: rubroInfo.id,
        rubroName: rubroInfo.name,
        categoryGroup: rubroInfo.categoryGroup,
        title: `${rubroInfo.name} Certificado`,
        matricula: currentUser.matricula || '',
        description: 'Especialista con equipamiento profesional, herramientas de medición certificadas y garantía de mano de obra en cada intervención.',
        photos: PRESET_WORK_PHOTOS[rubroInfo.id] || [],
        experienceYears: 5,
        rating: 5.0,
        reviewCount: 0
      }
    ];
  });

  const [isProfessionModalOpen, setIsProfessionModalOpen] = useState(false);
  const [editingProfession, setEditingProfession] = useState<ProfessionalSpecialty | null>(null);

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

  const handleOpenAddProfession = () => {
    setEditingProfession(null);
    setIsProfessionModalOpen(true);
  };

  const handleOpenEditProfession = (prof: ProfessionalSpecialty) => {
    setEditingProfession(prof);
    setIsProfessionModalOpen(true);
  };

  const handleSaveProfession = (savedProf: ProfessionalSpecialty) => {
    const exists = professions.some(p => p.id === savedProf.id);
    if (exists) {
      setProfessions(professions.map(p => (p.id === savedProf.id ? savedProf : p)));
    } else {
      setProfessions([...professions, savedProf]);
    }
  };

  const handleDeleteProfession = (profId: string) => {
    if (professions.length <= 1) {
      alert('Debés registrar al menos una profesión o especialidad.');
      return;
    }
    setProfessions(professions.filter(p => p.id !== profId));
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
      setErrorMsg('Por favor ingresá tu número de matrícula o certificación principal.');
      return;
    }
    if (professions.length === 0) {
      setErrorMsg('Debés registrar al menos un rubro profesional con sus fotos de trabajos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const uniqueCategories = Array.from(new Set(professions.map(p => p.rubroId)));
      const primaryRubro = professions[0]?.rubroId || 'electricidad';

      // Update in AppContext / Firestore with dual-profile activation and multi-professions
      await updateUserProfile({
        name: name.trim() || currentUser.name,
        cuit: cuit.trim(),
        matricula: matricula.trim(),
        rubro: primaryRubro,
        categories: uniqueCategories,
        professions: professions,
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
            <span>Verificación Oficial & Catálogo Extendido de Profesiones</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Activá tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-blue-400">Modo Multi-Profesional</span> en CONEXA
          </h1>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Podés registrar múltiples rubros y oficios en una sola cuenta, enriquecer cada uno con descripciones completas, años de trayectoria y carruseles fotográficos de tus trabajos realizados.
          </p>
        </div>
      </div>

      {isSuccess ? (
        <div className="bg-slate-900/90 border border-emerald-500/50 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl font-extrabold text-white">¡Modo Multi-Profesional Activado!</h2>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Registraste con éxito <span className="font-bold text-white">{professions.length} {professions.length === 1 ? 'profesión' : 'profesiones'}</span> con fotos y matrícula <span className="font-bold text-white">{matricula}</span>. Ya podés cotizar solicitudes de clientes y recibir pagos garantizados.
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
              <span>Ver Mi Perfil y Portafolios</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form */}
          <div className="lg:col-span-8 bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <FileCheck className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-extrabold text-white">Formulario de Validación y Alta de Rubros</h2>
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

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Personal Legal Credentials */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">1. Datos Fiscales & Identidad</h3>
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
                    <label className="block text-xs font-bold text-zinc-300 mb-1">Nº de Matrícula o Certificado Principal</label>
                    <input
                      type="text"
                      value={matricula}
                      onChange={e => setMatricula(e.target.value)}
                      placeholder="Ej: COPITEC Mat. #84920"
                      required
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

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
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Zona de Cobertura</label>
                  <input
                    type="text"
                    value={zone}
                    onChange={e => setZone(e.target.value)}
                    placeholder="Ej: CABA y GBA Norte"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Professions & Photos Section */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4" />
                      <span>2. Profesiones, Rubros & Fotos de Trabajos</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Podés agregar más de una profesión con carruseles de fotos individuales para cada oficio.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddProfession}
                    className="px-3.5 py-2 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-bold text-xs border border-red-500/40 transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Otra Profesión</span>
                  </button>
                </div>

                {/* Profession Cards List */}
                <div className="space-y-4">
                  {professions.map(prof => (
                    <ProfessionCard
                      key={prof.id}
                      profession={prof}
                      isOwner={true}
                      onEdit={handleOpenEditProfession}
                      onDelete={handleDeleteProfession}
                    />
                  ))}
                </div>
              </div>

              {/* General Bio */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">3. Presentación General</h3>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Acerca de vos / Resumen general</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Contale a los clientes tus años en el rubro, herramientas, garantías y valores de trabajo..."
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>
              </div>

              {/* PDF / File Attachment Input */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-xs font-bold text-zinc-300">
                  4. Adjuntar Comprobante de Matrícula o DNI (PDF / Imagen)
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
                  <span>{isSubmitting ? 'Verificando datos...' : 'Guardar y Activar Modo Multi-Profesional'}</span>
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
                    <span className="font-bold text-white block">Multi-Rubro Flexible</span>
                    <span>Mostrá todas tus especialidades (ej: Gasista, Plomero, Electricista) con portafolios separados.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-400 shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Carruseles de Trabajos Reales</span>
                    <span>Generá confianza inmediata subiendo fotos de tus mejores instalaciones y obras.</span>
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

      {/* Profession Modal for Add / Edit */}
      <ProfessionModal
        isOpen={isProfessionModalOpen}
        onClose={() => {
          setIsProfessionModalOpen(false);
          setEditingProfession(null);
        }}
        onSave={handleSaveProfession}
        initialProfession={editingProfession}
        alreadyAddedRubroIds={professions.map(p => p.rubroId).filter(id => id !== editingProfession?.rubroId)}
      />

    </div>
  );
};

