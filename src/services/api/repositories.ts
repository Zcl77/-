import {
  AuthenticatedUser,
  CustomerOrder,
  CustomerProject,
  CurrentUser,
  InquiryInput,
  MediaRenditions,
  ProductionStage,
  ProgressUpdateItem,
  Project,
  ProjectMessageItem,
  PublicProcessPost,
  Review,
  ReviewInput,
  RoomDetail,
  SiteInfo,
} from '../../types';
import { apiGetAll, apiRequest } from './client';

interface RawCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface RawWorkImage {
  id: string;
  kind: 'cover' | 'gallery' | 'room';
  alt_text: string;
  caption: string;
  room_name: string;
  sort_order: number;
  focal_x: string;
  focal_y: string;
  media: MediaRenditions;
}

interface RawWork {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  category: RawCategory;
  is_featured: boolean;
  is_dev_data?: boolean;
  scale: string;
  dimensions: string;
  materials: string;
  period: string;
  authors: string;
  completion_percent: number;
  published_at: string;
  cover: RawWorkImage | null;
  images: RawWorkImage[];
}

interface RawProcessPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  published_at: string | null;
  is_dev_data?: boolean;
  work: { title: string; slug: string } | null;
  images: Array<{
    id: string;
    altText: string;
    caption: string;
    sortOrder: number;
    media: MediaRenditions;
  }>;
}

interface RawReview {
  id: string;
  reviewer_name: string;
  project_name: string;
  rating: number;
  comment: string;
  created_at: string;
  is_dev_data?: boolean;
}

interface RawSiteInfo {
  studio_name: string;
  studio_name_en: string;
  tagline: string;
  description: string;
  contact_name: string;
  phone: string;
  wechat: string;
  email: string;
  privacy_notice: string;
  is_dev_data: boolean;
}

interface RawOrder {
  id: string;
  order_number: string;
  order_type: string;
  confirmation_status: CustomerOrder['confirmationStatus'];
  agreed_amount: string | null;
  quoted_at: string | null;
  quote_decision: CustomerOrder['quoteDecision'];
  quote_decision_at: string | null;
  deposit_status: CustomerOrder['depositStatus'];
  final_payment_status: CustomerOrder['finalPaymentStatus'];
  delivery_status: CustomerOrder['deliveryStatus'];
  created_at: string;
  updated_at: string;
}

interface RawStage {
  id: string;
  name: string;
  sort_order: number;
  status: ProductionStage['status'];
  description: string;
  started_at: string | null;
  completed_at: string | null;
}

interface RawProject {
  id: string;
  name: string;
  description: string;
  status: CustomerProject['status'];
  completion_percent: number;
  next_plan: string;
  expected_next_update_at: string | null;
  created_at: string;
  updated_at: string;
  current_stage: RawStage | null;
  manager: { id: string; displayName: string } | null;
  latest_update: { id: string; title: string; publishedAt: string | null } | null;
  unread_update_count: number;
  order?: RawOrder;
}

interface RawProgressUpdate {
  id: string;
  title: string;
  body: string;
  next_plan: string;
  expected_next_update_at: string | null;
  requires_acknowledgement: boolean;
  published_at: string | null;
  stage: RawStage | null;
  author: { id: string; displayName: string };
  images: Array<{
    id: string;
    caption: string;
    alt_text: string;
    sort_order: number;
    media: MediaRenditions;
  }>;
  receipt: { viewedAt: string | null; acknowledgedAt: string | null };
}

interface RawMessage {
  id: string;
  body: string;
  parent_id: string | null;
  author: { id: string; displayName: string };
  is_mine: boolean;
  read_at: string | null;
  created_at: string;
}

function workRooms(images: RawWorkImage[]): RoomDetail[] {
  const grouped = new Map<string, RawWorkImage[]>();
  images
    .filter((image) => image.kind === 'room')
    .forEach((image) => {
      const name = image.room_name || '空间细节';
      grouped.set(name, [...(grouped.get(name) || []), image]);
    });
  return Array.from(grouped.entries()).map(([name, roomImages]) => ({
    id: `${name}-${roomImages[0].id}`,
    name,
    coverUrl: roomImages[0].media.displayUrl,
    images: roomImages.map((image) => image.media.displayUrl),
    description: roomImages
      .map((image) => image.caption)
      .filter(Boolean)
      .join('\n'),
  }));
}

function mapWork(work: RawWork): Project {
  const cover = work.cover || work.images[0] || null;
  const galleryImages = work.images
    .filter((image) => image.kind === 'gallery' && image.id !== cover?.id)
    .map((image) => image.media.displayUrl);
  return {
    id: work.id,
    slug: work.slug,
    title: work.title,
    scale: work.scale,
    category: work.category.name,
    status: work.completion_percent < 100 ? 'WIP' : 'Completed',
    visibility: 'public',
    description: work.description || work.summary,
    createdAt: work.published_at,
    completionPercent: work.completion_percent,
    coverUrl: cover?.media.displayUrl || '',
    images: galleryImages,
    worksteps: [],
    dimensions: work.dimensions || undefined,
    materials: work.materials || undefined,
    period: work.period || undefined,
    authors: work.authors
      .split(/[，,]/)
      .map((name) => name.trim())
      .filter(Boolean),
    rooms: workRooms(work.images),
    isDemo: Boolean(work.is_dev_data),
  };
}

function mapStage(stage: RawStage | null): ProductionStage | null {
  if (!stage) return null;
  return {
    id: stage.id,
    name: stage.name,
    sortOrder: stage.sort_order,
    status: stage.status,
    description: stage.description,
    startedAt: stage.started_at,
    completedAt: stage.completed_at,
  };
}

function mapOrder(order: RawOrder): CustomerOrder {
  return {
    id: order.id,
    orderNumber: order.order_number,
    orderType: order.order_type,
    confirmationStatus: order.confirmation_status,
    agreedAmount: order.agreed_amount,
    quotedAt: order.quoted_at,
    quoteDecision: order.quote_decision,
    quoteDecisionAt: order.quote_decision_at,
    depositStatus: order.deposit_status,
    finalPaymentStatus: order.final_payment_status,
    deliveryStatus: order.delivery_status,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

function mapProject(project: RawProject): CustomerProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    completionPercent: project.completion_percent,
    nextPlan: project.next_plan,
    expectedNextUpdateAt: project.expected_next_update_at,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    currentStage: mapStage(project.current_stage),
    manager: project.manager,
    latestUpdate: project.latest_update,
    unreadUpdateCount: project.unread_update_count,
    order: project.order ? mapOrder(project.order) : undefined,
  };
}

export async function getPublicSiteData() {
  const [site, categories, works, processPosts, reviews] = await Promise.all([
    apiRequest<RawSiteInfo>('/site'),
    apiRequest<RawCategory[]>('/categories'),
    apiGetAll<RawWork>('/works'),
    apiGetAll<RawProcessPost>('/public-process'),
    apiGetAll<RawReview>('/reviews'),
  ]);
  return {
    site: {
      studioName: site.studio_name,
      studioNameEn: site.studio_name_en,
      tagline: site.tagline,
      description: site.description,
      contactName: site.contact_name,
      phone: site.phone,
      wechat: site.wechat,
      email: site.email,
      privacyNotice: site.privacy_notice,
      isDevData: site.is_dev_data,
    } satisfies SiteInfo,
    categories: categories.map((category) => category.name),
    projects: works.map(mapWork),
    processPosts: processPosts.map(
      (post) =>
        ({
          id: post.id,
          title: post.title,
          slug: post.slug,
          summary: post.summary,
          body: post.body,
          publishedAt: post.published_at,
          work: post.work,
          images: post.images,
          isDevData: Boolean(post.is_dev_data),
        }) satisfies PublicProcessPost,
    ),
    reviews: reviews.map(
      (review) =>
        ({
          id: review.id,
          reviewerName: review.reviewer_name,
          projectName: review.project_name,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.created_at,
          status: 'approved',
          isDemo: Boolean(review.is_dev_data),
        }) satisfies Review,
    ),
  };
}

export async function submitReview(input: ReviewInput): Promise<string> {
  const response = await apiRequest<{ id: string; message: string }>('/reviews', {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({
      reviewer_name: input.reviewerName,
      rating: input.rating,
      project_name: input.projectName,
      comment: input.comment,
      ...(input.workSlug ? { work_slug: input.workSlug } : {}),
    }),
  });
  return response.message;
}

export async function submitInquiry(input: InquiryInput): Promise<string> {
  const form = new FormData();
  form.append('name', input.name);
  form.append('contact_type', input.contactType);
  form.append('contact_value', input.contactValue);
  form.append('project_type', input.projectType);
  form.append('scale', input.scale);
  form.append('budget_range', input.budgetRange);
  if (input.expectedDeliveryDate) form.append('expected_delivery_date', input.expectedDeliveryDate);
  form.append('description', input.description);
  form.append('privacy_consent', input.privacyConsent ? 'true' : 'false');
  input.attachments.forEach((file) => form.append('attachments', file));
  const response = await apiRequest<{ id: string; message: string }>('/inquiries', {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: form,
  });
  return response.message;
}

export function getCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>('/auth/me');
}

export function login(username: string, password: string) {
  return apiRequest<{ user: AuthenticatedUser; next: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function logout(): Promise<void> {
  return apiRequest<void>('/auth/logout', { method: 'POST' });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest<{ user: AuthenticatedUser }>('/auth/password/change', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export async function getMyOrders(): Promise<CustomerOrder[]> {
  return (await apiGetAll<RawOrder>('/me/orders')).map(mapOrder);
}

export async function decideQuote(orderId: string, decision: 'accepted' | 'rejected') {
  const response = await apiRequest<{ order: RawOrder; changed: boolean; message: string }>(
    `/me/orders/${orderId}/quote-decision`,
    {
      method: 'POST',
      body: JSON.stringify({ decision }),
    },
  );
  return { order: mapOrder(response.order), changed: response.changed, message: response.message };
}

export async function getMyProjects(): Promise<CustomerProject[]> {
  return (await apiGetAll<RawProject>('/me/projects')).map(mapProject);
}

export async function getMyProject(projectId: string): Promise<CustomerProject> {
  return mapProject(await apiRequest<RawProject>(`/me/projects/${projectId}`));
}

export async function getProjectStages(projectId: string): Promise<ProductionStage[]> {
  return (await apiRequest<RawStage[]>(`/me/projects/${projectId}/stages`)).map((stage) => mapStage(stage)!);
}

export async function getProjectUpdates(projectId: string): Promise<ProgressUpdateItem[]> {
  const updates = await apiGetAll<RawProgressUpdate>(`/me/projects/${projectId}/updates`);
  return updates.map((update) => ({
    id: update.id,
    title: update.title,
    body: update.body,
    nextPlan: update.next_plan,
    expectedNextUpdateAt: update.expected_next_update_at,
    requiresAcknowledgement: update.requires_acknowledgement,
    publishedAt: update.published_at,
    stage: mapStage(update.stage),
    author: update.author,
    images: update.images.map((image) => ({
      id: image.id,
      caption: image.caption,
      altText: image.alt_text,
      sortOrder: image.sort_order,
      media: image.media,
    })),
    receipt: update.receipt,
  }));
}

export async function getProjectMessages(projectId: string): Promise<ProjectMessageItem[]> {
  return (await apiRequest<RawMessage[]>(`/me/projects/${projectId}/messages`)).map((message) => ({
    id: message.id,
    body: message.body,
    parentId: message.parent_id,
    author: message.author,
    isMine: message.is_mine,
    readAt: message.read_at,
    createdAt: message.created_at,
  }));
}

export async function postProjectMessage(projectId: string, body: string, parentId?: string) {
  const message = await apiRequest<RawMessage>(`/me/projects/${projectId}/messages`, {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ body, parent_id: parentId || null }),
  });
  return {
    id: message.id,
    body: message.body,
    parentId: message.parent_id,
    author: message.author,
    isMine: message.is_mine,
    readAt: message.read_at,
    createdAt: message.created_at,
  } satisfies ProjectMessageItem;
}

export function acknowledgeUpdate(projectId: string, updateId: string) {
  return apiRequest<{ viewedAt: string; acknowledgedAt: string }>(
    `/me/projects/${projectId}/updates/${updateId}/acknowledge`,
    { method: 'POST' },
  );
}
