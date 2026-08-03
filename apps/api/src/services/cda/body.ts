/**
 * CDA R2 structuredBody — Form 043/u sections (flat OBS/ACT/SPLY entries).
 * No recursive participant / organization trees under body entries.
 */

import type { CdaContext } from "./util.js";
import { escapeXml } from "./util.js";

function sectionObservation(opts: {
	docIdRoot: string;
	documentId: string;
	secKey: string;
	entryKey: string;
	loinc: string;
	title: string;
	text: string;
	visitTime: string;
}): string {
	const {
		docIdRoot,
		documentId,
		secKey,
		entryKey,
		loinc,
		title,
		text,
		visitTime,
	} = opts;
	const id = escapeXml(documentId);
	const t = escapeXml(text);
	const titleEsc = title;
	return `
			<component>
				<section>
					<id root="${docIdRoot}" extension="${id}-sec-${secKey}"/>
					<code code="${loinc}" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="${titleEsc}"/>
					<title>${titleEsc}</title>
					<text>
						<paragraph>${t}</paragraph>
					</text>
					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<id root="${docIdRoot}" extension="${id}-${entryKey}"/>
							<code code="${loinc}" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="${titleEsc}"/>
							<statusCode code="completed"/>
							<effectiveTime value="${visitTime}"/>
							<value xsi:type="ST">${t}</value>
						</observation>
					</entry>
				</section>
			</component>`;
}

export function generateCdaBody(ctx: CdaContext): string {
	const { params, visitTime, docIdRoot } = ctx;
	const docId = params.documentId;
	const idEsc = escapeXml(docId);

	const toothRaw =
		params.diagnosisTooth && String(params.diagnosisTooth).trim()
			? String(params.diagnosisTooth).trim()
			: null;
	const toothNarrative = toothRaw
		? ` \u00b7 \u0437\u0443\u0431 ${escapeXml(toothRaw)}`
		: "";
	const toothTarget = toothRaw
		? `
							<targetSiteCode code="${escapeXml(toothRaw)}" codeSystem="1.2.643.5.1.13.13.11.1466" codeSystemName="\u0417\u0443\u0431\u044b" displayName="\u0417\u0443\u0431 ${escapeXml(toothRaw)}"/>`
		: "";

	const dxText = escapeXml(params.diagnosisText);
	const icd = escapeXml(params.icd10Code);

	const anamnesis =
		params.anamnesis && params.anamnesis.trim()
			? params.anamnesis
			: "\u0411\u0435\u0437 \u043e\u0441\u043e\u0431\u0435\u043d\u043d\u043e\u0441\u0442\u0435\u0439";
	const objective =
		params.objectiveStatus && params.objectiveStatus.trim()
			? params.objectiveStatus
			: "\u0411\u0435\u0437 \u043e\u0441\u043e\u0431\u0435\u043d\u043d\u043e\u0441\u0442\u0435\u0439";
	const treatment =
		params.treatmentDescription && params.treatmentDescription.trim()
			? params.treatmentDescription
			: "\u041e\u0441\u043c\u043e\u0442\u0440 \u0438 \u043a\u043e\u043d\u0441\u0443\u043b\u044c\u0442\u0430\u0446\u0438\u044f";
	const complications =
		params.complications && params.complications.trim()
			? params.complications
			: "\u041d\u0435 \u043e\u0442\u043c\u0435\u0447\u0435\u043d\u044b";
	const comorbidities =
		params.comorbidities && params.comorbidities.trim()
			? params.comorbidities
			: "\u041d\u0435 \u043e\u0442\u043c\u0435\u0447\u0435\u043d\u044b";

	const treatmentEsc = escapeXml(treatment);

	const trayRaw =
		params.instrumentTrayBarcode && params.instrumentTrayBarcode.trim()
			? params.instrumentTrayBarcode.trim()
			: null;
	const traySection = trayRaw
		? `
			<component>
				<section>
					<id root="${docIdRoot}" extension="${idEsc}-sec-tray"/>
					<code code="69764-9" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u0430\u043b\u044c\u043d\u044b\u0439 \u043b\u043e\u0442\u043e\u043a"/>
					<title>\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u0430\u043b\u044c\u043d\u044b\u0439 \u043b\u043e\u0442\u043e\u043a</title>
					<text>
						<paragraph>\u0428\u0442\u0440\u0438\u0445\u043a\u043e\u0434: ${escapeXml(trayRaw)}</paragraph>
					</text>
					<entry>
						<supply classCode="SPLY" moodCode="EVN">
							<id root="${docIdRoot}" extension="${idEsc}-tray"/>
							<code code="69764-9" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u0430\u043b\u044c\u043d\u044b\u0439 \u043b\u043e\u0442\u043e\u043a"/>
							<text>${escapeXml(trayRaw)}</text>
							<statusCode code="completed"/>
							<effectiveTime value="${visitTime}"/>
						</supply>
					</entry>
				</section>
			</component>`
		: "";

	return `
	<component>
		<structuredBody>
			<component>
				<section>
					<id root="${docIdRoot}" extension="${idEsc}-sec-dx"/>
					<code code="29308-4" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="\u0414\u0438\u0430\u0433\u043d\u043e\u0437"/>
					<title>\u0414\u0438\u0430\u0433\u043d\u043e\u0437</title>
					<text>
						<paragraph>${dxText} (\u041c\u041a\u0411-10: ${icd})${toothNarrative}</paragraph>
					</text>
					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<id root="${docIdRoot}" extension="${idEsc}-dx"/>
							<code code="29308-4" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="\u0414\u0438\u0430\u0433\u043d\u043e\u0437"/>
							<statusCode code="completed"/>
							<effectiveTime value="${visitTime}"/>
							<value xsi:type="CD" code="${icd}" codeSystem="1.2.643.5.1.13.13.11.1005" codeSystemName="\u041c\u041a\u0411-10" displayName="${dxText}"/>${toothTarget}
						</observation>
					</entry>
				</section>
			</component>
			${sectionObservation({
				docIdRoot,
				documentId: docId,
				secKey: "anamnesis",
				entryKey: "anamnesis",
				loinc: "10164-2",
				title: "\u0410\u043d\u0430\u043c\u043d\u0435\u0437",
				text: anamnesis,
				visitTime,
			})}
			${sectionObservation({
				docIdRoot,
				documentId: docId,
				secKey: "objective",
				entryKey: "objective",
				loinc: "29545-1",
				title: "\u041e\u0431\u044a\u0435\u043a\u0442\u0438\u0432\u043d\u044b\u0439 \u0441\u0442\u0430\u0442\u0443\u0441",
				text: objective,
				visitTime,
			})}
			<component>
				<section>
					<id root="${docIdRoot}" extension="${idEsc}-sec-treatment"/>
					<code code="18776-5" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="\u041f\u0440\u043e\u0432\u0435\u0434\u0435\u043d\u043d\u043e\u0435 \u043b\u0435\u0447\u0435\u043d\u0438\u0435"/>
					<title>\u041f\u0440\u043e\u0432\u0435\u0434\u0435\u043d\u043d\u043e\u0435 \u043b\u0435\u0447\u0435\u043d\u0438\u0435</title>
					<text>
						<paragraph>${treatmentEsc}</paragraph>
					</text>
					<entry>
						<act classCode="ACT" moodCode="EVN">
							<id root="${docIdRoot}" extension="${idEsc}-treatment"/>
							<code code="18776-5" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="\u041f\u0440\u043e\u0432\u0435\u0434\u0435\u043d\u043d\u043e\u0435 \u043b\u0435\u0447\u0435\u043d\u0438\u0435"/>
							<text>${treatmentEsc}</text>
							<statusCode code="completed"/>
							<effectiveTime value="${visitTime}"/>
						</act>
					</entry>
				</section>
			</component>
			${sectionObservation({
				docIdRoot,
				documentId: docId,
				secKey: "complications",
				entryKey: "complications",
				loinc: "55109-3",
				title: "\u041e\u0441\u043b\u043e\u0436\u043d\u0435\u043d\u0438\u044f",
				text: complications,
				visitTime,
			})}
			${sectionObservation({
				docIdRoot,
				documentId: docId,
				secKey: "comorbidities",
				entryKey: "comorbidities",
				loinc: "75326-9",
				title: "\u0421\u043e\u043f\u0443\u0442\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u0435 \u0437\u0430\u0431\u043e\u043b\u0435\u0432\u0430\u043d\u0438\u044f",
				text: comorbidities,
				visitTime,
			})}
			${traySection}
		</structuredBody>
	</component>
</ClinicalDocument>`;
}
