'use client';

import * as React from 'react';
import QRCode from 'qrcode';
import { useAsyncComputed } from '@/lib/hooks';
import { QrCode, Wifi } from 'lucide-react';

import { CopyButton, DownloadButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SliderRow } from '@/components/ui/controls';
import { Field, Input, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type ContentType = 'text' | 'url' | 'wifi' | 'tel';

const LEVELS = [
  { value: 'L', label: 'L · 7%' },
  { value: 'M', label: 'M · 15%' },
  { value: 'Q', label: 'Q · 25%' },
  { value: 'H', label: 'H · 30%' },
] as const;

const QUICK_COLORS = ['#000000', '#1d4ed8', '#0f766e', '#b91c1c', '#7c3aed', '#854d0e'];

export default function QrcodeGenerator() {
  const tool = useToolMeta('qrcode-generator');
  useTrackRecent(tool.slug);

  const [type, setType] = React.useState<ContentType>('url');
  const [text, setText] = React.useState('https://i-whimsy.vercel.app');
  const [ssid, setSsid] = React.useState('MyWiFi');
  const [password, setPassword] = React.useState('12345678');
  const [wifiEnc, setWifiEnc] = React.useState('WPA');
  const [tel, setTel] = React.useState('+86 138 0013 8000');

  const [size, setSize] = React.useState(320);
  const [level, setLevel] = React.useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [dark, setDark] = React.useState('#000000');
  const [light, setLight] = React.useState('#ffffff');

  const payload = React.useMemo(() => {
    switch (type) {
      case 'url':
        return text;
      case 'tel':
        return `tel:${tel.replace(/\s/g, '')}`;
      case 'wifi':
        return `WIFI:T:${wifiEnc};S:${ssid};P:${password};;`;
      case 'text':
      default:
        return text;
    }
  }, [type, text, ssid, password, wifiEnc, tel]);

  // 二维码生成是异步的，防抖 200ms，并丢弃过期结果
  const qr = useAsyncComputed(
    () =>
      QRCode.toDataURL(payload, {
        width: size,
        margin: 2,
        errorCorrectionLevel: level,
        color: { dark, light },
      }),
    [payload, size, level, dark, light],
    { delay: 200, enabled: Boolean(payload.trim()) },
  );

  const dataUrl = qr.value ?? '';
  const error = qr.error ? '生成失败，内容可能过长或包含不支持的字符' : null;

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <CopyButton value={payload} sourceLabel="二维码内容" variant="secondary">
            复制内容
          </CopyButton>
          <DownloadButton data={dataUrl} filename="qrcode.png" sourceLabel="二维码">
            下载 PNG
          </DownloadButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <Panel title="二维码内容">
            <SegmentedControl
              size="sm"
              full
              value={type}
              onValueChange={setType}
              options={[
                { value: 'url', label: '链接 / 文本' },
                { value: 'wifi', label: 'WiFi', icon: <Wifi className="size-3.5" /> },
                { value: 'tel', label: '电话' },
              ]}
            />

            <div className="mt-4 space-y-3.5">
              {type === 'wifi' ? (
                <>
                  <Field label="网络名称 SSID">
                    <Input
                      value={ssid}
                      onChange={(e) => setSsid(e.target.value)}
                      placeholder="WiFi 名称"
                    />
                  </Field>
                  <Field label="密码">
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="WiFi 密码"
                    />
                  </Field>
                  <Field label="加密方式">
                    <SegmentedControl
                      size="sm"
                      full
                      value={wifiEnc}
                      onValueChange={setWifiEnc}
                      options={[
                        { value: 'WPA', label: 'WPA/WPA2' },
                        { value: 'WEP', label: 'WEP' },
                        { value: 'nopass', label: '无密码' },
                      ]}
                    />
                  </Field>
                </>
              ) : type === 'tel' ? (
                <Field label="电话号码">
                  <Input
                    value={tel}
                    onChange={(e) => setTel(e.target.value)}
                    placeholder="+86 ..."
                  />
                </Field>
              ) : (
                <Field label={type === 'url' ? '链接或文本' : '文本内容'}>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="输入要编码的内容…"
                    className="min-h-32 font-mono text-[13px]"
                    spellCheck={false}
                  />
                </Field>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3">
              <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                实际编码内容
              </div>
              <code className="mt-1.5 block break-all font-mono text-[12px] text-foreground">
                {payload || '—'}
              </code>
            </div>
          </Panel>

          <Panel title="外观参数">
            <div className="space-y-4">
              <SliderRow
                label="尺寸"
                value={size}
                onChange={setSize}
                min={128}
                max={1024}
                step={32}
                suffix=" px"
              />

              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  纠错级别（越高越抗污损，但图案更密）
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {LEVELS.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => setLevel(l.value)}
                      className={cn(
                        'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                        level === l.value
                          ? 'border-primary bg-primary-subtle text-primary'
                          : 'border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground',
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">前景色</span>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="color"
                      value={dark}
                      onChange={(e) => setDark(e.target.value)}
                      aria-label="前景色"
                      className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-background p-1"
                    />
                    <div className="flex flex-wrap gap-1">
                      {QUICK_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-label={`前景色 ${c}`}
                          onClick={() => setDark(c)}
                          className="size-5 rounded border border-border transition-transform hover:scale-110"
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">背景色</span>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="color"
                      value={light}
                      onChange={(e) => setLight(e.target.value)}
                      aria-label="背景色"
                      className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-background p-1"
                    />
                    <code className="font-mono text-[11px] text-muted-foreground">{light}</code>
                  </div>
                </div>
              </div>

              {dark.toLowerCase() === light.toLowerCase() && (
                <Notice tone="warning">前景色和背景色相同，扫码将无法识别</Notice>
              )}
            </div>
          </Panel>
        </div>

        <Panel title="二维码预览">
          {error ? (
            <Notice tone="danger">{error}</Notice>
          ) : !dataUrl ? (
            <EmptyState icon={<QrCode />} title="等待输入" description="填入内容后自动生成二维码" />
          ) : (
            <>
              <div className="flex items-center justify-center rounded-xl border border-border bg-surface-2 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dataUrl}
                  alt="生成的二维码"
                  className="max-w-full rounded-lg"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <div className="mt-3">
                <StatGrid
                  columns={2}
                  items={[
                    { label: '内容长度', value: `${payload.length} 字符` },
                    { label: '纠错级别', value: level, tone: 'primary' },
                  ]}
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                二维码容量有限：内容越长，图案越密，扫码成功率越低。
                长文本建议先生成短链再转二维码。
              </p>
            </>
          )}
        </Panel>
      </div>
    </ToolView>
  );
}
