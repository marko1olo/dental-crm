/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMR FORM 043/U EXPORT ENGINES: HL7 CDA R2 XML (EGISZ), JSON & PLAIN TEXT
 * Order of the Ministry of Health of Russia № 834n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { MedicalCardForm043uData } from "./emr043Types";
import { dentalBiteTypeLabels } from "@dental/shared";
import { calculateDmftIndex, calculateCpitnIndex } from "./emr043Math";

/** Экранирование специальных символов XML */
export function escapeXml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/** Генератор официального HL7 CDA R2 (СЭМД 834н) XML для интеграции с ЕГИСЗ */
export function generate043XmlCda(data: MedicalCardForm043uData): string {
	const p = data.passport;
	const c = data.clinic;
	const d = data.dentalStatus;
	const dmft = calculateDmftIndex(d.odontogramTeeth);

	const createdIso = new Date().toISOString();

	return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" classCode="DOCCLIN" moodCode="EVN">
  <realmCode code="RU"/>
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <templateId root="1.2.643.5.1.13.100.1.1.834.43"/>
  <id root="1.2.643.5.1.13" extension="${escapeXml(p.medicalCardNumber)}"/>
  <code code="834" codeSystem="1.2.643.5.1.13.100.1.1" displayName="Медицинская карта стоматологического пациента (Форма 043/у)"/>
  <title>МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА № ${escapeXml(p.medicalCardNumber)}</title>
  <effectiveTime value="${createdIso.replace(/[-:T]/g, "").slice(0, 14)}"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" displayName="normal"/>
  <languageCode code="ru-RU"/>

  <!-- Пациент -->
  <recordTarget>
    <patientRole>
      <id root="1.2.643.5.1.13.100.1.1.1" extension="${escapeXml(p.patientSnils || "000-000-000 00")}"/>
      <addr>
        <streetAddressLine>${escapeXml(p.patientAddressRegistration)}</streetAddressLine>
      </addr>
      <telecom value="tel:${escapeXml(p.patientPhone || "")}"/>
      <patient>
        <name>
          <family>${escapeXml(p.patientFullName.split(" ")[0] || "")}</family>
          <given>${escapeXml(p.patientFullName.split(" ")[1] || "")}</given>
        </name>
        <administrativeGenderCode code="${p.patientSex === "male" ? "1" : "2"}" codeSystem="1.2.643.5.1.13.13.11.1040" displayName="${p.patientSex === "male" ? "Мужской" : "Женский"}"/>
        <birthTime value="${escapeXml(p.patientBirthDate.replace(/-/g, ""))}"/>
      </patient>
    </patientRole>
  </recordTarget>

  <!-- Автор документа (Лечащий врач) -->
  <author>
    <time value="${createdIso.replace(/[-:T]/g, "").slice(0, 14)}"/>
    <assignedAuthor>
      <id root="1.2.643.5.1.13.100.1.1.1" extension="${escapeXml(p.attendingDoctorSnils || "000-000-000 00")}"/>
      <code code="108" codeSystem="1.2.643.5.1.13.13.11.1002" displayName="${escapeXml(p.attendingDoctorSpecialty)}"/>
      <assignedPerson>
        <name>
          <family>${escapeXml(p.attendingDoctorFullName.split(" ")[0] || "")}</family>
          <given>${escapeXml(p.attendingDoctorFullName.split(" ")[1] || "")}</given>
        </name>
      </assignedPerson>
      <representedOrganization>
        <id root="1.2.643.5.1.13.100.1.1" extension="${escapeXml(c.clinicOgrn)}"/>
        <name>${escapeXml(c.clinicLegalName || c.clinicName)}</name>
        <addr>${escapeXml(c.clinicAddress)}</addr>
      </representedOrganization>
    </assignedAuthor>
  </author>

  <!-- Структурированные клинические секции -->
  <component>
    <structuredBody>
      <!-- Секция: Паспортная часть и диагноз -->
      <component>
        <section>
          <code code="PASSPORT" codeSystem="1.2.643.5.1.13" displayName="Паспортная часть"/>
          <title>Паспортная часть и первичное обращение</title>
          <text>
            <paragraph>Номер карты: ${escapeXml(p.medicalCardNumber)}</paragraph>
            <paragraph>Дата открытия: ${escapeXml(p.cardOpenedDate)}</paragraph>
            <paragraph>Первичный диагноз: ${escapeXml(p.primaryDiagnosisText)} (${escapeXml(p.primaryDiagnosisIcd10)})</paragraph>
          </text>
        </section>
      </component>

      <!-- Секция: Анамнез -->
      <component>
        <section>
          <code code="ANAMNESIS" codeSystem="1.2.643.5.1.13" displayName="Анамнез"/>
          <title>Анамнез жизни и заболевания</title>
          <text>
            <paragraph>Жалобы: ${escapeXml(data.anamnesis.chiefComplaint)}</paragraph>
            <paragraph>Анамнез заболевания: ${escapeXml(data.anamnesis.historyOfPresentIllness)}</paragraph>
            <paragraph>Аллергологический статус: ${escapeXml(data.anamnesis.allergologicalHistory)}</paragraph>
            <paragraph>Соматические заболевания: ${escapeXml(data.anamnesis.concomitantSomaticDiseases)}</paragraph>
          </text>
        </section>
      </component>

      <!-- Секция: Зубная формула и КПУ -->
      <component>
        <section>
          <code code="DENTAL_STATUS" codeSystem="1.2.643.5.1.13" displayName="Стоматологический статус"/>
          <title>Зубная формула и индексы интенсивности</title>
          <text>
            <paragraph>Индекс КПУ(з): ${dmft.totalDmft} (К=${dmft.decayed}, П=${dmft.filled}, У=${dmft.missing})</paragraph>
            <paragraph>Уровень интенсивности кариеса: ${escapeXml(dmft.intensityLevelLabel)}</paragraph>
            <paragraph>Прикус: ${escapeXml(dentalBiteTypeLabels[d.biteType] || d.biteDescription)}</paragraph>
          </text>
        </section>
      </component>

      <!-- Секция: Дневники визитов (Форма 043/у) -->
      <component>
        <section>
          <code code="VISIT_DIARIES" codeSystem="1.2.643.5.1.13" displayName="Дневники посещений"/>
          <title>Дневники посещений (Форма 043/у)</title>
          <text>
            ${(data.visitDiaries || []).map((vd, i) => `
              <paragraph>
                <strong>Визит ${i + 1} (${escapeXml(vd.entryDate)}):</strong>
                Диагноз: ${escapeXml(vd.assessmentDiagnosisText)} [${escapeXml(vd.assessmentIcd10Code)}].
                Протокол: ${escapeXml(vd.procedureProtocol)}.
              </paragraph>
            `).join("")}
          </text>
        </section>
      </component>

      <!-- Секция: Эпикриз -->
      <component>
        <section>
          <code code="EPICRISIS" codeSystem="1.2.643.5.1.13" displayName="Эпикриз"/>
          <title>Эпикриз и диспансерный план</title>
          <text>
            <paragraph>Сводка лечения: ${escapeXml(data.epicrisis.treatmentSummary)}</paragraph>
            <paragraph>Исход: ${escapeXml(data.epicrisis.treatmentOutcomeLabel)}</paragraph>
            <paragraph>Диспансерная группа: ${escapeXml(data.epicrisis.dispensaryGroupLabel)}</paragraph>
            <paragraph>Контрольный осмотр через: ${data.epicrisis.plannedRecallIntervalMonths} мес.</paragraph>
          </text>
        </section>
      </component>
    </structuredBody>
  </component>
</ClinicalDocument>`;
}

/** Генератор структурированного JSON экспорта */
export function generate043JsonExport(data: MedicalCardForm043uData): string {
	const payload = {
		exportSchemaVersion: "1.0.0",
		standardOrder: "Приказ Минздрава России от 15.12.2014 № 834н",
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

	const lines: string[] = [];
	lines.push(`МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (ФОРМА № 043/у)`);
	lines.push(`Номер карты: ${p.medicalCardNumber} | Дата открытия: ${p.cardOpenedDate}`);
	lines.push(`Клиника: ${data.clinic.clinicLegalName} (Лицензия № ${data.clinic.licenseNumber})`);
	lines.push(`--------------------------------------------------------------------------------`);
	lines.push(`1. ПАСПОРТНАЯ ЧАСТЬ`);
	lines.push(`Пациент: ${p.patientFullName}, пол: ${p.patientSex === "male" ? "Муж" : "Жен"}, дата рожд.: ${p.patientBirthDate}`);
	lines.push(`Адрес: ${p.patientAddressRegistration}`);
	lines.push(`Документ: ${p.patientIdentityDocument} | СНИЛС: ${p.patientSnils || "—"} | Полис: ${p.patientInsurancePolicy || "—"}`);
	lines.push(`Первичный диагноз: ${p.primaryDiagnosisText} [МКБ-10: ${p.primaryDiagnosisIcd10}]`);
	lines.push(`Лечащий врач: ${p.attendingDoctorFullName} (${p.attendingDoctorSpecialty})`);
	lines.push(`--------------------------------------------------------------------------------`);
	lines.push(`2. АНАМНЕЗ ЖИЗНИ И ЗАБОЛЕВАНИЯ`);
	lines.push(`Жалобы: ${a.chiefComplaint}`);
	lines.push(`Anamnesis morbi: ${a.historyOfPresentIllness}`);
	lines.push(`Anamnesis vitae: ${a.medicalHistoryVitae}`);
	lines.push(`Аллергостатус: ${a.allergologicalHistory}`);
	lines.push(`Соматические патологии: ${a.concomitantSomaticDiseases}`);
	lines.push(`Постоянные препараты: ${a.currentSystemicMedications}`);
	lines.push(`--------------------------------------------------------------------------------`);
	lines.push(`3. СТОМАТОЛОГИЧЕСКИЙ СТАТУС`);
	lines.push(`Индекс КПУ(з): ${dmft.totalDmft} (К=${dmft.decayed}, П=${dmft.filled}, У=${dmft.missing}) — ${dmft.intensityLevelLabel}`);
	lines.push(`Индекс CPITN: ${cpitn.treatmentNeedLabel} (${cpitn.maxCodeText})`);
	lines.push(`Индекс гигиены: ${d.hygieneIndexOhiS.ratingText}`);
	lines.push(`Прикус: ${dentalBiteTypeLabels[d.biteType] || d.biteDescription}`);
	lines.push(`Рентген: ${d.xrayFindingsDescription}`);
	lines.push(`--------------------------------------------------------------------------------`);
	lines.push(`4. ДНЕВНИКИ ПОСЕЩЕНИЙ (ФОРМА 043/У)`);
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
	lines.push(`5. ЭПИКРИЗ И ДИСПАНСЕРИЗАЦИЯ`);
	lines.push(`Сводка: ${data.epicrisis.treatmentSummary}`);
	lines.push(`Исход: ${data.epicrisis.treatmentOutcomeLabel} | Диспансерная группа: ${data.epicrisis.dispensaryGroupLabel}`);
	lines.push(`Контрольный осмотр: через ${data.epicrisis.plannedRecallIntervalMonths} мес.`);
	lines.push(`Рекомендации: ${data.epicrisis.preventivePlanRecommendations}`);

	return lines.join("\n");
}
