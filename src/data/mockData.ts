import { User, ServiceRequest, Quote, Transaction, Review, CategoryInfo, Conversation, Message } from '../types';
import { ALL_RUBROS_CATALOG, PRESET_WORK_PHOTOS } from './rubrosData';

export const INITIAL_CATEGORIES: CategoryInfo[] = ALL_RUBROS_CATALOG;

export const INITIAL_USERS: User[] = [
  {
    id: 'user-client-1',
    name: 'Carolina Benítez',
    email: 'carolina.benitez@gmail.com',
    role: 'CLIENT',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    phone: '+54 9 11 4821-9920',
    zone: 'Palermo, CABA',
    isProfessional: false,
    rating: 5.0,
    reviewCount: 4,
  },
  {
    id: 'user-pro-1',
    name: 'Ing. Marcelo Rossi',
    email: 'marcelo.rossi.electrico@conexa.com.ar',
    role: 'PROFESSIONAL',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    phone: '+54 9 11 5590-3312',
    zone: 'CABA & GBA Norte',
    isProfessional: true,
    isProfessionalVerified: true,
    matricula: 'COPITEC Mat. #84920',
    rating: 4.95,
    reviewCount: 38,
    completedJobs: 42,
    bio: 'Electricista Matriculado e Ingeniero Electromecánico con más de 12 años de trayectoria. Especialista en tableros trifásicos, certificaciones DCI/Edenor/Edesur, climatización inverter y domótica inteligente.',
    rubro: 'electricidad',
    categories: ['electricidad', 'climatizacion', 'domotica', 'energia-solar'],
    professions: [
      {
        id: 'prof-1-1',
        rubroId: 'electricidad',
        rubroName: 'Electricidad Matriculada & Redes',
        categoryGroup: 'instalaciones',
        title: 'Ingeniero Electricista & Certificaciones DCI',
        matricula: 'COPITEC Mat. #84920 / CABA',
        experienceYears: 12,
        description: 'Especialista en ingeniería eléctrica domiciliaria e industrial. Realizo armado e instalación de tableros seccionales y principales con disyuntores diferenciales tipo superinmunizados, cálculo de balance de fases trifásicas, recableados ignífugos bajo norma IRAM 2183, detección de fugas y cortocircuitos con pinza amperimétrica True-RMS y emisión de certificados DCI oficiales para Edenor y Edesur con garantía formal.',
        photos: PRESET_WORK_PHOTOS['electricidad'] || [
          'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80'
        ],
        coverageZone: 'CABA, Vicente López, San Isidro, San Fernando',
        featured: true
      },
      {
        id: 'prof-1-2',
        rubroId: 'climatizacion',
        rubroName: 'Aire Acondicionado & Climatización',
        categoryGroup: 'instalaciones',
        title: 'Técnico Instalador Matriculado en Refrigeración (CACAAV)',
        matricula: 'Matrícula CACAAV #11492',
        experienceYears: 8,
        description: 'Instalación y service integral de equipos de aire acondicionado split, multisplit e inverter con bomba de vacío de dos etapas, prueba de estanqueidad con nitrógeno a 400 PSI y pestañado con valona excéntrica. Carga de gas refrigerante R410A y R32 por balanza digital y limpieza antibacteriana por ultrasonido.',
        photos: PRESET_WORK_PHOTOS['climatizacion'] || [
          'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'
        ],
        coverageZone: 'CABA y GBA Norte'
      },
      {
        id: 'prof-1-3',
        rubroId: 'domotica',
        rubroName: 'Domótica & Automatización de Hogar',
        categoryGroup: 'mantenimiento',
        title: 'Integrador Smart Home & Control por Voz',
        experienceYears: 5,
        description: 'Automatización integral residencial con dispositivos Sonoff, Tuya y Shelly integrados a Apple HomeKit, Alexa y Google Assistant. Programación de escenas para ahorro energético, persianas automáticas, cerraduras inteligentes y control de bombas.',
        photos: PRESET_WORK_PHOTOS['cctv-seguridad'] || [
          'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&auto=format&fit=crop&q=80'
        ],
        coverageZone: 'CABA y Zona Norte'
      }
    ],
    mpConnected: true,
    mpAlias: 'marcelo.electrico.mp',
    mpCvu: '0000003100084920194832',
    mpEmail: 'marcelo.rossi.electrico@conexa.com.ar'
  },
  {
    id: 'user-pro-2',
    name: 'Gonzalo Fernández',
    email: 'gonzalo.plomeria@conexa.com.ar',
    role: 'PROFESSIONAL',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    phone: '+54 9 11 6722-1100',
    zone: 'Belgrano, Nuñez, Vicente López',
    isProfessional: true,
    isProfessionalVerified: true,
    matricula: 'Gasista Matriculado 2da Cat. #19402',
    rating: 4.88,
    reviewCount: 26,
    completedJobs: 29,
    bio: 'Gasista matriculado ante ENARGAS y plomero integral con taller móvil. Termofusión de agua y gas, bombas presurizadoras Rowa, detección de filtraciones no invasiva y refacción de baños.',
    rubro: 'plomeria',
    categories: ['plomeria', 'gas', 'calderas'],
    professions: [
      {
        id: 'prof-2-1',
        rubroId: 'gas',
        rubroName: 'Gasista Matriculado',
        categoryGroup: 'instalaciones',
        title: 'Gasista Matriculado 2da Categoría ENARGAS',
        matricula: 'Metrogas / ENARGAS Mat. #19402',
        experienceYears: 15,
        description: 'Trámites de rehabilitación de servicio de gas, inspecciones previas, plano conforme a obra (Formulario 1022 / 3.5), confección de cañerías en Sigas Thermofusión y epoxi soldada, prueba de columna de agua con manómetro y colocación de rejillas de ventilación reglamentarias.',
        photos: PRESET_WORK_PHOTOS['gas'] || [
          'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&auto=format&fit=crop&q=80'
        ],
        coverageZone: 'CABA (Belgrano, Nuñez, Colegiales, Palermo), Vicente López',
        featured: true
      },
      {
        id: 'prof-2-2',
        rubroId: 'plomeria',
        rubroName: 'Plomería & Redes Sanitarias',
        categoryGroup: 'instalaciones',
        title: 'Plomero Integral & Termofusión Sanitaria',
        experienceYears: 16,
        description: 'Renovación integral de cañerías en Saladillo / Acqua System termofusión, bajadas de tanque en polietileno tricapa, instalación de bombas presurizadoras ROWA Tango y SFL, limpieza de tanques de reserva con desinfección y destapaciones con máquina rotativa.',
        photos: PRESET_WORK_PHOTOS['plomeria'] || [
          'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&auto=format&fit=crop&q=80'
        ],
        coverageZone: 'CABA y GBA Norte'
      }
    ],
    mpConnected: true,
    mpAlias: 'gonzalo.plomeria.mp',
    mpCvu: '0000003100019402882103',
    mpEmail: 'gonzalo.plomeria@conexa.com.ar'
  },
  {
    id: 'user-admin-1',
    name: 'Auditoría & Soporte CONEXA',
    email: 'seguridad@conexa.com.ar',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    phone: '+54 9 11 800-CONEXA',
    zone: 'Central CONEXA - Argentina',
    isProfessional: false,
  }
];

export const INITIAL_REQUESTS: ServiceRequest[] = [
  {
    id: 'req-101',
    clientId: 'user-client-1',
    clientName: 'Carolina Benítez',
    clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    title: 'Recambio de disyuntor diferencial y térmicas en tablero principal',
    description: 'El disyuntor salta cuando se enciende el aire acondicionado y el horno eléctrico en simultáneo. Necesito revisar la carga de las fases, cambiar disyuntor de 25A a 40A y colocar llaves térmicas Schneider nuevas.',
    category: 'electricidad',
    zone: 'Palermo, CABA',
    address: 'Av. Coronel Díaz 2400',
    urgency: 'HIGH',
    budgetArs: 85000,
    quotesCount: 2,
    status: 'QUOTES_RECEIVED',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'req-102',
    clientId: 'user-client-1',
    clientName: 'Carolina Benítez',
    clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    title: 'Instalación de Aire Acondicionado Split 3500W Inverter',
    description: 'Instalación en 3er piso con kit de cañería de 3 metros, ménsulas de exterior y prueba de vacío con bomba de 2 etapas.',
    category: 'climatizacion',
    zone: 'Palermo, CABA',
    urgency: 'MEDIUM',
    budgetArs: 140000,
    quotesCount: 1,
    status: 'PROFESSIONAL_SELECTED',
    assignedProfessionalId: 'user-pro-1',
    assignedQuoteId: 'quote-202',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: 'req-103',
    clientId: 'user-client-1',
    clientName: 'Carolina Benítez',
    clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    title: 'Reparación de pérdida de agua en colector de baño principal',
    description: 'Goteo constante debajo del vanitory en caño de termofusión. Se requiere abrir zócalo, reparar empalme y chequear presión.',
    category: 'plomeria',
    zone: 'Palermo, CABA',
    urgency: 'EMERGENCY',
    budgetArs: 65000,
    quotesCount: 1,
    status: 'COMPLETED',
    assignedProfessionalId: 'user-pro-2',
    assignedQuoteId: 'quote-203',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  }
];

export const INITIAL_QUOTES: Quote[] = [
  {
    id: 'quote-201',
    requestId: 'req-101',
    clientId: 'user-client-1',
    professionalId: 'user-pro-1',
    professionalName: 'Ing. Marcelo Rossi',
    professionalAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    professionalRating: 4.95,
    professionalVerified: true,
    priceArs: 82000,
    description: 'Diagnóstico con pinza amperométrica, balanceo de circuitos, provisión y reemplazo de disyuntor Schneider Electric 40A 30mA y prueba integral de fuga a tierra.',
    materialsIncluded: 'Disyuntor Schneider 40A 30mA + peines de conexión ignífugos + precintos.',
    estimatedTime: '2 horas y media de trabajo in situ',
    availableStartDate: 'Mañana a partir de las 09:00 hs',
    warrantyInfo: 'Garantía escrita de mano de obra por 6 meses.',
    termsAndConditions: 'Pago protegido mediante CONEXA Escrow. Liberación tras verificación de funcionamiento.',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'quote-202',
    requestId: 'req-102',
    clientId: 'user-client-1',
    professionalId: 'user-pro-1',
    professionalName: 'Ing. Marcelo Rossi',
    professionalAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    professionalRating: 4.95,
    professionalVerified: true,
    priceArs: 135000,
    description: 'Instalación reglamentaria de split inverter con vacío de 500 micrones, sellado de pasamuros y cable interconexión normalizado IRAM.',
    materialsIncluded: 'Ménsulas reforzadas, amortiguadores de goma, cinta blanca UV, sellador de poliuretano.',
    estimatedTime: '3 a 4 horas',
    availableStartDate: 'Este sábado 10:00 hs',
    warrantyInfo: '1 año de garantía en sellado de circuito frigorífico y fijaciones.',
    status: 'ACCEPTED',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'quote-203',
    requestId: 'req-103',
    clientId: 'user-client-1',
    professionalId: 'user-pro-2',
    professionalName: 'Gonzalo Fernández',
    professionalAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    professionalRating: 4.88,
    professionalVerified: true,
    priceArs: 58000,
    description: 'Reparación de sección de cañería con cupla y niple de termofusión Saladillo H3, reemplazo de flexible mallado y prueba hidráulica.',
    materialsIncluded: 'Cuplas de termofusión Saladillo, pegamento epoxi y sellador de roscas hidrobronce.',
    estimatedTime: '1 hora 45 min',
    availableStartDate: 'Inmediato',
    warrantyInfo: '6 meses de garantía sobre sellado.',
    status: 'ACCEPTED',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-501',
    serviceRequestId: 'req-102',
    quoteId: 'quote-202',
    clientId: 'user-client-1',
    professionalId: 'user-pro-1',
    amountArs: 135000,
    platformFeeArs: 13500,
    netProfessionalArs: 121500,
    status: 'PAYMENT_HELD',
    paymentMethod: 'Mercado Pago (Tarjeta de Crédito en 3 cuotas)',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'tx-502',
    serviceRequestId: 'req-103',
    quoteId: 'quote-203',
    clientId: 'user-client-1',
    professionalId: 'user-pro-2',
    amountArs: 58000,
    platformFeeArs: 5800,
    netProfessionalArs: 52200,
    status: 'RELEASED',
    paymentMethod: 'Mercado Pago (Débito)',
    completedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  }
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-301',
    serviceRequestId: 'req-103',
    professionalId: 'user-pro-2',
    clientId: 'user-client-1',
    clientName: 'Carolina Benítez',
    clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    rating: 5,
    comment: 'Excelente trabajo de Gonzalo. Llegó puntualísimo, localizó la fuga enseguida sin romper de más y dejó todo impecable y limpio. Súper recomendable.',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  }
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    serviceRequestId: 'req-101',
    participantIds: ['user-client-1', 'user-pro-1'],
    lastMessage: 'Hola! Te envío un presupuesto formal para tu solicitud "Recambio de disyuntor diferencial y térmicas en tablero principal".',
    lastMessageAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    unreadCount: 0,
  }
];

export const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-client-1',
    senderName: 'Carolina Benítez',
    text: 'Hola Marcelo, ¿tenés disponibilidad para pasar mañana a primera hora?',
    type: 'TEXT',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    senderId: 'user-pro-1',
    senderName: 'Ing. Marcelo Rossi',
    text: 'Hola Carolina! Sí, tengo el espacio de 09:00 a 11:30 hs. Ya revisé los datos y te envié la cotización detallada.',
    type: 'TEXT',
    createdAt: new Date(Date.now() - 3600000 * 4.5).toISOString(),
  },
  {
    id: 'msg-3',
    conversationId: 'conv-1',
    senderId: 'user-pro-1',
    senderName: 'Ing. Marcelo Rossi',
    text: 'Hola! Te envío un presupuesto formal para tu solicitud "Recambio de disyuntor diferencial y térmicas en tablero principal".',
    type: 'QUOTE_PROPOSAL',
    quoteData: INITIAL_QUOTES[0],
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  }
];
