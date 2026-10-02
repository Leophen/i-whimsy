/**
 * 密码学核心库 —— Web Crypto 优先，@noble/hashes 兜底。
 *
 * 为什么不再用 crypto-js：
 * 1. 它在 npm 上已被标记废弃，作者不再维护安全问题；
 * 2. 纯 JS 实现，没有浏览器原生的硬件加速；
 * 3. 它的 SHA3 默认值是 512 位，容易和 UI 标注的位数对不上。
 *
 * 现在的分工：
 *   · SHA-1 / SHA-256 / SHA-512   → crypto.subtle（原生实现，零包体）
 *   · MD5 / SHA3-256 / RIPEMD-160 → @noble/hashes（Web Crypto 不提供这些）
 *   · AES                          → AES-GCM + PBKDF2-SHA256（原生）
 *
 * 全部 API 都是异步的 —— Web Crypto 本身就是 Promise 风格，
 * 与其包一层同步假象，不如统一异步契约。
 */

import { md5, ripemd160 } from '@noble/hashes/legacy.js';
import { sha3_256 } from '@noble/hashes/sha3.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

/* ------------------------------------------------------------------ *
 * 摘要算法
 * ------------------------------------------------------------------ */

export const HASH_ALGORITHMS = [
  { id: 'MD5', label: 'MD5', note: '已可被碰撞攻击，只用于校验历史数据或兼容遗留系统' },
  { id: 'SHA1', label: 'SHA-1', note: '存在实际碰撞攻击（SHAttered），不要用于安全场景' },
  { id: 'SHA256', label: 'SHA-256', note: '当前主流推荐，Web Crypto 原生实现' },
  { id: 'SHA512', label: 'SHA-512', note: '更高安全余量，64 位平台下性能不输 SHA-256' },
  { id: 'SHA3', label: 'SHA3-256', note: 'NIST 新一代标准，与 SHA-2 结构完全不同' },
  { id: 'RIPEMD160', label: 'RIPEMD-160', note: '部分区块链场景（如比特币地址）使用' },
] as const;

export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number]['id'];

/** Web Crypto 能直接算的算法，避免引入第三方实现 */
const NATIVE_HASH: Partial<Record<HashAlgorithm, string>> = {
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA512: 'SHA-512',
};

/** Web Crypto 没有的算法，交给 @noble/hashes */
const NOBLE_HASH: Partial<Record<HashAlgorithm, (data: Uint8Array) => Uint8Array>> = {
  MD5: md5,
  SHA3: sha3_256,
  RIPEMD160: ripemd160,
};

export type DigestInput = string | Uint8Array | ArrayBuffer;

function toBytes(data: DigestInput): Uint8Array {
  if (typeof data === 'string') return utf8ToBytes(data);
  if (data instanceof Uint8Array) return data;
  return new Uint8Array(data);
}

function requireSubtle(): SubtleCrypto {
  if (typeof globalThis.crypto?.subtle === 'undefined') {
    throw new Error('当前环境不支持 Web Crypto，请换用支持 HTTPS 的现代浏览器');
  }
  return globalThis.crypto.subtle;
}

/** 计算摘要并返回小写十六进制串。 */
export async function digest(data: DigestInput, algorithm: HashAlgorithm): Promise<string> {
  const bytes = toBytes(data);

  const native = NATIVE_HASH[algorithm];
  if (native) {
    const buf = await requireSubtle().digest(native, bytes as unknown as BufferSource);
    return bytesToHex(new Uint8Array(buf));
  }

  const noble = NOBLE_HASH[algorithm];
  if (!noble) throw new Error(`不支持的摘要算法：${algorithm}`);
  return bytesToHex(noble(bytes));
}

/** 计算文件摘要：直接喂 ArrayBuffer，不做额外拷贝。 */
export function digestFile(buffer: ArrayBuffer, algorithm: HashAlgorithm): Promise<string> {
  return digest(buffer, algorithm);
}

/* ------------------------------------------------------------------ *
 * HMAC
 * ------------------------------------------------------------------ */

export const HMAC_ALGORITHMS = ['MD5', 'SHA1', 'SHA256', 'SHA512', 'SHA3'] as const;
export type HmacAlgorithm = (typeof HMAC_ALGORITHMS)[number];

const NATIVE_HMAC_HASH: Partial<Record<HmacAlgorithm, string>> = {
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA512: 'SHA-512',
};

export async function hmac(
  message: string,
  key: string,
  algorithm: HmacAlgorithm,
): Promise<string> {
  const msgBytes = utf8ToBytes(message);
  const keyBytes = utf8ToBytes(key);

  const native = NATIVE_HMAC_HASH[algorithm];
  if (native) {
    const cryptoKey = await requireSubtle().importKey(
      'raw',
      keyBytes as unknown as BufferSource,
      { name: 'HMAC', hash: native },
      false,
      ['sign'],
    );
    const sig = await requireSubtle().sign('HMAC', cryptoKey, msgBytes as unknown as BufferSource);
    return bytesToHex(new Uint8Array(sig));
  }

  // MD5 / SHA3 走 @noble/hashes 的通用 HMAC 构造
  const { hmac: nobleHmac } = await import('@noble/hashes/hmac.js');
  const hashFn = algorithm === 'MD5' ? md5 : sha3_256;
  return bytesToHex(nobleHmac(hashFn, keyBytes, msgBytes));
}

/* ------------------------------------------------------------------ *
 * AES-GCM
 * ------------------------------------------------------------------ */

/** PBKDF2 迭代次数：OWASP 2023 对 PBKDF2-HMAC-SHA256 的建议下限 */
const PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BITS = 256;
/** 密文信封前缀，未来换 KDF 或分组模式时用它区分版本 */
const ENVELOPE_VERSION = 'v1';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i] as number);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = requireSubtle();
  const base = await subtle.importKey(
    'raw',
    utf8ToBytes(passphrase) as unknown as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    base,
    KEY_BITS,
  );
  return subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** 加密：输出 v1.<salt>.<iv>.<ciphertext>，各段均为 Base64。 */
export async function aesEncrypt(plaintext: string, passphrase: string): Promise<string> {
  const subtle = requireSubtle();
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveAesKey(passphrase, salt);
  const ct = await subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    utf8ToBytes(plaintext.trim()) as unknown as BufferSource,
  );
  return [
    ENVELOPE_VERSION,
    bytesToBase64(salt),
    bytesToBase64(iv),
    bytesToBase64(new Uint8Array(ct)),
  ].join('.');
}

/** 解密：口令错误或密文被篡改都会失败。 */
export async function aesDecrypt(envelope: string, passphrase: string): Promise<string> {
  const parts = envelope.trim().split('.');
  if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
    throw new Error('密文格式不对，应形如 v1.<salt>.<iv>.<ciphertext>');
  }
  const subtle = requireSubtle();
  const salt = base64ToBytes(parts[1]!);
  const iv = base64ToBytes(parts[2]!);
  const data = base64ToBytes(parts[3]!);
  const key = await deriveAesKey(passphrase, salt);
  const plain = await subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    data as unknown as BufferSource,
  );
  return new TextDecoder().decode(plain);
}
