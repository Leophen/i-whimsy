import { CATEGORY_MAP, type CategoryId } from '@/config/tools';

export const TOOLS_SECTION_ID = 'tools';

export function parseCategoryParam(value: string | null | undefined): CategoryId | 'all' {
  if (!value || !(value in CATEGORY_MAP)) return 'all';
  return value as CategoryId;
}

/** 首页工具区链接，支持分类筛选锚点 */
export function homeToolsHref(category?: CategoryId | 'all') {
  if (!category || category === 'all') return `/#${TOOLS_SECTION_ID}`;
  return `/?category=${category}#${TOOLS_SECTION_ID}`;
}
