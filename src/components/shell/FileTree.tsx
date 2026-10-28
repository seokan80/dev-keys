import type { FileState } from '../../schemas/set';

/** 실제 Bash 이야기의 명령 뒤 파일 상태. 사용자 기기의 파일에는 접근하지 않는다. */
export default function FileTree({ state, previous }: { state: FileState; previous: FileState | null }) {
  const known = new Set(previous?.entries ?? state.entries);
  return (
    <section className="flex flex-col gap-2" data-testid="file-tree" aria-label="파일 트리">
      <h2 className="text-xs font-bold text-sky-300">파일 트리</h2>
      <p className="break-all font-mono text-xs text-emerald-300" data-testid="shell-cwd">
        현재: ~/workspace{state.cwd === '.' ? '' : `/${state.cwd}`}
      </p>
      <div className="max-h-80 overflow-auto rounded-md bg-slate-900 p-2 font-mono text-xs">
        <p className="text-slate-200">~/workspace/</p>
        <ul aria-label="파일 목록">
          {[...state.entries].sort().map((path) => {
            const parts = path.replace(/\/$/, '').split('/');
            const current = path === `${state.cwd}/`;
            return (
              <li
                key={path}
                style={{ paddingLeft: `${parts.length}rem` }}
                className={known.has(path) ? 'text-slate-300' : 'text-emerald-300'}
              >
                {parts.at(-1)}
                {path.endsWith('/') ? '/' : ''}
                {current && <span className="ml-2 font-sans text-sky-300">← 현재</span>}
                {!known.has(path) && <span className="ml-2 font-sans">새로 생김</span>}
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-sm text-sky-200" aria-live="polite">
        {state.caption}
      </p>
    </section>
  );
}
