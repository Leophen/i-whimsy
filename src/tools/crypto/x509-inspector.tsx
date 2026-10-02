'use client';

import ToolPlaceholder from '@/components/tool/tool-placeholder';

/**
 * 数字证书解析 —— 状态：planned（开发中）。
 *
 * 页面渲染的是实现规格，数据源：src/config/tool-specs.ts 的 'x509-inspector'。
 * 实现步骤见该文件，完成后把 tools.ts 里的 status 改成 'ready' 即可。
 */
export default function X509Inspector() {
  return <ToolPlaceholder slug="x509-inspector" />;
}
