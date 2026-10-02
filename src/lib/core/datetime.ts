/**
 * 日期时间核心库 —— 零依赖（用 Intl 取代 moment/dayjs，避免体积开销）。
 * 时间戳、时区转换、日期差、日期推算。
 */

export const TIMESTAMP_UNITS = [
  { key: 'ms', label: '毫秒', factor: 1 },
  { key: 's', label: '秒', factor: 1000 },
] as const;

export type TimestampUnit = (typeof TIMESTAMP_UNITS)[number]['key'];

export function nowTimestamp(unit: TimestampUnit = 's'): number {
  const ms = Date.now();
  return unit === 'ms' ? ms : Math.floor(ms / 1000);
}

export function timestampToDate(value: number, unit: TimestampUnit): Date | null {
  const ms = unit === 'ms' ? value : value * 1000;
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dateToTimestamp(date: Date, unit: TimestampUnit): number {
  return unit === 'ms' ? date.getTime() : Math.floor(date.getTime() / 1000);
}

/** 自动识别输入是秒还是毫秒时间戳。 */
export function guessTimestampUnit(raw: string): TimestampUnit {
  const len = raw.replace(/\D/g, '').length;
  return len <= 10 ? 's' : 'ms';
}

/** ISO8601 → Date，失败返回 null。 */
export function parseISO(input: string): Date | null {
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ------------------------------------------------------------------ *
 * 格式化
 * ------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDateTimeLocal(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatDateTime(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** 转为目标时区的「墙上时间」再格式化 —— 用于时区转换展示。 */
export function formatInTimeZone(date: Date, timeZone: string, withZoneName = true): string {
  try {
    const parts = new Intl.DateTimeFormat('zh-CN', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const base = `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get(
      'minute',
    )}:${get('second')}`;
    if (!withZoneName) return base;
    const abbr =
      new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
        .formatToParts(date)
        .find((p) => p.type === 'timeZoneName')?.value ?? timeZone;
    return `${base} (${abbr})`;
  } catch {
    return '无效时区';
  }
}

/** 目标时区的 UTC 偏移，如 +08:00。 */
export function timeZoneOffset(date: Date, timeZone: string): string {
  try {
    const tz = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(date)
      .find((p) => p.type === 'timeZoneName')?.value;
    if (!tz) return '';
    return tz.replace('GMT', 'UTC').replace('UTC', 'UTC');
  } catch {
    return '';
  }
}

export const COMMON_TIME_ZONES: { id: string; label: string }[] = [
  { id: 'Asia/Shanghai', label: '中国标准时间 · 上海' },
  { id: 'Asia/Hong_Kong', label: '中国香港' },
  { id: 'Asia/Taipei', label: '中国台湾' },
  { id: 'Asia/Tokyo', label: '日本 · 东京' },
  { id: 'Asia/Seoul', label: '韩国 · 首尔' },
  { id: 'Asia/Singapore', label: '新加坡' },
  { id: 'Asia/Dubai', label: '阿联酋 · 迪拜' },
  { id: 'Europe/London', label: '英国 · 伦敦' },
  { id: 'Europe/Paris', label: '法国 · 巴黎' },
  { id: 'Europe/Berlin', label: '德国 · 柏林' },
  { id: 'Europe/Moscow', label: '俄罗斯 · 莫斯科' },
  { id: 'America/New_York', label: '美国 · 纽约' },
  { id: 'America/Chicago', label: '美国 · 芝加哥' },
  { id: 'America/Denver', label: '美国 · 丹佛' },
  { id: 'America/Los_Angeles', label: '美国 · 洛杉矶' },
  { id: 'America/Sao_Paulo', label: '巴西 · 圣保罗' },
  { id: 'Australia/Sydney', label: '澳大利亚 · 悉尼' },
  { id: 'Pacific/Auckland', label: '新西兰 · 奥克兰' },
  { id: 'UTC', label: '协调世界时 UTC' },
];

export function guessLocalTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/* ------------------------------------------------------------------ *
 * 日期差
 * ------------------------------------------------------------------ */

export interface DiffResult {
  ms: number;
  totalSeconds: number;
  totalMinutes: number;
  totalHours: number;
  totalDays: number;
  /** 按自然日历拆分的年/月/日 */
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** 含小数的合计 */
  weeksDecimal: number;
  monthsDecimal: number;
  yearsDecimal: number;
  /** 人类可读描述 */
  humanized: string;
  /** 工作日数（周一至周五） */
  workdays: number;
  weekends: number;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function diffDates(start: Date, end: Date): DiffResult {
  const forward = start.getTime() <= end.getTime();
  const from = forward ? start : end;
  const to = forward ? end : start;

  const ms = to.getTime() - from.getTime();
  const totalSeconds = ms / 1000;
  const totalMinutes = totalSeconds / 60;
  const totalHours = totalMinutes / 60;
  const totalDays = totalHours / 24;

  // 自然日历拆分
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();
  let hours = to.getHours() - from.getHours();
  let minutes = to.getMinutes() - from.getMinutes();
  let seconds = to.getSeconds() - from.getSeconds();

  if (seconds < 0) {
    seconds += 60;
    minutes -= 1;
  }
  if (minutes < 0) {
    minutes += 60;
    hours -= 1;
  }
  if (hours < 0) {
    hours += 24;
    days -= 1;
  }
  if (days < 0) {
    months -= 1;
    const prevMonth = to.getMonth() === 0 ? 12 : to.getMonth();
    const prevYear = to.getMonth() === 0 ? to.getFullYear() - 1 : to.getFullYear();
    days += daysInMonth(prevYear, prevMonth);
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  let workdays = 0;
  let weekends = 0;
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const endDay = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  let guard = 0;
  while (cursor <= endDay && guard < 100_000) {
    guard += 1;
    const dow = cursor.getDay();
    if (dow === 0 || dow === 6) weekends += 1;
    else workdays += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  const parts: string[] = [];
  if (years) parts.push(`${years} 年`);
  if (months) parts.push(`${months} 个月`);
  if (days) parts.push(`${days} 天`);
  if (hours) parts.push(`${hours} 小时`);
  if (minutes) parts.push(`${minutes} 分钟`);
  if (seconds) parts.push(`${seconds} 秒`);
  const humanized = parts.length ? parts.join(' ') : '0 秒';

  return {
    ms,
    totalSeconds,
    totalMinutes,
    totalHours,
    totalDays,
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
    weeksDecimal: totalDays / 7,
    monthsDecimal: totalDays / 30.436875,
    yearsDecimal: totalDays / 365.2425,
    humanized,
    workdays,
    weekends,
  };
}

/* ------------------------------------------------------------------ *
 * 日期推算
 * ------------------------------------------------------------------ */

export type AddUnit = 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds';

export const ADD_UNITS: { value: AddUnit; label: string }[] = [
  { value: 'years', label: '年' },
  { value: 'months', label: '月' },
  { value: 'weeks', label: '周' },
  { value: 'days', label: '日' },
  { value: 'hours', label: '小时' },
  { value: 'minutes', label: '分钟' },
  { value: 'seconds', label: '秒' },
];

export function addDuration(base: Date, amount: number, unit: AddUnit): Date {
  const d = new Date(base.getTime());
  switch (unit) {
    case 'years': {
      const targetYear = d.getFullYear() + amount;
      const dom = d.getDate();
      const maxDom = daysInMonth(targetYear, d.getMonth() + 1);
      d.setFullYear(targetYear);
      d.setDate(Math.min(dom, maxDom)); // 2/29 → 平年落到 2/28
      return d;
    }
    case 'months': {
      const totalMonths = d.getMonth() + amount;
      const targetYear = d.getFullYear() + Math.floor(totalMonths / 12);
      const targetMonth = ((totalMonths % 12) + 12) % 12;
      const maxDom = daysInMonth(targetYear, targetMonth + 1);
      d.setDate(1);
      d.setFullYear(targetYear);
      d.setMonth(targetMonth);
      d.setDate(Math.min(d.getDate() === 1 ? base.getDate() : d.getDate(), maxDom));
      return d;
    }
    case 'weeks':
      d.setDate(d.getDate() + amount * 7);
      return d;
    case 'days':
      d.setDate(d.getDate() + amount);
      return d;
    case 'hours':
      d.setHours(d.getHours() + amount);
      return d;
    case 'minutes':
      d.setMinutes(d.getMinutes() + amount);
      return d;
    case 'seconds':
      d.setSeconds(d.getSeconds() + amount);
      return d;
    default:
      return d;
  }
}

/** ISO 8601 持续时间，如 P1Y2M3DT4H5M6S */
export function toIsoDuration(
  diff: Pick<DiffResult, 'years' | 'months' | 'days' | 'hours' | 'minutes' | 'seconds'>,
): string {
  const { years, months, days, hours, minutes, seconds } = diff;
  if (!years && !months && !days && !hours && !minutes && !seconds) return 'PT0S';
  let out = 'P';
  if (years) out += `${years}Y`;
  if (months) out += `${months}M`;
  if (days) out += `${days}D`;
  const time = [
    hours ? `${hours}H` : '',
    minutes ? `${minutes}M` : '',
    seconds ? `${seconds}S` : '',
  ].join('');
  if (time) out += `T${time}`;
  return out;
}
