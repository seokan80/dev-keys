/** 입력 위치 표시. 글자 폭을 차지하지 않는 세로 막대 */
export default function Caret({ blink }: { blink: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-block w-0 border-l-2 border-amber-300 align-text-bottom ${blink ? 'animate-pulse' : 'opacity-40'}`}
      style={{ height: '1.2em' }}
    />
  );
}
