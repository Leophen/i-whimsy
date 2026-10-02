'use client';

import * as React from 'react';
import { marked } from 'marked';
import { FileCode2 } from 'lucide-react';

import { ClearButton, CopyButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { analyzeText } from '@/lib/core/text';
import { cn } from '@/lib/utils';

const SAMPLE = `# iWhimsy 前端工具库

一个跑在浏览器里的**超级工具箱**，[打开即用](https://i-whimsy.vercel.app)。

## 特性

- 全部在 \`浏览器本地\` 计算，数据不出本机
- 无需注册，没有使用次数限制
- 支持 \`⌘K\` 命令面板直达

## 对照表

| 分类 | 工具数 |
| --- | --- |
| 文本处理 | 8 |
| 编码加密 | 10 |

> 所有计算都在你的浏览器里完成。

\`\`\`ts
const greet = (name: string) => \`Hello, \${name}!\`;
\`\`\`

- [x] 完成重构
- [ ] 继续加工具
`;

/**
 * 极简 Markdown 输出净化。
 *
 * marked 自 v5 起移除了内置 sanitize，这里做一层最小防护：
 * 移除 script / iframe / object 等危险标签与所有 on* 事件属性、
 * javascript: 协议链接。注意这是「防自己粘贴来的恶意内容」的最小实现，
 * 不是完整的 HTML Sanitizer —— 若将来要渲染他人内容，应换成 DOMPurify。
 */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<\s*(script|iframe|object|embed|link|style|form)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|link|style|form)\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}

type ViewMode = 'split' | 'preview' | 'source';

export default function MarkdownPreview() {
  const tool = useToolMeta('markdown-preview');
  useTrackRecent(tool.slug);

  const [input, setInput] = React.useState(SAMPLE);
  const [view, setView] = React.useState<ViewMode>('split');

  const html = React.useMemo(() => {
    if (!input.trim()) return '';
    try {
      return sanitizeHtml(marked.parse(input, { gfm: true, breaks: false }) as string);
    } catch (err) {
      return `<p class="text-danger">渲染失败：${err instanceof Error ? err.message : '未知错误'}</p>`;
    }
  }, [input]);

  const stats = React.useMemo(() => analyzeText(input), [input]);

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <SegmentedControl
            size="sm"
            value={view}
            onValueChange={setView}
            options={[
              { value: 'split', label: '分栏' },
              { value: 'preview', label: '仅预览' },
              { value: 'source', label: '仅源码' },
            ]}
          />
          <ClearButton onClear={() => setInput('')} />
          <CopyButton value={html} sourceLabel="HTML" variant="secondary">
            复制 HTML
          </CopyButton>
        </>
      }
    >
      {view !== 'preview' && (
        <Panel title="Markdown 源码" description="支持 GFM 表格、任务列表、代码块与引用">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="在此书写 Markdown…"
            className="min-h-72 font-mono text-[13px]"
            spellCheck={false}
          />
        </Panel>
      )}

      {view !== 'source' && (
        <Panel
          title="渲染预览"
          description="所见即所得"
          actions={
            <CopyButton value={html} sourceLabel="HTML" size="xs">
              复制 HTML
            </CopyButton>
          }
        >
          {!input.trim() ? (
            <EmptyState
              icon={<FileCode2 />}
              title="还没有 Markdown"
              description="在上方输入内容即可实时预览"
            />
          ) : (
            <>
              <StatGrid
                columns={3}
                items={[
                  { label: '字符数', value: stats.chars },
                  { label: '行数', value: stats.lines },
                  {
                    label: '预估阅读',
                    value: `${stats.readingMinutes < 1 ? '<1' : Math.round(stats.readingMinutes)} 分钟`,
                  },
                ]}
              />
              <article
                className={cn(
                  'markdown-body mt-3 max-h-[32rem] overflow-auto rounded-xl border border-border bg-background p-5',
                )}
                // 内容已过 sanitizeHtml，且仅来自用户自己的输入
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </>
          )}
        </Panel>
      )}

      <Notice tone="info">
        渲染结果已做基础净化（移除 script / iframe / on* 事件与 javascript: 链接）。
        如果将来要渲染他人提供的内容，请替换为完整的 HTML Sanitizer。
      </Notice>
    </ToolView>
  );
}
