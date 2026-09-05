#!/bin/bash

# Syncs the shared i18n string tables (i18n/*.json — the single source of
# truth, also consumed by the app's generateI18nStrings Gradle task) into both
# copies of the web dashboard editor: docs/ (GitHub Pages) and
# app/src/main/assets/docs/ (the device's bundled /builder/ server).
#
# Run this after editing any i18n/*.json file.

# Exit on error in subshells, treat unset variables as error
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
src="$root/i18n"

if ! ls "$src"/*.json >/dev/null 2>&1; then
    echo "❌ No JSON files found in $src"
    exit 1
fi

for target in "$root/docs/i18n" "$root/app/src/main/assets/docs/i18n"; do
    mkdir -p "$target"
    rm -f "$target"/*.json
    cp "$src"/*.json "$target/"
    echo "✅ Synced $(ls "$src"/*.json | wc -l) language file(s) -> $target"
done

echo "✨ i18n sync complete — commit the results."
