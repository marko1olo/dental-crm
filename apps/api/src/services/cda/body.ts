/**
 * CDA R2 structuredBody — Dental SEMD 108 sections.
 * Implements all 5 mandatory sections:
 * 1. Complaints and Anamnesis (LOINC 10164-2)
 * 2. Dental Status / Odontogram with 5-surface FDI ISO 3950 table & observations (LOINC 29545-1)
 * 3. ICD-10 Diagnosis with targetSiteCode (LOINC 29548-5 / 29308-4)
 * 4. Order 804n Services Rendered with procedure entries (LOINC 47519-4)
 * 5. Recommendations and Regimen (LOINC 18776-5)
 * Plus optional clinical sections (Complications 55109-3, Comorbidities 11348-0, Tray 46264-8).
 */

import type { CdaContext } from "./util.js";
import {
	EGISZ_OIDS,
	escapeXml,
	normalizeDentalCondition,
	normalizeToothSurfaces,
} from "./util.js";

function sectionBlock(opts: {
	loinc: string;
	displayName: string;
	title: string;
	textXml: string;
	entriesXml?: string;
}): string {
	const { loinc, displayName, title, textXml, entriesXml } = opts;
	return `
			<component>
				<section>
					<code code="${loinc}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="${displayName}"/>
					<title>${title}</title>
					<text>
						${textXml}
					</text>${entriesXml ? `\n${entriesXml}` : ""}
				</section>
			</component>`;
}

export function generateCdaBody(ctx: CdaContext): string {
	const { params } = ctx;

	// ==========================================
	// 1. SECTION 1: Anamnesis and Complaints (LOINC 10164-2)
	// ==========================================
	const anamnesisText = params.anamnesis?.trim() ? params.anamnesis.trim() : "";
	const anamnesisSection = anamnesisText
		? sectionBlock({
				loinc: EGISZ_OIDS.LOINC_ANAMNESIS,
				displayName: "Анамнез и жалобы",
				title: "Анамнез и жалобы",
				textXml: `<paragraph>${escapeXml(anamnesisText)}</paragraph>`,
			})
		: "";

	// ==========================================
	// 2. SECTION 2: Dental Status / Odontogram (LOINC 29545-1)
	// ==========================================
	const dentalItems = params.dentalStatus || params.odontogram || [];
	const objectiveText = params.objectiveStatus?.trim() ? params.objectiveStatus.trim() : "";

	let dentalStatusSection = "";
	if (dentalItems.length > 0) {
		const tableRows: string[] = [];
		const entries: string[] = [];

		for (const item of dentalItems) {
			const toothStr = String(item.tooth).trim();
			const surfaces = normalizeToothSurfaces(item.surfaces);
			const cond = normalizeDentalCondition(
				item.condition,
				item.conditionCode,
				item.conditionName,
			);

			const surfSymbols = surfaces.length > 0
				? surfaces.map((s) => s.symbol).join(", ")
				: "-";
			const surfDisplay = surfaces.length > 0
				? `${surfSymbols} (${surfaces.map((s) => s.displayName).join(", ")})`
				: "-";
			const statusDisplay = `${cond.symbol} (${cond.displayName})`;
			const descDisplay = item.description ? escapeXml(item.description.trim()) : "-";

			tableRows.push(`
								<tr>
									<td>${escapeXml(toothStr)}</td>
									<td>${escapeXml(surfDisplay)}</td>
									<td>${escapeXml(statusDisplay)}</td>
									<td>${descDisplay}</td>
								</tr>`);

			// Structured observation entry for tooth
			let qualifiersXml = "";
			const s0 = surfaces[0];
			const s1 = surfaces[1];
			if (surfaces.length === 1 && s0) {
				qualifiersXml = `
								<qualifier>
									<name code="${s0.code}" displayName="${escapeXml(s0.displayName)}"/>
								</qualifier>`;
			} else if (surfaces.length === 2 && s0 && s1) {
				qualifiersXml = `
								<qualifier>
									<name code="${s0.code}" displayName="${escapeXml(s0.displayName)}"/>
									<value code="${s1.code}" displayName="${escapeXml(s1.displayName)}"/>
								</qualifier>`;
			} else if (surfaces.length > 2 && s0 && s1) {
				qualifiersXml = `
								<qualifier>
									<name code="${s0.code}" displayName="${escapeXml(s0.displayName)}"/>
									<value code="${s1.code}" displayName="${escapeXml(s1.displayName)}"/>
								</qualifier>` + surfaces.slice(2).map((s) => `
								<qualifier>
									<name code="${s.code}" displayName="${escapeXml(s.displayName)}"/>
								</qualifier>`).join("");
			}

			entries.push(`					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="DENT_STATUS" codeSystem="${EGISZ_OIDS.SEMD_TEMPLATE_DENTAL_108}" displayName="Стоматологический статус зуба"/>
							<statusCode code="completed"/>
							<targetSiteCode code="${escapeXml(toothStr)}" codeSystem="${EGISZ_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(toothStr)}">${qualifiersXml}
							</targetSiteCode>
							<value xsi:type="CD" code="${escapeXml(cond.code)}" displayName="${escapeXml(cond.displayName)}"/>
						</observation>
					</entry>`);
		}

		const tableXml = `<table border="1" width="100%">
							<thead>
								<tr>
									<th>Зуб (FDI)</th>
									<th>Поверхности (V, L, O, M, D)</th>
									<th>Статус</th>
									<th>Описание</th>
								</tr>
							</thead>
							<tbody>${tableRows.join("")}
							</tbody>
						</table>`;

		const textXml = objectiveText
			? `${tableXml}\n\t\t\t\t\t\t<paragraph>${escapeXml(objectiveText)}</paragraph>`
			: tableXml;

		dentalStatusSection = sectionBlock({
			loinc: EGISZ_OIDS.LOINC_DENTAL_STATUS,
			displayName: "Physical findings / Dental Status",
			title: "Стоматологический статус (Зубная формула)",
			textXml,
			entriesXml: entries.join("\n"),
		});
	} else if (objectiveText) {
		dentalStatusSection = sectionBlock({
			loinc: EGISZ_OIDS.LOINC_DENTAL_STATUS,
			displayName: "Physical findings",
			title: "Объективный статус",
			textXml: `<paragraph>${escapeXml(objectiveText)}</paragraph>`,
		});
	}

	// ==========================================
	// 3. SECTION 3: ICD-10 Diagnosis (LOINC 29548-5 / 29308-4)
	// ==========================================
	const diagnosisText = params.diagnosisText?.trim() ? params.diagnosisText.trim() : "";
	const icd10Code = params.icd10Code?.trim() ? params.icd10Code.trim() : "";
	const diagnosisTooth = params.diagnosisTooth?.trim() ? params.diagnosisTooth.trim() : "";

	const icd10Escaped = icd10Code ? escapeXml(icd10Code) : "";
	const diagnosisIcd10Attr = icd10Escaped ? ` code="${icd10Escaped}"` : "";
	const diagnosisIcd10Suffix = icd10Escaped ? ` (МКБ-10: ${icd10Escaped})` : "";

	const diagnosisSection =
		diagnosisText || icd10Code || diagnosisTooth
			? `
			<!-- Диагноз -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_DIAGNOSIS_SECTION}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Диагнозы"/>
					<title>Диагноз</title>
					<text>
						<paragraph>${escapeXml(diagnosisText)}${diagnosisIcd10Suffix}${diagnosisTooth ? ` · зуб ${escapeXml(diagnosisTooth)}` : ""}</paragraph>
					</text>${
						icd10Code || diagnosisTooth
							? `
					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="${EGISZ_OIDS.LOINC_DIAGNOSIS_OBSERVATION}" codeSystem="${EGISZ_OIDS.LOINC}" displayName="Диагноз"/>
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

	// ==========================================
	// 4. SECTION 4: Services Rendered under Order 804n (LOINC 47519-4)
	// ==========================================
	const servicesList = params.services || params.servicesRendered || [];
	const treatmentDesc = params.treatmentDescription?.trim() ? params.treatmentDescription.trim() : "";

	let servicesSection = "";
	if (servicesList.length > 0) {
		const listItems: string[] = [];
		const procedureEntries: string[] = [];

		for (const svc of servicesList) {
			const qty = svc.quantity && svc.quantity > 0 ? svc.quantity : 1;
			const toothSuffix = svc.tooth ? ` (зуб ${escapeXml(String(svc.tooth))})` : "";
			const toothTag = svc.tooth
				? `\n							<targetSiteCode code="${escapeXml(String(svc.tooth))}" codeSystem="${EGISZ_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(String(svc.tooth))}"/>`
				: "";

			listItems.push(`\n							<item>${escapeXml(svc.code)} ${escapeXml(svc.name)} - ${qty} усл.${toothSuffix}</item>`);

			procedureEntries.push(`					<entry>
						<procedure classCode="PROC" moodCode="EVN">
							<code code="${escapeXml(svc.code)}" codeSystem="${EGISZ_OIDS.ORDER_804N}" codeSystemName="Номенклатура медицинских услуг" displayName="${escapeXml(svc.name)}"/>
							<statusCode code="completed"/>${toothTag}
						</procedure>
					</entry>`);
		}

		const listXml = `<list>${listItems.join("")}
						</list>`;
		const textXml = treatmentDesc
			? `${listXml}\n\t\t\t\t\t\t<paragraph>${escapeXml(treatmentDesc)}</paragraph>`
			: listXml;

		servicesSection = sectionBlock({
			loinc: EGISZ_OIDS.LOINC_SERVICES_RENDERED,
			displayName: "Медицинские услуги",
			title: "Оказанные медицинские услуги (Номенклатура 804н)",
			textXml,
			entriesXml: procedureEntries.join("\n"),
		});
	} else if (treatmentDesc) {
		servicesSection = sectionBlock({
			loinc: EGISZ_OIDS.LOINC_SERVICES_RENDERED,
			displayName: "Медицинские услуги",
			title: "Проведенное лечение",
			textXml: `<paragraph>${escapeXml(treatmentDesc)}</paragraph>`,
		});
	}

	// ==========================================
	// 5. SECTION 5: Recommendations and Regimen (LOINC 18776-5)
	// ==========================================
	let recommendationsSection = "";
	if (params.recommendations) {
		let recsTextXml = "";
		if (Array.isArray(params.recommendations)) {
			const paragraphs = params.recommendations
				.map((r, i) => r.trim())
				.filter(Boolean)
				.map((r, i) => `<paragraph>${i + 1}. ${escapeXml(r)}</paragraph>`);
			if (paragraphs.length > 0) {
				recsTextXml = paragraphs.join("\n\t\t\t\t\t\t");
			}
		} else if (typeof params.recommendations === "string" && params.recommendations.trim()) {
			recsTextXml = `<paragraph>${escapeXml(params.recommendations.trim())}</paragraph>`;
		}

		if (recsTextXml) {
			recommendationsSection = sectionBlock({
				loinc: EGISZ_OIDS.LOINC_RECOMMENDATIONS,
				displayName: "Рекомендации",
				title: "Рекомендации",
				textXml: recsTextXml,
			});
		}
	}

	// Optional extra clinical sections
	const complications = params.complications?.trim()
		? sectionBlock({
				loinc: EGISZ_OIDS.LOINC_COMPLICATIONS,
				displayName: "Complications",
				title: "Осложнения",
				textXml: `<paragraph>${escapeXml(params.complications.trim())}</paragraph>`,
			})
		: "";

	const comorbidities = params.comorbidities?.trim()
		? sectionBlock({
				loinc: EGISZ_OIDS.LOINC_COMORBIDITIES,
				displayName: "History of Past illness",
				title: "Сопутствующие заболевания",
				textXml: `<paragraph>${escapeXml(params.comorbidities.trim())}</paragraph>`,
			})
		: "";

	const traySection = params.instrumentTrayBarcode?.trim()
		? sectionBlock({
				loinc: EGISZ_OIDS.LOINC_MEDICAL_DEVICE,
				displayName: "Medical device identifier",
				title: "Инструментальный лоток",
				textXml: `<paragraph>Штрихкод: ${escapeXml(params.instrumentTrayBarcode.trim())}</paragraph>`,
			})
		: "";

	return `
	<component>
		<structuredBody>
			${diagnosisSection}
			${anamnesisSection}
			${dentalStatusSection}
			${servicesSection}
			${recommendationsSection}
			${complications}
			${comorbidities}
			${traySection}
		</structuredBody>
	</component>
</ClinicalDocument>`;
}
