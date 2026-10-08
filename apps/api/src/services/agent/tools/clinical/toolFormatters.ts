/**
 * @file toolFormatters.ts
 * @description Layer 1: Pure clinical rendering formatters for Form 043/у visit diary and Form 107-1/у prescription.
 */

import type { EmrAutopilotResult, Form107_1uPayload } from "@dental/shared";

export function render043Text(autopilot: EmrAutopilotResult): string {
	const d = autopilot.diaryEntry;
	return [
		`═══════════════════════════════════════════════════════════════════════════`,
		`ДНЕВНИК ПРИЁМА ВРАЧА-СТОМАТОЛОГА`,
		`═══════════════════════════════════════════════════════════════════════════`,
		`Дата и время приёма: ${d.entryDate} ${d.entryTime || ""}`.trim(),
		`Зуб (FDI): ${d.toothNumber || "—"} | Диагноз МКБ-10: ${d.assessmentIcd10Code} (${d.assessmentDiagnosisText})`,
		`Лечащий врач: ${d.doctorFullName} (${d.doctorSpecialty || "Врач-стоматолог"})`,
		`─────────────────────────────────────────────────────────────────────────────`,
		`S (Subjective / Жалобы и анамнез):`,
		`  ${d.subjectiveComplaints}`,
		`─────────────────────────────────────────────────────────────────────────────`,
		`O (Objective / Объективный статус и Status Localis):`,
		`  ${d.objectiveStatusLocalis}`,
		`  • Перкуссия вертикальная: ${d.percussionVertical === "negative" ? "безболезненная (-)" : d.percussionVertical === "positive_sharp" ? "резко болезненная (++)" : "слабо чувствительная (+)"}`,
		`  • Зондирование: ${d.probingTenderness || "безболезненное"}`,
		`  • Термометрия: ${d.thermalTestResponse || "индифферентная"}`,
		d.eodMicroamperes ? `  • ЭОД: ${d.eodMicroamperes} мкА` : null,
		`─────────────────────────────────────────────────────────────────────────────`,
		`A (Assessment / Клинический диагноз):`,
		`  ${d.assessmentDiagnosisText} [МКБ-10: ${d.assessmentIcd10Code}]`,
		`─────────────────────────────────────────────────────────────────────────────`,
		`P (Plan & Procedure / Протокол проведенного лечения):`,
		`  ${d.procedureProtocol}`,
		d.anesthesiaDetails ? `  • Анестезия: ${d.anesthesiaDetails}` : null,
		d.appliedMaterials ? `  • Материалы: ${d.appliedMaterials}` : null,
		`─────────────────────────────────────────────────────────────────────────────`,
		`Рекомендации и назначения на дом:`,
		`  ${d.homeCareRecommendations || "Соблюдение гигиены полости рта, щадящая диета 2-3 дня, плановый осмотр через 6 месяцев."}`,
		`─────────────────────────────────────────────────────────────────────────────`,
		`Стоимость услуг: ${autopilot.billingEstimate.formattedTotal} (${autopilot.billingEstimate.totalKopecks} коп.)`,
		`Подпись лечащего врача: ${d.doctorFullName} ____________________`,
		`═══════════════════════════════════════════════════════════════════════════`,
	]
		.filter(Boolean)
		.join("\n");
}

export function renderPrescription107Text(payload: Form107_1uPayload): string {
	const stampLines = [
		`Министерство здравоохранения РФ`,
		`Медицинская организация: ${payload.clinicLegalName}`,
		payload.clinicAddress ? `Адрес: ${payload.clinicAddress}` : null,
		payload.clinicPhone ? `Тел.: ${payload.clinicPhone}` : null,
		payload.clinicOgrn
			? `ОГРН: ${payload.clinicOgrn} | ИНН: ${payload.clinicInn || "—"}`
			: null,
		payload.medicalLicenseNumber
			? `Лицензия: № ${payload.medicalLicenseNumber}`
			: null,
	]
		.filter(Boolean)
		.join("\n");

	const drugLines = payload.items
		.map((item, idx) => {
			return [
				`[${idx + 1}] ${item.latinName}`,
				`    ${item.dispenseLatin}`,
				`    ${item.signaRussian}`,
				`    (Торговое наименование: ${item.tradeName}, форма: ${item.form}, дозировка: ${item.dosage})`,
			].join("\n");
		})
		.join("\n\n");

	const validityText =
		payload.validityDays === "365"
			? "До 1 года (По специальному назначению)"
			: `${payload.validityDays} дней (со дня выписывания)`;

	return [
		`═══════════════════════════════════════════════════════════════════════════`,
		`МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ`,
		`Медицинская документация: Форма № 107-1/у (Приказ Минздрава России № 1094н)`,
		`═══════════════════════════════════════════════════════════════════════════`,
		`ШТАМП ОРГАНИЗАЦИИ:`,
		stampLines,
		`─────────────────────────────────────────────────────────────────────────────`,
		`РЕЦЕПТ Серия: ${payload.prescriptionSeriesNumber} от ${payload.prescriptionDate}`,
		`Срок действия рецепта: ${validityText}`,
		payload.isChronicSpecialCare
			? `Пометка: ПО СПЕЦИАЛЬНОМУ НАЗНАЧЕНИЮ (периодичность: ${payload.chronicPeriodicity || "ежемесячно"})`
			: null,
		`─────────────────────────────────────────────────────────────────────────────`,
		`Пациент: ${payload.patientFullName}`,
		`Дата рождения: ${payload.patientBirthDate}${payload.patientAgeYears !== undefined && payload.patientAgeYears !== null ? ` (Возраст: ${payload.patientAgeYears} лет)` : ""}`,
		`Медицинская карта №: ${payload.medicalCardNumber}`,
		payload.diagnosisIcd10Code
			? `Диагноз по МКБ-10: ${payload.diagnosisIcd10Code}`
			: null,
		`─────────────────────────────────────────────────────────────────────────────`,
		`НАЗНАЧЕНИЯ (Rp: / D.t.d. / S.):`,
		drugLines,
		`─────────────────────────────────────────────────────────────────────────────`,
		`Врач: ${payload.doctorFullName} (${payload.doctorSpecialty || "Врач-стоматолог"})`,
		`Подпись и личная печать врача: ____________________ [ М.П. ]`,
		`═══════════════════════════════════════════════════════════════════════════`,
	]
		.filter(Boolean)
		.join("\n");
}
