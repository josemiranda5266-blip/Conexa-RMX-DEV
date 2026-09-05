export type Domain = 'CONEXA' | 'NEXORA';

export type ServiceTerminalStatus = 'CLOSED' | 'SETTLED';

export interface CanonicalUser {
  id: string;
  email?: string;
  name?: string;
  isBlocked?: boolean;
  hasConexaProfile?: boolean;
  hasNexoraProfile?: boolean;
}

export interface RecentServiceSummary {
  id: string;
  status: string;
  title?: string;
  completedAt?: string;
}

export interface CrossSellOffer {
  id: string;
  sourceDomain: Domain;
  targetDomain: Domain;
  discountPercent: number;
  message: string;
  expiresAt?: string;
}

export interface NexoraOrderCompletedEvent {
  eventId: string;
  type: 'NEXORA_ORDER_COMPLETED';
  occurredAt: string;
  userId: string;
  orderId: string;
  listingIds: string[];
  requiresInstallation: boolean;
}

export interface ConexaInstallationLead {
  sourceEventId: string;
  userId: string;
  orderId: string;
  serviceType: 'INSTALLATION';
  status: 'NEW';
}
