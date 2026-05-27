import { readFileSync } from "node:fs";

function parseJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

const schemaSource = readFileSync("apps/api/src/db/schema.ts", "utf8");
const commTelegramMigration = readFileSync("apps/api/drizzle/0013_communication_telegram_runtime_tables.sql", "utf8");
const communicationWorkflowMigration = readFileSync("apps/api/drizzle/0016_communication_task_workflow_code.sql", "utf8");
const taxSnapshotMigration = readFileSync("apps/api/drizzle/0011_document_tax_payment_snapshot.sql", "utf8");
const paymentsMigration = readFileSync("apps/api/drizzle/0012_payments_runtime_contract.sql", "utf8");
const structuredFiscalReceiptMigration = readFileSync("apps/api/drizzle/0014_payment_structured_fiscal_receipt.sql", "utf8");
const documentIssueAttestationMigration = readFileSync(
  "apps/api/drizzle/0017_document_issue_attestation_and_release_journal.sql",
  "utf8"
);
const documentVoidAttestationMigration = readFileSync("apps/api/drizzle/0018_document_void_attestation.sql", "utf8");
const documentTaxXmlSnapshotMigration = readFileSync("apps/api/drizzle/0019_document_tax_xml_snapshot.sql", "utf8");
const telegramVisualCardsMigration = readFileSync("apps/api/drizzle/0021_telegram_visual_cards.sql", "utf8");
const telegramPostVisitCheckupDelaysMigration = readFileSync("apps/api/drizzle/0022_telegram_post_visit_checkup_delays.sql", "utf8");
const telegramReviewRequestDelayMigration = readFileSync("apps/api/drizzle/0023_telegram_review_request_delay.sql", "utf8");
const drizzleJournal = parseJsonFile("apps/api/drizzle/meta/_journal.json");
const documentIssueAttestationSnapshot = parseJsonFile("apps/api/drizzle/meta/0017_snapshot.json");
const documentVoidAttestationSnapshot = parseJsonFile("apps/api/drizzle/meta/0018_snapshot.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const requiredSchemaExports = [
  "export const communicationTemplates",
  "export const communicationTasks",
  "export const communicationEvents",
  "export const denteTelegramBotConfigs",
  "export const denteTelegramLinkCodes",
  "export const denteTelegramChatLinks",
  "export const denteTelegramWebhookEvents",
  "export const denteTelegramOutboxDeliveryReceipts",
  "clinicId: uuid(\"clinic_id\").references(() => clinics.id)",
  "botConfigId: text(\"bot_config_id\").notNull().default(\"default\")",
  "tokenSecretRef: text(\"token_secret_ref\")",
  "webhookSecretRef: text(\"webhook_secret_ref\")",
  "chatTransportRef: text(\"chat_transport_ref\")",
  "fiscalReceipt: jsonb(\"fiscal_receipt\").$type<FiscalReceiptDetails | null>()",
  "signatureAttestation: jsonb(\"signature_attestation\").$type<DocumentIssueSignatureAttestation | null>()",
  "voidAttestation: jsonb(\"void_attestation\").$type<DocumentVoidAttestation | null>()",
  "releaseJournalEntry: jsonb(\"release_journal_entry\").$type<DocumentReleaseJournalEntry | null>()",
  "taxXmlSourceSnapshot: jsonb(\"tax_xml_source_snapshot\").$type<TaxXmlSourceSnapshot | null>()",
  "taxXmlSnapshot: jsonb(\"tax_xml_snapshot\").$type<TaxXmlSnapshot | null>()",
  "visualCardUrls: jsonb(\"visual_card_urls\").$type<DenteTelegramVisualCardUrls | null>()",
  "reviewRequestDelayHours: integer(\"review_request_delay_hours\").notNull().default(2)",
  "postVisitCheckupDelayHoursJson: text(\"post_visit_checkup_delay_hours_json\")",
  "voidedAt: timestamp(\"voided_at\", { withTimezone: true })",
  "voidedByUserId: uuid(\"voided_by_user_id\").references(() => users.id)",
  "clientMutationId: text(\"client_mutation_id\").notNull().default(\"\")",
  "workflowCode: text(\"workflow_code\")"
];

for (const needle of requiredSchemaExports) {
  assert(schemaSource.includes(needle), `schema.ts missing runtime DB contract: ${needle}`);
}

const requiredRuntimeTables = [
  "communication_templates",
  "communication_tasks",
  "communication_events",
  "dente_telegram_bot_configs",
  "dente_telegram_link_codes",
  "dente_telegram_chat_links",
  "dente_telegram_webhook_events",
  "dente_telegram_outbox_delivery_receipts"
];

for (const tableName of requiredRuntimeTables) {
  assert(
    commTelegramMigration.includes(`CREATE TABLE IF NOT EXISTS "${tableName}"`),
    `communication/telegram migration missing table ${tableName}`
  );
}

const requiredRuntimeEnums = [
  "communication_channel",
  "communication_intent",
  "communication_status",
  "communication_priority",
  "communication_direction",
  "dente_telegram_bot_mode",
  "dente_telegram_privacy_mode",
  "dente_telegram_subject_type",
  "dente_telegram_link_code_status",
  "dente_telegram_chat_link_status",
  "dente_telegram_update_kind",
  "dente_telegram_webhook_status",
  "dente_telegram_outbox_send_status"
];

for (const enumName of requiredRuntimeEnums) {
  assert(commTelegramMigration.includes(`CREATE TYPE "public"."${enumName}"`), `migration missing enum ${enumName}`);
}

assert(taxSnapshotMigration.includes('"tax_payment_snapshot_json"'), "tax snapshot migration must persist issued tax payment snapshots");
assert(paymentsMigration.includes('"document_id" uuid'), "payments migration must add document_id for fiscal document linking");
assert(paymentsMigration.includes('"payment_method"'), "payments migration must convert method to payment_method enum");
assert(paymentsMigration.includes('"payment_status"'), "payments migration must add payment_status enum");
assert(paymentsMigration.includes('"created_at" timestamp with time zone'), "payments migration must add created_at");
assert(structuredFiscalReceiptMigration.includes('"fiscal_receipt" jsonb'), "structured fiscal receipt migration must persist FN/FD/FPD JSON");
assert(
  documentIssueAttestationMigration.includes('"signature_attestation" jsonb'),
  "document issue migration must persist signature attestation JSON"
);
assert(
  documentIssueAttestationMigration.includes('"release_journal_entry" jsonb'),
  "document issue migration must persist release journal JSON"
);
const documentIssueSnapshotColumns = documentIssueAttestationSnapshot.tables?.["public.generated_documents"]?.columns ?? {};
assert(
  documentIssueSnapshotColumns.signature_attestation?.type === "jsonb",
  "0017 Drizzle snapshot must include generated_documents.signature_attestation jsonb"
);
assert(
  documentIssueSnapshotColumns.release_journal_entry?.type === "jsonb",
  "0017 Drizzle snapshot must include generated_documents.release_journal_entry jsonb"
);
assert(documentVoidAttestationMigration.includes('"void_attestation" jsonb'), "document void migration must persist void attestation JSON");
assert(
  documentVoidAttestationMigration.includes('"voided_at" timestamp with time zone'),
  "document void migration must persist void timestamp"
);
assert(
  documentVoidAttestationMigration.includes('"voided_by_user_id" uuid REFERENCES "users"("id")'),
  "document void migration must persist voiding user"
);
assert(
  documentTaxXmlSnapshotMigration.includes('"tax_xml_source_snapshot" jsonb'),
  "document tax XML snapshot migration must persist source facts JSON"
);
assert(
  documentTaxXmlSnapshotMigration.includes('"tax_xml_snapshot" jsonb'),
  "document tax XML snapshot migration must persist first exported XML JSON"
);
const documentVoidSnapshotColumns = documentVoidAttestationSnapshot.tables?.["public.generated_documents"]?.columns ?? {};
assert(
  documentVoidSnapshotColumns.void_attestation?.type === "jsonb",
  "0018 Drizzle snapshot must include generated_documents.void_attestation jsonb"
);
assert(
  documentVoidSnapshotColumns.voided_at?.type === "timestamp with time zone",
  "0018 Drizzle snapshot must include generated_documents.voided_at"
);
assert(
  documentVoidSnapshotColumns.voided_by_user_id?.type === "uuid",
  "0018 Drizzle snapshot must include generated_documents.voided_by_user_id"
);
assert(communicationWorkflowMigration.includes('"workflow_code" text'), "communication workflow migration must persist stable task workflow codes");
assert(telegramVisualCardsMigration.includes('"visual_card_urls" jsonb'), "telegram visual cards migration must persist scenario visual card URLs");
assert(
  telegramPostVisitCheckupDelaysMigration.includes('"post_visit_checkup_delay_hours_json" text'),
  "telegram checkup delay migration must persist clinic-specific post-visit timing"
);
assert(
  telegramReviewRequestDelayMigration.includes('"review_request_delay_hours" integer'),
  "telegram review request delay migration must persist clinic-specific review timing"
);

const requiredRuntimeMigrationNeedles = [
  '"clinic_id" uuid REFERENCES "clinics"("id")',
  '"bot_config_id" text DEFAULT \'default\' NOT NULL',
  '"token_secret_ref" text',
  '"webhook_secret_ref" text',
  '"chat_transport_ref" text',
  'CREATE UNIQUE INDEX IF NOT EXISTS "dente_telegram_bot_configs_org_default_unique"',
  'CREATE UNIQUE INDEX IF NOT EXISTS "dente_telegram_bot_configs_org_clinic_config_unique"',
  'CREATE UNIQUE INDEX IF NOT EXISTS "dente_telegram_outbox_receipts_org_clinic_bot_item_mutation_unique"',
  'COALESCE("clinic_id", \'00000000-0000-0000-0000-000000000000\'::uuid)'
];

for (const needle of requiredRuntimeMigrationNeedles) {
  assert(commTelegramMigration.includes(needle), `communication/telegram migration missing multi-clinic contract: ${needle}`);
}

const requiredJournalTags = [
  "0005_document_tax_year",
  "0006_document_snapshot_and_fiscal_fields",
  "0007_clinic_legal_and_payer_identity",
  "0008_document_payload_storage",
  "0009_patient_administrative_profile",
  "0010_appointment_assistant_resource",
  "0011_document_tax_payment_snapshot",
  "0012_payments_runtime_contract",
  "0013_communication_telegram_runtime_tables",
  "0014_payment_structured_fiscal_receipt",
  "0016_communication_task_workflow_code",
  "0017_document_issue_attestation_and_release_journal",
  "0018_document_void_attestation",
  "0019_document_tax_xml_snapshot",
  "0021_telegram_visual_cards",
  "0022_telegram_post_visit_checkup_delays",
  "0023_telegram_review_request_delay"
];
const journalTags = new Set(drizzleJournal.entries.map((entry) => entry.tag));

for (const tag of requiredJournalTags) {
  assert(journalTags.has(tag), `drizzle journal missing runtime migration tag: ${tag}`);
}

const forbiddenSecretPatterns = [
  /\b\d{8,12}:AA[A-Za-z0-9_-]{30,}\b/,
  /bot_token\s+(?!secret_ref)/i,
  /telegram_token\s+(?!secret_ref)/i
];

for (const pattern of forbiddenSecretPatterns) {
  assert(!pattern.test(schemaSource), `schema source contains forbidden Telegram secret shape: ${pattern}`);
  assert(!pattern.test(commTelegramMigration), `migration contains forbidden Telegram secret shape: ${pattern}`);
  assert(!pattern.test(communicationWorkflowMigration), `communication workflow migration contains forbidden Telegram secret shape: ${pattern}`);
  assert(!pattern.test(structuredFiscalReceiptMigration), `structured fiscal receipt migration contains forbidden Telegram secret shape: ${pattern}`);
  assert(!pattern.test(documentIssueAttestationMigration), `document issue migration contains forbidden Telegram secret shape: ${pattern}`);
  assert(!pattern.test(documentVoidAttestationMigration), `document void migration contains forbidden Telegram secret shape: ${pattern}`);
  assert(!pattern.test(telegramVisualCardsMigration), `telegram visual cards migration contains forbidden Telegram secret shape: ${pattern}`);
  assert(!pattern.test(telegramReviewRequestDelayMigration), `telegram review request delay migration contains forbidden Telegram secret shape: ${pattern}`);
  assert(!pattern.test(documentTaxXmlSnapshotMigration), `document tax XML snapshot migration contains forbidden Telegram secret shape: ${pattern}`);
  assert(!pattern.test(telegramPostVisitCheckupDelaysMigration), `telegram checkup delay migration contains forbidden Telegram secret shape: ${pattern}`);
}

console.log(
  JSON.stringify({
    ok: true,
    runtimeTables: requiredRuntimeTables.length,
    runtimeEnums: requiredRuntimeEnums.length,
    journalRuntimeMigrations: requiredJournalTags.length,
    secretStorage: "secret_ref_only"
  })
);
