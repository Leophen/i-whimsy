'use client';

import * as React from 'react';

import { ClearButton, CopyButton, CopyIconButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SwitchRow } from '@/components/ui/controls';
import { Field, Input, Textarea } from '@/components/ui/input';
import { HMAC_ALGORITHMS, hmac, type HmacAlgorithm } from '@/lib/core/crypto';
import { useAsyncComputed } from '@/lib/hooks';

const SAMPLE = 'amount=100&orderId=A20261002001&ts=1759344000';
const SAMPLE_KEY = 'sk_live_5f3d9a2b8c7e1d40';

export default function HmacGenerator() {
  const tool = useToolMeta('hmac-generator');
  useTrackRecent(tool.slug);

  const [text, setText] = React.useState(SAMPLE);
  const [key, setKey] = React.useState(SAMPLE_KEY);
  const [algorithm, setAlgorithm] = React.useState<HmacAlgorithm>('SHA256');
  const [upper, setUpper] = React.useState(false);

  // HMAC 走 Web Crypto，异步 + 200ms 防抖
  const {
    value: signature,
    error,
    pending,
  } = useAsyncComputed(async () => hmac(text, key, algorithm), [text, key, algorithm], {
    delay: 200,
    enabled: Boolean(text) && Boolean(key),
  });

  const display = upper ? (signature ?? '').toUpperCase() : (signature ?? '');

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <ClearButton
            onClear={() => {
              setText('');
              setKey('');
            }}
          />
          <CopyButton value={display} sourceLabel="HMAC 签名" variant="secondary">
            复制签名
          </CopyButton>
        </>
      }
    >
      <ToolIO
        split="wide-input"
        input={
          <Panel title="待签名内容" description="通常是拼好的待签名串或请求体原文">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="粘贴要签名的消息…"
              className="min-h-40 font-mono text-[13px]"
              spellCheck={false}
            />

            <Field
              label="密钥 Secret"
              className="mt-4"
              hint="密钥只在你本地参与运算，不会被发送到任何地方"
            >
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="输入密钥…"
                className="font-mono text-[13px]"
                spellCheck={false}
              />
            </Field>

            <div className="mt-4 space-y-3 border-t border-border pt-3">
              <div>
                <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  算法
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {HMAC_ALGORITHMS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAlgorithm(a)}
                      className={
                        algorithm === a
                          ? 'rounded-lg border border-primary bg-primary-subtle px-3 py-1.5 text-xs font-medium text-primary'
                          : 'rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground'
                      }
                    >
                      HMAC-{a}
                    </button>
                  ))}
                </div>
              </div>
              <SwitchRow label="大写输出" checked={upper} onCheckedChange={setUpper} />
            </div>
          </Panel>
        }
        output={
          <Panel
            title="HMAC 结果"
            description={`HMAC-${algorithm}`}
            actions={
              <CopyButton value={display} sourceLabel="HMAC 签名" size="xs">
                复制
              </CopyButton>
            }
          >
            {error ? (
              <Notice tone="danger">{error}</Notice>
            ) : !signature ? (
              <EmptyState
                title={pending ? '计算中…' : '等待输入'}
                description={pending ? undefined : '消息与密钥都填好后会实时计算签名'}
              />
            ) : (
              <>
                <div className="rounded-xl border border-primary/25 bg-primary-subtle p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      HMAC-{algorithm}
                    </span>
                    <CopyIconButton value={display} sourceLabel="签名" />
                  </div>
                  <code className="mt-1.5 block break-all font-mono text-[13px] leading-relaxed text-primary">
                    {display}
                  </code>
                </div>

                <StatGrid
                  columns={2}
                  className="mt-3"
                  items={[
                    { label: '签名长度', value: `${display.length} 字符` },
                    { label: '密钥长度', value: `${key.length} 字符` },
                  ]}
                />

                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  HMAC 用于验证消息完整性与来源身份：接口签名、Webhook 验签。
                  注意签名前必须约定好待签串的拼接顺序与编码方式，否则双方算出的结果会不一致。
                </p>

                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  HMAC-SHA-1 / 256 / 512 由浏览器原生{' '}
                  <code className="font-mono">crypto.subtle</code> 计算， HMAC-MD5 与 HMAC-SHA3-256
                  由 @noble/hashes 提供。
                </p>
              </>
            )}
          </Panel>
        }
      />
    </ToolView>
  );
}
