/**
 * inventoryDeductionRunner.ts — Layer 1: High-Cost Surgical Inventory & Financial Audit Trail.
 *
 * Reconciles completed surgical acts, installed implants (Straumann, Osstem, Nobel, etc.),
 * bone grafts, and barrier membranes with warehouse stock movements (`inventory_transactions`).
 * Detects missing write-offs, SKU/brand discrepancies (пересорт), and unrecorded biomaterials.
 */

import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	inventoryItems,
	inventoryTransactions,
	patientImplantInstallations,
	patients,
	services,
	treatmentItems,
	users,
	visits,
} from "../../../db/schema.js";
import {
	DISCREPANCY_TYPE_RU_MAP,
	type ExpensiveMaterialsInventoryAuditOptions,
	type InventoryReconciliationAlertItem,
	type SurgicalActInput,
	type WarehouseTransactionInput,
} from "./types.js";

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
 * Financial & Warehouse Inventory Reconciliation for High-Cost Materials.
 * Compares completed surgical acts and installed implants with warehouse stock movements.
 */
export async function runExpensiveMaterialsInventoryAudit(options?: ExpensiveMaterialsInventoryAuditOptions): Promise<{
	alerts: InventoryReconciliationAlertItem[];
	totalSurgicalActsAudited: number;
}> {
	try {
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
		let surgicalActsCount = 0;

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

			const isSurgical =
				implantInstalls.length > 0 ||
				billedItems.some(
					(b) =>
						(b.serviceCode && b.serviceCode.startsWith("A16.07")) ||
						(b.serviceTitle && normalizeText(b.serviceTitle).includes("имплант")),
				);

			if (isSurgical) {
				surgicalActsCount++;
			}

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

		return { alerts, totalSurgicalActsAudited: surgicalActsCount };
	} catch (error) {
		console.error("[SanpinAndInventoryDaemon:ERROR] Failed to run expensive materials inventory audit:", error);
		throw error;
	}
}
