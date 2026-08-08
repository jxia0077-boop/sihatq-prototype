#!/usr/bin/env bash
# Create agent/* branches and sibling git worktrees for parallel coding agents.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CFG="$ROOT/devtools/multi-agent-worktree/config.json"
BASE_BRANCH="${BASE_BRANCH:-main}"

if ! command -v git >/dev/null; then
  echo "git required" >&2
  exit 1
fi
if ! command -v python3 >/dev/null; then
  echo "python3 required to parse config.json" >&2
  exit 1
fi

cd "$ROOT"
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repo: $ROOT" >&2
  exit 1
fi

# Prefer main; fall back to master / current
if git show-ref --verify --quiet "refs/heads/$BASE_BRANCH"; then
  :
elif git show-ref --verify --quiet refs/heads/master; then
  BASE_BRANCH=master
else
  BASE_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
fi

echo "Repo: $ROOT"
echo "Base branch: $BASE_BRANCH"
git checkout "$BASE_BRANCH"

python3 - <<'PY' "$CFG" "$ROOT" "$BASE_BRANCH"
import json, os, subprocess, sys
cfg_path, root, base = sys.argv[1], sys.argv[2], sys.argv[3]
cfg = json.load(open(cfg_path))
parent = os.path.normpath(os.path.join(root, cfg.get("worktreeParent", "..")))

def run(cmd, cwd=None):
    print("+", " ".join(cmd))
    subprocess.check_call(cmd, cwd=cwd)

for agent in cfg["agents"]:
    branch = agent["branch"]
    wt = os.path.normpath(os.path.join(root, agent["worktree"]))
    # Create branch from base if missing
    has_local = subprocess.call(
        ["git", "show-ref", "--verify", "--quiet", f"refs/heads/{branch}"],
        cwd=root,
    ) == 0
    if not has_local:
        run(["git", "branch", branch, base], cwd=root)
    else:
        print(f"= branch exists: {branch}")

    if os.path.isdir(wt):
        print(f"= worktree exists: {wt}")
        continue
    os.makedirs(parent, exist_ok=True)
    run(["git", "worktree", "add", wt, branch], cwd=root)
    print(f"✓ {agent['id']}: {wt} @ {branch}")

print("\nDone. Assign coding agents:")
for agent in cfg["agents"]:
    wt = os.path.normpath(os.path.join(root, agent["worktree"]))
    print(f"  - {agent['title']}: cd {wt}")
print("\nNext: bash devtools/multi-agent-worktree/scripts/worktree-status.sh")
PY
