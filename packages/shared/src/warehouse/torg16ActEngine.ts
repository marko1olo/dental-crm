/**
 * ============================================================================
 * TORG-16 STATUTORY ACT ENGINE (ОКУД 0330216)
 * ============================================================================
 * Canonical Statutory Engine for Commodity & Material Write-Off (ТОРГ-16).
 *
 * STATUTORY BASE:
 * - Унифицированная форма № ТОРГ-16 «Акт о списании товаров»
 * - Код формы по ОКУД: 0330216
 * - Утверждена постановлением Госкомстата РФ от 25.12.1998 № 132
 * - Соответствует требованиям ст. 9 Федерального закона № 402-ФЗ «О бухгалтерском учете»
 * - Интегрирован со стандартами СанПиН 2.1.3678-20 (утилизация просроченных лексредств/изделий)
 *
 * CANONICAL SSOT:
 * - Единый источник истины для склада (Warehouse) и лечебных кабинетов (Doctor Autonomy).
 * - Поддерживает как коллегиальное списание (Комиссия), так и единоличное списание (Врач / Ст. медсестра + МОЛ).
 * - Точная арифметика в целочисленных копейках (Mandate 8b, 8s).
 */

import { z } from "zod";
import { kopecksToRubles, rublesToKopecks, type Kopecks } from "../money.js";
import { kopecksToWordsRu } from "../moneyWordsRu.js";

// ---------------------------------------------------------------------------
// HTML ESCAPE UTILITY (Anti-XSS Safe)
// ---------------------------------------------------------------------------

function escapeHtml(str: string | null | undefined): string {
	if (!str) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

// ---------------------------------------------------------------------------
// TYPES & INTERFACES
// ---------------------------------------------------------------------------

export type Torg16CommissionRole =
	| "chairman"
	| "member"
	| "accountant"
	| "mol"
	| "doctor"
	| "nurse"
	| string;

export interface Torg16CommissionMember {
	readonly fullName: string;
	readonly position: string;
	readonly role?: Torg16CommissionRole | undefined;
	readonly roleRu?: string | undefined;
}

export interface Torg16ItemLine {
	readonly itemIndex?: number | undefined;
	readonly sku: string;
	readonly nameRu: string;
	readonly category?: string | undefined;
	readonly unitRu: string;
	readonly okeiCode?: string | undefined;
	readonly batchNumber?: string | undefined;
	readonly expiryDate?: string | undefined;
	readonly quantity: number;
	readonly unitCostKopecks: number;
	readonly totalCostKopecks: number;
	readonly totalCostRubles: number;
	readonly defectDescriptionRu?: string | undefined;
}

export interface Torg16Document {
	readonly actNumber: string;
	readonly actDate: string;
	readonly organizationNameRu: string;
	readonly organizationInn?: string | undefined;
	readonly organizationOkpo?: string | undefined;
	readonly organizationKpp?: string | undefined;
	readonly warehouseNameRu: string;
	readonly molFullName: string;
	readonly molPosition: string;
	readonly inventoryDocNumber?: string | undefined;
	readonly orderNumber?: string | undefined;
	readonly orderDate?: string | undefined;
	readonly reasonRu: string;
	readonly items: readonly Torg16ItemLine[];
	readonly commission?: readonly Torg16CommissionMember[] | undefined;
	readonly isSingleSigner?: boolean | undefined;
	readonly singleSignerRole?: string | undefined;
	readonly singleSignerFullName?: string | undefined;
	readonly totalQuantity: number;
	readonly totalCostKopecks: number;
	readonly totalCostRubles: number;
	readonly totalCostWordsRu?: string | undefined;
}

// ---------------------------------------------------------------------------
// ZOD SCHEMAS
// ---------------------------------------------------------------------------

export const torg16CommissionMemberSchema = z.object({
	fullName: z.string().min(1, "ФИО члена комиссии обязательно"),
	position: z.string().min(1, "Должность обязательна"),
	role: z.string().optional(),
	roleRu: z.string().optional(),
});

export const torg16ItemLineSchema = z.object({
	itemIndex: z.number().int().positive().optional(),
	sku: z.string().min(1, "Артикул обязателен"),
	nameRu: z.string().min(1, "Наименование обязательно"),
	category: z.string().optional(),
	unitRu: z.string().default("шт"),
	okeiCode: z.string().default("796"),
	batchNumber: z.string().optional().default("—"),
	expiryDate: z.string().optional().default("—"),
	quantity: z.number().positive("Количество должно быть больше 0"),
	unitCostKopecks: z.number().int().nonnegative("Цена должна быть неотрицательной"),
	totalCostKopecks: z.number().int().nonnegative(),
	totalCostRubles: z.number().nonnegative(),
	defectDescriptionRu: z.string().optional().default("Истечение срока годности / дефект"),
});

export const torg16DocumentSchema = z.object({
	actNumber: z.string().min(1, "Номер акта обязателен"),
	actDate: z.string().min(1, "Дата акта обязательна"),
	organizationNameRu: z.string().min(1, "Наименование организации обязательно"),
	organizationInn: z.string().optional(),
	organizationOkpo: z.string().optional(),
	organizationKpp: z.string().optional(),
	warehouseNameRu: z.string().min(1, "Наименование склада или кабинета обязательно"),
	molFullName: z.string().min(1, "ФИО МОЛ обязательно"),
	molPosition: z.string().min(1, "Должность МОЛ обязательна"),
	inventoryDocNumber: z.string().optional(),
	orderNumber: z.string().optional(),
	orderDate: z.string().optional(),
	reasonRu: z.string().min(1, "Причина списания обязательна"),
	items: z.array(torg16ItemLineSchema).min(1, "Акт должен содержать минимум одну позицию"),
	commission: z.array(torg16CommissionMemberSchema).optional(),
	isSingleSigner: z.boolean().optional(),
	singleSignerRole: z.string().optional(),
	singleSignerFullName: z.string().optional(),
	totalQuantity: z.number().nonnegative(),
	totalCostKopecks: z.number().int().nonnegative(),
	totalCostRubles: z.number().nonnegative(),
	totalCostWordsRu: z.string().optional(),
});

// ---------------------------------------------------------------------------
// TOTALS & ARITHMETIC CALCULATION
// ---------------------------------------------------------------------------

export interface Torg16ItemInput {
	readonly sku: string;
	readonly nameRu: string;
	readonly category?: string | undefined;
	readonly unitRu?: string | undefined;
	readonly okeiCode?: string | undefined;
	readonly batchNumber?: string | undefined;
	readonly expiryDate?: string | undefined;
	readonly quantity: number;
	readonly unitCostKopecks?: number | undefined;
	readonly unitCostRubles?: number | undefined;
	readonly totalCostKopecks?: number | undefined;
	readonly defectDescriptionRu?: string | undefined;
}

export interface Torg16CalculatedTotals {
	readonly totalQuantity: number;
	readonly totalCostKopecks: number;
	readonly totalCostRubles: number;
	readonly totalCostWordsRu: string;
}

/**
 * Расчет копеечных итогов акта ТОРГ-16 без погрешностей IEEE-754.
 */
export function calculateTorg16Totals(
	items: readonly Torg16ItemInput[],
): Torg16CalculatedTotals {
	let totalQty = 0;
	let totalKop = 0;

	for (const item of items) {
		const qty = Number(item.quantity) || 0;
		totalQty += qty;

		let itemKop = 0;
		if (typeof item.totalCostKopecks === "number" && item.totalCostKopecks >= 0) {
			itemKop = Math.round(item.totalCostKopecks);
		} else {
			const unitKop =
				typeof item.unitCostKopecks === "number"
					? Math.round(item.unitCostKopecks)
					: typeof item.unitCostRubles === "number"
						? rublesToKopecks(item.unitCostRubles)
						: 0;
			itemKop = Math.round(unitKop * qty);
		}
		totalKop += itemKop;
	}

	const totalRub = kopecksToRubles(totalKop);
	const words = kopecksToWordsRu(totalKop);

	return {
		totalQuantity: Number(totalQty.toFixed(3)),
		totalCostKopecks: totalKop,
		totalCostRubles: totalRub,
		totalCostWordsRu: words,
	};
}

// ---------------------------------------------------------------------------
// CANONICAL HTML GENERATOR (ОКУД 0330216)
// ---------------------------------------------------------------------------

/**
 * Генерация эталонной печатной формы ТОРГ-16 (Акт о списании товаров).
 * Формат оптимизирован для печати на листе А4 (landscape/portrait).
 */
export function generateCanonicalTorg16Html(act: Torg16Document): string {
	const totals =
		act.totalCostWordsRu && act.totalQuantity > 0
			? {
					totalQuantity: act.totalQuantity,
					totalCostKopecks: act.totalCostKopecks,
					totalCostRubles: act.totalCostRubles,
					totalCostWordsRu: act.totalCostWordsRu,
				}
			: calculateTorg16Totals(act.items);

	const rowsHtml = act.items
		.map((it, idx) => {
			const index = it.itemIndex ?? idx + 1;
			const unitRub = kopecksToRubles(it.unitCostKopecks);
			const totalRub = it.totalCostRubles ?? kopecksToRubles(it.totalCostKopecks);
			const batch = it.batchNumber || "—";
			const expiry = it.expiryDate || "—";
			const unit = it.unitRu || "шт";
			const defect = it.defectDescriptionRu || act.reasonRu || "Истек срок годности";

			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${index}</td>
				<td style="border: 1px solid #000; padding: 4px;"><strong>${escapeHtml(it.nameRu)}</strong></td>
				<td style="border: 1px solid #000; padding: 4px; font-family: monospace; text-align: center;">${escapeHtml(it.sku)}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${escapeHtml(batch)}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${escapeHtml(expiry)}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${escapeHtml(unit)}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${it.quantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${unitRub.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${totalRub.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8.5pt;">${escapeHtml(defect)}</td>
			</tr>`;
		})
		.join("\n");

	let signaturesBlock = "";

	if (act.isSingleSigner) {
		const signerRole = act.singleSignerRole || "Врач-стоматолог / Ответственное лицо";
		const signerName = act.singleSignerFullName || act.molFullName;

		signaturesBlock = `
		<div style="display: flex; justify-content: space-between; margin-top: 24px; font-size: 9.5pt;">
			<div style="width: 46%;">
				<strong>Списание произведено единолично:</strong><br>
				<span style="font-size: 8.5pt; color: #333;">${escapeHtml(signerRole)}</span><br><br>
				________________ / <strong>${escapeHtml(signerName)}</strong> /<br>
				«____» ________________ 2026 г.
			</div>
			<div style="width: 46%;">
				<strong>Согласовано (МОЛ):</strong><br>
				<span style="font-size: 8.5pt; color: #333;">${escapeHtml(act.molPosition)}</span><br><br>
				________________ / <strong>${escapeHtml(act.molFullName)}</strong> /<br>
				«____» ________________ 2026 г.
			</div>
		</div>`;
	} else if (act.commission && act.commission.length > 0) {
		const membersHtml = act.commission
			.map(
				(c) => `
			<div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
				<span style="width: 250px;">${escapeHtml(c.position)}:</span>
				<span style="border-bottom: 1px solid #000; flex: 1; margin: 0 16px;">&nbsp;</span>
				<span style="font-weight: bold; width: 220px; text-align: right;">/ ${escapeHtml(c.fullName)} /</span>
			</div>`,
			)
			.join("");

		signaturesBlock = `
		<div style="margin-top: 20px;">
			<h4 style="margin: 0 0 10px 0; font-size: 10pt;">Члены комиссии:</h4>
			${membersHtml}
			<div style="margin-top: 14px; padding-top: 10px; border-top: 1px dashed #666;">
				С результатами списания согласен:<br>
				<strong>Материально ответственное лицо:</strong> ${escapeHtml(act.molPosition)} ________________ / <strong>${escapeHtml(act.molFullName)}</strong> /
			</div>
		</div>`;
	} else {
		signaturesBlock = `
		<div style="display: flex; justify-content: space-between; margin-top: 24px;">
			<div style="width: 46%;">
				<strong>Списание произвел:</strong><br>
				________________ / ${escapeHtml(act.molFullName)} /
			</div>
			<div style="width: 46%;">
				<strong>Руководитель организации:</strong><br>
				________________ / ________________ /
			</div>
		</div>`;
	}

	const orgOkpo = act.organizationOkpo ? ` (ОКПО: ${escapeHtml(act.organizationOkpo)})` : "";
	const orgInn = act.organizationInn ? ` (ИНН: ${escapeHtml(act.organizationInn)})` : "";
	const docBasis = act.inventoryDocNumber
		? `Опись/Сверка № ${escapeHtml(act.inventoryDocNumber)}`
		: act.orderNumber
			? `Приказ № ${escapeHtml(act.orderNumber)}${act.orderDate ? ` от ${escapeHtml(act.orderDate)}` : ""}`
			: "Плановое списание";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>ТОРГ-16: Акт списания товаров № ${escapeHtml(act.actNumber)}</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body {
			font-family: 'Times New Roman', Times, serif;
			font-size: 10pt;
			line-height: 1.25;
			color: #000;
			background: #fff;
			padding: 10px;
		}
		.okud-header {
			text-align: right;
			font-size: 8pt;
			line-height: 1.2;
			margin-bottom: 8px;
		}
		.clinic-info {
			margin-bottom: 12px;
			font-size: 9.5pt;
		}
		h2 {
			text-align: center;
			margin: 6px 0 2px 0;
			font-size: 13pt;
			text-transform: uppercase;
		}
		h3 {
			text-align: center;
			margin: 2px 0 10px 0;
			font-size: 11pt;
			font-weight: normal;
		}
		.reason-p {
			margin: 6px 0 10px 0;
			font-size: 9.5pt;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 8px;
			margin-bottom: 10px;
			font-size: 9pt;
		}
		th {
			border: 1px solid #000;
			padding: 4px;
			background: #f0f0f0;
			text-align: center;
			font-weight: bold;
		}
		.totals-words {
			margin-top: 8px;
			font-size: 10pt;
		}
	</style>
</head>
<body>
	<div class="okud-header">
		Унифицированная форма № <strong>ТОРГ-16</strong><br>
		Утверждена постановлением Госкомстата РФ от 25.12.1998 № 132<br>
		Код по ОКУД <strong>0330216</strong>
	</div>

	<div class="clinic-info">
		<div style="display: flex; justify-content: space-between;">
			<div>
				<strong>Организация:</strong> ${escapeHtml(act.organizationNameRu)}${orgOkpo}${orgInn}<br>
				<strong>Структурное подразделение (Склад):</strong> ${escapeHtml(act.warehouseNameRu)}<br>
				<strong>Материально ответственное лицо (МОЛ):</strong> ${escapeHtml(act.molPosition)} <strong>${escapeHtml(act.molFullName)}</strong>
			</div>
			<div style="text-align: right;">
				<strong>Акт №:</strong> ${escapeHtml(act.actNumber)}<br>
				<strong>Дата:</strong> ${escapeHtml(act.actDate)}<br>
				<strong>Основание:</strong> ${docBasis}
			</div>
		</div>
	</div>

	<h2>АКТ О СПИСАНИИ ТОВАРОВ</h2>
	<h3>№ ${escapeHtml(act.actNumber)} от ${escapeHtml(act.actDate)} г.</h3>

	<p class="reason-p"><strong>Причина списания:</strong> ${escapeHtml(act.reasonRu)}</p>

	<table>
		<thead>
			<tr>
				<th style="width: 30px;">№</th>
				<th>Наименование ТМЦ / Материала</th>
				<th style="width: 110px;">Артикул (SKU)</th>
				<th style="width: 90px;">Партия (LOT)</th>
				<th style="width: 85px;">Срок годн.</th>
				<th style="width: 45px;">Ед.</th>
				<th style="width: 60px;">Кол-во</th>
				<th style="width: 80px;">Цена, руб.</th>
				<th style="width: 90px;">Сумма, руб.</th>
				<th style="width: 140px;">Причина списания</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr style="font-weight: bold; background: #fafafa;">
				<td colspan="6" style="border: 1px solid #000; padding: 4px; text-align: right;">ВСЕГО ПО АКТУ:</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${totals.totalQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px;">&nbsp;</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${totals.totalCostRubles.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px;">&nbsp;</td>
			</tr>
		</tbody>
	</table>

	<div class="totals-words">
		<strong>Всего списано наименований:</strong> ${act.items.length}, на общую сумму <strong>${totals.totalCostRubles.toFixed(2)} руб.</strong><br>
		<strong>Итого сумма списания прописью:</strong> <em>${escapeHtml(totals.totalCostWordsRu)}</em>
	</div>

	${signaturesBlock}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// CSV EXPORT (RFC 4180 WITH UTF-8 BOM)
// ---------------------------------------------------------------------------

/**
 * Экспорт акта ТОРГ-16 в формат CSV с поддержкой Excel (UTF-8 BOM).
 */
export function exportTorg16ToCsv(act: Torg16Document): string {
	const headers = [
		"№ п/п",
		"Артикул",
		"Наименование ТМЦ",
		"Партия (LOT)",
		"Срок годности",
		"Ед. изм.",
		"Количество",
		"Цена за ед. (руб)",
		"Сумма (руб)",
		"Причина списания",
	].join(";");

	const rows = act.items.map((it, idx) => {
		const unitRub = kopecksToRubles(it.unitCostKopecks).toFixed(2);
		const totalRub = (it.totalCostRubles ?? kopecksToRubles(it.totalCostKopecks)).toFixed(2);

		return [
			it.itemIndex ?? idx + 1,
			`"${(it.sku || "").replace(/"/g, '""')}"`,
			`"${(it.nameRu || "").replace(/"/g, '""')}"`,
			`"${(it.batchNumber || "—").replace(/"/g, '""')}"`,
			it.expiryDate || "—",
			`"${it.unitRu || "шт"}"`,
			it.quantity,
			unitRub,
			totalRub,
			`"${(it.defectDescriptionRu || act.reasonRu || "").replace(/"/g, '""')}"`,
		].join(";");
	});

	const totals = calculateTorg16Totals(act.items);
	const footer = [
		"",
		"",
		"ИТОГО ПО АКТУ",
		"",
		"",
		"",
		totals.totalQuantity,
		"",
		totals.totalCostRubles.toFixed(2),
		`"Сумма прописью: ${totals.totalCostWordsRu.replace(/"/g, '""')}"`,
	].join(";");

	return `\uFEFF${[headers, ...rows, footer].join("\r\n")}`;
}
