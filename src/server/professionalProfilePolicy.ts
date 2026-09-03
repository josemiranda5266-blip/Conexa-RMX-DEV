export interface ProfessionalProfileWriteInput {
  professionId?: string;
  professionName: string;
  businessName?: string;
  specialties?: string[];
  description?: string;
  workZoneRadiusKm: number;
  workingHours: string;
  matriculaOrDegree?: string;
  hourlyRateArs: number;
  servicesOffered?: string[];
  portfolioImages?: string[];
}

export interface NormalizedProfessionalProfileWrite {
  professionId?: string;
  professionName: string;
  businessName: string;
  specialties: string[];
  description: string;
  workZoneRadiusKm: number;
  workingHours: string;
  matriculaOrDegree: string;
  hourlyRateArs: number;
  servicesOffered: string[];
  portfolioImages: string[];
}

const MAX_SPECIALTIES = 20;
const MAX_SERVICES = 30;
const MAX_PORTFOLIO_IMAGES = 20;

function normalizeString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeStringList(value: unknown, maxItems: number, maxItemLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => normalizeString(item, maxItemLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizePortfolioImages(value: unknown): string[] {
  return normalizeStringList(value, MAX_PORTFOLIO_IMAGES, 2048)
    .filter((url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
      } catch {
        return false;
      }
    });
}

export function normalizeProfessionalProfileWrite(
  input: ProfessionalProfileWriteInput,
  existingName: string,
): NormalizedProfessionalProfileWrite {
  const professionName = normalizeString(input.professionName, 120);
  const businessName = normalizeString(input.businessName, 160) || `${professionName} ${(existingName || 'Profesional').trim().split(/\s+/)[0]}`;
  const description = normalizeString(input.description, 2000);
  const workingHours = normalizeString(input.workingHours, 200);
  const matriculaOrDegree = normalizeString(input.matriculaOrDegree, 200);
  const specialties = normalizeStringList(input.specialties, MAX_SPECIALTIES, 100);
  const servicesOffered = normalizeStringList(input.servicesOffered, MAX_SERVICES, 160);
  const portfolioImages = normalizePortfolioImages(input.portfolioImages);
  const workZoneRadiusKm = Number(input.workZoneRadiusKm);
  const hourlyRateArs = Number(input.hourlyRateArs);
  const professionId = normalizeString(input.professionId, 120) || undefined;

  if (!professionName || professionName.length > 120) throw new Error('INVALID_PROFESSION');
  if (description.length > 2000 || workingHours.length > 200 || matriculaOrDegree.length > 200) {
    throw new Error('PROFILE_FIELD_TOO_LONG');
  }
  if (!Number.isFinite(workZoneRadiusKm) || workZoneRadiusKm < 1 || workZoneRadiusKm > 100) {
    throw new Error('INVALID_SERVICE_RADIUS');
  }
  if (!Number.isFinite(hourlyRateArs) || hourlyRateArs < 0 || hourlyRateArs > 100000000) {
    throw new Error('INVALID_HOURLY_RATE');
  }

  return {
    ...(professionId ? { professionId } : {}),
    professionName,
    businessName,
    specialties,
    description,
    workZoneRadiusKm,
    workingHours,
    matriculaOrDegree,
    hourlyRateArs,
    servicesOffered,
    portfolioImages,
  };
}
