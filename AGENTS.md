# AGENTS.md — iWhimsy 开发与协作约定

> 这份文件是给「接手这个仓库的任何人（含 AI Agent）」看的操作手册。
> 目标：**照着抄就能正确新增一个工具**，不需要通读全仓库。
>
> 如果你只读一段，读第 3 节「新增一个工具：五步走」。

---

## 1. 项目是什么

**iWhimsy** —— 跑在浏览器里的前端超级工具库。当前 **63 个工具 / 11 个分类**。

几条不可动摇的产品约束：

| 约束           | 含义                                                                |
| -------------- | ------------------------------------------------------------------- |
| **纯本地计算** | 不调用任何后端接口。当前没有、也不计划有服务端。                    |
| **零上传**     | 用户的文本、图片、密钥一律不出浏览器。                              |
| **无登录**     | 不需要账号，没有数据库。                                            |
| **可静态导出** | 所有页面构建期静态生成（SSG），能直接部署到 Vercel / 任意静态托管。 |

任何违反上面任意一条的改动，方向就是错的 —— 先停下来重新设计。

---

## 2. 技术栈与目录结构

```
src/
├── app/                        # Next.js App Router（全部静态生成）
│   ├── page.tsx                # 首页
│   ├── tools/page.tsx          # 全部工具（带搜索/筛选）
│   ├── tools/[slug]/page.tsx   # 单工具页（generateStaticParams 预渲染）
│   ├── categories/[id]/page.tsx# 分类页
│   ├── about/page.tsx
│   ├── sitemap.ts / robots.ts
│   └── globals.css             # Tailwind 4 设计令牌（oklch）+ @utility
│
├── config/
│   ├── tools.ts                # ★ 工具元数据总表（唯一数据源）
│   └── site.ts                 # 站点元信息（数量从 tools.ts 派生）
│
├── lib/
│   ├── core/                   # ★ 纯函数算法层（零 React、零副作用）
│   │   ├── text.ts  encoding.ts  data.ts   datetime.ts
│   │   ├── color.ts image.ts     convert.ts crypto.ts
│   │   ├── css.ts   dev.ts       generator.ts  browser.ts
│   ├── hooks.ts                # useHydrated / useAsyncComputed
│   └── utils.ts                # cn / formatBytes
│
├── tools/
│   ├── registry.tsx            # ★ slug → 懒加载组件 的映射表
│   ├── text/  crypto/  image/  color/  data/  time/
│   ├── converter/  generator/  css/  dev/  creative/
│   └── ...
│
├── components/
│   ├── tool/                   # 工具页通用外壳（见第 4 节）
│   ├── ui/                     # 基础控件
│   └── layout/                 # 顶栏 / 底栏 / 命令面板
│
└── stores/use-tool-store.ts    # 收藏 / 最近使用（zustand + persist）
```

**分层规则（很重要）：**

```
配置层 config/  →  算法层 lib/core/  →  展示层 tools/ + components/
       ↑ 单向依赖，不允许反向
```

`lib/core/*` **禁止** import React、禁止读 `window`（`browser.ts` 除外，它专门放浏览器 API）。
好处：算法可以在 Node 里直接跑单测，也能被未来任何 UI 复用。

---

## 3. 新增一个工具：五步走

以新增「HTML 实体转义」类工具为例，假设 slug 是 `my-tool`。

### 第 1 步：写算法（`lib/core/`，可选但强烈建议）

如果逻辑超过 10 行、或需要复用，就先放到 `lib/core/` 下的对应文件里，**纯函数、可被 Node 直接跑**：

```ts
// src/lib/core/text.ts
export function myTransform(input: string, times: number): string {
  if (times < 1) return input;
  return input.repeat(times);
}
```

> 取数/计算失败就如实抛出错误或返回 `null`，**不要**用 0 或空字符串冒充结果。

### 第 2 步：在元数据表登记（`config/tools.ts`）

在 `TOOLS` 数组里追加一项。分类必须是 `CATEGORIES` 里已有的 id，
或者你先按第 6 节新增一个分类。

```ts
{
  slug: 'my-tool',              // ★ 全局唯一，kebab-case，同时是 URL
  name: '我的工具',              // 页面标题
  summary: '一句话说清它干什么',   // 卡片副标题，控制在 24 字内
  description: '两三句话展开说明，写清楚典型使用场景。', // 用于 SEO 与工具页副标题
  category: 'text',             // 必须是 CATEGORIES 里的 id
  icon: Type,                   // lucide-react 图标组件（注意：必须是已存在的图标名）
  keywords: ['关键词', 'english', 'kw'],  // 搜索用，中英混排
  featured: true,               // 可选：是否进首页精选
}
```

`icon` 需要在文件顶部的 `import { ... } from 'lucide-react'` 里补上。
**不要猜图标名** —— 先确认它在 `lucide-react` 里真的存在（v1.x 已删除全部品牌图标，
比如 `Github` 就不存在了，需要自己画，见 `components/layout/brand-icons.tsx`）。

### 第 3 步：写组件（`tools/<category>/<slug>.tsx`）

**复制这个骨架，它是当前所有工具的统一形态：**

```tsx
'use client';

import * as React from 'react';

import { CopyButton, StatGrid } from '@/components/tool/bits';
import { Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SliderRow } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { myTransform } from '@/lib/core/text';

export default function MyTool() {
  const tool = useToolMeta('my-tool'); // ★ 必须和 config 里的 slug 一致
  useTrackRecent(tool.slug); // 记入「最近使用」

  const [input, setInput] = React.useState('');
  const [times, setTimes] = React.useState(2);

  // 同步计算 → 直接用 useMemo 派生，不要用 useState + useEffect
  const output = React.useMemo(() => (input ? myTransform(input, times) : ''), [input, times]);

  return (
    <ToolView
      tool={tool}
      actions={
        <CopyButton value={output} sourceLabel="结果">
          复制
        </CopyButton>
      }
    >
      <ToolIO
        input={
          <Panel title="输入">
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} />
            <SliderRow label="倍数" value={times} onChange={setTimes} min={1} max={8} />
          </Panel>
        }
        output={
          <Panel title="结果">
            <pre className="…">{output}</pre>
            <StatGrid columns={2} items={[{ label: '长度', value: output.length }]} />
          </Panel>
        }
      />
    </ToolView>
  );
}
```

**必须遵守的三条：**

1. **文件第一行是 `'use client';`** —— 所有工具都是客户端组件。
2. **`useToolMeta(slug)` 的 slug 必须与 `config/tools.ts` 完全一致**，不一致会直接抛错（这是故意的，构建期就能发现）。
3. **组件必须 `export default`**，registry 靠默认导出取组件。

### 第 4 步：注册（`tools/registry.tsx`）

在 `TOOL_COMPONENTS` 里，对应分类的注释块下加一行：

```tsx
'my-tool': define(() => import('@/tools/text/my-tool')),
```

漏了这一步 → 工具页能构建成功但会渲染成空白。**这是最容易忘的一步。**

### 第 5 步：验证（缺一不可）

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier --write
npm run build        # ★ 必须跑，确认页面数从 63 变成 64
```

`npm run build` 结尾会打印静态页面总数。加一个工具，`/tools/[slug]` 的下挂页面
应该 +1。数量没变 = 注册漏了。

---

## 4. 组件工具箱（别重复造）

### 页面外壳

| 组件         | 用途                                                                                |
| ------------ | ----------------------------------------------------------------------------------- |
| `ToolView`   | **每个工具的最外层**。自动带标题、描述、分类徽章、收藏按钮、最近使用记录。          |
| `ToolIO`     | 输入 / 输出双栏，`split` 可选 `even` / `wide-input` / `wide-output`，窄屏自动堆叠。 |
| `Panel`      | 块级容器，带可选标题、描述、右上角操作区。                                          |
| `EmptyState` | 空状态占位（图标 + 标题 + 描述 + 可选按钮）。                                       |
| `Notice`     | 提示条，`tone` 为 `info` / `success` / `warning` / `danger`。                       |

### 小部件（`components/tool/bits.tsx`）

`CopyButton`、`CopyIconButton`、`DownloadButton`、`ResetButton`、`ClearButton`、
`Stat`、`StatGrid`、`BusyOverlay`。

### 表单控件（`components/ui/controls.tsx`）

`Select`、`SegmentedControl`、`Switch` / `SwitchRow`、`Checkbox` / `CheckboxRow`、
`Slider` / `SliderRow`、`RadioGroup`、`Tabs`。

### 文件上传

`components/tool/file-dropzone.tsx` 的 `FileDropzone` + `readImageFile()`，
已内置拖拽、类型校验、错误提示。图片类工具直接用它，别自己写 `<input type="file">`。

### 异步计算的正确写法（重点）

**反例**（会触发 `react-hooks/set-state-in-effect`，且容易出竞态）：

```tsx
React.useEffect(() => {
  setBusy(true); // ❌ 在 effect 里同步 setState
  doAsync(x).then(setResult); // ❌ 旧结果可能覆盖新结果
}, [x]);
```

**正例** —— 用 `lib/hooks.ts` 里的 `useAsyncComputed`：

```tsx
const { value, error, pending } = useAsyncComputed(
  () => doAsync(x), // 返回 Promise 的 loader
  [x], // 依赖
  { delay: 200, enabled: Boolean(x) }, // 防抖 + 开关
);
```

它已经处理好防抖、竞态丢弃、busy/error 维护。**所有异步工具都应该用它。**

同步能算完的（字符串处理、格式化）**直接用 `useMemo` 派生**，不要进 state、不要进 effect。

### hydration 敏感值

读 `localStorage`、`navigator`、`Intl` 时区的场景，用 `useHydrated()`：

```tsx
const hydrated = useHydrated();
const tz = hydrated ? guessLocalTimeZone() : 'Asia/Shanghai';
```

不要用 `useEffect(() => setMounted(true), [])` 的老写法。

---

## 5. 已知地雷（踩过，别再踩）

| 地雷                                       | 现象                                                       | 正确做法                                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **图标组件无法跨 RSC 边界**                | `Functions cannot be passed directly to Client Components` | 服务端组件**只能传 slug 字符串**给客户端组件，元数据在客户端用 `getTool(slug)` 自己查。见 `tool-card.tsx` 顶部注释。 |
| **`js-yaml` v5 没有默认导出**              | `Export default doesn't exist`                             | 用具名导入：`import { dump, load } from 'js-yaml'`。且 `load('')` 会抛错，空输入要提前拦截。                         |
| **lucide-react 1.x 删了品牌图标**          | `has no exported member 'Github'`                          | 自己画 SVG，见 `brand-icons.tsx`。                                                                                   |
| **ESLint 10 与 eslint-config-next 不兼容** | `contextOrFilename.getFilename is not a function`          | eslint 锁在 `^9`。eslint-config-next 16 依赖的 eslint-plugin-react 7.37.5 只支持到 ESLint 9.7。                      |
| **不要重新引入 crypto-js**                 | 已被 npm 标记废弃，且 SHA3 默认是 512 位容易和标注不符     | 用 `lib/core/crypto.ts`：Web Crypto 优先，`@noble/hashes` 兜底。                                                     |
| **本机沙箱会拦截 `.next` 清理**            | 构建报 `SAFE_DELETE_BULK_CONFIRM_REQUIRED`                 | 这是本机环境的删除守卫，不是代码问题。临时用 `CODEBUDDY_SAFE_DELETE_ENABLED=0 npm run build` 绕过。                  |
| **Tailwind 4 是 CSS-first**                | 没有 `tailwind.config.js`                                  | 令牌写在 `globals.css` 的 `@theme` 里；暗色用 `@custom-variant dark`。别去找 js 配置。                               |

---

## 6. 新增一个分类

1. `config/tools.ts` 的 `CATEGORIES` 里加一项（`id` / `name` / `description` / `icon` / `accentVar`）。
2. `globals.css` 里补 `--cat-<id>` 两个变量（亮色 + 暗色），并在 `@theme inline` 里注册 `--color-cat-<id>`。
3. 新建 `src/tools/<id>/` 目录放组件，并在 `registry.tsx` 里加注释块。
4. 跑一遍第 5 步的验证。

分类页与 sitemap 会自动带上它，不用手改路由。

---

## 7. 代码风格

由 `prettier.config.mjs` 强制：单引号、分号、`printWidth: 100`、`trailingComma: all`、LF。
提交前跑 `npm run format`。

命名：

- 文件名 `kebab-case.tsx`，组件名 `PascalCase`。
- 工具 slug `kebab-case`，且等于文件名（去掉 `.tsx`）。
- `lib/core` 里的函数用动词开头：`parseXxx` / `buildXxx` / `convertXxx` / `formatXxx`。

注释：**解释「为什么」，不解释「是什么」**。`// 把计数器加一` 这种注释不如不写。
遇到非直觉的取舍（比如「这里故意不防抖，因为首屏不能空」）一定要写清楚理由。

---

## 8. 设计系统速查

- 颜色令牌全部是 oklch，语义化命名：`background` / `surface` / `surface-2` / `surface-3` /
  `border` / `border-strong` / `foreground` / `muted-foreground` / `subtle-foreground` /
  `primary` / `success` / `warning` / `danger`（每种都有 `-subtle` 变体）。
- **不要把颜色写死**（不要 `text-gray-500`、不要 `#333`），一律用令牌，否则暗色模式会崩。
- 圆角：卡片 `rounded-2xl`，控件 `rounded-lg`，徽章 `rounded-full`。
- 间距：块间距 `gap-4`，卡片内边距 `p-4`/`p-5`。
- 只有「涨跌」「成功失败」这类语义色才用 `success` / `danger`；中性状态用 `muted-foreground`。

---

## 9. 当前状态与后续方向

- **63 个工具全部已实现并注册**，没有占位组件、没有 TODO 桩。
- 已被研究和评估过、但**尚未实现**的候选方向（按价值排序）：
  1. **URL 状态持久化** —— 工具参数写进 query string，便于分享与刷新恢复。
  2. **工具内批量操作** —— 如批量图片压缩、批量正则替换。
  3. **PWA / 离线可用** —— 全站纯本地计算，天生适合离线优先。
  4. **i18n** —— 目前只有简体中文。
- 性能：每个工具一个独立 chunk（`next/dynamic` + `ssr: false`），
  首屏不会因为工具数增长而变大。新增工具时**不要**改成静态 import。

---

## 10. 提交前自检清单

```
[ ] config/tools.ts 里登记了，slug 唯一
[ ] tools/<category>/<slug>.tsx 存在，第一行 'use client'，export default
[ ] registry.tsx 里注册了（最容易漏！）
[ ] 组件里 useToolMeta(slug) 的 slug 与 config 一致
[ ] 异步逻辑用 useAsyncComputed，同步逻辑用 useMemo，没有 effect 里同步 setState
[ ] 颜色只用设计令牌，暗色模式目视正常
[ ] npm run typecheck && npm run lint && npm run format 全过
[ ] npm run build 通过，页面总数 +1
```
