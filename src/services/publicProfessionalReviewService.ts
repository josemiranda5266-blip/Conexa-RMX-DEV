import {
  collection,
  limit,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type { Review } from '../types';

const MAX_PUBLIC_REVIEWS = 100;

export interface PublicProfessionalReview {
  id: string;
  professionalId: string;
  authorName: string;
  authorAvatar: string;
  createdAt: string;
  comment: string;
  overallRating: number;
  qualityRating: number;
  punctualityRating: number;
  treatmentRating: number;
  priceRating: number;
  complianceRating: number;
  isVerifiedJob: boolean;
}

function toPublicProfessionalReview(review: Review, id: string): PublicProfessionalReview | null {
  if (!review.professionalId || review.isDemoData === true || review.isReported === true) return null;

  return {
    id,
    professionalId: review.professionalId,
    authorName: review.clientName || 'Usuario CONEXA',
    authorAvatar: review.clientAvatar || '',
    createdAt: review.createdAt || '',
    comment: review.comment || '',
    overallRating: Number.isFinite(review.overallRating) ? review.overallRating : 0,
    qualityRating: Number.isFinite(review.qualityRating) ? review.qualityRating : 0,
    punctualityRating: Number.isFinite(review.punctualityRating) ? review.punctualityRating : 0,
    treatmentRating: Number.isFinite(review.treatmentRating) ? review.treatmentRating : 0,
    priceRating: Number.isFinite(review.priceRating) ? review.priceRating : 0,
    complianceRating: Number.isFinite(review.complianceRating) ? review.complianceRating : 0,
    isVerifiedJob: review.isVerifiedJob === true,
  };
}

export function subscribeToPublicProfessionalReviews(
  professionalId: string,
  onData: (reviews: PublicProfessionalReview[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured || !db || !professionalId) {
    onData([]);
    return () => {};
  }

  const reviewsQuery = query(
    collection(db, 'reviews'),
    where('professionalId', '==', professionalId),
    limit(MAX_PUBLIC_REVIEWS),
  );

  return onSnapshot(
    reviewsQuery,
    (snapshot) => {
      const reviews = snapshot.docs
        .map((reviewDoc) => toPublicProfessionalReview(
          reviewDoc.data() as Review,
          reviewDoc.id,
        ))
        .filter((review): review is PublicProfessionalReview => review !== null)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      onData(reviews);
    },
    (error) => onError?.(error as Error),
  );
}
