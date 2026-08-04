/**
 * CDA R2 structuredBody — Form 043/u sections (flat text + diagnosis entry).
 * Sections are simple flat <section> blocks (no <id>), matching SEMD validators.
 */

import type { CdaContext } from "./util.js";
import { escapeXml } from "./util.js";

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
					<code code="${loinc}" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="${displayName}"/>
					<title>${title}</title>
					<text>
						<paragraph>${escapeXml(paragraph)}</paragraph>
					</text>
				</section>
			</component>`;
}

export function generateCdaBody(ctx: CdaContext): string {
	const { params } = ctx;

	const diagnosis = params.diagnosisText && params.diagnosisText.trim()
		? escapeXml(params.diagnosisText)
		: "";

	const diagnosisSection = `
			<!-- \u0414\u0438\u0430\u0433\u043d\u043e\u0437 -->
			<component>
				<section>
					<code code="29548-5" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="\u0414\u0438\u0430\u0433\u043d\u043e\u0437\u044b"/>
					<title>\u0414\u0438\u0430\u0433\u043d\u043e\u0437</title>
					<text>
						<paragraph>${escapeXml(params.diagnosisText || "")} (\u041c\u041a\u0411-10: ${escapeXml(params.icd10Code || "")})</paragraph>
					</text>
					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="29308-4" codeSystem="2.16.840.1.113883.6.1" displayName="\u0414\u0438\u0430\u0433\u043d\u043e\u0437"/>
							<value xsi:type="CD" code="${escapeXml(params.icd10Code || "")}" codeSystem="1.2.643.5.1.13.13.11.1005" displayName="${escapeXml(params.diagnosisText || "")}"/>
						</observation>
					</entry>
				</section>
			</component>`;

	const anamnesis = section({
		loinc: "10164-2",
		displayName: "\u0410\u043d\u0430\u043c\u043d\u0435\u0437",
		title: "\u0410\u043d\u0430\u043c\u043d\u0435\u0437",
		paragraph: params.anamnesis || "",
	});

	const objective = section({
		loinc: "29545-1",
		displayName: "Physical findings",
		title: "\u041e\u0431\u044a\u0435\u043a\u0442\u0438\u0432\u043d\u044b\u0439 \u0441\u0442\u0430\u0442\u0443\u0441",
		paragraph:
			params.objectiveStatus && params.objectiveStatus.trim()
				? params.objectiveStatus
				: "\u0411\u0435\u0437 \u043e\u0441\u043e\u0431\u0435\u043d\u043d\u043e\u0441\u0442\u0435\u0439",
	});

	const treatment = section({
		loinc: "47519-4",
		displayName: "\u041c\u0435\u0434\u0438\u0446\u0438\u043d\u0441\u043a\u0438\u0435 \u0443\u0441\u043b\u0443\u0433\u0438",
		title: "\u041f\u0440\u043e\u0432\u0435\u0434\u0435\u043d\u043d\u043e\u0435 \u043b\u0435\u0447\u0435\u043d\u0438\u0435",
		paragraph: params.treatmentDescription || "",
	});

	const complications = section({
		loinc: "55109-3",
		displayName: "Complications",
		title: "\u041e\u0441\u043b\u043e\u0436\u043d\u0435\u043d\u0438\u044f",
		paragraph:
			params.complications && params.complications.trim()
				? params.complications
				: "\u041d\u0435 \u043e\u0442\u043c\u0435\u0447\u0435\u043d\u044b",
	});

	const comorbidities = section({
		loinc: "11348-0",
		displayName: "History of Past illness",
		title: "\u0421\u043e\u043f\u0443\u0442\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u0435 \u0437\u0430\u0431\u043e\u043b\u0435\u0432\u0430\u043d\u0438\u044f",
		paragraph:
			params.comorbidities && params.comorbidities.trim()
				? params.comorbidities
				: "\u041d\u0435 \u043e\u0442\u043c\u0435\u0447\u0435\u043d\u044b",
	});

	const traySection =
		params.instrumentTrayBarcode && params.instrumentTrayBarcode.trim()
			? section({
					loinc: "46264-8",
					displayName: "Medical device identifier",
					title: "\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u0430\u043b\u044c\u043d\u044b\u0439 \u043b\u043e\u0442\u043e\u043a",
					paragraph: `\u0428\u0442\u0440\u0438\u0445\u043a\u043e\u0434: ${params.instrumentTrayBarcode}`,
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
