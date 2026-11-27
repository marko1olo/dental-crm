import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PassThrough, Readable } from "node:stream";
import { after, before, describe, it } from "node:test";
import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import pg from "pg";
import { pool, requireDatabaseUrl } from "../db/client.js";
import * as schema from "../db/schema/index.js";
import { extractDocument } from "../ingestion/documentExtractor.js";
import { ZipBombLimitError, ByteLimitTransform } from "../ingestion/docExtractor/zipReader.js";
import { buildXlsxFile } from "../migration/tests/fixtures.js";
import { streamXlsxSheetBatches } from "../migration/parsers/spreadsheet.js";
import { streamWorksheetRowXml } from "../migration/parsers/streamingXmlRowScanner.js";
import { registerSettingsRoutes } from "../routes/settings/index.js";
import {
	EXPLICIT_NON_TENANT_TABLES,
	buildSchemaBackupDag,
} from "../services/backup/schemaBackupRegistry.js";
import { restoreTenantSnapshotStreaming } from "../services/backup/streamingSnapshotRestorer.js";
import {
	BACKUP_V2_GCM_TAG_LEN,
	BACKUP_V2_HEADER_LEN,
	createTenantEncryptedBackup,
} from "../services/backup/tenantSnapshotSerializer.js";
import { resolveEncryptionKey } from "../services/backup/backupCryptoUtils.js";
import { restoreVerifiedDumpToPostgres } from "../scripts/restoreDisasterRecovery.js";
import { createZipArchiveAsync } from "../routes/mobileOta.js";
import { authTokenSecret } from "../security/authSecret.js";
import {
	CLINIC_TOKEN_HEADER,
	STAFF_TOKEN_HEADER,
	invalidateStaffSessionCache,
} from "../security/identity.js";
import { signToken } from "../utils/cryptoHelper.js";
import { fixtureUuid, purgeFixtureOrganizations } from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const TEST_ENCRYPTION_KEY = "backup-parity-test-key-32-bytes!!";
const TEST_PARITY_ORG_ID = fixtureUuid("backupSchemaParity", 1);

function authHeaders(
	orgId: string,
	userId: string,
	role = "owner",
	sessionId = crypto.randomUUID(),
): Record<string, string> {
	const secret = authTokenSecret();
	return {
		[CLINIC_TOKEN_HEADER]: signToken({ organizationId: orgId }, secret, 3600),
		[STAFF_TOKEN_HEADER]: signToken(
			{
				organizationId: orgId,
				userId,
				role,
				sessionId,
			},
			secret,
			3600,
		),
	};
}

describe("Backup Schema Parity (195+ tables), DENTETB2 Streaming & Streaming Parsers", () => {
	let prevEncryptionKey: string | undefined;
	let tempDir: string;

	before(async () => {
		prevEncryptionKey = process.env.CLINIC_ENCRYPTION_KEY;
		process.env.CLINIC_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
		tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "dente-backup-parity-"));
		await purgeFixtureOrganizations([TEST_PARITY_ORG_ID]);
	});

	after(async () => {
		if (prevEncryptionKey === undefined) delete process.env.CLINIC_ENCRYPTION_KEY;
		else process.env.CLINIC_ENCRYPTION_KEY = prevEncryptionKey;

		await purgeFixtureOrganizations([TEST_PARITY_ORG_ID]);
		await fsp.rm(tempDir, { recursive: true, force: true });
	});

	it("1. 100% parity between Drizzle schema pgTables and schemaBackupRegistry DAG", () => {
		const uniqueSchemaTables = new Set<string>();
		for (const val of Object.values(schema)) {
			if (is(val, PgTable)) {
				uniqueSchemaTables.add(getTableConfig(val).name);
			}
		}

		const dag = buildSchemaBackupDag();
		assert.strictEqual(dag.allSchemaTablesCount, uniqueSchemaTables.size);
		assert.strictEqual(
			dag.orderedTables.length + EXPLICIT_NON_TENANT_TABLES.size,
			uniqueSchemaTables.size,
			"Every pgTable in schema must be either in orderedTables or EXPLICIT_NON_TENANT_TABLES",
		);

		// Проверяем присутствие ключевых боевых таблиц, ранее терявшихся в старом бэкапе
		const criticalTables = [
			"organizations",
			"users",
			"patients",
			"family_groups",
			"appointments",
			"visits",
			"treatment_plans",
			"treatment_plan_stages",
			"treatment_items",
			"patient_invoices",
			"invoice_items",
			"payments",
			"cash_boxes",
			"cash_box_shifts",
			"cash_operations",
			"installment_contracts",
			"installment_tranches",
			"periodontogram_snapshots",
			"periodontogram_teeth",
			"periodontogram_sites",
			"doctor_payroll_statements",
			"stock_batches",
			"procedure_tech_cards",
			"procedure_tech_card_items",
			"warranty_certificates",
			"lab_orders",
			"generated_documents",
			"document_signatures",
			"copilot_sessions",
			"copilot_messages",
		];
		for (const tbl of criticalTables) {
			assert.ok(dag.bySqlName.has(tbl), `Critical table "${tbl}" missing from backup DAG`);
		}

		// Проверяем корректность топологического порядка (родители строго до детей)
		const orderIndex = new Map<string, number>();
		dag.orderedTables.forEach((t, idx) => orderIndex.set(t.sqlName, idx));

		assert.strictEqual(orderIndex.get("organizations"), 0);
		assert.ok((orderIndex.get("users") ?? 999) < (orderIndex.get("appointments") ?? 0));
		assert.ok((orderIndex.get("patients") ?? 999) < (orderIndex.get("patient_invoices") ?? 0));
		assert.ok((orderIndex.get("patient_invoices") ?? 999) < (orderIndex.get("invoice_items") ?? 0));
		assert.ok(
			(orderIndex.get("periodontogram_snapshots") ?? 999) <
				(orderIndex.get("periodontogram_teeth") ?? 0),
		);
		assert.ok(
			(orderIndex.get("periodontogram_teeth") ?? 999) <
				(orderIndex.get("periodontogram_sites") ?? 0),
		);
		assert.ok(
			(orderIndex.get("generated_documents") ?? 999) <
				(orderIndex.get("document_signatures") ?? 0),
		);

		// Проверяем наличие отложенных колонок для self-FK и 2-узлового цикла
		assert.ok(
			dag.bySqlName.get("patients")?.deferredNullableColumns.includes("merged_into_patient_id"),
		);
		assert.ok(
			dag.bySqlName.get("lab_orders")?.deferredNullableColumns.includes("parent_lab_order_id"),
		);
		const visitsDeferred = dag.bySqlName.get("visits")?.deferredNullableColumns ?? [];
		const apptsDeferred = dag.bySqlName.get("appointments")?.deferredNullableColumns ?? [];
		assert.ok(
			visitsDeferred.includes("appointment_id") ||
				apptsDeferred.includes("rebooking_source_visit_id"),
			"2-node cycle visits <-> appointments must be broken via deferredNullableColumns",
		);
	});

	it("2. Live PG18 DENTETB2 round-trip: preserves auth hashes, self-FK, 2-node cycles, child tables, and rolls back on tamper", async () => {
		const orgId = TEST_PARITY_ORG_ID;

		const clinicId = crypto.randomUUID();
		const chairId = crypto.randomUUID();
		const userId = crypto.randomUUID();
		const patientPrimaryId = crypto.randomUUID();
		const patientMergedId = crypto.randomUUID();
		const familyGroupId = crypto.randomUUID();
		const appt1Id = crypto.randomUUID();
		const appt2Id = crypto.randomUUID();
		const visit1Id = crypto.randomUUID();
		const planId = crypto.randomUUID();
		const stageId = crypto.randomUUID();
		const invoiceId = crypto.randomUUID();
		const invoiceItemId = crypto.randomUUID();
		const cashBoxId = crypto.randomUUID();
		const shiftId = crypto.randomUUID();
		const cashOpId = crypto.randomUUID();
		const perioSnapshotId = crypto.randomUUID();
		const perioToothId = crypto.randomUUID();
		const perioSiteId = crypto.randomUUID();
		const labParentId = crypto.randomUUID();
		const labReworkId = crypto.randomUUID();
		const genDocId = crypto.randomUUID();
		const docSigId = crypto.randomUUID();

		const orgLoginId = `clinic_${orgId.slice(0, 8)}`;
		const orgPasswordHash = "$argon2id$v=19$m=65536,t=3,p=1$orgsalthash1234567890";
		const userPasswordHash = "$argon2id$v=19$m=65536,t=3,p=1$usersalthash1234567890";
		const userPinCodeHash = "pbkdf2:10000:pinhashvalue000111222";
		const initialSessionId = crypto.randomUUID();

		// Засеваем реальные связанные строки во все критические категории таблиц
		const setupClient = await pool.connect();
		try {
			await setupClient.query("BEGIN");
			await setupClient.query(
				"SELECT set_config('app.current_tenant', $1, true), set_config('app.superuser_bypass', 'off', true)",
				[orgId],
			);

			await setupClient.query(
				`INSERT INTO organizations (id, name, login_id, password_hash, inn, ogrn)
				 VALUES ($1, $2, $3, $4, '7701234567', '1237700123456')
				 ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, login_id = EXCLUDED.login_id, password_hash = EXCLUDED.password_hash`,
				[orgId, "Клиника Тест DR", orgLoginId, orgPasswordHash],
			);

			await setupClient.query(
				`INSERT INTO clinics (id, organization_id, name, timezone) VALUES ($1, $2, 'Главный филиал', 'Europe/Samara')`,
				[clinicId, orgId],
			);

			await setupClient.query(
				`INSERT INTO chairs (id, organization_id, clinic_id, name) VALUES ($1, $2, $3, 'Кресло 1')`,
				[chairId, orgId, clinicId],
			);

			await setupClient.query(
				`INSERT INTO users (id, organization_id, full_name, role, password_hash, pin_code_hash, current_session_id, specialties)
				 VALUES ($1, $2, 'Барабаш Сергей Викторович', 'owner', $3, $4, $5, '["therapy","surgery"]'::jsonb)`,
				[userId, orgId, userPasswordHash, userPinCodeHash, initialSessionId],
			);

			await setupClient.query(
				`INSERT INTO family_groups (id, organization_id, name) VALUES ($1, $2, 'Семья Смирновых')`,
				[familyGroupId, orgId],
			);

			await setupClient.query(
				`INSERT INTO patients (id, organization_id, full_name, phone, family_group_id)
				 VALUES ($1, $2, 'Смирнова Елена Алексеевна', '+79001112233', $3)`,
				[patientPrimaryId, orgId, familyGroupId],
			);

			// Self-FK: merged_into_patient_id -> patientPrimaryId
			await setupClient.query(
				`INSERT INTO patients (id, organization_id, full_name, phone, merged_into_patient_id)
				 VALUES ($1, $2, 'Смирнова Е.А. (дубль)', '+79001112234', $3)`,
				[patientMergedId, orgId, patientPrimaryId],
			);

			await setupClient.query(
				`UPDATE family_groups SET head_patient_id = $1 WHERE id = $2 AND organization_id = $3`,
				[patientPrimaryId, familyGroupId, orgId],
			);

			// 2-узловой цикл: appointments <-> visits
			await setupClient.query(
				`INSERT INTO appointments (id, organization_id, chair_id, patient_id, doctor_user_id, starts_at, ends_at, status)
				 VALUES ($1, $2, $3, $4, $5, '2026-11-26T09:00:00Z', '2026-11-26T10:00:00Z', 'completed')`,
				[appt1Id, orgId, chairId, patientPrimaryId, userId],
			);

			await setupClient.query(
				`INSERT INTO visits (id, organization_id, patient_id, appointment_id, status)
				 VALUES ($1, $2, $3, $4, 'signed')`,
				[visit1Id, orgId, patientPrimaryId, appt1Id],
			);

			await setupClient.query(
				`INSERT INTO appointments (id, organization_id, chair_id, patient_id, doctor_user_id, starts_at, ends_at, status, rebooking_source_visit_id)
				 VALUES ($1, $2, $3, $4, $5, '2026-12-03T09:00:00Z', '2026-12-03T10:00:00Z', 'planned', $6)`,
				[appt2Id, orgId, chairId, patientPrimaryId, userId, visit1Id],
			);

			// Планы лечения и этапы
			await setupClient.query(
				`INSERT INTO treatment_plans (id, organization_id, patient_id, doctor_id, name, title, total_price_kopecks)
				 VALUES ($1, $2, $3, $4, 'Комплексная санация', 'Комплексная санация', 450000)`,
				[planId, orgId, patientPrimaryId, userId],
			);
			await setupClient.query(
				`INSERT INTO treatment_plan_stages (id, organization_id, plan_id, stage_order, stage_name)
				 VALUES ($1, $2, $3, 1, 'Терапия')`,
				[stageId, orgId, planId],
			);

			// Счета + invoice_items + кассы
			await setupClient.query(
				`INSERT INTO patient_invoices (id, organization_id, patient_id, visit_id, total_rub, total_amount_rub, total_price_kopecks, status)
				 VALUES ($1, $2, $3, $4, 4500, 4500, 450000, 'paid')`,
				[invoiceId, orgId, patientPrimaryId, visit1Id],
			);
			await setupClient.query(
				`INSERT INTO invoice_items (id, organization_id, invoice_id, name, quantity, unit_price_kopecks, total_price_kopecks)
				 VALUES ($1, $2, $3, 'Лечение кариеса 16', 1, 450000, 450000)`,
				[invoiceItemId, orgId, invoiceId],
			);

			await setupClient.query(
				`INSERT INTO cash_boxes (id, organization_id, name, type, balance_kopecks)
				 VALUES ($1, $2, 'Основная касса', 'main', 450000)`,
				[cashBoxId, orgId],
			);
			await setupClient.query(
				`INSERT INTO cash_box_shifts (id, organization_id, cash_box_id, opened_by_user_id, start_balance_kopecks)
				 VALUES ($1, $2, $3, $4, 0)`,
				[shiftId, orgId, cashBoxId, userId],
			);
			await setupClient.query(
				`INSERT INTO cash_operations (id, organization_id, cash_box_id, shift_id, operation_type, amount_rub, amount_kopecks, balance_before_rub, balance_before_kopecks, balance_after_rub, balance_after_kopecks, operator_id, reason_text)
				 VALUES ($1, $2, $3, $4, 'income', 4500, 450000, 0, 0, 4500, 450000, $5, 'Оплата счёта')`,
				[cashOpId, orgId, cashBoxId, shiftId, userId],
			);

			// TENANT_OWNED_CHILD цепочка: periodontogram_snapshots -> teeth -> sites
			await setupClient.query(
				`INSERT INTO periodontogram_snapshots (id, organization_id, patient_id, recorded_by_user_id)
				 VALUES ($1, $2, $3, $4)`,
				[perioSnapshotId, orgId, patientPrimaryId, userId],
			);
			await setupClient.query(
				`INSERT INTO periodontogram_teeth (id, snapshot_id, tooth_number) VALUES ($1, $2, 16)`,
				[perioToothId, perioSnapshotId],
			);
			await setupClient.query(
				`INSERT INTO periodontogram_sites (id, snapshot_id, tooth_id, tooth_number, site_code, probing_depth_mm)
				 VALUES ($1, $2, $3, 16, 'MB', 3)`,
				[perioSiteId, perioSnapshotId, perioToothId],
			);

			// Self-FK: lab_orders.parent_lab_order_id -> lab_orders.id
			await setupClient.query(
				`INSERT INTO lab_orders (id, organization_id, patient_id, doctor_id, secure_token, laboratory_name, material, price_kopecks)
				 VALUES ($1, $2, $3, $4, $5, 'ЗТЛ Элит', 'Коронка ZrO2', 1200000)`,
				[labParentId, orgId, patientPrimaryId, userId, `tok_${labParentId.slice(0, 8)}`],
			);
			await setupClient.query(
				`INSERT INTO lab_orders (id, organization_id, patient_id, doctor_id, secure_token, laboratory_name, material, price_kopecks, parent_lab_order_id)
				 VALUES ($1, $2, $3, $4, $5, 'ЗТЛ Элит', 'Коррекция по гарантии', 0, $6)`,
				[labReworkId, orgId, patientPrimaryId, userId, `tok_${labReworkId.slice(0, 8)}`, labParentId],
			);

			// Документ и подпись (FK document_signatures.document_id -> generated_documents.id)
			await setupClient.query(
				`INSERT INTO generated_documents (id, organization_id, patient_id, visit_id, kind, title, status, issued_snapshot_sha256)
				 VALUES ($1, $2, $3, $4, 'informed_consent', 'Информированное согласие', 'issued', 'abc123')`,
				[genDocId, orgId, patientPrimaryId, visit1Id],
			);
			await setupClient.query(
				`INSERT INTO document_signatures (id, organization_id, document_id, patient_id, signer_name, document_sha256)
				 VALUES ($1, $2, $3, $4, 'Смирнова Е.А.', 'abc123')`,
				[docSigId, orgId, genDocId, patientPrimaryId],
			);

			await setupClient.query("COMMIT");
		} finally {
			setupClient.release();
		}

		// 1. Создаём DR-бэкап DENTETB2
		const backupRes = await createTenantEncryptedBackup(orgId, { backupDir: tempDir });
		assert.strictEqual(backupRes.success, true, backupRes.error);
		assert.ok(backupRes.filePath);
		const archivePath = backupRes.filePath;

		const archiveBytes = await fsp.readFile(archivePath);
		assert.ok(archiveBytes.length > BACKUP_V2_HEADER_LEN + BACKUP_V2_GCM_TAG_LEN);
		assert.strictEqual(archiveBytes.subarray(0, 8).toString("ascii"), "DENTETB2");

		// 2. Повреждаем 1 байт зашифрованного тела и проверяем откат транзакции (Anti-Doom!)
		const tamperedPath = path.join(tempDir, "tampered_body.dentalbackup");
		const tamperedBytes = Buffer.from(archiveBytes);
		const flipPos = BACKUP_V2_HEADER_LEN + 10;
		tamperedBytes[flipPos] = (tamperedBytes[flipPos] ?? 0) ^ 0xff;
		await fsp.writeFile(tamperedPath, tamperedBytes);

		const tamperedTagPath = path.join(tempDir, "tampered_tag.dentalbackup");
		const tamperedTagBytes = Buffer.from(archiveBytes);
		const tagFlipPos = tamperedTagBytes.length - 2;
		tamperedTagBytes[tagFlipPos] = (tamperedTagBytes[tagFlipPos] ?? 0) ^ 0xff;
		await fsp.writeFile(tamperedTagPath, tamperedTagBytes);

		const keyRes = resolveEncryptionKey();
		assert.ok("key" in keyRes);

		const restoreClient = new pg.Client({ connectionString: requireDatabaseUrl() });
		await restoreClient.connect();
		try {
			await assert.rejects(
				() =>
					restoreTenantSnapshotStreaming({
						archivePath: tamperedPath,
						encryptionKey32Bytes: keyRes.key,
						expectedOrganizationId: orgId,
						pgClient: restoreClient,
						tempDir,
					}),
				/Unsupported state|unable to authenticate|incorrect header|invalid/i,
			);

			// Повреждение только 16B GCM AuthTag в хвосте (после валидного gzip-потока!)
			// также ОБЯЗАНО откатить транзакцию ДО COMMIT (Anti-Cryptographic-Doom)
			await assert.rejects(
				() =>
					restoreTenantSnapshotStreaming({
						archivePath: tamperedTagPath,
						encryptionKey32Bytes: keyRes.key,
						expectedOrganizationId: orgId,
						pgClient: restoreClient,
						tempDir,
					}),
				/Unsupported state|unable to authenticate/i,
			);

			// Проверяем, что данные в БД НЕ удалены и НЕ частично перезаписаны после ROLLBACK!
			await restoreClient.query("BEGIN");
			await restoreClient.query(
				"SELECT set_config('app.current_tenant', $1, true), set_config('app.superuser_bypass', 'off', true)",
				[orgId],
			);
			const intactCheck = await restoreClient.query<{ cnt: string }>(
				"SELECT count(*)::text AS cnt FROM periodontogram_sites WHERE id = $1",
				[perioSiteId],
			);
			await restoreClient.query("COMMIT");
			assert.strictEqual(intactCheck.rows[0]?.cnt, "1", "Rollback must preserve existing data on GCM failure");

			// 3. Также проверяем подмену чужим expectedOrganizationId
			await assert.rejects(
				() =>
					restoreTenantSnapshotStreaming({
						archivePath,
						encryptionKey32Bytes: keyRes.key,
						expectedOrganizationId: crypto.randomUUID(),
						pgClient: restoreClient,
						tempDir,
					}),
				/Tenant mismatch/i,
			);

			// 4. Уничтожаем ВСЕ переписываемые данные клиники (сохраняя append-only WORM-аудит ФСТЭК-21 по логике restorer'а)
			const dag = buildSchemaBackupDag();
			await restoreClient.query("BEGIN");
			await restoreClient.query(
				"SELECT set_config('app.current_tenant', $1, true), set_config('app.superuser_bypass', 'off', true)",
				[orgId],
			);
			for (const meta of dag.orderedTables) {
				if (meta.isAppendOnly) continue;
				const clearSql = meta.buildClearDeferredSql();
				if (clearSql) await restoreClient.query(clearSql, [orgId]);
			}
			for (const meta of [...dag.orderedTables].reverse()) {
				if (meta.sqlName === "organizations" || meta.isAppendOnly) continue;
				if (meta.sqlName === "users") {
					await restoreClient.query(
						`DELETE FROM "public"."users" AS u WHERE u."organization_id" = $1 AND NOT EXISTS (SELECT 1 FROM "public"."audit_events" AS ae WHERE ae."actor_user_id" = u."id")`,
						[orgId],
					);
					continue;
				}
				if (meta.kind === "TENANT_OWNED_DIRECT") {
					await restoreClient.query(`DELETE FROM "public"."${meta.sqlName}" WHERE "organization_id" = $1`, [orgId]);
				} else {
					await restoreClient.query(meta.buildDeleteChildSql(), [orgId]);
				}
			}
			await restoreClient.query(
				"UPDATE organizations SET login_id = 'wiped', password_hash = 'wiped' WHERE id = $1",
				[orgId],
			);
			await restoreClient.query("COMMIT");

			const restored = await restoreTenantSnapshotStreaming({
				archivePath,
				encryptionKey32Bytes: keyRes.key,
				expectedOrganizationId: orgId,
				pgClient: restoreClient,
				tempDir,
			});
			assert.strictEqual(restored.format, "DENTETB2");
			assert.ok(restored.restoredTables >= 15);
			assert.ok(restored.restoredRows >= 20);

			// Сверяем восстановленные данные 1:1
			await restoreClient.query("BEGIN");
			await restoreClient.query(
				"SELECT set_config('app.current_tenant', $1, true), set_config('app.superuser_bypass', 'off', true)",
				[orgId],
			);
			const orgCheck = await restoreClient.query<{ login_id: string; password_hash: string }>(
				"SELECT login_id, password_hash FROM organizations WHERE id = $1",
				[orgId],
			);
			assert.strictEqual(orgCheck.rows[0]?.login_id, orgLoginId);
			assert.strictEqual(orgCheck.rows[0]?.password_hash, orgPasswordHash);

			const userCheck = await restoreClient.query<{
				password_hash: string;
				pin_code_hash: string;
				current_session_id: string | null;
			}>(
				"SELECT password_hash, pin_code_hash, current_session_id FROM users WHERE id = $1",
				[userId],
			);
			assert.strictEqual(userCheck.rows[0]?.password_hash, userPasswordHash);
			assert.strictEqual(userCheck.rows[0]?.pin_code_hash, userPinCodeHash);
			assert.strictEqual(userCheck.rows[0]?.current_session_id, initialSessionId);

			const mergedCheck = await restoreClient.query<{ merged_into_patient_id: string }>(
				"SELECT merged_into_patient_id FROM patients WHERE id = $1",
				[patientMergedId],
			);
			assert.strictEqual(mergedCheck.rows[0]?.merged_into_patient_id, patientPrimaryId);

			const cycleApptCheck = await restoreClient.query<{ rebooking_source_visit_id: string }>(
				"SELECT rebooking_source_visit_id FROM appointments WHERE id = $1",
				[appt2Id],
			);
			assert.strictEqual(cycleApptCheck.rows[0]?.rebooking_source_visit_id, visit1Id);

			const cycleVisitCheck = await restoreClient.query<{ appointment_id: string }>(
				"SELECT appointment_id FROM visits WHERE id = $1",
				[visit1Id],
			);
			assert.strictEqual(cycleVisitCheck.rows[0]?.appointment_id, appt1Id);

			const labCheck = await restoreClient.query<{ parent_lab_order_id: string }>(
				"SELECT parent_lab_order_id FROM lab_orders WHERE id = $1",
				[labReworkId],
			);
			assert.strictEqual(labCheck.rows[0]?.parent_lab_order_id, labParentId);

			const perioCheck = await restoreClient.query<{ probing_depth_mm: number }>(
				"SELECT probing_depth_mm FROM periodontogram_sites WHERE id = $1",
				[perioSiteId],
			);
			assert.strictEqual(perioCheck.rows[0]?.probing_depth_mm, 3);

			const cashCheck = await restoreClient.query<{ amount_kopecks: string }>(
				"SELECT amount_kopecks::text AS amount_kopecks FROM cash_operations WHERE id = $1",
				[cashOpId],
			);
			assert.strictEqual(cashCheck.rows[0]?.amount_kopecks, "450000");

			const invItemCheck = await restoreClient.query<{ total_price_kopecks: string }>(
				"SELECT total_price_kopecks::text AS total_price_kopecks FROM invoice_items WHERE id = $1",
				[invoiceItemId],
			);
			assert.strictEqual(invItemCheck.rows[0]?.total_price_kopecks, "450000");

			const sigCheck = await restoreClient.query<{ document_id: string }>(
				"SELECT document_id FROM document_signatures WHERE id = $1",
				[docSigId],
			);
			assert.strictEqual(sigCheck.rows[0]?.document_id, genDocId);
			await restoreClient.query("COMMIT");

			// 5. Проверяем опцию sanitizeForSupport: true
			const supportRes = await createTenantEncryptedBackup(orgId, {
				backupDir: tempDir,
				sanitizeForSupport: true,
			});
			assert.strictEqual(supportRes.success, true);
			assert.ok(supportRes.filePath);
			await restoreTenantSnapshotStreaming({
				archivePath: supportRes.filePath,
				encryptionKey32Bytes: keyRes.key,
				expectedOrganizationId: orgId,
				pgClient: restoreClient,
				tempDir,
			});
			await restoreClient.query("BEGIN");
			await restoreClient.query(
				"SELECT set_config('app.current_tenant', $1, true), set_config('app.superuser_bypass', 'off', true)",
				[orgId],
			);
			const sanitizedUser = await restoreClient.query<{
				password_hash: string | null;
				pin_code_hash: string | null;
				current_session_id: string | null;
			}>(
				"SELECT password_hash, pin_code_hash, current_session_id FROM users WHERE id = $1",
				[userId],
			);
			assert.strictEqual(sanitizedUser.rows[0]?.password_hash, null);
			assert.strictEqual(sanitizedUser.rows[0]?.pin_code_hash, null);
			assert.strictEqual(sanitizedUser.rows[0]?.current_session_id, null);
			await restoreClient.query("COMMIT");

			// После санитизированного restore сессия пользователя сброшена — выдаём новую активную сессию для HTTP-проверки
			const activeSessionId = crypto.randomUUID();
			await restoreClient.query("BEGIN");
			await restoreClient.query(
				"SELECT set_config('app.current_tenant', $1, true), set_config('app.superuser_bypass', 'off', true)",
				[orgId],
			);
			await restoreClient.query(
				"UPDATE users SET current_session_id = $1 WHERE id = $2 AND organization_id = $3",
				[activeSessionId, userId, orgId],
			);
			await restoreClient.query("COMMIT");
			invalidateStaffSessionCache(userId, orgId);

			// 6. Проверяем HTTP routes /api/settings/backup/{create,list,restore} и Path Jail
			const prevBackupDir = process.env.DENTE_BACKUP_DIR;
			process.env.DENTE_BACKUP_DIR = tempDir;
			const app = createTenantTestApp();
			await registerSettingsRoutes(app);
			try {
				const httpHeaders = authHeaders(orgId, userId, "owner", activeSessionId);
				const createRes = await app.inject({
					method: "POST",
					url: "/api/settings/backup/create",
					headers: httpHeaders,
					payload: {},
				});
				assert.strictEqual(createRes.statusCode, 200, createRes.payload);
				const createdJson = JSON.parse(createRes.payload) as {
					success: boolean;
					filename: string;
					format: string;
				};
				assert.strictEqual(createdJson.success, true);
				assert.strictEqual(createdJson.format, "DENTETB2");

				const listRes = await app.inject({
					method: "GET",
					url: "/api/settings/backup/list",
					headers: httpHeaders,
				});
				assert.strictEqual(listRes.statusCode, 200, listRes.payload);
				const listJson = JSON.parse(listRes.payload) as {
					backups: Array<{ filename: string; format: string }>;
				};
				assert.ok(
					listJson.backups.some(
						(b) => b.filename === createdJson.filename && b.format === "DENTETB2",
					),
				);

				const traversalRes = await app.inject({
					method: "POST",
					url: "/api/settings/backup/restore",
					headers: httpHeaders,
					payload: { filename: "../secret.dentalbackup" },
				});
				assert.strictEqual(traversalRes.statusCode, 400);

				const restoreHttpRes = await app.inject({
					method: "POST",
					url: "/api/settings/backup/restore",
					headers: httpHeaders,
					payload: { filename: createdJson.filename },
				});
				assert.strictEqual(restoreHttpRes.statusCode, 200, restoreHttpRes.payload);

				// 7. Проверяем CLI/script потоковый DR-восстановитель restoreVerifiedDumpToPostgres без JSON.parse
				const drRestoreOutcome = await restoreVerifiedDumpToPostgres({
					dumpFilePath: path.join(tempDir, createdJson.filename),
					databaseUrl: requireDatabaseUrl(),
					expectedOrganizationId: orgId,
					encryptionKey: keyRes.key,
					tempDir,
					log: () => {},
				});
				assert.ok(drRestoreOutcome.tablesCount >= 15);
				assert.ok(drRestoreOutcome.rowsCount >= 20);
			} finally {
				await app.close();
				if (prevBackupDir === undefined) delete process.env.DENTE_BACKUP_DIR;
				else process.env.DENTE_BACKUP_DIR = prevBackupDir;
			}
		} finally {
			await restoreClient.end();
		}
	});

	it("3. Streaming XML row scanner & yauzl disk reader handle split chunks, <rowBreaks> boundary, and Zip-Bomb CWE-409", async () => {
		// Проверяем граничные теги, разорванные между мелкими чанками (<ro + w r="1">) и <rowBreaks>
		const xmlPayload =
			'<worksheet><rowBreaks count="1"><brk id="5"/></rowBreaks>' +
			'<sheetData><row r="1"><c r="A1"><v>100</v></c></row>' +
			'<row r="2"/><row r="3"><c r="A3" t="inlineStr"><is><t>Иванов</t></is></c></row></sheetData></worksheet>';

		const chunked = new PassThrough();
		for (let i = 0; i < xmlPayload.length; i += 7) {
			chunked.write(xmlPayload.slice(i, i + 7));
		}
		chunked.end();

		const scannedRows: string[] = [];
		for await (const inner of streamWorksheetRowXml(chunked)) {
			scannedRows.push(inner);
		}
		assert.strictEqual(scannedRows.length, 2);
		assert.ok(scannedRows[0]?.includes("100"));
		assert.ok(scannedRows[1]?.includes("Иванов"));

		// Проверяем ByteLimitTransform CWE-409
		const limiter = new ByteLimitTransform(10);
		const overflowStream = Readable.from([Buffer.alloc(6), Buffer.alloc(6)]).pipe(limiter);
		await assert.rejects(async () => {
			for await (const _chunk of overflowStream) {
				// consume
			}
		}, ZipBombLimitError);

		// Проверяем потоковый XLSX с диска через yauzl.openPromise
		const xlsxBuf = buildXlsxFile("Пациенты", [
			{ ref: "A1", value: "ФИО" },
			{ ref: "B1", value: "Телефон" },
			{ ref: "A2", value: "Петров Пётр" },
			{ ref: "B2", value: "+79001112233" },
			{ ref: "A3", value: "Сидорова Анна" },
			{ ref: "B3", value: "+79004445566" },
		]);
		const xlsxPath = path.join(tempDir, "disk_patients.xlsx");
		await fsp.writeFile(xlsxPath, xlsxBuf);

		const batches: string[][][] = [];
		for await (const batch of streamXlsxSheetBatches(xlsxPath, { batchRows: 1 })) {
			assert.strictEqual(batch.sheetName, "Пациенты");
			assert.deepEqual(batch.columns, ["ФИО", "Телефон"]);
			batches.push(batch.rows);
		}
		assert.strictEqual(batches.length, 2);
		assert.deepEqual(batches[0], [["Петров Пётр", "+79001112233"]]);
		assert.deepEqual(batches[1], [["Сидорова Анна", "+79004445566"]]);

		// Проверяем extractDocument с ZIP-архивом
		const archiveBuf = await createZipArchiveAsync([
			{ name: "patients.csv", data: Buffer.from("ФИО;Телефон\nИванов;89001234567", "utf8") },
		]);
		const docRes = await extractDocument({
			fileName: "bundle.zip",
			fileBase64: archiveBuf.toString("base64"),
			target: "smart_import",
		});
		assert.strictEqual(docRes.detectedKind, "zip");
		assert.ok(docRes.extractedText.includes("Иванов;89001234567"));
	});
});
