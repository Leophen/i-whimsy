'use client';

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Package,
  Sparkles,
  TriangleAlert,
  Workflow,
} from 'lucide-react';

import { Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { Badge } from '@/components/ui/card';
import { TOOL_SPECS } from '@/config/tool-specs';
import { getCategory } from '@/config/tools';
import { EFFORT_LABEL } from '@/lib/tool-spec';
import { cn } from '@/lib/utils';

/**
 * ToolPlaceholder —— 未实现工具的占位页。
 *
 * 这不是一个「敬请期待」的空壳：它把该工具的实现规格（技术路线、依赖体积、
 * 实现步骤、已知坑、验收标准）完整渲染出来，让后续接手的人打开页面就知道怎么做。
 * 规格数据来自 src/config/tool-specs.ts。
 */
export default function ToolPlaceholder({ slug }: { slug: string }) {
  const tool = useToolMeta(slug);
  useTrackRecent(tool.slug);

  const spec = TOOL_SPECS[slug];
  const category = getCategory(tool.category);

  if (!spec) {
    // 构建期就该拦住：planned 的工具必须有规格，不允许出现「占位但没方案」的空壳
    throw new Error(`工具 ${slug} 标记为 planned，但在 tool-specs.ts 里找不到实现规格`);
  }

  return (
    <ToolView
      tool={tool}
      footer={
        <p className="text-xs leading-relaxed text-muted-foreground">
          这份规格随代码一起维护在{' '}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono">
            src/config/tool-specs.ts
          </code>
          。实现完成后，把该工具的 status 改成 ready，并在{' '}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono">
            src/tools/registry.tsx
          </code>{' '}
          里挂上真实组件即可。
        </p>
      }
    >
      {/* 状态条 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-warning/25 bg-warning-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-warning" />
          <span className="text-sm font-semibold text-warning">开发中</span>
        </div>
        <span className="text-xs text-warning/90">
          这是一个带完整实现规格的占位页，下面的内容是给实现者的技术方案。
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Badge variant="neutral" size="sm">
            {category.name}
          </Badge>
          <Badge variant="outline" size="sm">
            预估投入 {EFFORT_LABEL[spec.effort]}
          </Badge>
        </div>
      </div>

      <ToolIO
        split="even"
        input={
          <div className="flex flex-col gap-4">
            <Panel title="技术路线">
              <p className="text-[13px] leading-relaxed text-foreground/90">{spec.approach}</p>
            </Panel>

            <Panel
              title="依赖与体积"
              description="浏览器工具站的失败模式是体积失控，这里逐项标注了包体大小"
            >
              {spec.deps.length === 0 ? (
                <p className="text-xs text-muted-foreground">无第三方依赖</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {spec.deps.map((d) => (
                    <li
                      key={d.name}
                      className="rounded-lg border border-border bg-background px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <code className="font-mono text-[12px] font-medium text-foreground">
                          {d.name}
                        </code>
                        {d.size && d.size !== '—' && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-warning">
                            <Package className="size-3" />
                            {d.size}
                          </span>
                        )}
                      </div>
                      {d.note && (
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {d.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="依赖的浏览器能力" description="这些也是运行时必须探测的降级点">
              <div className="flex flex-wrap gap-1.5">
                {spec.apis.map((a) => (
                  <Badge key={a} variant="neutral" size="sm" className="font-mono">
                    {a}
                  </Badge>
                ))}
              </div>
            </Panel>

            <Panel
              title={
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="size-3.5" />
                  界面与交互要求
                </span>
              }
              description="本项目对「高级感」的硬要求，不是建议 —— 逐条实现，逐条验收"
            >
              <ul className="flex flex-col gap-2">
                {spec.ui.map((u) => (
                  <li
                    key={u}
                    className="flex gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="text-[12px] leading-relaxed text-foreground/90">{u}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        }
        output={
          <div className="flex flex-col gap-4">
            <Panel
              title={
                <span className="inline-flex items-center gap-1.5">
                  <Workflow className="size-3.5" />
                  实现步骤
                </span>
              }
              description={`共 ${spec.steps.length} 步，按顺序做`}
            >
              <ol className="flex flex-col gap-2.5">
                {spec.steps.map((s, i) => (
                  <li key={s} className="flex gap-2.5">
                    <span
                      className={cn(
                        'tabular mt-0.5 grid size-5 shrink-0 place-items-center rounded-md',
                        'bg-primary-subtle text-[11px] font-semibold text-primary',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[13px] leading-relaxed text-foreground/90">{s}</span>
                  </li>
                ))}
              </ol>
            </Panel>

            <Panel
              title={
                <span className="inline-flex items-center gap-1.5 text-warning">
                  <TriangleAlert className="size-3.5" />
                  已知的坑
                </span>
              }
              description="调研阶段查到的实测数据与常见误用，实现前先看一遍"
            >
              <ul className="flex flex-col gap-2">
                {spec.pitfalls.map((p) => (
                  <li
                    key={p}
                    className="flex gap-2.5 rounded-lg border border-warning/20 bg-warning-subtle/50 px-3 py-2.5"
                  >
                    <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-warning" />
                    <span className="text-[12px] leading-relaxed text-foreground/90">{p}</span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              title={
                <span className="inline-flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="size-3.5" />
                  验收标准
                </span>
              }
              description="做到这几条才算完成，缺一条都别改 status"
            >
              <ul className="flex flex-col gap-2">
                {spec.done.map((d) => (
                  <li key={d} className="flex gap-2.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" />
                    <span className="text-[13px] leading-relaxed text-foreground/90">{d}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        }
      />
    </ToolView>
  );
}
