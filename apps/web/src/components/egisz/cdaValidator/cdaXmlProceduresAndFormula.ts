/**
 * cdaXmlProceduresAndFormula.ts — Tooth formula and procedure XML builder for CDA R2
 */

import { escapeXml } from "@dental/shared/cda";
import { type CdaExportData, EGISZ_STANDARD_OIDS } from "./validatorTypes";

export function buildDentalFormulaXml(data: CdaExportData): string {
	const toothStates = data.toothStates || {};
	const toothSurfaces = data.toothSurfaces || {};
	const teethKeys = Object.keys(toothStates).map(Number).sort((a, b) => a - b);
	if (teethKeys.length === 0) return "";

	const observations = teethKeys.map((tNum) => {
		const st = toothStates[tNum] || "Healthy";
		const surfs = toothSurfaces[tNum] || [];
		const surfText = surfs.length > 0 ? ` (${surfs.join(", ")})` : "";
		return `\t\t\t\t\t<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="74208-1" codeSystem="${EGISZ_STANDARD_OIDS.LOINC}" displayName="Статус зуба ${tNum}"/>
							<statusCode code="completed"/>
							<value xsi:type="CD" code="${escapeXml(st)}" displayName="${escapeXml(st)}${escapeXml(surfText)}"/>
							<targetSiteCode code="${tNum}" codeSystem="${EGISZ_STANDARD_OIDS.DENTAL_TOOTH}" displayName="Зуб ${tNum}"/>
						</observation>
					</entry>`;
	}).join("\n");

	return `
			<component>
				<section>
					<code code="74208-1" codeSystem="${EGISZ_STANDARD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Зубная формула и одонтограмма"/>
					<title>Зубная формула (FDI ISO 3950)</title>
					<text>
						<paragraph>Всего зубов в карте: ${teethKeys.length}. ${teethKeys.map((k) => `Зуб ${k}: ${toothStates[k]}${toothSurfaces[k]?.length ? ` [${toothSurfaces[k].join("")}]` : ""}`).join("; ")}</paragraph>
					</text>
${observations}
				</section>
			</component>`;
}

export function buildProceduresXml(data: CdaExportData, visitTime: string): string {
	const tooth = data.diagnosisTooth ? String(data.diagnosisTooth).trim() : "";
	const proceduresList = data.procedures || [
		{ code: "A16.07.002", name: "Восстановление зуба пломбой с нарушением формы", tooth },
		{ code: "A16.07.030", name: "Инструментальная и медикаментозная обработка корневого канала", tooth },
	];

	return `
			<component>
				<section>
					<code code="47519-4" codeSystem="${EGISZ_STANDARD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Проведенные процедуры и вмешательства"/>
					<title>Оказанные стоматологические услуги</title>
					<text>
						<paragraph>${escapeXml(data.treatmentDescription || proceduresList.map((p) => `${p.code} ${p.name}${p.tooth ? ` (зуб ${p.tooth})` : ""}`).join("; "))}</paragraph>
					</text>
					${proceduresList.map((p) => `
					<entry>
						<procedure classCode="PROC" moodCode="EVN">
							<code code="${escapeXml(p.code)}" codeSystem="${EGISZ_STANDARD_OIDS.V001_NOMENKLATURA}" codeSystemName="Номенклатура медицинских услуг 804н" displayName="${escapeXml(p.name)}"/>
							<statusCode code="completed"/>
							<effectiveTime value="${visitTime}"/>
							${p.tooth ? `<targetSiteCode code="${escapeXml(String(p.tooth))}" codeSystem="${EGISZ_STANDARD_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(String(p.tooth))}"/>` : ""}
						</procedure>
					</entry>`).join("")}
				</section>
			</component>`;
}
