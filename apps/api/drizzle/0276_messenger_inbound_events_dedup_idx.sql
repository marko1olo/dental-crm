CREATE UNIQUE INDEX IF NOT EXISTS "messenger_inbound_events_org_channel_ext_id_uniq" ON "messenger_inbound_events" ("organization_id", "channel", "external_id");
