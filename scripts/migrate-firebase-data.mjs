import { randomUUID } from 'node:crypto';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import {
  buildVisibilityPreflight,
  createRemoteWriteGuard,
  decideProjectVisibility,
  formatVisibilityPreflight,
  isApplyRequested,
} from './migration-visibility.mjs';

const apply = isApplyRequested(process.argv.slice(2));
const writeRemote = createRemoteWriteGuard(apply);
const projectId = process.env.FIREBASE_PROJECT_ID;
const databaseId = process.env.FIREBASE_DATABASE_ID;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

if (!projectId || !storageBucket) {
  throw new Error('必须设置 FIREBASE_PROJECT_ID 和 FIREBASE_STORAGE_BUCKET。');
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId,
  storageBucket,
});
const firestore = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
const bucket = getStorage(app).bucket(storageBucket);

const DEMO_PROJECT_IDS = new Set(['qilou-yanduo', 'shangbu-laojie', 'chaozhou-paifang', 'hanjiang-liaoshe']);
const DEMO_REVIEW_IDS = new Set(['rev-1', 'rev-2', 'rev-3']);
const stats = { projectDocs: 0, reviewDocs: 0, metadataDocs: 0, images: 0 };

function safeSegment(value) {
  const raw = String(value).trim();
  const ascii = raw.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (ascii === raw && ascii) return ascii.slice(0, 100);
  return `${ascii || 'u'}-${Buffer.from(raw, 'utf8').toString('hex')}`.slice(0, 100);
}

function parseDataUrl(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^data:(image\/(?:jpeg|png|webp|gif|avif));base64,(.+)$/s);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

function extensionFor(contentType) {
  return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' }[contentType];
}

async function migrateImage(value, ownerType, ownerId, fieldPath) {
  const parsed = parseDataUrl(value);
  if (!parsed) return { value, asset: null, changed: false };
  stats.images += 1;
  if (!apply) return { value, asset: null, changed: true };

  const token = randomUUID();
  const objectPath = `public/migrated/${safeSegment(ownerType)}/${safeSegment(ownerId)}/${safeSegment(fieldPath)}.${extensionFor(parsed.contentType)}`;
  await writeRemote(() => bucket.file(objectPath).save(parsed.buffer, {
    resumable: false,
    contentType: parsed.contentType,
    metadata: {
      metadata: {
        firebaseStorageDownloadTokens: token,
        migrationSource: fieldPath,
      },
    },
  }));
  const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(storageBucket)}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
  return {
    value: url,
    changed: true,
    asset: {
      url,
      path: objectPath,
      contentType: parsed.contentType,
      size: parsed.buffer.length,
      originalName: `${safeSegment(fieldPath)}.${extensionFor(parsed.contentType)}`,
      uploadedAt: new Date().toISOString(),
    },
  };
}

async function migrateProject(documentSnapshot, hiddenCategories) {
  const original = documentSnapshot.data();
  const next = structuredClone(original);
  const assets = Array.isArray(next.imageAssets) ? [...next.imageAssets] : [];
  let changed = false;

  const migrateField = async (container, key, fieldPath) => {
    const result = await migrateImage(container[key], 'projects', documentSnapshot.id, fieldPath);
    if (result.changed) changed = true;
    if (apply && result.asset) {
      container[key] = result.value;
      assets.push(result.asset);
    }
  };

  await migrateField(next, 'coverUrl', 'cover');
  for (let index = 0; index < (next.images ?? []).length; index += 1) {
    await migrateField(next.images, index, `gallery-${index}`);
  }
  for (let roomIndex = 0; roomIndex < (next.rooms ?? []).length; roomIndex += 1) {
    const room = next.rooms[roomIndex];
    await migrateField(room, 'coverUrl', `room-${room.id ?? roomIndex}-cover`);
    for (let imageIndex = 0; imageIndex < (room.images ?? []).length; imageIndex += 1) {
      await migrateField(room.images, imageIndex, `room-${room.id ?? roomIndex}-image-${imageIndex}`);
    }
  }
  for (let stepIndex = 0; stepIndex < (next.worksteps ?? []).length; stepIndex += 1) {
    const step = next.worksteps[stepIndex];
    await migrateField(step, 'image', `step-${step.id ?? stepIndex}-primary`);
    for (let imageIndex = 0; imageIndex < (step.images ?? []).length; imageIndex += 1) {
      await migrateField(step.images, imageIndex, `step-${step.id ?? stepIndex}-image-${imageIndex}`);
    }
  }

  const visibility = decideProjectVisibility(original, hiddenCategories).targetVisibility;
  if (next.visibility !== visibility) { next.visibility = visibility; changed = true; }
  if (DEMO_PROJECT_IDS.has(documentSnapshot.id) && next.isDemo !== true) { next.isDemo = true; changed = true; }
  if (assets.length > 0) next.imageAssets = Array.from(new Map(assets.map((asset) => [asset.path, asset])).values());

  if (changed) {
    stats.projectDocs += 1;
    if (apply) await writeRemote(() => documentSnapshot.ref.set(next));
  }
}

async function migrateReview(documentSnapshot) {
  const next = { ...documentSnapshot.data() };
  let changed = false;
  const isKnownDemo = DEMO_REVIEW_IDS.has(documentSnapshot.id);
  if (!['pending', 'approved', 'rejected'].includes(next.status)) {
    next.status = isKnownDemo ? 'approved' : 'pending';
    changed = true;
  }
  if (isKnownDemo && next.isDemo !== true) { next.isDemo = true; changed = true; }
  if (changed) {
    stats.reviewDocs += 1;
    if (apply) await writeRemote(() => documentSnapshot.ref.set(next));
  }
}

async function migrateSettings(documentSnapshot) {
  if (!documentSnapshot.exists) return;
  const next = { ...documentSnapshot.data() };
  const result = await migrateImage(next.wechatQrUrl, 'settings', 'studio', 'wechat-qr');
  if (!result.changed) return;
  stats.metadataDocs += 1;
  if (apply && result.asset) {
    next.wechatQrUrl = result.value;
    next.wechatQrAsset = result.asset;
    await writeRemote(() => documentSnapshot.ref.set(next));
  }
}

async function migrateCraftsmen(documentSnapshot) {
  if (!documentSnapshot.exists) return;
  const next = structuredClone(documentSnapshot.data());
  let changed = false;
  for (const [name, profile] of Object.entries(next.profiles ?? {})) {
    const result = await migrateImage(profile.wechatQr, 'craftsmen', name, 'wechat-qr');
    if (result.changed) changed = true;
    if (apply && result.asset) {
      profile.wechatQr = result.value;
      profile.wechatQrAsset = result.asset;
    }
  }
  if (changed) {
    stats.metadataDocs += 1;
    if (apply) await writeRemote(() => documentSnapshot.ref.set(next));
  }
}

const hiddenSnapshot = await firestore.doc('metadata/hiddenCategories').get();
const hiddenCategories = Array.isArray(hiddenSnapshot.data()?.list) ? hiddenSnapshot.data().list : [];
const [projects, reviews, settings, craftsmen] = await Promise.all([
  firestore.collection('projects').get(),
  firestore.collection('reviews').get(),
  firestore.doc('metadata/settings').get(),
  firestore.doc('metadata/craftsmen').get(),
]);

const visibilityPreflight = buildVisibilityPreflight(
  projects.docs.map((documentSnapshot) => ({ id: documentSnapshot.id, data: documentSnapshot.data() })),
  hiddenCategories,
);
console.log(apply
  ? '运行模式：APPLY。检测到明确的 --apply，将在安全预检通过后执行写入。'
  : '运行模式：DRY-RUN。未提供 --apply，不会写入 Firestore 或 Storage。');
console.log(formatVisibilityPreflight(visibilityPreflight));
if (visibilityPreflight.expandsPublicScope.length > 0) {
  throw new Error('安全预检失败：检测到会扩大公开范围的项目，迁移已中止。');
}

for (const documentSnapshot of projects.docs) await migrateProject(documentSnapshot, hiddenCategories);
for (const documentSnapshot of reviews.docs) await migrateReview(documentSnapshot);
await migrateSettings(settings);
await migrateCraftsmen(craftsmen);

console.log(apply ? '迁移已执行。' : '只读预检完成，未写入任何数据。');
console.table(stats);
if (!apply) console.log('确认预检数量后，追加 --apply 执行迁移。请先备份 Firestore。');
