export type NextSet = { href: string; title: string; description: string };

type Props = { next: NextSet | null; autoFocus?: boolean };

/** 결과 화면의 다음 세트 추천. 마지막 세트면 처음으로 안내한다 */
export default function NextSetCard({ next, autoFocus = false }: Props) {
  const ref = (el: HTMLAnchorElement | null) => {
    if (autoFocus) el?.focus();
  };
  if (!next) {
    return (
      <a ref={ref} href="/" className="block rounded-lg border border-slate-700 p-4 hover:bg-slate-800">
        모든 세트를 마쳤어요 — 처음으로
      </a>
    );
  }
  return (
    <a
      ref={ref}
      href={next.href}
      className="flex flex-col gap-1 rounded-lg border border-emerald-600/60 p-4 hover:bg-emerald-500/10 focus:outline-2 focus:outline-emerald-400"
      data-testid="next-set"
    >
      <span className="text-xs text-emerald-400">다음 세트 →</span>
      <strong className="text-lg">{next.title}</strong>
      <span className="text-sm text-slate-400">{next.description}</span>
    </a>
  );
}
