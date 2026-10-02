'use client';

import * as React from 'react';
import { Search, Trash2 } from 'lucide-react';

import { ClearButton, CopyButton, DownloadButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { Checkbox, SegmentedControl } from '@/components/ui/controls';
import { Input } from '@/components/ui/input';
import { GITIGNORE_TEMPLATES, buildGitignore } from '@/lib/core/dev';
import { cn } from '@/lib/utils';

const QUICK: Record<string, string[]> = {
  前端全栈: ['node', 'react', 'vscode', 'macos'],
  'Next.js 项目': ['next', 'node', 'vscode', 'macos'],
  'Python 后端': ['python', 'docker', 'vscode', 'linux'],
  'Java 后端': ['java', 'docker', 'linux'],
  'Flutter App': ['flutter', 'vscode', 'macos'],
};

export default function GitignoreGenerator() {
  const tool = useToolMeta('gitignore-generator');
  useTrackRecent(tool.slug);

  const [selected, setSelected] = React.useState<string[]>(['node', 'vscode', 'macos']);
  const [extra, setExtra] = React.useState('');
  const [keyword, setKeyword] = React.useState('');
  const [group, setGroup] = React.useState<'all' | string>('all');

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const output = React.useMemo(() => {
    const base = buildGitignore(selected);
    const trimmed = extra.trim();
    if (!trimmed) return base;
    const custom = `\n# ===== 自定义 =====\n${trimmed}\n`;
    return base ? `${base}${custom}` : `# ===== 自定义 =====\n${trimmed}\n`;
  }, [selected, extra]);

  const groups = React.useMemo(
    () => ['all', ...Array.from(new Set(GITIGNORE_TEMPLATES.map((t) => t.group)))],
    [],
  );

  const visible = GITIGNORE_TEMPLATES.filter((t) => {
    const inGroup = group === 'all' || t.group === group;
    const kw = keyword.trim().toLowerCase();
    const inKeyword =
      !kw ||
      t.label.toLowerCase().includes(kw) ||
      t.id.includes(kw) ||
      t.content.toLowerCase().includes(kw);
    return inGroup && inKeyword;
  });

  const lines = output
    ? output.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#')).length
    : 0;

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <ClearButton onClear={() => setSelected([])} label="清空选择" />
          <DownloadButton
            data={output || null}
            filename=".gitignore"
            mimeType="text/plain"
            sourceLabel=".gitignore"
          >
            下载
          </DownloadButton>
          <CopyButton value={output} sourceLabel=".gitignore">
            复制
          </CopyButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        <Panel
          title="选择技术栈"
          description={`已选 ${selected.length} 个模板，重复条目会自动合并`}
        >
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(QUICK).map(([name, ids]) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelected(ids)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {name}
              </button>
            ))}
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-subtle-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索模板，如 python"
              className="h-9 pl-9 text-[13px]"
              aria-label="搜索 gitignore 模板"
            />
          </div>

          <SegmentedControl
            size="sm"
            full
            value={group}
            onValueChange={setGroup}
            options={groups.map((g) => ({ value: g, label: g === 'all' ? '全部' : g }))}
            className="mt-2.5"
          />

          <div className="scrollbar-none mt-3 max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {visible.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">没有匹配的模板</p>
            )}
            {visible.map((t) => {
              const checked = selected.includes(t.id);
              return (
                <label
                  key={t.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors',
                    checked
                      ? 'border-primary/45 bg-primary-subtle'
                      : 'border-border bg-background hover:border-primary/25',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(t.id)}
                    className="mt-0.5"
                    aria-label={t.label}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-foreground">{t.label}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {t.group} · {t.content.split('\n').filter((l) => l.trim()).length} 条规则
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel
            title="补充规则"
            description="自定义内容会追加到末尾"
            actions={
              <button
                type="button"
                onClick={() => setExtra('')}
                disabled={!extra}
                aria-label="清空补充规则"
                className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-danger-subtle hover:text-danger disabled:opacity-40"
              >
                <Trash2 className="size-3.5" />
              </button>
            }
            bodyClassName="p-0"
          >
            <textarea
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder={'例如：\n*.local\n/temp/\n!.env.example'}
              spellCheck={false}
              className="min-h-24 w-full resize-y bg-transparent px-4 py-3 font-mono text-[12px] leading-relaxed focus:outline-none"
            />
          </Panel>

          <Panel
            title=".gitignore"
            description={`${lines} 条生效规则（不含注释）`}
            actions={
              <CopyButton value={output} sourceLabel=".gitignore" size="xs">
                复制
              </CopyButton>
            }
          >
            {output ? (
              <pre className="scrollbar-none max-h-[28rem] overflow-auto rounded-xl border border-border bg-background p-4 font-mono text-[12px] leading-relaxed">
                {output}
              </pre>
            ) : (
              <EmptyState
                title="还没有选择任何模板"
                description="左侧勾选项目用到的语言与框架，或用上方的快捷组合一键选中"
              />
            )}

            {output && (
              <div className="mt-3">
                <StatGrid
                  columns={3}
                  items={[
                    { label: '模板', value: selected.length, tone: 'primary' },
                    { label: '生效规则', value: lines },
                    { label: '总行数', value: output.split('\n').length },
                  ]}
                />
              </div>
            )}
          </Panel>

          <Notice tone="info">
            <strong className="font-medium">.gitignore 只对未追踪的文件生效。</strong>
            已经被 git 跟踪的文件需要先执行{' '}
            <code className="font-mono">git rm --cached &lt;file&gt;</code> 才能被忽略掉。
          </Notice>
        </div>
      </div>
    </ToolView>
  );
}
