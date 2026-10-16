import { updateSettings, type Settings } from '@core/storage';
import { updateSave } from '../../lib/save';

type Props = {
  settings: Settings;
  /** 그림 보기 (그림이 있는 세트 · 내 기록에서만) */
  showScenes?: boolean;
  className?: string;
};

/** 타자 설정 체크박스. 세트 화면과 내 기록이 같이 쓴다 */
export default function SettingsControls({ settings, showScenes = false, className = '' }: Props) {
  const change = (patch: Partial<Settings>) => updateSave((s) => updateSettings(s, patch));
  const box = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <label className="flex items-center gap-1">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
  return (
    <div className={`flex flex-wrap gap-4 text-slate-300 ${className}`}>
      {showScenes && box('그림 보기', settings.showScenes, (v) => change({ showScenes: v }))}
      {box('들여쓰기 자동 입력', settings.autoIndent, (v) => change({ autoIndent: v }))}
      {box('키보드 보기', settings.showKeyboard, (v) => change({ showKeyboard: v }))}
      {box('숫자 6을 왼손 검지로', settings.sixFinger === 'left', (v) => change({ sixFinger: v ? 'left' : 'right' }))}
    </div>
  );
}
