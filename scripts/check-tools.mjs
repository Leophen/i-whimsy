#!/usr/bin/env node
/**
 * 工具一致性自检 —— 防住「加了工具但忘了注册」这个最容易犯的错。
 *
 * 检查三份数据是否对得上：
 *   1. src/config/tools.ts     工具的元数据总表
 *   2. src/tools/<分类>/*.tsx   实际的组件文件
 *   3. src/tools/registry.tsx   懒加载注册表
 *
 * 以及：status 为 planned 的工具必须在 tool-specs.ts 里有实现规格，
 * 不允许出现「占位但没方案」的空壳。
 *
 * 用法：node scripts/check-tools.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const errors = [];
const warnings = [];

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ---------- 1. 读配置 ---------- */
const toolsSrc = read('src/config/tools.ts');
const toolRe =
  /slug: '([^']+)',\s*\n\s*name: '([^']+)',[\s\S]*?category: '([^']+)',[\s\S]*?status: '(ready|planned)'/g;
const tools = [];
let m;
while ((m = toolRe.exec(toolsSrc))) {
  tools.push({ slug: m[1], name: m[2], category: m[3], status: m[4] });
}

if (tools.length === 0) errors.push('从 tools.ts 里解析到 0 个工具，正则可能失配了');

/* ---------- 2. 读注册表 ---------- */
const registrySrc = read('src/tools/registry.tsx');
const regRe = /^\s*'?([a-z0-9-]+)'?:\s*define\(\(\) => import\('([^']+)'\)\)/gm;
const registered = new Map();
while ((m = regRe.exec(registrySrc))) registered.set(m[1], m[2]);

/* ---------- 3. 逐项比对 ---------- */
for (const t of tools) {
  const importPath = registered.get(t.slug);

  if (!importPath) {
    errors.push(`[未注册] ${t.slug}（${t.name}）在 tools.ts 里有，但 registry.tsx 里没注册`);
    continue;
  }

  const expected = `@/tools/${t.category}/${t.slug}`;
  if (importPath !== expected) {
    errors.push(`[路径不符] ${t.slug} 注册到 ${importPath}，按约定应为 ${expected}`);
  }

  const file = path.join(ROOT, 'src', importPath.replace('@/', '') + '.tsx');
  if (!fs.existsSync(file)) {
    errors.push(`[文件缺失] ${t.slug} 期望的组件文件不存在：${path.relative(ROOT, file)}`);
    continue;
  }

  const src = fs.readFileSync(file, 'utf8');
  if (!/export default/.test(src)) {
    errors.push(`[无默认导出] ${path.relative(ROOT, file)} 缺少 export default`);
  }
  if (!/^['"]use client['"]/m.test(src)) {
    errors.push(`[缺 use client] ${path.relative(ROOT, file)} 首行应为 'use client'`);
  }
}

for (const slug of registered.keys()) {
  if (!tools.some((t) => t.slug === slug)) {
    errors.push(`[多余注册] registry.tsx 里的 ${slug} 在 tools.ts 里不存在`);
  }
}

/* ---------- 4. planned 必须有规格 ---------- */
const specsSrc = read('src/config/tool-specs.ts');
// 引号可有可无：prettier 会把纯字母的 key 去引号（ferrofluid:），
// 但带连字符的必须保留（'bg-remover':），两种都要能匹配。
const specKeys = new Set([...specsSrc.matchAll(/^\s*'?([a-z0-9-]+)'?:\s*\{/gm)].map((x) => x[1]));

for (const t of tools.filter((x) => x.status === 'planned')) {
  if (!specKeys.has(t.slug)) {
    errors.push(`[缺规格] ${t.slug} 标记为 planned，但 tool-specs.ts 里没有实现规格`);
  }
}
for (const key of specKeys) {
  const t = tools.find((x) => x.slug === key);
  if (!t) warnings.push(`[无用规格] tool-specs.ts 里的 ${key} 没有对应工具`);
  else if (t.status === 'ready') warnings.push(`[规格冗余] ${key} 已实现（ready），规格可删除`);
}

/* ---------- 5. 孤儿文件 ---------- */
for (const dir of fs.readdirSync(path.join(ROOT, 'src/tools'), { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  for (const f of fs.readdirSync(path.join(ROOT, 'src/tools', dir.name))) {
    if (!f.endsWith('.tsx')) continue;
    const slug = f.replace(/\.tsx$/, '');
    if (!tools.some((t) => t.slug === slug)) {
      warnings.push(`[孤儿文件] src/tools/${dir.name}/${f} 没有在 tools.ts 里登记`);
    }
  }
}

/* ---------- 输出 ---------- */
const ready = tools.filter((t) => t.status === 'ready').length;
const planned = tools.filter((t) => t.status === 'planned').length;
const categories = new Set(tools.map((t) => t.category)).size;

console.log(`工具一致性自检`);
console.log(`  工具总数 ${tools.length}（已实现 ${ready} / 开发中 ${planned}）`);
console.log(`  分类 ${categories} 个 · 注册项 ${registered.size} 个`);

if (warnings.length) {
  console.log(`\n警告 ${warnings.length} 条：`);
  warnings.forEach((w) => console.log('  ⚠ ' + w));
}

if (errors.length) {
  console.log(`\n错误 ${errors.length} 条：`);
  errors.forEach((e) => console.log('  ✗ ' + e));
  process.exit(1);
}

console.log('\n✓ 全部一致');
