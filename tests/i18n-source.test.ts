import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { hasEnglishTranslation } from '../src/i18n';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'i18n' ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe('fixed interface translation coverage', () => {
  it('has an English resource for every literal translation key', () => {
    const missing = sourceFiles(join(process.cwd(), 'src')).flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const keys = [
        ...[...source.matchAll(/\bt\(\s*'([^']+)'/g)].map((match) => match[1]),
        ...[...source.matchAll(/errorMessage\(reason,\s*'([^']+)'/g)].map((match) => match[1]),
      ];
      return keys.filter((key) => !hasEnglishTranslation(key)).map((key) => `${file}: ${key}`);
    });

    expect(missing).toEqual([]);
  });

  it('does not leave Chinese JSX text outside the intentional brand mark', () => {
    const leaks = sourceFiles(join(process.cwd(), 'src', 'components')).flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const found: string[] = [];
      const visit = (node: ts.Node) => {
        if (ts.isJsxText(node)) {
          const text = node.text.trim();
          if (/[\u3400-\u9fff]/.test(text) && text !== '知') found.push(`${file}: ${text}`);
        }
        if (
          ts.isJsxAttribute(node) &&
          node.initializer &&
          ts.isStringLiteral(node.initializer) &&
          /[\u3400-\u9fff]/.test(node.initializer.text)
        ) {
          found.push(`${file}: ${node.initializer.text}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
      return found;
    });

    expect(leaks).toEqual([]);
  });
});
