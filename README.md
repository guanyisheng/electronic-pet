<<<<<<< HEAD
# 电子宠物

macOS 透明置顶桌面电子宠物。播放 Codex v2 精灵图（`192×208` 格，`8×11` 图集，`spriteVersionNumber: 2`）：可拖、会散步、能跟鼠标。

MIT 开源。

## 启动

```bash
npm install
npm start
```

或双击 `启动电子宠物.command`。

托盘可切换：自己散步 / 跟着鼠标 / 待在原地，以及挥手、跳跃、大小。

窗口操作：

- 单击：挥手
- 双击：跳跃
- 拖到空中松开：落地
- 右键：快捷菜单

## 资源

```text
assets/
  pet.json
  spritesheet.webp   # 1536×2288
  tray.png
```

把你自己的 Codex v2 宠物图集替换进 `assets/` 即可换皮。做新宠物可用仓库内 skill：

```text
.cursor/skills/hatch-desktop-pet/
```

## 开发规范

见 `.cursor/rules/git-workflow.mdc`：功能走 `feature/*`，修复走 `fix/*`，开发完成后自动 Commit / Push / PR，不直接改 `main`。
=======
# electronic-pet
macOS 电子宠物：透明置顶桌面宠物，播放 Codex v2 精灵图
>>>>>>> origin/main
