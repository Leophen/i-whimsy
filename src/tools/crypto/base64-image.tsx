'use client';

import * as React from 'react';
import { ImageDown, ImageUp } from 'lucide-react';

import { ClearButton, CopyButton, DownloadButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { FileDropzone } from '@/components/tool/file-dropzone';
import { SegmentedControl } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { fileToDataURL, guessExtension, renameWithExt } from '@/lib/core/browser';
import { splitDataUrl } from '@/lib/core/text';
import { formatBytes } from '@/lib/utils';

type Mode = 'toBase64' | 'toImage';

export default function Base64Image() {
  const tool = useToolMeta('base64-image');
  useTrackRecent(tool.slug);

  const [mode, setMode] = React.useState<Mode>('toBase64');
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [dataUrl, setDataUrl] = React.useState('');
  const [pasted, setPasted] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleFile = async (f: File) => {
    setError(null);
    setBusy(true);
    try {
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
      setFile(f);
      const durl = await fileToDataURL(f);
      setDataUrl(durl);
      setPasted(durl);
    } catch {
      setError('读取文件失败，请换一个文件试试');
    } finally {
      setBusy(false);
    }
  };

  const isBusy = busy;

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setDataUrl('');
    setPasted('');
    setError(null);
  };

  const parsedPaste = React.useMemo(() => splitDataUrl(pasted.trim()), [pasted]);

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <SegmentedControl
            size="sm"
            value={mode}
            onValueChange={setMode}
            options={[
              { value: 'toBase64', label: '图片 → Base64' },
              { value: 'toImage', label: 'Base64 → 图片' },
            ]}
          />
          <ClearButton onClear={reset} />
        </>
      }
    >
      {mode === 'toBase64' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="选择图片">
            <FileDropzone
              accept="image/*"
              onFile={handleFile}
              current={
                file ? { name: file.name, size: file.size, url: previewUrl ?? undefined } : null
              }
              onRemove={reset}
            />
            {file && (
              <div className="mt-3">
                <StatGrid
                  columns={2}
                  items={[
                    { label: '原文件大小', value: formatBytes(file.size) },
                    { label: 'Base64 长度', value: formatBytes(dataUrl.length), tone: 'primary' },
                  ]}
                />
                <Notice tone="info" className="mt-3">
                  Base64 会让体积膨胀约 33%，长字符串建议只在 CSS / HTML 里内联小图标使用。
                </Notice>
              </div>
            )}
          </Panel>

          <Panel
            title="Data URL"
            description="可直接写进 CSS、HTML 或 JSON"
            actions={
              <>
                <CopyButton value={dataUrl} sourceLabel="Data URL" size="xs">
                  复制
                </CopyButton>
                <DownloadButton
                  data={dataUrl}
                  filename="image.txt"
                  mimeType="text/plain"
                  sourceLabel="Base64 文本"
                  variant="secondary"
                  size="xs"
                >
                  下载 .txt
                </DownloadButton>
              </>
            }
          >
            {isBusy ? (
              <EmptyState icon={<ImageDown />} title="正在读取…" description="大文件需要一点时间" />
            ) : !dataUrl ? (
              <EmptyState
                icon={<ImageDown />}
                title="还没有图片"
                description="选择一张图片后自动生成 Data URL"
              />
            ) : (
              <>
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="预览"
                    className="mb-3 max-h-40 w-full rounded-xl border border-border object-contain bg-surface-2"
                  />
                )}
                <Textarea
                  value={dataUrl}
                  readOnly
                  className="min-h-40 font-mono text-[11px] leading-relaxed"
                  spellCheck={false}
                />
              </>
            )}
            {error && (
              <Notice tone="danger" className="mt-3">
                {error}
              </Notice>
            )}
          </Panel>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="粘贴 Data URL 或纯 Base64">
            <Textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="data:image/png;base64,iVBORw0KGgo..."
              className="min-h-56 font-mono text-[11px] leading-relaxed"
              spellCheck={false}
              aria-invalid={Boolean(pasted.trim()) && !parsedPaste}
            />
            {pasted.trim() && !parsedPaste && (
              <p className="mt-2 text-xs text-danger">
                不是合法的 Data URL，请以 data:image/...;base64, 开头
              </p>
            )}
          </Panel>

          <Panel
            title="还原结果"
            actions={
              parsedPaste && (
                <DownloadButton
                  data={pasted.trim()}
                  filename={renameWithExt('image', guessExtension(parsedPaste.mime))}
                  sourceLabel="图片"
                  size="xs"
                >
                  下载图片
                </DownloadButton>
              )
            }
          >
            {!parsedPaste ? (
              <EmptyState
                icon={<ImageUp />}
                title="等待输入"
                description="粘贴 Data URL 后即可还原并下载图片"
              />
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pasted.trim()}
                  alt="还原预览"
                  className="mb-3 max-h-56 w-full rounded-xl border border-border object-contain bg-surface-2"
                />
                <StatGrid
                  columns={2}
                  items={[
                    {
                      label: 'MIME 类型',
                      value: parsedPaste.mime.replace('image/', '').toUpperCase(),
                    },
                    {
                      label: '解码后体积',
                      value: formatBytes(Math.floor((parsedPaste.base64.length * 3) / 4)),
                      tone: 'primary',
                    },
                  ]}
                />
              </>
            )}
          </Panel>
        </div>
      )}

      <Notice tone="info">
        图片全程只在你自己的浏览器里读写，不会上传到任何服务器。大图（数 MB 以上）生成的 Data URL
        会很长，复制前先想清楚是否真的需要内联。
      </Notice>
    </ToolView>
  );
}
