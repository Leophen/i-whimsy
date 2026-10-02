'use client';

import * as React from 'react';

import { CopyButton, DownloadButton } from '@/components/tool/bits';
import { Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SwitchRow } from '@/components/ui/controls';
import {
  exportCssVariables,
  exportDesignTokens,
  exportTailwindConfig,
  generateDarkScale,
  generateOklchScale,
  generateSemanticPalettes,
  isValidColor,
  type ColorScale,
  type WcagLevel,
} from '@/lib/core/color';

const BRAND_PRESETS = [
  { id: 'indigo', name: '靛青', color: '#6366f1' },
  { id: 'violet', name: '紫罗兰', color: '#8b5cf6' },
  { id: 'rose', name: '玫红', color: '#f43f5e' },
  { id: 'emerald', name: '祖母绿', color: '#10b981' },
  { id: 'amber', name: '琥珀', color: '#f59e0b' },
  { id: 'sky', name: '天青', color: '#0ea5e9' },
  { id: 'slate', name: '石板', color: '#64748b' },
  { id: 'orange', name: '活力橙', color: '#f97316' },
];

function ContrastBadge({ level }: { level: WcagLevel }) {
  const tone =
    level === 'AAA' || level === 'AA'
      ? 'text-success border-success/30 bg-success-subtle'
      : level === 'AA Large'
        ? 'text-warning border-warning/30 bg-warning-subtle'
        : 'text-danger border-danger/30 bg-danger-subtle';
  return (
    <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>
      {level}
    </span>
  );
}

function ScaleRow({ name, scale, dark }: { name: string; scale: ColorScale[]; dark?: boolean }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{name}</p>
      <div className="flex overflow-hidden rounded-xl">
        {scale.map((s) => (
          <button
            key={s.step}
            type="button"
            className="group relative flex-1"
            style={{ background: s.hex, minHeight: 48 }}
            title={`${s.step}: ${s.hex}`}
            onClick={() => navigator.clipboard.writeText(s.hex)}
          >
            <span className="absolute inset-x-0 bottom-0 bg-black/40 px-0.5 py-0.5 text-center text-[9px] text-white opacity-0 transition-opacity group-hover:opacity-100">
              {s.step}
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {scale.map((s) => {
          const c = dark ? s.contrastOnWhite : s.contrastOnBlack;
          return c ? (
            <ContrastBadge key={s.step} level={c.level} />
          ) : null;
        })}
      </div>
    </div>
  );
}

function UiPreview({ scale, dark }: { scale: ColorScale[]; dark: boolean }) {
  const primary = scale.find((s) => s.step === 500)?.hex ?? scale[4]?.hex ?? '#6366f1';
  const surface = scale.find((s) => s.step === (dark ? 900 : 50))?.hex ?? '#f8fafc';
  const border = scale.find((s) => s.step === (dark ? 700 : 200))?.hex ?? '#e2e8f0';
  const text = scale.find((s) => s.step === (dark ? 50 : 900))?.hex ?? '#0f172a';

  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: surface, borderColor: border, color: text }}
    >
      <p className="mb-3 text-sm font-semibold">UI 预览</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
          style={{ background: primary }}
        >
          主要按钮
        </button>
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 text-xs"
          style={{ borderColor: border, color: text }}
        >
          次要按钮
        </button>
      </div>
      <div className="mt-3 rounded-lg border p-3" style={{ borderColor: border }}>
        <p className="text-xs font-medium">卡片标题</p>
        <p className="mt-1 text-[11px] opacity-70">这是一段示例描述文字。</p>
      </div>
      <div
        className="mt-2 rounded-lg px-3 py-2 text-[11px]"
        style={{ background: scale.find((s) => s.step === 100)?.hex, color: text }}
      >
        提示：配色已按 WCAG 对比度校验。
      </div>
    </div>
  );
}

export default function ColorSystem() {
  const tool = useToolMeta('color-system');
  useTrackRecent(tool.slug);

  const [baseColor, setBaseColor] = React.useState('#6366f1');
  const [darkMode, setDarkMode] = React.useState(false);
  const [exportTab, setExportTab] = React.useState('css');

  const lightScale = React.useMemo(
    () => (isValidColor(baseColor) ? generateOklchScale(baseColor) : []),
    [baseColor],
  );
  const darkScale = React.useMemo(
    () => (lightScale.length ? generateDarkScale(lightScale) : []),
    [lightScale],
  );
  const semantic = React.useMemo(() => generateSemanticPalettes(), []);
  const activeScale = darkMode ? darkScale : lightScale;

  const exportContent = React.useMemo(() => {
    if (!lightScale.length) return '';
    if (exportTab === 'css') return exportCssVariables('primary', lightScale, darkScale);
    if (exportTab === 'tailwind') return exportTailwindConfig('primary', lightScale);
    return exportDesignTokens('primary', lightScale);
  }, [lightScale, darkScale, exportTab]);

  return (
    <ToolView tool={tool}>
      <div className="flex flex-col gap-4">
        <Panel title="主色">
          <div className="flex flex-wrap items-center gap-4">
            <input
              type="color"
              value={baseColor}
              onChange={(e) => setBaseColor(e.target.value)}
              className="size-12 cursor-pointer rounded-lg border border-border"
            />
            <input
              type="text"
              value={baseColor}
              onChange={(e) => setBaseColor(e.target.value)}
              className="h-10 w-32 rounded-lg border border-border bg-background px-3 font-mono text-sm"
              placeholder="#6366f1"
            />
            <SwitchRow label="深色模式预览" checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {BRAND_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setBaseColor(p.color)}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                  baseColor.toLowerCase() === p.color
                    ? 'border-primary bg-primary-subtle text-primary'
                    : 'border-border hover:border-border-strong'
                }`}
              >
                <span className="size-4 rounded-md border border-border" style={{ background: p.color }} />
                {p.name}
              </button>
            ))}
          </div>
        </Panel>

        {!isValidColor(baseColor) && (
          <Notice tone="warning">请输入有效的十六进制色值，例如 #6366f1</Notice>
        )}

        {activeScale.length > 0 && (
          <>
            <Panel title="主色色阶">
              <ScaleRow name="Primary" scale={activeScale} dark={darkMode} />
            </Panel>

            <Panel title="语义色">
              <div className="grid gap-4 md:grid-cols-2">
                <ScaleRow name="成功" scale={semantic.success} />
                <ScaleRow name="警告" scale={semantic.warning} />
                <ScaleRow name="危险" scale={semantic.danger} />
                <ScaleRow name="信息" scale={semantic.info} />
              </div>
            </Panel>

            <Panel title="组件预览">
              <UiPreview scale={activeScale} dark={darkMode} />
            </Panel>

            <Panel title="导出">
              <SegmentedControl
                value={exportTab}
                onValueChange={setExportTab}
                options={[
                  { value: 'css', label: 'CSS 变量' },
                  { value: 'tailwind', label: 'Tailwind' },
                  { value: 'json', label: 'JSON 令牌' },
                ]}
              />
              <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs">
                {exportContent}
              </pre>
              <div className="mt-2 flex flex-wrap gap-2">
                <CopyButton value={exportContent} sourceLabel="导出内容" />
                <DownloadButton
                  data={new Blob([exportContent], { type: 'text/plain;charset=utf-8' })}
                  filename={`color-system.${exportTab === 'json' ? 'json' : exportTab === 'tailwind' ? 'js' : 'css'}`}
                  variant="secondary"
                  sourceLabel="导出文件"
                >
                  下载文件
                </DownloadButton>
              </div>
            </Panel>
          </>
        )}
      </div>
    </ToolView>
  );
}
