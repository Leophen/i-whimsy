# 交互沙盒 / 可玩玩具 / 涌现系统 —— 工具选型调研

> 目标站点：iWhimsy（纯前端、零上传、无登录、可静态部署的创意工具箱）
> 调研日期：2026-10-02 · 全部结论来自本轮联网检索（来源见文末「检索轨迹」），URL 均为检索过程中实际出现的地址。
> 评分口径：好玩 / 炫技 / 实用 / 可行 各 1–5；综合 = 好玩×0.3 + 炫技×0.25 + 实用×0.25 + 可行×0.2。

---

## 0. 先说一个定位冲突（重要）

`AGENTS.md` 第 1 节写得很硬：**只做「高级」工具，判断标准是「看引擎」——它用了什么别的工具站用不上的浏览器能力**；纯 JS 字符串/数学类工具在 `421dee8` 已被整体剔除。

而「可玩玩具」这个品类的天然画像是：门槛低、好玩、传播强，但技术可能很轻（例如「点一下圆点分裂出一张图」）。**所以这次调研我按「必须挂得上一个硬浏览器能力」来筛**，凡是只需要 `requestAnimationFrame` + 一个 for 循环就能做完的玩具，一律降级或不推荐。

挂硬能力的四种方式（本报告推荐的每一个工具都至少占一样）：

| 硬能力                    | 在本项目里的合法性来源                                                            | 对应玩具类型                          |
| ------------------------- | --------------------------------------------------------------------------------- | ------------------------------------- |
| **WebGL2 / WebGPU GPGPU** | AGENTS.md 已明确要求「WebGPU 必须有 WASM 回退」，说明这类是被允许的               | Lenia、落沙、百万粒子                 |
| **WASM 移植桌面引擎**     | ffmpeg.wasm / duckdb-wasm 先例；Cross-Origin-Isolation 已在 `next.config.ts` 配好 | Box2D 物理、OpenSCAD、欧拉/有限元求解 |
| **原生设备 API 真实测量** | `device-lab` / `network-lab` 先例，属「Runtime 诊断」血脉                         | 示波器、传感器仪器箱                  |
| **本地小模型推理**        | `bg-remover` / `whisper-transcribe` 先例（ONNX Runtime / WASM）                   | sketch-rnn、故事接龙                  |

另外 `AGENTS.md` 有一条硬性提醒：**体积红线**——任何 >500KB 的依赖必须 `next/dynamic` 懒加载 + 加载进度。下面所有带模型的推荐都默认遵守这条。

---

## 1. 物理沙盒 / 创造类沙盒

| 项目                        | URL                                                                         | 浏览器可行性                                        | 产出物                            | 为什么火                                                                                                        | 好玩 | 炫技 | 实用 | 可行 |
| --------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---- | ---- | ---- | ---- |
| **Sandspiel**               | https://sandspiel.club/                                                     | ✅ Rust→WASM + WebGL 已验证（120+ FPS 宣称）        | 场景截图 / 上传到社区画廊         | 20 种元素互相化学反应，**可上传作品并浏览他人世界**，形成创作社区；作者 Max Bittker 用它建立了个人技术品牌      | 5    | 4    | 2    | 5    |
| **Sandspiel Studio**        | https://studio.sandspiel.club/                                              | ✅ 纯前端                                           | 自定义元素 + 场景                 | 把沙盒升级成**可视化编程**，玩家不只是玩，而是造规则                                                            | 4    | 5    | 3    | 4    |
| **Sandboxels**              | https://sandboxels.r74n.com/ · https://github.com/R74nCom/sandboxels        | ✅ 纯 JS + Canvas                                   | 存档字符串 / 截图                 | **500+ 元素、上千种反应**，目录深度远高于 Sandspiel（GitHub 463★，topic: falling-sand / physics-simulation）    | 5    | 4    | 2    | 5    |
| **The Powder Toy**          | https://powdertoy.co.uk/ · https://github.com/The-Powder-Toy/The-Powder-Toy | ❌ 桌面版（C++/SDL）                                | 存档上传公有服务器                | **社区范式教科书**：作品上传 + 投票 + 举报，260 种元素；GitHub 5.3k★。它的 Web 缺失正是浏览器沙盒的机会         | 5    | 4    | 3    | 2    |
| **Sand Art**                | https://sandart.app/                                                        | ✅                                                  | 成图导出                          | 「倒彩砂成画」解压流派代表，视觉回报极高，几乎零学习成本                                                        | 4    | 3    | 2    | 5    |
| **This Is Sand**            | https://thisissand.com/                                                     | ✅                                                  | 多层彩砂画                        | 同上，老牌经典（第三方列表收录）                                                                                | 4    | 3    | 2    | 5    |
| **The Blob Toy**            | https://oimo.io/works/blob/                                                 | ✅ oimo.js 物理引擎                                 | 可玩                              | 软体 blob 物理游乐场，手感（而非花哨视觉）是卖点                                                                | 3    | 3    | 1    | 4    |
| **DustSim**                 | https://www.kodub.com/apps/dustsim                                          | ✅                                                  | 可玩                              | 粒子 + 重力万能沙盒（同一作者的 PolyTrack 也在列表里）                                                          | 3    | 3    | 2    | 4    |
| **Marble Run**              | https://www.marblerun.at                                                    | ✅ 3D                                               | 轨道                              | 「造装置让球滚」的经典物理容器型沙盒                                                                            | 4    | 3    | 2    | 3    |
| **Choo Choo World**         | https://choochooworld.com/                                                  | ✅ 3D                                               | 木质火车轨道场景                  | 造物 + 治愈系，视觉完成度高                                                                                     | 4    | 4    | 1    | 3    |
| **PolyTrack**               | https://www.kodub.com/apps/polytrack                                        | ✅ 3D                                               | 赛道 + 计时成绩                   | 自带赛道编辑器 + 时间竞速 → **天然的可分享成绩卡**                                                              | 4    | 4    | 2    | 3    |
| **Line Rider**              | https://www.linerider.com/                                                  | ✅ 官方 HTML5 版（原版作者 Boštjan Čadež 转 HTML5） | 赛道链接 / 录屏                   | **20 年老 IP**：画线→雪橇自己跑；社区演化出 scenery / tech / music-sync 三类玩法；打点结果是视频天然素材        | 5    | 3    | 2    | 4    |
| **Falstad CircuitJS**       | https://www.falstad.com/circuit/                                            | ✅ JS 版                                            | **电路可通过 URL / 文件分享**     | 「随便拉几根线就跑起来」+ 电流电压动画 + 内建示波器；被多家 2026 年最新模拟器横评收录                           | 3    | 4    | 4    | 5    |
| **CircuitVerse**            | https://circuitverse.org                                                    | ✅ MIT 开源                                         | 公开项目 / iframe 嵌入 / 作业批改 | **社区 + fork 机制最完整**：分组(group)、作业、testbench、时序图、URL 与嵌入，2026 年横评中被认为是教育场景首选 | 3    | 4    | 5    | 5    |
| **Plinkopinball**（弹球类） | https://tympanus.net/codrops/hub/ （2026-08-24 by Andrew Woan）             | ✅ Three.js                                         | 演示                              | Codrops Creative Hub 2026 新作，说明「弹珠 / 弹球类」仍在 creative coding 主流视野内                            | 4    | 4    | 1    | 4    |

**该方向的社区规律**：能形成「分享 + fork」闭环的，无一例外具备三要素里的至少两个 —— ① 作品可被 URL / 字符串编码（成本低到不用注册）；② 有画廊或社区服务端；③ 有横向比较（成绩 / 投票 / seed 竞技）。Sandspiel（画廊）、Powder Toy（服务器投票）、Line Rider（视频社区）、CircuitVerse（公开项目 + 嵌入）都符合。

---

## 2. 细胞 / 生命 / 进化沙盒

| 项目                                                    | URL                                                                               | 浏览器可行性                           | 产出物                                                       | 为什么火                                                                                                          | 好玩 | 炫技 | 实用 | 可行 |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---- | ---- | ---- | ---- |
| **Lenia（作者官方）**                                   | https://chakazul.github.io/lenia.html · https://github.com/Chakazul/Lenia         | ✅ 原生 JS                             | 可玩                                                         | 2018 论文 + GECCO 虚拟生物竞赛冠军、ALIFE 奖；GitHub 3.9k★；衍生出 400+ 物种                                      | 5    | 5    | 2    | 5    |
| **Lenia（GPU 现代实现）**                               | https://hammyasf.github.io/lenia.html                                             | ✅ **WebGL2 浮点纹理 ping-pong GPGPU** | **Save PNG / Record 视频**                                   | 「并不上传任何东西，断网也能跑」是其自我标榜；含 Orbium / 原始汤 / 珊瑚 / 转子预设                                | 5    | 5    | 2    | 5    |
| **anima（Lenia 实验室）**                               | https://github.com/Nikhil-creat/anima                                             | ✅ WebGL2，无框架无构建                | **基因组 JSON / 通过 URL 分享任意基因组 / 实验导出 CSV**     | 最有参考价值的形态：不只是玩，而是「**参数空间相位图（144 个基因组判定存活）+ 十代进化搜索 + 基因组库**」         | 5    | 5    | 3    | 5    |
| **Particle Life**                                       | https://github.com/hunar4321/particle-life                                        | ✅ JS                                  | 可玩                                                         | 3.4k★，用「物种两两吸引/排斥矩阵」涌现出会游动、会自我维持的人工生命；比 Boids 的规律更不可预测                   | 5    | 4    | 1    | 5    |
| **SandboxScience**                                      | https://github.com/DicSo92/SandboxScience                                         | ✅ **WebGPU**                          | 可玩                                                         | 2026 年新项目：把 Game of Life / Particle Life / 丝状体用 WebGPU 跑，代表「WebGPU 玩具」这条线正在起势            | 4    | 5    | 2    | 4    |
| **Genetic Cars（BoxCar2D 精神续作）**                   | https://rednuht.org/genetic_cars_2/ · https://github.com/red42/HTML5_Genetic_Cars | ✅ Box2D                               | **成绩曲线 / Top replay / Seed 可约定 → 朋友间比同一种地形** | 「看着自己进化出车」品类里活到今天的实现；可调变异率、变异幅度、精英克隆、重力档位（地球/月球/木星）              | 5    | 4    | 1    | 5    |
| **Genetic Brick Cars**                                  | https://rednuht.org/genetic_brick_cars/                                           | ✅ 3D                                  | 可玩                                                         | 同一作者的升级形态：**用真实 LEGO 砖 / 板 / 轴 / 轮逐扣凸起地进化出车**，滚下起伏坡道会碎裂                       | 5    | 5    | 1    | 3    |
| **BoxCar2D（原版）**                                    | http://boxcar2d.com/                                                              | ⚠️ 原站已不活跃                        | —                                                            | 品类鼻祖，中文互联网科普文（凤凰/搜狐）反复引用，是「遗传算法」的最佳大众科普案例                                 | 5    | 3    | 1    | 3    |
| **Complexity Explorables · Maggots in the Wiggle Room** | https://www.complexity-explorables.org/explorables/maggots-in-the-wiggle-room/    | ✅ D3                                  | 可玩                                                         | 「物种互相吃的演化沙盒」，同一个站还有 `A Patchwork Darwinge`、`Lotka Martini`、`Repliselmut` 三姊妹              | 4    | 3    | 3    | 5    |
| **HexBOTs**                                             | https://hexbot-genesis.netlify.app                                                | ✅ Canvas + JS                         | `D` 保存图片                                                 | 近期 Show HN：**随机基因组 → 确定性机器人**，在六边形网格里跑出涌现图案；作者自称「算法不是瓶颈，基因组设计才是」 | 4    | 4    | 1    | 4    |

---

## 3. 可交互的音乐 / 声音玩具（已排除「音乐可视化」）

| 项目                                   | URL                                                                                   | 浏览器可行性                        | 产出物                            | 为什么火                                                                                                                                    | 好玩 | 炫技 | 实用 | 可行 |
| -------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ---- | ---- |
| **Strudel（TidalCycles 的 JS 移植）**  | https://strudel.tidalcycles.org/ · https://github.com/tidalcycles/strudel             | ✅ WebAudio，无需安装 SuperCollider | **作品链接 / MIDI / OSC 输出**    | 3k★，把「必须装 Haskell + SuperDirt」降到「打开浏览器」；编辑器实时高亮正在响的那一个 pattern token ——这点至关重要                          | 4    | 5    | 4    | 4    |
| **Beepbox**                            | https://www.beepbox.co/                                                               | ✅                                  | **整首歌就是一个 URL**            | 传播性最强的音乐工具之一：无账号、无后端、链接即作品                                                                                        | 5    | 3    | 4    | 5    |
| **ToneMatrix Redux**                   | https://tonematrix.lupine.dev/ （原 Audiotool Flash 版的 HTML5 复活）                 | ✅ Tone.js                          | 可玩                              | 五声音阶网格 → 随便点都好听；「怎么点都不难听」的典型设计                                                                                   | 5    | 3    | 3    | 5    |
| **Music Box Fun**                      | https://musicbox.fun/                                                                 | ✅                                  | **音乐盒纸带图 + 可分享视频/BGM** | 把「钢琴卷帘」换成「打孔音乐盒」，视觉可爱 + 产出可视频化                                                                                   | 5    | 3    | 3    | 4    |
| **Chrome Music Lab · Song Maker**      | https://musiclab.chromeexperiments.com/Song-Maker                                     | ✅ WebAudio/Tone.js                 | 歌曲链接                          | Google 官方出品，**免插件、多端可用**，长期是音乐入门教学的标配配套                                                                         | 4    | 3    | 4    | 5    |
| **NoiseCraft**                         | https://noisecraft.app/                                                               | ✅ WebAudio 节点图                  | **patch 链接分享**                | 节点模块化合成，把桌面 Max/Reaktor 体验压到浏览器                                                                                           | 4    | 4    | 3    | 4    |
| **Patatap**                            | https://patatap.com/                                                                  | ✅ Two.js + WebAudio                | 录屏                              | **音画同键**：A–Z 每个键一个声音+一个动画，空格切换整套调色/音色包；WIRED 2014 报道，至今仍是「portable animation & sound kit」的定义性作品 | 5    | 4    | 1    | 5    |
| **Jazzari**                            | https://jackschaedler.github.io/jazzari/index.html                                    | ✅                                  | 乐队编曲                          | 「浏览器里的可编程乐队」                                                                                                                    | 4    | 4    | 3    | 4    |
| **LudoTune**                           | https://ludotune.com/                                                                 | ✅ 3D                               | 音乐                              | 用立方体堆叠做音乐，3D 玩具感强                                                                                                             | 4    | 4    | 2    | 3    |
| **Thirtydollar website**               | https://thirtydollar.website/                                                         | ✅                                  | 曲目分享 + 社区                   | 用 meme 音效和「动作」编曲，社区曲目池驱动循环                                                                                              | 5    | 3    | 1    | 4    |
| **Peel.fm / 108 / Mini Music Machine** | https://peel.fm/ · https://martinwecke.de/108/ · https://muted.io/mini-music-machine/ | ✅                                  | 节奏                              | 极小交付—— 一台鼓机 / 一台节拍机 / 多重对拍 loop 机，开发成本低但传播不低                                                                   | 4    | 2    | 2    | 5    |
| **io-808**                             | https://github.com/vincentriemer/io-808                                               | ✅ React + WebAudio                 | 可玩                              | 744★，全浏览器复刻 TR-808 鼓机                                                                                                              | 4    | 3    | 2    | 4    |
| **Omni**                               | https://femurdesign.com/omni/                                                         | ✅                                  | 可玩                              | 把「难记的音阶/调式」变成可视化键盘，实用向                                                                                                 | 3    | 3    | 4    | 5    |

**观察**：这个赛道最强的传播机制是 **URL 即作品**（Beepbox、Song Maker、NoiseCraft、Strudel）+ **失败不了**（ToneMatrix 五声音阶、Patatap 固定映射）。没有别人/注册 cutaneous 任何摩擦。

---

## 4. 涌现 / 自组织可视化

| 项目                                                                                  | URL                                                          | 浏览器可行性  | 产出物                               | 为什么火                                                                                                                                                               | 好玩 | 炫技 | 实用 | 可行 |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ---- | ---- |
| **Complexity Explorables（整站）**                                                    | https://www.complexity-explorables.org/                      | ✅ D3，纯静态 | 每张都自带「slide 模式」可直接做 PPT | **2025 年 ISAL（国际人工生命学会）教育传播奖**；Santa Fe 研究所、维也纳 Complexity Science Hub 都在用；评审原话「full of interesting and engaging teaching materials」 | 4    | 4    | 5    | 5    |
| ↳ Berlin 8:00 a.m.（幽灵堵车）                                                        | /explorables/berlin-8-am/                                    | ✅            | 可玩                                 | 「我没撞车，我看到了自己制造了一场堵车」——最容易被转述的一句话体验                                                                                                     | 4    | 3    | 4    | 5    |
| ↳ The Walking Head（行人动力学）                                                      | /explorables/the-walking-head/                               | ✅            | 可玩                                 | 人群自组织通道形成的经典模型                                                                                                                                           | 3    | 4    | 4    | 5    |
| ↳ Epidemonic / Critical HexSIRSize（SIRS 传染病）                                     | /explorables/epidemonic/ · /explorables/critical-hexsirsize/ | ✅            | 可玩                                 | 空间显式 SIR，**社会话题性强**；同类还有 `I herd you!`（群体免疫）与 `Facebooked Flu Shots`（网络疫苗接种）                                                            | 3    | 3    | 5    | 5    |
| ↳ Critically Inflammatory（森林火灾）                                                 | /explorables/critically-inflammatory/                        | ✅            | 可玩                                 | 森林火灾模型 = 自组织临界性的教科书案例，也是「临界」可视化最好看的之一                                                                                                | 4    | 4    | 4    | 5    |
| ↳ T. Schelling plays Go（隔离模型）                                                   | /explorables/t-schelling-plays-go/                           | ✅            | 可玩                                 | 同质性偏好 → 城市种族隔离涌现，「个体温和 ⇒ 集体撕裂」的震撼感                                                                                                         | 4    | 3    | 5    | 5    |
| ↳ Echo Chambers（舆论动力学）                                                         | /explorables/echo-chambers/                                  | ✅            | 可玩                                 | 社交回声室，讨论度高                                                                                                                                                   | 3    | 3    | 5    | 5    |
| ↳ Particularly Stuck（DLA） / Barista's Secret（渗流） / Cycledelic（空间石头剪刀布） | 相应 /explorables/…                                          | ✅            | 可玩                                 | 这三个 **视觉最漂亮**：DLA 珊瑚状分形、渗流突然贯穿、三色呈现螺旋涡                                                                                                    | 4    | 5    | 3    | 5    |
| ↳ The Blob / Knitworks / Clustershuck / Jujujajáki networks                           | 相应 /explorables/…                                          | ✅            | 可玩                                 | 网络生长模型：巨连通分量突然出现、社区自发聚类                                                                                                                         | 3    | 4    | 4    | 5    |
| **traffic-simulation.de**                                                             | http://www.traffic-simulation.de/                            | ✅            | 可玩                                 | 独立经典：环形道路 + 可调密度/卡车比例/限速，德国媒体报道后全球传播；「一个司机能毁掉所有人」这句自来水源自它                                                          | 4    | 3    | 4    | 5    |
| **Prime Time（数螺旋上的素数）**                                                      | /explorables/prime-time/                                     | ✅            | 可玩                                 | 数学 + emergent pattern 交叉，"Ulam spiral" 类                                                                                                                         | 3    | 3    | 2    | 5    |
| **Yo, Kohonen!（SOM 自组织映射）**                                                    | /explorables/yo-kohonen/                                     | ✅            | 可玩                                 | 少数真正「用得上」的 ML 可视化：看网络如何自适应地铺满数据空间                                                                                                         | 3    | 4    | 5    | 4    |

**说明**：疫情/疏散类里还有 guards 名篇（如 Washington Post 的 "flatten the curve" 小球模拟、Your COVID risk playlist），本轮检索只在二手报道里见到，**没能拿到稳定的官方 URL**，故不列 URL 只作方向参考。

---

## 5. 交互式数学玩具

| 项目                                          | URL                                                          | 浏览器可行性                                         | 产出物                          | 为什么火                                                                                                                                                                                       | 好玩 | 炫技 | 实用 | 可行 |
| --------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ---- | ---- |
| **Polynomial Roots Toy**                      | https://duetosymmetry.com/tool/polynomial-roots-toy/         | ✅                                                   | 可玩                            | **Show HN 69 points**：拖动多项式零点，实时看系数与曲线变化                                                                                                                                    | 4    | 5    | 4    | 5    |
| **Poincaré Section Clicker Toy**              | https://duetosymmetry.com/tool/poincare-section-clicker-toy/ | ✅                                                   | 可玩                            | 同一作者系列；该站本轮 `403`（可能为反爬），但 URL 来自 HN 官方 API 索引                                                                                                                       | 3    | 5    | 3    | 4    |
| **Simon Tatham 的 Toys 合集**                 | https://www.chiark.greenend.org.uk/~sgtatham/toys/           | ✅ HTML5                                             | 可玩                            | 一批「纯逻辑、全本地」的数学玩具，其中 **Möbius 变换**：https://www.chiark.greenend.org.uk/~sgtatham/toys/mobius.html 用「6 次平移+反演合成一次缩放」的定理做成可拖拽 Demo                     | 4    | 5    | 3    | 4    |
| **UCLA Tao · Möbius Transformations**         | https://www.math.ucla.edu/~tao/java/Mobius.html              | ✅                                                   | 可玩                            | 经典教学 applet：左右两幅 z / w 平面，点、线、圆同步变换                                                                                                                                       | 3    | 4    | 4    | 4    |
| **Complex Mapping Simulator**                 | https://www.videophysics.com/complex-mapping                 | ✅                                                   | 可玩 + 域着色                   | z² / 1/z / exp / log / sin / Möbius / Joukowski 预设；**保角性肉眼可见**（网格正交性保留），_domain coloring_ 一眼看出零极点与分支切割                                                         | 4    | 5    | 4    | 5    |
| **Conformal Disk-to-Square**                  | https://4454aa.github.io/conformal-disk-to-square/           | ✅ **WebGL fragment shader + Jacobi Theta 函数级数** | **导出 PNG/JPG**                | 最接近「把你的照片做共形映射变形」的现成开源实现：圆↔正方形保角展开，支持近邻/线性/mipmap 采样                                                                                                 | 4    | 5    | 4    | 4    |
| **Jeff Weeks · Topology & Geometry Software** | https://www.geometrygames.org/                               | ⚠️ 桌面/iOS（非网页）                                | —                               | **拓扑变换类的事实标准**：Torus Games（在有限无界宇宙里玩熟悉游戏）、Curved Spaces（多重连接宇宙飞行）、4D Maze、Hyperbolic Games、KaleidoPaint；多次 NSF 资助 + MacArthur 奖作者 + WIRED 报道 | 4    | 5    | 2    | 2    |
| **Tixy**                                      | https://tixy.land/                                           | ✅                                                   | 分享表达式                      | 16×16 网格里写一小段 JS 表达式生成动态视觉，创意编码里门槛最低的一种玩法的代表                                                                                                                 | 5    | 4    | 3    | 5    |
| **Slider Land**                               | https://sliderland.blinry.org/                               | ✅                                                   | 可玩                            | 只用 HTML slider 做出各种视觉把戏                                                                                                                                                              | 4    | 3    | 2    | 5    |
| **Koalas to the Max**                         | https://www.koalastothemax.com/                              | ✅ D3.js                                             | **支持 `?imageURL` 自定义图片** | 鼠标划过圆点分裂四份，最终揭示一张图；作者 Vadim Ogievetsky 为伴侣做的礼物；「最后一张图是什么」是极强的分享钩子                                                                               | 5    | 2    | 2    | 5    |

**缺口（诚实标注）**：本轮**没有检索到**一个公认标杆级的「可拖拽拓扑变换（网页版）」「可玩的球面上色」「可交互图论可视化」「球极投影玩具」URL。网页版拓扑的代表仍是 Jeff Weeks 的桌面套装。这既是缺口也是机会。

---

## 6. 可玩的「造物」工具

| 项目                                  | URL                                                                                | 浏览器可行性                    | 产出物                                             | 为什么火                                                                                                                                                                                       | 好玩 | 炫技 | 实用 | 可行 |
| ------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ---- | ---- |
| **Townscaper**                        | https://oskarstalberg.com/Townscaper/                                              | ✅ Web 版常驻                   | 小镇                                               | Oskar Stålberg 的代表作，「无目标、无输赢、每点一下都长出好看的房子」所以它实际上是**一套规则驱动的生成系统**，零基础玩家随手点也能出很好看的结果                                              | 5    | 5    | 2    | 4    |
| **Planet（同作者）**                  | https://oskarstalberg.com/game/planet/planet.html                                  | ✅                              | 小行星                                             | 在球面上捏出山脉/森林/城镇；**旋转的行星 + 生长动画**，短视频素材天花板                                                                                                                        | 5    | 5    | 1    | 4    |
| **Bridge Builder（多个 HTML5 实现）** | https://webgameplus.com/games/bridge-builder · https://whatifs.fun/bridge-builder/ | ✅                              | 三星评价                                           | 承重测试品类：每根梁按应变实时变色（绿→黄→红断裂），**「三角形不能折叠、矩形会」是它的核心教学结论**，失败/成功画面都有表演性                                                                  | 4    | 2    | 3    | 5    |
| **IsoCity / iiisometric**             | https://victorribeiro.com/isocity/ · https://fffuel.co/iiisometric/                | ✅                              | 等轴测城市                                         | 用极简 UI 造等轴测城市 / 造立方体                                                                                                                                                              | 4    | 2    | 2    | 5    |
| **Rooms**                             | https://rooms.xyz/                                                                 | ✅                              | 虚拟房间                                           | 用素材库造可交互虚拟房间，社交属性强                                                                                                                                                           | 4    | 3    | 3    | 3    |
| **Orb Farm**                          | https://orb.farm · 说明页 https://orb.farm/info                                    | ✅ 粒子模拟                     | 可玩（生态平衡能否维持）                           | Max Bittker 的**封闭式水生态缸**：藻/草/水蚤/鱼/细菌/沙/沉木构成真实食物链，**硝化作用、光照昼夜、氧气耗尽会导致整缸死亡**；灵感来自 YouTube 的 Life in Jars 频道；The Verge、Destructoid 报道 | 5    | 4    | 2    | 4    |
| **Fold 'N Fly**                       | https://www.foldnfly.com                                                           | ✅（主要是内容站）              | **可打印折法图纸 + 每架机的实测飞行距离/滞空数据** | 40+ 纸飞机折法库，按难度/目标（距离/滞空/特技）分类；A4 与 Letter 双尺寸                                                                                                                       | 4    | 2    | 5    | 5    |
| **Spaceship Generator**               | https://github.com/a1studmuffin/SpaceshipGenerator                                 | ⚠️ Blender Python 脚本（7.8k★） | 3D 飞船                                            | 「一句话/一个种子出一艘飞船」证明：**参数化造物 + 可导出模型**的需求很大，只是现在还住在 Blender 里                                                                                            | 4    | 4    | 3    | 3    |
| 造乐器（可列为参考形态）              | Beepbox / Omni / LudoTune / NoiseCraft（见第 3 节）                                | ✅                              | 乐器 + 曲目                                        | 「造一个乐器然后弹出一首歌」是最容易把新手拉进来的造物路径                                                                                                                                     | 4    | 4    | 3    | 4    |

---

## 7. AI 辅助的创意玩具（本地小模型）

| 项目                                       | URL                                                                        | 浏览器可行性                              | 产出物       | 为什么火                                                                                                                                                                              | 好玩 | 炫技 | 实用 | 可行 |
| ------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ---- | ---- |
| **sketch-rnn（Google Magenta 官方 Demo）** | https://magenta.withgoogle.com/sketch-rnn-demo                             | ✅ TF.js 端口                             | SVG 化的涂鸦 | 三个 Demo：交互式续画 / 多结局预测 / 两图插值形变 / VAE 风格模仿；~100 个预训练模型（每个 5MB）                                                                                       | 5    | 4    | 3    | 3    |
| **@magenta/sketch（TF.js 官方包）**        | https://github.com/magenta/magenta-js                                      | ✅ npm + CDN                              | —            | 提供了 `update/getPDF/sample` 一套 API，**模型权重在 Google Cloud Storage 上公开可取**，因此可以下载后自托管、真正做成「零上传」                                                      | 5    | 4    | 3    | 3    |
| **ml5.js SketchRNN**                       | https://github.com/ml5js/ml5-library/blob/main/docs/reference/sketchrnn.md | ✅                                        | —            | 114 个预训练模型，一行 `ml5.sketchRNN('cat')`，生态更友好                                                                                                                             | 5    | 3    | 3    | 4    |
| **WebLLM（MLC / 陈天奇团队）**             | https://mlc.ai/web-llm/ · https://github.com/mlc-ai/web-llm                | ✅ WebGPU + WASM                          | 文本         | **浏览器里跑 Llama/Gemma/Phi/Qwen 等**，int4 量化 + 静态内存规划；OpenAI 兼容 API、JSON 模式、流式输出                                                                                | 4    | 5    | 4    | 3    |
| **emojiGPT**                               | https://github.com/MattWenJun/emojiGPT                                     | ✅ 单个 index.html                        | emoji 叙事   | 基于 Karpathy microGPT 的浏览器移植，**10M 参数级 GPT**，手机浏览器可跑；证明「纯 frontend + 极小型自回归模型」这条路线可行（缺点是下载体积与首次运行体验）                           | 3    | 5    | 2    | 3    |
| **TinyStories / llm.pdf**                  | 数据集：https://arxiv.org/abs/2305.07759                                   | ⚠️ 需自行转 ONNX                          | —            | TinyStories 数据集用 GPT-3.5/4 生成的儿童故事训练，**3–4 岁能懂**，是 10M–33M 参数级故事生成器的标准训练语料；`llm.pdf` 项目把 Pythia-31M/TinyStories 塞进 PDF 里跑，是同类传播的证明 | 3    | 5    | 3    | 2    |
| **Animated Drawings**                      | https://sketch.metademolab.com/                                            | ⚠️ 官方 Demo 可能含服务端步骤，需自行验证 | GIF / 视频   | Meta 出品：儿童涂鸦变成会走路跳舞的角色。**传播力极强**（幼儿园画会动），但要做「零上传」必须自行移植模型权重                                                                         | 5    | 4    | 3    | 2    |

**给 iWhimsy 的关键提醒**：`bg-remover` 已经在用 ONNX Runtime 系，所以「下载模型 → IndexedDB 缓存 → 懒加载进度条」的基础设施是有的。sketch-rnn / 小 GPT 可以复用这条设施。但 `AGENTS.md` 明确写了 onnxruntime-web 单 wasm 变体 ~23.5MB，**只引一套变体 + CDN 懒加载**——不要把两个模型叠在一个页面上。

---

## 8. 游戏化但高级的生成类

| 项目                               | URL                                                      | 浏览器可行性 | 产出物                                                            | 为什么火                                                                                                                            | 好玩 | 炫技 | 实用 | 可行 |
| ---------------------------------- | -------------------------------------------------------- | ------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ---- | ---- |
| **Watabou's Procgen Arcana**       | https://watabou.github.io/ · https://watabou.itch.io/    | ✅ 纯前端    | **PNG / SVG / JSON，One Page Dungeon 还能导出 Markdown 房间描述** | TRPG 圈事实标准：中世纪城市 / 村庄 / 街区 / 单页地牢 / 洞穴 / 住宅 / 险岸 / 奇幻地区，全免费；city JSON 可塞进配套的 3D City Viewer | 4    | 3    | 5    | 5    |
| **Azgaar's Fantasy Map Generator** | https://azgaar.github.io/Fantasy-Map-Generator/          | ✅           | 地图 + 导出                                                       | 开源免费派代表，有汉化版（https://mywis.cn/wisl/fmg）；与付费的 Wonderdraft / Inkarnate 并列被推荐                                  | 4    | 4    | 5    | 5    |
| **Twine**                          | https://twinery.org/                                     | ✅           | HTML 游戏文件                                                     | 分支叙事编辑器，itch.io 上近 6000 个 Twine 作品                                                                                     | 4    | 2    | 5    | 5    |
| **Bitsy**                          | https://make.bitsy.org/                                  | ✅           | 可导出的小游戏                                                    | 极简像素小游戏/小世界编辑器                                                                                                         | 4    | 2    | 4    | 5    |
| **PuzzleScript**                   | https://www.puzzlescript.net/editor.html                 | ✅           | 可玩推箱子变体                                                    | 用极简脚本定义推箱规则并立即试玩                                                                                                    | 4    | 3    | 4    | 5    |
| **Decker**                         | https://beyondloom.com/decker/index.html                 | ✅           | 多媒体交互小品                                                    | 浏览器里的 HyperCard 精神续作                                                                                                       | 4    | 3    | 4    | 4    |
| **中文平台侧（关键分发信号）**     | B站 Toy / 小红书小工具 / 抖音互动空间 / 快手 AI 互动内容 | —            | —                                                                 | 见文末「中文分发格局」专节                                                                                                          | —    | —    | —    | —    |

**中文分发格局（本轮最重要的一条市场情报）**：

- B站 **Toy**（2026 年 6 月上线，网页端互动发布平台）：**上线数月互动总体验量破 2956 万次**，跑出两款现象级作品 —— SBTI 趣味人格测试、「大狗叫 Tap」（**833 万次试玩**，极简魔性点击）。
- 小红书 **小工具**（2026 年 7 月）：互动作品挂在笔记下方，不跳出 App；已吸引 **超 16 万 AI 开发者**，相关话题曝光量超 6 亿。**注意它的气质与 B站不同**：小红书上跑得动的是「实用性种草的延伸」——测肤质、配穿搭、试妆容。
- 抖音 **互动空间**：内测期每人最多上传 100 个作品、单作品同时在线上限 100 人。
- 快手 AI 互动内容：互动剧情 / AI 角色对话 / 互动轻应用三类招募。
- 海外对照：Loopit（上线两月下载破百万、Google Play 全球总榜第 8）、Aippy（累计 200 万 UGC 游戏、支持 **一键 Remix**）、Sekai（用户创建应用超 1500 万个）。多家为华人主导团队。

**对选型的直接结论**：这套 App 内的分发渠道**要求单 HTML/zip 包、禁用网络请求、能力受限沙箱**。iWhimsy 是独立站点，天然做不到「挂到小红书笔记下」，但可以：
① 让每个工具页支持**导出单文件 HTML**（把种子 + 状态 + 逻辑打包），作者自己上传平台 → 天然导流；
② 优先做「**结果是张卡/一句话结论/可截图**」的工具卡（呼应《大狗叫 Tap》的成功逻辑）。

---

## 9. 时间与记忆类

**本轮检索结论：没有找到可靠的标杆产品，建议不投入。**

理由与证据：

- 检索到的都是「平台年度盘点/账单」形态（需用户登录平台取数据），与「纯本地、无登录」直接冲突；
- 同类出现的站点多为合辑式推荐站（如 WindowSwap、This Is Sand、Neal.fun 被放在同一个「摸鱼站点」列表里），但没有单一的「年度回忆/时光机」爆款被反复引用；
- 且该类必然要读用户的照片/聊天记录，**零上传约束下无法产出「回忆」**（只能做「时光机滤镜」，而「照片艺术化」已被你排除）。

若将来一定要做，唯一站得住的形态是：**用户自选照片 → 完全本地生成时间轴/胶片/年报排版 → 导出单张长图**。技术含量低、与市面上的图片排版/长图工具高度重合，**综合评分 2.6，不进 Top 15**。

---

## 10. 浏览器里的「仪器」—— 真实测量

| 项目                                       | URL                                                                                                             | 浏览器可行性                     | 产出物     | 为什么火                                                                                                                                                                                       | 好玩 | 炫技 | 实用 | 可行 |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ---- | ---- |
| **Intel Generic Sensor Demos**             | https://github.com/intel/generic-sensor-demos                                                                   | ✅（需 HTTPS / localhost）       | —          | 官方范例集：**Punchmeter**（用线性加速度算拳速）、Orientation Phone（绝对姿态 → 旋转 3D 模型）、Ambient Map（环境光 <10 lux 切夜间地图）、360° 全景/视频、**VR Button（磁力计）**、Sensor Info | 4    | 4    | 4    | 3    |
| **Chrome 官方文档 · Sensors for the web**  | https://developer.chrome.com/docs/capabilities/web-apis/generic-sensor                                          | ✅                               | —          | 明确了三个 crucial：① 仅 HTTPS（localhost 除外）；② Permissions Policy、跨域 iframe 默认禁读取；③ **页面不可见时不给数据**。这些都是选型时要写进 UI 的降级提示                                 | —    | —    | —    | —    |
| **WebSensor Compass（海洋罗盘）**          | https://github.com/intel/websensor-compass                                                                      | ⚠️ 项目已停止维护                | —          | 纯 Web 标准的 3D 罗盘， Accelerometer+Gyroscope+Magnetometer 三合一，证明「浏览器当罗盘」可行                                                                                                  | 3    | 4    | 4    | 2    |
| **WebAudioSpectrum（频谱+示波器+瀑布图）** | https://deftio.github.io/WebAudioSpectrum                                                                       | ✅ `getUserMedia` + AnalyserNode | 实时图     | 单页三视图：**示波器（线性/对数/压扩幅度）、实时频谱、瀑布图 spectrogram**；还带 Hamming 窗，接近真仪器而不是 wrapper 效果                                                                     | 3    | 4    | 5    | 5    |
| **audioMotion.js**                         | https://github.com/hvianna/audioMotion.js                                                                       | ✅                               | 可嵌入组件 | 高质量频谱/示波器组件，替代自己画                                                                                                                                                              | —    | 4    | 5    | 5    |
| **声级计可行性依据**                       | https://developer.mozilla.org 系/CSDN 系教程以及 https://effect-labs.com/en/pages/blog/audio-visualizer-js.html | ✅ WebAudio 必须用户手势         | dB 数值    | 教程明确：`getUserMedia` 需 HTTPS；可通过 AnalyserNode 的原始时域数据算 RMS。**注意：未经校准的浏览器"分贝"是相对值，不能当计量工具宣传——这是合规红线**                                        | 3    | 4    | 5    | 4    |

**为什么这一类值得做**：它同时满足「真实测量（实用）」+「JS 其实跑不动信号处理的印象被打破（炫技）」+「和 `device-lab` / `network-lab` 同一血脉，产品线自洽」。

---

## 11–12. 可 3D 打印的生成器 / 参数化造物美学

| 项目                                     | URL                                                                            | 浏览器可行性               | 产出物               | 为什么火                                                                                                                                                                      | 好玩 | 炫技 | 实用 | 可行 |
| ---------------------------------------- | ------------------------------------------------------------------------------ | -------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ---- | ---- |
| **拓竹 MakerLab（MakerWorld）**          | 花瓶生成器：https://makerworld.com.cn/makerlab/makeMyVase                      | ✅ **全浏览器 Customizer** | **STL / 3MF**        | **最硬的市场证据**：截至 2025 年底 31 万用户累计产出 260 万个模型，其中**浮雕生成器单独产出 40 万个模型**；2026 年 6 月超 30 万创作者上传；因用量激增已开启收费模式           | 3    | 4    | 5    | 4    |
| **Vase Generator（Customizer Edition）** | https://makerworld.com/en/models/2842587-vase-generator-customizer-edition     | ✅ OpenSCAD + 实时滑块     | STL                  | 「拖滑块就有无限种花瓶」的完整参数化线路：**肚位/颈位/波形数/扭转角度/实心壳 vs 螺旋花瓶模式** + Solid Shell 自动做防水层 —— 这套交互设计几乎可以直接抄思路                   | 4    | 4    | 5    | 4    |
| **Lithophane Maker**                     | https://lithophanemaker.com/ （含球面/弧形/吊灯扇/多色/圣诞树/圆牌等多种形态） | ✅                         | STL                  | 「照片变浮雕灯」是被 3D 打印社区反复推荐的品类；该站有球面、曲面、吊灯等多种形态，说明**形态扩展比算法本身更能留住用户**                                                      | 4    | 3    | 5    | 5    |
| **Gridfinity 生成器等**                  | 多篇中文教程提到「搜 Gridfinity Generator」即可用 drawer 尺寸直接生成          | ✅                         | STL                  | 家庭刚需：抽屉模块化收纳盒，按长宽/格数/深度生成                                                                                                                              | 2    | 3    | 5    | 5    |
| **CADAM（AI + 浏览器版 OpenSCAD）**      | 项目名见 https://www.163.com/dy/article/KT6VAN8U05568HUH.html 报道             | ✅ OpenSCAD 已能编译到网页 | **STL / SCAD / DXF** | 形态很值得借鉴：自然语言 → LLM 写 OpenSCAD → 网页渲染 → **所有参数变成右侧滑块** → 导出 STL（打印）/ DXF（激光切割、CNC）。**本轮未找到该项目的公开仓库地址，需你方自行确认** | 4    | 5    | 5    | 3    |
| **Spaceship Generator**                  | https://github.com/a1studmuffin/SpaceshipGenerator （7.8k★）                   | ⚠️ Blender 脚本            | 模型                 | 「参数化造物 + 可导出」的极强需求证明，见第 6 节                                                                                                                              | 4    | 4    | 3    | 3    |

⚠️ **印章 / 签名：明确不建议做。** 你自己在需求里已经点出伪造风险。若要碰，只做「纯装饰性的花体字 / 几何徽记图案」，**绝不做「手写签名扫描 → 印面」**，并在 UI 上写死免责；否则直接放弃。
其余可选项优先级：**分形/陀螺曲面花瓶 > 参数化灯具（灯罩壁厚随光源位置优化）> 拓扑镂空首饰吊坠 > 浮雕肖像**。

---

## 检索轨迹（本轮实际走过的路径，便于复核）

1. GitHub Topics：`sandbox-game`、`cellular-automata`、`web-audio`、`procedural-generation`（按 stars 排序页面）
2. HN Algolia API：`https://hn.algolia.com/api/v1/search?query=interactive+toy&tags=show_hn`（命中 polynomial-roots-toy 69pt、zazow.com 30pt 等）
3. Product Hunt 首页/Hunted.space 2026 热榜 + 2026-03-29 每日榜（SlapMac 398 票等）——**结论：PH 上此品类几乎缺席，当日/近期热榜全为 AI Agent 类**
4. Chrome Web Store 检索（含 chrome-stats.com、 chromewebstore.google.com）——**结论：扩展形态下此类玩具极度稀缺，现存多为 AI 生成类（Figure Creator、AI Image of the Day），证明「网页 App」而非「扩展」才是正确载体**
5. Codrops Creative Hub / Codrops Demos（2025–2026 全部 demo 列表）
6. `letsgetcreative.today`（原 bryanbraun/lets-get-creative 的官方重定向）—— 高质量 curated 白名单，本文第 1/3/6 节大量 URL 出自这里
7. OpenProcessing 相关线索（含 HF 上的 openprocessing-sketches 数据集与 2025 年 p5.js 社区 sketch 征集）
8. itch.io：emergent-systems-game-jam（Chaos Engine Jam 2025，主题"Accidents Welcome"）、Sandbox Jam 2k25、BrowsEgg Jam
9. 中文侧：虎嗅《B站小红书抖音快手接连入局》、新浪财经《抖音互动空间能否重写爆款逻辑》、人人都是产品经理《抖音也启动互动内容平台内测》、稀土掘金《分享一波很有设计想法的消遣网站》——用于中文分发格局判断
10. 单点深挖：Complexity Explorables 全站列表、Falstad/CircuitVerse 2026 横评、MakerWorld 花瓶生成器与 MakerLab 数据统计、foldnfly、orb.farm + info 页、rednuht genetic cars 2 / genetic brick cars、orb/Line Rider/duetosymmetry/geometrygames/koalastothemax 等

---

# Top 15 推荐（按 好玩×炫技×实用×可行 综合分排序）

> 每个条目给出：**工具形态 + 产出物 + 建议 slug + 依靠的浏览器能力 + 实现量级**（M≈1–2 天 / L≈3–5 天 / XL≈1–2 周，沿用 AGENTS.md 口径）。
> 全部符合「零上传、无登录、可静态部署」。

### 1. Lenia 人工生命实验室 · 综合 4.25

- **形态**：WebGL2 浮点纹理 GPGPU 跑连续生命的 Lenia 元胞自动机。左侧「培养皿」，右侧「参数空间相位图」（把 μ-σ 网格里每个基因组判定为灭绝/静止/泛滥/存活），底部「十代进化搜索」按钮。
- **产出物**：PNG / WebM 录屏；**基因组 URL 分享**（对标 anima 的 `share any genome by URL`）；genome JSON 导出。
- **对标的三个工具**：https://chakazul.github.io/lenia.html · https://hammyasf.github.io/lenia.html · https://github.com/Nikhil-creat/anima
- **硬能力**：WebGL2 + `EXT_color_buffer_float`；不支持时降级到 Canvas 2D 小网格（**必须要有这条**，AGENTS.md 已经写过「WebGPU 必须有 WASM 回退」的同款要求）。
- **slug**：`lenia-lab` · 量级 L · 好玩 5 / 炫技 5 / 实用 2 / 可行 5

### 2. 复变函数相机 · 照片的共形映射变形 · 综合 4.25

- **形态**：上传照片 → 选映射（z²、1/z、exp、sin、Joukowski、Möbius (z-1)/(z+1)、圆盘↔正方形 via Schwarz–Christoffel / Jacobi Theta）→ 拖拽控制点实时变形，最终导出一张图。
- **产出物**：PNG 导出（对标 https://4454aa.github.io/conformal-disk-to-square/ 已实现导出）；可选「录屏 + 拖拽参数在 URL 里」。
- **为什么它是最好的**：同时满足「炫技（真的要用特殊函数而不是 for 循环）」「实用（产出就是一张能发的图）」「高级（背后是共形映射与保角性，不是调滤镜）」。这是唯一一个在全部四个维度都不拉胯的数学玩具。
- **硬能力**：WebGL fragment shader 做逐像素逆映射 + mipmap 采样；或者退化为 Canvas 2D 分块双线性采样（把网格切成 128px 小块做仿射近似）。
- **slug**：`conformal-camera` · 量级 L · 好玩 4 / 炫技 5 / 实用 4 / 可行 4

### 3. 环境音生成器 · 综合 4.20

- **形态**：选一个「场景」（雨夜便利店 / 深海底 / 太空站 / 黄昏草原 / 老图书馆），界面只有 3–5 个旋钮（密度、明亮、距离感、缓慢变革的时间尺度）→ 生成**任意长度**的环境音。
- **产出物**：**WAV/FLAC 导出 + 自动生成的封面卡（波形/频谱长图）**。这条「下载你自己的一片雨声」的闭环是它实用分高的唯一原因。
- **硬能力**：WebAudio 的节点图 + **`OfflineAudioContext.render()` 加速渲染**（一次性渲染 30 分钟音频而不是边放边等）；可选的 Faust→WASM 编译（《Web Synth》 https://synth.ameo.dev/ 已验证可行）。
- **传播点**：封面卡 → 「这就是我现在的背景音」。
- **slug**：`ambience-forge` · 量级 M–L · 好玩 4 / 炫技 4 / 实用 4 / 可行 5

### 4. 浏览器示波器 · 频谱仪 · 声级计 · 综合 4.15

- **形态**：一个真仪器面板（不是音乐可视化）。三视图切换：**示波器**（含触发边沿、线性/log/压扩三种幅度标尺、时基）、**实时频谱**（log 频率轴、Hamming 窗、峰值保持）、**频谱瀑布图**。附一个 SPL 表，但标注为「相对指示，未经声学校准」。
- **产出物**：截图；CSV 导出时域数据；可选 WebM 录屏。
- **对标的现成实现**：https://deftio.github.io/WebAudioSpectrum · https://github.com/hvianna/audioMotion.js
- **合规红线**：**不要声称可以计量 dB(A)。** 浏览器麦克风增益由系统决定，跨设备不可比。把它写成「相对响度趋势 / 自校准对比」——这是实用和合规的分界。
- **硬能力**：AnalyserNode + `getByteTimeDomainData` / `getByteFrequencyData`；需 HTTPS/localhost；必须用户手势启动。
- **slug**：`audio-scope` · 量级 M · 好玩 3 / 炫技 4 / 实用 5 / 可行 5

### 5. 落沙化学沙盒 · 综合 4.05

- **形态**：20→100 种可化学反应元素（水/火/土/酸/油/植物/金属/电/气体），**拖拽式的场景保存字符串（可粘贴分享）**。关键差异化：**不要做另一个 Sandspiel**，做「化学反应向」——重点是体现反应，而不是画场景。
- **产出物**：**一串可直接粘贴到聊天框的场景代码 + 一张 PNG + GIF 录屏**。小品级传播就靠这个字符串。
- **为什么值得做一个已经有很多的品类**：对标 https://sandboxels.r74n.com/ 的「元素越多越好」路线已经卷到头了，但「电路 + 化学反应 + 可粘贴分享的场景码」这条组合在浏览器里还没被做干净。
- **硬能力**：纯 Canvas 2D 就能跑，但要做到「满屏分辨率下也玩得下去」建议走 GPGPU（WebGL2 纹理 ping-pong），CPU 版本作为回退。
- **slug**：`element-sandbox` · 量级 XL（若要 100+ 元素与电路） · 好玩 5 / 炫技 5 / 实用 2 / 可行 4

### 6. 参数化可打印生成器（初版只做花瓶 + 浮雕）· 综合 3.95

- **形态**：左侧一列滑块，右侧实时旋转预览。初版两个主题：**① 花瓶/灯具**（肚位、颈位、波形数、扭转角、壁厚、实心壳 vs 螺旋花瓶模式，对标 MakerWorld Vase Generator）；**② 照片浮雕**（最大厚度、反相、曲面/平面、边框、吊孔，对标 https://lithophanemaker.com/）。
- **产出物**：**STL / 3MF + 一张「打印配置建议」卡**（层高、外层速度、是否注水—这个细节来自 MakerWorld 的真实页面）。
- **为什么它是实用分最高的一个**：MakerLab 的数据证明了需求 —— 31 万用户 / 260 万模型，**单个「浮雕生成器」就贡献了 40 万个**。
- **硬能力**：纯 JS 生成三角网格 → 自写 STL 二进制导出（几十行）；曲面瓶体用「轮廓线旋转成型」即可，**不需要 marching cubes**。后续若要做「gyroid 镂空/拓扑优化」才需要 marching cubes + iso surface（那时候再考虑 WASM）。
- **slug**：`printable-forge` · 量级 L · 好玩 3 / 炫技 4 / 实用 5 / 可行 4

### 7. 奇幻地图 · 地牢 · 城市生成器 · 综合 3.95

- **形态**：按下 Enter 生成新地图；右键菜单调风格/大小/标签/色盲友好/高对比度（全部抄 Watabou 的右键交互：https://watabou.github.io/）。初版三个主题：城市街区 / 单页地牢 / 洞穴。
- **产出物**：**PNG + SVG + JSON**；地牢还导出 Markdown 房间描述。**多格式导出是它实用分高的全部原因**——SVG 意味着能进 Illustrator 二次编辑，JSON 意味着能喂给别的工具。
- **硬能力**：Voronoi 松弛 + WASM 或纯 TS（超过 10 行的算法照 AGENTS.md 抽到 `lib/core/`）；SVG 字符串拼接；**路网处理不当会让 SVG 体积爆炸**——规划时就要限制节点数。
- **slug**：`fantasy-architect` · 量级 L · 好玩 4 / 炫技 3 / 实用 5 / 可行 5

### 8. AI 涂鸦补全 / 双人协作涂鸦 · 综合 3.85

- **形态**：你画一半 → 模型接着画（并给出多个结局让你挑）；或反过来，模型画一半你补完。自带 VAE「模仿你画的这个东西再变体一批」。
- **产出物**：SVG 导出 + 导出**绘制过程 GIF**（每一笔叠加一层）——「AI 画奇奇怪怪的东西」是社交平台上天生的视频素材。
- **对标的现成实现与模型**：https://magenta.withgoogle.com/sketch-rnn-demo · https://github.com/magenta/magenta-js（`update/getPDF/sample` API，权重公开可取） · ml5 的 114 个模型（https://github.com/ml5js/ml5-library/blob/main/docs/reference/sketchrnn.md）
- **硬能力**：TF.js 或 ONNX Runtime。**模型必须自托管 + IndexedDB 缓存 + >500KB 依赖懒加载**（这三个要求是 AGENTS.md 的原文红线）。
- **slug**：`sketch-duet` · 量级 L · 好玩 5 / 炫技 4 / 实用 3 / 可行 3

### 9. 密封生态瓶 · 综合 3.80

- **形态**：在一个玻璃球里投放 sand / water / algae / grass / daphnia / fish / goldfish / bacteria / driftwood / stone，昼夜自动循环，看能不能平衡到不灭绝。
- **产出物**：**「我的生态瓶活了 XX 天」的成绩卡 + 实录 Gif**。这是整份报告里「结果的戏剧性」最强的一个：用户的东西会死，死了会想再来。
- **硬能力**：粒子 CA + 氧气/二氧化碳/氮的简单收支方程；不要做成 WorldBox。纯 Canvas 够。
- **合规/体验注意**：结果必须是玩家可理解的（「氧气耗尽了」，而不是「系统失稳」这类抽象措辞）——Orb Farm 的说明页（https://orb.farm/info）就是靠这段元素解释赢的。
- **slug**：`ecosphere` · 量级 L · 好玩 5 / 炫技 4 / 实用 2 / 可行 4

### 10. 进化实验室 · 让它自己学会开车/走路 · 综合 3.80

- **形态**：每代 20 个随机个体（形状基因 + 轮子密度/大小/位置），在随机地形上跑，跑得最远的留下 → 自动迭代。面板显示「Top / Top10 平均 / 全体平均」三条曲线（直接抄 https://rednuht.org/genetic_cars_2/ 的线图设计）。
- **产出物**：**最佳个体的回放视频 / Seed 分享** → 「你和朋友用同一个 seed，看谁的第 30 代车跑得远」。这个「同 seed 竞技」是传播杠杆。
- **硬能力**：Box2D（wasm/js）+ web worker 跑 20 个体并行，主线程只收位置数据。**注意 AGENTS.md 的 Cross-Origin-Isolation 条款**：多线程 WASM 需要 COOP/COEP，本仓库已配好 COOP/COEP（Next config），所以 worker 路线是通的。
- **slug**：`evolution-lab` · 量级 L · 好玩 5 / 炫技 5 / 实用 1 / 可行 4

### 11. 手机传感器仪器箱 · 综合 3.80

- **形态**：一屏多仪器——三轴加速度/陀螺仪/磁力计/绝对姿态/环境光 + 三个玩法：**拳速计**（对标 Punchmeter，那是 Intel 官方 demo 里最出圈的）、**水平仪 / 铅垂线**、**磁力可视化 3D 罗盘**（对标 https://github.com/intel/websensor-compass）。
- **产出物**：**CSV 数据导出 + 一张「我这台设备的传感器读数」截图**——这张图本身就是可分享内容。
- **硬能力**：Generic Sensor API，**仅 HTTPS**（localhost 除外）、需 Permissions Policy、页面不可见时不给数据（这三条来自 https://developer.chrome.com/docs/capabilities/web-apis/generic-sensor，必须写进 UI 降级提示）。
- **合规注意**：iOS Safari 与桌面浏览器往往缺磁力计——**不支持就明确说「此设备/浏览器不提供该传感器」，不要静默失败**（AGENTS.md 第 10 节原文要求）。
- **slug**：`sensor-bench` · 量级 M · 好玩 4 / 炫技 4 / 实用 4 / 可行 3

### 12. 本地故事接龙 · 综合 3.80

- **形态**：你开个头，本地小模型往下写，每步给 3 个候选分支；你挑一个继续 → 形成一棵可展开的故事树。（**「分支可选」是它和「打字 ChatGPT」的唯一区别，也是它的全部产品价值**）
- **产出物**：故事树的可视化 SVG + Markdown 导出，或「一张孩子能读的插图故事卡」。
- **对标的模型路线**：① WebLLM（https://mlc.ai/web-llm/，WebGPU + int4，Llama/Phi/Qwen 系）；② 极小型自回归模型（https://github.com/MattWenJun/emojiGPT 证明 10M 参数级能跑）；③ 训练语料可参照 TinyStories（https://arxiv.org/abs/2305.07759）。
- **硬能力**：WebGPU 推理 + WASM 回退。**注意 AGENTS.md 已写明 Chrome 里只有 0.004% 的页面真正向 GPU 提交过任务，必须有 WASM 回退**——因此「极小型自回归模型」这条路线反而更容易保证可用性。
- **slug**：`story-weaver` · 量级 XL · 好玩 4 / 炫技 5 / 实用 3 / 可行 3

### 13. 模块化节点合成器 · 综合 3.75

- **形态**：拖节点（振荡器/噪声/音序器/滤波/延迟/混响/失真/压缩/LFO/混音/扬声器/示波器），拉连线。5 个内置预设 + 用户 patch 存 localStorage + **patch 可通过 URL 分享**。
- **产出物**：**patch 链接 + 一段导出的音频**。
- **对标的现成实现**：https://noisecraft.app/ · https://synth.ameo.dev/（后者证明了 Faust/Soul DSP → WASM 动态编译这条路在浏览器里是真的，参考价值极高）· https://github.com/zpeters/synth-html（单 HTML 文件无依赖版）
- **硬能力**：WebAudio；若要「自定义 DSP」才引 Faust→WASM（不要一开始就做）。
- **slug**：`patch-bay` · 量级 L · 好玩 4 / 炫技 4 / 实用 3 / 可行 4

### 14. 纸飞机工坊 · 综合 3.75

- **形态**：调参数（翼展/后掠角/上反角/机身长/升降舵微调/头重）→ 3D 预览 → **一键模拟投放，给出飞出的距离与滞空时间** → 生成**可打印的折法图纸（含编号折线）**。
- **产出物**：**A4/Letter PDF 折纸模板 + 一张「我设计的飞机飞了 12.4 米」成绩卡**。（折法库侧的对标：https://www.foldnfly.com 按距离/滞空/特技分类 + 每架机有实测数据）
- **硬能力**：用简化空气动力模型（升力/阻力系数随攻角变化 + 一个积分器）跑 2D 弹道；这在 `lib/core/` 里是可以纯函数实现并单测的，正好符合项目的分层规范。
- **为什么它是暗马**：成本极低（无重依赖）、有明确「可带走的实体产出」、亲子/团建场景明确、且这条赛道目前的网页工具站还没被占住。
- **slug**：`paper-glider` · 量级 M · 好玩 4 / 炫技 3 / 实用 4 / 可行 4

### 15. 幽灵堵车 · 城市涌现沙盒 · 综合 3.70

- **形态**：环形/多车道道路上撒一组车，每一辆按「跟驰模型」行驶；玩家可拉出 **(a) 车辆密度、(b) 卡车占比、(c) 限速、(d) 让一辆车突然刹车** 四个滑块，看「幽灵堵车」如何自发生成并向后传播。
- **产出物**：关键的不是图片而是**一句话结论 + 一张时空图（time-space diagram）** —— 时空图上会出现明显向后倾斜的堵车带。这张图的解释成本几乎为零，转述性极强。
- **对标的现成实现**：https://www.complexity-explorables.org/explorables/berlin-8-am/ · http://www.traffic-simulation.de/
- **硬能力**：IDM（Intelligent Driver Model）或 Nagel-Schreckenberg CA；**两者都能在 Canvas 上跑上千辆车**。可选项：Web Worker 分离模拟与渲染。
- **slug**：`phantom-jam` · 量级 M · 好玩 4 / 炫技 3 / 实用 3 / 可行 5

---

## 备选（分数略低但有明确理由）

| 候选                                                  | 综合 | 说明                                                                                                                                                                           |
| ----------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 传染病 / 森林火灾 / Schelling 隔离 / 回声室           | 3.65 | 传播力其实很强（社会话题性），但它们是「需要被讲解」的模型，而 iWhimsy 的产品外壳是「工具页」，讲解成本高；如果要做，建议做成 Top15 #15 的同一套引擎换模型，而不是单独一个工具 |
| 点阵揭示 mosaic（Koalas to the Max 类）               | 3.50 | 好玩 5 但炫技 2、实用 2；如果将来需要一个「首页引流钩子」而不是工具，它是最优选择（成本极低 + `?imageURL` 支持自定义图 ≈ 天然二次传播）                                        |
| 拓扑游戏套装（环面 tic-tac-toe / 4D 迷宫 / 双曲空间） | 3.50 | 炫技 5、好玩 4，但实用 1；网页版标杆缺位 = 机会也 = 风险。建议作为 #2 之后的第二批                                                                                             |
| 桥梁承重测试                                          | 3.10 | 好玩但炫技 2；上架容易损失产品调性（会被当作小游戏站）。除非走 B站 Toy / 小红书小工具的分发路线，否则不建议                                                                    |
| 更多音乐类（合唱编曲 / 各种微型乐器）                 | —    | 见第 3、6 节各条目，作为二次迭代的分支而非独立工具                                                                                                                             |

---

## 明确不做的（含理由）

| 类别                                 | 理由                                                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **印章 / 手写签名→印面**             | 伪造风险。你已经在需求里点出。要碰就只能做「装饰花体字图案」，且 UI 写死免责                                     |
| 时间与记忆 / 年度回忆类              | 见第 9 节：无标杆 + 必然要读用户私有数据，与「零上传、无登录」直接冲突                                           |
| 纯娱乐向的低龄玩具                   | 违反 AGENTS.md 第 1 节「看引擎」标准                                                                             |
| 依赖 Reddit/服务端画廊的「社区」功能 | 违反四条不可动摇约束里的「无登录 + 可静态部署」。**替代方案：用 URL / 字符串编码作品，把"分享"成本降到复制链接** |
| 任何 https://…/api 调用              | 违反「纯本地计算」                                                                                               |
