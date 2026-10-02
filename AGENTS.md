# AGENTS.md — iWhimsy 开发与协作约定

> 给「接手这个仓库的任何人（含 AI Agent）」的操作手册。
> 目标：**照着抄就能正确新增或实现一个工具**，不需要通读全仓库。
>
> 如果只读一段，读第 4 节「实现一个 planned 工具：五步走」。

---

## 1. 这个项目做什么

**iWhimsy** —— 只做**高级、实用、炫技**类工具的浏览器工具箱。当前 **43 个工具 / 9 个分类**，
其中 **5 个已上线，38 个已完成方案设计待实现**。

### 只做高级工具 —— 这是产品定位，不是建议

判断标准很简单，**看引擎，不看功能描述**：

|          | 普通工具（不做）                                                                 | 高级工具（做）                                                                  |
| -------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 实现方式 | 纯 JS 字符串 / 数学运算                                                          | WASM / WebCodecs / WebGPU / OPFS / Web Crypto                                   |
| 能力来源 | 语言内置能力                                                                     | 把桌面软件的能力搬进浏览器                                                      |
| 例子     | Base64、时间戳、JSON 格式化、UUID、Lorem Ipsum、进制转换、颜色 HEX↔RGB、单位换算 | 浏览器端视频转码、本地跑 AI 模型、页面里查 SQLite、正则自动机可视化、字体子集化 |

**历史背景**：这个仓库曾经有 63 个工具，绝大多数是上面左列那类「满地都是」的
（在 it-tools、10015.io、菜鸟工具、tool.lu、TinyWow 里 100% 重合）。
它们在 commit `421dee8` 里被整体剔除，需要参考实现时可以从那个提交找回。

**所以：不要再往这个仓库里加 Base64 / 时间戳 / JSON 格式化这类工具。**
新增工具的提案必须能回答一个问题 —— **它用了什么别的工具站用不上的浏览器能力？**

### 四条不可动摇的约束

| 约束           | 含义                                                          |
| -------------- | ------------------------------------------------------------- |
| **纯本地计算** | 不调用任何后端接口。没有服务端，也不计划有。                  |
| **零上传**     | 用户的文件、模型输入、密钥一律不出浏览器。                    |
| **无登录**     | 不需要账号，没有数据库。                                      |
| **可静态部署** | 所有页面构建期静态生成（SSG），部署到 Vercel 或任意静态托管。 |

任何违反上面任意一条的改动，方向就是错的 —— 先停下来重新设计。

⚠️ 特别注意 **Web Speech API 的语音识别是把音频发到 Google 服务器的**，
它不是本地能力，不要用它来做「隐私优先」的功能。语音合成（TTS）才是本地的。

---

## 2. 工具总览

✅ 已上线 = 能直接用；🚧 待实现 = 页面已存在且渲染完整实现规格，等你把它做出来。
L / M / XL 是实现投入量级（M ≈ 1–2 天，L ≈ 3–5 天，XL ≈ 1–2 周）。

### 本地 AI 推理 · On-device AI（5）

| 工具           | slug                 | 状态          | 一句话                         |
| -------------- | -------------------- | ------------- | ------------------------------ |
| 智能抠图去背景 | `bg-remover`         | 🚧 待实现 · L | 本地模型一键去背景，图片不上传 |
| 语音转文字     | `whisper-transcribe` | 🚧 待实现 · L | Whisper 本地转写，带时间轴     |
| 语义相似度检索 | `semantic-search`    | 🚧 待实现 · M | 本地文本向量化，按意思找内容   |
| 图像识别分类   | `image-classify`     | 🚧 待实现 · M | 本地图像分类与标签识别         |
| 人脸与姿态识别 | `face-landmark`      | 🚧 待实现 · M | 实时人脸关键点、手势与姿态检测 |

### 音视频引擎 · Media（5）

| 工具             | slug              | 状态           | 一句话                               |
| ---------------- | ----------------- | -------------- | ------------------------------------ |
| 视频转码         | `video-transcode` | 🚧 待实现 · XL | 浏览器内硬编硬解转码，无需上传       |
| 视频转 GIF       | `video-to-gif`    | 🚧 待实现 · L  | 抽帧生成高质量 GIF，可控帧率与调色板 |
| 音频工作台       | `audio-lab`       | 🚧 待实现 · L  | 波形可视化、裁切、变速与增益         |
| 屏幕与摄像头录制 | `screen-recorder` | 🚧 待实现 · M  | 本地录制屏幕、窗口或摄像头并导出视频 |
| 字幕工作台       | `subtitle-studio` | 🚧 待实现 · M  | 字幕格式互转、时间轴偏移与校对       |

### 文档与 OCR · Document（5）

| 工具              | slug              | 状态          | 一句话                                       |
| ----------------- | ----------------- | ------------- | -------------------------------------------- |
| PDF 编辑套件      | `pdf-suite`       | 🚧 待实现 · L | 合并拆分、旋转、水印、加密与页面重排         |
| 文字识别 OCR      | `ocr-studio`      | 🚧 待实现 · L | 图片与扫描件转可编辑文本                     |
| Markdown 排版导出 | `markdown-studio` | 🚧 待实现 · L | 代码高亮、公式、图表一次渲染并导出图片或 PDF |
| Word 文档生成     | `docx-builder`    | 🚧 待实现 · M | 用结构化数据生成带样式的 docx                |
| 表格数据工作台    | `sheet-studio`    | 🚧 待实现 · L | CSV / Excel 读取、清洗与公式预览             |

### 数据与查询 · Data（5）

| 工具                | slug               | 状态          | 一句话                                     |
| ------------------- | ------------------ | ------------- | ------------------------------------------ |
| SQLite 数据库浏览器 | `sqlite-browser`   | 🚧 待实现 · L | 打开数据库文件，建表查询并持久化到本地     |
| 大数据集即席分析    | `duckdb-analytics` | 🚧 待实现 · L | 直接对 CSV / Parquet 跑 SQL，百万行不掉帧  |
| jq 表达式调试       | `jq-playground`    | 🚧 待实现 · M | 真正的 jq 语法，实时看结果                 |
| JSONPath 查询       | `json-path`        | ✅ 已上线     | 用表达式从 JSON 里取数据并实时看结果       |
| 类型定义互转        | `type-forge`       | 🚧 待实现 · M | JSON 结构一键转 TypeScript、Zod、Go 结构体 |

### 图像工程 · Imaging（5）

| 工具            | slug             | 状态           | 一句话                                    |
| --------------- | ---------------- | -------------- | ----------------------------------------- |
| 图像格式转码    | `image-codec`    | 🚧 待实现 · XL | AVIF / WebP / JPEG XL / OxiPNG 本地编解码 |
| 批量图像流水线  | `image-pipeline` | 🚧 待实现 · L  | 拖入一批图，串起压缩、裁剪、水印、重命名  |
| EXIF 查看与擦除 | `exif-studio`    | 🚧 待实现 · M  | 查看拍摄参数，一键抹掉隐私元数据          |
| SVG 优化清理    | `svg-optimizer`  | 🚧 待实现 · M  | 压缩体积、合并路径、去编辑器冗余          |
| 图片主色提取    | `image-palette`  | ✅ 已上线      | 中位切分算法提取主色与配色比例            |

### 密码与安全 · Crypto & Security（4）

| 工具             | slug             | 状态          | 一句话                                      |
| ---------------- | ---------------- | ------------- | ------------------------------------------- |
| 非对称加密与密钥 | `crypto-lab`     | 🚧 待实现 · L | RSA / ECDSA / Ed25519 加解密与签名验签      |
| 哈希与密钥派生   | `hash-suite`     | 🚧 待实现 · M | 摘要、HMAC、PBKDF2 / Argon2 / scrypt / HKDF |
| 数字证书解析     | `x509-inspector` | 🚧 待实现 · L | 解析 X.509 证书与 ASN.1 结构                |
| 编码链工作台     | `ctf-toolbox`    | 🚧 待实现 · L | 像 CyberChef 一样把编码与加密串成流水线     |

### 代码工程 · Code（5）

| 工具             | slug               | 状态           | 一句话                           |
| ---------------- | ------------------ | -------------- | -------------------------------- |
| AST 解析与重构   | `ast-playground`   | 🚧 待实现 · XL | 语法树级查看与批量代码改写       |
| 正则可视化与调试 | `regex-visualizer` | 🚧 待实现 · L  | 把正则画成自动机图，逐步跟踪匹配 |
| 代码高亮出图     | `code-image`       | 🚧 待实现 · M  | 生成带主题的精美代码截图         |
| 文本差异比对     | `text-diff`        | ✅ 已上线      | 按行或按字比对，双栏高亮差异     |
| 构建产物分析     | `bundle-inspector` | 🚧 待实现 · L  | 分析打包体积，找出体积元凶       |

### 设计与视觉 · Design（6）

| 工具           | slug             | 状态           | 一句话                                 |
| -------------- | ---------------- | -------------- | -------------------------------------- |
| CSS 效果实验室 | `css-lab`        | 🚧 待实现 · L  | 阴影、玻璃、圆角、渐变参数联动调参     |
| 贝塞尔缓动曲线 | `cubic-bezier`   | ✅ 已上线      | 拖拽控制点生成 cubic-bezier 与预设缓动 |
| 配色系统生成   | `color-system`   | 🚧 待实现 · L  | 从一个主色生成完整色阶与设计令牌       |
| 对比度检查     | `color-contrast` | ✅ 已上线      | 按 WCAG 标准校验文字与背景可读性       |
| 3D 模型预览    | `three-viewer`   | 🚧 待实现 · L  | 加载 glTF / GLB / OBJ 并调试材质光照   |
| 字体子集化     | `font-subset`    | 🚧 待实现 · XL | 按用到的字符裁剪字体，大幅减小体积     |

### 运行时诊断 · Runtime（3）

| 工具         | slug             | 状态          | 一句话                                  |
| ------------ | ---------------- | ------------- | --------------------------------------- |
| 设备能力探测 | `device-lab`     | 🚧 待实现 · M | 一次看清这台设备支持哪些现代 API        |
| 性能基准测试 | `perf-benchmark` | 🚧 待实现 · M | 跑分对比 CPU、内存、Canvas 与加解密吞吐 |
| 网络质量诊断 | `network-lab`    | 🚧 待实现 · M | 测量延迟、抖动、吞吐与连通性            |

---

## 3. 技术栈与目录结构

```
src/
├── app/                        # Next.js App Router（全部静态生成）
│   ├── page.tsx                # 首页
│   ├── tools/page.tsx          # 全部工具（搜索 / 分类 / 状态筛选）
│   ├── tools/[slug]/page.tsx   # 单工具页（generateStaticParams 预渲染）
│   ├── categories/[id]/page.tsx# 分类页
│   ├── sitemap.ts / robots.ts
│   └── globals.css             # Tailwind 4 设计令牌（oklch）+ @utility
│
├── config/
│   ├── tools.ts                # ★ 工具元数据总表 + 分类定义（唯一数据源）
│   └── tool-specs.ts           # ★ 待实现工具的实现规格（planned 工具必须有）
│
├── lib/
│   ├── core/                   # ★ 纯函数算法层（零 React、零副作用）
│   ├── hooks.ts                # useHydrated / useAsyncComputed
│   ├── tool-spec.ts            # ToolSpec 类型定义
│   └── utils.ts
│
├── tools/
│   ├── registry.tsx            # ★ slug → 懒加载组件 的映射表
│   └── ai/ media/ document/ data/ imaging/ crypto/ code/ design/ runtime/
│
├── components/
│   ├── tool/                   # 工具页通用外壳 + ToolPlaceholder
│   ├── ui/                     # 基础控件
│   └── layout/                 # 顶栏 / 底栏 / 命令面板
│
└── stores/use-tool-store.ts    # 收藏 / 最近使用（zustand + persist）

scripts/check-tools.mjs         # ★ 一致性自检：配置 ↔ 注册表 ↔ 文件
```

**分层规则（重要）：**

```
配置层 config/  →  算法层 lib/core/  →  展示层 tools/ + components/
       ↑ 单向依赖，不允许反向
```

`lib/core/*` **禁止** import React、禁止读 `window`（`browser.ts` 除外）。
好处：算法可以在 Node 里直接跑单测，也方便未来做成 CLI 或复用。

---

## 4. 实现一个 planned 工具：五步走

### 第 0 步 · 先看规格

打开 `src/config/tool-specs.ts` 里该 slug 的条目，或直接在浏览器打开该工具页
（页面渲染的就是规格）。里面已经写好了：技术路线、依赖与体积、实现步骤、已知的坑、验收标准。

**先读坑那一段。** 那些是调研阶段查到的实测数据，能省掉你几小时的试错。

### 第 1 步 · 算法放 `lib/core/`（超过 10 行就抽出来）

纯函数、零 React、能在 Node 里直接跑：

```ts
// src/lib/core/video.ts
export function computeTargetBitrate(width: number, height: number, fps: number): number {
  // 按像素率估算，细节见规格
  return Math.round(width * height * fps * 0.07);
}
```

取数/计算失败就如实抛错或返回 `null`，**不要**用 0 或空字符串冒充结果。

### 第 2 步 · 写组件（`tools/<分类>/<slug>.tsx`）

planned 工具的占位文件已经存在，直接把它改写成真实实现：

```tsx
'use client';

import * as React from 'react';

import { CopyButton, DownloadButton, StatGrid } from '@/components/tool/bits';
import { Panel, ToolIO, Notice, EmptyState } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { FileDropzone } from '@/components/tool/file-dropzone';
import { SliderRow, SwitchRow, SegmentedControl } from '@/components/ui/controls';
import { useAsyncComputed } from '@/lib/hooks';
import { computeTargetBitrate } from '@/lib/core/video';

export default function VideoTranscode() {
  const tool = useToolMeta('video-transcode'); // ★ 必须和 config 里的 slug 一致
  useTrackRecent(tool.slug);

  const [file, setFile] = React.useState<File | null>(null);
  const [targetWidth, setTargetWidth] = React.useState(1280);

  // 异步、有防抖、要丢弃过期结果的重活 —— 一律用 useAsyncComputed
  const job = useAsyncComputed(
    async () => {
      const blob = await transcode(file!, { width: targetWidth });
      return { blob, size: blob.size };
    },
    [file, targetWidth],
    { delay: 300, enabled: Boolean(file) },
  );

  return (
    <ToolView
      tool={tool}
      actions={<DownloadButton data={job.value?.blob ?? null} filename="out.mp4" />}
    >
      <ToolIO
        input={
          <Panel title="输入">
            <FileDropzone
              accept="video/*"
              onFile={setFile}
              current={file ? { name: file.name, size: file.size } : null}
            />
            <SliderRow
              label="目标宽度"
              value={targetWidth}
              onChange={setTargetWidth}
              min={320}
              max={3840}
              step={16}
            />
          </Panel>
        }
        output={
          <Panel title="结果">
            {job.error ? (
              <Notice tone="danger">{job.error}</Notice>
            ) : (
              <StatGrid columns={3} items={[/* ... */]} />
            )}
          </Panel>
        }
      />
    </ToolView>
  );
}
```

**三条硬要求：**

1. **文件第一行是 `'use client';`**
2. **`useToolMeta(slug)` 的 slug 必须与 `config/tools.ts` 完全一致**，不一致会直接抛错（故意的，构建期暴露）
3. **组件必须 `export default`**，registry 靠默认导出取组件

### 第 3 步 · 改状态（`config/tools.ts`）

把该工具的 `status: 'planned'` 改成 `status: 'ready'`。

顺手把 `tool-specs.ts` 里对应的规格删掉 —— 实现完成后的规格是死文档，
留着会变成「code 说 A、文档说 B」的漂移源。`check:tools` 会提醒你清理（warning）。

### 第 4 步 · 不要动 registry

工具已经在 `registry.tsx` 里注册过了（planned 和 ready 都要注册，因为占位页也是页面）。
**唯一需要改 registry 的场景是新增一个全新的工具。**

### 第 5 步 · 验证（缺一不可）

```bash
npm run check:tools   # 配置 ↔ 注册表 ↔ 文件 三方一致性
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run build         # 页面数必须仍是 43 + 9 + 首页/关于等
```

或者一条命令跑完全部：`npm run verify`

---

## 5. 新增一个全新的工具

除了上面的流程，额外要做：

1. `config/tools.ts` 的 `TOOLS` 里加一项（`status` 先写 `'planned'`）
2. `config/tool-specs.ts` 里加对应的规格 —— **没有规格的 planned 工具会导致 `check:tools` 失败，这是故意的**
3. 建 `src/tools/<分类>/<slug>.tsx`（占位版即可，用 `ToolPlaceholder`）
4. `registry.tsx` 对应分类注释块下加一行

元数据模板：

```ts
{
  slug: 'my-tool',              // ★ 全局唯一，kebab-case，同时是 URL
  name: '我的工具',
  summary: '一句话说清它干什么',   // 卡片副标题，控制在 24 字内
  description: '两三句话展开说明，写清楚典型使用场景。', // 用于 SEO 与工具页副标题
  category: 'media',            // 必须是 CATEGORIES 里的 id
  icon: Clapperboard,           // lucide-react 图标组件
  keywords: ['关键词', 'english', 'kw'],
  status: 'planned',
  featured: true,               // 可选
}
```

`icon` 需要在文件顶部的 `import { ... } from 'lucide-react'` 里补上。
**不要猜图标名** —— 先确认它真的存在（v1.x 删除了全部品牌图标，比如 `Github` 就没了）。

### 新增一个分类

1. `config/tools.ts` 的 `CATEGORIES` 加一项（`id` / `name` / `enName` / `description` / `icon` / `accentVar`）
2. `globals.css` 补 `--cat-<id>` 两个变量（亮色 + 暗色），并在 `@theme inline` 里注册 `--color-cat-<id>`
3. 建 `src/tools/<id>/` 目录，并在 `registry.tsx` 里加注释块

分类页与 sitemap 会自动带上，不用手改路由。

---

## 6. 组件工具箱（别重复造）

### 页面外壳

| 组件              | 用途                                                                                |
| ----------------- | ----------------------------------------------------------------------------------- |
| `ToolView`        | **每个工具的最外层**。自动带标题、描述、分类徽章、收藏按钮、最近使用记录。          |
| `ToolPlaceholder` | planned 工具的占位页，自动渲染 `tool-specs.ts` 里的规格。                           |
| `ToolIO`          | 输入 / 输出双栏，`split` 可选 `even` / `wide-input` / `wide-output`，窄屏自动堆叠。 |
| `Panel`           | 块级容器，带可选标题、描述、右上角操作区。                                          |
| `EmptyState`      | 空状态占位。                                                                        |
| `Notice`          | 提示条，`tone` 为 `info` / `success` / `warning` / `danger`。                       |

### 小部件与控件

- `components/tool/bits.tsx`：`CopyButton`、`CopyIconButton`、`DownloadButton`、`ResetButton`、`ClearButton`、`Stat`、`StatGrid`、`BusyOverlay`
- `components/ui/controls.tsx`：`Select`、`SegmentedControl`、`Switch`/`SwitchRow`、`Checkbox`/`CheckboxRow`、`Slider`/`SliderRow`、`RadioGroup`、`Tabs`
- `components/tool/file-dropzone.tsx`：`FileDropzone` + `readImageFile()`，已内置拖拽、类型校验、错误提示

### 异步计算的正确写法（重点）

**反例**（会触发 `react-hooks/set-state-in-effect`，且容易出竞态）：

```tsx
React.useEffect(() => {
  setBusy(true); // ❌ effect 里同步 setState
  doAsync(x).then(setResult); // ❌ 旧结果可能覆盖新结果
}, [x]);
```

**正例** —— 用 `lib/hooks.ts` 的 `useAsyncComputed`：

```tsx
const { value, error, pending } = useAsyncComputed(
  () => doAsync(x), // 返回 Promise 的 loader
  [x], // 依赖
  { delay: 200, enabled: Boolean(x) }, // 防抖 + 开关
);
```

它已经处理好**防抖、竞态丢弃、busy/error 维护**。所有异步工具都应该用它。

同步能算完的（字符串处理、格式化）**直接用 `useMemo` 派生**，不要进 state、不要进 effect。

### hydration 敏感值

读 `localStorage`、`navigator`、`Intl` 时区、以及**任何能力探测结果**时，用 `useHydrated()`：

```tsx
const hydrated = useHydrated();
const gpuOk = hydrated ? await detectWebGPU() : false;
```

不要用 `useEffect(() => setMounted(true), [])` 的老写法。

---

## 7. 已知地雷（踩过，别再踩）

### 部署与跨源隔离

| 地雷                       | 现象                               | 正确做法                                                                                                                                                                                                                                           |
| -------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **多线程 WASM 需要响应头** | `SharedArrayBuffer is not defined` | 必须下发 `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`。**本项目已在 `next.config.ts` 配置好了**，Vercel 上可用。但如果将来改成 GitHub Pages 等无法自定义响应头的托管，所有多线程 WASM 会退化成单线程。 |
| 运行时先探测再使用         | 用户环境不满足时白屏               | `crossOriginIsolated` 为 false 时降级单线程并提示，不要静默失败                                                                                                                                                                                    |

### 浏览器能力边界（2026 实测）

| API                           | 现状                                                                                                                                    | 影响                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **WebGPU**                    | 支持率 83.99%，但 Chrome 里**只有 0.004% 的页面真正向 GPU 提交过任务**；Firefox 无 Linux/Android/Intel Mac                              | 只能当加速项，**必须有 WASM 回退**。不能做「WebGPU 独占」的工具。                          |
| **WebCodecs**                 | Chrome 94+ / Safari 16.4+（26.0 才补音频）/ Firefox 130+ 桌面，**Firefox Android 完全没有 VideoDecoder**                                | 必须 `isConfigSupported` 探测 + 明确提示不支持。可用编码器还取决于操作系统是否装了 codec。 |
| **OPFS**                      | Chrome 86+ / Safari 15.2+ / Firefox 111+，但 `createSyncAccessHandle` **仅 Dedicated Worker**，`createWritable` 在 Safari 26 之前不可用 | 持久化要做「不可用时降级为导出文件」的路径                                                 |
| **File System Access picker** | 只有 Chromium 支持，Mozilla 明确反对                                                                                                    | 别做成核心路径，用 `input[type=file]` + 下载兜底                                           |
| **Web Speech（识别）**        | Chrome/Edge 把音频**发到 Google 服务器**识别                                                                                            | **不能用它做「本地/隐私」卖点**                                                            |
| **Compression Streams**       | 95.8%                                                                                                                                   | 优先用它而不是 pako，省包体积                                                              |

### 体积红线

浏览器工具站最大的失败模式是**把几十 MB 的 WASM 塞进首屏**，用户打开就白屏。
选型时按这张表判断：

| 库                          | 体积                                                 | 结论                                                         |
| --------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| ffmpeg.wasm（@ffmpeg/core） | **31MB**（brotli 8.4MB），比原生慢 10–100×，2GB 上限 | 只在「全格式兜底 + 小文件」场景用。能用 WebCodecs 就别用它。 |
| onnxruntime-web             | 单 wasm 变体 ~23.5MB（npm 包整体 137MB）             | 只引一套变体 + CDN 懒加载                                    |
| @swc/wasm-web               | 20.25MB（br 4.37MB）                                 | 体积很大，只在需要类型信息时用                               |
| esbuild-wasm                | 14MB（br 3.5MB）                                     | 同上                                                         |
| monaco-editor               | core 2.78MB + TS worker 6.75MB                       | **不要用**，编辑器用 CodeMirror 6（gzip 0.12MB）             |
| shiki                       | web 包 4.9MB / gzip 0.79MB                           | 按需 import 语言与主题，绝不全引                             |
| tesseract.js                | core 4.5MB + 语言包 2–15MB/语言                      | 语言包必须缓存到 IndexedDB，给下载进度                       |
| duckdb-wasm                 | ~3.2MB（带扩展）                                     | 懒加载 + 进度提示                                            |
| sql.js                      | wasm ~1MB + glue 340KB                               | 可接受                                                       |
| @noble/hashes               | 小                                                   | 项目已依赖                                                   |
| CodeMirror 6                | gzip 0.12MB                                          | 首选编辑器                                                   |

**规则：任何超过 500KB 的依赖，都必须 `next/dynamic` 懒加载，并在加载时显示进度。**

### 代码层地雷

| 地雷                                       | 现象                                                        | 正确做法                                                                                             |
| ------------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **图标组件无法跨 RSC 边界**                | `Functions cannot be passed directly to Client Components`  | 服务端组件**只能传 slug 字符串**，元数据在客户端用 `getTool(slug)` 查。见 `tool-card.tsx` 顶部注释。 |
| **`js-yaml` v5 没有默认导出**              | `Export default doesn't exist`                              | 用具名导入 `import { dump, load } from 'js-yaml'`；`load('')` 会抛错，空输入要提前拦。               |
| **lucide-react 1.x 删了品牌图标**          | `has no exported member 'Github'`                           | 自己画 SVG，见 `brand-icons.tsx`。                                                                   |
| **`npm install xlsx` 有安全风险**          | SheetJS CE 在 npm 上冻结于 0.18.5，CVE 修复只在官方私有 CDN | 用官方 CDN 版本或 MIT 替代（`@office-kit/xlsx` / `write-excel-file`）。                              |
| **不要重新引入 crypto-js**                 | 已被 npm 标记废弃                                           | 用 `lib/core/crypto.ts`：Web Crypto 优先 + `@noble/hashes` 兜底。                                    |
| **ESLint 10 与 eslint-config-next 不兼容** | `contextOrFilename.getFilename is not a function`           | eslint 锁在 `^9`。                                                                                   |
| **Tailwind 4 是 CSS-first**                | 没有 `tailwind.config.js`                                   | 令牌写在 `globals.css` 的 `@theme` 里；暗色用 `@custom-variant dark`。                               |

### 本机环境

| 地雷                  | 现象                                       | 处理                                                                                                                                                                                                                                  |
| --------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 沙箱拦截 `.next` 清理 | 构建报 `SAFE_DELETE_BULK_CONFIRM_REQUIRED` | 环境问题不是代码问题。先看日志里是否已有 `✓ Generating static pages`，有就说明代码是好的；再用 `CODEBUDDY_SAFE_DELETE_ENABLED=0 npm run build` 跑完整构建。不要用 `CODEBUDDY_SAFE_DELETE_BULK_THRESHOLD`，会撞 `state lock timeout`。 |

---

## 8. 代码风格

由 `prettier.config.mjs` 强制：单引号、分号、`printWidth: 100`、`trailingComma: all`、LF。
提交前跑 `npm run format`。

命名：

- 文件名与 slug 都是 `kebab-case`，且**两者必须一致**（`check:tools` 会校验路径）
- 组件名 `PascalCase`，`export default`
- `lib/core` 里的函数用动词开头：`parseXxx` / `buildXxx` / `convertXxx` / `formatXxx` / `computeXxx`

注释：**解释「为什么」，不解释「是什么」**。`// 把计数器加一` 这种不如不写。
遇到非直觉的取舍（比如「这里故意不防抖，因为首屏不能空」）一定要写清理由。

### 设计系统速查

- 颜色令牌全部是 oklch，语义化命名：`background` / `surface` / `surface-2` / `surface-3` /
  `border` / `border-strong` / `foreground` / `muted-foreground` / `subtle-foreground` /
  `primary` / `success` / `warning` / `danger`（每种都有 `-subtle` 变体）
- **不要把颜色写死**（不要 `text-gray-500`、不要 `#333`），一律用令牌，否则暗色模式会崩
- 分类强调色用 `--cat-*`，通过 `category.accentVar` 取
- 圆角：卡片 `rounded-2xl`，控件 `rounded-lg`，徽章 `rounded-full`
- 间距：块间距 `gap-4`，卡片内边距 `p-4`/`p-5`

---

## 9. 建议的实现顺序

按「先出效果、再啃硬骨头」排：

| 阶段               | 工具                                                                                                                                                                                                       | 理由                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 第一批（快速见效） | `device-lab`、`perf-benchmark`、`network-lab`、`subtitle-studio`、`exif-studio`、`type-forge`                                                                                                              | 纯 JS + 原生 API，没有重依赖，能快速把「已上线」的数字做起来 |
| 第二批（中等）     | `pdf-suite`、`docx-builder`、`sqlite-browser`、`code-image`、`svg-optimizer`、`hash-suite`、`color-system`、`jq-playground`                                                                                | 依赖体积可控（几百 KB 到 1MB），技术成熟                     |
| 第三批（重活）     | `video-transcode`、`video-to-gif`、`audio-lab`、`screen-recorder`、`duckdb-analytics`、`ocr-studio`、`markdown-studio`、`css-lab`、`bundle-inspector`、`regex-visualizer`、`x509-inspector`、`ctf-toolbox` | 需要 WebCodecs / WASM / 复杂 UI                              |
| 第四批（硬骨头）   | `image-codec`、`image-pipeline`、`bg-remover`、`whisper-transcribe`、`semantic-search`、`image-classify`、`face-landmark`、`three-viewer`、`crypto-lab`、`ast-playground`、`font-subset`                   | 重 WASM / 模型体积 / 复杂算法                                |

做不动的时候，**宁可把 status 留在 planned 也不要交付一个假的实现**。

---

## 10. 提交前自检清单

```
[ ] npm run check:tools 通过（配置 ↔ 注册表 ↔ 文件三方一致）
[ ] 新工具的 slug 与文件名、目录名完全一致
[ ] 组件第一行 'use client'，且有 export default
[ ] 异步逻辑用 useAsyncComputed，同步逻辑用 useMemo，没有 effect 里同步 setState
[ ] 重依赖（>500KB）走 next/dynamic 懒加载，并有加载进度
[ ] 不支持的浏览器有明确提示，不是静默失败
[ ] 颜色只用设计令牌，暗色模式目视正常
[ ] 实现了的工具有：错误处理、空状态、边界值处理
[ ] status 已改成 ready，且 tool-specs.ts 里的旧规格已删除
[ ] npm run verify 全绿
```
