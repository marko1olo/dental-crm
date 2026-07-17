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
	doctorPosition?: string;
	icd10Code: string;
	diagnosisText: string;
	anamnesis?: string;
	treatmentDescription?: string;
	visitDate: Date;
	documentId: string;
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
	const visitTime = formatDate(params.visitDate, "yyyyMMdd");
	const birthTime = params.patientBirthDate
		? formatDate(new Date(params.patientBirthDate), "yyyyMMdd")
		: "19000101";

	const genderCode = params.patientGender === "male" ? "1" : params.patientGender === "female" ? "2" : "0";

	return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
	<templateId root="1.2.643.5.1.13.13.11.1527"/>
	<id root="${params.clinicOid || "1.2.643.5.1.13.13.12.2"}" extension="${params.documentId}"/>
	<code code="74208-1" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Протокол стоматологического осмотра"/>
	<title>Протокол стоматологического осмотра</title>
	<effectiveTime value="${effectiveTime}"/>
	<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
	<languageCode code="ru-RU"/>
	<setId root="${params.clinicOid || "1.2.643.5.1.13.13.12.2"}" extension="${params.documentId}"/>
	<versionNumber value="1"/>
	<recordTarget>
		<patientRole>
			<id root="1.2.643.100.3" extension="${params.patientSnils}"/>
			<patient>
				<name>
					<family>${params.patientName.last}</family>
					<given>${params.patientName.first}</given>
					${params.patientName.middle ? `<given>${params.patientName.middle}</given>` : ""}
				</name>
				<administrativeGenderCode code="${genderCode}" codeSystem="1.2.643.5.1.13.13.11.1040"/>
				<birthTime value="${birthTime}"/>
			</patient>
		</patientRole>
	</recordTarget>
	<author>
		<time value="${effectiveTime}"/>
		<assignedAuthor>
			${params.doctorSnils ? `<id root="1.2.643.100.3" extension="${params.doctorSnils}"/>` : ""}
			<assignedPerson>
				<name>
					<family>${params.doctorName.last}</family>
					<given>${params.doctorName.first}</given>
					${params.doctorName.middle ? `<given>${params.doctorName.middle}</given>` : ""}
				</name>
			</assignedPerson>
		</assignedAuthor>
	</author>
	<custodian>
		<assignedCustodian>
			<representedCustodianOrganization>
				<id root="1.2.643.5.1.13.13.12.2" extension="${params.clinicOid || ""}"/>
				<name>${params.clinicName}</name>
			</representedCustodianOrganization>
		</assignedCustodian>
	</custodian>
	<component>
		<structuredBody>
			<!-- Диагноз -->
			<component>
				<section>
					<code code="29548-5" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Диагнозы"/>
					<title>Диагноз</title>
					<text>
						<paragraph>${params.diagnosisText} (МКБ-10: ${params.icd10Code})</paragraph>
					</text>
					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="29308-4" codeSystem="2.16.840.1.113883.6.1" displayName="Диагноз"/>
							<value xsi:type="CD" code="${params.icd10Code}" codeSystem="1.2.643.5.1.13.13.11.1005" displayName="${params.diagnosisText}"/>
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
						<paragraph>${params.anamnesis || "Без особенностей"}</paragraph>
					</text>
				</section>
			</component>
			<!-- Оказанные услуги / Лечение -->
			<component>
				<section>
					<code code="47519-4" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Медицинские услуги"/>
					<title>Проведенное лечение</title>
					<text>
						<paragraph>${params.treatmentDescription || "Осмотр и консультация"}</paragraph>
					</text>
				</section>
			</component>
		</structuredBody>
	</component>
</ClinicalDocument>`;
}
