/**
 * sanpinAndInventoryDaemon.ts — 21:30 PM SanPiN 3.3686-21 & Expensive Materials Inventory Reconciliation Daemon.
 *
 * Designed in compliance with the Quiet Digest / Passive Audit Doctrine (Tier 3 Backoffice):
 * 1. SanPiN 3.3686-21 Kraft Pack Shelf Life Monitor:
 *    - Scans sterilization records and kraft packs in `sterilization_logs`.
 *    - Detects packs exceeding the statutory 50-day storage limit (or <= 3 days remaining before 50 days).
 *    - Compiles structured alerts for the Head Nurse with 1-click action: [Отправить на повторную стерилизацию].
 *
 * 2. High-Cost Surgical Inventory & Financial Audit Trail:
 *    - Reconciles completed surgical acts, installed implants (Straumann, Osstem, etc.), bone grafts, and membranes
 *      with warehouse stock movements (`inventory_transactions`).
 *    - Detects missing write-offs, SKU/brand discrepancies, and quantity mismatches.
 *    - Compiles structured audit reports for Chief Doctor / Warehouse Manager with 1-click action: [Поднять аудит-трейл расхода ТМЦ].
 *
 * 3. Quiet Digest Architecture:
 *    - Zero blocking popups or intrusive overlays in clinical workflow.
 *    - Available on demand or as a scheduled nightly 21:30 PM digest for backoffice management.
 */

import {
	computePackagingExpirationDate,
	STERILIZATION_PACKAGING_TYPES,
	type SterilizationPackagingType,
} from "@dental/shared";
import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	inventoryItems,
	inventoryTransactions,
	patientImplantInstallations,
	patients,
	services,
	sterilizationLogs,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";

export type SanpinPackStatus = "EXPIRED" | "EXPIRING_SOON" | "VALID";
export type SanpinAlertSeverity = "CRITICAL" | "WARNING" | "INFO";

export interface SanpinSterilizationAlertItem {
	readonly id: string;
	readonly organizationId: string;
	readonly logId: string;
	readonly barcode: string | null;
	readonly autoclaveId: string | null;
	readonly deviceName: string | null;
	readonly cycleNumber: number | null;
	readonly packagingType: string | null;
	readonly packagingTypeRu: string;
	readonly itemsDescription: string | null;
	readonly operatorId: string | null;
	readonly operatorName: string | null;
	readonly sterilizationDate: string;
	readonly expiryDate: string;
	readonly elapsedDays: number;
	readonly remainingDays: number;
	readonly status: SanpinPackStatus;
	readonly severity: SanpinAlertSeverity;
	readonly message: string;
	readonly suggestedAction: {
		readonly actionId: "send_to_resterilization";
		readonly title: string;
		readonly payload: {
			readonly logId: string;
			readonly barcode: string | null;
			readonly autoclaveId: string | null;
			readonly deviceName: string | null;
			readonly packagingType: string | null;
			readonly itemsDescription: string | null;
			readonly reason: string;
		};
	};
}

export type InventoryDiscrepancyType =
	| "missing_writeoff"
	| "sku_mismatch"
	| "quantity_mismatch"
	| "unrecorded_graft_membrane";

export interface InventoryReconciliationAlertItem {
	readonly id: string;
	readonly organizationId: string;
	readonly visitId: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly doctorId: string | null;
	readonly doctorName: string;
	readonly shiftDate: string;
	readonly discrepancyType: InventoryDiscrepancyType;
	readonly discrepancyTypeRu: string;
	readonly severity: "CRITICAL" | "WARNING";
	readonly billedOrInstalled: {
		readonly itemName: string;
		readonly brand: string | null;
		readonly sku: string | null;
		readonly quantity: number;
		readonly estimatedPriceRub: number;
		readonly lotNumber: string | null;
		readonly toothNumberFdi: number | null;
	};
	readonly warehouseRecorded: Array<{
		readonly transactionId: string;
		readonly itemId: string | null;
		readonly itemName: string;
		readonly quantityDeducted: number;
		readonly unitCostRub: number | null;
	}>;
	readonly message: string;
	readonly suggestedAction: {
		readonly actionId: "investigate_inventory_trail";
		readonly title: string;
		readonly payload: {
			readonly visitId: string;
			readonly patientId: string;
			readonly patientFullName: string;
			readonly doctorName: string;
			readonly discrepancyType: InventoryDiscrepancyType;
			readonly billedItemName: string;
			readonly billedBrand: string | null;
			readonly warehouseTransactionsCount: number;
			readonly auditRecommendation: string;
		};
	};
}

export interface SanpinAndInventoryAuditDigest {
	readonly id: string;
	readonly organizationId: string;
	readonly scanDate: string;
	readonly scanTimestamp: string;
	readonly summary: {
		readonly totalKraftPacksChecked: number;
		readonly expiredPacksCount: number;
		readonly expiringSoonPacksCount: number;
		readonly totalSurgicalActsAudited: number;
		readonly reconciledSurgicalActsCount: number;
		readonly discrepantSurgicalActsCount: number;
		readonly totalEstimatedDiscrepancyRub: number;
	};
	readonly sanpinAlerts: SanpinSterilizationAlertItem[];
	readonly inventoryDiscrepancyAlerts: InventoryReconciliationAlertItem[];
	readonly createdAt: string;
}

export const PACKAGING_TYPE_RU_MAP: Readonly<Record<string, string>> = {
	kraft_heat_sealed: "Крафт-пакет (термосварка, норма 50 сут)",
	kraft_self_adhesive: "Крафт-пакет (самоклеящийся, норма 30 сут)",
	laminated_heat_sealed: "Ламинированный пакет комбинированный (180 сут)",
	metal_cassette: "Металлическая кассета с фильтром (30 сут)",
	bix_filter: "Стерилизационная коробка (бикс) с фильтром (20 сут)",
	unpacked: "Неупакованный инструмент (3 сут)",
	other: "Иной вид упаковки (3 сут)",
};

export const DISCREPANCY_TYPE_RU_MAP: Readonly<
	Record<InventoryDiscrepancyType, string>
> = {
	missing_writeoff: "Списание со склада не зафиксировано",
	sku_mismatch: "Несоответствие артикула / пересорт ТМЦ",
	quantity_mismatch: "Несоответствие списанного количества",
	unrecorded_graft_membrane:
		"Не зафиксировано списание костного материала/мембраны",
};

/**
 * Normalizes item/brand string for case-insensitive matching.
 */
export function normalizeText(text: string | null | undefined): string {
	return (text ?? "").trim().toLowerCase();
}

/**
 * Extracts recognized implant brand from text or returns null.
 */
export function extractRecognizedBrand(text: string): string | null {
	const lower = normalizeText(text);
	if (
		lower.includes("straumann") ||
		lower.includes("штрауман") ||
		lower.includes("blx") ||
		lower.includes("slactive")
	) {
		return "straumann";
	}
	if (
		lower.includes("osstem") ||
		lower.includes("осстем") ||
		lower.includes("ts iii") ||
		lower.includes("tsiii")
	) {
		return "osstem";
	}
	if (
		lower.includes("nobel") ||
		lower.includes("нобель") ||
		lower.includes("replace") ||
		lower.includes("active")
	) {
		return "nobel";
	}
	if (lower.includes("hiossen") || lower.includes("хиоссен")) {
		return "hiossen";
	}
	if (
		lower.includes("dentium") ||
		lower.includes("дентиум") ||
		lower.includes("superline")
	) {
		return "dentium";
	}
	if (lower.includes("astra") || lower.includes("астра")) {
		return "astra_tech";
	}
	if (lower.includes("ankylos") || lower.includes("анкилоз")) {
		return "ankylos";
	}
	if (
		lower.includes("megagen") ||
		lower.includes("мегаджен") ||
		lower.includes("anyridge")
	) {
		return "megagen";
	}
	if (lower.includes("neodent") || lower.includes("неодент")) {
		return "neodent";
	}
	return null;
}

export interface KraftPackEvaluationInput {
	readonly id: string;
	readonly organizationId: string;
	readonly barcode?: string | null;
	readonly autoclaveId?: string | null;
	readonly deviceName?: string | null;
	readonly cycleNumber?: number | null;
	readonly packagingType?: string | null;
	readonly expiresAt?: Date | string | null;
	readonly itemsDescription?: string | null;
	readonly operatorId?: string | null;
	readonly operatorName?: string | null;
	readonly status?: string | null;
	readonly timestamp?: Date | null;
	readonly createdAt?: Date;
}

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

	// According to SanPiN 3.3686-21, heat-sealed kraft packs cannot exceed 50 days
	const isExpired =
		now.getTime() > expiryDate.getTime() ||
		(rawPackagingType === "kraft_heat_sealed" && elapsedDays > 50);
	const isExpiringSoon = !isExpired && remainingDays <= warningWindowDays;

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
		? `🔴 КРИТИЧЕСКИЙ САНПИН 3.3686-21: Истек срок сохранения стерильности крафт-пакета${barcodeInfo}${descInfo}. Стерилизован ${sterilizationDate.toLocaleDateString("ru-RU")} (${elapsedDays} сут. назад, лимит 50 суток). Истек ${expiryDate.toLocaleDateString("ru-RU")}. Стерильность утрачена, использование запрещено!`
		: `🟡 ВНИМАНИЕ САНПИН 3.3686-21: Срок годности крафт-пакета${barcodeInfo}${descInfo} истекает через ${remainingDays} дн. (${expiryDate.toLocaleDateString("ru-RU")}). Стерилизован ${sterilizationDate.toLocaleDateString("ru-RU")} в ${autoclaveInfo}. Приближение к нормативному лимиту 50 суток.`;

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
		remainingDays,
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
					? `Превышение допустимого срока хранения (${elapsedDays} сут. при нормативе 50 суток по СанПиН 3.3686-21)`
					: `Приближение к предельному сроку хранения (осталось ${remainingDays} сут. до 50 суток)`,
			},
		},
	};
}

export interface SurgicalActInput {
	readonly visitId: string;
	readonly organizationId: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly doctorId?: string | null;
	readonly doctorName: string;
	readonly shiftDate: string;
	readonly implantInstallations?: Array<{
		readonly id: string;
		readonly implantBrand: string | null;
		readonly toothNumberFdi: number;
		readonly lotNumber?: string | null;
		readonly serialNumber?: string | null;
		readonly boneGraftMaterial?: string | null;
		readonly membraneUsed?: string | null;
	}>;
	readonly billedItems?: Array<{
		readonly id: string;
		readonly serviceId?: string | null;
		readonly serviceTitle?: string | null;
		readonly serviceCode?: string | null;
		readonly quantity?: number | string | null;
		readonly priceRub?: number | string | null;
	}>;
}

export interface WarehouseTransactionInput {
	readonly id: string;
	readonly itemId?: string | null;
	readonly itemName?: string | null;
	readonly sku?: string | null;
	readonly category?: string | null;
	readonly qty?: number | string | null;
	readonly quantityChanged?: number | string | null;
	readonly unitCostRub?: number | string | null;
	readonly notes?: string | null;
}

/**
 * Reconciles a single surgical act against warehouse stock movement transactions.
 * Pure evaluation function for deterministic unit testing.
 */
export function reconcileSurgicalActWithInventory(
	act: SurgicalActInput,
	warehouseTx: WarehouseTransactionInput[],
): InventoryReconciliationAlertItem[] {
	const alerts: InventoryReconciliationAlertItem[] = [];
	const implantInstalls = act.implantInstallations ?? [];
	const billedItems = act.billedItems ?? [];

	const warehouseRecorded = warehouseTx.map((t) => ({
		transactionId: t.id,
		itemId: t.itemId ?? null,
		itemName: t.itemName || t.notes || "ТМЦ со склада",
		quantityDeducted: Math.abs(Number(t.quantityChanged ?? t.qty ?? 0)),
		unitCostRub: t.unitCostRub != null ? Number(t.unitCostRub) : null,
	}));

	// 1. Cross-reference clinical implant installations
	for (const install of implantInstalls) {
		const doctorName = act.doctorName || "Хирург-имплантолог";
		const installedBrand = normalizeText(install.implantBrand || "osstem");
		const brandTitle = install.implantBrand || "Дентальный имплантат";

		const matchingTx = warehouseTx.filter((t) => {
			const name = normalizeText(t.itemName);
			const sku = normalizeText(t.sku);
			const notes = normalizeText(t.notes);
			return (
				name.includes(installedBrand) ||
				sku.includes(installedBrand) ||
				notes.includes(installedBrand) ||
				(name.includes("имплант") &&
					(name.includes(installedBrand) || !installedBrand))
			);
		});

		const anyImplantTx = warehouseTx.filter((t) => {
			const name = normalizeText(t.itemName);
			return (
				name.includes("имплант") ||
				name.includes("implant") ||
				(t.category && normalizeText(t.category).includes("имплант"))
			);
		});

		if (warehouseTx.length === 0 || anyImplantTx.length === 0) {
			// CASE A: Missing write-off entirely
			alerts.push({
				id: `inv_recon_missing_${act.visitId}_${install.id}`,
				organizationId: act.organizationId,
				visitId: act.visitId,
				patientId: act.patientId,
				patientFullName: act.patientFullName,
				doctorId: act.doctorId ?? null,
				doctorName,
				shiftDate: act.shiftDate,
				discrepancyType: "missing_writeoff",
				discrepancyTypeRu: DISCREPANCY_TYPE_RU_MAP.missing_writeoff,
				severity: "CRITICAL",
				billedOrInstalled: {
					itemName: `Установка имплантата ${brandTitle} (зуб ${install.toothNumberFdi})`,
					brand: install.implantBrand,
					sku: null,
					quantity: 1,
					estimatedPriceRub: 45000,
					lotNumber: install.lotNumber ?? null,
					toothNumberFdi: install.toothNumberFdi,
				},
				warehouseRecorded,
				message: `⚠️ РАСХОЖДЕНИЕ СКЛАДА: По клиническому акту проведена операция «Установка имплантата ${brandTitle}» (зуб FDI ${install.toothNumberFdi}, пациент: ${act.patientFullName}, хирург: ${doctorName}), однако в складском журнале списание имплантата НЕ зафиксировано!`,
				suggestedAction: {
					actionId: "investigate_inventory_trail",
					title: "Поднять аудит-трейл расхода ТМЦ",
					payload: {
						visitId: act.visitId,
						patientId: act.patientId,
						patientFullName: act.patientFullName,
						doctorName,
						discrepancyType: "missing_writeoff",
						billedItemName: `Имплантат ${brandTitle}`,
						billedBrand: install.implantBrand,
						warehouseTransactionsCount: warehouseRecorded.length,
						auditRecommendation:
							"Проверить списание по серийному номеру / партии со склада ЦСО и оформить акт расхода ТМЦ",
					},
				},
			});
		} else if (matchingTx.length === 0 && anyImplantTx.length > 0) {
			// CASE B: Brand / SKU Mismatch
			const writtenOffNames = anyImplantTx
				.map((t) => t.itemName || "Другой артикул")
				.join(", ");
			alerts.push({
				id: `inv_recon_sku_mismatch_${act.visitId}_${install.id}`,
				organizationId: act.organizationId,
				visitId: act.visitId,
				patientId: act.patientId,
				patientFullName: act.patientFullName,
				doctorId: act.doctorId ?? null,
				doctorName,
				shiftDate: act.shiftDate,
				discrepancyType: "sku_mismatch",
				discrepancyTypeRu: DISCREPANCY_TYPE_RU_MAP.sku_mismatch,
				severity: "CRITICAL",
				billedOrInstalled: {
					itemName: `Установка имплантата ${brandTitle} (зуб ${install.toothNumberFdi})`,
					brand: install.implantBrand,
					sku: null,
					quantity: 1,
					estimatedPriceRub: 55000,
					lotNumber: install.lotNumber ?? null,
					toothNumberFdi: install.toothNumberFdi,
				},
				warehouseRecorded,
				message: `🚨 ПЕРЕСОРТ / НЕСООТВЕТСТВИЕ ТМЦ: В протоколе операции зафиксирован имплантат ${brandTitle}, но со склада списан другой артикул: «${writtenOffNames}» (пациент: ${act.patientFullName}, хирург: ${doctorName}). Риск расхождения себестоимости и финансовой отчетности!`,
				suggestedAction: {
					actionId: "investigate_inventory_trail",
					title: "Поднять аудит-трейл расхода ТМЦ",
					payload: {
						visitId: act.visitId,
						patientId: act.patientId,
						patientFullName: act.patientFullName,
						doctorName,
						discrepancyType: "sku_mismatch",
						billedItemName: `Имплантат ${brandTitle}`,
						billedBrand: install.implantBrand,
						warehouseTransactionsCount: warehouseRecorded.length,
						auditRecommendation:
							"Сверить накладные склада и упаковочные стикеры в карте 043/у для устранения пересорта",
					},
				},
			});
		}

		// Check bone graft or membrane
		if (
			install.boneGraftMaterial &&
			!warehouseTx.some(
				(t) =>
					normalizeText(t.itemName).includes("графт") ||
					normalizeText(t.itemName).includes("костн") ||
					normalizeText(t.itemName).includes("bio-oss") ||
					normalizeText(t.itemName).includes("cerabone"),
			)
		) {
			alerts.push({
				id: `inv_recon_graft_${act.visitId}_${install.id}`,
				organizationId: act.organizationId,
				visitId: act.visitId,
				patientId: act.patientId,
				patientFullName: act.patientFullName,
				doctorId: act.doctorId ?? null,
				doctorName,
				shiftDate: act.shiftDate,
				discrepancyType: "unrecorded_graft_membrane",
				discrepancyTypeRu: DISCREPANCY_TYPE_RU_MAP.unrecorded_graft_membrane,
				severity: "WARNING",
				billedOrInstalled: {
					itemName: `Костный материал: ${install.boneGraftMaterial}`,
					brand: null,
					sku: null,
					quantity: 1,
					estimatedPriceRub: 15000,
					lotNumber: null,
					toothNumberFdi: install.toothNumberFdi,
				},
				warehouseRecorded,
				message: `⚠️ РАСХОЖДЕНИЕ МАТЕРИАЛОВ: В протоколе указано применение костного материала «${install.boneGraftMaterial}», но списание со склада не зафиксировано (пациент: ${act.patientFullName}).`,
				suggestedAction: {
					actionId: "investigate_inventory_trail",
					title: "Поднять аудит-трейл расхода ТМЦ",
					payload: {
						visitId: act.visitId,
						patientId: act.patientId,
						patientFullName: act.patientFullName,
						doctorName,
						discrepancyType: "unrecorded_graft_membrane",
						billedItemName: install.boneGraftMaterial,
						billedBrand: null,
						warehouseTransactionsCount: warehouseRecorded.length,
						auditRecommendation:
							"Провести инвентаризацию остеопластических материалов в хирургическом кабинете",
					},
				},
			});
		}
	}

	// 2. Cross-reference billed surgery services without explicit implant installations table entry
	for (const item of billedItems) {
		const itemName = item.serviceTitle || "Хирургическая услуга";
		const itemCode = item.serviceCode || "";
		const normalizedTitle = normalizeText(itemName);
		const recognizedBrand = extractRecognizedBrand(itemName);

		const isImplantService =
			itemCode.startsWith("A16.07.054") ||
			normalizedTitle.includes("установка имплантата") ||
			normalizedTitle.includes("дентальная имплантация") ||
			(normalizedTitle.includes("имплант") &&
				!normalizedTitle.includes("формировател") &&
				!normalizedTitle.includes("коронк"));

		if (isImplantService && implantInstalls.length === 0) {
			const doctorName = act.doctorName || "Лечащий врач";
			const anyImplantTx = warehouseTx.filter((t) => {
				const name = normalizeText(t.itemName);
				return name.includes("имплант") || name.includes("implant");
			});

			if (anyImplantTx.length === 0) {
				alerts.push({
					id: `inv_recon_service_${act.visitId}_${item.id}`,
					organizationId: act.organizationId,
					visitId: act.visitId,
					patientId: act.patientId,
					patientFullName: act.patientFullName,
					doctorId: act.doctorId ?? null,
					doctorName,
					shiftDate: act.shiftDate,
					discrepancyType: "missing_writeoff",
					discrepancyTypeRu: DISCREPANCY_TYPE_RU_MAP.missing_writeoff,
					severity: "CRITICAL",
					billedOrInstalled: {
						itemName,
						brand: recognizedBrand,
						sku: itemCode,
						quantity: Number(item.quantity) || 1,
						estimatedPriceRub: Number(item.priceRub) || 35000,
						lotNumber: null,
						toothNumberFdi: null,
					},
					warehouseRecorded,
					message: `⚠️ РАСХОЖДЕНИЕ В ЧЕКЕ: В чеке/акте пробита услуга «${itemName}», но со склада списание имплантата не зафиксировано (пациент: ${act.patientFullName}).`,
					suggestedAction: {
						actionId: "investigate_inventory_trail",
						title: "Поднять аудит-трейл расхода ТМЦ",
						payload: {
							visitId: act.visitId,
							patientId: act.patientId,
							patientFullName: act.patientFullName,
							doctorName,
							discrepancyType: "missing_writeoff",
							billedItemName: itemName,
							billedBrand: recognizedBrand,
							warehouseTransactionsCount: warehouseRecorded.length,
							auditRecommendation:
								"Оформить списание соответствующего артикула со склада",
						},
					},
				});
			} else if (recognizedBrand) {
				const matchBrandTx = anyImplantTx.some((t) =>
					normalizeText(t.itemName).includes(recognizedBrand),
				);
				if (!matchBrandTx) {
					const writtenOff = anyImplantTx.map((t) => t.itemName).join(", ");
					alerts.push({
						id: `inv_recon_service_sku_${act.visitId}_${item.id}`,
						organizationId: act.organizationId,
						visitId: act.visitId,
						patientId: act.patientId,
						patientFullName: act.patientFullName,
						doctorId: act.doctorId ?? null,
						doctorName,
						shiftDate: act.shiftDate,
						discrepancyType: "sku_mismatch",
						discrepancyTypeRu: DISCREPANCY_TYPE_RU_MAP.sku_mismatch,
						severity: "CRITICAL",
						billedOrInstalled: {
							itemName,
							brand: recognizedBrand,
							sku: itemCode,
							quantity: Number(item.quantity) || 1,
							estimatedPriceRub: Number(item.priceRub) || 55000,
							lotNumber: null,
							toothNumberFdi: null,
						},
						warehouseRecorded,
						message: `🚨 ПЕРЕСОРТ В ЧЕКЕ: В чеке указана услуга с брендом «${recognizedBrand.toUpperCase()}», но со склада списан другой артикул «${writtenOff}» (пациент: ${act.patientFullName}).`,
						suggestedAction: {
							actionId: "investigate_inventory_trail",
							title: "Поднять аудит-трейл расхода ТМЦ",
							payload: {
								visitId: act.visitId,
								patientId: act.patientId,
								patientFullName: act.patientFullName,
								doctorName,
								discrepancyType: "sku_mismatch",
								billedItemName: itemName,
								billedBrand: recognizedBrand,
								warehouseTransactionsCount: warehouseRecorded.length,
								auditRecommendation:
									"Сопоставить номенклатуру чека со складской накладной",
							},
						},
					});
				}
			}
		}
	}

	return alerts;
}

/**
 * SanPiN 3.3686-21 Sterilization & Kraft Pack Storage Audit.
 * Scans kraft packs and sterilization records to flag packs exceeding 50 days (or nearing expiration <= 3 days).
 */
export async function runSanpinSterilizationAudit(options?: {
	organizationId?: string | undefined;
	now?: Date | undefined;
	warningWindowDays?: number | undefined;
}): Promise<SanpinSterilizationAlertItem[]> {
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
}

/**
 * Financial & Warehouse Inventory Reconciliation for High-Cost Materials.
 * Compares completed surgical acts and installed implants with warehouse stock movements.
 */
export async function runExpensiveMaterialsInventoryAudit(options?: {
	organizationId?: string | undefined;
	targetDate?: Date | undefined;
	lookbackHours?: number | undefined;
}): Promise<InventoryReconciliationAlertItem[]> {
	const now = options?.targetDate ?? new Date();
	const lookbackHours = options?.lookbackHours ?? 48;
	const windowStart = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);

	const orgFilter = options?.organizationId
		? eq(visits.organizationId, options.organizationId)
		: undefined;

	// 1. Fetch completed visits in target window
	const visitConditions = [
		gte(visits.createdAt, windowStart),
		lte(visits.createdAt, now),
	];
	if (orgFilter) {
		visitConditions.push(orgFilter);
	}

	const shiftVisits = await db
		.select({
			visitId: visits.id,
			organizationId: visits.organizationId,
			patientId: visits.patientId,
			appointmentId: visits.appointmentId,
			complaint: visits.complaint,
			diagnosis: visits.diagnosis,
			treatmentPlan: visits.treatmentPlan,
			doctorSummary: visits.doctorSummary,
			status: visits.status,
			createdAt: visits.createdAt,
			patientFullName: patients.fullName,
		})
		.from(visits)
		.leftJoin(patients, eq(visits.patientId, patients.id))
		.where(and(...visitConditions))
		.orderBy(desc(visits.createdAt));

	const alerts: InventoryReconciliationAlertItem[] = [];

	for (const v of shiftVisits) {
		if (!v.patientId) continue;
		const patientFullName = v.patientFullName || "Пациент";

		// 2. Fetch implant installations for this visit
		const implantInstalls = await db
			.select({
				id: patientImplantInstallations.id,
				implantBrand: patientImplantInstallations.implantBrand,
				toothNumberFdi: patientImplantInstallations.toothNumberFdi,
				lotNumber: patientImplantInstallations.lotNumber,
				serialNumber: patientImplantInstallations.serialNumber,
				boneGraftMaterial: patientImplantInstallations.boneGraftMaterial,
				membraneUsed: patientImplantInstallations.membraneUsed,
				installedAt: patientImplantInstallations.installedAt,
				surgeonDoctorId: patientImplantInstallations.surgeonDoctorId,
				doctorName: users.fullName,
			})
			.from(patientImplantInstallations)
			.leftJoin(
				users,
				eq(patientImplantInstallations.surgeonDoctorId, users.id),
			)
			.where(
				and(
					eq(patientImplantInstallations.organizationId, v.organizationId),
					eq(patientImplantInstallations.patientId, v.patientId),
					or(
						eq(patientImplantInstallations.visitId, v.visitId),
						and(
							gte(patientImplantInstallations.installedAt, windowStart),
							lte(patientImplantInstallations.installedAt, now),
						),
					),
				),
			);

		// 3. Fetch treatment items billed for this visit
		const billedItems = await db
			.select({
				id: treatmentItems.id,
				serviceId: treatmentItems.serviceId,
				quantity: treatmentItems.quantity,
				priceRub: treatmentItems.priceRub,
				status: treatmentItems.status,
				serviceTitle: services.title,
				serviceCode: services.code,
				serviceCategory: services.category,
			})
			.from(treatmentItems)
			.leftJoin(services, eq(treatmentItems.serviceId, services.id))
			.where(
				and(
					eq(treatmentItems.organizationId, v.organizationId),
					eq(treatmentItems.visitId, v.visitId),
				),
			);

		// 4. Fetch warehouse stock movement transactions for this visit
		const warehouseTx = await db
			.select({
				id: inventoryTransactions.id,
				itemId: inventoryTransactions.itemId,
				inventoryItemId: inventoryTransactions.inventoryItemId,
				transactionType: inventoryTransactions.transactionType,
				qty: inventoryTransactions.qty,
				quantityChanged: inventoryTransactions.quantityChanged,
				unitCostRub: inventoryTransactions.unitCostRub,
				notes: inventoryTransactions.notes,
				createdAt: inventoryTransactions.createdAt,
				itemName: inventoryItems.name,
				sku: inventoryItems.sku,
				category: inventoryItems.category,
			})
			.from(inventoryTransactions)
			.leftJoin(
				inventoryItems,
				eq(
					inventoryItems.id,
					sql`COALESCE(${inventoryTransactions.itemId}, ${inventoryTransactions.inventoryItemId})`,
				),
			)
			.where(
				and(
					eq(inventoryTransactions.organizationId, v.organizationId),
					eq(inventoryTransactions.visitId, v.visitId),
				),
			);

		const actInput: SurgicalActInput = {
			visitId: v.visitId,
			organizationId: v.organizationId,
			patientId: v.patientId,
			patientFullName,
			doctorId: implantInstalls[0]?.surgeonDoctorId ?? null,
			doctorName: implantInstalls[0]?.doctorName ?? "Хирург-имплантолог",
			shiftDate: v.createdAt.toLocaleDateString("ru-RU"),
			implantInstallations: implantInstalls,
			billedItems,
		};

		const actAlerts = reconcileSurgicalActWithInventory(actInput, warehouseTx);
		alerts.push(...actAlerts);
	}

	return alerts;
}

/**
 * Combined Nightly 21:30 PM SanPiN 3.3686-21 & Inventory Audit Scan.
 * Generates a unified, quiet digest for Head Nurse and Chief Doctor / Warehouse Manager.
 */
export async function runSanpinAndInventoryAudit(options?: {
	organizationId?: string | undefined;
	now?: Date | undefined;
	lookbackHours?: number | undefined;
	warningWindowDays?: number | undefined;
}): Promise<SanpinAndInventoryAuditDigest[]> {
	const now = options?.now ?? new Date();
	const orgId = options?.organizationId;

	const sanpinOptions: {
		organizationId?: string;
		now?: Date;
		warningWindowDays?: number;
	} = {};
	if (orgId) sanpinOptions.organizationId = orgId;
	sanpinOptions.now = now;
	if (options?.warningWindowDays !== undefined)
		sanpinOptions.warningWindowDays = options.warningWindowDays;

	const sanpinAlerts = await runSanpinSterilizationAudit(sanpinOptions);

	const inventoryOptions: {
		organizationId?: string;
		targetDate?: Date;
		lookbackHours?: number;
	} = {};
	if (orgId) inventoryOptions.organizationId = orgId;
	inventoryOptions.targetDate = now;
	if (options?.lookbackHours !== undefined)
		inventoryOptions.lookbackHours = options.lookbackHours;

	const inventoryAlerts =
		await runExpensiveMaterialsInventoryAudit(inventoryOptions);

	// Group alerts by organization
	const orgMap = new Map<
		string,
		{
			sanpin: SanpinSterilizationAlertItem[];
			inventory: InventoryReconciliationAlertItem[];
		}
	>();

	if (orgId) {
		orgMap.set(orgId, { sanpin: [], inventory: [] });
	}

	for (const a of sanpinAlerts) {
		if (!orgMap.has(a.organizationId)) {
			orgMap.set(a.organizationId, { sanpin: [], inventory: [] });
		}
		orgMap.get(a.organizationId)?.sanpin.push(a);
	}

	for (const inv of inventoryAlerts) {
		if (!orgMap.has(inv.organizationId)) {
			orgMap.set(inv.organizationId, { sanpin: [], inventory: [] });
		}
		orgMap.get(inv.organizationId)?.inventory.push(inv);
	}

	// Fallback if no alerts but org was requested
	if (orgMap.size === 0 && orgId) {
		orgMap.set(orgId, { sanpin: [], inventory: [] });
	}

	const digests: SanpinAndInventoryAuditDigest[] = [];

	for (const [targetOrgId, data] of orgMap.entries()) {
		let totalDiscrepancyRub = 0;
		for (const inv of data.inventory) {
			totalDiscrepancyRub += inv.billedOrInstalled.estimatedPriceRub;
		}

		const expiredCount = data.sanpin.filter(
			(s) => s.status === "EXPIRED",
		).length;
		const expiringSoonCount = data.sanpin.filter(
			(s) => s.status === "EXPIRING_SOON",
		).length;

		digests.push({
			id: `sanpin_inv_digest_${targetOrgId}_${now.getTime()}`,
			organizationId: targetOrgId,
			scanDate: now.toLocaleDateString("ru-RU"),
			scanTimestamp: now.toISOString(),
			summary: {
				totalKraftPacksChecked: data.sanpin.length,
				expiredPacksCount: expiredCount,
				expiringSoonPacksCount: expiringSoonCount,
				totalSurgicalActsAudited: data.inventory.length,
				reconciledSurgicalActsCount: 0,
				discrepantSurgicalActsCount: data.inventory.length,
				totalEstimatedDiscrepancyRub: totalDiscrepancyRub,
			},
			sanpinAlerts: data.sanpin,
			inventoryDiscrepancyAlerts: data.inventory,
			createdAt: now.toISOString(),
		});
	}

	return digests;
}
