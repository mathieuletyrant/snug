#!/bin/sh
# Fresh worktree: deps, plus a private copy of the main checkout's data (accounts, series, TMDB key) so the app is usable at once.
set -e
bun install --frozen-lockfile

MAIN=$(dirname "$(git rev-parse --git-common-dir)")
[ -f "$MAIN/data/snug.db" ] || { echo "no $MAIN/data/snug.db: fresh install, create the admin in the app"; exit 0; }
mkdir -p data
[ -e data/snug.db ] || sqlite3 "$MAIN/data/snug.db" ".backup data/snug.db"
[ -e data/images ] || ln -s "$MAIN/data/images" data/images
for file in secret vapid.json; do [ -e "data/$file" ] || cp "$MAIN/data/$file" data/; done
