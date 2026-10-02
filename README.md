# iWhimsy

> 浏览器里的前端超级工具库 —— **63 个工具，全部本地计算，数据不出浏览器。**

在线地址：<https://i-whimsy.vercel.app>

---

## 这是什么

一个纯前端工具集合，覆盖日常开发和前端工作里高频会用到的小工具。所有计算都在浏览器里完成：
没有后端、没有账号、没有上传，断网也能用（页面加载完成后）。

## 工具分类（11 类 / 63 个）

| 分类       | 数量 | 代表工具                                                                     |
| ---------- | ---: | ---------------------------------------------------------------------------- |
| 文本处理   |    8 | 文本对比、正则测试、Markdown 预览、大小写转换                                |
| 编码加密   |   10 | Base64、哈希、HMAC、AES 加解密、JWT 解析、UUID                               |
| 图片处理   |    6 | 压缩、裁剪、滤镜、水印、取色、二维码生成                                     |
| 颜色设计   |    4 | 色彩格式转换、对比度检查（WCAG）、渐变生成、调色板                           |
| 数据格式   |    6 | JSON / YAML / XML / SQL 格式化、JSON ↔ CSV                                   |
| 日期时间   |    4 | 时间戳转换、日期差、日期计算器、时区转换                                     |
| 换算工具   |    6 | 单位换算、进制转换、百分比、chmod、cron、罗马数字                            |
| 生成器     |    4 | Lorem Ipsum、随机字符串、Unicode 转义、二进制转换                            |
| CSS 与前端 |    7 | 代码美化、CSS 单位换算、clamp 流体排版、阴影、贝塞尔缓动、玻璃拟态、有机圆角 |
| 开发速查   |    5 | .gitignore 生成、HTTP 状态码、User-Agent 解析、IPv4 子网、JSONPath           |
| 视觉创意   |    3 | SVG 波浪、噪点纹理、图片转 ASCII                                             |

完整列表见站点首页，或 `src/config/tools.ts`。

## 技术栈

|        |                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| 框架   | Next.js 16（App Router + Turbopack）                                                                                      |
| UI     | React 19 · Tailwind CSS 4（CSS-first）· Radix UI · motion                                                                 |
| 语言   | TypeScript（strict，`noUnusedLocals`）                                                                                    |
| 状态   | zustand（persist）—— 只存收藏与最近使用                                                                                   |
| 关键库 | Prettier（浏览器版格式化）、Fuse.js（搜索）、cmdk（⌘K）、qrcode、papaparse、js-yaml、sql-formatter、marked、@noble/hashes |
| 渲染   | 全站静态生成（SSG），63 个工具页构建期预渲染                                                                              |

## 本地开发

```bash
npm install
npm run dev          # http://localhost:3000
```

其他脚本：

```bash
npm run build        # 生产构建（会打印静态页面数，当前 81）
npm run start        # 跑构建产物
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier --write
```

## 部署

推送到 `main` 即由 Vercel 自动构建部署。项目为纯静态产物，也可以 `next build` 后
部署到任何静态托管。站点地址可用环境变量覆盖：

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## 想加一个工具？

**看 [`AGENTS.md`](./AGENTS.md)** —— 里面有五步走的完整流程、代码模板、组件清单，
以及所有已知地雷（RSC 边界、js-yaml v5、lucide 图标、ESLint 版本、构建沙箱……）。

一句话版本：**改 `config/tools.ts` 登记 → 写 `tools/<分类>/<slug>.tsx` → 在 `registry.tsx` 注册 → 跑 typecheck/lint/build**。

## 设计原则

1. **数据不出浏览器。** 不调用任何后端接口，没有埋点上报。拖进来的文件在你本机读完即弃。
2. **不计较工具数量，计较每个工具是否真的能用。** 每个工具都做了边界处理与错误提示，
   而不是把结果往 `<pre>` 里一丢了事。
3. **算法层与 UI 层分离。** `src/lib/core/*` 是零依赖纯函数，能在 Node 里直接跑，
   也方便未来换成别的 UI 或做成 CLI。

## 目录结构

```
src/
├── app/            路由（全部静态生成）
├── config/         工具元数据总表 + 站点信息
├── lib/core/       纯函数算法层（无 React、无副作用）
├── lib/hooks.ts    useHydrated / useAsyncComputed
├── tools/          63 个工具组件 + 懒加载注册表
├── components/     通用外壳与 UI 控件
└── stores/         收藏 / 最近使用
```
