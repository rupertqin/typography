/**
 * 标题 / 分隔线 / 列表符号的装饰 helper：返回内联样式的 HTML 片段。
 *
 * 用函数而不是纯字符串，是为了把主题色当参数传进来（换主色时才能跟着重映射）。
 */

/** 居中 + 大字距的装饰注，多用作 hr 分隔 */
export function spacedNote(html: string, color: string): string {
  return `<section style="margin:2em 0;text-align:center;color:${color};font-size:14px;letter-spacing:8px;line-height:1;">${html}</section>`;
}

/** 两侧细线夹住文字的标题 */
export function linedTitle(html: string, color: string, lineWidth = 28): string {
  const line = `<span style="display:inline-block;width:${lineWidth}px;height:0;border-top:1px solid ${color};vertical-align:middle;"></span>`;
  return `${line}<span style="display:inline-block;margin:0 12px;vertical-align:middle;">${html}</span>${line}`;
}

/** 补成两位数字：1 → 01 */
export function padTwoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

/** 中文数字表：1~10 */
export const CN_NUMERALS = '壹贰叁肆伍陆柒捌玖拾';

/** 1~10 转中文数字，超出范围原样输出 */
export function toCnNumeral(value: number): string {
  return value <= 10 ? CN_NUMERALS[value - 1] : String(value);
}

/** 小圆点 */
export function colorDot(color: string, size = 6): string {
  return `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:50%;background:${color};vertical-align:middle;"></span>`;
}

/** 圆形数字徽标（label 常直接传序号） */
export function circleBadge(label: string | number, background: string, color = '#fff'): string {
  return `<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${background};color:${color};font-size:11px;font-weight:bold;line-height:18px;text-align:center;letter-spacing:0;vertical-align:1px;">${label}</span>`;
}

/** 把一段内联声明包成独立整行（hr 之类的线块） */
export function blockLine(declarations: string, extraStyle = ''): string {
  return `<span style="display:block;line-height:0;${extraStyle}"><span style="display:inline-block;${declarations}"></span></span>`;
}

/** 圆点 + 双层横线的角标组合，side 决定左右朝向 */
export function cornerRule(color: string, side: 'left' | 'right'): string {
  const lines = `<span style="display:inline-block;line-height:0;vertical-align:middle;${side === 'left' ? 'text-align:right;' : 'text-align:left;'}"><span style="display:inline-block;width:36px;height:0;border-top:1px solid ${color};"></span><br><span style="display:inline-block;width:22px;height:0;margin-top:4px;border-top:1px solid ${color};"></span></span>`;
  const dot = `<span style="display:inline-block;width:9px;height:9px;margin:0 -1px;border:1px solid ${color};border-${side === 'left' ? 'top' : 'bottom'}-color:transparent;border-radius:50%;vertical-align:middle;"></span>`;
  return side === 'left' ? lines + dot : dot + lines;
}
