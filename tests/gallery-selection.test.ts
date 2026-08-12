import { describe, expect, it } from 'vitest';
import {
  listProjectMedia,
  resolveGalleryMedia,
  resolveSelectedProject,
} from '../src/domain/gallerySelection';
import { Project } from '../src/types';

function createProject(id: string, overrides: Partial<Project> = {}): Project {
  return {
    id,
    title: `作品 ${id}`,
    scale: '1:64',
    category: '建筑微缩',
    status: 'WIP',
    visibility: 'public',
    description: '原始说明',
    timeSpent: 10,
    createdAt: '2026-08-06T00:00:00.000Z',
    completionPercent: 20,
    coverUrl: `https://example.com/${id}/cover-old.jpg`,
    images: [`https://example.com/${id}/detail-old.jpg`],
    worksteps: [],
    ...overrides,
  };
}

describe('gallery selection reconciliation', () => {
  it('uses the latest text for the currently selected project with the same ID', () => {
    const updated = createProject('selected', { title: '更新后的标题', description: '更新后的说明' });

    const selected = resolveSelectedProject([updated], 'selected');

    expect(selected).toBe(updated);
    expect(selected?.title).toBe('更新后的标题');
    expect(selected?.description).toBe('更新后的说明');
  });

  it('uses the latest image URL while preserving the selected image position', () => {
    const updated = createProject('selected', {
      coverUrl: 'https://example.com/selected/cover-new.jpg',
      images: ['https://example.com/selected/detail-new.jpg'],
    });

    expect(resolveGalleryMedia(updated, { type: 'project-cover' })?.url).toBe(updated.coverUrl);
    expect(resolveGalleryMedia(updated, { type: 'project-image', imageIndex: 0 })?.url).toBe(
      updated.images[0],
    );
  });

  it('falls back safely when the selected project is hidden or deleted', () => {
    const fallback = createProject('fallback');

    expect(resolveSelectedProject([fallback], 'removed')?.id).toBe('fallback');
    expect(resolveSelectedProject([], 'removed')).toBeNull();
  });

  it('shows the correct content after selecting another project', () => {
    const first = createProject('first');
    const second = createProject('second', { title: '第二件作品' });

    expect(resolveSelectedProject([first, second], 'second')).toBe(second);
    expect(resolveGalleryMedia(second, null)?.url).toBe(second.coverUrl);
  });

  it('falls back to current cover media when a selected image is removed', () => {
    const updated = createProject('selected', { images: [] });

    expect(resolveGalleryMedia(updated, { type: 'project-image', imageIndex: 0 })?.url).toBe(
      updated.coverUrl,
    );
  });

  it('does not mutate the project list used by the gallery, details, or admin editor', () => {
    const projects = [createProject('first'), createProject('second')];
    const snapshot = structuredClone(projects);

    resolveSelectedProject(projects, 'second');
    listProjectMedia(projects[1]);

    expect(projects).toEqual(snapshot);
  });
});
