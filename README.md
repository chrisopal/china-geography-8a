# 中国地理探索课 · 八年级上册

免费公开课堂：[中国地理探索课](https://chrisopal.github.io/china-geography-8a/)（无需登录；地图、课程、练习和首课 3 段已有配音可用）。公开版不提供 AI 问答和新配音生成，可导入自己的音频。

原 Sites 课堂：[私密版本](https://china-geography-8a-chrisopal.chrisxie.chatgpt.site)（需要所有者登录）。

本机启动后访问：**http://127.0.0.1:8767/**

![桌面课堂](evidence/desktop-final.png)

独立于原“新疆地理沙盘”的新项目。围绕人教版新版公开五章目录，提供81个知识点、243段原创讲解、162道带解析练习；地图、讲解、实验与相关知识跳转连在一起。

## 启动

macOS 双击 `启动地理探索课.command`。或在此目录运行：

```sh
python3 server.py --open
```

需要 Python 3.9+ 和现代浏览器，不需要安装 npm 或 pip 依赖。默认只监听 `127.0.0.1`。端口占用时，双击启动会自动寻找附近空闲端口。关闭启动窗口或按 Ctrl+C 停止服务。不要直接双击 index.html；课程读取和问答需要本机服务。

## 建议的第一条学习路线

1. 从“中国在世界的位置”开始，旋转地图、点击省区。
2. 阅读三段讲解，或点击“播放讲解”。开启“连播”可连续听当前知识点。
3. 在沙盘下方操作模型、做动手题，再到右侧“想一想”回答迁移题。
4. 点击“接着探索”，把位置、地形、气候、河流、资源、生产生活和生态联系起来。
5. 不理解时打开“问老师”。老师会带着当前知识点与检索到的相关课程回答；参考节点可点击回看。

“学习地图”展示五章全部节点。浏览与练习通过分开记录，两道题都答对才标记“练习通过”，不代表孩子已经通过正式考试。学习进度和探索手记保存在当前浏览器，可导出备份。AI 问答只保留在当前页面内存，不会写入服务端日志。

## 能做的互动

- 全国模拟三维地图：阻尼旋转、鼠标位置缩放、右键或 Shift 拖动平移、双击聚焦；单指旋转，双指缩放与平移。保留 9 种专题层和 34 个省级行政区的点击与定位挑战。
- 立体、俯视、侧视预设，全屏与暂停动态；三级阶梯提供可转动的宏观剖面。讲解段落联动视角，手动操作进入自由探索，点击“恢复跟随”才恢复联动。
- 三个精选实验：三级阶梯全国图与剖面比较、冬夏季风切换、分水岭两侧落雨与双流域追踪。
- 七类场景：全国地理、季风、河流泥沙、土地利用、能源组合、运输方式、流域修复。
- 五类计算实验：地方时、2020年人口密度、正午太阳高度、矩形河道流量、定流量条件下的束水原理。
- 每个节点配独立的情境选择、解析、迁移题、易错点和相关知识。只有明确匹配模型参数的选项才改变模型；纯概念判断不伪装成物理实验。
- 支持键盘：方向键旋转，Shift + 方向键平移，`+/-` 缩放，`1/2/3` 切换视角，Home 复位，`[` / `]` 选择省区、Enter 查看；`/` 搜索，R 复位，F 全屏。

## 问答服务

服务端调用 [OpenRouter Chat Completions](https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request)，默认模型为 `google/gemini-3.1-flash-lite`。使用本地课程检索上下文、当前知识点和最近三轮对话。模型可能出错；界面保留参考节点用于核查，未将AI回答用于自动判题。

密钥从环境变量 `OPENROUTER_API_KEY` 或本机 `~/.config/china-geography-8a/openrouter.key` 读取。私密文件必须位于项目外，并设置为仅本人可读。仓库不含密钥，克隆后需要配置自己的密钥。Sites 版本在托管环境的 secret 中配置同名变量。

本机版可用 `OPENROUTER_MODEL` 环境变量更换问答模型。网络或额度异常时会明确提示；本地课程和练习不受影响。本机版仅监听回环地址；在线版付费问答需要家庭访问码和持久额度账本。进度仍保存在当前浏览器，尚无多人账号或跨设备同步。

## 中文配音

[OpenRouter TTS](https://openrouter.ai/docs/guides/overview/multimodal/tts) 已接入，默认使用 `qwen/qwen-audio-3.0-tts-plus`、`longanlingxin` 声音。第一次点击发送当前固定讲稿生成 MP3。本机版保存到项目目录；Sites 和 Pages 版本只播放已生成的固定 MP3，不提供在线实时合成。首次生成需要网络并使用账户额度。第一知识点的三段已经生成；其余固定讲稿待安全预生成。

缓存文件名由讲稿内容、模型和声音共同决定，修改讲稿后不会误用旧音频。本机版可用 `OPENROUTER_TTS_MODEL` 和 `OPENROUTER_TTS_VOICE` 替换为已支持的模型/声音，再重启本机服务。声音风格仍可按孩子试听反馈调整；不使用浏览器系统朗读代替正式 TTS。

也可以使用自己的 TTS：

1. 点击“配音工坊”，导出 CSV 讲稿或 JSON 清单。
2. 生成 MP3/WAV/OGG/M4A/WebM，文件名按 cue 编号，如 `location-01.mp3`。
3. 批量导入。文件在此浏览器的 IndexedDB 保存，优先于同段 AI 配音。单文件上限50MB。导入音频不上传。

项目的 `narration/` 另附完整讲稿清单。已有 MP3 作为静态文件发布，重复播放不调用模型。音频以段落为单位同步到讲解步骤；不是逐字字幕或自动口型同步。连续播放只推进当前知识点，切换课程会停止旧音频。

## 教材和地图边界

课程以[教育部2022年地理课程标准](https://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582354066450.pdf)为范围依据，以公开新版五章目录作编排参考。出版社旧版目录只有四章，公开新版扫描预览之间还存在页码及探究活动差异。**孩子具体教材版本尚未确认，不能把本项目称为已逐页核对其教材的官方完整课程。** 目录差异、覆盖矩阵和34组来源列于 `research/curriculum-audit.md`、`research/curriculum-map.json`、`curriculum.json`。

地理边界来自 DataV/高德学习交流数据，源页标注版本2021.5；高程、专题色彩、河道折线与实验数值是教学示意。它们不能用于测量真实海拔、人口、雨量，或预测自然灾害。省区定位含34个省级行政区，地图来源与简化方法见 `research/map-sources.md`。

## 文件与验证

核心文件：`index.html`、`styles.css`、`app.js`；`renderer.js` 与 `geo.js`；`labs.js`；`curriculum.json`；`server.py` 与 `speech.py`。前端采用原生浏览器能力，本机服务使用 Python 标准库；Sites 预算账本使用 D1，结构迁移由固定版本 Drizzle 工具生成。

```sh
python3 tests/check_curriculum.py
python3 tests/check_server.py  # 先启动8767端口服务；不会发起付费模型请求
node tests/check_math.cjs
```

浏览器回归脚本在 `tests/browser-*.js`，使用现有 Playwright CLI 的 `run-code --filename=...` 执行，无需新测试依赖。结果、截图和实际模型响应在 `evidence/`；功能验证、配音可解码/播放、视觉检查与孩子真实学习效果是不同的证据。

## Sites 部署

### GitHub Pages 免费公开版

运行 `node scripts/build-pages.mjs` 生成 `dist/pages/`，将该目录发布到 `gh-pages` 分支根目录；仓库 Settings → Pages 选择 `gh-pages` / `/ (root)`。不需要新账号、域名、密钥或付费后端。`deployment.json` 记录对应源码提交，可用于核对线上版本。发布前应提交源码，再构建，以便记录准确提交。

构建只包含前端、内嵌地图数据、课程和匹配当前讲稿的已有 MP3，不包含 Python、Worker、secret 或 API。所有运行资源使用相对路径且由同站点提供，适配 `/china-geography-8a/` 项目路径。进度和导入音频仍只保存在当前浏览器。微信及中国大陆网络的可达性需在真实设备和网络下另行验证。

### 家庭问答后端

`worker/api.mjs` 和 `worker/budget.mjs` 提供家庭问答；`scripts/build-sites.mjs` 生成 Worker ESM。原有 `OPENROUTER_API_KEY` 只在 Sites 运行时使用。新增 `FAMILY_ACCESS_SHA256` secret 存储高熵家庭访问码的 SHA-256；`FAMILY_AI_ENABLED=1` 才允许调用。缺少配置或 D1 时关闭付费接口。不要提交访问码、secret 或会话 token。

```sh
npm ci
npm run db:generate # 仅在修改 db/schema.ts 后生成新迁移
node tests/check_budget.mjs
node tests/check_worker_api.mjs
node scripts/build-sites.mjs
node scripts/validate-sites.mjs
```

会话一小时到期，仅保存在页面内存；登录按 IP 和全局持久计数限速。CORS 只接受本站和 `https://chrisopal.github.io`，CORS 不替代认证。每个问答请求都有幂等编号；超时或费用不明保留额度，禁止自动付费重试。成功回答和费用记录保存在 D1；不会记录用户完整问题、访问码或 API key。

每日合计上限为 1 美元，按 UTC+8 计日。D1 单条条件插入原子预留 0.75 美元，覆盖已核验模型的完整上下文、输出、缓存及推理上界，避免依赖粗略 token 估计。服务端核对公开模型价格和最大长度，并限制供应商与请求单价；返回可信费用后才结算释放余额。未结算请求跨日仍占额度，跨日完成则保守记入开始日及结束日。可用额不足预留值时会提前停止，而不是冒险花尽最后余额。这个额度只覆盖经过本站后端的调用，不限制同一 OpenRouter 账号其他项目的消费。

新增固定音频尚未生成：语音接口未明确支持 `max_price`，约 0.36 美元仅为当前字符单价的估算，不作为硬上限保证。在线实时 TTS 已移除，因此不会绕过共享账本额外花费。固定 MP3 可通过 `node scripts/build-pages.mjs` 自动按内容哈希收录，已取消仅容许三段的限制。

确认后端公开访问和认证正常后，用 `PAGES_FAMILY_API=https://china-geography-8a-chrisopal.chrisxie.chatgpt.site node scripts/build-pages.mjs` 构建带家庭入口的 Pages 版本。未指定此值仍构建无后端的免费版；课程和已有音频不依赖后端可用性。

`.openai/hosting.json` 保留原 Site ID，并声明 `DB`；Sites 负责建库与应用已提交的结构迁移。不要在请求处理时改表，也不要改写已部署迁移。发布遵循 Sites 官方源码同步、保存版本、部署流程。

地图与课程来源见 `research/`；仓库公开不代表第三方地图数据获得额外商业授权。真实手机、微信及中国大陆网络需分别验证。

## 1.1.0 交互验证

新增 `tests/check_camera.cjs`、`tests/browser-interaction-upgrade.js` 和 `tests/browser-narration-sync.js`，覆盖相机、手势取消、缩放锚点、双流域下降路径、自由探索与配音/服务异步返回的冲突。新增浏览器脚本默认使用 Worker 构建预览 `http://127.0.0.1:8768/`。

交互设计参考 [WeduLab 等高线课堂](https://wedulab.com/labs/contour) 与 [水循环课堂](https://wedulab.com/labs/water)，未复制其实现或素材。此项目仍使用无依赖 Canvas2D 投影模型，不是 WebGL 引擎，地形与水流为教学示意。触摸证据来自 Chromium 模拟，不代表已在实体手机或 Safari 验证。


## 1.2.0 过程实验

参考 [WeduLab 水循环沙盘](https://wedulab.com/labs/water) 和 [等高线课堂](https://wedulab.com/labs/contour) 的过程观察与条件对比方式，保留本站八上课程结构。

- 季风显示多束冷干气流，以及东南、西南两路暖湿气流与陆地云雨。
- 雨水实验支持两侧同时落雨，追踪坡面、河道与各自出口；其他场景通过情景按钮比较植被、坡地保护、能源、运输和修复条件。
- 动态场景支持 0.5× / 1× / 2× 动画速度与重播；暂停和系统“减少动态”仍有效。动画速度不表示实际自然过程的时间比例。
- 快捷情景、滑块和观察说明同步；继续保留自由镜头、讲解跟随、课程练习和音频缓存。

仍为无依赖 Canvas 投影教学模型。气流路线、云雨和过程图形是概念示意，不是实测地形、真实风场或水文预测。

验证命令增加 `node tests/check_scene_processes.cjs`；浏览器流程见 `tests/browser-process-upgrade.js`。既有课程、镜头、音频与两种发布构建仍需一起回归。
