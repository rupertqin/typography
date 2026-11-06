import hljs from 'highlight.js/lib/core';

import { HLJS_VERSION } from './code-themes';
import bash from 'highlight.js/lib/languages/bash';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

/**
 * 语法加载：高频语言随首屏打包，其余按需 import（Vite 自动分包）。
 *
 * 为什么不在渲染时"先出纯文本、稍后补高亮"（doocs 的 data-language-pending 做法）：
 * 本项目的预览是 dangerouslySetInnerHTML 的纯字符串，事后改 DOM 会被下一次渲染
 * 整片覆盖；改成「先加载、再渲染」，渲染路径保持同步纯净。
 */

/** 版本号由生成脚本从本地 highlight.js 读出：CDN 兜底要与本地语法同版本 */
const CDN_BASE = `https://cdn.jsdelivr.net/npm/highlight.js@${HLJS_VERSION}/es/languages`;

const EAGER: Record<string, Parameters<typeof hljs.registerLanguage>[1]> = {
  bash,
  cpp,
  csharp,
  css,
  go,
  java,
  javascript,
  json,
  markdown,
  php,
  python,
  rust,
  sql,
  typescript,
  xml,
  yaml,
};

Object.entries(EAGER).forEach(([name, definition]) => hljs.registerLanguage(name, definition));

/** 常见别名 → highlight.js 的正式语言名 */
const ALIASES: Record<string, string> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  node: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  python3: 'python',
  sh: 'bash',
  zsh: 'bash',
  shell: 'bash',
  console: 'bash',
  yml: 'yaml',
  html: 'xml',
  vue: 'xml',
  svg: 'xml',
  htm: 'xml',
  cs: 'csharp',
  'c#': 'csharp',
  kt: 'kotlin',
  kts: 'kotlin',
  rs: 'rust',
  golang: 'go',
  ps1: 'powershell',
  pwsh: 'powershell',
  docker: 'dockerfile',
  container: 'dockerfile',
  tex: 'latex',
  md: 'markdown',
  jsonc: 'json',
  toml: 'ini',
  conf: 'ini',
  dotenv: 'ini',
  'c++': 'cpp',
  'objective-c': 'objectivec',
  objc: 'objectivec',
  'f#': 'fsharp',
  'vb': 'vbnet',
};

/**
 * 按需加载的语言：只列常用长尾，避免把一个 1MB 的语法包塞进首屏。
 * 全部用字面量 import，Vite 才能切成独立 chunk。
 */
const LAZY: Record<string, () => Promise<{ default: Parameters<typeof hljs.registerLanguage>[1] }>> = {
  apache: () => import('highlight.js/lib/languages/apache'),
  armasm: () => import('highlight.js/lib/languages/armasm'),
  c: () => import('highlight.js/lib/languages/c'),
  clojure: () => import('highlight.js/lib/languages/clojure'),
  cmake: () => import('highlight.js/lib/languages/cmake'),
  dart: () => import('highlight.js/lib/languages/dart'),
  diff: () => import('highlight.js/lib/languages/diff'),
  dockerfile: () => import('highlight.js/lib/languages/dockerfile'),
  elixir: () => import('highlight.js/lib/languages/elixir'),
  erlang: () => import('highlight.js/lib/languages/erlang'),
  fsharp: () => import('highlight.js/lib/languages/fsharp'),
  gradle: () => import('highlight.js/lib/languages/gradle'),
  graphql: () => import('highlight.js/lib/languages/graphql'),
  groovy: () => import('highlight.js/lib/languages/groovy'),
  haskell: () => import('highlight.js/lib/languages/haskell'),
  ini: () => import('highlight.js/lib/languages/ini'),
  julia: () => import('highlight.js/lib/languages/julia'),
  kotlin: () => import('highlight.js/lib/languages/kotlin'),
  latex: () => import('highlight.js/lib/languages/latex'),
  less: () => import('highlight.js/lib/languages/less'),
  lua: () => import('highlight.js/lib/languages/lua'),
  makefile: () => import('highlight.js/lib/languages/makefile'),
  matlab: () => import('highlight.js/lib/languages/matlab'),
  nginx: () => import('highlight.js/lib/languages/nginx'),
  objectivec: () => import('highlight.js/lib/languages/objectivec'),
  perl: () => import('highlight.js/lib/languages/perl'),
  powershell: () => import('highlight.js/lib/languages/powershell'),
  properties: () => import('highlight.js/lib/languages/properties'),
  protobuf: () => import('highlight.js/lib/languages/protobuf'),
  r: () => import('highlight.js/lib/languages/r'),
  ruby: () => import('highlight.js/lib/languages/ruby'),
  scala: () => import('highlight.js/lib/languages/scala'),
  scheme: () => import('highlight.js/lib/languages/scheme'),
  scss: () => import('highlight.js/lib/languages/scss'),
  stylus: () => import('highlight.js/lib/languages/stylus'),
  swift: () => import('highlight.js/lib/languages/swift'),
  vim: () => import('highlight.js/lib/languages/vim'),
  wasm: () => import('highlight.js/lib/languages/wasm'),
  x86asm: () => import('highlight.js/lib/languages/x86asm'),
};

/**
 * 这些语言名不是 highlight.js 语法，而是图表/扩展渲染入口：
 * mermaid 走自己的 SVG 渲染，plantuml / infographic 是 doocs 的扩展语法。
 * 不拦截的话会去 CDN 找同名语法包（404），控制台一片报错。
 */
const NON_HLJS = new Set(['mermaid', 'plantuml', 'infographic']);

const pending = new Map<string, Promise<void>>();

/** 代码块里写的语言名 → 正式语言名（未知的保留原样，交给 CDN 试一次） */
export function resolveLanguage(raw: string): string {
  const name = raw.trim().toLowerCase();
  if (!name) return '';
  return ALIASES[name] ?? name;
}

export function isLanguageReady(raw: string): boolean {
  const name = resolveLanguage(raw);
  return Boolean(name) && Boolean(hljs.getLanguage(name));
}

async function loadFromCdn(name: string): Promise<boolean> {
  const url = `${CDN_BASE}/${name}.min.js`;
  return import(/* @vite-ignore */ url)
    .then((module: { default: Parameters<typeof hljs.registerLanguage>[1] }) => {
      hljs.registerLanguage(name, module.default);
      return true;
    })
    .catch((error: unknown) => {
      console.warn(`[hljs] 语法加载失败：${name}`, error);
      return false;
    });
}

/**
 * 确保语法可用：本地分包 → CDN 兜底 → 放弃（渲染阶段自动退化为纯文本）。
 * 同一语言只请求一次；失败不重试，避免长尾语言反复打网络。
 */
export function ensureLanguage(raw: string): Promise<void> {
  const name = resolveLanguage(raw);
  if (!name || NON_HLJS.has(name) || hljs.getLanguage(name)) return Promise.resolve();

  const running = pending.get(name);
  if (running) return running;

  const local = LAZY[name];
  const task = (local
    ? local()
        .then((module) => {
          hljs.registerLanguage(name, module.default);
        })
        .catch(() => loadFromCdn(name).then(() => undefined))
    : loadFromCdn(name).then(() => undefined)
  ).finally(() => {
    pending.delete(name);
  });

  pending.set(name, task);
  return task;
}

const FENCE_LANGUAGE = /^[ \t]*(?:```|~~~)[ \t]*([\w#+.-]+)/gm;

/** 扫描正文里出现的代码语言（用于渲染前预加载） */
export function collectCodeLanguages(markdown: string): string[] {
  const found = new Set<string>();
  FENCE_LANGUAGE.lastIndex = 0;
  let match = FENCE_LANGUAGE.exec(markdown);
  while (match) {
    const name = resolveLanguage(match[1]);
    if (name && !NON_HLJS.has(name)) found.add(name);
    match = FENCE_LANGUAGE.exec(markdown);
  }
  return Array.from(found);
}

export { hljs };
