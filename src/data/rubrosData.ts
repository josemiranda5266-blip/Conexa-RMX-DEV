import { CategoryInfo } from '../types';

export interface RubroGroup {
  id: string;
  name: string;
  iconName: string;
  description: string;
}

export const RUBRO_GROUPS: RubroGroup[] = [
  {
    id: 'instalaciones',
    name: 'Instalaciones & Climatización',
    iconName: 'Zap',
    description: 'Electricidad, gas, plomería, aire acondicionado, energía solar y calderas.'
  },
  {
    id: 'construccion',
    name: 'Construcción & Reformas',
    iconName: 'Hammer',
    description: 'Albañilería, construcción en seco, durlock, pintura, techos y herrería.'
  },
  {
    id: 'mantenimiento',
    name: 'Hogar, Mantenimiento & Seguridad',
    iconName: 'Shield',
    description: 'Cerrajería, cámaras CCTV, domótica, limpieza, piscinas y control de plagas.'
  },
  {
    id: 'tecnologia',
    name: 'Tecnología & Electrodomésticos',
    iconName: 'Laptop',
    description: 'Reparación de heladeras, lavarropas, TV, audio, computación y redes.'
  },
  {
    id: 'automotor',
    name: 'Mecánica & Automotores',
    iconName: 'Car',
    description: 'Mecánica ligera, electricidad del auto, cerrajería automotor y GNC.'
  },
  {
    id: 'profesionales',
    name: 'Arquitectura & Servicios Técnicos',
    iconName: 'Compass',
    description: 'Arquitectura, cálculo estructural, agrimensura, planos y seguridad e higiene.'
  },
  {
    id: 'fletes',
    name: 'Fletes, Mudanzas & Logística',
    iconName: 'Truck',
    description: 'Fletes urbanos, mudanzas completas con peones, repartos y logística.'
  },
  {
    id: 'eventos',
    name: 'Eventos, Capacitación & Otros',
    iconName: 'Sparkles',
    description: 'Sonido, iluminación, fotografía, clases particulares y servicios especiales.'
  }
];

export const ALL_RUBROS_CATALOG: CategoryInfo[] = [
  // --- Instalaciones & Climatización ---
  {
    id: 'electricidad',
    name: 'Electricidad Matriculada & Redes',
    categoryGroup: 'instalaciones',
    iconName: 'Zap',
    popular: true,
    description: 'Instalaciones monofásicas/trifásicas, tableros seccionales, térmicas, certificados DCI y urgencias 24hs.',
    keywords: ['electricista', 'tablero', 'termica', 'disyuntor', 'trifasica', 'cortocircuito', 'dci', 'edenor', 'edesur', 'cableado', 'iluminacion']
  },
  {
    id: 'plomeria',
    name: 'Plomería & Redes Sanitarias',
    categoryGroup: 'instalaciones',
    iconName: 'Wrench',
    popular: true,
    description: 'Termofusión, reparación de cañerías, bombas presurizadoras, cloacas y detección no invasiva de filtraciones.',
    keywords: ['plomero', 'cano', 'termofusion', 'bomba', 'perdida', 'griferia', 'inodoro', 'desague', 'filtracion', 'tanque']
  },
  {
    id: 'gas',
    name: 'Gasista Matriculado',
    categoryGroup: 'instalaciones',
    iconName: 'Flame',
    popular: true,
    description: 'Planos y trámites Metrogas/Naturgy, pruebas de hermeticidad, instalación de artefactos, calefones y termotanques.',
    keywords: ['gasista', 'matriculado', 'estufa', 'calefon', 'termotanque', 'perdida gas', 'metrogas', 'naturgy', 'reja ventilacion']
  },
  {
    id: 'climatizacion',
    name: 'Aire Acondicionado & Climatización',
    categoryGroup: 'instalaciones',
    iconName: 'Snowflake',
    popular: true,
    description: 'Instalación de splits y multisplits, inverter, carga de refrigerante R410/R32, mantenimiento preventivo y limpieza.',
    keywords: ['aire', 'split', 'inverter', 'gas refrigerante', 'frio calor', 'desinstalacion', 'mantenimiento', 'filtro']
  },
  {
    id: 'energia-solar',
    name: 'Energía Solar & Paneles Fotovoltaicos',
    categoryGroup: 'instalaciones',
    iconName: 'Sun',
    popular: false,
    description: 'Instalación de sistemas on-grid/off-grid, inversores híbridos, baterías de litio y termotanques solares.',
    keywords: ['solar', 'paneles', 'baterias', 'inversor', 'termotanque solar', 'energia renovable', 'sustentable']
  },
  {
    id: 'calderas',
    name: 'Calderas & Calefacción Central',
    categoryGroup: 'instalaciones',
    iconName: 'Flame',
    popular: false,
    description: 'Service oficial multimarca, piso radiante, radiadores de aluminio, purgados y bombas circuladoras.',
    keywords: ['caldera', 'piso radiante', 'radiador', 'baxi', 'ariston', 'peisa', 'calefaccion', 'bomba circuladora']
  },

  // --- Construcción & Reformas ---
  {
    id: 'albanileria',
    name: 'Albañilería & Obras Generales',
    categoryGroup: 'construccion',
    iconName: 'Hammer',
    popular: true,
    description: 'Construcción tradicional, revoques finos y gruesos, contrapisos, ampliaciones, mochetas y demoliciones controladas.',
    keywords: ['albanil', 'cemento', 'ladrillos', 'pared', 'revoque', 'obra', 'ampliacion', 'contrapiso', 'reforma']
  },
  {
    id: 'durlock',
    name: 'Construcción en Seco (Durlock / Steel Frame)',
    categoryGroup: 'construccion',
    iconName: 'Layers',
    popular: true,
    description: 'Tabiques divisorios, cielorrasos suspendidos, molduras con garganta para LED, aislación acústica y Steel Framing.',
    keywords: ['durlock', 'yesero', 'steel frame', 'tabique', 'cielorraso', 'placa de yeso', 'aislacion', 'perfileria']
  },
  {
    id: 'pintura',
    name: 'Pintura & Revestimientos Plásticos',
    categoryGroup: 'construccion',
    iconName: 'Paintbrush',
    popular: true,
    description: 'Pintura látex interior/exterior, satinados, esmaltes sintéticos, revestimiento tipo Tarquini/Revear y enduido completo.',
    keywords: ['pintor', 'latex', 'tarquini', 'revear', 'sintetico', 'enduido', 'rodillo', 'hidrolavado', 'fachada']
  },
  {
    id: 'techos',
    name: 'Techos, Zinguería & Tinglados',
    categoryGroup: 'construccion',
    iconName: 'Home',
    popular: false,
    description: 'Reparación de filtraciones en techos de chapa o teja, colocación de canaletas, babetas, aislación térmica e impermeabilización.',
    keywords: ['techo', 'zingueria', 'canaleta', 'chapa', 'teja', 'gotera', 'membrana', 'tinglado']
  },
  {
    id: 'herreria',
    name: 'Herrería & Carpintería Metálica',
    categoryGroup: 'construccion',
    iconName: 'Building2',
    popular: false,
    description: 'Rejas de seguridad, portones automáticos levadizos/corredizos, barandas, pérgolas estructurales y soldadura TIG/MIG.',
    keywords: ['herrero', 'reja', 'porton', 'soldadura', 'hierro', 'pergola', 'alero', 'automatizacion porton']
  },
  {
    id: 'carpinteria',
    name: 'Carpintería & Muebles a Medida',
    categoryGroup: 'construccion',
    iconName: 'Package',
    popular: false,
    description: 'Placares, interiores de placard, bajo mesadas en melamina/madera maciza, decks de madera y restauración de aberturas.',
    keywords: ['carpintero', 'mueble', 'placard', 'melamina', 'bajo mesada', 'deck', 'madera', 'puerta', 'ventana']
  },
  {
    id: 'pisos',
    name: 'Pisos, Porcelanatos & Microcemento',
    categoryGroup: 'construccion',
    iconName: 'Grid',
    popular: false,
    description: 'Colocación de porcelanatos grandes formatos, pisos flotantes, microcemento alisado, pulido y plastificado de parquet.',
    keywords: ['porcelanato', 'ceramico', 'piso flotante', 'parquet', 'plastificado', 'microcemento', 'pulido']
  },
  {
    id: 'vidrieria',
    name: 'Vidriería & Cerramientos de Aluminio',
    categoryGroup: 'construccion',
    iconName: 'Grid',
    popular: false,
    description: 'Mamparas de baño en vidrio templado, espejos a medida, aberturas de aluminio línea Módena/A30 y doble vidriado DVH.',
    keywords: ['vidriero', 'vidrio templado', 'mampara', 'dvh', 'aluminio', 'modena', 'cerramiento', 'espejo']
  },
  {
    id: 'impermeabilizacion',
    name: 'Impermeabilizaciones & Membranas',
    categoryGroup: 'construccion',
    iconName: 'Shield',
    popular: false,
    description: 'Membrana asfáltica soldada con soplete, pintura poliuretánica impermeabilizante para terrazas y solución a humedad de cimientos.',
    keywords: ['membrana', 'impermeabilizacion', 'humedad', 'terraza', 'filtracion', 'poliuretano', 'soplete']
  },

  // --- Mantenimiento, Hogar & Seguridad ---
  {
    id: 'cerrajeria',
    name: 'Cerrajería Integral & Urgencias 24hs',
    categoryGroup: 'mantenimiento',
    iconName: 'Key',
    popular: true,
    description: 'Aperturas residenciales y blindadas, cambio de combinaciones, cerraduras digitales y copias de llaves computarizadas.',
    keywords: ['cerrajero', 'llave', 'cerradura', 'puerta blindada', 'apertura urgente', 'cerradura digital', 'cerrojo']
  },
  {
    id: 'cctv-seguridad',
    name: 'Cámaras de Seguridad & Alarmas',
    categoryGroup: 'mantenimiento',
    iconName: 'Shield',
    popular: false,
    description: 'Instalación de cámaras IP/Hikvision/Dahua con visualización remota en el celular, alarmas vecinales y cercos eléctricos.',
    keywords: ['camaras', 'cctv', 'alarma', 'hikvision', 'dahua', 'seguridad', 'cerco electrico', 'sensor']
  },
  {
    id: 'domotica',
    name: 'Domótica & Automatización de Hogar',
    categoryGroup: 'mantenimiento',
    iconName: 'Cpu',
    popular: false,
    description: 'Control de iluminación por voz (Alexa/Google Home), interruptores inteligentes Sonoff/Tuya, persianas automáticas y sensores.',
    keywords: ['domotica', 'alexa', 'google home', 'sonoff', 'tuya', 'smart home', 'automatizacion', 'luces inteligentes']
  },
  {
    id: 'jardineria',
    name: 'Jardinería, Poda & Paisajismo',
    categoryGroup: 'mantenimiento',
    iconName: 'Sprout',
    popular: false,
    description: 'Mantenimiento de jardines, corte de césped, poda de árboles en altura, colocación de césped grama bahiana y riego por aspersión.',
    keywords: ['jardinero', 'cesped', 'poda', 'grama bahiana', 'riego', 'arboles', 'plantas', 'paisajismo']
  },
  {
    id: 'piscinas',
    name: 'Mantenimiento & Construcción de Piscinas',
    categoryGroup: 'mantenimiento',
    iconName: 'Waves',
    popular: false,
    description: 'Limpieza periódica, balance químico del agua, pintura al agua/caucho clorado, reparación de bombas y luces subacuáticas LED.',
    keywords: ['pileta', 'piscina', 'cloro', 'bomba pileta', 'filtro vulcano', 'pintura pileta', 'luces led']
  },
  {
    id: 'fumigacion',
    name: 'Control de Plagas & Fumigación',
    categoryGroup: 'mantenimiento',
    iconName: 'Bug',
    popular: false,
    description: 'Desinsectación, desratización y desinfección con productos aprobados por ANMAT sin olor para hogares, consorcios y comercios.',
    keywords: ['fumigador', 'cucarachas', 'ratas', 'plagas', 'desinfeccion', 'anmat', 'palomas', 'fumigacion']
  },
  {
    id: 'limpieza-obra',
    name: 'Limpieza Profunda & Final de Obra',
    categoryGroup: 'mantenimiento',
    iconName: 'Sparkles',
    popular: false,
    description: 'Limpieza profunda de fin de obra, remoción de restos de pintura y pastina, hidrolavado de vidrios en altura y alfombras.',
    keywords: ['limpieza', 'final de obra', 'limpieza profunda', 'vidrios', 'alfombras', 'hidrolavado']
  },

  // --- Tecnología & Electrodomésticos ---
  {
    id: 'reparacion-heladeras',
    name: 'Reparación de Heladeras & Freezers',
    categoryGroup: 'tecnologia',
    iconName: 'Snowflake',
    popular: false,
    description: 'Service no-frost e inverter multimarca (Whirlpool, Samsung, LG, Patrick). Cambio de motor, plaquetas y carga de gas.',
    keywords: ['heladera', 'freezer', 'no frost', 'motor heladera', 'termostato', 'whirlpool', 'samsung', 'lg']
  },
  {
    id: 'reparacion-lavarropas',
    name: 'Reparación de Lavarropas & Secarropas',
    categoryGroup: 'tecnologia',
    iconName: 'Wrench',
    popular: false,
    description: 'Cambio de rulemanes, bombas de desagote, plaquetas electrónicas y motores de lavarropas automáticos (Drean, LG, Longvie).',
    keywords: ['lavarropas', 'drean', 'ruleman', 'bomba desagote', 'plaqueta', 'secarropas', 'lavavajillas']
  },
  {
    id: 'audio-tv',
    name: 'Reparación de Smart TVs & Audio',
    categoryGroup: 'tecnologia',
    iconName: 'Tv',
    popular: false,
    description: 'Reparación de tiras LED de retroiluminación, fuentes de alimentación, placas main y equipos de sonido de alta fidelidad.',
    keywords: ['smart tv', 'pantalla led', 'retroiluminacion', 'placa main', 'audio', 'soundbar', 'televisor']
  },
  {
    id: 'soporte-pc',
    name: 'Soporte Técnico PC, Mac & Redes',
    categoryGroup: 'tecnologia',
    iconName: 'Laptop',
    popular: false,
    description: 'Formateo, instalación de discos SSD, armado de computadoras gamer/diseño, reparación de notebooks, Wi-Fi mesh y routers.',
    keywords: ['computacion', 'notebook', 'ssd', 'windows', 'mac', 'wifi', 'redes', 'servicio tecnico', 'pc gamer']
  },

  // --- Mecánica & Automotores ---
  {
    id: 'mecanica-ligera',
    name: 'Mecánica Ligera & Inyección Electrónica',
    categoryGroup: 'automotor',
    iconName: 'Car',
    popular: false,
    description: 'Escaneo computarizado OBD2, cambio de correas de distribución, embragues, frenos, amortiguadores y cambio de aceite y filtros.',
    keywords: ['mecanico', 'taller', 'frenos', 'embrague', 'distribucion', 'escaneo', 'inyeccion', 'aceite']
  },
  {
    id: 'electricidad-auto',
    name: 'Electricidad del Automotor & Baterías',
    categoryGroup: 'automotor',
    iconName: 'Zap',
    popular: false,
    description: 'Reparación de alternadores, motores de arranque, colocación de baterías a domicilio y levantavidrios eléctricos.',
    keywords: ['bateria auto', 'alternador', 'arranque', 'levantavidrio', 'luces auto', 'electricista automotor']
  },
  {
    id: 'cerrajeria-auto',
    name: 'Cerrajería del Automotor & Llaves Codificadas',
    categoryGroup: 'automotor',
    iconName: 'Key',
    popular: false,
    description: 'Aperturas de autos sin daño, copiado de llaves con chip transponder, telemandos y reparación de tambores de arranque.',
    keywords: ['llave codificada', 'chip auto', 'telemando', 'tambor arranque', 'apertura vehiculo']
  },

  // --- Arquitectura & Servicios Profesionales ---
  {
    id: 'arquitectura',
    name: 'Arquitectura, Renders & Reformas',
    categoryGroup: 'profesionales',
    iconName: 'Compass',
    popular: false,
    description: 'Diseño de anteproyectos, dirección de obra, modelado 3D fotorrealista, trámites municipales y habilitaciones comerciales.',
    keywords: ['arquitecto', 'plano', 'render', 'direccion de obra', 'habilitacion', 'anteproyecto', 'remodelacion']
  },
  {
    id: 'ingenieria-calculo',
    name: 'Ingeniería Civil & Cálculo Estructural',
    categoryGroup: 'profesionales',
    iconName: 'Building2',
    popular: false,
    description: 'Cálculo de estructuras de hormigón armado y metálicas, peritajes técnicos edilicios y refuerzos estructurales.',
    keywords: ['ingeniero civil', 'calculo estructural', 'hormigon', 'peritaje', 'estructura metalica']
  },
  {
    id: 'agrimensura',
    name: 'Agrimensura & Mensuras de Terrenos',
    categoryGroup: 'profesionales',
    iconName: 'Compass',
    popular: false,
    description: 'Planos de mensura para subdivisión o loteo, estados parcelarios para escrituración y amojonamiento con GPS geodésico.',
    keywords: ['agrimensor', 'mensura', 'estado parcelario', 'amojonamiento', 'loteo', 'escritura']
  },

  // --- Fletes, Mudanzas & Logística ---
  {
    id: 'fletes-mudanzas',
    name: 'Fletes, Mudanzas & Mini Fletes',
    categoryGroup: 'fletes',
    iconName: 'Truck',
    popular: true,
    description: 'Mudanzas completas con servicio de embalaje y peones, traslado de muebles pesados por escalera y fletes urgentes.',
    keywords: ['flete', 'mudanza', 'camioneta', 'peones', 'traslado', 'embalaje', 'reparto']
  },

  // --- Eventos & Capacitación ---
  {
    id: 'eventos-sonido',
    name: 'Sonido, Iluminación & DJ para Eventos',
    categoryGroup: 'eventos',
    iconName: 'Sparkles',
    popular: false,
    description: 'Equipos de sonido profesional para eventos sociales y corporativos, cabinas DJ, iluminación robótica y proyectores.',
    keywords: ['sonido', 'dj', 'iluminacion', 'evento', 'fiesta', 'luces led', 'parlantes']
  },
  {
    id: 'fotografia-video',
    name: 'Fotografía & Video Profesional',
    categoryGroup: 'eventos',
    iconName: 'Camera',
    popular: false,
    description: 'Fotografía de arquitectura e interiores, cobertura de eventos, fotografía de producto para e-commerce y video con Drone 4K.',
    keywords: ['fotografo', 'video', 'drone', 'foto producto', 'evento', 'cobertura', 'edicion']
  }
];

// Presets of real-looking work photos by rubro/category for demonstration & ease of use
export const PRESET_WORK_PHOTOS: Record<string, string[]> = {
  electricidad: [
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'
  ],
  plomeria: [
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&auto=format&fit=crop&q=80'
  ],
  gas: [
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80'
  ],
  climatizacion: [
    'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80'
  ],
  albanileria: [
    'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop&q=80'
  ],
  durlock: [
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80'
  ],
  pintura: [
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1595814433015-e59045b80145?w=800&auto=format&fit=crop&q=80'
  ],
  carpinteria: [
    'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&auto=format&fit=crop&q=80'
  ],
  cerrajeria: [
    'https://images.unsplash.com/photo-1558002038-1055907df827?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&auto=format&fit=crop&q=80'
  ],
  'cctv-seguridad': [
    'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop&q=80'
  ],
  jardineria: [
    'https://images.unsplash.com/photo-1558904541-efa8c4a08931?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1592417817098-8f3d6eb22a7d?w=800&auto=format&fit=crop&q=80'
  ],
  'fletes-mudanzas': [
    'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=800&auto=format&fit=crop&q=80'
  ],
  arquitectura: [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80'
  ]
};

export const DEFAULT_WORK_PHOTOS = [
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80'
];

export const getRubroById = (rubroId: string): CategoryInfo | undefined => {
  return ALL_RUBROS_CATALOG.find(r => r.id === rubroId);
};

export const searchRubros = (query: string): CategoryInfo[] => {
  if (!query.trim()) return ALL_RUBROS_CATALOG;
  const q = query.toLowerCase().trim();
  return ALL_RUBROS_CATALOG.filter(r =>
    r.name.toLowerCase().includes(q) ||
    r.description.toLowerCase().includes(q) ||
    r.id.toLowerCase().includes(q) ||
    r.keywords?.some(k => k.toLowerCase().includes(q))
  );
};

