/**
 * AI 照片转 3D —— Three.js 视差渲染、景深虚化、视频/GIF 导出。
 */

import type { DepthMap } from './depth';
import { sampleDepth } from './depth';

export type Photo3DMode = 'wiggle' | 'stereo' | 'blur';

export interface Photo3DParams {
  wiggleAmplitude: number; // 0–1
  parallaxStrength: number; // 0–1
  blurStrength: number; // 0–1
}

export const DEFAULT_PHOTO3D_PARAMS: Photo3DParams = {
  wiggleAmplitude: 0.45,
  parallaxStrength: 0.55,
  blurStrength: 0.6,
};

export interface ParallaxState {
  /** 归一化指针 -1…1 */
  pointerX: number;
  pointerY: number;
  /** 自动摇动相位 */
  phase: number;
}

/* ------------------------------------------------------------------ *
 * MediaRecorder 容器选择（Safari 只写 MP4）
 * ------------------------------------------------------------------ */

export function pickVideoMimeType(): { mimeType: string; ext: string } {
  const candidates = [
    { mimeType: 'video/webm;codecs=vp9', ext: 'webm' },
    { mimeType: 'video/webm;codecs=vp8', ext: 'webm' },
    { mimeType: 'video/webm', ext: 'webm' },
    { mimeType: 'video/mp4;codecs=h264', ext: 'mp4' },
    { mimeType: 'video/mp4', ext: 'mp4' },
  ];
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: 'video/webm', ext: 'webm' };
  }
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mimeType)) return c;
  }
  return { mimeType: 'video/webm', ext: 'webm' };
}

/* ------------------------------------------------------------------ *
 * Three.js 视差渲染器
 * ------------------------------------------------------------------ */

export interface Photo3DRendererOptions {
  image: HTMLImageElement;
  depth: DepthMap;
  mode: Photo3DMode;
  params: Photo3DParams;
}

export class Photo3DRenderer {
  private container: HTMLElement;
  private image: HTMLImageElement;
  private depth: DepthMap;
  private mode: Photo3DMode;
  private params: Photo3DParams;

  private renderer: import('three').WebGLRenderer | null = null;
  private scene: import('three').Scene | null = null;
  private camera: import('three').PerspectiveCamera | null = null;
  private mesh: import('three').Mesh | null = null;
  private stereoCameraR: import('three').PerspectiveCamera | null = null;
  private blurCanvas: HTMLCanvasElement | null = null;
  private blurCtx: CanvasRenderingContext2D | null = null;
  private animId = 0;
  private disposed = false;
  private state: ParallaxState = { pointerX: 0, pointerY: 0, phase: 0 };
  constructor(container: HTMLElement, options: Photo3DRendererOptions) {
    this.container = container;
    this.image = options.image;
    this.depth = options.depth;
    this.mode = options.mode;
    this.params = options.params;
  }

  async init(): Promise<void> {
    const THREE = await import('three');

    const aspect = this.image.naturalWidth / this.image.naturalHeight;
    const w = this.container.clientWidth || 640;
    const h = Math.round(w / aspect);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.z = 2.2;

    if (this.mode === 'blur') {
      this.initBlurCanvas(w, h);
    } else {
      this.buildMesh(THREE, aspect);
      if (this.mode === 'stereo') {
        this.stereoCameraR = this.camera.clone();
      }
    }

    this.startLoop();
  }

  private buildMesh(THREE: typeof import('three'), aspect: number) {
    const segments = 128;
    const geometry = new THREE.PlaneGeometry(2, 2 / aspect, segments, segments);

    const colorTex = new THREE.CanvasTexture(this.imageToCanvas(this.image));
    colorTex.colorSpace = THREE.SRGBColorSpace;
    colorTex.minFilter = THREE.LinearFilter;
    colorTex.magFilter = THREE.LinearFilter;

    const depthCanvas = this.depthToCanvas();
    const depthTex = new THREE.CanvasTexture(depthCanvas);
    depthTex.minFilter = THREE.LinearFilter;
    depthTex.magFilter = THREE.LinearFilter;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: colorTex },
        uDepth: { value: depthTex },
        uDisplacement: { value: this.params.parallaxStrength * 0.35 },
        uOffset: { value: new THREE.Vector2(0, 0) },
        uParallax: { value: this.params.parallaxStrength * 0.04 },
      },
      vertexShader: `
        varying vec2 vUv;
        uniform sampler2D uDepth;
        uniform float uDisplacement;
        void main() {
          vUv = uv;
          float d = texture2D(uDepth, uv).r;
          vec3 pos = position;
          pos.z += (d - 0.5) * uDisplacement;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D uColor;
        uniform sampler2D uDepth;
        uniform vec2 uOffset;
        uniform float uParallax;
        void main() {
          float d = texture2D(uDepth, vUv).r;
          vec2 uv = vUv + uOffset * (d - 0.5) * uParallax;
          uv = clamp(uv, 0.001, 0.999);
          gl_FragColor = texture2D(uColor, uv);
        }
      `,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.scene!.add(this.mesh);
  }

  private initBlurCanvas(w: number, h: number) {
    this.blurCanvas = document.createElement('canvas');
    this.blurCanvas.width = w;
    this.blurCanvas.height = h;
    this.blurCtx = this.blurCanvas.getContext('2d');
    this.container.innerHTML = '';
    this.container.appendChild(this.blurCanvas);
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }

  private imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    return c;
  }

  private depthToCanvas(): HTMLCanvasElement {
    const { data, width, height } = this.depth;
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d')!;
    const imgData = ctx.createImageData(width, height);
    for (let i = 0; i < data.length; i++) {
      const v = Math.round(data[i] * 255);
      const o = i * 4;
      imgData.data[o] = v;
      imgData.data[o + 1] = v;
      imgData.data[o + 2] = v;
      imgData.data[o + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    return c;
  }

  setMode(mode: Photo3DMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.disposeInternal(false);
    void this.init();
  }

  setParams(params: Photo3DParams) {
    this.params = params;
    if (this.mesh?.material) {
      const mat = this.mesh.material as import('three').ShaderMaterial;
      mat.uniforms.uDisplacement.value = params.parallaxStrength * 0.35;
      mat.uniforms.uParallax.value = params.parallaxStrength * 0.04;
    }
  }

  setPointer(x: number, y: number) {
    this.state.pointerX = x;
    this.state.pointerY = y;
  }

  private startLoop() {
    const tick = (t: number) => {
      if (this.disposed) return;
      this.state.phase = t * 0.001;
      this.renderFrame();
      this.animId = requestAnimationFrame(tick);
    };
    this.animId = requestAnimationFrame(tick);
  }

  private renderFrame() {
    const amp = this.params.wiggleAmplitude;
    const autoX = Math.sin(this.state.phase * 1.2) * amp * 0.35;
    const autoY = Math.cos(this.state.phase * 0.9) * amp * 0.25;
    const ox = this.state.pointerX * amp * 0.65 + autoX;
    const oy = this.state.pointerY * amp * 0.45 + autoY;

    if (this.mode === 'blur') {
      this.renderBlur(ox, oy);
      return;
    }

    if (!this.renderer || !this.scene || !this.camera || !this.mesh) return;
    const mat = this.mesh.material as import('three').ShaderMaterial;
    mat.uniforms.uOffset.value.set(ox, oy);

    if (this.mode === 'stereo' && this.stereoCameraR) {
      const eyeSep = this.params.parallaxStrength * 0.08;
      this.camera.position.x = -eyeSep;
      this.stereoCameraR.position.x = eyeSep;
      this.stereoCameraR.position.z = this.camera.position.z;
      this.stereoCameraR.position.y = this.camera.position.y;

      const w = this.renderer.domElement.width;
      const h = this.renderer.domElement.height;
      const halfW = Math.floor(w / 2);

      this.renderer.setScissorTest(true);
      this.renderer.setViewport(0, 0, halfW, h);
      this.renderer.setScissor(0, 0, halfW, h);
      this.renderer.render(this.scene, this.camera);

      this.renderer.setViewport(halfW, 0, halfW, h);
      this.renderer.setScissor(halfW, 0, halfW, h);
      this.renderer.render(this.scene, this.stereoCameraR);
      this.renderer.setScissorTest(false);
    } else {
      this.camera.position.x = ox * 0.15;
      this.camera.position.y = -oy * 0.1;
      this.renderer.render(this.scene, this.camera);
    }
  }

  private renderBlur(_ox: number, _oy: number) {
    const ctx = this.blurCtx;
    const canvas = this.blurCanvas;
    if (!ctx || !canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const img = this.image;
    const strength = this.params.blurStrength;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const blurPx = Math.round(4 + strength * 28);
    const blurred = document.createElement('canvas');
    blurred.width = w;
    blurred.height = h;
    const bctx = blurred.getContext('2d')!;
    bctx.filter = `blur(${blurPx}px)`;
    bctx.drawImage(img, 0, 0, w, h);

    const srcData = ctx.getImageData(0, 0, w, h);
    const blurData = bctx.getImageData(0, 0, w, h);
    const out = ctx.createImageData(w, h);

    const focal = 0.55;
    const range = 0.25 + strength * 0.35;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = x / (w - 1);
        const v = y / (h - 1);
        const d = sampleDepth(this.depth, u, v);
        const t = Math.min(1, Math.max(0, (focal - d) / range));
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          out.data[i + c] = Math.round(
            srcData.data[i + c] * (1 - t) + blurData.data[i + c] * t,
          );
        }
        out.data[i + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  }

  getCanvas(): HTMLCanvasElement | null {
    if (this.mode === 'blur') return this.blurCanvas;
    return this.renderer?.domElement ?? null;
  }

  resize() {
    const aspect = this.image.naturalWidth / this.image.naturalHeight;
    const w = this.container.clientWidth || 640;
    const h = Math.round(w / aspect);
    if (this.renderer) {
      this.renderer.setSize(w, h);
      if (this.camera) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
      }
    }
    if (this.blurCanvas) {
      this.blurCanvas.width = w;
      this.blurCanvas.height = h;
    }
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.animId);
    this.disposeInternal(true);
  }

  private disposeInternal(removeDom: boolean) {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as import('three').Material).dispose();
      this.mesh = null;
    }
    if (this.renderer) {
      if (removeDom) this.renderer.domElement.remove();
      this.renderer.dispose();
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
    this.stereoCameraR = null;
    if (removeDom && this.blurCanvas) {
      this.blurCanvas.remove();
      this.blurCanvas = null;
      this.blurCtx = null;
    }
  }
}

/* ------------------------------------------------------------------ *
 * 循环视频录制
 * ------------------------------------------------------------------ */

export async function recordLoopVideo(
  canvas: HTMLCanvasElement,
  durationMs = 5000,
  fps = 30,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('当前浏览器不支持视频录制');
  }

  const { mimeType } = pickVideoMimeType();
  const stream = canvas.captureStream(fps);
  const chunks: Blob[] = [];

  return new Promise((resolve, reject) => {
    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks, { type: mimeType }));
      };
      recorder.onerror = () => reject(new Error('录制失败'));
      recorder.start(200);

      const start = performance.now();
      const tick = () => {
        const elapsed = performance.now() - start;
        onProgress?.(Math.min(100, Math.round((elapsed / durationMs) * 100)));
        if (elapsed >= durationMs) {
          recorder.stop();
        } else {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop());
      reject(err instanceof Error ? err : new Error('无法启动录制'));
    }
  });
}

/* ------------------------------------------------------------------ *
 * GIF 编码（短循环兜底，gifenc）
 * ------------------------------------------------------------------ */

export async function encodeGif(frames: ImageData[], delayMs = 80): Promise<Blob> {
  if (frames.length === 0) throw new Error('无可用帧');

  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
  const { width, height } = frames[0];
  const gif = GIFEncoder();

  for (const frame of frames) {
    const rgba = frame.data;
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    gif.writeFrame(index, width, height, {
      palette,
      delay: delayMs,
    });
  }

  gif.finish();
  const bytes = gif.bytes();
  return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
}

/** 从 WebGL / 2D canvas 抓取一帧 RGBA。 */
export function grabCanvasFrame(canvas: HTMLCanvasElement): ImageData | null {
  const w = canvas.width;
  const h = canvas.height;
  const scratch = document.createElement('canvas');
  scratch.width = w;
  scratch.height = h;
  const ctx = scratch.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(canvas, 0, 0);
  return ctx.getImageData(0, 0, w, h);
}
