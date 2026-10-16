import { parse, YAMLParseError } from 'yaml';

export type ContentFile = { path: string; text: string };
export type Problem = { path: string; message: string };

/**
 * 콘텐츠 YAML 기본 검사. 파일 읽기와 분리해 단위 테스트한다.
 * M0: 문법, 최상위 매핑, `id` 존재·중복. 세트·미션 스키마(zod)는 M2·M4에서 붙인다.
 */
export function checkContentFiles(files: ContentFile[]): Problem[] {
  const problems: Problem[] = [];
  const seen = new Map<string, string>();

  for (const file of files) {
    let doc: unknown;
    try {
      doc = parse(file.text, { prettyErrors: true });
    } catch (e) {
      const where = e instanceof YAMLParseError && e.linePos ? ` (${e.linePos[0].line}행)` : '';
      problems.push({ path: file.path, message: `YAML 문법 오류${where}` });
      continue;
    }

    if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
      problems.push({ path: file.path, message: '최상위는 키-값 매핑이어야 한다' });
      continue;
    }

    const id = (doc as Record<string, unknown>).id;
    if (typeof id !== 'string' || id.trim() === '') {
      problems.push({ path: file.path, message: '`id`(문자열)가 없다' });
      continue;
    }

    const first = seen.get(id);
    if (first) {
      problems.push({ path: file.path, message: `id "${id}" 가 ${first} 와 겹친다` });
    } else {
      seen.set(id, file.path);
    }
  }

  return problems;
}
