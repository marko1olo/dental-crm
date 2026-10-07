-- 0214 — Исправление политик RLS для dente_vk_bot_configs и dente_vk_user_accounts на PERMISSIVE
-- В PostgreSQL при наличии только RESTRICTIVE политик без PERMISSIVE доступ блокируется полностью.

DROP POLICY IF EXISTS "tenant_isolation" ON "dente_vk_bot_configs";
CREATE POLICY "tenant_isolation" ON "dente_vk_bot_configs"
	AS PERMISSIVE
	FOR ALL
	TO PUBLIC
	USING (
		current_setting('app.superuser_bypass', true) = 'on'
		OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
	)
	WITH CHECK (
		organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
	);

DROP POLICY IF EXISTS "tenant_isolation" ON "dente_vk_user_accounts";
CREATE POLICY "tenant_isolation" ON "dente_vk_user_accounts"
	AS PERMISSIVE
	FOR ALL
	TO PUBLIC
	USING (
		current_setting('app.superuser_bypass', true) = 'on'
		OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
	)
	WITH CHECK (
		organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
	);
