import type { Listing, Shop } from '@super-app/shared-types';
import { nexoraApi } from './nexoraApi';

export interface NexoraReadModel {
  listings: Listing[];
  shops: Shop[];
}

/**
 * Transitional read path: Firestore/API is authoritative; legacy localStorage
 * remains untouched so rollback is possible while the UI is migrated screen by screen.
 */
export async function loadNexoraReadModel(): Promise<NexoraReadModel> {
  const [listings, shops] = await Promise.all([
    nexoraApi.listListings(),
    nexoraApi.listShops(),
  ]);
  return { listings, shops };
}
