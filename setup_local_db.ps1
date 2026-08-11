$ErrorActionPreference = "Stop"

# This script creates a fresh local dental_crm database, injects the uuidv7 polyfill,
# and synchronizes the schema using drizzle-kit push, bypassing broken migrations.

$env:PGPASSWORD="dental"
$psql = ".\.postgres\bin\psql.exe"

Write-Host "[1/4] Recreating database 'dental_crm'..."
& $psql -U dental -d postgres -c "DROP DATABASE IF EXISTS dental_crm;"
& $psql -U dental -d postgres -c "CREATE DATABASE dental_crm;"

Write-Host "[2/4] Saving uuidv7 polyfill..."
$uuidv7 = @"
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION uuidv7() RETURNS uuid AS `$`$
DECLARE
  v_time timestamp with time zone := clock_timestamp();
  v_unix_t bigint;
  v_bytes bytea;
BEGIN
  v_unix_t := extract(epoch FROM v_time) * 1000;
  v_bytes := decode(lpad(to_hex(v_unix_t), 12, '0'), 'hex') || gen_random_bytes(10);
  v_bytes := set_byte(v_bytes, 6, (get_byte(v_bytes, 6) & 15) | 112);
  v_bytes := set_byte(v_bytes, 8, (get_byte(v_bytes, 8) & 63) | 128);
  RETURN encode(v_bytes, 'hex')::uuid;
END;
`$`$ LANGUAGE plpgsql VOLATILE;
"@

$uuidv7 | Out-File -FilePath uuidv7.sql -Encoding utf8

Write-Host "[3/4] Injecting uuidv7 polyfill into dental_crm..."
& $psql -U dental -d dental_crm -f uuidv7.sql

Write-Host "[4/4] Pushing schema with drizzle-kit..."
Push-Location apps\api
npx drizzle-kit push
Pop-Location

Write-Host "Database setup complete! You can now run the API."
