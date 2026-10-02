'use client';

import ToolPlaceholder from '@/components/tool/tool-placeholder';

/**
 * SQLite 数据库浏览器 —— 状态：planned（开发中）。
 *
 * 页面渲染的是实现规格，数据源：src/config/tool-specs.ts 的 'sqlite-browser'。
 * 实现步骤见该文件，完成后把 tools.ts 里的 status 改成 'ready' 即可。
 */
export default function SqliteBrowser() {
  return <ToolPlaceholder slug="sqlite-browser" />;
}
