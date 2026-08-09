import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const uid = process.env.FIREBASE_ADMIN_UID;
const projectId = process.env.FIREBASE_PROJECT_ID;
const revoke = process.argv.includes('--revoke');

if (!uid) {
  throw new Error('请先设置 FIREBASE_ADMIN_UID。');
}

const app = initializeApp({
  credential: applicationDefault(),
  ...(projectId ? { projectId } : {}),
});
const adminAuth = getAuth(app);
const user = await adminAuth.getUser(uid);
const currentClaims = user.customClaims ?? {};

if (revoke) {
  const remainingClaims = { ...currentClaims };
  delete remainingClaims.admin;
  await adminAuth.setCustomUserClaims(uid, remainingClaims);
  console.log(`已移除 ${uid} 的 admin Claim。`);
} else {
  await adminAuth.setCustomUserClaims(uid, { ...currentClaims, admin: true });
  console.log(`已为 ${uid} 设置 admin: true。`);
}

console.log('该用户需要重新登录，或强制刷新 ID Token 后才能获得最新 Claim。');
