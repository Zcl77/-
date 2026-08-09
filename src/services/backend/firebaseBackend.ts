import { StudioBackend } from './contracts';
import {
  observeAdminAuth,
  signInAsAdmin,
  signOutAdmin,
} from '../firebase/authRepository';
import {
  deleteCategory,
  removeProject,
  renameCategory,
  saveProject,
  setCategoryVisibility,
  subscribeProjects,
} from '../firebase/projectRepository';
import {
  createPendingReview,
  moderateReview,
  removeReview,
  subscribeReviews,
} from '../firebase/reviewRepository';
import {
  saveCategories,
  saveCraftsmenProfiles,
  saveStudioSettings,
  subscribeMetadata,
} from '../firebase/metadataRepository';
import { deleteStoredImage, uploadPublicImage } from '../firebase/storageRepository';

export const firebaseBackend: StudioBackend = {
  provider: 'firebase',
  label: 'Firebase 实时数据',
  content: {
    subscribe(includePrivate, listeners) {
      const subscriptions = [
        subscribeProjects(includePrivate, listeners.onProjects, listeners.onError),
        subscribeReviews(includePrivate, listeners.onReviews, listeners.onError),
        subscribeMetadata(includePrivate, {
          onCategories: listeners.onCategories,
          onHiddenCategories: listeners.onHiddenCategories,
          onCraftsmen: listeners.onCraftsmen,
          onSettings: listeners.onSettings,
          onError: listeners.onError,
        }),
      ];
      return () => subscriptions.forEach((unsubscribe) => unsubscribe());
    },
  },
  projects: {
    save: saveProject,
    remove: removeProject,
  },
  categories: {
    add: (name, categories) => saveCategories([...categories, name]),
    rename: renameCategory,
    remove: deleteCategory,
    setVisibility: setCategoryVisibility,
  },
  progress: {
    save: (project, worksteps, completionPercent) => saveProject({
      ...project,
      worksteps,
      completionPercent,
    }),
  },
  reviews: {
    submit: createPendingReview,
    moderate: moderateReview,
    remove: removeReview,
  },
  settings: {
    saveStudio: saveStudioSettings,
    saveCraftsmen: saveCraftsmenProfiles,
  },
  media: {
    upload: uploadPublicImage,
    remove: deleteStoredImage,
  },
  auth: {
    observe(listener) {
      return observeAdminAuth((snapshot) => listener({
        ...snapshot,
        user: snapshot.user ? {
          id: snapshot.user.uid,
          email: snapshot.user.email ?? undefined,
          displayName: snapshot.user.displayName ?? undefined,
          photoUrl: snapshot.user.photoURL ?? undefined,
        } : null,
      }));
    },
    async signIn() {
      const user = await signInAsAdmin();
      return {
        id: user.uid,
        email: user.email ?? undefined,
        displayName: user.displayName ?? undefined,
        photoUrl: user.photoURL ?? undefined,
      };
    },
    signOut: signOutAdmin,
  },
};
