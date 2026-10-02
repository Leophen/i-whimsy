/**
 * @huggingface/transformers 全局环境配置（Worker 与主线程共用）。
 * 可通过 NEXT_PUBLIC_HF_ENDPOINT 指向镜像，例如 https://hf-mirror.com
 */
import { env } from '@huggingface/transformers';

let configured = false;

export function configureTransformersEnv(): void {
  if (configured) return;
  configured = true;

  env.allowLocalModels = false;
  env.useBrowserCache = true;
  env.allowRemoteModels = true;

  const endpoint = process.env.NEXT_PUBLIC_HF_ENDPOINT?.replace(/\/$/, '');
  if (endpoint) {
    // transformers.js 4.x：自定义 Hub 根地址
    (env as { remoteHost?: string }).remoteHost = endpoint;
  }
}
