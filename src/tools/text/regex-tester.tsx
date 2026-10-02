'use client';

import * as React from 'react';
import { Regex } from 'lucide-react';

import { ClearButton, CopyButton } from '@/components/tool/bits';
import { EmptyState, Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { CheckboxRow } from '@/components/ui/controls';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MatchGroup {
  full: string;
  index: number;
  groups: string[];
  namedGroups?: Record<string, string>;
}

const SAMPLE = `联系我：dev@example.com 或 hi@iwhimsy.app
备用邮箱不是邮箱：not-an-email
电话：138-0013-8000`;

const PRESETS = [
  { label: '邮箱', pattern: String.raw`[\w.+-]+@[\w-]+\.[\w.]+`, flags: 'g' },
  { label: '中国大陆手机号', pattern: String.raw`1[3-9]\d{9}`, flags: 'g' },
  { label: 'URL', pattern: String.raw`https?://[^\s]+`, flags: 'g' },
  { label: 'IPv4', pattern: String.raw`\b(?:\d{1,3}\.){3}\d{1,3}\b`, flags: 'g' },
  { label: '日期 YYYY-MM-DD', pattern: String.raw`\d{4}-\d{2}-\d{2}`, flags: 'g' },
  { label: '十六进制颜色', pattern: String.raw`#[0-9a-fA-F]{6}\b`, flags: 'g' },
  { label: 'HTML 标签', pattern: String.raw`<\/?([a-zA-Z][\w-]*)\b[^>]*>`, flags: 'g' },
  { label: '重复空白', pattern: String.raw`\s{2,}`, flags: 'g' },
  { label: '中文字符', pattern: String.raw`[\u4e00-\u9fff]+`, flags: 'g' },
  { label: '数字（含小数）', pattern: String.raw`-?\d+(\.\d+)?`, flags: 'g' },
];

const FLAGS = ['g', 'i', 'm', 's', 'u', 'y'] as const;

export default function RegexTester() {
  const tool = useToolMeta('regex-tester');
  useTrackRecent(tool.slug);

  const [pattern, setPattern] = React.useState(String.raw`[\w.+-]+@[\w-]+\.[\w.]+`);
  const [flags, setFlags] = React.useState('g');
  const [text, setText] = React.useState(SAMPLE);
  const [replacement, setReplacement] = React.useState('[邮箱]');

  const toggleFlag = (f: string) =>
    setFlags((prev) => (prev.includes(f) ? prev.replace(f, '') : prev + f));

  const { matches, error, replaced, highlighted } = React.useMemo(() => {
    if (!pattern) {
      return { matches: [] as MatchGroup[], error: null, replaced: text, highlighted: null };
    }
    let re: RegExp;
    try {
      re = new RegExp(pattern, flags);
    } catch (err) {
      return {
        matches: [] as MatchGroup[],
        error: err instanceof Error ? err.message : '无效的正则表达式',
        replaced: text,
        highlighted: null,
      };
    }

    const global = flags.includes('g') || flags.includes('y');
    const list: MatchGroup[] = [];
    let replacedText = text;
    let html: string | null = null;

    try {
      if (global) {
        let m: RegExpExecArray | null;
        let guard = 0;
        const parts: string[] = [];
        let lastIndex = 0;
        const clone = new RegExp(re.source, re.flags);
        while ((m = clone.exec(text)) !== null && guard < 5000) {
          guard += 1;
          list.push({
            full: m[0],
            index: m.index,
            groups: m.slice(1),
            ...(m.groups ? { namedGroups: m.groups } : {}),
          });
          parts.push(escapeHtmlForHighlight(text.slice(lastIndex, m.index)));
          parts.push(`<mark data-hl>${escapeHtmlForHighlight(m[0])}</mark>`);
          lastIndex = m.index + m[0].length;
          if (m[0].length === 0) clone.lastIndex += 1;
        }
        parts.push(escapeHtmlForHighlight(text.slice(lastIndex)));
        html = parts.join('');
      } else {
        const m = re.exec(text);
        if (m) {
          list.push({
            full: m[0],
            index: m.index,
            groups: m.slice(1),
            ...(m.groups ? { namedGroups: m.groups } : {}),
          });
          html =
            escapeHtmlForHighlight(text.slice(0, m.index)) +
            `<mark data-hl>${escapeHtmlForHighlight(m[0])}</mark>` +
            escapeHtmlForHighlight(text.slice(m.index + m[0].length));
        }
      }
      replacedText = text.replace(
        new RegExp(re.source, flags.includes('g') ? re.flags : `${re.flags}g`),
        replacement,
      );
    } catch (err) {
      return {
        matches: list,
        error: err instanceof Error ? err.message : '匹配过程中出错',
        replaced: text,
        highlighted: html,
      };
    }

    return { matches: list, error: null, replaced: replacedText, highlighted: html };
  }, [pattern, flags, text, replacement]);

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <ClearButton
            onClear={() => {
              setPattern('');
              setText('');
            }}
          />
          <CopyButton value={pattern} sourceLabel="正则表达式" variant="secondary">
            复制正则
          </CopyButton>
        </>
      }
    >
      <Panel
        title="正则表达式"
        description="支持全部修饰符，实时列出每个匹配与分组捕获"
        bodyClassName="p-4 space-y-3.5"
      >
        <div className="flex items-center gap-2">
          <span className="shrink-0 font-mono text-sm text-muted-foreground">/</span>
          <Input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="输入正则表达式…"
            className="flex-1 font-mono text-[13px]"
            spellCheck={false}
            aria-invalid={Boolean(error)}
          />
          <span className="shrink-0 font-mono text-sm text-muted-foreground">/</span>
          <span className="shrink-0 font-mono text-sm text-primary">{flags}</span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {FLAGS.map((f) => (
            <CheckboxRow
              key={f}
              label={<span className="font-mono">{f}</span>}
              checked={flags.includes(f)}
              onCheckedChange={() => toggleFlag(f)}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          <span className="mr-1 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            速查
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setPattern(p.pattern);
                setFlags(p.flags);
              }}
              className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {p.label}
            </button>
          ))}
        </div>

        {error && <Notice tone="danger">正则无效：{error}</Notice>}
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="测试文本">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="粘贴要匹配的文本…"
            className="min-h-56 font-mono text-[13px]"
            spellCheck={false}
          />
        </Panel>

        <Panel
          title="替换预览"
          actions={
            <CopyButton value={replaced} sourceLabel="替换结果" size="xs">
              复制
            </CopyButton>
          }
        >
          <Field label="替换为" hint="可使用 $1、$& 引用捕获组">
            <Input
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder="替换文本"
              className="font-mono text-[13px]"
              spellCheck={false}
            />
          </Field>
          <Textarea
            value={replaced}
            readOnly
            className="mt-3 min-h-[9.5rem] font-mono text-[13px]"
            spellCheck={false}
          />
        </Panel>
      </div>

      <Panel title="高亮命中" description={`共 ${matches.length} 处匹配`}>
        {highlighted ? (
          <pre
            className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-border bg-background p-3.5 font-mono text-[13px] leading-relaxed [&_mark]:rounded [&_mark]:bg-primary-subtle [&_mark]:px-0.5 [&_mark]:text-primary"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        ) : (
          <EmptyState icon={<Regex />} title="没有匹配" description="调整正则或修饰符后再试" />
        )}
      </Panel>

      {matches.length > 0 && (
        <Panel title="匹配明细" description="含每个捕获组的内容">
          <div className="max-h-96 space-y-2 overflow-auto">
            {matches.map((m, i) => (
              <div key={i} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    第 {i + 1} 个 · 位置 {m.index}
                  </span>
                  <Badge variant="neutral" size="sm">
                    {m.full.length} 字符
                  </Badge>
                </div>
                <code className="mt-1.5 block break-all font-mono text-[13px] text-primary">
                  {m.full}
                </code>
                {m.groups.length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-border pt-2">
                    {m.groups.map((g, gi) => (
                      <div key={gi} className="flex items-start gap-2 text-xs">
                        <span className="shrink-0 font-mono text-muted-foreground">${gi + 1}</span>
                        <span
                          className={cn(
                            'break-all font-mono',
                            g === undefined ? 'text-subtle-foreground' : 'text-foreground',
                          )}
                        >
                          {g === undefined ? 'undefined' : g}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {m.namedGroups && Object.keys(m.namedGroups).length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-border pt-2">
                    {Object.entries(m.namedGroups).map(([k, v]) => (
                      <div key={k} className="flex items-start gap-2 text-xs">
                        <span className="shrink-0 font-mono text-muted-foreground">{k}</span>
                        <span className="break-all font-mono text-foreground">
                          {v ?? 'undefined'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </ToolView>
  );
}

function escapeHtmlForHighlight(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
