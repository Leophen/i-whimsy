/**
 * 数值 / 单位换算核心库 —— 全部以「换算到基准单位」的方式实现，避免 O(n²) 组合表。
 */

/* ------------------------------------------------------------------ *
 * 单位换算
 * ------------------------------------------------------------------ */

export interface UnitDef {
  id: string;
  label: string;
  /** 换算到该类基准单位的乘数 */
  factor: number;
  /** 温度等非乘法换算的可选转换函数 */
  toBase?: (v: number) => number;
  fromBase?: (v: number) => number;
  /** 常见符号别名，用于搜索 */
  alias?: string[];
}

export interface UnitCategory {
  id: string;
  label: string;
  base: string;
  units: UnitDef[];
}

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    label: '长度',
    base: 'm',
    units: [
      { id: 'nm', label: '纳米', factor: 1e-9, alias: ['nanometer'] },
      { id: 'um', label: '微米', factor: 1e-6, alias: ['micrometer'] },
      { id: 'mm', label: '毫米', factor: 0.001, alias: ['millimeter'] },
      { id: 'cm', label: '厘米', factor: 0.01, alias: ['centimeter'] },
      { id: 'dm', label: '分米', factor: 0.1 },
      { id: 'm', label: '米', factor: 1, alias: ['meter'] },
      { id: 'km', label: '千米', factor: 1000, alias: ['kilometer'] },
      { id: 'in', label: '英寸', factor: 0.0254, alias: ['inch'] },
      { id: 'ft', label: '英尺', factor: 0.3048, alias: ['foot'] },
      { id: 'yd', label: '码', factor: 0.9144, alias: ['yard'] },
      { id: 'mi', label: '英里', factor: 1609.344, alias: ['mile'] },
      { id: 'nmi', label: '海里', factor: 1852 },
      { id: 'li', label: '里（市里）', factor: 500 },
      { id: 'chi', label: '尺（市尺）', factor: 1 / 3 },
      { id: 'cun', label: '寸（市寸）', factor: 1 / 30 },
      { id: 'ly', label: '光年', factor: 9.4607304725808e15, alias: ['lightyear'] },
    ],
  },
  {
    id: 'mass',
    label: '重量',
    base: 'kg',
    units: [
      { id: 'mg', label: '毫克', factor: 1e-6 },
      { id: 'g', label: '克', factor: 0.001, alias: ['gram'] },
      { id: 'kg', label: '千克', factor: 1, alias: ['kilogram'] },
      { id: 't', label: '吨', factor: 1000, alias: ['tonne'] },
      { id: 'oz', label: '盎司', factor: 0.028349523125, alias: ['ounce'] },
      { id: 'lb', label: '磅', factor: 0.45359237, alias: ['pound'] },
      { id: 'st', label: '英石', factor: 6.35029318 },
      { id: 'jin', label: '斤（市斤）', factor: 0.5 },
      { id: 'liang', label: '两（市两）', factor: 0.05 },
      { id: 'ct', label: '克拉', factor: 0.0002, alias: ['carat'] },
    ],
  },
  {
    id: 'area',
    label: '面积',
    base: 'm2',
    units: [
      { id: 'mm2', label: '平方毫米', factor: 1e-6 },
      { id: 'cm2', label: '平方厘米', factor: 1e-4 },
      { id: 'm2', label: '平方米', factor: 1 },
      { id: 'km2', label: '平方千米', factor: 1e6 },
      { id: 'ha', label: '公顷', factor: 10000, alias: ['hectare'] },
      { id: 'mu', label: '亩', factor: 666.6667 },
      { id: 'acre', label: '英亩', factor: 4046.8564224 },
      { id: 'in2', label: '平方英寸', factor: 0.00064516 },
      { id: 'ft2', label: '平方英尺', factor: 0.09290304 },
      { id: 'yd2', label: '平方码', factor: 0.83612736 },
    ],
  },
  {
    id: 'volume',
    label: '体积',
    base: 'l',
    units: [
      { id: 'ml', label: '毫升', factor: 0.001 },
      { id: 'l', label: '升', factor: 1, alias: ['liter'] },
      { id: 'm3', label: '立方米', factor: 1000 },
      { id: 'cm3', label: '立方厘米', factor: 0.001 },
      { id: 'gal_us', label: '加仑（美）', factor: 3.785411784 },
      { id: 'gal_uk', label: '加仑（英）', factor: 4.54609 },
      { id: 'qt_us', label: '夸脱（美）', factor: 0.946352946 },
      { id: 'pt_us', label: '品脱（美）', factor: 0.473176473 },
      { id: 'floz_us', label: '液量盎司（美）', factor: 0.0295735296 },
      { id: 'floz_uk', label: '液量盎司（英）', factor: 0.0284130625 },
      { id: 'cup', label: '杯（240ml）', factor: 0.24 },
      { id: 'tbsp', label: '汤匙（15ml）', factor: 0.015 },
      { id: 'tsp', label: '茶匙（5ml）', factor: 0.005 },
    ],
  },
  {
    id: 'temperature',
    label: '温度',
    base: 'c',
    units: [
      { id: 'c', label: '摄氏度 °C', factor: 1, alias: ['celsius'] },
      {
        id: 'f',
        label: '华氏度 °F',
        factor: 1,
        toBase: (v) => ((v - 32) * 5) / 9,
        fromBase: (v) => (v * 9) / 5 + 32,
        alias: ['fahrenheit'],
      },
      {
        id: 'k',
        label: '开尔文 K',
        factor: 1,
        toBase: (v) => v - 273.15,
        fromBase: (v) => v + 273.15,
        alias: ['kelvin'],
      },
      {
        id: 'r',
        label: '兰氏度 °R',
        factor: 1,
        toBase: (v) => ((v - 491.67) * 5) / 9,
        fromBase: (v) => ((v + 273.15) * 9) / 5,
        alias: ['rankine'],
      },
    ],
  },
  {
    id: 'time',
    label: '时间',
    base: 's',
    units: [
      { id: 'ns', label: '纳秒', factor: 1e-9 },
      { id: 'us', label: '微秒', factor: 1e-6 },
      { id: 'ms', label: '毫秒', factor: 0.001 },
      { id: 's', label: '秒', factor: 1, alias: ['second'] },
      { id: 'min', label: '分钟', factor: 60 },
      { id: 'h', label: '小时', factor: 3600, alias: ['hour'] },
      { id: 'd', label: '天', factor: 86400, alias: ['day'] },
      { id: 'wk', label: '周', factor: 604800, alias: ['week'] },
      { id: 'mo', label: '月（30 天）', factor: 2592000 },
      { id: 'yr', label: '年（365 天）', factor: 31536000, alias: ['year'] },
    ],
  },
  {
    id: 'digital',
    label: '数据存储',
    base: 'B',
    units: [
      { id: 'b', label: '比特 bit', factor: 0.125 },
      { id: 'B', label: '字节 Byte', factor: 1 },
      { id: 'KB', label: 'KB（1024）', factor: 1024 },
      { id: 'MB', label: 'MB（1024）', factor: 1024 ** 2 },
      { id: 'GB', label: 'GB（1024）', factor: 1024 ** 3 },
      { id: 'TB', label: 'TB（1024）', factor: 1024 ** 4 },
      { id: 'PB', label: 'PB（1024）', factor: 1024 ** 5 },
      { id: 'kB_dec', label: 'kB（1000）', factor: 1000 },
      { id: 'MB_dec', label: 'MB（1000）', factor: 1000 ** 2 },
      { id: 'GB_dec', label: 'GB（1000）', factor: 1000 ** 3 },
      { id: 'Mbps', label: '兆比特 MBit', factor: 125000 },
    ],
  },
  {
    id: 'speed',
    label: '速度',
    base: 'mps',
    units: [
      { id: 'mps', label: '米/秒', factor: 1 },
      { id: 'kmh', label: '千米/小时', factor: 1 / 3.6 },
      { id: 'mph', label: '英里/小时', factor: 0.44704 },
      { id: 'knot', label: '节', factor: 0.514444 },
      { id: 'fts', label: '英尺/秒', factor: 0.3048 },
      { id: 'mach', label: '马赫（海平面）', factor: 340.29 },
    ],
  },
  {
    id: 'pressure',
    label: '压强',
    base: 'pa',
    units: [
      { id: 'pa', label: '帕斯卡', factor: 1 },
      { id: 'kpa', label: '千帕', factor: 1000 },
      { id: 'mpa', label: '兆帕', factor: 1e6 },
      { id: 'bar', label: '巴', factor: 1e5 },
      { id: 'atm', label: '标准大气压', factor: 101325 },
      { id: 'mmhg', label: '毫米汞柱', factor: 133.322387415 },
      { id: 'psi', label: '磅力/平方英寸', factor: 6894.7572932 },
    ],
  },
  {
    id: 'energy',
    label: '能量',
    base: 'j',
    units: [
      { id: 'j', label: '焦耳', factor: 1 },
      { id: 'kj', label: '千焦', factor: 1000 },
      { id: 'cal', label: '卡路里', factor: 4.184 },
      { id: 'kcal', label: '千卡（大卡）', factor: 4184 },
      { id: 'wh', label: '瓦时', factor: 3600 },
      { id: 'kwh', label: '千瓦时（度）', factor: 3.6e6 },
      { id: 'btu', label: '英热单位 BTU', factor: 1055.05585262 },
      { id: 'ftlb', label: '英尺磅', factor: 1.3558179483 },
      { id: 'ev', label: '电子伏 eV', factor: 1.602176634e-19 },
    ],
  },
];

/** 换算：把 value 从 unit 转到 target。 */
export function convertUnit(categoryId: string, from: string, to: string, value: number): number {
  const cat = UNIT_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return NaN;
  const u = cat.units.find((x) => x.id === from);
  const t = cat.units.find((x) => x.id === to);
  if (!u || !t) return NaN;
  const base = u.toBase ? u.toBase(value) : value * u.factor;
  return t.fromBase ? t.fromBase(base) : base / t.factor;
}

/* ------------------------------------------------------------------ *
 * 进制转换（支持任意 2~36 进制，含大整数近似）
 * ------------------------------------------------------------------ */

export function convertBase(value: string, from: number, to: number): string {
  const trimmed = value.trim().replace(/\s+/g, '');
  if (!trimmed) return '';
  if (from < 2 || from > 36 || to < 2 || to > 36) throw new Error('进制必须在 2 到 36 之间');
  const negative = trimmed.startsWith('-');
  const digits = negative ? trimmed.slice(1) : trimmed;
  if (!new RegExp(`^[0-9a-zA-Z]+$`).test(digits)) throw new Error(`输入不是合法的 ${from} 进制数`);

  let dec = 0n;
  const base = BigInt(from);
  for (const ch of digits) {
    const d = Number.parseInt(ch, 36);
    if (d >= from) throw new Error(`数字 ${ch} 不属于 ${from} 进制`);
    dec = dec * base + BigInt(d);
  }
  if (to === 10) return (negative ? '-' : '') + dec.toString();
  const target = BigInt(to);
  let out = '';
  let n = dec;
  if (n === 0n) out = '0';
  while (n > 0n) {
    out = (n % target).toString(36) + out;
    n /= target;
  }
  return (negative ? '-' : '') + out;
}

/** 生成常用进制对照表。 */
export function baseTable(
  value: string,
  from: number,
): { base: number; label: string; value: string }[] {
  const targets: { base: number; label: string }[] = [
    { base: 2, label: '二进制' },
    { base: 8, label: '八进制' },
    { base: 10, label: '十进制' },
    { base: 16, label: '十六进制' },
    { base: 32, label: '三十二进制' },
    { base: 36, label: '三十六进制' },
  ];
  return targets.map(({ base, label }) => ({
    base,
    label,
    value: (() => {
      try {
        return convertBase(value, from, base);
      } catch {
        return '—';
      }
    })(),
  }));
}

/* ------------------------------------------------------------------ *
 * 百分比
 * ------------------------------------------------------------------ */

export type PercentMode =
  'percentOf' | 'ratioOf' | 'increase' | 'decrease' | 'changeTo' | 'changeFrom';

export function calculatePercent(mode: PercentMode, a: number, b: number): number {
  switch (mode) {
    case 'percentOf':
      return (a / 100) * b; // a% of b
    case 'ratioOf':
      return (a / b) * 100; // a 是 b 的百分之几
    case 'increase':
      return b * (1 + a / 100); // b 增加 a%
    case 'decrease':
      return b * (1 - a / 100); // b 减少 a%
    case 'changeTo':
      return ((b - a) / a) * 100; // a → b 的变化率
    case 'changeFrom':
      return ((a - b) / b) * 100; // b 比 a 少/多百分之几（以 b 为基准）
    default:
      return NaN;
  }
}

/* ------------------------------------------------------------------ *
 * Chmod / Cron / 罗马数字
 * ------------------------------------------------------------------ */

export interface Permission {
  read: boolean;
  write: boolean;
  execute: boolean;
}

export interface ChmodState {
  owner: Permission;
  group: Permission;
  other: Permission;
}

const permsToOctal = (p: Permission): number =>
  (p.read ? 4 : 0) + (p.write ? 2 : 0) + (p.execute ? 1 : 0);

export function permissionsToNumeric(s: ChmodState): string {
  return `${permsToOctal(s.owner)}${permsToOctal(s.group)}${permsToOctal(s.other)}`;
}

export function permissionsToSymbolic(s: ChmodState): string {
  const part = (p: Permission) =>
    `${p.read ? 'r' : '-'}${p.write ? 'w' : '-'}${p.execute ? 'x' : '-'}`;
  return `${part(s.owner)}${part(s.group)}${part(s.other)}`;
}

export const OCTAL_TABLE: { digit: number; rwx: string; text: string }[] = [
  { digit: 0, rwx: '---', text: '无权限' },
  { digit: 1, rwx: '--x', text: '执行' },
  { digit: 2, rwx: '-w-', text: '写入' },
  { digit: 3, rwx: '-wx', text: '写入 + 执行' },
  { digit: 4, rwx: 'r--', text: '读取' },
  { digit: 5, rwx: 'r-x', text: '读取 + 执行' },
  { digit: 6, rwx: 'rw-', text: '读取 + 写入' },
  { digit: 7, rwx: 'rwx', text: '全部权限' },
];

/* Cron 解析 -------------------------------------------------------- */

const CRON_FIELDS = [
  { key: 'minute', label: '分钟', min: 0, max: 59, names: null as string[] | null },
  {
    key: 'hour',
    label: '小时',
    min: 0,
    max: 23,
    names: null as string[] | null,
  },
  {
    key: 'dom',
    label: '日',
    min: 1,
    max: 31,
    names: null as string[] | null,
  },
  {
    key: 'month',
    label: '月',
    min: 1,
    max: 12,
    names: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  },
  {
    key: 'dow',
    label: '星期',
    min: 0,
    max: 6,
    names: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  },
] as const;

export interface CronField {
  key: string;
  label: string;
  raw: string;
  values: number[];
}

export interface CronParseResult {
  fields: CronField[];
  command: string;
  humanized: string;
  nextRuns: Date[];
  error: string | null;
}

function expandField(raw: string, min: number, max: number, names: string[] | null): number[] {
  const set = new Set<number>();
  const nameMap = names
    ? names.reduce<Record<string, number>>((acc, n, i) => {
        acc[n] = min + i;
        return acc;
      }, {})
    : {};

  for (const part of raw.split(',')) {
    const piece = part.trim().toUpperCase();
    if (!piece) continue;
    if (piece === '*' || piece === '?') {
      for (let i = min; i <= max; i += 1) set.add(i);
      continue;
    }
    const [rangePart, stepPart] = piece.split('/');
    const step = stepPart ? Number.parseInt(stepPart, 10) : 1;
    if (!Number.isFinite(step) || step < 1) throw new Error(`步长非法：${piece}`);

    const resolveToken = (tok: string): number => {
      if (tok === 'L') return max;
      const named = nameMap[tok];
      if (named !== undefined) return named;
      const n = Number.parseInt(tok, 10);
      if (!Number.isFinite(n)) throw new Error(`无法解析：${tok}`);
      if (n < min || n > max) throw new Error(`${n} 超出范围 ${min}-${max}`);
      return n;
    };

    let start: number;
    let end: number;
    if (rangePart === '*' || rangePart === undefined || rangePart === '') {
      start = min;
      end = max;
    } else if (rangePart.includes('-')) {
      const [a, b] = rangePart.split('-');
      start = resolveToken(a as string);
      end = resolveToken(b as string);
      if (start > end) throw new Error(`区间非法：${piece}`);
    } else {
      start = resolveToken(rangePart);
      end = piece.includes('/') ? max : start;
    }
    for (let i = start; i <= end; i += step) set.add(i);
  }
  return [...set].sort((a, b) => a - b);
}

function describeField(
  values: number[],
  min: number,
  max: number,
  names: string[] | null,
  unit: string,
): string {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return `从不（${unit}）`;
  const all = max - min + 1;
  if (sorted.length === all) return `每${unit}`;
  if (unit === '月' && names) {
    const list = sorted.map((v) => names[v - min] ?? String(v));
    if (list.length === 1) return `${list[0]} 月`;
    return `${[...list.slice(0, -1), '和', list.at(-1) as string].join('、')} 月`;
  }
  if (unit === '星期' && names) {
    const list = sorted.map((v) => names[v - min] ?? String(v));
    return `周${[...list.slice(0, -1), '和', list.at(-1) as string].join('、')}`;
  }
  if (sorted.length === 1) return `第 ${sorted[0]} ${unit}`;
  return `${unit} ${[...sorted.slice(0, -1), sorted.at(-1)].join('、')}`;
}

function advance(date: Date): Date {
  return new Date(date.getTime() + 60_000);
}

export function parseCron(expression: string, count = 5): CronParseResult {
  const trimmed = expression.trim();
  const tokens = trimmed.split(/\s+/);
  const base = { from: new Date(Date.now() + 60_000) };

  const empty: CronParseResult = {
    fields: [],
    command: '',
    humanized: '',
    nextRuns: [],
    error: null,
  };

  if (tokens.length < 5) return { ...empty, error: 'Cron 表达式至少需要 5 个字段' };

  try {
    const fields: CronField[] = [];
    const parsed = CRON_FIELDS.map((f, i) => {
      const raw = tokens[i] as string;
      const values = expandField(raw, f.min, f.max, f.names as string[] | null);
      fields.push({ key: f.key, label: f.label, raw, values });
      return { ...f, values };
    });

    const command = tokens.slice(5).join(' ');

    const descriptions = parsed.map((p) =>
      describeField(p.values, p.min, p.max, p.names as string[] | null, p.label),
    );
    const humanized = `${descriptions[2]}，${descriptions[1]}，${descriptions[3]}，${descriptions[4]} 执行`;

    // 计算接下来 N 次执行时间（最多向后扫 4 年）
    const nextRuns: Date[] = [];
    let cursor = new Date(base.from);
    cursor.setSeconds(0, 0);
    const limit = cursor.getTime() + 4 * 365 * 86400 * 1000;
    let guard = 0;
    while (nextRuns.length < count && cursor.getTime() < limit && guard < 2_000_000) {
      guard += 1;
      const minuteOk = (parsed[0] as { values: number[] }).values.includes(cursor.getMinutes());
      const hourOk = (parsed[1] as { values: number[] }).values.includes(cursor.getHours());
      const domOk = (parsed[2] as { values: number[] }).values.includes(cursor.getDate());
      const monthOk = (parsed[3] as { values: number[] }).values.includes(cursor.getMonth() + 1);
      const dowOk = (parsed[4] as { values: number[] }).values.includes(cursor.getDay());

      const domRestricted = !(tokens[2] as string).includes('*');
      const dowRestricted = !(tokens[4] as string).includes('*');
      const dayOk =
        domRestricted && dowRestricted
          ? domOk || dowOk
          : !domRestricted && !dowRestricted
            ? true
            : domOk && dowOk;

      if (minuteOk && hourOk && monthOk && dayOk) {
        nextRuns.push(new Date(cursor));
        if (nextRuns.length >= count) break;
      }
      cursor = advance(cursor);
    }

    return { fields, command, humanized, nextRuns, error: null };
  } catch (err) {
    return { ...empty, error: err instanceof Error ? err.message : '解析失败' };
  }
}

/* 罗马数字 --------------------------------------------------------- */

const ROMAN_MAP: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function toRoman(input: number): string {
  if (!Number.isInteger(input) || input < 1 || input > 3999) {
    throw new Error('罗马数字仅支持 1 ~ 3999 的整数');
  }
  let n = input;
  let out = '';
  for (const [value, symbol] of ROMAN_MAP) {
    while (n >= value) {
      out += symbol;
      n -= value;
    }
  }
  return out;
}

export function fromRoman(input: string): number {
  const s = input.trim().toUpperCase();
  if (!/^[IVXLCDM]+$/.test(s)) throw new Error('不是合法的罗马数字');
  let total = 0;
  let i = 0;
  while (i < s.length) {
    const cur = ROMAN_MAP.find(([, sym]) => sym === s[i])?.[0] ?? 0;
    const nxt = ROMAN_MAP.find(([, sym]) => sym === s.slice(i, i + 2))?.[0] ?? 0;
    if (nxt > 0 && nxt > cur) {
      total += nxt - cur;
      i += 2;
    } else {
      total += cur;
      i += 1;
    }
  }
  return total;
}
