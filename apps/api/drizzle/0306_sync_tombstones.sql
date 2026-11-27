-- Таблица sync_tombstones для достоверного распространения удалений при догоняющей оффлайн-синхронизации (pullChanges)
CREATE TABLE IF NOT EXISTS "sync_tombstones" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_kind" text NOT NULL,
	"entity_id" text NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_by_user_id" uuid,
	"reason" text,
	CONSTRAINT "sync_tombstones_organization_id_organizations_id_fk"
		FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "sync_tombstones_org_kind_entity_idx"
	ON "sync_tombstones" ("organization_id", "entity_kind", "entity_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "sync_tombstones_org_deleted_id_idx"
	ON "sync_tombstones" ("organization_id", "deleted_at", "id");--> statement-breakpoint

ALTER TABLE "sync_tombstones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sync_tombstones" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "sync_tombstones";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "sync_tombstones"
	USING (
		current_setting('app.superuser_bypass', true) = 'on'
		OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
	)
	WITH CHECK (
		organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
	);--> statement-breakpoint
