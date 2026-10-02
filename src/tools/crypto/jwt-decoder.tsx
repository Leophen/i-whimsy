'use client';

import * as React from 'react';
import { ShieldCheck } from 'lucide-react';

import { ClearButton, CopyButton, CopyIconButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/card';
import { parseJwt } from '@/lib/core/encoding';
import { formatDateTime } from '@/lib/core/datetime';
import { cn } from '@/lib/utils';

const SAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ikxlb3BoZW4iLCJpYXQiOjE3NTkzNDQwMDAsImV4cCI6MTc5NTM0NDAwMH0.dQw4w9WgXcQdQw4w9WgXcQdQw4w9WgXcQdQw4w9Wg';

const CLAIM_HINTS: Record<string, string> = {
  iss: '签发者',
  sub: '主题（通常是用户 ID）',
  aud: '受众',
  exp: '过期时间',
  nbf: '生效时间',
  iat: '签发时间',
  jti: '令牌唯一 ID',
  scope: '权限范围',
  roles: '角色',
};

export default function JwtDecoder() {
  const tool = useToolMeta('jwt-decoder');
  useTrackRecent(tool.slug);

  const [token, setToken] = React.useState(SAMPLE);
  const parsed = React.useMemo(() => parseJwt(token), [token]);

  const segments = React.useMemo(() => token.trim().split('.'), [token]);
  const shapeOk = segments.length === 3;

  const payloadClaims = React.useMemo(() => {
    if (!parsed?.payload || typeof parsed.payload !== 'object') return null;
    return Object.entries(parsed.payload as Record<string, unknown>);
  }, [parsed]);

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <ClearButton onClear={() => setToken('')} />
          <CopyButton value={token} sourceLabel="JWT" variant="secondary">
            复制令牌
          </CopyButton>
        </>
      }
    >
      <Panel title="粘贴 JWT" description="三段式令牌：Header.Payload.Signature">
        <Textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="eyJhbGciOi..."
          className="min-h-28 font-mono text-[13px]"
          spellCheck={false}
          aria-invalid={Boolean(token.trim()) && !shapeOk}
        />
        {token.trim() && !shapeOk && (
          <p className="mt-2 text-xs text-danger">
            JWT 应由三段以点号分隔的字符串组成，当前是 {segments.length} 段
          </p>
        )}
      </Panel>

      {!token.trim() ? (
        <EmptyState
          icon={<ShieldCheck />}
          title="等待输入"
          description="粘贴一个 JWT 即可解析 Header 与 Payload"
        />
      ) : parsed?.error ? (
        <Notice tone="danger">解析失败：{parsed.error}</Notice>
      ) : parsed && shapeOk ? (
        <>
          <Panel title="令牌状态">
            <StatGrid
              columns={3}
              items={[
                {
                  label: '是否过期',
                  value:
                    parsed.expired === null ? '未设置 exp' : parsed.expired ? '已过期' : '有效',
                  tone: parsed.expired === null ? 'default' : parsed.expired ? 'danger' : 'success',
                  hint: parsed.expiresAt ? formatDateTime(parsed.expiresAt) : undefined,
                },
                {
                  label: '签发时间',
                  value: parsed.issuedAt ? formatDateTime(parsed.issuedAt) : '—',
                },
                {
                  label: '生效时间',
                  value: parsed.notBefore ? formatDateTime(parsed.notBefore) : '—',
                },
              ]}
            />
          </Panel>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel
              title="Header"
              description="alg 与 typ"
              actions={
                <CopyIconButton
                  value={JSON.stringify(parsed.header, null, 2)}
                  sourceLabel="Header"
                />
              }
            >
              <pre className="max-h-64 overflow-auto rounded-xl border border-border bg-background p-3.5 font-mono text-[12px] leading-relaxed">
                {JSON.stringify(parsed.header, null, 2)}
              </pre>
            </Panel>

            <Panel
              title="Payload"
              description="业务声明"
              actions={
                <CopyIconButton
                  value={JSON.stringify(parsed.payload, null, 2)}
                  sourceLabel="Payload"
                />
              }
            >
              <pre className="max-h-64 overflow-auto rounded-xl border border-border bg-background p-3.5 font-mono text-[12px] leading-relaxed">
                {JSON.stringify(parsed.payload, null, 2)}
              </pre>
            </Panel>
          </div>

          {payloadClaims && payloadClaims.length > 0 && (
            <Panel title="声明释义" description="标准 JWT 字段的含义">
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-surface-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th className="px-3 py-2">字段</th>
                      <th className="px-3 py-2">值</th>
                      <th className="px-3 py-2">含义</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payloadClaims.map(([k, v], i) => {
                      const isTime = ['exp', 'iat', 'nbf'].includes(k) && typeof v === 'number';
                      return (
                        <tr
                          key={k}
                          className={cn('border-t border-border', i % 2 === 1 && 'bg-surface-2/40')}
                        >
                          <td className="px-3 py-2 font-mono text-primary">{k}</td>
                          <td className="max-w-0 truncate px-3 py-2 font-mono">
                            {isTime ? formatDateTime(new Date((v as number) * 1000)) : String(v)}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {CLAIM_HINTS[k] ?? '自定义字段'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          <Panel title="Signature" description="签名段（Base64URL，无法在前端验签）">
            <code className="block break-all rounded-xl border border-border bg-background p-3.5 font-mono text-[12px] text-muted-foreground">
              {parsed.signature}
            </code>
          </Panel>

          <Notice tone="warning">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Badge variant="warning" size="sm">
                  注意
                </Badge>
                这里只做 Base64 解码与展示，<strong>不会也无法校验签名</strong> ——
                验签需要密钥或公钥，那属于服务端职责。
              </div>
              <div>令牌全程在你本地解析，不会发送到任何服务器。</div>
            </div>
          </Notice>
        </>
      ) : null}
    </ToolView>
  );
}
