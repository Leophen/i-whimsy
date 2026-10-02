'use client';

import * as React from 'react';
import { Fingerprint } from 'lucide-react';

import { ClearButton, CopyButton, CopyIconButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { FileDropzone } from '@/components/tool/file-dropzone';
import { SegmentedControl, SwitchRow } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/card';
import { fileToArrayBuffer } from '@/lib/core/browser';
import { useAsyncComputed } from '@/lib/hooks';
import { HASH_ALGORITHMS, digest, digestFile, type HashAlgorithm } from '@/lib/core/crypto';
import { byteSize } from '@/lib/core/text';
import { formatBytes } from '@/lib/utils';

const SAMPLE = 'iWhimsy';

export default function HashGenerator() {
  const tool = useToolMeta('hash-generator');
  useTrackRecent(tool.slug);

  const [source, setSource] = React.useState<'text' | 'file'>('text');
  const [text, setText] = React.useState(SAMPLE);
  const [file, setFile] = React.useState<File | null>(null);
  const [algorithm, setAlgorithm] = React.useState<HashAlgorithm>('SHA256');
  const [upper, setUpper] = React.useState(false);

  // 文件摘要：读文件 + 算摘要都是异步的，走同一套防抖 / 竞态处理
  const fileResult = useAsyncComputed(
    async () => {
      if (!file) throw new Error('没有选择文件');
      const buf = await fileToArrayBuffer(file);
      return digestFile(buf, algorithm);
    },
    [file, algorithm],
    { delay: 0, enabled: Boolean(file) },
  );

  // 文本摘要：Web Crypto 是异步的，200ms 防抖避免每敲一个键都算一遍
  const textResult = useAsyncComputed(async () => digest(text, algorithm), [text, algorithm], {
    delay: 200,
    enabled: source === 'text' && Boolean(text),
  });

  const digestValue = source === 'file' ? (fileResult.value ?? '') : (textResult.value ?? '');
  const activeError = source === 'file' ? fileResult.error : textResult.error;
  const busy = source === 'file' ? fileResult.pending : textResult.pending;

  const display = upper ? digestValue.toUpperCase() : digestValue;

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <SegmentedControl
            size="sm"
            value={source}
            onValueChange={setSource}
            options={[
              { value: 'text', label: '文本' },
              { value: 'file', label: '文件' },
            ]}
          />
          <ClearButton
            onClear={() => {
              setText('');
              setFile(null);
            }}
          />
        </>
      }
    >
      <ToolIO
        split="wide-input"
        input={
          <Panel title={source === 'text' ? '输入文本' : '选择文件'}>
            {source === 'text' ? (
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="输入要计算摘要的文本…"
                className="min-h-40 font-mono text-[13px]"
                spellCheck={false}
              />
            ) : (
              <FileDropzone
                accept="*/*"
                hint="文件按字节在本地读取，不会上传"
                onFile={setFile}
                current={file ? { name: file.name, size: file.size } : null}
                onRemove={() => setFile(null)}
              />
            )}

            <div className="mt-4 space-y-3">
              <div>
                <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  摘要算法
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {HASH_ALGORITHMS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      title={a.note}
                      onClick={() => setAlgorithm(a.id)}
                      className={
                        algorithm === a.id
                          ? 'rounded-lg border border-primary bg-primary-subtle px-3 py-1.5 text-xs font-medium text-primary'
                          : 'rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground'
                      }
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {HASH_ALGORITHMS.find((a) => a.id === algorithm)?.note}
                </p>
              </div>

              <SwitchRow
                label="大写输出"
                checked={upper}
                onCheckedChange={setUpper}
                className="border-t border-border pt-3"
              />
            </div>
          </Panel>
        }
        output={
          <Panel
            title="摘要结果"
            description={`${algorithm} · ${digestValue.length / 2} 字节`}
            actions={
              <CopyButton value={display} sourceLabel="摘要" size="xs">
                复制
              </CopyButton>
            }
          >
            {!display ? (
              <EmptyState
                icon={<Fingerprint />}
                title={busy ? '计算中…' : '还没有内容'}
                description={busy ? '大文件需要一点时间' : '输入文本或选择文件后自动生成摘要'}
              />
            ) : (
              <>
                <div className="rounded-xl border border-primary/25 bg-primary-subtle p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {algorithm}
                    </span>
                    <CopyIconButton value={display} sourceLabel="摘要" />
                  </div>
                  <code className="mt-1.5 block break-all font-mono text-[13px] leading-relaxed text-primary">
                    {display}
                  </code>
                </div>

                <StatGrid
                  columns={2}
                  className="mt-3"
                  items={[
                    { label: '摘要长度', value: `${digestValue.length} 字符` },
                    {
                      label: '输入体积',
                      value:
                        source === 'text'
                          ? formatBytes(byteSize(text))
                          : formatBytes(file?.size ?? 0),
                    },
                  ]}
                />
              </>
            )}
            {activeError && (
              <Notice tone="danger" className="mt-3">
                {activeError}
              </Notice>
            )}
          </Panel>
        }
      />

      <Notice tone="info">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="neutral" size="sm">
              实现方式
            </Badge>
            SHA-1 / SHA-256 / SHA-512 走浏览器原生 <code className="font-mono">crypto.subtle</code>
            ， MD5 / SHA3-256 / RIPEMD-160 由 @noble/hashes 提供 —— Web Crypto 不支持这几种。
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="warning" size="sm">
              安全提示
            </Badge>
            MD5 与 SHA-1
            已被证实存在碰撞攻击，不要用于密码存储或安全校验；仅用于文件完整性比对和兼容遗留系统。
            密码存储请使用 bcrypt / scrypt / Argon2 一类专门的口令哈希算法。
          </div>
        </div>
      </Notice>
    </ToolView>
  );
}
