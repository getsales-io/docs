# Instructions for AI tools working in this repo

This is the GetSales developer documentation, a Mintlify site (`docs.json` is the navigation,
pages are MDX). `README.md` has the layout, the preview commands and the deploy flow. Four rules
that are not Mintlify's:

- `api-reference/*/openapi.yaml` are GENERATED copies. Never edit them here: regenerate in the
  monorepo (`product/mcp/gs.mcp`, `pnpm openapi:public`), then run `./sync-openapi.sh`.
- `guides/webhook-events.mdx` is GENERATED from the Integrations copy by
  `scripts/webhook-events.mjs`, which `./sync-openapi.sh` runs after every copy. Never edit the
  page: change the event's schema upstream, then sync.
- Every page follows the monorepo writing rules: no em or en dash, no curly quotes, no LLM
  filler, nothing that implies a LinkedIn affiliation, "sender profile" and never "seat".
- Every URL is written in full (`https://api2.getsales.io/playtables/v1/api/...`), never as a
  bare path a reader would have to resolve.

Run `mint instructions` for the current Mintlify guidance before changing `docs.json`, the
custom domain or the AI features.

## The knowledge base (`kb/`)

The Knowledge Base tab is product knowledge for AI first: Creator, the AI SDR and every agent on the
GetSales MCP read it, so a page explains how things work, the use cases and the principles, with the
exact names the app and the API use, in sections that each stand alone. The person running GetSales
reads the same pages second; a developer has the Guides tab. Pages live in `kb/<area>/`, images in
`images/kb/<area>/`, captured from a development build with invented people, never from a customer's
workspace. Links between pages are site paths (`/kb/tables/tables`); app and API addresses are written
in full. The plan, the house style and the screenshot tooling are kept outside this repository.
