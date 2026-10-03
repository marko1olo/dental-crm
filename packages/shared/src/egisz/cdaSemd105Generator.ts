/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ SEMD 105 (ПРОТОКОЛ КОНСУЛЬТАЦИИ АМБУЛАТОРНЫЙ) CDA R2 GENERATOR
 * Compliant with Minzdrav Orders 911n, 804n, Form 043/u and HL7 CDA R2
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { EGISZ_OIDS } from "../cda/oids.js";
import { escapeXml } from "../cda/c14n.js";
import { generateClinicalDocumentHeader } from "../cda/header.js";
import { normalizeSurfaces } from "../cda/generator101.js";
import type {
	DoctorCdaInfo,
	ClinicCdaInfo,
	PatientCdaInfo,
	DentalStatusItem,
	DiagnosisItem,
	ServiceRenderedItem,
	LegalAuthenticatorCdaInfo,
} from "../cda/types.js";
import { GOST_CRYPTO_OIDS } from "./egiszCryptoConstants.js";

export interface CdaSemd105Params {
	docKind?: "105" | undefined;
	documentId: string;
	documentVersion?: number | undefined;
	documentTime?: Date | string | undefined;
	visitDate: Date | string;
	encounterId?: string | undefined;
	patient: PatientCdaInfo;
	doctor: DoctorCdaInfo;
	clinic: ClinicCdaInfo;
	legalAuthenticator?: LegalAuthenticatorCdaInfo | undefined;
	complaints?: string | undefined;
	anamnesis?: string | undefined;
	anamnesisVitae?: string | undefined;
	objectiveStatus?: string | undefined;
	dentalStatus?: DentalStatusItem[] | undefined;
	diagnoses: DiagnosisItem[];
	services?: ServiceRenderedItem[] | undefined;
	treatmentDescription?: string | undefined;
	recommendations?: string[] | string | undefined;
	complications?: string | undefined;
	comorbidities?: string | undefined;
	instrumentTrayBarcode?: string | undefined;
}

/**
 * Генерирует стандартный СЭМД 105: Протокол консультации амбулаторный (HL7 CDA R2)
 */
export function generateSemd105Xml(params: CdaSemd105Params): string {
	const docTime = params.documentTime
		? typeof params.documentTime === "string"
			? new Date(params.documentTime)
			: params.documentTime
		: undefined;
	const visDate = typeof params.visitDate === "string" ? new Date(params.visitDate) : params.visitDate;

	const headerXml = generateClinicalDocumentHeader({
		docKind: "105",
		docTypeNsiCode: "105",
		docTitle: "Протокол консультации (амбулаторный)",
		templateOids: [
			GOST_CRYPTO_OIDS.SEMD_TEMPLATE_105_CONSULTATION,
			EGISZ_OIDS.SEMD_TEMPLATE_BASE_CONSULTATION,
		],
		documentId: params.documentId,
		documentVersion: params.documentVersion ?? 1,
		documentTime: docTime,
		visitDate: visDate,
		encounterId: params.encounterId,
		patient: params.patient,
		doctor: params.doctor,
		clinic: params.clinic,
		legalAuthenticator: params.legalAuthenticator,
	});

	// Диагнозы
	const diagnoses = params.diagnoses && params.diagnoses.length > 0
		? params.diagnoses
		: [{ icd10Code: "Z01.2", diagnosisText: "Консультативный осмотр", isPrimary: true }];

	const diagItems = diagnoses.map((d) => {
		const prefix = d.isPrimary ? "[Основной] " : "[Сопутствующий] ";
		const toothStr = d.tooth ? ` (зуб ${escapeXml(String(d.tooth))})` : "";
		return `<item>${prefix}${escapeXml(d.icd10Code)} — ${escapeXml(d.diagnosisText)}${toothStr}</item>`;
	}).join("\n\t\t\t\t\t\t\t");

	const diagEntries = diagnoses.map((d) => {
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

	const diagSection = `
			<!-- Секция 1: Клинический диагноз -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_DIAGNOSIS_SECTION}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Диагнозы"/>
					<title>Клинический диагноз</title>
					<text>
						<list>
							${diagItems}
						</list>
					</text>
${diagEntries}
				</section>
			</component>`;

	// Анамнез
	const anamnesisFull = [
		params.complaints ? `Жалобы: ${params.complaints}` : "",
		params.anamnesis ? `Анамнез заболевания: ${params.anamnesis}` : "",
		params.anamnesisVitae ? `Анамнез жизни: ${params.anamnesisVitae}` : "",
	].filter(Boolean).join("\n\n") || "Жалобы и анамнез без особенностей.";

	const anamnesisSection = `
			<!-- Секция 2: Анамнез и жалобы -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_ANAMNESIS}" codeSystem="${EGISZ_OIDS.LOINC}" displayName="Анамнез"/>
					<title>Анамнез и жалобы</title>
					<text><paragraph>${escapeXml(anamnesisFull)}</paragraph></text>
				</section>
			</component>`;

	// Стоматологический статус
	let statusSection = "";
	if (params.dentalStatus && params.dentalStatus.length > 0) {
		const rows = params.dentalStatus.map((it) => {
			const surfs = normalizeSurfaces(it.surfaces);
			return `<tr><td>${escapeXml(String(it.tooth))}</td><td>${escapeXml(surfs.join(", ") || "-")}</td><td>${escapeXml(it.conditionName || it.condition)}</td><td>${it.description ? escapeXml(it.description) : "-"}</td></tr>`;
		}).join("");

		statusSection = `
			<!-- Секция 3: Стоматологический статус -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_DENTAL_STATUS}" codeSystem="${EGISZ_OIDS.LOINC}" displayName="Стоматологический статус"/>
					<title>Стоматологический статус</title>
					<text><table border="1"><thead><tr><th>Зуб</th><th>Поверхности</th><th>Статус</th><th>Описание</th></tr></thead><tbody>${rows}</tbody></table></text>
				</section>
			</component>`;
	}

	// Лечение и оказанные услуги
	let treatmentSection = "";
	const hasTreatment = Boolean(params.treatmentDescription || (params.services && params.services.length > 0));
	if (hasTreatment) {
		const treatmentDescParagraph = params.treatmentDescription
			? `<paragraph>${escapeXml(params.treatmentDescription)}</paragraph>`
			: "";
		const serviceRows = params.services && params.services.length > 0
			? params.services.map((s) => `<tr><td>${escapeXml(s.code)}</td><td>${escapeXml(s.name)}</td><td>${s.tooth ? escapeXml(String(s.tooth)) : "-"}</td><td>${s.quantity || 1}</td></tr>`).join("")
			: "";
		const serviceTable = serviceRows
			? `<table border="1"><thead><tr><th>Код 804н</th><th>Услуга</th><th>Зуб</th><th>Кол-во</th></tr></thead><tbody>${serviceRows}</tbody></table>`
			: "";

		treatmentSection = `
			<!-- Секция 4: Оказанные услуги и лечение -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_SERVICES_RENDERED}" codeSystem="${EGISZ_OIDS.LOINC}" displayName="Оказанные услуги и лечение"/>
					<title>Проведенное лечение и медицинские вмешательства</title>
					<text>
						${treatmentDescParagraph}
						${serviceTable}
					</text>
				</section>
			</component>`;
	}

	// Рекомендации
	let recsText = "";
	if (Array.isArray(params.recommendations)) {
		recsText = params.recommendations.filter(Boolean).map((r, i) => `<paragraph>${i + 1}. ${escapeXml(r)}</paragraph>`).join("\n");
	} else if (params.recommendations) {
		recsText = `<paragraph>${escapeXml(String(params.recommendations).trim())}</paragraph>`;
	}

	const recsSection = recsText ? `
			<!-- Секция 5: Рекомендации -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_RECOMMENDATIONS}" codeSystem="${EGISZ_OIDS.LOINC}" displayName="Рекомендации"/>
					<title>Рекомендации и назначения</title>
					<text>${recsText}</text>
				</section>
			</component>` : "";

	return `${headerXml}

	<component>
		<structuredBody>
			${diagSection}
			${anamnesisSection}
			${statusSection}
			${treatmentSection}
			${recsSection}
		</structuredBody>
	</component>
</ClinicalDocument>`;
}
