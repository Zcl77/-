export type ProjectCategory = string;

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
  name: string; // Room Name (e.g., "1F工夫茶肆")
  coverUrl: string; // Room cover image
  images: string[]; // List of detail shots
  description: string; // Descriptive text
  detailsList?: string[]; // Specific miniature techniques/furniture included
}

export interface Project {
  id: string;
  title: string;
  scale: string;
  category: ProjectCategory;
  status: 'WIP' | 'Completed' | 'Sold';
  description: string;
  timeSpent: number; // in hours
  createdAt: string;
  completionPercent: number; // 0 to 100
  coverUrl: string; // cover image path/URL
  images: string[]; // additional macro shots
  worksteps: WorkStep[];
  
  // Custom masterwork fields
  dimensions?: string; // e.g. "240*60*75 cm"
  materials?: string; // e.g. "pvc (75%), 苯板 (10%), 复合材料 (15%)"
  period?: string; // e.g. "2024/09 —— 2025/06"
  inspiration?: string; // e.g. "揭阳骑楼古城"
  authors?: string[]; // e.g. ["邓政松", "黄铭涛", ...]
  rooms?: RoomDetail[]; // Interface slot for clicking a room image to explore details
}

export interface Review {
  id: string;
  reviewerName: string;
  rating: number; // 1 to 5 stars
  projectName: string; // e.g. "《骑楼·凝固的烟火》" or "工作室总体打分"
  comment: string;
  createdAt: string;
}

export interface CraftsmanProfile {
  name: string;
  wechatId?: string;
  wechatQr?: string; // base64 payload or URL string
}

export interface StudioSettings {
  wechatId: string;
  wechatQrUrl: string; // base64 payload or URL string
}

