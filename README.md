# 绵羊的秘密基地

个人足迹数据可视化项目，将到访记录和交通出行渲染为热力图、交互地图和时间线。

## 项目结构

```
meeting/
├── index.html              # 主页入口，导航卡片
├── heat.html               # 热力图（GitHub 风格日历 + 月度统计饼图）
├── map.html                # 交互地图（MapLibre GL + 标记 + 交通线）
├── timeline.html           # 时间线视图（按天排列的活动块）
├── forgive.html            # 互动小游戏（躲避"No"按钮）
├── full/                   # 全量数据版（密码保护，含全部记录）
│   └── map.html            # 地图 + 时间线双视图
├── css/
│   ├── map.css             # 地图页样式（控制面板、标记、弹窗）
│   ├── style.css           # 热力图样式（日历格、饼图、主题色）
│   ├── intro.css           # 开场绵羊动画
│   ├── sheep.css           # 角落绵羊、过渡动画、粒子爆发
│   ├── loading.css         # 页面加载动画（关键 CSS，内联到各 HTML）
│   ├── timeline.css        # 时间线样式（full 版专用）
│   └── pw-overlay.css      # 密码弹窗（full 版专用）
├── js/
│   ├── init.js             # 共享初始化（loading overlay + intro sheep + 角落绵羊）
│   ├── map-main.js         # 地图核心（标记渲染、控制面板、交通线）
│   ├── map-data.js         # 数据查询/过滤（日期范围、类型统计）
│   ├── map-source.js       # 13 种底图源 + 自适应中心/缩放
│   ├── timeline.js         # Timeline 类（多通道活动块、紧凑模式、悬浮提示）
│   ├── heatmap.js          # 热力图渲染（日历格、图例、柱状图、饼图）
│   ├── main.js             # 热力图编排（模式/主题切换）
│   ├── sheep.js            # 绵羊 SVG 库（8 种变体、角落吉祥物、粒子爆发）
│   ├── loading.js          # 页面过渡加载动画控制
│   ├── config.js           # 热力图配置（日期填充、颜色主题）
│   ├── utils.js            # 日期工具函数
│   └── full/               # 全量版专属 JS
│       ├── map-main.js     # 加密数据解密 + 地图渲染
│       ├── auth.js         # 密码验证流程（PBKDF2 + AES-GCM）
│       └── timeline.js     # 时间线视图初始化
├── data/                   # 生成的数据文件（ES 模块）
│   ├── records.js          # 活动记录（~2100 条，筛选到热力图日期范围）
│   ├── traffic.js          # 交通段（~1890 条，与活动记录关联）
│   └── full/               # 全量加密数据
│       ├── records.enc.js  # AES-256-GCM 加密的全部记录
│       └── traffic.enc.js  # AES-256-GCM 加密的全部交通
├── scripts/                # 数据管线脚本
│   ├── convert_record.py   # Excel → records.js
│   ├── convert_traffic.py  # Excel → traffic.js（与记录间隙匹配）
│   └── convert_full.py     # CSV → 加密的 .enc.js（全量数据）
├── raw_data/               # 原始数据（不纳入版本控制）
├── hash-bust.sh            # 自动更新 HTML 中的缓存版本号
└── .github/workflows/      # GitHub Pages 自动部署
```

## 数据管线

```
raw_data/记录_together.xlsx  ──→ convert_record.py ──→ data/records.js
raw_data/交通_together.xlsx  ──→ convert_traffic.py ──→ data/traffic.js
raw_data/到访记录.csv        ──→ convert_full.py ────→ data/full/records.enc.js
raw_data/交通.csv            ──→ convert_full.py ────→ data/full/traffic.enc.js
```

**convert_record.py**：读取 Excel，筛选出与 `config.js` 中 `SHAPE_INPUT` 日期匹配的记录，输出为 ES 模块。

**convert_traffic.py**：读取交通 Excel + `data/records.js`，将每条交通匹配到两条活动记录之间的"间隙"（到达-离开时间差 < 24h），自动填充起止坐标。

**convert_full.py**：读取全量 CSV，用 AES-256-GCM 加密（PBKDF2-SHA256，120 万次迭代，密码来自环境变量 `FULL_MAP_PASSWORD`），输出 base64 编码的加密文件。

## 页面功能

### 主页 (`index.html`)
- 暗色星空背景 + 浮动绵羊剪影
- 2x2 导航卡片网格，链接到四个可视化页面
- 开场绵羊动画（弹入 + 眨眼 + 耳朵扇动）

### 热力图 (`heat.html`)
- **GitHub 风格日历**，2026-02-16 ~ 2026-06-21
- 两种显示模式：「形状填充」（全/上/中/下）和「颜色深度」（1-4 级）
- 6 种颜色主题：GitHub 绿、海洋蓝、赛博青、暖橙、玫瑰粉、紫罗兰
- **月度占比柱状图**（每月填充天数/总天数）
- **总构成 3D 饼图**（各月占比立体效果）
- **每月迷你饼图**网格
- 悬浮缩放动画 + 发光效果

### 地图 (`map.html`)
- **13 种底图**可选（天地图/高德矢量与卫星、MapTiler、Stadia Maps、ArcGIS、OpenTopoMap 等）
- **三种标记模式**：活动类型 / 地点名称 / 彩色圆点
- **两种尺寸模式**：按到访次数 / 按停留时长（sqrt 缩放）
- **自动聚合**：根据缩放级别动态合并邻近点
- **时间范围滑块**：双拇指拖拽过滤日期
- **交通路线叠层**：彩色贝塞尔曲线，线宽按累计时长分 5 档，箭头指示方向
- **配色面板**：每种活动类型独立颜色选择器（localStorage 持久化）
- **详情弹窗**：点击标记看活动详情，点击交通线看交通详情

### 时间线 (`timeline.html`)
- 水平滚动日列 + 垂直时间轴（00:00-24:00）
- 活动块按时间定位，颜色按类别区分
- **多通道算法**：同一天重叠活动自动分配独立通道
- **紧凑模式**：所有块缩成细条，鼠标悬浮放大
- **悬浮提示**：类别标签 + 标题 + 副标题 + 时间
- **详情弹窗**：完整信息（日期、时间、地点、备注/起止点、耗时）
- 活动记录和交通数据合并显示
- 自动滚动到今日列

### 全量地图 (`full/map.html`)
- 密码保护（浏览器端 Web Crypto API 解密）
- 双视图切换：`#map`（地图）和 `#timeline`（时间线）
- 展示未筛选的全部记录

### 小互动 (`forgive.html`)
- 6 个主题场景（吃、睡、玩、想、碰、不理）
- "No"按钮会缩小并瞬移，"Yes"按钮会变大
- 6 次点击后触发爱心爆发庆祝动画
- 粉色玻璃态 UI + 浮动爱心背景

## 绵羊吉祥物

项目围绕一个可参数化的 SVG 绵羊系统：
- **变体**：倾斜/圆眼/睡眼/嘴型/绒毛/耳朵/尾巴/腿部姿态，支持蝴蝶结和帽饰
- **角落吉祥物**：右下角浮动，鼠标悬浮显示随机提示语，瞳孔跟随鼠标
- **开场动画**：弹入 + 身体挤压拉伸 + 眨眼 + 耳朵扇动 + 腿踢 + 尾巴摇
- **粒子爆发**：单击散落绵羊 + 星星粒子，双击爱心爆发
- **页面过渡**：绵羊横向跑过屏幕的加载动画
- **稀有变体**：5% 概率出现蝴蝶结绵羊或帽饰绵羊

## 技术栈

- **前端渲染**：原生 JavaScript ES 模块、零框架
- **地图**：MapLibre GL JS v4（WebGL 渲染）
- **数据格式**：ES 模块导出 JSON 数组
- **加密**：Web Crypto API（AES-256-GCM + PBKDF2-SHA256）
- **样式**：原生 CSS（玻璃态、3D 饼图、关键帧动画）
- **管线**：Python 3（openpyxl、cryptography）
- **部署**：GitHub Pages（Actions 自动部署）

## 开发命令

```bash
# 更新数据（修改 raw_data 中的 Excel/CSV 后）
python3 scripts/convert_record.py
python3 scripts/convert_traffic.py
FULL_MAP_PASSWORD=xxx python3 scripts/convert_full.py

# 更新缓存版本号（部署前）
./hash-bust.sh

# 本地预览
## python(方法一)
python3 -m http.server 3000
## node.js（方法二）
npx serve .
```
