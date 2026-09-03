export interface ProfessionCatalogEntry {
  id: string;
  name: string;
}

/**
 * Stable IDs used by professional profiles and matching.
 * Keep this module free of UI/mock-data dependencies so server code can validate
 * the same catalog identifiers without importing frontend fixtures.
 */
export const PROFESSION_CATALOG: readonly ProfessionCatalogEntry[] = [
  { id: 'prof-electricista', name: 'Electricista' },
  { id: 'prof-plomero', name: 'Plomero / Fontanero' },
  { id: 'prof-gasista', name: 'Gasista Matriculado' },
  { id: 'prof-albanil', name: 'Albañil / Constructor' },
  { id: 'prof-pintor', name: 'Pintor de Obra' },
  { id: 'prof-cerrajero', name: 'Cerrajero 24hs' },
  { id: 'prof-mecanico', name: 'Mecánico Automotriz' },
  { id: 'prof-abogado', name: 'Abogado' },
  { id: 'prof-contador', name: 'Contador Público' },
  { id: 'prof-ingeniero-seguridad', name: 'Higienista y Seg. Laboral' },
  { id: 'prof-arquitecto', name: 'Arquitecto' },
  { id: 'prof-tecnico-pc', name: 'Técnico de Computación' },
  { id: 'prof-programador', name: 'Programador / Web Dev' },
  { id: 'prof-jardinero', name: 'Jardinero' },
  { id: 'prof-limpieza', name: 'Servicio de Limpieza' },
];

export function getProfessionById(id: string): ProfessionCatalogEntry | undefined {
  return PROFESSION_CATALOG.find((profession) => profession.id === id);
}

export function getProfessionByName(name: string): ProfessionCatalogEntry | undefined {
  const normalized = name.trim().toLocaleLowerCase();
  return PROFESSION_CATALOG.find((profession) => profession.name.toLocaleLowerCase() === normalized);
}
