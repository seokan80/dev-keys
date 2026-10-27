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
  '거',
]);

/** 같은 뜻의 다른 말 — 질문 낱말을 이 말로도 찾는다 ("커밋 아이디" 는 세트에서 "해시") */
const SYNONYMS: Record<string, readonly string[]> = {
  아이디: ['해시'],
  id: ['해시'],
  sha: ['해시'],
  조회: ['보기', '본다', '확인'],
  받기: ['가져오기'],
};

function stem(word: string): string {
  if (!/[가-힣]$/.test(word)) return word;
  for (const t of TAILS) if (word.length > t.length + 1 && word.endsWith(t)) return word.slice(0, -t.length);
  return word;
}

/** 자주 쓰는 동작의 활용형을 맞춘다. 명령 이름과 옵션은 그대로 둔다. */
function actions(text: string): string {
  return text
    .replace(
      /받아(?:만)?(?:\s*(?:오기만|오기|오고|온다|온|와서|와))?/g,
      (s) => `가져오기${s.includes('만') ? '만' : ''}`,
    )
    .replace(/가져(?:오기만|오기|오되|오고|온다|온|와서|와)/g, (s) => `가져오기${s.endsWith('만') ? '만' : ''}`)
    .replace(/합(?:치[가-힣]*|친다|친|칠[가-힣]*)|병합(?:하[가-힣]*)?/g, '합치기');
}

const focusWords = (text: string) =>
  [...actions(text).matchAll(/([가-힣]{2,}?)만(?=\s|$)/g)].map((m) => stem(m[1]!)).filter((word) => !STOP.has(word));

/** 부정한 동작을 일반 낱말에서 분리한다. 부정어가 다른 문장까지 번지지 않게 동작 바로 옆만 본다. */
function polarity(text: string): { positive: string; excluded: string[] } {
  const excluded: string[] = [];
  const positive = text
    .replace(/([가-힣]{2,}?)(?:하지|지|진)\s*않[가-힣]*/g, (_, verb: string) => {
      excluded.push(actions(verb));
      return ' ';
    })
    .replace(/(?:^|\s)안\s+([가-힣]{2,})/g, (_, verb: string) => {
      excluded.push(actions(stem(verb)));
      return ' ';
    });
  return { positive: actions(positive), excluded };
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
  const { positive, excluded } = polarity(q);
  // 「받아만 오기」「이름만 보기」처럼 범위를 한정한 낱말은 주변 설명보다 무겁게 친다.
  const focused = focusWords(positive);
  const terms = positive
    .split(/\s+/)
    .filter((t) => t !== 'git' && t !== 'gh' && !STOP.has(t))
    // 조사만 띄어 쓴 낱말("id 로")은 버린다
    .filter((t) => !TAILS.includes(t))
    .map(stem)
    .filter((t) => t.length > 0 && !STOP.has(t));
  if (terms.length === 0) return [];

  // 낱말마다 명령별 점수: 명령 낱말 그대로 8, 명령 조각 5, 아니면 상황(8배) · 해설 중 큰 쪽
  const prepared = entries.map((entry) => {
    const cmd = entry.display.toLowerCase();
    const situation = polarity(entry.situations.toLowerCase());
    const situations = situation.positive;
    const notes = polarity(entry.notes.toLowerCase()).positive;
    return {
      cmd,
      cmdWords: cmd.split(/\s+/).map((w) => w.replace(/^-+/, '')),
      situations,
      notes,
      looseSituations: loose(situations),
      looseNotes: loose(notes),
      excluded: situation.excluded,
      focused: focusWords(situations),
    };
  });
  const scoreOf = (word: string, p: (typeof prepared)[number]) => {
    const bare = word.replace(/^-+/, '');
    if (p.cmdWords.includes(bare)) return 8;
    if (p.cmd.includes(word)) return 5;
    return Math.max(8 * textScore(word, p.situations, p.looseSituations), textScore(word, p.notes, p.looseNotes));
  };
  // 같은 뜻의 말이 있으면 그중 가장 잘 맞는 것으로
  const termScores = terms.map((term) =>
    prepared.map((p) => Math.max(...[term, ...(SYNONYMS[term] ?? [])].map((w) => scoreOf(w, p)))),
  );
  // 흔한 낱말(커밋 · 브랜치 · 파일 …)은 가볍게, 드문 낱말(되살리기 · 추적 …)은 무겁게 — 검색의 IDF
  const n = entries.length;
  const phrase = loose(terms.join(' '));
  const weights = termScores.map((scores) => Math.log(1 + n / (1 + scores.filter((s) => s > 0).length)));

  const scored = entries.map((entry, index) => {
    let score = 0;
    let hit = 0;
    terms.forEach((_, t) => {
      const s = termScores[t]![index]!;
      // 해설의 약한 조각 일치도 상황의 정확한 일치와 똑같이 세면 긴 해설이 유리해진다.
      hit += Math.min(1, s / 8);
      score += s * weights[t]!;
    });
    // 낱말이 여럿이면 많이 맞을수록 — 일부만 걸린 것은 뒤로
    if (terms.length > 1) score *= (hit / terms.length) ** 2;
    // 질문이 상황 문장에 붙은 그대로 들어 있으면 더 (구절 일치 — "스테이징 취소" 와 "스테이징 취소하기")
    if (terms.length > 1 && prepared[index]!.looseSituations.includes(phrase)) score *= 1.5;
    for (const word of focused) {
      const p = prepared[index]!;
      score *= p.focused.includes(word) ? 1.5 : 0.1 + 0.9 * Math.min(1, scoreOf(word, p) / 8) ** 2;
    }
    // 부정한 동작은 부정한 설명과 맞추고, 그 동작을 하는 설명은 뒤로 보낸다.
    for (const word of excluded) {
      const p = prepared[index]!;
      if (p.excluded.includes(word)) score *= 1.5;
      else if (textScore(word, p.situations, p.looseSituations) > 0) score *= 0.25;
    }
    return { entry, index, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((s) => s.entry);
}
