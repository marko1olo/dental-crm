-- 0177_enforce_organizations_rls.sql
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation' AND polrelid = 'organizations'::regclass) THEN
    ALTER POLICY tenant_isolation ON organizations
      USING (
        id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
        OR current_setting('app.superuser_bypass', true) = 'on'
      )
      WITH CHECK (
        id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
      );
  ELSE
    CREATE POLICY tenant_isolation ON organizations
      FOR ALL
      USING (
        id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
        OR current_setting('app.superuser_bypass', true) = 'on'
      )
      WITH CHECK (
        id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
      );
  END IF;
END $$;
