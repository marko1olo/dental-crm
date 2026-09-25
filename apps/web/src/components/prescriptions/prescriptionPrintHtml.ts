/**
 * prescriptionPrintHtml.ts
 *
 * Dedicated HTML renderer for statutory medical prescriptions (Order 1094n / 148-1/u-88).
 * Generates print-ready A5 portrait document for browser print frame.
 */

import type { PrescriptionFormType, PrescriptionDrugItem } from "./PrescriptionPrintModal";

export interface PrescriptionPrintHtmlOptions {
	customSeriesNumber: string;
	clinic: string;
	address: string;
	phone: string;
	ogrn: string;
	inn: string;
	licNum: string;
	activeForm: PrescriptionFormType;
	prescriptionDate: string;
	patientName: string;
	patientBirth: string;
	patientCard: string;
	patientAddress: string;
	docName: string;
	docSpecialty: string;
	activeItems: readonly PrescriptionDrugItem[];
	validityDays: string;
}

export function generatePrescriptionPrintHtml(opts: PrescriptionPrintHtmlOptions): string {
	const {
		customSeriesNumber,
		clinic,
		address,
		phone,
		ogrn,
		inn,
		licNum,
		activeForm,
		prescriptionDate,
		patientName,
		patientBirth,
		patientCard,
		patientAddress,
		docName,
		docSpecialty,
		activeItems,
		validityDays,
	} = opts;

	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8" />
	<title>Рецепт ${customSeriesNumber}</title>
	<style>
		@page { size: A5 portrait; margin: 10mm; }
		body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; margin: 0; padding: 0; }
		.header { border-bottom: 2px solid #000; padding-bottom: 6px; display: flex; justify-content: space-between; }
		.clinic-stamp { width: 55%; border: 1px dashed #666; padding: 4px; font-size: 8.5pt; }
		.form-num { width: 40%; text-align: right; font-size: 9pt; }
		.title { text-align: center; font-size: 14pt; font-weight: bold; margin: 12px 0 6px 0; }
		.series { text-align: center; font-size: 10pt; margin-bottom: 12px; }
		.meta { border-bottom: 1px solid #000; padding-bottom: 8px; margin-bottom: 12px; line-height: 1.5; font-size: 10pt; }
		.rp-section { min-height: 180px; }
		.rp-item { margin-bottom: 12px; }
		.rp-name { font-weight: bold; font-style: italic; }
		.footer { border-top: 2px solid #000; padding-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; margin-top: 16px; }
	</style>
</head>
<body>
	<div class="header">
		<div class="clinic-stamp">
			<strong>${clinic}</strong><br/>
			Адрес: ${address}<br/>
			Тел: ${phone} | ОГРН: ${ogrn} | ИНН: ${inn}<br/>
			Лицензия: № ${licNum}
		</div>
		<div class="form-num">
			Министерство здравоохранения РФ<br/>
			Медицинская документация<br/>
			<strong>${activeForm === "107-1u" ? "Форма бланка № 107-1/у" : "Форма бланка № 148-1/у-88"}</strong><br/>
			Приказ МЗ РФ № 1094н
		</div>
	</div>
	<div class="title">РЕЦЕПТ ${activeForm === "148-1u-88" ? "(ПКУ)" : ""}</div>
	<div class="series">Серия: <strong>${customSeriesNumber}</strong> от <strong>${prescriptionDate}</strong></div>
	<div class="meta">
		Ф.И.О. пациента: <strong>${patientName}</strong><br/>
		Дата рождения: ${patientBirth} | № медкарты: ${patientCard}<br/>
		${activeForm === "148-1u-88" ? `Адрес проживания: ${patientAddress}<br/>` : ""}
		Лечащий врач: <strong>${docName}</strong> (${docSpecialty})
	</div>
	<div class="rp-section">
		${activeItems
			.map(
				(item, idx) => `
			<div class="rp-item">
				<div class="rp-name">${idx + 1}. ${item.latinName}</div>
				<div style="margin-left: 20px; font-style: italic;">${item.dispenseLatin}</div>
				<div style="margin-left: 20px;">${item.signaRussian}</div>
				<div style="margin-left: 20px; font-size: 9pt; color: #555;">[Торговое наименование: ${item.tradeName}]</div>
			</div>
		`,
			)
			.join("")}
	</div>
	<div class="footer">
		<div>
			Срок действия рецепта: <strong>${activeForm === "148-1u-88" ? "15 дней (ПКУ)" : `${validityDays} дней`}</strong><br/>
			Подпись врача: ____________________ / ${docName}
		</div>
		<div style="text-align: center; font-size: 8pt; border: 1px dashed #000; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;">
			М.П.<br/>ВРАЧ
		</div>
	</div>
</body>
</html>`;
}
