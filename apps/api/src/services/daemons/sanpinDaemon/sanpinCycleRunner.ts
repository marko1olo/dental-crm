/**
 * sanpinCycleRunner.ts — Layer 1: SanPiN 3.3686-21 Autoclave Cycles & Kraft Pack Monitor.
 *
 * Implements Kraft pack shelf life monitoring, autoclave cycle verification,
 * and chemical/biological indicator validation in compliance with SanPiN 3.3686-21.
 */

import {
	computePackagingExpirationDate,
	STERILIZATION_PACKAGING_TYPES,
	type SterilizationPackagingType,
} from "@dental/shared";
import { desc, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { sterilizationLogs, users } from "../../../db/schema.js";
import {
	PACKAGING_TYPE_RU_MAP,
	type KraftPackEvaluationInput,
	type SanpinAlertSeverity,
	type SanpinPackStatus,
	type SanpinSterilizationAlertItem,
	type SanpinSterilizationAuditOptions,
} from "./types.js";

/**
 * Evaluates a single kraft pack / sterilization record against SanPiN 3.3686-21.
 * Pure evaluation function for deterministic unit testing.
 */
export function evaluateKraftPackShelfLife(
	record: KraftPackEvaluationInput,
	now: Date = new Date(),
	warningWindowDays = 3,
): SanpinSterilizationAlertItem | null {
	if (record.status === "failed" || record.status === "quarantined") {
		return null;
	}

	const sterilizationDate = record.timestamp ?? record.createdAt ?? now;
	const rawPackagingType = (record.packagingType ||
		"kraft_heat_sealed") as SterilizationPackagingType;
	const packagingMeta =
		rawPackagingType in STERILIZATION_PACKAGING_TYPES
			? STERILIZATION_PACKAGING_TYPES[rawPackagingType]
			: STERILIZATION_PACKAGING_TYPES.kraft_heat_sealed;

	const calculatedExpiry = computePackagingExpirationDate(
		rawPackagingType,
		sterilizationDate,
	);
	const expiryDate = record.expiresAt
		? new Date(record.expiresAt)
		: calculatedExpiry;

	const elapsedMs = now.getTime() - sterilizationDate.getTime();
	const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

	const remainingMs = expiryDate.getTime() - now.getTime();
	const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

	const packagingTypeRu =
		PACKAGING_TYPE_RU_MAP[rawPackagingType] ??
		packagingMeta.label ??
		"Крафт-пакет";

	// According to SanPiN 3.3686-21:
	// - unpacked instrument: 0 days (valid strictly within current shift, expires if elapsedDays >= 1)
	// - kraft_self_adhesive: 30 days hard-cap
	// - kraft_heat_sealed: 50 days hard-cap
	const pkgStr = String(rawPackagingType);
	const isUnpacked = pkgStr === "unpacked" || rawPackagingType === "other";
	const isExpired =
		now.getTime() > expiryDate.getTime() ||
		(isUnpacked && elapsedDays >= 1) ||
		(rawPackagingType === "kraft_self_adhesive" && elapsedDays > 30) ||
		(rawPackagingType === "kraft_heat_sealed" && elapsedDays > 50) ||
		(pkgStr === "bix_filter" && elapsedDays > 20) ||
		(rawPackagingType === "metal_cassette" && elapsedDays > 30);
	const isExpiringSoon = !isExpired && remainingDays <= warningWindowDays && !isUnpacked;

	if (!isExpired && !isExpiringSoon) {
		return null;
	}

	const status: SanpinPackStatus = isExpired ? "EXPIRED" : "EXPIRING_SOON";
	const severity: SanpinAlertSeverity = isExpired ? "CRITICAL" : "WARNING";

	const barcodeInfo = record.barcode ? ` [Штрихкод: ${record.barcode}]` : "";
	const descInfo = record.itemsDescription
		? ` «${record.itemsDescription}»`
		: "";
	const autoclaveInfo = record.deviceName || record.autoclaveId || "Автоклав";

	const message = isExpired
		? isUnpacked
			? `🔴 КРИТИЧЕСКИЙ САНПИН 3.3686-21: Истек срок сохранения стерильности неупакованного инструмента${barcodeInfo}${descInfo}. Стерилизован ${sterilizationDate.toLocaleDateString("ru-RU")} (${elapsedDays} сут. назад, норматив 0 суток — только текущая смена). Стерильность утрачена, использование запрещено!`
			: `🔴 КРИТИЧЕСКИЙ САНПИН 3.3686-21: Истек срок сохранения стерильности крафт-пакета${barcodeInfo}${descInfo}. Стерилизован ${sterilizationDate.toLocaleDateString("ru-RU")} (${elapsedDays} сут. назад, лимит ${rawPackagingType === "kraft_self_adhesive" ? "30" : "50"} суток). Истек ${expiryDate.toLocaleDateString("ru-RU")}. Стерильность утрачена, использование запрещено!`
		: `🟡 ВНИМАНИЕ САНПИН 3.3686-21: Срок годности крафт-пакета${barcodeInfo}${descInfo} истекает через ${remainingDays} дн. (${expiryDate.toLocaleDateString("ru-RU")}). Стерилизован ${sterilizationDate.toLocaleDateString("ru-RU")} в ${autoclaveInfo}. Приближение к нормативному лимиту ${rawPackagingType === "kraft_self_adhesive" ? "30" : "50"} суток.`;

	return {
		id: `sanpin_alert_${record.id}`,
		organizationId: record.organizationId,
		logId: record.id,
		barcode: record.barcode ?? null,
		autoclaveId: record.autoclaveId ?? null,
		deviceName: record.deviceName ?? null,
		cycleNumber: record.cycleNumber ?? null,
		packagingType: record.packagingType ?? null,
		packagingTypeRu,
		itemsDescription: record.itemsDescription ?? null,
		operatorId: record.operatorId ?? null,
		operatorName: record.operatorName ?? null,
		sterilizationDate: sterilizationDate.toISOString(),
		expiryDate: expiryDate.toISOString(),
		elapsedDays,
		remainingDays: isUnpacked ? 0 : remainingDays,
		status,
		severity,
		message,
		suggestedAction: {
			actionId: "send_to_resterilization",
			title: "Отправить на повторную стерилизацию",
			payload: {
				logId: record.id,
				barcode: record.barcode ?? null,
				autoclaveId: record.autoclaveId ?? null,
				deviceName: record.deviceName ?? null,
				packagingType: record.packagingType ?? null,
				itemsDescription: record.itemsDescription ?? null,
				reason: isExpired
					? isUnpacked
						? `Превышение допустимого срока для неупакованного инструмента (норматив 0 суток — только текущая смена по СанПиН 3.3686-21)`
						: `Превышение допустимого срока хранения (${elapsedDays} сут. при нормативе ${rawPackagingType === "kraft_self_adhesive" ? "30" : "50"} суток по СанПиН 3.3686-21)`
					: `Приближение к предельному сроку хранения (осталось ${remainingDays} сут. до ${rawPackagingType === "kraft_self_adhesive" ? "30" : "50"} суток)`,
			},
		},
	};
}

/**
 * SanPiN 3.3686-21 Sterilization & Kraft Pack Storage Audit.
 * Scans kraft packs and sterilization records to flag packs exceeding 50 days (or nearing expiration <= 3 days).
 */
export async function runSanpinSterilizationAudit(options?: SanpinSterilizationAuditOptions): Promise<SanpinSterilizationAlertItem[]> {
	try {
		const now = options?.now ?? new Date();
		const warningWindowDays = options?.warningWindowDays ?? 3;

		// Retrieve sterilization logs
		const records = await db
			.select({
				id: sterilizationLogs.id,
				organizationId: sterilizationLogs.organizationId,
				deviceName: sterilizationLogs.deviceName,
				autoclaveId: sterilizationLogs.autoclaveId,
				cycleNumber: sterilizationLogs.cycleNumber,
				packagingType: sterilizationLogs.packagingType,
				expiresAt: sterilizationLogs.expiresAt,
				itemsDescription: sterilizationLogs.itemsDescription,
				operatorId: sterilizationLogs.operatorId,
				barcode: sterilizationLogs.barcode,
				status: sterilizationLogs.status,
				passedIndicator: sterilizationLogs.passedIndicator,
				timestamp: sterilizationLogs.timestamp,
				createdAt: sterilizationLogs.createdAt,
				operatorName: users.fullName,
			})
			.from(sterilizationLogs)
			.leftJoin(users, eq(users.id, sterilizationLogs.operatorId))
			.where(
				options?.organizationId
					? eq(sterilizationLogs.organizationId, options.organizationId)
					: undefined,
			)
			.orderBy(
				desc(sterilizationLogs.timestamp),
				desc(sterilizationLogs.createdAt),
			);

		const alerts: SanpinSterilizationAlertItem[] = [];

		for (const record of records) {
			const alert = evaluateKraftPackShelfLife(record, now, warningWindowDays);
			if (alert) {
				alerts.push(alert);
			}
		}

		return alerts;
	} catch (error) {
		console.error("[SanpinAndInventoryDaemon:ERROR] Failed to run SanPiN sterilization audit:", error);
		throw error;
	}
}
