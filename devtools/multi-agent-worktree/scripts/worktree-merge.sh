#!/usr/bin/env bash
# Coordinator: merge agent branches into current branch (usually main) one by one.
# Usage: worktree-merge.sh [--dry-run] [rag safety ui bench ...]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CFG="$ROOT/devtools/multi-agent-worktree/config.json"
DRY=0
ORDER=()

for arg in "$@"; do
  if [[ "$arg" == "--dry-run" ]]; then
    DRY=1
  else
    ORDER+=("$arg")
  fi
done

cd "$ROOT"
CURRENT="$(git rev-parse --abbrev-ref HEAD)"
echo "Coordinator merge into: $CURRENT"
echo "Repo: $ROOT"

# Pass agent ids as separate argv; empty ORDER is fine with "${ORDER[@]+"${ORDER[@]}"}"
python3 - <<'PY' "$CFG" "$ROOT" "$DRY" ${ORDER[@]+"${ORDER[@]}"}
import json, os, subprocess, sys
cfg = json.load(open(sys.argv[1]))
root = sys.argv[2]
dry = sys.argv[3] == "1"
wanted = sys.argv[4:]
agents = cfg["agents"]
if wanted:
    agents = [a for a in agents if a["id"] in wanted]
    missing = set(wanted) - {a["id"] for a in agents}
    if missing:
        print("Unknown agents:", ", ".join(sorted(missing)), file=sys.stderr)
        sys.exit(1)

def run(cmd):
    print("+", " ".join(cmd))
    if not dry:
        subprocess.check_call(cmd, cwd=root)

# Ensure clean tree before merges
status = subprocess.check_output(["git", "status", "--porcelain"], cwd=root, text=True)
if status.strip() and not dry:
    print("Main worktree is dirty. Commit or stash before coordinator merge.", file=sys.stderr)
    sys.exit(1)

for agent in agents:
    branch = agent["branch"]
    print(f"\n## Merge {agent['title']} ({branch})")
    # Validate allowlist first if worktree exists
    wt = os.path.normpath(os.path.join(root, agent["worktree"]))
    validate = os.path.join(root, "devtools/multi-agent-worktree/scripts/worktree-validate.sh")
    if os.path.isdir(wt):
        print("+ bash worktree-validate.sh", agent["id"])
        if not dry:
            subprocess.check_call(["bash", validate, agent["id"]], cwd=root)
    has = subprocess.call(
        ["git", "show-ref", "--verify", "--quiet", f"refs/heads/{branch}"],
        cwd=root,
    ) == 0
    if not has:
        print(f"skip: branch {branch} missing")
        continue
    run(["git", "merge", "--no-ff", "-m", f"merge({agent['id']}): integrate {branch}", branch])

print("\n✓ Coordinator merge sequence complete" + (" (dry-run)" if dry else ""))
if dry:
    print("Re-run without --dry-run to execute merges.")
PY
