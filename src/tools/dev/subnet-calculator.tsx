'use client';

import * as React from 'react';

import { CopyButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SliderRow } from '@/components/ui/controls';
import { Input } from '@/components/ui/input';
import { calculateSubnet, splitSubnet } from '@/lib/core/dev';
import { cn } from '@/lib/utils';

const SAMPLES = [
  '192.168.1.0/24',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '203.0.113.5/29',
  '192.168.10.130/25',
];

function Row({
  label,
  value,
  mono = true,
  hint,
}: {
  label: string;
  value: string;
  mono?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-0">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right">
        <span className={cn('text-[13px] font-medium break-all', mono && 'font-mono')}>
          {value}
        </span>
        {hint && <span className="block text-[11px] text-subtle-foreground">{hint}</span>}
      </span>
    </div>
  );
}

export default function SubnetCalculator() {
  const tool = useToolMeta('subnet-calculator');
  useTrackRecent(tool.slug);

  const [input, setInput] = React.useState('192.168.1.0/24');
  const [parts, setParts] = React.useState(4);

  const r = React.useMemo(() => calculateSubnet(input), [input]);

  const splits = React.useMemo(() => {
    if (!r.ok) return [];
    return splitSubnet(r.network, r.prefix, parts);
  }, [r, parts]);

  const output = React.useMemo(() => {
    if (!r.ok) return '';
    return [
      `IP 地址      : ${r.ip}`,
      `网络前缀     : /${r.prefix}`,
      `网络地址     : ${r.network}`,
      `广播地址     : ${r.broadcast}`,
      `子网掩码     : ${r.mask}`,
      `通配符掩码   : ${r.wildcard}`,
      `可用主机范围 : ${r.firstHost} - ${r.lastHost}`,
      `地址总数     : ${r.totalHosts}`,
      `可用主机数   : ${r.usableHosts}`,
      `地址类型     : ${r.isPrivate ? '私有地址' : '公网地址'}`,
    ].join('\n');
  }, [r]);

  return (
    <ToolView
      tool={tool}
      actions={
        <CopyButton value={output} sourceLabel="计算结果" variant="secondary">
          复制结果
        </CopyButton>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <Panel title="输入" description="支持 192.168.1.0/24 或 192.168.1.10 两种写法">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="192.168.1.0/24"
            spellCheck={false}
            aria-invalid={!r.ok && input.trim() !== ''}
            className="font-mono"
          />
          {!r.ok && input.trim() && <p className="mt-2 text-xs text-danger">{r.error}</p>}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {SAMPLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setInput(s)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3.5 border-t border-border pt-3.5">
            <SliderRow
              label="等分子网数"
              value={parts}
              onChange={setParts}
              min={2}
              max={16}
              suffix=" 个"
            />
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          {r.ok ? (
            <>
              <Panel title="计算结果">
                <div className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
                  <Row label="网络地址" value={`${r.network}/${r.prefix}`} />
                  <Row label="子网掩码" value={r.mask} />
                  <Row label="广播地址" value={r.broadcast} />
                  <Row label="通配符掩码" value={r.wildcard} />
                  <Row label="第一个可用" value={r.firstHost} />
                  <Row label="最后一个可用" value={r.lastHost} />
                  <Row label="地址总数" value={r.totalHosts.toLocaleString('en-US')} />
                  <Row
                    label="可用主机数"
                    value={r.usableHosts.toLocaleString('en-US')}
                    hint={r.prefix >= 31 ? '/31 与 /32 按点对点链路处理' : '已扣除网络号与广播号'}
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <div>
                    <div className="mb-1 text-[11px] tracking-wide text-muted-foreground uppercase">
                      IP 二进制
                    </div>
                    <code className="block overflow-auto rounded-lg border border-border bg-background p-2.5 font-mono text-[11px] break-all">
                      {r.ipBinary}
                    </code>
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] tracking-wide text-muted-foreground uppercase">
                      掩码二进制
                    </div>
                    <code className="block overflow-auto rounded-lg border border-border bg-background p-2.5 font-mono text-[11px] break-all">
                      {r.maskBinary}
                    </code>
                  </div>
                </div>
              </Panel>

              <Panel
                title={`等分成 ${splits.length} 个子网`}
                description={`每个子网 /${r.prefix + Math.ceil(Math.log2(parts))}`}
              >
                {splits.length > 0 ? (
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {splits.map((s, i) => (
                      <div
                        key={s}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
                      >
                        <span className="text-[11px] text-muted-foreground">#{i + 1}</span>
                        <code className="font-mono text-[12px]">{s}</code>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">当前前缀已到 /32，无法继续划分。</p>
                )}
              </Panel>

              <StatGrid
                columns={4}
                items={[
                  { label: '前缀', value: `/${r.prefix}`, tone: 'primary' },
                  { label: '可用主机', value: r.usableHosts.toLocaleString('en-US') },
                  { label: '掩码', value: r.mask },
                  {
                    label: '地址类型',
                    value: r.isPrivate ? '私有' : '公网',
                    tone: r.isPrivate ? 'default' : 'warning',
                  },
                ]}
              />
            </>
          ) : (
            <Panel>
              <div className="py-8 text-center text-sm text-muted-foreground">
                请输入合法的 IPv4 地址与前缀，例如 <code className="font-mono">192.168.1.0/24</code>
              </div>
            </Panel>
          )}

          <Notice tone="info">
            RFC 1918 私有网段为 10.0.0.0/8、172.16.0.0/12、192.168.0.0/16；127.0.0.0/8 为回环地址。
            /31 与 /32 在现代网络中按点对点链路使用，不扣除网络号与广播号。
          </Notice>
        </div>
      </div>
    </ToolView>
  );
}
