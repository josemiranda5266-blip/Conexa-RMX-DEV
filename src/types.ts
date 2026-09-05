export type UserRole = 'CLIENT' | 'PROFESSIONAL' | 'ADMIN';

export interface ProfessionalSpecialty {
  id: string;
  rubroId: string;
  rubroName: string;
  categoryGroup?: string;
  title: string;
  matricula?: string;
  experienceYears?: number;
  description: string;
  photos: string[];
  coverageZone?: string;
  hourlyRateArs?: number;
  featured?: boolean;
  createdAt?: string;
}

export interface User {
  id: string;
  uid?: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  photoURL?: string;
  phone?: string;
  zone?: string;
  isProfessional?: boolean;
  hasProfessionalProfile?: boolean;
  isProfessionalVerified?: boolean;
  pendingVerification?: boolean;
  matricula?: string;
  cuit?: string;
  rubro?: string;
  rating?: number;
  reviewCount?: number;
  bio?: string;
  categories?: string[];
  professions?: ProfessionalSpecialty[];
  mpConnected?: boolean;
  mpAlias?: string;
  mpCvu?: string;
  mpEmail?: string;
  completedJobs?: number;
  createdAt?: any;
  updatedAt?: any;
}

export type RequestStatus =
  | 'PENDING'
  | 'QUOTES_RECEIVED'
  | 'PROFESSIONAL_SELECTED'
  | 'IN_PROGRESS'
  | 'REVIEW_PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CLOSED';

export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

export interface ServiceRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  title: string;
  description: string;
  category: string;
  zone: string;
  address?: string;
  urgency: UrgencyLevel;
  photos?: string[];
  budgetArs?: number;
  quotesCount: number;
  status: RequestStatus;
  assignedProfessionalId?: string;
  assignedQuoteId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  requestId: string;
  clientId?: string;
  professionalId: string;
  professionalName: string;
  professionalAvatar?: string;
  professionalRating?: number;
  professionalVerified?: boolean;
  priceArs: number;
  description: string;
  materialsIncluded?: string;
  estimatedTime?: string;
  availableStartDate?: string;
  warrantyInfo?: string;
  termsAndConditions?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
}

export type TransactionStatus =
  | 'PENDING'
  | 'PAYMENT_HELD'
  | 'SERVICE_COMPLETED'
  | 'RELEASED'
  | 'REFUNDED';

export interface Transaction {
  id: string;
  serviceRequestId: string;
  quoteId?: string;
  clientId: string;
  professionalId: string;
  amountArs: number;
  platformFeeArs: number;
  netProfessionalArs: number;
  status: TransactionStatus;
  paymentMethod?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  serviceRequestId: string;
  professionalId: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export type MessageType = 'TEXT' | 'QUOTE_PROPOSAL' | 'SYSTEM';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  type: MessageType;
  quoteData?: Quote;
  createdAt: string;
}

export interface Conversation {
  id: string;
  serviceRequestId?: string;
  participantIds: string[];
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

export interface CategoryInfo {
  id: string;
  name: string;
  iconName: string;
  description: string;
  popular?: boolean;
  categoryGroup?: string;
  keywords?: string[];
}

export interface RevocationRequest {
  id: string;
  transactionId?: string;
  serviceRequestId?: string;
  clientEmail: string;
  clientName: string;
  reason: string;
  trackingCode: string;
  status: 'PROCESSED' | 'PENDING' | 'REJECTED';
  createdAt: string;
}

export interface ComplaintTicket {
  id: string;
  ticketNumber: string;
  fullName: string;
  dniOrCuit: string;
  email: string;
  phone: string;
  category: 'SERVICE_QUALITY' | 'BILLING' | 'PROFESSIONAL_BEHAVIOR' | 'PLATFORM_FUNCTIONALITY' | 'OTHER';
  description: string;
  requestedResolution: string;
  status: 'RECEIVED' | 'IN_REVIEW' | 'RESOLVED';
  createdAt: string;
}
