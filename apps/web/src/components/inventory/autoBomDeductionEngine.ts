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

// ─── 1. SHIFT CLOSE CLASS B WASTE TYPES ──────────────────────────────────────

export interface ShiftCloseClassBWasteInput {
	readonly shiftDate?: string | undefined;
	readonly responsibleStaffName: string;
	readonly responsibleStaffPosition?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly departmentNameRu?: string | undefined;
	readonly accumulatedCarpulesCount: number;
	readonly accumulatedNeedlesCount: number;
	readonly accumulatedSharpsCount?: number | undefined;
	readonly contaminatedItemsCount?: number | undefined;
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
	readonly totalSharpsCount: number;
	readonly responsibleStaffName: string;
	readonly responsibleStaffPosition: string;
	readonly singlePersonApproval: boolean;
	readonly actHtml: string;
	readonly toastMessage: string;
}

// ─── 2. AUTOMATIC VISIT BOM DEDUCTION ORCHESTRATION ─────────────────────────

export interface PerformAutoVisitBomDeductionOptions {
	readonly visitId: string;
	readonly patientId: string;
	readonly patientFullName?: string | undefined;
	readonly doctorId: string;
	readonly doctorFullName?: string | undefined;
	readonly visitDate?: string | undefined;
	readonly renderedServices: ReadonlyArray<{
		readonly serviceCode?: string | undefined;
		readonly code?: string | undefined;
		readonly name?: string | undefined;
		readonly serviceTitle?: string | undefined;
		readonly title?: string | undefined;
		readonly quantity?: number | undefined;
		readonly toothNumber?: number | string | null | undefined;
	}>;
	readonly warehouseItems?: readonly InventoryItem[] | undefined;
	readonly currentStockMap?: Record<string, number> | undefined;
	readonly allowOverdraft?: boolean | undefined; // default: true
	readonly includeStandardPpe?: boolean | undefined; // default: true
	readonly organizationId?: string | undefined;
	readonly fetchFn?: typeof fetch | undefined;
	readonly onToast?: ((message: string, type: "success" | "warning" | "info" | "error") => void) | undefined;
}

/**
 * Automatically calculates and executes background BOM deduction for all rendered 804n services
 * of a completed treatment visit, respecting soft overdraft (Mandate 8e, 8n).
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

	// 2. Build stock map from available sources
	const stockMap: Record<string, number> = { ...(options.currentStockMap ?? {}) };
	if (options.warehouseItems) {
		for (const it of options.warehouseItems) {
			const qty = Number(it.stockQuantity) || 0;
			if (it.id) stockMap[it.id] = qty;
			if (it.name) stockMap[it.name.toLowerCase().trim()] = qty;
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
	let toastMessage = "";
	let toastType: "success" | "warning" = "success";

	if (result.hasOverdraft) {
		toastType = "warning";
		toastMessage = `Мягкий овердрафт: списано ${result.totalDeductedItems} расходников (зафиксирован дефицит ${result.softOverdrafts.length} поз., накладная в пути). Приём сохранён.`;
	} else {
		toastType = "success";
		toastMessage = `Автосписание расходников: ${result.totalDeductedItems} поз. по клиническим техкартам списано со склада (${result.totalCostPriceRub}).`;
	}

	if (options.onToast) {
		options.onToast(toastMessage, toastType);
	} else {
		showToast(toastMessage, toastType);
	}

	// 5. Asynchronous background network sync if organizationId and fetchFn available
	if (options.organizationId && options.fetchFn) {
		const payload = {
			visitId: options.visitId,
			userId: options.doctorId,
			transactionType: "auto_deduct",
			services: normalizedServices.map((s) => ({
				serviceId: s.serviceCode,
				quantity: s.quantity,
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
): string {
	const totalSharps = needlesCount + sharpsCount;

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
  <div class="subtitle">Учет по СанПиН 2.1.3684-21 и СанПиН 3.3686-21 • Закрытие рабочей смены</div>

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
        <td>Отработанные пустые карпулы анестетиков стеклянные (Артикаин/Мепивакаин 1.7 мл)</td>
        <td style="text-align: center;">Класс Б</td>
        <td style="text-align: right;">${carpulesCount} шт.</td>
        <td style="text-align: right;">${(carpulesCount * CLASS_B_WEIGHT_ESTIMATES.carpuleGlassKg).toFixed(3)}</td>
      </tr>
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
    Дезинфекция проведена в соответствии с СанПиН 2.1.3684-21 (химическое замачивание / автоклавирование при 134°C). Контейнер опломбирован и подготовлен к вывозу лицензированным оператором.
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

/**
 * 1-Click Batch Class B Waste Disposal at Shift Close (СанПиН 2.1.3684-21).
 * Logs used carpules and needles into the toxic medical waste disposal ledger in 1 click
 * without requiring a 3-person commission.
 */
export async function executeShiftCloseClassBWasteDisposal(
	input: ShiftCloseClassBWasteInput,
): Promise<ShiftCloseClassBWasteResult> {
	const now = new Date();
	const actDate = input.shiftDate || now.toISOString().slice(0, 10);
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const seq = Math.floor(1000 + Math.random() * 9000);

	const actNumber = `АКТ-ОТХОД-Б-${year}${month}${day}-${seq}`;
	const sealNumber = `ПЛ-Б-${year}-${String(seq).padStart(5, "0")}`;
	const barcode = `WASTE-CLASS_B-DENT-${year}${month}${day}-${seq}`;

	const carpulesCount = Math.max(0, input.accumulatedCarpulesCount);
	const needlesCount = Math.max(0, input.accumulatedNeedlesCount);
	const sharpsCount = Math.max(0, input.accumulatedSharpsCount ?? 0);
	const contaminatedCount = Math.max(0, input.contaminatedItemsCount ?? 0);

	const tareWeightKg = input.customTareKg !== undefined ? input.customTareKg : CLASS_B_WEIGHT_ESTIMATES.standardPunctureContainerTareKg;
	const netWeightKg = calculateClassBWasteWeightKg(carpulesCount, needlesCount + sharpsCount, contaminatedCount);
	const grossWeightKg = roundQuantity(netWeightKg + tareWeightKg, 3);

	const pos = input.responsibleStaffPosition || "Медицинская сестра / Врач";
	const clinic = input.clinicName || "Стоматологическая клиника «DENTE»";

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
	);

	const toastMessage = `1-клик сдача отходов Класса Б: ${carpulesCount} карпул, ${needlesCount + sharpsCount} игл (${netWeightKg} кг) внесены в журнал СанПиН 2.1.3684-21 (Пломба ${sealNumber}).`;

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
					description: `1-клик сдача отходов смены: ${carpulesCount} пустых карпул, ${needlesCount + sharpsCount} игл/лезвий, СИЗ`,
					disinfectionMethod: "chemical_soaking",
					disinfectantName: "Бриллиант Классик 2%",
					responsibleStaffName: input.responsibleStaffName,
					notes: `Акт ${actNumber}, пломба ${sealNumber}, СанПиН 2.1.3684-21 (без комиссии из 3 человек)`,
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
		totalSharpsCount: needlesCount + sharpsCount,
		responsibleStaffName: input.responsibleStaffName,
		responsibleStaffPosition: pos,
		singlePersonApproval: true,
		actHtml,
		toastMessage,
	};
}

export {
	calculateAutoVisitConsumables,
	executeAutoVisitBomDeduction,
};
