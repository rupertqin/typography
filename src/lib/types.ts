export interface ThemeStyles {
  [key: string]: string;
}

export interface ThemeCardDecor {
  withHeading?: boolean;
  skipLead?: boolean;
  style?: string;
  start?: string;
  end?: string;
  line?: string;
}

export interface ThemeDecor {
  h1?: (html: string) => string;
  h2?: (html: string, index: number) => string;
  h3?: (html: string) => string;
  ulMark?: string | ((n: number) => string);
  olMark?: string | ((n: number) => string);
  hr?: string;
  quoteMark?: string;
  card?: ThemeCardDecor;
  [key: string]: unknown;
}

export interface Theme {
  id: string;
  name: string;
  accent: string;
  tags: string[];
  font?: string;
  page?: string;
  code?: 'light' | 'dark';
  styles: ThemeStyles;
  decor: ThemeDecor;
  hljs: Record<string, string>;
}

export interface ColorOverrides {
  main: string;
  parts: Record<string, string>;
}

export interface ColorPreset {
  color: string;
  name: string;
}

export interface ArticleType {
  id: string;
  name: string;
}
