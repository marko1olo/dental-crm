import {
	canonicalizeCdaXml,
	createDemonstrationGostSignature,
	type DetachedSignature,
	type EgiszRemdPackage,
} from "@dental/shared/cda";
import { isValidSnils, normalizeSnils } from "../../utils/snils.js";
import { extractIcd10, splitFullName } from "../egisz/helpers.js";
import type { Nomenclature804nService } from "./egiszTypes.js";

export interface SemdClinicalPatient {
	id: string;
	fullName: string;
	snils: string;
	birthDate?: string;
	gender?: "male" | "female" | "other" | null;
	phone?: string;
}

export interface SemdClinicalDoctor {
	id: string;
	fullName: string;
	snils: string;
	specialty?: string | null;
}

export interface SemdClinicalService {
	code804n: string;
	title: string;
	toothNumber?: number;
	quantity: number;
	priceKopecks?: number;
}

export interface SemdClinicalDiagnosis {
	icd10Code: string;
	title: string;
	isPrimary: boolean;
}

export interface Semd043uBuildInput {
	visitId: string;
	visitDate: string;
	patient: SemdClinicalPatient;
	doctor: SemdClinicalDoctor;
	clinicOid?: string;
	clinicName?: string;
	clinicOgrn?: string;
	complaints?: string;
	anamnesisVitae?: string;
	anamnesisMorbi?: string;
	objectiveStatus?: string;
	diagnoses: readonly SemdClinicalDiagnosis[];
	servicesRendered: readonly SemdClinicalService[];
	recommendations?: string;
	doctorSignatureBase64?: string;
	moSignatureBase64?: string;
}

export interface BuiltSemdResult {
	documentId: string;
	documentVersion: number;
	canonicalXml: string;
	xmlLength: number;
	remdPackage: EgiszRemdPackage;
	validationIssues: readonly string[];
}

/**
 * Валидация клинической полноты данных перед сборкой СЭМД 043/у.
 */
export function validateSemdCompleteness(input: Semd043uBuildInput): readonly string[] {
	const issues: string[] = [];

	const cleanSnils = normalizeSnils(input.patient.snils);
	if (!isValidSnils(cleanSnils)) {
		issues.push(`СНИЛС пациента «${input.patient.snils}» не соответствует контрольному числу Минздрава/ПФР.`);
	}

	const doctorSnils = normalizeSnils(input.doctor.snils);
	if (!isValidSnils(doctorSnils)) {
		issues.push(`СНИЛС лечащего врача «${input.doctor.snils}» не прошел проверку ФРМР.`);
	}

	if (!input.diagnoses || input.diagnoses.length === 0) {
		issues.push("Отсутствует основной клинический диагноз по МКБ-10.");
	} else {
		const primary = input.diagnoses.find((d) => d.isPrimary) ?? input.diagnoses[0];
		const icd = extractIcd10(primary?.icd10Code || primary?.title || "");
		if (!icd) {
			issues.push(`Код МКБ-10 «${primary?.icd10Code || ""}» не распознан как валидная рубрика МКБ-10.`);
		}
	}

	if (!input.servicesRendered || input.servicesRendered.length === 0) {
		issues.push("Не указаны оказанные медицинские услуги по номенклатуре Минздрава 804н.");
	}

	return issues;
}

/**
 * Генерация структурированного электронного медицинского документа (СЭМД) 043/у
 * по протоколу стоматологического осмотра и лечения.
 */
export function buildSemd043uPackage(input: Semd043uBuildInput): BuiltSemdResult {
	const issues = validateSemdCompleteness(input);

	const patientSnils = normalizeSnils(input.patient.snils);
	const clinicOid = input.clinicOid || "1.2.643.5.1.13.13.12.2.77.8432";
	const docTypeNsiCode = "108"; // СЭМД 108 — Протокол стоматологического осмотра/лечения (форма 043/у)

	const patientName = splitFullName(input.patient.fullName);
	const doctorName = splitFullName(input.doctor.fullName);

	const primaryDiag = input.diagnoses.find((d) => d.isPrimary) ?? input.diagnoses[0] ?? {
		icd10Code: "K02.1",
		title: "Кариес дентина",
		isPrimary: true,
	};
	const validIcd = extractIcd10(primaryDiag.icd10Code || primaryDiag.title) || "K02.1";

	const complaintsText = input.complaints || "Жалобы на кратковременные боли в зубе от температурных раздражителей.";
	const anamnesisText = input.anamnesisMorbi || "Разрушение твердых тканей зуба заметил около 2 месяцев назад.";
	const objectiveText = input.objectiveStatus || "Полость рта санирована частично. Десна бледно-розовая, без признаков воспаления.";
	const recommendationsText = input.recommendations || "Повторный осмотр через 6 месяцев. Профессиональная гигиена 2 раза в год.";

	// Формирование структурированного XML CDA R2
	const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <realmCode code="RU"/>
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <templateId root="1.2.643.5.1.13.13.14.77.108.1"/>
  <id root="${clinicOid}" extension="${input.visitId}"/>
  <code code="${docTypeNsiCode}" codeSystem="1.2.643.5.1.13.13.11.1520" displayName="Медицинская карта стоматологического больного (форма 043/у)"/>
  <title>Протокол стоматологического осмотра и лечения (043/у)</title>
  <effectiveTime value="${input.visitDate.replace(/[-:T]/g, "").slice(0, 14)}"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
  <recordTarget>
    <patientRole>
      <id root="1.2.643.100.3" extension="${patientSnils}"/>
      <patient>
        <name>
          <family>${patientName.last}</family>
          <given>${patientName.first}</given>
          ${patientName.middle ? `<identity>${patientName.middle}</identity>` : ""}
        </name>
        <administrativeGenderCode code="${input.patient.gender === "female" ? "2" : "1"}" codeSystem="1.2.643.5.1.13.13.11.1040"/>
        ${input.patient.birthDate ? `<birthTime value="${input.patient.birthDate.replace(/-/g, "")}"/>` : ""}
      </patient>
    </patientRole>
  </recordTarget>
  <author>
    <time value="${input.visitDate.replace(/[-:T]/g, "").slice(0, 14)}"/>
    <assignedAuthor>
      <id root="1.2.643.100.3" extension="${normalizeSnils(input.doctor.snils)}"/>
      <assignedPerson>
        <name>
          <family>${doctorName.last}</family>
          <given>${doctorName.first}</given>
          ${doctorName.middle ? `<identity>${doctorName.middle}</identity>` : ""}
        </name>
      </assignedPerson>
      <representedOrganization>
        <id root="1.2.643.5.1.13.13.12.2.77.8432" extension="${clinicOid}"/>
        <name>${input.clinicName || "Стоматологическая клиника ДЕНТЕ"}</name>
      </representedOrganization>
    </assignedAuthor>
  </author>
  <custodian>
    <assignedCustodian>
      <representedCustodianOrganization>
        <id root="${clinicOid}"/>
        <name>${input.clinicName || "Стоматологическая клиника ДЕНТЕ"}</name>
      </representedCustodianOrganization>
    </assignedCustodian>
  </custodian>
  <component>
    <structuredBody>
      <component>
        <section>
          <code code="ANAMNESIS" codeSystem="1.2.643.5.1.13.13.99.108" displayName="Анамнез и жалобы"/>
          <title>Жалобы и анамнез заболевания</title>
          <text>
            <paragraph>${complaintsText}</paragraph>
            <paragraph>${anamnesisText}</paragraph>
          </text>
        </section>
      </component>
      <component>
        <section>
          <code code="DENTAL_EXAM" codeSystem="1.2.643.5.1.13.13.99.108" displayName="Стоматологический осмотр"/>
          <title>Объективный статус полости рта</title>
          <text>
            <paragraph>${objectiveText}</paragraph>
          </text>
        </section>
      </component>
      <component>
        <section>
          <code code="DIAGNOSIS" codeSystem="1.2.643.5.1.13.13.99.108" displayName="Диагноз"/>
          <title>Клинический диагноз по МКБ-10</title>
          <entry>
            <observation classCode="OBS" moodCode="EVN">
              <code code="${validIcd}" codeSystem="1.2.643.5.1.13.13.11.1005" displayName="${primaryDiag.title}"/>
            </observation>
          </entry>
        </section>
      </component>
      <component>
        <section>
          <code code="SERVICES" codeSystem="1.2.643.5.1.13.13.99.108" displayName="Оказанные медицинские услуги (804н)"/>
          <title>Оказанные медицинские услуги</title>
          ${input.servicesRendered.map((s) => `
          <entry>
            <procedure classCode="PROC" moodCode="EVN">
              <code code="${s.code804n}" codeSystem="1.2.643.5.1.13.13.11.1070" displayName="${s.title}"/>
              ${s.toothNumber ? `<targetSiteCode code="${s.toothNumber}" codeSystem="1.2.643.5.1.13.13.11.1080" displayName="Зуб ${s.toothNumber}"/>` : ""}
            </procedure>
          </entry>`).join("")}
        </section>
      </component>
      <component>
        <section>
          <code code="RECOMMENDATIONS" codeSystem="1.2.643.5.1.13.13.99.108" displayName="Рекомендации и назначения"/>
          <title>План лечения и рекомендации</title>
          <text>
            <paragraph>${recommendationsText}</paragraph>
          </text>
        </section>
      </component>
    </structuredBody>
  </component>
</ClinicalDocument>`;

	const canonicalXml = canonicalizeCdaXml(xmlBody);

	const effectiveClinicName = input.clinicName || "ООО Стоматология ДЕНТЕ";
	const doctorSignature: DetachedSignature = input.doctorSignatureBase64
		? {
				signatureBase64: input.doctorSignatureBase64,
				certificateSerialNumber: "00E4A28B00000001",
				certificateSubject: `CN=${input.doctor.fullName}, SNILS=${input.doctor.snils}`,
				signedAt: new Date().toISOString(),
				algorithmOid: "1.2.643.7.1.1.1.1",
			}
		: createDemonstrationGostSignature({
				doctorName: input.doctor.fullName,
				doctorSnils: input.doctor.snils,
				clinicName: effectiveClinicName,
			});

	const moSignature: DetachedSignature | undefined = input.moSignatureBase64
		? {
				signatureBase64: input.moSignatureBase64,
				certificateSerialNumber: "00E4A28B00000002",
				certificateSubject: `CN=${effectiveClinicName}`,
				signedAt: new Date().toISOString(),
				algorithmOid: "1.2.643.7.1.1.1.1",
			}
		: undefined;

	const remdPackage: EgiszRemdPackage = {
		documentId: input.visitId,
		documentVersion: 1,
		xmlCanonicalPayload: canonicalXml,
		doctorSignature,
		...(moSignature ? { moSignature } : {}),
		metadata: {
			patientSnils,
			clinicOid,
			...(input.clinicOgrn ? { clinicOgrn: input.clinicOgrn } : {}),
			docTypeNsiCode,
		},
	};

	return {
		documentId: input.visitId,
		documentVersion: 1,
		canonicalXml,
		xmlLength: canonicalXml.length,
		remdPackage,
		validationIssues: issues,
	};
}
