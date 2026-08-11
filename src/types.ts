export type ProjectCategory = string;

export type ProjectVisibility = 'public' | 'hidden';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface StoredImage {
  url: string;
  path: string;
  contentType: string;
  size: number;
  originalName: string;
  uploadedAt: string;
}

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
  title: string;
  scale: string;
  category: ProjectCategory;
  status: 'WIP' | 'Completed' | 'Sold';
  visibility: ProjectVisibility;
  description: string;
  timeSpent: number;
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
  imageAssets?: StoredImage[];
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
}

export interface CraftsmanProfile {
  name: string;
  wechatId?: string;
  wechatQr?: string;
  wechatQrAsset?: StoredImage;
}

export interface StudioSettings {
  wechatId: string;
  wechatQrUrl: string;
  wechatQrAsset?: StoredImage;
}

export interface ImageEditContext {
  type: 'project-cover' | 'project-image' | 'room-cover' | 'room-image' | 'craftsman-qr' | 'master-qr';
  projectId?: string;
  imageIndex?: number;
  roomId?: string;
  craftsmanName?: string;
}

export type AsyncState = 'idle' | 'working' | 'success' | 'error';
