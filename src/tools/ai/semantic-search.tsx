'use client';

import ToolPlaceholder from '@/components/tool/tool-placeholder';

/**
 * 语义相似度检索 —— 状态：planned（开发中）。
 *
 * 页面渲染的是实现规格，数据源：src/config/tool-specs.ts 的 'semantic-search'。
 * 实现步骤见该文件，完成后把 tools.ts 里的 status 改成 'ready' 即可。
 */
export default function SemanticSearch() {
  return <ToolPlaceholder slug="semantic-search" />;
}
