/**
 * ONNX 等大文件下载 + IndexedDB 缓存。
 * 刷新页面后命中缓存可跳过重复下载。
 */

const DB_NAME = 'iwhimsy-model-cache';
const DB_VERSION = 1;
const STORE = 'blobs';

export interface DownloadProgress {
  loaded: number;
  total: number;
  percent: number;
  status: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('无法打开 IndexedDB'));
  });
}

async function readCached(url: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(url);
      req.onsuccess = () => resolve((req.result as ArrayBuffer | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error('读取缓存失败'));
    });
  } catch {
    return null;
  }
}

async function writeCached(url: string, data: ArrayBuffer): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(data, url);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('写入缓存失败'));
  });
}

export async function fetchModelWithCache(
  url: string,
  onProgress?: (p: DownloadProgress) => void,
): Promise<ArrayBuffer> {
  const cached = await readCached(url);
  if (cached) {
    onProgress?.({
      loaded: cached.byteLength,
      total: cached.byteLength,
      percent: 100,
      status: '已从本地缓存加载模型',
    });
    return cached;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`模型下载失败（HTTP ${response.status}）`);
  }

  const total = Number(response.headers.get('content-length') ?? 0);
  const reader = response.body?.getReader();
  if (!reader) {
    const buf = await response.arrayBuffer();
    await writeCached(url, buf);
    onProgress?.({
      loaded: buf.byteLength,
      total: buf.byteLength,
      percent: 100,
      status: '模型下载完成',
    });
    return buf;
  }

  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    const percent = total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : 0;
    onProgress?.({
      loaded,
      total: total || loaded,
      percent,
      status: '正在下载模型…',
    });
  }

  const merged = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  await writeCached(url, merged.buffer);
  onProgress?.({
    loaded,
    total: total || loaded,
    percent: 100,
    status: '模型下载完成',
  });
  return merged.buffer;
}
