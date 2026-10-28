import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import { loadContent } from '../../src/lib/content/load';
import { buildCodeCases } from './code-verification';

export function prepareCodeVerification(root = process.cwd()) {
  const prefix = 'verify/java/cases';
  const fixtures = readdirSync(join(root, prefix), { recursive: true, encoding: 'utf8' })
    .filter((p) => p.endsWith('.java'))
    .sort()
    .map((p) => {
      const path = `${prefix}/${p.split('\\').join('/')}`;
      return { path, text: readFileSync(join(root, path), 'utf8') };
    });
  const content = loadContent(root);
  const errors = content.problems.filter((p) => p.level === 'error');
  if (errors.length) throw new Error(errors.map((p) => `${p.path}: ${p.message}`).join('\n'));
  const cases = buildCodeCases(
    content.sets,
    parse(readFileSync(join(root, 'verify/java/cases.yaml'), 'utf8')),
    fixtures,
  );
  if (!cases.length) throw new Error('검증할 Java·Spring 코드가 없다');
  const generated = join(root, 'verify/java/build/generated');
  rmSync(generated, { recursive: true, force: true });
  mkdirSync(generated, { recursive: true });
  for (const sample of cases) {
    const dir = join(generated, sample.id);
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(root, 'verify/java/build/projects', sample.id), { recursive: true });
    for (const file of sample.files) writeFileSync(join(dir, file.path), file.text);
  }
  writeFileSync(join(generated, 'cases.txt'), cases.map((c) => c.id).join('\n') + '\n');
  return cases;
}

export function runCodeVerification(root = process.cwd(), capture = false) {
  const args = ['--no-daemon', '--console=plain', 'check'];
  const windows = process.platform === 'win32';
  const result = spawnSync(windows ? 'cmd.exe' : './gradlew', windows ? ['/d', '/c', 'gradlew.bat', ...args] : args, {
    cwd: join(root, 'verify/java'),
    stdio: capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    timeout: 240_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return { status: result.status ?? 1, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}
