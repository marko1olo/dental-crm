/**
 * routes/integrations/prodoctorov/medflexIntegrationService.ts
 * Layer 2: Сервис управления настройками, маппингами врачей и аудит-логами МедФлекс / ПроДокторов.
 * Полностью изолирует тенанты по clinicExternalId и organizationId.
 */

import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { TenantDb } from "../../../db/client.js";
import { withSuperuserBypass } from "../../../db/rls.js";
import {
	medflexDoctorMappings,
	medflexIntegrations,
	medflexWebhookLogs,
	type MedflexDoctorMapping,
	type MedflexIntegration,
	type MedflexWebhookLog,
	users,
} from "../../../db/schema.js";

export interface MedflexSettingsDto {
	id: string;
	organizationId: string;
	clinicExternalId: string;
	apiKey: string;
	webhookSecret: string;
	isActive: boolean;
	autoConfirmBookings: boolean;
	defaultChairId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface DoctorMappingItemDto {
	staffId: string;
	fullName: string;
	role: string;
	specialties: string[];
	externalDoctorId: string;
	isSyncEnabled: boolean;
}

/**
 * Строгий поиск интеграции по внешнему ID клиники в МедФлекс.
 * Категорический запрет на утечку мульти-тенантности: если не найдено, возвращает null.
 */
export async function findIntegrationByClinicExternalId(
	_tx: TenantDb,
	clinicExternalId: string,
): Promise<MedflexIntegration | null> {
	if (!clinicExternalId || typeof clinicExternalId !== "string") {
		return null;
	}
	const normalizedId = clinicExternalId.trim();
	if (!normalizedId) return null;

	return await withSuperuserBypass(async (bypassTx) => {
		const [integration] = await bypassTx
			.select()
			.from(medflexIntegrations)
			.where(eq(medflexIntegrations.clinicExternalId, normalizedId))
			.limit(1);

		return integration ?? null;
	});
}

/**
 * Получение или автосоздание безопасных дефолтных настроек интеграции для организации.
 */
export async function getOrCreateMedflexSettings(
	tx: TenantDb,
	organizationId: string,
): Promise<MedflexSettingsDto> {
	const [existing] = await tx
		.select()
		.from(medflexIntegrations)
		.where(eq(medflexIntegrations.organizationId, organizationId))
		.limit(1);

	if (existing) {
		return {
			id: existing.id,
			organizationId: existing.organizationId,
			clinicExternalId: existing.clinicExternalId,
			apiKey: existing.apiKey,
			webhookSecret: existing.webhookSecret,
			isActive: existing.isActive,
			autoConfirmBookings: existing.autoConfirmBookings,
			defaultChairId: existing.defaultChairId ?? null,
			createdAt: existing.createdAt,
			updatedAt: existing.updatedAt,
		};
	}

	const generatedSecret = randomBytes(24).toString("hex");
	const defaultExternalId = `mf-${organizationId.slice(0, 8)}`;

	const [created] = await tx
		.insert(medflexIntegrations)
		.values({
			organizationId,
			clinicExternalId: defaultExternalId,
			apiKey: "",
			webhookSecret: generatedSecret,
			isActive: true,
			autoConfirmBookings: true,
			defaultChairId: null,
		})
		.returning();

	if (!created) {
		throw new Error("Не удалось создать настройки интеграции MedFlex");
	}

	return {
		id: created.id,
		organizationId: created.organizationId,
		clinicExternalId: created.clinicExternalId,
		apiKey: created.apiKey,
		webhookSecret: created.webhookSecret,
		isActive: created.isActive,
		autoConfirmBookings: created.autoConfirmBookings,
		defaultChairId: created.defaultChairId ?? null,
		createdAt: created.createdAt,
		updatedAt: created.updatedAt,
	};
}

/**
 * Обновление настроек интеграции клиники.
 */
export async function updateMedflexSettings(
	tx: TenantDb,
	organizationId: string,
	updates: {
		clinicExternalId?: string | undefined;
		apiKey?: string | undefined;
		webhookSecret?: string | undefined;
		isActive?: boolean | undefined;
		autoConfirmBookings?: boolean | undefined;
		defaultChairId?: string | null | undefined;
	},
): Promise<MedflexSettingsDto> {
	await getOrCreateMedflexSettings(tx, organizationId);

	const patch: Partial<typeof medflexIntegrations.$inferInsert> = {
		updatedAt: new Date(),
	};

	if (typeof updates.clinicExternalId === "string" && updates.clinicExternalId.trim()) {
		patch.clinicExternalId = updates.clinicExternalId.trim();
	}
	if (typeof updates.apiKey === "string") {
		patch.apiKey = updates.apiKey.trim();
	}
	if (typeof updates.webhookSecret === "string") {
		patch.webhookSecret = updates.webhookSecret.trim();
	}
	if (typeof updates.isActive === "boolean") {
		patch.isActive = updates.isActive;
	}
	if (typeof updates.autoConfirmBookings === "boolean") {
		patch.autoConfirmBookings = updates.autoConfirmBookings;
	}
	if (updates.defaultChairId !== undefined) {
		patch.defaultChairId = updates.defaultChairId;
	}

	const [updated] = await tx
		.update(medflexIntegrations)
		.set(patch)
		.where(eq(medflexIntegrations.organizationId, organizationId))
		.returning();

	if (!updated) {
		throw new Error("Не удалось обновить настройки MedFlex");
	}

	return {
		id: updated.id,
		organizationId: updated.organizationId,
		clinicExternalId: updated.clinicExternalId,
		apiKey: updated.apiKey,
		webhookSecret: updated.webhookSecret,
		isActive: updated.isActive,
		autoConfirmBookings: updated.autoConfirmBookings,
		defaultChairId: updated.defaultChairId ?? null,
		createdAt: updated.createdAt,
		updatedAt: updated.updatedAt,
	};
}

/**
 * Генерация случайного безопасного HMAC-секрета.
 */
export function generateSecureWebhookSecret(): string {
	return randomBytes(32).toString("hex");
}

/**
 * Получение врачей клиники с сопоставленными внешними ID ПроДокторов/МедФлекс.
 */
export async function getMedflexDoctorMappings(
	tx: TenantDb,
	organizationId: string,
): Promise<DoctorMappingItemDto[]> {
	// Загружаем всех врачей и специалистов клиники
	const staffList = await tx
		.select({
			id: users.id,
			fullName: users.fullName,
			role: users.role,
			specialties: users.specialties,
		})
		.from(users)
		.where(
			and(
				eq(users.organizationId, organizationId),
				eq(users.isActive, true),
			),
		);

	const existingMappings = await tx
		.select()
		.from(medflexDoctorMappings)
		.where(eq(medflexDoctorMappings.organizationId, organizationId));

	const mappingByStaffId = new Map<string, MedflexDoctorMapping>();
	for (const m of existingMappings) {
		mappingByStaffId.set(m.staffId, m);
	}

	return staffList.map((staff) => {
		const mapping = mappingByStaffId.get(staff.id);
		return {
			staffId: staff.id,
			fullName: staff.fullName,
			role: staff.role,
			specialties: Array.isArray(staff.specialties) ? (staff.specialties as string[]) : [],
			externalDoctorId: mapping?.externalDoctorId ?? "",
			isSyncEnabled: mapping?.isSyncEnabled ?? true,
		};
	});
}

/**
 * Массовое сохранение сопоставлений врачей клиники.
 */
export async function saveMedflexDoctorMappings(
	tx: TenantDb,
	organizationId: string,
	mappings: Array<{
		staffId: string;
		externalDoctorId: string;
		isSyncEnabled?: boolean;
	}>,
): Promise<{ savedCount: number }> {
	let savedCount = 0;
	const now = new Date();

	for (const m of mappings) {
		if (!m.staffId) continue;
		const extId = (m.externalDoctorId || "").trim();
		const syncEnabled = m.isSyncEnabled !== false;

		const [existing] = await tx
			.select({ id: medflexDoctorMappings.id })
			.from(medflexDoctorMappings)
			.where(
				and(
					eq(medflexDoctorMappings.organizationId, organizationId),
					eq(medflexDoctorMappings.staffId, m.staffId),
				),
			)
			.limit(1);

		if (existing) {
			await tx
				.update(medflexDoctorMappings)
				.set({
					externalDoctorId: extId,
					isSyncEnabled: syncEnabled,
					updatedAt: now,
				})
				.where(
					and(
						eq(medflexDoctorMappings.id, existing.id),
						eq(medflexDoctorMappings.organizationId, organizationId),
					),
				);
			savedCount++;
		} else if (extId) {
			await tx.insert(medflexDoctorMappings).values({
				organizationId,
				staffId: m.staffId,
				externalDoctorId: extId,
				isSyncEnabled: syncEnabled,
				createdAt: now,
				updatedAt: now,
			});
			savedCount++;
		}
	}

	return { savedCount };
}

/**
 * Проверка идемпотентности: был ли уже успешно зарегистрирован вебхук с данным delivery_id?
 */
export async function isWebhookDeliveryProcessed(
	tx: TenantDb,
	organizationId: string,
	deliveryId: string,
): Promise<boolean> {
	if (!deliveryId) return false;
	const [found] = await tx
		.select({ id: medflexWebhookLogs.id })
		.from(medflexWebhookLogs)
		.where(
			and(
				eq(medflexWebhookLogs.organizationId, organizationId),
				eq(medflexWebhookLogs.deliveryId, deliveryId),
				eq(medflexWebhookLogs.status, "processed"),
			),
		)
		.limit(1);

	return Boolean(found);
}

/**
 * Фиксация входящего события вебхука в журнале доставки.
 */
export async function recordMedflexWebhookLog(
	tx: TenantDb,
	organizationId: string,
	eventType: string,
	deliveryId: string,
	payload: unknown,
	status: "processed" | "error" | "conflict" | "ignored" = "processed",
	errorMessage?: string | null,
): Promise<MedflexWebhookLog> {
	const [log] = await tx
		.insert(medflexWebhookLogs)
		.values({
			organizationId,
			eventType,
			deliveryId,
			payload: payload && typeof payload === "object" ? payload : {},
			status,
			errorMessage: errorMessage ?? null,
		})
		.returning();

	if (!log) {
		throw new Error("Не удалось записать журнал вебхука MedFlex");
	}

	return log;
}

/**
 * Получение последних записей журнала вебхуков для аудита в UI.
 */
export async function getMedflexWebhookLogs(
	tx: TenantDb,
	organizationId: string,
	limit = 20,
): Promise<MedflexWebhookLog[]> {
	const safeLimit = Math.max(1, Math.min(100, limit));
	return await tx
		.select()
		.from(medflexWebhookLogs)
		.where(eq(medflexWebhookLogs.organizationId, organizationId))
		.orderBy(desc(medflexWebhookLogs.createdAt))
		.limit(safeLimit);
}
