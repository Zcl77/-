# Codex 与 PyCharm 工作方式

核对日期：2026-08-09。以下结论只采用 OpenAI 官方文档明确支持的范围。

## 结论

| 问题 | 结论 |
| --- | --- |
| Codex 能否接入 JetBrains / PyCharm | OpenAI 文档说明 JetBrains IDE 使用其自身集成：在 AI Chat 中选择 Codex。 |
| 是否有 OpenAI 官方 JetBrains 插件 | OpenAI 文档只提供 VS Code 扩展安装入口，并把 JetBrains 链接到 JetBrains 自身集成；未记录一个独立的 OpenAI 官方 JetBrains 插件。 |
| PyCharm 2023.3.5 是否兼容 | OpenAI 文档没有给出该版本的兼容矩阵，因此不能确认直接 IDE 集成可用。应由 JetBrains 插件页面的版本要求实测确认。 |
| 能否在 PyCharm 内置终端使用 Codex CLI | 可以作为终端工作流使用。官方说明 CLI 在项目目录中运行，可检查、编辑文件和执行本机工具。是否从 PyCharm 终端启动不会改变 CLI 的工作方式。 |

官方依据：

- [Codex IDE 文档](https://learn.chatgpt.com/docs/codex/ide)：VS Code 使用 Codex 扩展；JetBrains IDE 使用其自身集成，并在 AI Chat 中选择 Codex。
- [Codex CLI 文档](https://learn.chatgpt.com/docs/codex/cli)：CLI 在本地仓库中检查、编辑和运行代码。
- [Windows sandbox 文档](https://learn.chatgpt.com/docs/windows/windows-sandbox)：Windows 桌面版、CLI 和 IDE 工作流支持原生沙箱。

## 对当前环境的建议

PyCharm 2023.3.5 继续用于 Python 后端开发。若 JetBrains AI Chat 中没有可用的 Codex 选项，不要安装来源不明的同名插件；直接在 PyCharm 的 Terminal 中进入仓库并运行：

```powershell
codex
```

首次运行按官方 CLI 流程登录。让终端当前目录保持在准备修改的 Git 仓库中，并在任务前后创建 Git 检查点。

## 三种工作方式

| 方式 | 适合场景 |
| --- | --- |
| Codex 桌面版 | 多任务、工作树、内置浏览器、截图检查、长任务和集中审阅。当前前端工作适合此方式。 |
| Codex CLI | 以终端为中心的 Python 开发、脚本、测试和可重复命令；也适合 PyCharm 2023.3.5 无直接集成时使用。 |
| IDE 集成 | 小范围编辑、利用当前打开文件和选区作为上下文、在编辑器内查看变更。可用性取决于对应 IDE 的集成和版本。 |

## Windows 安全配置

1. 优先使用 Windows 11 与官方推荐的 `elevated` sandbox；受策略限制时才使用 `unelevated`。
2. 保留项目目录边界，只对明确需要的命令或目录授权，不开启长期 full access。
3. 每项工作使用独立 Git 分支，修改前后检查 `git status`，提交前检查 diff。
4. 密钥只放入被 Git 忽略的环境文件或系统凭据存储，不放入提示、日志、仓库或截图。
5. 本机只保留一套生效的 Node.js/npm。出现版本冲突时先运行 `where.exe node`、`where.exe npm`、`node -v` 和 `npm -v`，整理 PATH 后重启 PyCharm/VS Code 终端。
6. 不从本机开发任务直接连接正式服务器；部署另走有备份、隔离与回滚的授权流程。
