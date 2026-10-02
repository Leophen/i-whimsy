'use client';

import ToolPlaceholder from '@/components/tool/tool-placeholder';

/**
 * 文字识别 OCR —— 状态：planned（开发中）。
 *
 * 页面渲染的是实现规格，数据源：src/config/tool-specs.ts 的 'ocr-studio'。
 * 实现步骤见该文件，完成后把 tools.ts 里的 status 改成 'ready' 即可。
 */
export default function OcrStudio() {
  return <ToolPlaceholder slug="ocr-studio" />;
}
