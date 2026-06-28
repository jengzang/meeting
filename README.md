# 绵羊的秘密基地

个人足迹数据可视化项目，将到访记录和交通出行渲染为交互地图、时间线、热力图和多维排行榜。

## 项目结构

```
meeting/
├── index.html              # 主页入口，导航卡片
├── heat.html               # 热力图（GitHub 风格日历 + 月度统计饼图）
├── map.html                # 交互地图（MapLibre GL + 标记 + 交通线）
├── timeline.html           # 时间线视图（按天排列的活动块）
├── leaderboard.html        # 多维排行榜（城市/区县/天气/交通/地理/旅程）
├── forgive.html            # 互动小游戏（躲避"No"按钮）
├── full/                   # 全量数据版（密码保护）
│   ├── map.html            # 地图 + 时间线双视图
│   ├── timeline.html       # 全量时间线
│   └── leaderboard.html    # 全量排行榜
├── css/
│   ├── map.css             # 地图页样式
│   ├── style.css           # 热力图样式
│   ├── intro.css           # 开场绵羊动画
│   ├── sheep.css           # 角落绵羊、过渡动画、粒子
│   ├── loading.css         # 页面加载动画
│   ├── timeline.css        # 时间线样式
│   ├── pw-overlay.css      # 密码弹窗
│   └── leaderboard.css     # 排行榜样式（暗色卡片、排名、热力图）
├── js/
│   ├── init.js             # 共享初始化（loading + intro sheep + 角落绵羊）
│   ├── map-main.js         # 地图核心（标记渲染、控制面板、交通线）
│   ├── map-data.js         # 数据查询/过滤
│   ├── map-source.js       # 13 种底图源 + 自适应中心/缩放
│   ├── timeline.js         # Timeline 类（多通道、紧凑模式、悬浮提示）
│   ├── heatmap.js          # 热力图渲染（日历格、柱状图、饼图）
│   ├── main.js             # 热力图编排（模式/主题切换）
│   ├── leaderboard.js      # 排行榜聚合逻辑（城市/天气/交通/地理/旅程统计）
│   ├── sheep.js            # 绵羊 SVG 库（变体、吉祥物、粒子）
│   ├── loading.js          # 页面过渡加载动画
│   ├── config.js           # 热力图配置
│   ├── utils.js            # 日期工具
│   └── full/               # 全量版专属
│       ├── map-main.js     # 加密数据解密 + 地图渲染
│       ├── auth.js         # 密码验证（PBKDF2 + AES-GCM）
│       └── timeline.js     # 时间线初始化
├── data/                   # 生成的数据文件（ES 模块）
│   ├── records.js          # 活动记录（~2100 条）
│   ├── traffic.js          # 交通段（~1890 条）
│   ├── record_locations.js # 地点信息（城市/区县/街道）
│   ├── record_weather.js   # 天气记录（逐时温度/湿度/风速/能见度/UV/降水）
│   └── full/               # 全量加密数据
│       ├── records.enc.js
│       ├── traffic.enc.js
│       ├── record_locations.enc.js
│       └── record_weather.enc.js
├── scripts/                # 数据管线
│   ├── convert_record.py   # Excel → records.js
│   ├── convert_traffic.py  # Excel → traffic.js
│   ├── convert_full.py     # CSV → 加密 .enc.js
│   └── enrich_records.py   # 补全地点和天气数据
├── raw_data/               # 原始数据（不入库）
├── hash-bust.sh            # 缓存版本号自动更新
└── .github/workflows/      # GitHub Pages 自动部署
```

## 数据管线

```
raw_data/记录_together.xlsx  ──→ convert_record.py ──→ data/records.js
raw_data/交通_together.xlsx  ──→ convert_traffic.py ──→ data/traffic.js
data/records.js              ──→ enrich_records.py ──→ data/record_locations.js
                                                      → data/record_weather.js
raw_data/到访记录.csv        ──→ convert_full.py ────→ data/full/*.enc.js
raw_data/交通.csv
```

**convert_record.py**：读取 Excel，筛选出与 `config.js` 日期范围匹配的记录，输出 ES 模块。

**convert_traffic.py**：读取交通 Excel + `records.js`，将每条交通匹配到记录间隙（时间差 < 24h），填充起止坐标。

**enrich_records.py**：调用地图 API 反查每条记录的地理位置（城市/区县/街道/门牌号），同时获取当地天气数据。

**convert_full.py**：读取全量 CSV，用 AES-256-GCM 加密（PBKDF2-SHA256，120 万次迭代，密码来自 `FULL_MAP_PASSWORD`），输出 base64 加密文件。

## 页面功能

### 主页 (`index.html`)
- 暗色星空背景 + 浮动绵羊剪影
- 导航卡片网格，链接到各可视化页面
- 开场绵羊动画

### 热力图 (`heat.html`)
- GitHub 风格日历，2026-02-16 ~ 2026-06-21
- 两种显示模式：「形状填充」和「颜色深度」
- 6 种颜色主题
- 月度占比柱状图 + 3D 饼图 + 每月迷你饼图
- 悬浮缩放 + 发光效果

### 地图 (`map.html`)
- 13 种底图可选
- 三种标记模式：活动类型 / 地点名称 / 彩色圆点
- 两种尺寸模式：按次数 / 按时长（sqrt 缩放）
- 自动聚合：按缩放级别动态合并邻近点
- 时间范围滑块
- 交通路线叠层：彩色贝塞尔曲线，线宽按累计时长分 5 档，箭头指示方向
- 配色面板（localStorage 持久化）
- 详情弹窗

### 时间线 (`timeline.html`)
- 水平滚动日列 + 垂直时间轴
- 活动块按时间定位，多通道防重叠
- 紧凑模式 + 悬浮提示 + 详情弹窗
- 交通和活动合并显示

### 排行榜 (`leaderboard.html`)
- **城市 tab**：按到访次数/总时长/地点数排名，展开看活动分布和交通统计
- **区县 tab**：同上，粒度到区县
- **天气 tab**：城市/区县切换，最热/最冷/最大风/最多雨/最低能见度/最高UV/最潮湿排行
- **交通 tab**：城市/单段切换，城市模式看各交通方式使用最多的城市，单段模式看最长单次行程（含占 OD 总程百分比）
- **地理 tab**：最北/最南/最东/最西点 + 最远点（距原点 Haversine 距离）+ 经纬跨度
- **旅程 tab**：最早/最晚出发到达（5:00 日界）、最长行程、出发/到达 24 小时热力图、平均行程时长

### 全量版 (`full/`)
- 密码保护（浏览器端 Web Crypto API 解密）
- `map.html`：地图 + 时间线双视图
- `leaderboard.html`：同排行榜，数据更完整
- 交通段按 OD 坐标对合并，连续同类型自动链接

### 小互动 (`forgive.html`)
- 6 个主题场景
- "No"按钮缩小瞬移，"Yes"按钮变大
- 6 次点击后爱心爆发

## 绵羊吉祥物

- 可参数化 SVG 绵羊：变体（眼型/嘴型/绒毛/耳朵/尾巴/腿）、蝴蝶结、帽饰
- 角落吉祥物：右下角浮动，瞳孔跟随鼠标，点击爆发粒子
- 开场动画：弹入 + 身体挤压 + 眨眼 + 耳朵扇动
- 页面过渡：绵羊奔跑加载动画
- 5% 概率稀有变体

## 技术栈

- **前端**：原生 JS ES 模块、零框架
- **地图**：MapLibre GL JS v4
- **数据**：ES 模块导出 JSON
- **加密**：Web Crypto API（AES-256-GCM + PBKDF2-SHA256）
- **样式**：原生 CSS（玻璃态、暗色主题、3D 变换、关键帧动画）
- **管线**：Python 3（openpyxl、cryptography）
- **部署**：GitHub Pages（Actions 自动部署）

## 开发命令

```bash
# 更新数据
python3 scripts/convert_record.py
python3 scripts/convert_traffic.py
python3 scripts/enrich_records.py
FULL_MAP_PASSWORD=xxx python3 scripts/convert_full.py

# 更新缓存版本号
./hash-bust.sh

# 本地预览
python3 -m http.server 3000
# 或
npx serve .
```
