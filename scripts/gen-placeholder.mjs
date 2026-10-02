#!/usr/bin/env node
/**
 * 一次性脚手架：按 GROUPS 生成工具占位文件。
 *
 * 约定（scripts/check-tools.mjs 会校验）：
 *   src/tools/<分类id>/<slug>.tsx 必须有 'use client' 与 export default。
 * 本脚本只负责创建「缺失」的文件，已存在的不覆盖，可安全重复运行。
 *
 * 用法：node scripts/gen-placeholder.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/** 分类 id → 该分类下的 slug 列表。目录名必须等于分类 id。 */
const GROUPS = {
  'ai-image': ['bg-remover', 'image-restore', 'photo-3d', 'ocr-studio'],
  'ai-voice': ['whisper-transcribe', 'tts-voice'],
  simlab: [
    'flow-art',
    'rd-lab',
    'ferrofluid',
    'physarum',
    'snowflake',
    'tree-grow',
    'particle-life',
    'sandpile',
    'origami',
  ],
  design: ['image-pipeline', 'color-system', 'image-palette', 'lut-grading', 'mosaic-pattern'],
  content: ['video-transcode', 'music-video', 'social-card'],
};

/** slug → 中文名，只用于写进文件头注释 */
const NAME = {
  'bg-remover': '智能抠图换背景',
  'image-restore': '图像修复与增强',
  'photo-3d': 'AI 照片转 3D',
  'ocr-studio': '文字识别 OCR',
  'whisper-transcribe': '语音转文字',
  'tts-voice': '本地 AI 配音',
  'flow-art': '流场生成艺术',
  'rd-lab': '图灵斑纹 · 反应扩散',
  ferrofluid: '磁流体 · 液态金属',
  physarum: '黏菌网络实验室',
  snowflake: '雪花 · 晶体生长',
  'tree-grow': '3D 树生长与进化',
  'particle-life': 'Particle Life 人工生命',
  sandpile: '雪崩沙堆 · 分形曼陀罗',
  origami: '折纸与纸模折叠',
  'image-pipeline': '批量图像流水线',
  'color-system': '智能配色系统',
  'image-palette': '图片主色提取',
  'lut-grading': 'LUT 电影级调色',
  'mosaic-pattern': '手作图纸工坊',
  'video-transcode': '视频转码压缩',
  'music-video': '音乐可视化视频',
  'social-card': '社交封面卡片图',
};

const pascal = (s) =>
  s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

let created = 0;
let skipped = 0;

for (const [cat, slugs] of Object.entries(GROUPS)) {
  const dir = path.join(ROOT, 'src', 'tools', cat);
  fs.mkdirSync(dir, { recursive: true });

  for (const slug of slugs) {
    const file = path.join(dir, `${slug}.tsx`);
    if (fs.existsSync(file)) {
      skipped++;
      continue;
    }
    const content = [
      "'use client';",
      '',
      "import ToolPlaceholder from '@/components/tool/tool-placeholder';",
      '',
      '/**',
      ` * ${NAME[slug]} —— 状态：planned（开发中）。`,
      ' *',
      ` * 页面渲染的是实现规格，数据源：src/config/tool-specs.ts 的 '${slug}'。`,
      " * 实现步骤与验收标准见该文件；完成后把 tools.ts 里的 status 改成 'ready'，",
      ' * 并把本文件的 return 换成真实组件。',
      ' */',
      `export default function ${pascal(slug)}() {`,
      `  return <ToolPlaceholder slug="${slug}" />;`,
      '}',
      '',
    ].join('\n');
    fs.writeFileSync(file, content, 'utf8');
    created++;
  }
}

console.log(`占位文件：新建 ${created} 个，已存在跳过 ${skipped} 个`);
