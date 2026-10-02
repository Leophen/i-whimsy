/**
 * 折纸折痕图核心：折痕数据、内置经典图样、视觉插值折叠、SVG 导出。
 * 不做完整刚体可折叠性求解 —— 用分层旋转做视觉上合理的折叠动画。
 */

export type CreaseType = 'mountain' | 'valley';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Crease {
  id: string;
  a: Vec2;
  b: Vec2;
  type: CreaseType;
  /** 折叠顺序，越小越先折 */
  foldOrder: number;
}

export interface CreasePattern {
  name: string;
  paperWidth: number;
  paperHeight: number;
  creases: Crease[];
}

export interface OrigamiPreset {
  id: string;
  name: string;
  description: string;
  create: (sizeMm: number) => CreasePattern;
}

export interface FoldMesh {
  positions: Float32Array;
  indices: Uint16Array;
  normals: Float32Array;
}

export interface SvgExportOptions {
  showNumbers: boolean;
  lineWidth: number;
  marginMm: number;
}

export const PAPER_SIZES = {
  A4: { width: 210, height: 297, label: 'A4 (210 × 297 mm)' },
  Letter: { width: 215.9, height: 279.4, label: 'Letter (8.5 × 11 in)' },
  square15: { width: 150, height: 150, label: '正方形 150 mm' },
  square20: { width: 200, height: 200, label: '正方形 200 mm' },
} as const;

export type PaperSizeKey = keyof typeof PAPER_SIZES;

const MOUNTAIN_COLOR = '#dc2626';
const VALLEY_COLOR = '#2563eb';
const BORDER_COLOR = '#171717';

let creaseIdCounter = 0;

export function createCreaseId(): string {
  creaseIdCounter += 1;
  return `c${creaseIdCounter}`;
}

export function resetCreaseIdCounter(): void {
  creaseIdCounter = 0;
}

function pt(x: number, y: number): Vec2 {
  return { x, y };
}

function line(
  a: Vec2,
  b: Vec2,
  type: CreaseType,
  foldOrder: number,
  id?: string,
): Crease {
  return { id: id ?? createCreaseId(), a, b, type, foldOrder };
}

function scalePattern(
  name: string,
  size: number,
  unitCreases: Array<{ a: Vec2; b: Vec2; type: CreaseType; foldOrder: number }>,
): CreasePattern {
  resetCreaseIdCounter();
  return {
    name,
    paperWidth: size,
    paperHeight: size,
    creases: unitCreases.map((c) =>
      line(
        pt(c.a.x * size, c.a.y * size),
        pt(c.b.x * size, c.b.y * size),
        c.type,
        c.foldOrder,
      ),
    ),
  };
}

/** 水雷基本形：双对角谷折 + 水平/垂直山折 */
export function createWaterbombBase(sizeMm = 200): CreasePattern {
  return scalePattern('水雷基本形', sizeMm, [
    { a: pt(0, 0), b: pt(1, 1), type: 'valley', foldOrder: 0 },
    { a: pt(1, 0), b: pt(0, 1), type: 'valley', foldOrder: 0 },
    { a: pt(0, 0.5), b: pt(1, 0.5), type: 'mountain', foldOrder: 1 },
    { a: pt(0.5, 0), b: pt(0.5, 1), type: 'mountain', foldOrder: 2 },
  ]);
}

/** 经典鹤折痕图（简化版，含鸟基本形折痕） */
export function createCranePattern(sizeMm = 200): CreasePattern {
  return scalePattern('传统纸鹤', sizeMm, [
    { a: pt(0, 0), b: pt(1, 1), type: 'valley', foldOrder: 0 },
    { a: pt(1, 0), b: pt(0, 1), type: 'valley', foldOrder: 0 },
    { a: pt(0, 0.5), b: pt(1, 0.5), type: 'mountain', foldOrder: 1 },
    { a: pt(0.5, 0), b: pt(0.5, 1), type: 'mountain', foldOrder: 1 },
    { a: pt(0, 0), b: pt(0.5, 0.5), type: 'valley', foldOrder: 2 },
    { a: pt(1, 0), b: pt(0.5, 0.5), type: 'valley', foldOrder: 2 },
    { a: pt(0, 1), b: pt(0.5, 0.5), type: 'valley', foldOrder: 2 },
    { a: pt(1, 1), b: pt(0.5, 0.5), type: 'valley', foldOrder: 2 },
    { a: pt(0.25, 0), b: pt(0.5, 0.25), type: 'valley', foldOrder: 3 },
    { a: pt(0.75, 0), b: pt(0.5, 0.25), type: 'valley', foldOrder: 3 },
    { a: pt(0.25, 1), b: pt(0.5, 0.75), type: 'valley', foldOrder: 3 },
    { a: pt(0.75, 1), b: pt(0.5, 0.75), type: 'valley', foldOrder: 3 },
  ]);
}

/** 经典方盒（masu）折痕图 */
export function createBoxPattern(sizeMm = 200): CreasePattern {
  const t = 1 / 3;
  return scalePattern('经典方盒', sizeMm, [
    { a: pt(0, t), b: pt(1, t), type: 'valley', foldOrder: 0 },
    { a: pt(0, 1 - t), b: pt(1, 1 - t), type: 'valley', foldOrder: 0 },
    { a: pt(t, 0), b: pt(t, 1), type: 'valley', foldOrder: 0 },
    { a: pt(1 - t, 0), b: pt(1 - t, 1), type: 'valley', foldOrder: 0 },
    { a: pt(0, 0), b: pt(t, t), type: 'mountain', foldOrder: 1 },
    { a: pt(1, 0), b: pt(1 - t, t), type: 'mountain', foldOrder: 1 },
    { a: pt(0, 1), b: pt(t, 1 - t), type: 'mountain', foldOrder: 1 },
    { a: pt(1, 1), b: pt(1 - t, 1 - t), type: 'mountain', foldOrder: 1 },
    { a: pt(t, 0), b: pt(0, t), type: 'valley', foldOrder: 2 },
    { a: pt(1 - t, 0), b: pt(1, t), type: 'valley', foldOrder: 2 },
    { a: pt(t, 1), b: pt(0, 1 - t), type: 'valley', foldOrder: 2 },
    { a: pt(1 - t, 1), b: pt(1, 1 - t), type: 'valley', foldOrder: 2 },
  ]);
}

/** 鸟基本形折痕图 */
export function createBirdBase(sizeMm = 200): CreasePattern {
  return scalePattern('鸟基本形', sizeMm, [
    { a: pt(0, 0), b: pt(1, 1), type: 'valley', foldOrder: 0 },
    { a: pt(1, 0), b: pt(0, 1), type: 'valley', foldOrder: 0 },
    { a: pt(0, 0.5), b: pt(1, 0.5), type: 'mountain', foldOrder: 1 },
    { a: pt(0.5, 0), b: pt(0.5, 1), type: 'mountain', foldOrder: 1 },
    { a: pt(0, 0), b: pt(0.5, 0.5), type: 'valley', foldOrder: 2 },
    { a: pt(1, 0), b: pt(0.5, 0.5), type: 'valley', foldOrder: 2 },
    { a: pt(0, 1), b: pt(0.5, 0.5), type: 'valley', foldOrder: 2 },
    { a: pt(1, 1), b: pt(0.5, 0.5), type: 'valley', foldOrder: 2 },
  ]);
}

export const ORIGAMI_PRESETS: OrigamiPreset[] = [
  {
    id: 'waterbomb',
    name: '水雷基本形',
    description: '经典水雷/Base，四道折痕',
    create: createWaterbombBase,
  },
  {
    id: 'crane',
    name: '传统纸鹤',
    description: '简化鹤形折痕，含鸟基本形',
    create: createCranePattern,
  },
  {
    id: 'box',
    name: '经典方盒',
    description: '三分折痕 + 角折，可折成方盒',
    create: createBoxPattern,
  },
  {
    id: 'bird-base',
    name: '鸟基本形',
    description: '双对角 + 四三角谷折',
    create: createBirdBase,
  },
];

export function createEmptyPattern(sizeMm = 200): CreasePattern {
  resetCreaseIdCounter();
  return {
    name: '空白折痕图',
    paperWidth: sizeMm,
    paperHeight: sizeMm,
    creases: [],
  };
}

export function clonePattern(pattern: CreasePattern): CreasePattern {
  return {
    ...pattern,
    creases: pattern.creases.map((c) => ({ ...c, a: { ...c.a }, b: { ...c.b } })),
  };
}

export function sideOfLine(p: Vec2, a: Vec2, b: Vec2): number {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

export function snapToGrid(p: Vec2, gridMm: number): Vec2 {
  if (gridMm <= 0) return p;
  return {
    x: Math.round(p.x / gridMm) * gridMm,
    y: Math.round(p.y / gridMm) * gridMm,
  };
}

export function clampToPaper(p: Vec2, w: number, h: number): Vec2 {
  return {
    x: Math.max(0, Math.min(w, p.x)),
    y: Math.max(0, Math.min(h, p.y)),
  };
}

function sub3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function add3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale3(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function len3(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

function normalize3(v: Vec3): Vec3 {
  const l = len3(v);
  if (l < 1e-9) return { x: 0, y: 0, z: 1 };
  return scale3(v, 1 / l);
}

function cross3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function rotateAroundAxis(point: Vec3, pivot: Vec3, axis: Vec3, angle: number): Vec3 {
  const k = normalize3(axis);
  const rel = sub3(point, pivot);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const term1 = scale3(rel, cos);
  const term2 = scale3(cross3(k, rel), sin);
  const term3 = scale3(k, dot3(k, rel) * (1 - cos));
  return add3(add3(add3(pivot, term1), term2), term3);
}

function creaseSign(type: CreaseType): number {
  return type === 'mountain' ? -1 : 1;
}

function foldProgressForCrease(globalProgress: number, order: number, maxOrder: number): number {
  if (maxOrder <= 0) return globalProgress;
  const span = 1 / (maxOrder + 1);
  const start = order * span;
  const end = start + span * 1.4;
  return Math.max(0, Math.min(1, (globalProgress - start) / (end - start)));
}

/**
 * 在细分网格上按折痕顺序做分层旋转，得到折叠态顶点。
 * progress: 0 = 平铺，1 = 完全折叠
 */
export function buildFoldMesh(
  pattern: CreasePattern,
  progress: number,
  gridSize = 20,
): FoldMesh {
  const w = pattern.paperWidth;
  const h = pattern.paperHeight;
  const cols = gridSize;
  const rows = gridSize;
  const vertCount = (cols + 1) * (rows + 1);

  const positions: Vec3[] = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      positions.push({ x: (i / cols) * w, y: (j / rows) * h, z: 0 });
    }
  }

  const sorted = [...pattern.creases].sort((a, b) => a.foldOrder - b.foldOrder);
  const maxOrder = sorted.reduce((m, c) => Math.max(m, c.foldOrder), 0);

  for (const crease of sorted) {
    const localP = foldProgressForCrease(progress, crease.foldOrder, maxOrder);
    if (localP <= 0) continue;

    const angle = creaseSign(crease.type) * localP * Math.PI;
    const a2 = crease.a;
    const b2 = crease.b;
    const axis: Vec3 = normalize3({ x: b2.x - a2.x, y: b2.y - a2.y, z: 0 });
    const pivot: Vec3 = {
      x: (a2.x + b2.x) / 2,
      y: (a2.y + b2.y) / 2,
      z: 0,
    };

    const sideRef = sideOfLine(
      { x: pivot.x + (b2.y - a2.y), y: pivot.y - (b2.x - a2.x) },
      a2,
      b2,
    );

    for (let vi = 0; vi < vertCount; vi++) {
      const p = positions[vi];
      const s = sideOfLine({ x: p.x, y: p.y }, a2, b2);
      if (s * sideRef >= 0) continue;
      positions[vi] = rotateAroundAxis(p, pivot, axis, angle);
    }
  }

  const posFlat = new Float32Array(vertCount * 3);
  for (let i = 0; i < vertCount; i++) {
    posFlat[i * 3] = positions[i].x;
    posFlat[i * 3 + 1] = positions[i].y;
    posFlat[i * 3 + 2] = positions[i].z;
  }

  const indices: number[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const b = a + 1;
      const c = a + cols + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const normals = new Float32Array(vertCount * 3);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const b = a + 1;
      const c = a + cols + 1;
      const d = c + 1;
      computeQuadNormal(positions[a], positions[b], positions[d], normals, a);
      computeQuadNormal(positions[a], positions[b], positions[d], normals, b);
      computeQuadNormal(positions[a], positions[c], positions[d], normals, c);
      computeQuadNormal(positions[a], positions[c], positions[d], normals, d);
    }
  }
  for (let i = 0; i < vertCount; i++) {
    const nx = normals[i * 3];
    const ny = normals[i * 3 + 1];
    const nz = normals[i * 3 + 2];
    const l = Math.hypot(nx, ny, nz) || 1;
    normals[i * 3] = nx / l;
    normals[i * 3 + 1] = ny / l;
    normals[i * 3 + 2] = nz / l;
  }

  return {
    positions: posFlat,
    indices: new Uint16Array(indices),
    normals,
  };
}

function computeQuadNormal(a: Vec3, b: Vec3, d: Vec3, normals: Float32Array, idx: number): void {
  const ab = sub3(b, a);
  const ad = sub3(d, a);
  const n = cross3(ab, ad);
  normals[idx * 3] += n.x;
  normals[idx * 3 + 1] += n.y;
  normals[idx * 3 + 2] += n.z;
}

/** 在 2D 画布上渲染折痕图 */
export function renderCreasePattern(
  ctx: CanvasRenderingContext2D,
  pattern: CreasePattern,
  options: {
    padding: number;
    draftFrom?: Vec2 | null;
    draftTo?: Vec2 | null;
    highlightId?: string | null;
  },
): void {
  const { padding } = options;
  const canvasW = ctx.canvas.width;
  const canvasH = ctx.canvas.height;
  const innerW = canvasW - padding * 2;
  const innerH = canvasH - padding * 2;
  const scale = Math.min(innerW / pattern.paperWidth, innerH / pattern.paperHeight);
  const offsetX = padding + (innerW - pattern.paperWidth * scale) / 2;
  const offsetY = padding + (innerH - pattern.paperHeight * scale) / 2;

  const toScreen = (p: Vec2) => ({
    x: offsetX + p.x * scale,
    y: offsetY + p.y * scale,
  });

  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, canvasW, canvasH);

  const tl = toScreen({ x: 0, y: 0 });
  const br = toScreen({ x: pattern.paperWidth, y: pattern.paperHeight });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 2;
  ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);

  pattern.creases.forEach((crease, index) => {
    const sa = toScreen(crease.a);
    const sb = toScreen(crease.b);
    const isMountain = crease.type === 'mountain';
    ctx.strokeStyle = isMountain ? MOUNTAIN_COLOR : VALLEY_COLOR;
    ctx.lineWidth = crease.id === options.highlightId ? 3.5 : 2;
    ctx.setLineDash(isMountain ? [] : [8, 6]);
    ctx.beginPath();
    ctx.moveTo(sa.x, sa.y);
    ctx.lineTo(sb.x, sb.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const mx = (sa.x + sb.x) / 2;
    const my = (sa.y + sb.y) / 2;
    ctx.fillStyle = isMountain ? MOUNTAIN_COLOR : VALLEY_COLOR;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), mx, my);
  });

  if (options.draftFrom && options.draftTo) {
    const sa = toScreen(options.draftFrom);
    const sb = toScreen(options.draftTo);
    ctx.strokeStyle = 'rgba(100,100,100,0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(sa.x, sa.y);
    ctx.lineTo(sb.x, sb.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function screenToPaper(
  sx: number,
  sy: number,
  canvasW: number,
  canvasH: number,
  pattern: CreasePattern,
  padding: number,
): Vec2 {
  const innerW = canvasW - padding * 2;
  const innerH = canvasH - padding * 2;
  const scale = Math.min(innerW / pattern.paperWidth, innerH / pattern.paperHeight);
  const offsetX = padding + (innerW - pattern.paperWidth * scale) / 2;
  const offsetY = padding + (innerH - pattern.paperHeight * scale) / 2;
  return {
    x: (sx - offsetX) / scale,
    y: (sy - offsetY) / scale,
  };
}

/** 导出可打印折痕 SVG，尺寸标注为实际毫米 */
export function exportCreaseSvg(
  pattern: CreasePattern,
  options: Partial<SvgExportOptions> = {},
): string {
  const { showNumbers = true, lineWidth = 0.4, marginMm = 10 } = options;
  const w = pattern.paperWidth;
  const h = pattern.paperHeight;
  const totalW = w + marginMm * 2;
  const totalH = h + marginMm * 2 + 18;

  const lines = pattern.creases
    .map((crease, i) => {
      const isMountain = crease.type === 'mountain';
      const color = isMountain ? MOUNTAIN_COLOR : VALLEY_COLOR;
      const dash = isMountain ? '' : ' stroke-dasharray="4 3"';
      const ax = crease.a.x + marginMm;
      const ay = crease.a.y + marginMm;
      const bx = crease.b.x + marginMm;
      const by = crease.b.y + marginMm;
      const label = showNumbers
        ? `<text x="${(ax + bx) / 2}" y="${(ay + by) / 2}" font-size="3" text-anchor="middle" dominant-baseline="middle" fill="${color}" font-family="system-ui,sans-serif">${i + 1}</text>`
        : '';
      return `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${color}" stroke-width="${lineWidth}"${dash} />${label}`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}mm" height="${totalH}mm" viewBox="0 0 ${totalW} ${totalH}">
  <title>${pattern.name} — 折痕图</title>
  <desc>纸张实际尺寸 ${w} × ${h} mm。红色实线=山折，蓝色虚线=谷折。</desc>
  <rect x="0" y="0" width="${totalW}" height="${totalH}" fill="white"/>
  <rect x="${marginMm}" y="${marginMm}" width="${w}" height="${h}" fill="white" stroke="${BORDER_COLOR}" stroke-width="0.6"/>
  ${lines}
  <text x="${marginMm}" y="${marginMm + h + 12}" font-size="3.5" fill="#444" font-family="system-ui,sans-serif">
    ${pattern.name} · 纸张 ${w} × ${h} mm · 山折(红实) / 谷折(蓝虚)
  </text>
</svg>`;
}

/** 生成预设缩略图 SVG data URL */
export function presetThumbnailDataUrl(presetId: string, sizeMm = 200): string {
  const preset = ORIGAMI_PRESETS.find((p) => p.id === presetId);
  if (!preset) return '';
  const pattern = preset.create(sizeMm);
  const svg = exportCreaseSvg(pattern, { showNumbers: false, lineWidth: 0.5, marginMm: 4 });
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml,${encoded}`;
}
