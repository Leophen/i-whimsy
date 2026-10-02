# iWhimsy

> 只做**高级、实用、炫技**类工具的浏览器工具箱。
> **43 个工具 / 9 个分类 · 全部本地运行，数据不出你的设备。**

在线地址：<https://i-whimsy.vercel.app>

---

## 这不是又一个「在线工具站」

网上的工具站高度同质化：Base64、时间戳、JSON 格式化、UUID、Lorem Ipsum、进制转换、
颜色 HEX↔RGB、单位换算 —— 在 it-tools、10015.io、菜鸟工具、tool.lu、TinyWow 里
几乎是同一份清单。这些工具一行 `btoa()` 就能写完，**任何站点 3 秒能给你同样的结果**。

iWhimsy 只做另一类：**把桌面软件的能力搬进浏览器**。

| 普通工具（本仓库不做）                | 高级工具（本仓库做）                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| 纯 JS 字符串 / 数学运算               | WASM · WebCodecs · WebGPU · OPFS · Web Crypto                                   |
| 语言内置能力就能实现                  | 需要真正的编解码器、模型推理、数据库引擎                                        |
| Base64、时间戳、JSON 格式化、单位换算 | 浏览器端视频转码、本地跑 AI 模型、页面里查 SQLite、正则自动机可视化、字体子集化 |

判断标准只有一个 —— **它用了什么别的工具站用不上的浏览器能力？**

## 分类与工具

按**引擎**分类，不按数据类型分类。这样「Base64 编解码」和「浏览器端视频转码」
不会挤在同一层级。

| 分类         | 数量 | 核心引擎                                                             |
| ------------ | ---: | -------------------------------------------------------------------- |
| 本地 AI 推理 |    5 | ONNX Runtime Web / transformers.js / MediaPipe + WebGPU（WASM 回退） |
| 音视频引擎   |    5 | WebCodecs 硬编硬解 · Web Audio · MediaRecorder                       |
| 文档与 OCR   |    5 | pdf-lib · pdfjs · tesseract.js · docx                                |
| 数据与查询   |    5 | sql.js + OPFS · DuckDB WASM · jq WASM                                |
| 图像工程     |    5 | WASM 编解码器（AVIF/WebP/JXL）· Worker 并发流水线                    |
| 密码与安全   |    4 | Web Crypto（非对称/KDF）· ASN.1 解析                                 |
| 代码工程     |    5 | tree-sitter · shiki · CodeMirror 6                                   |
| 设计与视觉   |    6 | oklch 色彩空间 · three.js · 字体子集化                               |
| 运行时诊断   |    3 | 原生能力探测与基准                                                   |

**当前状态：5 个已上线，38 个已完成方案设计。**

每个未上线的工具页面**不是空白占位**，而是一份完整的实现规格：技术路线、依赖库与体积、
实现步骤、已探明的坑、验收标准。打开任意一个「开发中」的工具就能看到该怎么把它做出来。

## 技术栈

|        |                                                           |
| ------ | --------------------------------------------------------- |
| 框架   | Next.js 16（App Router + Turbopack）                      |
| UI     | React 19 · Tailwind CSS 4（CSS-first）· Radix UI · motion |
| 语言   | TypeScript（strict，`noUnusedLocals`）                    |
| 状态   | zustand（persist）—— 只存收藏与最近使用                   |
| 密码学 | Web Crypto 原生优先 + `@noble/hashes` 兜底                |
| 渲染   | 全站静态生成（SSG），所有页面构建期预渲染                 |

### 一个容易被忽略的部署前提

多线程 WASM（ffmpeg-mt、多线程编解码、多线程推理）依赖 `SharedArrayBuffer`，
而它要求服务端下发 **COOP/COEP 响应头**。GitHub Pages 之类的纯静态托管设不了头，
一大半重方案会直接难产。

本项目在 `next.config.ts` 里配置了：

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

这是 Vercel 相对纯静态托管的一个真实优势。若要换托管，记得确认能自定义响应头。

## 本地开发

```bash
npm install
npm run dev          # http://localhost:3000
```

| 命令                  | 作用                                             |
| --------------------- | ------------------------------------------------ |
| `npm run dev`         | 开发服务器                                       |
| `npm run build`       | 生产构建（会打印静态页面数）                     |
| `npm run typecheck`   | `tsc --noEmit`                                   |
| `npm run lint`        | ESLint                                           |
| `npm run check:tools` | **工具一致性自检**：配置 ↔ 注册表 ↔ 文件三方比对 |
| `npm run verify`      | 上面四项 + 构建，一条命令跑完                    |
| `npm run format`      | Prettier 格式化                                  |

## 部署

推送到 `main` 由 Vercel 自动构建部署。站点地址可用环境变量覆盖：

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## 想加一个工具？

**看 [`AGENTS.md`](./AGENTS.md)** —— 里面有：

- 「只做高级工具」的判断标准（以及为什么不做基础工具）
- 实现一个待开发工具的五步走流程 + 可直接复制的组件骨架
- 组件工具箱清单（不要重复造）
- **2026 年实测的浏览器能力边界表**（WebGPU 真实使用率只有 0.004%、WebCodecs 在
  Firefox Android 完全没有、Web Speech 其实是把音频发到 Google 服务器……）
- **体积红线表**（ffmpeg.wasm 31MB、onnxruntime 单变体 23.5MB、Monaco 9.5MB……）
- 提交前自检清单

## 四条设计原则

1. **数据不出设备。** 不调用任何后端接口，没有埋点上报。拖进来的文件在你本机读完即弃，
   本地推理的模型输入也不上传。
2. **不支持的浏览器要有明确提示。** WebGPU、WebCodecs、OPFS 的支持率都不完整，
   每个工具都必须有降级路径或清晰的拒绝理由，不允许静默失败。
3. **算法层与 UI 层分离。** `src/lib/core/*` 是零依赖纯函数，能在 Node 里直接跑，
   方便单测，也方便未来做成 CLI。
4. **宁可留在 planned，也不交付假实现。** 做不动就保持开发中状态，
   不要用「能跑但结果不对」的实现充数。

## 目录结构

```
src/
├── app/            路由（全部静态生成）
├── config/         工具元数据总表 + 待实现工具的实现规格
├── lib/core/       纯函数算法层（无 React、无副作用）
├── lib/hooks.ts    useHydrated / useAsyncComputed
├── tools/          工具组件 + 懒加载注册表（按引擎分 9 类）
├── components/     通用外壳与 UI 控件
└── stores/         收藏 / 最近使用
```
