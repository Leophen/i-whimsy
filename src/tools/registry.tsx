'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

/**
 * 工具组件注册表 —— slug → 懒加载组件。
 *
 * 设计要点：
 * 1. 每个工具一个独立 chunk，访问某个工具时只下载它自己的代码，
 *    全站所有工具都不会把首屏 bundle 撑大。
 * 2. 统一 `ssr: false`：工具页主体大量依赖浏览器 API 与随机数/当前时间，
 *    服务端预渲染必然出现 hydration 不一致。页面的标题、描述、面包屑、
 *    相关工具等静态内容仍由服务端渲染，SEO 不受影响。
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
  /* ---- 文本处理 ---- */
  'text-case-converter': define(() => import('@/tools/text/text-case-converter')),
  'text-replace': define(() => import('@/tools/text/text-replace')),
  'text-statistics': define(() => import('@/tools/text/text-statistics')),
  'text-diff': define(() => import('@/tools/text/text-diff')),
  'text-sort-dedupe': define(() => import('@/tools/text/text-sort-dedupe')),
  'text-width-converter': define(() => import('@/tools/text/text-width-converter')),
  'markdown-preview': define(() => import('@/tools/text/markdown-preview')),
  'regex-tester': define(() => import('@/tools/text/regex-tester')),

  /* ---- 编码加密 ---- */
  'base64-text': define(() => import('@/tools/crypto/base64-text')),
  'base64-image': define(() => import('@/tools/crypto/base64-image')),
  'url-encoder': define(() => import('@/tools/crypto/url-encoder')),
  'html-entities': define(() => import('@/tools/crypto/html-entities')),
  'hash-generator': define(() => import('@/tools/crypto/hash-generator')),
  'hmac-generator': define(() => import('@/tools/crypto/hmac-generator')),
  'uuid-generator': define(() => import('@/tools/crypto/uuid-generator')),
  'password-generator': define(() => import('@/tools/crypto/password-generator')),
  'jwt-decoder': define(() => import('@/tools/crypto/jwt-decoder')),
  'aes-encryptor': define(() => import('@/tools/crypto/aes-encryptor')),

  /* ---- 图片处理 ---- */
  'image-compress': define(() => import('@/tools/image/image-compress')),
  'image-crop': define(() => import('@/tools/image/image-crop')),
  'image-filter': define(() => import('@/tools/image/image-filter')),
  'image-watermark': define(() => import('@/tools/image/image-watermark')),
  'image-palette': define(() => import('@/tools/image/image-palette')),
  'qrcode-generator': define(() => import('@/tools/image/qrcode-generator')),

  /* ---- 颜色设计 ---- */
  'color-converter': define(() => import('@/tools/color/color-converter')),
  'color-contrast': define(() => import('@/tools/color/color-contrast')),
  'gradient-generator': define(() => import('@/tools/color/gradient-generator')),
  'color-palette': define(() => import('@/tools/color/color-palette')),

  /* ---- 数据格式 ---- */
  'json-formatter': define(() => import('@/tools/data/json-formatter')),
  'json-yaml': define(() => import('@/tools/data/json-yaml')),
  'json-csv': define(() => import('@/tools/data/json-csv')),
  'json-escape': define(() => import('@/tools/data/json-escape')),
  'xml-formatter': define(() => import('@/tools/data/xml-formatter')),
  'sql-formatter': define(() => import('@/tools/data/sql-formatter')),

  /* ---- 日期时间 ---- */
  'timestamp-converter': define(() => import('@/tools/time/timestamp-converter')),
  'date-diff': define(() => import('@/tools/time/date-diff')),
  'date-calculator': define(() => import('@/tools/time/date-calculator')),
  'timezone-converter': define(() => import('@/tools/time/timezone-converter')),

  /* ---- 换算工具 ---- */
  'unit-converter': define(() => import('@/tools/converter/unit-converter')),
  'number-base': define(() => import('@/tools/converter/number-base')),
  'percentage-calculator': define(() => import('@/tools/converter/percentage-calculator')),
  'chmod-calculator': define(() => import('@/tools/converter/chmod-calculator')),
  'cron-parser': define(() => import('@/tools/converter/cron-parser')),
  'roman-numeral': define(() => import('@/tools/converter/roman-numeral')),

  /* ---- 生成器 ---- */
  'lorem-ipsum': define(() => import('@/tools/generator/lorem-ipsum')),
  'random-string': define(() => import('@/tools/generator/random-string')),
  'unicode-escape': define(() => import('@/tools/generator/unicode-escape')),
  'binary-converter': define(() => import('@/tools/generator/binary-converter')),

  /* ---- CSS 与前端 ---- */
  'code-formatter': define(() => import('@/tools/css/code-formatter')),
  'css-unit-converter': define(() => import('@/tools/css/css-unit-converter')),
  'clamp-calculator': define(() => import('@/tools/css/clamp-calculator')),
  'box-shadow-generator': define(() => import('@/tools/css/box-shadow-generator')),
  'cubic-bezier': define(() => import('@/tools/css/cubic-bezier')),
  glassmorphism: define(() => import('@/tools/css/glassmorphism')),
  'fancy-border-radius': define(() => import('@/tools/css/fancy-border-radius')),

  /* ---- 开发速查 ---- */
  'gitignore-generator': define(() => import('@/tools/dev/gitignore-generator')),
  'http-status-codes': define(() => import('@/tools/dev/http-status-codes')),
  'user-agent-parser': define(() => import('@/tools/dev/user-agent-parser')),
  'subnet-calculator': define(() => import('@/tools/dev/subnet-calculator')),
  'json-path': define(() => import('@/tools/dev/json-path')),

  /* ---- 视觉创意 ---- */
  'svg-wave-generator': define(() => import('@/tools/creative/svg-wave-generator')),
  'noise-texture-generator': define(() => import('@/tools/creative/noise-texture-generator')),
  'ascii-art': define(() => import('@/tools/creative/ascii-art')),
};

/** 注册表中确实存在的 slug（用于构建期自检） */
export const REGISTERED_SLUGS = Object.keys(TOOL_COMPONENTS);
