import crypto from "node:crypto";
import { once } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { PassThrough, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import zlib from "node:zlib";
import { createApiLogger, safeLogError } from "../../observability/index.js";
import {
	type BackupResult,
	backupsDirectory,
	pruneOldBackups,
	removePartialFile,
	resolveEncryptionKey,
	TENANT_BACKUP_FORMAT,
} from "./backupCryptoUtils.js";

const logger = createApiLogger("backupWorker");
const BACKUP_PAGE_SIZE = 500;
const BACKUP_MAGIC_HEADER = Buffer.from("DENTETB1", "ascii");

function serializeSnapshotJson(payload: unknown): string {
	return JSON.stringify(payload, (_key, value) =>
		typeof value === "bigint" ? value.toString() : value,
	);
}

async function writeChunk(stream: PassThrough, chunk: string): Promise<void> {
	if (!stream.write(chunk, "utf8")) {
		await once(stream, "drain");
	}
}

/**
 * Создаёт строго изолированную зашифрованную резервную копию ОДНОЙ клиники
 * внутри PG18 FORCE RLS транзакции (`withTenantCtx(organizationId)`).
 * Потоково выгружает таблицы батчами по 500 строк -> gzip -> AES-256-GCM -> файл,
 * избегая буферизации всей БД в оперативной памяти (OOM-safe на 4 ГБ ОЗУ).
 */
export async function createTenantEncryptedBackup(
	organizationId: string,
): Promise<BackupResult> {
	const keyResult = resolveEncryptionKey();
	if ("error" in keyResult) {
		logger.error(
			{ err: keyResult.error, organizationId },
			"CLINIC_ENCRYPTION_KEY invalid or missing for tenant backup",
		);
		return { success: false, error: keyResult.error };
	}

	let filePath = "";
	try {
		const backupsDir = backupsDirectory();
		await fs.promises.mkdir(backupsDir, { recursive: true });

		const [{ eq }, { withTenantCtx }, schema] = await Promise.all([
			import("drizzle-orm"),
			import("../../db/rls.js"),
			import("../../db/schema.js"),
		]);

		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		filePath = path.join(
			backupsDir,
			`org_${organizationId}_backup_${timestamp}.dentalbackup`,
		);

		const iv = crypto.randomBytes(12);
		const cipher = crypto.createCipheriv("aes-256-gcm", keyResult.key, iv);
		cipher.setAAD(
			Buffer.from(`${TENANT_BACKUP_FORMAT}:${organizationId}`, "utf8"),
		);

		let headerPrepended = false;
		const prependHeaderTransform = new Transform({
			transform(chunk, _encoding, cb) {
				if (!headerPrepended) {
					headerPrepended = true;
					this.push(BACKUP_MAGIC_HEADER);
					this.push(iv);
					// 16-байтный слот под authTag, перезаписывается после завершения cipher
					this.push(Buffer.alloc(16));
				}
				cb(null, chunk);
			},
			flush(cb) {
				if (!headerPrepended) {
					headerPrepended = true;
					this.push(BACKUP_MAGIC_HEADER);
					this.push(iv);
					this.push(Buffer.alloc(16));
				}
				cb();
			},
		});

		const jsonStream = new PassThrough({ highWaterMark: 64 * 1024 });
		const gzipStream = zlib.createGzip({ level: 6 });
		const fileWriteStream = fs.createWriteStream(filePath, {
			flags: "w",
			mode: 0o600,
		});

		const pipelinePromise = pipeline(
			jsonStream,
			gzipStream,
			cipher,
			prependHeaderTransform,
			fileWriteStream,
		);

		let patientsCount = 0;
		let visitsCount = 0;
		let tablesCount = 0;
		let orgFound = true;

		try {
			await withTenantCtx(organizationId, async (tx) => {
				const [org] = await tx
					.select()
					.from(schema.organizations)
					.where(eq(schema.organizations.id, organizationId))
					.limit(1);
				if (!org) {
					orgFound = false;
					return;
				}

				const tableEntries: Array<{
					name: string;
					fetchPage: (offset: number, limit: number) => Promise<unknown[]>;
				}> = [
					{
						name: "clinics",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.clinics)
								.where(eq(schema.clinics.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "chairs",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.chairs)
								.where(eq(schema.chairs.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "users",
						fetchPage: (offset, limit) =>
							tx
								.select({
									id: schema.users.id,
									organizationId: schema.users.organizationId,
									fullName: schema.users.fullName,
									role: schema.users.role,
									email: schema.users.email,
									phone: schema.users.phone,
									specialties: schema.users.specialties,
									workingHours: schema.users.workingHours,
									isActive: schema.users.isActive,
									createdAt: schema.users.createdAt,
								})
								.from(schema.users)
								.where(eq(schema.users.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "doctorPreferences",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.doctorPreferences)
								.where(eq(schema.doctorPreferences.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "serviceCatalogItems",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.serviceCatalogItems)
								.where(eq(schema.serviceCatalogItems.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "protocolTemplates",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.protocolTemplates)
								.where(eq(schema.protocolTemplates.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "patients",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.patients)
								.where(eq(schema.patients.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "patientConsents",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.patientConsents)
								.where(eq(schema.patientConsents.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "patientDrugAllergies",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.patientDrugAllergies)
								.where(eq(schema.patientDrugAllergies.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "patientRecalls",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.patientRecalls)
								.where(eq(schema.patientRecalls.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "appointments",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.appointments)
								.where(eq(schema.appointments.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "visits",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.visits)
								.where(eq(schema.visits.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "visitDiaries",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.visitDiaries)
								.where(eq(schema.visitDiaries.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "visitDiaryRevisions",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.visitDiaryRevisions)
								.where(eq(schema.visitDiaryRevisions.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "treatmentPlans",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.treatmentPlans)
								.where(eq(schema.treatmentPlans.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "treatmentPlanStages",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.treatmentPlanStages)
								.where(eq(schema.treatmentPlanStages.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "treatmentItems",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.treatmentItems)
								.where(eq(schema.treatmentItems.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "toothStates",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.toothStates)
								.where(eq(schema.toothStates.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "toothStateHistory",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.toothStateHistory)
								.where(eq(schema.toothStateHistory.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "patientInvoices",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.patientInvoices)
								.where(eq(schema.patientInvoices.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "invoiceItems",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.invoiceItems)
								.where(eq(schema.invoiceItems.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "payments",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.payments)
								.where(eq(schema.payments.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "inventoryItems",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.inventoryItems)
								.where(eq(schema.inventoryItems.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "warehouses",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.warehouses)
								.where(eq(schema.warehouses.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "inventoryTransactions",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.inventoryTransactions)
								.where(eq(schema.inventoryTransactions.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "labOrders",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.labOrders)
								.where(eq(schema.labOrders.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "labItems",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.labItems)
								.where(eq(schema.labItems.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "labOrderEvents",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.labOrderEvents)
								.where(eq(schema.labOrderEvents.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "implantCatalogItems",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.implantCatalogItems)
								.where(eq(schema.implantCatalogItems.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "patientImplantInstallations",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.patientImplantInstallations)
								.where(
									eq(schema.patientImplantInstallations.organizationId, organizationId),
								)
								.limit(limit)
								.offset(offset),
					},
					{
						name: "implantIsqMeasurements",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.implantIsqMeasurements)
								.where(eq(schema.implantIsqMeasurements.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "generatedDocuments",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.generatedDocuments)
								.where(eq(schema.generatedDocuments.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "imagingStudies",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.imagingStudies)
								.where(eq(schema.imagingStudies.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "communicationTemplates",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.communicationTemplates)
								.where(eq(schema.communicationTemplates.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "communicationSettings",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.communicationSettings)
								.where(eq(schema.communicationSettings.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "communicationTasks",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.communicationTasks)
								.where(eq(schema.communicationTasks.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "staffChatChannels",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.staffChatChannels)
								.where(eq(schema.staffChatChannels.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "staffChatMessages",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.staffChatMessages)
								.where(eq(schema.staffChatMessages.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
					{
						name: "warrantyCertificates",
						fetchPage: (offset, limit) =>
							tx
								.select()
								.from(schema.warrantyCertificates)
								.where(eq(schema.warrantyCertificates.organizationId, organizationId))
								.limit(limit)
								.offset(offset),
					},
				];

				tablesCount = tableEntries.length + 1;

				const preamble =
					`{"format":${JSON.stringify(TENANT_BACKUP_FORMAT)},` +
					`"organizationId":${JSON.stringify(organizationId)},` +
					`"exportedAt":${JSON.stringify(new Date().toISOString())},` +
					`"tables":{"organization":${serializeSnapshotJson(org)}`;
				await writeChunk(jsonStream, preamble);

				for (const table of tableEntries) {
					await writeChunk(jsonStream, `,${JSON.stringify(table.name)}:[`);
					let offset = 0;
					let firstRow = true;

					while (true) {
						const rows = await table.fetchPage(offset, BACKUP_PAGE_SIZE);
						if (!Array.isArray(rows) || rows.length === 0) break;

						if (table.name === "patients") patientsCount += rows.length;
						if (table.name === "visits") visitsCount += rows.length;

						const parts: string[] = [];
						for (const row of rows) {
							parts.push((firstRow ? "" : ",") + serializeSnapshotJson(row));
							firstRow = false;
						}
						await writeChunk(jsonStream, parts.join(""));

						if (rows.length < BACKUP_PAGE_SIZE) break;
						offset += rows.length;
					}

					await writeChunk(jsonStream, "]");
				}

				await writeChunk(jsonStream, "}}");
			});
		} catch (txError) {
			jsonStream.destroy(txError instanceof Error ? txError : new Error(String(txError)));
			await pipelinePromise.catch((pipeErr) => {
				logger.debug(
					{ err: safeLogError(pipeErr), organizationId, filePath },
					"Поток шифрования резервной копии остановлен при откате транзакции",
				);
			});
			throw txError;
		}

		jsonStream.end();
		await pipelinePromise;

		if (!orgFound) {
			removePartialFile(filePath);
			return {
				success: false,
				error: "Организация не найдена для создания резервной копии.",
			};
		}

		// Записываем финальный authTag (16 байт) в заголовок файла по смещению 20 (после 8B DENTETB1 + 12B IV)
		const authTag = cipher.getAuthTag();
		const fh = await fs.promises.open(filePath, "r+");
		try {
			await fh.write(authTag, 0, 16, BACKUP_MAGIC_HEADER.length + iv.length);
		} finally {
			await fh.close();
		}

		logger.info(
			{
				organizationId,
				filePath,
				patientsCount,
				visitsCount,
				tablesCount,
			},
			"Изолированная резервная копия клиники успешно создана и зашифрована (потоково)",
		);
		pruneOldBackups();
		return { success: true, filePath };
	} catch (error) {
		if (filePath) removePartialFile(filePath);
		const message = error instanceof Error ? error.message : String(error);
		logger.error(
			{ err: safeLogError(error), organizationId, filePath },
			"Ошибка создания изолированной копии клиники",
		);
		return { success: false, error: message };
	}
}
