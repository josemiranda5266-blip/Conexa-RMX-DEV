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
  approxZone: string;
  exactAddressPrivate?: string;
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
  isIdentityVerified: boolean;
  identityVerificationStatus: VerificationStatus;
  identityDocUrl?: string;
  isBlocked?: boolean;
  activeMode?: 'CLIENT' | 'PROFESSIONAL';
  hasClientProfile?: boolean;
  hasProfessionalProfile?: boolean;
  workHours?: string;
  isProfessional?: boolean;
  businessName?: string;
  professionId?: string;
  professionName?: string;
  specialties?: string[];
  description?: string;
  workZoneRadiusKm?: number;
  isProfessionalVerified?: boolean;
  professionalVerificationStatus?: VerificationStatus;
  matriculaOrDegree?: string;
  verificationDocUrl?: string;
  rating: number;
  reviewCount: number;
  jobsCompleted: number;
  trustScore: number;
  availabilityStatus: 'DISPONIBLE' | 'OCUPADO' | 'EN_CONSULTA';
  hourlyRateArs?: number;
  servicesOffered?: ServiceItem[];
  portfolioImages?: string[];
  workingHours?: string;
  isProSubscriber?: boolean;
  isFeatured?: boolean;
  isDemoData?: boolean;
}

export interface ServiceItem { id: string; title: string; description: string; approxPriceArs?: number; }
export interface Category { id: string; name: string; iconName: string; description: string; }
export interface Profession { id: string; categoryId: string; name: string; popularSpecialties: string[]; }

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
  isVerifiedJob: boolean;
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
  clientId?: string;
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

export type TransactionStatus =
  | 'CREATED'
  | 'PAYMENT_PENDING'
  | 'CHECKOUT_CREATED'
  | 'PAID'
  | 'SERVICE_IN_PROGRESS'
  | 'SERVICE_COMPLETED'
  | 'SETTLED'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'CHARGEBACK';

export interface Transaction {
  id: string;
  serviceRequestId: string;
  quoteId: string;
  clientId: string;
  professionalId: string;
  amountArs: number;
  currency: 'ARS';
  platformFeePercent: number;
  platformFeeAmountArs: number;
  professionalAmountArs: number;
  paymentProcessingFeeArs?: number;
  netPlatformRevenueArs?: number;
  status: TransactionStatus;
  mercadoPagoPaymentId?: string;
  mercadoPagoPreferenceId?: string;
  mercadoPagoInitPoint?: string | null;
  mercadoPagoSandboxInitPoint?: string | null;
  createdAt: string;
  paidAt?: string;
  completedAt?: string;
  refundedAt?: string;
}

export interface SharedContactState { phoneSharedWithUserIds: string[]; addressSharedWithUserIds: string[]; }

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
  otherUser: { id: string; name: string; avatar: string; profession?: string; isIdentityVerified?: boolean; isProfessionalVerified?: boolean; };
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
  userRole?: Role;
  type: 'IDENTITY' | 'PROFESSIONAL';
  documentName: string;
  documentUrl: string;
  status: VerificationStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewerId?: string;
  rejectionReason?: string;
}
