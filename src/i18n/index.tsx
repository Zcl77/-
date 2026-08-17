import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../services/api/client';
import { createLocaleTransitionController, LocaleTransitionPhase } from './localeTransition';

export type Locale = 'zh-CN' | 'en';
const STORAGE_KEY = 'zhixing.locale';

const en: Record<string, string> = {
  知行造境: 'Zhixing Studio',
  语言切换: 'Language switcher',
  切换到简体中文: 'Switch to Simplified Chinese',
  切换到英文: 'Switch to English',
  封面缩略图: 'Cover thumbnail',
  '视角 {index} 缩略图': 'View {index} thumbnail',
  '{name} 空间图': '{name} room image',
  '{count} 张细节图': '{count} detail images',
  '{name} 细节 {index}': '{name} detail {index}',
  '公开内容加载失败。': 'Could not load public content.',
  '登录状态检查失败。': 'Could not check the sign-in session.',
  '项目列表加载失败。': 'Could not load the project list.',
  '报价决定未能提交。': 'The quote decision could not be submitted.',
  '本地模拟付款未能完成。': 'The local mock payment could not be completed.',
  '退出登录失败，请重试。': 'Could not sign out. Please try again.',
  '项目内容加载失败。': 'Could not load the project details.',
  '留言发送失败。': 'Could not send the message.',
  '确认失败，请稍后重试。': 'Could not record the acknowledgement. Please try again.',
  '登录失败，请稍后重试。': 'Could not sign in. Please try again.',
  '密码修改失败。': 'Could not change the password.',
  '请填写昵称。': 'Enter a name or nickname.',
  '昵称不能超过 80 个字符。': 'The name or nickname must be 80 characters or fewer.',
  '评分必须是 1–5 的整数。': 'The rating must be a whole number from 1 to 5.',
  '请选择评鉴对象。': 'Select a review subject.',
  '项目名称不能超过 160 个字符。': 'The project name must be 160 characters or fewer.',
  '请填写评鉴内容。': 'Enter the review.',
  '评鉴内容不能超过 2000 个字符。': 'The review must be 2,000 characters or fewer.',
  '仅支持 JPEG、PNG 或 WebP 图片。': 'Only JPEG, PNG, or WebP images are supported.',
  '图片文件为空。': 'The image file is empty.',
  '图片不能超过 15 MB。': 'Images must not exceed 15 MB.',
  工作室联系信息: 'Studio contact',
  项目询价: 'Project inquiry',
  真实评价: 'Verified review',
  仅显示已审核: 'Approved only',
  微缩建筑作品档案: 'Miniature architecture archive',
  当前作品: 'Selected work',
  作品说明: 'Project narrative',
  空间细节: 'Spatial details',
  当前空间: 'Selected room',
  私人项目访问: 'Private project access',
  首次登录: 'First sign in',
  已登录: 'Signed in',
  客户私人项目: 'Private client project',
  中文: '中文',
  EN: 'EN',
  作品: 'Works',
  作品展厅: 'Portfolio',
  制作: 'Process',
  公开制作日志: 'Public Process',
  询价: 'Inquiry',
  询价与评价: 'Inquiry & Reviews',
  我的项目: 'My Projects',
  客户登录: 'Client Login',
  客户项目中心: 'Client Portal',
  返回知行造境作品展厅: 'Return to the Zhixing Studio portfolio',
  主要导航: 'Main navigation',
  移动端主要导航: 'Mobile navigation',
  微缩建筑: 'Architectural miniatures',
  与场景制作: '& scene making',
  正在读取网站内容: 'Loading site content',
  '正在从本地 Django 服务读取公开作品、制作日志与已审核评价。':
    'Loading public works, process posts, and moderated reviews from the local Django service.',
  网站内容加载失败: 'Could not load site content',
  重新加载: 'Reload',
  作品不存在或尚未公开: 'This work does not exist or is not public',
  正在检查登录状态: 'Checking sign-in status',
  '正在恢复安全会话。': 'Restoring the secure session.',
  登录服务暂时不可用: 'Sign-in service is temporarily unavailable',
  重试: 'Retry',
  自动同步暂时中断: 'Automatic sync is temporarily interrupted',
  立即重试: 'Retry now',
  页面不存在: 'Page not found',
  '链接可能已经变更，或内容当前不可公开访问。':
    'The link may have changed, or the content is not publicly available.',
  返回作品展厅: 'Return to portfolio',
  全部作品: 'All works',
  当前分类暂无可公开展示的作品: 'No public works in this category',
  '隐藏分类和隐藏作品不会出现在访客页面。可以返回全部作品继续浏览。':
    'Hidden categories and works are never shown to visitors. Return to all works to continue browsing.',
  查看全部作品: 'View all works',
  查看完整图: 'View full image',
  上一张: 'Previous',
  下一张: 'Next',
  封面: 'Cover',
  制作中: 'In progress',
  已完成: 'Completed',
  已售出: 'Sold',
  演示内容: 'Demo content',
  本地开发数据: 'Local development data',
  制作耗时: 'Production time',
  小时: 'hours',
  完成比例: 'Completion',
  背景与工艺说明: 'Background & craft notes',
  作品规格: 'Specifications',
  空间体量: 'Dimensions',
  制作周期: 'Production period',
  灵感来源: 'Inspiration',
  主要材料: 'Materials',
  参与成员: 'Contributors',
  房间与细部: 'Rooms & details',
  '选择空间查看说明；必要信息始终可见，触屏设备无需依赖悬浮。':
    'Select a room for details. Essential information remains visible without hover.',
  收起: 'Collapse',
  查看细节: 'View details',
  细节图片: 'Detail images',
  作品索引: 'Work index',
  比例待补充: 'Scale pending',
  '记录可以公开分享的工艺、材料与制作过程。客户订单的私人进度只在登录后的“我的项目”中显示。':
    'Publicly shareable craft, materials, and production notes. Private order progress is shown only in My Projects after sign-in.',
  尚无公开制作日志: 'No public process posts yet',
  '工作室发布真实过程记录后会显示在这里；不会用虚构进度填充页面。':
    'Real process records will appear here when published; fabricated progress is never used.',
  制作日志索引: 'Process post index',
  日志索引: 'Post index',
  本篇日志未附过程图片: 'No process images were attached to this post',
  '询价提交失败，请稍后重试。': 'The inquiry could not be submitted. Please try again.',
  '参考图片最多选择 5 张。': 'Select at most five reference images.',
  工作室总体评价: 'Studio review',
  '评价提交失败，请稍后重试。': 'The review could not be submitted. Please try again.',
  联系人: 'Contact',
  微信: 'WeChat',
  电话: 'Phone',
  邮箱: 'Email',
  '提交制作需求，或分享真实合作体验。评价审核通过后才会公开。':
    'Submit a production inquiry or share a genuine collaboration experience. Reviews are public only after moderation.',
  平均评分: 'Average rating',
  公开评价: 'Public reviews',
  条: 'reviews',
  联系工作室: 'Contact the studio',
  '可通过下方询价表说明模型类型、比例、预算和期望交付时间。':
    'Use the inquiry form to describe the model type, scale, budget, and desired delivery date.',
  提交制作需求: 'Submit an inquiry',
  询价未提交: 'Inquiry not submitted',
  询价已提交: 'Inquiry submitted',
  '工作室会按您留下的方式联系；第一版不会自动发送短信或微信消息。':
    'The studio will contact you using the details provided. This version sends no automated SMS or WeChat messages.',
  '姓名 *': 'Name *',
  '项目类型 *': 'Project type *',
  '例如：建筑微缩模型': 'Example: architectural miniature',
  联系方式: 'Contact method',
  手机号: 'Phone number',
  '号码或微信号 *': 'Phone number or WeChat ID *',
  模型比例: 'Model scale',
  '例如 1:50': 'Example: 1:50',
  预算范围: 'Budget range',
  期望交付: 'Desired delivery',
  '需求说明 *': 'Requirements *',
  '请说明尺寸、场景、用途、材料偏好和时间要求。':
    'Describe dimensions, scene, purpose, material preferences, and timing.',
  '参考图片（最多 5 张，每张不超过 15 MB）': 'Reference images (up to 5, 15 MB each)',
  选择图片: 'Select images',
  '我同意工作室仅为处理本次询价使用所提交的联系方式和参考资料。':
    'I agree that the studio may use the submitted contact details and references only to process this inquiry.',
  正在安全上传并提交: 'Uploading and submitting securely',
  提交询价: 'Submit inquiry',
  提交真实评价: 'Submit a genuine review',
  '请只提交真实体验。内容默认待审核，不会自动公开。':
    'Submit only genuine experiences. Reviews require moderation and are never published automatically.',
  评价未提交: 'Review not submitted',
  评价已提交: 'Review submitted',
  '审核通过后才会出现在公开列表。': 'It will appear publicly only after approval.',
  '评分 *': 'Rating *',
  评价对象: 'Review subject',
  '姓名或昵称 *': 'Name or nickname *',
  '评价内容 *': 'Review *',
  正在提交: 'Submitting',
  提交待审核评价: 'Submit for moderation',
  已审核评价: 'Approved reviews',
  暂无已审核评价: 'No approved reviews yet',
  '不会用演示评价或虚构反馈填充这里。': 'Demo reviews and fabricated feedback are never used here.',
  客户项目登录: 'Client project sign-in',
  '登录后只显示工作室明确绑定给您的订单、制作阶段、私人图片和留言。':
    'After sign-in, only orders, stages, private images, and messages explicitly assigned to you are shown.',
  '账号由工作室创建并线下交付。本站不使用 Google 登录，也不会在浏览器长期保存登录令牌。':
    'Accounts are created by the studio and delivered offline. This site does not use Google sign-in or persist login tokens in the browser.',
  登录未完成: 'Sign-in incomplete',
  用户名: 'Username',
  '用户名最多 18 个字符。': 'Usernames are limited to 18 characters.',
  密码: 'Password',
  正在安全登录: 'Signing in securely',
  登录我的项目: 'Sign in to My Projects',
  退出登录: 'Sign out',
  正在退出: 'Signing out',
  报价与订单: 'Quotes & orders',
  付款记录: 'Payment records',
  订单总额: 'Order total',
  订单编号: 'Order number',
  订单类型: 'Order type',
  币种: 'Currency',
  定金金额: 'Deposit amount',
  尾款金额: 'Final payment amount',
  报价有效期: 'Quote valid until',
  报价决定: 'Quote decision',
  定金状态: 'Deposit status',
  尾款状态: 'Final payment status',
  付款状态: 'Payment status',
  交付: 'Delivery',
  未付款: 'Unpaid',
  定金待支付: 'Deposit pending',
  定金已支付: 'Deposit paid',
  尾款待支付: 'Final payment pending',
  已付清: 'Paid in full',
  已取消: 'Cancelled',
  已退款: 'Refunded',
  定金: 'Deposit',
  尾款: 'Final payment',
  退款: 'Refund',
  成功: 'Succeeded',
  本地模拟: 'Local mock',
  接受报价: 'Accept quote',
  拒绝报价: 'Reject quote',
  '本地测试 / 模拟支付定金': 'Local test / mock deposit',
  '本地测试 / 模拟支付尾款': 'Local test / mock final payment',
  '本地测试功能：不会发起真实扣款，也不连接任何支付渠道。':
    'Local testing only: no real charge or payment provider connection is made.',
  付款记录摘要: 'Payment summary',
  制作阶段: 'Production stage',
  项目详情: 'Project details',
  返回我的项目: 'Back to My Projects',
  项目留言: 'Project messages',
  发送留言: 'Send message',
  页面可见时自动同步: 'Syncs while this page is visible',
  操作未完成: 'Action incomplete',
  暂未设置: 'Not set',
  未关联: 'Not linked',
  待报价: 'Quote pending',
  待支付: 'Pending',
  已确认: 'Confirmed',
  无需收取: 'Waived',
  未记录: 'Not recorded',
  '登录状态已过期，请重新登录。': 'Your session has expired. Please sign in again.',
  '当前账号没有执行此操作的权限，或安全校验已过期。':
    'This account is not allowed to perform the action, or the security check expired.',
  '请求的内容不存在，或当前账号无权查看。': 'The content does not exist or this account cannot access it.',
  '操作过于频繁，请稍后再试。': 'Too many requests. Please try again later.',
  '网站服务暂时不可用，请稍后重试。': 'The service is temporarily unavailable. Please try again later.',
  '无法连接网站服务，请检查网络后重试。':
    'Could not connect to the service. Check your network and try again.',
  '无法建立安全会话，请刷新页面后重试。': 'Could not establish a secure session. Refresh and try again.',
  图片暂不可用: 'Image unavailable',
  关闭图片预览: 'Close image preview',
  上一张图片: 'Previous image',
  下一张图片: 'Next image',
  页面暂时无法继续显示: 'This page cannot continue rendering',
  '已保留当前服务状态。重新载入页面后可以再次尝试。':
    'The current service state was preserved. Reload the page to try again.',
  报价金额: 'Quote amount',
  报价状态: 'Quote status',
  本地开发账号: 'Local development account',
  本地模拟付款: 'Local mock payment',
  '查看关联作品：': 'View related work: ',
  查看项目详情: 'View project details',
  '查看真实制作阶段、最近更新、下一步计划和需要您确认的内容。':
    'Review actual production stages, recent updates, next steps, and items requiring your confirmation.',
  待交付: 'Ready for delivery',
  当前临时密码: 'Current temporary password',
  '当前密码是工作室交付的临时凭据。修改成功前，私人项目内容保持锁定。':
    'The current password is a temporary credential delivered by the studio. Private project content remains locked until it is changed.',
  当前账号尚未绑定项目: 'No projects are linked to this account',
  '第一版内容、客户、订单、进度和审核统一在 Django 管理后台处理。':
    'Content, clients, orders, progress, and moderation are managed in Django Admin.',
  '发布人：': 'Published by: ',
  发送项目留言: 'Send project message',
  个阶段: 'stages',
  更新时间: 'Updated',
  工作室待分配: 'Studio assignment pending',
  '工作室发布第一条真实制作记录后会显示在这里。':
    'The first real production update will appear here after the studio publishes it.',
  工作室管理账号: 'Studio staff account',
  '工作室尚未补充项目说明。': 'The studio has not added a project description yet.',
  关键制作节点: 'Key production milestones',
  件: 'works',
  阶段待设置: 'Stage pending',
  '仅限本地测试 / 模拟支付': 'Local testing / mock payment only',
  进度时间线: 'Progress timeline',
  进入管理后台: 'Open admin',
  '两次输入的新密码不一致。': 'The new passwords do not match.',
  密码未修改: 'Password not changed',
  篇: 'posts',
  '请联系工作室核对账号或项目成员信息。': 'Contact the studio to verify the account or project membership.',
  请先设置新密码: 'Set a new password first',
  确认: 'confirmed',
  日期待补充: 'Date pending',
  上一张作品图片: 'Previous work image',
  尚未发布: 'Not published yet',
  尚未发布进度: 'No progress updates yet',
  尚未设置: 'Not set',
  尚未设置当前阶段: 'Current stage not set',
  '说明需要确认的尺寸、细节或交付事项。':
    'Describe dimensions, details, or delivery items that need confirmation.',
  条未读: 'unread',
  图片: 'Image',
  图片预览: 'image preview',
  退出未完成: 'Sign-out incomplete',
  微缩建筑与场景制作: 'Architectural miniatures & scene making',
  未交付: 'Not delivered',
  下一步计划: 'Next plan',
  下一张作品图片: 'Next work image',
  '项目不存在或当前账号没有访问权限。': 'The project does not exist or this account cannot access it.',
  项目负责人: 'Project manager',
  项目列表加载失败: 'Could not load projects',
  项目无法打开: 'Could not open project',
  项目信息: 'Project information',
  新密码: 'New password',
  '页面会自动退避重试，您也可以立即重试。': 'The page will retry with backoff, or you can retry now.',
  '页面会自动退避重试。': 'The page will retry with backoff.',
  已查看: 'Viewed',
  已交付: 'Delivered',
  已于: 'Confirmed at',
  '以图像为主的微缩建筑与场景制作档案。当前作品均标注真实或演示状态。':
    'An image-led archive of architectural miniatures and scene making. Every work is clearly marked as real or demo content.',
  预计下次更新: 'Expected next update',
  再次输入新密码: 'Confirm new password',
  '暂无留言。这里用于项目相关的简短沟通，不是即时聊天。':
    'No messages yet. This area is for concise project communication, not live chat.',
  正在读取私人项目: 'Loading private project',
  正在读取我的项目: 'Loading My Projects',
  '正在核对当前账号与项目成员关系。': 'Checking this account’s project memberships.',
  '正在核对项目成员权限、进度和留言。': 'Checking project permissions, progress, and messages.',
  重新载入: 'Reload',
  最后更新: 'Last updated',
  最近进度: 'Latest progress',
  作品分类: 'Work categories',
  筹备中: 'Planning',
  已暂停: 'Paused',
  待验收: 'Awaiting review',
  询价处理中: 'Inquiry in progress',
  等待确认报价: 'Quote awaiting confirmation',
  报价已接受: 'Quote accepted',
  订单已取消: 'Order cancelled',
  尚未报价: 'Not quoted',
  等待您的决定: 'Awaiting your decision',
  您已接受: 'Accepted by you',
  您已拒绝: 'Rejected by you',
  待开始: 'Pending',
  进行中: 'In progress',
  已跳过: 'Skipped',
  正在接受: 'Accepting',
  正在拒绝: 'Rejecting',
  正在记录模拟付款: 'Recording mock payment',
  '报价决定已记录。': 'Your quote decision has been recorded.',
  '该报价决定已经记录，无需重复提交。': 'This quote decision is already recorded.',
  '本地模拟付款已记录；该记录不代表真实收款。':
    'The local mock payment was recorded; it is not a real payment.',
  '该模拟付款已记录，无需重复提交。': 'This mock payment is already recorded.',
  正在发送: 'Sending',
  确认已了解: 'Acknowledge',
  正在确认: 'Confirming',
  完成: 'Done',
  收起房间详情: 'Close room details',
  过程图片: 'Process images',
  '选择 1 到 5 星评分': 'Select a rating from 1 to 5 stars',
  '{count} 星': '{count} stars',
  '{name} 图片展示': '{name} image gallery',
  作品图片缩略图: 'Work image thumbnails',
  '放大查看 {name}': 'Enlarge {name}',
  '在主视图查看 {name}': 'View {name} in the main view',
  '项目完成 {percent}%': 'Project {percent}% complete',
  '报价已过期，请联系工作室重新报价。': 'The quote has expired. Contact the studio for a new quote.',
  '该报价已经完成决定，不能重复修改。': 'This quote has already been decided and cannot be changed.',
  '订单当前状态不允许执行该付款。': 'The order is not in a state that allows this payment.',
  '当前环境未启用本地模拟付款。': 'Local mock payment is not enabled in this environment.',
  '订单金额配置无效，请联系工作室核对。': 'The order amount configuration is invalid. Contact the studio.',
  '报价决定无效。': 'The quote decision is invalid.',
  '当前订单没有可决定的报价。': 'This order has no quote awaiting a decision.',
  '当前账号或订单不能使用本地模拟付款。': 'This account or order is not eligible for local mock payment.',
  '模拟付款类型无效。': 'The mock payment type is invalid.',
  '当前本地模拟付款仅支持 CNY。': 'Local mock payment currently supports CNY only.',
  '付款记录与订单状态不一致，请联系工作室。':
    'The payment record and order status do not match. Contact the studio.',
  '该订单无需支付定金。': 'This order does not require a deposit.',
  '该订单无需支付尾款。': 'This order does not require a final payment.',
};

const warnedMissingTranslations = new Set<string>();

export function hasEnglishTranslation(key: string) {
  return Object.prototype.hasOwnProperty.call(en, key);
}

const errorCodeKeys: Record<string, string> = {
  invalid_quote_decision: '报价决定无效。',
  quote_expired: '报价已过期，请联系工作室重新报价。',
  quote_already_decided: '该报价已经完成决定，不能重复修改。',
  invalid_quote_state: '当前订单没有可决定的报价。',
  invalid_payment_state: '订单当前状态不允许执行该付款。',
  mock_payment_disabled: '当前环境未启用本地模拟付款。',
  mock_payment_not_eligible: '当前账号或订单不能使用本地模拟付款。',
  invalid_payment_type: '模拟付款类型无效。',
  mock_currency_unsupported: '当前本地模拟付款仅支持 CNY。',
  payment_state_mismatch: '付款记录与订单状态不一致，请联系工作室。',
  deposit_not_required: '该订单无需支付定金。',
  final_not_required: '该订单无需支付尾款。',
  invalid_amounts: '订单金额配置无效，请联系工作室核对。',
  permission_denied: '当前账号没有执行此操作的权限，或安全校验已过期。',
  not_authenticated: '登录状态已过期，请重新登录。',
  throttled: '操作过于频繁，请稍后再试。',
};

export function normalizeLocale(value: string | null | undefined): Locale {
  return value?.toLowerCase().startsWith('en') ? 'en' : 'zh-CN';
}

export function resolveInitialLocale(
  stored: string | null,
  browserLanguage: string | null | undefined,
): Locale {
  return stored === 'en' || stored === 'zh-CN' ? stored : normalizeLocale(browserLanguage);
}

export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'zh-CN';
  let storedLocale: string | null = null;
  try {
    storedLocale = window.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    // Continue with browser-language detection when storage is unavailable.
  }
  return resolveInitialLocale(storedLocale, window.navigator?.language);
}

export function translate(locale: Locale, key: string, variables: Record<string, string | number> = {}) {
  if (
    locale === 'en' &&
    !hasEnglishTranslation(key) &&
    import.meta.env.DEV &&
    !warnedMissingTranslations.has(key)
  ) {
    warnedMissingTranslations.add(key);
    console.warn(`[i18n] Missing English translation: ${key}`);
  }
  const template = locale === 'en' ? en[key] || key : key;
  return Object.entries(variables).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

export function formatLocalizedDate(
  locale: Locale,
  value: string | Date,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}

export function formatLocalizedMoney(
  locale: Locale,
  amount: string | null | undefined,
  currency: 'CNY' | 'USD',
) {
  if (!amount) return translate(locale, '待报价');
  const negative = amount.startsWith('-');
  const [rawWhole, rawFraction = ''] = amount.replace(/^-/, '').split('.');
  const groupedWhole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
    BigInt(rawWhole || '0'),
  );
  const fraction = rawFraction.padEnd(2, '0').slice(0, 2);
  const symbol = currency === 'CNY' ? (locale === 'en' ? 'CN¥' : '¥') : locale === 'en' ? '$' : 'US$';
  return `${negative ? '-' : ''}${symbol}${groupedWhole}.${fraction}`;
}

export function localizedErrorMessage(locale: Locale, reason: unknown, fallback: string) {
  if (reason instanceof ApiError && reason.code && errorCodeKeys[reason.code]) {
    return translate(locale, errorCodeKeys[reason.code]);
  }
  return reason instanceof Error ? translate(locale, reason.message) : translate(locale, fallback);
}

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  localeTransitionPhase: LocaleTransitionPhase;
  isChangingLocale: boolean;
  t: (key: string, variables?: Record<string, string | number>) => string;
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatMoney: (amount: string | null | undefined, currency: 'CNY' | 'USD') => string;
  errorMessage: (reason: unknown, fallback: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);
  const [localeTransitionPhase, setLocaleTransitionPhase] = useState<LocaleTransitionPhase>('idle');
  const commitLocale = useCallback((next: Locale) => {
    try {
      window.localStorage?.setItem(STORAGE_KEY, next);
    } catch {
      // Language switching still works for this session when storage is unavailable.
    }
    setLocaleState(next);
  }, []);
  const transitionController = useMemo(
    () =>
      createLocaleTransitionController({
        commitLocale,
        setPhase: setLocaleTransitionPhase,
        prefersReducedMotion: () =>
          typeof window !== 'undefined' &&
          Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
      }),
    [commitLocale],
  );
  const setLocale = useCallback(
    (next: Locale) => {
      transitionController.change(locale, next);
    },
    [locale, transitionController],
  );
  const t = useCallback(
    (key: string, variables?: Record<string, string | number>) => translate(locale, key, variables),
    [locale],
  );
  const formatDate = useCallback(
    (value: string | Date, options?: Intl.DateTimeFormatOptions) =>
      formatLocalizedDate(locale, value, options),
    [locale],
  );
  const formatMoney = useCallback(
    (amount: string | null | undefined, currency: 'CNY' | 'USD') =>
      formatLocalizedMoney(locale, amount, currency),
    [locale],
  );
  const errorMessage = useCallback(
    (reason: unknown, fallback: string) => localizedErrorMessage(locale, reason, fallback),
    [locale],
  );
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => () => transitionController.dispose(), [transitionController]);
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      localeTransitionPhase,
      isChangingLocale: localeTransitionPhase !== 'idle',
      t,
      formatDate,
      formatMoney,
      errorMessage,
    }),
    [errorMessage, formatDate, formatMoney, locale, localeTransitionPhase, setLocale, t],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
