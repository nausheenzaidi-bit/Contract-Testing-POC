# Microcks Mock Server

Primary mock server platform for the StatsAPI GraphQL service.

## Quick Start (dev mode, no auth)

```bash
cd microcks-server
docker compose -f docker-compose-devmode.yml up -d
# Wait ~30s for startup, then import artifacts:
./scripts/import-artifacts.sh
# Run smoke tests:
./scripts/smoke-test.sh
```

UI: http://localhost:8585  
GraphQL endpoint: http://localhost:8585/graphql/StatsAPI/1.0

## Full Mode (with Keycloak SSO)

```bash
docker compose up -d
# UI: http://localhost:8080  (login: admin / microcks123)
# Import artifacts against port 8080:
./scripts/import-artifacts.sh http://localhost:8080
```

## Folder Structure

```
microcks-server/
  docker-compose.yml            Full stack (Microcks + Keycloak + MongoDB)
  docker-compose-devmode.yml    Lightweight dev mode (no auth)
  config/
    application.properties      Microcks config overrides
    keycloak-realm.json         Keycloak realm for full mode
  artifacts/
    schema.graphql              GraphQL schema with microcksId comment
    mock-examples.postman.json  Postman Collection with mock scenarios
  scripts/
    import-artifacts.sh         Upload schema + examples via Microcks API
    smoke-test.sh               Verify GraphQL mock endpoint
```

## How It Works

1. Microcks imports `schema.graphql` as the primary artifact (defines types + operations)
2. The Postman Collection provides example request/response pairs per operation
3. Incoming queries are matched by operation name; Microcks applies GraphQL field filtering
4. Variable-based dispatching routes to the correct scenario

## Stopping

```bash
docker compose -f docker-compose-devmode.yml down
# or for full mode:
docker compose down
```

To also remove data volumes:

```bash
docker compose -f docker-compose-devmode.yml down -v
```
