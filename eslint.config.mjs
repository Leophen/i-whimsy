import next from 'eslint-config-next';
import tseslint from 'typescript-eslint';

/**
 * ESLint flat config。
 *
 * 之前仓库只装了 eslint + eslint-config-next，却没有配置文件，
 * `npm run lint` 实际是跑不通的（报错找不到 eslint.config.*）。
 * 自定义规则必须挂在带 @typescript-eslint 插件的 config 块里，
 * 否则 flat config 会报「could not find plugin」。
 *
 * @type {import('eslint').Linter.Config[]}
 */
const config = [
  // 构建产物与依赖目录不参与检查
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', '.next-*/**'],
  },
  ...next,
  ...tseslint.configs.recommended,
  {
    rules: {
      // 工具页大量在异步回调里 setState，next/no-async-client-component 之外
      // 的规则由 next 的默认集覆盖，这里只做必要的收口
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];

export default config;
