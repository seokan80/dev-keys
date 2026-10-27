import { describe, expect, it } from 'vitest';
import { tokenize, parseOptions } from '../../../../src/core/git/parse';
import { execute, initialRepo, compare } from '@core/git';
import { judge } from '@core/challenge';

describe('Git 명령의 따옴표와 이스케이프', () => {
  it.each([
    ['commit --message="fix typo"', ['commit', '--message=fix typo']],
    ['commit -m "fix \\"quote\\""', ['commit', '-m', 'fix "quote"']],
    ['commit -m fix\\ typo', ['commit', '-m', 'fix typo']],
    ['commit -m "pre"fix', ['commit', '-m', 'prefix']],
    ['commit -m ""', ['commit', '-m', '']],
    ['commit -m "a\\qb"', ['commit', '-m', 'a\\qb']],
    ["checkout C2''~1", ['checkout', "C2''~1"]],
  ])('%s', (input, expected) => expect(tokenize(input)).toEqual(expected));

  it.each(['commit --message="oops', 'commit -m foo\\', "switch feature'bad"])('닫히지 않은 입력은 거부: %s', (input) =>
    expect(tokenize(input)).toBeNull(),
  );

  it('값에 있는 옵션 모양을 다시 옵션으로 풀지 않는다', () => {
    expect(parseOptions(['-m', '-am'], { flags: ['-a'], values: ['-m'] })).toMatchObject({
      values: new Map([['-m', '-am']]),
      positionals: [],
    });
  });

  it.each(['commit --message="fix typo"', 'commit -mfix\\ typo', 'commit -am"fix typo"'])(
    '동등한 옵션으로 메시지와 트리가 같다: %s',
    (command) => {
      const start = initialRepo();
      const expected = execute(start, 'commit -m "fix typo"');
      const result = execute(start, command);
      expect(result.error).toBeNull();
      expect(result.state.commits.c2?.message).toBe('fix typo');
      expect(compare(result.state, expected.state, start).equal).toBe(true);
      expect(judge({ answers: ['git commit -m "fix typo"'], context: { setup: [] } }, `git ${command}`).correct).toBe(
        true,
      );
    },
  );
});
