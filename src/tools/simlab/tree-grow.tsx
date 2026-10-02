'use client';

import * as React from 'react';
import {
  CloudSun,
  Download,
  Leaf,
  Pause,
  Play,
  RefreshCw,
  RotateCw,
  Snowflake,
  Sparkles,
  Sun,
} from 'lucide-react';
import { toast } from 'sonner';

import { StatGrid } from '@/components/tool/bits';
import { Panel, Notice } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SliderRow, SwitchRow } from '@/components/ui/controls';
import { Button } from '@/components/ui/button';
import { downloadFile } from '@/lib/core/browser';
import {
  applyGenome,
  buildSegments,
  collectLeafPoints,
  createTreeState,
  exportTreeObj,
  mulberry32,
  paramsFromPreset,
  runEvolution,
  SEASON_PALETTES,
  stepTreeGrow,
  TREE_PRESETS,
  type SeasonPalette,
  type TreeGrowParams,
  type TreeGrowState,
  type TreeSeason,
} from '@/lib/core/tree-grow';

const DEFAULT_PRESET = 'oak';
const SEASONS: { id: TreeSeason; label: string; icon: React.ReactNode }[] = [
  { id: 'spring', label: '春', icon: <Leaf className="size-3.5" /> },
  { id: 'summer', label: '夏', icon: <Sun className="size-3.5" /> },
  { id: 'autumn', label: '秋', icon: <CloudSun className="size-3.5" /> },
  { id: 'winter', label: '冬', icon: <Snowflake className="size-3.5" /> },
];

const CROWN_OPTIONS = [
  { value: 'sphere', label: '球形' },
  { value: 'ellipsoid', label: '椭球' },
  { value: 'cone', label: '锥形' },
];

function stepsPerFrame(speed: number): number {
  return Math.max(1, speed);
}

function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

export default function TreeGrowTool() {
  const tool = useToolMeta('tree-grow');
  useTrackRecent(tool.slug);

  const mountRef = React.useRef<HTMLDivElement>(null);
  const stateRef = React.useRef<TreeGrowState | null>(null);
  const rafRef = React.useRef(0);
  const threeRef = React.useRef<{
    renderer: import('three').WebGLRenderer;
    scene: import('three').Scene;
    camera: import('three').PerspectiveCamera;
    controls: import('three/examples/jsm/controls/OrbitControls.js').OrbitControls;
    branchMesh: import('three').InstancedMesh;
    leafMesh: import('three').InstancedMesh;
    ground: import('three').Mesh;
    branchMaterial: import('three').MeshStandardMaterial;
    leafMaterial: import('three').MeshStandardMaterial;
    THREE: typeof import('three');
  } | null>(null);
  const seasonBlendRef = React.useRef({ from: 'spring' as TreeSeason, to: 'spring' as TreeSeason, t: 1 });
  const autoRotateRef = React.useRef(true);
  const playingRef = React.useRef(true);
  const speedRef = React.useRef(2);
  const seasonRef = React.useRef<TreeSeason>('summer');
  const seedNonceRef = React.useRef(1);

  const [presetId, setPresetId] = React.useState(DEFAULT_PRESET);
  const [params, setParams] = React.useState<TreeGrowParams>(() =>
    paramsFromPreset(DEFAULT_PRESET),
  );
  const [season, setSeason] = React.useState<TreeSeason>('summer');
  const [speed, setSpeed] = React.useState(2);
  const [playing, setPlaying] = React.useState(true);
  const [autoRotate, setAutoRotate] = React.useState(true);
  const [evolveMode, setEvolveMode] = React.useState(false);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [nodeCount, setNodeCount] = React.useState(1);
  const [activeCount, setActiveCount] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const [gen, setGen] = React.useState(0);
  const [fitness, setFitness] = React.useState(0);
  const [fitnessHistory, setFitnessHistory] = React.useState<number[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  React.useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  React.useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  React.useEffect(() => {
    seasonRef.current = season;
  }, [season]);

  const updateMeshes = React.useCallback((state: TreeGrowState, palette: SeasonPalette) => {
    const ctx = threeRef.current;
    if (!ctx) return;
    const { THREE, branchMesh, leafMesh } = ctx;
    const segments = buildSegments(state);
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);

    branchMesh.count = segments.length;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const start = new THREE.Vector3(seg.x1, seg.y1, seg.z1);
      const end = new THREE.Vector3(seg.x2, seg.y2, seg.z2);
      const dir = end.clone().sub(start);
      const len = dir.length() || 0.001;
      dir.normalize();
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      dummy.position.copy(mid);
      dummy.quaternion.copy(quat);
      dummy.scale.set((seg.r1 + seg.r2) * 0.5, len, (seg.r1 + seg.r2) * 0.5);
      dummy.updateMatrix();
      branchMesh.setMatrixAt(i, dummy.matrix);
    }
    branchMesh.instanceMatrix.needsUpdate = true;

    if (palette.showLeaves) {
      const leaves = collectLeafPoints(state);
      const leafCount = leaves.length / 3;
      const leafSize = state.params.crownSize * 0.045;
      leafMesh.count = leafCount;
      for (let i = 0; i < leafCount; i++) {
        dummy.position.set(leaves[i * 3], leaves[i * 3 + 1], leaves[i * 3 + 2]);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(leafSize, leafSize, leafSize);
        dummy.updateMatrix();
        leafMesh.setMatrixAt(i, dummy.matrix);
      }
      leafMesh.instanceMatrix.needsUpdate = true;
      leafMesh.visible = true;
    } else {
      leafMesh.visible = false;
    }
  }, []);

  const applySeasonColors = React.useCallback((palette: SeasonPalette) => {
    const ctx = threeRef.current;
    if (!ctx) return;
    ctx.branchMaterial.color.set(palette.branch);
    ctx.branchMaterial.emissive.set(palette.trunk).multiplyScalar(0.08);
    ctx.leafMaterial.color.set(palette.leaf);
    ctx.scene.background = new ctx.THREE.Color(palette.sky);
    ctx.scene.fog = new ctx.THREE.Fog(palette.fog, 18, 42);
    if (ctx.ground.material instanceof ctx.THREE.MeshStandardMaterial) {
      ctx.ground.material.color.set(palette.ground);
    }
  }, []);

  const restart = React.useCallback(
    (next: TreeGrowParams, autoPlay = true) => {
      stateRef.current = createTreeState(next);
      setStep(0);
      setNodeCount(stateRef.current.nodes.length);
      setActiveCount(stateRef.current.activeCount);
      setDone(false);
      setPlaying(autoPlay);
      setGen(0);
      setFitness(0);
      setFitnessHistory([]);
      const palette = SEASON_PALETTES[season];
      updateMeshes(stateRef.current, palette);
    },
    [season, updateMeshes],
  );

  const rollSeed = React.useCallback(() => {
    seedNonceRef.current += 1;
    return Math.floor(mulberry32(42_857 + seedNonceRef.current * 13_371)() * 9_999_999);
  }, []);

  React.useEffect(() => {
    let disposed = false;
    const mount = mountRef.current;
    if (!mount) return;

    (async () => {
      const THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      if (disposed || !mountRef.current) return;

      const width = mount.clientWidth;
      const height = mount.clientHeight || 480;

      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(SEASON_PALETTES.summer.fog, 18, 42);

      const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 120);
      camera.position.set(14, 10, 16);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.target.set(0, 6, 0);
      controls.maxPolarAngle = Math.PI * 0.495;
      controls.minDistance = 6;
      controls.maxDistance = 36;

      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const sun = new THREE.DirectionalLight(0xffffff, 1.1);
      sun.position.set(10, 18, 6);
      sun.castShadow = true;
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0xbbdefb, 0.35);
      fill.position.set(-8, 6, -10);
      scene.add(fill);

      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(24, 48),
        new THREE.MeshStandardMaterial({ color: SEASON_PALETTES.summer.ground, roughness: 0.95 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      const branchGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
      const branchMaterial = new THREE.MeshStandardMaterial({
        color: SEASON_PALETTES.summer.branch,
        roughness: 0.82,
        metalness: 0.05,
      });
      const branchMesh = new THREE.InstancedMesh(branchGeo, branchMaterial, 3000);
      branchMesh.castShadow = true;
      branchMesh.count = 0;
      scene.add(branchMesh);

      const leafGeo = new THREE.IcosahedronGeometry(1, 0);
      const leafMaterial = new THREE.MeshStandardMaterial({
        color: SEASON_PALETTES.summer.leaf,
        roughness: 0.65,
        metalness: 0.02,
      });
      const leafMesh = new THREE.InstancedMesh(leafGeo, leafMaterial, 2000);
      leafMesh.count = 0;
      scene.add(leafMesh);

      threeRef.current = {
        renderer,
        scene,
        camera,
        controls,
        branchMesh,
        leafMesh,
        ground,
        branchMaterial,
        leafMaterial,
        THREE,
      };

      restart(paramsFromPreset(DEFAULT_PRESET), true);
      setReady(true);

      const onResize = () => {
        if (!mountRef.current || !threeRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight || 480;
        threeRef.current.camera.aspect = w / h;
        threeRef.current.camera.updateProjectionMatrix();
        threeRef.current.renderer.setSize(w, h);
      };
      window.addEventListener('resize', onResize);

      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);
        const ctx = threeRef.current;
        const state = stateRef.current;
        if (!ctx || !state) return;

        const blend = seasonBlendRef.current;
        if (blend.t < 1) {
          blend.t = Math.min(1, blend.t + 0.04);
          const from = SEASON_PALETTES[blend.from];
          const to = SEASON_PALETTES[blend.to];
          const t = blend.t;
          applySeasonColors({
            sky: lerpColor(from.sky, to.sky, t),
            ground: lerpColor(from.ground, to.ground, t),
            trunk: lerpColor(from.trunk, to.trunk, t),
            branch: lerpColor(from.branch, to.branch, t),
            leaf: lerpColor(from.leaf, to.leaf, t),
            fog: lerpColor(from.fog, to.fog, t),
            showLeaves: t < 0.5 ? from.showLeaves : to.showLeaves,
          });
          if (blend.t >= 1) updateMeshes(state, SEASON_PALETTES[blend.to]);
        }

        if (playingRef.current && !state.done) {
          stepTreeGrow(state, stepsPerFrame(speedRef.current));
          setStep(state.step);
          setNodeCount(state.nodes.length);
          setActiveCount(state.activeCount);
          updateMeshes(state, SEASON_PALETTES[seasonRef.current]);
          if (state.done) {
            setDone(true);
            toast.success(`树生长完成 · ${state.nodes.length} 个节点`);
          }
        }

        if (autoRotateRef.current) {
          ctx.controls.autoRotate = true;
          ctx.controls.autoRotateSpeed = 0.6;
        } else {
          ctx.controls.autoRotate = false;
        }
        ctx.controls.update();
        ctx.renderer.render(ctx.scene, ctx.camera);
      };
      rafRef.current = requestAnimationFrame(tick);

      return () => {
        window.removeEventListener('resize', onResize);
      };
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      const ctx = threeRef.current;
      if (ctx) {
        ctx.renderer.dispose();
        ctx.branchMesh.geometry.dispose();
        ctx.leafMesh.geometry.dispose();
        ctx.branchMaterial.dispose();
        ctx.leafMaterial.dispose();
        if (ctx.ground.geometry) ctx.ground.geometry.dispose();
        if (ctx.ground.material instanceof ctx.THREE.Material) ctx.ground.material.dispose();
        mount.innerHTML = '';
      }
      threeRef.current = null;
    };
    // 仅挂载一次 Three.js
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    seasonBlendRef.current = { from: seasonBlendRef.current.to, to: season, t: 0 };
  }, [season, ready]);

  const applyPreset = (id: string) => {
    setPresetId(id);
    const next = paramsFromPreset(id, rollSeed());
    setParams(next);
    restart(next, true);
  };

  const newSeed = () => {
    const next = { ...params, seed: rollSeed() };
    setParams(next);
    restart(next, true);
  };

  const patch = (partial: Partial<TreeGrowParams>) => {
    const next = { ...params, ...partial };
    setParams(next);
    restart(next, true);
  };

  const runEvolve = () => {
    setEvolveMode(true);
    setPlaying(false);
    toast.info('演化中… 约需数秒');
    window.setTimeout(() => {
      const result = runEvolution(params, 20, params.seed);
      const evolved = applyGenome(params, result.bestGenome, params.seed);
      setParams(evolved);
      setGen(result.generations);
      setFitness(result.bestFitness);
      setFitnessHistory(result.fitnessHistory);
      stateRef.current = result.finalState;
      setStep(result.finalState.step);
      setNodeCount(result.finalState.nodes.length);
      setActiveCount(result.finalState.activeCount);
      setDone(true);
      updateMeshes(result.finalState, SEASON_PALETTES[season]);
      toast.success(`演化完成 · 最佳适应度 ${result.bestFitness.toFixed(1)}`);
    }, 30);
  };

  const handleExportPng = () => {
    const ctx = threeRef.current;
    if (!ctx) return;
    ctx.renderer.render(ctx.scene, ctx.camera);
    ctx.renderer.domElement.toBlob((blob) => {
      if (blob) {
        downloadFile(blob, `tree-${params.seed}.png`, 'image/png');
        toast.success('PNG 已下载');
      }
    }, 'image/png');
  };

  const handleExportObj = () => {
    const state = stateRef.current;
    if (!state || state.nodes.length < 2) {
      toast.error('树尚未长成，无法导出模型');
      return;
    }
    const obj = exportTreeObj(state, `tree-${params.seed}`);
    downloadFile(obj, `tree-${params.seed}.obj`, 'text/plain');
    toast.success('OBJ 模型已开始下载');
  };

  const activePreset = TREE_PRESETS.find((p) => p.id === presetId) ?? TREE_PRESETS[0];
  const progress = Math.min(100, Math.round((step / params.maxSteps) * 100));

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={() => setPlaying((p) => !p)} disabled={done}>
            {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {playing ? '暂停' : '继续'}
          </Button>
          <Button variant="secondary" size="sm" onClick={newSeed}>
            <RefreshCw className="size-3.5" />
            新种子
          </Button>
          <Button variant="secondary" size="sm" onClick={runEvolve} disabled={!ready}>
            <Sparkles className="size-3.5" />
            演化 20 代
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportPng} disabled={!ready || nodeCount < 4}>
            <Download className="size-3.5" />
            导出 PNG
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportObj} disabled={nodeCount < 8}>
            <Download className="size-3.5" />
            导出 OBJ
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
            <div ref={mountRef} className="aspect-[4/3] w-full min-h-[320px] bg-surface-2" />
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <Button
                variant={autoRotate ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setAutoRotate((v) => !v)}
              >
                <RotateCw className="size-3.5" />
                自转
              </Button>
            </div>
            {!ready && (
              <div className="absolute inset-0 grid place-items-center bg-surface/70 text-sm text-muted-foreground">
                加载 Three.js…
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">季节</span>
            {SEASONS.map((s) => (
              <Button
                key={s.id}
                variant={season === s.id ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSeason(s.id)}
              >
                {s.icon}
                {s.label}
              </Button>
            ))}
          </div>

          <StatGrid
            columns={4}
            items={[
              { label: '生长步数', value: step, hint: `${progress}%` },
              { label: '节点数', value: nodeCount },
              { label: '吸引点剩余', value: activeCount },
              {
                label: evolveMode ? '演化适应度' : '状态',
                value: evolveMode ? fitness.toFixed(1) : done ? '已完成' : playing ? '生长中' : '已暂停',
                tone: done ? 'success' : 'default',
              },
            ]}
          />

          {fitnessHistory.length > 1 && (
            <Panel title="演化评分曲线" description="每代最佳适应度">
              <div className="flex h-16 items-end gap-0.5">
                {fitnessHistory.map((f, i) => {
                  const max = Math.max(...fitnessHistory, 1);
                  const h = Math.max(8, Math.round((f / max) * 100));
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-primary/70"
                      style={{ height: `${h}%` }}
                      title={`第 ${i + 1} 代 · ${f.toFixed(1)}`}
                    />
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                共 {gen || fitnessHistory.length} 代 · 越高表示冠幅覆盖与分枝结构越好
              </p>
            </Panel>
          )}
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 xl:w-72">
          <Panel title="树形预设" description="点选后自动重新生长">
            <div className="grid grid-cols-2 gap-2">
              {TREE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`flex flex-col gap-1.5 rounded-xl border p-2.5 text-left transition-colors ${
                    presetId === preset.id
                      ? 'border-primary bg-primary-subtle'
                      : 'border-border bg-background hover:border-border-strong'
                  }`}
                >
                  <span
                    className="h-8 w-full rounded-lg border border-border/50"
                    style={{
                      background: `linear-gradient(135deg, ${preset.swatch[0]}, ${preset.swatch[1]} 50%, ${preset.swatch[2]})`,
                    }}
                  />
                  <span className="text-sm font-medium">{preset.name}</span>
                  <span className="text-[11px] text-muted-foreground">{preset.description}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="高级参数" description="分枝角、吸引半径、顶端优势">
            <Button
              variant="ghost"
              size="sm"
              className="mb-3"
              onClick={() => setPanelOpen((o) => !o)}
            >
              {panelOpen ? '收起' : '展开'}参数面板
            </Button>
            {panelOpen && (
            <div className="flex flex-col gap-3">
              <SegmentedControl
                value={params.crownShape}
                onValueChange={(v) => patch({ crownShape: v as TreeGrowParams['crownShape'] })}
                options={CROWN_OPTIONS}
                full
              />
              <SliderRow
                label="生长速度"
                value={speed}
                onChange={setSpeed}
                min={1}
                max={6}
                step={1}
              />
              <SliderRow
                label="分枝角度"
                value={params.branchAngle}
                onChange={(v) => patch({ branchAngle: v })}
                min={12}
                max={55}
                step={1}
                suffix="°"
              />
              <SliderRow
                label="吸引半径"
                value={Math.round(params.influenceRatio * 1000)}
                onChange={(v) => patch({ influenceRatio: v / 1000 })}
                min={60}
                max={140}
                step={2}
                suffix={` (${(params.influenceRatio * 100).toFixed(1)}%)`}
              />
              <SliderRow
                label="顶端优势"
                value={Math.round(params.apicalDominance * 100)}
                onChange={(v) => patch({ apicalDominance: v / 100 })}
                min={15}
                max={85}
                step={1}
                suffix="%"
              />
              <SwitchRow
                label="演化模式标记"
                description="开启后运行「演化 20 代」会记录评分曲线"
                checked={evolveMode}
                onCheckedChange={setEvolveMode}
              />
              <Notice tone="info">
                当前预设：{activePreset.name} · 种子 {params.seed}
              </Notice>
            </div>
            )}
          </Panel>
        </div>
      </div>
    </ToolView>
  );
}
