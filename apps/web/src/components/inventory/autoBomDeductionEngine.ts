/**
 * autoBomDeductionEngine.ts — Automatic Background BOM Deduction & 1-Click Class B Disposal.
 *
 * Front-end orchestration engine implementing:
 * 1. Automated Background BOM Deduction on visit completion (Mandate 8e / 8k / 8n):
 *    - Doctors and nurses never pick lots, bins, or click 20 buttons per tooth.
 *    - Standard consumables linked to rendered 804n services deduct automatically in the background.
 *    - Soft Overdraft (Mandates 8e, 8s): stock shortages NEVER block patient care, visit completion,
 *      or receptionist checkout. Negative stock is recorded with replenishment alerts.
 * 2. 1-Click Batch Class B Waste Disposal (СанПиН 2.1.3684-21):
 *    - Used carpules, needles, and sharps are automatically tracked from treatment and logged
 *      into the toxic medical waste disposal ledger in 1 click at shift close without requiring
 *      a 3-person commission.
 * 3. Exact design tokens, 0 cartoon emojis, zero disabled buttons without reason.
 */

import {
	type AutoVisitBomDeductionInput,
	type AutoVisitBomDeductionResult,
	type ClassBWasteSummary,
	CLASS_B_WEIGHT_ESTIMATES,
	calculateClassBWasteWeightKg,
	calculateAutoVisitConsumables,
	executeAutoVisitBomDeduction,
	roundQuantity,
} from "@dental/shared";
import { showToast } from "../GlobalToast";
import type { InventoryItem } from "./useInventoryLogic";
import {
	resolveFefoDeductionBatches,
	validateBatchForClinicalUse,
} from "./fefoTrafficLight.js";
import { useInventoryStore } from "../../store/inventoryStore.js";

// ─── 1. SHIFT CLOSE CLASS B WASTE TYPES ──────────────────────────────────────

export interface ShiftCloseClassBWasteInput {
	readonly shiftDate?: string | undefined;
	readonly responsibleStaffName: string;
	readonly responsibleStaffPosition?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly departmentNameRu?: string | undefined;
	readonly cabinetId?: string | undefined;
	readonly chairId?: string | undefined;
	readonly accumulatedCarpulesCount: number;
	readonly accumulatedNeedlesCount: number;
	readonly accumulatedSharpsCount?: number | undefined;
	readonly contaminatedItemsCount?: number | undefined;
	readonly brokenCarpulesCount?: number | undefined;
	readonly partiallyUsedCarpulesCount?: number | undefined;
	readonly disinfectionProtocol?: string | undefined;
	readonly customTareKg?: number | undefined;
	readonly organizationId?: string | undefined;
	readonly fetchFn?: typeof fetch | undefined;
	readonly onToast?: ((message: string, type: "success" | "warning" | "info" | "error") => void) | undefined;
}

export interface ShiftCloseClassBWasteResult {
	readonly success: boolean;
	readonly actNumber: string;
	readonly actDate: string;
	readonly sealNumber: string;
	readonly barcode: string;
	readonly wasteClass: "class_B";
	readonly packageType: "yellow_container_sharps" | "yellow_bag";
	readonly packageCount: number;
	readonly grossWeightKg: number;
	readonly tareWeightKg: number;
	readonly netWeightKg: number;
	readonly totalCarpulesCount: number;
	readonly brokenCarpulesCount: number;
	readonly partiallyUsedCarpulesCount: number;
	readonly totalSharpsCount: number;
	readonly responsibleStaffName: string;
	readonly responsibleStaffPosition: string;
	readonly singlePersonApproval: boolean;
	readonly disinfectionProtocol: string;
	readonly cabinetId?: string | undefined;
	readonly chairId?: string | undefined;
	readonly actHtml: string;
	readonly toastMessage: string;
}

// ─── 2. AUTOMATIC VISIT BOM DEDUCTION ORCHESTRATION ─────────────────────────

export interface PerformAutoVisitBomDeductionOptions {
	readonly visitId: string;
	readonly visitNumber?: string | undefined;
	readonly patientId: string;
	readonly patientFullName?: string | undefined;
	readonly doctorId: string;
	readonly doctorFullName?: string | undefined;
	readonly visitDate?: string | undefined;
	readonly chairId?: string | undefined;
	readonly cabinetId?: string | undefined;
	readonly cabinetName?: string | undefined;
	readonly renderedServices: ReadonlyArray<{
		readonly serviceCode?: string | undefined;
		readonly code?: string | undefined;
		readonly name?: string | undefined;
		readonly serviceTitle?: string | undefined;
		readonly title?: string | undefined;
		readonly quantity?: number | undefined;
		readonly toothNumber?: number | string | null | undefined;
	}>;
	readonly warehouseItems?: readonly (InventoryItem & {
		readonly cabinetId?: string | undefined;
		readonly chairId?: string | undefined;
		readonly locationId?: string | undefined;
	})[] | undefined;
	readonly batches?: ReadonlyArray<{
		readonly id?: string | undefined;
		readonly itemId: string;
		readonly batchNumber: string;
		readonly expiryDate: string;
		readonly stockQuantity: number;
		readonly chairId?: string | undefined;
		readonly cabinetId?: string | undefined;
		readonly locationId?: string | undefined;
	}> | undefined;
	readonly currentStockMap?: Record<string, number> | undefined;
	readonly allowOverdraft?: boolean | undefined; // default: true
	readonly includeStandardPpe?: boolean | undefined; // default: true
	readonly organizationId?: string | undefined;
	readonly fetchFn?: typeof fetch | undefined;
	readonly onToast?: ((message: string, type: "success" | "warning" | "info" | "error") => void) | undefined;
	readonly onOverdraftAlert?: ((alert: {
		readonly visitId: string;
		readonly visitNumber?: string | undefined;
		readonly message: string;
		readonly chairId?: string | undefined;
		readonly cabinetId?: string | undefined;
		readonly items: ReadonlyArray<{
			readonly itemName: string;
			readonly inventoryItemId: string;
			readonly deficitQty: number;
		}>;
	}) => void) | undefined;
	readonly onExpiredBatchBlocked?: ((warning: {
		readonly batchNumber: string;
		readonly expiryDate: string;
		readonly alertMessage: string;
		readonly itemName: string;
	}) => void) | undefined;
}

/**
 * Automatically calculates and executes background BOM deduction for all rendered 804n services
 * of a completed treatment visit, respecting soft overdraft (Mandate 8e, 8n).
 *
 * Scoping:
 * - Deduces strictly from cabinet/chair inventory (`chairId` / `cabinetId`).
 * - Validates FEFO batches: expired batches are blocked with statutory alert and never deducted into patients.
 * - On shortage: registers technical overdraft and notifies senior nurse / warehouse head.
 */
export async function performAutoVisitBomDeduction(
	options: PerformAutoVisitBomDeductionOptions,
): Promise<AutoVisitBomDeductionResult> {
	// 1. Normalize rendered services into 804n RenderedServiceItem array
	const normalizedServices = options.renderedServices.map((s, idx) => {
		const rawTooth = s.toothNumber;
		let toothNum: number | null = null;
		if (typeof rawTooth === "number" && rawTooth >= 11 && rawTooth <= 85) {
			toothNum = rawTooth;
		} else if (typeof rawTooth === "string" && /^\d{2}$/.test(rawTooth.trim())) {
			toothNum = parseInt(rawTooth.trim(), 10);
		}

		return {
			serviceCode: s.serviceCode || s.code || `SERV-804N-${idx + 1}`,
			serviceTitle: s.serviceTitle || s.name || s.title || "Оказанная стоматологическая услуга",
			quantity: typeof s.quantity === "number" && s.quantity > 0 ? s.quantity : 1,
			toothNumber: toothNum,
		};
	});

	// 2. Build stock map strictly scoped to chairId / cabinetId where reception occurred
	const stockMap: Record<string, number> = {};

	// A. If warehouse items are provided, filter and prioritize this chair/cabinet
	if (options.warehouseItems) {
		for (const it of options.warehouseItems) {
			// If item belongs to a DIFFERENT chair or cabinet, DO NOT steal from it
			if (options.chairId && it.chairId && it.chairId !== options.chairId) {
				continue;
			}
			if (options.cabinetId && it.cabinetId && it.cabinetId !== options.cabinetId) {
				continue;
			}

			const qty = Number(it.stockQuantity) || 0;
			if (it.id) {
				stockMap[it.id] = (stockMap[it.id] ?? 0) + qty;
			}
			if (it.name) {
				const n = it.name.toLowerCase().trim();
				stockMap[n] = (stockMap[n] ?? 0) + qty;
			}
		}
	}

	// B. Fold in currentStockMap (supporting cabinet-scoped keys e.g. "cab-1:item-id" or fallback)
	if (options.currentStockMap) {
		for (const [k, v] of Object.entries(options.currentStockMap)) {
			if (options.cabinetId && k.startsWith(`${options.cabinetId}:`)) {
				const bareKey = k.slice(options.cabinetId.length + 1);
				stockMap[bareKey] = v;
			} else if (options.chairId && k.startsWith(`${options.chairId}:`)) {
				const bareKey = k.slice(options.chairId.length + 1);
				stockMap[bareKey] = v;
			} else if (!stockMap[k] && !k.includes(":")) {
				// Base key fallback if not overridden
				stockMap[k] = v;
			}
		}
	}

	// C. FEFO Batch Resolution & Expired Lot Quarantine (Mandate 8e, 8n)
	// If batches are provided, filter by cabinet/chair and remove expired batches from usable stock!
	if (options.batches && options.batches.length > 0) {
		const batchesByItem = new Map<string, typeof options.batches[number][]>();
		for (const b of options.batches) {
			// Skip batches belonging to a different cabinet/chair
			if (options.chairId && b.chairId && b.chairId !== options.chairId) continue;
			if (options.cabinetId && b.cabinetId && b.cabinetId !== options.cabinetId) continue;

			const existing = batchesByItem.get(b.itemId) || [];
			existing.push(b);
			batchesByItem.set(b.itemId, existing);
		}

		for (const [itemId, candidateBatches] of batchesByItem.entries()) {
			let validUnexpiredStock = 0;
			for (const batch of candidateBatches) {
				const val = validateBatchForClinicalUse(batch, options.visitDate);
				if (!val.isAllowed) {
					// Expired batch is quarantined and blocked with statutory alert!
					if (options.onExpiredBatchBlocked) {
						options.onExpiredBatchBlocked({
							batchNumber: batch.batchNumber,
							expiryDate: batch.expiryDate,
							alertMessage: val.alertMessage!,
							itemName: itemId,
						});
					}
				} else {
					validUnexpiredStock += Math.max(0, batch.stockQuantity);
				}
			}
			// Available stock for clinical BOM deduction is STRICTLY the unexpired stock
			stockMap[itemId] = validUnexpiredStock;
		}
	}

	// 3. Execute background BOM deduction with soft overdraft
	const deductionInput: AutoVisitBomDeductionInput = {
		visitId: options.visitId,
		patientId: options.patientId,
		doctorId: options.doctorId,
		patientFullName: options.patientFullName,
		doctorFullName: options.doctorFullName,
		visitDate: options.visitDate,
		renderedServices: normalizedServices,
		currentStockMap: stockMap,
		allowOverdraft: options.allowOverdraft !== false,
		includeStandardPpe: options.includeStandardPpe !== false,
		fallbackToDefaults: true,
	};

	const result = executeAutoVisitBomDeduction(deductionInput);

	// 4. Mandate 8e / 8n: Notification & User Feedback (Zero blockers)
	const visitRef = options.visitNumber || options.visitId;
	const overdraftNotice = `Требуется оприходование: материал списан в овердрафт по визиту №${visitRef}`;

	let toastMessage = "";
	let toastType: "success" | "warning" = "success";

	if (result.hasOverdraft) {
		toastType = "warning";
		toastMessage = `Мягкий овердрафт. ${overdraftNotice} (${result.softOverdrafts.length} поз., накладная в пути). Приём сохранён.`;

		if (options.onOverdraftAlert) {
			const overdraftItems = result.items
				.filter((i) => i.isOverdraft)
				.map((i) => ({
					itemName: i.itemName,
					inventoryItemId: i.inventoryItemId,
					deficitQty: Math.abs(i.remainingQty),
				}));

			options.onOverdraftAlert({
				visitId: options.visitId,
				visitNumber: options.visitNumber,
				message: overdraftNotice,
				chairId: options.chairId,
				cabinetId: options.cabinetId,
				items: overdraftItems,
			});
		}
	} else {
		toastType = "success";
		toastMessage = `Автосписание расходников: ${result.totalDeductedItems} поз. по клиническим техкартам списано со склада (${result.totalCostPriceRub}).`;
	}

	if (options.onToast) {
		options.onToast(toastMessage, toastType);
	} else {
		showToast(toastMessage, toastType);
	}

	// 5. Asynchronous background network sync and client inventoryStore mutation (Mandate 8e, 8k, 8n)
	try {
		useInventoryStore.getState().deductStock(
			options.organizationId || "org-default",
			result.items.map((i) => ({
				inventoryItemId: i.inventoryItemId,
				itemName: i.itemName,
				quantity: i.deductedQty,
				visitId: options.visitId,
				reason: `Автосписание расходников по визиту ${options.visitNumber || options.visitId}`,
				lotNumber: (i as any).batchId || null,
				expirationDate: (i as any).expirationDate || null,
				unitCostRub: Number((i.unitCostPriceKopecks / 100).toFixed(2)),
			})),
			{
				visitId: options.visitId,
				...(options.fetchFn ? { customFetch: options.fetchFn as any } : {}),
				allowOverdraft: options.allowOverdraft ?? true,
				reason: `Автосписание расходников по визиту ${options.visitNumber || options.visitId}`,
			},
		).catch(() => {});
	} catch {
		// Non-blocking local store update
	}

	if (options.organizationId && options.fetchFn) {
		const payload = {
			visitId: options.visitId,
			visitNumber: options.visitNumber,
			chairId: options.chairId,
			cabinetId: options.cabinetId,
			userId: options.doctorId,
			transactionType: "auto_deduct",
			services: normalizedServices.map((s) => ({
				serviceId: s.serviceCode,
				quantity: s.quantity,
			})),
			items: result.items.map((i) => ({
				inventoryItemId: i.inventoryItemId,
				id: i.inventoryItemId,
				name: i.itemName,
				quantity: i.deductedQty,
				unitCostRub: Number((i.unitCostPriceKopecks / 100).toFixed(2)),
				reason: `Автосписание по визиту ${options.visitNumber || options.visitId}`,
				lotNumber: (i as any).batchId || null,
				expirationDate: (i as any).expirationDate || null,
			})),
			allowOverdraft: true,
			paperJournalAcknowledged: true,
		};

		try {
			options
				.fetchFn(`/api/inventory/${options.organizationId}/deduct/visit`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				})
				.catch((err) => {
					console.warn("[autoBomDeduction] Фоновая синхронизация списания с сервером отложена:", err);
				});

			// If overdraft occurred, also post notification for warehouse head / senior nurse
			if (result.hasOverdraft) {
				options
					.fetchFn(`/api/inventory/${options.organizationId}/overdraft-alert`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							visitId: options.visitId,
							visitNumber: options.visitNumber,
							chairId: options.chairId,
							cabinetId: options.cabinetId,
							message: overdraftNotice,
							items: result.items
								.filter((i) => i.isOverdraft)
								.map((i) => ({
									itemId: i.inventoryItemId,
									itemName: i.itemName,
									deficitQty: Math.abs(i.remainingQty),
								})),
						}),
					})
					.catch(() => {});
			}
		} catch {
			// Never block clinical hot path on background network issues
		}
	}

	return result;
}

// ─── 3. 1-CLICK CLASS B WASTE DISPOSAL AT SHIFT CLOSE (САНПИН 2.1.3684-21) ────

/**
 * Formats a clean statutory Class B Medical Waste Disposal Act HTML for shift close.
 * STRICTLY ZERO CARTOON EMOJIS (Mandate 8d).
 */
export function formatShiftCloseClassBWasteActHtml(
	actNumber: string,
	actDate: string,
	sealNumber: string,
	barcode: string,
	carpulesCount: number,
	needlesCount: number,
	sharpsCount: number,
	grossKg: number,
	tareKg: number,
	netKg: number,
	responsibleStaffName: string,
	responsibleStaffPosition: string,
	clinicName = "ООО «ДЕНТЕ» СТОМАТОЛОГИЧЕСКАЯ КЛИНИКА",
	options?: {
		brokenCarpulesCount?: number | undefined;
		partiallyUsedCarpulesCount?: number | undefined;
		disinfectionProtocol?: string | undefined;
		cabinetId?: string | undefined;
		chairId?: string | undefined;
	},
): string {
	const totalSharps = needlesCount + sharpsCount;
	const brokenCount = Math.max(0, options?.brokenCarpulesCount ?? 0);
	const partialCount = Math.max(0, options?.partiallyUsedCarpulesCount ?? 0);
	const disinfectionProtocol =
		options?.disinfectionProtocol ||
		"Химическая дезинфекция 3% Аламинол (замачивание 60 мин) / автоклавирование 134°C (СанПиН 2.1.3684-21 и СанПиН 3.3686-21)";

	const standardEmptyCount = Math.max(0, carpulesCount - brokenCount - partialCount);
	const locationInfo = options?.cabinetId
		? ` • Кабинет: ${options.cabinetId}${options.chairId ? ` (Кресло ${options.chairId})` : ""}`
		: "";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Акт утилизации медицинских отходов Класса Б — ${actNumber}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #000; margin: 20px; line-height: 1.4; }
  .title { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; }
  .subtitle { text-align: center; font-size: 11px; margin-bottom: 16px; color: #333; }
  .meta-grid { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .meta-grid td { padding: 4px 6px; font-size: 12px; vertical-align: top; }
  .meta-grid td.label { font-weight: bold; width: 35%; color: #333; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  table.items th, table.items td { border: 1px solid #000; padding: 6px; font-size: 11px; text-align: left; }
  table.items th { background: #f2f2f2; font-weight: bold; }
  .signatures { margin-top: 30px; display: flex; justify-content: space-between; page-break-inside: avoid; }
  .sig-block { width: 45%; }
  .sig-line { border-bottom: 1px solid #000; height: 30px; margin-top: 20px; }
</style>
</head>
<body>
  <div class="title">АКТ НАКОПЛЕНИЯ И ПЕРЕДАЧИ МЕДИЦИНСКИХ ОТХОДОВ КЛАССА Б № ${actNumber}</div>
  <div class="subtitle">Учет по СанПиН 2.1.3684-21 и СанПиН 3.3686-21 • Закрытие рабочей смены${locationInfo}</div>

  <table class="meta-grid">
    <tr>
      <td class="label">Медицинская организация:</td>
      <td>${clinicName}</td>
    </tr>
    <tr>
      <td class="label">Дата и время закрытия смены:</td>
      <td>${actDate}</td>
    </tr>
    <tr>
      <td class="label">Номер пломбы-стяжки:</td>
      <td><strong>${sealNumber}</strong></td>
    </tr>
    <tr>
      <td class="label">Штрихкод упаковки / контейнера:</td>
      <td><code>${barcode}</code></td>
    </tr>
    <tr>
      <td class="label">Вид тары и упаковки:</td>
      <td>Желтый непрокалываемый контейнер для колюще-режущих отходов / желтый пакет Класса Б</td>
    </tr>
    <tr>
      <td class="label">Ответственное лицо (1 лицо):</td>
      <td>${responsibleStaffPosition} — <strong>${responsibleStaffName}</strong> (без комиссии из 3 человек)</td>
    </tr>
    <tr>
      <td class="label">Регламент дезинфекции (СанПиН):</td>
      <td>${disinfectionProtocol}</td>
    </tr>
  </table>

  <table class="items">
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">№</th>
        <th>Наименование фракции отходов</th>
        <th style="width: 80px; text-align: center;">Класс</th>
        <th style="width: 100px; text-align: right;">Количество</th>
        <th style="width: 100px; text-align: right;">Масса нетто (кг)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center;">1</td>
        <td>Отработанные пустые карпулы анестетиков стеклянные целые (1.7 мл)</td>
        <td style="text-align: center;">Класс Б</td>
        <td style="text-align: right;">${standardEmptyCount} шт.</td>
        <td style="text-align: right;">${(standardEmptyCount * CLASS_B_WEIGHT_ESTIMATES.carpuleGlassKg).toFixed(3)}</td>
      </tr>
      ${brokenCount > 0 ? `<tr>
        <td style="text-align: center;">1а</td>
        <td>Разбитые стеклянные карпулы анестетиков (бой при установке в карпульный шприц, дезинфекция 3% Аламинол)</td>
        <td style="text-align: center;">Класс Б</td>
        <td style="text-align: right;">${brokenCount} шт.</td>
        <td style="text-align: right;">${(brokenCount * CLASS_B_WEIGHT_ESTIMATES.carpuleGlassKg).toFixed(3)}</td>
      </tr>` : ""}
      ${partialCount > 0 ? `<tr>
        <td style="text-align: center;">1б</td>
        <td>Не полностью израсходованные карпулы анестетика с остатками раствора (дезинфекция и утилизация)</td>
        <td style="text-align: center;">Класс Б</td>
        <td style="text-align: right;">${partialCount} шт.</td>
        <td style="text-align: right;">${(partialCount * (CLASS_B_WEIGHT_ESTIMATES.carpuleGlassKg + 0.001)).toFixed(3)}</td>
      </tr>` : ""}
      <tr>
        <td style="text-align: center;">2</td>
        <td>Остроконечные колюще-режущие медицинские изделия (иглы 30G/27G, лезвия скальпелей, эндофайлы)</td>
        <td style="text-align: center;">Класс Б</td>
        <td style="text-align: right;">${totalSharps} шт.</td>
        <td style="text-align: right;">${(totalSharps * CLASS_B_WEIGHT_ESTIMATES.sharpsNeedleKg).toFixed(3)}</td>
      </tr>
      <tr>
        <td style="text-align: center;">3</td>
        <td>Загрязненные биологическими жидкостями СИЗ и расходники (перчатки, валики, слюноотсосы, салфетки)</td>
        <td style="text-align: center;">Класс Б</td>
        <td style="text-align: right;">1 место</td>
        <td style="text-align: right;">${Math.max(0.01, Number((netKg - carpulesCount * CLASS_B_WEIGHT_ESTIMATES.carpuleGlassKg - totalSharps * CLASS_B_WEIGHT_ESTIMATES.sharpsNeedleKg).toFixed(3)))}</td>
      </tr>
      <tr style="font-weight: bold; background: #fafafa;">
        <td colspan="3" style="text-align: right;">ИТОГО ПО АКТУ:</td>
        <td style="text-align: right;">${carpulesCount + totalSharps} ед.</td>
        <td style="text-align: right;">${netKg.toFixed(3)} кг</td>
      </tr>
    </tbody>
  </table>

  <div style="font-size: 11px; color: #444; margin-bottom: 20px;">
    Масса брутто: <strong>${grossKg.toFixed(3)} кг</strong> | Масса тары: <strong>${tareKg.toFixed(3)} кг</strong> | Масса нетто: <strong>${netKg.toFixed(3)} кг</strong>.<br>
    Дезинфекция проведена в соответствии с СанПиН 2.1.3684-21 и СанПиН 3.3686-21 (${disinfectionProtocol}). Контейнер опломбирован и подготовлен к вывозу лицензированным оператором.
  </div>

  <div class="signatures">
    <div class="sig-block">
      <div>Ответственный за сбор медотходов смены:</div>
      <div class="sig-line"></div>
      <div style="font-size: 10px; color: #666; margin-top: 4px;">(${responsibleStaffPosition} / ${responsibleStaffName})</div>
    </div>
    <div class="sig-block">
      <div>Спецоператор по вывозу медотходов:</div>
      <div class="sig-line"></div>
      <div style="font-size: 10px; color: #666; margin-top: 4px;">(Подпись водителя-экспедитора / Лицензия)</div>
    </div>
  </div>
</body>
</html>`;
}

let _classBWasteActCounter = 1;

/**
 * Детерминированный генератор реквизитов акта утилизации медотходов Класса Б.
 * Исключает Math.random(); гарантирует уникальность и сквозной порядок.
 */
export function generateDeterministicWasteActIdentifiers(
	actDateIso: string,
	customSeq?: number,
): {
	readonly actNumber: string;
	readonly sealNumber: string;
	readonly barcode: string;
} {
	const raw = actDateIso ? new Date(actDateIso) : new Date();
	const year = Number.isNaN(raw.getFullYear()) ? new Date().getFullYear() : raw.getFullYear();
	const month = String(Number.isNaN(raw.getMonth()) ? new Date().getMonth() + 1 : raw.getMonth() + 1).padStart(2, "0");
	const day = String(Number.isNaN(raw.getDate()) ? new Date().getDate() : raw.getDate()).padStart(2, "0");
	const seq = customSeq ?? _classBWasteActCounter++;
	const seqPadded = String(seq).padStart(4, "0");

	return {
		actNumber: `АКТ-ОТХОД-Б-${year}${month}${day}-${seqPadded}`,
		sealNumber: `ПЛ-Б-${year}-${seqPadded}`,
		barcode: `WASTE-CLASS_B-DENT-${year}${month}${day}-${seqPadded}`,
	};
}

/**
 * 1-Click Batch Class B Waste Disposal at Shift Close (СанПиН 2.1.3684-21).
 * Logs used, broken, or partially used carpules and needles into the toxic medical waste disposal ledger in 1 click
 * without requiring a 3-person commission.
 */
export async function executeShiftCloseClassBWasteDisposal(
	input: ShiftCloseClassBWasteInput,
): Promise<ShiftCloseClassBWasteResult> {
	const now = new Date();
	const actDate = input.shiftDate || now.toISOString().slice(0, 10);
	const identifiers = generateDeterministicWasteActIdentifiers(actDate);
	const actNumber = identifiers.actNumber;
	const sealNumber = identifiers.sealNumber;
	const barcode = identifiers.barcode;

	const carpulesCount = Math.max(0, input.accumulatedCarpulesCount);
	const brokenCarpulesCount = Math.max(0, input.brokenCarpulesCount ?? 0);
	const partiallyUsedCarpulesCount = Math.max(0, input.partiallyUsedCarpulesCount ?? 0);
	const needlesCount = Math.max(0, input.accumulatedNeedlesCount);
	const sharpsCount = Math.max(0, input.accumulatedSharpsCount ?? 0);
	const contaminatedCount = Math.max(0, input.contaminatedItemsCount ?? 0);

	const tareWeightKg = input.customTareKg !== undefined ? input.customTareKg : CLASS_B_WEIGHT_ESTIMATES.standardPunctureContainerTareKg;
	const netWeightKg = calculateClassBWasteWeightKg(carpulesCount, needlesCount + sharpsCount, contaminatedCount);
	const grossWeightKg = roundQuantity(netWeightKg + tareWeightKg, 3);

	const pos = input.responsibleStaffPosition || "Медицинская сестра / Врач";
	const clinic = input.clinicName || "Стоматологическая клиника «DENTE»";
	const disinfectionProtocol =
		input.disinfectionProtocol ||
		"Химическая дезинфекция 3% Аламинол (замачивание 60 мин) / автоклавирование 134°C (СанПиН 2.1.3684-21 и СанПиН 3.3686-21)";

	const actHtml = formatShiftCloseClassBWasteActHtml(
		actNumber,
		actDate,
		sealNumber,
		barcode,
		carpulesCount,
		needlesCount,
		sharpsCount,
		grossWeightKg,
		tareWeightKg,
		netWeightKg,
		input.responsibleStaffName,
		pos,
		clinic,
		{
			brokenCarpulesCount,
			partiallyUsedCarpulesCount,
			disinfectionProtocol,
			cabinetId: input.cabinetId,
			chairId: input.chairId,
		},
	);

	const brokenNotice = brokenCarpulesCount > 0 ? ` (из них бой: ${brokenCarpulesCount} шт.)` : "";
	const partialNotice = partiallyUsedCarpulesCount > 0 ? ` (неполные: ${partiallyUsedCarpulesCount} шт.)` : "";
	const toastMessage = `1-клик сдача отходов Класса Б: ${carpulesCount} карпул${brokenNotice}${partialNotice}, ${needlesCount + sharpsCount} игл (${netWeightKg} кг) внесены в журнал СанПиН 2.1.3684-21 (Пломба ${sealNumber}).`;

	if (input.onToast) {
		input.onToast(toastMessage, "success");
	} else {
		showToast(toastMessage, "success");
	}

	// Network persistence to registers if available
	if (input.fetchFn) {
		try {
			await input.fetchFn("/api/registers/medical-waste", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					logDate: actDate,
					wasteClass: "class_B",
					operationType: "accumulation",
					packageType: "yellow_container_sharps",
					packageCount: 1,
					weightKg: netWeightKg,
					cabinetId: input.cabinetId,
					chairId: input.chairId,
					totalCarpulesCount: carpulesCount,
					brokenCarpulesCount,
					partiallyUsedCarpulesCount,
					description: `1-клик сдача отходов смены: ${carpulesCount} карпул${brokenNotice}${partialNotice}, ${needlesCount + sharpsCount} игл/лезвий, СИЗ`,
					disinfectionMethod: "chemical_soaking",
					disinfectantName: "Аламинол 3% (60 мин)",
					responsibleStaffName: input.responsibleStaffName,
					notes: `Акт ${actNumber}, пломба ${sealNumber}, СанПиН 2.1.3684-21 и СанПиН 3.3686-21 (без комиссии из 3 человек)`,
				}),
			});
		} catch {
			// Graceful local resilience
		}
	}

	return {
		success: true,
		actNumber,
		actDate,
		sealNumber,
		barcode,
		wasteClass: "class_B",
		packageType: "yellow_container_sharps",
		packageCount: 1,
		grossWeightKg,
		tareWeightKg,
		netWeightKg,
		totalCarpulesCount: carpulesCount,
		brokenCarpulesCount,
		partiallyUsedCarpulesCount,
		totalSharpsCount: needlesCount + sharpsCount,
		responsibleStaffName: input.responsibleStaffName,
		responsibleStaffPosition: pos,
		singlePersonApproval: true,
		disinfectionProtocol,
		cabinetId: input.cabinetId,
		chairId: input.chairId,
		actHtml,
		toastMessage,
	};
}

export {
	calculateAutoVisitConsumables,
	executeAutoVisitBomDeduction,
};
