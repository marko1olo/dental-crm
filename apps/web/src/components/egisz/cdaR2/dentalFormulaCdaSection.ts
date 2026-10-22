/**
 * dentalFormulaCdaSection.ts — Tooth formula CDA R2 section builder
 */

import { escapeXml } from "@dental/shared/cda";
import { DENTAL_TOOTH_STATUS_DICTIONARY, EGISZ_REMD_OIDS } from "../remdXml/egiszRemdPresets";

export function buildDentalFormulaSection(
	toothStates: Record<number, string>,
	toothSurfaces: Record<number, string[]> = {},
): string {
	const sortedTeeth = Object.keys(toothStates).map(Number).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b);
	if (sortedTeeth.length === 0) {
		return `
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_DENTAL_ODONTOGRAM}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Зубная формула и одонтограмма"/>
					<title>Зубная формула (FDI ISO 3950 / Электронная карта визита РЭМД)</title>
					<text><paragraph>Зубная формула: интактный зубной ряд, видимых патологических изменений не выявлено.</paragraph></text>
				</section>
			</component>`;
	}
	const summary = sortedTeeth.map((t) => {
		const st = DENTAL_TOOTH_STATUS_DICTIONARY[toothStates[t] || "Healthy"] || { labelRu: toothStates[t], egiszCode: "0" };
		const surfs = toothSurfaces[t] || [];
		return `Зуб ${t}: ${st.labelRu}${surfs.length > 0 ? ` [${surfs.join("")}]` : ""}`;
	}).join("; ");

	const observations = sortedTeeth.map((t) => {
		const st = DENTAL_TOOTH_STATUS_DICTIONARY[toothStates[t] || "Healthy"] || { labelRu: toothStates[t], egiszCode: "0" };
		const surfs = toothSurfaces[t] || [];
		return `\t\t\t\t\t<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="${EGISZ_REMD_OIDS.LOINC_DENTAL_ODONTOGRAM}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" displayName="Статус зуба ${t}"/>
							<statusCode code="completed"/>
							<value xsi:type="CD" code="${escapeXml(st.egiszCode)}" codeSystem="${EGISZ_REMD_OIDS.DENTAL_TOOTH}" displayName="${escapeXml(st.labelRu)}"${surfs.length > 0 ? ` surfaces="${surfs.join(",")}"` : ""}/>
							<targetSiteCode code="${t}" codeSystem="${EGISZ_REMD_OIDS.DENTAL_TOOTH}" displayName="Зуб ${t}"/>
						</observation>
					</entry>`;
	}).join("\n");

	return `
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_DENTAL_ODONTOGRAM}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Зубная формула и одонтограмма"/>
					<title>Зубная формула (FDI ISO 3950 / Электронная карта визита РЭМД)</title>
					<text><paragraph>${escapeXml(summary)}</paragraph></text>
${observations}
				</section>
			</component>`;
}
