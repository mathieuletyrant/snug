#!/bin/sh
# Ports derived from the worktree path, so several worktrees (and the main checkout on 3000/5173) run side by side.
n=$(( $(printf %s "$PWD" | cksum | cut -d' ' -f1) % 100 ))
export PORT=$((3100 + n)) WEB_PORT=$((5200 + n))
export API_PORT=$PORT SNUG_ORIGINS=http://localhost:$WEB_PORT
echo "web http://localhost:$WEB_PORT · api http://localhost:$PORT"
exec bun run dev
