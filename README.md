# GetSales docs

Developer documentation for GetSales, served at [docs.getsales.io](https://docs.getsales.io):
quickstart, authentication, the response contract, the webhooks guide, MCP setup, and the
generated reference for the whole public contract: five services, 411 operations (Playtables 142,
Unibox 125, ID and Teams 88, Signals 30, Integrations 26).

Related:

- [docs.getsales.io](https://docs.getsales.io) - the live site
- [getsales.io](https://getsales.io) - the product
- [help.getsales.io](https://help.getsales.io/) - the help centre, written for the person running outreach

## Layout

```
gs.docs/
├── docs.json                  # navigation, theme, branding
├── index.mdx ...              # hand-written pages (Guides, MCP, Changelog tabs)
├── api-reference/
│   ├── overview.mdx           # hand-written intro to the reference
│   └── {playtables,unibox,signals,integrations,id}/openapi.yaml   # GENERATED, synced copies
├── sync-openapi.sh            # pulls the specs in from gs.openapi.public
└── logo/, favicon.svg         # brand assets (the app's own mark and the landing's wordmark)
```

## The api-reference specs are generated. Do not edit them here.

The five `openapi.yaml` files are byte-identical copies of
`product/openapi/gs.openapi.public/services/<svc>/openapi.yaml` in the getsales.io monorepo,
which is itself projected from the Zod MCP tool registry in `product/mcp/gs.mcp`. The chain is
one-way:

```
Zod registry  ->  pnpm openapi:public  ->  gs.openapi.public  ->  ./sync-openapi.sh  ->  here
```

To update the reference: change the tool definition, regenerate
(`cd product/mcp/gs.mcp && pnpm openapi:public`), then run `./sync-openapi.sh`.
`./sync-openapi.sh --check` fails on any drift between the copies and the source; run it
before committing.

## Preview locally

```bash
npm i -g mint
mint dev
```

`mint dev` serves the site on `http://localhost:3000` and validates `docs.json` on start.
`mint validate` runs the content checks, the OpenAPI checks and a strict build without serving;
`mint broken-links` checks the links.

## Writing rules

Every page ships under the monorepo writing rules (root `CLAUDE.md` "Writing style: no LLM
tells" and `marketing/BRAND_RULES.md`): no em or en dash as punctuation, no filler vocabulary,
nothing that implies LinkedIn endorses or partners with GetSales (nominative use, "works with
LinkedIn", is fine), the sending entity is a sender profile and never a seat, and the brand name
is GetSales. Run the pre-publish gate greps of `marketing/BRAND_RULES.md` over changed pages
before publishing.

## Deploying

Push to `main` and the site rebuilds. That is the whole flow: Mintlify watches this repo
through its GitHub App, runs a `Mintlify Deployment` check on the push, and the site picks the
build up within about a minute.

This directory IS the standalone GitHub repo Mintlify watches: **`github.com/getsales-io/docs`**,
branch **`main`** (the branch is `main`, not `master` like the rest of the monorepo, because
Mintlify's connect wizard created the repo itself from its template on 2026-11-01 and seeded it
that way). The working copy lives inside the monorepo checkout at `marketing/docs/gs.docs/`,
gitignored by the umbrella repo, so `sync-openapi.sh` keeps working: the monorepo checkout is
its expected home.

The custom domain, the DNS records and the connect-flow gotchas are the same as the reference
brand's: `gtm.ai/marketing/aeo/DOCS_MINTLIFY_RUNBOOK.md`, steps 1 and 5.
