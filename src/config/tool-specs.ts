import type { ToolSpec } from '@/lib/tool-spec';

/**
 * 待开发工具的实现规格。
 *
 * 这份文件是「占位页即规格」的数据源：工具页在 status 为 planned 时
 * 会把这里的内容渲染成一份可执行的实现说明。
 *
 * 写规格时的三条硬要求：
 * 1. **必须写依赖库的体积**。浏览器工具站最大的失败模式是把 30MB 的 WASM
 *    塞进首屏，用户打开就白屏。体积是设计决策，不是细节。
 * 2. **必须写降级路径**。WebGPU / WebCodecs / OPFS 的支持率都不完整，
 *    没有降级方案的工具等于对一半用户不可用。
 * 3. **必须写已探明的坑**。调研阶段查到的实测数据（谁慢多少倍、谁不支持谁）
 *    直接写进来，避免实现者再踩一遍。
 */

export const TOOL_SPECS: Record<string, ToolSpec> = {
  /* ==================== 本地 AI 推理 ==================== */

  'bg-remover': {
    approach:
      '用 ONNX Runtime Web 加载 RMBG-1.4（或 u2net）分割模型，把图片缩放到模型输入尺寸推理出 alpha 通道，再上采样回原尺寸做前景合成。',
    effort: 'L',
    apis: ['WebGPU（优先）', 'WASM SIMD + 多线程（回退）', 'OffscreenCanvas', 'Web Worker'],
    deps: [
      {
        name: 'onnxruntime-web',
        size: '单 wasm 变体 ~23.5MB',
        note: '只引 simd 一套，不要全引；CDN 懒加载',
      },
      {
        name: 'RMBG-1.4 量化版',
        size: '~44MB（int8 量化后约 11MB）',
        note: '放 /public/models，配合 Cache Storage 缓存',
      },
    ],
    steps: [
      'Worker 里初始化 ORT session：优先尝试 webgpu executionProvider，失败则回退 wasm。',
      '图片 → OffscreenCanvas 缩放（推荐长边 1024）→ 归一化成 Float32Array [1,3,H,W]。',
      '推理得到 [1,1,H,W] 的显著性图，做 min-max 归一化得到 0~255 的 alpha。',
      '把 alpha 上采样回原尺寸（用 canvas drawImage 双线性插值即可），与前景 RGB 合成。',
      '输出 PNG（必须保留透明通道，不能用 JPEG）。',
      '加「换背景」：把合成结果叠在纯色 / 自定义图片上。',
    ],
    pitfalls: [
      '模型首次加载几十 MB，必须显示下载进度条并缓存到 Cache Storage，否则用户以为卡死。',
      'WebGPU 全局支持率 83.99%，但实际只有 0.004% 的页面真正提交过 GPU 任务 —— 不能假设可用，必须有 WASM 回退。',
      'WASM 多线程需要 SharedArrayBuffer，必须在 next.config 下发 COOP/COEP（本项目已配置）。',
      '输出必须走 PNG；JPEG 没有 alpha 通道，抠图结果会变成黑底。',
    ],
    done: [
      '人像与商品图抠图边缘没有明显锯齿，发丝区域可接受。',
      '断网后再次访问能直接命中缓存、秒开。',
      'WebGPU 不可用时自动回退且给出提示，不报错、不白屏。',
    ],
  },

  'whisper-transcribe': {
    approach:
      'transformers.js 加载 Whisper 模型，把音频解码成 16kHz 单声道 Float32 后分块推理，合并时间戳输出 SRT/VTT。',
    effort: 'L',
    apis: ['Web Audio（解码与重采样）', 'WebGPU / WASM', 'Web Worker'],
    deps: [
      { name: '@huggingface/transformers', size: '库 ~558KB min', note: 'Apache-2.0' },
      { name: 'Xenova/whisper-tiny', size: '~40MB', note: '速度快、精度一般，作为默认' },
      { name: 'Xenova/whisper-base', size: '~75MB', note: '精度明显更好，作为可选' },
    ],
    steps: [
      '用 AudioContext.decodeAudioData 解码任意音频，OfflineAudioContext 重采样到 16kHz 单声道。',
      '加载 pipeline("automatic-speech-recognition", model, { dtype: "q8" })。',
      '超过 30 秒的音频按 30s 切块，块间保留 2s 重叠避免切词，推理后按时间戳去重合并。',
      '把 chunks 里的 timestamp 字段转成 SRT 时间轴。',
      '输出面板支持纯文本 / SRT / VTT 三种格式切换与复制、下载。',
    ],
    pitfalls: [
      '模型体积 40MB 起步，必须给「tiny / base」二选一并明示体积与精度差异。',
      'WebGPU 回退 WASM 后速度会掉一个量级，界面上要提示预计耗时。',
      '中文标点与断句对模型尺寸敏感，tiny 效果较差，默认建议 base 用于中文。',
      '不要用 Web Speech API 做对照 —— Chrome/Edge 的语音识别是把音频发到 Google 服务器的，与「本地处理」的产品承诺直接冲突。',
    ],
    done: [
      '10 分钟中文音频能在合理时间内转出可读文本。',
      'SRT 时间轴与音频对齐，导入播放器能正常显示。',
      '模型有下载进度与缓存，二次进入不再重新下载。',
    ],
  },

  'semantic-search': {
    approach:
      '用 transformers.js 的 feature-extraction pipeline 生成句向量，客户端做余弦相似度排序，并把相似度矩阵画成热力图。',
    effort: 'M',
    apis: ['WebGPU / WASM', 'Web Worker'],
    deps: [
      { name: '@huggingface/transformers', size: '~558KB min' },
      { name: 'Xenova/all-MiniLM-L6-v2', size: '~23MB', note: '384 维，中英文都可用，性价比最高' },
    ],
    steps: [
      '文本输入支持「一行一条」和「分隔符切分」两种模式。',
      '批量取 embedding（pooling: "mean", normalize: true），拿到归一化向量后余弦相似度退化为点积。',
      '查询串同样取向量，与全部条目做点积并降序排列，展示 Top-N 与分数。',
      '可选：画 N×N 相似度热力图，辅助发现重复条目。',
      '提供「按相似度去重」：分数超过阈值的聚成一簇，只保留一条。',
    ],
    pitfalls: [
      '必须做向量归一化，否则点积不等于余弦相似度。',
      '条目很多时要分批推理，一次把几千条丢进去会爆内存。',
      '相似度分数没有绝对含义，界面上要给「相对排序」而不是「准确率」的表述。',
    ],
    done: ['同义改写的句子能排到前面。', '1000 条文本的检索在几秒内返回。'],
  },

  'image-classify': {
    approach:
      '用 MobileNet / EfficientNet 分类模型（或 MediaPipe Image Classifier）批量推理图片，输出 Top-N 标签。',
    effort: 'M',
    apis: ['WebGPU / WASM', 'OffscreenCanvas', 'Web Worker'],
    deps: [
      { name: '@mediapipe/tasks-vision', note: 'Apache-2.0，接口比裸 ORT 省事' },
      { name: 'EfficientNet-Lite 分类模型', size: '~5MB', note: '比 ORT 自带的 mobilenet 小很多' },
    ],
    steps: [
      'FileDropzone 支持多选与拖入整个文件夹。',
      'Worker 里逐张 resize 到模型输入尺寸并推理。',
      '结果以表格呈现：缩略图 / 文件名 / Top-1 标签 / 置信度 / 全部 Top-N。',
      '支持按标签分组与筛选，导出 CSV。',
    ],
    pitfalls: [
      'ImageNet 的 1000 类标签需要中文映射表，否则输出的是英文类名。',
      '模型对细分类别（不同犬种）才有意义，粗分类别（猫/狗/车）用轻量模型就够。',
      '批量推理必须限制并发数，否则移动端直接崩。',
    ],
    done: ['一次拖入 50 张图能跑完且界面不卡死。', '结果表可导出 CSV。'],
  },

  'face-landmark': {
    approach: 'MediaPipe Tasks Vision 做实时人脸关键点 / 手势 / 姿态检测，叠加到 video 元素上。',
    effort: 'M',
    apis: ['getUserMedia', 'Canvas 2D 叠加层', 'WASM'],
    deps: [
      { name: '@mediapipe/tasks-vision', size: 'wasm ~3MB' },
      { name: 'FaceLandmarker / HandLandmarker / PoseLandmarker 模型', size: '每类 2~8MB' },
    ],
    steps: [
      '请求摄像头权限，video 上叠一层 canvas 画骨架。',
      '用 detectForVideo 逐帧推理（requestVideoFrameCallback 驱动，不要用 setInterval）。',
      '画关键点与连线，支持切换人脸 / 手势 / 姿态三种模式。',
      '支持「上传视频文件分析」，输出每一帧的检测结果统计。',
    ],
    pitfalls: [
      'detectForVideo 要求时间戳严格递增，重复帧会抛错。',
      '摄像头预览必须在用户手势（点击）后才启动，自动请求会被浏览器拦截。',
      '移动端分辨率别设太高，1080p 逐帧推理会掉帧。',
      '这条链路是真的本地推理，与 Web Speech 不同 —— 画面确实不出设备，可以放心宣传。',
    ],
    done: ['摄像头实时叠加不卡顿（≥24fps）。', '切换模式不残留上一模式的绘制。'],
  },

  /* ==================== 音视频引擎 ==================== */

  'video-transcode': {
    approach:
      'VideoDecoder 解码 → OffscreenCanvas 缩放 → VideoEncoder 编码 → mp4box.js / webm-muxer 封装。全程走浏览器硬件编解码，不加载 ffmpeg.wasm。',
    effort: 'XL',
    apis: ['WebCodecs (VideoDecoder/VideoEncoder)', 'OffscreenCanvas', 'Web Worker'],
    deps: [
      { name: 'mp4box.js', size: '~200KB', note: 'MP4 解复用与封装' },
      { name: 'webm-muxer', size: '~30KB', note: 'WebM 封装，同理还有 mp4-muxer' },
    ],
    steps: [
      '先跑 VideoDecoder.isConfigSupported / VideoEncoder.isConfigSupported 探测本机能力。',
      '用 mp4box.js 解出编码数据，喂给 VideoDecoder 得到 VideoFrame。',
      '按目标分辨率把 VideoFrame 画到 OffscreenCanvas（保持宽高比，两侧留黑或裁剪）。',
      'canvas 输出新 VideoFrame，交给 VideoEncoder（指定 codec、bitrate、framerate）。',
      '编码后的 chunk 交给 muxer 封装，最后生成 Blob 下载。',
      '音频轨单独用 AudioDecoder → AudioEncoder 走一遍，再与视频轨一起封装。',
    ],
    pitfalls: [
      'WebCodecs 支持面：Chrome/Edge 94+、Safari 16.4+（26.0 才补音频）、Firefox 130+ 桌面但 Android 完全没有 VideoDecoder。必须探测 + 明确提示不支持。',
      '可用编码器取决于操作系统是否装了对应 codec，H.264 在部分 Linux 上缺失，要有 VP9/AV1 回退。',
      '音视频同步是最大的坑：要给 VideoFrame 和 AudioData 打时间戳，封装器才能正确写 stts/ctts。建议第一版先只做视频轨。',
      '绝不要为了「全格式支持」再去引 ffmpeg.wasm —— 它 core 就有 31MB（brotli 8.4MB），比原生慢 10~100 倍，还有 2GB 上限。两者定位不同，不要混用。',
    ],
    done: [
      '能把 1080p H.264 视频转成指定码率的 MP4，音画同步无明显偏移。',
      '不支持的浏览器给出明确提示而不是静默失败。',
      '转码过程中有进度与取消。',
    ],
  },

  'video-to-gif': {
    approach: 'WebCodecs 抽帧 → OffscreenCanvas 缩放与调色板量化 → gifenc 逐帧编码。',
    effort: 'L',
    apis: ['WebCodecs', 'OffscreenCanvas', 'Web Worker'],
    deps: [
      { name: 'gifenc', size: '~10KB', note: '比 gif.js 小且快，支持自定义调色板' },
      { name: 'mp4box.js', size: '~200KB', note: '解复用' },
    ],
    steps: [
      '按目标帧率（如 10fps）计算需要抽取的帧序号，跳过其余帧以节省时间。',
      '每帧画到 canvas，缩放到目标宽度，取 ImageData。',
      '用中位切分或 gifenc 的 quantize 生成 ≤256 色调色板，必要时做 Floyd–Steinberg 抖动。',
      'gifenc 逐帧写入并设置 delay、循环次数。',
      '提供体积预估与「再压一轮」：提示用户降帧率或缩尺寸来换体积。',
    ],
    pitfalls: [
      'GIF 只有 256 色，渐变会带状 —— 抖动是必需的，否则观感很差。',
      'GIF 体积随「帧数 × 尺寸 × 色彩复杂度」增长很快，10 秒 480p 常常就 5MB+。',
      '抽帧时不要用 seek，WebCodecs 顺序解码更快；跨关键帧 seek 代价高。',
    ],
    done: ['能导出可正常播放的 GIF。', '给出体积并支持调整参数重新生成。'],
  },

  'audio-lab': {
    approach:
      'wavesurfer.js 做波形可视化与区间选择，Web Audio 的 OfflineAudioContext 做非实时渲染处理。',
    effort: 'L',
    apis: ['Web Audio', 'OfflineAudioContext', 'Canvas'],
    deps: [
      { name: 'wavesurfer.js', size: '~150KB', note: 'BSD-3-Clause，v7' },
      {
        name: 'lamejs 或 @breezystack/lamejs',
        size: '~100KB',
        note: '导出 MP3；仅导出 WAV 则不需要',
      },
    ],
    steps: [
      '载入音频 → 画波形 → 允许拖选区间（保留 / 删除两个方向）。',
      '把处理链写成 OfflineAudioContext 上的节点图：GainNode（增益、淡入淡出）、AudioBufferSourceNode（playbackRate 变速）。',
      '变速不变调用 playbackRate + 相位声码器实现较复杂，第一版可只做变速变调（一起变）。',
      '响度归一化：算整体 RMS / 峰值，反推增益系数。',
      '渲染结果 → AudioBuffer → 编码为 WAV（手写 RIFF 头）或 MP3。',
    ],
    pitfalls: [
      'WAV 未压缩，导出体积会很大；MP3 需要引编码器。',
      'OfflineAudioContext 的 sampleRate 建议继承源音频，否则会重采样导致音质损失。',
      '淡入淡出必须用 setValueAtTime / linearRampToValueAtTime 排程，不要在 JS 里逐样本乘。',
    ],
    done: ['裁切、增益、淡入淡出、变速都能听到预期效果。', '导出文件可被常规播放器播放。'],
  },

  'screen-recorder': {
    approach:
      'getDisplayMedia / getUserMedia 拿流 → MediaRecorder 或 WebCodecs 编码 → 输出 WebM/MP4。',
    effort: 'M',
    apis: ['getDisplayMedia', 'getUserMedia', 'MediaRecorder', 'WebCodecs'],
    deps: [{ name: 'mp4-muxer', size: '~30KB', note: '需要 MP4 输出时用；只做 WebM 则不需要' }],
    steps: [
      '让用户选源：屏幕 / 窗口 / 标签页 / 摄像头。',
      '录制参数：分辨率、帧率、码率、是否录制系统声音与麦克风。',
      '麦克风与系统声音需要混音：两个 MediaStreamSource → GainNode → MediaStreamDestination。',
      'MediaRecorder 优先用 video/webm;codecs=vp9；Safari 只支持 mp4 就退回 mp4。',
      '录制中显示计时、体积、暂停/继续，结束后本地播放预览并下载。',
    ],
    pitfalls: [
      'MediaRecorder 的 codec 支持差异大：Chrome 的 WebM，Safari 的 MP4，要按 isTypeSupported 选择。',
      '标签页音频只有在用户勾选「分享标签页音频」时才有，不能默认假设有声音。',
      '录制长时间会占用大量内存，建议超过一定时长提示用户分段。',
    ],
    done: ['三个录制源都能正常出片。', '麦克风+系统声音混音不出双轨回声。'],
  },

  'subtitle-studio': {
    approach: '纯 JS 解析与序列化各字幕格式，时间轴操作在统一的时间戳模型上做。',
    effort: 'M',
    apis: ['File API', 'TextDecoder（注意 BOM 与 GBK）'],
    deps: [{ name: '无第三方依赖', size: '—', note: '格式解析都简单，自己写更可控' }],
    steps: [
      '定义统一模型：{ index, start, end, text, style? }，时间统一成毫秒。',
      '写 SRT / VTT / ASS / LRC 各自的 parse 与 stringify。',
      '时间轴操作：整体平移、拉伸到指定时长、合并相邻、拆分、吸附到帧。',
      '预览：video 元素 + 当前时间对应字幕的实时叠加显示。',
      '校验：重叠、空条目、时长异常、编码乱码提示。',
    ],
    pitfalls: [
      'SRT 允许逗号或点做小数分隔，两种都要兼容。',
      'ASS 有样式头，简单解析容易丢样式 —— 明确说「只转换时间轴与文本，样式不保证」。',
      '中文字幕文件常见 GBK 编码，TextDecoder 要能手动切换编码。',
    ],
    done: ['四种格式互转时间轴不丢精度。', '整体平移与视频对齐可用。'],
  },

  /* ==================== 文档与 OCR ==================== */

  'pdf-suite': {
    approach: 'pdf-lib 做 PDF 对象级读写，pdfjs-dist 做渲染预览。',
    effort: 'L',
    apis: ['File API', 'Canvas（预览渲染）'],
    deps: [
      { name: 'pdf-lib', size: '~400KB', note: 'MIT，纯 JS，不需要 wasm' },
      { name: 'pdfjs-dist', size: 'core 0.3MB + worker 1.1MB', note: '仅用于预览，懒加载' },
    ],
    steps: [
      'PDFDocument.load 读入，支持多文件；用 copyPages 做合并。',
      '页面管理器：缩略图列表（pdfjs 渲染）+ 拖拽重排 + 删除 + 旋转。',
      '拆分：按范围选择页，或「每 N 页拆一个文件」，输出 Zip（用 fflate）。',
      '水印：用 drawText 在每页叠加旋转文字，支持透明度与位置。',
      '加密：save({ userPassword, ownerPassword, permissions }) —— 注意 pdf-lib 对加密的支持有限，只支持特定算法。',
      '导出用 save() 拿 Uint8Array，包成 Blob 下载。',
    ],
    pitfalls: [
      'pdf-lib 的加密只支持 RC4/AES-128，不能生成 AES-256 加密的 PDF，界面上要说明。',
      '大 PDF（>100MB）在内存里全量加载会崩，要提示或做分块。',
      'pdfjs worker 必须单独配置 workerSrc，否则会退化成主线程解析、卡死 UI。',
      '表单填写（AcroForm）在 pdf-lib 里能用，但字段名因文件而异，需要先列出可用字段。',
    ],
    done: ['合并 20 个 PDF 后页序正确、书签不丢。', '加密文件能设置密码并用其他阅读器打开。'],
  },

  'ocr-studio': {
    approach: 'tesseract.js 做识别，pdfjs-dist 把 PDF 页渲染成位图后送入 OCR。',
    effort: 'L',
    apis: ['Canvas', 'Web Worker', 'WebAssembly'],
    deps: [
      { name: 'tesseract.js', size: 'lib 66KB + worker 121KB + core 4.5MB' },
      { name: '语言包', size: '2~15MB/语言（中日韩约 15MB）', note: '按需下载并缓存到 IndexedDB' },
    ],
    steps: [
      '图片直接处理；PDF 先用 pdfjs 按 300DPI 渲染成 canvas。',
      '前端做预处理：灰度化、二值化（Otsu）、去噪、纠偏，能显著提升识别率。',
      '调用 recognize(image, lang, { logger }) 拿进度。',
      '输出纯文本 + 按段落分块 + 可选保留布局的 TSV（words/blocks 带坐标）。',
      '支持框选区域：只在用户选定矩形内识别。',
    ],
    pitfalls: [
      '语言包体积从 2MB 到 15MB，首次加载慢，必须给进度并缓存（IndexedDB）。',
      '300DPI 单页的 RGBA buffer 就有约 33MB，移动端要降 DPI 或分块处理。',
      '中文识别率高度依赖预处理质量，直接把原图丢进去效果会很差。',
      'tesseract 对竖排文字和复杂表格基本无能为力，界面上要说明适用范围。',
    ],
    done: ['清晰的中文截图识别率可用。', '语言包只下载一次，二次使用秒开。'],
  },

  'markdown-studio': {
    approach: 'marked 解析 → shiki 高亮代码 → KaTeX 渲染公式 → Mermaid 画图 → 导出长图或 PDF。',
    effort: 'L',
    apis: ['Canvas', 'Blob'],
    deps: [
      { name: 'marked', size: '~50KB', note: '项目已依赖' },
      {
        name: 'shiki',
        size: 'web 包 4.9MB / gzip 0.79MB',
        note: '必须懒加载，只引用到的那几个主题与语言',
      },
      { name: 'katex', size: '~280KB' },
      { name: 'mermaid', size: '数 MB', note: '体积大，设成「用到才加载」' },
    ],
    steps: [
      'marked 配置自定义 renderer，把 code fence 交给 shiki，把 $...$ 交给 KaTeX。',
      'Mermaid 的代码块延迟到渲染后异步替换成 SVG。',
      '双栏：左编辑右预览，滚动同步。',
      '主题系统：至少提供 2 套明色 + 2 套暗色，代码高亮主题跟着切换。',
      '导出：DOM → canvas（可用 html-to-image 或手写 foreignObject 方案）导出长图；导出 PDF 用 window.print + @media print 样式，或 pdf-lib 重新排版。',
    ],
    pitfalls: [
      'shiki 全量包 4.9MB，只能按需 import 语言与主题，否则首屏不可接受。',
      'DOM 转图片时外部字体与图片会造成 canvas 污染或字体缺省，需要内联或等待字体加载。',
      '长图会超过 canvas 的尺寸上限（Chrome 约 16384px），超长文档要分页导出。',
    ],
    done: ['含代码、公式、流程图的文档能完整渲染并导出长图。', '主题切换时预览与代码配色同步。'],
  },

  'docx-builder': {
    approach: 'docx 库构造 Word 文档；反向解析用 jszip 拆开 OOXML 读 document.xml。',
    effort: 'M',
    apis: ['Blob', 'File API'],
    deps: [
      { name: 'docx', size: '~726KB', note: 'MIT，v8.5.0' },
      { name: 'jszip', size: '~100KB', note: '反向解析 .docx（本质是 zip）时用' },
    ],
    steps: [
      '输入侧支持 Markdown 或结构化 JSON（标题层级、段落、列表、表格、图片）。',
      '把中间模型映射成 docx 的 Document/Paragraph/Table/ImageRun。',
      '样式：内置几套（报告 / 合同 / 简历），可调字体、字号、行距、页边距。',
      '页眉页脚、页码、目录（TableOfContents 需要打开时手动更新域，要提示）。',
      'Packer.toBlob 导出。',
    ],
    pitfalls: [
      'docx 生成的文档打开时可能提示「需要更新域」—— 这是 OOXML 的正常行为，要写进说明。',
      '图片必须转成 Uint8Array 且指定宽高，否则会按原始像素尺寸铺满页面。',
      '中文字体要在样式里显式指定（如等线、宋体），否则不同系统渲染不一致。',
    ],
    done: ['导出的 docx 在 Word / WPS / 在线预览里都能正常打开且样式正确。'],
  },

  'sheet-studio': {
    approach: 'SheetJS 读表 + 虚拟滚动表格渲染 + 纯 JS 的筛选/透视/公式求值。',
    effort: 'L',
    apis: ['File API', 'Web Worker'],
    deps: [
      { name: '@office-kit/xlsx 或 write-excel-file', note: '⚠️ 不要用 npm 上的 xlsx' },
      { name: '虚拟列表', size: '—', note: '可手写，或复用现有工具' },
    ],
    steps: [
      '读取 xlsx/csv 后转成列式结构（columns + rows）而不是对象数组，性能更好。',
      '虚拟滚动只渲染可视行，10 万行也能流畅滚动。',
      '列操作：排序、筛选、去重、重命名、类型推断与转换、删除。',
      '透视：选行维度、列维度、值字段与聚合方式，输出交叉表。',
      '公式：只实现常用子集（SUM/AVERAGE/COUNT/IF/VLOOKUP），不要试图做完整求值器。',
      '导出 xlsx / csv / JSON。',
    ],
    pitfalls: [
      '⚠️ npm 上的 xlsx（SheetJS CE）冻结在 0.18.5，CVE-2023-30533 与 CVE-2024-22363 的修复只在官方私有 CDN 上。要么装官方 CDN 版本，要么换 MIT 替代方案 —— 不要直接 npm install xlsx。',
      'SheetJS 的样式、图表、条件格式属于付费 Pro，社区版导出的文件没有这些。',
      '日期列在 xlsx 里是序列号，需要结合格式串还原成日期，不处理会显示成 45000 这样的数字。',
    ],
    done: ['10 万行 CSV 滚动流畅。', '透视结果与 Excel 一致。'],
  },

  /* ==================== 数据与查询 ==================== */

  'sqlite-browser': {
    approach: 'sql.js（SQLite 的 WASM 编译）在浏览器里建库，用 OPFS 持久化数据库文件。',
    effort: 'L',
    apis: ['OPFS', 'Web Worker', 'File API'],
    deps: [{ name: 'sql.js', size: 'wasm ~1MB + glue 340KB', note: 'MIT，13.6k★' }],
    steps: [
      'Worker 里初始化 sql.js，载入用户上传的 .sqlite 文件（或新建空库）。',
      '左侧表列表 + 结构（列名、类型、主键、索引）；中间数据网格（虚拟滚动分页）；上方 SQL 编辑器。',
      '查询结果表格化，支持导出 CSV / JSON。',
      '持久化：把 db.export() 的字节写入 OPFS；注意 OPFS 的 createSyncAccessHandle 只能在 Dedicated Worker 里用。',
      '导出：直接下载 .sqlite 文件。',
    ],
    pitfalls: [
      'sql.js 是纯内存数据库，整个库都在 RAM 里 —— 几百 MB 的库会崩，要提示。',
      'OPFS 支持：Chrome 86+ / Safari 15.2+ / Firefox 111+；但 createSyncAccessHandle 仅限 Dedicated Worker，createWritable 在 Safari 26 之前不可用。要有「不持久化，只导出文件」的降级路径。',
      'File System Access 的 showOpenFilePicker 只有 Chromium 支持，Mozilla 明确反对。别把它做成核心路径，用 input[type=file] + 下载兜底。',
      '每条 DDL/DML 后要重新 export() 才能拿到最新字节，注意性能。',
    ],
    done: [
      '能打开一张现有的 sqlite 文件并查询。',
      '刷新后 OPFS 里的库还在。',
      '不支持 OPFS 时能正常导出文件。',
    ],
  },

  'duckdb-analytics': {
    approach: 'DuckDB WASM 挂在 Worker 里，文件通过 registerFileHandle 注册后直接用 SQL 查。',
    effort: 'L',
    apis: ['Web Worker', 'OPFS（可选）', 'File API'],
    deps: [
      { name: '@duckdb/duckdb-wasm', size: '~3.2MB（带扩展）', note: 'MIT' },
      { name: 'apache-arrow', note: '结果集走 Arrow，需一并引入' },
    ],
    steps: [
      'Worker 里选择 bundle（eh/mvp/coi），实例化后 connect。',
      'CSV 用 read_csv_auto，Parquet 用 read_parquet，JSON 用 read_json_auto。',
      'SQL 编辑器 + 结果表格 + 执行计划（EXPLAIN）展示。',
      '大结果集分页或限制返回行数，避免一次性把百万行塞进 DOM。',
      '支持多文件 JOIN：把多个文件注册成不同的表。',
    ],
    pitfalls: [
      'DuckDB-WASM 默认是单线程，多线程仍属实验特性；OPFS 相关测试在官方仓库里是被 disable 的。不要承诺「亿级秒查」。',
      'bundle 选择要按特性探测（COI 需要跨源隔离），选错了直接加载失败。',
      '首次加载 3.2MB，必须懒加载 + 进度提示。',
      '结果必须限制行数，否则 DOM 渲染才是真正的瓶颈，不是查询本身。',
    ],
    done: ['1GB CSV 能跑聚合查询且不崩。', '多文件 JOIN 结果正确。'],
  },

  'jq-playground': {
    approach: 'jq-web / jq-wasm 把真正的 jq 1.7 编译成 WASM 在 Worker 里跑。',
    effort: 'M',
    apis: ['Web Worker', 'WASM'],
    deps: [
      { name: 'jq-web', note: 'Emscripten 编译，注意体积与初始化耗时' },
      {
        name: 'CodeMirror 6',
        size: '0.38MB raw / 0.12MB gzip',
        note: '编辑器要 CodeMirror 不要 Monaco',
      },
    ],
    steps: [
      'Worker 里初始化 jq 实例（初始化较慢，要复用而不是每次重建）。',
      '左侧 JSON 输入，中间表达式，右侧结果；表达式变化时防抖 300ms 后重跑。',
      '内置配方库：按 key 分组、数组去重、扁平化、提取字段、聚合求和等常用表达式。',
      '错误信息要原样透出 jq 的报错（它会带行号），不要吞掉。',
    ],
    pitfalls: [
      'jq 的 WASM 初始化是阻塞的，必须在 Worker 里做并只做一次。',
      '编辑器用 CodeMirror 6（gzip 0.12MB），不要用 Monaco（core 2.78MB + TS worker 6.75MB）。',
      '大 JSON（>50MB）序列化传入 Worker 会卡顿，考虑用 Transferable 或分块。',
    ],
    done: ['常用 jq 表达式结果与命令行 jq 一致。', '报错信息可读。'],
  },

  'type-forge': {
    approach: '从样例 JSON 递归推断类型，按目标语言的模板生成器输出代码。',
    effort: 'M',
    apis: ['无（纯计算）'],
    deps: [{ name: '无', size: '—', note: '推断逻辑不复杂，自己写比引库更可控' }],
    steps: [
      '递归遍历 JSON 收集「路径 → 出现过的类型集合」。',
      '类型合并：同一路径出现多种类型时输出联合类型；数组取所有元素类型的并集。',
      '可选字段推断：统计每个字段在数组对象中出现的比例，低于阈值标记为可选。',
      '生成器：TypeScript interface / Zod schema / Go struct（带 json tag）/ Rust struct（带 serde）/ Java class。',
      '选项：命名风格（camel/snake/Pascal）、是否导出、根类型名、是否为可选字段生成 ? 。',
    ],
    pitfalls: [
      '样例数据推断出来的类型永远只是「这一份样例的类型」，要在界面明确说明，别让用户以为是 schema 权威来源。',
      '空数组无法推断元素类型 → 输出 unknown[] 并提示。',
      'Go 的字段名必须导出（大写开头），要做首字母大写转换且注意 JSON tag 保留原名。',
      '数字无法区分 int 与 float，需要提供「全部按 number/float」的开关。',
    ],
    done: ['对深层嵌套 JSON 生成的 TS 类型能通过 tsc 校验。', 'Go struct 能 go build 通过。'],
  },

  /* ==================== 图像工程 ==================== */

  'image-codec': {
    approach: 'WASM 编解码器（Squoosh 那套 codec 包）在 Worker 里做格式转换与压缩。',
    effort: 'XL',
    apis: ['Web Worker', 'WASM', 'OffscreenCanvas', 'SharedArrayBuffer（多线程时）'],
    deps: [
      { name: '@jsquash/avif', size: 'wasm ~2MB' },
      { name: '@jsquash/webp', size: 'wasm ~1MB' },
      { name: '@jsquash/jpeg', size: 'wasm ~300KB' },
      { name: '@jsquash/oxipng', size: 'wasm ~1MB' },
      { name: '@jsquash/jxl', size: 'wasm ~3MB' },
    ],
    steps: [
      '按目标格式动态 import 对应 codec，绝不要一次性全加载。',
      '取 ImageData → 交给 codec 的 encode → 拿 ArrayBuffer 包成 Blob。',
      '并行处理多张图时按 navigator.hardwareConcurrency 限制并发数。',
      '提供「压前压后」对比：并排预览 + 体积/压缩率/耗时表格。',
      '批量导出用 fflate 打 Zip。',
    ],
    pitfalls: [
      'JPEG XL 的浏览器原生支持在 2026 年仍不完整，只能靠 WASM 编码 + 提示用户「浏览器暂不能直接显示 JXL」的预览降级。',
      '多线程编解码依赖 SharedArrayBuffer，需要 COOP/COEP 响应头（本项目已在 next.config 配置）。要在运行时探测 crossOriginIsolated，为 false 时降级单线程。',
      'WASM 编解码比原生慢，但比 Canvas.toBlob 的质量控制强得多 —— 这是选它的理由。',
      'AVIF 编码很慢（比 WebP 慢一个量级），界面上要给出耗时预估。',
    ],
    done: ['各格式都能导出且体积优于 Canvas 默认编码。', '批量 20 张图不卡死 UI。'],
  },

  'image-pipeline': {
    approach: '把处理步骤建模成可序列化的 pipeline 数组，在 Worker 里逐步执行。',
    effort: 'L',
    apis: ['OffscreenCanvas', 'Web Worker', 'File API'],
    deps: [{ name: 'fflate', size: '~30KB', note: '批量结果打包下载' }],
    steps: [
      '定义步骤类型：resize / crop / rotate / filter / watermark / format / rename。',
      'UI 是关键：左侧步骤列表（可拖拽排序、启用禁用、单步参数），右侧实时预览首张图的效果。',
      '执行：每张图依次过所有启用的步骤，全部完成后打包 Zip。',
      '预设保存到 localStorage，支持导入导出 JSON。',
      '重命名规则支持变量：{name} {index} {date} {width}x{height}。',
    ],
    pitfalls: [
      '步骤顺序会影响结果（先裁后缩和先缩后裁不一样），要让用户能直观看到顺序。',
      '预览只渲染第一张图，避免用户改参数时触发全量重算。',
      'Worker 里没有 DOM，所有绘制必须用 OffscreenCanvas。',
      '水印的位置要支持相对定位（百分比）而不是绝对像素，否则不同尺寸的图水印位置会乱。',
    ],
    done: ['10 张图 + 5 个步骤能一次跑完并打包下载。', '预设能保存与复用。'],
  },

  'exif-studio': {
    approach: 'exifr 读取全部元数据，piexifjs 做无损擦除与写回。',
    effort: 'M',
    apis: ['File API', 'ArrayBuffer'],
    deps: [
      { name: 'exifr', size: '~40KB', note: '读取，支持 EXIF/IPTC/XMP/ICC' },
      { name: 'piexifjs', size: '~30KB', note: '写回与删除 EXIF 段' },
    ],
    steps: [
      '读取：exifr.parse(file, true) 拿全量元数据，按组分类展示（相机 / 拍摄参数 / GPS / 时间 / 版权）。',
      'GPS 单独高亮，给出地图链接提示这是隐私信息。',
      '擦除：piexif.remove() 直接剥掉 EXIF 段；或按项删除（勾选要保留的字段）。',
      '对比：擦除前后文件体积变化。',
      '批量：多张图一起处理并打包。',
    ],
    pitfalls: [
      'EXIF 里 GPS 是「度分秒 + 方向参考」的复杂编码，要正确解码成十进制经纬度，方向（N/S/E/W）搞错会跑到地球另一边。',
      'JPEG 才能安全地做 EXIF 写回；PNG / WebP 的元数据存在不同位置，piexifjs 不支持，要按格式分流。',
      '擦除 EXIF 不等于匿名：缩略图（IFD1）里可能藏着原图，要一并清掉。',
    ],
    done: ['能读出手机照片的完整拍摄参数与 GPS。', '擦除后再读不到任何隐私字段。'],
  },

  'svg-optimizer': {
    approach: 'SVGO 的浏览器版做优化，多方案对比、可视化差异。',
    effort: 'M',
    apis: ['File API', 'DOM'],
    deps: [
      { name: 'svgo', size: '~500KB（含插件）', note: '浏览器可用' },
      { name: 'jsdiff', size: '~30KB', note: '展示源码差异' },
    ],
    steps: [
      '读入 SVG（文件 / 粘贴源码），先用 DOMParser 校验合法性。',
      '跑多组预设：保守 / 默认 / 激进，各自给出体积与插件清单。',
      '并排渲染优化前后的图，像素级对比（叠加闪烁或差异高亮）确认视觉无变化。',
      '展示源码 diff，让用户清楚改了什么。',
      '导出单个或批量打包。',
    ],
    pitfalls: [
      '激进优化会移除 id 与 class，如果 SVG 依赖外部 CSS 或 <use> 引用就会显示异常 —— 预览对比是必需的，不是锦上添花。',
      'cleanupIds 会重命名 id，内联在 <style> 里的选择器可能失配。',
      'SVG 里的 <foreignObject> 和嵌入位图容易被优化器破坏，要有开关。',
    ],
    done: ['优化后体积明显下降且预览无差异。', '激进模式能提示潜在风险。'],
  },

  /* ==================== 密码与安全 ==================== */

  'crypto-lab': {
    approach:
      'Web Crypto 的 SubtleCrypto 全套：generateKey / encrypt / decrypt / sign / verify / importKey / exportKey。',
    effort: 'L',
    apis: ['Web Crypto', 'Web Worker（大文件加解密）'],
    deps: [
      {
        name: '@noble/curves',
        size: '~30KB',
        note: '需要 Ed25519 时，Web Crypto 对它的支持不完整',
      },
    ],
    steps: [
      '密钥管理：RSA-OAEP（2048/4096）、ECDSA-P256、ECDH-P256、Ed25519 的生成、导入、导出。',
      '格式转换：PEM ↔ ArrayBuffer ↔ JWK 互转，PEM 要做 base64 + 头尾行包装。',
      '加解密：RSA-OAEP 加密短数据；大文件用「混合加密」——AES-GCM 加密数据 + RSA 加密 AES 密钥。',
      '签名验签：文本与文件都支持，输出 base64 签名。',
      '安全提示：私钥只在内存中，刷新即失效，给「下载私钥」的显式按钮。',
    ],
    pitfalls: [
      'RSA-OAEP 能加密的数据长度受密钥长度限制（2048 位约 190 字节），超过必须走混合加密 —— 这是最常见的误用。',
      'Web Crypto 的 Ed25519 在 Safari 上支持较晚，需要特性探测并回退到 @noble/curves。',
      '导出私钥时 exportKey 的第三个参数要传 true，否则导出会失败。',
      '不要把私钥写进 localStorage，也不要自动持久化。',
      'PEM 的换行必须是 64 字符一行，且结尾要有换行，否则部分工具解析失败。',
    ],
    done: ['生成的密钥对能被 openssl 正确识别。', '签名能在 Node 侧验签通过。'],
  },

  'hash-suite': {
    approach: '在已有 crypto.ts 基础上扩展 KDF：PBKDF2 用 Web Crypto，Argon2/scrypt 用 WASM。',
    effort: 'M',
    apis: ['Web Crypto', 'WASM', 'Web Worker'],
    deps: [
      { name: '@noble/hashes', note: '项目已依赖，含 pbkdf2 / scrypt / hkdf' },
      { name: 'hash-wasm', size: 'wasm ~100KB', note: 'Argon2id 做得比较好' },
    ],
    steps: [
      '把现有 hash-generator / hmac-generator 的功能合并进来（摘要、HMAC）。',
      '加 KDF 区块：PBKDF2-HMAC-SHA256/SHA512（Web Crypto，支持迭代次数调节）。',
      'Argon2id：参数 expose 出 memory（KB）、iterations、parallelism、hashLength，并给出耗时。',
      'scrypt 与 HKDF 同理。',
      '每个 KDF 都要给「推荐参数」提示与实测耗时，让用户理解安全性与性能的权衡。',
    ],
    pitfalls: [
      'Argon2id 参数不当会直接卡死主线程，必须在 Worker 里跑并允许取消。',
      'PBKDF2 迭代次数建议 210,000（OWASP 2023 对 SHA-256 的下限），要给出明示。',
      'scrypt 的内存参数（N/r/p）组合不对会抛错，要给合法区间。',
      '不要用 SHA-256 直接存密码当「哈希」—— 界面上要明确区分「摘要」与「口令哈希」。',
    ],
    done: ['Argon2id 结果与参考实现一致。', '各 KDF 的耗时数据真实展示。'],
  },

  'x509-inspector': {
    approach: '用 asn1js / pkijs 解析 DER，或轻量方案：自己写 DER 解析器读 TLV 结构。',
    effort: 'L',
    apis: ['Web Crypto（算指纹）', 'ArrayBuffer'],
    deps: [
      { name: 'asn1js', size: '~100KB' },
      { name: 'pkijs', size: '~300KB', note: '提供了 X.509 的完整对象模型' },
    ],
    steps: [
      'PEM → DER 转换（去头尾、base64 解码）。',
      '解析证书主体字段：版本、序列号、签名算法、颁发者、主体、有效期、公钥信息。',
      '解析扩展项：SAN（域名列表）、KeyUsage、ExtendedKeyUsage、BasicConstraints、CRL 分发点。',
      '算指纹：SHA-1 / SHA-256 的 hex 与 colon 格式。',
      'ASN.1 树：把原始 DER 的 TLV 结构展开成可折叠的树，标注 tag 类型与长度。',
      '有效期可视化：一条时间轴，标出签发起止与剩余天数，临期高亮。',
    ],
    pitfalls: [
      '证书里的中文/特殊字符用 UTF8String 或 PrintableString，解码方式不同会乱码。',
      '时间用的是 UTCTime（YYMMDD）和 GeneralizedTime（YYYYMMDD）两种格式，YY 需按 50 分界判断世纪。',
      'SAN 里的域名可能是通配符（*.example.com），展示时要保留。',
      '不要把「证书解析」做成「证书验证」—— 验证需要完整的信任链与吊销列表，纯前端做不了，界面上要区分清楚。',
    ],
    done: ['主流 CA 签发的证书能完整解析且字段正确。', 'ASN.1 树能展开到二级结构。'],
  },

  'ctf-toolbox': {
    approach: '算子化架构：每个算子有 encode/decode 两个方向，用数组串成流水线，逐级预览。',
    effort: 'L',
    apis: ['Web Crypto', 'CompressionStreams', 'WASM'],
    deps: [
      { name: '无强制依赖', note: '算子自己实现；压缩用原生 CompressionStreams（支持率 95.8%）' },
    ],
    steps: [
      '定义算子接口：{ id, name, category, args?, encode(input, args), decode?(input, args) }。',
      '首批算子：Base64 / Hex / URL / HTML 实体 / ROT13 / 凯撒 / 摩斯 / 大小写 / 反转 / 异或（带 key）/ gzip（CompressionStreams）/ 各类哈希 / AES。',
      '流水线 UI：算子列表可增删拖拽，每个算子下方显示该步的输出预览（前 N 行）。',
      '自动爆破：对未知编码尝试常见算子组合，命中可打印字符比例高的结果就提示「可能是 XX 编码」。',
      '配方可导出成 JSON，分享给他人复现。',
    ],
    pitfalls: [
      '异或的结果常是二进制，直接当字符串显示会乱码 —— 要提供 hex 视图。',
      '自动爆破的组合会爆炸，要限制深度（建议 ≤3）并做剪枝。',
      'gzip 用原生 CompressionStreams 而不是 pako，包体积能省下来。',
      '算子链的每一步都要能单独启用/禁用，方便二分定位哪一步出了问题。',
    ],
    done: ['能解出三层嵌套的 Base64+异或+反转。', '配方能导出并在另一台机器复现。'],
  },

  /* ==================== 代码工程 ==================== */

  'ast-playground': {
    approach:
      'tree-sitter 的 WASM 做多语言解析（或用 @swc/wasm-web 处理 JS/TS），可视化 AST 并支持选择器改写。',
    effort: 'XL',
    apis: ['WASM', 'Web Worker'],
    deps: [
      { name: 'web-tree-sitter', size: 'core ~200KB' },
      { name: 'tree-sitter 语法包', size: '每个语言 ~300KB~1MB', note: '按需加载，绝不全引' },
      { name: 'CodeMirror 6', size: 'gzip 0.12MB', note: '编辑器' },
    ],
    steps: [
      '加载 tree-sitter core + 目标语言 grammar，Parser.parse 拿到语法树。',
      '左侧编辑器 + 右侧 AST 树（可折叠、点击节点高亮对应源码区间）。',
      '提供查询：用 tree-sitter query 语法（S-expression）筛选节点，例如 (function_declaration name: (identifier) @name)。',
      '改写：把查询命中的节点替换成模板，支持捕获变量引用；预览 diff 后应用。',
      '导出改写后的代码，或导出等价 codemod 脚本供 CI 使用。',
    ],
    pitfalls: [
      'tree-sitter 是增量解析器，改写后需要重新 parse 而不是手动改树，否则位置信息会错乱。',
      'grammar 的 wasm 体积不小，一次只加载用户选定的语言。',
      'JS/TS 也可以用 @swc/wasm-web（20.25MB raw / 4.37MB br），体积很大，只在需要类型信息时才用。',
      '改写要保留原始格式（缩进、换行），否则 diff 会淹没真正的改动。',
    ],
    done: ['能对 TS 文件做批量重命名并保持格式。', 'AST 树与源码双向定位准确。'],
  },

  'regex-visualizer': {
    approach: '自写正则解析器 → 生成 AST → 构造 NFA → 子集构造法转 DFA → 用 SVG/D3 画图。',
    effort: 'L',
    apis: ['SVG', '无第三方依赖'],
    deps: [{ name: '无', size: '—', note: '解析与画图都自己写，可控且体积小' }],
    steps: [
      '写正则解析器：支持字符、字符类、量词（* + ? {n,m} 及非贪婪）、分组、或、锚点、转义。',
      'AST → Thompson 构造法生成 NFA（含 ε 转移）。',
      'NFA → DFA（子集构造法）+ 最小化，用于展示「引擎实际怎么跑」。',
      '画图：NFA 用状态圆圈 + 带标签的箭头，用 D3 或手写 SVG 做自动布局。',
      '逐步匹配：把待匹配串的每个字符对应到状态转移路径，高亮走过的边。',
      '回溯可视化：统计回溯次数，对比贪婪与非贪婪、以及是否存在灾难性回溯风险。',
    ],
    pitfalls: [
      'JS 正则支持回溯引用、环视等高级特性，Thompson 构造法无法表达 —— 遇到这些要提示「这部分不参与自动机可视化」。',
      '灾难性回溯检测很有价值但难做：可以用「回溯步数计数器 + 超时」近似，超过阈值就告警。',
      '状态数会指数爆炸（子集构造法），要限制输入正则的复杂度并做上限保护。',
    ],
    done: ['常见正则能画出正确的自动机图。', '逐步匹配能高亮执行路径。'],
  },

  'code-image': {
    approach: 'shiki 生成高亮 HTML → 注入主题样式与窗口装饰 → 导出 SVG → 转 PNG。',
    effort: 'M',
    apis: ['Canvas / SVG', 'Blob'],
    deps: [
      { name: 'shiki', size: 'web 包 4.9MB / gzip 0.79MB', note: '必须按需加载语言与主题' },
      { name: '无', size: '—', note: '转 PNG 可用 SVG → canvas 的原生路径，不必引 html-to-image' },
    ],
    steps: [
      '用户粘贴代码 + 选语言 → shiki codeToHtml 得到带内联样式的高亮 HTML。',
      '包进带窗口装饰（红黄绿圆点、文件名、可选阴影、渐变背景）的容器。',
      '导出 SVG：把 HTML 转成 SVG 的 <foreignObject>（简单，但部分场景字体不内联）；更稳的方式是手动转成 <text> + <tspan> 并内联字体度量。',
      'SVG → PNG：Image + drawImage 到 canvas + toBlob。',
      '参数：主题、字号、行号、高亮行范围、内边距、圆角、背景类型、是否显示窗口条。',
    ],
    pitfalls: [
      'shiki 全量包 4.9MB，只能动态 import 用户选中的语言与主题，否则首屏爆炸。',
      '<foreignObject> 转 canvas 时外部字体不会被内联，导出的图片会掉字体 —— 推荐用等宽系统字体或手动内联。',
      '导出 PNG 前要等字体加载完成（document.fonts.ready），否则渲染出的是回退字体。',
    ],
    done: ['导出的 PNG 与预览几乎一致，无字体错位。', '切换主题即时生效。'],
  },

  'bundle-inspector': {
    approach:
      '解析 webpack stats.json / Vite 的 rollup-plugin-visualizer 输出，构造树图并渲染 treemap。',
    effort: 'L',
    apis: ['File API', 'Canvas 或 SVG（treemap 渲染）', 'Web Worker'],
    deps: [{ name: 'd3-hierarchy', size: '~30KB', note: '只要 treemap 布局算法，不要整个 d3' }],
    steps: [
      '输入兼容三种格式：webpack stats.json、Vite/Rollup 的 stats、以及 source-map-explorer 的输出。',
      '归一化成 { name, path, size, children } 的树。',
      'd3-hierarchy 的 treemap 算布局，SVG 或 Canvas 渲染矩形。',
      '交互：点击下钻、面包屑返回、按体积排序的模块排行榜、搜索过滤。',
      '依赖链查找：输入模块名，显示「谁引用了它」的路径，这才是能指导优化的信息。',
    ],
    pitfalls: [
      'stats.json 动辄几十 MB，JSON.parse 会卡死主线程 —— 必须在 Worker 里解析。',
      'webpack 的 stats 有 nested modules（concatenated modules），不处理会把体积算重。',
      'treemap 矩形数量过万时 SVG 会很卡，超过阈值要切换到 Canvas 渲染。',
      '体积要区分 raw / parsed / gzip 三种，混淆会得出错误结论。',
    ],
    done: ['能正确解析 50MB 的 stats.json 并渲染。', '能定位到体积最大的前 10 个模块及其引用链。'],
  },

  /* ==================== 设计与视觉 ==================== */

  'css-lab': {
    approach:
      '把已有的 box-shadow / glassmorphism / fancy-border-radius / gradient / clamp 组件合并成一个多面板工作台。',
    effort: 'L',
    apis: ['无（纯 CSS 生成）'],
    deps: [{ name: '无', size: '—', note: '全部复用现有 lib/core/css.ts 与 color.ts' }],
    steps: [
      '复用现有实现：box-shadow-generator、glassmorphism、fancy-border-radius、gradient-generator、clamp-calculator 的组件与算法都已经写好，直接搬进来。',
      '布局改成左侧效果开关列表（每个效果可独立启停）+ 中间实时预览 + 右侧合并后的 CSS。',
      '预览区要能叠加多个效果（阴影 + 玻璃 + 圆角 + 渐变同时生效），这是合并的意义所在。',
      '导出：合并后的 CSS 类、Tailwind 配置片段、或设计令牌 JSON。',
      '预设：把一套参数存成命名预设，可导入导出。',
    ],
    pitfalls: [
      '合并后的 CSS 顺序会影响结果（box-shadow 被后者覆盖），导出时要保证顺序稳定且可解释。',
      '玻璃拟态依赖 backdrop-filter，预览区的背景必须是带层次的底图，否则看不出效果。',
      '参数很多，要避免一次性把 40 个滑杆全铺出来 —— 用折叠面板分组。',
    ],
    done: ['四个效果能同时生效并导出可用的 CSS。', '预设可保存与复用。'],
  },

  'color-system': {
    approach: 'oklch 色彩空间做色阶插值（比 HSL 均匀得多），生成 50–950 色阶并做对比度校验。',
    effort: 'L',
    apis: ['无（纯计算）'],
    deps: [
      { name: '无', size: '—', note: 'oklch 转换自己写（项目已有 color.ts 的基础），或用 culori' },
    ],
    steps: [
      '输入主色 → 转 oklch → 固定色相与彩度、按感知均匀的亮度曲线生成 11 档色阶（50~950）。',
      '深色模式映射：整体反转亮度顺序并微调彩度（暗色下要高一点彩度才不灰）。',
      '语义色：成功/警告/危险/信息各生成一套，保持与主色一致的感知亮度。',
      '对比度校验：每个色阶与白/黑文字算 WCAG 比值，标出哪些档位适合放正文。',
      '导出：CSS 变量（含暗色媒体查询）、Tailwind theme 配置、JSON 令牌、Figma Tokens 格式。',
    ],
    pitfalls: [
      'HSL 的亮度不是感知亮度，用它插值出的色阶中间会发灰发脏 —— 必须用 oklch 或 lab。',
      'oklch 的色相在极端明度下会溢出 sRGB 色域，要做 gamut mapping 或钳制，否则颜色显示不出来。',
      'Tailwind 4 是 CSS-first，导出的配置要给 @theme 语法而不是 tailwind.config.js。',
    ],
    done: ['生成的色阶视觉过渡平滑，无灰带。', '导出的 CSS 变量能直接用于现有站点。'],
  },

  'three-viewer': {
    approach: 'three.js + GLTFLoader 加载模型，OrbitControls 漫游，配套调试面板。',
    effort: 'L',
    apis: ['WebGL / WebGPU', 'Canvas'],
    deps: [
      { name: 'three', size: '~600KB min', note: '必须懒加载，绝不进首屏' },
      { name: '@react-three/fiber + drei', note: '可选；用原生 three 更可控、更小' },
    ],
    steps: [
      '加载器支持 glTF / GLB / OBJ / STL，GLB 优先。',
      '相机：OrbitControls（拖拽旋转、滚轮缩放、右键平移）。',
      '调试显示：线框模式、法线可视化、包围盒、坐标轴、地面网格。',
      '光照：HDRI 环境贴图切换、方向光/点光调节、阴影开关。',
      '统计：三角面数、顶点数、材质数、贴图数与贴图总体积、动画轨道列表。',
      '动画：如果有 AnimationClip，播放控制（播放/暂停/时间轴/速度）。',
    ],
    pitfalls: [
      'three.js 约 600KB，必须动态 import 并且只在进入工具时加载。',
      '大模型（>50MB）加载会卡，要显示进度并提示。',
      'GLTF 的 Draco 压缩需要额外加载 decoder（wasm），要用 DRACOLoader 并指定 decoderPath。',
      '环境贴图（HDRI）默认要准备几张，注意体积；可以用 RoomEnvironment 程序化生成，省掉下载。',
    ],
    done: ['能加载常见 glTF 模型并流畅漫游。', '统计信息准确。'],
  },

  'font-subset': {
    approach:
      'fonttools 的 WASM 版（pyodide 或编译版）做子集化，或引 subset-font（基于 harfbuzz wasm）。',
    effort: 'XL',
    apis: ['WASM', 'Web Worker', 'File API'],
    deps: [
      { name: 'subset-font', note: '基于 harfbuzzjs，接口简单，优先考虑' },
      { name: 'harfbuzzjs', size: 'wasm ~2MB', note: 'subset-font 的底层' },
    ],
    steps: [
      '输入：字体文件（TTF/OTF/WOFF/WOFF2）+ 需要的字符集合。',
      '字符集合来源三种：手动粘贴文本、输入一段 HTML 让工具提取、或按 Unicode 区间选择（如常用汉字 3500 字）。',
      '调用子集化，输出指定格式（优先 WOFF2）。',
      '对比：原体积 vs 子集体积、字符覆盖率、压缩率。',
      '预览：用子集字体渲染一段文本，确认没有缺字（.notdef 方框）。',
    ],
    pitfalls: [
      '子集化后的字体必须重新生成 @font-face 与 unicode-range，否则浏览器不知道该怎么用。',
      '中文字体子集化的收益最大（十几 MB → 几十 KB），但字符集合怎么定是关键 —— 提供「按页面实际用到的字符」提取是最实用的路径。',
      'WOFF2 压缩需要 brotli，注意 WASM 体积。',
      '可变字体（variable font）的子集化要保留 required 的 axis，处理不当会失去可变特性。',
    ],
    done: [
      '中文字体能从 10MB+ 压到 100KB 以内且不缺字。',
      '输出的 WOFF2 能直接在浏览器里正常渲染。',
    ],
  },

  /* ==================== 运行时诊断 ==================== */

  'device-lab': {
    approach: '逐项特性探测，输出能力矩阵与跨源隔离状态，并给出「这台机器能跑哪些工具」的结论。',
    effort: 'M',
    apis: ['几乎全部现代 API 的探测', 'WebGPU', 'WebCodecs', 'WASM'],
    deps: [
      { name: 'wasm-feature-detect', size: '~5KB', note: '探测 SIMD / threads / bulk-memory 等' },
    ],
    steps: [
      '逐项检测并给出三态：支持 / 部分支持 / 不支持。',
      '核心探测项：crossOriginIsolated、SharedArrayBuffer、WebGPU（含 adapter 信息与 limits）、WebCodecs（各 codec 的 isConfigSupported）、WASM SIMD / threads / exceptions、OPFS、Compression Streams、File System Access、OffscreenCanvas、Web Audio、WebRTC。',
      '每项附上「它支撑了本站哪些工具」的链接，把探测结果和产品价值连起来。',
      '给出「你的设备能跑 N/M 个工具」的总结，并列出不能跑的与原因。',
    ],
    pitfalls: [
      'WebGPU 的探测要真的 requestAdapter 而不是只检查 navigator.gpu 存在 —— 存在但拿不到 adapter 的情况很常见。',
      'WebCodecs 要逐个 codec 探测，不能因为 VideoDecoder 存在就认为 H.264 可用。',
      'crossOriginIsolated 为 false 时要明确提示「部分多线程能力不可用」，并说明是响应头的问题（这正是本项目配了 COOP/COEP 的原因）。',
      '探测项要能「复制成 JSON」，方便用户反馈问题时带上环境信息。',
    ],
    done: ['探测结果与 chrome://gpu 等权威信息一致。', '能一键复制完整环境报告。'],
  },

  'perf-benchmark': {
    approach: '一组标准化微基准，在 Worker 里跑以避免 UI 干扰，结果与历史记录对比。',
    effort: 'M',
    apis: ['Web Worker', 'Web Crypto', 'OffscreenCanvas', 'performance.now()'],
    deps: [{ name: '无', size: '—', note: '基准自己写，引库反而引入噪声' }],
    steps: [
      '基准项：整数/浮点运算吞吐、字符串拼接与正则、JSON 序列化、数组排序、Canvas 光栅化（填充与混合）、Web Crypto 的 SHA-256 / AES-GCM 吞吐、内存分配。',
      '每项跑固定时长（如 500ms）后取稳定值，跑之前做 warmup 让 JIT 稳定。',
      '结果计算成统一量纲的分数，便于横向对比。',
      '历史记录存 localStorage，展示曲线与同机对比。',
      '环境信息（UA、CPU 核心数、deviceMemory、GPU 信息）随结果一起保存。',
    ],
    pitfalls: [
      'JIT 预热没做够会得出无意义的低分，必须有 warmup 轮次。',
      '跑分时必须用 performance.now() 而不是 Date.now()，后者精度不够。',
      '后台标签页会被限流（定时器降到 1s），要检测 document.hidden 并提示用户保持页面在前台。',
      '不同浏览器之间的分数不可直接比较，要做归一化或明确标注「只用于同机同浏览器的纵向对比」。',
    ],
    done: ['同一台机器连续跑三次分数波动在合理范围内。', '结果可导出与历史对比。'],
  },

  'network-lab': {
    approach:
      '用 fetch 计时 + Resource Timing API + PerformanceObserver 拆解网络耗时，用图片/流下载测吞吐。',
    effort: 'M',
    apis: [
      'Fetch',
      'Performance API',
      'PerformanceObserver',
      'RTCPeerConnection（可选，测本机端口连通性）',
    ],
    deps: [{ name: '无', size: '—', note: '全部用原生 API' }],
    steps: [
      '延迟：向若干公共端点发小型 HEAD/GET 请求，采 20 次算中位数、P95 与抖动（标准差）。',
      '吞吐：下载一个已知大小的资源，按 10% 间隔采样累计字节数，算出实时速率曲线与平均速率。',
      '耗时拆解：用 PerformanceResourceTiming 的 domainLookupStart/End、connectStart/End、requestStart、responseStart、responseEnd 分别算出 DNS、TCP、TTFB、内容传输各阶段耗时。',
      '连通性：对常见端口发请求，用超时判断可达性（注意浏览器限制，无法做真 TCP 探测，只能测 HTTP 层）。',
      '趋势图：多次测量结果画成折线，判断是持续劣化还是偶发抖动。',
    ],
    pitfalls: [
      '浏览器无法做 ICMP ping 或任意 TCP 连接，所以只能测 HTTP 层 —— 界面上不要承诺「ping」能力，要说清是 HTTP RTT。',
      '跨域请求的 Resource Timing 默认不暴露详细时间，需要服务器返回 Timing-Allow-Origin 头，拿不到时要给出说明而不是显示 0。',
      'CORS 会干扰测量，优先选支持 CORS 的公共端点，或使用本站自己的静态资源。',
      '并发请求会互相抢占带宽，测吞吐时要串行。',
    ],
    done: ['延迟与吞吐测量结果与实际网络状况相符。', '耗时分段能看出瓶颈在 DNS 还是 TTFB。'],
  },
};
