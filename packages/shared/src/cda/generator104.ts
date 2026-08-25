/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEMD 104: ЭПИКРИЗ СТОМАТОЛОГИЧЕСКИЙ В СТАЦИОНАРЕ / АМБУЛАТОРНЫЙ (CDA R2)
 * Compliant with Minzdrav Order No. 911n and SEMD 104 Specification.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { EGISZ_OIDS } from "./oids.js";
import { escapeXml, formatRuDate } from "./c14n.js";
import { generateClinicalDocumentHeader } from "./header.js";
import { normalizeSurfaces } from "./generator101.js";
import type { CdaSemd104Params, DentalStatusItem } from "./types.js";

export function generateSemd104Xml(params: CdaSemd104Params): string {
	const headerXml = generateClinicalDocumentHeader({
		docKind: "104",
		docTypeNsiCode: "104",
		docTitle: "Стоматологический эпикриз (амбулаторный / стационарный)",
		templateOids: [
			EGISZ_OIDS.SEMD_TEMPLATE_104,
			EGISZ_OIDS.SEMD_TEMPLATE_BASE_CONSULTATION,
		],
		documentId: params.documentId,
		documentVersion: params.documentVersion ?? 1,
		documentTime: params.documentTime,
		visitDate: params.visitDate,
		encounterId: params.encounterId,
		documentSetId: params.documentSetId,
		replacesDocumentId: params.replacesDocumentId,
		patient: params.patient,
		doctor: params.doctor,
		clinic: params.clinic,
		legalAuthenticator: params.legalAuthenticator,
	});

	// ─── 1. Диагнозы при поступлении и выписке (LOINC 29548-5) ────────────────
	const admissionList = params.admissionDiagnoses || [];
	const dischargeList = params.dischargeDiagnoses;

	const admissionItems = admissionList.map((d) => {
		const toothInfo = d.tooth ? ` (зуб ${escapeXml(String(d.tooth))})` : "";
		return `<item>[При поступлении] ${escapeXml(d.icd10Code)} — ${escapeXml(d.diagnosisText)}${toothInfo}</item>`;
	}).join("\n\t\t\t\t\t\t\t");

	const dischargeItems = dischargeList.map((d) => {
		const toothInfo = d.tooth ? ` (зуб ${escapeXml(String(d.tooth))})` : "";
		const prefix = d.isPrimary ? "[Заключительный клинический] " : "[Сопутствующий] ";
		return `<item>${prefix}${escapeXml(d.icd10Code)} — ${escapeXml(d.diagnosisText)}${toothInfo}</item>`;
	}).join("\n\t\t\t\t\t\t\t");

	const diagnosesEntries = dischargeList.map((d) => {
		const toothTag = d.tooth
			? `\n							<targetSiteCode code="${escapeXml(String(d.tooth))}" codeSystem="${EGISZ_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(String(d.tooth))}"/>`
			: "";
		return `					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="${EGISZ_OIDS.LOINC_DIAGNOSIS_OBSERVATION}" codeSystem="${EGISZ_OIDS.LOINC}" displayName="Диагноз выписной"/>
							<statusCode code="completed"/>
							<value xsi:type="CD" code="${escapeXml(d.icd10Code)}" codeSystem="${EGISZ_OIDS.ICD10}" codeSystemName="МКБ-10" displayName="${escapeXml(d.diagnosisText)}"/>${toothTag}
						</observation>
					</entry>`;
	}).join("\n");

	const diagnosesSection = `
			<!-- Секция 1: Клинический диагноз (при поступлении и выписной) -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_DIAGNOSIS_SECTION}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Диагнозы"/>
					<title>Клинический диагноз при поступлении и выписке</title>
					<text>
						<list>
							${admissionItems ? `${admissionItems}\n\t\t\t\t\t\t\t` : ""}${dischargeItems}
						</list>
					</text>
${diagnosesEntries}
				</section>
			</component>`;

	// ─── 2. Анамнез и клиническое течение (LOINC 10164-2) ─────────────────────
	const anamnesisText = params.anamnesis?.trim() || "";
	const clinicalCourse = params.clinicalCourse?.trim() || "";
	const admissionDateStr = params.admissionDate ? `Дата начала лечения: ${formatRuDate(params.admissionDate)}.` : "";
	const dischargeDateStr = params.dischargeDate ? `Дата завершения этапа: ${formatRuDate(params.dischargeDate)}.` : "";

	const anamnesisContent = [
		admissionDateStr || dischargeDateStr ? `${admissionDateStr} ${dischargeDateStr}`.trim() : "",
		anamnesisText ? `Анамнез заболевания: ${anamnesisText}` : "",
		clinicalCourse ? `Клиническое течение и динамика: ${clinicalCourse}` : "",
	].filter(Boolean).join("\n\n") || "Клиническое течение заболевания без патологических особенностей.";

	const anamnesisSection = `
			<!-- Секция 2: Анамнез и динамика клинической картины -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_ANAMNESIS}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Анамнез"/>
					<title>Анамнез и клиническое течение</title>
					<text>
						<paragraph>${escapeXml(anamnesisContent)}</paragraph>
					</text>
				</section>
			</component>`;

	// ─── 3. Стоматологический статус (LOINC 29545-1) ──────────────────────────
	const finalItems: DentalStatusItem[] = params.finalDentalStatus || params.initialDentalStatus || [];
	let dentalStatusSection = "";
	if (finalItems.length > 0) {
		const tableRows = finalItems.map((it) => {
			const surfs = normalizeSurfaces(it.surfaces);
			const surfsStr = surfs.length > 0 ? surfs.join(", ") : "-";
			return `
								<tr>
									<td>${escapeXml(String(it.tooth))}</td>
									<td>${escapeXml(surfsStr)}</td>
									<td>${escapeXml(it.conditionName || it.condition)}</td>
									<td>${it.description ? escapeXml(it.description) : "-"}</td>
								</tr>`;
		}).join("");

		dentalStatusSection = `
			<!-- Секция 3: Стоматологический статус после проведенного лечения -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_DENTAL_STATUS}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Стоматологический статус"/>
					<title>Стоматологический статус (Итоговая зубная формула)</title>
					<text>
						<table border="1" width="100%">
							<thead>
								<tr>
									<th>Зуб</th>
									<th>Поверхности</th>
									<th>Итоговый статус</th>
									<th>Примечание</th>
								</tr>
							</thead>
							<tbody>${tableRows}
							</tbody>
						</table>
					</text>
				</section>
			</component>`;
	}

	// ─── 4. Объем выполненного лечения (LOINC 47519-4) ────────────────────────
	const services = params.servicesRendered || [];
	const surgeryProto = params.surgeryProtocol?.trim() || "";
	const anesthesiaProto = params.anesthesiaProtocol?.trim() || "";

	const serviceItemsXml = services.map((s) => {
		const qty = s.quantity && s.quantity > 0 ? s.quantity : 1;
		const toothInfo = s.tooth ? ` (зуб ${escapeXml(String(s.tooth))})` : "";
		return `<item>${escapeXml(s.code)} ${escapeXml(s.name)} — ${qty} усл.${toothInfo}</item>`;
	}).join("\n\t\t\t\t\t\t\t");

	const serviceEntriesXml = services.map((s) => {
		const toothTag = s.tooth
			? `\n							<targetSiteCode code="${escapeXml(String(s.tooth))}" codeSystem="${EGISZ_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(String(s.tooth))}"/>`
			: "";
		return `					<entry>
						<procedure classCode="PROC" moodCode="EVN">
							<code code="${escapeXml(s.code)}" codeSystem="${EGISZ_OIDS.ORDER_804N}" codeSystemName="Номенклатура медицинских услуг 804н" displayName="${escapeXml(s.name)}"/>
							<statusCode code="completed"/>${toothTag}
						</procedure>
					</entry>`;
	}).join("\n");

	const surgeryText = surgeryProto ? `<paragraph><strong>Хирургический протокол:</strong> ${escapeXml(surgeryProto)}</paragraph>` : "";
	const anesthesiaText = anesthesiaProto ? `<paragraph><strong>Анестезиологическое пособие:</strong> ${escapeXml(anesthesiaProto)}</paragraph>` : "";

	const treatmentSection = `
			<!-- Секция 4: Проведенное стоматологическое лечение (Номенклатура 804н) -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_SERVICES_RENDERED}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Проведенное лечение"/>
					<title>Объем проведенного комплексного лечения</title>
					<text>
						${surgeryText}
						${anesthesiaText}
						<list>
							${serviceItemsXml}
						</list>
					</text>
${serviceEntriesXml}
				</section>
			</component>`;

	// ─── 5. Лучевая диагностика (LOINC 30954-2) ───────────────────────────────
	const radiologySection = params.radiologyStudiesSummary?.trim()
		? `
			<!-- Секция 5: Данные рентгенологических исследований -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_RADIOLOGY_STUDIES}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Данные лучевой диагностики"/>
					<title>Результаты лучевой диагностики (КЛКТ, ОПТГ, РВГ)</title>
					<text>
						<paragraph>${escapeXml(params.radiologyStudiesSummary.trim())}</paragraph>
					</text>
				</section>
			</component>`
		: "";

	// ─── 6. Эпикриз, исход и рекомендации (LOINC 42344-2 / 18776-5) ───────────
	const outcomeMap: Record<string, string> = {
		recovery: "Выздоровление",
		improvement: "Улучшение клинического состояния",
		unchanged: "Без динамики",
	};
	const outcomeName = params.outcomeName || (params.outcomeCode ? outcomeMap[params.outcomeCode] : "Улучшение");
	const nextVisitStr = params.nextFollowupDate ? ` Назначена контрольная явка: ${formatRuDate(params.nextFollowupDate)}.` : "";

	let recsText = "";
	if (Array.isArray(params.recommendations)) {
		recsText = params.recommendations
			.filter(Boolean)
			.map((r, i) => `<paragraph>${i + 1}. ${escapeXml(r)}</paragraph>`)
			.join("\n\t\t\t\t\t\t");
	} else if (typeof params.recommendations === "string" && params.recommendations.trim()) {
		recsText = `<paragraph>${escapeXml(params.recommendations.trim())}</paragraph>`;
	}

	const epicrisisSection = `
			<!-- Секция 6: Выписной эпикриз и план диспансерного наблюдения -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_EPICRISIS}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Выписной эпикриз"/>
					<title>Стоматологический эпикриз и исход лечения</title>
					<text>
						<paragraph><strong>Исход лечения:</strong> ${escapeXml(outcomeName)}.${escapeXml(nextVisitStr)}</paragraph>
						<paragraph><strong>Заключение:</strong> ${escapeXml(params.epicrisisText)}</paragraph>
						<paragraph><strong>Рекомендации при выписке:</strong></paragraph>
						${recsText}
					</text>
				</section>
			</component>`;

	return `${headerXml}

	<component>
		<structuredBody>
			${diagnosesSection}
			${anamnesisSection}
			${dentalStatusSection}
			${treatmentSection}
			${radiologySection}
			${epicrisisSection}
		</structuredBody>
	</component>
</ClinicalDocument>`;
}
