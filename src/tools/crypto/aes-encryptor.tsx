'use client';

import * as React from 'react';
import { ArrowLeftRight } from 'lucide-react';

import { BusyOverlay, ClearButton, CopyButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl } from '@/components/ui/controls';
import { Field, Input, Textarea } from '@/components/ui/input';
import { aesDecrypt, aesEncrypt } from '@/lib/core/crypto';
import { byteSize } from '@/lib/core/text';
import { useAsyncComputed } from '@/lib/hooks';

const SAMPLE_TEXT = '这是一段需要加密的敏感文本。';

export default function AesEncryptor() {
  const tool = useToolMeta('aes-encryptor');
  useTrackRecent(tool.slug);

  const [mode, setMode] = React.useState<'encrypt' | 'decrypt'>('encrypt');
  const [key, setKey] = React.useState('iWhimsy-2026');
  const [input, setInput] = React.useState(SAMPLE_TEXT);
  const ready = Boolean(input.trim()) && Boolean(key);

  // PBKDF2 有 21 万次迭代，必须防抖后再算，否则每敲一个键都会卡一下
  const {
    value: result,
    error,
    pending: busy,
  } = useAsyncComputed(
    async () => {
      const trimmed = input.trim();
      if (mode === 'encrypt') return aesEncrypt(trimmed, key);
      const plain = await aesDecrypt(trimmed, key);
      if (!plain) throw new Error('解密结果为空');
      return plain;
    },
    [mode, key, input],
    { delay: 350, enabled: ready },
  );

  const output = result ?? '';
  // 解密失败统一换成人话：口令不对 / 密文不是本工具生成的 / 被改过都会走到这里
  const displayError = error
    ? mode === 'decrypt'
      ? '解密失败：口令不对，或密文不是由本工具生成的 / 已被篡改'
      : error
    : null;

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'encrypt' ? 'decrypt' : 'encrypt'))}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <ArrowLeftRight className="size-3.5" />
            反转方向
          </button>
          <ClearButton
            onClear={() => {
              setInput('');
              setKey('');
            }}
          />
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
        <SegmentedControl
          size="sm"
          value={mode}
          onValueChange={setMode}
          options={[
            { value: 'encrypt', label: '加密' },
            { value: 'decrypt', label: '解密' },
          ]}
        />
        <span className="text-xs text-muted-foreground">
          当前：
          <span className="text-foreground">
            {mode === 'encrypt' ? '明文 → 密文' : '密文 → 明文'}
          </span>
        </span>
      </div>

      <Field label="口令" hint="加密和解密必须使用同一个口令，口令丢失无法找回">
        <Input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="设置一个口令…"
          className="font-mono text-[13px]"
          spellCheck={false}
        />
      </Field>

      <ToolIO
        input={
          <Panel title={mode === 'encrypt' ? '明文' : '密文'}>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'encrypt' ? '输入要加密的文本…' : '粘贴 Base64 密文…'}
              className="min-h-52 font-mono text-[13px]"
              spellCheck={false}
              aria-invalid={Boolean(error)}
            />
          </Panel>
        }
        output={
          <Panel
            title={mode === 'encrypt' ? '密文' : '明文'}
            description={busy ? 'PBKDF2 派生密钥中…' : '每次加密都会生成新的盐值与 IV'}
            actions={
              <CopyButton value={output} sourceLabel="结果" size="xs">
                复制
              </CopyButton>
            }
            className="relative"
          >
            <BusyOverlay show={busy} label="计算中…" />
            {displayError ? (
              <Notice tone="danger">{displayError}</Notice>
            ) : (
              <>
                <StatGrid
                  columns={3}
                  items={[
                    { label: '输入长度', value: input.length },
                    { label: '输出长度', value: output.length, tone: 'primary' },
                    { label: '输入体积', value: `${byteSize(input)} B` },
                  ]}
                />
                <Textarea
                  value={output}
                  readOnly
                  placeholder={busy ? '计算中…' : '结果会显示在这里'}
                  className="mt-3 min-h-52 font-mono text-[13px]"
                  spellCheck={false}
                />
              </>
            )}
          </Panel>
        }
      />

      <Notice tone="info">
        <div className="space-y-1">
          <div>
            算法为 <strong>AES-256-GCM</strong>：密钥由口令经 <strong>PBKDF2-HMAC-SHA256</strong>{' '}
            派生 （21 万次迭代 + 16 字节随机盐），每次加密都生成新的 12 字节 IV。 GCM 自带完整性校验
            —— 口令错误或密文被改过一个字节，解密都会直接失败，而 CBC 做不到这一点。
          </div>
          <div>
            密文格式是{' '}
            <code className="font-mono">v1.&lt;salt&gt;.&lt;iv&gt;.&lt;ciphertext&gt;</code>，
            四段均为 Base64，盐值与 IV 随密文一起保存。同一段明文加密两次结果不同，这是设计如此。
          </div>
        </div>
      </Notice>
    </ToolView>
  );
}
