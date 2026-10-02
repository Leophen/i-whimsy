import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Aperture,
  BadgeCheck,
  BrainCircuit,
  Clapperboard,
  Database,
  FileStack,
  GitCompare,
  Images,
  KeyRound,
  ListTree,
  Palette,
  ShieldCheck,
  SquareFunction,
} from 'lucide-react';

/* ------------------------------------------------------------------ *
 * Category —— 按「引擎」划分，不按「数据类型」划分
 *
 * 这是本项目的核心结构判断：
 *   普通工具 = 纯 JS 字符串 / 数学运算，谁都能写一版
 *   高级工具 = 把桌面软件的能力搬进浏览器（WASM / WebCodecs / WebGPU / OPFS / Web Crypto）
 *
 * 按数据类型分类（文本/图片/时间）会让「Base64 编解码」和「浏览器端视频转码」
 * 挤在同一层级；按引擎分类则天然把有技术含量的工具聚在一起。
 * ------------------------------------------------------------------ */
export type CategoryId =
  'ai' | 'media' | 'document' | 'data' | 'imaging' | 'crypto' | 'code' | 'design' | 'runtime';

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
    id: 'ai',
    name: '本地 AI 推理',
    enName: 'On-device AI',
    description:
      '模型在浏览器里跑，图片和语音不出本机。依赖 ONNX Runtime Web / transformers.js + WebGPU，不支持时自动回退 WASM。',
    icon: BrainCircuit,
    accentVar: 'var(--cat-ai)',
  },
  {
    id: 'media',
    name: '音视频引擎',
    enName: 'Media',
    description:
      '浏览器内完成转码、抽帧、混流与录制。走 WebCodecs 硬编硬解（不依赖 WASM），音频处理走 Web Audio 图。',
    icon: Clapperboard,
    accentVar: 'var(--cat-media)',
  },
  {
    id: 'document',
    name: '文档与 OCR',
    enName: 'Document',
    description:
      '在本地解析与生成 PDF、Word、Excel、Markdown。PDF 对象级编辑用 pdf-lib，OCR 用 tesseract.js，全程不上传。',
    icon: FileStack,
    accentVar: 'var(--cat-document)',
  },
  {
    id: 'data',
    name: '数据与查询',
    enName: 'Data',
    description:
      '把真正的数据库与分析引擎塞进浏览器：SQLite 持久化到 OPFS，DuckDB 直接查 CSV / Parquet。',
    icon: Database,
    accentVar: 'var(--cat-data)',
  },
  {
    id: 'imaging',
    name: '图像工程',
    enName: 'Imaging',
    description:
      '编解码、批处理流水线、隐私元数据。核心是 WASM 编解码器与 Worker 并发，不靠 Canvas 硬扛。',
    icon: Images,
    accentVar: 'var(--cat-imaging)',
  },
  {
    id: 'crypto',
    name: '密码与安全',
    enName: 'Crypto & Security',
    description: 'Web Crypto 能做的都做，不能做的用 WASM 补。密钥与明文永远留在本机内存里。',
    icon: ShieldCheck,
    accentVar: 'var(--cat-crypto)',
  },
  {
    id: 'code',
    name: '代码工程',
    enName: 'Code',
    description:
      '语法树级解析、自动机可视化、结构化差异。走 tree-sitter / shiki / CodeMirror，不是简单的字符串替换。',
    icon: SquareFunction,
    accentVar: 'var(--cat-code)',
  },
  {
    id: 'design',
    name: '设计与视觉',
    enName: 'Design',
    description:
      '参数联动的可视化工作台与系统级产出（设计令牌、字体子集、3D 预览），导出的是可直接落地的代码与资产。',
    icon: Palette,
    accentVar: 'var(--cat-design)',
  },
  {
    id: 'runtime',
    name: '运行时诊断',
    enName: 'Runtime',
    description:
      '探测浏览器与设备真实能力、跑基准、量网络质量。回答「这台机器到底能不能跑」这类问题。',
    icon: Activity,
    accentVar: 'var(--cat-runtime)',
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
  /* ==================== 本地 AI 推理 ==================== */
  {
    slug: 'bg-remover',
    name: '智能抠图去背景',
    summary: '本地模型一键去背景，图片不上传',
    description:
      '用 RMBG 系列分割模型在浏览器里做前景/背景分离，输出带透明通道的 PNG，可换纯色或自定义背景。模型在本机推理，人像与商品图不会离开你的设备。',
    category: 'ai',
    icon: Aperture,
    keywords: ['抠图', '去背景', 'remove background', 'matting', 'onnx', '透明', 'png'],
    status: 'planned',
    featured: true,
  },
  {
    slug: 'whisper-transcribe',
    name: '语音转文字',
    summary: 'Whisper 本地转写，带时间轴',
    description:
      '用 Whisper 模型在浏览器内把音频转成文字，输出带时间轴的字幕。支持中文与多语言，音频不会上传到任何服务器 —— 这是它和绝大多数「在线转写」的根本区别。',
    category: 'ai',
    icon: BrainCircuit,
    keywords: ['语音识别', '转写', 'whisper', 'transcribe', '字幕', 'asr', 'srt'],
    status: 'planned',
    featured: true,
  },
  {
    slug: 'semantic-search',
    name: '语义相似度检索',
    summary: '本地文本向量化，按意思找内容',
    description:
      '把一批文本用嵌入模型转成向量，输入一句话按语义相似度排序返回最相关的条目，并可视化相似度矩阵。适用于整理素材、去重、找相似工单。',
    category: 'ai',
    icon: ListTree,
    keywords: ['语义', '向量', 'embedding', '相似度', 'semantic', '余弦', '检索'],
    status: 'planned',
  },
  {
    slug: 'image-classify',
    name: '图像识别分类',
    summary: '本地图像分类与标签识别',
    description:
      '用轻量分类模型在浏览器内识别图片内容，输出 Top-N 标签与置信度，支持一次拖入多张批量推理并导出结果表。可用于素材归档、内容初筛。',
    category: 'ai',
    icon: Images,
    keywords: ['图像分类', '识别', 'classification', 'mobilenet', '标签', 'ai'],
    status: 'planned',
  },
  {
    slug: 'face-landmark',
    name: '人脸与姿态识别',
    summary: '实时人脸关键点、手势与姿态检测',
    description:
      '用 MediaPipe Tasks 在浏览器内做实时人脸关键点、手势识别与人体姿态估计，支持摄像头实时叠加骨架、视频逐帧分析。全部本地推理，画面不外传。',
    category: 'ai',
    icon: Activity,
    keywords: ['人脸', '关键点', '姿态', 'pose', 'face landmark', '手势', 'mediapipe'],
    status: 'planned',
  },

  /* ==================== 音视频引擎 ==================== */
  {
    slug: 'video-transcode',
    name: '视频转码',
    summary: '浏览器内硬编硬解转码，无需上传',
    description:
      '用 WebCodecs 的硬件编解码能力在浏览器内转码视频：调整分辨率、码率、编码格式（H.264 / VP9 / AV1），不经过 ffmpeg.wasm，速度快且体积小。支持 MP4 与 WebM 封装。',
    category: 'media',
    icon: Clapperboard,
    keywords: ['视频转码', '转码', 'transcode', 'webcodecs', 'h264', 'vp9', 'av1', '压缩'],
    status: 'planned',
    featured: true,
  },
  {
    slug: 'video-to-gif',
    name: '视频转 GIF',
    summary: '抽帧生成高质量 GIF，可控帧率与调色板',
    description:
      '按指定时间段与帧率从视频中抽帧，生成可控尺寸、循环次数与调色板质量的 GIF。支持首尾裁剪、逐帧预览与体积预估，比在线转换服务更可控。',
    category: 'media',
    icon: Aperture,
    keywords: ['gif', '视频转 gif', '抽帧', '动图', 'gifenc', 'webcodecs'],
    status: 'planned',
  },
  {
    slug: 'audio-lab',
    name: '音频工作台',
    summary: '波形可视化、裁切、变速与增益',
    description:
      '载入音频后可视化波形与频谱，支持区间裁切、淡入淡出、变速变调、响度归一化与增益调节，导出 WAV / MP3。处理链路走 Web Audio 的离线渲染，速度快且无损中间环节。',
    category: 'media',
    icon: Activity,
    keywords: ['音频', '波形', '裁切', '频谱', 'audio', 'waveform', '增益', '淡入淡出'],
    status: 'planned',
  },
  {
    slug: 'screen-recorder',
    name: '屏幕与摄像头录制',
    summary: '本地录制屏幕、窗口或摄像头并导出视频',
    description:
      '录制屏幕、浏览器窗口、指定标签页或摄像头画面，支持系统声音与麦克风混音、区域裁剪与画质码率调节。全程在浏览器内编码，录制文件不上传。',
    category: 'media',
    icon: Clapperboard,
    keywords: ['录屏', '录制', 'screen record', 'getDisplayMedia', 'mediaRecorder', '摄像头'],
    status: 'planned',
  },
  {
    slug: 'subtitle-studio',
    name: '字幕工作台',
    summary: '字幕格式互转、时间轴偏移与校对',
    description:
      '在 SRT / VTT / ASS / LRC 之间互转，批量平移时间轴、合并与拆分条目、去重与校对，并可直接把视频与字幕放在一起预览对齐效果。',
    category: 'media',
    icon: FileStack,
    keywords: ['字幕', 'srt', 'vtt', 'ass', 'lrc', '时间轴', 'subtitle'],
    status: 'planned',
  },

  /* ==================== 文档与 OCR ==================== */
  {
    slug: 'pdf-suite',
    name: 'PDF 编辑套件',
    summary: '合并拆分、旋转、水印、加密与页面重排',
    description:
      '在浏览器内做 PDF 对象级编辑：多文件合并、按范围拆分、页面重排与旋转、批量加水印与页码、元数据修改、密码加密与权限设置。文件不经过任何服务器。',
    category: 'document',
    icon: FileStack,
    keywords: ['pdf', '合并', '拆分', '水印', '加密', '旋转', 'pdf-lib', '页面'],
    status: 'planned',
    featured: true,
  },
  {
    slug: 'ocr-studio',
    name: '文字识别 OCR',
    summary: '图片与扫描件转可编辑文本',
    description:
      '对图片或 PDF 扫描件做 OCR，输出可编辑文本与保留版式的表格数据。支持中文、英文等多语言，可框选区域只识别指定部分，结果可导出为 txt / csv。',
    category: 'document',
    icon: Aperture,
    keywords: ['ocr', '文字识别', '扫描', 'tesseract', '提取文字', '识别'],
    status: 'planned',
    featured: true,
  },
  {
    slug: 'markdown-studio',
    name: 'Markdown 排版导出',
    summary: '代码高亮、公式、图表一次渲染并导出图片或 PDF',
    description:
      '把 Markdown 渲染成可发布的版式：代码块语法高亮、KaTeX 数学公式、Mermaid 流程图与表格，支持自定义主题与明暗两套配色，导出为长图、PDF 或 HTML。',
    category: 'document',
    icon: FileStack,
    keywords: ['markdown', '排版', '导出', 'shiki', 'katex', 'mermaid', '长图'],
    status: 'planned',
  },
  {
    slug: 'docx-builder',
    name: 'Word 文档生成',
    summary: '用结构化数据生成带样式的 docx',
    description:
      '把 Markdown 或结构化 JSON 转成带标题层级、表格、页眉页脚与样式的 .docx 文件，或反向解析已有 docx 提取正文与结构。适合批量生成报告与合同。',
    category: 'document',
    icon: FileStack,
    keywords: ['word', 'docx', '生成', '报告', '合同', '导出'],
    status: 'planned',
  },
  {
    slug: 'sheet-studio',
    name: '表格数据工作台',
    summary: 'CSV / Excel 读取、清洗与公式预览',
    description:
      '读取 xlsx / csv，做筛选、排序、去重、列变换与透视，预览公式计算结果，再导出为表格或 JSON。适合不进 Excel 快速处理一份数据。',
    category: 'document',
    icon: Database,
    keywords: ['excel', 'xlsx', 'csv', '表格', '透视', '清洗', '公式'],
    status: 'planned',
  },

  /* ==================== 数据与查询 ==================== */
  {
    slug: 'sqlite-browser',
    name: 'SQLite 数据库浏览器',
    summary: '打开数据库文件，建表查询并持久化到本地',
    description:
      '在浏览器里打开 .sqlite / .db 文件，浏览表结构与数据、执行 SQL、导出结果，改动可持久化到 OPFS，或另存为新的数据库文件。整个数据库不出本机。',
    category: 'data',
    icon: Database,
    keywords: ['sqlite', '数据库', 'sql', 'opfs', '查询', 'sql.js', 'db'],
    status: 'planned',
    featured: true,
  },
  {
    slug: 'duckdb-analytics',
    name: '大数据集即席分析',
    summary: '直接对 CSV / Parquet 跑 SQL，百万行不掉帧',
    description:
      '把 CSV、Parquet、JSON 拖进来直接用 SQL 查询，支持聚合、窗口函数与多表 JOIN。引擎是 DuckDB 的 WASM 版，面向分析场景优化，不会因为行数过百万就卡死。',
    category: 'data',
    icon: Database,
    keywords: ['duckdb', 'olap', 'parquet', 'csv', 'sql', '大数据', '分析'],
    status: 'planned',
    featured: true,
  },
  {
    slug: 'jq-playground',
    name: 'jq 表达式调试',
    summary: '真正的 jq 语法，实时看结果',
    description:
      '在浏览器里跑真正的 jq（不是子集实现）：编辑器里写表达式，实时预览匹配结果、路径与数量，内置常用配方与错误定位，适合处理接口返回的复杂 JSON。',
    category: 'data',
    icon: ListTree,
    keywords: ['jq', 'json', '查询', '过滤', 'transform', '流式'],
    status: 'planned',
  },
  {
    slug: 'json-path',
    name: 'JSONPath 查询',
    summary: '用表达式从 JSON 里取数据并实时看结果',
    description:
      '输入 JSONPath 表达式（$.a.b[0]、$..name、$[?(@.age>18)] 等）从 JSON 中查询数据，实时显示匹配结果、路径与数量，附带常用语法速查。',
    category: 'data',
    icon: ListTree,
    keywords: ['jsonpath', 'json', '查询', 'path', '过滤'],
    status: 'ready',
  },
  {
    slug: 'type-forge',
    name: '类型定义互转',
    summary: 'JSON 结构一键转 TypeScript、Zod、Go 结构体',
    description:
      '从样例 JSON 或 JSON Schema 生成目标语言的类型定义：TypeScript interface、Zod schema、Go struct、Rust struct、Java class，支持可选字段推断、命名风格与嵌套结构。',
    category: 'data',
    icon: SquareFunction,
    keywords: ['typescript', 'zod', 'go', 'schema', '类型', '结构体', '代码生成'],
    status: 'planned',
  },

  /* ==================== 图像工程 ==================== */
  {
    slug: 'image-codec',
    name: '图像格式转码',
    summary: 'AVIF / WebP / JPEG XL / OxiPNG 本地编解码',
    description:
      '用 WASM 编解码器做高质量格式转换与压缩：支持 AVIF、WebP、JPEG XL、OxiPNG、MozJPEG，可对比不同编码器的体积与画质，批量导出并给出压前压后对比。',
    category: 'imaging',
    icon: Images,
    keywords: ['avif', 'webp', 'jpeg xl', 'jxl', 'oxipng', 'squoosh', '压缩', '转码'],
    status: 'planned',
    featured: true,
  },
  {
    slug: 'image-pipeline',
    name: '批量图像流水线',
    summary: '拖入一批图，串起压缩、裁剪、水印、重命名',
    description:
      '把处理步骤串成流水线：统一尺寸、裁剪、滤镜、水印、格式转换、按规则重命名，一次跑完一批图片并打包下载。多步骤流水线可保存为预设复用。',
    category: 'imaging',
    icon: Images,
    keywords: ['批量', '流水线', '压缩', '水印', '重命名', '预设', 'worker'],
    status: 'planned',
    featured: true,
  },
  {
    slug: 'exif-studio',
    name: 'EXIF 查看与擦除',
    summary: '查看拍摄参数，一键抹掉隐私元数据',
    description:
      '读取照片的完整 EXIF / IPTC / XMP 信息（机型、镜头、参数、GPS 定位、编辑历史），并可按项擦除或整体剥离元数据后导出。发图前清 GPS 定位很实用。',
    category: 'imaging',
    icon: Images,
    keywords: ['exif', '元数据', 'gps', '隐私', '清除', '拍摄参数'],
    status: 'planned',
  },
  {
    slug: 'svg-optimizer',
    name: 'SVG 优化清理',
    summary: '压缩体积、合并路径、去编辑器冗余',
    description:
      '清理导出 SVG 里的编辑器冗余：删除无用的 defs 与注释、合并路径、精简数值精度、去除 metadata 与命名空间，对比优化前后体积并预览渲染结果是否一致。',
    category: 'imaging',
    icon: SquareFunction,
    keywords: ['svg', '优化', 'svgo', '压缩', '路径合并', '图标'],
    status: 'planned',
  },
  {
    slug: 'image-palette',
    name: '图片主色提取',
    summary: '中位切分算法提取主色与配色比例',
    description:
      '用中位切分（median cut）算法从图片中提取主色板，给出每种颜色的占比，可直接导出为 CSS 变量、Tailwind 配置或设计令牌。',
    category: 'imaging',
    icon: Palette,
    keywords: ['主色', '调色板', 'palette', '取色', 'median cut', '设计令牌'],
    status: 'ready',
  },

  /* ==================== 密码与安全 ==================== */
  {
    slug: 'crypto-lab',
    name: '非对称加密与密钥',
    summary: 'RSA / ECDSA / Ed25519 加解密与签名验签',
    description:
      '生成与导入 RSA、ECDSA、Ed25519 密钥对，做加密解密、签名验签与密钥格式转换（PEM / JWK / DER）。私钥只在浏览器内存中生成，不经网络传输。',
    category: 'crypto',
    icon: KeyRound,
    keywords: ['rsa', 'ecdsa', 'ed25519', '密钥', '签名', '验签', 'pem', 'jwk'],
    status: 'planned',
    featured: true,
  },
  {
    slug: 'hash-suite',
    name: '哈希与密钥派生',
    summary: '摘要、HMAC、PBKDF2 / Argon2 / scrypt / HKDF',
    description:
      '一个页面覆盖摘要与密钥派生：MD5 到 SHA-512、SHA-3、HMAC 全算法，以及 PBKDF2、Argon2id、scrypt、HKDF 等口令与密钥派生函数，可调节迭代与内存参数并给出耗时。',
    category: 'crypto',
    icon: ShieldCheck,
    keywords: ['哈希', 'hash', 'pbkdf2', 'argon2', 'scrypt', 'hkdf', 'hmac', '派生'],
    status: 'planned',
    featured: true,
  },
  {
    slug: 'x509-inspector',
    name: '数字证书解析',
    summary: '解析 X.509 证书与 ASN.1 结构',
    description:
      '粘贴 PEM 证书或上传 .cer 文件，解析出主体、颁发者、有效期、公钥算法、扩展项与指纹，并可视化 ASN.1 树结构。排查证书链问题、看 SAN 域名列表时很省事。',
    category: 'crypto',
    icon: BadgeCheck,
    keywords: ['x509', '证书', 'asn1', 'ssl', 'tls', 'pem', '指纹', 'san'],
    status: 'planned',
  },
  {
    slug: 'ctf-toolbox',
    name: '编码链工作台',
    summary: '像 CyberChef 一样把编码与加密串成流水线',
    description:
      '把 Base64、Hex、URL、ROT13、异或、压缩、哈希等算子拖成一条流水线，数据依次流过每个算子并逐级预览中间结果。处理多层嵌套编码和 CTF 题目时效率远高于来回切工具。',
    category: 'crypto',
    icon: ShieldCheck,
    keywords: ['cyberchef', '编码链', 'ctf', 'rot13', '异或', '流水线', 'recipe'],
    status: 'planned',
    featured: true,
  },

  /* ==================== 代码工程 ==================== */
  {
    slug: 'ast-playground',
    name: 'AST 解析与重构',
    summary: '语法树级查看与批量代码改写',
    description:
      '把 JS / TS / CSS / HTML 解析成语法树并可视化，支持按节点类型查询、用选择器批量重命名与改写，导出改写后的代码或 codemod 脚本。不是正则替换，不会踩到字符串里的同名标识符。',
    category: 'code',
    icon: SquareFunction,
    keywords: ['ast', 'codemod', '重构', '语法树', 'tree-sitter', 'swc', 'babel'],
    status: 'planned',
    featured: true,
  },
  {
    slug: 'regex-visualizer',
    name: '正则可视化与调试',
    summary: '把正则画成自动机图，逐步跟踪匹配',
    description:
      '把正则表达式可视化成正则语法树与自动机状态图，支持逐步执行匹配过程、高亮回溯点、对比不同写法的性能差异。排查灾难性回溯时特别有用。',
    category: 'code',
    icon: SquareFunction,
    keywords: ['正则', 'regex', '自动机', 'dfa', 'nfa', '回溯', '可视化'],
    status: 'planned',
    featured: true,
  },
  {
    slug: 'code-image',
    name: '代码高亮出图',
    summary: '生成带主题的精美代码截图',
    description:
      '把代码片段渲染成带语法高亮与窗口装饰的图片：可选主流主题、行号、高亮行、背景样式与内边距，导出 PNG 或 SVG。写文档、发帖配图直接用。',
    category: 'code',
    icon: Images,
    keywords: ['代码截图', '高亮', 'shiki', 'carbon', '语法高亮', '出图'],
    status: 'planned',
  },
  {
    slug: 'text-diff',
    name: '文本差异比对',
    summary: '按行或按字比对，双栏高亮差异',
    description:
      '按行或按字符粒度比对两段文本，双栏高亮新增与删除，支持忽略空白与大小写差异，统计增删行数。适合比对配置、日志与文档改动。',
    category: 'code',
    icon: GitCompare,
    keywords: ['diff', '对比', '差异', '文本比较', '变更'],
    status: 'ready',
  },
  {
    slug: 'bundle-inspector',
    name: '构建产物分析',
    summary: '分析打包体积，找出体积元凶',
    description:
      '上传打包分析产物（webpack stats、Rollup / Vite 的 bundle 报告），生成可交互的模块体积树图与排行：按体积排序、按 chunk 拆分、查看依赖引用链，定位能真正瘦身的模块。',
    category: 'code',
    icon: SquareFunction,
    keywords: ['bundle', '体积', 'webpack', 'vite', 'rollup', 'treemap', '分析', 'stats'],
    status: 'planned',
  },

  /* ==================== 设计与视觉 ==================== */
  {
    slug: 'css-lab',
    name: 'CSS 效果实验室',
    summary: '阴影、玻璃、圆角、渐变参数联动调参',
    description:
      '一个工作台里联动调节阴影、玻璃拟态、有机圆角、渐变、滤镜与流体字号，实时预览多层叠加效果，导出干净的 CSS 与设计令牌，而不是每个效果一个独立页面。',
    category: 'design',
    icon: Palette,
    keywords: ['css', '阴影', '玻璃拟态', '圆角', '渐变', '滤镜', 'clamp', '工作台'],
    status: 'planned',
    featured: true,
  },
  {
    slug: 'cubic-bezier',
    name: '贝塞尔缓动曲线',
    summary: '拖拽控制点生成 cubic-bezier 与预设缓动',
    description:
      '拖动两个控制点生成 CSS cubic-bezier 缓动函数，实时预览动画曲线与小球运动，内置 ease / ease-in-out / 回弹等常用预设，一键复制 CSS。',
    category: 'design',
    icon: Activity,
    keywords: ['cubic-bezier', '贝塞尔', '缓动', 'easing', '动画', 'css'],
    status: 'ready',
    featured: true,
  },
  {
    slug: 'color-system',
    name: '配色系统生成',
    summary: '从一个主色生成完整色阶与设计令牌',
    description:
      '输入主色自动生成 50–950 的完整色阶、语义色（成功/警告/危险）、深色模式映射与对比度校验结果，导出为 CSS 变量、Tailwind 配置或 Figma Tokens。',
    category: 'design',
    icon: Palette,
    keywords: ['配色', '色阶', '设计令牌', 'tailwind', 'tokens', '深色模式', '主题'],
    status: 'planned',
    featured: true,
  },
  {
    slug: 'color-contrast',
    name: '对比度检查',
    summary: '按 WCAG 标准校验文字与背景可读性',
    description:
      '按 WCAG 2.1 计算相对亮度与对比度比值，判断是否达到 AA / AAA 标准，给出修色建议与最接近的合规颜色，支持同时校验前景与背景的组合。',
    category: 'design',
    icon: Aperture,
    keywords: ['对比度', 'wcag', '无障碍', 'a11y', '亮度', '配色'],
    status: 'ready',
  },
  {
    slug: 'three-viewer',
    name: '3D 模型预览',
    summary: '加载 glTF / GLB / OBJ 并调试材质光照',
    description:
      '在浏览器里加载并检查 3D 模型：轨道相机漫游、线框与法线叠加、材质替换、环境光照与环境贴图切换、动画轨道播放，并给出模型面数与贴图体积统计。',
    category: 'design',
    icon: Images,
    keywords: ['3d', 'gltf', 'glb', 'obj', 'three.js', '模型', '材质', '光照'],
    status: 'planned',
  },
  {
    slug: 'font-subset',
    name: '字体子集化',
    summary: '按用到的字符裁剪字体，大幅减小体积',
    description:
      '提取页面上真正用到的字符集合，对 TTF / OTF / WOFF / WOFF2 做子集化裁剪并转换格式，对比裁剪前后的体积与字符覆盖率。中文字体动辄十几 MB，子集化后常能压到几十 KB。',
    category: 'design',
    icon: SquareFunction,
    keywords: ['字体', '子集化', 'subset', 'woff2', 'ttf', 'fonttools', '体积'],
    status: 'planned',
    featured: true,
  },

  /* ==================== 运行时诊断 ==================== */
  {
    slug: 'device-lab',
    name: '设备能力探测',
    summary: '一次看清这台设备支持哪些现代 API',
    description:
      '逐项检测浏览器的现代能力矩阵：WebGPU、WebCodecs、WASM SIMD / 线程、OPFS、Compression Streams、SharedArrayBuffer 与跨源隔离状态，给出每项的真实支持情况与降级建议。',
    category: 'runtime',
    icon: Activity,
    keywords: ['能力检测', 'feature detect', 'webgpu', 'webcodecs', 'wasm', '兼容性'],
    status: 'planned',
    featured: true,
  },
  {
    slug: 'perf-benchmark',
    name: '性能基准测试',
    summary: '跑分对比 CPU、内存、Canvas 与加解密吞吐',
    description:
      '在本机跑一组标准化基准：整数与浮点吞吐、字符串与 JSON 处理、Canvas 光栅化、Web Crypto 加解密与哈希速度、内存带宽，输出可对比的分数与历史记录。',
    category: 'runtime',
    icon: Activity,
    keywords: ['跑分', 'benchmark', '性能', '基准', 'cpu', '内存', '吞吐'],
    status: 'planned',
  },
  {
    slug: 'network-lab',
    name: '网络质量诊断',
    summary: '测量延迟、抖动、吞吐与连通性',
    description:
      '在浏览器里测量网络质量：往返延迟与抖动、下游吞吐、DNS 与连接建立耗时拆解、常见端口的连通性探测，并把多次结果画成趋势图，用于判断网络抖动还是服务端问题。',
    category: 'runtime',
    icon: Activity,
    keywords: ['网络', '延迟', '带宽', '抖动', 'network', '测速', 'ping'],
    status: 'planned',
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
