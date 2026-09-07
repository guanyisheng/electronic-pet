# 星澜桌宠

把 Codex 宠物 **星澜（xinglan-basic）** 做成 macOS 桌面宠物：透明无边框、始终置顶、可拖、会自己在屏幕底边散步。

## 启动

```bash
cd "/Users/guanyisheng/Desktop/代码项目/项目/私密聊天/config/pet"
npm install
npm start
```

也可以双击 `启动星澜.command`。

菜单栏托盘图标可以切换：

- 自己散步 / 跟着鼠标 / 待在原地
- 挥手、跳跃、等待、思考
- 小 / 中 / 大

窗口上：

- 单击：挥手
- 双击：跳跃
- 拖到空中松开：落地
- 右键：快捷菜单

精灵图来自 `~/.codex/pets/xinglan-basic`，单元格为 `192x208`，11 行动画（idle、左右走、挥手、跳、失败、等待、工作、审阅，以及 16 个看向方向）。
