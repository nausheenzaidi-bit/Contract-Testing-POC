import fs from "node:fs";
import path from "node:path";
import { buildClientSchema, getIntrospectionQuery, lexicographicSortSchema, printSchema } from "graphql";

type IntrospectionResponse = {
  data?: unknown;
  errors?: Array<{ message: string }>;
};

const OUT_FILE = path.resolve(process.cwd(), "schema.graphql");

function writeSchemaSDL(sdl: string) {
  fs.writeFileSync(OUT_FILE, sdl.endsWith("\n") ? sdl : `${sdl}\n`, "utf8");
  // eslint-disable-next-line no-console
  console.log(`Wrote schema to ${OUT_FILE}`);
}

async function main() {
  const schemaFile = process.env.SCHEMA_FILE;
  if (schemaFile) {
    const sdl = fs.readFileSync(schemaFile, "utf8");
    writeSchemaSDL(sdl);
    return;
  }

  const schemaUrl =
    process.env.SCHEMA_URL || "http://localhost:5000/sports-federated-api-gw/graphql";

  const introspectionQuery = getIntrospectionQuery({ descriptions: true });

  const res = await fetch(schemaUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // gateway enforces user-agent in some setups; provide one by default
      "user-agent": "frontend-mock-schema-fetch/1.0",
    },
    body: JSON.stringify({ query: introspectionQuery }),
  });

  if (!res.ok) {
    throw new Error(`Failed introspection: HTTP ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as IntrospectionResponse;
  if (json.errors?.length) {
    throw new Error(`Introspection errors: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) {
    throw new Error("Introspection result missing 'data'");
  }

  const schema = buildClientSchema(json.data as any);
  const sorted = lexicographicSortSchema(schema);
  const sdl = printSchema(sorted);
  writeSchemaSDL(sdl);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

