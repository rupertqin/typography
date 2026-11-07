import { Theme } from '../theme';
import { MD_ACCENT, MD_CLASSIC_STYLES, MD_CODE_THEME } from '../md-styles';

/** 经典 · md-classic · #0f4c81 */
export default new Theme({
  id: 'md-classic',
  name: '经典',
  accent: MD_ACCENT,
  tags: ['news', 'business'],
  code: 'dark',
  styles: MD_CLASSIC_STYLES,
  codeTheme: MD_CODE_THEME,
});
