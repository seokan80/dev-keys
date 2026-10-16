import { useEffect, useState } from 'react';
import type { TreeScene } from '../../lib/content/check';
import GitTree from '../git/GitTree';

/**
 * Enter 뒤에 보여 줄 커밋 트리. 명령 전 트리를 잠깐 보여 준 뒤 명령 뒤 트리로 바꿔
 * 새 커밋이 튀어나오고 이름표가 옮겨 가는 움직임을 보여 준다.
 */
export default function TreeSceneView({ tree }: { tree: TreeScene }) {
  const [after, setAfter] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setAfter(true), 350);
    return () => clearTimeout(id);
  }, []);

  return (
    <figure
      className="my-3 rounded-lg border border-sky-900 bg-slate-950/70 p-4 font-sans text-sm"
      data-testid="scene"
      data-kind="tree"
    >
      <GitTree
        state={after ? tree.after : tree.before}
        layout={after ? tree.layoutAfter : tree.layoutBefore}
        previous={after ? tree.layoutBefore : undefined}
        names={tree.names}
        title="명령 뒤 커밋 트리"
      />
      <figcaption className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sky-200">{tree.caption}</span>
        <span className="text-xs text-slate-500">
          <kbd className="font-mono">Enter</kbd> 계속
        </span>
      </figcaption>
    </figure>
  );
}
