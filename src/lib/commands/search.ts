// 명령 찾기: 명령 조각("amend") · 한국어 상황("커밋 메시지를 고치고 싶어") 둘 다로 찾는다. 브라우저에서 돈다 (순수 함수).

export type SearchEntry = {
  slug: string;
  /** 명령 모양 — "git commit --amend -m" */
  display: string;
  /** 도전 문제의 설명을 이은 글 — "이럴 때" (해설보다 무겁게 친다) */
  situations: string;
  /** 따라치기 줄의 해설을 이은 글 */
  notes: string;
};

/** 낱말 끝의 흔한 조사 · 어미를 떼어 "메시지를" 과 "메시지가", "고치고" 와 "고친다" 가 만나게 */
const TAILS = [
  '에서는',
  '으로는',
  '하려면',
  '에서',
  '으로',
  '하고',
  '려면',
  '는데',
  '하기',
  '하는',
  '을',
  '를',
  '이',
  '가',
  '은',
  '는',
  '에',
  '로',
  '도',
  '만',
  '의',
  '와',
  '과',
  '고',
  '기',
  '게',
  '면',
];
/** 찾는 데 뜻이 없는 말 */
const STOP = new Set([
  '싶어',
  '싶다',
  '싶은데',
  '방법',
  '어떻게',
  '해줘',
  '하는법',
  '명령',
  '명령어',
  '할',
  '때',
  '좀',
  '하나',
]);

function stem(word: string): string {
  if (!/[가-힣]$/.test(word)) return word;
  for (const t of TAILS) if (word.length > t.length + 1 && word.endsWith(t)) return word.slice(0, -t.length);
  return word;
}

/** 받침을 뗀 느슨한 글 — "고친다" → "고치다", 활용으로 받침이 생겨도 만나게 */
function loose(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) out += String.fromCharCode(code - ((code - 0xac00) % 28));
    else out += ch;
  }
  return out;
}

const bigrams = (s: string) => {
  const out: string[] = [];
  for (let i = 0; i + 1 < s.length; i++) out.push(s.slice(i, i + 2));
  return out;
};

/** 한 글(상황 또는 해설)에서 낱말 하나의 점수: 그대로 맞으면 1, 받침을 떼고 맞으면 0.8, 두 글자 조각이 절반 넘게 맞으면 그만큼 */
function textScore(term: string, text: string, looseText: string): number {
  if (!text) return 0;
  if (text.includes(term)) return 1;
  if (!/[가-힣]/.test(term)) return 0;
  const lt = loose(term);
  if (looseText.includes(lt)) return 0.8;
  if (term.length < 2) return 0;
  const grams = bigrams(lt);
  const found = grams.filter((g) => looseText.includes(g)).length;
  return found / grams.length >= 0.5 ? 0.5 * (found / grams.length) : 0;
}

/** 점수가 있는 것만, 높은 순으로 (같으면 원래 순서 — 예시가 많은 명령이 앞) */
export function searchCommands(entries: readonly SearchEntry[], query: string, limit = 20): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q
    .split(/\s+/)
    .filter((t) => t !== 'git' && t !== 'gh' && !STOP.has(t))
    .map(stem)
    .filter((t) => t.length > 0 && !STOP.has(t));
  if (terms.length === 0) return [];

  const scored = entries.map((entry, index) => {
    const cmd = entry.display.toLowerCase();
    const cmdWords = cmd.split(/\s+/).map((w) => w.replace(/^-+/, ''));
    const situations = entry.situations.toLowerCase();
    const notes = entry.notes.toLowerCase();
    const looseSituations = loose(situations);
    const looseNotes = loose(notes);
    let score = 0;
    let hit = 0;
    for (const term of terms) {
      const bare = term.replace(/^-+/, '');
      // 명령 낱말 그대로 8, 명령 조각 5, 아니면 상황(4배) · 해설(2배) 중 큰 쪽
      const s = cmdWords.includes(bare)
        ? 8
        : cmd.includes(term)
          ? 5
          : Math.max(4 * textScore(term, situations, looseSituations), 2 * textScore(term, notes, looseNotes));
      if (s > 0) hit += 1;
      score += s;
    }
    // 낱말이 여럿이면 많이 맞을수록 — 일부만 걸린 것은 뒤로
    if (terms.length > 1) score *= (hit / terms.length) ** 2;
    return { entry, index, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((s) => s.entry);
}
