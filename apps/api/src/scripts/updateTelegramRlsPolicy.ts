import { sql } from "drizzle-orm";
import { db } from "../db/client.js";

async function main() {
	await db.execute(sql`
		DROP POLICY IF EXISTS "tenant_isolation" ON "dente_telegram_account_configs";
		CREATE POLICY "tenant_isolation" ON "dente_telegram_account_configs"
			FOR ALL
			TO PUBLIC
			USING (
				current_setting('app.superuser_bypass', true) = 'on'
				OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
			)
			WITH CHECK (
				current_setting('app.superuser_bypass', true) = 'on'
				OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
			);
	`);
	console.log("Successfully updated tenant_isolation policy on dente_telegram_account_configs");
	process.exit(0);
}

main().catch((err) => {
	console.error("Failed to update policy:", err);
	process.exit(1);
});
