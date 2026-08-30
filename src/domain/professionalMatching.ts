import type { MatchedProfessional, RadarOpportunity, UserProfile } from '../types';

export interface ProfessionalCandidate {
  id: string;
  name: string;
  professionName: string;
  professionId?: string;
  specialties: string[];
  city: string;
  province: string;
  approxZone: string;
  rating: number;
  reviewCount: number;
  jobsCompleted: number;
  trustScore: number;
  availabilityStatus: UserProfile['availabilityStatus'];
  avatar: string;
  isIdentityVerified: boolean;
  isProfessionalVerified: boolean;
}

export interface ProfessionalMatch {
  candidate: ProfessionalCandidate;
  matchScore: number;
  matchReasons: string[];
}

export type LocationMatchLevel = 'NONE' | 'PROVINCE' | 'CITY' | 'ZONE';

export interface LocationMatch {
  level: LocationMatchLevel;
  isMatch: boolean;
  reason?: string;
}

const normalizeText = (value?: string | null): string =>
  (value || '').trim().toLocaleLowerCase('es-AR');

const clamp = (value: number, min = 0, max = 100): number =>
  Math.min(max, Math.max(min, value));

export function isProfessionalCapable(user: UserProfile): boolean {
  return user.hasProfessionalProfile === true ||
    user.isProfessional === true ||
    user.role === 'PROFESSIONAL';
}

// Backward-compatible alias for existing consumers.
export function isProfessionalCandidate(user: UserProfile): boolean {
  return isProfessionalCapable(user);
}

export function canUseProfessionalMode(user: UserProfile): boolean {
  return isProfessionalCapable(user);
}

export function getDefaultProfessionalMode(
  user: UserProfile
): 'CLIENT' | 'PROFESSIONAL' | 'ADMIN' {
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return user.activeMode === 'ADMIN' ? 'ADMIN' : 'CLIENT';
  }

  if (user.activeMode === 'PROFESSIONAL' && canUseProfessionalMode(user)) {
    return 'PROFESSIONAL';
  }

  return 'CLIENT';
}

export function normalizeProfessionalCandidate(user: UserProfile): ProfessionalCandidate | null {
  if (!isProfessionalCapable(user) || user.isBlocked === true) {
    return null;
  }

  return {
    id: user.id,
    name: user.name || 'Profesional CONEXA',
    professionName: user.professionName || '',
    professionId: user.professionId,
    specialties: Array.isArray(user.specialties) ? user.specialties.filter(Boolean) : [],
    city: user.location?.city || '',
    province: user.location?.province || '',
    approxZone: user.location?.approxZone || '',
    rating: Number.isFinite(user.rating) ? user.rating : 0,
    reviewCount: Number.isFinite(user.reviewCount) ? user.reviewCount : 0,
    jobsCompleted: Number.isFinite(user.jobsCompleted) ? user.jobsCompleted : 0,
    trustScore: Number.isFinite(user.trustScore) ? user.trustScore : 0,
    availabilityStatus: user.availabilityStatus,
    avatar: user.avatar || '',
    isIdentityVerified: user.isIdentityVerified === true,
    isProfessionalVerified: user.isProfessionalVerified === true
  };
}

export function isDiscoverableProfessional(candidate: ProfessionalCandidate): boolean {
  const hasProfessionalTerms = Boolean(
    normalizeText(candidate.professionName) ||
    normalizeText(candidate.professionId) ||
    candidate.specialties.some(specialty => Boolean(normalizeText(specialty)))
  );

  return hasProfessionalTerms;
}

export function matchesProfession(
  candidate: ProfessionalCandidate,
  opportunity: Pick<RadarOpportunity, 'category' | 'subcategory'>
): boolean {
  const requested = [opportunity.subcategory, opportunity.category]
    .map(normalizeText)
    .filter(Boolean);

  const professionalTerms = [
    candidate.professionName,
    candidate.professionId,
    ...candidate.specialties
  ]
    .map(normalizeText)
    .filter(Boolean);

  if (requested.length === 0 || professionalTerms.length === 0) {
    return false;
  }

  return requested.some(requestedTerm =>
    professionalTerms.some(professionalTerm =>
      professionalTerm === requestedTerm ||
      professionalTerm.includes(requestedTerm) ||
      requestedTerm.includes(professionalTerm)
    )
  );
}

export function evaluateLocationMatch(
  candidate: ProfessionalCandidate,
  opportunity: Pick<RadarOpportunity, 'city' | 'province' | 'neighborhood'>
): LocationMatch {
  const candidateCity = normalizeText(candidate.city);
  const candidateProvince = normalizeText(candidate.province);
  const candidateZone = normalizeText(candidate.approxZone);
  const opportunityCity = normalizeText(opportunity.city);
  const opportunityProvince = normalizeText(opportunity.province);
  const opportunityNeighborhood = normalizeText(opportunity.neighborhood);

  const sameCity = Boolean(candidateCity && opportunityCity && candidateCity === opportunityCity);
  const sameProvince = Boolean(
    candidateProvince && opportunityProvince && candidateProvince === opportunityProvince
  );
  const sameNeighborhood = Boolean(
    candidateZone &&
    opportunityNeighborhood &&
    (candidateZone.includes(opportunityNeighborhood) ||
      opportunityNeighborhood.includes(candidateZone))
  );

  if (sameCity) {
    return {
      level: 'CITY',
      isMatch: true,
      reason: 'Ubicación en la misma ciudad'
    };
  }

  if (sameNeighborhood) {
    return {
      level: 'ZONE',
      isMatch: true,
      reason: 'Zona de cobertura compatible'
    };
  }

  const opportunityHasLocality = Boolean(opportunityCity || opportunityNeighborhood);
  if (!opportunityHasLocality && sameProvince) {
    return {
      level: 'PROVINCE',
      isMatch: true,
      reason: 'Ubicación compatible a nivel provincial'
    };
  }

  return {
    level: 'NONE',
    isMatch: false
  };
}

export function matchesLocation(
  candidate: ProfessionalCandidate,
  opportunity: Pick<RadarOpportunity, 'city' | 'province' | 'neighborhood'>
): boolean {
  return evaluateLocationMatch(candidate, opportunity).isMatch;
}

export function calculateProfessionalMatchScore(
  candidate: ProfessionalCandidate,
  opportunity: Pick<RadarOpportunity, 'category' | 'subcategory' | 'city' | 'province' | 'neighborhood'>
): ProfessionalMatch {
  const matchReasons: string[] = [];
  let score = 0;

  if (!matchesProfession(candidate, opportunity)) {
    return { candidate, matchScore: 0, matchReasons: [] };
  }

  const locationMatch = evaluateLocationMatch(candidate, opportunity);
  if (!locationMatch.isMatch) {
    return { candidate, matchScore: 0, matchReasons: [] };
  }

  score += 40;
  matchReasons.push('Especialidad compatible');

  if (locationMatch.level === 'CITY' || locationMatch.level === 'ZONE') {
    score += 25;
  } else if (locationMatch.level === 'PROVINCE') {
    score += 5;
  }

  if (locationMatch.reason) {
    matchReasons.push(locationMatch.reason);
  }

  const qualityScore = clamp((candidate.rating / 5) * 10);
  score += qualityScore;
  if (candidate.rating >= 4) {
    matchReasons.push('Buena reputación');
  }

  const experienceScore = clamp(candidate.jobsCompleted / 10, 0, 8);
  score += experienceScore;

  const trustScore = clamp(candidate.trustScore / 10, 0, 7);
  score += trustScore;
  if (candidate.trustScore >= 70) {
    matchReasons.push('Alto nivel de confianza');
  }

  if (candidate.isIdentityVerified && candidate.isProfessionalVerified) {
    score += 5;
    matchReasons.push('Identidad y perfil profesional verificados');
  } else if (candidate.isIdentityVerified || candidate.isProfessionalVerified) {
    score += 2;
    matchReasons.push('Perfil verificado');
  }

  if (candidate.availabilityStatus === 'DISPONIBLE') {
    score += 5;
    matchReasons.push('Disponible actualmente');
  } else if (candidate.availabilityStatus === 'OCUPADO') {
    score -= 5;
  }

  return {
    candidate,
    matchScore: Math.round(clamp(score)),
    matchReasons
  };
}

export function findMatchingProfessionals(
  users: UserProfile[],
  opportunity: Pick<RadarOpportunity, 'category' | 'subcategory' | 'city' | 'province' | 'neighborhood'>,
  options: { limit?: number; includeUnavailable?: boolean } = {}
): ProfessionalMatch[] {
  const limit = options.limit ?? 10;

  return users
    .map(normalizeProfessionalCandidate)
    .filter((candidate): candidate is ProfessionalCandidate => candidate !== null)
    .filter(isDiscoverableProfessional)
    .filter(candidate => options.includeUnavailable || candidate.availabilityStatus !== 'OCUPADO')
    .filter(candidate => matchesProfession(candidate, opportunity))
    .filter(candidate => matchesLocation(candidate, opportunity))
    .map(candidate => calculateProfessionalMatchScore(candidate, opportunity))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

export function toMatchedProfessional(match: ProfessionalMatch): MatchedProfessional {
  const { candidate } = match;

  return {
    professionalId: candidate.id,
    name: candidate.name,
    professionName: candidate.professionName || 'Profesional CONEXA',
    avatar: candidate.avatar,
    matchScore: match.matchScore,
    trustScore: candidate.trustScore,
    locationApprox: candidate.approxZone || candidate.city || candidate.province,
    isVerified: candidate.isIdentityVerified || candidate.isProfessionalVerified,
    matchReasons: match.matchReasons
  };
}

export function matchOpportunityWithProfessionals(
  users: UserProfile[],
  opportunity: Pick<RadarOpportunity, 'category' | 'subcategory' | 'city' | 'province' | 'neighborhood'>,
  options?: { limit?: number; includeUnavailable?: boolean }
): MatchedProfessional[] {
  return findMatchingProfessionals(users, opportunity, options).map(toMatchedProfessional);
}
