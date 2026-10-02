'use client';

import * as React from 'react';

import { CopyButton, CopyIconButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SliderRow } from '@/components/ui/controls';
import { Field, Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/card';
import { computeClamp, round } from '@/lib/core/css';
import { cn } from '@/lib/utils';

const BREAKPOINTS = [320, 375, 480, 768, 1024, 1280, 1440, 1920];

export default function ClampCalculator() {
  const tool = useToolMeta('clamp-calculator');
  useTrackRecent(tool.slug);

  const [minSize, setMinSize] = React.useState(16);
  const [maxSize, setMaxSize] = React.useState(32);
  const [minVw, setMinVw] = React.useState(375);
  const [maxVw, setMaxVw] = React.useState(1440);
  const [precision, setPrecision] = React.useState(4);

  const result = React.useMemo(
    () => computeClamp({ minSize, maxSize, minViewport: minVw, maxViewport: maxVw, precision }),
    [minSize, maxSize, minVw, maxVw, precision],
  );

  const scaleAt = (vw: number) => {
    const t = (vw - minVw) / (maxVw - minVw || 1);
    return round(Math.min(maxSize, Math.max(minSize, minSize + (maxSize - minSize) * t)), 2);
  };

  const invalidRange = maxVw <= minVw;
  const invalidSize = maxSize < minSize;

  const cssRule = `font-size: ${result.css};`;

  return (
    <ToolView
      tool={tool}
      actions={
        <CopyButton value={cssRule} sourceLabel="CSS 代码" variant="secondary">
          复制 CSS
        </CopyButton>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <Panel title="参数" bodyClassName="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="最小字号 (rem)">
              <Input
                type="number"
                value={minSize}
                onChange={(e) => setMinSize(Number(e.target.value))}
                step={0.25}
                className="tabular font-mono text-[13px]"
              />
            </Field>
            <Field label="最大字号 (rem)">
              <Input
                type="number"
                value={maxSize}
                onChange={(e) => setMaxSize(Number(e.target.value))}
                step={0.25}
                className="tabular font-mono text-[13px]"
              />
            </Field>
          </div>

          <SliderRow
            label="最小字号"
            value={minSize}
            onChange={setMinSize}
            min={8}
            max={48}
            step={0.25}
            suffix=" rem"
          />
          <SliderRow
            label="最大字号"
            value={maxSize}
            onChange={setMaxSize}
            min={8}
            max={96}
            step={0.25}
            suffix=" rem"
          />

          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3.5">
            <Field label="起始视口 (px)" hint="字号开始缩放的位置">
              <Input
                type="number"
                value={minVw}
                onChange={(e) => setMinVw(Number(e.target.value))}
                step={1}
                className="tabular font-mono text-[13px]"
                aria-invalid={invalidRange}
              />
            </Field>
            <Field label="结束视口 (px)" hint="字号停止缩放的位置">
              <Input
                type="number"
                value={maxVw}
                onChange={(e) => setMaxVw(Number(e.target.value))}
                step={1}
                className="tabular font-mono text-[13px]"
                aria-invalid={invalidRange}
              />
            </Field>
          </div>

          <SliderRow
            label="保留小数位"
            value={precision}
            onChange={setPrecision}
            min={2}
            max={6}
            suffix=" 位"
          />

          {(invalidRange || invalidSize) && (
            <Notice tone="warning">
              {invalidRange
                ? '结束视口必须大于起始视口，否则无法插值'
                : '最大字号小于最小字号，已按反向缩放计算'}
            </Notice>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel
            title="生成的 CSS"
            actions={
              <CopyButton value={cssRule} sourceLabel="CSS" size="xs">
                复制
              </CopyButton>
            }
          >
            <pre className="overflow-auto rounded-xl border border-primary/25 bg-primary-subtle p-4 font-mono text-[13px] leading-relaxed text-primary">
              {cssRule}
            </pre>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2">
                <span className="text-[11px] font-medium text-muted-foreground">等效写法</span>
                <code className="min-w-0 flex-1 truncate text-right font-mono text-[12px]">
                  clamp({round(minSize, 2)}rem, {result.preferredRem}rem{' '}
                  {result.vwCoefficient < 0 ? '-' : '+'} {Math.abs(result.vwCoefficient)}vw,{' '}
                  {round(maxSize, 2)}rem)
                </code>
                <CopyIconButton value={result.css} sourceLabel="clamp 值" />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2">
                <span className="text-[11px] font-medium text-muted-foreground">vw 系数</span>
                <code className="font-mono text-[12px]">{result.vwCoefficient} rem / 100vw</code>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2">
                <span className="text-[11px] font-medium text-muted-foreground">基准值</span>
                <code className="font-mono text-[12px]">{result.preferredRem} rem</code>
              </div>
            </div>
          </Panel>

          <Panel title="实时预览" description="拖动浏览器窗口宽度，标题会平滑缩放">
            <div className="rounded-xl border border-border bg-background p-5">
              <div
                className="font-semibold"
                style={{
                  fontSize: `clamp(${minSize}rem, ${result.preferredRem}rem ${result.vwCoefficient < 0 ? '-' : '+'} ${Math.abs(result.vwCoefficient)}vw, ${maxSize}rem)`,
                }}
              >
                流体排版标题
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                这段文字是固定 16px，用来对比上面标题的缩放效果。
              </p>
            </div>
          </Panel>

          <Panel title="各断点实际字号" description="按视口宽度列出 clamp 的计算结果">
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-surface-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-3 py-2">视口宽度</th>
                    <th className="px-3 py-2">字号 (rem)</th>
                    <th className="px-3 py-2">字号 (px)</th>
                    <th className="px-3 py-2">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {BREAKPOINTS.map((vw) => {
                    const size = scaleAt(vw);
                    const clamped = vw <= minVw || vw >= maxVw;
                    return (
                      <tr key={vw} className={cn('border-t border-border')}>
                        <td className="tabular px-3 py-1.5 font-mono">{vw}px</td>
                        <td className="tabular px-3 py-1.5 font-mono font-medium text-primary">
                          {size}
                        </td>
                        <td className="tabular px-3 py-1.5 font-mono text-muted-foreground">
                          {round(size * 16, 1)}
                        </td>
                        <td className="px-3 py-1.5">
                          <Badge variant={clamped ? 'neutral' : 'success'} size="sm">
                            {vw <= minVw ? '最小值' : vw >= maxVw ? '最大值' : '线性缩放'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <StatGrid
            columns={3}
            items={[
              { label: '缩放区间', value: `${minVw} → ${maxVw}px` },
              { label: '字号区间', value: `${minSize} → ${maxSize}rem`, tone: 'primary' },
              { label: '变化倍率', value: `${round(maxSize / (minSize || 1), 2)}×` },
            ]}
          />
        </div>
      </div>

      <Notice tone="info">
        <div className="space-y-1">
          <div>
            原理：把字号当成视口宽度的线性函数。斜率 = (最大字号 − 最小字号) ÷ (最大视口 −
            最小视口)， 截距 = 最小字号 − 斜率 × 最小视口。clamp 负责在区间外夹住边界值。
          </div>
          <div>
            用 rem 而不是 px，是为了尊重用户设置的浏览器默认字号 —— 这是无障碍的基本要求。 别写{' '}
            <code className="font-mono">max()</code> 兜底之外的{' '}
            <code className="font-mono">!important</code>。
          </div>
        </div>
      </Notice>
    </ToolView>
  );
}
