/**
 * onnxruntime-web 全局环境配置（仅在 Worker 内调用一次）。
 *
 * 注意：在 Next/Turbopack 打包的 Worker 里必须用具名导入 `env`，
 * `import * as ort` 后 `ort.env` 可能为 undefined，导致读取 `wasm` 报错。
 */
import { env } from 'onnxruntime-web';

/** 与 package.json 中 onnxruntime-web 版本保持一致。 */
export const ONNX_WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/';

let configured = false;

export function configureOnnxRuntimeEnv(): void {
  if (configured) return;
  configured = true;

  if (!env?.wasm) {
    throw new Error(
      'onnxruntime-web 初始化失败（env.wasm 不可用）。请刷新页面后重试；若持续出现请联系维护者。',
    );
  }

  env.wasm.wasmPaths = ONNX_WASM_CDN;
  env.wasm.numThreads =
    typeof globalThis.navigator !== 'undefined' && globalThis.crossOriginIsolated ? 4 : 1;
}
