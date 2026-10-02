'use client';

import * as React from 'react';
import { Search } from 'lucide-react';

import { CopyButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl } from '@/components/ui/controls';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/card';
import { HTTP_GROUPS, HTTP_GROUP_LABEL, HTTP_STATUSES, type HttpStatus } from '@/lib/core/dev';
import { cn } from '@/lib/utils';

const TONE: Record<
  HttpStatus['group'],
  { badge: 'success' | 'warning' | 'danger' | 'default' | 'neutral'; dot: string }
> = {
  '1xx': { badge: 'neutral', dot: 'bg-muted-foreground' },
  '2xx': { badge: 'success', dot: 'bg-success' },
  '3xx': { badge: 'default', dot: 'bg-primary' },
  '4xx': { badge: 'warning', dot: 'bg-warning' },
  '5xx': { badge: 'danger', dot: 'bg-danger' },
};

export default function HttpStatusCodes() {
  const tool = useToolMeta('http-status-codes');
  useTrackRecent(tool.slug);

  const [group, setGroup] = React.useState<'all' | HttpStatus['group']>('all');
  const [keyword, setKeyword] = React.useState('');

  const filtered = React.useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return HTTP_STATUSES.filter((s) => {
      if (group !== 'all' && s.group !== group) return false;
      if (!kw) return true;
      return (
        String(s.code).includes(kw) ||
        s.name.toLowerCase().includes(kw) ||
        s.en.toLowerCase().includes(kw) ||
        s.meaning.toLowerCase().includes(kw) ||
        s.tip.toLowerCase().includes(kw)
      );
    });
  }, [group, keyword]);

  return (
    <ToolView
      tool={tool}
      actions={
        <CopyButton
          value={() =>
            filtered.map((s) => `${s.code} ${s.name} (${s.en}) — ${s.meaning}`).join('\n')
          }
          sourceLabel="状态码列表"
          variant="secondary"
        >
          复制列表
        </CopyButton>
      }
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          size="sm"
          value={group}
          onValueChange={setGroup}
          options={[
            { value: 'all', label: '全部' },
            ...HTTP_GROUPS.map((g) => ({ value: g, label: g })),
          ]}
        />
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-subtle-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索状态码或含义，如 429、timeout"
            className="h-9 pl-9 text-[13px]"
            aria-label="搜索 HTTP 状态码"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {HTTP_GROUPS.map((g) => (
          <button key={g} type="button" onClick={() => setGroup(group === g ? 'all' : g)}>
            <Badge
              variant={group === g ? 'default' : 'outline'}
              size="md"
              className="cursor-pointer"
            >
              <span className={cn('size-1.5 rounded-full', TONE[g].dot)} />
              {g} {HTTP_GROUP_LABEL[g]} · {HTTP_STATUSES.filter((s) => s.group === g).length}
            </Badge>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Panel>
          <EmptyState title="没有匹配的状态码" description="换个关键词试试，或清空筛选条件" />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <div
              key={s.code}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <span className={cn('tabular text-2xl leading-none font-semibold')}>
                    {s.code}
                  </span>
                  <span className="text-[13px] font-medium text-foreground">{s.name}</span>
                </div>
                <Badge variant={TONE[s.group].badge} size="sm">
                  {s.group}
                </Badge>
              </div>
              <code className="font-mono text-[11px] text-subtle-foreground">{s.en}</code>
              <p className="text-xs leading-relaxed text-muted-foreground">{s.meaning}</p>
              <p className="rounded-lg border border-border bg-background px-2.5 py-2 text-[11px] leading-relaxed text-foreground/80">
                {s.tip}
              </p>
            </div>
          ))}
        </div>
      )}

      <StatGrid
        columns={3}
        items={[
          { label: '收录状态码', value: HTTP_STATUSES.length, tone: 'primary' },
          { label: '当前筛选', value: filtered.length },
          {
            label: '常用 4xx / 5xx',
            value: HTTP_STATUSES.filter((s) => s.group === '4xx' || s.group === '5xx').length,
          },
        ]}
      />
    </ToolView>
  );
}
