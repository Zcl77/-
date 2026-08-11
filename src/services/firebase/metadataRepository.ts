import { Unsubscribe, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { CraftsmanProfile, StudioSettings } from '../../types';
import { db } from './client';

export interface MetadataListeners {
  onCategories: (value: string[]) => void;
  onHiddenCategories: (value: string[]) => void;
  onCraftsmen: (value: Record<string, CraftsmanProfile>) => void;
  onSettings: (value: StudioSettings) => void;
  onError: (error: Error) => void;
}

export function subscribeMetadata(includePrivate: boolean, listeners: MetadataListeners): Unsubscribe {
  const subscriptions: Unsubscribe[] = [
    onSnapshot(doc(db, 'metadata', 'craftsmen'), (snapshot) => {
      if (snapshot.exists() && snapshot.data().profiles) listeners.onCraftsmen(snapshot.data().profiles);
    }, listeners.onError),
    onSnapshot(doc(db, 'metadata', 'settings'), (snapshot) => {
      if (snapshot.exists()) listeners.onSettings(snapshot.data() as StudioSettings);
    }, listeners.onError),
  ];

  if (includePrivate) {
    subscriptions.push(
      onSnapshot(doc(db, 'metadata', 'categories'), (snapshot) => {
        if (snapshot.exists() && Array.isArray(snapshot.data().list)) listeners.onCategories(snapshot.data().list);
      }, listeners.onError),
      onSnapshot(doc(db, 'metadata', 'hiddenCategories'), (snapshot) => {
        if (snapshot.exists() && Array.isArray(snapshot.data().list)) listeners.onHiddenCategories(snapshot.data().list);
      }, listeners.onError),
    );
  }

  return () => subscriptions.forEach((unsubscribe) => unsubscribe());
}

export function saveCategories(categories: string[]): Promise<void> {
  return setDoc(doc(db, 'metadata', 'categories'), { list: categories });
}

export function saveStudioSettings(settings: StudioSettings): Promise<void> {
  return setDoc(doc(db, 'metadata', 'settings'), settings);
}

export function saveCraftsmenProfiles(profiles: Record<string, CraftsmanProfile>): Promise<void> {
  return setDoc(doc(db, 'metadata', 'craftsmen'), { profiles });
}
