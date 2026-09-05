import type { Listing, NexoraOrder, NexoraReview, Shop } from '@super-app/shared-types';

const API_BASE = (import.meta.env.VITE_NEXORA_API_URL ?? '/api').replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Nexora API request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const nexoraApi = {
  listListings(limit = 50) {
    return request<Listing[]>(`/listings?limit=${Math.min(Math.max(limit, 1), 100)}`);
  },
  getListing(id: string) {
    return request<Listing>(`/listings/${encodeURIComponent(id)}`);
  },
  listShops(limit = 50) {
    return request<Shop[]>(`/shops?limit=${Math.min(Math.max(limit, 1), 100)}`);
  },
  getShop(id: string) {
    return request<Shop>(`/shops/${encodeURIComponent(id)}`);
  },
  listOrders() {
    return request<NexoraOrder[]>('/orders');
  },
  getOrder(id: string) {
    return request<NexoraOrder>(`/orders/${encodeURIComponent(id)}`);
  },
  createOrder(input: Omit<NexoraOrder, 'id' | 'createdAt' | 'status'>) {
    return request<NexoraOrder>('/orders', { method: 'POST', body: JSON.stringify(input) });
  },
  completeOrder(id: string) {
    return request<{ order: NexoraOrder; eventId: string }>(`/orders/${encodeURIComponent(id)}/complete`, { method: 'POST' });
  },
  createReview(input: Omit<NexoraReview, 'id' | 'date'>) {
    return request<NexoraReview>('/reviews', { method: 'POST', body: JSON.stringify(input) });
  },
};
