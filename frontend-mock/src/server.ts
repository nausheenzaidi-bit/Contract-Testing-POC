import fs from "node:fs";
import path from "node:path";
import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { resolvers } from "./resolvers";

const schemaPath = process.env.SCHEMA_PATH || path.resolve(process.cwd(), "schema.graphql");
const typeDefs = fs.readFileSync(schemaPath, "utf8");

async function main() {
  const app = express();
  app.use(express.json());

  const server = new ApolloServer({
    typeDefs,
    resolvers: resolvers as any,
  });

  await server.start();

  app.use("/graphql", expressMiddleware(server));

  const port = Number(process.env.MOCK_PORT || 4000);
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Mock GraphQL ready at http://localhost:${port}/graphql`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

