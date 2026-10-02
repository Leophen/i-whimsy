/**
 * Promise 工具 —— 推理/模型下载超时，避免无限挂起。
 */

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/** 为 Promise 增加超时；超时后原 Promise 仍在后台运行，但调用方不再等待。 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** 将底层网络错误转为用户可理解的提示。 */
export function formatModelLoadError(err: unknown, modelHint: string): string {
  if (err instanceof TimeoutError) return err.message;
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('load failed') ||
    lower.includes('aborterror')
  ) {
    return `无法连接模型服务器下载 ${modelHint}。请检查网络、代理或防火墙后重试；国内环境可能需要可访问 Hugging Face 的网络。`;
  }

  if (lower.includes('http 403') || lower.includes('http 404')) {
    return `模型文件不可用（${raw}）。请稍后重试或联系维护者。`;
  }

  return raw || `模型加载失败（${modelHint}）`;
}
