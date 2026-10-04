-- Migration 0210: Intercom 2-Way Ack Loop & Dynamic Targeting
-- Adds target_audience and intercom_acks to staff_chat_messages

ALTER TABLE staff_chat_messages
    ADD COLUMN IF NOT EXISTS target_audience text,
    ADD COLUMN IF NOT EXISTS intercom_acks jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS staff_chat_messages_target_audience_idx
    ON staff_chat_messages (organization_id, target_audience)
    WHERE target_audience IS NOT NULL;
