'use client';

import * as React from 'react';

import { ClearButton, CopyButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SliderRow } from '@/components/ui/controls';
import { Select } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { SQL_LANGUAGES, formatSql, type SqlKeywordCase, type SqlLanguage } from '@/lib/core/data';
import { byteSize } from '@/lib/core/text';

const SAMPLE = `select u.id,u.name,count(o.id) as order_count from users u left join orders o on o.user_id=u.id where u.status='active' and u.created_at>'2026-01-01' group by u.id,u.name having count(o.id)>5 order by order_count desc limit 20;`;

export default function SqlFormatter() {
  const tool = useToolMeta('sql-formatter');
  useTrackRecent(tool.slug);

  const [input, setInput] = React.useState(SAMPLE);
  const [language, setLanguage] = React.useState<SqlLanguage>(SQL_LANGUAGES[0]!.id);
  const [keywordCase, setKeywordCase] = React.useState<SqlKeywordCase>('upper');
  const [tabWidth, setTabWidth] = React.useState(2);
  const [expressionWidth, setExpressionWidth] = React.useState(80);

  const output = React.useMemo(() => {
    if (!input.trim()) return '';
    try {
      return formatSql(input, { language, tabWidth, keywordCase, expressionWidth });
    } catch (err) {
      return err instanceof Error ? `格式化失败：${err.message}` : '格式化失败';
    }
  }, [input, language, tabWidth, keywordCase, expressionWidth]);

  const failed = output.startsWith('格式化失败');

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <ClearButton onClear={() => setInput('')} />
          <CopyButton value={failed ? '' : output} sourceLabel="格式化结果" variant="secondary">
            复制结果
          </CopyButton>
        </>
      }
    >
      <Panel title="格式化选项" bodyClassName="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="mb-2 block text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              SQL 方言
            </span>
            <Select
              value={language}
              onValueChange={(v) => setLanguage(v as SqlLanguage)}
              options={SQL_LANGUAGES.map((l) => ({ value: l.id, label: l.label }))}
              size="sm"
            />
          </div>

          <div>
            <span className="mb-2 block text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              关键字大小写
            </span>
            <SegmentedControl
              size="sm"
              full
              value={keywordCase}
              onValueChange={setKeywordCase}
              options={[
                { value: 'upper', label: '大写' },
                { value: 'lower', label: '小写' },
                { value: 'preserve', label: '保持' },
              ]}
            />
          </div>

          <SliderRow
            label="缩进宽度"
            value={tabWidth}
            onChange={setTabWidth}
            min={1}
            max={8}
            suffix=" 空格"
          />

          <SliderRow
            label="单行最大宽度"
            value={expressionWidth}
            onChange={setExpressionWidth}
            min={40}
            max={200}
            step={10}
            suffix=" 字符"
          />
        </div>
      </Panel>

      <ToolIO
        input={
          <Panel title="输入 SQL">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="粘贴要格式化的 SQL…"
              className="min-h-72 font-mono text-[13px]"
              spellCheck={false}
            />
          </Panel>
        }
        output={
          <Panel
            title="格式化结果"
            actions={
              <CopyButton value={failed ? '' : output} sourceLabel="结果" size="xs">
                复制
              </CopyButton>
            }
          >
            {failed ? (
              <Notice tone="danger">{output}</Notice>
            ) : (
              <>
                <StatGrid
                  columns={3}
                  items={[
                    { label: '原始字符', value: byteSize(input) },
                    { label: '格式化后', value: byteSize(output), tone: 'primary' },
                    {
                      label: '行数',
                      value: output ? output.split('\n').length : 0,
                    },
                  ]}
                />
                <Textarea
                  value={output}
                  readOnly
                  className="mt-3 min-h-72 font-mono text-[13px]"
                  spellCheck={false}
                />
              </>
            )}
          </Panel>
        }
      />

      <Notice tone="info">
        不同方言的关键字集合和标识符引用规则不同（MySQL 用反引号、PostgreSQL 用双引号、 BigQuery
        用反引号包路径）。选错方言通常也能格式化，但标识符处理可能不符合预期。
      </Notice>
    </ToolView>
  );
}
