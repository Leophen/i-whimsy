import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind 类名合并：后者覆盖前者冲突项，clsx 负责条件拼接。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 字节数格式化：自动切换 B / KB / MB / GB。 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '-';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  const unit = units[i] ?? 'B';
  const digits = i === 0 ? 0 : value >= 100 ? 0 : decimals;
  return `${value.toFixed(digits)} ${unit}`;
}

/** 千分位。 */
export function formatNumber(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return '-';
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** 保留 n 位小数并去掉尾随 0。 */
export function trimNumber(value: number, digits = 6): number {
  if (!Number.isFinite(value)) return NaN;
  return Number.parseFloat(value.toFixed(digits));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** 安全地把任意输入转为字符串，null/undefined 视为空串。 */
export function toText(value: unknown): string {
  return value == null ? '' : String(value);
}

/** 生成 [min, max] 闭区间内的随机整数（含边界）。 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 从数组中不重复随机取一项。 */
export function pickRandom<T>(arr: readonly T[]): T {
  if (arr.length === 0) throw new Error('pickRandom: 数组为空');
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 生成短 id，用于 key / anchor。 */
export function uid(prefix = ''): string {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`;
}
