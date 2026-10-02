'use client';

import ToolPlaceholder from '@/components/tool/tool-placeholder';

/**
 * 哈希与密钥派生 —— 状态：planned（开发中）。
 *
 * 页面渲染的是实现规格，数据源：src/config/tool-specs.ts 的 'hash-suite'。
 * 实现步骤见该文件，完成后把 tools.ts 里的 status 改成 'ready' 即可。
 */
export default function HashSuite() {
  return <ToolPlaceholder slug="hash-suite" />;
}
