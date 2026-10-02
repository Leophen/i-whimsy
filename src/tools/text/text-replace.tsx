'use client';

import * as React from 'react';
import { CopyButton, ClearButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel, ToolIO } from '@/components/tool/shell';
import { HintTip, ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { CheckboxRow, SegmentedControl } from '@/components/ui/controls';
import { Field, Input, Textarea } from '@/components/ui/input';
import { replaceText } from '@/lib/core/text';

const SAMPLE = `iWhimsy 是一个前端工具库。
iWhimsy 里所有计算都在浏览器本地完成。
把 iWhimsy 加进收藏夹，下次 ⌘K 直达。`;

export default function TextReplace() {
  const tool = useToolMeta('text-replace');
  useTrackRecent(tool.slug);

  const [input, setInput] = React.useState(SAMPLE);
  const [find, setFind] = React.useState('iWhimsy');
  const [replacement, setReplacement] = React.useState('iWhimsy Tools');
  const [regex, setRegex] = React.useState(false);
  const [ignoreCase, setIgnoreCase] = React.useState(false);
  const [wholeWord, setWholeWord] = React.useState(false);
  const [multiline, setMultiline] = React.useState(false);

  const result = React.useMemo(
    () => replaceText(input, { find, replacement, regex, ignoreCase, wholeWord, multiline }),
    [input, find, replacement, regex, ignoreCase, wholeWord, multiline],
  );

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <ClearButton
            onClear={() => {
              setInput('');
              setFind('');
              setReplacement('');
            }}
          />
          <CopyButton value={result.output} sourceLabel="替换结果" variant="secondary">
            复制结果
          </CopyButton>
        </>
      }
    >
      <ToolIO
        split="wide-input"
        input={
          <Panel title="原文" description="粘贴要处理的文本，右侧实时给出替换结果">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="在此粘贴文本…"
              className="min-h-64 font-mono text-[13px]"
              spellCheck={false}
            />

            <div className="mt-4 space-y-3.5">
              <Field label="查找内容">
                <Input
                  value={find}
                  onChange={(e) => setFind(e.target.value)}
                  placeholder="要被替换的文本或正则"
                  className="font-mono text-[13px]"
                  spellCheck={false}
                />
              </Field>

              <Field
                label="替换为"
                hint={regex ? '可使用 $1、$& 引用捕获组' : '原样替换，正则字符已自动转义'}
              >
                <Input
                  value={replacement}
                  onChange={(e) => setReplacement(e.target.value)}
                  placeholder="替换后的内容"
                  className="font-mono text-[13px]"
                  spellCheck={false}
                />
              </Field>

              <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    匹配模式
                  </span>
                  <HintTip content="关闭时按纯文本查找，自动转义 . * + ? 等正则元字符，避免误替换" />
                </div>
                <SegmentedControl
                  size="sm"
                  full
                  value={regex ? 'regex' : 'plain'}
                  onValueChange={(v) => setRegex(v === 'regex')}
                  options={[
                    { value: 'plain', label: '纯文本' },
                    { value: 'regex', label: '正则表达式' },
                  ]}
                />
                <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                  <CheckboxRow
                    label="区分大小写"
                    checked={!ignoreCase}
                    onCheckedChange={(v) => setIgnoreCase(!v)}
                  />
                  <CheckboxRow
                    label="全词匹配"
                    checked={wholeWord}
                    onCheckedChange={setWholeWord}
                  />
                  <CheckboxRow
                    label="多行模式"
                    checked={multiline}
                    onCheckedChange={setMultiline}
                  />
                </div>
              </div>
            </div>
          </Panel>
        }
        output={
          <Panel
            title="替换结果"
            description={`命中 ${result.count} 处`}
            actions={
              <CopyButton value={result.output} sourceLabel="替换结果" size="xs">
                复制
              </CopyButton>
            }
          >
            {result.error ? (
              <Notice tone="danger">{result.error}</Notice>
            ) : (
              <>
                <StatGrid
                  columns={3}
                  items={[
                    { label: '命中次数', value: result.count, tone: 'primary' },
                    { label: '原文长度', value: input.length },
                    { label: '结果长度', value: result.output.length },
                  ]}
                />
                <Textarea
                  value={result.output}
                  readOnly
                  placeholder="替换结果会显示在这里"
                  className="mt-3 min-h-56 font-mono text-[13px]"
                  spellCheck={false}
                />
              </>
            )}
          </Panel>
        }
      />
    </ToolView>
  );
}
