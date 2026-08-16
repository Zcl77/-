import { Project } from '../types';
import type { Locale } from '../i18n';

export type GalleryMediaType = 'project-cover' | 'project-image' | 'room-image';

export interface GalleryMediaSelection {
  type: GalleryMediaType;
  imageIndex?: number;
  roomId?: string;
}

export interface GalleryMedia extends GalleryMediaSelection {
  key: string;
  url: string;
  alt: string;
}

export function resolveSelectedProject(
  projects: Project[],
  selectedProjectId: string | null,
): Project | null {
  return projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null;
}

export function listProjectMedia(project: Project | null, locale: Locale = 'zh-CN'): GalleryMedia[] {
  if (!project) return [];

  return [
    {
      key: 'cover',
      url: project.coverUrl,
      alt: locale === 'en' ? `${project.title} cover` : `${project.title} 封面`,
      type: 'project-cover' as const,
    },
    ...project.images.map((url, imageIndex) => ({
      key: `project-${imageIndex}`,
      url,
      alt:
        locale === 'en'
          ? `${project.title} view ${imageIndex + 1}`
          : `${project.title} 作品视角 ${imageIndex + 1}`,
      type: 'project-image' as const,
      imageIndex,
    })),
  ].filter((item) => Boolean(item.url));
}

export function mediaSelection(media: GalleryMedia): GalleryMediaSelection {
  return {
    type: media.type,
    imageIndex: media.imageIndex,
    roomId: media.roomId,
  };
}

export function resolveGalleryMedia(
  project: Project | null,
  selection: GalleryMediaSelection | null,
  locale: Locale = 'zh-CN',
): GalleryMedia | null {
  const projectMedia = listProjectMedia(project, locale);
  if (!project || !selection) return projectMedia[0] ?? null;

  if (selection.type === 'project-cover') {
    return projectMedia.find((item) => item.type === 'project-cover') ?? projectMedia[0] ?? null;
  }

  if (selection.type === 'project-image') {
    return (
      projectMedia.find(
        (item) => item.type === 'project-image' && item.imageIndex === selection.imageIndex,
      ) ??
      projectMedia[0] ??
      null
    );
  }

  const room = project.rooms?.find((item) => item.id === selection.roomId);
  const url = room?.images[selection.imageIndex ?? -1];
  if (!room || !url) return projectMedia[0] ?? null;

  return {
    key: `room-${room.id}-${selection.imageIndex}`,
    url,
    alt:
      locale === 'en'
        ? `${room.name} detail ${(selection.imageIndex ?? 0) + 1}`
        : `${room.name} 细节 ${(selection.imageIndex ?? 0) + 1}`,
    type: 'room-image',
    roomId: room.id,
    imageIndex: selection.imageIndex,
  };
}
