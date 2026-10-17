// 공유 미리보기 이미지(public/og.png, 1200×630)를 만든다 — 문구를 바꾸면 다시 돌린다.
//   node scripts/gen-og.mjs
import { chromium } from '@playwright/test';
import { join } from 'node:path';

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #020617; color: #f1f5f9; font-family: 'Noto Sans CJK KR', 'Noto Sans KR', sans-serif;
    display: flex; padding: 72px 80px; gap: 48px; align-items: center; }
  .text { flex: 1; display: flex; flex-direction: column; gap: 28px; }
  .logo { font-family: 'DejaVu Sans Mono', monospace; font-size: 36px; font-weight: 700; color: #cbd5e1; }
  .season { font-size: 26px; font-weight: 700; color: #6ee7b7; }
  h1 { font-size: 76px; line-height: 1.15; font-weight: 800; word-break: keep-all; }
  .sub { font-size: 30px; color: #94a3b8; word-break: keep-all; }
  .cmd { font-family: 'DejaVu Sans Mono', monospace; font-size: 26px; color: #6ee7b7; }
  .cmd span { color: #64748b; }
</style></head><body>
  <div class="text">
    <div class="logo">DevKeys</div>
    <div class="season">시즌 1 · Git</div>
    <h1>Git, 읽지 말고<br>손으로.</h1>
    <div class="sub">명령을 치면 커밋 그래프가 바로 움직인다</div>
    <div class="cmd"><span>$</span> git merge --no-ff feature/search</div>
  </div>
  <svg width="300" height="360" viewBox="0 0 300 360">
    <g fill="none" stroke-width="6">
      <path d="M90 320 V40" stroke="#475569"/>
      <path d="M90 270 C 90 230, 210 230, 210 190 V140 C 210 100, 90 100, 90 70" stroke="#475569"/>
    </g>
    <g stroke-width="6">
      <circle cx="90" cy="320" r="18" fill="#064e3b" stroke="#34d399"/>
      <circle cx="90" cy="250" r="18" fill="#064e3b" stroke="#34d399"/>
      <circle cx="210" cy="180" r="18" fill="#0c4a6e" stroke="#38bdf8"/>
      <circle cx="210" cy="125" r="18" fill="#0c4a6e" stroke="#38bdf8"/>
      <circle cx="90" cy="55" r="22" fill="#78350f" stroke="#fbbf24"/>
    </g>
  </svg>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: join(import.meta.dirname, '../public/og.png') });
await browser.close();
console.log('public/og.png');
