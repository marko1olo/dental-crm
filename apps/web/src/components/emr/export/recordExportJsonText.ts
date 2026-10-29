import type { MedicalCardForm043uData } from "../emr043Types";
import { dentalBiteTypeLabels } from "@dental/shared";
import { calculateDmftIndex, calculateCpitnIndex } from "../emr043Math";

/** Генератор структурированного JSON экспорта */
export function generate043JsonExport(data: MedicalCardForm043uData): string {
	const payload = {
		exportSchemaVersion: "1.0.0",
		standardOrder: "Медицинская карта стоматологического пациента",
		exportedAt: new Date().toISOString(),
		...data,
	};
	return JSON.stringify(payload, null, 2);
}

/** Генератор чистого текстового представления карты для буфера обмена */
export function generate043PlainText(data: MedicalCardForm043uData): string {
	const p = data.passport;
	const a = data.anamnesis;
	const d = data.dentalStatus;
	const dmft = calculateDmftIndex(d.odontogramTeeth);
	const cpitn = calculateCpitnIndex(d.cpitnIndex);

	const lines: string[] = [
		`МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (МЕДИЦИНСКАЯ КАРТА ПРИЁМА)`,
		`Номер карты: ${p.medicalCardNumber} | Дата открытия: ${p.cardOpenedDate}`,
		`Клиника: ${data.clinic.clinicLegalName} (Лицензия № ${data.clinic.licenseNumber})`,
		`--------------------------------------------------------------------------------`,
		`1. ПАСПОРТНАЯ ЧАСТЬ`,
		`Пациент: ${p.patientFullName}, пол: ${p.patientSex === "male" ? "Муж" : "Жен"}, дата рожд.: ${p.patientBirthDate}`,
		`Адрес: ${p.patientAddressRegistration}`,
		`Документ: ${p.patientIdentityDocument} | СНИЛС: ${p.patientSnils || "—"} | Полис: ${p.patientInsurancePolicy || "—"}`,
		`Первичный диагноз: ${p.primaryDiagnosisText} [МКБ-10: ${p.primaryDiagnosisIcd10}]`,
		`Лечащий врач: ${p.attendingDoctorFullName} (${p.attendingDoctorSpecialty})`,
		`--------------------------------------------------------------------------------`,
		`2. АНАМНЕЗ ЖИЗНИ И ЗАБОЛЕВАНИЯ`,
		`Жалобы: ${a.chiefComplaint}`,
		`Anamnesis morbi: ${a.historyOfPresentIllness}`,
		`Anamnesis vitae: ${a.medicalHistoryVitae}`,
		`Аллергостатус: ${a.allergologicalHistory}`,
		`Соматические патологии: ${a.concomitantSomaticDiseases}`,
		`Постоянные препараты: ${a.currentSystemicMedications}`,
		`--------------------------------------------------------------------------------`,
		`3. СТОМАТОЛОГИЧЕСКИЙ СТАТУС`,
		`Индекс КПУ(з): ${dmft.totalDmft} (К=${dmft.decayed}, П=${dmft.filled}, У=${dmft.missing}) — ${dmft.intensityLevelLabel}`,
		`Индекс CPITN: ${cpitn.treatmentNeedLabel} (${cpitn.maxCodeText})`,
		`Индекс гигиены: ${d.hygieneIndexOhiS.ratingText}`,
		`Прикус: ${dentalBiteTypeLabels[d.biteType] || d.biteDescription}`,
		`Рентген: ${d.xrayFindingsDescription}`,
		`--------------------------------------------------------------------------------`,
		`4. ДНЕВНИКИ ПОСЕЩЕНИЙ И ПРОТОКОЛЫ ПРИЁМА`,
	];

	(data.visitDiaries || []).forEach((vd, idx) => {
		lines.push(`Запись №${idx + 1} от ${vd.entryDate} (Зуб: ${vd.toothNumber || "общий"}):`);
		lines.push(`  I. Жалобы и анамнез: ${vd.subjectiveComplaints}`);
		lines.push(`  II. Status localis: ${vd.objectiveStatusLocalis}`);
		lines.push(`  III. Диагноз по МКБ-10: ${vd.assessmentDiagnosisText} [${vd.assessmentIcd10Code}]`);
		lines.push(`  IV. Дневник лечения: ${vd.procedureProtocol}`);
		if (vd.anesthesiaDetails) lines.push(`  Анестезия: ${vd.anesthesiaDetails}`);
		if (vd.appliedMaterials) lines.push(`  Материалы: ${vd.appliedMaterials}`);
		lines.push(`  Врач: ${vd.doctorFullName}`);
	});

	lines.push(`--------------------------------------------------------------------------------`);
	lines.push(`5. ЭПИКРИЗ И КОНТРОЛЬНОЕ НАБЛЮДЕНИЕ`);
	lines.push(`Сводка: ${data.epicrisis.treatmentSummary}`);
	lines.push(`Исход: ${data.epicrisis.treatmentOutcomeLabel} | Группа: ${data.epicrisis.dispensaryGroupLabel}`);
	lines.push(`Контрольный осмотр: через ${data.epicrisis.plannedRecallIntervalMonths} мес.`);
	lines.push(`Рекомендации: ${data.epicrisis.preventivePlanRecommendations}`);

	return lines.join("\n");
}
