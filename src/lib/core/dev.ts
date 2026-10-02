/**
 * 开发速查类核心数据 —— 零依赖，模板与数据表全部内置。
 * gitignore 模板、HTTP 状态码、User-Agent 解析、IPv4 子网、JSONPath。
 */

/* ------------------------------------------------------------------ *
 * .gitignore 模板
 * ------------------------------------------------------------------ */

export interface GitignoreTemplate {
  id: string;
  label: string;
  group: string;
  content: string;
}

export const GITIGNORE_TEMPLATES: GitignoreTemplate[] = [
  {
    id: 'node',
    label: 'Node.js',
    group: '语言',
    content: `# Dependencies
node_modules/
jspm_packages/

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Diagnostic reports
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage
lib-cov
coverage/
*.lcov
.nyc_output/

# Build output
dist/
build/
out/
.next/
.nuxt/
.output/
.svelte-kit/
.turbo/
.parcel-cache/

# Caches
.cache/
.eslintcache
.stylelintcache
.npm
.yarn/cache
.yarn/unplugged
.pnpm-store/

# Env
.env
.env.local
.env.*.local

# Editors
.DS_Store
*.swp
.idea/
.vscode/*
!.vscode/extensions.json`,
  },
  {
    id: 'python',
    label: 'Python',
    group: '语言',
    content: `__pycache__/
*.py[cod]
*$py.class
*.so

.Python
build/
dist/
*.egg-info/
.eggs/

# Virtual envs
.venv/
venv/
env/
ENV/

# Testing
.pytest_cache/
.coverage
htmlcov/
.tox/
.mypy_cache/
.ruff_cache/

# Jupyter
.ipynb_checkpoints/

.env`,
  },
  {
    id: 'java',
    label: 'Java',
    group: '语言',
    content: `*.class
*.log
*.jar
*.war
*.ear

# Build
target/
build/
.gradle/
out/
bin/

# IDE
.idea/
*.iml
*.ipr
*.iws
.classpath
.project
.settings/

.mvn/
mvnw
mvnw.cmd`,
  },
  {
    id: 'go',
    label: 'Go',
    group: '语言',
    content: `# Binaries
*.exe
*.exe~
*.dll
*.so
*.dylib

# Test binary
*.test
*.out

# Go workspace
go.work
go.work.sum

# Vendors
vendor/

.env`,
  },
  {
    id: 'rust',
    label: 'Rust',
    group: '语言',
    content: `target/
**/*.rs.bk
*.pdb

Cargo.lock  # 库项目通常忽略，二进制项目建议提交

.env`,
  },
  {
    id: 'react',
    label: 'React / Vite',
    group: '框架',
    content: `# Vite
dist/
dist-ssr/
.vite/
*.local

# CRA
build/

# Next.js
.next/
out/
next-env.d.ts
.vercel

# Testing
coverage/

# Storybook
storybook-static/

.env
.env.local`,
  },
  {
    id: 'vue',
    label: 'Vue / Nuxt',
    group: '框架',
    content: `dist/
.nuxt/
.output/
.nitro/
.cache/
.env
.env.*

node_modules/
*.log
.DS_Store`,
  },
  {
    id: 'next',
    label: 'Next.js',
    group: '框架',
    content: `.next/
out/
build/
next-env.d.ts

.vercel
*.tsbuildinfo

.env*.local
.DS_Store
npm-debug.log*`,
  },
  {
    id: 'flutter',
    label: 'Flutter / Dart',
    group: '框架',
    content: `.dart_tool/
.flutter-plugins
.flutter-plugins-dependencies
.packages
.pub-cache/
.pub/
build/
ios/Flutter/.last_build_id
*.iml
.idea/
android/.gradle/
android/local.properties`,
  },
  {
    id: 'docker',
    label: 'Docker',
    group: '工具',
    content: `# Docker
docker-compose.override.yml
.docker/
*.dockerfile.bak

# Volumes with data
data/
volumes/`,
  },
  {
    id: 'vscode',
    label: 'VS Code',
    group: '工具',
    content: `.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
!.vscode/*.code-snippets
.history/
*.vsix`,
  },
  {
    id: 'macos',
    label: 'macOS',
    group: '系统',
    content: `.DS_Store
.AppleDouble
.LSOverride
._*
.Spotlight-V100
.Trashes
.AppleDB
.AppleDesktop
Network Trash Folder`,
  },
  {
    id: 'windows',
    label: 'Windows',
    group: '系统',
    content: `Thumbs.db
Thumbs.db:encryptable
ehthumbs.db
[Dd]esktop.ini
$RECYCLE.BIN/
*.lnk
*.stackdump`,
  },
  {
    id: 'linux',
    label: 'Linux',
    group: '系统',
    content: `*~
.fuse_hidden*
.directory
.Trash-*
.nfs*`,
  },
];

export function buildGitignore(ids: string[]): string {
  const picked = GITIGNORE_TEMPLATES.filter((t) => ids.includes(t.id));
  if (picked.length === 0) return '';

  const header = `# 由 iWhimsy 生成 · ${picked.map((p) => p.label).join(' + ')}\n# 生成后建议按项目实际情况删减\n`;
  const body = picked.map((t) => `\n# ===== ${t.label} =====\n${t.content.trim()}`).join('\n');
  return `${header}${body}\n`;
}

/* ------------------------------------------------------------------ *
 * HTTP 状态码
 * ------------------------------------------------------------------ */

export interface HttpStatus {
  code: number;
  name: string;
  en: string;
  group: '1xx' | '2xx' | '3xx' | '4xx' | '5xx';
  meaning: string;
  tip: string;
}

export const HTTP_STATUSES: HttpStatus[] = [
  {
    code: 100,
    name: '继续',
    en: 'Continue',
    group: '1xx',
    meaning: '服务器已收到请求头，客户端可继续发送请求体。',
    tip: '常见于大文件上传前的探测请求，一般无需处理。',
  },
  {
    code: 101,
    name: '切换协议',
    en: 'Switching Protocols',
    group: '1xx',
    meaning: '服务器同意升级协议（如 HTTP → WebSocket）。',
    tip: 'WebSocket 握手的标志，看见它说明连接已升级成功。',
  },
  {
    code: 102,
    name: '处理中',
    en: 'Processing',
    group: '1xx',
    meaning: '服务器已收到请求但尚未完成处理。',
    tip: '用于防止客户端超时，WebDAV 场景较多。',
  },
  {
    code: 103,
    name: '早期提示',
    en: 'Early Hints',
    group: '1xx',
    meaning: '在正式响应前先返回部分响应头。',
    tip: '配合 Link 头做资源预加载，可提升首屏速度。',
  },

  {
    code: 200,
    name: '成功',
    en: 'OK',
    group: '2xx',
    meaning: '请求成功，响应体中包含结果。',
    tip: 'GET 返回资源，POST 返回处理结果。',
  },
  {
    code: 201,
    name: '已创建',
    en: 'Created',
    group: '2xx',
    meaning: '请求成功并创建了新资源。',
    tip: '响应应带 Location 头指向新资源地址。',
  },
  {
    code: 202,
    name: '已接受',
    en: 'Accepted',
    group: '2xx',
    meaning: '请求已接受但尚未处理完成。',
    tip: '异步任务常用；客户端需轮询或用回调查询结果。',
  },
  {
    code: 204,
    name: '无内容',
    en: 'No Content',
    group: '2xx',
    meaning: '请求成功，但没有响应体。',
    tip: 'DELETE 常用。前端要注意别对 204 做 JSON.parse。',
  },
  {
    code: 206,
    name: '部分内容',
    en: 'Partial Content',
    group: '2xx',
    meaning: '返回了 Range 请求指定的部分内容。',
    tip: '断点续传、视频分片播放依赖它。',
  },

  {
    code: 301,
    name: '永久重定向',
    en: 'Moved Permanently',
    group: '3xx',
    meaning: '资源已永久迁移到新地址。',
    tip: '浏览器会缓存，SEO 权重会转移到新地址。',
  },
  {
    code: 302,
    name: '临时重定向',
    en: 'Found',
    group: '3xx',
    meaning: '资源临时从另一个地址响应。',
    tip: '不缓存，常用于登录后跳回原页面。',
  },
  {
    code: 303,
    name: '查看其他位置',
    en: 'See Other',
    group: '3xx',
    meaning: '应用 GET 方法访问另一个 URI。',
    tip: 'POST 后重定向到结果页的标准做法。',
  },
  {
    code: 304,
    name: '未修改',
    en: 'Not Modified',
    group: '3xx',
    meaning: '资源未变化，可使用本地缓存。',
    tip: '配合 ETag / Last-Modified，能省掉整个响应体。',
  },
  {
    code: 307,
    name: '临时重定向',
    en: 'Temporary Redirect',
    group: '3xx',
    meaning: '临时重定向，且不允许改变请求方法。',
    tip: '比 302 严格：POST 不会被改成 GET。',
  },
  {
    code: 308,
    name: '永久重定向',
    en: 'Permanent Redirect',
    group: '3xx',
    meaning: '永久重定向，且不允许改变请求方法。',
    tip: '比 301 严格，适合 API 迁移。',
  },

  {
    code: 400,
    name: '请求错误',
    en: 'Bad Request',
    group: '4xx',
    meaning: '请求语法或参数有误，服务器无法理解。',
    tip: '先检查 JSON 格式、必填字段与参数类型。',
  },
  {
    code: 401,
    name: '未授权',
    en: 'Unauthorized',
    group: '4xx',
    meaning: '缺少或无效的身份凭证。',
    tip: '检查 token 是否过期、请求头是否带 Authorization。',
  },
  {
    code: 403,
    name: '禁止访问',
    en: 'Forbidden',
    group: '4xx',
    meaning: '身份已识别，但没有访问该资源的权限。',
    tip: '与 401 的区别：401 是「你是谁」，403 是「你不配」。',
  },
  {
    code: 404,
    name: '未找到',
    en: 'Not Found',
    group: '4xx',
    meaning: '服务器上没有这个资源。',
    tip: '检查 URL 拼写、路由配置，或资源是否已被删除。',
  },
  {
    code: 405,
    name: '方法不允许',
    en: 'Method Not Allowed',
    group: '4xx',
    meaning: '该资源不支持当前请求方法。',
    tip: '用 GET 去打只接受 POST 的接口就会遇到。',
  },
  {
    code: 408,
    name: '请求超时',
    en: 'Request Timeout',
    group: '4xx',
    meaning: '服务器等待请求超时。',
    tip: '网络差或请求体过大；考虑重试与分片。',
  },
  {
    code: 409,
    name: '冲突',
    en: 'Conflict',
    group: '4xx',
    meaning: '请求与资源当前状态冲突。',
    tip: '并发写入、重复创建唯一资源时常见。',
  },
  {
    code: 410,
    name: '已删除',
    en: 'Gone',
    group: '4xx',
    meaning: '资源曾经存在，现已永久移除。',
    tip: '比 404 更明确，客户端应停止再请求。',
  },
  {
    code: 413,
    name: '请求体过大',
    en: 'Payload Too Large',
    group: '4xx',
    meaning: '请求体超过服务器限制。',
    tip: '检查 Nginx 的 client_max_body_size 或网关限制。',
  },
  {
    code: 415,
    name: '不支持的媒体类型',
    en: 'Unsupported Media Type',
    group: '4xx',
    meaning: 'Content-Type 不被支持。',
    tip: '发 JSON 时记得设 application/json。',
  },
  {
    code: 418,
    name: '我是茶壶',
    en: "I'm a Teapot",
    group: '4xx',
    meaning: 'RFC 2324 愚人节彩蛋状态码。',
    tip: '没有实际用途，但常出现在面试官的追问里。',
  },
  {
    code: 422,
    name: '无法处理的实体',
    en: 'Unprocessable Entity',
    group: '4xx',
    meaning: '语义正确但业务校验未通过。',
    tip: '表单校验失败常用它，而不是 400。',
  },
  {
    code: 429,
    name: '请求过多',
    en: 'Too Many Requests',
    group: '4xx',
    meaning: '触发了限流。',
    tip: '看 Retry-After 响应头，做指数退避重试。',
  },

  {
    code: 500,
    name: '服务器内部错误',
    en: 'Internal Server Error',
    group: '5xx',
    meaning: '服务器处理时发生未捕获的错误。',
    tip: '查服务端日志和堆栈，前端只能提示稍后重试。',
  },
  {
    code: 501,
    name: '未实现',
    en: 'Not Implemented',
    group: '5xx',
    meaning: '服务器不支持该请求方法。',
    tip: '接口尚未开发完成。',
  },
  {
    code: 502,
    name: '错误网关',
    en: 'Bad Gateway',
    group: '5xx',
    meaning: '网关/代理从上游收到了无效响应。',
    tip: '通常是上游服务挂了或重启中，检查网关配置。',
  },
  {
    code: 503,
    name: '服务不可用',
    en: 'Service Unavailable',
    group: '5xx',
    meaning: '服务器暂时无法处理请求。',
    tip: '过载或维护中，看 Retry-After。',
  },
  {
    code: 504,
    name: '网关超时',
    en: 'Gateway Timeout',
    group: '5xx',
    meaning: '网关等待上游响应超时。',
    tip: '上游接口太慢，查慢查询与调用链。',
  },
];

export const HTTP_GROUPS = ['1xx', '2xx', '3xx', '4xx', '5xx'] as const;

export const HTTP_GROUP_LABEL: Record<(typeof HTTP_GROUPS)[number], string> = {
  '1xx': '信息响应',
  '2xx': '成功',
  '3xx': '重定向',
  '4xx': '客户端错误',
  '5xx': '服务端错误',
};

/* ------------------------------------------------------------------ *
 * User-Agent 解析
 * ------------------------------------------------------------------ */

export interface UaResult {
  browser: string;
  browserVersion: string;
  engine: string;
  os: string;
  osVersion: string;
  device: string;
  isBot: boolean;
  raw: string;
}

const UA_RULES: { name: string; re: RegExp }[] = [
  { name: 'Edge', re: /Edg(?:e|A|iOS)?\/([\d.]+)/ },
  { name: 'Opera', re: /(?:OPR|Opera)[/ ]([\d.]+)/ },
  { name: 'Samsung Internet', re: /SamsungBrowser\/([\d.]+)/ },
  { name: 'Chrome', re: /(?:Chrome|CriOS)\/([\d.]+)/ },
  { name: 'Firefox', re: /(?:Firefox|FxiOS)\/([\d.]+)/ },
  { name: 'Safari', re: /Version\/([\d.]+).*Safari/ },
  { name: 'IE', re: /(?:MSIE |Trident.*rv:)([\d.]+)/ },
];

const OS_RULES: { name: string; re: RegExp }[] = [
  { name: 'Windows', re: /Windows NT ([\d.]+)/ },
  { name: 'Android', re: /Android ([\d.]+)/ },
  { name: 'iOS', re: /(?:iPhone|iPad|iPod).*? OS ([\d_]+)/ },
  { name: 'macOS', re: /Mac OS X ([\d_.]+)/ },
  { name: 'Linux', re: /Linux/ },
];

const BOT_RE =
  /bot|crawler|spider|crawling|slurp|curl|wget|headless|monitor|preview|facebookexternalhit|lighthouse|pingdom|semrush|ahrefs|bingpreview|applebot|googlebot|baiduspider|bytespider|petalbot|yisou/i;

const ENGINE_RULES: { name: string; re: RegExp }[] = [
  { name: 'Blink', re: /Chrome\/(?:[\d.]+).*? Safari/ },
  { name: 'WebKit', re: /AppleWebKit\/([\d.]+)/ },
  { name: 'Gecko', re: /Gecko\/([\d.]+)/ },
  { name: 'Trident', re: /Trident\/([\d.]+)/ },
];

export function parseUserAgent(ua: string): UaResult {
  const raw = ua.trim();
  const empty: UaResult = {
    browser: '未知',
    browserVersion: '',
    engine: '未知',
    os: '未知',
    osVersion: '',
    device: '未知',
    isBot: false,
    raw,
  };
  if (!raw) return empty;

  let browser = '未知';
  let browserVersion = '';
  for (const rule of UA_RULES) {
    const m = rule.re.exec(raw);
    if (m) {
      browser = rule.name;
      browserVersion = m[1] ?? '';
      break;
    }
  }

  let engine = '未知';
  for (const rule of ENGINE_RULES) {
    if (rule.re.test(raw)) {
      engine = rule.name;
      break;
    }
  }

  let os = '未知';
  let osVersion = '';
  for (const rule of OS_RULES) {
    const m = rule.re.exec(raw);
    if (m) {
      os = rule.name;
      osVersion = (m[1] ?? '').replace(/_/g, '.');
      break;
    }
  }

  let device = '桌面端';
  if (/iPad|Tablet|Android.*Tablet/i.test(raw)) device = '平板';
  else if (/Mobile|Android|iPhone/i.test(raw)) device = '手机';
  else if (/TV|SmartTV/i.test(raw)) device = '电视';
  if (BOT_RE.test(raw) && device === '桌面端') device = '服务器/爬虫';

  const winMap: Record<string, string> = {
    '10.0': '10 / 11',
    '6.3': '8.1',
    '6.2': '8',
    '6.1': '7',
  };
  if (os === 'Windows' && winMap[osVersion]) osVersion = winMap[osVersion]!;

  return { browser, browserVersion, engine, os, osVersion, device, isBot: BOT_RE.test(raw), raw };
}

/* ------------------------------------------------------------------ *
 * IPv4 子网计算
 * ------------------------------------------------------------------ */

export interface SubnetResult {
  ok: boolean;
  error?: string;
  ip: string;
  prefix: number;
  network: string;
  broadcast: string;
  mask: string;
  wildcard: string;
  firstHost: string;
  lastHost: string;
  totalHosts: number;
  usableHosts: number;
  ipBinary: string;
  maskBinary: string;
  isPrivate: boolean;
}

const ipToLong = (ip: string): number =>
  ip.split('.').reduce((acc, part) => (acc << 8) + (Number(part) & 255), 0) >>> 0;

const longToIp = (n: number): string =>
  [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');

const toBinary = (n: number): string =>
  [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
    .map((b) => b.toString(2).padStart(8, '0'))
    .join('.');

export function calculateSubnet(input: string): SubnetResult {
  const trimmed = input.trim();
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/.exec(trimmed);
  if (!match) {
    return {
      ok: false,
      error: '格式应为 IPv4 地址，可带 /前缀，例如 192.168.1.0/24',
      ip: '',
      prefix: 0,
      network: '',
      broadcast: '',
      mask: '',
      wildcard: '',
      firstHost: '',
      lastHost: '',
      totalHosts: 0,
      usableHosts: 0,
      ipBinary: '',
      maskBinary: '',
      isPrivate: false,
    };
  }

  const octets = [match[1]!, match[2]!, match[3]!, match[4]!].map(Number);
  if (octets.some((o) => o > 255)) {
    return {
      ok: false,
      error: '每个段必须在 0 ~ 255 之间',
      ip: '',
      prefix: 0,
      network: '',
      broadcast: '',
      mask: '',
      wildcard: '',
      firstHost: '',
      lastHost: '',
      totalHosts: 0,
      usableHosts: 0,
      ipBinary: '',
      maskBinary: '',
      isPrivate: false,
    };
  }

  const prefix = match[5] !== undefined ? Number(match[5]) : 32;
  if (prefix < 0 || prefix > 32) {
    return {
      ok: false,
      error: '前缀长度必须在 0 ~ 32 之间',
      ip: '',
      prefix: 0,
      network: '',
      broadcast: '',
      mask: '',
      wildcard: '',
      firstHost: '',
      lastHost: '',
      totalHosts: 0,
      usableHosts: 0,
      ipBinary: '',
      maskBinary: '',
      isPrivate: false,
    };
  }

  const ip = octets.join('.');
  const ipLong = ipToLong(ip);
  const maskLong = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const networkLong = (ipLong & maskLong) >>> 0;
  const broadcastLong = (networkLong | (~maskLong >>> 0)) >>> 0;

  const totalHosts = 2 ** (32 - prefix);
  const usableHosts = prefix >= 31 ? totalHosts : Math.max(0, totalHosts - 2);

  const first = prefix >= 31 ? networkLong : (networkLong + 1) >>> 0;
  const last = prefix >= 31 ? broadcastLong : (broadcastLong - 1) >>> 0;

  const isPrivate =
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1]! >= 16 && octets[1]! <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    octets[0] === 127;

  return {
    ok: true,
    ip,
    prefix,
    network: longToIp(networkLong),
    broadcast: longToIp(broadcastLong),
    mask: longToIp(maskLong),
    wildcard: longToIp(~maskLong >>> 0),
    firstHost: usableHosts > 0 ? longToIp(first) : '—',
    lastHost: usableHosts > 0 ? longToIp(last) : '—',
    totalHosts,
    usableHosts,
    ipBinary: toBinary(ipLong),
    maskBinary: toBinary(maskLong),
    isPrivate,
  };
}

/** 把网段等分成 n 个子网 */
export function splitSubnet(ip: string, prefix: number, parts: number): string[] {
  if (prefix >= 32 || parts < 2) return [`${ip}/${prefix}`];
  const bits = Math.ceil(Math.log2(parts));
  const newPrefix = Math.min(32, prefix + bits);
  const size = 2 ** (32 - newPrefix);
  const base = ipToLong(ip);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (base & mask) >>> 0;
  const out: string[] = [];
  for (let i = 0; i < 2 ** bits; i += 1) {
    out.push(`${longToIp((network + i * size) >>> 0)}/${newPrefix}`);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * JSONPath 查询（实用子集）
 * ------------------------------------------------------------------ */

export interface JsonPathMatch {
  path: string;
  value: unknown;
}

/**
 * 支持的语法：
 *   $.a.b        $['a']['b']   键访问
 *   $[0] $[1:3] $[*]           数组下标 / 切片 / 全部
 *   $..key                     递归搜索
 *   $[?(@.age > 18)]           过滤（支持 = != > >= < <= && ||）
 * 不支持：函数式脚本、正则匹配、复杂表达式。
 */
export function queryJsonPath(
  data: unknown,
  expression: string,
): { matches: JsonPathMatch[]; error: string | null } {
  const expr = expression.trim();
  if (!expr) return { matches: [], error: null };
  if (!expr.startsWith('$')) {
    return { matches: [], error: '表达式必须以 $ 开头，例如 $.items[0].name' };
  }

  const matches: JsonPathMatch[] = [];
  try {
    walk(data, expr.slice(1), '$', matches);
  } catch (err) {
    return { matches: [], error: err instanceof Error ? err.message : '查询失败' };
  }
  return { matches, error: null };
}

function walk(node: unknown, rest: string, path: string, out: JsonPathMatch[]): void {
  if (rest === '' || rest === '.') {
    out.push({ path, value: node });
    return;
  }

  // 递归下降：..key
  if (rest.startsWith('..')) {
    const after = rest.slice(2);
    const keyMatch = /^([A-Za-z_$][\w$-]*)/.exec(after);
    const key = keyMatch?.[1];
    const remaining = key ? after.slice(key.length) : '';
    deepSearch(node, key ?? '', remaining, path, out);
    return;
  }

  if (rest.startsWith('.')) {
    const after = rest.slice(1);
    const m = /^([A-Za-z_$][\w$-]*)/.exec(after);
    if (!m) throw new Error(`无法解析键名：${after}`);
    const key = m[1]!;
    const remaining = after.slice(key.length);
    if (node === null || typeof node !== 'object' || !(key in (node as Record<string, unknown>))) {
      return;
    }
    walk((node as Record<string, unknown>)[key], remaining, `${path}.${key}`, out);
    return;
  }

  if (rest.startsWith('[')) {
    parseBracket(node, rest, path, out);
    return;
  }

  throw new Error(`无法解析表达式片段：${rest.slice(0, 20)}`);
}

function deepSearch(
  node: unknown,
  key: string,
  remaining: string,
  path: string,
  out: JsonPathMatch[],
): void {
  if (node === null || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    node.forEach((item, i) => {
      walk(item, remaining.length ? `.${key}${remaining}` : `.${key}`, `${path}[${i}]`, out);
      deepSearch(item, key, remaining, `${path}[${i}]`, out);
    });
    return;
  }

  const obj = node as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    if (key === '' || k === key) {
      walk(obj[k], remaining, `${path}.${k}`, out);
    }
    deepSearch(obj[k], key, remaining, `${path}.${k}`, out);
  }
}

function parseBracket(node: unknown, rest: string, path: string, out: JsonPathMatch[]): void {
  // 找到与第一个 [ 匹配的 ]
  let depth = 0;
  let end = -1;
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === '[') depth += 1;
    else if (rest[i] === ']') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) throw new Error('方括号没有闭合');

  const inner = rest.slice(1, end);
  const remaining = rest.slice(end + 1);

  // 过滤器
  if (inner.startsWith('?')) {
    const cond = /\(\s*@([\w.-]+)\s*(==|=|!=|>=|<=|>|<)\s*(.+?)\s*\)/.exec(inner);
    if (!Array.isArray(node)) return;
    node.forEach((item, i) => {
      if (!cond) return;
      const field = cond[1]!;
      const op = cond[2]!;
      const rawExpected = cond[3]!.trim().replace(/^['"]|['"]$/g, '');
      const actual = readField(item, field);
      if (compare(actual, op, rawExpected)) {
        walk(item, remaining, `${path}[${i}]`, out);
      }
    });
    return;
  }

  // 引号键
  const quoted = /^'([^']*)'$|^"([^"]*)"$/.exec(inner);
  if (quoted) {
    const key = quoted[1] ?? quoted[2] ?? '';
    if (node === null || typeof node !== 'object' || !(key in (node as Record<string, unknown>)))
      return;
    walk((node as Record<string, unknown>)[key], remaining, `${path}['${key}']`, out);
    return;
  }

  if (inner === '*') {
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, remaining, `${path}[${i}]`, out));
    } else if (node !== null && typeof node === 'object') {
      for (const k of Object.keys(node as Record<string, unknown>)) {
        walk((node as Record<string, unknown>)[k], remaining, `${path}.${k}`, out);
      }
    }
    return;
  }

  // 切片 a:b
  if (inner.includes(':')) {
    const [aRaw, bRaw] = inner.split(':');
    const start = aRaw && aRaw.trim() !== '' ? Number(aRaw.trim()) : 0;
    if (!Array.isArray(node)) return;
    const endIdx = bRaw && bRaw.trim() !== '' ? Number(bRaw.trim()) : node.length;
    node
      .slice(start, endIdx)
      .forEach((item, i) => walk(item, remaining, `${path}[${start + i}]`, out));
    return;
  }

  const index = Number(inner);
  if (Number.isNaN(index)) throw new Error(`无法解析下标：${inner}`);
  if (!Array.isArray(node)) return;
  if (index < 0 || index >= node.length) return;
  walk(node[index], remaining, `${path}[${index}]`, out);
}

function readField(node: unknown, field: string): unknown {
  return field.split('.').reduce<unknown>((acc, k) => {
    if (acc === null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[k];
  }, node);
}

function compare(actual: unknown, op: string, expected: string): boolean {
  const numActual = typeof actual === 'number' ? actual : Number(actual);
  const numExpected = Number(expected);
  const bothNumbers =
    !Number.isNaN(numActual) && !Number.isNaN(numExpected) && expected.trim() !== '';

  switch (op) {
    case '=':
    case '==':
      return bothNumbers ? numActual === numExpected : String(actual) === expected;
    case '!=':
      return bothNumbers ? numActual !== numExpected : String(actual) !== expected;
    case '>':
      return bothNumbers && numActual > numExpected;
    case '>=':
      return bothNumbers && numActual >= numExpected;
    case '<':
      return bothNumbers && numActual < numExpected;
    case '<=':
      return bothNumbers && numActual <= numExpected;
    default:
      return false;
  }
}
