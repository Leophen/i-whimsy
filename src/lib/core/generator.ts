/**
 * 生成器核心库 —— 随机数、UUID、口令与占位文本。
 *
 * 随机数一律使用 Web Crypto 的 CSPRNG（`crypto.getRandomValues`），
 * 不用 Math.random：口令与令牌必须是密码学安全的随机源。
 * 摘要 / HMAC / AES 已迁到 `@/lib/core/crypto`（Web Crypto + @noble/hashes），
 * 本文件不再依赖已废弃的 crypto-js。
 */

/* ------------------------------------------------------------------ *
 * 随机数（CSPRNG）
 * ------------------------------------------------------------------ */

export function randomBytes(length: number): Uint8Array {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return arr;
}

export function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  // 拒绝采样，消除取模偏差
  const limit = 0xffffffff - (0xffffffff % maxExclusive);
  let value = arr[0] as number;
  let guard = 0;
  while (value >= limit && guard < 32) {
    crypto.getRandomValues(arr);
    value = arr[0] as number;
    guard += 1;
  }
  return value % maxExclusive;
}

export function pickSecure<T>(items: readonly T[]): T {
  return items[randomInt(items.length)] as T;
}

/** Fisher–Yates（CSPRNG 版） */
export function shuffleSecure<T>(input: readonly T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j] as T, arr[i] as T];
  }
  return arr;
}

/* ------------------------------------------------------------------ *
 * UUID
 * ------------------------------------------------------------------ */

export function uuidV4(): string {
  return crypto.randomUUID();
}

/** v1 风格（时间戳 + 随机节点），纯客户端实现，仅用于需要时间序的场景。 */
export function uuidV1(): string {
  const bytes = randomBytes(16);
  const ts = Date.now();
  const timeLow = ts & 0xffffffff;
  const timeMid = (ts >>> 32) & 0xffff;
  const timeHiAndVersion = 0x1000 | (0x0fff & ((ts >>> 48) & 0x0fff));
  bytes[0] = (timeLow >>> 24) & 0xff;
  bytes[1] = (timeLow >>> 16) & 0xff;
  bytes[2] = (timeLow >>> 8) & 0xff;
  bytes[3] = timeLow & 0xff;
  bytes[4] = (timeMid >>> 8) & 0xff;
  bytes[5] = timeMid & 0xff;
  bytes[6] = (timeHiAndVersion >>> 8) & 0xff;
  bytes[7] = timeHiAndVersion & 0xff;
  bytes[8] = 0x80 | ((bytes[8] as number) & 0x3f);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** 短 id（Nano ID 风格），默认 21 位 64 进制。 */
export function nanoid(size = 21): string {
  const alphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
  const bytes = randomBytes(size);
  return Array.from(bytes, (b) => alphabet[(b as number) & 63]).join('');
}

/* ------------------------------------------------------------------ *
 * 密码 / 随机字符串
 * ------------------------------------------------------------------ */

export const CHAR_SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?',
  ambiguousRemoved: 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789',
} as const;

export interface PasswordOptions {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  /** 排除易混淆字符 0/O/l/1/I */
  excludeAmbiguous: boolean;
  /** 每种选中字符集至少出现一次 */
  requireEach: boolean;
  count: number;
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 16,
  lower: true,
  upper: true,
  digits: true,
  symbols: false,
  excludeAmbiguous: false,
  requireEach: true,
  count: 5,
};

function buildCharset(opts: PasswordOptions): string {
  let pool = '';
  if (opts.lower) pool += CHAR_SETS.lower;
  if (opts.upper) pool += CHAR_SETS.upper;
  if (opts.digits) pool += CHAR_SETS.digits;
  if (opts.symbols) pool += CHAR_SETS.symbols;
  if (opts.excludeAmbiguous) {
    const allowed = new Set(CHAR_SETS.ambiguousRemoved);
    pool = Array.from(new Set(pool))
      .filter((c) => allowed.has(c))
      .join('');
  }
  return pool;
}

export function generatePassword(opts: PasswordOptions): string {
  const pool = buildCharset(opts);
  if (!pool) throw new Error('至少需要选择一种字符类型');
  if (opts.length < 1 || opts.length > 512) throw new Error('长度需在 1 ~ 512 之间');

  const groups: string[] = [];
  if (opts.requireEach) {
    if (opts.lower) groups.push(CHAR_SETS.lower);
    if (opts.upper) groups.push(CHAR_SETS.upper);
    if (opts.digits) groups.push(CHAR_SETS.digits);
    if (opts.symbols) groups.push(CHAR_SETS.symbols);
    if (groups.length > opts.length) {
      throw new Error('长度不足以包含所有已选字符类型');
    }
  }

  const ensure = groups.map((g) => pickSecure(Array.from(g)));
  const rest: string[] = [];
  for (let i = 0; i < opts.length - ensure.length; i += 1) {
    rest.push(pickSecure(Array.from(pool)));
  }
  return shuffleSecure([...ensure, ...rest]).join('');
}

export function generatePasswords(opts: PasswordOptions): string[] {
  return Array.from({ length: Math.max(1, opts.count) }, () => generatePassword(opts));
}

/** 密码强度评估：长度 + 字符多样性 + 熵值。 */
export interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  entropy: number;
  /** 以每秒 10^10 次猜测估算的破解时间描述 */
  crackTime: string;
  suggestions: string[];
}

export function estimateStrength(password: string): StrengthResult {
  const suggestions: string[] = [];
  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^A-Za-z0-9]/.test(password)) poolSize += 33;
  if (/[\u4e00-\u9fa5]/.test(password)) poolSize += 20000;

  const entropy =
    password.length === 0 || poolSize === 0 ? 0 : password.length * Math.log2(poolSize);

  let score: StrengthResult['score'] = 0;
  if (entropy >= 28) score = 1;
  if (entropy >= 40) score = 2;
  if (entropy >= 60) score = 3;
  if (entropy >= 90) score = 4;

  const labels = ['极弱', '弱', '一般', '强', '极强'] as const;

  if (password.length < 12) suggestions.push('建议长度至少 12 位');
  if (!/[A-Z]/.test(password)) suggestions.push('加入大写字母可显著提升强度');
  if (!/[0-9]/.test(password)) suggestions.push('加入数字');
  if (!/[^A-Za-z0-9]/.test(password)) suggestions.push('加入特殊符号');
  if (/^(?:123|abc|password|qwerty|111|000)/i.test(password)) {
    suggestions.push('避免使用常见弱口令前缀');
    score = 0;
  }

  const guesses = 2 ** Math.max(0, entropy - 1);
  const seconds = guesses / 1e10;
  let crackTime = '瞬间';
  const units: [number, string][] = [
    [31536000, '年'],
    [86400, '天'],
    [3600, '小时'],
    [60, '分钟'],
  ];
  if (seconds >= 1) {
    for (const [unitSeconds, unitName] of units) {
      if (seconds >= unitSeconds) {
        crackTime = `${Math.floor(seconds / unitSeconds)} ${unitName}`;
        break;
      }
    }
    if (crackTime === '瞬间') crackTime = `${Math.floor(seconds)} 秒`;
  } else if (seconds > 0) {
    crackTime = '瞬间';
  }
  if (seconds >= 3.15e9) crackTime = '超过 100 年';

  return { score, label: labels[score], entropy: Math.round(entropy), crackTime, suggestions };
}

/* ------------------------------------------------------------------ *
 * Lorem Ipsum
 * ------------------------------------------------------------------ */

const LOREM_WORDS = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'sed',
  'do',
  'eiusmod',
  'tempor',
  'incididunt',
  'ut',
  'labore',
  'et',
  'dolore',
  'magna',
  'aliqua',
  'enim',
  'ad',
  'minim',
  'veniam',
  'quis',
  'nostrud',
  'exercitation',
  'ullamco',
  'laboris',
  'nisi',
  'aliquip',
  'ex',
  'ea',
  'commodo',
  'consequat',
  'duis',
  'aute',
  'irure',
  'in',
  'reprehenderit',
  'voluptate',
  'velit',
  'esse',
  'cillum',
  'eu',
  'fugiat',
  'nulla',
  'pariatur',
  'excepteur',
  'sint',
  'occaecat',
  'cupidatat',
  'non',
  'proident',
  'sunt',
  'culpa',
  'qui',
  'officia',
  'deserunt',
  'mollit',
  'anim',
  'id',
  'est',
  'laborum',
];

const LOREM_SENTENCE_START = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

const sentenceCase = (w: string, i: number) =>
  i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w;

function randomLoremWords(count: number): string[] {
  return Array.from({ length: count }, () => pickSecure(LOREM_WORDS));
}

export type LoremUnit = 'words' | 'sentences' | 'paragraphs';

export interface LoremOptions {
  count: number;
  unit: LoremUnit;
  startWithLorem: boolean;
}

export function generateLorem({ count, unit, startWithLorem }: LoremOptions): string {
  if (count < 1) return '';
  if (unit === 'words') {
    const words = randomLoremWords(count);
    return words.join(' ');
  }
  if (unit === 'sentences') {
    return Array.from({ length: count }, (_, si) => {
      const n = randomInt(9) + 8; // 8 ~ 16 词
      const words = randomLoremWords(n).map((w, i) => sentenceCase(w, i));
      const punctuation = pickSecure(['.', '.', '.', '!', '?']);
      if (si === 0 && startWithLorem) return LOREM_SENTENCE_START;
      return `${words.join(' ')}${punctuation}`;
    }).join(' ');
  }
  return Array.from({ length: count }, (_, pi) => {
    const sentenceCount = randomInt(3) + 3; // 3 ~ 5 句
    const sentences = Array.from({ length: sentenceCount }, (_, si) => {
      const n = randomInt(9) + 8;
      const words = randomLoremWords(n).map((w, i) => sentenceCase(w, i));
      const punctuation = pickSecure(['.', '.', '.', '!', '?']);
      if (pi === 0 && si === 0 && startWithLorem) return LOREM_SENTENCE_START;
      return `${words.join(' ')}${punctuation}`;
    });
    return sentences.join(' ');
  }).join('\n\n');
}
