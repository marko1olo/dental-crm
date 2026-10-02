/**
 * DENTE Dental CRM — Statutory Form 107-1/у Prescription Print Engine (Order 1094n).
 *
 * Implements strict statutory compliance with:
 * 1. Приказ Минздрава России от 24.11.2021 № 1094н:
 *    - Унифицированный рецептурный бланк формы № 107-1/у.
 *    - Выписка препаратов строго по Международным непатентованным наименованиям (МНН) на латинском языке.
 *    - Латинская грамматическая структура: Recipe (Rp.:), Da tales doses (D.t.d.), Signa (S.).
 * 2. Запрет на пустые дозировки и пустые способы применения (Signa).
 * 3. Категорический запрет на неопределенные формулировки («По схеме», «Известно», «По назначению врача»).
 * 4. Печать на формате А5 (вертикальный) со штампом клиники и зоной личной печати врача («М.П. Врач»).
 */

import {
	DENTAL_STATUTORY_MNN_CATALOG,
	validateDentalMnn,
	validateLatinRxSigna,
	type DentalMnnDefinition,
} from "../prescriptions/generator/prescriptionMnnCatalog";
import { escapeHtml, formatDateRu } from "./documentPrintFormatters";

export {
	validateDentalMnn,
	validateLatinRxSigna,
	DENTAL_STATUTORY_MNN_CATALOG,
	type DentalMnnDefinition,
};

export const ORDER_1094N_NAME = "Приказ Минздрава России от 24.11.2021 № 1094н";
export const FORM_107_1_U_TITLE = "Форма бланка № 107-1/у";

export interface PrescriptionPrescribedDrug {
	readonly id?: string | undefined;
	readonly mnnLatin: string;
	readonly dosage: string;
	readonly formAndDispenseLatin: string;
	readonly signaRu: string;
	readonly tradeNameRu?: string | undefined;
	readonly mnnRu?: string | undefined;
}

export interface PrescriptionPatientInfo {
	readonly fullName: string;
	readonly birthDate?: string | undefined;
	readonly cardNumber?: string | undefined;
	readonly address?: string | undefined;
}

export interface PrescriptionDoctorInfo {
	readonly fullName: string;
	readonly specialty?: string | undefined;
	readonly snils?: string | undefined;
}

export interface PrescriptionClinicInfo {
	readonly legalName: string;
	readonly address: string;
	readonly phone?: string | undefined;
	readonly inn: string;
	readonly ogrn: string;
	readonly licenseNumber: string;
	readonly licenseDate?: string | undefined;
}

export interface PrescriptionForm107Input {
	readonly seriesNumber: string;
	readonly dateIso: string;
	readonly validityDays: 15 | 30 | 60 | 365;
	readonly clinic: PrescriptionClinicInfo;
	readonly patient: PrescriptionPatientInfo;
	readonly doctor: PrescriptionDoctorInfo;
	readonly medications: readonly PrescriptionPrescribedDrug[];
	readonly isChronicCare?: boolean | undefined;
	readonly chronicPeriodicity?: string | undefined;
}

export interface PrescriptionValidationResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
}

/**
 * Валидирует рецептурную позицию на строгое соответствие Приказу Минздрава № 1094н.
 * Запрещает пустые поля дозировки, пустые или расплывчатые сигнатуры.
 */
export function validatePrescriptionItemStrict(
	item: PrescriptionPrescribedDrug,
	index: number = 0,
): PrescriptionValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	const itemPrefix = `Препарат №${index + 1} (${item.mnnLatin || item.mnnRu || "без названия"}):`;

	// 1. МНН на латыни
	const latin = (item.mnnLatin || "").trim();
	if (!latin) {
		errors.push(`${itemPrefix} отсутствует МНН на латинском языке.`);
	} else if (!/^[A-Za-z0-9\s.,'()/%+-]+$/.test(latin)) {
		errors.push(`${itemPrefix} латинское МНН содержит недопустимые нелатинские символы.`);
	}

	// 2. Запрет на пустую дозировку
	const dosage = (item.dosage || "").trim();
	if (!dosage) {
		errors.push(`${itemPrefix} дозировка не может быть пустой (Приказ Минздрава № 1094н).`);
	}

	// 3. Латинская форма отпуска (D.t.d.)
	const dispense = (item.formAndDispenseLatin || "").trim();
	if (!dispense) {
		errors.push(`${itemPrefix} отсутствует указание формы и отпуска (D.t.d.).`);
	} else if (!/^D\.?\s*t\.?\s*d\.?/i.test(dispense)) {
		warnings.push(`${itemPrefix} рекомендуется использовать каноническую формулу 'D.t.d. N...'`);
	}

	// 4. Запрет на пустую или расплывчатую сигнатуру (Signa)
	const signa = (item.signaRu || "").trim();
	if (!signa) {
		errors.push(`${itemPrefix} способ применения (Signa) не может быть пустым.`);
	} else {
		const vaguePatterns = [
			/по\s+схеме/i,
			/по\s+назначению/i,
			/по\s+указанию/i,
			/как\s+обычно/i,
			/^известно$/i,
			/^внутреннее$/i,
			/^наружное$/i,
			/употреблять\s+по\s+указанию/i,
		];
		for (const pattern of vaguePatterns) {
			if (pattern.test(signa)) {
				errors.push(
					`${itemPrefix} запрещена неопределенная формулировка «${signa}». Приказ № 1094н требует точного указания разовой дозы, кратности и длительности приёма.`,
				);
				break;
			}
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Валидирует весь рецептурный бланк 107-1/у.
 */
export function validateForm107PrescriptionInput(
	input: PrescriptionForm107Input,
): PrescriptionValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!input.seriesNumber?.trim()) {
		errors.push("Серия и номер рецепта обязательны.");
	}

	if (!input.patient?.fullName?.trim()) {
		errors.push("ФИО пациента обязательно для оформления рецепта.");
	}

	if (!input.doctor?.fullName?.trim()) {
		errors.push("ФИО лечащего врача обязательно.");
	}

	if (!input.medications || input.medications.length === 0) {
		errors.push("В рецепте должен быть указан хотя бы один лекарственный препарат.");
	} else if (input.medications.length > 3) {
		errors.push("На одном бланке 107-1/у разрешается выписывать не более 3 препаратов (Приказ 1094н).");
	} else {
		input.medications.forEach((med, idx) => {
			const res = validatePrescriptionItemStrict(med, idx);
			errors.push(...res.errors);
			warnings.push(...res.warnings);
		});
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Генерирует официальный HTML печатного бланка 107-1/у (А5 portrait) по Приказу 1094н.
 */
export function generatePrescriptionForm107Html(
	input: PrescriptionForm107Input,
): string {
	const {
		seriesNumber,
		dateIso,
		validityDays,
		clinic,
		patient,
		doctor,
		medications,
		isChronicCare,
		chronicPeriodicity,
	} = input;

	const dateFormatted = formatDateRu(dateIso);
	const validityText =
		validityDays === 15
			? "15 дней (Срочно / ПКУ)"
			: validityDays === 30
				? "30 дней (Льготный)"
				: validityDays === 365
					? "1 год (По специальному назначению)"
					: "60 дней (Стандартный)";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Рецепт ${escapeHtml(seriesNumber)} — ${escapeHtml(patient.fullName)}</title>
  <style>
    @page {
      size: A5 portrait;
      margin: 8mm 10mm 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      color: #000000;
      background: #ffffff;
      font-size: 10pt;
      line-height: 1.25;
      margin: 0;
      padding: 0;
    }
    .rx-sheet {
      width: 100%;
      min-height: 195mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1.5px solid #000;
      padding-bottom: 4pt;
      margin-bottom: 6pt;
    }
    .clinic-stamp-box {
      width: 58%;
      border: 1px dashed #444;
      padding: 3pt 5pt;
      font-size: 8pt;
      line-height: 1.2;
    }
    .form-statutory-info {
      width: 40%;
      text-align: right;
      font-size: 8pt;
      line-height: 1.2;
    }
    .rx-title {
      text-align: center;
      font-size: 13pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      margin: 4pt 0 1pt 0;
    }
    .rx-series {
      text-align: center;
      font-size: 9.5pt;
      margin-bottom: 6pt;
    }
    .patient-block {
      border-bottom: 1px solid #000;
      padding-bottom: 5pt;
      margin-bottom: 8pt;
      font-size: 9.5pt;
      line-height: 1.4;
    }
    .rp-container {
      min-height: 85mm;
      margin-bottom: 6pt;
    }
    .rp-item {
      margin-bottom: 10pt;
    }
    .rp-line-main {
      font-weight: bold;
      font-style: italic;
      font-size: 10.5pt;
    }
    .rp-line-dispense {
      margin-left: 18pt;
      font-style: italic;
      font-size: 9.5pt;
    }
    .rp-line-signa {
      margin-left: 18pt;
      font-size: 9.5pt;
    }
    .rp-trade-name {
      margin-left: 18pt;
      font-size: 8pt;
      color: #555;
    }
    .footer-section {
      border-top: 1.5px solid #000;
      padding-top: 6pt;
      font-size: 9pt;
      line-height: 1.3;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .footer-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 6pt;
    }
    .doctor-stamp-circle {
      width: 52px;
      height: 52px;
      border: 1px dashed #000;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 7.5pt;
      font-weight: bold;
    }
    .clinic-stamp-circle {
      width: 65px;
      height: 38px;
      border: 1px dashed #000;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 7pt;
      margin-right: 12pt;
    }
  </style>
</head>
<body>
  <div class="rx-sheet">
    <div>
      <div class="header-row">
        <div class="clinic-stamp-box">
          <strong>${escapeHtml(clinic.legalName)}</strong><br>
          Адрес: ${escapeHtml(clinic.address)}<br>
          ${clinic.phone ? `Тел: ${escapeHtml(clinic.phone)} | ` : ""}ИНН: ${escapeHtml(clinic.inn)} | ОГРН: ${escapeHtml(clinic.ogrn)}<br>
          Лицензия № ${escapeHtml(clinic.licenseNumber)}${clinic.licenseDate ? ` от ${escapeHtml(clinic.licenseDate)}` : ""}
        </div>
        <div class="form-statutory-info">
          Министерство здравоохранения РФ<br>
          Медицинская документация<br>
          <strong>${FORM_107_1_U_TITLE}</strong><br>
          ${ORDER_1094N_NAME}
        </div>
      </div>

      <div class="rx-title">РЕЦЕПТ</div>
      <div class="rx-series">
        Серия <strong>${escapeHtml(seriesNumber)}</strong> от <strong>${dateFormatted}</strong>
      </div>

      <div class="patient-block">
        Ф.И.О. пациента: <strong>${escapeHtml(patient.fullName)}</strong><br>
        Дата рождения: ${patient.birthDate ? formatDateRu(patient.birthDate) : "____________________"} | № амбулаторной карты: <strong>${escapeHtml(patient.cardNumber || "043/у")}</strong><br>
        ${patient.address ? `Адрес: ${escapeHtml(patient.address)}<br>` : ""}
        Лечащий врач: <strong>${escapeHtml(doctor.fullName)}</strong>${doctor.specialty ? ` (${escapeHtml(doctor.specialty)})` : ""}
      </div>

      <div class="rp-container">
        ${medications
					.map((item, idx) => {
						const latinPrefix = /^Rp\s*[.:]/i.test(item.mnnLatin)
							? item.mnnLatin
							: `Rp.: ${item.mnnLatin}`;
						const dosageStr = item.dosage ? ` ${item.dosage}` : "";
						const dtdStr = /^D\.?\s*t\.?\s*d\.?/i.test(item.formAndDispenseLatin)
							? item.formAndDispenseLatin
							: `D.t.d. ${item.formAndDispenseLatin}`;
						const signaStr = /^(?:D\.?\s*)?S[.:]?\s*/i.test(item.signaRu)
							? item.signaRu
							: `S. ${item.signaRu}`;

						return `
          <div class="rp-item">
            <div class="rp-line-main">${idx + 1}. ${escapeHtml(latinPrefix)}${escapeHtml(dosageStr)}</div>
            <div class="rp-line-dispense">${escapeHtml(dtdStr)}</div>
            <div class="rp-line-signa">${escapeHtml(signaStr)}</div>
            ${item.tradeNameRu ? `<div class="rp-trade-name">[Торговое наименование: ${escapeHtml(item.tradeNameRu)}]</div>` : ""}
          </div>`;
					})
					.join("")}
      </div>
    </div>

    <div class="footer-section">
      <div>
        Срок действия рецепта: <strong>${validityText}</strong>
        ${isChronicCare && chronicPeriodicity ? `<br>По специальному назначению: <em>${escapeHtml(chronicPeriodicity)}</em>` : ""}
      </div>

      <div class="footer-grid">
        <div>
          Подпись и личная печать врача:<br><br>
          ________________________ / ${escapeHtml(doctor.fullName)}
        </div>
        <div style="display: flex; align-items: center;">
          <div class="clinic-stamp-circle">
            ШТАМП<br>«ДЛЯ РЕЦЕПТОВ»
          </div>
          <div class="doctor-stamp-circle">
            М.П.<br>ВРАЧ
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Triggers browser printing of the generated prescription HTML via window.open with iframe fallback.
 */
export function printPrescriptionForm107Html(html: string): void {
	let printWindow: Window | null = null;
	try {
		printWindow = window.open("", "_blank", "width=850,height=950");
	} catch (e) {
		console.warn("window.open blocked, using iframe fallback", e);
	}

	if (printWindow && !printWindow.closed) {
		try {
			printWindow.document.open();
			printWindow.document.write(html);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				try {
					printWindow?.print();
				} catch (printErr) {
					console.error("Window print trigger failed:", printErr);
				}
			}, 300);
			return;
		} catch (writeErr) {
			console.warn("Error writing to printWindow, trying fallback iframe", writeErr);
		}
	}

	// Fallback iframe
	try {
		const existingIframe = document.getElementById("dente-prescription-print-iframe");
		if (existingIframe) existingIframe.remove();

		const iframe = document.createElement("iframe");
		iframe.id = "dente-prescription-print-iframe";
		iframe.style.position = "fixed";
		iframe.style.right = "0";
		iframe.style.bottom = "0";
		iframe.style.width = "0";
		iframe.style.height = "0";
		iframe.style.border = "none";
		iframe.style.zIndex = "-999";
		document.body.appendChild(iframe);

		const doc = iframe.contentWindow?.document;
		if (doc) {
			doc.open();
			doc.write(html);
			doc.close();
			iframe.contentWindow?.focus();
			setTimeout(() => {
				try {
					iframe.contentWindow?.print();
				} catch (iframeErr) {
					console.error("Iframe print trigger failed:", iframeErr);
				}
			}, 350);
		}
	} catch (iframeSetupErr) {
		console.error("Iframe fallback print failed:", iframeSetupErr);
		window.print();
	}
}
