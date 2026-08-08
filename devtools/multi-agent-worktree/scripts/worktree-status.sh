#!/usr/bin/env bash
# Show branch / dirty / ahead status for each agent worktree.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CFG="$ROOT/devtools/multi-agent-worktree/config.json"

cd "$ROOT"
echo "Main repo: $(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD)"
echo

python3 - <<'PY' "$CFG" "$ROOT"
import json, os, subprocess, sys
cfg = json.load(open(sys.argv[1]))
root = sys.argv[2]

def sh(cmd, cwd):
    return subprocess.check_output(cmd, cwd=cwd, text=True).strip()

for agent in cfg["agents"]:
    wt = os.path.normpath(os.path.join(root, agent["worktree"]))
    print(f"## {agent['title']} ({agent['id']})")
    print(f"branch: {agent['branch']}")
    print(f"path:   {wt}")
    if not os.path.isdir(wt):
        print("status: MISSING — run worktree-setup.sh\n")
        continue
    try:
        head = sh(["git", "rev-parse", "--short", "HEAD"], wt)
        branch = sh(["git", "rev-parse", "--abbrev-ref", "HEAD"], wt)
        dirty = sh(["git", "status", "--porcelain"], wt)
        n = 0 if not dirty else len([l for l in dirty.splitlines() if l.strip()])
        print(f"head:   {head} ({branch})")
        print(f"dirty:  {n} file(s)")
        if n:
            print(dirty)
    except subprocess.CalledProcessError as e:
        print(f"error: {e}")
    print()
PY

echo "Registered worktrees:"
git worktree list
