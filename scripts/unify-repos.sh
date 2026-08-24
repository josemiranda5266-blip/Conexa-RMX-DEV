#!/usr/bin/env bash
set -euo pipefail

BASE_REPO="https://github.com/josemiranda5266-blip/Conxa.rmk.git"
SECONDARY_REPO="https://github.com/josemiranda5266-blip/Conexa-remix.git"
WORK="/tmp/conexa-unification"
BASE="$WORK/conxa"
SECONDARY="$WORK/remix"

rm -rf "$WORK"
mkdir -p "$WORK"
git clone --depth 1 "$BASE_REPO" "$WORK/conxa"
git clone --depth 1 "$SECONDARY_REPO" "$SECONDARY"

mkdir -p src scripts

# Conxa.rmk root is the canonical/current implementation. The repository also
# contains an older nested Conxa.rmk-main snapshot; that snapshot is excluded
# deliberately so it cannot overwrite the current tree.
rsync -a --exclude='.git/' --exclude='Conxa.rmk-main/' --exclude='firestore.rules' --exclude='package.json' \
  --exclude='UNIFICATION_*.md' --exclude='scripts/unify-repos.sh' \
  --exclude='node_modules/' --exclude='dist/' --exclude='.env' --exclude='*.zip' \
  "$BASE/" ./

# Bring only files that exist exclusively in Conexa-remix.
# Conflicting paths are intentionally NOT overwritten; they are recorded for review.
: > /tmp/conexa-conflicts.txt
: > /tmp/conexa-unique.txt

while IFS= read -r -d '' file; do
  rel="${file#$SECONDARY/}"
  case "$rel" in
    .git/*|.git|node_modules/*|dist/*|UNIFICATION_*.md|package.json|firestore.rules|bun.lock) continue ;;
  esac

  if [[ -e "./$rel" ]]; then
    if [[ -f "./$rel" ]] && cmp -s "$SECONDARY/$rel" "./$rel"; then
      printf '%s\n' "$rel" >> /tmp/conexa-unique.txt
    else
      printf '%s\n' "$rel" >> /tmp/conexa-conflicts.txt
    fi
  else
    mkdir -p "$(dirname "./$rel")"
    cp -a "$SECONDARY/$rel" "./$rel"
    printf '%s\n' "$rel" >> /tmp/conexa-unique.txt
  fi
done < <(find "$SECONDARY" -type f -print0)

{
  echo '# Automated unification report'
  echo
  echo '## Canonical source'
  echo '- Conxa.rmk repository root (current implementation)'
  echo
  echo '## Secondary source'
  echo '- Conexa-remix'
  echo
  echo '## Files that were identical or uniquely added'
  sed 's/^/- /' /tmp/conexa-unique.txt || true
  echo
  echo '## Conflicting files kept from canonical source'
  sed 's/^/- /' /tmp/conexa-conflicts.txt || true
} > UNIFICATION_AUTO_REPORT.md

# Never commit secrets or generated artifacts.
rm -rf node_modules dist .env
find . -maxdepth 1 -name '*.zip' -delete

echo "Unified tree assembled. Conflicts: $(wc -l < /tmp/conexa-conflicts.txt)"
