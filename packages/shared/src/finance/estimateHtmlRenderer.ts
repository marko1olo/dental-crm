/**
 * Printable HTML/PDF Treatment Plan Estimate Renderer.
 * Generates statutory, high-grade dental cost estimates for patient presentation and signing.
 */

import { escapeXml } from "../cda/c14n.js";
import { kopecksToRub } from "../fiscal/kopecksArithmetic.js";
import { amountToWordsRu } from "../fiscal/taxDeduction.js";

export interface EstimateStageItem {
	readonly id: string;
	readonly toothNumber?: number | null;
	readonly code804n?: string | null;
	readonly name: string;
	readonly quantity: number;
	readonly priceKopecks: number;
	readonly discountPercent?: number;
	readonly totalKopecks: number;
}

export interface EstimateStage {
	readonly stageNumber: number;
	readonly name: string;
	readonly description?: string | null;
	readonly items: readonly EstimateStageItem[];
	readonly totalKopecks: number;
}

export interface EstimateRenderData {
	readonly estimateNumber: string;
	readonly date: string; // YYYY-MM-DD
	readonly validUntilDate?: string | null;
	readonly clinic: {
		readonly name: string;
		readonly legalName?: string | null;
		readonly address?: string | null;
		readonly phone?: string | null;
		readonly licenseInfo?: string | null;
		readonly inn?: string | null;
	};
	readonly patient: {
		readonly fullName: string;
		readonly birthDate?: string | null;
		readonly cardNumber?: string | null;
		readonly phone?: string | null;
	};
	readonly attendingDoctor?: {
		readonly fullName: string;
		readonly specialty?: string | null;
	} | null;
	readonly stages: readonly EstimateStage[];
	readonly subtotalKopecks: number;
	readonly discountKopecks: number;
	readonly totalPayableKopecks: number;
	readonly currencySymbol?: string;
	readonly notes?: string | null;
}

/**
 * Formats money with thousands separators.
 */
function formatRub(kopecks: number): string {
	const rub = kopecksToRub(kopecks);
	return rub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Renders complete HTML document for estimate printing.
 */
export function renderEstimatePrintableHtml(data: EstimateRenderData): string {
	const clinicName = escapeXml(data.clinic.name);
	const legalName = escapeXml(data.clinic.legalName || data.clinic.name);
	const address = escapeXml(data.clinic.address || "");
	const phone = escapeXml(data.clinic.phone || "");
	const license = escapeXml(data.clinic.licenseInfo || "");
	const inn = escapeXml(data.clinic.inn || "");

	const patientName = escapeXml(data.patient.fullName);
	const cardNumber = escapeXml(data.patient.cardNumber || "б/н");
	const birthDate = escapeXml(data.patient.birthDate || "—");
	const patientPhone = escapeXml(data.patient.phone || "—");

	const doctorName = escapeXml(data.attendingDoctor?.fullName || "Лечащий врач");
	const specialty = escapeXml(data.attendingDoctor?.specialty || "Врач-стоматолог");

	const subtotalRub = formatRub(data.subtotalKopecks);
	const discountRub = formatRub(data.discountKopecks);
	const totalPayableRub = formatRub(data.totalPayableKopecks);
	const amountInWords = escapeXml(amountToWordsRu(data.totalPayableKopecks));

	let stagesHtml = "";
	let itemCounter = 1;

	for (const stage of data.stages) {
		const stageTotalRub = formatRub(stage.totalKopecks);
		let rowsHtml = "";

		for (const item of stage.items) {
			const toothStr = item.toothNumber ? `Зуб ${item.toothNumber}` : "—";
			const codeStr = item.code804n ? `[${escapeXml(item.code804n)}] ` : "";
			const itemName = escapeXml(item.name);
			const priceRub = formatRub(item.priceKopecks);
			const itemTotalRub = formatRub(item.totalKopecks);
			const discountStr = item.discountPercent ? `${item.discountPercent}%` : "—";

			rowsHtml += `
				<tr>
					<td class="col-num">${itemCounter++}</td>
					<td class="col-tooth">${toothStr}</td>
					<td class="col-name">${codeStr}${itemName}</td>
					<td class="col-qty">${item.quantity}</td>
					<td class="col-price">${priceRub} ₽</td>
					<td class="col-disc">${discountStr}</td>
					<td class="col-total">${itemTotalRub} ₽</td>
				</tr>`;
		}

		stagesHtml += `
			<div class="estimate-stage-block">
				<div class="stage-header">
					<span class="stage-title">Этап ${stage.stageNumber}: ${escapeXml(stage.name)}</span>
					<span class="stage-total">Итого по этапу: ${stageTotalRub} ₽</span>
				</div>
				${stage.description ? `<div class="stage-desc">${escapeXml(stage.description)}</div>` : ""}
				<table class="estimate-table">
					<thead>
						<tr>
							<th class="col-num">№</th>
							<th class="col-tooth">Область/Зуб</th>
							<th class="col-name">Наименование услуги</th>
							<th class="col-qty">Кол-во</th>
							<th class="col-price">Цена</th>
							<th class="col-disc">Скидка</th>
							<th class="col-total">Стоимость</th>
						</tr>
					</thead>
					<tbody>
						${rowsHtml}
					</tbody>
				</table>
			</div>`;
	}

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Смета лечения № ${escapeXml(data.estimateNumber)}</title>
	<style>
		*, *::before, *::after { box-sizing: border-box; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			font-size: 12px;
			line-height: 1.4;
			color: #111827;
			background: #ffffff;
			margin: 0;
			padding: 24px;
		}
		@page {
			size: A4;
			margin: 15mm 15mm 15mm 15mm;
		}
		.estimate-container {
			max-width: 800px;
			margin: 0 auto;
		}
		.clinic-header {
			border-bottom: 2px solid #0f766e;
			padding-bottom: 12px;
			margin-bottom: 16px;
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
		}
		.clinic-brand {
			font-size: 18px;
			font-weight: 700;
			color: #0f766e;
		}
		.clinic-meta {
			font-size: 11px;
			color: #4b5563;
			margin-top: 4px;
		}
		.estimate-title-bar {
			text-align: center;
			margin-bottom: 16px;
		}
		.estimate-main-title {
			font-size: 16px;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
		.estimate-subtitle {
			font-size: 11px;
			color: #6b7280;
			margin-top: 2px;
		}
		.parties-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 16px;
			background: #f9fafb;
			border: 1px solid #e5e7eb;
			border-radius: 6px;
			padding: 12px;
			margin-bottom: 20px;
		}
		.party-col h4 {
			margin: 0 0 6px 0;
			font-size: 11px;
			text-transform: uppercase;
			color: #6b7280;
		}
		.party-row {
			margin-bottom: 3px;
			font-size: 11px;
		}
		.party-label {
			color: #6b7280;
			display: inline-block;
			width: 90px;
		}
		.party-value {
			font-weight: 600;
			color: #1f2937;
		}
		.estimate-stage-block {
			margin-bottom: 20px;
			page-break-inside: avoid;
		}
		.stage-header {
			background: #f0fdfa;
			border-left: 4px solid #0f766e;
			padding: 6px 10px;
			display: flex;
			justify-content: space-between;
			align-items: center;
			font-weight: 700;
			font-size: 12px;
			margin-bottom: 6px;
		}
		.stage-title { color: #0f766e; }
		.stage-total { color: #111827; }
		.stage-desc {
			font-size: 11px;
			color: #6b7280;
			margin-bottom: 6px;
			font-style: italic;
		}
		.estimate-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 8px;
		}
		.estimate-table th, .estimate-table td {
			border: 1px solid #e5e7eb;
			padding: 6px 8px;
			font-size: 11px;
		}
		.estimate-table th {
			background: #f9fafb;
			font-weight: 600;
			text-align: left;
			color: #4b5563;
		}
		.col-num { width: 30px; text-align: center; }
		.col-tooth { width: 85px; text-align: center; }
		.col-qty { width: 50px; text-align: center; }
		.col-price { width: 85px; text-align: right; }
		.col-disc { width: 60px; text-align: center; }
		.col-total { width: 95px; text-align: right; font-weight: 600; }
		.totals-summary {
			margin-top: 16px;
			background: #f9fafb;
			border: 1px solid #e5e7eb;
			border-radius: 6px;
			padding: 12px 16px;
			page-break-inside: avoid;
		}
		.totals-line {
			display: flex;
			justify-content: flex-end;
			gap: 24px;
			margin-bottom: 4px;
			font-size: 12px;
		}
		.totals-grand {
			display: flex;
			justify-content: flex-end;
			gap: 24px;
			margin-top: 8px;
			padding-top: 8px;
			border-top: 2px solid #0f766e;
			font-size: 15px;
			font-weight: 700;
			color: #0f766e;
		}
		.amount-words {
			margin-top: 8px;
			font-size: 11px;
			color: #4b5563;
			font-style: italic;
			text-align: right;
		}
		.legal-disclaimer {
			margin-top: 20px;
			font-size: 10px;
			color: #6b7280;
			line-height: 1.35;
			border-top: 1px dashed #d1d5db;
			padding-top: 10px;
			page-break-inside: avoid;
		}
		.signatures-block {
			margin-top: 30px;
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 40px;
			page-break-inside: avoid;
		}
		.sig-line {
			border-bottom: 1px solid #111827;
			margin-top: 36px;
			margin-bottom: 4px;
		}
		.sig-caption {
			font-size: 10px;
			color: #6b7280;
			display: flex;
			justify-content: space-between;
		}
		@media print {
			body { padding: 0; }
			.estimate-container { max-width: 100%; }
		}
	</style>
</head>
<body>
	<div class="estimate-container">
		<div class="clinic-header">
			<div>
				<div class="clinic-brand">${clinicName}</div>
				<div class="clinic-meta">${legalName} ${inn ? `• ИНН ${inn}` : ""}</div>
				<div class="clinic-meta">${address}</div>
			</div>
			<div style="text-align: right;">
				<div class="clinic-meta"><strong>Тел:</strong> ${phone}</div>
				<div class="clinic-meta">${license}</div>
			</div>
		</div>

		<div class="estimate-title-bar">
			<div class="estimate-main-title">Предварительная смета плана лечения № ${escapeXml(data.estimateNumber)}</div>
			<div class="estimate-subtitle">от ${escapeXml(data.date)}${data.validUntilDate ? ` (действительна до ${escapeXml(data.validUntilDate)})` : ""}</div>
		</div>

		<div class="parties-grid">
			<div class="party-col">
				<h4>Пациент</h4>
				<div class="party-row"><span class="party-label">ФИО:</span> <span class="party-value">${patientName}</span></div>
				<div class="party-row"><span class="party-label">Мед. карта:</span> <span class="party-value">${cardNumber}</span></div>
				<div class="party-row"><span class="party-label">Дата рожд.:</span> <span class="party-value">${birthDate}</span></div>
				<div class="party-row"><span class="party-label">Телефон:</span> <span class="party-value">${patientPhone}</span></div>
			</div>
			<div class="party-col">
				<h4>Лечащий врач</h4>
				<div class="party-row"><span class="party-label">Врач:</span> <span class="party-value">${doctorName}</span></div>
				<div class="party-row"><span class="party-label">Специальность:</span> <span class="party-value">${specialty}</span></div>
			</div>
		</div>

		${stagesHtml}

		<div class="totals-summary">
			<div class="totals-line">
				<span>Сумма без учета скидок:</span>
				<strong style="width: 120px; text-align: right;">${subtotalRub} ₽</strong>
			</div>
			${data.discountKopecks > 0 ? `
			<div class="totals-line" style="color: #b91c1c;">
				<span>Скидка:</span>
				<strong style="width: 120px; text-align: right;">-${discountRub} ₽</strong>
			</div>` : ""}
			<div class="totals-grand">
				<span>ИТОГО К ОПЛАТЕ:</span>
				<span style="width: 140px; text-align: right;">${totalPayableRub} ₽</span>
			</div>
			<div class="amount-words">Сумма прописью: ${amountInWords}</div>
		</div>

		${data.notes ? `<div style="margin-top: 12px; font-size: 11px; color: #4b5563;"><strong>Примечание:</strong> ${escapeXml(data.notes)}</div>` : ""}

		<div class="legal-disclaimer">
			* Настоящая смета является предварительным расчетом стоимости стоматологических услуг. Окончательная стоимость может быть скорректирована в процессе лечения в зависимости от анатомических особенностей, клинической картины и выбранных материалов с обязательным предварительным согласованием с пациентом. Услуги НДС не облагаются (пп. 2 п. 2 ст. 149 НК РФ).
		</div>

		<div class="signatures-block">
			<div>
				<div class="sig-line"></div>
				<div class="sig-caption">
					<span>Врач: ${doctorName}</span>
					<span>/ Подпись /</span>
				</div>
			</div>
			<div>
				<div class="sig-line"></div>
				<div class="sig-caption">
					<span>Пациент (плательщик): ${patientName}</span>
					<span>/ С планом и сметой согласен /</span>
				</div>
			</div>
		</div>
	</div>
</body>
</html>`;
}
