#!/usr/bin/env bash
# Sync the generated public OpenAPI documents into this docs repo, then render the page that
# lists every webhook event's payload (guides/webhook-events.mdx) from the Integrations copy.
#
# Source of truth: product/openapi/gs.openapi.public/services/<svc>/openapi.yaml
# (itself generated from the Zod MCP tool registry in product/mcp/gs.mcp).
# The copies under api-reference/ must stay byte-identical to the source, and the
# page must be what scripts/webhook-events.mjs renders from its copy; never edit
# either here. Regenerate upstream, then re-run this script.
#
#   ./sync-openapi.sh          copy the five documents in, then render the page
#   ./sync-openapi.sh --check  exit 1 if any copy drifts from the source, or the page from its copy
set -euo pipefail

DOCS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$DOCS_DIR/../../../product/openapi/gs.openapi.public/services"
SERVICES=(playtables unibox signals integrations id)

if [[ ! -d "$SRC_DIR" ]]; then
  echo "source not found: $SRC_DIR" >&2
  echo "this script expects the docs repo to live inside the getsales.io monorepo at marketing/docs/gs.docs" >&2
  exit 1
fi

mode="${1:-copy}"
rc=0
for svc in "${SERVICES[@]}"; do
  src="$SRC_DIR/$svc/openapi.yaml"
  dst="$DOCS_DIR/api-reference/$svc/openapi.yaml"
  if [[ "$mode" == "--check" ]]; then
    if ! diff -q "$src" "$dst" >/dev/null 2>&1; then
      echo "DRIFT: $dst does not match $src" >&2
      rc=1
    fi
  else
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
    echo "synced api-reference/$svc/openapi.yaml"
  fi
done

if [[ "$mode" == "--check" && $rc -eq 0 ]]; then
  echo "api-reference specs match gs.openapi.public"
fi

# The webhook events page is rendered from the Integrations copy, so it follows every sync.
if [[ "$mode" == "--check" ]]; then
  node "$DOCS_DIR/scripts/webhook-events.mjs" --check || rc=1
else
  node "$DOCS_DIR/scripts/webhook-events.mjs"
fi
exit $rc
