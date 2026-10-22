/**
 * dentalCdaSections.ts — Clinical CDA R2 Section Builders (FDI, ICD-10, 804n)
 */

import { escapeXml, formatRuDate } from "@dental/shared/cda";
import { EGISZ_REMD_OIDS } from "../remdXml/egiszRemdPresets";
import type { EgiszDentalCdaPayload } from "./cdaTypes";
export { buildDentalFormulaSection } from "./dentalFormulaCdaSection";

export function buildComplaintsSection(complaintsText: string): string {
	return `
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_COMPLAINTS}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Жалобы"/>
					<title>Жалобы пациента</title>
					<text><paragraph>${escapeXml(complaintsText)}</paragraph></text>
				</section>
			</component>`;
}

export function buildAnamnesisSection(morbi: string, vitae: string): string {
	return `
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_ANAMNESIS}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Анамнез"/>
					<title>Анамнез заболевания и жизни</title>
					<text>
						<paragraph><strong>Анамнез заболевания:</strong> ${escapeXml(morbi)}</paragraph>
						<paragraph><strong>Анамнез жизни и соматический статус:</strong> ${escapeXml(vitae)}</paragraph>
					</text>
				</section>
			</component>`;
}

export function buildDiagnosesSection(diagnosesList: EgiszDentalCdaPayload["diagnoses"]): string {
	const entries = diagnosesList.map((diag) => {
		const code = (diag.icd10Code || "").trim() || "Z01.2";
		const name = (diag.icd10Name || diag.diagnosisName || "").trim() || "Стоматологическое обследование";
		return `\t\t\t\t\t<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="282291009" codeSystem="2.16.840.1.113883.6.96" displayName="${diag.isPrimary ? "Основной клинический диагноз" : "Сопутствующий диагноз"}"/>
							<statusCode code="completed"/>
							<value xsi:type="CD" code="${escapeXml(code)}" codeSystem="${EGISZ_REMD_OIDS.ICD10}" codeSystemName="МКБ-10" displayName="${escapeXml(name)}"/>
							${diag.tooth ? `<targetSiteCode code="${escapeXml(String(diag.tooth))}" codeSystem="${EGISZ_REMD_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(String(diag.tooth))}"/>` : ""}
						</observation>
					</entry>`;
	}).join("\n");

	return `
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_DIAGNOSIS_SECTION}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Диагнозы"/>
					<title>Клинический диагноз</title>
					<text>
						<list>
							${diagnosesList.map((d) => `<item>${d.isPrimary ? "<strong>[Основной]</strong> " : "[Сопутствующий] "}${escapeXml((d.icd10Code || "").trim() || "Z01.2")} — ${escapeXml((d.icd10Name || d.diagnosisName || "").trim() || "Стоматологическое обследование")}${d.tooth ? ` (зуб ${escapeXml(String(d.tooth))})` : ""}</item>`).join("\n\t\t\t\t\t\t\t")}
						</list>
					</text>
${entries}
				</section>
			</component>`;
}

export function buildProceduresSection(proceduresList: EgiszDentalCdaPayload["procedures"], visitTime: string, desc?: string): string {
	const entries = proceduresList.map((proc) => {
		const code = (proc.code || "").trim() || "B01.065.001";
		const name = (proc.name || "").trim() || "Прием (осмотр, консультация) врача-стоматолога";
		return `\t\t\t\t\t<entry>
						<procedure classCode="PROC" moodCode="EVN">
							<code code="${escapeXml(code)}" codeSystem="${EGISZ_REMD_OIDS.NOMENKLATURA_804N}" codeSystemName="Номенклатура медицинских услуг 804н" displayName="${escapeXml(name)}"/>
							<statusCode code="completed"/>
							<effectiveTime value="${visitTime}"/>
							${proc.tooth ? `<targetSiteCode code="${escapeXml(String(proc.tooth))}" codeSystem="${EGISZ_REMD_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(String(proc.tooth))}"/>` : ""}
						</procedure>
					</entry>`;
	}).join("\n");

	return `
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_SERVICES_RENDERED}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Проведенные процедуры и вмешательства"/>
					<title>Протокол стоматологического вмешательства и оказанные услуги</title>
					<text>
						${desc ? `<paragraph><strong>Описание вмешательства:</strong> ${escapeXml(desc)}</paragraph>` : ""}
						<list>
							${proceduresList.map((p) => `<item>${escapeXml((p.code || "").trim() || "B01.065.001")} — ${escapeXml((p.name || "").trim() || "Услуга")}${p.tooth ? ` (зуб ${escapeXml(String(p.tooth))})` : ""}</item>`).join("\n\t\t\t\t\t\t\t")}
						</list>
					</text>
${entries}
				</section>
			</component>`;
}

export function buildRecommendationsSection(recommendations: string, nextVisitDate?: string | Date): string {
	const nextVisitStr = nextVisitDate ? ` Дата назначенного приема: ${formatRuDate(nextVisitDate)}.` : "";
	return `
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_RECOMMENDATIONS}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Рекомендации"/>
					<title>Рекомендации и план дальнейшего ведения</title>
					<text><paragraph>${escapeXml(recommendations)}${escapeXml(nextVisitStr)}</paragraph></text>
				</section>
			</component>`;
}
