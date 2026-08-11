function describeProject(project) {
  const title = typeof project.data?.title === 'string' && project.data.title.trim()
    ? project.data.title.trim()
    : '未命名项目';
  return { id: project.id, title };
}

export function isApplyRequested(args) {
  return args.includes('--apply');
}

export function createRemoteWriteGuard(apply) {
  return async function writeRemote(operation) {
    if (!apply) {
      throw new Error('安全保护：dry-run 模式禁止执行远程写入。');
    }
    return operation();
  };
}

export function decideProjectVisibility(data, hiddenCategories) {
  const hasVisibility = Object.prototype.hasOwnProperty.call(data, 'visibility');
  const sourceVisibility = hasVisibility ? data.visibility : undefined;
  const categoryIsHidden = hiddenCategories.includes(data.category);
  const targetVisibility = sourceVisibility === 'public' && !categoryIsHidden
    ? 'public'
    : 'hidden';

  let reason;
  if (!hasVisibility) {
    reason = '缺少 visibility，按默认拒绝原则设为 hidden';
  } else if (sourceVisibility !== 'public' && sourceVisibility !== 'hidden') {
    reason = `visibility 值无效（${String(sourceVisibility)}），按默认拒绝原则设为 hidden`;
  } else if (sourceVisibility === 'public' && categoryIsHidden) {
    reason = '所属分类已隐藏，设为 hidden';
  } else if (sourceVisibility === 'public') {
    reason = '原记录已明确公开且分类未隐藏，保持 public';
  } else {
    reason = '原记录已明确隐藏，保持 hidden';
  }

  return {
    sourceVisibility,
    targetVisibility,
    missingVisibility: !hasVisibility,
    expandsPublicScope: targetVisibility === 'public' && sourceVisibility !== 'public',
    reason,
  };
}

export function buildVisibilityPreflight(projects, hiddenCategories) {
  const report = {
    keepsPublic: [],
    setsHidden: [],
    missingVisibility: [],
    expandsPublicScope: [],
  };

  for (const project of projects) {
    const decision = decideProjectVisibility(project.data, hiddenCategories);
    const entry = { ...describeProject(project), ...decision };

    if (decision.sourceVisibility === 'public' && decision.targetVisibility === 'public') {
      report.keepsPublic.push(entry);
    }
    if (decision.targetVisibility === 'hidden' && decision.sourceVisibility !== 'hidden') {
      report.setsHidden.push(entry);
    }
    if (decision.missingVisibility) report.missingVisibility.push(entry);
    if (decision.expandsPublicScope) report.expandsPublicScope.push(entry);
  }

  return report;
}

function formatEntries(entries) {
  if (entries.length === 0) return ['  （无）'];
  return entries.map((entry) => `  - ${entry.id} | ${entry.title} | ${entry.reason}`);
}

export function formatVisibilityPreflight(report) {
  return [
    '项目可见性迁移预检',
    `保持公开（${report.keepsPublic.length}）：`,
    ...formatEntries(report.keepsPublic),
    `将被设为隐藏（${report.setsHidden.length}）：`,
    ...formatEntries(report.setsHidden),
    `缺少 visibility 字段（${report.missingVisibility.length}）：`,
    ...formatEntries(report.missingVisibility),
    `扩大公开范围：${report.expandsPublicScope.length > 0 ? '是' : '否'}（${report.expandsPublicScope.length}）`,
    ...formatEntries(report.expandsPublicScope),
  ].join('\n');
}
