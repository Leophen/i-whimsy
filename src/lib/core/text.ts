/**
 * 文本处理核心库 —— 纯函数。
 * 大小写/命名风格转换、替换、去重排序、多维统计。
 */

/* ------------------------------------------------------------------ *
 * 分词
 * ------------------------------------------------------------------ */

/** 把任意写法的标识符切成单词数组，兼容 camelCase / snake-case / 空格 / 中文边界。 */
export function tokenizeWords(input: string): string[] {
  return (
    input
      // 大驼峰切分：HTTPServer → HTTP / Server
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      // 小驼峰切分：getUserID → get / User / ID
      .replace(/([a-z\d])([A-Z])/g, '$1 $2')
      // 分隔符统一为空格
      .replace(/[_\-./\\|]+/g, ' ')
      .split(/[\s　]+/)
      .map((w) => w.trim())
      .filter(Boolean)
  );
}

export type CaseMode =
  | 'upper'
  | 'lower'
  | 'title'
  | 'sentence'
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'kebab'
  | 'constant'
  | 'train'
  | 'dot'
  | 'path'
  | 'alternate'
  | 'invert'
  | 'cobol'
  | 'flat'
  | 'reverse';

export const CASE_MODES: { value: CaseMode; label: string; hint: string }[] = [
  { value: 'upper', label: '全大写', hint: 'HELLO WORLD' },
  { value: 'lower', label: '全小写', hint: 'hello world' },
  { value: 'title', label: '首字母大写', hint: 'Hello World' },
  { value: 'sentence', label: '句首字母大写', hint: 'Hello world' },
  { value: 'camel', label: '小驼峰', hint: 'helloWorld' },
  { value: 'pascal', label: '大驼峰', hint: 'HelloWorld' },
  { value: 'snake', label: '下划线', hint: 'hello_world' },
  { value: 'kebab', label: '短横线', hint: 'hello-world' },
  { value: 'constant', label: '常量式', hint: 'HELLO_WORLD' },
  { value: 'train', label: '火车式', hint: 'Hello-World' },
  { value: 'dot', label: '点号', hint: 'hello.world' },
  { value: 'path', label: '路径式', hint: 'hello/world' },
  { value: 'cobol', label: 'COBOL 式', hint: 'HELLO-WORLD' },
  { value: 'flat', label: '紧凑式', hint: 'helloworld' },
  { value: 'alternate', label: '交替大小写', hint: 'hElLo' },
  { value: 'invert', label: '大小写反转', hint: 'HELLO → hello' },
  { value: 'reverse', label: '字符反转', hint: 'olleh' },
];

const firstUpper = (w: string) => (w ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : '');

export function convertCase(input: string, mode: CaseMode): string {
  const words = tokenizeWords(input);
  switch (mode) {
    case 'upper':
      return input.toUpperCase();
    case 'lower':
      return input.toLowerCase();
    case 'title':
      return words.map(firstUpper).join(' ');
    case 'sentence':
      return input.toLowerCase().replace(/(^\s*\w|[.!?。！？]\s*\w)/g, (c) => c.toUpperCase());
    case 'camel':
      return words.map((w, i) => (i === 0 ? w.toLowerCase() : firstUpper(w))).join('');
    case 'pascal':
      return words.map((w) => firstUpper(w)).join('');
    case 'snake':
      return words.map((w) => w.toLowerCase()).join('_');
    case 'kebab':
      return words.map((w) => w.toLowerCase()).join('-');
    case 'constant':
      return words.map((w) => w.toUpperCase()).join('_');
    case 'train':
      return words.map((w) => firstUpper(w)).join('-');
    case 'dot':
      return words.map((w) => w.toLowerCase()).join('.');
    case 'path':
      return words.map((w) => w.toLowerCase()).join('/');
    case 'cobol':
      return words.map((w) => w.toUpperCase()).join('-');
    case 'flat':
      return words.map((w) => w.toLowerCase()).join('');
    case 'alternate':
      return input
        .split('')
        .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
        .join('');
    case 'invert':
      return input
        .split('')
        .map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
        .join('');
    case 'reverse':
      return Array.from(input).reverse().join('');
    default:
      return input;
  }
}

/* ------------------------------------------------------------------ *
 * 替换
 * ------------------------------------------------------------------ */

export const escapeRegExp = (literal: string): string =>
  literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface ReplaceOptions {
  find: string;
  replacement: string;
  /** 是否启用正则模式 */
  regex: boolean;
  /** 正则标志中的 i */
  ignoreCase: boolean;
  /** 整词匹配 */
  wholeWord: boolean;
  /** 多行模式 */
  multiline: boolean;
}

export interface ReplaceResult {
  output: string;
  count: number;
  error?: string;
}

export function replaceText(input: string, opts: ReplaceOptions): ReplaceResult {
  const { find, replacement, regex, ignoreCase, wholeWord, multiline } = opts;
  if (!find) return { output: input, count: 0 };

  const flags = ['g', ignoreCase ? 'i' : '', multiline ? 'm' : ''].join('');
  let source = regex ? find : escapeRegExp(find);
  if (wholeWord) source = `\\b(?:${source})\\b`;

  let re: RegExp;
  try {
    re = new RegExp(source, flags);
  } catch (err) {
    return {
      output: input,
      count: 0,
      error: err instanceof Error ? err.message : '无效的正则表达式',
    };
  }

  let count = 0;
  let output: string;
  try {
    output = input.replace(re, (match) => {
      count += 1;
      // 支持 $1 / $& 等捕获组占位符；非正则模式下 replacement 原样替换
      if (!regex) return replacement;
      return replacement.replace(/\$(\$|&|\d+)/g, (_m, token: string) => {
        if (token === '$') return '$';
        if (token === '&') return match;
        return match;
      });
    });
  } catch (err) {
    return { output: input, count: 0, error: err instanceof Error ? err.message : '替换失败' };
  }
  return { output, count };
}

/* ------------------------------------------------------------------ *
 * 行级处理
 * ------------------------------------------------------------------ */

export type LineMode =
  'dedupe' | 'unique' | 'sort-asc' | 'sort-desc' | 'shuffle' | 'reverse' | 'trim' | 'compact';

export interface LineOptions {
  mode: LineMode;
  ignoreCase: boolean;
  trimLine: boolean;
}

export function processLines(
  input: string,
  opts: LineOptions,
): { output: string; removed: number } {
  const raw = input.split(/\r?\n/);
  const before = raw.length;
  const normalized = raw.map((l) => (opts.trimLine ? l.trim() : l));

  switch (opts.mode) {
    case 'trim':
      return { output: normalized.join('\n'), removed: 0 };
    case 'compact': {
      const compacted = normalized.filter((l, i) => l !== '' || (normalized[i - 1] ?? '') !== '');
      return { output: compacted.join('\n'), removed: before - compacted.length };
    }
    case 'reverse':
      return { output: normalized.reverse().join('\n'), removed: 0 };
    case 'shuffle': {
      const arr = [...normalized];
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j] as string, arr[i] as string];
      }
      return { output: arr.join('\n'), removed: 0 };
    }
    case 'sort-asc':
    case 'sort-desc': {
      const arr = [...normalized];
      arr.sort((a, b) => {
        const av = opts.ignoreCase ? a.toLowerCase() : a;
        const bv = opts.ignoreCase ? b.toLowerCase() : b;
        return av.localeCompare(bv, 'zh-Hans-CN', { numeric: true });
      });
      if (opts.mode === 'sort-desc') arr.reverse();
      return { output: arr.join('\n'), removed: 0 };
    }
    case 'unique': {
      // 保留每个值的首次出现顺序，按出现次数排序
      const counter = new Map<string, number>();
      for (const l of normalized) counter.set(l, (counter.get(l) ?? 0) + 1);
      const sorted = [...counter.entries()].sort((a, b) => b[1] - a[1]);
      return { output: sorted.map(([l]) => l).join('\n'), removed: before - sorted.length };
    }
    case 'dedupe':
    default: {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const l of normalized) {
        const key = opts.ignoreCase ? l.toLowerCase() : l;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(l);
      }
      return { output: out.join('\n'), removed: before - out.length };
    }
  }
}

/* ------------------------------------------------------------------ *
 * 统计
 * ------------------------------------------------------------------ */

/** UTF-8 字节数：正确处理 emoji / 代理对。 */
export function byteSize(text: string): number {
  return new TextEncoder().encode(text).length;
}

export interface TextStats {
  /** 字符数（按 Unicode 码点，emoji 计 1） */
  chars: number;
  /** 字符数（按 UTF-16 code unit，JS 原生 length） */
  codeUnits: number;
  /** UTF-8 字节数 */
  bytes: number;
  /** 行数 */
  lines: number;
  /** 单词数（中英混合：英文按词、中日韩按字） */
  words: number;
  /** 中文字符数（CJK 统一表意文字 + 扩展区） */
  cjk: number;
  /** 中文标点数 */
  cjkPunctuation: number;
  /** 数字字符数 */
  digits: number;
  /** 英文字母数 */
  letters: number;
  /** 空白字符数 */
  spaces: number;
  /** 英文单词数 */
  englishWords: number;
  /** 去重后的单词数 */
  uniqueWords: number;
  /** 最长单词 */
  longestWord: string;
  /** 阅读时长（中文 400 字/分钟，英文 200 词/分钟） */
  readingMinutes: number;
  /** 平均词长 */
  avgWordLength: number;
}

const CJK_RE = /[㐀-䶿一-鿿豈-﫿-﫿぀-ヿ가-힯]/g;
const CJK_PUNCT_RE = /[。，《》（）！？、；：「」『』〈〉《》…—·～【】]/g;

export function analyzeText(text: string): TextStats {
  const chars = Array.from(text).length;
  const lines = text === '' ? 0 : text.split(/\r?\n/).length;
  const cjk = (text.match(CJK_RE) ?? []).length;
  const cjkPunctuation = (text.match(CJK_PUNCT_RE) ?? []).length;
  const digits = (text.replace(/\d/g, '').length && (text.match(/\d/g) ?? []).length) || 0;
  const letters = (text.match(/[A-Za-z]/g) ?? []).length;
  const spaces = (text.match(/\s/g) ?? []).length;

  const englishWords = text.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
  const lower = englishWords.map((w) => w.toLowerCase());
  const uniqueWords = new Set(lower).size;
  const longestWord = englishWords.reduce((a, b) => (b.length > a.length ? b : a), '');
  const totalWords = englishWords.length + cjk;
  const avgWordLength =
    englishWords.length === 0
      ? 0
      : Number((englishWords.reduce((s, w) => s + w.length, 0) / englishWords.length).toFixed(2));
  const readingMinutes = Number((cjk / 400 + englishWords.length / 200).toFixed(2));

  return {
    chars,
    codeUnits: text.length,
    bytes: byteSize(text),
    lines,
    words: totalWords,
    cjk,
    cjkPunctuation,
    digits,
    letters,
    spaces,
    englishWords: englishWords.length,
    uniqueWords,
    longestWord,
    readingMinutes,
    avgWordLength,
  };
}

/* ------------------------------------------------------------------ *
 * 其它
 * ------------------------------------------------------------------ */

/** 全角 ⇄ 半角互转（ASCII 区间 0x21–0x7E，空格除外）。 */
export function convertWidth(text: string, to: 'full' | 'half'): string {
  return (
    text.replace(/[\x21-\x7E　]/g, (ch) => {
      if (ch === '　') return to === 'half' ? ' ' : '　';
      if (to === 'half') return ch;
      const code = ch.charCodeAt(0);
      return code >= 0x21 && code <= 0x7e ? String.fromCharCode(code + 0xfee0) : ch;
    }) + ''
  );
}

export function fullToHalf(text: string): string {
  return text.replace(/[！-～　]/g, (ch) =>
    ch === '　' ? ' ' : String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  );
}

export function halfToFull(text: string): string {
  return text.replace(/[!-~ ]/g, (ch) =>
    ch === ' ' ? '　' : String.fromCharCode(ch.charCodeAt(0) + 0xfee0),
  );
}

/** 从 data URL 中提取 mime 与 base64 主体。 */
export function splitDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const m = /^data:([^;,]+)?(;charset=[^;,]+)?;base64,(.*)$/is.exec(dataUrl.trim());
  if (!m) return null;
  return { mime: m[1] ?? 'application/octet-stream', base64: m[3] ?? '' };
}
