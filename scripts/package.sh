#!/bin/sh
# Builds the Chrome Web Store upload: dist/diffstyle-<version>.zip
# Only what the extension needs at runtime goes in (no docs, tests or dotfiles).
set -e
cd "$(dirname "$0")/.."
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' manifest.json)
OUT="dist/diffstyle-$VERSION.zip"
mkdir -p dist
rm -f "$OUT"
zip -q -X -r "$OUT" manifest.json LICENSE icons/icon16.png icons/icon32.png icons/icon48.png icons/icon128.png src/*.js -x '*.DS_Store'
echo "Built $OUT"
unzip -l "$OUT"
