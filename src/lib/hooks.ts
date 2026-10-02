'use client';

import * as React from 'react';

const noopSubscribe = () => () => {};

/**
 * 判断当前是否已经完成 hydration。
 *
 * 服务端渲染时返回 false，客户端渲染时返回 true —— 用于回避 SSR 与首屏客户端
 * 结果不一致的问题（收藏按钮依赖 localStorage、时区依赖浏览器 Intl 等）。
 *
 * 相比 `useEffect(() => setMounted(true), [])` 的老写法，useSyncExternalStore
 * 不会触发额外的一次 render + commit。
 */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => true, // 客户端快照
    () => false, // 服务端快照
  );
}

/* ------------------------------------------------------------------ *
 * useAsyncComputed — 带防抖的异步派生值
 * ------------------------------------------------------------------ */

export interface AsyncComputedState<T> {
  /** 上一次成功算出的值；还没算出时为 null */
  value: T | null;
  error: string | null;
  /** 正在计算（已过防抖窗口，loader 在跑） */
  pending: boolean;
}

export interface UseAsyncComputedOptions {
  /** 防抖毫秒数，0 表示立即执行 */
  delay?: number;
  /** 为 false 时不计算，且不产出任何值 */
  enabled?: boolean;
}

/**
 * 工具页里「输入变了 → 异步算一下 → 把结果显示出来」的模式几乎每个工具都有
 * （摘要、HMAC、AES、调色板、QR 码……）。手写一遍会重复三件事：
 *   1. 依赖变化后要延迟执行（PBKDF2、图片解码都不便宜）
 *   2. 过期的结果必须丢弃，否则慢的旧结果会覆盖新的
 *   3. 要维护 busy / error 两个状态
 *
 * 这里一次性收口，调用方只需要：
 *
 * ```tsx
 * const { value, error, pending } = useAsyncComputed(
 *   () => digest(text, algorithm),
 *   [text, algorithm],
 *   { delay: 200, enabled: Boolean(text) },
 * );
 * ```
 *
 * 关于 lint：本文件是唯一一处刻意使用 `set-state-in-effect` 的地方 ——
 * 这是异步编排本身必需的（拿 Promise 结果更新 state）。其余组件都不再
 * 在 effect 里同步 setState，所以这个例外被限制在最小范围内。
 */
/* eslint-disable react-hooks/set-state-in-effect */
export function useAsyncComputed<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList,
  options: UseAsyncComputedOptions = {},
): AsyncComputedState<T> {
  const { delay = 250, enabled = true } = options;

  const [state, setState] = React.useState<AsyncComputedState<T>>({
    value: null,
    error: null,
    pending: false,
  });

  // 用 ref 持有最新的 loader，避免把函数本身塞进依赖里导致每次渲染都重跑。
  // 赋值放在 effect 里而不是渲染期间 —— 渲染期间写 ref 会破坏 React 的可中断渲染。
  const loaderRef = React.useRef(loader);
  React.useEffect(() => {
    loaderRef.current = loader;
  });

  const hasValue = React.useRef(false);

  React.useEffect(() => {
    if (!enabled) {
      setState({ value: null, error: null, pending: false });
      hasValue.current = false;
      return;
    }

    let cancelled = false;

    const start = () => {
      setState((prev) => ({ ...prev, pending: true }));
      loaderRef
        .current()
        .then((value) => {
          if (cancelled) return;
          hasValue.current = true;
          setState({ value, error: null, pending: false });
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setState({
            value: null,
            error: err instanceof Error ? err.message : '计算失败',
            pending: false,
          });
        });
    };

    // 第一次（还没算过任何值）不防抖，避免工具页一进来就是空的
    const timer = setTimeout(start, hasValue.current ? delay : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, delay, ...deps]);

  return state;
}
/* eslint-enable react-hooks/set-state-in-effect */

/* ------------------------------------------------------------------ *
 * useVisibilityPause — 标签页隐藏时暂停 RAF，省电降温
 * ------------------------------------------------------------------ */

export function useVisibilityPause(): boolean {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return visible;
}

/**
 * 监听 canvas 容器尺寸变化，同步 backing store（devicePixelRatio 感知）。
 * 布局未完成（0×0）时跳过，下一帧 ResizeObserver 会再次触发。
 */
export function useCanvasResize(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onResize?: (width: number, height: number) => void,
) {
  const onResizeRef = React.useRef(onResize);
  React.useEffect(() => {
    onResizeRef.current = onResize;
  });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sync = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      onResizeRef.current?.(w, h);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(canvas);
    window.addEventListener('resize', sync);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [canvasRef]);
}

/** 在页面可见时跑 requestAnimationFrame 循环。 */
export function useRafLoop(callback: (dt: number) => void, active = true) {
  const cbRef = React.useRef(callback);
  const visible = useVisibilityPause();
  const lastRef = React.useRef(0);

  React.useEffect(() => {
    cbRef.current = callback;
  });

  React.useEffect(() => {
    if (!active || !visible) return;
    let id = 0;
    const tick = (now: number) => {
      const dt = lastRef.current ? now - lastRef.current : 16;
      lastRef.current = now;
      cbRef.current(dt);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [active, visible]);
}
