/**
 * 数据格式核心库 —— JSON / YAML / CSV / XML / SQL 的解析、校验与美化。
 */

import { XMLValidator } from 'fast-xml-parser';
// js-yaml v5 的 ESM 构建不再提供 default 导出，必须用命名导入
import { dump as yamlDump, load as yamlLoad } from 'js-yaml';
import Papa from 'papaparse';
import { format as formatSqlRaw, type SqlLanguage } from 'sql-formatter';

export type { SqlLanguage };

/* ------------------------------------------------------------------ *
 * JSON
 * ------------------------------------------------------------------ */

export type JsonIndent = 2 | 4 | 'tab';

function indentString(level: number, indent: JsonIndent): string {
  if (indent === 'tab') return '\t'.repeat(level);
  return ' '.repeat((indent as number) * level);
}

/** 保留原始键顺序的美化，并高亮位置信息。 */
export function formatJson(input: string, indent: JsonIndent = 2): string {
  // sort_keys 不默认开启 —— 保持键顺序符合直觉
  return JSON.stringify(JSON.parse(input), null, indent === 'tab' ? '\t' : indent);
}

export function minifyJson(input: string): string {
  return JSON.stringify(JSON.parse(input));
}

export interface ValidationIssue {
  message: string;
  line?: number;
  column?: number;
}

/** 严格的 JSON 校验，尝试从 message 中还原行列位置。 */
export function validateJson(input: string): { valid: boolean; error?: ValidationIssue } {
  if (!input.trim()) return { valid: false, error: { message: '输入为空' } };
  try {
    JSON.parse(input);
    return { valid: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const posMatch = /position (\d+)/.exec(message);
    let line: number | undefined;
    let column: number | undefined;
    if (posMatch?.[1]) {
      const pos = Number(posMatch[1]);
      const before = input.slice(0, pos);
      line = before.split('\n').length;
      column = pos - before.lastIndexOf('\n');
    }
    return {
      valid: false,
      error: {
        message: message.replace(/^JSON\.parse: /, ''),
        line,
        column,
      },
    };
  }
}

/** 宽松解析：允许尾随逗号、注释、单引号（JSON5 子集），失败返回 null。 */
export function parseLooseJson(input: string): unknown | null {
  const cleaned = input
    .replace(/\/\/[^\n\r]*/g, '') // 行注释
    .replace(/\/\*[\s\S]*?\*\//g, '') // 块注释
    .replace(/,(\s*[}\]])/g, '$1'); // 尾随逗号
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * JSON ⇄ YAML
 * ------------------------------------------------------------------ */

export function jsonToYaml(input: string, indent = 2): string {
  const obj = JSON.parse(input);
  return yamlDump(obj, { indent, lineWidth: 0, noRefs: true, sortKeys: false });
}

export function yamlToJson(input: string, indent: JsonIndent = 2): string {
  // js-yaml v5 起 load('') 不再返回 undefined，而是直接抛错，必须显式挡掉
  if (!input.trim()) throw new Error('YAML 内容为空');
  const obj = yamlLoad(input);
  if (obj === undefined || obj === null) throw new Error('YAML 内容为空或无法解析');
  return JSON.stringify(obj, null, indent === 'tab' ? '\t' : indent);
}

export function validateYaml(input: string): { valid: boolean; error?: string } {
  if (!input.trim()) return { valid: false, error: '输入为空' };
  try {
    yamlLoad(input);
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/* ------------------------------------------------------------------ *
 * JSON ⇄ CSV
 * ------------------------------------------------------------------ */

export function jsonToCsv(json: string): string {
  const parsed = JSON.parse(json) as unknown;
  if (!Array.isArray(parsed)) throw new Error('顶层必须是数组');
  const rows: Record<string, unknown>[] = parsed.map((item) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      return { value: item };
    }
    return item as Record<string, unknown>;
  });
  if (rows.length === 0) return '';
  // 收集所有出现过的键，保证列完整
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return Papa.unparse(rows, { columns: headers });
}

export function csvToJson(csv: string, headers = true): string {
  const result = Papa.parse<Record<string, unknown>>(csv.trim(), {
    header: headers,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });
  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(result.errors[0]?.message ?? 'CSV 解析失败');
  }
  return JSON.stringify(result.data, null, 2);
}

/* ------------------------------------------------------------------ *
 * XML
 * ------------------------------------------------------------------ */

/** 轻量 XML 美化：基于 token 扫描，不改动节点顺序。 */
export function formatXml(input: string, indentSize = 2): string {
  const tokens = input
    .replace(/>\s+</g, '><')
    .trim()
    .split(/(?=<)|(?<=>)/g)
    .filter((t) => t.trim() !== '');

  if (tokens.length === 0) return input;

  let depth = 0;
  const out: string[] = [];
  const pad = ' '.repeat(indentSize);

  for (const token of tokens) {
    const isClosing = token.startsWith('</');
    const isSelfClosing = token.endsWith('/>') || /^<\?/.test(token) || token.startsWith('<!');
    const isProcessing = token.startsWith('<?') || token.startsWith('<!');
    const isOpening = token.startsWith('<') && !isClosing && !isSelfClosing;

    if (isClosing) depth = Math.max(0, depth - 1);

    if (isProcessing && token.startsWith('<?')) {
      out.push(token);
      continue;
    }
    out.push(`${pad.repeat(depth)}${token}`);

    if (isOpening) depth += 1;
  }
  return out.join('\n');
}

export function validateXml(input: string): { valid: boolean; error?: string } {
  const result = XMLValidator.validate(input);
  if (result === true) return { valid: true };
  const err = result.err;
  return {
    valid: false,
    error: `第 ${err.line} 行第 ${err.col} 列：${err.msg}`,
  };
}

/* ------------------------------------------------------------------ *
 * SQL
 * ------------------------------------------------------------------ */

export const SQL_LANGUAGES: { id: SqlLanguage; label: string }[] = [
  { id: 'sql', label: '标准 SQL' },
  { id: 'mysql', label: 'MySQL' },
  { id: 'postgresql', label: 'PostgreSQL' },
  { id: 'sqlite', label: 'SQLite' },
  { id: 'bigquery', label: 'BigQuery' },
  { id: 'mariadb', label: 'MariaDB' },
  { id: 'plsql', label: 'Oracle PL/SQL' },
  { id: 'tsql', label: 'SQL Server T-SQL' },
  { id: 'snowflake', label: 'Snowflake' },
  { id: 'spark', label: 'Spark SQL' },
  { id: 'db2', label: 'DB2' },
  { id: 'redshift', label: 'Redshift' },
];

export type SqlKeywordCase = 'upper' | 'lower' | 'preserve';

export interface SqlFormatOptions {
  language: SqlLanguage;
  tabWidth: number;
  keywordCase: SqlKeywordCase;
  /** 单行最大宽度，超出后换行；0 表示尽可能把表达式压在一行内 */
  expressionWidth: number;
}

export function formatSql(input: string, opts: SqlFormatOptions): string {
  return formatSqlRaw(input, {
    language: opts.language,
    tabWidth: opts.tabWidth,
    keywordCase: opts.keywordCase,
    expressionWidth: opts.expressionWidth,
  });
}

/** 导出给内部使用的缩进函数（避免 unused 警告），同时方便外部组合使用 */
export { indentString };
