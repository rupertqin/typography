/**
 * 文章主题自带的代码高亮调色板：暗色给绝大多数主题，亮色给 code 为 light 的主题。
 *
 * 键是 hljs token 名（去掉 hljs- 前缀），值是内联声明。要换配色改这里；
 * 只想覆盖某套主题时给 Theme 的 spec.hljs 传自己的表。
 */

/** 暗色代码块配色（默认，除 docs 外的主题都挂它） */
export const HLJS_DARK = {
  keyword: 'color:#c678dd;',
  built_in: 'color:#e6c07b;',
  type: 'color:#e6c07b;',
  class: 'color:#e6c07b;',
  literal: 'color:#56b6c2;',
  number: 'color:#d19a66;',
  string: 'color:#98c379;',
  regexp: 'color:#98c379;',
  comment: 'color:#7f848e;font-style:italic;',
  quote: 'color:#7f848e;font-style:italic;',
  doctag: 'color:#c678dd;',
  title: 'color:#61afef;',
  section: 'color:#e06c75;',
  name: 'color:#e06c75;',
  tag: 'color:#e06c75;',
  attr: 'color:#d19a66;',
  attribute: 'color:#98c379;',
  property: 'color:#e06c75;',
  variable: 'color:#e06c75;',
  'template-variable': 'color:#e06c75;',
  params: 'color:#abb2bf;',
  meta: 'color:#61afef;',
  symbol: 'color:#61afef;',
  bullet: 'color:#61afef;',
  link: 'color:#61afef;text-decoration:underline;',
  subst: 'color:#e06c75;',
  'selector-tag': 'color:#e06c75;',
  'selector-class': 'color:#d19a66;',
  'selector-id': 'color:#61afef;',
  'selector-attr': 'color:#d19a66;',
  'selector-pseudo': 'color:#d19a66;',
  addition: 'color:#98c379;',
  deletion: 'color:#e06c75;',
  emphasis: 'font-style:italic;',
  strong: 'font-weight:bold;'
};

/** 亮色代码块配色（code 为 light 的主题挂它） */
export const HLJS_LIGHT = {
  keyword: 'color:#cf222e;',
  built_in: 'color:#953800;',
  type: 'color:#953800;',
  class: 'color:#953800;',
  literal: 'color:#0550ae;',
  number: 'color:#0550ae;',
  string: 'color:#0a3069;',
  regexp: 'color:#0a3069;',
  comment: 'color:#6e7781;font-style:italic;',
  quote: 'color:#6e7781;font-style:italic;',
  doctag: 'color:#cf222e;',
  title: 'color:#8250df;',
  section: 'color:#0550ae;font-weight:bold;',
  name: 'color:#116329;',
  tag: 'color:#116329;',
  attr: 'color:#0550ae;',
  attribute: 'color:#0a3069;',
  property: 'color:#0550ae;',
  variable: 'color:#953800;',
  'template-variable': 'color:#953800;',
  params: 'color:#24292f;',
  meta: 'color:#0550ae;',
  symbol: 'color:#0550ae;',
  bullet: 'color:#953800;',
  link: 'color:#0a3069;text-decoration:underline;',
  subst: 'color:#24292f;',
  'selector-tag': 'color:#116329;',
  'selector-class': 'color:#6639ba;',
  'selector-id': 'color:#0550ae;',
  'selector-attr': 'color:#0550ae;',
  'selector-pseudo': 'color:#0550ae;',
  addition: 'color:#116329;background:#dafbe1;',
  deletion: 'color:#82071e;background:#ffebe9;',
  emphasis: 'font-style:italic;',
  strong: 'font-weight:bold;'
};
