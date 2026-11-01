# Instructions for AI tools working in this repo

This is the GetSales developer documentation, a Mintlify site (`docs.json` is the navigation,
pages are MDX). `README.md` has the layout, the preview commands and the deploy flow. Three rules
that are not Mintlify's:

- `api-reference/*/openapi.yaml` are GENERATED copies. Never edit them here: regenerate in the
  monorepo (`product/mcp/gs.mcp`, `pnpm openapi:public`), then run `./sync-openapi.sh`.
- Every page follows the monorepo writing rules: no em or en dash, no curly quotes, no LLM
  filler, nothing that implies a LinkedIn affiliation, "sender profile" and never "seat".
- Every URL is written in full (`https://beta.getsales.io/playtables/v1/api/...`), never as a
  bare path a reader would have to resolve.

Run `mint instructions` for the current Mintlify guidance before changing `docs.json`, the
custom domain or the AI features.
