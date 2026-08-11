import { Category, Profession, UserProfile, Review, ServiceRequest, Quote, Conversation, Message } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-hogar', name: 'Hogar & Construcción', iconName: 'Home', description: 'Electricistas, plomeros, albañiles, pintores y gasistas.' },
  { id: 'cat-profesionales', name: 'Profesionales & Graduados', iconName: 'Briefcase', description: 'Abogados, contadores, ingenieros, arquitectos y consultores.' },
  { id: 'cat-tech', name: 'Tecnología & Digital', iconName: 'Cpu', description: 'Técnicos de PC, programadores, diseño y community managers.' },
  { id: 'cat-salud', name: 'Salud & Estética', iconName: 'HeartHandshake', description: 'Peluqueros, barberos, enfermeros e higiene y seguridad.' },
  { id: 'cat-mecanica', name: 'Mecánica & Vehículos', iconName: 'Wrench', description: 'Mecánicos, electricistas del automóvil y cerrajeros.' },
  { id: 'cat-eventos', name: 'Servicios & Eventos', iconName: 'Camera', description: 'Fotógrafos, limpieza, jardinería, carpinteros y profesores.' }
];

export const INITIAL_PROFESSIONS: Profession[] = [
  { id: 'prof-electricista', categoryId: 'cat-hogar', name: 'Electricista', popularSpecialties: ['Tableros trifásicos', 'Instalación de luminarias', 'Reparación de cortocircuitos', 'Certificados de aptitud'] },
  { id: 'prof-plomero', categoryId: 'cat-hogar', name: 'Plomero / Fontanero', popularSpecialties: ['Reparación de pérdidas', 'Destape de cañerías', 'Instalación de bombas', 'Termofusión'] },
  { id: 'prof-gasista', categoryId: 'cat-hogar', name: 'Gasista Matriculado', popularSpecialties: ['Instalación de termotanques', 'Prueba de hermeticidad', 'Planos de gas', 'Calefactores'] },
  { id: 'prof-albanil', categoryId: 'cat-hogar', name: 'Albañil / Constructor', popularSpecialties: ['Remodelaciones', 'Colocación de cerámicos', 'Revoques', 'Contrapisos'] },
  { id: 'prof-pintor', categoryId: 'cat-hogar', name: 'Pintor de Obra', popularSpecialties: ['Pintura látex e impermeabilizado', 'Pintura en altura', 'Tratamiento de humedad', 'Enduido y lijado'] },
  { id: 'prof-cerrajero', categoryId: 'cat-hogar', name: 'Cerrajero 24hs', popularSpecialties: ['Apertura de puertas', 'Cambio de combinación', 'Cerrajería del automotor', 'Cerraduras digitales'] },
  { id: 'prof-mecanico', categoryId: 'cat-mecanica', name: 'Mecánico Automotriz', popularSpecialties: ['Diagnóstico computarizado', 'Frenos y suspensión', 'Mantenimiento preventivo', 'Inyección electrónica'] },
  { id: 'prof-abogado', categoryId: 'cat-profesionales', name: 'Abogado', popularSpecialties: ['Derecho Civil & Comercial', 'Derecho Laboral', 'Familia y Sucesiones', 'Contratos'] },
  { id: 'prof-contador', categoryId: 'cat-profesionales', name: 'Contador Público', popularSpecialties: ['Inscripción Monotributo / Ganancias', 'Auditoría', 'Liquidación de sueldos', 'Balances'] },
  { id: 'prof-ingeniero-seguridad', categoryId: 'cat-profesionales', name: 'Higienista y Seg. Laboral', popularSpecialties: ['Planes de evacuación', 'Habilitaciones municipales', 'Medición de puesta a tierra', 'Capacitaciones'] },
  { id: 'prof-arquitecto', categoryId: 'cat-profesionales', name: 'Arquitecto', popularSpecialties: ['Diseño de planos 3D', 'Dirección de obra', 'Cálculo de estructuras', 'Remodelaciones'] },
  { id: 'prof-tecnico-pc', categoryId: 'cat-tech', name: 'Técnico de Computación', popularSpecialties: ['Mantenimiento y limpieza de PC', 'Formateo e instalación', 'Reparación de Notebooks', 'Redes Wi-Fi'] },
  { id: 'prof-programador', categoryId: 'cat-tech', name: 'Programador / Web Dev', popularSpecialties: ['Sitios web corporativos', 'E-commerce', 'Sistemas a medida', 'Apps móviles'] },
  { id: 'prof-jardinero', categoryId: 'cat-eventos', name: 'Jardinero', popularSpecialties: ['Corte de césped', 'Poda en altura', 'Diseño de paisajismo', 'Sistemas de riego'] },
  { id: 'prof-limpieza', categoryId: 'cat-eventos', name: 'Servicio de Limpieza', popularSpecialties: ['Limpieza posobra', 'Oficinas y comercios', 'Alfombras y tapizados', 'Limpieza residencial'] }
];

export const INITIAL_PROFILES: UserProfile[] = [
  // Current user standard particular
  {
    id: 'user-particular-1',
    name: 'Gonzalo Morales',
    email: 'gonzalo.morales@ejemplo.com',
    phonePrivate: '+54 385 512-3456',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    role: 'USER',
    joinedDate: 'Marzo 2025',
    location: {
      city: 'Santiago del Estero',
      province: 'Santiago del Estero',
      country: 'Argentina',
      lat: -27.7833,
      lng: -64.2667,
      approxZone: 'Santiago del Estero - Centro',
      exactAddressPrivate: 'Calle Belgrano Sur 1420'
    },
    isIdentityVerified: true,
    identityVerificationStatus: 'VERIFIED',
    rating: 5.0,
    reviewCount: 4,
    jobsCompleted: 6,
    trustScore: 98,
    availabilityStatus: 'DISPONIBLE'
  },
  
  // Professional 1: Electricista Santiago del Estero
  {
    id: 'pro-1',
    name: 'Ing. Carlos Mansilla',
    businessName: 'ElectroServicios Mansilla',
    email: 'carlos.mansilla@electro.com',
    phonePrivate: '+54 385 499-8811',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
    role: 'PROFESSIONAL',
    joinedDate: 'Enero 2024',
    location: {
      city: 'Santiago del Estero',
      province: 'Santiago del Estero',
      country: 'Argentina',
      lat: -27.7890,
      lng: -64.2610,
      approxZone: 'Santiago del Estero - Barrio Parque',
      exactAddressPrivate: 'Av. Moreno Sur 850'
    },
    isIdentityVerified: true,
    identityVerificationStatus: 'VERIFIED',
    isProfessional: true,
    professionId: 'prof-electricista',
    professionName: 'Electricista Matriculado',
    specialties: ['Tableros trifásicos', 'Instalaciones domiciliarias', 'Pruebas de fuga', 'Certificación aptitud eléctrica'],
    description: 'Electricista matriculado con más de 12 años de experiencia en obras residenciales y comerciales en Santiago del Estero y La Banda. Garantía por escrito en cada trabajo.',
    workZoneRadiusKm: 25,
    isProfessionalVerified: true,
    professionalVerificationStatus: 'VERIFIED',
    matriculaOrDegree: 'Matrícula COPIT SdE N° 4412',
    rating: 4.9,
    reviewCount: 87,
    jobsCompleted: 127,
    trustScore: 96,
    availabilityStatus: 'DISPONIBLE',
    hourlyRateArs: 18000,
    workingHours: 'Lunes a Sábado de 8:00 a 19:00',
    servicesOffered: [
      { id: 's1', title: 'Revisión y cambio de térmicas y disyuntores', description: 'Diagnóstico de cortocircuitos y reemplazo de componentes de protección.', approxPriceArs: 25000 },
      { id: 's2', title: 'Instalación completa de luminarias e iluminación LED', description: 'Cableado, instalación de apliques, reflectores y luces decorativas.', approxPriceArs: 35000 },
      { id: 's3', title: 'Certificado de aptitud eléctrica para habilitación', description: 'Medición de puesta a tierra con telurímetro y confección de plano/acta.', approxPriceArs: 45000 }
    ],
    portfolioImages: [
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=600'
    ],
    isProSubscriber: true,
    isFeatured: true,
    isDemoData: true
  },

  // Professional 2: Plomero Santiago del Estero
  {
    id: 'pro-2',
    name: 'Marcelo "Chelo" Juárez',
    businessName: 'Plomería & Termofusión Juárez',
    email: 'marcelo.juarez@plomeria.com',
    phonePrivate: '+54 385 588-3322',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
    role: 'PROFESSIONAL',
    joinedDate: 'Mayo 2024',
    location: {
      city: 'La Banda',
      province: 'Santiago del Estero',
      country: 'Argentina',
      lat: -27.7333,
      lng: -64.2500,
      approxZone: 'La Banda - Centro',
      exactAddressPrivate: 'España 240, La Banda'
    },
    isIdentityVerified: true,
    identityVerificationStatus: 'VERIFIED',
    isProfessional: true,
    professionId: 'prof-plomero',
    professionName: 'Plomero / Fontanero',
    specialties: ['Termofusión Acqua System', 'Reparación de pérdidas ocultas', 'Destapes urgentes 24hs', 'Bombas presurizadoras'],
    description: 'Soluciones rápidas en plomería para Santiago y La Banda. Equipamiento moderno para detectar filtraciones sin romper paredes innecesariamente.',
    workZoneRadiusKm: 20,
    isProfessionalVerified: true,
    professionalVerificationStatus: 'VERIFIED',
    matriculaOrDegree: 'Registro Profesional Municipal N° 881',
    rating: 4.8,
    reviewCount: 54,
    jobsCompleted: 92,
    trustScore: 92,
    availabilityStatus: 'DISPONIBLE',
    hourlyRateArs: 15000,
    workingHours: 'Lunes a Domingo (Urgencias 24hs)',
    servicesOffered: [
      { id: 's4', title: 'Reparación de pérdidas de agua en baños o cocinas', description: 'Termofusión de cañerías y cambio de griferías.', approxPriceArs: 28000 },
      { id: 's5', title: 'Instalación de bombas presurizadoras de agua', description: 'Colocación de bombas elevadoras o presurizadoras con tablero.', approxPriceArs: 40000 }
    ],
    portfolioImages: [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600'
    ],
    isProSubscriber: true,
    isDemoData: true
  },

  // Professional 3: Abogada Santiago del Estero
  {
    id: 'pro-3',
    name: 'Dra. María Laura Paz',
    businessName: 'Estudio Jurídico Paz & Asociados',
    email: 'laura.paz@estudiopaz.com.ar',
    phonePrivate: '+54 385 411-9900',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
    role: 'PROFESSIONAL',
    joinedDate: 'Febrero 2024',
    location: {
      city: 'Santiago del Estero',
      province: 'Santiago del Estero',
      country: 'Argentina',
      lat: -27.7850,
      lng: -64.2630,
      approxZone: 'Santiago del Estero - Centro Tribunales',
      exactAddressPrivate: 'Calle Absalón Ibarra 310'
    },
    isIdentityVerified: true,
    identityVerificationStatus: 'VERIFIED',
    isProfessional: true,
    professionId: 'prof-abogado',
    professionName: 'Abogada',
    specialties: ['Derecho de Familia y Sucesiones', 'Derecho Laboral y ART', 'Redacción de Contratos', 'Mediación'],
    description: 'Atención personalizada y asesoramiento legal transparente. Primera consulta de orientación previa presupuestada sin sorpresas.',
    workZoneRadiusKm: 50,
    isProfessionalVerified: true,
    professionalVerificationStatus: 'VERIFIED',
    matriculaOrDegree: 'Matrícula Colegio de Abogados SdE T° IV F° 129',
    rating: 5.0,
    reviewCount: 38,
    jobsCompleted: 45,
    trustScore: 99,
    availabilityStatus: 'DISPONIBLE',
    hourlyRateArs: 25000,
    workingHours: 'Lunes a Viernes de 9:00 a 17:00',
    servicesOffered: [
      { id: 's6', title: 'Consultoría legal general y revisión contractual', description: 'Revisión de contratos de alquiler, comercial o laboral.', approxPriceArs: 20000 },
      { id: 's7', title: 'Iniciación de juicios sucesorios o divorcios', description: 'Gestión integral ante los juzgados de Santiago del Estero.', approxPriceArs: 150000 }
    ],
    portfolioImages: [
      'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=600'
    ],
    isProSubscriber: true,
    isFeatured: true,
    isDemoData: true
  },

  // Professional 4: Técnico PC / Programador Córdoba
  {
    id: 'pro-4',
    name: 'Luciano Ferreyra',
    businessName: 'TechSolutions Córdoba',
    email: 'lucho.tech@gmail.com',
    phonePrivate: '+54 351 688-4411',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=250',
    role: 'PROFESSIONAL',
    joinedDate: 'Julio 2024',
    location: {
      city: 'Córdoba',
      province: 'Córdoba',
      country: 'Argentina',
      lat: -31.4201,
      lng: -64.1888,
      approxZone: 'Córdoba Capital - Nueva Córdoba',
      exactAddressPrivate: 'Calle Obispo Trejo 800'
    },
    isIdentityVerified: true,
    identityVerificationStatus: 'VERIFIED',
    isProfessional: true,
    professionId: 'prof-tecnico-pc',
    professionName: 'Técnico de Computación y Redes',
    specialties: ['Reparación de Notebooks', 'Armado de PC Gamer', 'Limpieza y cambio de pasta térmica', 'Desinfección de Virus'],
    description: 'Servicio técnico de notebooks y PC de escritorio en Córdoba. Diagnóstico sin cargo si realizás la reparación.',
    workZoneRadiusKm: 30,
    isProfessionalVerified: true,
    professionalVerificationStatus: 'VERIFIED',
    matriculaOrDegree: 'Título Técnico Superior en Informática UTN',
    rating: 4.9,
    reviewCount: 62,
    jobsCompleted: 110,
    trustScore: 95,
    availabilityStatus: 'DISPONIBLE',
    hourlyRateArs: 16000,
    workingHours: 'Lunes a Viernes de 10:00 a 19:00',
    servicesOffered: [
      { id: 's8', title: 'Mantenimiento preventivo, limpieza e instalación SSD', description: 'Aceleración de notebooks lentas con discos sólidos y limpieza profunda.', approxPriceArs: 22000 }
    ],
    portfolioImages: [
      'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&q=80&w=600'
    ],
    isDemoData: true
  },

  // Professional 5: Gasista Matriculado Buenos Aires
  {
    id: 'pro-5',
    name: 'Jorge "Coqui" Benítez',
    businessName: 'Gas & Termotanques CABA',
    email: 'benitez.gas@gmail.com',
    phonePrivate: '+54 11 4400-9922',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=250',
    role: 'PROFESSIONAL',
    joinedDate: 'Noviembre 2024',
    location: {
      city: 'Buenos Aires',
      province: 'CABA',
      country: 'Argentina',
      lat: -34.6037,
      lng: -58.3816,
      approxZone: 'Buenos Aires - Caballito / Almagro',
      exactAddressPrivate: 'Av. Rivadavia 4900'
    },
    isIdentityVerified: true,
    identityVerificationStatus: 'VERIFIED',
    isProfessional: true,
    professionId: 'prof-gasista',
    professionName: 'Gasista Matriculado Metrogas',
    specialties: ['Instalación de cocinas y calefactores', 'Pruebas de hermeticidad', 'Trámites de rehabilitación Metrogas', 'Termotanques'],
    description: 'Gasista matriculado primera categoría Metrogas. Solución definitiva a cortes preventivos de gas en consorcios y casas particulares.',
    workZoneRadiusKm: 15,
    isProfessionalVerified: true,
    professionalVerificationStatus: 'VERIFIED',
    matriculaOrDegree: 'Matrícula Metrogas N° 01-8892',
    rating: 4.7,
    reviewCount: 41,
    jobsCompleted: 68,
    trustScore: 91,
    availabilityStatus: 'DISPONIBLE',
    hourlyRateArs: 22000,
    workingHours: 'Lunes a Sábado de 8:00 a 18:00',
    isDemoData: true
  },

  // Admin User
  {
    id: 'admin-1',
    name: 'Administración CONEXA',
    email: 'admin@conexa.app',
    phonePrivate: '+54 385 400-0000',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=250',
    role: 'ADMIN',
    joinedDate: 'Enero 2024',
    location: {
      city: 'Santiago del Estero',
      province: 'Santiago del Estero',
      country: 'Argentina',
      lat: -27.7833,
      lng: -64.2667,
      approxZone: 'Oficinas Centrales CONEXA'
    },
    isIdentityVerified: true,
    identityVerificationStatus: 'VERIFIED',
    rating: 5.0,
    reviewCount: 0,
    jobsCompleted: 0,
    trustScore: 100,
    availabilityStatus: 'DISPONIBLE'
  }
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    jobId: 'job-prev-101',
    clientId: 'user-particular-1',
    clientName: 'Gonzalo Morales',
    clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    professionalId: 'pro-1',
    createdAt: '15 de Julio, 2025',
    comment: 'Excelente profesional. Llegó a la hora acordada en Santiago Centro, detectó una falla en el disyuntor que nadie encontraba y dejó todo impecable con comprobante de medición.',
    overallRating: 5.0,
    qualityRating: 5,
    punctualityRating: 5,
    treatmentRating: 5,
    priceRating: 5,
    complianceRating: 5,
    isVerifiedJob: true,
    isDemoData: true
  },
  {
    id: 'rev-2',
    jobId: 'job-prev-102',
    clientId: 'user-2',
    clientName: 'Patricia Gramajo',
    clientAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=250',
    professionalId: 'pro-1',
    createdAt: '2 de Agosto, 2025',
    comment: 'Súper recomendable. Cambió todo el cableado de la cocina y me asesoró sobre los materiales. Se nota que es matriculado.',
    overallRating: 4.8,
    qualityRating: 5,
    punctualityRating: 5,
    treatmentRating: 5,
    priceRating: 4,
    complianceRating: 5,
    isVerifiedJob: true,
    isDemoData: true
  },
  {
    id: 'rev-3',
    jobId: 'job-prev-103',
    clientId: 'user-3',
    clientName: 'Esteban Reinoso',
    clientAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=250',
    professionalId: 'pro-2',
    createdAt: '28 de Junio, 2025',
    comment: 'Urgencia un domingo a la mañana por pérdida en el tanque en La Banda. Respondió rápido por el chat y solucionó la termofusión.',
    overallRating: 5.0,
    qualityRating: 5,
    punctualityRating: 5,
    treatmentRating: 5,
    priceRating: 5,
    complianceRating: 5,
    isVerifiedJob: true,
    isDemoData: true
  }
];

export const INITIAL_SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: 'req-1',
    clientId: 'user-particular-1',
    clientName: 'Gonzalo Morales',
    clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    title: 'Instalación de aire acondicionado Split 3200 frigorías',
    category: 'Hogar & Construcción',
    professionName: 'Técnico / Electricista',
    description: 'Necesito instalar un aire acondicionado frío/calor nuevo en primer piso en zona Santiago Centro. Tengo el kit básico de caños de cobre.',
    approxLocation: '📍 Santiago del Estero - Centro',
    preferredDate: 'Próximos 3 días',
    preferredTimeSlot: 'Mañana (09:00 a 12:00)',
    estimatedBudgetArs: 65000,
    urgency: 'ALTA',
    status: 'QUOTES_RECEIVED',
    createdAt: 'Hace 2 horas',
    quotesCount: 2,
    isDemoData: true
  },
  {
    id: 'req-2',
    clientId: 'user-2',
    clientName: 'Patricia Gramajo',
    clientAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=250',
    title: 'Reparación urgente de pérdida bajo mesada',
    category: 'Hogar & Construcción',
    professionName: 'Plomero / Fontanero',
    description: 'Gotea la bacha de la cocina y moja el mueble. Necesito solución urgente para evitar arruinar la madera.',
    approxLocation: '📍 La Banda - Barrio Ramos Taboada',
    preferredDate: 'Hoy mismo',
    preferredTimeSlot: 'Por la tarde',
    estimatedBudgetArs: 30000,
    urgency: 'URGENTE',
    status: 'REQUEST_CREATED',
    createdAt: 'Hace 30 minutos',
    quotesCount: 1,
    isDemoData: true
  }
];

export const INITIAL_QUOTES: Quote[] = [
  {
    id: 'quote-1',
    requestId: 'req-1',
    professionalId: 'pro-1',
    professionalName: 'Ing. Carlos Mansilla',
    professionalAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
    professionalRating: 4.9,
    professionalVerified: true,
    priceArs: 60000,
    description: 'Instalación completa hasta 3 metros de cañería, mensulas reforzadas, vaciado de cañería con bomba de vacío y prueba de drenaje.',
    materialsIncluded: 'Ménsulas, tacos Fisher, cinta de embalaje UV, manguera de drenaje y cable interconexión.',
    estimatedTime: '3 a 4 horas de trabajo',
    availableStartDate: 'Mañana 09:30 hs',
    warrantyInfo: '12 meses de garantía escrita sobre la instalación.',
    termsAndConditions: 'Requiere acceso a tablero eléctrico cercano.',
    status: 'PENDING',
    createdAt: 'Hace 1 hora',
    isDemoData: true
  }
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    participantIds: ['user-particular-1', 'pro-1'],
    otherUser: {
      id: 'pro-1',
      name: 'Ing. Carlos Mansilla',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
      profession: 'Electricista Matriculado',
      isIdentityVerified: true,
      isProfessionalVerified: true
    },
    lastMessage: 'Hola Gonzalo! Vi tu solicitud para la instalación. Te envié un presupuesto detallado.',
    lastMessageTime: '11:45',
    unreadCount: 1,
    sharedPhoneBySender: false,
    sharedPhoneByReceiver: false,
    sharedAddressBySender: false,
    sharedAddressByReceiver: false
  }
];

export const INITIAL_MESSAGES: Record<string, Message[]> = {
  'conv-1': [
    {
      id: 'm1',
      conversationId: 'conv-1',
      senderId: 'pro-1',
      senderName: 'Ing. Carlos Mansilla',
      createdAt: '11:40',
      type: 'TEXT',
      content: 'Hola Gonzalo, buenas tardes. Vi tu publicación sobre la instalación del Split en Santiago Centro.'
    },
    {
      id: 'm2',
      conversationId: 'conv-1',
      senderId: 'pro-1',
      senderName: 'Ing. Carlos Mansilla',
      createdAt: '11:42',
      type: 'TEXT',
      content: 'Trabajo esa zona a diario. Si querés te paso el presupuesto formal directamente por la plataforma.'
    },
    {
      id: 'm3',
      conversationId: 'conv-1',
      senderId: 'user-particular-1',
      senderName: 'Gonzalo Morales',
      createdAt: '11:44',
      type: 'TEXT',
      content: 'Hola Carlos! Genial, pasame el presupuesto y decime si tenés disponibilidad para mañana.'
    },
    {
      id: 'm4',
      conversationId: 'conv-1',
      senderId: 'pro-1',
      senderName: 'Ing. Carlos Mansilla',
      createdAt: '11:45',
      type: 'SYSTEM',
      content: '🔒 RECUERDA: Por tu seguridad, conversá primero en la plataforma. Tu teléfono y dirección están ocultos hasta que decidas compartirlos expresamente.'
    }
  ]
};
