import { CATEGORIES, TOTAL_TOOLS } from '@/config/tools';

export const siteConfig = {
  name: 'iWhimsy',
  shortName: 'iWhimsy',
  tagline: '浏览器里的前端超级工具库',
  title: 'iWhimsy · 浏览器里的前端超级工具库',
  // 数量从 tools.ts 派生，避免新增工具后文案忘了改
  description: `${TOTAL_TOOLS} 个纯前端在线工具，覆盖 ${CATEGORIES.length} 大类：文本处理、编码加密、图片压缩裁剪、颜色对比度检查、JSON / YAML / SQL 格式化、CSS 与前端生成器、开发速查、时间戳换算、单位换算与各类生成器。全部在浏览器本地运行，数据不出你的电脑，无需登录。`,
  keywords: [
    '在线工具',
    '前端工具',
    '开发者工具',
    'JSON 格式化',
    'Base64',
    '图片压缩',
    '颜色转换',
    '时间戳转换',
    '正则测试',
    '二维码生成',
    'developer tools',
    'online tools',
  ],
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://i-whimsy.vercel.app',
  author: 'Leophen',
  github: 'https://github.com/Leophen/i-whimsy',
  locale: 'zh-CN',
} as const;

export type SiteConfig = typeof siteConfig;
