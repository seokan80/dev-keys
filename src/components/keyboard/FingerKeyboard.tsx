import { LAYOUT, fingerForKey, type Finger, type KeyDef, type KeyboardOptions, type KeyStroke } from '@core/keyboard';

export const fingerColor = (finger: Finger) => `var(--finger-${finger})`;

type Props = {
  /** 강조할 키 (글자 키 + Shift) */
  highlight: (KeyStroke & { shift?: KeyStroke }) | null;
  options?: KeyboardOptions;
};

function keyFace(key: KeyDef) {
  if (key.label !== undefined) return { main: key.label };
  if (/^Key[A-Z]$/.test(key.code)) return { main: key.shift };
  return { main: key.base, top: key.shift };
}

/** 손가락별 색 키보드. 그림은 장식이고, 다음 키 설명은 글자로 따로 보여 준다. */
export default function FingerKeyboard({ highlight, options = {} }: Props) {
  const active = new Set([highlight?.key, highlight?.shift?.key].filter(Boolean));

  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-1 font-mono text-xs select-none"
      style={{ '--u': '2.5rem' } as React.CSSProperties}
    >
      {LAYOUT.map((row, i) => (
        <div key={i} className="flex justify-center gap-1">
          {row.map((key) => {
            const finger = fingerForKey(key, options);
            const on = active.has(key.code);
            const face = keyFace(key);
            return (
              <div
                key={key.code}
                data-key={key.code}
                data-active={on || undefined}
                className={`relative flex h-10 items-center justify-center rounded-md border ${
                  on ? 'border-white font-bold text-slate-950 ring-2 ring-white' : 'border-white/10 text-slate-200'
                }`}
                style={{
                  width: `calc(var(--u) * ${key.width} + 0.25rem * ${key.width - 1})`,
                  backgroundColor: on
                    ? fingerColor(finger)
                    : `color-mix(in oklab, ${fingerColor(finger)} 22%, transparent)`,
                }}
              >
                {face.top && <span className="absolute top-0.5 left-1 text-[0.6rem] opacity-70">{face.top}</span>}
                <span>{face.main}</span>
                {key.sub && <span className="ml-0.5 opacity-70">{key.sub}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
