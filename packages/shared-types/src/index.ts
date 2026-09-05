export type Domain = 'CONEXA' | 'NEXORA';
export type ServiceTerminalStatus = 'CLOSED' | 'SETTLED';
export interface CanonicalUser { id: string; email?: string; name?: string; isBlocked?: boolean; hasConexaProfile?: boolean; hasNexoraProfile?: boolean; }
export interface RecentServiceSummary { id: string; status: string; title?: string; completedAt?: string; }
export interface CrossSellOffer { id: string; sourceDomain: Domain; targetDomain: Domain; discountPercent: number; message: string; expiresAt?: string; }
export interface NexoraOrderCompletedEvent { eventId: string; type: 'NEXORA_ORDER_COMPLETED'; occurredAt: string; userId: string; orderId: string; listingIds: string[]; requiresInstallation: boolean; }
export interface ConexaInstallationLead { sourceEventId: string; userId: string; orderId: string; serviceType: 'INSTALLATION'; status: 'NEW'; }
export type TrustLevel = 'Bronce' | 'Plata' | 'Oro' | 'Platino';
export type ProductStatus = 'Disponible' | 'Reservado' | 'Vendido' | 'Pausado';
export type ProductCategory = 'Tecnología' | 'Vehículos' | 'Hogar' | 'Servicios' | 'Moda' | 'Deportes' | 'Mascotas' | 'Inmuebles' | 'Herramientas';
export interface TrustIndex { score: number; level: TrustLevel; stars: number; totalSales: number; totalPurchases: number; completedOpsRate: number; avgResponseTimeMin: number; accountAgeMonths: number; verifiedPhone: boolean; verifiedEmail: boolean; verifiedIdentity: boolean; reportsCount: number; }
export interface NexoraProfile { userId: string; username?: string; phone?: string; avatarUrl?: string; city: string; neighborhood?: string; bio?: string; registrationDate: string; trustIndex: TrustIndex; badges: string[]; shopId?: string; }
export interface ServicePackage { id: string; title: string; price: number; description?: string; imageUrl?: string; }
export interface Listing {
  id: string; sellerId: string; sellerName: string; sellerAvatar?: string; sellerTrustLevel: TrustLevel; sellerStars: number;
  title: string; description: string; price: number; currency: 'ARS'; category: ProductCategory; condition: 'Nuevo' | 'Usado' | 'Reacondicionado'; images: string[];
  city: string; neighborhood?: string; distanceKm?: number; lat?: number; lng?: number; createdAt: string; updatedAt?: string; status: ProductStatus;
  stock?: number; reservedQuantity?: number; reservedByOrderId?: string; reservationExpiresAt?: string;
  qualityScore: number; viewsCount: number; favoritesCount: number; queriesCount: number; featured?: boolean;
  deliveryOption: 'Retiro en persona' | 'Entrega a domicilio' | 'Ambas opciones'; acceptedPaymentMethods: string[];
  suggestedPriceRange?: { min: number; max: number }; serviceProfession?: string; subServices?: ServicePackage[]; requiresInstallation?: boolean;
}
export interface Shop { id: string; ownerId: string; name: string; logoUrl?: string; coverUrl?: string; category: string; description: string; address: string; neighborhood?: string; city: string; hours: string; phone?: string; whatsapp?: string; isAliadoNexora: boolean; stars: number; yearsInNexora: number; catalogCount: number; }
export type NexoraOrderStatus = 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
export interface NexoraOrderItem { listingId: string; quantity: number; unitPrice: number; }
export interface NexoraOrder { id: string; buyerId: string; sellerId: string; items: NexoraOrderItem[]; totalAmount: number; currency: 'ARS'; status: NexoraOrderStatus; requiresInstallation: boolean; paymentTransactionId?: string; createdAt: string; completedAt?: string; }
export type PaymentTransactionStatus = 'PAYMENT_PENDING' | 'PAID' | 'REFUNDED' | 'CHARGEBACK' | 'CANCELLED';
export type RefundRequestStatus = 'NONE' | 'REQUESTED' | 'PROCESSING' | 'CONFIRMED' | 'FAILED';
export interface PaymentTransaction { id: string; domain: Domain; orderId: string; buyerId: string; merchantId: string; amountArs: number; currency: 'ARS'; status: PaymentTransactionStatus; provider: 'MERCADO_PAGO'; providerPaymentId?: string; preferenceId?: string; checkoutUrl?: string; refundStatus?: RefundRequestStatus; refundAmountArs?: number; refundReason?: string; refundRequestedAt?: string; refundConfirmedAt?: string; refundProviderId?: string; paidAt?: string; createdAt: string; updatedAt?: string; refundedAt?: string; chargebackAt?: string; cancelledAt?: string; }
export type EscrowStatus = 'PENDING' | 'HELD' | 'RELEASED' | 'DISPUTED' | 'REFUNDED';
export interface EscrowPayment { id: string; orderId: string; listingId: string; amount: number; currency: 'ARS'; buyerId: string; sellerId: string; paymentMethod: 'CARD' | 'MERCADO_PAGO' | 'TRANSFER'; status: EscrowStatus; deliveryPinHash?: string; createdAt: string; autoReleaseAt: string; releasedAt?: string; disputeReason?: string; }
export type NegotiationStage = 'Consulta' | 'En conversación' | 'Oferta realizada' | 'Oferta aceptada' | 'Encuentro programado' | 'Operación concretada' | 'Cancelada';
export interface Conversation { id: string; listingId: string; buyerId: string; sellerId: string; stage: NegotiationStage; lastMessageText: string; lastMessageTime: string; unreadCountBuyer: number; unreadCountSeller: number; }
export interface Message { id: string; conversationId: string; senderId: string; text: string; timestamp: string; isRead: boolean; imageAttachment?: string; }
export interface NexoraReview { id: string; buyerId: string; sellerId: string; listingId?: string; rating: number; comment: string; date: string; verifiedPurchase?: boolean; isReported?: boolean; }
export interface EventOutboxRecord<TPayload = unknown> { id: string; type: 'NEXORA_ORDER_COMPLETED' | 'CONEXA_SERVICE_CLOSED'; occurredAt: string; producer: Domain; payload: TPayload; status: 'PENDING' | 'PUBLISHED' | 'FAILED'; attempts: number; lastError?: string; }
