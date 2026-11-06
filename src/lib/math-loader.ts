import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';

/**
 * MathJax 的同步转换器（TeX → SVG）。
 *
 * 这个模块只在真正出现公式时通过 `import()` 拉进来：mathjax-full 打进包里是 MB 级，
 * 让「不写公式的文章」完全不为它付费。
 *
 * 用 `liteAdaptor`（无 DOM 的适配器）而不是浏览器 DOM：出的是纯字符串，
 * 不依赖 CSSStyleSheet / document，jsdom 与 SSR 下也能跑。`fontCache: 'local'`
 * 把字形 outline 内联进每个 `<svg>`，复制到公众号后才是自包含的矢量图。
 */
export type MathConverter = (tex: string, display: boolean) => string;

let converter: MathConverter | null = null;

export function createMathConverter(): MathConverter {
  if (converter) return converter;

  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);

  const document = mathjax.document('', {
    InputJax: new TeX({ packages: AllPackages }),
    OutputJax: new SVG({ fontCache: 'local' }),
  });

  converter = (tex: string, display: boolean) =>
    // em/ex/containerWidth 决定 SVG 内部的字宽换算；行内 16px/8px 与正文 15~16px 接近
    adaptor.outerHTML(document.convert(tex, { display, em: 16, ex: 8, containerWidth: 1000 }));

  return converter;
}
