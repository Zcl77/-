import {
  CraftsmanProfile,
  Project,
  Review,
  ReviewInput,
  ReviewStatus,
  StoredImage,
  StudioSettings,
  WorkStep,
} from '../../types';

export type DataProvider = 'firebase' | 'mock';
export type Unsubscribe = () => void;

export type AdminAuthStatus =
  | 'checking'
  | 'signed-out'
  | 'signing-in'
  | 'authorized'
  | 'forbidden'
  | 'signing-out'
  | 'unavailable'
  | 'error';

export interface AdminIdentity {
  id: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
}

export interface AdminAuthSnapshot {
  status: AdminAuthStatus;
  user: AdminIdentity | null;
  message?: string;
}

export interface UploadDestination {
  scope: 'projects' | 'settings' | 'craftsmen';
  ownerId: string;
  slot: string;
}

export interface ContentListeners {
  onProjects: (projects: Project[]) => void;
  onReviews: (reviews: Review[]) => void;
  onCategories: (categories: string[]) => void;
  onHiddenCategories: (categories: string[]) => void;
  onCraftsmen: (profiles: Record<string, CraftsmanProfile>) => void;
  onSettings: (settings: StudioSettings) => void;
  onError: (error: Error) => void;
}

export interface ContentRepository {
  subscribe(includePrivate: boolean, listeners: ContentListeners): Unsubscribe;
}

export interface ProjectRepository {
  save(project: Project): Promise<void>;
  remove(projectId: string): Promise<void>;
}

export interface CategoryRepository {
  add(name: string, categories: string[]): Promise<void>;
  rename(
    oldName: string,
    newName: string,
    categories: string[],
    hiddenCategories: string[],
    projects: Project[],
  ): Promise<void>;
  remove(
    name: string,
    categories: string[],
    hiddenCategories: string[],
    projects: Project[],
  ): Promise<void>;
  setVisibility(
    hiddenCategories: string[],
    projects: Project[],
    categoryName: string,
    visible: boolean,
  ): Promise<void>;
}

export interface ProgressRepository {
  save(project: Project, worksteps: WorkStep[], completionPercent: number): Promise<void>;
}

export interface ReviewRepository {
  submit(input: ReviewInput): Promise<string>;
  moderate(reviewId: string, status: Exclude<ReviewStatus, 'pending'>): Promise<void>;
  remove(reviewId: string): Promise<void>;
}

export interface SettingsRepository {
  saveStudio(settings: StudioSettings): Promise<void>;
  saveCraftsmen(profiles: Record<string, CraftsmanProfile>): Promise<void>;
}

export interface MediaRepository {
  upload(
    file: File,
    destination: UploadDestination,
    onProgress?: (percent: number) => void,
  ): Promise<StoredImage>;
  remove(asset?: StoredImage): Promise<void>;
}

export interface AuthRepository {
  observe(listener: (snapshot: AdminAuthSnapshot) => void): Unsubscribe;
  signIn(): Promise<AdminIdentity>;
  signOut(): Promise<void>;
}

export interface StudioBackend {
  provider: DataProvider;
  label: string;
  content: ContentRepository;
  projects: ProjectRepository;
  categories: CategoryRepository;
  progress: ProgressRepository;
  reviews: ReviewRepository;
  settings: SettingsRepository;
  media: MediaRepository;
  auth: AuthRepository;
}
