import { useEffect } from 'react';
import type { RefObject } from 'react';
import { loadAssetBundle } from './local-assets';
import { resolveLocalImages } from './local-images';

export { resolveLocalImages, restoreLocalImages, stripLocalImageMarks } from './local-images';

/**
 * 挂在预览上：正文一变就试着把占位框换成真图；
 * 页面首次加载时仓库是异步从 IndexedDB 读的，读到了再接一次
 * （否则刷新后的第一屏还是占位框）。
 */
export function useLocalImages(articleRef: RefObject<HTMLElement | null>, revision: string): void {
  useEffect(() => {
    const root = articleRef.current;
    if (!root) return;
    resolveLocalImages(root);

    let alive = true;
    void loadAssetBundle().then((changed) => {
      if (!alive || !changed) return;
      const node = articleRef.current;
      if (node) resolveLocalImages(node);
    });
    return () => {
      alive = false;
    };
  }, [articleRef, revision]);
}
