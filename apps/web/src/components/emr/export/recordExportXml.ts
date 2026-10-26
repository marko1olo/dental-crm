import type { MedicalCardForm043uData } from "../emr043Types";
import { dentalBiteTypeLabels } from "@dental/shared";
import { calculateDmftIndex } from "../emr043Math";

/** Экранирование специальных символов XML */
export function escapeXml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Генератор официального HL7 CDA R2 (СЭМД 834н) XML для интеграции с ЕГИСЗ */
export function generate043XmlCda(data: MedicalCardForm043uData): string {
	const p = data.passport;
	const c = data.clinic;
	const d = data.dentalStatus;
	const ep = data.epicrisis;
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
  <recordTarget>
    <patientRole>
      <id root="1.2.643.5.1.13.100.1.1.1" extension="${escapeXml(p.patientSnils || "000-000-000 00")}"/>
      <addr><streetAddressLine>${escapeXml(p.patientAddressRegistration)}</streetAddressLine></addr>
      <telecom value="tel:${escapeXml(p.patientPhone || "")}"/>
      <patient>
        <name><family>${escapeXml(p.patientFullName.split(" ")[0] || "")}</family><given>${escapeXml(p.patientFullName.split(" ")[1] || "")}</given></name>
        <administrativeGenderCode code="${p.patientSex === "male" ? "1" : "2"}" codeSystem="1.2.643.5.1.13.13.11.1040" displayName="${p.patientSex === "male" ? "Мужской" : "Женский"}"/>
        <birthTime value="${escapeXml(p.patientBirthDate.replace(/-/g, ""))}"/>
      </patient>
    </patientRole>
  </recordTarget>
  <author>
    <time value="${createdIso.replace(/[-:T]/g, "").slice(0, 14)}"/>
    <assignedAuthor>
      <id root="1.2.643.5.1.13.100.1.1.1" extension="${escapeXml(p.attendingDoctorSnils || "000-000-000 00")}"/>
      <code code="108" codeSystem="1.2.643.5.1.13.13.11.1002" displayName="${escapeXml(p.attendingDoctorSpecialty)}"/>
      <assignedPerson><name><family>${escapeXml(p.attendingDoctorFullName.split(" ")[0] || "")}</family><given>${escapeXml(p.attendingDoctorFullName.split(" ")[1] || "")}</given></name></assignedPerson>
      <representedOrganization>
        <id root="1.2.643.5.1.13.100.1.1" extension="${escapeXml(c.clinicOgrn)}"/><name>${escapeXml(c.clinicLegalName || c.clinicName)}</name><addr>${escapeXml(c.clinicAddress)}</addr>
      </representedOrganization>
    </assignedAuthor>
  </author>
  <component>
    <structuredBody>
      <component>
        <section>
          <code code="PASSPORT" codeSystem="1.2.643.5.1.13" displayName="Паспортная часть"/>
          <title>Паспортная часть и первичное обращение</title>
          <text><paragraph>Номер карты: ${escapeXml(p.medicalCardNumber)}</paragraph><paragraph>Дата открытия: ${escapeXml(p.cardOpenedDate)}</paragraph><paragraph>Первичный диагноз: ${escapeXml(p.primaryDiagnosisText)} (${escapeXml(p.primaryDiagnosisIcd10)})</paragraph></text>
        </section>
      </component>
      <component>
        <section>
          <code code="ANAMNESIS" codeSystem="1.2.643.5.1.13" displayName="Анамнез"/>
          <title>Анамнез жизни и заболевания</title>
          <text><paragraph>Жалобы: ${escapeXml(data.anamnesis.chiefComplaint)}</paragraph><paragraph>Анамнез заболевания: ${escapeXml(data.anamnesis.historyOfPresentIllness)}</paragraph><paragraph>Аллергологический статус: ${escapeXml(data.anamnesis.allergologicalHistory)}</paragraph></text>
        </section>
      </component>
      <component>
        <section>
          <code code="DENTAL_STATUS" codeSystem="1.2.643.5.1.13" displayName="Стоматологический статус"/>
          <title>Зубная формула и индексы интенсивности</title>
          <text><paragraph>Индекс КПУ(з): ${dmft.totalDmft} (К=${dmft.decayed}, П=${dmft.filled}, У=${dmft.missing})</paragraph><paragraph>Уровень интенсивности кариеса: ${escapeXml(dmft.intensityLevelLabel)}</paragraph><paragraph>Прикус: ${escapeXml(dentalBiteTypeLabels[d.biteType] || d.biteDescription)}</paragraph></text>
        </section>
      </component>
      <component>
        <section>
          <code code="VISIT_DIARIES" codeSystem="1.2.643.5.1.13" displayName="Дневники посещений"/>
          <title>Дневники посещений (Форма 043/у)</title>
          <text>${(data.visitDiaries || []).map((vd, i) => `<paragraph><strong>Визит ${i + 1} (${escapeXml(vd.entryDate)}):</strong> Диагноз: ${escapeXml(vd.assessmentDiagnosisText)} [${escapeXml(vd.assessmentIcd10Code)}]. Протокол: ${escapeXml(vd.procedureProtocol)}.</paragraph>`).join("")}</text>
        </section>
      </component>
      <component>
        <section>
          <code code="EPICRISIS" codeSystem="1.2.643.5.1.13" displayName="Эпикриз"/>
          <title>Эпикриз и план контрольного наблюдения</title>
          <text><paragraph>Сводка: ${escapeXml(ep.treatmentSummary)}</paragraph><paragraph>Исход: ${escapeXml(ep.treatmentOutcomeLabel)}</paragraph><paragraph>Группа: ${escapeXml(ep.dispensaryGroupLabel)}</paragraph><paragraph>Осмотр: через ${ep.plannedRecallIntervalMonths} мес.</paragraph></text>
        </section>
      </component>
    </structuredBody>
  </component>
</ClinicalDocument>`;
}
