import {
  Unsubscribe,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Project } from '../../types';
import { applyProjectVisibility } from '../../domain/visibility';
import { validateProject } from '../../domain/validation';
import { db } from './client';

function normalizeProject(id: string, value: Partial<Project>): Project {
  return {
    id,
    title: value.title ?? '',
    scale: value.scale ?? '',
    category: value.category ?? '未分类',
    status: value.status ?? 'WIP',
    visibility: value.visibility === 'public' ? 'public' : 'hidden',
    description: value.description ?? '',
    timeSpent: Number(value.timeSpent ?? 0),
    createdAt: value.createdAt ?? new Date(0).toISOString(),
    completionPercent: Number(value.completionPercent ?? 0),
    coverUrl: value.coverUrl ?? '',
    images: Array.isArray(value.images) ? value.images : [],
    worksteps: Array.isArray(value.worksteps) ? value.worksteps : [],
    dimensions: value.dimensions,
    materials: value.materials,
    period: value.period,
    inspiration: value.inspiration,
    authors: Array.isArray(value.authors) ? value.authors : undefined,
    rooms: Array.isArray(value.rooms) ? value.rooms : undefined,
    imageAssets: Array.isArray(value.imageAssets) ? value.imageAssets : undefined,
    isDemo: value.isDemo === true,
  };
}

function toProjectDocument(project: Project): Omit<Project, 'id'> {
  const { id: _id, ...document } = project;
  return document;
}

export function subscribeProjects(
  includeHidden: boolean,
  onData: (projects: Project[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const source = includeHidden
    ? collection(db, 'projects')
    : query(collection(db, 'projects'), where('visibility', '==', 'public'));

  return onSnapshot(
    source,
    (snapshot) => {
      const projects = snapshot.docs
        .map((item) => normalizeProject(item.id, item.data() as Partial<Project>))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(projects);
    },
    (error) => onError(error),
  );
}

export async function saveProject(project: Project): Promise<void> {
  const errors = validateProject(project);
  if (errors.length > 0) throw new Error(errors.join(' '));
  await setDoc(doc(db, 'projects', project.id), toProjectDocument(project));
}

export async function removeProject(projectId: string): Promise<void> {
  await deleteDoc(doc(db, 'projects', projectId));
}

export async function setCategoryVisibility(
  hiddenCategories: string[],
  projects: Project[],
  categoryName: string,
  visible: boolean,
): Promise<void> {
  const nextVisibility: Project['visibility'] = visible ? 'public' : 'hidden';
  const updates = projects
    .filter((project) => project.category === categoryName && project.visibility !== nextVisibility)
    .map((project) => ({ ...project, visibility: nextVisibility }));
  if (updates.length > 499) throw new Error('受影响项目超过单次原子更新上限，请先执行分批迁移。');
  const batch = writeBatch(db);
  batch.set(doc(db, 'metadata', 'hiddenCategories'), { list: hiddenCategories });
  updates.forEach((project) => {
    batch.update(doc(db, 'projects', project.id), { visibility: project.visibility });
  });
  await batch.commit();
}

export async function renameCategory(
  oldName: string,
  newName: string,
  categories: string[],
  hiddenCategories: string[],
  projects: Project[],
): Promise<void> {
  const affected = projects.filter((project) => project.category === oldName);
  if (affected.length > 498) throw new Error('受影响项目过多，无法在一次原子操作中完成重命名。');

  const nextCategories = categories.map((category) => (category === oldName ? newName : category));
  const nextHidden = hiddenCategories.map((category) => (category === oldName ? newName : category));
  const batch = writeBatch(db);
  batch.set(doc(db, 'metadata', 'categories'), { list: nextCategories });
  batch.set(doc(db, 'metadata', 'hiddenCategories'), { list: nextHidden });
  affected.forEach((project) => {
    const updated = applyProjectVisibility({ ...project, category: newName }, nextHidden);
    batch.update(doc(db, 'projects', project.id), {
      category: updated.category,
      visibility: updated.visibility,
    });
  });
  await batch.commit();
}

export async function deleteCategory(
  categoryToDelete: string,
  categories: string[],
  hiddenCategories: string[],
  projects: Project[],
): Promise<void> {
  const affected = projects.filter((project) => project.category === categoryToDelete);
  if (affected.length > 498) throw new Error('受影响项目过多，无法在一次原子操作中完成分类删除。');

  const remainingCategories = categories.filter((category) => category !== categoryToDelete);
  const nextCategories = affected.length > 0 && !remainingCategories.includes('未分类')
    ? [...remainingCategories, '未分类']
    : remainingCategories;
  const nextHidden = hiddenCategories.filter((category) => category !== categoryToDelete);
  const batch = writeBatch(db);
  batch.set(doc(db, 'metadata', 'categories'), { list: nextCategories });
  batch.set(doc(db, 'metadata', 'hiddenCategories'), { list: nextHidden });
  affected.forEach((project) => {
    const updated = {
      ...project,
      category: '未分类',
      visibility: hiddenCategories.includes(categoryToDelete) ? 'hidden' : project.visibility,
    } as Project;
    batch.update(doc(db, 'projects', project.id), {
      category: updated.category,
      visibility: updated.visibility,
    });
  });
  await batch.commit();
}
