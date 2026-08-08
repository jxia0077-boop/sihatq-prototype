# SihatQ · Git Worktree Multi-Agent Development Workflow

> **定位：** 这是 **AI 辅助开发协作** 工作流，不是用户健康问答运行时。
>
> | 场景 | 隔离方式 | 为什么 |
> |------|----------|--------|
> | **产品运行时**（Research / Personalization workers） | **Result Object** | Workers 不改仓库文件，只产出 JSON 再合并 |
> | **开发协作**（RAG / Safety / UI / Bench coding agents） | **Git Worktree** | 多个 coding agent 并行改代码，避免互相覆盖 |

## 解决什么问题

多个 coding agent 同时改同一仓库时常见风险：

- 互相覆盖文件  
- 上下文污染  
- 改错分支  
- merge conflict 失控  
- 难以追踪每个 agent 做了什么  

Worktree 做法：同一 repo → 多个独立工作目录 → 每 agent 一条 branch → 最后 Coordinator 校验并合并。

## 角色

| Agent | Branch | Worktree | 职责 |
|-------|--------|----------|------|
| RAG | `agent/rag` | `../sihatq-wt-rag` | retrieval / pgvector / knowledge / stats tooling |
| Safety | `agent/safety` | `../sihatq-wt-safety` | safety gate / medical rules / eval |
| UI | `agent/ui` | `../sihatq-wt-ui` | chatbot / admin traces UI |
| Benchmark | `agent/bench` | `../sihatq-wt-bench` | bench + smoke scripts / metrics docs |
| Coordinator | `main` | 主仓库 | 查 diff、跑 validate、merge、写总结 |

路径白名单见 [`config.json`](./config.json)。Briefs：[`agents/`](./agents/)。

## 最小用法

```bash
# 1) 从仓库根目录创建 branches + sibling worktrees
bash devtools/multi-agent-worktree/scripts/worktree-setup.sh

# 2) 查看各 agent 状态
bash devtools/multi-agent-worktree/scripts/worktree-status.sh

# 3) 在对应 worktree 里让 coding agent 干活，例如：
cd ../sihatq-wt-rag
# … edit / commit on agent/rag …

# 4) 合并前校验路径白名单（可选 --full 跑 tsc）
bash devtools/multi-agent-worktree/scripts/worktree-validate.sh rag
bash devtools/multi-agent-worktree/scripts/worktree-validate.sh safety --full

# 5) Coordinator 在主仓库合并（先 dry-run）
bash devtools/multi-agent-worktree/scripts/worktree-merge.sh --dry-run
bash devtools/multi-agent-worktree/scripts/worktree-merge.sh

# 6) 收工（保留分支）
bash devtools/multi-agent-worktree/scripts/worktree-teardown.sh
# 或连分支一起删：
# bash devtools/multi-agent-worktree/scripts/worktree-teardown.sh --delete-branches
```

## 面试一句话

> In the product runtime, health-agent workers use **Result Object** isolation because they do not modify files. Separately, for AI-assisted development, SihatQ uses a **Git Worktree** multi-agent workflow so RAG / Safety / UI / Benchmark coding agents implement modules in parallel without overwriting each other; a Coordinator reviews diffs, validates path allowlists, and merges branches.

## 简历可写

Designed a Git Worktree based multi-agent development workflow, assigning RAG, Safety, UI and Benchmark agents to isolated branches/worktrees and using a Coordinator agent to review diffs, run validation and merge results, reducing cross-agent file overwrite risk during parallel development.
