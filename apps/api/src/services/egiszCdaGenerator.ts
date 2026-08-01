export interface EgiszCdaParams {
	patientId: string;
	patientName: { first: string; last: string; middle?: string };
	patientSnils: string;
	patientBirthDate: string | null;
	patientGender: "male" | "female" | "other" | null;
	clinicOid?: string;
	clinicName: string;
	doctorName: { first: string; last: string; middle?: string };
	doctorSnils?: string;
	/** DEFECT #58: specialty label → assignedAuthor/code@displayName */
	doctorPosition?: string;
	icd10Code: string;
	diagnosisText: string;
	anamnesis?: string;
	/** Status localis / objective exam (043 O-block → visits.objectiveStatus). */
	objectiveStatus?: string;
	/** 043 complications — clinical events during/after visit. */
	complications?: string;
	/** 043 comorbidities / concomitant diseases. */
	comorbidities?: string;
	/**
	 * DEFECT #57: 043 instrument tray barcode (sterilization link).
	 * Printed on Form 043/у and part of diary_hash; was never exported to CDA.
	 */
	instrumentTrayBarcode?: string;
	treatmentDescription?: string;
	visitDate: Date;
	documentId: string;
	/**
	 * DEFECT #61: CDA versionNumber must track 043 diary.version after revise.
	 * Default 1 when diary absent (EMK-only export).
	 */
	documentVersion?: number;
}

/** Escape free-text for CDA XML text/attribute nodes (DEFECT #49). */
function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
function formatDate(d: Date, format: "yyyyMMdd" | "yyyyMMddHHmmss"): string {
	const pad = (n: number) => n.toString().padStart(2, "0");
	const yyyy = d.getFullYear().toString();
	const MM = pad(d.getMonth() + 1);
	const dd = pad(d.getDate());
	if (format === "yyyyMMdd") return `${yyyy}${MM}${dd}`;
	const HH = pad(d.getHours());
	const mm = pad(d.getMinutes());
	const ss = pad(d.getSeconds());
	return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
}

export function generateDentalCdaXml(params: EgiszCdaParams): string {
	const now = new Date();
	const effectiveTime = formatDate(now, "yyyyMMddHHmmss");
	/* DEFECT #55: visitTime must appear in documentationOf/serviceEvent below.
	 * БЫЛО: formatted and discarded — CDA had only generation effectiveTime. */
	const visitTime = formatDate(params.visitDate, "yyyyMMdd");
	const birthTime = params.patientBirthDate
		? formatDate(new Date(params.patientBirthDate), "yyyyMMdd")
		: "19000101";

	const genderCode = params.patientGender === "male" ? "1" : params.patientGender === "female" ? "2" : "0";

	return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
	<templateId root="1.2.643.5.1.13.13.11.1527"/>
	<id root="${params.clinicOid || "1.2.643.5.1.13.13.12.2"}" extension="${escapeXml(params.documentId)}"/>
	<code code="74208-1" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Протокол стоматологического осмотра"/>
	<title>Протокол стоматологического осмотра</title>
	<effectiveTime value="${effectiveTime}"/>
	<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
	<languageCode code="ru-RU"/>
	<setId root="${params.clinicOid || "1.2.643.5.1.13.13.12.2"}" extension="${escapeXml(params.documentId)}"/>
	<versionNumber value="${Math.max(1, Math.floor(Number(params.documentVersion) || 1))}"/>
	<recordTarget>
		<patientRole>
			<id root="1.2.643.100.3" extension="${escapeXml(params.patientSnils)}"/>
			<patient>
				<name>
					<family>${escapeXml(params.patientName.last)}</family>
					<given>${escapeXml(params.patientName.first)}</given>
					${params.patientName.middle ? `<given>${escapeXml(params.patientName.middle)}</given>` : ""}
				</name>
				<administrativeGenderCode code="${genderCode}" codeSystem="1.2.643.5.1.13.13.11.1040"/>
				<birthTime value="${birthTime}"/>
			</patient>
		</patientRole>
	</recordTarget>
	<author>
		<time value="${effectiveTime}"/>
		<assignedAuthor>
			${params.doctorSnils ? `<id root="1.2.643.100.3" extension="${escapeXml(params.doctorSnils)}"/>` : ""}
			${params.doctorPosition && params.doctorPosition.trim()
				? `<code nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
				: ""}
			<assignedPerson>
				<name>
					<family>${escapeXml(params.doctorName.last)}</family>
					<given>${escapeXml(params.doctorName.first)}</given>
					${params.doctorName.middle ? `<given>${escapeXml(params.doctorName.middle)}</given>` : ""}
				</name>
			</assignedPerson>
		</assignedAuthor>
	</author>
	<custodian>
		<assignedCustodian>
			<representedCustodianOrganization>
				<id root="1.2.643.5.1.13.13.12.2" extension="${params.clinicOid || ""}"/>
				<name>${escapeXml(params.clinicName)}</name>
			</representedCustodianOrganization>
		</assignedCustodian>
	</custodian>
	<!-- DEFECT #55: encounter date (params.visitDate) — was computed as visitTime but unused -->
	<documentationOf>
		<serviceEvent classCode="PCPR">
			<effectiveTime value="${visitTime}"/>
		</serviceEvent>
	</documentationOf>
	<component>
		<structuredBody>
			<!-- Диагноз -->
			<component>
				<section>
					<code code="29548-5" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Диагнозы"/>
					<title>Диагноз</title>
					<text>
						<paragraph>${escapeXml(params.diagnosisText)} (МКБ-10: ${escapeXml(params.icd10Code)})</paragraph>
					</text>
					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="29308-4" codeSystem="2.16.840.1.113883.6.1" displayName="Диагноз"/>
							<value xsi:type="CD" code="${escapeXml(params.icd10Code)}" codeSystem="1.2.643.5.1.13.13.11.1005" displayName="${escapeXml(params.diagnosisText)}"/>
						</observation>
					</entry>
				</section>
			</component>
			<!-- Анамнез -->
			<component>
				<section>
					<code code="10164-2" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Анамнез"/>
					<title>Анамнез</title>
					<text>
						<paragraph>${escapeXml(params.anamnesis || "Без особенностей")}</paragraph>
					</text>
				</section>
			</component>
			<!-- Объективный статус / Status localis (043 O-block) -->
			<component>
				<section>
					<code code="29545-1" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Physical findings"/>
					<title>Объективный статус</title>
					<text>
						<paragraph>${escapeXml(params.objectiveStatus || "Без особенностей")}</paragraph>
					</text>
				</section>
			</component>
			<!-- Оказанные услуги / Лечение -->
			<component>
				<section>
					<code code="47519-4" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Медицинские услуги"/>
					<title>Проведенное лечение</title>
					<text>
						<paragraph>${escapeXml(params.treatmentDescription || "Осмотр и консультация")}</paragraph>
					</text>
				</section>
			</component>
			<!-- Осложнения (043) -->
			<component>
				<section>
					<code code="55109-3" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Complications"/>
					<title>Осложнения</title>
					<text>
						<paragraph>${escapeXml(params.complications || "Не отмечены")}</paragraph>
					</text>
				</section>
			</component>
			<!-- Сопутствующие заболевания (043) -->
			<component>
				<section>
					<code code="11348-0" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="History of Past illness"/>
					<title>Сопутствующие заболевания</title>
					<text>
						<paragraph>${escapeXml(params.comorbidities || "Не отмечены")}</paragraph>
					</text>
				</section>
			</component>
			<!-- DEFECT #57: инструментальный лоток 043 (sterilization barcode) -->
			${params.instrumentTrayBarcode && params.instrumentTrayBarcode.trim()
				? `<component>
				<section>
					<code code="46264-8" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Medical device identifier"/>
					<title>Инструментальный лоток</title>
					<text>
						<paragraph>Штрихкод: ${escapeXml(params.instrumentTrayBarcode.trim())}</paragraph>
					</text>
				</section>
			</component>`
				: ""}
		</structuredBody>
	</component>
</ClinicalDocument>`;
}
