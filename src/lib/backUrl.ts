/**
 * 「返回站点」的目标地址：同一份产物挂在子域名根或任意子路径，父站不是同一个地方。
 *
 * - 子路径（GitHub Pages 的 `/typography/`、主站反代的 `/typography/`）：上一级就在同域，
 *   `../` 直接命中。这里不能拿 PUBLIC_BACK_URL 覆盖，否则 GitHub Pages 项目站点会跳过
 *   自己的站点根、直接奔主站。
 * - 独立子域名的根（`typography.gantz.host/`）：URL 里推不出上一级（`../` 会指回自己），
 *   只能由 PUBLIC_BACK_URL 显式指定；不配就不显示按钮。
 */
export function resolveBackHref(pathname: string, href: string, backUrl?: string): string | undefined {
  const path = pathname.replace(/\/+$/, '');
  if (path !== '' && path !== '/') return new URL('../', href).href;
  return backUrl || undefined;
}
