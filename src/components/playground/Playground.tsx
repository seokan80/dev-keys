import { useState } from 'react';
import TypingArea from '../typing/TypingArea';

const PRESETS: Record<string, string> = {
  Git: [
    'git status',
    'git switch -c feature/login',
    'git add .',
    'git commit -m "feat: add login form"',
    'git push -u origin feature/login',
  ].join('\n'),
  Java: [
    '@RestController',
    '@RequestMapping("/api/users")',
    'public class UserController {',
    '    private final UserService userService;',
    '',
    '    @GetMapping("/{id}")',
    '    public ResponseEntity<UserDto> get(@PathVariable Long id) {',
    '        return ResponseEntity.ok(userService.find(id));',
    '    }',
    '}',
  ].join('\n'),
  문장: 'The quick brown fox jumps over the lazy dog.',
};

/** 붙여 넣은 글을 따라칠 줄로: 줄바꿈 통일, 탭 → 공백 4칸, 줄 끝 공백·끝 빈 줄 제거 */
function toLines(text: string): string[] {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '    ')
    .split('\n')
    .map((line) => line.trimEnd());
  while (lines.length > 0 && lines.at(-1) === '') lines.pop();
  return lines;
}

const invalidChars = (text: string) => [...new Set(text.replace(/[\x20-\x7e\n\r\t]/g, ''))];

/** 개발용: 아무 글이나 넣고 따라치기 (구현계획 M1) */
export default function Playground() {
  const [text, setText] = useState(PRESETS.Git!);
  const [autoIndent, setAutoIndent] = useState(true);
  const [sixLeft, setSixLeft] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [run, setRun] = useState<{ id: number; lines: string[] } | null>(null);

  const bad = invalidChars(text);
  const lines = toLines(text);
  const canStart = bad.length === 0 && lines.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2 text-sm">
          {Object.keys(PRESETS).map((name) => (
            <button
              key={name}
              type="button"
              className="rounded-md border border-slate-700 px-2 py-1 hover:bg-slate-800"
              onClick={() => setText(PRESETS[name]!)}
            >
              {name}
            </button>
          ))}
        </div>
        <textarea
          aria-label="따라칠 글"
          className="h-40 rounded-md border border-slate-700 bg-slate-900 p-3 font-mono text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
        />
        {bad.length > 0 && (
          <p className="text-sm text-rose-300" role="alert">
            따라치기 글은 영문·숫자·기호(ASCII)만 쓸 수 있어요: {bad.slice(0, 10).join(' ')}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={autoIndent} onChange={(e) => setAutoIndent(e.target.checked)} />
            들여쓰기 자동 입력
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={sixLeft} onChange={(e) => setSixLeft(e.target.checked)} />
            숫자 6을 왼손 검지로
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={showKeyboard} onChange={(e) => setShowKeyboard(e.target.checked)} />
            키보드 보기
          </label>
          <button
            type="button"
            className="rounded-md bg-emerald-600 px-4 py-1.5 font-bold text-white disabled:opacity-40"
            disabled={!canStart}
            onClick={() => setRun({ id: (run?.id ?? 0) + 1, lines })}
          >
            시작
          </button>
        </div>
      </div>

      {run && (
        <TypingArea
          key={`${run.id}-${autoIndent}-${sixLeft}`}
          lines={run.lines}
          typingOptions={{ autoIndent }}
          keyboardOptions={{ sixFinger: sixLeft ? 'left' : 'right' }}
          showKeyboard={showKeyboard}
          autoFocus
        />
      )}
    </div>
  );
}
