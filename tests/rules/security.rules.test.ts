import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { getBytes, listAll, ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'demo-zhixing-studio';
let testEnv: RulesTestEnvironment;

const validProject = {
  title: '测试项目',
  scale: '1:64',
  category: '建筑微缩',
  status: 'WIP',
  visibility: 'public',
  description: '用于规则测试的项目。',
  timeSpent: 1,
  createdAt: '2026-08-06T00:00:00.000Z',
  completionPercent: 10,
  coverUrl: 'https://example.com/test.jpg',
  images: [],
  worksteps: [],
};

const validReview = {
  reviewerName: '访客',
  rating: 5,
  projectName: '测试项目',
  comment: '测试评论',
  createdAt: '2026-08-06T00:00:00.000Z',
  status: 'pending',
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(resolve('firestore.rules'), 'utf8') },
    storage: { rules: readFileSync(resolve('storage.rules'), 'utf8') },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('administrator claims', () => {
  it('rejects a verified Google-style user without admin claim', async () => {
    const normalDb = testEnv.authenticatedContext('normal-user', { email_verified: true }).firestore();
    const forgedDb = testEnv.authenticatedContext('forged-user', { admin: 'true' }).firestore();
    await assertFails(setDoc(doc(normalDb, 'projects', 'normal-write'), validProject));
    await assertFails(setDoc(doc(forgedDb, 'projects', 'forged-write'), validProject));
  });

  it('allows an admin claim to write projects', async () => {
    const adminDb = testEnv.authenticatedContext('admin-user', { admin: true }).firestore();
    await assertSucceeds(setDoc(doc(adminDb, 'projects', 'admin-write'), validProject));
  });
});

describe('project visibility', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'projects', 'public-project'), validProject);
      await setDoc(doc(context.firestore(), 'projects', 'hidden-project'), { ...validProject, visibility: 'hidden' });
    });
  });

  it('allows public reads and denies direct access to hidden projects', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(publicDb, 'projects', 'public-project')));
    await assertFails(getDoc(doc(publicDb, 'projects', 'hidden-project')));
  });

  it('allows a visibility-constrained public query', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDocs(query(collection(publicDb, 'projects'), where('visibility', '==', 'public'))));
    await assertFails(getDocs(collection(publicDb, 'projects')));
  });
});

describe('private category metadata', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'metadata', 'categories'), { list: ['公开分类', '内部分类'] });
      await setDoc(doc(context.firestore(), 'metadata', 'hiddenCategories'), { list: ['内部分类'] });
      await setDoc(doc(context.firestore(), 'metadata', 'settings'), { wechatId: '', wechatQrUrl: '' });
    });
  });

  it('hides category management documents while keeping public settings readable', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore();
    const adminDb = testEnv.authenticatedContext('metadata-admin', { admin: true }).firestore();
    await assertFails(getDoc(doc(publicDb, 'metadata', 'categories')));
    await assertFails(getDoc(doc(publicDb, 'metadata', 'hiddenCategories')));
    await assertSucceeds(getDoc(doc(publicDb, 'metadata', 'settings')));
    await assertSucceeds(getDoc(doc(adminDb, 'metadata', 'hiddenCategories')));
  });
});

describe('review moderation', () => {
  it('accepts only pending, strictly shaped public submissions', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(publicDb, 'reviews', 'valid-review'), validReview));
    await assertFails(setDoc(doc(publicDb, 'reviews', 'fractional-rating'), { ...validReview, rating: 4.5 }));
    await assertFails(setDoc(doc(publicDb, 'reviews', 'extra-field'), { ...validReview, unexpected: true }));
    await assertFails(setDoc(doc(publicDb, 'reviews', 'self-approved'), { ...validReview, status: 'approved' }));
    await assertFails(setDoc(doc(publicDb, 'reviews', 'long-name'), { ...validReview, reviewerName: 'x'.repeat(51) }));
    await assertFails(setDoc(doc(publicDb, 'reviews', 'long-project'), { ...validReview, projectName: 'x'.repeat(121) }));
    await assertFails(setDoc(doc(publicDb, 'reviews', 'long-comment'), { ...validReview, comment: 'x'.repeat(1001) }));
  });

  it('shows only approved reviews to visitors and lets admins moderate', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'reviews', 'pending-review'), validReview);
      await setDoc(doc(context.firestore(), 'reviews', 'approved-review'), { ...validReview, status: 'approved' });
    });
    const publicDb = testEnv.unauthenticatedContext().firestore();
    const adminDb = testEnv.authenticatedContext('admin-user', { admin: true }).firestore();
    await assertFails(getDoc(doc(publicDb, 'reviews', 'pending-review')));
    await assertSucceeds(getDoc(doc(publicDb, 'reviews', 'approved-review')));
    await assertSucceeds(getDocs(query(collection(publicDb, 'reviews'), where('status', '==', 'approved'))));
    await assertFails(getDocs(collection(publicDb, 'reviews')));
    await assertSucceeds(updateDoc(doc(adminDb, 'reviews', 'pending-review'), {
      status: 'approved',
      moderatedAt: '2026-08-06T01:00:00.000Z',
      moderatedBy: 'admin-user',
    }));
  });
});

describe('storage rules', () => {
  it('allows only admins to upload supported public images', async () => {
    const adminStorage = testEnv.authenticatedContext('storage-admin', { admin: true }).storage();
    const normalStorage = testEnv.authenticatedContext('storage-normal', { email_verified: true }).storage();
    const bytes = new Uint8Array([1, 2, 3]);
    await assertSucceeds(uploadBytes(ref(adminStorage, 'public/projects/test/cover/test.png'), bytes, { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(normalStorage, 'public/projects/test/cover/normal.png'), bytes, { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(adminStorage, 'public/projects/test/cover/vector.svg'), bytes, { contentType: 'image/svg+xml' }));
    await assertFails(uploadBytes(
      ref(adminStorage, 'public/projects/test/cover/oversized.jpg'),
      new Uint8Array(10 * 1024 * 1024 + 1),
      { contentType: 'image/jpeg' },
    ));
  });

  it('allows public reads only under the public prefix', async () => {
    const adminStorage = testEnv.authenticatedContext('storage-admin-2', { admin: true }).storage();
    const publicStorage = testEnv.unauthenticatedContext().storage();
    const objectRef = ref(adminStorage, 'public/projects/test/gallery/readable.jpg');
    await uploadBytes(objectRef, new Uint8Array([1, 2, 3]), { contentType: 'image/jpeg' });
    await assertSucceeds(getBytes(ref(publicStorage, 'public/projects/test/gallery/readable.jpg')));
    await assertFails(listAll(ref(publicStorage, 'public')));
    await assertFails(getBytes(ref(publicStorage, 'private/secret.jpg')));
  });
});
