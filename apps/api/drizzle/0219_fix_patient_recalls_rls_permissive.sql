-- 0219 — Исправление политики RLS для patient_recalls на PERMISSIVE
DROP POLICY IF EXISTS "tenant_isolation" ON "patient_recalls";
CREATE POLICY "tenant_isolation" ON "patient_recalls"
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
