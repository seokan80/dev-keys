import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type RealVim = {
  lines: string[];
  cursor: { row: number; col: number };
  saved: string[];
  closed: boolean;
  register: { kind: 'line' | 'char'; text: string[] } | null;
};
/** 프로필·viminfo·스왑을 끄고 임시 파일에서 실제 Vim 키를 실행한다. */
export function realVim(lines: readonly string[], keys: string): RealVim {
  const dir = mkdtempSync(join(tmpdir(), 'devkeys-vim-'));
  const quote = (s: string) => `'${s.replaceAll("'", "''")}'`;
  try {
    const file = join(dir, 'practice.txt');
    const output = join(dir, 'result.json');
    const script = join(dir, 'run.vim');
    writeFileSync(file, `${lines.join('\n')}\n`);
    const literal = keys
      .replaceAll('\\', '\\\\')
      .replaceAll('"', '\\"')
      .replace(/<(Esc|CR|BS|C-r)>/g, '\\<$1>');
    writeFileSync(
      script,
      [
        'set nocompatible nomore noautoindent nosmartindent backspace=indent,eol,start',
        'set noignorecase wrapscan startofline',
        `edit ${file}`,
        'let g:returned = 0',
        'function! Capture()',
        `call writefile([json_encode({'lines':getline(1,'$'),'cursor':{'row':line('.')-1,'col':col('.')-1},'saved':readfile(${quote(file)}),'closed':!g:returned,'reg':getreg('"',1,1),'kind':getregtype('"')})], ${quote(output)})`,
        'endfunction',
        'autocmd VimLeavePre * call Capture()',
        `call feedkeys("gg0${literal}", 'xt')`,
        'let g:returned = 1',
        'call Capture()',
        'qa!',
      ].join('\n'),
    );
    try {
      execFileSync('vim', ['-Nu', 'NONE', '-n', '-i', 'NONE', '-es', '-S', script], { timeout: 5000, stdio: 'pipe' });
    } catch (error) {
      // :q의 E37처럼 예상한 Vim 오류도 상태를 남긴다. 실행 자체 실패는 감추지 않는다.
      if (!existsSync(output)) throw error;
    }
    const raw = JSON.parse(readFileSync(output, 'utf8')) as {
      lines: string[];
      cursor: { row: number; col: number };
      saved: string[];
      closed: boolean;
      reg: string[];
      kind: string;
    };
    return {
      lines: raw.lines,
      cursor: raw.cursor,
      saved: raw.saved,
      closed: Boolean(raw.closed),
      register: raw.reg.length ? { kind: raw.kind === 'V' ? 'line' : 'char', text: raw.reg } : null,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
