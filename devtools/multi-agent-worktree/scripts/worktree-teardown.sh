#!/usr/bin/env bash
# Remove agent worktrees (keeps branches). Usage: worktree-teardown.sh [--delete-branches]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CFG="$ROOT/devtools/multi-agent-worktree/config.json"
DELETE_BRANCHES=0
[[ "${1:-}" == "--delete-branches" ]] && DELETE_BRANCHES=1

cd "$ROOT"

python3 - <<'PY' "$CFG" "$ROOT" "$DELETE_BRANCHES"
import json, os, subprocess, sys
cfg = json.load(open(sys.argv[1]))
root = sys.argv[2]
delete_branches = sys.argv[3] == "1"

for agent in cfg["agents"]:
    wt = os.path.normpath(os.path.join(root, agent["worktree"]))
    branch = agent["branch"]
    if os.path.isdir(wt):
        print("+ git worktree remove", wt)
        subprocess.check_call(["git", "worktree", "remove", "--force", wt], cwd=root)
    else:
        print(f"= already gone: {wt}")
    if delete_branches:
        r = subprocess.call(
            ["git", "show-ref", "--verify", "--quiet", f"refs/heads/{branch}"],
            cwd=root,
        )
        if r == 0:
            print("+ git branch -D", branch)
            subprocess.check_call(["git", "branch", "-D", branch], cwd=root)

subprocess.check_call(["git", "worktree", "prune"], cwd=root)
print("✓ teardown done")
PY
