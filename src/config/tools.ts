import type { LucideIcon } from 'lucide-react';
import {
  AlignLeft,
  ArrowLeftRight,
  BarChart3,
  Binary,
  Braces,
  CalendarClock,
  CalendarPlus,
  CalendarRange,
  CaseSensitive,
  CircleDashed,
  Clock,
  CodeXml,
  Contrast,
  Crop,
  Crown,
  Database,
  Dices,
  Droplets,
  FileCode2,
  FileKey,
  FileLock2,
  Fingerprint,
  GitBranch,
  GitCompare,
  Globe,
  Grid2x2,
  Hash,
  ImageDown,
  ImageIcon,
  KeyRound,
  KeySquare,
  Layers,
  Link2,
  ListFilter,
  ListTree,
  Lock,
  Minimize2,
  MonitorSmartphone,
  Network,
  Paintbrush,
  Percent,
  Pipette,
  QrCode,
  Regex,
  Replace,
  Router,
  Ruler,
  Scaling,
  Sigma,
  SlidersHorizontal,
  Sparkles,
  Spline,
  Stamp,
  Table2,
  Terminal,
  Timer,
  TypeIcon,
  Wand2,
  WandSparkles,
  Waves,
  WrapText,
} from 'lucide-react';

/* ------------------------------------------------------------------ *
 * Category
 * ------------------------------------------------------------------ */
export type CategoryId =
  | 'text'
  | 'crypto'
  | 'image'
  | 'color'
  | 'data'
  | 'time'
  | 'converter'
  | 'generator'
  | 'css'
  | 'dev'
  | 'creative';

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
    id: 'text',
    name: '文本处理',
    enName: 'Text',
    description: '大小写、命名风格、替换、统计、对比与 Diff，写文档和处理内容的日常工具。',
    icon: CaseSensitive,
    accentVar: 'var(--cat-text)',
  },
  {
    id: 'crypto',
    name: '编码加密',
    enName: 'Encoding & Crypto',
    description: 'Base64、URL、HTML 实体、哈希、HMAC、UUID、密码与 JWT，全部在本地计算。',
    icon: Lock,
    accentVar: 'var(--cat-crypto)',
  },
  {
    id: 'image',
    name: '图片处理',
    enName: 'Image',
    description: '压缩、裁剪、滤镜、水印、取色与二维码，基于 Canvas 全程在浏览器完成。',
    icon: ImageIcon,
    accentVar: 'var(--cat-image)',
  },
  {
    id: 'color',
    name: '颜色设计',
    enName: 'Color',
    description: '颜色格式互转、WCAG 对比度检查、渐变与色阶生成，给前端和设计师用。',
    icon: Pipette,
    accentVar: 'var(--cat-color)',
  },
  {
    id: 'data',
    name: '数据格式',
    enName: 'Data',
    description: 'JSON / YAML / CSV / XML / SQL 的格式化、互转与校验，接口调试必备。',
    icon: Braces,
    accentVar: 'var(--cat-data)',
  },
  {
    id: 'time',
    name: '日期时间',
    enName: 'Date & Time',
    description: '时间戳换算、日期差、日期推算、跨时区对照，处理时间不再心算。',
    icon: Clock,
    accentVar: 'var(--cat-time)',
  },
  {
    id: 'converter',
    name: '换算工具',
    enName: 'Converter',
    description: '单位换算、进制转换、百分比、文件权限与 Cron 表达式换算。',
    icon: ArrowLeftRight,
    accentVar: 'var(--cat-converter)',
  },
  {
    id: 'generator',
    name: '生成器',
    enName: 'Generator',
    description: '占位文本、随机数据、Unicode 转义与二进制视图。',
    icon: Sparkles,
    accentVar: 'var(--cat-generator)',
  },
  {
    id: 'css',
    name: 'CSS 与前端',
    enName: 'CSS & Frontend',
    description:
      '代码美化压缩、CSS 单位换算、阴影、缓动、玻璃拟态、有机圆角，直接产出可粘贴的 CSS。',
    icon: CodeXml,
    accentVar: 'var(--cat-css)',
  },
  {
    id: 'dev',
    name: '开发速查',
    enName: 'Dev Cheatsheet',
    description: '.gitignore 生成、HTTP 状态码、User-Agent 解析、子网计算与 JSONPath 查询。',
    icon: Terminal,
    accentVar: 'var(--cat-dev)',
  },
  {
    id: 'creative',
    name: '视觉创意',
    enName: 'Creative',
    description: 'SVG 波浪、噪点纹理与文字 ASCII 艺术，用来做背景、配图和一点炫技。',
    icon: WandSparkles,
    accentVar: 'var(--cat-creative)',
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
  /** 首页精选 */
  featured?: boolean;
  /** 依赖 Canvas / Clipboard 等仅浏览器 API */
  clientOnly?: boolean;
}

export const TOOLS: ToolMeta[] = [
  /* ==================== 文本处理 ==================== */
  {
    slug: 'text-case-converter',
    name: '文本大小写转换',
    summary: '驼峰、下划线、常量式等 17 种命名风格互转',
    description:
      '在线转换文本大小写与命名风格：全大写、全小写、首字母大写、小驼峰 camelCase、大驼峰 PascalCase、下划线 snake_case、短横线 kebab-case、常量式 CONSTANT_CASE 等 17 种，支持中英混合输入，实时预览结果，一键复制。',
    category: 'text',
    icon: CaseSensitive,
    keywords: ['大小写', '驼峰', '命名', 'camel', 'pascal', 'snake', 'kebab', 'case'],
    featured: true,
  },
  {
    slug: 'text-replace',
    name: '文本替换',
    summary: '支持正则、全词匹配、区分大小写的批量替换',
    description:
      '在线批量替换文本：支持普通文本与正则表达式两种模式，可开启区分大小写、全词匹配、多行模式，实时显示替换命中次数，特殊正则字符自动转义避免误替换。',
    category: 'text',
    icon: Replace,
    keywords: ['替换', '批量', '正则', 'replace', 'regex', '查找'],
  },
  {
    slug: 'text-statistics',
    name: '文本统计',
    summary: '字符数、字数、字节数、行数、单词数一站统计',
    description:
      '统计文本的字符数、UTF-8 字节数、行数、中文字数、英文单词数、去重词数、数字与空格数量，并估算阅读时长。正确处理 emoji 与代理对，中英混排同样准确。',
    category: 'text',
    icon: BarChart3,
    keywords: ['统计', '字数', '字符', '字节', 'word', 'count', 'characters'],
    featured: true,
  },
  {
    slug: 'text-diff',
    name: '文本对比 Diff',
    summary: '按行或按字符对比两段文本的差异',
    description:
      '对比两段文本的差异，支持按行或按字符粒度 Diff，直观标出新增与删除内容，适合校对文案、比对配置差异与查看代码改动。',
    category: 'text',
    icon: GitCompare,
    keywords: ['对比', '差异', 'diff', 'compare', '比对'],
    featured: true,
  },
  {
    slug: 'text-sort-dedupe',
    name: '文本去重排序',
    summary: '行去重、排序、洗牌、反转、压缩空行',
    description:
      '对多行文本做去重、按字典序或数值排序、随机打乱、倒序反转、去除首尾空格与多余空行，并给出被移除的行数统计。适合清洗日志、名单与标签列表。',
    category: 'text',
    icon: ListFilter,
    keywords: ['去重', '排序', '洗牌', 'dedupe', 'sort', 'unique'],
  },
  {
    slug: 'text-width-converter',
    name: '全角半角转换',
    summary: '全角 ⇄ 半角字符一键互转',
    description:
      '把全角字符与半角字符互相转换，处理中英混排文档、清洗表单数据、对齐代码字符串时非常有用，实时转换并可复制结果。',
    category: 'text',
    icon: TypeIcon,
    keywords: ['全角', '半角', 'fullwidth', 'halfwidth', '字符'],
  },
  {
    slug: 'markdown-preview',
    name: 'Markdown 预览',
    summary: '实时渲染 Markdown 并美化代码块',
    description:
      '实时预览 Markdown 渲染效果，支持 GFM 表格、任务列表、代码块、引用、标题与链接，左右分栏编辑，所见即所得，适合写 README 与文档初稿。',
    category: 'text',
    icon: FileCode2,
    keywords: ['markdown', '预览', 'md', '渲染', '富文本'],
  },
  {
    slug: 'regex-tester',
    name: '正则表达式测试',
    summary: '实时匹配、分组捕获与替换结果预览',
    description:
      '在线测试正则表达式：支持全部修饰符，列出每个匹配及其分组捕获内容，并预览替换后的文本。附带邮箱、手机号、URL 等常用正则速查表。',
    category: 'text',
    icon: Regex,
    keywords: ['正则', 'regex', '匹配', '分组', 'tester'],
    featured: true,
  },

  /* ==================== 编码加密 ==================== */
  {
    slug: 'base64-text',
    name: 'Base64 编解码',
    summary: 'UTF-8 安全的文本 Base64 编解码',
    description:
      'Base64 编码与解码，正确处理中文、emoji 等 UTF-8 字符（原生 btoa 遇到非 Latin-1 字符会报错），支持 URL-safe 变体。常用于接口调试、数据传输与 Basic Auth。',
    category: 'crypto',
    icon: Binary,
    keywords: ['base64', '编码', '解码', 'encode', 'decode', 'utf8'],
    featured: true,
  },
  {
    slug: 'base64-image',
    name: 'Base64 图片互转',
    summary: '图片与 Data URL 双向转换',
    description:
      '把图片文件转换成 Base64 Data URL（可直接写进 CSS / HTML），也能把 Data URL 还原成图片并下载。支持 PNG、JPEG、WebP、GIF、SVG 等格式。',
    category: 'crypto',
    icon: ImageDown,
    keywords: ['base64', '图片', 'data url', '互转', 'image'],
    featured: true,
  },
  {
    slug: 'url-encoder',
    name: 'URL 编解码',
    summary: 'URL 与查询参数编码解码、参数表解析',
    description:
      '对 URL 或查询串做百分号编码与解码，同时把查询串拆成可读的键值对表格，方便调试接口参数、处理中文链接与回调地址。',
    category: 'crypto',
    icon: Link2,
    keywords: ['url', '编码', '解码', 'encodeURIComponent', 'query', '参数'],
    featured: true,
  },
  {
    slug: 'html-entities',
    name: 'HTML 实体编解码',
    summary: 'HTML 特殊字符与实体互转',
    description:
      '把尖括号、与号、引号等字符转成 HTML 实体，或把 &amp; &lt; 之类的实体还原成原文。处理富文本、防止 XSS 注入、在模板内插入代码片段时常用。',
    category: 'crypto',
    icon: FileCode2,
    keywords: ['html', '实体', 'entity', 'escape', '转义'],
  },
  {
    slug: 'hash-generator',
    name: '哈希生成器',
    summary: 'MD5 / SHA-1 / SHA-256 / SHA-512 / SHA3 文本与文件摘要',
    description:
      '计算文本或文件的哈希摘要，支持 MD5、SHA-1、SHA-256、SHA-512、SHA3 与 RIPEMD-160。文件在本地按字节读取不上传，适合校验文件完整性与生成缓存键。',
    category: 'crypto',
    icon: Fingerprint,
    keywords: ['hash', '哈希', 'md5', 'sha256', 'sha512', 'sha1', '摘要', '校验'],
    featured: true,
  },
  {
    slug: 'hmac-generator',
    name: 'HMAC 生成器',
    summary: '带密钥的消息认证码计算',
    description:
      '用密钥计算 HMAC 摘要，支持 MD5、SHA-1、SHA-256、SHA-512 与 SHA3。常用于接口签名、Webhook 验签与消息完整性校验，支持自定义输出进制。',
    category: 'crypto',
    icon: KeySquare,
    keywords: ['hmac', '签名', '验签', 'sha256', '密钥'],
  },
  {
    slug: 'uuid-generator',
    name: 'UUID / NanoID 生成',
    summary: '批量生成 UUID v4、v1 与 NanoID',
    description:
      '基于 Web Crypto 安全随机数批量生成 UUID v4、含时间序的 UUID v1 风格与 NanoID，可一键复制全部，适合构造测试数据的主键。',
    category: 'crypto',
    icon: Hash,
    keywords: ['uuid', 'guid', 'nanoid', '随机', 'id'],
    featured: true,
  },
  {
    slug: 'password-generator',
    name: '密码生成器',
    summary: '可定制规则的随机密码批量生成',
    description:
      '生成高强度随机密码：可指定长度、是否包含大小写字母、数字、符号，排除易混淆字符，或保证每种字符至少出现一次。同时给出熵值与破解时长评估。',
    category: 'crypto',
    icon: KeyRound,
    keywords: ['密码', 'password', '随机', '生成器', '强度'],
    featured: true,
  },
  {
    slug: 'jwt-decoder',
    name: 'JWT 解析',
    summary: '解码 Header / Payload 并检查过期时间',
    description:
      '粘贴 JWT 即可解析 Header 与 Payload，格式化展示过期时间 exp、签发时间 iat、生效时间 nbf，并标出令牌是否已过期。纯前端解析，令牌不会外泄。',
    category: 'crypto',
    icon: FileKey,
    keywords: ['jwt', 'token', '解析', 'decode', 'payload'],
    featured: true,
  },
  {
    slug: 'aes-encryptor',
    name: 'AES 加解密',
    summary: '用口令对文本做对称加密与解密',
    description:
      '输入口令即可对文本做 AES（CBC + PKCS7）对称加密，或反过来把密文解回明文。适合临时加密一段敏感文本再粘贴给他人，密钥不落服务端。',
    category: 'crypto',
    icon: Lock,
    keywords: ['aes', '加密', '解密', 'encrypt', 'decrypt', '对称'],
  },

  /* ==================== 图片处理 ==================== */
  {
    slug: 'image-compress',
    name: '图片压缩',
    summary: '调质量、限尺寸、换格式，实时对比压缩效果',
    description:
      '在浏览器里压缩图片：可调质量、限制最大边长、切换 PNG / JPEG / WebP 输出格式，实时对比压缩前后体积与节省比例，一键下载。图片不上传任何服务器。',
    category: 'image',
    icon: Minimize2,
    keywords: ['压缩', '图片', 'compress', 'image', '体积', 'webp'],
    featured: true,
    clientOnly: true,
  },
  {
    slug: 'image-crop',
    name: '图片裁剪',
    summary: '拖拽裁剪区域，支持常见比例与圆形头像',
    description:
      '可视化裁剪图片：拖动调整位置与缩放，支持自由比例与 1:1、4:3、16:9、9:16、3:4 等预设，可切圆形蒙版做头像，导出 PNG / JPEG / WebP。',
    category: 'image',
    icon: Crop,
    keywords: ['裁剪', 'crop', '头像', '比例', '图片'],
    featured: true,
    clientOnly: true,
  },
  {
    slug: 'image-filter',
    name: '图片滤镜调整',
    summary: '亮度、对比度、饱和度等参数化调色与预设',
    description:
      '用滑杆调整图片的亮度、对比度、饱和度、色相、模糊、灰度、怀旧与反相，提供复古、黑白、胶片等预设，实时预览后导出图片。',
    category: 'image',
    icon: SlidersHorizontal,
    keywords: ['滤镜', 'filter', '亮度', '对比度', '调色', '灰度'],
    clientOnly: true,
  },
  {
    slug: 'image-watermark',
    name: '图片加水印',
    summary: '平铺或居中的自定义文字水印',
    description:
      '给图片添加文字水印：可选全图斜向平铺或居中单枚，自定义文案、颜色、字号、透明度、旋转角度与疏密程度，导出带水印的图片用于版权保护。',
    category: 'image',
    icon: Stamp,
    keywords: ['水印', 'watermark', '版权', '文字', '图片'],
    clientOnly: true,
  },
  {
    slug: 'image-palette',
    name: '图片主色提取',
    summary: '用中位切分算法提取图片配色方案',
    description:
      '上传图片后用中位切分（median cut）算法提取主色调与占比，输出可直接使用的色卡，点击即复制色值。适合做主题色、配图取色与 UI 一致性检查。',
    category: 'image',
    icon: Droplets,
    keywords: ['取色', '主色', '配色', 'palette', 'color', '调色板'],
    featured: true,
    clientOnly: true,
  },
  {
    slug: 'qrcode-generator',
    name: '二维码生成器',
    summary: '文本、链接、WiFi 生成二维码并可下载',
    description:
      '把文本、网址、电话或 WiFi 信息生成二维码：可调尺寸、纠错级别与前后景色；也能把 Data URL 反向读作图片。适合做分享卡片与线下物料。',
    category: 'image',
    icon: QrCode,
    keywords: ['二维码', 'qrcode', 'qr', '生成', '扫码'],
    featured: true,
    clientOnly: true,
  },

  /* ==================== 颜色设计 ==================== */
  {
    slug: 'color-converter',
    name: '颜色转换器',
    summary: 'HEX / RGB / HSL / HSV / CMYK 互转',
    description:
      '在 HEX、RGB、RGBA、HSL、HSLA、HSV 与 CMYK 之间互相转换颜色值，支持色名输入与可视化取色，实时输出各种格式的 CSS 值可直接复制。',
    category: 'color',
    icon: Pipette,
    keywords: ['颜色', 'color', 'hex', 'rgb', 'hsl', 'cmyk', '转换'],
    featured: true,
  },
  {
    slug: 'color-contrast',
    name: '对比度检查器',
    summary: '按 WCAG 2.1 判定 AA / AAA 是否达标',
    description:
      '检查前景色与背景色的对比度是否符合 WCAG 2.1：给出 1~21 的比值与正文 / 大文本 / UI 组件的 AA、AAA 达标结论，并提供真实文本预览，帮助通过无障碍审核。',
    category: 'color',
    icon: Contrast,
    keywords: ['对比度', 'contrast', 'wcag', '无障碍', 'accessibility', 'a11y'],
    featured: true,
  },
  {
    slug: 'gradient-generator',
    name: 'CSS 渐变生成',
    summary: '多色停靠点的线性 / 径向渐变与 CSS 代码',
    description:
      '可视化生成 CSS 渐变：添加多个色标、切换线性与径向、调整角度，实时预览并导出可直接使用的 CSS 代码，也能一键复制 Tailwind 渐变写法。',
    category: 'color',
    icon: Layers,
    keywords: ['渐变', 'gradient', 'css', '线性', '径向'],
    featured: true,
  },
  {
    slug: 'color-palette',
    name: '调色板生成器',
    summary: '由一个基色生成色阶与和谐配色方案',
    description:
      '输入一个基础色，自动生成 10 级色阶，以及互补色、类似色、三角配色、四方配色与分裂互补色，点击任意色块即可复制色值。适合搭建设计系统色板。',
    category: 'color',
    icon: Droplets,
    keywords: ['调色板', '色阶', '配色', 'palette', 'harmony', '设计'],
  },

  /* ==================== 数据格式 ==================== */
  {
    slug: 'json-formatter',
    name: 'JSON 格式化',
    summary: '美化、压缩、校验并定位错误行列',
    description:
      'JSON 美化与压缩一体：支持 2 空格、4 空格、Tab 缩进，输入错误时精确定位到第几行第几列并给出原因。常用于接口报文调试与配置文件校验。',
    category: 'data',
    icon: Braces,
    keywords: ['json', '格式化', '美化', '压缩', '校验', 'format'],
    featured: true,
  },
  {
    slug: 'json-yaml',
    name: 'JSON ⇄ YAML 互转',
    summary: 'JSON 与 YAML 双向转换，保留数据结构',
    description:
      '在 JSON 与 YAML 之间双向转换，保留原始键顺序与嵌套结构，支持自定义缩进。处理 Kubernetes 配置、CI 流水线与接口文档时非常方便。',
    category: 'data',
    icon: ArrowLeftRight,
    keywords: ['json', 'yaml', 'yml', '互转', '转换'],
    featured: true,
  },
  {
    slug: 'json-csv',
    name: 'JSON ⇄ CSV 互转',
    summary: '对象数组与 CSV 表格双向转换',
    description:
      '把 JSON 对象数组转成 CSV（自动合并所有出现过的字段作为表头），或把 CSV 解析成 JSON，可切换是否以首行作为列名。适合导出报表与批量数据整理。',
    category: 'data',
    icon: Table2,
    keywords: ['json', 'csv', '表格', '互转', '导出', 'excel'],
  },
  {
    slug: 'json-escape',
    name: 'JSON 转义 / 去转义',
    summary: '字符串与 JSON 转义串互转',
    description:
      '把普通字符串转成带转义的 JSON 字符串值，或把转义序列还原成原文。处理接口报文、日志文件与嵌套 JSON 字符串时非常实用。',
    category: 'data',
    icon: Braces,
    keywords: ['转义', 'escape', 'json', '字符串', '去转义'],
  },
  {
    slug: 'xml-formatter',
    name: 'XML 格式化校验',
    summary: '美化 XML 并校验结构是否合法',
    description:
      '格式化 XML 让它有清晰的缩进层级，同时校验标签是否闭合、属性是否合法，出错时给出行列位置。处理老系统配置文件与 SOAP 报文时常用。',
    category: 'data',
    icon: FileCode2,
    keywords: ['xml', '格式化', '校验', '美化'],
  },
  {
    slug: 'sql-formatter',
    name: 'SQL 格式化',
    summary: '12 种方言美化 SQL 并统一关键字大小写',
    description:
      '格式化混乱的 SQL：支持 MySQL、PostgreSQL、SQL Server、Oracle、BigQuery、SQLite、Snowflake 等 12 种方言，可统一关键字大小写、设置缩进宽度与单行最大宽度。',
    category: 'data',
    icon: Database,
    keywords: ['sql', '格式化', '美化', 'mysql', 'postgres', '方言'],
    featured: true,
  },

  /* ==================== 日期时间 ==================== */
  {
    slug: 'timestamp-converter',
    name: 'Unix 时间戳转换',
    summary: '时间戳 ⇄ 日期字符串，自动识别秒 / 毫秒',
    description:
      'Unix 时间戳与可读日期互相转换，自动识别秒级与毫秒级时间戳，同时给出 ISO 8601、UTC、本地时间与相对时间。适合调试接口里的 createTime 字段。',
    category: 'time',
    icon: Timer,
    keywords: ['时间戳', 'timestamp', 'unix', '转换', '日期'],
    featured: true,
  },
  {
    slug: 'date-diff',
    name: '日期差计算',
    summary: '两个日期相差多久，含工作日统计',
    description:
      '计算两个日期之间相差多少年、月、日、时、分、秒，同时给出总天数、周数、工作日数与周末天数，支持一键交换顺序。算工期、算年龄、算到期日都用它。',
    category: 'time',
    icon: CalendarRange,
    keywords: ['日期差', '相差', '天数', '工作日', 'diff'],
    featured: true,
  },
  {
    slug: 'date-calculator',
    name: '日期推算器',
    summary: '在基准日期上加减年月日时分秒',
    description:
      '给定基准日期，往前或往后推算任意数量的年、月、周、日、时、分、秒，支持负数。处理月度 fecha 边界、算 deadline 与订阅到期时间很方便。',
    category: 'time',
    icon: CalendarPlus,
    keywords: ['日期', '推算', '加减', '计算', 'deadline'],
  },
  {
    slug: 'timezone-converter',
    name: '时区转换',
    summary: '同一时刻在全球主要时区的时间对照',
    description:
      '把一个时刻换算到全球常用时区，同时列出所有时区的对照表，标出当地是否处于工作时间。安排跨时区会议、制定上线计划时用得上。',
    category: 'time',
    icon: Globe,
    keywords: ['时区', 'timezone', 'utc', '转换', '对照'],
  },

  /* ==================== 换算工具 ==================== */
  {
    slug: 'unit-converter',
    name: '单位换算',
    summary: '长度、重量、面积、温度等 10 大类单位互换',
    description:
      '覆盖长度、重量、面积、体积、温度、时间、数据存储、速度、压强与能量共 10 大类 100 多种单位的互换，含市制单位（里、斤、亩）与英制单位，可快速交换换算方向。',
    category: 'converter',
    icon: Ruler,
    keywords: ['单位', '换算', '转换', 'unit', '长度', '重量', '温度'],
    featured: true,
  },
  {
    slug: 'number-base',
    name: '进制转换',
    summary: '2 ~ 36 进制互转，支持超大整数',
    description:
      '支持二进制、八进制、十进制、十六进制一直到三十六进制的任意互转，内部使用 BigInt 精确处理超大整数，同时展示常用进制对照表。适合底层开发与协议分析。',
    category: 'converter',
    icon: Binary,
    keywords: ['进制', '二进制', '十六进制', '转换', 'binary', 'hex'],
    featured: true,
  },
  {
    slug: 'percentage-calculator',
    name: '百分比计算器',
    summary: '求占比、增减百分比、变化率一步到位',
    description:
      '覆盖六类常见百分比问题：X 占 Y 的百分之几、Y 的 X% 是多少、Y 增加 / 减少 X% 后的值、A 到 B 的变化率。输入即算，附对照公式说明。',
    category: 'converter',
    icon: Percent,
    keywords: ['百分比', 'percent', '占比', '增长率', '折扣'],
  },
  {
    slug: 'chmod-calculator',
    name: 'Chmod 权限计算',
    summary: 'rwx 勾选 ⇄ 数字 ⇄ 符号表示的权限换算',
    description:
      '勾选或反勾选读、写、执行权限，实时得到数字形式（如 755）与符号形式（rwxr-xr-x）的权限表示；反向输入数字同样能解析出各项权限的含义。',
    category: 'converter',
    icon: FileLock2,
    keywords: ['chmod', '权限', 'linux', '755', 'rwx'],
  },
  {
    slug: 'cron-parser',
    name: 'Cron 表达式解析',
    summary: '翻译成自然语言并列出未来执行时间',
    description:
      '把 Cron 表达式翻译成人话，并计算接下来 5 次执行时间，同时展示每个字段分别命中了哪些值。支持标准 5 段写法与带月、星期的别名写法。',
    category: 'converter',
    icon: CalendarClock,
    keywords: ['cron', '定时任务', '表达式', '解析', 'schedule'],
    featured: true,
  },
  {
    slug: 'roman-numeral',
    name: '罗马数字转换',
    summary: '阿拉伯数字与罗马数字互转',
    description:
      '在普通数字与罗马数字之间互相转换（支持 1 ~ 3999），附带构成规则说明。适合排版、版权年份、章节序号等场景。',
    category: 'converter',
    icon: Crown,
    keywords: ['罗马数字', 'roman', '数字', '转换'],
  },

  /* ==================== 生成器 ==================== */
  {
    slug: 'lorem-ipsum',
    name: 'Lorem Ipsum 生成',
    summary: '按字数、句子或段落生成占位文本',
    description:
      '生成指定数量的占位文本，可按字数、句子数或段落数生成，支持保留经典的 Lorem ipsum 开头。适合做设计稿排版与列表占位数据。',
    category: 'generator',
    icon: AlignLeft,
    keywords: ['lorem', '占位', '文本', 'ipsum', '假文'],
  },
  {
    slug: 'random-string',
    name: '随机字符生成',
    summary: '批量生成随机字符串、数字与口令',
    description:
      '按自定义字符集批量生成随机字符串：可选大小写字母、数字、符号，指定长度与生成数量，支持自动去重并保证每种字符集都被用到。',
    category: 'generator',
    icon: Dices,
    keywords: ['随机', 'random', '字符串', '生成', '测试数据'],
  },
  {
    slug: 'unicode-escape',
    name: 'Unicode 转义转换',
    summary: '文本 ⇄ \\uXXXX 转义串互转',
    description:
      '把文本转成 \\uXXXX 形式的 Unicode 转义串，或把转义串还原为原文。常用于绕过关键词检查、安全地写入配置文件中的特殊字符，以及排查编码问题。',
    category: 'generator',
    icon: WrapText,
    keywords: ['unicode', '转义', 'escape', '编码', '乱码'],
  },
  {
    slug: 'binary-converter',
    name: '文本 ⇄ 二进制 / 十六进制',
    summary: '按 UTF-8 字节查看文本的 01 串与 Hex',
    description:
      '把文本按 UTF-8 编码转换成二进制字符串与十六进制串，也支持反向还原。适合查看字符的真实字节构成、调试字符集问题与分析协议报文。',
    category: 'generator',
    icon: Sigma,
    keywords: ['二进制', '十六进制', 'hex', 'binary', '编码'],
  },

  /* ==================== CSS 与前端 ==================== */
  {
    slug: 'code-formatter',
    name: '代码美化 / 压缩',
    summary: 'HTML / CSS / JS / TS / JSON 格式化与压缩',
    description:
      '用 Prettier 在浏览器里格式化 HTML、CSS、SCSS、JavaScript、TypeScript 与 JSON，也能反向压缩成一行。可选缩进宽度、单双引号与分号风格，代码不上传任何服务器。',
    category: 'css',
    icon: FileCode2,
    keywords: [
      '代码',
      '格式化',
      '美化',
      '压缩',
      'prettier',
      'minify',
      'beautify',
      'html',
      'css',
      'js',
    ],
    featured: true,
  },
  {
    slug: 'css-unit-converter',
    name: 'CSS 单位换算',
    summary: 'px / rem / em / vw / vh / pt 互转并给出 vw→px 对照',
    description:
      '在 px、rem、em、vw、vh、pt、%、in、cm 之间换算 CSS 单位。可设定根字号与视口尺寸，同时给出 clamp 所需的 vw 系数，响应式适配时不用再手算。',
    category: 'css',
    icon: Scaling,
    keywords: ['css', '单位', 'px', 'rem', 'em', 'vw', 'vh', '换算'],
    featured: true,
  },
  {
    slug: 'clamp-calculator',
    name: 'clamp() 流体排版计算',
    summary: '算出随视口平滑缩放的字号并生成 CSS',
    description:
      '给定最小与最大字号、以及对应的视口宽度区间，算出 clamp() 需要的首选值与 vw 系数，生成可直接使用的 CSS，并列出各断点下的实际字号。',
    category: 'css',
    icon: Ruler,
    keywords: ['clamp', '流体', '响应式', '排版', 'font-size', 'css'],
  },
  {
    slug: 'box-shadow-generator',
    name: 'CSS 阴影生成',
    summary: '可视化调多层阴影，实时预览并导出代码',
    description:
      '可视化生成 box-shadow：可叠加多层阴影，分别调整偏移、模糊、扩散、颜色与内外阴影，实时预览后导出 CSS 代码，也支持 text-shadow 模式。',
    category: 'css',
    icon: Layers,
    keywords: ['box-shadow', '阴影', 'css', 'text-shadow', '生成'],
    featured: true,
  },
  {
    slug: 'cubic-bezier',
    name: '贝塞尔缓动曲线',
    summary: '拖拽控制点生成 cubic-bezier 与预设缓动',
    description:
      '拖动两个控制点生成 CSS cubic-bezier 缓动函数，实时预览动画曲线与小球运动，内置 ease / ease-in-out / 回弹等常用预设，一键复制 CSS。',
    category: 'css',
    icon: Spline,
    keywords: ['cubic-bezier', '贝塞尔', '缓动', 'easing', '动画', 'css'],
    featured: true,
  },
  {
    slug: 'glassmorphism',
    name: '玻璃拟态生成',
    summary: '毛玻璃效果参数调节并生成 CSS',
    description:
      '生成毛玻璃（glassmorphism）效果：调节模糊强度、透明度、饱和度、边框与圆角，实时预览 backdrop-filter 效果并导出 CSS 代码。',
    category: 'css',
    icon: Paintbrush,
    keywords: ['玻璃拟态', 'glassmorphism', 'backdrop-filter', '毛玻璃', 'css'],
  },
  {
    slug: 'fancy-border-radius',
    name: '有机圆角生成',
    summary: '八个角的圆角独立调整，生成异形 border-radius',
    description:
      '独立调整矩形四个角的水平与垂直圆角，生成 border-radius 的八值写法，做出有机形状与叶片造型。实时预览并导出 CSS。',
    category: 'css',
    icon: CircleDashed,
    keywords: ['border-radius', '圆角', '有机', 'blob', 'css', '形状'],
  },

  /* ==================== 开发速查 ==================== */
  {
    slug: 'gitignore-generator',
    name: '.gitignore 生成',
    summary: '勾选技术栈，离线生成 gitignore 模板',
    description:
      '勾选项目用到的语言、框架与工具，合并生成一份 .gitignore。模板全部内置在本地，不请求任何外部接口，离线也能用。',
    category: 'dev',
    icon: GitBranch,
    keywords: ['gitignore', 'git', '模板', '生成', 'node', 'python'],
    featured: true,
  },
  {
    slug: 'http-status-codes',
    name: 'HTTP 状态码速查',
    summary: '全部状态码含义与排查建议，可搜索',
    description:
      '按分类查阅 HTTP 状态码：1xx 信息、2xx 成功、3xx 重定向、4xx 客户端错误、5xx 服务端错误，每个码给出含义、常见场景与排查方向，支持关键词搜索。',
    category: 'dev',
    icon: Network,
    keywords: ['http', '状态码', '404', '500', '301', 'status', '速查'],
    featured: true,
  },
  {
    slug: 'user-agent-parser',
    name: 'User-Agent 解析',
    summary: '拆解 UA 里的浏览器、系统与设备信息',
    description:
      '粘贴 User-Agent 字符串，解析出浏览器及版本、渲染引擎、操作系统、设备类型与是否为爬虫，同时给出 navigator 侧的关键字段对照。',
    category: 'dev',
    icon: MonitorSmartphone,
    keywords: ['user-agent', 'ua', '解析', '浏览器', '设备', '爬虫'],
  },
  {
    slug: 'subnet-calculator',
    name: 'IPv4 子网计算',
    summary: 'CIDR 网段的网络号、掩码、可用主机与划分',
    description:
      '输入 IP 与 CIDR 前缀，算出网络地址、广播地址、子网掩码、可用主机数与范围，支持把网段等分成若干子网。运维和网络调试常用。',
    category: 'dev',
    icon: Router,
    keywords: ['子网', 'cidr', 'ipv4', '掩码', 'subnet', '网络'],
  },
  {
    slug: 'json-path',
    name: 'JSONPath 查询',
    summary: '用表达式从 JSON 里取数据并实时看结果',
    description:
      '输入 JSONPath 表达式（$.a.b[0]、$..name、$[?(@.age>18)] 等）从 JSON 中查询数据，实时显示匹配结果、路径与数量，附带常用语法速查。',
    category: 'dev',
    icon: ListTree,
    keywords: ['jsonpath', 'json', '查询', 'path', '过滤', 'jq'],
    featured: true,
  },

  /* ==================== 视觉创意 ==================== */
  {
    slug: 'svg-wave-generator',
    name: 'SVG 波浪生成',
    summary: '生成可平铺的波浪分割线与背景',
    description:
      '生成平滑的 SVG 波浪路径：调整波数、振幅、平滑度与层数，实时预览后可复制 SVG 代码或 Data URL，直接用作分区背景、页头页脚装饰。',
    category: 'creative',
    icon: Waves,
    keywords: ['svg', '波浪', 'wave', '背景', '分割线', '装饰'],
    featured: true,
  },
  {
    slug: 'noise-texture-generator',
    name: '噪点纹理生成',
    summary: '生成颗粒噪点与网格纹理背景并导出 PNG',
    description:
      '用 Canvas 生成颗粒噪点、网格线、点阵等纹理背景：可调密度、强度、颜色与画布尺寸，导出 PNG 或 CSS Data URL，适合做质感底图。',
    category: 'creative',
    icon: Grid2x2,
    keywords: ['噪点', 'noise', '纹理', 'texture', '背景', 'grain', 'canvas'],
  },
  {
    slug: 'ascii-art',
    name: '图片转 ASCII 艺术',
    summary: '把图片转成字符画，可调密度与字符集',
    description:
      '把图片按亮度映射成 ASCII 字符画：可选字符集、输出宽度与对比度，支持彩色 HTML 输出与纯文本输出，一键复制。纯 Canvas 本地处理。',
    category: 'creative',
    icon: Wand2,
    keywords: ['ascii', '字符画', 'art', '图片', '转换', '文本'],
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
