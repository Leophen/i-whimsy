'use client';

import * as React from 'react';
import { RefreshCw } from 'lucide-react';

import { CopyButton, CopyIconButton, DownloadButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel } from '@/components/tool/shell';
import { HintTip, ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { CheckboxRow, SliderRow } from '@/components/ui/controls';
import { Badge } from '@/components/ui/card';
import {
  DEFAULT_PASSWORD_OPTIONS,
  estimateStrength,
  generatePasswords,
  type PasswordOptions,
} from '@/lib/core/generator';
import { cn } from '@/lib/utils';

const TONE_BY_SCORE = ['danger', 'danger', 'warning', 'success', 'success'] as const;
const BAR_BY_SCORE = ['w-1/5', 'w-1/5', 'w-3/5', 'w-4/5', 'w-full'] as const;

export default function PasswordGenerator() {
  const tool = useToolMeta('password-generator');
  useTrackRecent(tool.slug);

  const [opts, setOpts] = React.useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS);
  const [nonce, setNonce] = React.useState(0);

  const patch = <K extends keyof PasswordOptions>(key: K, value: PasswordOptions[K]) =>
    setOpts((prev) => ({ ...prev, [key]: value }));

  const passwords = React.useMemo(
    () => generatePasswords(opts),
    // nonce 用于手动触发重新生成
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [opts, nonce],
  );

  const strength = React.useMemo(
    () => (passwords[0] ? estimateStrength(passwords[0]) : null),
    [passwords],
  );

  const charsets = [
    { key: 'lower' as const, label: '小写 a-z' },
    { key: 'upper' as const, label: '大写 A-Z' },
    { key: 'digits' as const, label: '数字 0-9' },
    { key: 'symbols' as const, label: '符号 !@#$' },
  ];
  const anyCharset = opts.lower || opts.upper || opts.digits || opts.symbols;

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
          <CopyButton value={passwords.join('\n')} sourceLabel="全部密码" variant="secondary">
            复制全部
          </CopyButton>
          <DownloadButton
            data={passwords.join('\n')}
            filename="passwords.txt"
            mimeType="text/plain"
            sourceLabel="密码"
            variant="ghost"
            size="sm"
          >
            下载
          </DownloadButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <Panel title="生成规则" bodyClassName="p-4 space-y-4">
          <SliderRow
            label="密码长度"
            value={opts.length}
            onChange={(v) => patch('length', v)}
            min={6}
            max={64}
            suffix=" 位"
          />
          <SliderRow
            label="生成数量"
            value={opts.count}
            onChange={(v) => patch('count', v)}
            min={1}
            max={50}
            suffix=" 个"
          />

          <div className="space-y-2.5 border-t border-border pt-3.5">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              字符集
            </span>
            {charsets.map(({ key, label }) => (
              <CheckboxRow
                key={key}
                label={label}
                checked={opts[key]}
                onCheckedChange={(v) => patch(key, v)}
              />
            ))}
            {!anyCharset && <p className="text-xs text-danger">至少选择一种字符集，否则无法生成</p>}
          </div>

          <div className="space-y-2.5 border-t border-border pt-3.5">
            <CheckboxRow
              label={
                <span className="inline-flex items-center gap-1.5">
                  排除易混淆字符
                  <HintTip content="排除 0/O、1/l/I 这类长得像的字符，方便口头传递或手抄" />
                </span>
              }
              checked={opts.excludeAmbiguous}
              onCheckedChange={(v) => patch('excludeAmbiguous', v)}
            />
            <CheckboxRow
              label={
                <span className="inline-flex items-center gap-1.5">
                  每种字符集至少一个
                  <HintTip content="保证选中的每类字符在密码里都至少出现一次，能过大多数站点的复杂度校验" />
                </span>
              }
              checked={opts.requireEach}
              onCheckedChange={(v) => patch('requireEach', v)}
            />
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="生成结果" description="点击任意一条即可复制">
            {!anyCharset ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                请先选择至少一种字符集
              </p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-auto">
                {passwords.map((p, i) => (
                  <div
                    key={`${p}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5 transition-colors hover:border-primary/40"
                  >
                    <code className="truncate font-mono text-[13px] tracking-wide text-foreground">
                      {p}
                    </code>
                    <CopyIconButton value={p} sourceLabel="密码" />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {strength && (
            <Panel title="强度评估" description="以第一条密码为例">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        BAR_BY_SCORE[strength.score],
                        strength.score <= 1
                          ? 'bg-danger'
                          : strength.score === 2
                            ? 'bg-warning'
                            : 'bg-success',
                      )}
                    />
                  </div>
                  <Badge variant={TONE_BY_SCORE[strength.score]} size="md">
                    {strength.label}
                  </Badge>
                </div>

                <StatGrid
                  columns={2}
                  items={[
                    {
                      label: '信息熵',
                      value: `${strength.entropy.toFixed(0)} bit`,
                      tone: 'primary',
                    },
                    { label: '离线暴力破解', value: strength.crackTime },
                  ]}
                />

                {strength.suggestions.length > 0 && (
                  <ul className="space-y-1.5 rounded-xl border border-border bg-surface-2 p-3">
                    {strength.suggestions.map((s) => (
                      <li key={s} className="flex gap-2 text-xs text-muted-foreground">
                        <span className="text-subtle-foreground">·</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                )}

                <p className="text-xs leading-relaxed text-muted-foreground">
                  破解时长按每秒 100 亿次猜测的离线暴力攻击估算。熵值 80 bit
                  以上对当前算力基本不可破。
                </p>
              </div>
            </Panel>
          )}
        </div>
      </div>

      <Notice tone="info">
        密码在你自己的浏览器里生成，用
        <code className="font-mono"> crypto.getRandomValues()</code>{' '}
        取随机数，不经过网络也不被记录。 生成后请存进密码管理器 —— 关掉这个页面后就找不回来了。
      </Notice>
    </ToolView>
  );
}
