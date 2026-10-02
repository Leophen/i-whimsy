import { CATEGORIES, TOTAL_TOOLS } from '@/config/tools';

export const siteConfig = {
  name: 'iWhimsy',
  shortName: 'iWhimsy',
  tagline: '浏览器里的前端超级工具库',
  title: 'iWhimsy · 浏览器里的前端超级工具库',
  // 数量从 tools.ts 派生，避免新增工具后文案忘了改
  description: `${TOTAL_TOOLS} 个高级浏览器工具，覆盖 ${CATEGORIES.length} 大类：本地 AI 抠图与修复、Whisper 转写、设计系统与调色、视频转码与音乐可视化。全部在浏览器本地运行，数据不出你的设备，无需登录。`,
  keywords: [
    '在线工具',
    '本地 AI',
    '浏览器抠图',
    'Whisper 转写',
    '视频转码',
    'WebCodecs',
    '设计系统',
    'developer tools',
    'privacy tools',
  ],
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://i-whimsy.vercel.app',
  author: 'Leophen',
  github: 'https://github.com/Leophen/i-whimsy',
  locale: 'zh-CN',
} as const;

export type SiteConfig = typeof siteConfig;
