'use client';

import ToolPlaceholder from '@/components/tool/tool-placeholder';

/**
 * 3D 模型预览 —— 状态：planned（开发中）。
 *
 * 页面渲染的是实现规格，数据源：src/config/tool-specs.ts 的 'three-viewer'。
 * 实现步骤见该文件，完成后把 tools.ts 里的 status 改成 'ready' 即可。
 */
export default function ThreeViewer() {
  return <ToolPlaceholder slug="three-viewer" />;
}
