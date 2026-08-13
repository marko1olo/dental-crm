/**
 * CDA R2 structuredBody — Form 043/u sections (flat text + diagnosis entry).
 * Sections are simple flat <section> blocks (no <id>), matching SEMD validators.
 */

import type { CdaContext } from "./util.js";
import { EGISZ_OIDS, escapeXml } from "./util.js";

function section(opts: {
	loinc: string;
	displayName: string;
	title: string;
	paragraph: string;
}): string {
	const { loinc, displayName, title, paragraph } = opts;
	return `
			<component>
				<section>
					<code code="${loinc}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="${displayName}"/>
					<title>${title}</title>
					<text>
						<paragraph>${escapeXml(paragraph)}</paragraph>
					</text>
				</section>
			</component>`;
}

export function generateCdaBody(ctx: CdaContext): string {
	const { params } = ctx;

	/*
	 * Every clinical-data section is structurally optional: if a field is
	 * missing we omit the whole <component> rather than inventing a value
	 * or emitting an empty paragraph. We never fabricate clinical facts.
	 */

	const diagnosisText = params.diagnosisText?.trim()
		? params.diagnosisText
		: "";
	const icd10Code = params.icd10Code?.trim() ? params.icd10Code : "";
	// ISO 3950 tooth number straight from visit_diaries.diagnosis_tooth (real DB
	// column). Rendered only when a real value is present; never fabricated.
	const diagnosisTooth = params.diagnosisTooth?.trim()
		? params.diagnosisTooth.trim()
		: "";

	/*
	 * Never emit a fabricated/empty ICD10 value. If the code is missing,
	 * structurally omit the code attribute and the "(МКБ-10: …)" suffix
	 * rather than writing code="" or an empty parenthetical.
	 */
	const icd10Escaped = icd10Code ? escapeXml(icd10Code) : "";
	const diagnosisIcd10Attr = icd10Escaped ? ` code="${icd10Escaped}"` : "";
	const diagnosisIcd10Suffix = icd10Escaped ? ` (МКБ-10: ${icd10Escaped})` : "";

	// Only emit the diagnosis section when we have at least one real fact.
	const diagnosisSection =
		diagnosisText || icd10Code || diagnosisTooth
			? `
			<!-- Диагноз -->
			<component>
				<section>
					<code code="29548-5" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Диагнозы"/>
					<title>Диагноз</title>
					<text>
						<paragraph>${escapeXml(diagnosisText)}${diagnosisIcd10Suffix}${diagnosisTooth ? ` · зуб ${escapeXml(diagnosisTooth)}` : ""}</paragraph>
					</text>${
						icd10Code || diagnosisTooth
							? `
					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="29308-4" codeSystem="${EGISZ_OIDS.LOINC}" displayName="Диагноз"/>
							<statusCode code="completed"/>
							<value xsi:type="CD"${diagnosisIcd10Attr} codeSystem="${EGISZ_OIDS.ICD10}" codeSystemName="МКБ-10" displayName="${escapeXml(diagnosisText)}"/>
							${diagnosisTooth ? `<targetSiteCode code="${escapeXml(diagnosisTooth)}" codeSystem="${EGISZ_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(diagnosisTooth)}"/>` : ""}
						</observation>
					</entry>`
							: ""
					}
				</section>
			</component>`
			: "";

	const anamnesis = params.anamnesis?.trim()
		? section({
				loinc: "10164-2",
				displayName: "Анамнез",
				title: "Анамнез",
				paragraph: params.anamnesis,
			})
		: "";

	const objective = params.objectiveStatus?.trim()
		? section({
				loinc: "29545-1",
				displayName: "Physical findings",
				title: "Объективный статус",
				paragraph: params.objectiveStatus,
			})
		: "";

	const treatment = params.treatmentDescription?.trim()
		? section({
				loinc: "47519-4",
				displayName: "Медицинские услуги",
				title: "Проведенное лечение",
				paragraph: params.treatmentDescription,
			})
		: "";

	const complications = params.complications?.trim()
		? section({
				loinc: "55109-3",
				displayName: "Complications",
				title: "Осложнения",
				paragraph: params.complications,
			})
		: "";

	const comorbidities = params.comorbidities?.trim()
		? section({
				loinc: "11348-0",
				displayName: "History of Past illness",
				title: "Сопутствующие заболевания",
				paragraph: params.comorbidities,
			})
		: "";

	const traySection = params.instrumentTrayBarcode?.trim()
		? section({
				loinc: "46264-8",
				displayName: "Medical device identifier",
				title: "Инструментальный лоток",
				paragraph: `Штрихкод: ${params.instrumentTrayBarcode}`,
			})
		: "";

	return `
	<component>
		<structuredBody>
			${diagnosisSection}
			${anamnesis}
			${objective}
			${treatment}
			${complications}
			${comorbidities}
			${traySection}
		</structuredBody>
	</component>
</ClinicalDocument>`;
}
