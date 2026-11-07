import { CODE_THEME_GROUPS, FOLLOW_THEME_CODE } from '../../lib/code-themes';
import { useTypographyStore } from '../../lib/store';
import type { Theme } from '../../lib/themes';
import Select from '../ui/Select';

/** 代码配色只有下拉：不展示示例代码，观感等预览区的实际代码块说话 */
export default function CodeThemePicker({ theme }: { theme: Theme }) {
  const codeThemeId = useTypographyStore((state) => state.codeThemeId);
  const setCodeThemeId = useTypographyStore((state) => state.setCodeThemeId);

  return (
    <Select
      value={codeThemeId}
      onChange={setCodeThemeId}
      ariaLabel="代码配色"
      className="w-56 max-w-full"
      title="选一套独立的代码块配色，或跟随文章主题"
    >
      <option value={FOLLOW_THEME_CODE}>跟随主题（{theme.name}）</option>
      <optgroup label={`亮色（${CODE_THEME_GROUPS.light.length}）`}>
        {CODE_THEME_GROUPS.light.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </optgroup>
      <optgroup label={`暗色（${CODE_THEME_GROUPS.dark.length}）`}>
        {CODE_THEME_GROUPS.dark.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </optgroup>
    </Select>
  );
}
