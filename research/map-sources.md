# 地图与教学模型来源说明

获取日期：2026-10-09。此项目是八年级地理教学交互演示。

## 地理边界

- 地图提供方：[阿里云 DataV.GeoAtlas 地理小工具](https://datav.aliyun.com/portal/school/atlas/area_selector)。该页面声明数据来源于[高德开放平台](https://lbs.amap.com/api/webservice/guide/api/district)，所标数据更新时间为 **2021.5**，使用范围说明为“仅供学习交流使用”。本项目保留来源；不将其表述为最新行政区划或可无限制再分发的数据。
- 全国及海岛轮廓：[100000.json](https://geo.datav.aliyun.com/areas_v3/bound/100000.json)，原始副本为 `assets/china-outline.geojson`。
- 省级行政区边界：[100000_full.json](https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json)，原始副本为 `assets/china-provinces.geojson`。
- 省级原始数据含 35 个 Feature：34 个有名省级行政区，以及一个 `100000_JD` 无名附加海上边界要素。只将34个有名要素计为行政区；附加要素用于南海示意插图。
- `geo.js` 从原始坐标生成，保留 Polygon / MultiPolygon 的多部件和孔环，使用轻微简化与小数精度压缩供 Canvas 渲染。数据的 adcode、name、center、centroid 保留来源值，id 转为字符串。行政简称与行政中心为教学补充字段，不是 DataV 原始 properties。
- `geo.js` 不需要远端请求：课程可从本地服务离线加载地图。
- 行政区总数与类型参照[《中华人民共和国行政区划》（中国政府网来源，中央人民政府驻香港特别行政区联络办公室）](https://www.locpg.gov.cn/2022-06/07/c_1211652713.htm)：34个省级行政区，包括23省、5自治区、4直辖市、2特别行政区。源数据包含台湾、香港、澳门。

原始文件 SHA-256：

| 文件 | SHA-256 |
|---|---|
| china-outline.geojson | `83ac502aeac66a5527607ec844169418505d990f1a2dc33226743643541eed3c` |
| china-provinces.geojson | `99adfeded5223848bbe37a0a12f8023e11ee12161c7800521c27db42fdeac275` |

## 不能当作测量或统计数据的内容

- Canvas 采用旋转后的教学平面坐标与立体高差模拟，不是地理测绘投影或 WebGL 三维地球。北方向随视角旋转，图面提供北箭头。
- 高度由解释性的连续函数生成，表达“西高东低”、青藏高原、山地、盆地与平原。**未接入真实 DEM，不能读取实际海拔或用来测量坡度。** 地形起伏支持可控夸张。
- 长江、黄河和秦岭—淮河线使用手工教学折线，仅表现大致流向或分界位置，不是测绘河道。交通网络同样为教学路线，不用于导航或评价真实运输里程。
- 人口、气候、农业、工业、资源、生态图层为基于经纬位置与地形关系的定性示意着色，**不是任何年份的省级统计值**。人口疏密点不代表人口数量，资源标记不代表储量。
- 小地球的高亮轮廓使用同一全国地理数据，网格是经纬线，黄色线标出赤道；用于中国位于东半球、北半球的定位学习。没有将虚构陆地画作世界地图。
- 下方局地沙盘是虚构流域教学模型，不是长江或黄河某一真实河段。植被与侵蚀、沉积、能源和污染指标均为教学关系式，不是科学数值模拟、预测或现实比例。
- 南海插图用于展示源数据包含的海岛与附加边界要素，比例与主图不同。界线经过简化，本演示不能替代经审核的标准地图。

## 每个场景的参数含义

| 场景 API | 0→100 含义 | 可观察变化 |
|---|---|---|
| china | 专题强调程度；地形层为高差强调 | 地形高度、专题着色或人口点大小改变 |
| monsoon | 冬季风→夏季风情景；45–55为转换区 | 海陆气流方向反转；夏季海洋水汽与东部降雨增强 |
| river | 假设植被覆盖率 | 林草增加、侵蚀痕迹变弱、泥沙减少、下游堆积缩小、水色转清 |
| land | 坡地保护与合理利用程度 | 坡地林草、等高梯田增加；平地耕作保留 |
| resources | 假设可再生能源占比 | 风光设备增加、化石能源消耗示意减少；高占比提示储能调节 |
| transport | 0–33公路 / 34–66铁路 / 67–100水运 | 路径、运行速度和运输方式指标切换 |
| ecology | 假设流域修复投入 | 植被恢复、河岸缓冲带增强、排放水色和河水转清 |

所有计算值由 `getState().metrics` 和 `describe()` 提供，单位标明“示意指数”“示意比例”或“示意占比”。植被覆盖是用户设置的假设条件，不是采样结果。

## 接口与无障碍

```js
const scene = new ChinaScene(canvas, {onSelect: province => { /* id,name,abbr,capital,center */ }});
scene.setScene('river');
scene.setOptions({layer:'terrain', parameter:60, labels:true, autoRotate:false, exaggeration:1.3});
scene.getState(); // {scene,options,camera,selected,metrics,description,schematic:true}
scene.reset(); scene.zoom(.1); scene.destroy();
```

拖动旋转，滚轮缩放；方向键旋转，`+` / `-` 缩放，Home复位，L切换标注，`[` / `]` 循环34省区，Enter触发省区选择回调。尊重 `prefers-reduced-motion`；静态全国图不持续请求动画帧，动态场景仅为气流、河流、风机和运输进程更新。

## 本轮渲染验证

- `node --check renderer.js` 与 `geo.js` 通过。
- 使用现有 bundled Playwright / Chromium，未新增 npm 依赖。
- 七个场景在参数0与100的截图数据均不同，且各有3个描述指标。
- 900×610、360×430视口均实际渲染；没有 pageerror。
- DPR=2 下，34个省区的来源 centroid 投影点均命中自身绘制的省区 Path2D。
- 实际鼠标点击新疆回调返回 id `650000` 与“新疆维吾尔自治区”。
- 减少动态效果模式下，七个场景完成一帧后不继续预约动画帧。
- 地图仅是教学示意。上述验证不等于地图审图、教材审定或科学模拟验收。
