import type { Conversation, Listing, Message, NexoraOrder, NexoraReview, Shop } from '@super-app/shared-types';
import { getIdToken } from './auth';

const API_BASE = (import.meta.env.VITE_NEXORA_API_URL ?? '/api').replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getIdToken();
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Nexora API request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

async function authenticatedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!(await getIdToken())) throw new Error('Debes iniciar sesión para realizar esta acción.');
  return request<T>(path, init);
}

export interface CreateNexoraOrderItem {
  listingId: string;
  quantity: number;
}

export interface CreateNexoraOrderRequest {
  items: CreateNexoraOrderItem[];
  requiresInstallation?: boolean;
}

export const nexoraApi = {
  listListings(limit = 50) { return request<Listing[]>(`/listings?limit=${Math.min(Math.max(limit, 1), 100)}`); },
  getListing(id: string) { return request<Listing>(`/listings/${encodeURIComponent(id)}`); },
  listShops(limit = 50) { return request<Shop[]>(`/shops?limit=${Math.min(Math.max(limit, 1), 100)}`); },
  getShop(id: string) { return request<Shop>(`/shops/${encodeURIComponent(id)}`); },
  listOrders() { return authenticatedRequest<NexoraOrder[]>('/orders'); },
  getOrder(id: string) { return authenticatedRequest<NexoraOrder>(`/orders/${encodeURIComponent(id)}`); },
  createOrder(input: CreateNexoraOrderRequest) { return authenticatedRequest<NexoraOrder>('/orders', { method: 'POST', body: JSON.stringify(input) }); },
  completeOrder(id: string) { return authenticatedRequest<{ order: NexoraOrder; eventId?: string }>(`/orders/${encodeURIComponent(id)}/complete`, { method: 'POST' }); },
  createReview(input: Omit<NexoraReview, 'id' | 'date'>) { return authenticatedRequest<NexoraReview>('/reviews', { method: 'POST', body: JSON.stringify(input) }); },
  listConversations() { return authenticatedRequest<Conversation[]>('/conversations'); },
  createConversation(listingId: string, sellerId: string) {
    return authenticatedRequest<Conversation>('/conversations', { method: 'POST', body: JSON.stringify({ listingId, sellerId }) });
  },
  listMessages(conversationId: string, limit = 50) {
    return authenticatedRequest<Message[]>(`/conversations/${encodeURIComponent(conversationId)}/messages?limit=${Math.min(Math.max(limit, 1), 100)}`);
  },
  sendMessage(conversationId: string, text: string) {
    return authenticatedRequest<Message>(`/conversations/${encodeURIComponent(conversationId)}/messages`, { method: 'POST', body: JSON.stringify({ text }) });
  },
};