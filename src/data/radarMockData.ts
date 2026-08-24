import { RadarOpportunity, RadarStats } from '../types';

export const initialRadarOpportunities: RadarOpportunity[] = [
  {
    id: 'RAD-101',
    source: 'Formulario Landing CONEXA (SDE)',
    sourceType: 'FORMULARIO_CONEXA',
    externalReference: 'landing_sde_elec_001',
    category: 'Electricidad',
    subcategory: 'Reparación de Tablero y Térmica',
    description: '¿Alguien conoce un electricista matriculado en Santiago del Estero? Se me saltó la térmica principal del tablero y necesito arreglarlo urgente hoy.',
    city: 'Santiago del Estero',
    province: 'Santiago del Estero',
    neighborhood: 'Centro',
    urgency: 'HIGH',
    intentScore: 95,
    confidenceScore: 98,
    status: 'QUALIFIED',
    detectedAt: 'Hace 15 minutos',
    lastUpdated: 'Hace 5 minutos',
    assignedOperator: 'Operador CONEXA - Juan',
    matchedProfessionals: [
      {
        professionalId: 'pro-1',
        name: 'Ing. Carlos Mansilla',
        professionName: 'Electricista Matriculado',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
        matchScore: 97,
        trustScore: 98,
        locationApprox: 'Santiago del Estero - Centro',
        isVerified: true,
        matchReasons: ['Matriculado oficial', 'Ubicación inmediata (<2km)', 'Respuesta en <10min']
      },
      {
        professionalId: 'pro-2',
        name: 'Marcelo "Chelo" Juárez',
        professionName: 'Plomero / Fontanero / Gasista',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
        matchScore: 82,
        trustScore: 94,
        locationApprox: 'Santiago del Estero - Zona Norte',
        isVerified: true,
        matchReasons: ['Experiencia en instalaciones integrales']
      }
    ],
    conversionStatus: 'PENDING',
    consentStatus: 'CONSENT_GRANTED',
    contactMethod: 'FORMULARIO_LANDING',
    notes: 'Prioridad alta. El usuario solicitó contacto inmediato por canal seguro.',
    aiAnalysis: {
      category: 'Electricidad',
      subcategory: 'Reparación de Tablero y Térmica',
      intent: 'HIGH',
      urgency: 'HIGH',
      intentScore: 95,
      confidenceScore: 98,
      reasoning: 'Manifestación explícita de fallo eléctrico domiciliario urgente hoy. Alta propensión a contratación inmediata.',
      recommendedResponseText: 'Hola 👋 Si aún necesitás un electricista matriculado en Santiago del Estero, podés ver profesionales verificados cercanos y contactarlos de forma privada en CONEXA.'
    },
    attribution: {
      source: 'radar_landing',
      campaign: 'electricistas_urgentes_sde',
      opportunityId: 'RAD-101'
    }
  },
  {
    id: 'RAD-102',
    source: 'Meta Graph API (Página Oficial)',
    sourceType: 'META_INTEGRATION_OFFICIAL',
    externalReference: 'meta_comment_948123',
    category: 'Plomería',
    subcategory: 'Pérdida de agua en Baño / Grifería',
    description: 'Hola gente, tengo una pérdida en la cañería del baño bajo la bacha y me está inundando. ¿Saben de algún plomero de confianza en Banda Norte?',
    city: 'Santiago del Estero',
    province: 'Santiago del Estero',
    neighborhood: 'Banda Norte / La Banda',
    urgency: 'HIGH',
    intentScore: 91,
    confidenceScore: 96,
    status: 'READY_TO_CONTACT',
    detectedAt: 'Hace 45 minutos',
    lastUpdated: 'Hace 10 minutos',
    assignedOperator: 'Operador CONEXA - María',
    matchedProfessionals: [
      {
        professionalId: 'pro-2',
        name: 'Marcelo "Chelo" Juárez',
        professionName: 'Plomero / Fontanero',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
        matchScore: 96,
        trustScore: 94,
        locationApprox: 'Santiago del Estero - Banda Norte',
        isVerified: true,
        matchReasons: ['Especialista en plomería e infiltraciones', 'Ubicación en zona', 'Reputación 4.9 ★']
      }
    ],
    conversionStatus: 'NOT_STARTED',
    consentStatus: 'PENDING_CONSENT',
    contactMethod: 'CANAL_OFICIAL',
    notes: 'Respuesta pública permitida en comentario oficial de la página.',
    aiAnalysis: {
      category: 'Plomería',
      subcategory: 'Pérdida de agua en Baño',
      intent: 'HIGH',
      urgency: 'HIGH',
      intentScore: 91,
      confidenceScore: 96,
      reasoning: 'Pérdida activa de agua con riesgo de inundación domiciliaria. Intención directa de contratación.',
      recommendedResponseText: 'Hola 👋 En CONEXA podés encontrar plomeros verificados en Banda Norte con presupuestos transparentes y contacto resguardado.'
    },
    attribution: {
      source: 'radar_meta_official',
      campaign: 'plomeria_la_banda',
      opportunityId: 'RAD-102'
    }
  },
  {
    id: 'RAD-103',
    source: 'Webhook N8n Automation System',
    sourceType: 'WEBHOOK',
    externalReference: 'webhook_n8n_event_5521',
    category: 'Gas',
    subcategory: 'Instalación & Certificación de Estufa',
    description: 'Necesito presupuesto para instalar calefactor y revisar pérdidas en la instalación de gas domiciliario.',
    city: 'Córdoba',
    province: 'Córdoba',
    neighborhood: 'Nueva Córdoba',
    urgency: 'MEDIUM',
    intentScore: 88,
    confidenceScore: 94,
    status: 'CONTACTED',
    detectedAt: 'Hace 2 horas',
    lastUpdated: 'Hace 30 minutos',
    assignedOperator: 'Operador CONEXA - Lucas',
    matchedProfessionals: [
      {
        professionalId: 'pro-5',
        name: 'Roberto "Tito" Giménez',
        professionName: 'Gasista Matriculado',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300',
        matchScore: 94,
        trustScore: 91,
        locationApprox: 'Córdoba - Nueva Córdoba',
        isVerified: true,
        matchReasons: ['Matriculado oficialmente', 'Certificaciones en regla']
      }
    ],
    conversionStatus: 'PENDING',
    consentStatus: 'CONSENT_GRANTED',
    contactMethod: 'WHATSAPP_API',
    notes: 'Respuesta enviada por WhatsApp Business API con plantilla aprobada.',
    aiAnalysis: {
      category: 'Gas',
      subcategory: 'Instalación & Certificación de Estufa',
      intent: 'HIGH',
      urgency: 'MEDIUM',
      intentScore: 88,
      confidenceScore: 94,
      reasoning: 'Búsqueda de presupuesto para instalación reglamentaria de gas. Alta exigencia de profesional matriculado.',
      recommendedResponseText: 'Hola 👋 Podés solicitar presupuestos a gasistas matriculados verificados sin comisión desde la app CONEXA.'
    },
    attribution: {
      source: 'radar_n8n',
      campaign: 'gasistas_cordoba',
      opportunityId: 'RAD-103'
    }
  },
  {
    id: 'RAD-104',
    source: 'Canal Propio Referidos CONEXA',
    sourceType: 'CANAL_PROPIO',
    externalReference: 'ref_user_3881',
    category: 'Informática',
    subcategory: 'Servicio Técnico / Reparación PC',
    description: 'Mi notebook no enciende el display y necesito recuperar unos archivos de trabajo para mañana.',
    city: 'Santiago del Estero',
    province: 'Santiago del Estero',
    neighborhood: 'Barrio Autonomía',
    urgency: 'EMERGENCY',
    intentScore: 98,
    confidenceScore: 99,
    status: 'CONVERTED',
    detectedAt: 'Hace 3 horas',
    lastUpdated: 'Hace 1 hora',
    assignedOperator: 'Operador CONEXA - Juan',
    matchedProfessionals: [
      {
        professionalId: 'pro-4',
        name: 'Gonzalo Silva',
        professionName: 'Técnico PC / Programador',
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=300',
        matchScore: 98,
        trustScore: 95,
        locationApprox: 'Santiago del Estero - Centro',
        isVerified: true,
        matchReasons: ['Especialista en hardware y recuperación de datos', 'Reputación 5.0 ★']
      }
    ],
    conversionStatus: 'CONVERTED',
    consentStatus: 'CONSENT_GRANTED',
    contactMethod: 'FORMULARIO_LANDING',
    notes: 'Usuario registrado con éxito. Solicitud de servicio creada e interactuando con Gonzalo Silva.',
    aiAnalysis: {
      category: 'Informática',
      subcategory: 'Servicio Técnico / Reparación PC',
      intent: 'HIGH',
      urgency: 'EMERGENCY',
      intentScore: 98,
      confidenceScore: 99,
      reasoning: 'Emergencia de hardware laboral con compromiso de entrega próximo. Conversión de alta prioridad.',
      recommendedResponseText: 'Hola 👋 En CONEXA contamos con técnicos informáticos con diagnóstico express e insumos garantizados.'
    },
    attribution: {
      source: 'radar_referidos',
      campaign: 'servicio_tecnico_sde',
      opportunityId: 'RAD-104'
    }
  },
  {
    id: 'RAD-105',
    source: 'Campaña Pública Redes Sociales',
    sourceType: 'CAMPAÑA_MARKETING',
    externalReference: 'mkt_fb_ads_9921',
    category: 'Cerrajería',
    subcategory: 'Apertura de Puerta / Cambio de Combinación',
    description: 'Buscando cerrajero 24 horas en Santiago del Estero. Se me quedó la llave trabada adentro.',
    city: 'Santiago del Estero',
    province: 'Santiago del Estero',
    neighborhood: 'Centro',
    urgency: 'HIGH',
    intentScore: 96,
    confidenceScore: 97,
    status: 'SERVICE_REQUESTED',
    detectedAt: 'Hace 4 horas',
    lastUpdated: 'Hace 2 horas',
    assignedOperator: 'Operador CONEXA - María',
    matchedProfessionals: [
      {
        professionalId: 'pro-1',
        name: 'Ing. Carlos Mansilla',
        professionName: 'Electricista / Cerrajero Express',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
        matchScore: 89,
        trustScore: 98,
        locationApprox: 'Santiago del Estero - Centro',
        isVerified: true,
        matchReasons: ['Disponibilidad 24hs express']
      }
    ],
    conversionStatus: 'CONVERTED',
    consentStatus: 'CONSENT_GRANTED',
    contactMethod: 'FORMULARIO_LANDING',
    notes: 'Presupuesto enviado por profesional y aceptado.',
    aiAnalysis: {
      category: 'Cerrajería',
      subcategory: 'Apertura de Puerta / Cambio de Combinación',
      intent: 'HIGH',
      urgency: 'EMERGENCY',
      intentScore: 96,
      confidenceScore: 97,
      reasoning: 'Urgencia de cerrajería en tiempo real. Máxima probabilidad de conversión.',
      recommendedResponseText: 'Hola 👋 Podés solicitar auxilio de cerrajería urgente con profesionales verificados en CONEXA.'
    },
    attribution: {
      source: 'radar_campaign',
      campaign: 'cerrajeria_24hs',
      opportunityId: 'RAD-105'
    }
  }
];

export const initialRadarStats: RadarStats = {
  totalDetected: 148,
  newOpportunities: 12,
  highIntentCount: 64,
  contactedCount: 89,
  convertedUsers: 42,
  requestsGenerated: 38,
  servicesCompleted: 29,
  conversionRate: 28.3,
  detectionRatePerDay: 18.5,
  qualificationRate: 92.4,
  contactRate: 85.2,
  responseRate: 58.0,
  registrationRate: 47.1,
  matchRate: 90.4,
  serviceRequestRate: 82.1,
  costPerAcquisitionArs: 1250,
  revenuePerSourceArs: 185000,
  byCategory: {
    'Electricidad': 42,
    'Plomería': 31,
    'Gas': 22,
    'Refrigeración': 18,
    'Informática': 14,
    'Cerrajería': 11,
    'Otros': 10
  },
  byLocation: {
    'Santiago del Estero - Centro': 58,
    'Santiago del Estero - Banda Norte': 34,
    'Santiago del Estero - Zona Sur': 22,
    'Córdoba - Nueva Córdoba': 18,
    'Tucumán - San Miguel': 16
  },
  bySource: {
    'Formulario Landing CONEXA': 52,
    'Webhook N8n Automation': 38,
    'Meta Graph API Oficial': 28,
    'Canal Propio Referidos': 18,
    'Otros Canales Permitiidos': 12
  },
  growthInsights: [
    '«Las oportunidades de Electricidad tienen una conversión 2.4 veces superior al promedio general en Santiago del Estero.»',
    '«Los contactos asistidos enviados dentro de los primeros 15 minutos incrementan la tasa de respuesta un +68%.»',
    '«Banda Norte / La Banda muestra una demanda insatisfecha creciente en Plomería e Instalación de Gas.»',
    '«El 84% de los usuarios convertidos desde CONEXA RADAR otorgan una calificación de 5 estrellas en su primer servicio.»'
  ]
};
