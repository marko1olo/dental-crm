import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
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

function serializeSnapshotJson(payload: unknown): string {
	return JSON.stringify(payload, (_key, value) =>
		typeof value === "bigint" ? value.toString() : value,
	);
}

/**
 * Создаёт строго изолированную зашифрованную резервную копию ОДНОЙ клиники
 * внутри PG18 FORCE RLS транзакции (`withTenantCtx(organizationId)`).
 * Выгружает полный клинический, финансовый, складской, ЗТЛ, имплантологический
 * и коммуникационный срез арендатора без утечек соседних клиник.
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
		fs.mkdirSync(backupsDir, { recursive: true });

		const [{ eq }, { withTenantCtx }, schema] = await Promise.all([
			import("drizzle-orm"),
			import("../../db/rls.js"),
			import("../../db/schema.js"),
		]);

		const snapshot = await withTenantCtx(organizationId, async (tx) => {
			const [org] = await tx
				.select()
				.from(schema.organizations)
				.where(eq(schema.organizations.id, organizationId))
				.limit(1);
			if (!org) {
				return null;
			}

			const [
				clinicsRows,
				chairsRows,
				usersRows,
				doctorPreferencesRows,
				serviceCatalogItemsRows,
				protocolTemplatesRows,
				patientsRows,
				patientConsentsRows,
				patientDrugAllergiesRows,
				patientRecallsRows,
				appointmentsRows,
				visitsRows,
				visitDiariesRows,
				visitDiaryRevisionsRows,
				treatmentPlansRows,
				treatmentPlanStagesRows,
				treatmentItemsRows,
				toothStatesRows,
				toothStateHistoryRows,
				invoicesRows,
				patientInvoicesRows,
				invoiceItemsRows,
				paymentsRows,
				inventoryItemsRows,
				warehousesRows,
				inventoryTransactionsRows,
				labOrdersRows,
				labItemsRows,
				labOrderEventsRows,
				implantCatalogItemsRows,
				patientImplantInstallationsRows,
				implantIsqMeasurementsRows,
				generatedDocumentsRows,
				imagingStudiesRows,
				communicationTemplatesRows,
				communicationSettingsRows,
				communicationTasksRows,
				staffChatChannelsRows,
				staffChatMessagesRows,
				warrantyCertificatesRows,
			] = await Promise.all([
				tx
					.select()
					.from(schema.clinics)
					.where(eq(schema.clinics.organizationId, organizationId)),
				tx
					.select()
					.from(schema.chairs)
					.where(eq(schema.chairs.organizationId, organizationId)),
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
					.where(eq(schema.users.organizationId, organizationId)),
				tx
					.select()
					.from(schema.doctorPreferences)
					.where(eq(schema.doctorPreferences.organizationId, organizationId)),
				tx
					.select()
					.from(schema.serviceCatalogItems)
					.where(eq(schema.serviceCatalogItems.organizationId, organizationId)),
				tx
					.select()
					.from(schema.protocolTemplates)
					.where(eq(schema.protocolTemplates.organizationId, organizationId)),
				tx
					.select()
					.from(schema.patients)
					.where(eq(schema.patients.organizationId, organizationId)),
				tx
					.select()
					.from(schema.patientConsents)
					.where(eq(schema.patientConsents.organizationId, organizationId)),
				tx
					.select()
					.from(schema.patientDrugAllergies)
					.where(eq(schema.patientDrugAllergies.organizationId, organizationId)),
				tx
					.select()
					.from(schema.patientRecalls)
					.where(eq(schema.patientRecalls.organizationId, organizationId)),
				tx
					.select()
					.from(schema.appointments)
					.where(eq(schema.appointments.organizationId, organizationId)),
				tx
					.select()
					.from(schema.visits)
					.where(eq(schema.visits.organizationId, organizationId)),
				tx
					.select()
					.from(schema.visitDiaries)
					.where(eq(schema.visitDiaries.organizationId, organizationId)),
				tx
					.select()
					.from(schema.visitDiaryRevisions)
					.where(eq(schema.visitDiaryRevisions.organizationId, organizationId)),
				tx
					.select()
					.from(schema.treatmentPlans)
					.where(eq(schema.treatmentPlans.organizationId, organizationId)),
				tx
					.select()
					.from(schema.treatmentPlanStages)
					.where(eq(schema.treatmentPlanStages.organizationId, organizationId)),
				tx
					.select()
					.from(schema.treatmentItems)
					.where(eq(schema.treatmentItems.organizationId, organizationId)),
				tx
					.select()
					.from(schema.toothStates)
					.where(eq(schema.toothStates.organizationId, organizationId)),
				tx
					.select()
					.from(schema.toothStateHistory)
					.where(eq(schema.toothStateHistory.organizationId, organizationId)),
				tx
					.select()
					.from(schema.invoices)
					.where(eq(schema.invoices.organizationId, organizationId)),
				tx
					.select()
					.from(schema.patientInvoices)
					.where(eq(schema.patientInvoices.organizationId, organizationId)),
				tx
					.select()
					.from(schema.invoiceItems)
					.where(eq(schema.invoiceItems.organizationId, organizationId)),
				tx
					.select()
					.from(schema.payments)
					.where(eq(schema.payments.organizationId, organizationId)),
				tx
					.select()
					.from(schema.inventoryItems)
					.where(eq(schema.inventoryItems.organizationId, organizationId)),
				tx
					.select()
					.from(schema.warehouses)
					.where(eq(schema.warehouses.organizationId, organizationId)),
				tx
					.select()
					.from(schema.inventoryTransactions)
					.where(eq(schema.inventoryTransactions.organizationId, organizationId)),
				tx
					.select()
					.from(schema.labOrders)
					.where(eq(schema.labOrders.organizationId, organizationId)),
				tx
					.select()
					.from(schema.labItems)
					.where(eq(schema.labItems.organizationId, organizationId)),
				tx
					.select()
					.from(schema.labOrderEvents)
					.where(eq(schema.labOrderEvents.organizationId, organizationId)),
				tx
					.select()
					.from(schema.implantCatalogItems)
					.where(eq(schema.implantCatalogItems.organizationId, organizationId)),
				tx
					.select()
					.from(schema.patientImplantInstallations)
					.where(
						eq(schema.patientImplantInstallations.organizationId, organizationId),
					),
				tx
					.select()
					.from(schema.implantIsqMeasurements)
					.where(eq(schema.implantIsqMeasurements.organizationId, organizationId)),
				tx
					.select()
					.from(schema.generatedDocuments)
					.where(eq(schema.generatedDocuments.organizationId, organizationId)),
				tx
					.select()
					.from(schema.imagingStudies)
					.where(eq(schema.imagingStudies.organizationId, organizationId)),
				tx
					.select()
					.from(schema.communicationTemplates)
					.where(
						eq(schema.communicationTemplates.organizationId, organizationId),
					),
				tx
					.select()
					.from(schema.communicationSettings)
					.where(
						eq(schema.communicationSettings.organizationId, organizationId),
					),
				tx
					.select()
					.from(schema.communicationTasks)
					.where(eq(schema.communicationTasks.organizationId, organizationId)),
				tx
					.select()
					.from(schema.staffChatChannels)
					.where(eq(schema.staffChatChannels.organizationId, organizationId)),
				tx
					.select()
					.from(schema.staffChatMessages)
					.where(eq(schema.staffChatMessages.organizationId, organizationId)),
				tx
					.select()
					.from(schema.warrantyCertificates)
					.where(eq(schema.warrantyCertificates.organizationId, organizationId)),
			]);

			return {
				format: TENANT_BACKUP_FORMAT,
				organizationId,
				exportedAt: new Date().toISOString(),
				tables: {
					organization: org,
					clinics: clinicsRows,
					chairs: chairsRows,
					users: usersRows,
					doctorPreferences: doctorPreferencesRows,
					serviceCatalogItems: serviceCatalogItemsRows,
					protocolTemplates: protocolTemplatesRows,
					patients: patientsRows,
					patientConsents: patientConsentsRows,
					patientDrugAllergies: patientDrugAllergiesRows,
					patientRecalls: patientRecallsRows,
					appointments: appointmentsRows,
					visits: visitsRows,
					visitDiaries: visitDiariesRows,
					visitDiaryRevisions: visitDiaryRevisionsRows,
					treatmentPlans: treatmentPlansRows,
					treatmentPlanStages: treatmentPlanStagesRows,
					treatmentItems: treatmentItemsRows,
					toothStates: toothStatesRows,
					toothStateHistory: toothStateHistoryRows,
					invoices: invoicesRows,
					patientInvoices: patientInvoicesRows,
					invoiceItems: invoiceItemsRows,
					payments: paymentsRows,
					inventoryItems: inventoryItemsRows,
					warehouses: warehousesRows,
					inventoryTransactions: inventoryTransactionsRows,
					labOrders: labOrdersRows,
					labItems: labItemsRows,
					labOrderEvents: labOrderEventsRows,
					implantCatalogItems: implantCatalogItemsRows,
					patientImplantInstallations: patientImplantInstallationsRows,
					implantIsqMeasurements: implantIsqMeasurementsRows,
					generatedDocuments: generatedDocumentsRows,
					imagingStudies: imagingStudiesRows,
					communicationTemplates: communicationTemplatesRows,
					communicationSettings: communicationSettingsRows,
					communicationTasks: communicationTasksRows,
					staffChatChannels: staffChatChannelsRows,
					staffChatMessages: staffChatMessagesRows,
					warrantyCertificates: warrantyCertificatesRows,
				},
			};
		});

		if (!snapshot) {
			return {
				success: false,
				error: "Организация не найдена для создания резервной копии.",
			};
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		filePath = path.join(
			backupsDir,
			`org_${organizationId}_backup_${timestamp}.dentalbackup`,
		);

		const compressed = zlib.gzipSync(
			Buffer.from(serializeSnapshotJson(snapshot), "utf8"),
		);
		const iv = crypto.randomBytes(12);
		const cipher = crypto.createCipheriv("aes-256-gcm", keyResult.key, iv);
		cipher.setAAD(
			Buffer.from(`${TENANT_BACKUP_FORMAT}:${organizationId}`, "utf8"),
		);
		const encrypted = Buffer.concat([
			cipher.update(compressed),
			cipher.final(),
		]);
		const authTag = cipher.getAuthTag();
		const header = Buffer.from("DENTETB1", "ascii");

		fs.writeFileSync(
			filePath,
			Buffer.concat([header, iv, authTag, encrypted]),
			{ mode: 0o600 },
		);

		logger.info(
			{
				organizationId,
				filePath,
				patientsCount: snapshot.tables.patients.length,
				visitsCount: snapshot.tables.visits.length,
				tablesCount: Object.keys(snapshot.tables).length,
			},
			"Изолированная резервная копия клиники успешно создана и зашифрована",
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
