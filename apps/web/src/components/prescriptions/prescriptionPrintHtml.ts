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

export function cleanHumanInstruction(signa: string): string {
	if (!signa) return "";
	return signa
		.replace(/^(?:D\.?\s*)?S[.:]?\s*/i, "")
		.replace(/^(?:Rp[.:]?\s*)/i, "")
		.replace(/^(?:D\.?t\.?d\.?\s*N?\s*\d*\.?\s*)/i, "")
		.trim();
}

export interface PatientMemoPrintHtmlOptions {
	clinic: string;
	address: string;
	phone: string;
	patientName: string;
	patientBirth?: string;
	patientCard?: string;
	docName: string;
	docSpecialty?: string;
	prescriptionDate: string;
	activeItems: readonly PrescriptionDrugItem[];
}

export function generatePatientMemoPrintHtml(opts: PatientMemoPrintHtmlOptions): string {
	const {
		clinic,
		address,
		phone,
		patientName,
		patientBirth,
		patientCard,
		docName,
		docSpecialty,
		prescriptionDate,
		activeItems,
	} = opts;

	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8" />
	<title>Памятка по приёму лекарств — ${patientName || "Пациент"}</title>
	<style>
		@page { size: A5 portrait; margin: 10mm; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
			font-size: 11pt;
			color: #111;
			margin: 0;
			padding: 0;
			line-height: 1.45;
		}
		.header {
			border-bottom: 2px solid #0d9488;
			padding-bottom: 8px;
			margin-bottom: 12px;
		}
		.clinic-title {
			font-size: 13pt;
			font-weight: 700;
			color: #0f766e;
		}
		.clinic-meta {
			font-size: 9pt;
			color: #4b5563;
			margin-top: 2px;
		}
		.doc-badge {
			display: inline-block;
			background: #f0fdfa;
			border: 1px solid #99f6e4;
			color: #0f766e;
			font-size: 8.5pt;
			font-weight: 600;
			padding: 2px 8px;
			border-radius: 4px;
			margin-top: 4px;
		}
		.title {
			text-align: center;
			font-size: 14pt;
			font-weight: 800;
			margin: 14px 0 6px 0;
			color: #111827;
			letter-spacing: -0.2px;
		}
		.subtitle {
			text-align: center;
			font-size: 9.5pt;
			color: #4b5563;
			margin-bottom: 14px;
		}
		.patient-box {
			background: #f9fafb;
			border: 1px solid #e5e7eb;
			border-radius: 6px;
			padding: 8px 12px;
			margin-bottom: 14px;
			font-size: 10pt;
		}
		.med-card {
			border: 1px solid #d1d5db;
			border-left: 4px solid #0d9488;
			background: #ffffff;
			border-radius: 6px;
			padding: 10px 12px;
			margin-bottom: 10px;
		}
		.med-title {
			font-size: 12pt;
			font-weight: 700;
			color: #111827;
		}
		.med-details {
			font-size: 9.5pt;
			color: #4b5563;
			margin-top: 2px;
		}
		.med-instruction {
			margin-top: 6px;
			font-size: 11pt;
			color: #1f2937;
			font-weight: 600;
			background: #f0fdf4;
			border: 1px solid #bbf7d0;
			padding: 6px 10px;
			border-radius: 4px;
		}
		.alert-box {
			margin-top: 14px;
			background: #fffbeb;
			border: 1px solid #fef3c7;
			border-left: 4px solid #f59e0b;
			border-radius: 6px;
			padding: 8px 12px;
			font-size: 9pt;
			color: #92400e;
		}
		.footer {
			margin-top: 16px;
			border-top: 1px solid #e5e7eb;
			padding-top: 8px;
			display: flex;
			justify-content: space-between;
			font-size: 9pt;
			color: #4b5563;
		}
	</style>
</head>
<body>
	<div class="header">
		<div class="clinic-title">${clinic}</div>
		<div class="clinic-meta">${address} | Тел: <strong>${phone}</strong></div>
		<div class="doc-badge">Лечащий врач: ${docName}${docSpecialty ? ` (${docSpecialty})` : ""}</div>
	</div>

	<div class="title">ПАМЯТКА ДЛЯ ПАЦИЕНТА</div>
	<div class="subtitle">Индивидуальная схема приёма назначенных препаратов</div>

	<div class="patient-box">
		Пациент: <strong>${patientName || "Пациент"}</strong>
		${patientBirth ? ` | Д.Р.: <strong>${patientBirth}</strong>` : ""}
		${patientCard ? ` | Медкарта №: <strong>${patientCard}</strong>` : ""}<br/>
		Дата назначения: <strong>${prescriptionDate}</strong>
	</div>

	<div class="med-list">
		${activeItems
			.map((item, idx) => {
				const humanSigna = cleanHumanInstruction(item.signaRussian);
				return `
			<div class="med-card">
				<div class="med-title">${idx + 1}. ${item.tradeName}</div>
				${item.dosage || item.form ? `<div class="med-details">Форма выпуска: ${[item.form, item.dosage].filter(Boolean).join(" · ")}</div>` : ""}
				<div class="med-instruction">
					Способ применения: ${humanSigna}
				</div>
			</div>
		`;
			})
			.join("")}
	</div>

	<div class="alert-box">
		<strong>Важные правила приёма:</strong><br/>
		• Строго соблюдайте назначенную кратность и дозировку препаратов.<br/>
		• Не прекращайте приём антибиотиков раньше рекомендованного срока.<br/>
		• При появлении сыпи, отёка, зуда или других признаков аллергии немедленно прекратите приём и свяжитесь с клиникой: <strong>${phone}</strong>.
	</div>

	<div class="footer">
		<div>Памятка выдана клиникой «${clinic}»</div>
		<div>Дата: ${prescriptionDate}</div>
	</div>
</body>
</html>`;
}

