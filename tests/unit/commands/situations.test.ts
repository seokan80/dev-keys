import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CommandEntry } from '../../../src/lib/commands/catalog';
import { loadSituations } from '../../../src/lib/content/load';

const entry = (slug: string, situations: string[] = []): CommandEntry => ({
  key: `git ${slug}`,
  slug,
  tool: 'git',
  sub: slug,
  display: `git ${slug}`,
  examples: [],
  sets: [],
  situations,
});

/** content/commands/situations/<이름> 에 파일을 둔 임시 폴더 */
function root(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'devkeys-situations-'));
  mkdirSync(join(dir, 'content/commands/situations'), { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, 'content/commands/situations', name), text);
  return dir;
}

describe('loadSituations', () => {
  it('상황 문장을 카탈로그 항목에 더한다', () => {
    const catalog = [entry('status', ['도전 문제 설명'])];
    const r = loadSituations(root({ 'a.yaml': 'status:\n  - 지금 상태 확인\n' }), catalog, []);
    expect(r.problems).toEqual([]);
    expect(catalog[0]!.situations).toEqual(['도전 문제 설명', '지금 상태 확인']);
  });

  it('카탈로그에 없는 명령 · 두 파일에 같은 명령 · 같은 문장 두 번을 막는다', () => {
    const catalog = [entry('status')];
    const r = loadSituations(
      root({
        'a.yaml': 'status:\n  - 상태 보기\n  - 상태  보기!\nnope:\n  - 없는 명령\n',
        'b.yaml': 'status:\n  - 또 상태\n',
      }),
      catalog,
      [],
    );
    expect(r.problems.map((p) => p.message)).toEqual([
      '"status": "상태  보기!" 가 두 번',
      '명령 "nope" 가 카탈로그에 없다',
      '명령 "status" 가 content/commands/situations/a.yaml 에도 있다 — 한 파일에만',
    ]);
  });

  it('평가 질문과 같은 문장은 막는다 — 띄어쓰기 · 문장 부호가 달라도', () => {
    const catalog = [entry('restore-staged')];
    const r = loadSituations(root({ 'a.yaml': 'restore-staged:\n  - 스테이징 취소?\n' }), catalog, [
      { q: '스테이징취소', expect: ['restore-staged'] },
    ]);
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0]!.message).toContain('평가 질문과 같다');
    expect(catalog[0]!.situations).toEqual([]);
  });
});
