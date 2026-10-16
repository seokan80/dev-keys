import { FINGERS, FINGER_NAMES, type Finger } from '@core/keyboard';
import { fingerColor } from './FingerKeyboard';

type Props = {
  /** 지금 써야 하는 손가락 */
  active?: readonly Finger[];
};

export default function FingerLegend({ active = [] }: Props) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-400">
      {FINGERS.map((finger) => (
        <li
          key={finger}
          className={`flex items-center gap-1 ${active.includes(finger) ? 'font-bold text-slate-100' : ''}`}
        >
          <span className="inline-block size-3 rounded-sm" style={{ backgroundColor: fingerColor(finger) }} />
          {FINGER_NAMES[finger]}
        </li>
      ))}
    </ul>
  );
}
