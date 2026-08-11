import {
  Unsubscribe,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Review, ReviewInput, ReviewStatus } from '../../types';
import { createUniqueId, validateReviewInput } from '../../domain/validation';
import { auth, db } from './client';

function normalizeReview(id: string, value: Partial<Review>): Review {
  return {
    id,
    reviewerName: value.reviewerName ?? '',
    rating: Number(value.rating ?? 0),
    projectName: value.projectName ?? '',
    comment: value.comment ?? '',
    createdAt: value.createdAt ?? new Date(0).toISOString(),
    status: value.status ?? 'pending',
    moderatedAt: value.moderatedAt,
    moderatedBy: value.moderatedBy,
    isDemo: value.isDemo === true,
  };
}

export function subscribeReviews(
  includeUnapproved: boolean,
  onData: (reviews: Review[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const source = includeUnapproved
    ? collection(db, 'reviews')
    : query(collection(db, 'reviews'), where('status', '==', 'approved'));
  return onSnapshot(
    source,
    (snapshot) => {
      const reviews = snapshot.docs
        .map((item) => normalizeReview(item.id, item.data() as Partial<Review>))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(reviews);
    },
    (error) => onError(error),
  );
}

export async function createPendingReview(input: ReviewInput): Promise<string> {
  const errors = validateReviewInput(input);
  if (errors.length > 0) throw new Error(errors.join(' '));
  const reviewId = createUniqueId();
  await setDoc(doc(db, 'reviews', reviewId), {
    reviewerName: input.reviewerName.trim(),
    rating: input.rating,
    projectName: input.projectName.trim(),
    comment: input.comment.trim(),
    createdAt: new Date().toISOString(),
    status: 'pending',
  });
  return reviewId;
}

export async function moderateReview(reviewId: string, status: Exclude<ReviewStatus, 'pending'>): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('管理员登录已失效，请重新登录。');
  await updateDoc(doc(db, 'reviews', reviewId), {
    status,
    moderatedAt: new Date().toISOString(),
    moderatedBy: user.uid,
  });
}

export async function removeReview(reviewId: string): Promise<void> {
  await deleteDoc(doc(db, 'reviews', reviewId));
}
