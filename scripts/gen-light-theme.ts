// 화이트 테마 CSS 를 만든다: Tailwind 색 변수의 단계를 뒤집어 어두운 화면용 클래스를 그대로 밝게 보이게 한다.
//   npx tsx scripts/gen-light-theme.ts > src/styles/theme-light.css
// 950↔50 · 900↔100 · 800↔200 · 700↔300 은 맞바꾸고, 400 은 600 값으로(흐린 글자가 흰 바탕에서도 읽히게),
// 500 · 600 은 그대로 둔다(흰 글자를 올린 버튼이 그대로 보이게). 사이트에서 쓰는 색 계열만 바꾼다.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PALETTES = ['slate', 'emerald', 'sky', 'amber', 'rose', 'fuchsia'];
const LIGHT: Record<string, string> = {
  '50': '950',
  '100': '900',
  '200': '800',
  '300': '700',
  '400': '600',
  '700': '300',
  '800': '200',
  '900': '100',
  '950': '50',
};

const theme = readFileSync(join(import.meta.dirname, '../node_modules/tailwindcss/theme.css'), 'utf8');
const value = (palette: string, shade: string) => {
  const m = new RegExp(`--color-${palette}-${shade}:\\s*([^;]+);`).exec(theme);
  if (!m) throw new Error(`Tailwind 색 변수가 없다: ${palette}-${shade}`);
  return m[1]!.trim();
};

const lines = PALETTES.flatMap((palette) =>
  Object.entries(LIGHT).map(([shade, from]) => `  --color-${palette}-${shade}: ${value(palette, from)};`),
);
console.log(`/* scripts/gen-light-theme.ts 가 만든다 — 손으로 고치지 않는다 */
:root[data-theme='light'] {
  color-scheme: light;
${lines.join('\n')}
}`);
