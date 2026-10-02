import type { LucideIcon } from 'lucide-react';
import {
  AudioLines,
  BrainCircuit,
  Clapperboard,
  Images,
  Layers,
  Palette,
} from 'lucide-react';

/* ------------------------------------------------------------------ *
 * Category —— 按「主题与引擎」划分，不按「数据类型」划分
 *
 * 这是本项目的核心结构判断：
 *   普通工具 = 纯 JS 字符串 / 数学运算，谁都能写一版
 *   高级工具 = 把桌面软件或实验室的能力搬进浏览器
 *             （WASM / WebGPU / WebGL GPGPU / WebCodecs / OPFS / Web Crypto）
 *
 * 按数据类型分类（文本/图片/时间）会让「Base64 编解码」和「浏览器端流体模拟」
 * 挤在同一层级；按主题与引擎分类则天然把有技术含量的工具聚在一起。
 * ------------------------------------------------------------------ */
export type CategoryId = 'ai-image' | 'ai-voice' | 'design' | 'content';

export interface Category {
  id: CategoryId;
  name: string;
  enName: string;
  description: string;
  icon: LucideIcon;
  /** 对应 globals.css 中的 --cat-* token */
  accentVar: string;
}

export const CATEGORIES: Category[] = [
  {
    id: 'ai-image',
    name: '本地 AI 图像',
    enName: 'On-device Vision',
    description:
      '模型在浏览器里跑，图片不出本机。依赖 ONNX Runtime Web / transformers.js + WebGPU，不支持时自动回退 WASM。',
    icon: BrainCircuit,
    accentVar: 'var(--cat-ai)',
  },
  {
    id: 'ai-voice',
    name: '本地 AI 语音',
    enName: 'On-device Voice',
    description:
      '语音转文字与语音合成都在本地完成。录音与文稿不上传任何服务器 —— 这是它和绝大多数在线服务的根本区别。',
    icon: AudioLines,
    accentVar: 'var(--cat-voice)',
  },
  {
    id: 'design',
    name: '设计与图像',
    enName: 'Design',
    description:
      '参数联动的可视化工作台与系统级产出（设计令牌、配色、调色、手工图纸），导出的是可直接落地的资产。',
    icon: Palette,
    accentVar: 'var(--cat-design)',
  },
  {
    id: 'content',
    name: '内容创作',
    enName: 'Content',
    description:
      '把想法变成能发出去的成品：视频转码、音乐视频、社交封面。走 WebCodecs 硬编硬解，不依赖服务器。',
    icon: Clapperboard,
    accentVar: 'var(--cat-media)',
  },
];

export const CATEGORY_MAP = CATEGORIES.reduce<Record<string, Category>>(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<string, Category>,
);

export function getCategory(id: CategoryId): Category {
  const found = CATEGORY_MAP[id];
  if (!found) throw new Error(`未知分类：${id}`);
  return found;
}

/* ------------------------------------------------------------------ *
 * Tool metadata
 * ------------------------------------------------------------------ */

/**
 * 工具状态。
 * - `ready`   ：已实现，可以直接用
 * - `planned` ：已定方案、待实现，页面会渲染实现规格（见 tool-specs.ts）
 *
 * 没有第三种状态 —— 不允许出现「占位但没方案」的空壳。
 */
export type ToolStatus = 'ready' | 'planned';

export interface ToolMeta {
  /** URL slug，同时作为路由参数 */
  slug: string;
  name: string;
  /** 卡片上的一句话描述 */
  summary: string;
  /** 工具页与 SEO 使用的长描述 */
  description: string;
  category: CategoryId;
  icon: LucideIcon;
  /** 参与命令面板搜索的关键词（中英文混排） */
  keywords: string[];
  status: ToolStatus;
  /** 首页精选 */
  featured?: boolean;
}

export const TOOLS: ToolMeta[] = [
  /* ==================== 本地 AI 图像 ==================== */
  {
    slug: 'bg-remover',
    name: '智能抠图换背景',
    summary: '本地模型一键去背景，图片不上传',
    description:
      '用分割模型在浏览器里做前景与背景分离，输出带透明通道的 PNG，可换纯色、渐变或自定义背景。人像与商品图不会离开你的设备 —— 这一点是它在隐私上和在线抠图服务的根本区别。',
    category: 'ai-image',
    icon: Images,
    keywords: ['抠图', '去背景', 'remove background', 'matting', '透明', 'png', '换背景'],
    status: 'ready',
    featured: true,
  },
  {
    slug: 'image-restore',
    name: '图像修复与增强',
    summary: '去物体去水印、无损放大、老照片上色',
    description:
      '三个本地模型串成一条流水线：涂抹消除路人水印与杂物、把模糊小图放大 2–4 倍并补全细节、给黑白老照片上色。全程在本机推理，原始照片不上传。',
    category: 'ai-image',
    icon: BrainCircuit,
    keywords: ['去水印', '去物体', '放大', '超分', '老照片', '上色', '修复', 'inpainting'],
    status: 'ready',
    featured: true,
  },
  {
    slug: 'photo-3d',
    name: 'AI 照片转 3D',
    summary: '一张普通照片变成会摇的立体图',
    description:
      '用深度估计模型算出照片里每个像素的远近，再把它变成可跟随鼠标或手机陀螺仪摇动的立体图，可导出循环视频与左右立体图。顺带能用深度做真实感的人像背景虚化。',
    category: 'ai-image',
    icon: Layers,
    keywords: ['3d', '深度', '视差', 'depth', '立体', '摇动', 'wiggle', '虚化'],
    status: 'ready',
    featured: true,
  },
  {
    slug: 'ocr-studio',
    name: '文字识别 OCR',
    summary: '图片与扫描件转可编辑文字',
    description:
      '对图片或 PDF 扫描件做文字识别，输出可编辑文本与保留结构的表格。支持中文、英文等多语言，可框选区域只识别指定部分，结果导出为 txt / csv。',
    category: 'ai-image',
    icon: BrainCircuit,
    keywords: ['ocr', '文字识别', '扫描', '提取文字', '表格识别', 'tesseract'],
    status: 'ready',
  },

  /* ==================== 本地 AI 语音 ==================== */
  {
    slug: 'whisper-transcribe',
    name: '语音转文字',
    summary: 'Whisper 本地转写，录音不出设备',
    description:
      '用 Whisper 模型在浏览器内把音频转成文字，输出带时间轴的字幕。支持中文与多语言，会议录音不会离开你的电脑 —— 这是它和在线转写服务最关键的区别。',
    category: 'ai-voice',
    icon: AudioLines,
    keywords: ['语音识别', '转写', 'whisper', 'transcribe', '字幕', 'asr', '会议记录'],
    status: 'ready',
    featured: true,
  },
  {
    slug: 'tts-voice',
    name: '本地 AI 配音',
    summary: '中文文本转语音，音色可选，可导出',
    description:
      '把文字变成自然的人声，内置多种中文音色，可调语速与停顿，输出音频直接下载。文本与音频都在本机处理，不经过任何服务器。',
    category: 'ai-voice',
    icon: AudioLines,
    keywords: ['配音', 'tts', '语音合成', '朗读', '文字转语音', '有声', 'kokoro'],
    status: 'ready',
    featured: true,
  },

  /* ==================== 设计与图像 ==================== */
  {
    slug: 'image-pipeline',
    name: '批量图像流水线',
    summary: '拖入一批图，串起压缩裁剪水印重命名',
    description:
      '把处理步骤串成流水线：统一尺寸、裁剪、滤镜、水印、格式转换、按规则重命名，一次跑完一批图片并打包下载。流水线可存成预设反复使用。',
    category: 'design',
    icon: Images,
    keywords: ['批量', '流水线', '压缩', '水印', '重命名', '预设', 'worker', '批处理'],
    status: 'ready',
    featured: true,
  },
  {
    slug: 'color-system',
    name: '智能配色系统',
    summary: '从一个主色生成整套色阶与设计令牌',
    description:
      '输入主色自动生成完整色阶、语义色（成功/警告/危险）、深色模式映射与对比度校验，导出为 CSS 变量、Tailwind 配置或设计令牌文件。',
    category: 'design',
    icon: Palette,
    keywords: ['配色', '色阶', '设计令牌', 'tailwind', 'tokens', '深色模式', '主题', 'wcag'],
    status: 'ready',
  },
  {
    slug: 'image-palette',
    name: '图片主色提取',
    summary: '中位切分算法提取主色与配色比例',
    description:
      '用中位切分算法从图片中提取主色板，给出每种颜色的占比，可直接导出为 CSS 变量、Tailwind 配置或设计令牌。做 PPT 与海报时取色很省事。',
    category: 'design',
    icon: Palette,
    keywords: ['主色', '调色板', 'palette', '取色', 'median cut', '设计令牌', '配色'],
    status: 'ready',
  },
  {
    slug: 'lut-grading',
    name: 'LUT 电影级调色',
    summary: '载入调色包，实时给照片调出电影感',
    description:
      '载入行业标准 .cube 调色文件，实时把电影级色调套到你的照片上，可叠加曝光、对比、色温等基础调整。也可以拿一张参考图，把它的色调迁移到你的照片。',
    category: 'design',
    icon: Images,
    keywords: ['lut', '调色', '电影感', 'cube', '色彩分级', 'grading', '仿色', '滤镜'],
    status: 'ready',
  },
  {
    slug: 'mosaic-pattern',
    name: '手作图纸工坊',
    summary: '照片转乐高 / 十字绣图纸与用料清单',
    description:
      '把照片量化成有限色板，生成拼搭图纸与每种材料的用量清单，并预览成品效果。支持乐高马赛克与十字绣两类图纸，可导出 PDF 打印。',
    category: 'design',
    icon: Layers,
    keywords: ['乐高', '十字绣', '马赛克', '图纸', '拼豆', '用量清单', '量化', '色板'],
    status: 'ready',
  },

  /* ==================== 内容创作 ==================== */
  {
    slug: 'video-transcode',
    name: '视频转码压缩',
    summary: '浏览器内硬编硬解，视频不上传',
    description:
      '用 WebCodecs 的硬件编解码能力在浏览器内转码视频：调整分辨率、码率、编码格式（H.264 / VP9），不经过服务器也不依赖几十兆的 WASM 转码器。支持时间裁剪与画面裁剪。',
    category: 'content',
    icon: Clapperboard,
    keywords: ['视频转码', '压缩', 'transcode', 'webcodecs', 'h264', 'vp9', '裁剪', '码率'],
    status: 'ready',
    featured: true,
  },
  {
    slug: 'music-video',
    name: '音乐可视化视频',
    summary: '把一首歌变成能发出去的视频',
    description:
      '导入一首音乐，选择频谱、波形、粒子等视觉样式，实时预览并导出视频。适合做音乐号的竖版素材、演出背景或播客的配套短片。',
    category: 'content',
    icon: AudioLines,
    keywords: ['音乐可视化', '频谱', '波形', 'music video', '可视化', '导出视频', 'mv'],
    status: 'ready',
  },
  {
    slug: 'social-card',
    name: '社交封面卡片图',
    summary: '各平台尺寸封面一键出图',
    description:
      '内置公众号、小红书、B站、YouTube 等平台的封面尺寸与版式模板，填标题与副标题、选背景与字体，一键导出对应尺寸的成品图。',
    category: 'content',
    icon: Images,
    keywords: ['封面', '卡片图', 'og image', '公众号', '小红书', '缩略图', '海报', '模板'],
    status: 'ready',
  },
];

/* ------------------------------------------------------------------ *
 * 查询辅助
 * ------------------------------------------------------------------ */
export const TOOL_MAP = TOOLS.reduce<Record<string, ToolMeta>>(
  (acc, t) => {
    acc[t.slug] = t;
    return acc;
  },
  {} as Record<string, ToolMeta>,
);

export function getTool(slug: string): ToolMeta | undefined {
  return TOOL_MAP[slug];
}

export function toolsByCategory(categoryId: CategoryId): ToolMeta[] {
  return TOOLS.filter((t) => t.category === categoryId);
}

export const FEATURED_TOOLS = TOOLS.filter((t) => t.featured);

export const TOTAL_TOOLS = TOOLS.length;

/** 已实现的工具 */
export const READY_TOOLS = TOOLS.filter((t) => t.status === 'ready');

/** 待实现的工具 */
export const PLANNED_TOOLS = TOOLS.filter((t) => t.status === 'planned');

export function isReady(slug: string): boolean {
  return getTool(slug)?.status === 'ready';
}
