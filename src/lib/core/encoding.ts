/**
 * 编解码核心库 —— 全部基于原生 API + UTF-8 安全的 Base64。
 */

/* ------------------------------------------------------------------ *
 * Base64（UTF-8 安全版：btoa/atob 只支持 Latin-1，中文会抛错）
 * ------------------------------------------------------------------ */

export function encodeBase64(text: string, urlSafe = false): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunk = 0x8000; // 避免 apply 参数过多导致栈溢出
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const b64 = btoa(binary);
  return urlSafe ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b64;
}

export function decodeBase64(input: string): string {
  const normalized = input.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function isBase64(str: string): boolean {
  if (!str || str.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(str) || /^[A-Za-z0-9\-_]+$/.test(str);
}

/* ------------------------------------------------------------------ *
 * URL 编码
 * ------------------------------------------------------------------ */

export function encodeUrlComponent(text: string): string {
  return encodeURIComponent(text).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function decodeUrlComponent(text: string): string {
  return decodeURIComponent(text.replace(/\+/g, ' '));
}

/** 保留 URL 结构，只对非法字符编码——比 encodeURIComponent 更适合整条 URL。 */
export function encodeUrl(text: string): string {
  return encodeURI(text);
}

export function decodeUrl(text: string): string {
  return decodeURI(text);
}

/* ------------------------------------------------------------------ *
 * HTML 实体
 * ------------------------------------------------------------------ */

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  ' ': '&nbsp;',
  '©': '&copy;',
  '®': '&reg;',
  '™': '&trade;',
  '€': '&euro;',
  '£': '&pound;',
  '¥': '&yen;',
  '°': '&deg;',
  '±': '&plusmn;',
  '×': '&times;',
  '÷': '&divide;',
  '§': '&sect;',
  '¶': '&para;',
  '•': '&bull;',
  '…': '&hellip;',
  '—': '&mdash;',
  '–': '&ndash;',
  '←': '&larr;',
  '→': '&rarr;',
};

const ENTITY_TO_CHAR: Record<string, string> = Object.entries(HTML_ENTITIES).reduce(
  (acc, [char, entity]) => {
    acc[entity] = char;
    return acc;
  },
  {} as Record<string, string>,
);

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"'©®™€£¥°±×÷§¶•…—–←→]/g, (c) => HTML_ENTITIES[c] ?? c);
}

export function unescapeHtml(text: string): string {
  return text.replace(/&[a-zA-Z][a-zA-Z0-9]{1,10};|&#\d{1,6};|&#x[0-9a-fA-F]{1,6};/g, (entity) => {
    if (ENTITY_TO_CHAR[entity]) return ENTITY_TO_CHAR[entity] as string;
    if (entity.startsWith('&#x') || entity.startsWith('&#X')) {
      return String.fromCodePoint(Number.parseInt(entity.slice(3, -1), 16));
    }
    const code = Number.parseInt(entity.slice(2, -1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
  });
}

/* ------------------------------------------------------------------ *
 * Unicode / 十六进制 / 二进制
 * ------------------------------------------------------------------ */

export function escapeUnicode(text: string): string {
  return Array.from(text)
    .map((ch) => {
      const cp = ch.codePointAt(0) as number;
      return cp > 127 ? `\\u${cp.toString(16).padStart(4, '0')}` : ch;
    })
    .join('');
}

export function unescapeUnicode(text: string): string {
  return text.replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
}

export function textToHex(text: string, separator = ' '): string {
  const units = Array.from(text).flatMap((ch) => {
    const bytes = new TextEncoder().encode(ch);
    return Array.from(bytes);
  });
  return units.map((b) => b.toString(16).padStart(2, '0')).join(separator);
}

export function hexToText(hex: string): string {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  if (clean.length % 2 !== 0) throw new Error('十六进制字符串长度必须为偶数');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

/* ------------------------------------------------------------------ *
 * JSON 字符串转义
 * ------------------------------------------------------------------ */

export function escapeJsonString(text: string): string {
  return JSON.stringify(text).slice(1, -1);
}

export function unescapeJsonString(text: string): string {
  try {
    return JSON.parse(`"${text.replace(/(^|[^\\])"/g, '$1\\"')}"`) as string;
  } catch {
    throw new Error('不是合法的 JSON 转义字符串');
  }
}

/* ------------------------------------------------------------------ *
 * JWT
 * ------------------------------------------------------------------ */

export interface JwtParts {
  header: unknown;
  payload: unknown;
  signature: string;
  expired: boolean | null;
  expiresAt: Date | null;
  issuedAt: Date | null;
  notBefore: Date | null;
  error?: string;
}

function decodeJwtSegment(segment: string): unknown {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return JSON.parse(decodeBase64(padded));
  } catch {
    throw new Error('JWT 分段不是合法 JSON');
  }
}

export function parseJwt(token: string): JwtParts | null {
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts as [string, string, string];
  try {
    const header = decodeJwtSegment(h);
    const payload = decodeJwtSegment(p);
    const claims = (payload ?? {}) as Record<string, unknown>;
    const exp = typeof claims.exp === 'number' ? claims.exp : null;
    const iat = typeof claims.iat === 'number' ? claims.iat : null;
    const nbf = typeof claims.nbf === 'number' ? claims.nbf : null;
    return {
      header,
      payload,
      signature: s,
      expired: exp === null ? null : exp * 1000 < Date.now(),
      expiresAt: exp === null ? null : new Date(exp * 1000),
      issuedAt: iat === null ? null : new Date(iat * 1000),
      notBefore: nbf === null ? null : new Date(nbf * 1000),
    };
  } catch (err) {
    return {
      header: null,
      payload: null,
      signature: s,
      expired: null,
      expiresAt: null,
      issuedAt: null,
      notBefore: null,
      error: err instanceof Error ? err.message : '解析失败',
    };
  }
}

/* ------------------------------------------------------------------ *
 * MIME / 查询串
 * ------------------------------------------------------------------ */

export function parseQueryString(query: string): Record<string, string> {
  const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
  const out: Record<string, string> = {};
  params.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export function buildQueryString(obj: Record<string, string>): string {
  return new URLSearchParams(obj).toString();
}
