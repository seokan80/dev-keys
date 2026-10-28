import { expect, it } from 'vitest';
import { buildCodeCases } from '../../../scripts/lib/code-verification';
import type { ContentSet } from '../../../src/lib/content/check';
const set = {
  id: 'java-demo',
  category: 'java',
  items: [
    {
      id: 'sample',
      type: 'copy',
      text: 'int value = 2;',
      hidden: { before: 'class Sample { void run() {', after: '} }' },
      notes: [{ at: 'value', note: '값', result: 'value = 2' }],
    },
  ],
} as ContentSet;
const manifest = [{ set: 'java-demo', item: 'sample', file: 'Sample.java' }];
const fixtures = [
  { path: 'verify/java/cases/java-demo/sample/VerifyMain.java', text: 'class VerifyMain { static void run() {} }' },
];
it('화면의 코드와 숨은 앞뒤 코드를 그대로 합치고 결과 표·실행 자료를 만든다', () => {
  const [sample] = buildCodeCases([set], manifest, fixtures);
  expect(sample?.id).toBe('java-demo--sample');
  expect(sample?.files.find((f) => f.path === 'Sample.java')?.text).toBe(
    'class Sample { void run() {\nint value = 2;\n} }\n',
  );
  expect(sample?.files.find((f) => f.path === 'Verification.java')?.text).toContain('Map.entry("value", "value = 2")');
  expect(sample?.files.find((f) => f.path === 'RunVerification.java')?.text).toContain('Verification.finish();');
});
it('모든 코드 문제에 실행 자료가 있어야 하며 남은 항목과 중복도 막는다', () => {
  expect(() => buildCodeCases([set], [], fixtures)).toThrow(/검증 설정이 없다/);
  expect(() => buildCodeCases([set], [...manifest, ...manifest], fixtures)).toThrow(/중복/);
  expect(() => buildCodeCases([set], [{ ...manifest[0], item: 'gone' }], fixtures)).toThrow(/없는 코드 문제/);
  expect(() => buildCodeCases([set], manifest, [])).toThrow(/VerifyMain/);
  expect(() =>
    buildCodeCases([set], manifest, [
      ...fixtures,
      { path: 'verify/java/cases/java-demo/gone/Extra.java', text: 'class Extra {}' },
    ]),
  ).toThrow(/연결되지 않은/);
});
it('생성 경로 탈출·소스 덮어쓰기·중복 결과 키를 거절한다', () => {
  expect(() => buildCodeCases([set], [{ ...manifest[0], file: '../Sample.java' }], fixtures)).toThrow();
  expect(() => buildCodeCases([set], [{ ...manifest[0], file: 'Verification.java' }], fixtures)).toThrow(/예약/);
  expect(() =>
    buildCodeCases([set], manifest, [
      ...fixtures,
      { path: 'verify/java/cases/java-demo/sample/Sample.java', text: 'replacement' },
    ]),
  ).toThrow(/겹친다/);
  const dup = {
    ...set,
    items: [
      {
        ...set.items[0],
        notes: [
          { at: 'value', note: '하나', result: '1' },
          { at: 'value', note: '둘', result: '2' },
        ],
      },
    ],
  } as ContentSet;
  expect(() => buildCodeCases([dup], manifest, fixtures)).toThrow(/중복/);
});
