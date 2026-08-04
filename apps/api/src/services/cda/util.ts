/**
 * Shared CDA XML helpers (escape, dates, resolved clock fields).
 * Keep org shells flat — never nest asOrganizationPartOf / wholeOrganization.
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

export function formatDate(
	d: Date,
	format: "yyyyMMdd" | "yyyyMMddHHmmss",
): string {
	const pad = (n: number) => n.toString().padStart(2, "0");
	const yyyy = d.getFullYear().toString();
	const MM = pad(d.getMonth() + 1);
	const dd = pad(d.getDate());
	if (format === "yyyyMMdd") return `${yyyy}${MM}${dd}`;
	const HH = pad(d.getHours());
	const mm = pad(d.getMinutes());
	const ss = pad(d.getSeconds());
	return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
}

/** Default MO registry root when clinicOid is absent. */
export const DEFAULT_MO_ROOT = "1.2.643.5.1.13.13.12.2";

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
	const effectiveTime = formatDate(documentClock, "yyyyMMddHHmmss");
	const visitTime = formatDate(params.visitDate, "yyyyMMddHHmmss");

	const birthDateRaw =
		params.patientBirthDate && String(params.patientBirthDate).trim()
			? new Date(params.patientBirthDate)
			: null;
	const birthTimeValue =
		birthDateRaw && !Number.isNaN(birthDateRaw.getTime())
			? formatDate(birthDateRaw, "yyyyMMdd")
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
	const setIdExtension =
		setIdRaw.length > 0 ? setIdRaw : params.documentId;

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
export function addrXml(address?: string | null): string {
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
export function telecomXml(
	...values: Array<string | null | undefined>
): string {
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

/** Flat MO organization id: real OID extension or nullFlavor NI. */
export function orgIdXml(ctx: CdaContext): string {
	return ctx.clinicOidEscaped
		? `<id root="${DEFAULT_MO_ROOT}" extension="${ctx.clinicOidEscaped}"/>`
		: `<id nullFlavor="NI"/>`;
}

/** Flat representedOrganization shell (real clinic addr/telecom + name). No recursion. */
export function flatRepresentedOrganization(ctx: CdaContext): string {
	const name = escapeXml(ctx.params.clinicName);
	return `<representedOrganization>
				${clinicAddrXml(ctx)}
				${clinicTelecomXml(ctx)}
				<name>${name}</name>
			</representedOrganization>`;
}

/** Flat scopingOrganization shell (same fields, different tag). */
export function flatScopingOrganization(ctx: CdaContext): string {
	const name = escapeXml(ctx.params.clinicName);
	return `<scopingOrganization>
				${orgIdXml(ctx)}
				${clinicAddrXml(ctx)}
				${clinicTelecomXml(ctx)}
				<name>${name}</name>
			</scopingOrganization>`;
}

/** Doctor SNILS id or nullFlavor NI. */
export function doctorIdXml(ctx: CdaContext): string {
	const snils = ctx.params.doctorSnils
		? String(ctx.params.doctorSnils).trim()
		: "";
	return snils
		? `<id root="1.2.643.100.3" extension="${escapeXml(snils)}"/>`
		: `<id nullFlavor="NI"/>`;
}

/** Specialty code: NI + displayName when position known, else bare NI. */
export function doctorCodeXml(ctx: CdaContext): string {
	const pos = ctx.params.doctorPosition
		? ctx.params.doctorPosition.trim()
		: "";
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
 * Assigned entity block reused by author-side roles (flat org only).
 * The physician's own contact is telecom (phone/email); the org carries
 * the clinic addr/telecom.
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
