'use client';

import ToolPlaceholder from '@/components/tool/tool-placeholder';

/**
 * 类型定义互转 —— 状态：planned（开发中）。
 *
 * 页面渲染的是实现规格，数据源：src/config/tool-specs.ts 的 'type-forge'。
 * 实现步骤见该文件，完成后把 tools.ts 里的 status 改成 'ready' 即可。
 */
export default function TypeForge() {
  return <ToolPlaceholder slug="type-forge" />;
}
