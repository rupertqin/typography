/**
 * 富文本复制：优先 ClipboardItem 双类型写入（公众号后台能吃到样式）。
 *
 * 降级不能直接让浏览器序列化选区：选区复制会把外层 section 拆平
 * （sections 消失、样式被算成 inline 写在 p/span 上，padding/border-radius 全丢），
 * 粘进公众号就只剩裸段落 —— 也就是「没有 wrapper 容器」。
 * 所以降级时用 copy 事件拦截：自己往 clipboardData 里塞原始 HTML，绕开浏览器序列化。
 */
const HOLDER_STYLE = 'position:fixed;left:-9999px;top:0;opacity:0;';

/** 用一个占位选区让 execCommand('copy') 被允许触发，再在 copy 事件里写入保真内容 */
function copyViaEvent(html: string, plainText: string): boolean {
  const holder = document.createElement('div');
  holder.textContent = '.';
  holder.style.cssText = HOLDER_STYLE;
  document.body.appendChild(holder);

  const range = document.createRange();
  range.selectNodeContents(holder);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  let handled = false;
  const onCopy = (event: ClipboardEvent) => {
    if (!event.clipboardData) return;
    try {
      event.clipboardData.setData('text/html', html);
      event.clipboardData.setData('text/plain', plainText);
    } catch {
      return;
    }
    event.preventDefault();
    handled = true;
  };

  document.addEventListener('copy', onCopy, true);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (error) {
    console.error('[clipboard] execCommand 复制失败', error);
    ok = false;
  }
  document.removeEventListener('copy', onCopy, true);

  selection?.removeAllRanges();
  holder.remove();
  return ok && handled;
}

/** 最后一档：连 copy 事件都拿不到 clipboardData 时，退回选区复制（会丢容器样式） */
function copyViaSelection(html: string): boolean {
  const holder = document.createElement('div');
  holder.contentEditable = 'true';
  holder.innerHTML = html;
  holder.style.cssText = HOLDER_STYLE;
  document.body.appendChild(holder);

  const range = document.createRange();
  range.selectNodeContents(holder);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (error) {
    console.error('[clipboard] 选区复制失败', error);
    ok = false;
  }

  selection?.removeAllRanges();
  holder.remove();
  return ok;
}

export async function copyRichText(html: string, plainText: string): Promise<boolean> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
        }),
      ]);
      return true;
    } catch (error) {
      console.error('[clipboard] ClipboardItem 写入失败，改用 copy 事件', error);
    }
  }

  if (copyViaEvent(html, plainText)) return true;
  return copyViaSelection(html);
}
