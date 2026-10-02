'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

/**
 * 工具组件注册表 —— slug → 懒加载组件。
 *
 * 设计要点：
 * 1. 每个工具一个独立 chunk，访问某个工具时只下载它自己的代码。
 *    这一点在本项目尤其重要：像 ffmpeg / onnxruntime / duckdb 这类依赖
 *    动辄几 MB 到几十 MB，绝不能让它们进首屏。
 * 2. 统一 `ssr: false`：工具页大量依赖浏览器 API、随机数与当前时间，
 *    服务端预渲染必然出现 hydration 不一致。页面的标题、描述、面包屑、
 *    相关工具等静态内容仍由服务端渲染，SEO 不受影响。
 * 3. 状态为 planned 的工具同样要在这里注册 —— 它们渲染的是
 *    ToolPlaceholder（实现规格页），不是空白页。
 *
 * 新增工具时：在对应分类的注释块下加一行即可。漏了这一步页面会是空白，
 * 但构建不会报错，所以要靠 `npm run check:tools` 兜底（见 package.json）。
 */

function ToolLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-4 w-40 animate-pulse rounded bg-surface-3" />
      <div className="h-56 animate-pulse rounded-2xl bg-surface-2" />
      <div className="hidden gap-4 lg:grid lg:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
      </div>
      <span className="sr-only">工具加载中</span>
    </div>
  );
}

const define = (loader: () => Promise<{ default: ComponentType }>) =>
  dynamic(loader, { ssr: false, loading: () => <ToolLoading /> });

export const TOOL_COMPONENTS: Record<string, ComponentType> = {
  /* ---- 本地 AI 推理 ---- */
  'bg-remover': define(() => import('@/tools/ai/bg-remover')),
  'whisper-transcribe': define(() => import('@/tools/ai/whisper-transcribe')),
  'semantic-search': define(() => import('@/tools/ai/semantic-search')),
  'image-classify': define(() => import('@/tools/ai/image-classify')),
  'face-landmark': define(() => import('@/tools/ai/face-landmark')),

  /* ---- 音视频引擎 ---- */
  'video-transcode': define(() => import('@/tools/media/video-transcode')),
  'video-to-gif': define(() => import('@/tools/media/video-to-gif')),
  'audio-lab': define(() => import('@/tools/media/audio-lab')),
  'screen-recorder': define(() => import('@/tools/media/screen-recorder')),
  'subtitle-studio': define(() => import('@/tools/media/subtitle-studio')),

  /* ---- 文档与 OCR ---- */
  'pdf-suite': define(() => import('@/tools/document/pdf-suite')),
  'ocr-studio': define(() => import('@/tools/document/ocr-studio')),
  'markdown-studio': define(() => import('@/tools/document/markdown-studio')),
  'docx-builder': define(() => import('@/tools/document/docx-builder')),
  'sheet-studio': define(() => import('@/tools/document/sheet-studio')),

  /* ---- 数据与查询 ---- */
  'sqlite-browser': define(() => import('@/tools/data/sqlite-browser')),
  'duckdb-analytics': define(() => import('@/tools/data/duckdb-analytics')),
  'jq-playground': define(() => import('@/tools/data/jq-playground')),
  'json-path': define(() => import('@/tools/data/json-path')),
  'type-forge': define(() => import('@/tools/data/type-forge')),

  /* ---- 图像工程 ---- */
  'image-codec': define(() => import('@/tools/imaging/image-codec')),
  'image-pipeline': define(() => import('@/tools/imaging/image-pipeline')),
  'exif-studio': define(() => import('@/tools/imaging/exif-studio')),
  'svg-optimizer': define(() => import('@/tools/imaging/svg-optimizer')),
  'image-palette': define(() => import('@/tools/imaging/image-palette')),

  /* ---- 密码与安全 ---- */
  'crypto-lab': define(() => import('@/tools/crypto/crypto-lab')),
  'hash-suite': define(() => import('@/tools/crypto/hash-suite')),
  'x509-inspector': define(() => import('@/tools/crypto/x509-inspector')),
  'ctf-toolbox': define(() => import('@/tools/crypto/ctf-toolbox')),

  /* ---- 代码工程 ---- */
  'ast-playground': define(() => import('@/tools/code/ast-playground')),
  'regex-visualizer': define(() => import('@/tools/code/regex-visualizer')),
  'code-image': define(() => import('@/tools/code/code-image')),
  'text-diff': define(() => import('@/tools/code/text-diff')),
  'bundle-inspector': define(() => import('@/tools/code/bundle-inspector')),

  /* ---- 设计与视觉 ---- */
  'css-lab': define(() => import('@/tools/design/css-lab')),
  'cubic-bezier': define(() => import('@/tools/design/cubic-bezier')),
  'color-system': define(() => import('@/tools/design/color-system')),
  'color-contrast': define(() => import('@/tools/design/color-contrast')),
  'three-viewer': define(() => import('@/tools/design/three-viewer')),
  'font-subset': define(() => import('@/tools/design/font-subset')),

  /* ---- 运行时诊断 ---- */
  'device-lab': define(() => import('@/tools/runtime/device-lab')),
  'perf-benchmark': define(() => import('@/tools/runtime/perf-benchmark')),
  'network-lab': define(() => import('@/tools/runtime/network-lab')),
};

/** 注册表中确实存在的 slug */
export const REGISTERED_SLUGS = Object.keys(TOOL_COMPONENTS);
