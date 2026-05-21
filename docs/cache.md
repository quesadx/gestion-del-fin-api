# Cache (Valkey)

This project uses Valkey (Redis protocol) for cache-aside reads in Tier 1 catalog modules.

## Environment variables

- VALKEY_URL: Connection URL for Valkey. Example: redis://localhost:6379
- CACHE_ENABLED: Optional. Set to false to disable cache explicitly.

Cache is disabled when NODE_ENV is test.

## Local development (Docker)

Start only Valkey:

```bash
docker compose up -d valkey
```

Stop:

```bash
docker compose stop valkey
```

Remove:

```bash
docker compose rm -f valkey
```

## Cache-aside flow

- Reads check Valkey first.
- On miss, the service queries Postgres and stores the result with TTL.
- Writes invalidate related keys so the next read refreshes data.

The cache is fail-open: if Valkey is down, the API continues with DB reads.

## Tier 1 cached data

- roles: role details and paginated list
- permissions: permission details and paginated list
- professions: profession details, paginated list, and profession resource amounts
- resource_types: resource details and paginated list
- camps: camp details, paginated list, and catalog list

## Default TTLs

- roles: 1h
- permissions: 1h
- professions: 6h
- profession resource amounts: 6h
- resource types: 24h
- camps: 1h

## Verify caching

1) Call a cached endpoint twice (example: GET /api/roles).
2) Check keys and TTL in Valkey:

```bash
docker exec -it gestion-del-fin-valkey valkey-cli
KEYS "roles:list:*"
TTL roles:list:1:20
```

If the key exists and TTL > 0, cache is working.
