import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'radix-ui'],
  },
  async redirects() {
    return [
      { source: '/tools', destination: '/', permanent: true },
      { source: '/categories/:id', destination: '/?category=:id', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // 跨源隔离：这是多线程 WASM 的前提。
          // 没有这两个头，SharedArrayBuffer 不可用，
          // ffmpeg-mt / 多线程编解码 / 多线程 ONNX 推理都会退化成单线程。
          // 本项目没有第三方嵌入资源，所以 require-corp 不会误伤。
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // 模型与 WASM 产物体积大且内容寻址，长缓存；位置在 public/models、public/wasm
        source: '/:dir(models|wasm)/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
