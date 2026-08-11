import { ReviewInput } from '../types';
import { createPendingReview } from './firebase/reviewRepository';

export interface ReviewSubmissionGateway {
  submit(input: ReviewInput): Promise<string>;
}

// This direct gateway has no server-side anti-abuse verification. Replace it before a public launch.
export const reviewSubmissionGateway: ReviewSubmissionGateway = {
  submit: createPendingReview,
};

export function submitReview(input: ReviewInput): Promise<string> {
  return reviewSubmissionGateway.submit(input);
}
