export type Role = 'USER' | 'PROFESSIONAL' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';

export type VerificationStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export type JobStatus = 
  | 'REQUEST_CREATED'
  | 'QUOTES_RECEIVED'
  | 'PROFESSIONAL_SELECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REVIEW_PENDING'
  | 'CLOSED'
  | 'CANCELLED';

export interface LocationData {
  city: string;
  province: string;
  country: string;
  lat: number;
  lng: number;
  approxZone: string; // e.g. "Santiago del Estero - Centro", "Banda Norte"
  exactAddressPrivate?: string; // Strictly confidential, for internal radius calculation
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phonePrivate: string;
  avatar: string;
  role: Role;
  joinedDate: string;
  location: LocationData;
  isIdentityVerified: boolean; // 🟢 Identidad verificada
  identityVerificationStatus: VerificationStatus;
  identityDocUrl?: string;
  isBlocked?: boolean;
  
  // Mode & Capabilities (Unified CONEXA Account)
  activeMode?: 'CLIENT' | 'PROFESSIONAL';
  hasClientProfile?: boolean;
  hasProfessionalProfile?: boolean;
  workHours?: string; // e.g. "Lun - Vie: 08:00 a 18:00"

  // Specific to Professional role
  isProfessional?: boolean;
  businessName?: string;
  professionId?: string;
  professionName?: string;
  specialties?: string[];
  description?: string;
  workZoneRadiusKm?: number; // e.g. 20 km around city
  isProfessionalVerified?: boolean; // 🔵 Profesional verificado
  professionalVerificationStatus?: VerificationStatus;
  matriculaOrDegree?: string;
  verificationDocUrl?: string;
  
  rating: number; // e.g. 4.9
  reviewCount: number; // e.g. 82
  jobsCompleted: number; // e.g. 87
  trustScore: number; // 0 - 100 calculated score
  availabilityStatus: 'DISPONIBLE' | 'OCUPADO' | 'EN_CONSULTA';
  
  hourlyRateArs?: number;
  servicesOffered?: ServiceItem[];
  portfolioImages?: string[];
  workingHours?: string; // e.g. "Lun - Vie 8:00 a 18:00"
  
  isProSubscriber?: boolean; // Subscription badge
  isFeatured?: boolean; // Featured promotion tag
  isDemoData?: boolean; // Tag for demo profiles during Beta
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  approxPriceArs?: number;
}

export interface Category {
  id: string;
  name: string;
  iconName: string;
  description: string;
}

export interface Profession {
  id: string;
  categoryId: string;
  name: string;
  popularSpecialties: string[];
}

export interface Review {
  id: string;
  jobId?: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  professionalId: string;
  createdAt: string;
  comment: string;
  overallRating: number;
  qualityRating: number;
  punctualityRating: number;
  treatmentRating: number;
  priceRating: number;
  complianceRating: number;
  isVerifiedJob: boolean; // Verified interaction on CONEXA
  isReported?: boolean;
  isDemoData?: boolean;
}

export interface ServiceRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  title: string;
  category: string;
  professionName: string;
  description: string;
  images?: string[];
  approxLocation: string;
  preferredDate: string;
  preferredTimeSlot: string;
  estimatedBudgetArs?: number;
  urgency: 'NORMAL' | 'ALTA' | 'URGENTE';
  status: JobStatus;
  createdAt: string;
  quotesCount: number;
  isDemoData?: boolean;
}

export interface Quote {
  id: string;
  requestId: string;
  professionalId: string;
  professionalName: string;
  professionalAvatar: string;
  professionalRating: number;
  professionalVerified: boolean;
  priceArs: number;
  description: string;
  materialsIncluded: string;
  estimatedTime: string;
  availableStartDate: string;
  warrantyInfo: string;
  termsAndConditions: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'MODIFICATION_REQUESTED';
  createdAt: string;
  isDemoData?: boolean;
}

export interface SharedContactState {
  phoneSharedWithUserIds: string[]; // List of user IDs with whom phone was shared
  addressSharedWithUserIds: string[]; // List of user IDs with whom exact address was shared
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  type: 'TEXT' | 'IMAGE' | 'VOICE' | 'SYSTEM' | 'SHARED_PHONE' | 'SHARED_ADDRESS' | 'QUOTE_PROPOSAL';
  content: string;
  attachmentUrl?: string;
  quoteData?: Quote;
}

export interface Conversation {
  id: string;
  participantIds: [string, string];
  otherUser: {
    id: string;
    name: string;
    avatar: string;
    profession?: string;
    isIdentityVerified?: boolean;
    isProfessionalVerified?: boolean;
  };
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  sharedPhoneBySender: boolean;
  sharedPhoneByReceiver: boolean;
  sharedAddressBySender: boolean;
  sharedAddressByReceiver: boolean;
}

export interface UserReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: 'SPAM' | 'ESTAFA' | 'ACOSO' | 'PERFIL_FALSO' | 'SUPLANTACION' | 'INAPROPIADO' | 'OTRO';
  description: string;
  createdAt: string;
  status: 'PENDING' | 'REVIEWED' | 'DISMISSED' | 'ACTION_TAKEN';
  adminNotes?: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: Role;
  type: 'IDENTITY' | 'PROFESSIONAL';
  documentName: string;
  documentUrl: string;
  status: VerificationStatus;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'MESSAGE' | 'REQUEST' | 'QUOTE' | 'VERIFICATION' | 'REVIEW' | 'SYSTEM';
  read: boolean;
  createdAt: string;
  targetId?: string;
}

export interface InviteCode {
  id: string;
  code: string; // e.g. CONEXA-SDE-001
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  userRole: Role;
  isActive: boolean;
  createdAt: string;
  createdForNote?: string;
}

export interface FeedbackItem {
  id: string;
  userId: string;
  userName: string;
  userRole: Role;
  category: 'LIKE' | 'PROBLEM' | 'BUG' | 'SUGGESTION';
  comment: string;
  createdAt: string;
  status: 'NEW' | 'REVIEWED' | 'RESOLVED';
}

export interface AnalyticsEvent {
  id: string;
  eventName: string;
  userId: string;
  timestamp: string;
  context?: Record<string, any>;
}

export interface BetaConfig {
  isBetaActive: boolean;
  requireInviteCode: boolean;
  pilotCity: string; // e.g. "Santiago del Estero"
  allowNewRegistrations: boolean;
}

// ==========================================
// CONEXA RADAR - Demanda & Conversión Types
// ==========================================

export type OpportunityIntent = 'LOW' | 'MEDIUM' | 'HIGH';
export type OpportunityUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
export type OpportunityStatus = 
  | 'NEW'
  | 'ANALYZED'
  | 'QUALIFIED'
  | 'READY_TO_CONTACT'
  | 'CONTACTED'
  | 'RESPONDED'
  | 'REGISTERED'
  | 'MATCHED'
  | 'SERVICE_REQUESTED'
  | 'CONVERTED'
  | 'CLOSED'
  | 'IGNORED';

export type OpportunitySourceType = 
  | 'API_AUTORIZADA'
  | 'WEBHOOK'
  | 'FORMULARIO_CONEXA'
  | 'META_INTEGRATION_OFFICIAL'
  | 'CANAL_PROPIO'
  | 'CAMPAÑA_MARKETING'
  | 'REFERIDOS'
  | 'FUENTE_PUBLICA_PERMITIDA';

export type ContactMethod = 'CANAL_OFICIAL' | 'RESPUESTA_PUBLICA_PERMITIDA' | 'FORMULARIO_LANDING' | 'WHATSAPP_API' | 'EMAIL';

export type ApprovalMode = 'AUTOMÁTICO' | 'ASISTIDO' | 'MANUAL';

export interface MatchedProfessional {
  professionalId: string;
  name: string;
  professionName: string;
  avatar: string;
  matchScore: number; // 0 - 100
  trustScore: number;
  locationApprox: string;
  isVerified: boolean;
  matchReasons: string[];
}

export interface RadarOpportunity {
  id: string;
  source: string; // e.g. "Meta Graph API (Página Oficial)", "Landing Campaña Electricistas", "Webhook N8n"
  sourceType: OpportunitySourceType;
  externalReference?: string;
  category: string;
  subcategory: string;
  description: string;
  city: string;
  province: string;
  neighborhood?: string;
  urgency: OpportunityUrgency;
  intentScore: number; // 0 - 100
  confidenceScore: number; // 0 - 100
  status: OpportunityStatus;
  detectedAt: string;
  lastUpdated: string;
  assignedOperator?: string;
  matchedProfessionals: MatchedProfessional[];
  conversionStatus: 'NOT_STARTED' | 'PENDING' | 'CONVERTED' | 'FAILED';
  consentStatus: 'PENDING_CONSENT' | 'CONSENT_GRANTED' | 'NOT_REQUIRED';
  contactMethod: ContactMethod;
  notes?: string;
  environment?: 'simulation' | 'production';
  is_test?: boolean;
  aiAnalysis: {
    category: string;
    subcategory: string;
    intent: OpportunityIntent;
    urgency: OpportunityUrgency;
    intentScore: number;
    confidenceScore: number;
    spamRiskScore?: number;
    reasoning: string;
    recommendedResponseText?: string;
  };
  attribution?: {
    source: string;
    campaign?: string;
    opportunityId: string;
  };
}

export interface RadarStats {
  totalDetected: number;
  newOpportunities: number;
  highIntentCount: number;
  contactedCount: number;
  convertedUsers: number;
  requestsGenerated: number;
  servicesCompleted: number;
  conversionRate: number; // %
  detectionRatePerDay: number;
  qualificationRate: number; // %
  contactRate: number; // %
  responseRate: number; // %
  registrationRate: number; // %
  matchRate: number; // %
  serviceRequestRate: number; // %
  costPerAcquisitionArs: number;
  revenuePerSourceArs: number;
  byCategory: Record<string, number>;
  byLocation: Record<string, number>;
  bySource: Record<string, number>;
  growthInsights: string[];
}

