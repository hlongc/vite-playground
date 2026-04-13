# SearchForm V2 源码导读

这份文档的目标不是重复代码，而是把 `SearchFormV2` 和 `FieldGridV2` 的核心运行机制拆开讲清楚，方便后续维护时先建立整体模型，再回头读源码。

## 1. 先看整体角色分工

这个调试项目里，`SearchFormV2` 并不是一个单文件组件，而是由几层职责拼起来的：

- `search-form-v2/SearchForm.tsx`
  负责表单行为本身，包括查询、重置、自动搜索、字段折叠、字段设置、ref 暴露等。
- `field-grid-v2/useFieldGrid.tsx`
  负责布局算法，把普通的表单项配置转换成带网格坐标的渲染数据。
- `field-grid-v2/FieldGrid.tsx`
  负责调用 `useFieldGrid` 并输出真正的 grid 结构。
- `search-form-v2/SettingPanel.tsx`
  负责字段显隐设置的 UI。
- `search-form-v2/utils/indexedDB.ts`
  负责把字段显隐配置持久化到浏览器 IndexedDB。
- `search-form-v2/utils/index.ts`
  目前主要提供 `trimStringField`，在提交查询时统一清理字符串首尾空格。

可以把整个组件理解成这样一条主链路：

`items` 配置
-> 如果开启 setting，则先合并字段显隐状态
-> 交给 `FieldGridV2` 算布局
-> `SearchFormV2` 根据布局结果判断哪些字段在折叠时需要隐藏
-> antd `Form` 负责值管理、提交和重置
-> 如果开启字段设置，则通过 IndexedDB 记住用户的显隐偏好

## 2. 组件对外到底提供了什么

对外最重要的是 `SearchFormProps` 和 `SearchFormRef`，文件在：

- `search-form-v2/interface.ts`
- `field-grid-v2/interface.ts`

从使用角度看，最关键的输入是：

- `items`
  描述每个表单项长什么样、用什么 label、占几列、是否自定义 render。
- `onSearch`
  最终查询出口，所有点击查询、自动搜索、本地 ref 调用，最后都会汇总到这里。
- `requiredFields`
  用来定义“哪些字段满足后才允许查询”。
- `autoSearch`
  打开后，组件会在“满足允许查询的条件时”自动发起查询。
- `searchTrigger`
  决定是走 submit 模式，还是走 onChange 自动查询模式。
- `setting`
  打开后，用户可以控制某些字段是否显示，并把选择持久化。
- `minRows`
  控制折叠状态下保留几行。

从 ref 角度看，对外暴露的是：

- `search()`
- `reset()`
- `setPartialFieldsValue()`
- `setFields()`
- `getFieldsValue()`

这些 ref 方法不是另起一套逻辑，而是尽量复用组件内部已有行为，保证“按钮触发”和“外部代码触发”的表现一致。

## 3. 先理解 `items`，这是所有逻辑的起点

`SearchFormV2` 接收到的 `items` 本质上是一组扩展版 `Form.Item` 配置。

和普通 antd `Form.Item` 相比，这里额外加了几种布局相关能力：

- `value`
  直接传一个表单控件，内部会自动包进 `Form.Item`。
- `render`
  如果你想完全自己控制某个格子的渲染，可以用它覆盖默认逻辑。
- `colSpan`
  控制横向跨几列，支持数字，也支持 `'max'` 表示整行占满。
- `colStart`
  显式指定从哪条竖向栅格线开始。
- `colEnd`
  显式指定到哪条竖向栅格线结束。
- `renderable`
  控制这个 item 是否参与渲染。
- `hidden`
  控制这个 item 是否隐藏。

需要区分两个概念：

- `renderable=false`
  表示这个字段根本不进入布局系统。
- `hidden=true`
  表示字段仍然在布局算法里“留痕”，但最终视觉上被隐藏。

后面字段设置、折叠判断都会依赖这种区分。

## 4. `FieldGridV2` 到底解决了什么问题

很多人第一次看这套代码会觉得，为什么不直接在 `SearchForm.tsx` 里 map `items` 渲染 `Form.Item`，还要多一层 `FieldGridV2`。

原因是 `SearchFormV2` 不只是“把字段摆出来”，它还要同时支持：

- 容器宽度变化时自动决定一行能放几列
- 支持跨列
- 支持整行占满
- 支持自定义起止栅格线
- 支持后续折叠逻辑依赖“这个字段在第几行”
- 支持按钮区也接入同一套布局系统

这些事情如果全堆在 `SearchForm.tsx` 里，会把“表单行为”和“布局推导”搅在一起。现在拆成 `FieldGridV2` 以后：

- `SearchFormV2` 只关心行为
- `FieldGridV2` 只关心布局

这是后续维护最重要的边界之一。

## 5. `useFieldGrid` 的核心算法怎么读

`field-grid-v2/useFieldGrid.tsx` 是整个布局系统最核心的文件。

### 5.1 第一步：先算当前有几列

它先根据容器宽度估算出 `rowNum`。这个名字从语义上看有点绕，实际含义更接近“当前一行最多能摆下多少列”。

估算方式默认依赖几个经验值：

- 每列最小宽度 `340px`
- 列间距 `24px`
- 行间距 `12px`

所以当容器越宽，`rowNum` 越大；容器越窄，`rowNum` 越小。

不过现在这些值不再是硬编码死的了，而是可以通过 `layoutConfig` 传入：

- `minColumnWidth`
- `columnGap`
- `rowGap`
- `maxColumns`

其中 `maxColumns` 是“最多几列”，不是“固定几列”。比如：

- 容器宽度能放 5 列，`maxColumns=3`，最终显示 3 列。
- 容器宽度只能放 2 列，`maxColumns=3`，最终显示 2 列。
- 不传 `maxColumns` 时，不限制最大列数，继续保持自动布局。

最终真正应用到 DOM 上的是：

`gridTemplateColumns: repeat(rowNum, minmax(340px, 1fr))`

也就是说：

- 逻辑层先估算列数
- CSS Grid 再负责把每列真正拉伸到合适宽度

### 5.2 第二步：把 `items` 排序

布局前，会先做两件事：

- 过滤掉 `renderable=false` 的项
- 把 `hidden=true` 的项排到后面

为什么 `hidden` 项不直接删掉？

因为它们还要服务于后续的统一布局推导。`SearchFormV2` 的收起/展开、字段设置等逻辑，依赖每个字段都走过一遍同样的布局算法。如果 `hidden` 项直接被删除，很多“第几行”“前一个格子结束在哪”的关系会断掉。

为什么又要把它们移到后面？

因为如果 `hidden` 项保留在原始顺序里，可见字段之间会被它们插出很多空洞，界面会很不自然。

所以现在的做法是：

- 它们仍参与布局算法
- 但尽量不干扰前面的可见区域

### 5.3 第三步：给每个字段算 `colStart` 和 `colEnd`

这里是最核心的布局推导。

默认策略是：

- 如果没传 `colStart`，就从上一个格子的 `colEnd` 开始接着排
- 如果接不下，就自动换到下一行第 1 列
- 如果没传 `colEnd`，就用 `colStart + colSpan` 推出来
- 如果 `colSpan='max'`，就直接占满一整行

这里有个小工具函数 `edge()`，它负责两件事：

- 把负数 grid line 转成当前行数下的合法正数
- 把超出边界的值强行收敛回合法范围

所以这层逻辑做完以后，每个字段都会得到：

- `colStart`
- `colEnd`
- `rowIndex`

这三个值就是后面所有折叠和定位逻辑的基础。

### 5.4 第四步：算 `rowIndex`

`rowIndex` 决定一个字段落在第几行。

什么时候会进入下一行？

- 如果当前字段的 `colStart` 被算回了 `1`
- 或者当前字段的 `colStart` 跑到了上一个格子的左边

一旦出现这些情况，就说明发生了换行，`rowIndex` 就加 1。

### 5.5 第五步：渲染

最后 `renderGrid()` 会输出一层真正的 CSS Grid 容器，然后把每个字段渲染成一个 grid item。

如果某个 item 提供了 `render`：

- 完全交给外部自定义渲染

否则：

- 使用默认 `Form.Item + value` 渲染

这里顺手还会把：

- `labelWidth`
- `labelAlign`
- `colon`

这些表单展示参数，统一下发到每个格子内部。

## 6. `SearchFormV2` 的运行时主流程

如果你要读 `search-form-v2/SearchForm.tsx`，建议按下面这个顺序理解。

### 6.1 先看几个状态变量

组件内部最关键的状态有：

- `isExpand`
  当前是否是展开状态。
- `isRequiredSatisfied`
  当前这一次表单值快照，是否已经满足 `requiredFields`。
- `initFieldsValue`
  当前组件认定的“重置基线”。
- `settingItems`
  当前字段设置面板的真实状态，里面保存每个字段是否 hidden。

可以把它们理解成四条子状态线：

- 展开折叠线
- 查询开闸线
- 重置基线线
- 字段设置线

### 6.2 `formKey` 是什么，为什么要带 pathname

当 `setting` 打开时，用户的字段显隐配置需要持久化。

这时组件会生成一个 `formKey`，格式大致是：

`pathname + uniqueKey`

这样做的原因是：

- 同一个页面上可能有多个 SearchForm，需要 `uniqueKey` 区分
- 不同页面也可能碰巧用了相同 `uniqueKey`，所以还要把 `pathname` 拼进去

否则两个页面就可能共享同一份字段设置缓存。

### 6.3 `originalSettingItems` 是默认配置骨架

当字段设置打开时，组件会先基于当前 `items` 生成一份“默认字段配置”：

- 每个字段有一个稳定的 key
- 每个字段默认 `hidden=false`
- label 直接取当前代码里的最新值

这份数据不会直接拿来渲染，它只是一个“默认配置骨架”。

后面如果 IndexedDB 里有旧缓存，会把缓存里的 `hidden` 覆盖回这份骨架上。

这种设计的好处是：

- 新增字段不会因为旧缓存而消失
- 改了 label 以后，界面总能看到最新文案

### 6.4 初始化时，先把字段设置和本地缓存合并

`useEffect` 会在组件初始化时做一次 setting 数据同步：

- 如果没开 setting，不做任何事
- 如果浏览器不支持 IndexedDB，直接退回默认配置
- 如果支持 IndexedDB：
  - 没有旧缓存时用默认配置
  - 有旧缓存时把 `hidden` 状态合并回来

这里最重要的一点是：

`settingItems` 被当成字段设置层的“单一真实来源”

也就是说：

- 设置面板改的是它
- 最终字段显隐读的是它
- 本地持久化写回的也是它

这样状态流比较稳定，不容易在多个来源之间打架。

### 6.5 `allItems` 是“设置层”和“布局层”的桥梁

有了 `settingItems` 之后，组件会重新生成一份 `allItems`：

- 对每个原始 item，根据 key 去 `settingItems` 里找同名记录
- 如果找到了，就把 `hidden` 状态写回 item

这一步非常关键，因为：

- `settingItems` 只是偏好数据
- `FieldGridV2` 只认识真正的 item 配置

所以这一层相当于把“用户设置”重新投影回“布局输入”。

### 6.6 `layoutConfig` 和 `collapseConfig` 分别控制什么

这两个配置是这次新增的两个“舒适型扩展点”。

`layoutConfig` 负责布局密度：

- `minColumnWidth`
- `columnGap`
- `rowGap`

也就是说，它影响的是一行能排几列，以及字段之间的视觉间距。

`collapseConfig` 目前先只开放了：

- `singleColumnExtraRows`

它影响的是“单列模式下，折叠时要不要为按钮区额外预留更多行”。

默认情况下，单列模式仍然保留旧逻辑，也就是额外补 1 行。只有你明确传了配置，组件才会改变折叠补偿策略。

## 7. 折叠/展开逻辑到底怎么工作的

很多人第一反应会以为折叠逻辑是“只保留前 N 个字段”。其实不是。

`SearchFormV2` 的折叠逻辑完全建立在 `FieldGridV2` 的布局结果上。

它真正看的不是字段数量，而是：

- 每个字段的 `rowIndex`
- 每个字段的 `colEnd`
- 当前列数 `rowNum`
- 折叠阈值 `minRows`
- 单列补偿 `singleColumnExtraRows`

### 7.1 为什么需要基于布局结果判断

因为字段支持：

- 跨列
- 整行占满
- 自定义起止列

在这种情况下，“前 4 个字段”不一定等于“前 1 行”。所以必须先算完网格布局，才能知道谁在折叠后应该留下，谁该隐藏。

### 7.2 `shouldHideCollapsedItem()` 的规则

它的规则大概是：

- 如果字段本身就 hidden，不参与折叠判断
- 如果字段所在的 `rowIndex` 超过折叠允许的最后一行，就隐藏
- 如果字段刚好处在最后可显示那一行，但它顶到了这一行最右边，也隐藏

最后这条比较关键，而且现在单列补偿量也可以通过 `collapseConfig.singleColumnExtraRows` 调整。

原因是按钮区也要占布局空间。如果最后一个字段已经把这一行完全占满，那按钮区就会被挤到下一行。这时视觉上就不是“收起后的最后一行 + 按钮”，而变成“字段占满最后一行，按钮另起一行”，效果不理想，所以这个字段也会被折叠掉。

### 7.3 为什么只隐藏字段，不卸载字段

折叠时组件并没有把字段从 `items` 中删掉，而是加一个 `display:none` class。

这样做是为了保住 Form 内部状态：

- 用户输入过的值不会因为折叠而丢掉
- 展开回来时不会重新挂载复杂控件
- 某些有副作用的组件不会因为来回卸载而重复执行逻辑

这是一个很典型的“界面折叠”和“数据卸载”分离的设计。

## 8. `requiredFields`、`isRequiredSatisfied`、`autoSearch` 三者关系

这一段是搜索行为里最容易绕的部分。

### 8.1 `isRequiredSatisfied` 真正表示什么

这里的核心状态现在是 `isRequiredSatisfied`，它表示的是：

“基于当前表单值判断，`requiredFields` 是否此刻满足”

所以：

- `requiredFields` 为空时，它天然就是 `true`
- `requiredFields` 不为空时，只要有必填字段被清空，它就会立刻回到 `false`

这和旧实现里“首次满足过之后就一直可搜索”的状态机相比，更贴近使用者直觉。

### 8.2 `syncRequiredFieldState()` 是实时开闸逻辑

每次表单值变化后，都会调用 `syncRequiredFieldState(allValues)`。

它做的事情是：

- 遍历 `requiredFields`
- 用 lodash `get()` 读取每个 path 对应的值
- 判断这些字段在“当前值快照”里是否都算有效值
- 把结果直接写回 `isRequiredSatisfied`

这里有一个关键变化：

它不是只在“第一次满足条件”时工作，而是每次都按当前值重算一次。

所以用户如果：

- 先填上必填项
- 再把它清空

那么查询按钮也会立刻重新禁用，不会保留旧的“已开闸”状态。

### 8.3 `searchDisabledByValueChange()` 是 onChange 搜索逻辑

如果 `searchTrigger='onChange'`，那每次值变化还会再走一条防抖逻辑：

- 再检查一遍 `requiredFields` 是否满足
- 满足就延迟触发 `form.submit()`

为什么要和 `syncRequiredFieldState()` 分开？

因为这是两件事：

- `syncRequiredFieldState()` 负责维护“当前能不能搜”
- `searchDisabledByValueChange()` 负责“在 onChange 模式下什么时候真的发起搜索”

拆开后会更清晰。

### 8.4 `autoSearch` 什么时候会触发

`autoSearch` 并不是“组件一挂载就搜”，而是：

- 没有必填项时，只要组件准备好并且允许搜索，就自动搜一次
- 有必填项时，要等必填项满足后才自动搜

这就是为什么你会看到组件里有一段 effect，专门盯着：

- `requiredFields.length`
- `isRequiredSatisfied`
- `autoSearch`
- `searchTrigger`

## 9. 为什么还要有 `cacheRequiredInit`

这一段如果不带业务背景，很容易看不懂。

场景是这样的：

- 某些必填项不是一开始就有值
- 而是页面渲染后，通过异步接口或默认上下文回填进来

比如：

- 默认组织
- 默认业务线
- 当前登录人
- 默认租户

如果组件只在第一次渲染时记住那份“空的初始值”，那么后面用户点重置时，这些异步补进来的必填值也会被清空。

这时候体验通常不对，因为用户心里认定的“页面初始状态”，其实是异步数据已经准备好的那个状态，而不是最早那份空壳。

所以 `cacheRequiredInit` 的作用是：

- 在第一次“满足 requiredFields”的时候
- 把当前 requiredFields 的值补记到 `initFieldsValue` 里

这样以后 reset 时，就能回到“真正可用的初始状态”。

如果你不想要这种行为，就可以关闭 `cacheRequiredInit`。

## 10. 为什么 `reset` 不直接调用 `form.resetFields()`

组件这里选择的是：

- `form.setFieldsValue(initFieldsValue)`

而不是：

- `form.resetFields()`

这么做的原因是：

- `resetFields()` 更像是把所有字段回退到“最早初始化时”的内部状态
- 对某些有复杂生命周期的控件，这种回退方式太重
- 这里真正想要的是“把值恢复到组件当前认定的初始快照”

所以 `SearchFormV2` 把重置定义成“重放 `initFieldsValue`”，而不是“完全重置整棵表单树”。

## 11. 查询提交链路是怎么收口的

所有查询行为最后都会汇总到 `form.submit()`。

无论是：

- 点击查询按钮
- `autoSearch` 自动触发
- `onChange` 模式防抖触发
- ref 调用 `search()`

最终都会走 `Form` 的 `onFinish()`。

而 `onFinish()` 做的事情非常集中：

- 如果当前不允许查，直接 return
- 读取全部表单值
- 用 `trimStringField()` 清理字符串首尾空格
- 调用外部传进来的 `onSearch()`

这条“单出口”设计很重要，因为它保证了所有查询方式行为一致。

## 12. 按钮区为什么也放到 Grid 里

按钮区不是写在 Form 下面普通的一个 div 里，而是作为 `renderGrid({ extra })` 的 `extra` 部分插到 Grid 容器里。

这么设计有几个明显好处：

- 按钮区会自动跟随列数变化
- 多列和单列场景下不用维护两套布局逻辑
- 折叠判断时可以直接把按钮区当作“和字段共用布局体系的一部分”

你可以把它理解为：

按钮区本质上也是一个特殊的 grid item，只不过里面装的是操作按钮而不是表单项。

## 13. 字段设置和 IndexedDB 是怎么配合的

字段设置功能分成两层：

- `SettingPanel.tsx`
  只是 UI，负责勾选/取消勾选。
- `indexedDB.ts`
  只是存储层，负责读写。

真正把二者串起来的是 `SearchForm.tsx`。

### 13.1 存储结构

每条字段设置记录至少有：

- `id`
- `formKey`
- `key`
- `hidden`

其中主键 `id` 采用：

`formKey:key`

这样做的原因是：

- 同一页面不同字段不会冲突
- 不同页面同名字段也不会冲突

另外还会给 `formKey` 建一个二级索引，方便一次把某个 SearchForm 的全部字段配置取出来。

### 13.2 为什么存储层封装得很薄

现在这个 `connectStore()` 只提供：

- `getAll()`
- `get()`
- `put()`
- `clear()`
- `close()`

它没有掺杂 UI 逻辑，也没做太重的抽象。

这是刻意的，因为以后如果你们真实项目不想用 IndexedDB，很容易替换成：

- localStorage
- 页面缓存
- 后端接口持久化

只要保持“按 formKey 读写字段显隐状态”这个抽象边界不变，上层基本不用大改。

## 14. 推荐的读源码顺序

如果你后面要带着问题再读源码，建议按这个顺序：

1. 先看 `search-form-v2/interface.ts`
   先知道对外输入输出是什么。
2. 再看 `field-grid-v2/interface.ts`
   理解 `items` 能带哪些布局信息。
3. 再看 `field-grid-v2/useFieldGrid.tsx`
   先把布局算法吃透。
4. 然后看 `search-form-v2/SearchForm.tsx`
   这时再看折叠、自动搜索、字段设置，就不会觉得它们是“魔法”。
5. 最后看 `search-form-v2/utils/indexedDB.ts`
   理解字段设置是怎么落盘的。

如果一上来就从 `SearchForm.tsx` 第一行开始顺着啃，通常会被各种 `useMemo`、`useEffect` 和状态切换绕晕。

## 15. 后续最容易改动的地方在哪里

如果以后要扩展这个组件，通常会落在下面几类需求里：

### 15.1 改布局

关注：

- `field-grid-v2/useFieldGrid.tsx`
- `field-grid-v2/FieldGrid.module.less`

典型需求：

- 修改最小列宽
- 修改列间距
- 增加更复杂的跨列规则

### 15.2 改折叠策略

关注：

- `search-form-v2/SearchForm.tsx`
  重点看 `shouldHideCollapsedItem()`

典型需求：

- 折叠时保留更多行
- 最后一行按钮定位规则变化
- 移动端折叠逻辑不同

### 15.3 改搜索触发时机

关注：

- `syncRequiredFieldState()`
- `searchDisabledByValueChange()`
- `autoSearch` 那段 `useEffect`

典型需求：

- 输入停止 500ms 再查
- 只在某些字段变化时触发自动搜索
- 必填项逻辑更复杂

### 15.4 改字段设置持久化

关注：

- `search-form-v2/utils/indexedDB.ts`
- `SearchForm.tsx` 里初始化和写回的两个 `useEffect`

典型需求：

- 改成 localStorage
- 改成后端存储
- 增加排序而不仅仅是 hidden

## 16. 调试时可以用什么方法快速定位问题

如果后面线上或真实项目里出现问题，可以按下面思路定位。

### 16.1 如果是“字段排版不对”

先看：

- `rowNum` 算得对不对
- `gridItems` 里的 `colStart/colEnd/rowIndex` 是否符合预期

这类问题通常优先定位到 `useFieldGrid.tsx`。

### 16.2 如果是“折叠后少了/多了字段”

先看：

- `shouldHideCollapsedItem()` 判断结果
- `hasCollapsedItems`
- `renderedGridItems`

这类问题通常不在样式，而在折叠判定条件。

### 16.3 如果是“必填项明明有值却不能搜”

先看：

- `requiredFields` 配置是不是对的
- `get(allValues, field)` 取到的 path 对不对
- `isRequiredSatisfied` 是否仍然是 false

这类问题通常出在路径配置或值结构上。

### 16.4 如果是“字段设置刷新后不生效”

先看：

- `formKey` 是否稳定
- `settingItems` 是否正确初始化
- IndexedDB 里是否真的写进去了对应记录

这类问题通常是 key 不稳定，或者页面路径变了。

## 17. 一句话总结这个组件

如果要用一句话总结：

`SearchFormV2` 是一个“以 antd Form 为行为核心、以 CSS Grid 为布局核心、以 setting + IndexedDB 为偏好层”的可折叠搜索表单。

读懂它最关键的不是记住每个 `useEffect`，而是先建立三层模型：

- 布局层：`FieldGridV2`
- 行为层：`SearchFormV2`
- 偏好层：`SettingPanel + IndexedDB`

只要把这三层分清楚，后面无论是改样式、改交互还是改持久化，都会好很多。
