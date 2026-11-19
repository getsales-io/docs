#!/usr/bin/env node
/**
 * Renders guides/webhook-events.mdx: the payload of every webhook event type, field by field, from
 * the Integrations spec this site renders (api-reference/integrations/openapi.yaml). The source is
 * the body create_webhook's delivery callback POSTs, the WebhookDelivery oneOf, one schema per
 * event type under a discriminator on `type`, every one repeating the same envelope.
 *
 *   node scripts/webhook-events.mjs           write the page
 *   node scripts/webhook-events.mjs --check   change nothing, exit 1 when the page differs
 *
 * sync-openapi.sh runs it after every copy, and with --check in its own --check. The YAML parser
 * is the one the specs are written with (product/mcp/gs.mcp/packages/openapi), so, like
 * sync-openapi.sh, this expects the docs repo inside the getsales.io monorepo at
 * marketing/docs/gs.docs. A shape the page cannot render stops it with an error, never a guess.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DOCS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = "api-reference/integrations/openapi.yaml";
const PAGE = "guides/webhook-events.mdx";
const YAML_OWNER = path.resolve(DOCS_DIR, "../../../product/mcp/gs.mcp/packages/openapi/package.json");
const UNION = "WebhookDelivery";

function fail(message) {
  console.error(`webhook-events: ${message}`);
  process.exit(1);
}

function loadYaml() {
  if (!existsSync(YAML_OWNER)) {
    fail(`not found: ${YAML_OWNER} (the docs repo is expected inside the getsales.io monorepo at marketing/docs/gs.docs)`);
  }
  try {
    return createRequire(YAML_OWNER)("yaml");
  } catch {
    fail("the yaml package is missing: run pnpm install in product/mcp/gs.mcp");
  }
}

/** Text for an MDX table cell: one line, no bare pipe, nothing MDX would read as JSX or an expression. */
function cell(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/(`[^`]*`)/)
    .map((part, i) =>
      i % 2 === 1
        ? part.replace(/\|/g, "\\|")
        : part
            .replace(/\\/g, "\\\\")
            .replace(/\|/g, "\\|")
            .replace(/\*/g, "\\*")
            .replace(/[{}]/g, (c) => `\\${c}`)
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;"),
    )
    .join("");
}

const code = (value) => `\`${value}\``;

function main() {
  const check = process.argv.includes("--check");
  const { parse } = loadYaml();
  const schemas = parse(readFileSync(path.join(DOCS_DIR, SPEC), "utf8"))?.components?.schemas ?? {};

  const deref = (schema, where) => {
    if (!schema || typeof schema !== "object") fail(`${where}: not a schema`);
    if (!schema.$ref) return schema;
    const name = schema.$ref.replace("#/components/schemas/", "");
    if (!schemas[name]) fail(`${where}: unknown $ref ${schema.$ref}`);
    return schemas[name];
  };

  const union = schemas[UNION];
  if (!Array.isArray(union?.oneOf) || union.oneOf.length === 0) fail(`${SPEC}: ${UNION} is not a oneOf`);

  const events = union.oneOf.map((ref, i) => {
    const variant = deref(ref, `${UNION}.oneOf[${i}]`);
    const type = variant.properties?.type?.enum;
    if (!Array.isArray(type) || type.length !== 1) fail(`${UNION}.oneOf[${i}]: its type is not one constant`);
    const payload = deref(variant.properties?.payload, `${type[0]}.payload`);
    if (payload.type !== "object" || !payload.properties) fail(`${type[0]}: its payload is not an object with properties`);
    return { type: type[0], description: variant.description ?? "", variant, payload };
  });

  // The page prints the envelope once, so every variant must carry the same one, field for field.
  const envelopeOf = ({ properties, required }) => {
    const { type, payload, ...fields } = properties;
    return JSON.stringify({ fields, required: [...(required ?? [])].sort() });
  };
  for (const event of events) {
    if (envelopeOf(event.variant) !== envelopeOf(events[0].variant)) {
      fail(`${event.type}: its envelope differs from the one of ${events[0].type}`);
    }
  }

  const typeName = (schema, where) => {
    const s = deref(schema, where);
    const types = Array.isArray(s.type) ? s.type : s.type ? [s.type] : [];
    const nullable = s.nullable === true || types.includes("null");
    const base = types.filter((t) => t !== "null");
    if (base.length > 1) fail(`${where}: more than one type (${base.join(", ")})`);
    let name = base[0] ?? (nullable ? "null" : "any");
    if (name === "array") name = `array of ${typeName(s.items ?? {}, `${where}[]`)}`;
    return nullable && name !== "null" ? `${name} or null` : name;
  };

  const enumText = (values, lead) => {
    const listed = (values ?? []).filter((v) => v !== null);
    if (listed.length === 0) return "";
    if (listed.length === 1) return `${lead ? `${lead} always` : "Always"} ${code(listed[0])}.`;
    return `${lead ? `${lead} one of` : "One of"} ${listed.map(code).join(", ")}.`;
  };

  const describe = (schema, where) => {
    const s = deref(schema, where);
    const parts = [s.description ?? "", enumText(s.enum)];
    if (s.items) parts.push(enumText(deref(s.items, `${where}[]`).enum, "Each item is"));
    return cell(parts.filter(Boolean).join(" "));
  };

  const row = (field, schema, required, where) =>
    `| ${code(field)} | ${typeName(schema, where)}${required ? "" : ", optional"} | ${describe(schema, where)} |`;

  const rows = (schema, prefix, where) => {
    const s = deref(schema, where);
    const required = new Set(s.required ?? []);
    const out = [];
    for (const [key, child] of Object.entries(s.properties ?? {})) {
      const at = `${where}.${key}`;
      const c = deref(child, at);
      out.push(row(`${prefix}${key}`, c, required.has(key), at));
      if (c.properties) out.push(...rows(c, `${prefix}${key}.`, at));
      const items = c.items ? deref(c.items, `${at}[]`) : null;
      if (items?.properties) out.push(...rows(items, `${prefix}${key}[].`, `${at}[]`));
    }
    return out;
  };

  const table = (lines) => ["| Field | Type | Description |", "| --- | --- | --- |", ...lines].join("\n");

  const first = events[0].variant;
  const firstRequired = new Set(first.required ?? []);
  const envelope = Object.entries(first.properties).map(([key, child]) => {
    if (key === "type") {
      return `| ${code("type")} | string | The event type, one of the ${events.length} below (also the X-Webhook-Event header). |`;
    }
    if (key === "payload") return `| ${code("payload")} | object | The event's own fields, listed below for each type. |`;
    return row(key, deref(child, `envelope.${key}`), firstRequired.has(key), `envelope.${key}`);
  });

  const summary = [
    "| Event | What happened | Payload fields |",
    "| --- | --- | --- |",
    ...events.map((e) => `| ${code(e.type)} | ${cell(e.description)} | ${Object.keys(e.payload.properties).map(code).join(", ")} |`),
  ];

  const families = [];
  for (const event of events) {
    const name = event.type.split(".")[0];
    let family = families.find((f) => f.name === name);
    if (!family) families.push((family = { name, events: [] }));
    family.events.push(event);
  }
  const sections = families.flatMap((family) => [
    `## ${family.name}`,
    // The payload's own description, when the spec gives one, says when the event is sent.
    ...family.events.flatMap((e) => [
      `### ${e.type}`,
      cell(e.description),
      ...(e.payload.description ? [cell(e.payload.description)] : []),
      table(rows(e.payload, "", e.type)),
    ]),
  ]);

  const frontmatter = [
    "---",
    'title: "Webhook events"',
    `description: "The payload of every event type GetSales delivers to a webhook, field by field: ${events.length} types, one table each."`,
    "---",
  ].join("\n");
  const body = [
    `{/* Generated by scripts/webhook-events.mjs from ${SPEC}, which sync-openapi.sh runs after every copy. Do not edit this page by hand: change the spec upstream, then sync. */}`,
    `Every delivery is the same envelope, with the event's own fields under \`payload\`. This page lists those fields for each of the ${events.length} event types. How a delivery is signed, retried, logged and replayed is in [Receive webhooks](/guides/receive-webhooks), and the same bodies, as schemas, are in the Callbacks block of [create-webhook](/api-reference/integrations/webhooks/create-webhook).`,
    "A field is on every delivery of its event unless its type says optional, and a field with no value arrives as `null`. A nested field is written with its path, as in `created_by.actor_type`.",
    "## The envelope",
    table(envelope),
    "## All events",
    summary.join("\n"),
    ...sections,
  ].join("\n\n");
  const page = `${frontmatter}\n\n${body}\n`;

  const target = path.join(DOCS_DIR, PAGE);
  if (check) {
    const current = existsSync(target) ? readFileSync(target, "utf8") : "";
    if (current !== page) {
      console.error(`DRIFT: ${PAGE} is not what scripts/webhook-events.mjs renders from ${SPEC}; run ./sync-openapi.sh`);
      process.exit(1);
    }
    console.log(`${PAGE} matches ${SPEC}`);
    return;
  }
  writeFileSync(target, page);
  console.log(`rendered ${PAGE} (${events.length} event types)`);
}

main();
