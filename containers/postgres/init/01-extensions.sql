-- Runs once on first container start (empty data volume)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- fast LIKE / fuzzy search
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Sanity check
SELECT 'init complete' AS status;