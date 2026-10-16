import { describe, expect, it } from 'vitest';
import { checkContentFiles } from '../../scripts/lib/content-check.ts';

const file = (path: string, text: string) => ({ path, text });

describe('checkContentFiles', () => {
  it('올바른 파일은 문제가 없다', () => {
    expect(checkContentFiles([file('a.yaml', 'id: git-basic\ntitle: 기초\n')])).toEqual([]);
  });

  it('YAML 문법 오류를 잡는다', () => {
    const [p] = checkContentFiles([file('a.yaml', 'id: x\nitems: [a, b\n')]);
    expect(p?.message).toMatch(/YAML 문법 오류/);
  });

  it('최상위가 매핑이 아니면 잡는다', () => {
    expect(checkContentFiles([file('a.yaml', '- id: x\n')])[0]?.message).toMatch(/매핑/);
    expect(checkContentFiles([file('b.yaml', '')])[0]?.message).toMatch(/매핑/);
  });

  it('id 가 없거나 비었으면 잡는다', () => {
    expect(checkContentFiles([file('a.yaml', 'title: x\n')])[0]?.message).toMatch(/id/);
    expect(checkContentFiles([file('b.yaml', 'id: "  "\n')])[0]?.message).toMatch(/id/);
    expect(checkContentFiles([file('c.yaml', 'id: 3\n')])[0]?.message).toMatch(/id/);
  });

  it('파일끼리 id 가 겹치면 뒤 파일을 잡는다', () => {
    const problems = checkContentFiles([file('a.yaml', 'id: same\n'), file('b.yaml', 'id: same\n')]);
    expect(problems).toEqual([{ path: 'b.yaml', message: 'id "same" 가 a.yaml 와 겹친다' }]);
  });
});
