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
      <label className="flex items-center gap-1">
        글자 크기
        <select
          className="rounded border border-slate-600 bg-slate-900 px-1 py-0.5"
          value={settings.fontSize}
          onChange={(e) => change({ fontSize: e.target.value as Settings['fontSize'] })}
        >
          <option value="sm">작게</option>
          <option value="md">보통</option>
          <option value="lg">크게</option>
          <option value="xl">아주 크게</option>
        </select>
      </label>
    </div>
  );
}
