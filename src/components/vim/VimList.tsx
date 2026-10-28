import { useSave } from '../../lib/save';
type Lesson = { id: string; title: string; description: string; href: string; steps: number };
export default function VimList({ lessons }: { lessons: Lesson[] }) {
  const save = useSave();
  return (
    <ol className="flex flex-col gap-3">
      {lessons.map((lesson, i) => {
        const record = save.vim?.[lesson.id];
        return (
          <li key={lesson.id}>
            <a
              href={lesson.href}
              className="flex flex-col gap-2 rounded-lg border border-slate-700 p-4 hover:bg-slate-900"
              data-testid="vim-card"
            >
              <strong>
                <span className="text-slate-400">{i + 1}. </span>
                {lesson.title}
              </strong>
              <p className="text-sm text-slate-400">{lesson.description}</p>
              <p className="text-xs text-emerald-300">
                {record
                  ? `완료 ✓ · ${(record.elapsedMs / 1000).toFixed(1)}초 · ${record.actions}회`
                  : `${lesson.steps}단계 · 시작하기 →`}
              </p>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
