'use client';

import * as React from 'react';
import { RefreshCw } from 'lucide-react';

import { CopyButton, CopyIconButton, DownloadButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel } from '@/components/tool/shell';
import { HintTip, ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { CheckboxRow, SliderRow } from '@/components/ui/controls';
import { CHAR_SETS, shuffleSecure } from '@/lib/core/generator';

export default function RandomString() {
  const tool = useToolMeta('random-string');
  useTrackRecent(tool.slug);

  const [length, setLength] = React.useState(16);
  const [count, setCount] = React.useState(10);
  const [lower, setLower] = React.useState(true);
  const [upper, setUpper] = React.useState(true);
  const [digits, setDigits] = React.useState(true);
  const [symbols, setSymbols] = React.useState(false);
  const [excludeAmbiguous, setExcludeAmbiguous] = React.useState(false);
  const [requireEach, setRequireEach] = React.useState(true);
  const [unique, setUnique] = React.useState(true);
  const [nonce, setNonce] = React.useState(0);

  const charset = React.useMemo(() => {
    let pool = '';
    if (lower) pool += CHAR_SETS.lower;
    if (upper) pool += CHAR_SETS.upper;
    if (digits) pool += CHAR_SETS.digits;
    if (symbols) pool += CHAR_SETS.symbols;
    if (excludeAmbiguous) {
      const allowed = new Set(CHAR_SETS.ambiguousRemoved);
      pool = Array.from(new Set(pool))
        .filter((c) => allowed.has(c))
        .join('');
    }
    return pool;
  }, [lower, upper, digits, symbols, excludeAmbiguous]);

  const items = React.useMemo(() => {
    if (!charset) return [];
    const pool = Array.from(charset);
    const out: string[] = [];
    const seen = new Set<string>();
    let guard = 0;
    while (out.length < count && guard < count * 200) {
      guard += 1;
      let s = '';
      if (requireEach) {
        // 先从每个启用的字符集里各取一个，保证覆盖
        const groups = [
          lower ? CHAR_SETS.lower : '',
          upper ? CHAR_SETS.upper : '',
          digits ? CHAR_SETS.digits : '',
          symbols ? CHAR_SETS.symbols : '',
        ].filter(Boolean);
        const picks: string[] = [];
        for (const g of groups) {
          const gAllowed = excludeAmbiguous
            ? Array.from(g).filter((c) => new Set(CHAR_SETS.ambiguousRemoved).has(c))
            : Array.from(g);
          if (gAllowed.length === 0) continue;
          picks.push(gAllowed[crypto.getRandomValues(new Uint32Array(1))[0]! % gAllowed.length]!);
        }
        const rest = shuffleSecure(
          Array.from(
            { length: Math.max(0, length - picks.length) },
            () => pool[crypto.getRandomValues(new Uint32Array(1))[0]! % pool.length]!,
          ),
        );
        s = shuffleSecure([...picks, ...rest])
          .join('')
          .slice(0, length);
      } else {
        s = Array.from(
          { length },
          () => pool[crypto.getRandomValues(new Uint32Array(1))[0]! % pool.length]!,
        ).join('');
      }
      if (unique && seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
    return out;
    // nonce 用于手动触发重新生成
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    charset,
    count,
    length,
    requireEach,
    unique,
    nonce,
    lower,
    upper,
    digits,
    symbols,
    excludeAmbiguous,
  ]);

  const all = items.join('\n');
  const poolSize = charset.length;
  const entropyBits = Math.log2(Math.max(poolSize, 1)) * length;

  const switches = [
    { label: '小写 a-z', checked: lower, set: setLower },
    { label: '大写 A-Z', checked: upper, set: setUpper },
    { label: '数字 0-9', checked: digits, set: setDigits },
    { label: '符号 !@#$', checked: symbols, set: setSymbols },
  ];

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
          <CopyButton value={all} sourceLabel="全部结果" variant="secondary">
            复制全部
          </CopyButton>
          <DownloadButton
            data={all}
            filename="random-strings.txt"
            mimeType="text/plain"
            sourceLabel="随机字符串"
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
            label="单个长度"
            value={length}
            onChange={setLength}
            min={1}
            max={128}
            suffix=" 字符"
          />
          <SliderRow
            label="生成数量"
            value={count}
            onChange={setCount}
            min={1}
            max={200}
            suffix=" 个"
          />

          <div className="space-y-2.5 border-t border-border pt-3.5">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              字符集
            </span>
            {switches.map((s) => (
              <CheckboxRow
                key={s.label}
                label={s.label}
                checked={s.checked}
                onCheckedChange={s.set}
              />
            ))}
            {!charset && <p className="text-xs text-danger">至少选择一种字符集</p>}
          </div>

          <div className="space-y-2.5 border-t border-border pt-3.5">
            <CheckboxRow
              label={
                <span className="inline-flex items-center gap-1.5">
                  排除易混淆字符
                  <HintTip content="去掉 0/O、1/l/I，生成的串更容易口头传递" />
                </span>
              }
              checked={excludeAmbiguous}
              onCheckedChange={setExcludeAmbiguous}
            />
            <CheckboxRow
              label="每种字符至少一个"
              checked={requireEach}
              onCheckedChange={setRequireEach}
            />
            <CheckboxRow label="结果互不重复" checked={unique} onCheckedChange={setUnique} />
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="生成结果" description={`${items.length} 条，点击复制`}>
            {items.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {charset ? '生成中…' : '请先选择至少一种字符集'}
              </p>
            ) : (
              <div className="max-h-[28rem] space-y-2 overflow-auto">
                {items.map((s, i) => (
                  <div
                    key={`${s}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
                  >
                    <code className="truncate font-mono text-[13px] text-foreground">{s}</code>
                    <CopyIconButton value={s} sourceLabel="随机字符串" />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="强度信息">
            <StatGrid
              columns={4}
              items={[
                { label: '字符集大小', value: poolSize, tone: 'primary' },
                { label: '单条长度', value: length },
                { label: '信息熵', value: `${entropyBits.toFixed(0)} bit` },
                {
                  label: '理论组合数',
                  value:
                    poolSize > 0 && entropyBits < 1024 ? `2^${entropyBits.toFixed(0)}` : '极大',
                },
              ]}
            />
            <Notice tone="info" className="mt-3">
              <div className="space-y-1">
                <div>
                  随机数来自 <code className="font-mono">crypto.getRandomValues()</code>，
                  是密码学安全随机源，适合生成 token、邀请码、临时口令。
                </div>
                <div>
                  若要当会话 ID 或 API Key 用，建议长度 ≥ 32 且开启符号 —— 16 位纯字母数字只有约 95
                  bit 熵。
                </div>
              </div>
            </Notice>
          </Panel>
        </div>
      </div>
    </ToolView>
  );
}
