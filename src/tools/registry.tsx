'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

/**
 * 工具组件注册表 —— slug → 懒加载组件。
 *
 * 设计要点：
 * 1. 每个工具一个独立 chunk，访问某个工具时只下载它自己的代码。
 *    这一点在本项目尤其重要：onnxruntime / transformers.js / three.js
 *    动辄几 MB 到几十 MB，绝不能让它们进首屏。
 * 2. 统一 `ssr: false`：工具页大量依赖浏览器 API、随机数与当前时间，
 *    服务端预渲染必然出现 hydration 不一致。页面的标题、描述、面包屑、
 *    相关工具等静态内容仍由服务端渲染，SEO 不受影响。
 * 3. 状态为 planned 的工具同样要在这里注册 —— 它们渲染的是
 *    ToolPlaceholder（实现规格页），不是空白页。
 *
 * 新增工具时：在对应分类的注释块下加一行即可。漏了这一步页面会是空白，
 * 但构建不会报错，所以要靠 `npm run check:tools` 兜底（见 package.json）。
 * 目录名必须等于 tools.ts 里的分类 id，否则自检会报「路径不符」。
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
  /* ---- 本地 AI 图像 ---- */
  'bg-remover': define(() => import('@/tools/ai-image/bg-remover')),
  'image-restore': define(() => import('@/tools/ai-image/image-restore')),
  'photo-3d': define(() => import('@/tools/ai-image/photo-3d')),
  'ocr-studio': define(() => import('@/tools/ai-image/ocr-studio')),

  /* ---- 本地 AI 语音 ---- */
  'whisper-transcribe': define(() => import('@/tools/ai-voice/whisper-transcribe')),
  'tts-voice': define(() => import('@/tools/ai-voice/tts-voice')),

  /* ---- 模拟实验室 ---- */
  'flow-art': define(() => import('@/tools/simlab/flow-art')),
  'rd-lab': define(() => import('@/tools/simlab/rd-lab')),
  ferrofluid: define(() => import('@/tools/simlab/ferrofluid')),
  physarum: define(() => import('@/tools/simlab/physarum')),
  snowflake: define(() => import('@/tools/simlab/snowflake')),
  'tree-grow': define(() => import('@/tools/simlab/tree-grow')),
  'particle-life': define(() => import('@/tools/simlab/particle-life')),
  sandpile: define(() => import('@/tools/simlab/sandpile')),
  origami: define(() => import('@/tools/simlab/origami')),

  /* ---- 设计与图像 ---- */
  'image-pipeline': define(() => import('@/tools/design/image-pipeline')),
  'color-system': define(() => import('@/tools/design/color-system')),
  'image-palette': define(() => import('@/tools/design/image-palette')),
  'lut-grading': define(() => import('@/tools/design/lut-grading')),
  'mosaic-pattern': define(() => import('@/tools/design/mosaic-pattern')),

  /* ---- 内容创作 ---- */
  'video-transcode': define(() => import('@/tools/content/video-transcode')),
  'music-video': define(() => import('@/tools/content/music-video')),
  'social-card': define(() => import('@/tools/content/social-card')),
};

/** 注册表中确实存在的 slug */
export const REGISTERED_SLUGS = Object.keys(TOOL_COMPONENTS);
