'use client';

import * as React from 'react';

import { CopyButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/card';
import { parseUserAgent } from '@/lib/core/dev';
import { useHydrated } from '@/lib/hooks';

const SAMPLES = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'curl/8.7.1',
];

export default function UserAgentParser() {
  const tool = useToolMeta('user-agent-parser');
  useTrackRecent(tool.slug);

  const [ua, setUa] = React.useState(SAMPLES[0]!);

  // navigator 只有客户端有，hydration 之后再读，避免 SSR 与首屏不一致
  const liveUa = useHydrated() ? navigator.userAgent : '';

  const result = React.useMemo(() => parseUserAgent(ua), [ua]);
  const live = React.useMemo(() => parseUserAgent(liveUa), [liveUa]);

  const rows: { label: string; value: string; mono?: boolean }[] = [
    {
      label: '浏览器',
      value: result.browserVersion ? `${result.browser} ${result.browserVersion}` : result.browser,
    },
    { label: '渲染引擎', value: result.engine },
    { label: '操作系统', value: result.osVersion ? `${result.os} ${result.osVersion}` : result.os },
    { label: '设备类型', value: result.device },
  ];

  return (
    <ToolView
      tool={tool}
      actions={
        <CopyButton
          value={() => rows.map((r) => `${r.label}：${r.value}`).join('\n')}
          sourceLabel="解析结果"
          variant="secondary"
        >
          复制结果
        </CopyButton>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="User-Agent"
          description="粘贴任意 UA 字符串，或点用下方的示例"
          actions={
            <button
              type="button"
              onClick={() => setUa(liveUa)}
              disabled={!liveUa}
              className="inline-flex h-7 items-center rounded-md border border-border px-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              用我当前的
            </button>
          }
          bodyClassName="p-0"
        >
          <Textarea
            value={ua}
            onChange={(e) => setUa(e.target.value)}
            placeholder="Mozilla/5.0 …"
            spellCheck={false}
            className="min-h-32 rounded-none border-0 font-mono text-[12px] focus:ring-0"
          />
        </Panel>

        <Panel title="解析结果">
          {ua.trim() ? (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                {rows.map((r) => (
                  <div
                    key={r.label}
                    className="rounded-xl border border-border bg-background px-3.5 py-3"
                  >
                    <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {r.label}
                    </div>
                    <div
                      className={r.mono ? 'mt-1 font-mono text-sm' : 'mt-1 text-sm font-semibold'}
                    >
                      {r.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant={result.isBot ? 'warning' : 'success'} size="md">
                  {result.isBot ? '疑似爬虫 / 自动化' : '正常用户流量'}
                </Badge>
                <Badge variant="neutral" size="md">
                  UA 长度 {result.raw.length}
                </Badge>
                <Badge variant="outline" size="md">
                  {result.raw.split(/[\s;()]+/).filter(Boolean).length} 个片段
                </Badge>
              </div>
            </>
          ) : (
            <EmptyState
              title="还没有输入"
              description="粘贴一段 User-Agent，或点上方「用我当前的」"
            />
          )}
        </Panel>
      </div>

      <Panel title="当前浏览器实测" description="直接读本机的 navigator，可用于对照线上埋点数据">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { label: '浏览器', value: `${live.browser} ${live.browserVersion}`.trim() },
            { label: '系统', value: `${live.os} ${live.osVersion}`.trim() },
            { label: '设备', value: live.device },
            { label: '引擎', value: live.engine },
          ].map((r) => (
            <div
              key={r.label}
              className="rounded-xl border border-border bg-background px-3.5 py-3"
            >
              <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {r.label}
              </div>
              <div className="mt-1 truncate text-sm font-semibold" title={r.value}>
                {r.value || '—'}
              </div>
            </div>
          ))}
        </div>
        {liveUa && (
          <pre className="mt-3 overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-[11px] leading-relaxed break-all">
            {liveUa}
          </pre>
        )}
      </Panel>

      <Panel title="示例 UA" description="点一下即可载入">
        <div className="flex flex-col gap-1.5">
          {SAMPLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setUa(s)}
              className="truncate rounded-lg border border-border bg-background px-3 py-2 text-left font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {s}
            </button>
          ))}
        </div>
      </Panel>

      <Notice tone="warning">
        UA 字符串可以被任意伪造，风控、灰度分流等场景不要只依赖它。 更可靠的做法是结合{' '}
        <code className="font-mono">navigator.userAgentData</code>（Client Hints）与服务端能力探测。
      </Notice>

      <StatGrid
        columns={3}
        items={[
          { label: '识别浏览器', value: result.browser, tone: 'primary' },
          { label: '识别系统', value: result.os },
          {
            label: '是否爬虫',
            value: result.isBot ? '是' : '否',
            tone: result.isBot ? 'warning' : 'success',
          },
        ]}
      />
    </ToolView>
  );
}
