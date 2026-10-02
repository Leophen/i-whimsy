/**
 * 待开发工具的实现规格 —— 类型定义。
 *
 * 设计意图：让「占位页」本身承载可执行的实现说明。
 * 一个还没实现的工具，其页面不是空白，而是一份写清了
 * 技术路线、依赖体积、实现步骤、已知坑与验收标准的规格书。
 * 这样后续接手的人（或模型）打开页面就知道该怎么把它做出来。
 */

/** 实现投入量级：S ≈ 半天，M ≈ 1–2 天，L ≈ 3–5 天，XL ≈ 1–2 周 */
export type Effort = 'S' | 'M' | 'L' | 'XL';

export interface SpecDep {
  /** 包名或资源名 */
  name: string;
  /** 体积（务必写，浏览器工具站最常见的失败模式就是体积失控） */
  size?: string;
  /** 为什么选它 / 注意事项 */
  note?: string;
}

export interface ToolSpec {
  /** 一句话技术路线，必须具体到「用什么做什么」 */
  approach: string;
  effort: Effort;
  /** 依赖的浏览器 API，也是「这台设备能不能跑」的探测点 */
  apis: string[];
  deps: SpecDep[];
  /** 实现步骤，有序 */
  steps: string[];
  /** 已探明的坑 */
  pitfalls: string[];
  /** 验收标准 —— 做到什么程度算完成 */
  done: string[];
}

export const EFFORT_LABEL: Record<Effort, string> = {
  S: '半天',
  M: '1–2 天',
  L: '3–5 天',
  XL: '1–2 周',
};
