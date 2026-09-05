import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Scale,
  Shield,
  FileText,
  RotateCcw,
  UserX,
  BookOpen,
  QrCode,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  MapPin,
  Lock,
  DollarSign,
  Award,
  Send,
  HelpCircle,
  Clock,
  ChevronRight
} from 'lucide-react';
import { RevocationModal } from './RevocationModal';
import { AfipDataFiscalModal } from './AfipDataFiscalModal';
import { ComplaintTicket } from '../types';

export const LegalCenterView: React.FC = () => {
  const {
    currentUser,
    legalInitialTab,
    setLegalInitialTab,
    requestAccountDeletion,
    setActiveView
  } = useApp();

  const [activeTab, setActiveTab] = useState<string>(legalInitialTab || 'terms');
  const [isRevocationModalOpen, setIsRevocationModalOpen] = useState(false);
  const [isDataFiscalModalOpen, setIsDataFiscalModalOpen] = useState(false);

  // Deletion state
  const [deletionReason, setDeletionReason] = useState('');
  const [confirmDeletionText, setConfirmDeletionText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionSuccess, setDeletionSuccess] = useState(false);

  // Complaint book state
  const [complaintName, setComplaintName] = useState(currentUser.name || '');
  const [complaintDni, setComplaintDni] = useState('');
  const [complaintEmail, setComplaintEmail] = useState(currentUser.email || '');
  const [complaintPhone, setComplaintPhone] = useState(currentUser.phone || '');
  const [complaintCategory, setComplaintCategory] = useState<ComplaintTicket['category']>('SERVICE_QUALITY');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [complaintResolution, setComplaintResolution] = useState('');
  const [complaintSuccessTicket, setComplaintSuccessTicket] = useState<ComplaintTicket | null>(null);

  const handleComplaintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintName.trim() || !complaintEmail.trim() || !complaintDescription.trim()) {
      alert('Por favor completá todos los campos obligatorios del reclamo.');
      return;
    }

    const ticketNumber = `RECL-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const newTicket: ComplaintTicket = {
      id: `ticket-${Date.now()}`,
      ticketNumber,
      fullName: complaintName.trim(),
      dniOrCuit: complaintDni.trim() || 'N/A',
      email: complaintEmail.trim(),
      phone: complaintPhone.trim() || 'N/A',
      category: complaintCategory,
      description: complaintDescription.trim(),
      requestedResolution: complaintResolution.trim() || 'Revisión por departamento legal',
      status: 'RECEIVED',
      createdAt: new Date().toISOString()
    };

    // Save to local storage
    try {
      const existing = JSON.parse(localStorage.getItem('conexa_rmx_complaints') || '[]');
      localStorage.setItem('conexa_rmx_complaints', JSON.stringify([newTicket, ...existing]));
    } catch (err) {
      console.error(err);
    }

    setComplaintSuccessTicket(newTicket);
  };

  const handleAccountDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmDeletionText !== 'ELIMINAR MI CUENTA') {
      alert('Debés escribir exactamente "ELIMINAR MI CUENTA" para confirmar la baja.');
      return;
    }

    setIsDeleting(true);
    try {
      await requestAccountDeletion(deletionReason);
      setDeletionSuccess(true);
      setTimeout(() => {
        setActiveView('home');
      }, 3500);
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al procesar la baja. Por favor intentá nuevamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner Header */}
      <div className="bg-slate-900/90 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center shadow-lg shadow-red-600/30 shrink-0">
            <Scale className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Centro Legal & Transparencia</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-zinc-300 border border-slate-700 text-[11px] font-bold">
                Argentina
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Marco normativo de cumplimiento legal, protección al consumidor, privacidad y régimen de pagos en garantía.
            </p>
          </div>
        </div>

        {/* Quick actions: Botón de Arrepentimiento & Data Fiscal */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsRevocationModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Botón de Arrepentimiento</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDataFiscalModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-sky-950 hover:bg-sky-900 text-sky-300 font-bold text-xs border border-sky-800 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <QrCode className="w-4 h-4 text-sky-400" />
            <span>Data Fiscal AFIP</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'terms', label: 'Términos & Condiciones', icon: FileText },
          { id: 'privacy', label: 'Privacidad & Datos (Ley 25.326)', icon: Shield },
          { id: 'escrow', label: 'Garantía Escrow & MP', icon: DollarSign },
          { id: 'consumer', label: 'Defensa del Consumidor', icon: Scale },
          { id: 'complaints', label: 'Libro de Quejas Digital', icon: BookOpen },
          { id: 'revocation', label: 'Botón de Arrepentimiento', icon: RotateCcw },
          { id: 'deletion', label: 'Baja de Cuenta & Servicios', icon: UserX },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setLegalInitialTab(tab.id);
              }}
              className={`px-4 py-3 rounded-2xl font-extrabold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                isActive
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-zinc-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Términos y Condiciones Generales de Uso */}
      {activeTab === 'terms' && (
        <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl space-y-8 text-zinc-300 text-sm leading-relaxed">
          
          <div className="border-b border-slate-800 pb-6">
            <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Marco Contractual y Normativo</span>
            <h2 className="text-2xl font-black text-white mt-1">Términos y Condiciones Generales de Uso</h2>
            <p className="text-xs text-zinc-400 mt-1">Última actualización: Septiembre 2026 · Válido para la República Argentina</p>
          </div>

          {/* Section 1 */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-red-600/20 text-red-400 text-xs flex items-center justify-center font-mono">1</span>
              <span>Naturaleza Jurídica y Alcance de la Plataforma</span>
            </h3>
            <p>
              <strong>CONEXA RMX</strong> (operada por <em>CONEXA RMX SERVICIOS DIGITALES S.A.S.</em>, CUIT 30-71829340-9) es una plataforma tecnológica de intermediación digital que conecta a usuarios demandantes de servicios para el hogar, comercio e industria ("Clientes") con técnicos, artesanos y prestadores matriculados o capacitados ("Profesionales").
            </p>
            <p>
              CONEXA RMX no es una empresa constructora, instaladora ni empleadora de los Profesionales. Los contratos de locación de obra o servicios (conforme Arts. 1251 y ss. del Código Civil y Comercial de la Nación) se perfeccionan de forma directa, bilateral e independiente entre el Cliente y el Profesional seleccionado.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-red-600/20 text-red-400 text-xs flex items-center justify-center font-mono">2</span>
              <span>Sistema de Custodia de Pagos (Escrow) y Pasarelas de Pago</span>
            </h3>
            <p>
              Para brindar total seguridad a ambas partes, CONEXA RMX implementa un mecanismo de pago condicional bajo custodia (Escrow) integrado con Mercado Pago Argentina. Al aceptar un presupuesto, el Cliente deposita el monto acordado, el cual permanece inmovilizado y en custodia fiduciaria hasta que:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li>El Profesional informe la finalización del servicio y cargue las evidencias correspondientes.</li>
              <li>El Cliente confirme su plena conformidad en la plataforma.</li>
              <li>O bien transcurra el plazo de inspección técnica de 48 horas hábiles sin reclamo fundado.</li>
            </ul>
            <p>
              La plataforma cobra una comisión de servicio transparente del <strong>10% (diez por ciento)</strong> sobre el monto bruto del presupuesto aceptado en concepto de intermediación tecnológica, hosting, pasarela y garantía operativa.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-red-600/20 text-red-400 text-xs flex items-center justify-center font-mono">3</span>
              <span>Obligaciones y Responsabilidades de los Profesionales</span>
            </h3>
            <p>
              Los Profesionales adheridos declaran bajo juramento contar con la idoneidad, matrículas habilitantes (en especialidades como gasistas, electricistas y refrigeración) y herramientas adecuadas para la ejecución técnica del trabajo.
            </p>
            <p>
              El Profesional es exclusiva y directamente responsable por la calidad del trabajo, cumplimiento de normativas de seguridad (ENARGAS, IRAM, APSE, etc.), vicios redhibitorios o defectos ocultos (Arts. 1051 y ss. del CCCN), y la emisión del comprobante fiscal correspondiente al Cliente.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-red-600/20 text-red-400 text-xs flex items-center justify-center font-mono">4</span>
              <span>Procedimiento de Disputas y Mediación</span>
            </h3>
            <p>
              En caso de desacuerdo respecto a la calidad, alcance o finalización de un trabajo, cualquiera de las partes puede iniciar un proceso de mediación a través del Libro de Quejas o del soporte de CONEXA. Mientras dure el análisis técnico, los fondos permanecerán en custodia hasta el dictamen de conciliación o acuerdo mutuo.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-red-600/20 text-red-400 text-xs flex items-center justify-center font-mono">5</span>
              <span>Jurisdicción y Ley Aplicable</span>
            </h3>
            <p>
              Los presentes Términos se rigen por las leyes de la República Argentina. Cualquier divergencia que no pueda ser resuelta de común acuerdo o mediante la instancia administrativa de Defensa del Consumidor (COPREC) será sometida a la justicia ordinaria con competencia en la Ciudad Autónoma de Buenos Aires.
            </p>
          </div>

        </div>
      )}

      {/* Tab 2: Política de Privacidad & Datos Personales (Ley 25.326) */}
      {activeTab === 'privacy' && (
        <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl space-y-8 text-zinc-300 text-sm leading-relaxed">
          
          <div className="border-b border-slate-800 pb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Cumplimiento Ley N° 25.326 de Protección de los Datos Personales</span>
            </div>
            <h2 className="text-2xl font-black text-white">Política de Privacidad y Tratamiento de Datos</h2>
            <p className="text-xs text-zinc-400 mt-1">Garantía de confidencialidad, seguridad y ejercicio de derechos ARCO en Argentina</p>
          </div>

          {/* Official AAIP Mandatory Legal Clause */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-blue-950/80 border-2 border-sky-600/60 shadow-lg space-y-3">
            <div className="flex items-center gap-2 text-sky-400 font-extrabold text-sm">
              <Building className="w-5 h-5" />
              <span>Aviso Oficial de la Agencia de Acceso a la Información Pública (AAIP)</span>
            </div>
            <p className="text-xs text-zinc-200 leading-relaxed font-medium italic">
              "El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326."
            </p>
            <p className="text-xs text-zinc-300 leading-relaxed">
              <strong>"La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales."</strong>
            </p>
            <div className="text-[11px] text-sky-300 border-t border-sky-800/80 pt-2 flex flex-wrap items-center gap-4">
              <span>📍 Av. Pte. Gral. Julio A. Roca 710, Piso 3°, CABA</span>
              <span>🌐 www.argentina.gob.ar/aaip</span>
              <span>✉️ datospersonales@aaip.gob.ar</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">1. Responsable del Tratamiento de Datos</h3>
            <p>
              El responsable de las bases de datos de CONEXA RMX es <strong>CONEXA RMX SERVICIOS DIGITALES S.A.S.</strong>, con domicilio legal en Av. del Libertador 4980, CABA, República Argentina. Correo electrónico de contacto para privacidad: <span className="font-mono text-white">privacidad@conexa-rmx.com.ar</span>.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">2. Finalidad de la Recolección</h3>
            <p>Los datos recabados se utilizan exclusivamente para:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Permitir la autenticación y gestión de cuentas de Clientes y Profesionales.</li>
              <li>Geolocalizar y difundir solicitudes de servicios técnicos en la zona correspondiente.</li>
              <li>Verificar matrículas y certificados profesionales ante organismos oficiales y consejos colegiados.</li>
              <li>Procesar cobros, facturación y retenciones de fondos en custodia temporal (Escrow).</li>
              <li>Mantener el canal de mensajería y soporte técnico.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">3. Ejercicio de Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)</h3>
            <p>
              Los usuarios pueden solicitar en cualquier momento el acceso, modificación, actualización o supresión definitiva de sus datos personales enviando un correo a <span className="font-mono text-white">privacidad@conexa-rmx.com.ar</span> o haciendo uso del <strong>Botón de Baja de Cuenta</strong> habilitado en la plataforma.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">4. Medidas de Seguridad de la Información</h3>
            <p>
              Implementamos protocolos de encriptación TLS 1.3, autenticación multifactor, bases de datos aisladas con reglas de seguridad Firestore y pasarelas de pago certificadas con estándares PCI-DSS de Mercado Pago.
            </p>
          </div>

        </div>
      )}

      {/* Tab 3: Régimen de Custodia Escrow & Mercado Pago */}
      {activeTab === 'escrow' && (
        <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl space-y-8 text-zinc-300 text-sm leading-relaxed">
          
          <div className="border-b border-slate-800 pb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800 text-sky-300 text-xs font-bold mb-2">
              <DollarSign className="w-4 h-4" />
              <span>Garantía de Pago Fiduciario Seguro</span>
            </div>
            <h2 className="text-2xl font-black text-white">Régimen de Custodia Escrow & Pasarela Mercado Pago</h2>
            <p className="text-xs text-zinc-400 mt-1">Cómo protegemos tu dinero y aseguramos el cobro de los profesionales</p>
          </div>

          {/* Workflow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-950 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h4 className="font-bold text-white text-base">Depósito en Garantía</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                El cliente abona el presupuesto acordado. Los fondos no van directo al profesional ni a gastos de la empresa: quedan inmovilizados en cuenta fiduciaria en custodia.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-950 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h4 className="font-bold text-white text-base">Ejecución de la Obra</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                El profesional trabaja con la certeza absoluta de que el pago está 100% asegurado y disponible contra entrega del servicio acordado.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-950 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h4 className="font-bold text-white text-base">Liberación Inmediata</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Cuando el cliente da su conformidad en la app, los fondos se transfieren automáticamente al alias/CVU de Mercado Pago del profesional en tiempo real.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Transparencia en Comisiones y Retenciones Impositivas</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              • <strong>Comisión de plataforma:</strong> 10% deducido del monto del presupuesto del profesional.<br />
              • <strong>Comprobantes fiscales:</strong> CONEXA RMX emite Factura A o B por la comisión de intermediación. El profesional emite al cliente el comprobante de locación de obra correspondiente según su condición ante AFIP (Monotributo / Resp. Inscripto).<br />
              • <strong>Reversiones y arrepentimiento:</strong> Si el cliente ejerce su derecho de revocación dentro del plazo de 10 días corridos sin que la obra haya iniciado, el 100% del dinero es reintegrado sin penalidad.
            </p>
          </div>

        </div>
      )}

      {/* Tab 4: Defensa del Consumidor */}
      {activeTab === 'consumer' && (
        <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl space-y-8 text-zinc-300 text-sm leading-relaxed">
          
          <div className="border-b border-slate-800 pb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800 text-amber-300 text-xs font-bold mb-2">
              <Scale className="w-4 h-4" />
              <span>Ley Nacional N° 24.240 y Resoluciones Conexas</span>
            </div>
            <h2 className="text-2xl font-black text-white">Defensa de las y los Consumidores</h2>
            <p className="text-xs text-zinc-400 mt-1">Canales oficiales de reclamo, mediación previa y derechos de los usuarios</p>
          </div>

          {/* Official consumer protection links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario"
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-slate-800 hover:border-amber-500/50 transition-all flex items-start justify-between group cursor-pointer"
            >
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-amber-400 block">Ventanilla Única Federal</span>
                <h4 className="font-extrabold text-white text-base group-hover:text-amber-300">
                  Defensa del Consumidor de la Nación
                </h4>
                <p className="text-xs text-zinc-400">
                  Formulario oficial para iniciar reclamos ante la Secretaría de Comercio Interior y autoridades provinciales.
                </p>
              </div>
              <ExternalLink className="w-5 h-5 text-zinc-500 group-hover:text-amber-400 shrink-0 ml-3" />
            </a>

            <a
              href="https://www.buenosaires.gob.ar/defensaconsumidor"
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-slate-800 hover:border-sky-500/50 transition-all flex items-start justify-between group cursor-pointer"
            >
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-sky-400 block">CABA & Provincias</span>
                <h4 className="font-extrabold text-white text-base group-hover:text-sky-300">
                  Dirección General de Defensa y Protección al Consumidor
                </h4>
                <p className="text-xs text-zinc-400">
                  Asesoramiento gratuito, audiencias de conciliación y denuncias en el ámbito de la Ciudad de Buenos Aires.
                </p>
              </div>
              <ExternalLink className="w-5 h-5 text-zinc-500 group-hover:text-sky-400 shrink-0 ml-3" />
            </a>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="text-base font-bold text-white">Derechos Esenciales del Consumidor en CONEXA</h3>
            <ul className="space-y-2 text-xs text-zinc-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Información clara y veraz:</strong> Presupuestos detallados antes de comprometer cualquier pago (Art. 4° Ley 24.240).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Derecho de Arrepentimiento:</strong> Revocación voluntaria sin costo durante los primeros 10 días corridos (Art. 34 Ley 24.240 y Res. 271/2020).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Garantía de Obra y Servicios:</strong> Los trabajos técnicos cuentan con garantía legal obligatoria ante defectos de mano de obra o vicios aparentes (Art. 11 Ley 24.240).</span>
              </li>
            </ul>
          </div>

        </div>
      )}

      {/* Tab 5: Libro de Quejas y Reclamos Digital */}
      {activeTab === 'complaints' && (
        <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl space-y-6">
          
          <div className="border-b border-slate-800 pb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800 text-sky-300 text-xs font-bold mb-2">
              <BookOpen className="w-4 h-4" />
              <span>Libro de Quejas, Agradecimientos y Reclamos Digital</span>
            </div>
            <h2 className="text-2xl font-black text-white">Registro Oficial de Reclamos</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Canal formal obligatorio conforme a las regulaciones de defensa al consumidor para asentar reclamos con número correlativo.
            </p>
          </div>

          {complaintSuccessTicket ? (
            <div className="p-6 rounded-3xl bg-zinc-950 border border-emerald-500/50 space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white">Reclamo Asentado en Libro Digital</h3>
                <p className="text-xs text-zinc-300 mt-1">
                  Se ha generado su constancia de queja formal. Nuestro equipo de legales y mediación responderá en un plazo máximo de 48 horas hábiles.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-2 max-w-md mx-auto text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">N° de Ticket Correlativo:</span>
                  <span className="font-mono font-black text-amber-400 text-sm">{complaintSuccessTicket.ticketNumber}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2">
                  <span className="text-zinc-400">Titular:</span>
                  <span className="font-bold text-white">{complaintSuccessTicket.fullName}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2">
                  <span className="text-zinc-400">Email registrado:</span>
                  <span className="font-mono text-zinc-300">{complaintSuccessTicket.email}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2">
                  <span className="text-zinc-400">Estado:</span>
                  <span className="text-emerald-400 font-bold">RECIBIDO / EN REVISIÓN</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setComplaintSuccessTicket(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
              >
                Cargar otro reclamo
              </button>
            </div>
          ) : (
            <form onSubmit={handleComplaintSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    value={complaintName}
                    onChange={e => setComplaintName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">DNI / CUIT *</label>
                  <input
                    type="text"
                    value={complaintDni}
                    onChange={e => setComplaintDni(e.target.value)}
                    required
                    placeholder="Número de documento o CUIT"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Email de Contacto *</label>
                  <input
                    type="email"
                    value={complaintEmail}
                    onChange={e => setComplaintEmail(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Teléfono / Celular</label>
                  <input
                    type="text"
                    value={complaintPhone}
                    onChange={e => setComplaintPhone(e.target.value)}
                    placeholder="+54 9 11 ..."
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Motivo / Categoría del Reclamo</label>
                <select
                  value={complaintCategory}
                  onChange={e => setComplaintCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="SERVICE_QUALITY">Calidad de la prestación o trabajo técnico</option>
                  <option value="BILLING">Facturación, cobro o custodia Escrow</option>
                  <option value="PROFESSIONAL_BEHAVIOR">Conducta o cumplimiento del profesional</option>
                  <option value="PLATFORM_FUNCTIONALITY">Funcionamiento técnico de la aplicación</option>
                  <option value="OTHER">Otro motivo / Consulta legal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Descripción del Hecho o Reclamo *</label>
                <textarea
                  rows={4}
                  value={complaintDescription}
                  onChange={e => setComplaintDescription(e.target.value)}
                  required
                  placeholder="Describa con precisión lo acontecido, fechas, montos y profesionales involucrados..."
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Solución o Reparación Pretendida</label>
                <input
                  type="text"
                  value={complaintResolution}
                  onChange={e => setComplaintResolution(e.target.value)}
                  placeholder="Ej: Reintegro de fondos en custodia, reparación del trabajo, mediación técnica"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-600/30 cursor-pointer flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Asentar Reclamo en Libro Oficial</span>
                </button>
              </div>
            </form>
          )}

        </div>
      )}

      {/* Tab 6: Botón de Arrepentimiento Directo */}
      {activeTab === 'revocation' && (
        <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl space-y-6">
          
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800 text-amber-300 text-xs font-bold mb-2">
                <RotateCcw className="w-4 h-4" />
                <span>Resolución 271/2020 Secretaría de Comercio Interior</span>
              </div>
              <h2 className="text-2xl font-black text-white">Botón de Arrepentimiento</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Revocación de contrataciones y pagos en garantía dentro del plazo de 10 días corridos.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsRevocationModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap self-start"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Abrir Formulario de Arrepentimiento</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-zinc-300 leading-relaxed">
            <div className="p-5 rounded-2xl bg-zinc-950 border border-slate-800 space-y-3">
              <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>¿Cómo funciona el plazo legal?</span>
              </h4>
              <p>
                De acuerdo con el Art. 34 de la Ley 24.240 y la Res. 271/2020, el consumidor puede revocar la contratación dentro de los 10 días corridos a partir de la aceptación del presupuesto o del depósito de la garantía, sin costo alguno.
              </p>
              <p>
                Al completar el formulario, el sistema genera automáticamente un <strong>Código de Identificación de Trámite</strong> y lo envía a su casilla de correo, cancelando de inmediato la retención de fondos.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-950 border border-slate-800 space-y-3">
              <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Reintegro del dinero en Escrow</span>
              </h4>
              <p>
                Si se revoca una contratación que ya contaba con fondos retenidos en custodia temporal (Escrow), el importe total es devuelto a la cuenta de origen (Mercado Pago, tarjeta de débito/crédito o transferencia bancaria) sin deducciones.
              </p>
              <p>
                Si el profesional ya hubiera ejecutado materiales o tareas parciales de urgencia con consentimiento expreso del cliente, la reversión se limitará al saldo remanente no ejecutado.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* Tab 7: Botón de Baja de Cuenta & Servicios (Res. 316/2018) */}
      {activeTab === 'deletion' && (
        <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-10 border border-red-950/60 shadow-xl space-y-6">
          
          <div className="border-b border-slate-800 pb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 border border-red-800 text-red-300 text-xs font-bold mb-2">
              <UserX className="w-4 h-4" />
              <span>Resolución 316/2018 Secretaría de Comercio & Ley 25.326</span>
            </div>
            <h2 className="text-2xl font-black text-white">Baja de Servicios y Supresión de Cuenta</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Derecho a rescindir la cuenta de usuario y solicitar la eliminación de datos personales de forma simple y gratuita.
            </p>
          </div>

          {deletionSuccess ? (
            <div className="p-6 rounded-3xl bg-zinc-950 border border-emerald-500 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Solicitud de Baja Procesada</h3>
              <p className="text-xs text-zinc-300 max-w-md mx-auto">
                Tu cuenta ha sido dada de baja y tus datos personales han sido eliminados de acuerdo a la Ley 25.326. Redirigiendo a la pantalla principal...
              </p>
            </div>
          ) : (
            <form onSubmit={handleAccountDeletion} className="space-y-4 max-w-xl">
              <div className="p-4 rounded-2xl bg-red-950/40 border border-red-900/60 text-red-200 text-xs space-y-1.5 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Consecuencias de la baja definitiva</span>
                </div>
                <p className="text-[11px] text-zinc-300">
                  Al solicitar la baja, se cerrará tu sesión, se cancelarán las solicitudes pendientes y se desvinculará tu cuenta de Mercado Pago. Si tenés trabajos en curso o pagos en custodia pendientes de resolución, te contactaremos para finalizar la liquidación de los fondos.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Motivo de la Baja (Opcional)
                </label>
                <select
                  value={deletionReason}
                  onChange={e => setDeletionReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="Ya no requiero los servicios">Ya no requiero los servicios de la plataforma</option>
                  <option value="Privacidad y protección de datos">Ejercicio del derecho de supresión de datos (Ley 25.326)</option>
                  <option value="Mala experiencia con un profesional">Experiencia insatisfactoria</option>
                  <option value="Creación de nueva cuenta">Crearé una nueva cuenta</option>
                  <option value="Otro motivo">Otro motivo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Para confirmar, escribí <span className="font-mono text-red-400 font-black">ELIMINAR MI CUENTA</span>
                </label>
                <input
                  type="text"
                  value={confirmDeletionText}
                  onChange={e => setConfirmDeletionText(e.target.value)}
                  placeholder="ELIMINAR MI CUENTA"
                  required
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-start">
                <button
                  type="submit"
                  disabled={isDeleting || confirmDeletionText !== 'ELIMINAR MI CUENTA'}
                  className={`px-6 py-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
                    confirmDeletionText === 'ELIMINAR MI CUENTA'
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <UserX className="w-4 h-4" />
                  <span>{isDeleting ? 'Procesando baja...' : 'Confirmar Baja Definitiva de Cuenta'}</span>
                </button>
              </div>
            </form>
          )}

        </div>
      )}

      {/* Modals */}
      <RevocationModal
        isOpen={isRevocationModalOpen}
        onClose={() => setIsRevocationModalOpen(false)}
      />

      <AfipDataFiscalModal
        isOpen={isDataFiscalModalOpen}
        onClose={() => setIsDataFiscalModalOpen(false)}
      />

    </div>
  );
};
