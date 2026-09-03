import type { ServiceItem } from '../types.js';

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
  servicesOffered?: ServiceItem[];
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
  servicesOffered: ServiceItem[];
  portfolioImages: string[];
}

const MAX_SPECIALTIES = 20;
const MAX_SERVICES = 30;
const MAX_PORTFOLIO_IMAGES = 20;
const MAX_PROFESSION_ID_LENGTH = 120;
const MAX_SPECIALTY_LENGTH = 100;
const MAX_SERVICE_TITLE_LENGTH = 160;
const MAX_PORTFOLIO_URL_LENGTH = 2048;

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validateString(value: unknown, maxLength: number, code: string): string {
  const normalized = readTrimmedString(value);
  if (normalized.length > maxLength) throw new Error(code);
  return normalized;
}

function normalizeStringList(value: unknown, maxItems: number, maxItemLength: number, code: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(code);
  if (value.length > maxItems) throw new Error(code);

  const normalized = value.map((item) => {
    if (typeof item !== 'string') throw new Error(code);
    const trimmed = item.trim();
    if (!trimmed || trimmed.length > maxItemLength) throw new Error(code);
    return trimmed;
  });

  return [...new Set(normalized)];
}

function normalizePortfolioImages(value: unknown): string[] {
  const urls = normalizeStringList(value, MAX_PORTFOLIO_IMAGES, MAX_PORTFOLIO_URL_LENGTH, 'INVALID_PORTFOLIO_IMAGES');
  return urls.map((url) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error('INVALID_PORTFOLIO_IMAGES');
    }
    if (parsed.protocol !== 'https:') throw new Error('INVALID_PORTFOLIO_IMAGES');
    return parsed.toString();
  });
}

function normalizeServices(value: unknown): ServiceItem[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_SERVICES) throw new Error('INVALID_SERVICES');

  return value.map((item, index) => {
    if (typeof item !== 'object' || item === null) throw new Error('INVALID_SERVICES');
    const candidate = item as Record<string, unknown>;
    const title = validateString(candidate.title, MAX_SERVICE_TITLE_LENGTH, 'INVALID_SERVICES');
    const description = validateString(candidate.description, 1000, 'INVALID_SERVICES');
    if (!title || !description) throw new Error('INVALID_SERVICES');

    const id = validateString(candidate.id, 120, 'INVALID_SERVICES');
    const rawPrice = candidate.approxPriceArs;
    const approxPriceArs = rawPrice === undefined ? undefined : Number(rawPrice);
    if (approxPriceArs !== undefined && (!Number.isFinite(approxPriceArs) || approxPriceArs < 0 || approxPriceArs > 100_000_000)) {
      throw new Error('INVALID_SERVICES');
    }

    return {
      id: id || `service-${index + 1}`,
      title,
      description,
      ...(approxPriceArs !== undefined ? { approxPriceArs } : {}),
    };
  });
}

export function normalizeProfessionalProfileWrite(
  input: ProfessionalProfileWriteInput,
  existingName: string,
): NormalizedProfessionalProfileWrite {
  const professionName = validateString(input.professionName, 120, 'INVALID_PROFESSION');
  if (!professionName) throw new Error('INVALID_PROFESSION');

  const businessNameInput = validateString(input.businessName, 160, 'PROFILE_FIELD_TOO_LONG');
  const safeName = readTrimmedString(existingName).split(/\s+/)[0] || 'Profesional';
  const businessName = businessNameInput || `${professionName} ${safeName}`;
  const description = validateString(input.description, 2000, 'PROFILE_FIELD_TOO_LONG');
  const workingHours = validateString(input.workingHours, 200, 'PROFILE_FIELD_TOO_LONG');
  const matriculaOrDegree = validateString(input.matriculaOrDegree, 200, 'PROFILE_FIELD_TOO_LONG');
  const professionIdValue = validateString(input.professionId, MAX_PROFESSION_ID_LENGTH, 'INVALID_PROFESSION_ID');
  const professionId = professionIdValue || undefined;

  const specialties = normalizeStringList(input.specialties, MAX_SPECIALTIES, MAX_SPECIALTY_LENGTH, 'INVALID_SPECIALTIES');
  const servicesOffered = normalizeServices(input.servicesOffered);
  const portfolioImages = normalizePortfolioImages(input.portfolioImages);
  const workZoneRadiusKm = Number(input.workZoneRadiusKm);
  const hourlyRateArs = Number(input.hourlyRateArs);

  if (!Number.isFinite(workZoneRadiusKm) || workZoneRadiusKm < 1 || workZoneRadiusKm > 100) {
    throw new Error('INVALID_SERVICE_RADIUS');
  }
  if (!Number.isFinite(hourlyRateArs) || hourlyRateArs < 0 || hourlyRateArs > 100_000_000) {
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
