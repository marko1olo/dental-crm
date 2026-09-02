/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEMD 101: ПРОТОКОЛ КОНСУЛЬТАЦИИ ВРАЧА-СТОМАТОЛОГА (HL7 CDA R2)
 * Compliant with Minzdrav Order No. 911n and SEMD 101 Specification.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { EGISZ_OIDS } from "./oids.js";
import { escapeXml } from "./c14n.js";
import { generateClinicalDocumentHeader } from "./header.js";
import type { CdaSemd101Params, DentalStatusItem } from "./types.js";

/**
 * Normalizes tooth surfaces array or string into standardized codes
 */
export function normalizeSurfaces(surfaces?: string[] | string | null): string[] {
	if (!surfaces) return [];
	const rawList = Array.isArray(surfaces) ? surfaces : String(surfaces).split(/[,;\s/]+/);
	const normalized: string[] = [];
	const seen = new Set<string>();

	for (const raw of rawList) {
		const s = raw.trim().toUpperCase();
		if (!s) continue;
		if (["V", "B", "VESTIBULAR", "BUCCAL", "Щ", "В", "ЩЕЧНАЯ", "ВЕСТИБУЛЯРНАЯ"].includes(s)) {
			if (!seen.has("V")) { seen.add("V"); normalized.push("V"); }
		} else if (["L", "P", "LINGUAL", "PALATAL", "Я", "Н", "ЯЗЫЧНАЯ", "НЕБНАЯ"].includes(s)) {
			if (!seen.has("L")) { seen.add("L"); normalized.push("L"); }
		} else if (["O", "I", "OCCLUSAL", "INCISAL", "О", "Р", "ОККЛЮЗИОННАЯ", "ЖЕВАТЕЛЬНАЯ", "РЕЖУЩИЙ КРАЙ"].includes(s)) {
			if (!seen.has("O")) { seen.add("O"); normalized.push("O"); }
		} else if (["M", "MESIAL", "М", "МЕДИАЛЬНАЯ"].includes(s)) {
			if (!seen.has("M")) { seen.add("M"); normalized.push("M"); }
		} else if (["D", "DISTAL", "Д", "ДИСТАЛЬНАЯ"].includes(s)) {
			if (!seen.has("D")) { seen.add("D"); normalized.push("D"); }
		} else if (["R", "ROOT", "RADIX", "К", "КОРЕНЬ"].includes(s)) {
			if (!seen.has("R")) { seen.add("R"); normalized.push("R"); }
		}
	}
	return normalized;
}

export function generateSemd101Xml(params: CdaSemd101Params): string {
	const is103 = params.docKind === "103";
	const is108 = params.docKind === "108";
	const docTitle = is103
		? "Протокол стоматологического приёма (лечебно-диагностический)"
		: is108
			? "Протокол осмотра врача-стоматолога"
			: "Протокол консультации врача-стоматолога";
	const docTypeNsiCode = is103 ? "103" : is108 ? "108" : "101";
	const templateOids = is103
		? [
				EGISZ_OIDS.SEMD_TEMPLATE_103,
				EGISZ_OIDS.SEMD_TEMPLATE_DENTAL_108,
				EGISZ_OIDS.SEMD_TEMPLATE_BASE_CONSULTATION,
			]
		: [
				EGISZ_OIDS.SEMD_TEMPLATE_101,
				EGISZ_OIDS.SEMD_TEMPLATE_DENTAL_108,
				EGISZ_OIDS.SEMD_TEMPLATE_BASE_CONSULTATION,
			];

	const headerXml = generateClinicalDocumentHeader({
		docKind: params.docKind || "101",
		docTypeNsiCode,
		docTitle,
		templateOids,
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

	// ─── 1. Анамнез и жалобы (LOINC 10164-2) ──────────────────────────────────
	const complaintsText = params.complaints?.trim() || "";
	const anamnesisText = params.anamnesis?.trim() || "";
	const anamnesisVitaeText = params.anamnesisVitae?.trim() || "";

	const anamnesisFullText = [
		complaintsText ? `Жалобы: ${complaintsText}` : "",
		anamnesisText ? `Анамнез заболевания: ${anamnesisText}` : "",
		anamnesisVitaeText ? `Анамнез жизни: ${anamnesisVitaeText}` : "",
	].filter(Boolean).join("\n\n") || "Жалобы и анамнез без особенностей.";

	const anamnesisSection = `
			<!-- Секция 1: Анамнез и жалобы -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_ANAMNESIS}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Анамнез и жалобы"/>
					<title>Анамнез и жалобы</title>
					<text>
						<paragraph>${escapeXml(anamnesisFullText)}</paragraph>
					</text>
				</section>
			</component>`;

	// ─── 2. Стоматологический статус / Одонтограмма (LOINC 29545-1 / 74208-1) ──
	const dentalItems: DentalStatusItem[] = params.dentalStatus || [];
	const objectiveText = params.objectiveStatus?.trim() || "";

	let dentalStatusSection = "";
	if (dentalItems.length > 0) {
		const tableRows = dentalItems.map((item) => {
			const toothStr = String(item.tooth).trim();
			const surfs = normalizeSurfaces(item.surfaces);
			const surfsDisplay = surfs.length > 0 ? surfs.join(", ") : "-";
			const condName = item.conditionName || item.condition;
			const desc = item.description ? escapeXml(item.description) : "-";
			return `
								<tr>
									<td>${escapeXml(toothStr)}</td>
									<td>${escapeXml(surfsDisplay)}</td>
									<td>${escapeXml(condName)}</td>
									<td>${desc}</td>
								</tr>`;
		}).join("");

		const entries = dentalItems.map((item) => {
			const toothStr = String(item.tooth).trim();
			const surfs = normalizeSurfaces(item.surfaces);
			const condCode = item.conditionCode || item.condition;
			const condName = item.conditionName || item.condition;

			const qualifiersXml = surfs.map((s) => `
								<qualifier>
									<name code="SURF_${s}" displayName="Поверхность ${s}"/>
								</qualifier>`).join("");

			return `					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="DENT_STATUS" codeSystem="${EGISZ_OIDS.SEMD_TEMPLATE_101}" displayName="Стоматологический статус зуба"/>
							<statusCode code="completed"/>
							<targetSiteCode code="${escapeXml(toothStr)}" codeSystem="${EGISZ_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(toothStr)}">${qualifiersXml}
							</targetSiteCode>
							<value xsi:type="CD" code="${escapeXml(condCode)}" displayName="${escapeXml(condName)}"/>
						</observation>
					</entry>`;
		}).join("\n");

		const tableXml = `<table border="1" width="100%">
							<thead>
								<tr>
									<th>Зуб (FDI)</th>
									<th>Поверхности</th>
									<th>Статус</th>
									<th>Описание</th>
								</tr>
							</thead>
							<tbody>${tableRows}
							</tbody>
						</table>`;

		const fullDentalText = objectiveText
			? `${tableXml}\n\t\t\t\t\t\t<paragraph>${escapeXml(objectiveText)}</paragraph>`
			: tableXml;

		dentalStatusSection = `
			<!-- Секция 2: Стоматологический статус (Зубная формула) -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_DENTAL_STATUS}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Стоматологический статус"/>
					<title>Стоматологический статус (Зубная формула)</title>
					<text>
						${fullDentalText}
					</text>
${entries}
				</section>
			</component>`;
	} else if (objectiveText) {
		dentalStatusSection = `
			<!-- Секция 2: Объективный статус -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_DENTAL_STATUS}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Стоматологический статус"/>
					<title>Объективный статус</title>
					<text>
						<paragraph>${escapeXml(objectiveText)}</paragraph>
					</text>
				</section>
			</component>`;
	}

	// ─── 3. Диагноз по МКБ-10 (LOINC 29548-5 / 29308-4) ────────────────────────
	const diagnoses = params.diagnoses && params.diagnoses.length > 0
		? params.diagnoses
		: [{ icd10Code: "Z01.2", diagnosisText: "Стоматологическое обследование", isPrimary: true }];

	const diagnosisListItems = diagnoses.map((d) => {
		const prefix = d.isPrimary ? "[Основной] " : "[Сопутствующий] ";
		const toothInfo = d.tooth ? ` · зуб ${escapeXml(String(d.tooth))}` : "";
		return `<item>${prefix}${escapeXml(d.icd10Code)} — ${escapeXml(d.diagnosisText)}${toothInfo}</item>`;
	}).join("\n\t\t\t\t\t\t\t");

	const diagnosisEntries = diagnoses.map((d) => {
		const toothTag = d.tooth
			? `\n							<targetSiteCode code="${escapeXml(String(d.tooth))}" codeSystem="${EGISZ_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(String(d.tooth))}"/>`
			: "";
		return `					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="${EGISZ_OIDS.LOINC_DIAGNOSIS_OBSERVATION}" codeSystem="${EGISZ_OIDS.LOINC}" displayName="Диагноз"/>
							<statusCode code="completed"/>
							<value xsi:type="CD" code="${escapeXml(d.icd10Code)}" codeSystem="${EGISZ_OIDS.ICD10}" codeSystemName="МКБ-10" displayName="${escapeXml(d.diagnosisText)}"/>${toothTag}
						</observation>
					</entry>`;
	}).join("\n");

	const diagnosisSection = `
			<!-- Секция 3: Клинический диагноз по МКБ-10 -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_DIAGNOSIS_SECTION}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Диагнозы"/>
					<title>Клинический диагноз</title>
					<text>
						<list>
							${diagnosisListItems}
						</list>
					</text>
${diagnosisEntries}
				</section>
			</component>`;

	// ─── 4. Оказанные услуги по Номенклатуре 804н (LOINC 47519-4) ──────────────
	const servicesList = params.services || [];
	const treatmentDesc = params.treatmentDescription?.trim() || "";

	let servicesSection = "";
	if (servicesList.length > 0) {
		const itemsXml = servicesList.map((svc) => {
			const qty = svc.quantity && svc.quantity > 0 ? svc.quantity : 1;
			const toothInfo = svc.tooth ? ` (зуб ${escapeXml(String(svc.tooth))})` : "";
			return `<item>${escapeXml(svc.code)} ${escapeXml(svc.name)} — ${qty} усл.${toothInfo}</item>`;
		}).join("\n\t\t\t\t\t\t\t");

		const entriesXml = servicesList.map((svc) => {
			const toothTag = svc.tooth
				? `\n							<targetSiteCode code="${escapeXml(String(svc.tooth))}" codeSystem="${EGISZ_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(String(svc.tooth))}"/>`
				: "";
			return `					<entry>
						<procedure classCode="PROC" moodCode="EVN">
							<code code="${escapeXml(svc.code)}" codeSystem="${EGISZ_OIDS.ORDER_804N}" codeSystemName="Номенклатура медицинских услуг 804н" displayName="${escapeXml(svc.name)}"/>
							<statusCode code="completed"/>${toothTag}
						</procedure>
					</entry>`;
		}).join("\n");

		const textContent = treatmentDesc
			? `<list>\n\t\t\t\t\t\t\t${itemsXml}\n\t\t\t\t\t\t</list>\n\t\t\t\t\t\t<paragraph>${escapeXml(treatmentDesc)}</paragraph>`
			: `<list>\n\t\t\t\t\t\t\t${itemsXml}\n\t\t\t\t\t\t</list>`;

		servicesSection = `
			<!-- Секция 4: Оказанные медицинские услуги (Номенклатура 804н) -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_SERVICES_RENDERED}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Медицинские услуги"/>
					<title>Оказанные медицинские услуги (Номенклатура 804н)</title>
					<text>
						${textContent}
					</text>
${entriesXml}
				</section>
			</component>`;
	} else if (treatmentDesc) {
		servicesSection = `
			<!-- Секция 4: Описание проведенного лечения -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_SERVICES_RENDERED}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Медицинские услуги"/>
					<title>Проведенное лечение</title>
					<text>
						<paragraph>${escapeXml(treatmentDesc)}</paragraph>
					</text>
				</section>
			</component>`;
	}

	// ─── 5. Рекомендации и назначения (LOINC 18776-5) ──────────────────────────
	let recommendationsSection = "";
	if (params.recommendations) {
		let recsText = "";
		if (Array.isArray(params.recommendations)) {
			recsText = params.recommendations
				.filter(Boolean)
				.map((r, i) => `<paragraph>${i + 1}. ${escapeXml(r)}</paragraph>`)
				.join("\n\t\t\t\t\t\t");
		} else if (typeof params.recommendations === "string" && params.recommendations.trim()) {
			recsText = `<paragraph>${escapeXml(params.recommendations.trim())}</paragraph>`;
		}

		if (recsText) {
			recommendationsSection = `
			<!-- Секция 5: Рекомендации и назначения -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_RECOMMENDATIONS}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Рекомендации"/>
					<title>Рекомендации и назначения</title>
					<text>
						${recsText}
					</text>
				</section>
			</component>`;
		}
	}

	// ─── Дополнительные опциональные секции ─────────────────────────────────────
	const complicationsSection = params.complications?.trim()
		? `
			<!-- Осложнения -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_COMPLICATIONS}" codeSystem="${EGISZ_OIDS.LOINC}" displayName="Осложнения"/>
					<title>Осложнения</title>
					<text><paragraph>${escapeXml(params.complications.trim())}</paragraph></text>
				</section>
			</component>`
		: "";

	const comorbiditiesSection = params.comorbidities?.trim()
		? `
			<!-- Сопутствующие заболевания -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_COMORBIDITIES}" codeSystem="${EGISZ_OIDS.LOINC}" displayName="Сопутствующие заболевания"/>
					<title>Сопутствующие заболевания</title>
					<text><paragraph>${escapeXml(params.comorbidities.trim())}</paragraph></text>
				</section>
			</component>`
		: "";

	const traySection = params.instrumentTrayBarcode?.trim()
		? `
			<!-- Стерилизационный лоток ЦСО -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_MEDICAL_DEVICE}" codeSystem="${EGISZ_OIDS.LOINC}" displayName="Инструментальный лоток"/>
					<title>Инструментальный лоток</title>
					<text><paragraph>Штрихкод лотка: ${escapeXml(params.instrumentTrayBarcode.trim())}</paragraph></text>
				</section>
			</component>`
		: "";

	return `${headerXml}

	<component>
		<structuredBody>
			${diagnosisSection}
			${anamnesisSection}
			${dentalStatusSection}
			${servicesSection}
			${recommendationsSection}
			${complicationsSection}
			${comorbiditiesSection}
			${traySection}
		</structuredBody>
	</component>
</ClinicalDocument>`;
}
