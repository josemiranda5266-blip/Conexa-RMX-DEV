import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Link as LinkIcon,
  Check,
  AlertCircle,
  Briefcase,
  Award,
  Clock,
  MapPin,
  FileText,
  Search
} from 'lucide-react';
import { ProfessionalSpecialty, CategoryInfo } from '../types';
import { ALL_RUBROS_CATALOG, PRESET_WORK_PHOTOS, DEFAULT_WORK_PHOTOS } from '../data/rubrosData';
import { PhotoCarousel } from './PhotoCarousel';
import { RubroSelectorModal } from './RubroSelectorModal';
import { RubroIcon } from './RubroIcon';

interface ProfessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profession: ProfessionalSpecialty) => void;
  initialProfession?: ProfessionalSpecialty | null;
  alreadyAddedRubroIds?: string[];
}

export const ProfessionModal: React.FC<ProfessionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProfession,
  alreadyAddedRubroIds = []
}) => {
  const [selectedRubro, setSelectedRubro] = useState<CategoryInfo>(() => {
    if (initialProfession?.rubroId) {
      const found = ALL_RUBROS_CATALOG.find(r => r.id === initialProfession.rubroId);
      if (found) return found;
    }
    return ALL_RUBROS_CATALOG[0];
  });

  const [isRubroSearchOpen, setIsRubroSearchOpen] = useState(false);
  const [title, setTitle] = useState(initialProfession?.title || '');
  const [matricula, setMatricula] = useState(initialProfession?.matricula || '');
  const [experienceYears, setExperienceYears] = useState<string>(
    initialProfession?.experienceYears ? String(initialProfession.experienceYears) : '5'
  );
  const [coverageZone, setCoverageZone] = useState(initialProfession?.coverageZone || '');
  const [description, setDescription] = useState(initialProfession?.description || '');
  const [photos, setPhotos] = useState<string[]>(initialProfession?.photos || []);
  
  // Custom Photo URL Input State
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Sync when initialProfession changes
  useEffect(() => {
    if (initialProfession) {
      const found = ALL_RUBROS_CATALOG.find(r => r.id === initialProfession.rubroId);
      if (found) setSelectedRubro(found);
      setTitle(initialProfession.title || '');
      setMatricula(initialProfession.matricula || '');
      setExperienceYears(initialProfession.experienceYears ? String(initialProfession.experienceYears) : '5');
      setCoverageZone(initialProfession.coverageZone || '');
      setDescription(initialProfession.description || '');
      setPhotos(initialProfession.photos || []);
    } else {
      setSelectedRubro(ALL_RUBROS_CATALOG[0]);
      setTitle('');
      setMatricula('');
      setExperienceYears('5');
      setCoverageZone('');
      setDescription('');
      setPhotos([]);
    }
    setErrorMsg('');
  }, [initialProfession, isOpen]);

  if (!isOpen) return null;

  const handleSelectRubro = (rubro: CategoryInfo) => {
    setSelectedRubro(rubro);
    if (!title.trim() || title === selectedRubro.name) {
      setTitle(`${rubro.name}`);
    }
    // If photos are empty, suggest default preset
    if (photos.length === 0 && PRESET_WORK_PHOTOS[rubro.id]) {
      setPhotos(PRESET_WORK_PHOTOS[rubro.id]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploadingPhoto(true);
      const filesArray = Array.from(e.target.files);
      
      filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result && typeof reader.result === 'string') {
            setPhotos(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });

      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleAddPhotoUrl = () => {
    if (!photoUrlInput.trim()) return;
    try {
      new URL(photoUrlInput.trim());
      setPhotos(prev => [...prev, photoUrlInput.trim()]);
      setPhotoUrlInput('');
    } catch {
      setErrorMsg('Ingresá una URL de imagen válida (ej: https://...).');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleApplyPresetPhotos = () => {
    const presets = PRESET_WORK_PHOTOS[selectedRubro.id] || DEFAULT_WORK_PHOTOS;
    setPhotos(presets);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Por favor ingresá el título o denominación de la especialidad.');
      return;
    }

    if (description.trim().length < 30) {
      setErrorMsg('La descripción debe ser extensa y detallada (al menos 30 caracteres) para que los clientes conozcan tu experiencia y forma de trabajo.');
      return;
    }

    const savedProfession: ProfessionalSpecialty = {
      id: initialProfession?.id || `prof-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      rubroId: selectedRubro.id,
      rubroName: selectedRubro.name,
      categoryGroup: selectedRubro.categoryGroup,
      title: title.trim(),
      matricula: matricula.trim() || undefined,
      experienceYears: experienceYears ? parseInt(experienceYears, 10) : undefined,
      coverageZone: coverageZone.trim() || undefined,
      description: description.trim(),
      photos: photos.filter(p => Boolean(p)),
      createdAt: initialProfession?.createdAt || new Date().toISOString()
    };

    onSave(savedProfession);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative my-8 max-h-[92vh] flex flex-col">
          
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800 shrink-0">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-800/60 text-red-300 text-[11px] font-bold">
                <Briefcase className="w-3.5 h-3.5" />
                <span>{initialProfession ? 'Editar Profesión' : 'Agregar Nueva Profesión / Especialidad'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {initialProfession ? `Modificar ${initialProfession.title}` : 'Registrar Rubro & Portafolio'}
              </h2>
              <p className="text-xs text-zinc-400">
                Podés tener múltiples profesiones activas con descripción extensa y carrusel de trabajos realizados para cada una.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Scrollable Body */}
          <form id="profession-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-6">
            
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Rubro Selector Card */}
            <div className="p-4 rounded-2xl bg-zinc-950/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rubro Profesional Oficial</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsRubroSearchOpen(true)}
                  className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Buscar en catálogo ({ALL_RUBROS_CATALOG.length} rubros)</span>
                </button>
              </div>

              <div
                onClick={() => setIsRubroSearchOpen(true)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-red-500/50 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-slate-800 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform">
                    <RubroIcon iconName={selectedRubro.iconName} className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                      {selectedRubro.name}
                    </h4>
                    <p className="text-[11px] text-zinc-400 line-clamp-1">{selectedRubro.description}</p>
                  </div>
                </div>

                <span className="px-3 py-1.5 rounded-lg bg-slate-800 group-hover:bg-red-600 text-zinc-300 group-hover:text-white text-xs font-bold transition-all">
                  Cambiar Rubro
                </span>
              </div>
            </div>

            {/* Specialty Title & Matricula */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Título / Denominación de la Especialidad <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Instalador de Aire Acondicionado Inverter"
                  required
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-blue-400" />
                  <span>Nº de Matrícula o Certificación (Opcional)</span>
                </label>
                <input
                  type="text"
                  value={matricula}
                  onChange={e => setMatricula(e.target.value)}
                  placeholder="Ej: Mat. CACAAV #11492 / COPITEC #84920"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Experience & Zone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Años de Experiencia en este Rubro</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={experienceYears}
                  onChange={e => setExperienceYears(e.target.value)}
                  placeholder="5"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zona de Cobertura Específica</span>
                </label>
                <input
                  type="text"
                  value={coverageZone}
                  onChange={e => setCoverageZone(e.target.value)}
                  placeholder="Ej: CABA y Zona Norte (Vicente López, San Isidro)"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Extensive Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-zinc-300 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-red-400" />
                  <span>Descripción Extensa & Alcance del Servicio <span className="text-red-400">*</span></span>
                </label>
                <span className="text-[11px] text-zinc-500">
                  {description.length} caracteres
                </span>
              </div>

              <textarea
                rows={5}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Detallá exhaustivamente tu experiencia en este rubro: herramientas profesionales que utilizás, marcas de materiales recomendados, normas y certificaciones IRAM/ISO, tipos de proyectos que abordás, protocolo de garantía de satisfacción y tiempos típicos de ejecución..."
                required
                className="w-full px-3.5 py-3 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 resize-y leading-relaxed"
              />

              <div className="flex flex-wrap gap-2 text-[10px] text-zinc-400 pt-1">
                <span className="font-semibold text-zinc-300">Sugerencias para incluir:</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">Herramientas de precisión</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">Materiales homologados</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">Garantía post-trabajo</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">Atención a consorcios / particulares</span>
              </div>
            </div>

            {/* Photos & Carousel Section */}
            <div className="p-4 rounded-2xl bg-zinc-950/90 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-red-500" />
                    <span>Carrusel de Fotos de Trabajos Realizados ({photos.length})</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Los clientes prefieren perfiles con fotos reales de trabajos finalizados y tableros/instalaciones prolijas.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyPresetPhotos}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-300 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Usar Fotos de Ejemplo
                  </button>
                </div>
              </div>

              {/* Live Interactive Carousel Preview */}
              {photos.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                    Previsualización del Carrusel en tu Perfil:
                  </span>
                  <PhotoCarousel
                    photos={photos}
                    title={title || selectedRubro.name}
                    editable={true}
                    onRemovePhoto={handleRemovePhoto}
                    aspectRatio="wide"
                  />
                </div>
              )}

              {/* Photo Upload Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* File Upload */}
                <label className="p-3.5 rounded-xl bg-slate-900 border border-dashed border-slate-700 hover:border-red-500/60 transition-all cursor-pointer flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-slate-800 flex items-center justify-center text-zinc-400 group-hover:text-red-400 shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-red-400 transition-colors">
                      Subir fotos desde tu dispositivo
                    </div>
                    <div className="text-[10px] text-zinc-500">JPG, PNG o WEBP</div>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* URL Upload */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                  <input
                    type="url"
                    value={photoUrlInput}
                    onChange={e => setPhotoUrlInput(e.target.value)}
                    placeholder="Pegar link de foto (https://...)"
                    className="flex-1 px-3 py-1.5 bg-zinc-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddPhotoUrl}
                    className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shrink-0 cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar</span>
                  </button>
                </div>
              </div>

            </div>

          </form>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              form="profession-form"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-600/30 border border-red-500/40 transition-all cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{initialProfession ? 'Guardar Cambios' : 'Registrar Profesión'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Rubro Search Modal */}
      <RubroSelectorModal
        isOpen={isRubroSearchOpen}
        onClose={() => setIsRubroSearchOpen(false)}
        onSelectRubro={handleSelectRubro}
        selectedRubroId={selectedRubro.id}
        alreadyAddedRubroIds={alreadyAddedRubroIds}
      />
    </>
  );
};
