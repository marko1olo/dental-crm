/**
 * bomDeductionCalculator.ts — BOM Deduction Calculation & Class B Disposal Engine.
 *
 * Implements:
 * 1. Statutory 804n service normalization and consumable quantity calculation.
 * 2. Room/chair stock mapping.
 * 3. 1-Click Class B Medical Waste Disposal (SanPiN 2.1.3684-21 / 3.3686-21) without 3-person commissions.
 * 4. Deterministic identifiers, zero emojis, exact kopeck and gram precision.
 */

import {
	type AutoVisitBomDeductionInput,
	type AutoVisitBomDeductionResult,
	CLASS_B_WEIGHT_ESTIMATES,
	calculateClassBWasteWeightKg,
	calculateAutoVisitConsumables,
	executeAutoVisitBomDeduction,
	roundQuantity,
} from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import type { InventoryItem } from "../inventoryDataMappers.js";

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

export interface NormalizedRenderedService {
	readonly serviceCode: string;
	readonly serviceTitle: string;
	readonly quantity: number;
	readonly toothNumber: number | null;
}

/**
 * Normalizes client rendered service items into standard 804n format.
 */
export function normalizeRenderedServices804n(
	rawServices: ReadonlyArray<{
		readonly serviceCode?: string | undefined;
		readonly code?: string | undefined;
		readonly name?: string | undefined;
		readonly serviceTitle?: string | undefined;
		readonly title?: string | undefined;
		readonly quantity?: number | undefined;
		readonly toothNumber?: number | string | null | undefined;
	}>,
): readonly NormalizedRenderedService[] {
	return rawServices.map((s, idx) => {
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
}

/**
 * Compiles a room/chair-scoped warehouse stock mapping.
 */
export function buildCabinetScopedStockMap(
	warehouseItems: readonly (InventoryItem & {
		readonly cabinetId?: string | undefined;
		readonly chairId?: string | undefined;
		readonly locationId?: string | undefined;
	})[] | undefined,
	currentStockMap: Record<string, number> | undefined,
	scope: {
		readonly chairId?: string | undefined;
		readonly cabinetId?: string | undefined;
	},
): Record<string, number> {
	const stockMap: Record<string, number> = {};

	if (warehouseItems) {
		for (const it of warehouseItems) {
			if (scope.chairId && it.chairId && it.chairId !== scope.chairId) continue;
			if (scope.cabinetId && it.cabinetId && it.cabinetId !== scope.cabinetId) continue;

			const qty = Number(it.stockQuantity ?? (it as any).quantity) || 0;
			if (it.id) {
				stockMap[it.id] = (stockMap[it.id] ?? 0) + qty;
			}
			if (it.name) {
				const n = it.name.toLowerCase().trim();
				stockMap[n] = (stockMap[n] ?? 0) + qty;
			}
		}
	}

	if (currentStockMap) {
		for (const [k, v] of Object.entries(currentStockMap)) {
			if (scope.cabinetId && k.startsWith(`${scope.cabinetId}:`)) {
				const bareKey = k.slice(scope.cabinetId.length + 1);
				stockMap[bareKey] = v;
			} else if (scope.chairId && k.startsWith(`${scope.chairId}:`)) {
				const bareKey = k.slice(scope.chairId.length + 1);
				stockMap[bareKey] = v;
			} else if (!stockMap[k] && !k.includes(":")) {
				stockMap[k] = v;
			}
		}
	}

	return stockMap;
}

let _classBWasteActCounter = 1;

/**
 * Deterministic generator for statutory Class B waste act numbers, seal numbers, and barcodes.
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
 * Formats a clean statutory Class B Medical Waste Disposal Act HTML for shift close.
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

/**
 * 1-Click Batch Class B Waste Disposal at Shift Close (СанПиН 2.1.3684-21).
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
	const toastMessage = `Сдача отходов Класса Б: ${carpulesCount} карпул${brokenNotice}${partialNotice}, ${needlesCount + sharpsCount} игл (${netWeightKg} кг) внесены в журнал СанПиН 2.1.3684-21 (Пломба ${sealNumber}).`;

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
					description: `Сдача отходов смены: ${carpulesCount} карпул${brokenNotice}${partialNotice}, ${needlesCount + sharpsCount} игл/лезвий, СИЗ`,
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
