'use client';

import * as React from 'react';
import { RefreshCw } from 'lucide-react';

import { CopyButton, CopyIconButton, DownloadButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SliderRow, SwitchRow } from '@/components/ui/controls';
import { nanoid, uuidV1, uuidV4 } from '@/lib/core/generator';
import { cn } from '@/lib/utils';

type Kind = 'v4' | 'v1' | 'nanoid';

const KIND_META: Record<Kind, { label: string; hint: string }> = {
  v4: { label: 'UUID v4', hint: '122 位随机数，最常用' },
  v1: { label: 'UUID v1', hint: '含时间戳与节点信息，大致可按时间排序' },
  nanoid: { label: 'NanoID', hint: '更短，默认 21 字符，URL 友好' },
};

export default function UuidGenerator() {
  const tool = useToolMeta('uuid-generator');
  useTrackRecent(tool.slug);

  const [kind, setKind] = React.useState<Kind>('v4');
  const [count, setCount] = React.useState(10);
  const [upper, setUpper] = React.useState(false);
  const [hyphens, setHyphens] = React.useState(true);
  const [nanoSize, setNanoSize] = React.useState(21);
  const [nonce, setNonce] = React.useState(0);

  const items = React.useMemo(() => {
    const make = (): string => {
      if (kind === 'v4') return uuidV4();
      if (kind === 'v1') return uuidV1();
      return nanoid(nanoSize);
    };
    const raw = Array.from({ length: count }, make);
    return raw.map((v) => {
      let out = upper ? v.toUpperCase() : v;
      if (!hyphens) out = out.replace(/-/g, '');
      return out;
    });
    // nonce 用于手动触发重新生成
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, count, upper, hyphens, nanoSize, nonce]);

  const all = items.join('\n');

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <button
            type="button"
            onClick={() => setNonce((n) => n + 1)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
            重新生成
          </button>
          <CopyButton value={all} sourceLabel="全部 ID" variant="secondary">
            复制全部
          </CopyButton>
          <DownloadButton
            data={all}
            filename={`${kind}-ids.txt`}
            mimeType="text/plain"
            sourceLabel="ID 列表"
            variant="ghost"
            size="sm"
          >
            下载
          </DownloadButton>
        </>
      }
    >
      <Panel title="生成选项" bodyClassName="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            size="sm"
            value={kind}
            onValueChange={setKind}
            options={[
              { value: 'v4', label: 'UUID v4' },
              { value: 'v1', label: 'UUID v1' },
              { value: 'nanoid', label: 'NanoID' },
            ]}
          />
          <span className="text-xs text-muted-foreground">{KIND_META[kind].hint}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SliderRow
            label="生成数量"
            value={count}
            onChange={setCount}
            min={1}
            max={100}
            suffix=" 个"
          />
          {kind === 'nanoid' && (
            <SliderRow
              label="NanoID 长度"
              value={nanoSize}
              onChange={setNanoSize}
              min={4}
              max={48}
              suffix=" 字符"
            />
          )}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2.5 border-t border-border pt-3">
          <SwitchRow
            label="大写输出"
            checked={upper}
            onCheckedChange={setUpper}
            className="gap-3"
          />
          {kind !== 'nanoid' && (
            <SwitchRow
              label="保留连字符"
              checked={hyphens}
              onCheckedChange={setHyphens}
              className="gap-3"
            />
          )}
        </div>
      </Panel>

      <Panel
        title="生成结果"
        description={`${items.length} 个 ${KIND_META[kind].label}`}
        actions={
          <CopyButton value={all} sourceLabel="全部 ID" size="xs">
            复制全部
          </CopyButton>
        }
      >
        <StatGrid
          columns={3}
          items={[
            { label: '数量', value: items.length },
            { label: '单个长度', value: `${items[0]?.length ?? 0} 字符` },
            {
              label: '随机源',
              value: 'Web Crypto',
              hint: 'crypto.getRandomValues',
            },
          ]}
        />

        <div className="mt-3 max-h-[26rem] overflow-auto rounded-xl border border-border">
          {items.map((id, i) => (
            <div
              key={`${id}-${i}`}
              className={cn(
                'flex items-center justify-between gap-3 px-3 py-2',
                i % 2 === 1 && 'bg-surface-2/50',
              )}
            >
              <code className="truncate font-mono text-[13px] text-foreground">{id}</code>
              <CopyIconButton value={id} sourceLabel="ID" />
            </div>
          ))}
        </div>
      </Panel>

      <Notice tone="info">
        所有 ID 都使用 <code className="font-mono">crypto.getRandomValues()</code>{' '}
        生成，属于密码学安全随机数，不是 <code className="font-mono">Math.random()</code>。 UUID v4
        的碰撞概率极低：生成 10 亿个才有约 1/2^60 的碰撞机会。
      </Notice>
    </ToolView>
  );
}
