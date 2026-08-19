/**
 * Shared CDA XML helpers (escape, dates, resolved clock fields).
 * Strict compliance with HL7 CDA R2 (POCD_MT000040.xsd) and EGISZ REMD.
 * Organization sequence: <id>* -> <name>* -> <telecom>* -> <addr>*
 */

import type { EgiszCdaParams } from "./schema.js";

/** Escape free-text for CDA XML text/attribute nodes. */
export function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&\u0061mp;")
		.replace(/</g, "&\u006ct;")
		.replace(/>/g, "&\u0067t;")
		.replace(/"/g, "&\u0071uot;")
		.replace(/'/g, "&\u0061pos;");
}

/**
 * Format Date to HL7 CDA R2 TS format:
 * - Date only (birthTime): YYYYMMDD
 * - Date with Time & Timezone offset (effectiveTime): YYYYMMDDHHMMSS+ZZZZ
 */
export function formatHl7DateTime(d: Date, includeTime = true): string {
	const pad = (n: number) => n.toString().padStart(2, "0");
	const yyyy = d.getFullYear().toString();
	const MM = pad(d.getMonth() + 1);
	const dd = pad(d.getDate());
	if (!includeTime) return `${yyyy}${MM}${dd}`;

	const HH = pad(d.getHours());
	const mm = pad(d.getMinutes());
	const ss = pad(d.getSeconds());

	const offsetMinutes = -d.getTimezoneOffset();
	const sign = offsetMinutes >= 0 ? "+" : "-";
	const absOffset = Math.abs(offsetMinutes);
	const offsetHours = pad(Math.floor(absOffset / 60));
	const offsetMins = pad(absOffset % 60);
	const tzStr = `${sign}${offsetHours}${offsetMins}`;

	return `${yyyy}${MM}${dd}${HH}${mm}${ss}${tzStr}`;
}

/** Default MO registry root when clinicOid is absent. */
export const DEFAULT_MO_ROOT = "1.2.643.5.1.13.13.12.2";

export const EGISZ_OIDS = {
	FRMO_MO_ROOT: "1.2.643.5.1.13.13.12.2",
	SNILS: "1.2.643.100.3",
	OGRN_LEGAL: "1.2.643.100.1",
	OGRN_IP: "1.2.643.100.5",
	INN: "1.2.643.100.4",
	SEMD_TEMPLATE_DENTAL_108: "1.2.643.5.1.13.13.11.108",
	SEMD_TEMPLATE_CONSULTATION: "1.2.643.5.1.13.13.11.1527",
	DOC_TYPE_NSI: "1.2.643.5.1.13.13.11.1522",
	GENDER: "1.2.643.5.1.13.13.11.1040",
	MEDICAL_CARE_TYPE: "1.2.643.5.1.13.13.11.1461",
	MEDICAL_POSITIONS: "1.2.643.5.1.13.13.11.1002",
	ICD10: "1.2.643.5.1.13.13.11.1005",
	ORDER_804N: "1.2.643.5.1.13.13.11.1070",
	DENTAL_TOOTH: "1.2.643.5.1.13.13.11.1466",
	CONFIDENTIALITY: "2.16.840.1.113883.5.25",
	LOINC: "2.16.840.1.113883.6.1",
	// Mandatory Sections LOINC codes
	LOINC_ANAMNESIS: "10164-2",
	LOINC_DENTAL_STATUS: "29545-1",
	LOINC_DIAGNOSIS_SECTION: "29548-5",
	LOINC_DIAGNOSIS_OBSERVATION: "29308-4",
	LOINC_SERVICES_RENDERED: "47519-4",
	LOINC_RECOMMENDATIONS: "18776-5",
	LOINC_COMPLICATIONS: "55109-3",
	LOINC_COMORBIDITIES: "11348-0",
	LOINC_MEDICAL_DEVICE: "46264-8",
} as const;

/**
 * Valid FDI ISO 3950 Tooth Numbers.
 * Adult quadrants: 11..18, 21..28, 31..38, 41..48.
 * Deciduous (child) quadrants: 51..55, 61..65, 71..75, 81..85.
 */
export const VALID_ADULT_TOOTH_NUMBERS = [
	11, 12, 13, 14, 15, 16, 17, 18,
	21, 22, 23, 24, 25, 26, 27, 28,
	31, 32, 33, 34, 35, 36, 37, 38,
	41, 42, 43, 44, 45, 46, 47, 48,
] as const;

export const VALID_CHILD_TOOTH_NUMBERS = [
	51, 52, 53, 54, 55,
	61, 62, 63, 64, 65,
	71, 72, 73, 74, 75,
	81, 82, 83, 84, 85,
] as const;

export const ALL_VALID_FDI_TOOTH_NUMBERS = [
	...VALID_ADULT_TOOTH_NUMBERS,
	...VALID_CHILD_TOOTH_NUMBERS,
] as const;

export function isValidFdiToothNumber(tooth: unknown): boolean {
	if (tooth === undefined || tooth === null) return false;
	const num = typeof tooth === "number" ? tooth : Number.parseInt(String(tooth).trim(), 10);
	if (Number.isNaN(num)) return false;
	return ALL_VALID_FDI_TOOTH_NUMBERS.includes(num as (typeof ALL_VALID_FDI_TOOTH_NUMBERS)[number]);
}

export function isAdultToothNumber(tooth: unknown): boolean {
	const num = typeof tooth === "number" ? tooth : Number.parseInt(String(tooth).trim(), 10);
	return VALID_ADULT_TOOTH_NUMBERS.includes(num as (typeof VALID_ADULT_TOOTH_NUMBERS)[number]);
}

export function isChildToothNumber(tooth: unknown): boolean {
	const num = typeof tooth === "number" ? tooth : Number.parseInt(String(tooth).trim(), 10);
	return VALID_CHILD_TOOTH_NUMBERS.includes(num as (typeof VALID_CHILD_TOOTH_NUMBERS)[number]);
}

export interface ToothSurfaceInfo {
	code: string;
	symbol: string;
	displayName: string;
}

/**
 * Normalizes FDI 5 anatomical surfaces:
 * V/B - Vestibular / Buccal
 * L/P - Lingual / Palatal
 * O/I - Occlusal / Incisal
 * M - Mesial
 * D - Distal
 * R - Root (optional)
 */
export function normalizeToothSurfaces(
	surfaces?: string[] | string | null,
): ToothSurfaceInfo[] {
	if (!surfaces) return [];
	const list: string[] = Array.isArray(surfaces)
		? surfaces
		: String(surfaces)
				.split(/[,;\s/]+/)
				.map((s) => s.trim())
				.filter(Boolean);

	const result: ToothSurfaceInfo[] = [];
	const seen = new Set<string>();

	for (const raw of list) {
		const s = raw.trim().toUpperCase();
		if (!s) continue;

		if (s === "V" || s === "B" || s === "VESTIBULAR" || s === "BUCCAL" || s === "Щ" || s === "В" || s === "ЩЕЧНАЯ" || s === "ВЕСТИБУЛЯРНАЯ") {
			if (!seen.has("V")) {
				seen.add("V");
				result.push({ code: "SURF_V", symbol: "V", displayName: "Вестибулярная (щечная)" });
			}
		} else if (s === "L" || s === "P" || s === "LINGUAL" || s === "PALATAL" || s === "Я" || s === "Н" || s === "ЯЗЫЧНАЯ" || s === "НЕБНАЯ") {
			if (!seen.has("L")) {
				seen.add("L");
				result.push({ code: "SURF_L", symbol: "L", displayName: "Язычная (небная)" });
			}
		} else if (s === "O" || s === "I" || s === "OCCLUSAL" || s === "INCISAL" || s === "О" || s === "Р" || s === "ОККЛЮЗИОННАЯ" || s === "ЖЕВАТЕЛЬНАЯ" || s === "РЕЖУЩИЙ КРАЙ") {
			if (!seen.has("O")) {
				seen.add("O");
				result.push({ code: "SURF_O", symbol: "O", displayName: "Окклюзионная (режущий край)" });
			}
		} else if (s === "M" || s === "MESIAL" || s === "М" || s === "МЕДИАЛЬНАЯ") {
			if (!seen.has("M")) {
				seen.add("M");
				result.push({ code: "SURF_M", symbol: "M", displayName: "Медиальная" });
			}
		} else if (s === "D" || s === "DISTAL" || s === "Д" || s === "ДИСТАЛЬНАЯ") {
			if (!seen.has("D")) {
				seen.add("D");
				result.push({ code: "SURF_D", symbol: "D", displayName: "Дистальная" });
			}
		} else if (s === "R" || s === "ROOT" || s === "RADIX" || s === "К" || s === "КОРЕНЬ") {
			if (!seen.has("R")) {
				seen.add("R");
				result.push({ code: "SURF_ROOT", symbol: "R", displayName: "Корень" });
			}
		}
	}

	return result;
}

export interface DentalConditionInfo {
	code: string;
	displayName: string;
	symbol: string;
}

/**
 * Maps condition codes to standardized SEMD 108 condition descriptors.
 */
export function normalizeDentalCondition(
	condition: string,
	customCode?: string,
	customName?: string,
): DentalConditionInfo {
	if (customCode && customName) {
		return {
			code: customCode,
			displayName: customName,
			symbol: condition || customCode,
		};
	}

	const c = condition.trim().toUpperCase();
	if (c === "C" || c === "CARIES" || c === "CARIES_MEDIA" || c === "КАРИЕС" || c === "КАРИЕС СРЕДНИЙ") {
		return { code: "CARIES_MEDIA", displayName: "Кариес дентина (средний)", symbol: "C" };
	}
	if (c === "CARIES_SUPERFICIALIS" || c === "КАРИЕС ПОВЕРХНОСТНЫЙ") {
		return { code: "CARIES_SUPERFICIALIS", displayName: "Кариес эмали (поверхностный)", symbol: "Cs" };
	}
	if (c === "CARIES_PROFUNDA" || c === "КАРИЕС ГЛУБОКИЙ") {
		return { code: "CARIES_PROFUNDA", displayName: "Кариес глубокий", symbol: "Cp" };
	}
	if (c === "P" || c === "PULPITIS" || c === "ПУЛЬПИТ") {
		return { code: "PULPITIS", displayName: "Пульпит", symbol: "P" };
	}
	if (c === "PT" || c === "PERIODONTITIS" || c === "ПЕРИОДОНТИТ") {
		return { code: "PERIODONTITIS", displayName: "Периодонтит", symbol: "Pt" };
	}
	if (c === "PL" || c === "FILLING" || c === "ПЛОМБА") {
		return { code: "FILLING", displayName: "Пломба", symbol: "Pl" };
	}
	if (c === "K" || c === "CROWN" || c === "КОРОНКА") {
		return { code: "CROWN", displayName: "Искусственная коронка", symbol: "K" };
	}
	if (c === "A" || c === "R" || c === "ABSENT" || c === "EXTRACTED" || c === "ОТСУТСТВУЕТ" || c === "УДАЛЕН") {
		return { code: "ABSENT", displayName: "Отсутствует (удален)", symbol: "A" };
	}
	if (c === "IM" || c === "IMPLANT" || c === "ИМПЛАНТАТ" || c === "ИМПЛАНТ") {
		return { code: "IMPLANT", displayName: "Дентальный имплантат", symbol: "Im" };
	}
	if (c === "F" || c === "FRACTURE" || c === "ПЕРЕЛОМ") {
		return { code: "FRACTURE", displayName: "Перелом зуба", symbol: "F" };
	}
	if (c === "INTACT" || c === "HEALTHY" || c === "ЗДОРОВ" || c === "ИНТАКТНЫЙ") {
		return { code: "INTACT", displayName: "Здоровый (интактный)", symbol: "N" };
	}

	return {
		code: customCode || condition,
		displayName: customName || condition,
		symbol: condition,
	};
}

/** Resolved clocks and identity keys used by every CDA fragment. */
export interface CdaContext {
	params: EgiszCdaParams;
	effectiveTime: string;
	visitTime: string;
	birthTimeValue: string | null;
	genderCode: "1" | "2" | null;
	encounterExtension: string;
	setIdExtension: string;
	replacesId: string | null;
	docIdRoot: string;
	clinicOidEscaped: string | null;
	documentVersion: number;
	legalAuthTime: string;
}

export function buildCdaContext(params: EgiszCdaParams): CdaContext {
	const now = new Date();
	const documentClock =
		params.documentTime instanceof Date &&
		!Number.isNaN(params.documentTime.getTime())
			? params.documentTime
			: now;
	const effectiveTime = formatHl7DateTime(documentClock, true);
	const visitTime = formatHl7DateTime(params.visitDate, true);

	const birthDateRaw =
		params.patientBirthDate && String(params.patientBirthDate).trim()
			? new Date(params.patientBirthDate)
			: null;
	const birthTimeValue =
		birthDateRaw && !Number.isNaN(birthDateRaw.getTime())
			? formatHl7DateTime(birthDateRaw, false)
			: null;

	const genderCode: "1" | "2" | null =
		params.patientGender === "male"
			? "1"
			: params.patientGender === "female"
				? "2"
				: null;

	const encounterRaw =
		params.encounterId != null ? String(params.encounterId).trim() : "";
	const encounterExtension =
		encounterRaw.length > 0 ? encounterRaw : params.documentId;

	const setIdRaw =
		params.documentSetId != null ? String(params.documentSetId).trim() : "";
	const setIdExtension = setIdRaw.length > 0 ? setIdRaw : params.documentId;

	const replacesRaw =
		params.replacesDocumentId != null
			? String(params.replacesDocumentId).trim()
			: "";
	const replacesId = replacesRaw.length > 0 ? replacesRaw : null;

	const oidTrim =
		params.clinicOid && String(params.clinicOid).trim()
			? String(params.clinicOid).trim()
			: null;
	const docIdRoot = oidTrim ? escapeXml(oidTrim) : DEFAULT_MO_ROOT;
	const clinicOidEscaped = oidTrim ? escapeXml(oidTrim) : null;

	const documentVersion = Math.max(
		1,
		Math.floor(Number(params.documentVersion) || 1),
	);

	const legalAuthClock =
		params.legalAuthenticator?.time instanceof Date &&
		!Number.isNaN(params.legalAuthenticator.time.getTime())
			? params.legalAuthenticator.time
			: documentClock;
	const legalAuthTime = formatHl7DateTime(legalAuthClock, true);

	return {
		params,
		effectiveTime,
		visitTime,
		birthTimeValue,
		genderCode,
		encounterExtension,
		setIdExtension,
		replacesId,
		docIdRoot,
		clinicOidEscaped,
		documentVersion,
		legalAuthTime,
	};
}

/**
 * Contact helpers: emit real XML text node if available, else nullFlavor NI.
 */

/** Build a CDA R2 <addr> node from a real free-text address. */
function addrXml(address?: string | null): string {
	const trimmed = address ? String(address).trim() : "";
	return trimmed
		? `<addr><streetAddressLine>${escapeXml(trimmed)}</streetAddressLine></addr>`
		: `<addr nullFlavor="NI"/>`;
}

/**
 * Build one or more CDA R2 <telecom> nodes from real contact values.
 */
function telecomXml(...values: Array<string | null | undefined>): string {
	const parts: string[] = [];
	for (const raw of values) {
		const v = raw ? String(raw).trim() : "";
		if (!v) continue;
		if (/^tel:/i.test(v)) {
			parts.push(`<telecom value="${escapeXml(v)}"/>`);
		} else if (/^mailto:/i.test(v)) {
			parts.push(`<telecom value="${escapeXml(v)}"/>`);
		} else if (/@/.test(v)) {
			parts.push(`<telecom value="mailto:${escapeXml(v)}"/>`);
		} else if (/^\+?[\d\s\-()/.]+$/.test(v)) {
			parts.push(`<telecom value="tel:${escapeXml(v)}"/>`);
		} else {
			parts.push(`<telecom value="${escapeXml(v)}"/>`);
		}
	}
	return parts.length ? parts.join("\n") : `<telecom nullFlavor="NI"/>`;
}

/** Patient <addr>: chart residential/registration address, else nullFlavor. */
export function patientAddrXml(ctx: CdaContext): string {
	return addrXml(ctx.params?.patientAddress);
}

/** Patient <telecom>: phone + email from patients table. */
export function patientTelecomXml(ctx: CdaContext): string {
	return telecomXml(ctx.params?.patientPhone, ctx.params?.patientEmail);
}

/** Doctor <telecom>: phone + email from users table. */
export function doctorTelecomXml(ctx: CdaContext): string {
	return telecomXml(ctx.params?.doctorPhone, ctx.params?.doctorEmail);
}

/** Clinic <addr>: clinics.address preferred, else organizations.legalAddress. */
export function clinicAddrXml(ctx: CdaContext): string {
	return addrXml(ctx.params?.clinicAddress || ctx.params?.clinicLegalAddress);
}

/** Clinic <telecom>: clinics.phone + organizations.email. */
export function clinicTelecomXml(ctx: CdaContext): string {
	return telecomXml(ctx.params?.clinicPhone, ctx.params?.clinicEmail);
}

/** Flat MO organization ids: real OID extension, OGRN, INN or nullFlavor NI. */
export function orgIdXml(ctx: CdaContext): string {
	const ids: string[] = [];
	if (ctx.clinicOidEscaped) {
		ids.push(`<id root="${DEFAULT_MO_ROOT}" extension="${ctx.clinicOidEscaped}"/>`);
	} else {
		ids.push(`<id nullFlavor="NI"/>`);
	}

	const ogrn = ctx.params?.clinicOgrn ? String(ctx.params.clinicOgrn).trim() : "";
	if (ogrn) {
		const root = ogrn.length === 15 ? EGISZ_OIDS.OGRN_IP : EGISZ_OIDS.OGRN_LEGAL;
		ids.push(`<id root="${root}" extension="${escapeXml(ogrn)}"/>`);
	}

	const inn = ctx.params?.clinicInn ? String(ctx.params.clinicInn).trim() : "";
	if (inn) {
		ids.push(`<id root="${EGISZ_OIDS.INN}" extension="${escapeXml(inn)}"/>`);
	}

	return ids.join("\n\t\t\t\t");
}

/**
 * Flat representedOrganization shell conforming to POCD_MT000040.Organization
 * Strict sequence: id* -> name -> telecom* -> addr*
 */
export function flatRepresentedOrganization(ctx: CdaContext): string {
	const name = escapeXml(ctx.params?.clinicName || "");
	return `<representedOrganization>
				${orgIdXml(ctx)}
				<name>${name}</name>
				${clinicTelecomXml(ctx)}
				${clinicAddrXml(ctx)}
			</representedOrganization>`;
}

/** Flat scopingOrganization shell (same fields, strict sequence). */
export function flatScopingOrganization(ctx: CdaContext): string {
	const name = escapeXml(ctx.params?.clinicName || "");
	return `<scopingOrganization>
				${orgIdXml(ctx)}
				<name>${name}</name>
				${clinicTelecomXml(ctx)}
				${clinicAddrXml(ctx)}
			</scopingOrganization>`;
}

/** Doctor SNILS id or nullFlavor NI. */
export function doctorIdXml(ctx: CdaContext): string {
	const snils = ctx.params?.doctorSnils
		? String(ctx.params.doctorSnils).trim()
		: "";
	return snils
		? `<id root="${EGISZ_OIDS.SNILS}" extension="${escapeXml(snils)}"/>`
		: `<id nullFlavor="NI"/>`;
}

/** Specialty code: NSI 1.2.643.5.1.13.13.11.1002 or NI + displayName. */
export function doctorCodeXml(ctx: CdaContext): string {
	const code = ctx.params?.doctorPositionCode ? String(ctx.params.doctorPositionCode).trim() : "";
	const pos = ctx.params?.doctorPosition ? String(ctx.params.doctorPosition).trim() : "Врач-стоматолог";
	if (code) {
		return `<code code="${escapeXml(code)}" codeSystem="${EGISZ_OIDS.MEDICAL_POSITIONS}" codeSystemName="Должности медицинских и фармацевтических работников" displayName="${escapeXml(pos)}"/>`;
	}
	return pos
		? `<code nullFlavor="NI" displayName="${escapeXml(pos)}"/>`
		: `<code nullFlavor="NI"/>`;
}

/** Doctor PN name block. */
export function doctorNameXml(ctx: CdaContext): string {
	const n = ctx.params?.doctorName || { first: "", last: "" };
	const middle = n.middle
		? `\n\t\t\t\t\t<given>${escapeXml(n.middle)}</given>`
		: "";
	return `<name>
					<family>${escapeXml(n.last)}</family>
					<given>${escapeXml(n.first)}</given>${middle}
				</name>`;
}

/**
 * Assigned entity block reused by author-side roles (POCD_MT000040.AssignedEntity).
 * Strict sequence: id* -> code? -> addr* -> telecom* -> assignedPerson? -> representedOrganization?
 */
export function flatAssignedEntity(ctx: CdaContext): string {
	return `${doctorIdXml(ctx)}
			${doctorCodeXml(ctx)}
			${clinicAddrXml(ctx)}
			${doctorTelecomXml(ctx)}
			<assignedPerson>
				${doctorNameXml(ctx)}
			</assignedPerson>
			${flatRepresentedOrganization(ctx)}`;
}
