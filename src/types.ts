export type ProjectCategory = string;

export type ProjectVisibility = 'public' | 'hidden';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface WorkStep {
  id: string;
  name: string;
  status: 'DONE' | 'ACTIVE' | 'NEXT';
  detail?: string;
  image?: string;
  images?: string[];
}

export interface RoomDetail {
  id: string;
  name: string;
  coverUrl: string;
  images: string[];
  description: string;
  detailsList?: string[];
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  scale: string;
  category: ProjectCategory;
  status: 'WIP' | 'Completed' | 'Sold';
  visibility: ProjectVisibility;
  description: string;
  timeSpent?: number;
  createdAt: string;
  completionPercent: number;
  coverUrl: string;
  images: string[];
  worksteps: WorkStep[];
  dimensions?: string;
  materials?: string;
  period?: string;
  inspiration?: string;
  authors?: string[];
  rooms?: RoomDetail[];
  isDemo?: boolean;
}

export interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  projectName: string;
  comment: string;
  createdAt: string;
  status: ReviewStatus;
  moderatedAt?: string;
  moderatedBy?: string;
  isDemo?: boolean;
}

export interface ReviewInput {
  reviewerName: string;
  rating: number;
  projectName: string;
  comment: string;
  workSlug?: string;
}

export type AsyncState = 'idle' | 'working' | 'success' | 'error';

export interface MediaRenditions {
  id: string;
  originalUrl: string;
  displayUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}

export interface PublicProcessImage {
  id: string;
  altText: string;
  caption: string;
  sortOrder: number;
  media: MediaRenditions;
}

export interface PublicProcessPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  publishedAt: string | null;
  work: { title: string; slug: string } | null;
  images: PublicProcessImage[];
  isDevData: boolean;
}

export interface SiteInfo {
  studioName: string;
  studioNameEn: string;
  tagline: string;
  description: string;
  contactName: string;
  phone: string;
  wechat: string;
  email: string;
  privacyNotice: string;
  isDevData: boolean;
}

export interface AuthenticatedUser {
  authenticated: true;
  id: string;
  username: string;
  displayName: string;
  role: 'staff' | 'customer';
  isStaff: boolean;
  mustChangePassword: boolean;
  isDevData: boolean;
}

export type CurrentUser = AuthenticatedUser | { authenticated: false };

export interface CustomerPaymentRecord {
  id: string;
  paymentType: 'deposit' | 'final' | 'refund';
  channel: 'mock';
  amount: string;
  currency: 'CNY' | 'USD';
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  mockTransactionId: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  orderType: string;
  confirmationStatus: 'inquiry' | 'proposed' | 'confirmed' | 'cancelled';
  agreedAmount: string | null;
  currency: 'CNY' | 'USD';
  depositAmount: string;
  finalAmount: string;
  quotedAt: string | null;
  quoteValidUntil: string | null;
  quoteDecision: 'none' | 'pending' | 'accepted' | 'rejected';
  quoteDecisionAt: string | null;
  paymentStatus:
    'unpaid' | 'deposit_pending' | 'deposit_paid' | 'final_pending' | 'paid' | 'cancelled' | 'refunded';
  depositStatus: 'not_recorded' | 'pending' | 'recorded' | 'waived';
  finalPaymentStatus: 'not_recorded' | 'pending' | 'recorded' | 'waived';
  deliveryStatus: 'not_ready' | 'ready' | 'delivered';
  paymentRecords: CustomerPaymentRecord[];
  availableActions: Array<'accept_quote' | 'reject_quote' | 'mock_pay_deposit' | 'mock_pay_final'>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionStage {
  id: string;
  name: string;
  sortOrder: number;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  description: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CustomerProject {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'paused' | 'review' | 'completed' | 'cancelled';
  completionPercent: number;
  nextPlan: string;
  expectedNextUpdateAt: string | null;
  createdAt: string;
  updatedAt: string;
  currentStage: ProductionStage | null;
  manager: { id: string; displayName: string } | null;
  latestUpdate: { id: string; title: string; publishedAt: string | null } | null;
  unreadUpdateCount: number;
  order?: CustomerOrder;
}

export interface ProgressImageItem {
  id: string;
  caption: string;
  altText: string;
  sortOrder: number;
  media: MediaRenditions;
}

export interface ProgressUpdateItem {
  id: string;
  title: string;
  body: string;
  nextPlan: string;
  expectedNextUpdateAt: string | null;
  requiresAcknowledgement: boolean;
  publishedAt: string | null;
  stage: ProductionStage | null;
  author: { id: string; displayName: string };
  images: ProgressImageItem[];
  receipt: { viewedAt: string | null; acknowledgedAt: string | null };
}

export interface ProjectMessageItem {
  id: string;
  body: string;
  parentId: string | null;
  author: { id: string; displayName: string };
  isMine: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface InquiryInput {
  name: string;
  contactType: 'phone' | 'wechat';
  contactValue: string;
  projectType: string;
  scale: string;
  budgetRange: string;
  expectedDeliveryDate: string;
  description: string;
  privacyConsent: boolean;
  attachments: File[];
}
