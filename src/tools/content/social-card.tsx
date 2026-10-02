'use client';

import * as React from 'react';

import { DownloadButton } from '@/components/tool/bits';
import { Button } from '@/components/ui/button';
import { downloadFile } from '@/lib/core/browser';
import { Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { FileDropzone } from '@/components/tool/file-dropzone';
import { SegmentedControl, SliderRow, SwitchRow } from '@/components/ui/controls';
import {
  CARD_LAYOUTS,
  cardToBlob,
  GRADIENT_PRESETS,
  renderSocialCard,
  SOCIAL_PLATFORMS,
  type CardContent,
  type CardStyle,
} from '@/lib/core/social-card';
import { loadImageFromSrc } from '@/lib/core/image';

export default function SocialCard() {
  const tool = useToolMeta('social-card');
  useTrackRecent(tool.slug);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [content, setContent] = React.useState<CardContent>({
    title: '你的标题在这里',
    subtitle: '副标题或简短描述',
    tag: 'NEW',
  });
  const [style, setStyle] = React.useState<CardStyle>({
    platformId: 'wechat',
    layoutId: 'center',
    gradientId: 'violet',
    bgBlur: 0,
    bgDarken: 0.35,
    fontWeight: 'bold',
    textColor: '#ffffff',
  });
  const [bgImage, setBgImage] = React.useState<HTMLImageElement | null>(null);
  const [bgFile, setBgFile] = React.useState<{ name: string; size: number; url: string } | null>(
    null,
  );
  const [exportScale, setExportScale] = React.useState(1);
  const [blob, setBlob] = React.useState<Blob | null>(null);

  const platform = SOCIAL_PLATFORMS.find((p) => p.id === style.platformId) ?? SOCIAL_PLATFORMS[0];

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderSocialCard(canvas, content, { ...style, backgroundImage: bgImage }, 1);
  }, [content, style, bgImage]);

  const handleBgFile = async (file: File) => {
    if (bgFile?.url) URL.revokeObjectURL(bgFile.url);
    const url = URL.createObjectURL(file);
    const img = await loadImageFromSrc(url);
    setBgImage(img);
    setBgFile({ name: file.name, size: file.size, url });
  };

  const handleExport = async (scale: number) => {
    const b = await cardToBlob(content, { ...style, backgroundImage: bgImage }, scale);
    setBlob(b);
    setExportScale(scale);
    const name = `social-card-${platform.id}${scale > 1 ? '@2x' : ''}.png`;
    downloadFile(b, name, 'image/png');
  };

  const patchStyle = (partial: Partial<CardStyle>) => setStyle((s) => ({ ...s, ...partial }));

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <Button variant="primary" size="sm" onClick={() => handleExport(1)}>
            导出 1×
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport(2)}>
            导出 2×
          </Button>
          {blob && (
            <DownloadButton
              data={blob}
              filename={`social-card-${platform.id}${exportScale > 1 ? '@2x' : ''}.png`}
              sourceLabel="封面图"
            />
          )}
        </>
      }
    >
      <ToolIO
        split="wide-input"
        input={
          <div className="flex flex-col gap-4">
            <Panel title="平台与版式">
              <SegmentedControl
                value={style.platformId}
                onValueChange={(v) => patchStyle({ platformId: v })}
                options={SOCIAL_PLATFORMS.map((p) => ({
                  value: p.id,
                  label: p.name,
                }))}
                className="mb-3"
              />
              <div className="grid grid-cols-3 gap-2">
                {CARD_LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => patchStyle({ layoutId: l.id })}
                    className={`rounded-lg border px-2 py-2 text-xs transition-colors ${
                      style.layoutId === l.id
                        ? 'border-primary bg-primary-subtle text-primary'
                        : 'border-border hover:border-border-strong'
                    }`}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="文案">
              <div className="space-y-3">
                <label className="block text-xs text-muted-foreground">
                  标题
                  <input
                    value={content.title}
                    onChange={(e) => setContent((c) => ({ ...c, title: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs text-muted-foreground">
                  副标题
                  <input
                    value={content.subtitle}
                    onChange={(e) => setContent((c) => ({ ...c, subtitle: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs text-muted-foreground">
                  标签（可选）
                  <input
                    value={content.tag ?? ''}
                    onChange={(e) => setContent((c) => ({ ...c, tag: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </Panel>

            <Panel title="背景">
              <div className="mb-3 flex flex-wrap gap-2">
                {GRADIENT_PRESETS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setBgImage(null);
                      patchStyle({ gradientId: g.id });
                    }}
                    className={`h-8 w-12 rounded-lg border-2 transition-all ${
                      !bgImage && style.gradientId === g.id
                        ? 'border-primary scale-105'
                        : 'border-transparent'
                    }`}
                    style={{
                      background: `linear-gradient(${g.angle}deg, ${g.colors[0]}, ${g.colors[1]})`,
                    }}
                    title={g.name}
                  />
                ))}
              </div>
              <FileDropzone
                onFile={handleBgFile}
                hint="或上传背景图"
                current={bgFile}
                onRemove={() => {
                  if (bgFile?.url) URL.revokeObjectURL(bgFile.url);
                  setBgFile(null);
                  setBgImage(null);
                }}
              />
              {bgImage && (
                <>
                  <SliderRow
                    label="模糊"
                    value={style.bgBlur}
                    onChange={(v) => patchStyle({ bgBlur: v })}
                    min={0}
                    max={20}
                    className="mt-3"
                  />
                  <SliderRow
                    label="压暗"
                    value={Math.round(style.bgDarken * 100)}
                    onChange={(v) => patchStyle({ bgDarken: v / 100 })}
                    min={0}
                    max={70}
                    suffix="%"
                    className="mt-2"
                  />
                </>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  文字颜色
                  <input
                    type="color"
                    value={style.textColor}
                    onChange={(e) => patchStyle({ textColor: e.target.value })}
                    className="size-8 cursor-pointer rounded border border-border"
                  />
                </label>
                <SwitchRow
                  label="粗体标题"
                  checked={style.fontWeight === 'bold'}
                  onCheckedChange={(v) => patchStyle({ fontWeight: v ? 'bold' : 'normal' })}
                />
              </div>
            </Panel>
          </div>
        }
        output={
          <Panel
            title="预览"
            description={`${platform.width} × ${platform.height}px · 虚线为安全区`}
            bodyClassName="flex justify-center"
          >
            <canvas
              ref={canvasRef}
              className="max-w-full rounded-xl border border-border shadow-sm"
              style={{ aspectRatio: `${platform.width}/${platform.height}` }}
            />
          </Panel>
        }
      />
    </ToolView>
  );
}
