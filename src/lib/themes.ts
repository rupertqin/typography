/**
 * 主题总表 = 原包切出来的 35 套（生成文件）+ 从 md.doocs 移植的 3 套（手写）。
 * 生成文件会被 npm run extract:themes 覆盖，手写主题放在 themes.extra.js 里不受影响。
 */
import { THEMES as GENERATED_THEMES } from './themes.generated.js';
import { MD_THEMES } from './themes.extra.js';
import type { Theme } from './types';

const GENERATED = GENERATED_THEMES as unknown as Theme[];

export const GENERATED_THEME_COUNT = GENERATED.length;

export const THEMES: Theme[] = [...GENERATED, ...MD_THEMES];
