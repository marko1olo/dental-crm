-- 0231_unify_lab_order_statuses.sql: Unify lab orders status check constraint
-- Supports both legacy pipeline and modern 5-stage / clinical statuses without check constraint violation

ALTER TABLE "lab_orders" DROP CONSTRAINT IF EXISTS "lab_orders_status_check";

ALTER TABLE "lab_orders"
    ADD CONSTRAINT "lab_orders_status_check"
        CHECK (status IN (
            'draft',
            'sent',
            'in_progress',
            'ready',
            'ready_in_clinic',
            'fitting',
            'fitted',
            'refitting',
            'shipped',
            'received',
            'completed',
            'cancelled',
            'rejected_remake'
        ));
