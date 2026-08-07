import { Project } from '../types';

export function applyProjectVisibility(project: Project, hiddenCategories: string[]): Project {
  return {
    ...project,
    visibility: hiddenCategories.includes(project.category) ? 'hidden' : project.visibility,
  };
}

export function getPublicProjects(projects: Project[], hiddenCategories: string[]): Project[] {
  return projects.filter(
    (project) => project.visibility === 'public' && !hiddenCategories.includes(project.category),
  );
}

export function referencedImageUrls(project: Project): Set<string> {
  const urls = new Set<string>();
  const add = (value?: string) => {
    if (value) urls.add(value);
  };

  add(project.coverUrl);
  project.images.forEach(add);
  project.worksteps.forEach((step) => {
    add(step.image);
    step.images?.forEach(add);
  });
  project.rooms?.forEach((room) => {
    add(room.coverUrl);
    room.images.forEach(add);
  });
  return urls;
}

export function retainReferencedAssets(project: Project): Project {
  const urls = referencedImageUrls(project);
  return {
    ...project,
    imageAssets: project.imageAssets?.filter((asset) => urls.has(asset.url)),
  };
}
