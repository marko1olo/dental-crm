import {
	type ClinicProfile,
	type GeneratedDocument,
	type Patient,
	renderForm043uHtml,
	renderForm043_1uHtml,
	renderRadiationDoseSheetHtml,
	renderGraphicalDentalFormulaHtml,
} from "@dental/shared";
import {
	DocumentRenderContext,
	escapeHtml,
	patientAdministrativeProfile,
	patientIdentityDocument,
	patientTaxpayerInn,
	patientRegistrationAddress,
	patientResidentialAddress,
	clinicDisplayName,
	clinicLicenseLine,
	clinicLegalRequisites,
	clinicPaymentRequisites,
	clinicSignatory,
	documentRequiresClinicLegalProfile,
	clinicLegalProfileMissingFields,
	documentPayloadBlockReason,
	clinicalToothRowsTable,
} from "./baseRenderUtils.js";
import { baseDocument } from "./baseDocument.js";

function stripNullProperties<T extends object>(obj: T): { [K in keyof T]: Exclude<T[K], null> } {
	const result = { ...obj } as Record<string, unknown>;
	for (const key of Object.keys(result)) {
		if (result[key] === null) {
			delete result[key];
		}
	}
	return result as { [K in keyof T]: Exclude<T[K], null> };
}

export function dentalMedicalCard043u(
	document: GeneratedDocument,
	patient: Patient,
): string {
	if (document.payload?.fullForm043u) {
		return renderForm043uHtml(stripNullProperties(document.payload.fullForm043u));
	}
	const payload = document.payload?.dentalMedicalCard043u;
	const title = "Медицинская карта стоматологического пациента";
	if (!payload) {
		return `<section><h2>${escapeHtml(title)}</h2><p>Данные медицинской карты не заполнены.</p></section>`;
	}
	const rows: Array<[string, string | null | undefined]> = [
		["Организация", payload.organization?.fullName],
		["Адрес организации", payload.organization?.address],
		["Номер карты", payload.patient?.medicalCardNumber],
		["Дата приёма", payload.visitDate],
		["Пациент", payload.patient?.fullName ?? patient.fullName],
		["Дата рождения", payload.patient?.birthDate],
		["Жалобы", payload.complaint],
		["Анамнез заболевания/жизни", payload.anamnesis],
		["Внешний осмотр / status localis", payload.statusLocalis],
		["Объективный статус", payload.objectiveStatus],
		["Диагноз", payload.diagnosisText],
		["Диагноз (МКБ-10)", payload.diagnosisIcd10],
		["Зуб", payload.diagnosisTooth],
		["План лечения", payload.treatmentPlan],
		["Проведённое лечение", payload.treatmentDescription],
		["Рекомендации", payload.recommendations],
		["План следующего визита", payload.nextVisitPlan],
		["Осложнения", payload.complications],
		["Сопутствующие патологии", payload.comorbidities],
		["Лоток", payload.instrumentTrayBarcode],
	];
	const body = rows
		.filter(([, v]) => typeof v === "string" && v.trim().length > 0)
		.map(
			([k, v]) =>
				`<p><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</p>`,
		)
		.join("");
	const doctor = payload.doctor?.fullName
		? `<p><strong>Врач:</strong> ${escapeHtml(payload.doctor.fullName)}${
				payload.doctor.specialty
					? ` (${escapeHtml(payload.doctor.specialty)})`
					: ""
			}</p>`
		: "";
	const toothFormula = renderGraphicalDentalFormulaHtml({
		clinicalToothRows: payload.clinicalToothRows,
		dentalFormula: (payload as { dentalFormula?: Record<string, unknown> }).dentalFormula,
		title: "Графическая зубная формула (FDI 11–48 / 51–85)",
	});
	const toothSection =
		Array.isArray(payload.clinicalToothRows) && payload.clinicalToothRows.length
			? `<h2>Клиническая детализация по зубам</h2>${toothFormula}${clinicalToothRowsTable(payload.clinicalToothRows)}`
			: toothFormula;
	return `<section><h2>${escapeHtml(title)}</h2><p class="small">Стоматологическая медицинская карта</p>${doctor}${body}${toothSection}</section>`;
}

export function orthodonticMedicalCard043_1u(
	document: GeneratedDocument,
	patient: Patient,
): string {
	const payload = document.payload?.orthodonticCard043_1u;
	if (payload) {
		return renderForm043_1uHtml(stripNullProperties(payload));
	}
	return `<section><h2>Медицинская карта ортодонтического пациента (форма 043-1/у)</h2><p>Пациент: ${escapeHtml(patient.fullName)}</p><p>Данные ортодонтической карты не заполнены.</p></section>`;
}

export function radiationDoseSheet(
	document: GeneratedDocument,
	patient: Patient,
): string {
	const payload = document.payload?.radiationDoseSheet;
	if (payload) {
		return renderRadiationDoseSheetHtml(stripNullProperties(payload));
	}
	return `<section><h2>Лист учета дозовых нагрузок при рентгенологических исследованиях</h2><p>Пациент: ${escapeHtml(patient.fullName)}</p><p>Данные лучевых нагрузок не заполнены.</p></section>`;
}
