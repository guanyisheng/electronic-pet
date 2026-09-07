# 电子宠物

跨平台桌面电子宠物：**运行软件（Win / macOS）** + **hatch skill 皮肤模板**。

- 软件播放 Codex v2 精灵图，可散步、跟鼠标、导入换肤
- Skill（`.cursor/skills/hatch-desktop-pet`）按固定皮肤包格式出图
- 软件识别 `format: electronic-pet-skin` 的文件夹并导入

MIT 开源。

## 启动

```bash
npm install
npm start
```

- macOS：双击 `启动电子宠物.command`
- Windows：双击 `启动电子宠物.bat`

## 皮肤包

Skill 产出目录：

```text
skins/<id>/
  pet.json
  spritesheet.webp   # 1536×2288
  tray.png
```

内置示例：`assets/skins/sample-basic/`。

托盘 → **皮肤** → 选择已有皮肤，或 **导入皮肤文件夹…**（指向 skill 生成的目录）。

规范见：

- `.cursor/skills/hatch-desktop-pet/skin-pack.md`
- `.cursor/skills/hatch-desktop-pet/atlas.md`

## 打包

```bash
npm run dist:mac    # macOS
npm run dist:win    # Windows
npm run dist        # 两者（需在对应平台或 CI）
```

## 操作

- 单击：挥手 · 双击：跳跃 · 拖放：落地 · 右键：菜单
- 托盘：模式 / 动作 / 大小 / 皮肤 / 退出

## 开发规范

见 `.cursor/rules/git-workflow.mdc`。
