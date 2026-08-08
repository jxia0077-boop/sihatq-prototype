#!/usr/bin/env bash
# Validate one agent worktree: path allowlist + optional lint/tsc.
# Usage: worktree-validate.sh <rag|safety|ui|bench> [--full]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CFG="$ROOT/devtools/multi-agent-worktree/config.json"
AGENT_ID="${1:-}"
FULL="${2:-}"

if [[ -z "$AGENT_ID" ]]; then
  echo "Usage: $0 <rag|safety|ui|bench> [--full]" >&2
  exit 1
fi

python3 - <<'PY' "$CFG" "$ROOT" "$AGENT_ID" "$FULL"
import json, os, subprocess, sys
cfg = json.load(open(sys.argv[1]))
root, agent_id, full = sys.argv[2], sys.argv[3], sys.argv[4]
agent = next((a for a in cfg["agents"] if a["id"] == agent_id), None)
if not agent:
    print(f"Unknown agent: {agent_id}", file=sys.stderr)
    sys.exit(1)

wt = os.path.normpath(os.path.join(root, agent["worktree"]))
if not os.path.isdir(wt):
    print(f"Worktree missing: {wt}", file=sys.stderr)
    sys.exit(1)

# Diff vs merge-base with main/master
base = "main"
r = subprocess.run(["git", "show-ref", "--verify", "--quiet", "refs/heads/main"], cwd=wt)
if r.returncode != 0:
    base = "master"

mb = subprocess.check_output(
    ["git", "merge-base", "HEAD", base], cwd=wt, text=True
).strip()
files = subprocess.check_output(
    ["git", "diff", "--name-only", mb, "HEAD"], cwd=wt, text=True
).splitlines()
# Also include unstaged/staged working tree
porcelain = subprocess.check_output(
    ["git", "status", "--porcelain"], cwd=wt, text=True
).splitlines()
for line in porcelain:
    path = line[3:].strip()
    if " -> " in path:
        path = path.split(" -> ", 1)[1]
    if path and path not in files:
        files.append(path)

allows = agent["allowPaths"]
violations = []
for f in files:
    if not f:
        continue
    ok = any(f.startswith(p) or f == p.rstrip("/") for p in allows)
    if not ok:
        violations.append(f)

print(f"Agent: {agent['title']}")
print(f"Worktree: {wt}")
print(f"Changed files vs {base}: {len(files)}")
for f in files:
    print(f"  - {f}")

if violations:
    print("\n✗ Path allowlist violations (outside agent focus):")
    for v in violations:
        print(f"  ! {v}")
    print("Allowed prefixes:")
    for p in allows:
        print(f"  - {p}")
    sys.exit(2)

print("\n✓ All changed paths within allowlist")

web = os.path.join(wt, "web")
if full == "--full" and os.path.isdir(web):
    print("\nRunning tsc --noEmit …")
    subprocess.check_call(["npx", "tsc", "--noEmit"], cwd=web)
    print("✓ tsc ok")
PY
