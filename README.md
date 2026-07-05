# 🃏 斗地主 (Fight the Landlord)

一个界面精美、功能完善的Python基础学习斗地主纸牌游戏，支持人机对战，采用毛玻璃深色主题设计。

![游戏界面](https://img.shields.io/badge/界面-毛玻璃深色主题-blue)
![技术栈](https://img.shields.io/badge/前端-Vanilla%20JS%20%2B%20Tailwind-green)
![后端](https://img.shields.io/badge/后端-Python%20Flask-red)
![AI](https://img.shields.io/badge/AI-智能出牌策略-yellow)

---

## 📁 项目结构

```
FightTheLandlord/
├── app.py                    # Flask应用入口
├── requirements.txt          # Python依赖
├── models/                   # 数据模型
│   ├── card.py              # 扑克牌模型
│   ├── player.py            # 玩家模型
│   ├── game_state.py        # 游戏状态模型
│   ├── pattern.py           # 牌型模型（14种牌型常量）
│   ├── play_record.py       # 出牌记录
│   ├── statistics.py        # 战绩统计
│   └── settings.py          # 游戏设置
├── engine/                   # 游戏引擎
│   ├── deck.py              # 洗牌发牌（Fisher-Yates算法）
│   ├── pattern_recognizer.py # 牌型识别（13种合法牌型）
│   ├── pattern_comparator.py # 牌型比较
│   ├── rule_validator.py    # 规则验证
│   ├── state_manager.py     # 状态管理
│   └── game_engine.py       # 游戏引擎核心（5阶段状态机）
├── ai/                       # AI策略引擎
│   ├── hand_evaluator.py    # 手牌评估
│   ├── bid_strategy.py      # 叫地主决策
│   └── play_strategy.py     # 出牌策略（分层策略架构）
├── api/                      # API路由
│   ├── game_routes.py       # 游戏API
│   ├── ai_routes.py         # AI决策API
│   └── stats_routes.py      # 战绩/设置API
├── storage/                  # 存储层
│   └── stats_repository.py  # 战绩持久化
├── data/                     # 数据文件
│   └── stats.json           # 战绩数据
└── static/                   # 前端
    ├── index.html           # 游戏主页面（毛玻璃深色主题）
    ├── css/style.css        # 全局样式（Glassmorphism）
    └── js/                  # JavaScript模块
        ├── utils.js         # 工具函数
        ├── api-client.js    # API客户端
        ├── state-manager.js # 状态管理器
        ├── card-renderer.js # 扑克牌渲染器（纯CSS）
        ├── animation-engine.js # 动画引擎
        ├── sound-manager.js # 音效管理器
        ├── ui-updater.js    # UI更新器
        ├── bid-controller.js # 叫地主控制器
        ├── play-controller.js # 出牌控制器
        ├── game-controller.js # 游戏主控制器
        └── app.js           # 前端入口
```

---

## ✨ 核心特性

### 界面

- **毛玻璃深色主题** - 采用 Glassmorphism 设计风格，深色渐变背景配合半透明毛玻璃面板
- **纯CSS扑克牌** - 无需任何图片资源，使用纯CSS绘制精美扑克牌
- **流畅动画效果** - 发牌动画、出牌动画、胜利烟花、炸弹特效、翻牌动画等
- **响应式设计** - 支持桌面和平板设备

### 游戏逻辑

- **完整的牌型识别** - 支持全部13种合法牌型：
  - 单张、对子、三条
  - 三带一、三带二
  - 顺子（5张及以上连续单牌）
  - 连对（3对及以上连续对子）
  - 飞机（不带/带单/带对）
  - 四带二（单/对）
  - 炸弹、火箭（双王）

- **正确的牌型比较规则**
  - 火箭最大
  - 炸弹可跨类型压制
  - 同类型按主牌点数比较
  - 顺子/连对/飞机需长度相同

- **5阶段游戏状态机**
  ```
  IDLE → DEALING → BIDDING → PLAYING → SETTLING
  ```

- **边界情况处理**
  - 全员不叫 → 重新发牌
  - 炸弹/火箭 → 倍数翻倍
  - 自由出牌权 → 可出任意合法牌型

### 🤖 AI智能出牌

- **手牌强度评估算法**
  - 大王 +6分、小王 +5分
  - 2 +3分、A +1分
  - 炸弹 +6分、三条 +1分

- **叫地主决策策略**
  - 评分 ≥ 10 → 叫3分
  - 评分 ≥ 7 → 叫2分
  - 评分 ≥ 4 → 叫1分
  - 评分 < 4 → 不叫

- **分层出牌策略**
  - 自由出牌：优先出小牌保留大牌
  - 跟牌策略：寻找同类型最小可压牌型
  - 队友配合：农民AI识别队友优先过牌
  - 炸弹压制：关键时刻使用炸弹

- **出牌提示功能** - 为人类玩家提供智能出牌建议

### 🎮 功能

- **完整游戏流程**
  ```
  开始游戏 → 发牌 → 叫地主 → 出牌 → 结算 → 再来一局
  ```

- **倒计时机制** - 30秒超时自动操作（可配置）

- **战绩统计** - 持久化存储历史战绩
  - 总局数、总胜率
  - 地主胜率、农民胜率
  - 累计得分

- **游戏设置**
  - 音效开关
  - 底分设置（50/100/200/500）
  - 倒计时时长（15s/30s/60s/无限制）

- **音效系统** - 使用 Web Audio API 生成音效
  - 发牌、出牌、过牌音效
  - 炸弹、火箭特效音
  - 胜利、失败音效

---

## 🚀 运行方式

### 环境要求

- Python 3.8+
- 现代浏览器（Chrome/Firefox/Edge/Safari）

### 安装步骤

```bash
# 1. 进入项目目录
cd FightTheLandlord

# 2. 安装Python依赖
pip install -r requirements.txt

# 3. 启动后端服务
python app.py

# 4. 打开浏览器访问
# http://localhost:5000
```

### 开发模式

后端默认运行在开发模式（debug=True），端口5000。如需修改：

```python
# app.py
if __name__ == '__main__':
    app = create_app()
    app.run(debug=False, port=8080)  # 修改端口
```

---

## 🎮 游戏玩法

### 基本规则

斗地主是一款三人纸牌游戏，一人地主两人农民，地主先出牌，谁先出完牌谁获胜。

### 游戏流程

1. **开始游戏** - 点击"🎮 开始游戏"按钮

2. **发牌阶段** - 系统自动洗牌发牌
   - 每人17张牌
   - 3张底牌（叫地主后归地主）

3. **叫地主阶段** - 选择叫分
   - 点击"1分"、"2分"、"3分"或"不叫"
   - 叫分必须高于当前最高叫分
   - 叫3分直接成为地主
   - 全员不叫则重新发牌

4. **出牌阶段** - 轮流出牌
   - 点击手牌选中（牌会上移表示选中）
   - 点击"出牌"按钮提交
   - 点击"不出"按钮过牌
   - 点击"💡 提示"获取出牌建议

5. **结算阶段** - 某方出完牌
   - 显示胜负结果
   - 计算得分：底分 × 叫分 × 倍数
   - 点击"🔄 再来一局"继续游戏

### 操作说明

| 操作 | 说明 |
|------|------|
| 点击手牌 | 选中/取消选中 |
| 出牌按钮 | 提交选中的牌 |
| 不出按钮 | 过牌（跳过本轮） |
| 提示按钮 | 获取AI出牌建议 |
| 战绩按钮 | 查看历史战绩 |
| 设置按钮 | 修改游戏设置 |

### 牌型说明

| 牌型 | 说明 | 示例 |
|------|------|------|
| 单张 | 任意一张牌 | 3 |
| 对子 | 两张相同点数 | 33 |
| 三条 | 三张相同点数 | 333 |
| 三带一 | 三条+一张单牌 | 333+4 |
| 三带二 | 三条+一对 | 333+44 |
| 顺子 | 5张及以上连续单牌（3-A） | 34567 |
| 连对 | 3对及以上连续对子 | 334455 |
| 飞机 | 2组及以上连续三条 | 333444 |
| 飞机带单 | 飞机+等量单牌 | 333444+56 |
| 飞机带对 | 飞机+等量对子 | 333444+5566 |
| 四带二单 | 炸弹+两张单牌 | 3333+45 |
| 四带二对 | 炸弹+两对 | 3333+4455 |
| 炸弹 | 四张相同点数 | 3333 |
| 火箭 | 大小王 | 🃏🃏 |

---

## 🛠️ 技术栈

### 后端

- **Python Flask** - Web框架
- **Flask-CORS** - 跨域支持

### 前端

- **Vanilla JavaScript** - 纯JS，无框架依赖
- **Tailwind CSS** - 原子化CSS框架（CDN引入）
- **Web Audio API** - 音效生成

### 设计风格

- **Glassmorphism** - 毛玻璃拟态设计
- **深色主题** - 护眼舒适
- **渐变背景** - 现代视觉

---

## 📝 API接口

### 游戏API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/game/new` | POST | 创建新游戏 |
| `/api/game/<id>/bid` | POST | 玩家叫分 |
| `/api/game/<id>/play` | POST | 玩家出牌 |
| `/api/game/<id>/pass` | POST | 玩家过牌 |
| `/api/game/<id>/state` | GET | 获取游戏状态 |
| `/api/game/<id>/settle` | GET | 获取结算结果 |

### AI API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/game/<id>/ai-bid` | POST | AI叫分决策 |
| `/api/game/<id>/ai-play` | POST | AI出牌决策 |
| `/api/game/<id>/hint` | POST | 出牌提示 |

### 战绩API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/stats` | GET | 获取战绩统计 |
| `/api/stats` | POST | 上报战绩 |
| `/api/stats/reset` | DELETE | 重置战绩 |
| `/api/settings` | GET | 获取设置 |
| `/api/settings` | PUT | 更新设置 |

---

## 📄 License

MIT License

---

## 🔧 修复记录

### 第一轮修复：手牌与出牌显示

| 问题 | 原因 | 修复 |
|------|------|------|
| 看不见自己的手牌 | 后端 `Card.to_dict()` 输出 `faceUp`（驼峰），前端 `card-renderer.js` 检查 `card.face_up`（下划线），`!undefined` 为 `true`，所有牌渲染为背面 | `card-renderer.js:52` 改为 `card.faceUp === false` |
| 看不见别人出的牌 | AI出牌API返回 `aiAction`，前端检查 `data.action`；且响应中未包含出的牌 | `ai_routes.py` 将 `aiAction` 改为 `action`，并添加 `result['cards']` 序列化AI出的牌 |
| 左右AI出牌区牌面显示不全 | AI面板宽仅 `w-48`(192px)，多张牌溢出被裁剪 | AI出牌区添加 `overflow:visible`，出牌容器添加 `flex-wrap` |

### 第二轮修复：全面优化

| # | 问题 | 原因 | 修复 | 涉及文件 |
|---|------|------|------|----------|
| 1 | 底牌翻牌动画无效 | `renderHiddenCards` 传入 `face_up`，`render()` 读取 `faceUp` | `face_up` → `faceUp` | `card-renderer.js:288` |
| 2 | 6种牌型显示英文key | 前端 `getPatternName` 的key与后端 `pattern.py` 常量不一致（如 `triple_one` vs `triple_with_single`） | 添加后端实际使用的key映射 | `utils.js:152-168` |
| 3 | AI叫分UI永远显示"不叫" | 前端读取 `data.score`，后端返回 `aiDecision` | `data.score` → `data.aiDecision` | `bid-controller.js:160` |
| 4 | 人类玩家信息覆盖AI右 | `renderPlayerInfo` 中 `id===1?'left':'right'` 将 id=0 映射到 right | 循环中跳过 `id===0` | `ui-updater.js:68-89` |
| 5 | 出牌后状态更新死代码 | `me.handCards = newHand` 后 `me.handCards \|\| (me.hand_cards=...)` 永远短路 | 移除死代码 | `play-controller.js:127` |
| 6 | AI手牌泄露到前端 | `new_game`/`_handle_all_pass_bid`/`play` 中 `to_dict()` 未隐藏AI手牌 | `to_dict(hide_cards=p.is_ai)` | `game_engine.py:66,194,274` |
| 7 | "不出"按钮显示时机错误 | 出牌/过牌后 `setState` 未更新 `isFreePlay`/`lastPlay`/`lastPlayBy` | 补充状态字段；后端 `play`/`pass_turn` 返回 `isFreePlay`/`lastPlay`/`lastPlayBy` | `play-controller.js`, `game_engine.py` |
| 8 | 再次叫分时倒计时不重启 | `bid-controller` 再次轮到人类叫分时未通知 `game-controller` 重启倒计时 | 暴露 `onNeedCountdown` 回调，`game-controller` 绑定 | `bid-controller.js:108`, `game-controller.js:50` |
| 9 | 发牌动画定位失败 | 引用 `getElementById('player-hand')`，HTML中ID为 `hand-cards` | 修正元素ID | `animation-engine.js:45` |
| 10 | 自由出牌权时出牌区未清空 | 两人过牌后新轮次开始，旧出牌/过牌状态残留 | 检测 `isFreePlay` 时调用 `clearPlayAreas()` | `play-controller.js` |

---

