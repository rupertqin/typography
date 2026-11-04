/**
 * 富文本复制：优先 ClipboardItem 双类型写入（公众号后台能吃到样式），
 * 不支持时回退到 contentEditable + execCommand。
 */
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
      console.error('[clipboard] ClipboardItem 写入失败，回退 execCommand', error);
    }
  }

  const holder = document.createElement('div');
  holder.contentEditable = 'true';
  holder.innerHTML = html;
  holder.style.cssText = 'position:fixed;left:-9999px;top:0;';
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
    console.error('[clipboard] execCommand 复制失败', error);
    ok = false;
  }

  selection?.removeAllRanges();
  holder.remove();
  return ok;
}
