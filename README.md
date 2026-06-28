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
│   ├── enrich_records.py   # 补全地点和天气数据
│   └── js_xlsx.py          # records.js ↔ records.xlsx 互转
├── raw_data/               # 原始数据（不入库）
├── requirements.txt        # Python 依赖
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
data/records.js              ←── js_xlsx.py ─────────→ raw_data/回忆碎片.xlsx
```

**convert_record.py**：读取 Excel，筛选出与 `config.js` 日期范围匹配的记录，输出 ES 模块。

**convert_traffic.py**：读取交通 Excel + `records.js`，将每条交通匹配到记录间隙（时间差 < 24h），填充起止坐标。

**enrich_records.py**：读取 `地点.csv` 和 `天气.csv`，按地点名 + 时间范围匹配每条记录的地理位置和天气数据。

**convert_full.py**：读取全量 CSV，用 AES-256-GCM 加密（PBKDF2-SHA256，120 万次迭代，密码来自 `FULL_MAP_PASSWORD`），输出 base64 加密文件。

**js_xlsx.py**：records.js 和 Excel 双向转换工具，方便在 Excel 中批量编辑记录后再导回 JS。

---

## 热力图 (`heat.html`)

### 配置层 (`js/config.js`)

定义热力图的核心数据模型，所有渲染和管线脚本共享此配置：

- **YEAR**：固定年份 2026。
- **START_DATE / END_DATE**：显示范围 `2026-02-16` ~ `2026-06-21`，超出范围的日期在日历上隐藏。
- **SHAPE_INPUT**：按形状分组的日期集——`top`（上半）、`middle`（中间）、`bottom`（下半）、`full`（全满）。每个分组是一个 `"M.D"` 字符串数组，通过 `rangeMD()` 展开连续区间。管线脚本 `convert_record.py` 中有一份完全镜像的 `SHAPE_INPUT_MD` 用于过滤记录。
- **DEPTH_INPUT**：按颜色深度 1~4 分组的日期集。深度越高代表涂色越深。
- **THEMES**：6 套 CSS 变量主题（githubGreen、oceanBlue、cyberCyan、warmOrange、rosePink、violetPurple），每套定义了背景色、面板色、文字色、4 级涂色、形状色、发光色。

### 工具层 (`js/utils.js`)

纯函数日期工具，用于日历格计算：

- **parseDate / formatDate**：`"YYYY-MM-DD"` ↔ `Date` 互转。
- **addDays**：日期加减，处理跨月。
- **getMonday**：取所在周的周一（周日→周一），用于计算日历网格的起始列。
- **getMonthText**：提取 `"M月"` 标签。
- **mdToDateStr**：`"M.D"` → `"YYYY-MM-DD"`。
- **rangeMD**：`"5.28"` ~ `"6.9"` 展开为 `["5.28", "5.29", ..., "6.9"]`。
- **buildWeeks**：从 `startDate` 的周一到最后一个包含 `endDate` 的周日，生成 `[[Date×7], ...]` 二维数组，每列是一个周列。

### 渲染层 (`js/heatmap.js`)

**数据构建**：
- `buildShapeData(SHAPE_INPUT)` → `{ "2026-02-16": "full", "2026-05-05": "top", ... }`，将分组日期拍平为日期→形状的映射。
- `buildDepthData(DEPTH_INPUT)` → `{ "2026-02-16": 4, "2026-05-05": 2, ... }`，日期→深度等级的映射。
- 导出的 `shapeData` 和 `depthData` 作为模块级缓存，只构建一次。

**月度统计 `getMonthStats()`**：
1. 从 `startDate` 所在月的第一天开始，逐月遍历到 `endDate`。
2. 每月只统计 `[actualStart, actualEnd]` 窗口内的实际天数（避免计入首尾月份不完整的部分）。
3. 对每天检查 `paintedData` 中是否有该日期的值，统计 `filled / total` 得到百分比。
4. 返回 `[{ label: "2月", total, filled, percent }, ...]`。

**日历渲染 `renderCalendar()`**：
1. 用 `buildWeeks()` 生成周网格。
2. 第一行是月份标签——每个月份跨多个周列，只在每月第一周的位置显示 `"2月"`, `"3月"` 等标签。
3. 左侧是星期列 `["一", "二", ..., "日"]`。
4. 主体是 `week-grid`：每个 `<div class="cell">` 代表一天。
   - 日期在 `[START_DATE, END_DATE]` 范围外 → `visibility: hidden`。
   - 形状模式：如果该日期在 `shapeData` 中，添加 `.shape-full` / `.shape-top` / `.shape-middle` / `.shape-bottom` 类，CSS 用 `linear-gradient` 实现半格填充效果。
   - 深度模式：如果该日期在 `depthData` 中，添加 `.level-1` ~ `.level-4` 类，对应的 CSS 变量控制颜色深浅。
5. `title` 属性显示日期和填充说明（鼠标悬浮时浏览器原生 tooltip）。

**图例 `renderLegend()`**：
- 形状模式：4 个彩色方框，分别用 CSS gradient 展示全满/上半/中间/下半的视觉效果。
- 深度模式：4 个渐深色块，标注"最浅"~"最深"。

**月度占比柱状图 `renderMonthRatio()`**：用 `monthStats` 渲染每月的水平进度条，显示 `filled/total · XX%`。

**总构成饼图 `renderTotalPie()`**：
1. 过滤掉 `filled === 0` 的月份。
2. 用 CSS `conic-gradient` 实现 3D 饼图——`conic-gradient(color1 startDeg endDeg, color2 ...)`，每段的弧度为 `(filled / totalFilled) * 360`。
3. 右侧图例列出每月颜色 + 天数 + 百分比。

**每月占比饼图 `renderMonthlyPies()`**：每张饼图是 `conic-gradient(var(--level-4) 0deg filledDeg, var(--empty) filledDeg 360deg)`，直观显示各月涂色比例。

### 编排层 (`js/main.js`)

维护状态 `currentMode`（shape/depth）和 `currentTheme`（主题名）。

- **`applyTheme()`**：将选中主题的所有 CSS 变量写入 `document.documentElement.style`，全局生效。
- **`renderAll()`**：串联调用 `renderCalendar → renderLegend → renderMonthRatio → renderTotalPie → renderMonthlyPies`。
- 监听模式下拉框和主题下拉框的变化事件，变化时 `applyTheme` + `renderAll`。

---

## 交互地图 (`map.html`)

### 底图源 (`js/map-source.js`)

**13 种底图源配置 `MAP_STYLE_CONFIG_DATA`**：
- **天地图**（矢量/卫星）：自定义 WMTS 瓦片 URL，需要 tk 参数。
- **高德地图**（矢量/卫星）：自定义瓦片 URL。
- **MapTiler（4 种）**：街道图、基础图、地形图、经典街道——使用 MapTiler 托管样式 JSON，通过 API key 鉴权。
- **ArcGIS（4 种）**：街道图、灰底图、暗黑图、自然地理、卫星图——直接加载栅格瓦片。
- **OpenTopoMap / OpenCycle**：开源地形图，栅格瓦片。
- **Stadia Maps**：托管样式 JSON，无需 API key。

**`mapStyle(name)`**：
- 托管样式源（maptile/stadia）：直接返回样式 JSON 的 URL，MapLibre 自动加载。
- 自定义瓦片源：构造 `{ version: 8, sources: { raster: { tiles } }, layers: [{ raster }] }` 的 style 对象。

**`calculateDenseMapCenterAndZoom(coords)`**：
1. 对经纬度数组分别取 85% 分位数范围（排除最外层 7.5% 的离群点），避免一两个偏远点撑大视野。
2. 取分位范围的中点作为地图中心。
3. 根据经纬跨度（换算为米）计算合适的缩放级别：`zoom = log2(EARTH_CIRCUMFERENCE / (maxSpanMeters * 1.5))`，保证所有点可见且留有余量。

### 数据层 (`js/map-data.js`)

- **`getUniqueTypes()`**：从 records 提取去重活动类型列表（颜色配置面板使用）。
- **`filterByDateRange(recordsList, startDate, endDate)`**：按日期范围过滤记录（时间轴滑块使用）。
- **`getDateExtent(recordsList)`**：返回记录的最早和最晚日期 `[min, max]`。
- **`getTypeStats()`**：按活动类型统计次数，用于数据概览。

### 地图核心 (`js/map-main.js`)

#### 状态管理
所有可持久化的 UI 状态通过 `localStorage` 存储：底图样式、标记模式、尺寸模式、配色方案、自动聚合开关、热力图密度/半径。页面刷新后自动恢复。

#### 地图初始化
1. 创建 `maplibregl.Map`，默认中心 `[113.26, 23.13]`，缩放 8。
2. `map.on("load")` 中初始化交通图层、热力图图层、时间轴、首次渲染标记。
3. 添加导航控件（缩放/旋转）。

#### 时间范围滑块
- 用 records 的日期范围初始化滑块的 `[min, max]`。
- 两个可拖动的 thumb（from/to），实时显示选中区间。
- `dateToPct(date)`：日期在总范围中的百分比位置 = `(date - min) / (max - min) * 100`。
- `pctToDate(pct)`：从百分比位置反推日期。
- 拖拽时实时更新 CSS `left` 和 `width`，松手后 `applyTimelineFilter()` 过滤记录并重绘标记。
- 点击轨道空白区域自动吸附到更近的 thumb。

#### DOM 标记渲染 `renderMarkers()`

1. 按日期范围过滤 `baseRecords` → `currentRecords`。
2. **自动聚合**（可选）：当缩放级别较小时，计算 `clusterGridDeg`——目标像素距离换算为经纬度格网精度。所有记录按 `(gridLng, gridLat)` 分桶，同一格网内的记录合并为一个标记。
3. **等坐标去重**：活动模式下同一坐标的不同活动类型分不同标记；非活动模式下只按坐标分组合并。相同坐标的多个标记用 golden-angle （≈ 137.5°）螺旋偏移分散。
4. **尺寸缩放**：
   - 按次数模式：`log1p(次数-1)` 取对数避免极端值，再 `sqrtScale` 映射到 `[0, maxScale]`。
   - 按时长模式：同理，但用记录总时长作为原始值。
   - `sqrtScale` 将值线性映射到 `[0, maxScale]` 范围。
5. **三种标记模式**：
   - **活动类型**：显示主导活动名（按时长加权），字体大小随 scale 增大，带黑色文字描边。
   - **地点名称**：显示地点名（超过5字截断加省略号）。
   - **彩色圆点**：纯色圆，大小随 scale 变化。次数模式下多记录圆点内显示数字。
6. 标记颜色优先读 `localStorage` 中用户自定义配色，否则用 `DEFAULT_COLOR_MAP`，都不匹配的用 `FALLBACK_PALETTE`。
7. 点击标记弹出详情面板（见下文）。

#### 交通路线渲染 `renderTraffic()`

1. 先按时间轴日期范围过滤交通段。
2. 按 OD 坐标对分组：`(origin_lat, origin_lng) → (dest_lat, dest_lng)` 相同的合并到同一组。
3. 每组 OD 按 `from_time` 排序，然后**合并连续同类型段**（同一 OD 对、相同交通方式、时间相邻的段合并时长）。
4. **5 档线宽**：按每 OD 对的总时长排序，取 20/40/60/80 分位数作为分档阈值，总时长落在对应分位的 OD 对分配 1/2/3/4.5/6px 的线宽。
5. **贝塞尔曲线** `buildArc(lng1, lat1, lng2, lat2, 20)`：
   - 控制点 = OD 中点 + 垂直于连线方向偏移 `dist * 0.3`。
   - 用二次贝塞尔公式 `(1-t)² * P0 + 2(1-t)t * P1 + t² * P2`，`t = 0..1` 分 20 段，生成 LineString 坐标数组。
6. **多段拆分**：同一 OD 对的不同交通类型共享同一弧线。按各类型的时长占比，从弧线上切出对应比例的坐标段。
7. 每条 LineString 作为 GeoJSON Feature 写入 `traffic-source`。
8. **三层渲染**（MapLibre layer）：阴影层（黑色加宽 + 模糊），彩色线层（按交通类型颜色，带透明度），箭头符号层（每 80px 放置一个预渲染的白色箭头 icon，方向沿线）。

#### 热力图覆盖 `renderHeatmap()`

1. 不在选中模式时：每条记录作为一个等权点 `{ weight: 1 }`。
2. 在选中模式时：记录按 `0.0005°` 格网分桶，每桶 weight = `log1p(次数或总时长) * 10`（对数压缩防止热点过爆）。
3. 用 MapLibre `heatmap` 图层渲染，颜色从透明蓝渐变到红（12 级色标），半径和强度随缩放级别变化，用 `hmIntensityMul` 和 `hmRadiusMul` 参数可调。

#### 详情弹窗

点击标记弹出右侧详情面板：

- **单条记录**：显示活动类型徽章（配色背景色）、时间、时长、备注、精确地址（国家旗 + 省/市/区/街/门牌号）、逐时天气条（含天气图标、温度、体感温度、风向风速、湿度、能见度、UV、降水）。
- **多条记录（聚合标记）**：列表展示每条记录的活动和精确时间。多天跨度的记录区分日期后再展示。统计累计次数和总时长。去重合并多地点的地址和天气。
- **交通标记**：显示起终点、总时长，按交通类型分色展示各段详情。

#### 颜色配置面板

- 打开后在侧边弹出配置卡片，列出所有活动类型及其当前颜色（color input）。
- 修改颜色后实时保存到 `localStorage` 并重绘标记。
- 热力图密度和半径用 range slider 调节，同样实时生效且持久化。
- 支持一键重置配色。

---

## 时间线 (`timeline.html`)

### 数据适配 (`timeline.js`)

**`recordsToTimeline(records)`**：将原始记录转为时间线数据格式，包括 `id`、`date`、`startTime`（HH:MM）、`endTime`、`title`（活动类型）、`subtitle`（地点）、`color`（活动颜色映射）。

**`trafficToTimeline(traffic)`**：同理，`subtitle` 为起终点，颜色按交通类型映射。

### Timeline 类

#### 数据索引 `_buildIndex()`

1. 将 records 和 traffic 合并为统一 items 列表。
2. 对每条 item，检测是否需要**跨日拆分**：
   - 直接读取 `_raw` 对象中的 `arrival` / `departure`（或 traffic 的 `from_time` / `to_time`）提取真实日期范围 `[realStart, realEnd]`。
   - 如果 `realStart !== realEnd`：每天生成一个 part，继承原 item 属性，只有首部分的 startTime 保留原始值、尾部分的 endTime 保留原始值，中间部分为 `00:00 ~ 24:00`。
   - 如果同天但时间是跨零点（如 `23:00 ~ 01:00`），拆成 `23:00~24:00` + `00:00~01:00` 两部分，分配到相邻两天。
3. 按 `[date, startTime]` 排序，构建 `recordsByDate: Map<date, items[]>`。

#### 通道计算 `_computeLanes()`

贪心分配算法——每条 item 按时间顺序放入第一个空闲通道（该通道上一条已结束的时间 ≤ 当前 item 的开始时间）。如果没有空闲通道则新增一行。

两轮遍历：第一轮分配通道号，第二轮将每天的 `maxLanes` 写入同天所有 item，用于等分列宽。

#### 渲染 `render()`

1. **紧凑模式**：`colWidth = 12px`（极窄日列），`hourHeight = viewportHeight * 0.88 / 24`（让 24 小时适配一屏高度）。
2. **头部行**（sticky top）：日期头 `"4月14日\n周六"`，与内容日列等宽对齐，共享水平滚动。
3. **时间轴**：左侧固定 52px 宽的 `"00:00"` ~ `"24:00"` 小时标注。
4. **日列画布**：每列宽度 = `colWidth`，内部用 CSS `repeating-linear-gradient` 画小时网格线。
5. **活动块定位**：
   - `top = (startMin / 60) * hourHeight`：分钟转像素。
   - `height = max(durationMin / 60 * hourHeight, minDurationPx)`：至少 20px 保证可见性。
   - `left = laneIndex * laneWidth + 1`：通道内左移。
   - `width = laneWidth - 2`：留 2px 间距。
6. **非紧凑模式**：块内显示活动名称和时间标签，时间标签仅在 height > 24px 时显示（避免截断）。

#### 悬浮提示（Tooltip）

事件委托在画布上监听 `mouseover/mousemove/mouseout`：

- 进入块时动态创建提示 div，显示活动分类徽章、标题、副标题、时间范围。
- 位置跟随鼠标，自动避让屏幕边缘（超出右边界则翻到左侧，超出底边则翻到上方）。
- 离开块时隐藏。

#### 点击交互

如果传入 `onBlockClick` 回调，点击时间块时触发，传入原始数据和事件对象。

---

## 排行榜 (`leaderboard.html`)

### 聚合引擎 (`js/leaderboard.js`)

#### 城市统计 `buildCityStats(records, locations, weather, traffic)`

1. 遍历 records，通过 `locations[recordId]` 查找城市。每个城市聚合同城的所有记录、地点集合（Set 去重）、活动类型计数。
2. 每到一个城市的记录，从 `weather[recordId]` 中提取逐时天气条目并附加年份到时间字段，汇集到该城市的 `weatherEntries` 数组。
3. **交通归属**：调用 `mergeTrafficByOD()` 合并同一 OD 对的交通段，然后对每条合并段用 `resolveTrafficCity()` 确定起终点城市：
   - 优先查该段关联记录的 `record_locations` 信息。
   - 回退到最近邻查找：遍历所有已知点记录，用欧氏距离找最近的，取该点的城市/区县。
4. 每个城市计算：
   - **活动维度**：到访次数、总时长（小时）、地点数、活动类型数、首次/末次到访日期、活动分布（按次数降序）。
   - **交通维度**（`trafficBreakdown`）：每种交通方式的次数、天数、总时长、最长单段、平均时长、单日最长。
   - **天气维度**（`weather`）：温度（最低/最高/平均，带体感）、湿度（最低/最高/平均）、降水（总和/单次最大/平均）、风速（最小/最大/平均）、能见度（最低/最高/平均）、紫外线（最低/最高/平均）、天气类型频次、天气数据的时间范围。

#### 区县统计 `buildDistrictStats()`

逻辑与城市统计完全对称，但 key 为 `"城市//区县"` 格式（无区县时退化为 `"城市"`），使同一城市的各区县可分别排名。

#### 交通合并 `mergeTrafficByOD()`

1. 按 `(origin_lat, origin_lng) → (dest_lat, dest_lng)` 分桶。
2. 每桶内按 `from_time` 排序。
3. 合并连续同类型段：如果相邻段类型相同，累加时长、扩展 `to_time`。
4. 为每段附加 `_odTotalSec`（该 OD 对的总时长），用于排行榜中计算单段占 OD 的百分比。

#### 排名辅助

- **`rankBy(stats, field, n)`**：按 `field` 降序取前 n 名。`field` 支持点号路径（如 `"weather.tempMax"`），通过 `resolveField()` 逐级取值。过滤掉 null/NaN。
- **`rankByAsc(stats, field, n)`**：同上但升序（用于"最低温度"等反向排序）。

#### 天气排名 `buildWeatherRankings()`

从 cityStats 或 districtStats 中生成 9 个维度的 Top 10：

| 排名 | 字段 | 排序 |
|------|------|------|
| 最热 | `weather.tempMax` | 降序 |
| 最冷 | `weather.tempMin` | 升序 |
| 最高体感 | `weather.feelsLikeMax` | 降序 |
| 最大风速 | `weather.windMaxKmh` | 降序 |
| 累计降雨 | `weather.precipTotalMm` | 降序 |
| 单次最大降雨 | `weather.precipMaxMm` | 降序 |
| 最低能见度 | `weather.visibilityMinM` | 升序 |
| 最高紫外线 | `weather.uvMax` | 降序 |
| 最潮湿 | `weather.humidityAvg` | 降序 |

#### 交通排名

- **城市模式 `buildTrafficRankings(cityStats)`**：按交通类型分组，每个类型下各城市按使用次数降序排列。
- **单段模式 `buildTrafficSegmentRankings(traffic, locations, records)`**：按交通类型分组，每个类型下按单段时长降序，附带 `odPct`（该段占 OD 总程的比例）。

#### 地理极值 `buildGeoExtremes(records, locations)`

1. 遍历所有记录，找经度最西/最东、纬度最南/最北的点。
2. 以东莞家（`22.813, 113.589`）为原点，用 **Haversine 公式**计算每条记录到原点的球面距离，取最大值。
3. `haversineKm(lat1, lng1, lat2, lng2)`：`a = sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlng/2)`，`d = 2R·atan2(√a, √(1-a))`，R=6371km。
4. 同时计算经纬跨度（最北-最南、最东-最西）。

#### 旅程统计 `buildJourneyStats(traffic, locations, records)`

1. 用 `mergeTrafficByOD()` 合并交通段。
2. **5:00 日界**：将时间重新映射到以 5:00 为起点的分钟数（`minSince5am = (hour*60 + minute - 300 + 1440) % 1440`），因为行程通常不跨越凌晨 5 点。
3. 找最早/最晚出发、最早/最晚到达、最长行程（按单段时长）。
4. **24 小时分布热力图**：将出发和到达时间分别按小时分桶（`hourBucket5`），24 个桶对应 `05:00, 06:00, ..., 04:00`，统计每桶的交通次数。前端渲染为柱状热力图。
5. 计算平均行程时长 = `totalDurSec / durCount / 60`（分钟）。

### 前端渲染 (`leaderboard.html`)

页面初始化时调用所有聚合函数，生成 `cityStats`, `districtStats`, `weatherRankings`, `trafficRankings` 等数据，然后根据当前 tab 动态渲染。

#### Tab 切换
6 个 tab：「城市」「区县」「天气」「交通」「地理」「旅程」。切换时重绘 `mainContent`。

#### 城市/区县 Tab
- 可排序表格：点击表头切换排序字段和升降序。
- 每行可展开详情：**活动分布**（横向柱状图，宽度按占比缩放）、**交通方式**（彩色标签 + 次数/时长/每天统计）、**天气概况**（温度/体感/湿度/降水/风速/能见度/UV 的 min/max/avg，天气类型频次，日期范围）。

#### 天气 Tab
- 城市/区县切换按钮。
- 9 个排名卡片网格，每个卡片列出 Top 10，含排名圆点（金银铜）和指标值。

#### 交通 Tab
- 城市/单段切换按钮。
- 按交通类型分卡片，城市模式显示各城市的次数和时长统计，单段模式显示最长行程的起终点、时长、占 OD 比例。

#### 地理 Tab
- 6 张极值卡片和一张跨度卡片，每张显示图标、类型、地点名、城市/区县/省份、精确坐标、日期。最远点额外显示距原点的公里数。

#### 旅程 Tab
- 顶部摘要：平均行程时长。
- 出发/到达 24 小时分布柱状热力图（从 5:00 起算）。
- 极值列表：最早/最晚出发、最早/最晚到达、最长行程的详细信息（交通方式、起终点、时间范围、时长）。

---

## 绵羊吉祥物系统 (`js/sheep.js`)

### SVG 生成器 `sheepSVG(viewBox, bodyCX, bodyCY, bodyR, headCX, headCY, headRX, headRY, config)`

用纯 SVG 参数化绘制一只绵羊。可配置项：

- **`eyeShape`**：`'round'`（圆形眼 + 瞳孔 + 高光） / `'happy'`（弧形眯眼） / `'sleepy'`（横向椭圆半闭眼）。
- **`mouth`**：`'smile'`（弧线） / `'open'`（椭圆张开的嘴） / `'none'`。
- **`fluffExtra`**：是否额外增加身体绒毛圈（默认 11 圈，开启后 14 圈），使绵羊更蓬松。
- **`earFlop`**：耳朵是否下垂。站立时耳朵向上旋转约 32°，下垂时旋转约 55° 且移除耳廓内部渐变。
- **`tailUp`**：尾巴上翘。
- **`legPose`**：`'stand'`（四条腿直立） / `'walk'`（前腿前倾、后腿后倾，模拟行走）。
- **`accessory`**：`'bow'`（粉色蝴蝶结，左侧耳上） / `'hat'`（蓝色礼帽）。
- **`tilt`**：头部倾斜角度（-4° ~ 15°），不同的绵羊有不同的神态。

SVG 结构（从背景到前景）：身体绒毛云团 → 尾巴 → 耳朵（在 head group 中） → 头部 + 眼睛 + 腮红 + 鼻子 + 嘴巴 → 腿 + 脚蹄。每只绵羊生成的 SVG 使用独立 `_uid` 保证渐变 ID 不冲突。

### 绵羊变体

- **STANDARD**：标准站立，眯眼微笑，蓬松绒毛。
- **HAPPY**：弧形眯眼，头微左倾 -4°。
- **WALKING**：行走姿态，头微右倾 5°。
- **SLEEPY**：半闭眼，耳朵下垂，闭嘴。
- **BABY**：小尺寸（viewBox 36×40），圆脸，张嘴。
- **CURIOUS**：头大幅右倾 15°，尾巴上翘，张嘴。
- **BOW_SHEEP**：标准体 + 粉色蝴蝶结。
- **HAT_SHEEP**：标准体 + 蓝色礼帽。

前 6 种作为常规变体池，后 2 种戴配饰的为稀有变体（概率 5%）。

### 角落吉祥物 `initCornerSheep()`

右下角的浮动绵羊：

1. 初始随机选择一个变体渲染。
2. **瞳孔跟随**：全局 `mousemove` 监听，计算鼠标相对于角落绵羊中心的位置，将瞳孔偏移限制在 5px 以内。
3. **悬浮气泡**：鼠标移入时随机显示一条"咩~""你好呀！"等文字。
4. **单击**：爆发粒子效果（`burstSheep`），同时随机切换到新变体 + 抖动动画。
5. **双击**（两次单击间隔 < 400ms）：触发爱心形爆发（`heartBurstSheep`）。
6. **定时自变**：每 8~20 秒随机决定是否自动切换变体和抖动（30% 概率）。

### 粒子爆发

**`burstSheep(sourceEl, opts)`**：
- **绵羊弹射**：从触发点向四周发射 8 只绵羊缩小版。每只弹射分两段轨迹（先用 CSS `@keyframes` 的 `--bx/--bx` → `--ex/--ey` 自定义属性），搭配旋转和缩放。动画结束后自动销毁 DOM。
- **星光粒子**：同时发射 6 个随机 SVG（星形/圆形/菱形/雪花），同样两段轨迹。
- **爱心模式**：用参数方程 `x = 16sin³(t), y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)` 排列出发角度，形成心形轮廓。

### 页面过渡 `initTransitions()`

拦截所有 `a.nav-link` / `a.nav-card` / `a.corner-home` 链接的点击：

1. 阻止默认跳转。
2. 页面中央创建一个运行绵羊（随机行走变体），CSS 动画从左侧奔跑到屏幕中央。
3. 动画结束时销毁绵羊，设置 `sessionStorage` 标记，然后执行 `window.location.href` 跳转。

目标页面检测到此标记则显示"小羊奔跑中"的加载画面（loading dots 动画），营造跨页面绵羊奔跑的连续感。

### 其他 SVG 预设
- `LOADING_SHEEP_SVG`：120×132 大尺寸绵羊，用于加载画面。
- `MEDIUM_SHEEP_SVG`、`SMALL_SHEEP_SVG`、`MINI_SHEEP_SVG`：不同尺寸，用于各种内嵌场景。
- `EMPTY_SHEEP_SVG`：歪头闭嘴绵羊，用于空状态。

---

## 共享初始化 (`js/init.js`)

- **页面加载动画**：检查 `sessionStorage.__sheep_nav_loading` 标记。如果标记存在，显示中间的大绵羊和"小羊奔跑中..."文字（dots 每 400ms 循环 `.`、`..`、`...`，模拟加载感）。如果没有标记则立即隐藏。
- **开场绵羊 `initIntroSheep()`**：页面打开后弹入一只大绵羊 + 星光粒子，持续 2 秒后自动淡出（可点击提前关闭）。暴露为 `window.showIntroSheep(msg, duration)` 供其他页面复用（如地图页的"坐等绵羊整理照片"功能按钮）。
- **`initAll()`**：一站式初始化——开场绵羊 → 角落绵羊 → 页面过渡监听 → 完成加载。

---

## 小互动 (`forgive.html`)

- 6 个主题场景，每个场景有一道选择题或互动。
- "No"按钮在 hover 时缩小并瞬移到随机位置（无法点击），"Yes"按钮逐渐变大。
- 累计点击 6 次"Yes"后触发爱心爆发动画（复用 `heartBurstSheep`）。

---

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
# 初始化虚拟环境并安装依赖
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 更新数据
python3 scripts/convert_record.py
python3 scripts/convert_traffic.py
python3 scripts/enrich_records.py
FULL_MAP_PASSWORD=xxx python3 scripts/convert_full.py

# records.js ↔ Excel 互转
python3 scripts/js_xlsx.py js2xlsx data/records.js raw_data/回忆碎片.xlsx
python3 scripts/js_xlsx.py xlsx2js raw_data/回忆碎片.xlsx data/records.js

# 更新缓存版本号
./hash-bust.sh

# 本地预览
python3 -m http.server 3000
# 或
npx serve .
```
