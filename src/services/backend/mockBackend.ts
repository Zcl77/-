import { INITIAL_PROJECTS, INITIAL_REVIEWS } from '../../data';
import { applyProjectVisibility } from '../../domain/visibility';
import { createUniqueId, validateProject, validateReviewInput } from '../../domain/validation';
import { CraftsmanProfile, Project, Review, StudioSettings } from '../../types';
import { ContentListeners, StudioBackend } from './contracts';

const DEFAULT_SETTINGS: StudioSettings = { wechatId: '', wechatQrUrl: '' };

interface MockState {
  projects: Project[];
  reviews: Review[];
  categories: string[];
  hiddenCategories: string[];
  craftsmen: Record<string, CraftsmanProfile>;
  settings: StudioSettings;
}

const state: MockState = {
  projects: structuredClone(INITIAL_PROJECTS),
  reviews: structuredClone(INITIAL_REVIEWS),
  categories: Array.from(new Set(INITIAL_PROJECTS.map((project) => project.category))),
  hiddenCategories: [],
  craftsmen: {},
  settings: DEFAULT_SETTINGS,
};

const listeners = new Set<{ includePrivate: boolean; value: ContentListeners }>();

function visibleProjects(): Project[] {
  return state.projects.filter((project) => project.visibility === 'public');
}

function approvedReviews(): Review[] {
  return state.reviews.filter((review) => review.status === 'approved');
}

function emit(listener: { includePrivate: boolean; value: ContentListeners }): void {
  const { includePrivate, value } = listener;
  value.onProjects(structuredClone(includePrivate ? state.projects : visibleProjects()));
  value.onReviews(structuredClone(includePrivate ? state.reviews : approvedReviews()));
  value.onCategories(structuredClone(includePrivate ? state.categories : []));
  value.onHiddenCategories(structuredClone(includePrivate ? state.hiddenCategories : []));
  value.onCraftsmen(structuredClone(state.craftsmen));
  value.onSettings(structuredClone(state.settings));
}

function emitAll(): void {
  listeners.forEach(emit);
}

export const mockBackend: StudioBackend = {
  provider: 'mock',
  label: '本地演示数据',
  content: {
    subscribe(includePrivate, value) {
      const listener = { includePrivate, value };
      listeners.add(listener);
      queueMicrotask(() => {
        if (listeners.has(listener)) emit(listener);
      });
      return () => listeners.delete(listener);
    },
  },
  projects: {
    async save(project) {
      const errors = validateProject(project);
      if (errors.length > 0) throw new Error(errors.join(' '));
      const index = state.projects.findIndex((item) => item.id === project.id);
      if (index >= 0) state.projects[index] = structuredClone(project);
      else state.projects.unshift(structuredClone(project));
      emitAll();
    },
    async remove(projectId) {
      state.projects = state.projects.filter((project) => project.id !== projectId);
      emitAll();
    },
  },
  categories: {
    async add(name, categories) {
      state.categories = [...categories, name];
      emitAll();
    },
    async rename(oldName, newName, categories, hiddenCategories) {
      state.categories = categories.map((category) => category === oldName ? newName : category);
      state.hiddenCategories = hiddenCategories.map((category) => category === oldName ? newName : category);
      state.projects = state.projects.map((project) => project.category === oldName
        ? applyProjectVisibility({ ...project, category: newName }, state.hiddenCategories)
        : project);
      emitAll();
    },
    async remove(name, categories, hiddenCategories) {
      state.categories = categories.filter((category) => category !== name);
      state.hiddenCategories = hiddenCategories.filter((category) => category !== name);
      state.projects = state.projects.map((project) => project.category === name
        ? { ...project, category: '未分类' }
        : project);
      if (state.projects.some((project) => project.category === '未分类') && !state.categories.includes('未分类')) {
        state.categories.push('未分类');
      }
      emitAll();
    },
    async setVisibility(hiddenCategories, projects, categoryName, visible) {
      state.hiddenCategories = structuredClone(hiddenCategories);
      state.projects = projects.map((project) => project.category === categoryName
        ? { ...project, visibility: visible ? 'public' : 'hidden' }
        : project);
      emitAll();
    },
  },
  progress: {
    async save(project, worksteps, completionPercent) {
      await mockBackend.projects.save({ ...project, worksteps, completionPercent });
    },
  },
  reviews: {
    async submit(input) {
      const errors = validateReviewInput(input);
      if (errors.length > 0) throw new Error(errors.join(' '));
      const id = createUniqueId();
      state.reviews.unshift({
        id,
        reviewerName: input.reviewerName.trim(),
        rating: input.rating,
        projectName: input.projectName.trim(),
        comment: input.comment.trim(),
        createdAt: new Date().toISOString(),
        status: 'pending',
        isDemo: true,
      });
      emitAll();
      return id;
    },
    async moderate(reviewId, status) {
      state.reviews = state.reviews.map((review) => review.id === reviewId ? { ...review, status } : review);
      emitAll();
    },
    async remove(reviewId) {
      state.reviews = state.reviews.filter((review) => review.id !== reviewId);
      emitAll();
    },
  },
  settings: {
    async saveStudio(settings) {
      state.settings = structuredClone(settings);
      emitAll();
    },
    async saveCraftsmen(profiles) {
      state.craftsmen = structuredClone(profiles);
      emitAll();
    },
  },
  media: {
    async upload() {
      throw new Error('本地演示模式不保存媒体文件。请切换到已配置的后端后再上传。');
    },
    async remove() {
      // Mock data never owns persistent media objects.
    },
  },
  auth: {
    observe(listener) {
      let active = true;
      queueMicrotask(() => {
        if (active) {
          listener({
            status: 'unavailable',
            user: null,
            message: '本地演示模式不提供管理员身份。切换到已配置的后端后才能进入后台。',
          });
        }
      });
      return () => {
        active = false;
      };
    },
    async signIn() {
      throw new Error('本地演示模式不提供管理员登录。');
    },
    async signOut() {
      // There is no local authentication session to clear.
    },
  },
};
