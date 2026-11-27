-- 0307_sberbank_transactions_unique_org_order.sql
-- [BUG-02] Enforce UNIQUE (organization_id, order_id) on sberbank_transactions
-- after deterministic deduplication of any legacy duplicate rows.
-- [BUG-03] Add per-clinic acquiring webhook secret columns on organizations.

DELETE FROM "sberbank_transactions" st
WHERE st.id IN (
	SELECT id FROM (
		SELECT id,
			ROW_NUMBER() OVER (
				PARTITION BY organization_id, order_id
				ORDER BY
					CASE LOWER(status)
						WHEN 'refunded' THEN 5
						WHEN 'reversed' THEN 5
						WHEN 'settled' THEN 4
						WHEN 'success' THEN 4
						WHEN 'paid' THEN 4
						WHEN 'approved' THEN 3
						WHEN 'authorized' THEN 3
						WHEN 'pending' THEN 2
						ELSE 1
					END DESC,
					COALESCE(updated_at, created_at) DESC,
					created_at DESC,
					id DESC
			) AS rn
		FROM "sberbank_transactions"
	) ranked
	WHERE ranked.rn > 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sberbank_transactions_org_order_id_uidx"
	ON "sberbank_transactions" ("organization_id", "order_id");
--> statement-breakpoint
ALTER TABLE "organizations"
	ADD COLUMN IF NOT EXISTS "sberbank_webhook_secret" text,
	ADD COLUMN IF NOT EXISTS "sbp_webhook_secret" text,
	ADD COLUMN IF NOT EXISTS "sber_pos_webhook_secret" text;
