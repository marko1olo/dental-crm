/**
 * Shared CDA XML helpers (escape, dates, resolved clock fields).
 * Strict compliance with HL7 CDA R2 (POCD_MT000040.xsd) and EGISZ REMD.
 * Organization sequence: <id>* -> <name>* -> <telecom>* -> <addr>*
 */

import type { EgiszCdaParams } from "./schema.js";

/** Escape free-text for CDA XML text/attribute nodes (DEFECT #49). */
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
	SEMD_TEMPLATE_CONSULTATION: "1.2.643.5.1.13.13.11.1527",
	GENDER: "1.2.643.5.1.13.13.11.1040",
	MEDICAL_CARE_TYPE: "1.2.643.5.1.13.13.11.1461",
	MEDICAL_POSITIONS: "1.2.643.5.1.13.13.11.1002",
	ICD10: "1.2.643.5.1.13.13.11.1005",
	DENTAL_TOOTH: "1.2.643.5.1.13.13.11.1466",
	CONFIDENTIALITY: "2.16.840.1.113883.5.25",
	LOINC: "2.16.840.1.113883.6.1",
} as const;

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
	};
}

/**
 * Contact helpers: emit real XML text node if available, else nullFlavor NI.
 * We never invent an address/phone — if the DB has none, emit nullFlavor.
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
 * Phone strings become `tel:…`, email strings become `mailto:…`.
 * If none of the inputs resolve to a real value, emit a single nullFlavor.
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
	return addrXml(ctx.params.patientAddress);
}

/** Patient <telecom>: phone + email from patients table. */
export function patientTelecomXml(ctx: CdaContext): string {
	return telecomXml(ctx.params.patientPhone, ctx.params.patientEmail);
}

/** Doctor <telecom>: phone + email from users table (no doctor address column). */
export function doctorTelecomXml(ctx: CdaContext): string {
	return telecomXml(ctx.params.doctorPhone, ctx.params.doctorEmail);
}

/** Clinic <addr>: clinics.address preferred, else organizations.legalAddress. */
export function clinicAddrXml(ctx: CdaContext): string {
	return addrXml(ctx.params.clinicAddress || ctx.params.clinicLegalAddress);
}

/** Clinic <telecom>: clinics.phone + organizations.email. */
export function clinicTelecomXml(ctx: CdaContext): string {
	return telecomXml(ctx.params.clinicPhone, ctx.params.clinicEmail);
}

/** Flat MO organization ids: real OID extension, OGRN, INN or nullFlavor NI. */
export function orgIdXml(ctx: CdaContext): string {
	const ids: string[] = [];
	if (ctx.clinicOidEscaped) {
		ids.push(`<id root="${DEFAULT_MO_ROOT}" extension="${ctx.clinicOidEscaped}"/>`);
	} else {
		ids.push(`<id nullFlavor="NI"/>`);
	}

	const ogrn = ctx.params.clinicOgrn ? String(ctx.params.clinicOgrn).trim() : "";
	if (ogrn) {
		const root = ogrn.length === 15 ? EGISZ_OIDS.OGRN_IP : EGISZ_OIDS.OGRN_LEGAL;
		ids.push(`<id root="${root}" extension="${escapeXml(ogrn)}"/>`);
	}

	const inn = ctx.params.clinicInn ? String(ctx.params.clinicInn).trim() : "";
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
	const name = escapeXml(ctx.params.clinicName);
	return `<representedOrganization>
				${orgIdXml(ctx)}
				<name>${name}</name>
				${clinicTelecomXml(ctx)}
				${clinicAddrXml(ctx)}
			</representedOrganization>`;
}

/** Flat scopingOrganization shell (same fields, strict sequence). */
export function flatScopingOrganization(ctx: CdaContext): string {
	const name = escapeXml(ctx.params.clinicName);
	return `<scopingOrganization>
				${orgIdXml(ctx)}
				<name>${name}</name>
				${clinicTelecomXml(ctx)}
				${clinicAddrXml(ctx)}
			</scopingOrganization>`;
}

/** Doctor SNILS id or nullFlavor NI. */
export function doctorIdXml(ctx: CdaContext): string {
	const snils = ctx.params.doctorSnils
		? String(ctx.params.doctorSnils).trim()
		: "";
	return snils
		? `<id root="${EGISZ_OIDS.SNILS}" extension="${escapeXml(snils)}"/>`
		: `<id nullFlavor="NI"/>`;
}

/** Specialty code: NSI 1.2.643.5.1.13.13.11.1002 or NI + displayName. */
export function doctorCodeXml(ctx: CdaContext): string {
	const code = ctx.params.doctorPositionCode ? String(ctx.params.doctorPositionCode).trim() : "";
	const pos = ctx.params.doctorPosition ? String(ctx.params.doctorPosition).trim() : "Врач-стоматолог";
	if (code) {
		return `<code code="${escapeXml(code)}" codeSystem="${EGISZ_OIDS.MEDICAL_POSITIONS}" codeSystemName="Должности медицинских и фармацевтических работников" displayName="${escapeXml(pos)}"/>`;
	}
	return pos
		? `<code nullFlavor="NI" displayName="${escapeXml(pos)}"/>`
		: `<code nullFlavor="NI"/>`;
}

/** Doctor PN name block. */
export function doctorNameXml(ctx: CdaContext): string {
	const n = ctx.params.doctorName;
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
