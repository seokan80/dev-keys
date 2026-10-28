import { z } from 'zod';
import type { ContentSet, RawFile } from '../../src/lib/content/check';

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const manifestSchema = z.array(
  z.object({ set: slug, item: slug, file: z.string().regex(/^[A-Z][A-Za-z0-9]*\.java$/) }).strict(),
);
export type CodeCase = { id: string; files: RawFile[]; results: number };
const reserved = ['Verification.java', 'RunVerification.java', 'VerifyMain.java'];

/** 신뢰하는 저장소 코드만 합친다. 브라우저 입력을 실행하는 기능은 아니다. */
export function buildCodeCases(
  sets: readonly ContentSet[],
  manifest: unknown,
  fixtures: readonly RawFile[],
): CodeCase[] {
  const specs = manifestSchema.parse(manifest);
  const code = sets
    .filter((s) => s.category === 'java' || s.category === 'spring')
    .flatMap((set) =>
      set.items.flatMap((item) => (item.type === 'copy' ? [{ set, item, id: `${set.id}--${item.id}` }] : [])),
    );
  const ids = new Set<string>();
  const used = new Set<string>();
  const cases = specs.map((spec) => {
    const id = `${spec.set}--${spec.item}`;
    if (ids.has(id)) throw new Error(`중복 코드 검증: ${id}`);
    ids.add(id);
    const sample = code.find((c) => c.id === id);
    if (!sample) throw new Error(`없는 코드 문제: ${id}`);
    if (reserved.includes(spec.file)) throw new Error(`예약 파일 이름: ${spec.file}`);
    const { item } = sample;
    const results = (item.notes ?? []).filter((n) => n.result !== undefined);
    if (new Set(results.map((n) => n.at)).size !== results.length) throw new Error(`중복 결과 키: ${id}`);
    const prefix = `verify/java/cases/${spec.set}/${spec.item}/`;
    const sources = fixtures
      .filter((f) => f.path.startsWith(prefix))
      .map((f) => {
        const path = f.path.slice(prefix.length);
        if (!/^[A-Z][A-Za-z0-9]*\.java$/.test(path)) throw new Error(`실행 자료는 기본 패키지 Java 파일만: ${f.path}`);
        if (path === spec.file || ['Verification.java', 'RunVerification.java'].includes(path))
          throw new Error(`소스 이름이 겹친다: ${f.path}`);
        used.add(f.path);
        return { path, text: f.text };
      });
    if (!sources.some((f) => f.path === 'VerifyMain.java')) throw new Error(`VerifyMain.java가 없다: ${id}`);
    const expected = results
      .map((n) => `Map.entry(${JSON.stringify(n.at)}, ${JSON.stringify(n.result)})`)
      .join(',\n            ');
    const helper = String.raw`import java.util.*;
final class Verification {
    private static final Map<String, String> EXPECTED = Map.ofEntries(
            ${expected});
    private static final Set<String> CHECKED = new HashSet<>();
    static void check(String at, String actual) {
        if (!EXPECTED.containsKey(at)) throw new AssertionError("알 수 없는 결과 키: " + at);
        if (!CHECKED.add(at)) throw new AssertionError("중복 결과 확인: " + at);
        if (!EXPECTED.get(at).equals(actual)) throw new AssertionError("결과 불일치 [" + at + "]\n기대: " + EXPECTED.get(at) + "\n실제: " + actual);
    }
    static void finish() {
        Set<String> missing = new TreeSet<>(EXPECTED.keySet());
        missing.removeAll(CHECKED);
        if (!missing.isEmpty()) throw new AssertionError("미검증 결과: " + missing);
        System.out.println("표시 결과 " + CHECKED.size() + "개 일치");
    }
}
`;
    return {
      id,
      results: results.length,
      files: [
        {
          path: spec.file,
          text: [item.hidden?.before, item.text, item.hidden?.after].filter((s) => s !== undefined).join('\n') + '\n',
        },
        ...sources,
        { path: 'Verification.java', text: helper },
        {
          path: 'RunVerification.java',
          text: 'public class RunVerification { public static void main(String[] args) throws Exception { VerifyMain.run(); Verification.finish(); } }\n',
        },
      ],
    };
  });
  for (const sample of code) if (!ids.has(sample.id)) throw new Error(`검증 설정이 없다: ${sample.id}`);
  for (const f of fixtures) if (!used.has(f.path)) throw new Error(`연결되지 않은 실행 자료: ${f.path}`);
  return cases;
}

/** 코드나 검증 경로가 바뀌면 기존 필수 check 안에서 JVM 검사도 실행한다. */
export function needsCodeVerification(paths: readonly string[]): boolean {
  return paths.some((path) =>
    /^(?:content\/(?:sets|guides)\/(?:java|spring)\/|verify\/java\/|scripts\/(?:lib\/code-[^/]+\.ts$|(?:verify-code|test-code-verification|check-code-changes)\.ts$)|tests\/unit\/code-verification\/|src\/(?:schemas\/|lib\/content\/)|package(?:-lock)?\.json$|\.github\/workflows\/ci\.yml$)/.test(
      path,
    ),
  );
}
