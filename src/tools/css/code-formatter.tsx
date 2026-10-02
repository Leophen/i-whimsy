'use client';

import * as React from 'react';

import { ClearButton, CopyButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SliderRow, SwitchRow } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/card';
import { byteSize } from '@/lib/core/text';
import { formatBytes } from '@/lib/utils';

type Lang = 'html' | 'css' | 'scss' | 'javascript' | 'typescript' | 'json';

/** Prettier 浏览器版没有稳定的插件类型导出，这里用最小结构描述插件形状 */
type PrettierStandalone = {
  format: (source: string, options: Record<string, unknown>) => Promise<string>;
};
type PrettierPlugin = { parsers?: unknown; printers?: unknown; languages?: unknown };

const LANGS: { value: Lang; label: string; parser: string; pluginKeys: string[] }[] = [
  { value: 'html', label: 'HTML', parser: 'html', pluginKeys: ['html'] },
  { value: 'css', label: 'CSS', parser: 'css', pluginKeys: ['postcss'] },
  { value: 'scss', label: 'SCSS', parser: 'scss', pluginKeys: ['postcss'] },
  { value: 'javascript', label: 'JavaScript', parser: 'babel', pluginKeys: ['babel', 'estree'] },
  {
    value: 'typescript',
    label: 'TypeScript',
    parser: 'typescript',
    pluginKeys: ['typescript', 'estree'],
  },
  { value: 'json', label: 'JSON', parser: 'json', pluginKeys: ['babel', 'estree'] },
];

const SAMPLES: Record<Lang, string> = {
  html: `<div class="card"><h1>标题</h1><ul><li>第一项</li><li>第二项</li></ul></div>`,
  css: `.card{display:flex;gap:12px;padding:16px;border-radius:12px;background:#fff}.card:hover{box-shadow:0 4px 12px rgba(0,0,0,.1)}`,
  scss: `.card{display:flex;&:hover{box-shadow:0 4px 12px rgba(0,0,0,.1)}.title{font-size:16px}}`,
  javascript: `function greet(name){const msg='Hello, '+name+'!';console.log(msg);return msg}`,
  typescript: `interface User{id:number;name:string}const list:User[]=[{id:1,name:'Leophen'}];`,
  json: `{"name":"iWhimsy","tools":63,"local":true}`,
};

export default function CodeFormatter() {
  const tool = useToolMeta('code-formatter');
  useTrackRecent(tool.slug);

  const [lang, setLang] = React.useState<Lang>('javascript');
  const [input, setInput] = React.useState(SAMPLES.javascript);
  const [tabWidth, setTabWidth] = React.useState(2);
  const [printWidth, setPrintWidth] = React.useState(80);
  const [singleQuote, setSingleQuote] = React.useState(true);
  const [semi, setSemi] = React.useState(true);
  const [output, setOutput] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const switchLang = (next: Lang) => {
    setLang(next);
    // 只在用户没改过样例时替换，避免覆盖自己粘的内容
    if (Object.values(SAMPLES).includes(input)) setInput(SAMPLES[next]);
    setOutput('');
    setError(null);
  };

  const run = async () => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // 按需加载 prettier，避免把整个格式化器打进首屏
      const prettier = (await import('prettier/standalone')) as unknown as PrettierStandalone;
      const pluginLoaders: Record<string, () => Promise<unknown>> = {
        html: () => import('prettier/plugins/html'),
        postcss: () => import('prettier/plugins/postcss'),
        babel: () => import('prettier/plugins/babel'),
        estree: () => import('prettier/plugins/estree'),
        typescript: () => import('prettier/plugins/typescript'),
      };
      const def = LANGS.find((l) => l.value === lang)!;
      const plugins = await Promise.all(def.pluginKeys.map((k) => pluginLoaders[k]!()));

      const formatted = await prettier.format(input, {
        parser: def.parser,
        plugins: plugins as unknown as PrettierPlugin[],
        tabWidth,
        printWidth,
        singleQuote,
        semi,
      });
      setOutput(formatted);
    } catch (err) {
      setOutput('');
      setError(err instanceof Error ? err.message.split('\n')[0] : '格式化失败');
    } finally {
      setBusy(false);
    }
  };

  // 输入或参数变化后自动重跑（prettier 只在客户端可用）
  React.useEffect(() => {
    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, lang, tabWidth, printWidth, singleQuote, semi]);

  const saved = input && output ? byteSize(input) - byteSize(output) : 0;

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <ClearButton onClear={() => setInput('')} />
          <CopyButton value={output} sourceLabel="格式化结果" variant="secondary">
            复制结果
          </CopyButton>
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
        <SegmentedControl
          size="sm"
          value={lang}
          onValueChange={switchLang}
          options={LANGS.map((l) => ({ value: l.value, label: l.label }))}
        />
        <div className="flex flex-wrap items-center gap-4">
          <SliderRow
            label="缩进"
            value={tabWidth}
            onChange={setTabWidth}
            min={2}
            max={8}
            suffix=" 空格"
            className="w-36"
          />
          <SliderRow
            label="行宽"
            value={printWidth}
            onChange={setPrintWidth}
            min={40}
            max={160}
            step={10}
            suffix=" 字符"
            className="w-40"
          />
          <SwitchRow
            label="单引号"
            checked={singleQuote}
            onCheckedChange={setSingleQuote}
            className="gap-2"
          />
          <SwitchRow label="分号" checked={semi} onCheckedChange={setSemi} className="gap-2" />
        </div>
      </div>

      <ToolIO
        input={
          <Panel title="原始代码" description="粘贴代码，右侧实时格式化">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="在此粘贴代码…"
              className="min-h-80 font-mono text-[13px]"
              spellCheck={false}
              aria-invalid={Boolean(error)}
            />
          </Panel>
        }
        output={
          <Panel
            title="格式化结果"
            description={busy ? '格式化中…' : 'Prettier 在浏览器本地运行'}
            actions={
              <CopyButton value={output} sourceLabel="结果" size="xs">
                复制
              </CopyButton>
            }
          >
            {error ? (
              <Notice tone="danger">
                <div className="space-y-1">
                  <div className="font-medium">无法格式化</div>
                  <div className="font-mono text-[11px]">{error}</div>
                  <div className="text-[11px]">
                    先确认选对了语言 —— 用 JS 解析器去解析 TS 语法会报语法错误。
                  </div>
                </div>
              </Notice>
            ) : (
              <>
                <StatGrid
                  columns={3}
                  items={[
                    { label: '原始大小', value: formatBytes(byteSize(input)) },
                    { label: '格式化后', value: formatBytes(byteSize(output)), tone: 'primary' },
                    {
                      label: '体积变化',
                      value:
                        saved === 0
                          ? '—'
                          : `${saved > 0 ? '-' : '+'}${formatBytes(Math.abs(saved))}`,
                    },
                  ]}
                />
                <Textarea
                  value={output}
                  readOnly
                  className="mt-3 min-h-80 font-mono text-[13px]"
                  spellCheck={false}
                  placeholder={busy ? '格式化中…' : '结果会显示在这里'}
                />
              </>
            )}
          </Panel>
        }
      />

      <Notice tone="info">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="neutral" size="sm">
            本地运行
          </Badge>
          用的是 Prettier 官方浏览器版（standalone + 插件按需加载），规则与本地装的 Prettier
          完全一致。 代码不会上传到任何服务器。
        </div>
      </Notice>
    </ToolView>
  );
}
