export interface EgiszCdaParams {
	patientId: string;
	patientName: { first: string; last: string; middle?: string };
	patientSnils: string;
	patientBirthDate: string | null;
	patientGender: "male" | "female" | "other" | null;
	clinicOid?: string;
	clinicName: string;
	doctorName: { first: string; last: string; middle?: string };
	doctorSnils?: string;
	/** DEFECT #58: specialty label → assignedAuthor/code@displayName */
	doctorPosition?: string;
	icd10Code: string;
	diagnosisText: string;
	/**
	 * DEFECT #74: ISO 3950 tooth number from visit_diaries.diagnosis_tooth.
	 * Form 043/у and diary_hash carry the tooth; CDA diagnosis observation
	 * previously dropped it — REMD export lost which tooth was treated.
	 */
	diagnosisTooth?: string | null;
	anamnesis?: string;
	/** Status localis / objective exam (043 O-block → visits.objectiveStatus). */
	objectiveStatus?: string;
	/** 043 complications — clinical events during/after visit. */
	complications?: string;
	/** 043 comorbidities / concomitant diseases. */
	comorbidities?: string;
	/**
	 * DEFECT #57: 043 instrument tray barcode (sterilization link).
	 * Printed on Form 043/у and part of diary_hash; was never exported to CDA.
	 */
	instrumentTrayBarcode?: string;
	treatmentDescription?: string;
	visitDate: Date;
	documentId: string;
	/**
	 * DEFECT #87: ambulatory encounter id for componentOf/encompassingEncounter.
	 * Prefer visit.id (or appointment.id). Falls back to documentId only when
	 * the caller has no separate encounter UUID — must not silently equal the
	 * ClinicalDocument/id when a real visit id is available (REMD join key).
	 */
	encounterId?: string;
	/**
	 * DEFECT #88: stable ClinicalDocument/setId across diary revise versions.
	 * HL7 CDA R2: setId identifies the document SET; id is unique per version;
	 * versionNumber counts revisions. Prefer visit.id (or diary set key).
	 * When omitted, setId falls back to documentId (legacy single-version export).
	 */
	documentSetId?: string;
	/**
	 * DEFECT #61: CDA versionNumber must track 043 diary.version after revise.
	 * Default 1 when diary absent (EMK-only export).
	 */
	documentVersion?: number;
	/**
	 * DEFECT #90: prior ClinicalDocument/id replaced by this version (RPLC).
	 * HL7 CDA R2 relatedDocument typeCode="RPLC" points at the document this
	 * revision supersedes. Prefer "{visitId}-v{N-1}" (DEFECT #89 scheme).
	 * When omitted/blank, relatedDocument is not emitted (v1 / EMK-only).
	 */
	replacesDocumentId?: string;

	/**
	 * DEFECT #72: ClinicalDocument + author effectiveTime.
	 * Prefer diary lockedAt (sign time). Falls back to generation now.
	 */
	documentTime?: Date;
}


/** Escape free-text for CDA XML text/attribute nodes (DEFECT #49). */
function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
function formatDate(d: Date, format: "yyyyMMdd" | "yyyyMMddHHmmss"): string {
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

export function generateDentalCdaXml(params: EgiszCdaParams): string {
	const now = new Date();
	/*
	 * DEFECT #72: document/author time must not silently become "download moment".
	 * БЫЛО: always formatDate(now) — re-export weeks after sign rewrote CDA
	 * effectiveTime and author/time to wall clock of the export request.
	 * Forensic/REMD audit then disagreed with visit_diaries.locked_at and
	 * Form 043/у stamp. СТАЛО: prefer params.documentTime (route: lockedAt).
	 */
	const documentClock =
		params.documentTime instanceof Date &&
		!Number.isNaN(params.documentTime.getTime())
			? params.documentTime
			: now;
	const effectiveTime = formatDate(documentClock, "yyyyMMddHHmmss");
	/* DEFECT #55: visitTime must appear in documentationOf/serviceEvent below.
	 * БЫЛО: formatted and discarded — CDA had only generation effectiveTime. */
	/*
	 * DEFECT #65: encounter must carry slot clock time, not date-only.
	 * БЫЛО: formatDate(..., "yyyyMMdd") — documentationOf/serviceEvent lost
	 * appointments.startsAt hours/minutes (always midnight-equivalent day stamp).
	 * REMD/audit could not distinguish morning vs evening slot on the same day.
	 * СТАЛО: yyyyMMddHHmmss from params.visitDate (already appointment.startsAt).
	 */
	const visitTime = formatDate(params.visitDate, "yyyyMMddHHmmss");
	/*
	 * DEFECT #80: missing patient DOB must not be faked as 1900-01-01.
	 * БЫЛО: birthTime = "19000101" when patientBirthDate absent/invalid.
	 * That writes a false date of birth into EGISZ/REMD CDA — worse than
	 * null (age-based clinical rules, identity matching, audit).
	 * СТАЛО: real yyyyMMdd when parseable; else birthTime nullFlavor="UNK".
	 */
	const birthDateRaw =
		params.patientBirthDate && String(params.patientBirthDate).trim()
			? new Date(params.patientBirthDate)
			: null;
	const birthTimeValue =
		birthDateRaw && !Number.isNaN(birthDateRaw.getTime())
			? formatDate(birthDateRaw, "yyyyMMdd")
			: null;

	/*
	 * DEFECT #81: unknown patient gender must not invent code "0".
	 * БЫЛО: ternary fell through to "0" for any non-male/female value.
	 * NSI 1.2.643.5.1.13.13.11.1040 uses 1=М, 2=Ж, 3=неопределённый —
	 * "0" is not a valid code. Route already 422s (DEFECT #68); generator
	 * must still not emit a fake code for direct callers.
	 * СТАЛО: 1/2 when known; else administrativeGenderCode nullFlavor="UNK".
	 */
	const genderCode =
		params.patientGender === "male"
			? "1"
			: params.patientGender === "female"
				? "2"
				: null;

	/*
	 * DEFECT #87: encompassingEncounter extension must be the visit/encounter id.
	 * БЫЛО (#86): always params.documentId — ClinicalDocument/id and
	 * componentOf/encompassingEncounter/id shared one extension, so REMD
	 * could not join the SEMD to visits.id / appointments.id as a separate key.
	 * СТАЛО: prefer trimmed encounterId; fall back to documentId only when
	 * the caller has no separate encounter UUID (legacy/EMK-only export).
	 */
	const encounterExtension = (() => {
		const raw =
			params.encounterId != null ? String(params.encounterId).trim() : "";
		return raw.length > 0 ? raw : params.documentId;
	})();

	/*
	 * DEFECT #88: setId must identify the document SET, not each version.
	 * БЫЛО: setId.extension === documentId (same as ClinicalDocument/id).
	 * After diary revise, versionNumber bumps but id+setId both changed with
	 * documentId — REMD/HL7 cannot link version N to version 1 as one set.
	 * СТАЛО: prefer documentSetId (route: visit.id); fall back to documentId
	 * for legacy single-shot exports. ClinicalDocument/id stays documentId
	 * (unique per export/version when route later versions it).
	 */
	const setIdExtension = (() => {
		const raw =
			params.documentSetId != null ? String(params.documentSetId).trim() : "";
		return raw.length > 0 ? raw : params.documentId;
	})();

	/*
	 * DEFECT #90: relatedDocument typeCode="RPLC" for revised versions.
	 * БЫЛО: versionNumber + setId/id existed (#61/#88/#89) but CDA never
	 * declared which prior ClinicalDocument/id this revision replaces.
	 * REMD/HL7 RPLC chain was broken — auditors saw v2 without a pointer
	 * to v1. СТАЛО: when replacesDocumentId is non-empty, emit
	 * relatedDocument/parentDocument/id with same clinicOid root scheme.
	 */
	const replacesId = (() => {
		const raw =
			params.replacesDocumentId != null
				? String(params.replacesDocumentId).trim()
				: "";
		return raw.length > 0 ? raw : null;
	})();
	const docIdRoot =
		params.clinicOid && String(params.clinicOid).trim()
			? escapeXml(String(params.clinicOid).trim())
			: "1.2.643.5.1.13.13.12.2";
	const relatedDocumentXml = replacesId
		? `
	<!-- DEFECT #90: this version replaces prior ClinicalDocument/id (RPLC) -->
	<relatedDocument typeCode="RPLC">
		<parentDocument>
			<id root="${docIdRoot}" extension="${escapeXml(replacesId)}"/>
			<setId root="${docIdRoot}" extension="${escapeXml(setIdExtension)}"/>
			<versionNumber value="${Math.max(1, Math.floor(Number(params.documentVersion) || 1) - 1)}"/>
		</parentDocument>
	</relatedDocument>`
		: "";

	return `<?xml version="1.0" encoding="UTF-8"?>



<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<!-- DEFECT #76: realmCode required by HL7 CDA R2 / EGISZ SEMD header profile (RU) -->
	<realmCode code="RU"/>
	<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
	<templateId root="1.2.643.5.1.13.13.11.1527"/>
	<id root="${params.clinicOid && String(params.clinicOid).trim() ? escapeXml(String(params.clinicOid).trim()) : "1.2.643.5.1.13.13.12.2"}" extension="${escapeXml(params.documentId)}"/>
	<code code="74208-1" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Протокол стоматологического осмотра"/>
	<title>Протокол стоматологического осмотра</title>
	<effectiveTime value="${effectiveTime}"/>
	<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
	<languageCode code="ru-RU"/>
	<!-- DEFECT #88: setId = document SET (stable); id above = this version -->
	<setId root="${params.clinicOid && String(params.clinicOid).trim() ? escapeXml(String(params.clinicOid).trim()) : "1.2.643.5.1.13.13.12.2"}" extension="${escapeXml(setIdExtension)}"/>

	<versionNumber value="${Math.max(1, Math.floor(Number(params.documentVersion) || 1))}"/>
	${relatedDocumentXml}
	<recordTarget>

		<patientRole>
			${/*
			 * DEFECT #94: patientRole must carry local MRN (patientId) always.
			 * БЫЛО (#79): only SNILS id OR nullFlavor NI — params.patientId was
			 * never emitted. When SNILS missing, patientRole had only NI and
			 * REMD/EMK could not join the SEMD to the clinic chart (patients.id).
			 * Even with SNILS, local MRN is the ambulatory chart key.
			 * СТАЛО: first id = clinicOid (or default MO root) + patientId
			 * extension (XML-escaped); second id = SNILS when present (else
			 * no second SNILS id — MRN alone is sufficient, no empty NI when
			 * we already have a real local id).
			 */
			(() => {
				const mrnRoot =
					params.clinicOid && String(params.clinicOid).trim()
						? escapeXml(String(params.clinicOid).trim())
						: "1.2.643.5.1.13.13.12.2";
				const mrnExt = escapeXml(String(params.patientId ?? "").trim() || "unknown");
				const mrnId = `<id root="${mrnRoot}" extension="${mrnExt}"/>`;
				const snils =
					params.patientSnils && String(params.patientSnils).trim()
						? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.patientSnils).trim())}"/>`
						: "";
				return snils ? `${mrnId}\n\t\t\t${snils}` : mrnId;
			})()}
			<!--
				DEFECT #98: patientRole addr + telecom (HL7 CDA R2 / EGISZ SEMD).
				БЫЛО: patientRole had only id(s) + patient demographics — no
				addr/telecom. SEMD validators expect contact structure under
				patientRole; without it REMD flags incomplete recordTarget.
				We do not invent address/phone (no fake streets/numbers).
				СТАЛО: emit addr and telecom with nullFlavor="NI" until real
				patient contact fields are wired from the chart (no schema lie).
			-->
			<addr nullFlavor="NI"/>
			<telecom nullFlavor="NI"/>
			<patient>



				<name>
					<family>${escapeXml(params.patientName.last)}</family>
					<given>${escapeXml(params.patientName.first)}</given>
					${params.patientName.middle ? `<given>${escapeXml(params.patientName.middle)}</given>` : ""}
				</name>
				${genderCode
					? `<administrativeGenderCode code="${genderCode}" codeSystem="1.2.643.5.1.13.13.11.1040"/>`
					: `<!-- DEFECT #81: unknown gender — nullFlavor UNK (never invent code 0) -->
				<administrativeGenderCode nullFlavor="UNK"/>`}

				${birthTimeValue
					? `<birthTime value="${birthTimeValue}"/>`
					: `<!-- DEFECT #80: unknown DOB — nullFlavor UNK (never invent a fake date) -->
				<birthTime nullFlavor="UNK"/>`}
				<!--
					DEFECT #97: patient/languageCommunication (preferred language).
					БЫЛО: patient had name + gender + birthTime only. HL7 CDA R2
					and EGISZ SEMD expect languageCommunication so the record
					declares the language of care/communication (ru-RU for RF
					ambulatory dentistry). Without it validators flag incomplete
					patient demographics and REMD cannot route interpreter needs.
					СТАЛО: languageCode ru-RU + preferenceInd true (primary).
				-->
				<languageCommunication>
					<languageCode code="ru-RU"/>
					<preferenceInd value="true"/>
				</languageCommunication>

			</patient>


		</patientRole>
	</recordTarget>
	<author>
		<time value="${effectiveTime}"/>
		<assignedAuthor>
			${/*
			 * DEFECT #77: assignedAuthor/id is required (1..*) in CDA R2.
			 * БЫЛО: when doctorSnils absent the whole <id> was omitted → schema
			 * invalid assignedAuthor (empty id list). users table has no snils
			 * column yet, so production exports almost always hit this path.
			 * СТАЛО: SNILS id when present; otherwise <id nullFlavor="NI"/>.
			 */
			params.doctorSnils && String(params.doctorSnils).trim()
				? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
				: `<id nullFlavor="NI"/>`}
			${params.doctorPosition && params.doctorPosition.trim()
				? `<code nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
				: ""}
			<!--
				DEFECT #99: assignedAuthor addr + telecom (HL7 CDA R2 / EGISZ SEMD).
				БЫЛО: assignedAuthor had id/code/person/org only — no addr/telecom.
				SEMD validators expect contact structure under assignedAuthor
				(mirror of patientRole #98). We do not invent clinic/doctor
				street or phone numbers.
				СТАЛО: emit addr and telecom with nullFlavor="NI" until real
				MO contact fields are wired (no schema lie).
			-->
			<addr nullFlavor="NI"/>
			<telecom nullFlavor="NI"/>
			<assignedPerson>
				<name>
					<family>${escapeXml(params.doctorName.last)}</family>
					<given>${escapeXml(params.doctorName.first)}</given>
					${params.doctorName.middle ? `<given>${escapeXml(params.doctorName.middle)}</given>` : ""}
				</name>
			</assignedPerson>
			${/*
			 * DEFECT #83: assignedAuthor must carry representedOrganization.

			 * БЫЛО: author had person only; legalAuthenticator (#75) already
			 * embeds clinic name under assignedEntity. EGISZ SEMD / CDA R2
			 * author.assignedAuthor.representedOrganization is expected so
			 * the document author is attributed to the MO, not a free agent.
			 * СТАЛО: mirror clinicName (XML-escaped) as in legalAuthenticator.
			 */
			`<representedOrganization>
				${/*
				 * DEFECT #114: assignedAuthor representedOrganization/id
				 * (HL7 CDA R2 / EGISZ SEMD).
				 * БЫЛО: representedOrganization had addr/telecom/name only —
				 * no id. custodian (#78) and informationRecipient already
				 * emit org id (clinicOid or nullFlavor NI). SEMD validators
				 * expect MO identity under author org the same way.
				 * СТАЛО: real OID as extension when present; else
				 * <id nullFlavor="NI"/>. root = MO registry OID.
				 */
				params.clinicOid && String(params.clinicOid).trim()
					? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
					: `<id nullFlavor="NI"/>`}
				<!--
					DEFECT #106: assignedAuthor representedOrganization
					addr + telecom (HL7 CDA R2 / EGISZ SEMD).
					БЫЛО: representedOrganization had only name child — no
					addr/telecom. SEMD validators expect MO contact under
					author org (mirror of custodian #102 / recipient #103).
					We do not invent clinic street or phone.
					СТАЛО: emit addr and telecom with nullFlavor="NI".
				-->
				<addr nullFlavor="NI"/>
				<telecom nullFlavor="NI"/>
				<name>${escapeXml(params.clinicName)}</name>
			</representedOrganization>`}
		</assignedAuthor>
	</author>


	<custodian>
		<assignedCustodian>
			<representedCustodianOrganization>
				${/*
				 * DEFECT #78: custodian organization id must not emit empty extension.
				 * БЫЛО: extension="${params.clinicOid || ""}" → extension="" when
				 * clinicOid absent (common — orgs.oid often unset). Empty II.extension
				 * is schema-invalid; clinicOid also was not XML-escaped.
				 * СТАЛО: real OID as extension when present; else <id nullFlavor="NI"/>.
				 * root stays the MO registry OID (1.2.643.5.1.13.13.12.2).
				 */
				params.clinicOid && String(params.clinicOid).trim()
					? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
					: `<id nullFlavor="NI"/>`}
				<!--
					DEFECT #102: custodian representedCustodianOrganization
					addr + telecom (HL7 CDA R2 / EGISZ SEMD).
					БЫЛО: custodian had id + name only — no addr/telecom.
					SEMD validators expect MO contact under custodian org
					(mirror of patientRole #98 / assignedAuthor #99).
					We do not invent clinic street or phone.
					СТАЛО: emit addr and telecom with nullFlavor="NI".
				-->
				<addr nullFlavor="NI"/>
				<telecom nullFlavor="NI"/>
				<name>${escapeXml(params.clinicName)}</name>
			</representedCustodianOrganization>

		</assignedCustodian>
	</custodian>
	<!--
		DEFECT #96: informationRecipient (intended receiver of the SEMD).
		БЫЛО: CDA had author + custodian + legalAuthenticator + authenticator
		but no informationRecipient. HL7 CDA R2 and EGISZ REMD expect the
		intended recipient organization (clinic MO / REMD registry) so the
		document is addressed for registration, not an orphan payload.
		СТАЛО: informationRecipient/intendedRecipient/receivedOrganization
		with clinicOid (or default MO root) + clinicName — same identity
		scheme as custodian representedCustodianOrganization.
	-->
	<informationRecipient>
		<intendedRecipient>
			<receivedOrganization>
				${params.clinicOid && String(params.clinicOid).trim()
					? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
					: `<id nullFlavor="NI"/>`}
				<!--
					DEFECT #103: informationRecipient receivedOrganization
					addr + telecom (HL7 CDA R2 / EGISZ SEMD).
					БЫЛО: receivedOrganization had id + name only — no
					addr/telecom. SEMD validators expect MO contact under
					the intended recipient (mirror of custodian #102).
					We do not invent clinic street or phone.
					СТАЛО: emit addr and telecom with nullFlavor="NI".
				-->
				<addr nullFlavor="NI"/>
				<telecom nullFlavor="NI"/>
				<name>${escapeXml(params.clinicName)}</name>
			</receivedOrganization>
		</intendedRecipient>
	</informationRecipient>


	<!--
		DEFECT #75: legalAuthenticator (who signed / locks Form 043/у).

		БЫЛО: CDA had author + custodian only — no legalAuthenticator.
		EGISZ REMD / SEMD validators require the signing physician block;
		without it the document has no legal signature party distinct from
		author time. СТАЛО: legalAuthenticator mirrors doctorName (+ optional
		SNILS/position) with time = documentClock (lockedAt when provided).
	-->
	<legalAuthenticator>
		<time value="${effectiveTime}"/>
		<signatureCode code="S"/>
		<assignedEntity>
			${/* DEFECT #77: assignedEntity/id required (1..*) — same as assignedAuthor */
			params.doctorSnils && String(params.doctorSnils).trim()
				? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
				: `<id nullFlavor="NI"/>`}
			${params.doctorPosition && params.doctorPosition.trim()
				? `<code nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
				: ""}
			<!--
				DEFECT #100: legalAuthenticator assignedEntity addr + telecom.
				БЫЛО: legalAuthenticator had id/code/person/org only — no
				addr/telecom. SEMD validators expect contact structure under
				assignedEntity (mirror of assignedAuthor #99 / patientRole #98).
				We do not invent doctor/clinic street or phone.
				СТАЛО: emit addr and telecom with nullFlavor="NI".
			-->
			<addr nullFlavor="NI"/>
			<telecom nullFlavor="NI"/>
			<assignedPerson>

				<name>
					<family>${escapeXml(params.doctorName.last)}</family>
					<given>${escapeXml(params.doctorName.first)}</given>
					${params.doctorName.middle ? `<given>${escapeXml(params.doctorName.middle)}</given>` : ""}
				</name>
			</assignedPerson>
			<representedOrganization>
				${/*
				 * DEFECT #115: legalAuthenticator representedOrganization/id
				 * (HL7 CDA R2 / EGISZ SEMD).
				 * БЫЛО: representedOrganization had addr/telecom/name only —
				 * no id. assignedAuthor org (#114) / custodian (#78) already
				 * emit clinicOid or nullFlavor NI. SEMD validators expect MO
				 * identity under legal signer org the same way.
				 * СТАЛО: real OID as extension when present; else
				 * <id nullFlavor="NI"/>. root = MO registry OID.
				 */
				params.clinicOid && String(params.clinicOid).trim()
					? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
					: `<id nullFlavor="NI"/>`}
				<!--
					DEFECT #107: legalAuthenticator representedOrganization
					addr + telecom (HL7 CDA R2 / EGISZ SEMD).
					БЫЛО: representedOrganization had only name child — no
					addr/telecom. SEMD validators expect MO contact under
					legal signer org (mirror of assignedAuthor org #106).
					We do not invent clinic street or phone.
					СТАЛО: emit addr and telecom with nullFlavor="NI".
				-->
				<addr nullFlavor="NI"/>
				<telecom nullFlavor="NI"/>
				<name>${escapeXml(params.clinicName)}</name>
			</representedOrganization>
		</assignedEntity>
	</legalAuthenticator>
	<!--
		DEFECT #95: authenticator (who attested the clinical content).
		БЫЛО: legalAuthenticator (#75) only — HL7 CDA R2 also allows/expects
		authenticator for the clinician who authenticates the document content
		(distinct role from legal signature party). EGISZ SEMD validators that
		check both blocks reject documents with legalAuthenticator alone when
		the authoring physician is the same person who attests the SOAP text.
		СТАЛО: authenticator mirrors doctor identity + signatureCode S and
		time = documentClock (lockedAt), same scheme as legalAuthenticator.
	-->
	<authenticator>
		<time value="${effectiveTime}"/>
		<signatureCode code="S"/>
		<assignedEntity>
			${params.doctorSnils && String(params.doctorSnils).trim()
				? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
				: `<id nullFlavor="NI"/>`}
			${params.doctorPosition && params.doctorPosition.trim()
				? `<code nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
				: ""}
			<!--
				DEFECT #101: authenticator assignedEntity addr + telecom.
				БЫЛО: authenticator had id/code/person/org only — no addr/telecom.
				SEMD validators expect contact under assignedEntity (mirror of
				legalAuthenticator #100 / assignedAuthor #99). No invented contact.
				СТАЛО: emit addr and telecom with nullFlavor="NI".
			-->
			<addr nullFlavor="NI"/>
			<telecom nullFlavor="NI"/>
			<assignedPerson>

				<name>
					<family>${escapeXml(params.doctorName.last)}</family>
					<given>${escapeXml(params.doctorName.first)}</given>
					${params.doctorName.middle ? `<given>${escapeXml(params.doctorName.middle)}</given>` : ""}
				</name>
			</assignedPerson>
			<representedOrganization>
				${/*
				 * DEFECT #116: authenticator representedOrganization/id
				 * (HL7 CDA R2 / EGISZ SEMD).
				 * БЫЛО: representedOrganization had addr/telecom/name only —
				 * no id. legalAuthenticator org (#115) already emits
				 * clinicOid or nullFlavor NI. SEMD validators expect MO
				 * identity under authenticator org the same way.
				 * СТАЛО: real OID as extension when present; else
				 * <id nullFlavor="NI"/>. root = MO registry OID.
				 */
				params.clinicOid && String(params.clinicOid).trim()
					? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
					: `<id nullFlavor="NI"/>`}
				<!--
					DEFECT #108: authenticator representedOrganization
					addr + telecom (HL7 CDA R2 / EGISZ SEMD).
					БЫЛО: representedOrganization had only name child — no
					addr/telecom. SEMD validators expect MO contact under
					authenticator org (mirror of legalAuthenticator org #107).
					We do not invent clinic street or phone.
					СТАЛО: emit addr and telecom with nullFlavor="NI".
				-->
				<addr nullFlavor="NI"/>
				<telecom nullFlavor="NI"/>
				<name>${escapeXml(params.clinicName)}</name>
			</representedOrganization>
		</assignedEntity>
	</authenticator>
	<!-- DEFECT #55/#65: encounter datetime (params.visitDate / appointment.startsAt) -->

	<!--
		DEFECT #93: documentationOf/serviceEvent/performer (treating physician).
		БЫЛО: serviceEvent carried only effectiveTime — no performer. HL7 CDA R2
		and EGISZ SEMD expect the clinician who performed the care event under
		documentationOf (distinct from author/legalAuthenticator document roles
		and from encompassingEncounter/responsibleParty). Without performer,
		validators treat the care event as unattributed.
		СТАЛО: performer typeCode="PRF" with assignedEntity (doctor SNILS/name
		+ clinic), same identity scheme as assignedAuthor / responsibleParty.
	-->
	<documentationOf>
		<serviceEvent classCode="PCPR">
			<effectiveTime value="${visitTime}"/>
			<performer typeCode="PRF">
				<assignedEntity>
					${params.doctorSnils && String(params.doctorSnils).trim()
						? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
						: `<id nullFlavor="NI"/>`}
					${params.doctorPosition && params.doctorPosition.trim()
						? `<code nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
						: ""}
										<!--
						DEFECT #104: documentationOf/serviceEvent/performer
						assignedEntity addr + telecom (HL7 CDA R2 / EGISZ SEMD).
						БЫЛО: performer assignedEntity had id/code/person/org
						only — no addr/telecom. SEMD validators expect contact
						under the care-event performer (mirror of
						legalAuthenticator #100 / authenticator #101 /
						assignedAuthor #99). We do not invent doctor/clinic
						street or phone.
						СТАЛО: emit addr and telecom with nullFlavor="NI".
					-->
					<addr nullFlavor="NI"/>
					<telecom nullFlavor="NI"/>
<assignedPerson>
						<name>
							<family>${escapeXml(params.doctorName.last)}</family>
							<given>${escapeXml(params.doctorName.first)}</given>
							${params.doctorName.middle ? `<given>${escapeXml(params.doctorName.middle)}</given>` : ""}
						</name>
					</assignedPerson>
					<representedOrganization>
						${/*
						 * DEFECT #117: documentationOf/serviceEvent/performer
						 * representedOrganization/id (HL7 CDA R2 / EGISZ SEMD).
						 * БЫЛО: representedOrganization had addr/telecom/name only —
						 * no id. authenticator org (#116) already emits clinicOid or
						 * nullFlavor NI. SEMD validators expect MO identity under
						 * performer org the same way.
						 * СТАЛО: real OID as extension when present; else
						 * <id nullFlavor="NI"/>. root = MO registry OID.
						 */
						params.clinicOid && String(params.clinicOid).trim()
							? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
							: `<id nullFlavor="NI"/>`}
						<!--
							DEFECT #109: documentationOf/serviceEvent/performer
							representedOrganization addr + telecom (HL7 CDA R2 / EGISZ SEMD).
							БЫЛО: representedOrganization had only name child — no
							addr/telecom. SEMD validators expect MO contact under
							performer org (mirror of authenticator org #108).
							We do not invent clinic street or phone.
							СТАЛО: emit addr and telecom with nullFlavor="NI".
						-->
						<addr nullFlavor="NI"/>
						<telecom nullFlavor="NI"/>
						<name>${escapeXml(params.clinicName)}</name>
					</representedOrganization>
				</assignedEntity>
			</performer>
		</serviceEvent>
	</documentationOf>


	<!--
		DEFECT #86: componentOf/encompassingEncounter (CDA R2 header).
		БЫЛО: only documentationOf/serviceEvent carried visitDate. HL7 CDA R2
		and EGISZ SEMD also expect componentOf → encompassingEncounter so the
		document is explicitly linked to the ambulatory encounter (id + time).
		Without it validators treat the protocol as detached from the visit;
		REMD audit cannot join the SEMD to the appointment slot id.
		СТАЛО: encompassingEncounter with id + the same visitTime clock as
		documentationOf (yyyyMMddHHmmss).
		DEFECT #87: extension is encounterExtension (visit.id preferred),
		not ClinicalDocument documentId — separate REMD join key.
		DEFECT #91: encounter code (AMB ambulatory) + responsibleParty
		(treating physician) — bare id+time is incomplete for SEMD validators
		that require encounter class and responsible clinician.
	-->
	<componentOf>
		<encompassingEncounter>
			<id root="${params.clinicOid && String(params.clinicOid).trim() ? escapeXml(String(params.clinicOid).trim()) : "1.2.643.5.1.13.13.12.2"}" extension="${escapeXml(encounterExtension)}"/>
			<code code="AMB" codeSystem="1.2.643.5.1.13.13.11.1461" codeSystemName="Виды медицинской помощи" displayName="Амбулаторная помощь"/>
			<effectiveTime value="${visitTime}"/>
			<responsibleParty>
				<assignedEntity>
					${params.doctorSnils && String(params.doctorSnils).trim()
						? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
						: `<id nullFlavor="NI"/>`}
					${params.doctorPosition && params.doctorPosition.trim()
						? `<code nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
						: ""}
										<!--
						DEFECT #105: encompassingEncounter/responsibleParty
						assignedEntity addr + telecom (HL7 CDA R2 / EGISZ SEMD).
						БЫЛО: responsibleParty assignedEntity had id/code/person/org
						only — no addr/telecom. SEMD validators expect contact under
						the encounter responsible clinician (mirror of performer
						#104 / legalAuthenticator #100 / assignedAuthor #99).
						We do not invent doctor/clinic street or phone.
						СТАЛО: emit addr and telecom with nullFlavor="NI".
					-->
					<addr nullFlavor="NI"/>
					<telecom nullFlavor="NI"/>
<assignedPerson>
						<name>
							<family>${escapeXml(params.doctorName.last)}</family>
							<given>${escapeXml(params.doctorName.first)}</given>
							${params.doctorName.middle ? `<given>${escapeXml(params.doctorName.middle)}</given>` : ""}
						</name>
					</assignedPerson>
					<representedOrganization>
	${/*
	 * DEFECT #118: encompassingEncounter/responsibleParty
	 * representedOrganization/id (HL7 CDA R2 / EGISZ SEMD).
	 * БЫЛО: representedOrganization had addr/telecom/name only —
	 * no id. performer org (#117) already emits clinicOid or
	 * nullFlavor NI. SEMD validators expect MO identity under
	 * responsibleParty org the same way.
	 * СТАЛО: real OID as extension when present; else
	 * <id nullFlavor="NI"/>. root = MO registry OID.
	 */
	params.clinicOid && String(params.clinicOid).trim()
		? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
		: `<id nullFlavor="NI"/>`}
	<!--
							DEFECT #110: encompassingEncounter/responsibleParty
							representedOrganization addr + telecom (HL7 CDA R2 / EGISZ SEMD).
							БЫЛО: representedOrganization had only name child — no
							addr/telecom. SEMD validators expect MO contact under
							responsibleParty org (mirror of performer org #109).
							We do not invent clinic street or phone.
							СТАЛО: emit addr and telecom with nullFlavor="NI".
						-->
						<addr nullFlavor="NI"/>
						<telecom nullFlavor="NI"/>
						<name>${escapeXml(params.clinicName)}</name>
					</representedOrganization>
				</assignedEntity>
			</responsibleParty>

			<!--
				DEFECT #92: encompassingEncounter/location (healthCareFacility).
				БЫЛО (#91): encounter had id + AMB code + responsibleParty but
				no location — SEMD validators expect the ambulatory facility
				where the visit occurred (clinic OID + name). Without it REMD
				cannot place the encounter at the MO site.
				СТАЛО: location/healthCareFacility with id (clinicOid) and
				location/name = clinicName (same root scheme as setId/id).
			-->
			<location>
				<healthCareFacility>
					${/*
					 * DEFECT #120: healthCareFacility/id must not invent extension="unknown".
					 * БЫЛО: when clinicOid absent, id emitted root=MO-registry +
					 * extension="unknown" — a fake II.extension (same class as
					 * custodian empty-extension #78). SEMD validators and REMD
					 * join treat "unknown" as a real facility key.
					 * СТАЛО: real OID as extension when present (root = MO
					 * registry); else <id nullFlavor="NI"/>. Mirror of org ids
					 * #114-#119 / custodian #78.
					 */
					params.clinicOid && String(params.clinicOid).trim()
						? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
						: `<id nullFlavor="NI"/>`}
					<location>
						<!--
							DEFECT #112: healthCareFacility/location addr
							(HL7 CDA R2 / EGISZ SEMD).
							БЫЛО: location had only name child — no addr.
							SEMD validators expect facility place addr under
							encompassingEncounter location (mirror of
							serviceProviderOrganization #111). We do not invent
							clinic street.
							СТАЛО: emit addr with nullFlavor="NI" before name child.
						-->
						<addr nullFlavor="NI"/>
						<name>${escapeXml(params.clinicName)}</name>
					</location>

					<serviceProviderOrganization>
	${/*
	 * DEFECT #119: healthCareFacility serviceProviderOrganization/id
	 * (HL7 CDA R2 / EGISZ SEMD).
	 * БЫЛО: serviceProviderOrganization had addr/telecom/name only —
	 * no id. responsibleParty org (#118) already emits clinicOid or
	 * nullFlavor NI. SEMD validators expect MO identity under
	 * encounter facility provider org the same way.
	 * СТАЛО: real OID as extension when present; else
	 * <id nullFlavor="NI"/>. root = MO registry OID.
	 */
	params.clinicOid && String(params.clinicOid).trim()
		? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
		: `<id nullFlavor="NI"/>`}
	<!--
							DEFECT #111: healthCareFacility serviceProviderOrganization
							addr + telecom (HL7 CDA R2 / EGISZ SEMD).
							БЫЛО: serviceProviderOrganization had only name child — no
							addr/telecom. SEMD validators expect MO contact under
							encounter facility provider org (mirror of responsibleParty
							org #110). We do not invent clinic street or phone.
							СТАЛО: emit addr and telecom with nullFlavor="NI".
						-->
						<addr nullFlavor="NI"/>
						<telecom nullFlavor="NI"/>
						<name>${escapeXml(params.clinicName)}</name>
					</serviceProviderOrganization>

				</healthCareFacility>
			</location>
		</encompassingEncounter>
	</componentOf>



	<component>

		<structuredBody>
			<!-- Диагноз -->
			<component>
				<section>
					<code code="29548-5" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Диагнозы"/>
					<title>Диагноз</title>
					<text>
						<paragraph>${escapeXml(params.diagnosisText)} (МКБ-10: ${escapeXml(params.icd10Code)})${params.diagnosisTooth && String(params.diagnosisTooth).trim() ? ` · зуб ${escapeXml(String(params.diagnosisTooth).trim())}` : ""}</paragraph>
					</text>
					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="29308-4" codeSystem="2.16.840.1.113883.6.1" displayName="Диагноз"/>
							<value xsi:type="CD" code="${escapeXml(params.icd10Code)}" codeSystem="1.2.643.5.1.13.13.11.1005" displayName="${escapeXml(params.diagnosisText)}"/>${params.diagnosisTooth && String(params.diagnosisTooth).trim()
								? `
							<!-- DEFECT #74: ISO 3950 tooth from visit_diaries.diagnosis_tooth -->
							<targetSiteCode code="${escapeXml(String(params.diagnosisTooth).trim())}" codeSystem="1.2.643.5.1.13.13.11.1466" codeSystemName="Зубы" displayName="Зуб ${escapeXml(String(params.diagnosisTooth).trim())}"/>`
								: ""}
						</observation>
					</entry>
				</section>
			</component>
			<!-- Анамнез -->
			<component>
				<section>
					<code code="10164-2" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Анамнез"/>

					<title>Анамнез</title>
					<text>
						<paragraph>${escapeXml(params.anamnesis || "Без особенностей")}</paragraph>
					</text>
				</section>
			</component>
			<!-- Объективный статус / Status localis (043 O-block) -->
			<component>
				<section>
					<code code="29545-1" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Physical findings"/>
					<title>Объективный статус</title>
					<text>
						<paragraph>${escapeXml(params.objectiveStatus || "Без особенностей")}</paragraph>
					</text>
				</section>
			</component>
			<!-- Оказанные услуги / Лечение -->
			<component>
				<section>
					<code code="47519-4" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Медицинские услуги"/>
					<title>Проведенное лечение</title>
					<text>
						<paragraph>${escapeXml(params.treatmentDescription || "Осмотр и консультация")}</paragraph>
					</text>
				</section>
			</component>
			<!-- Осложнения (043) -->
			<component>
				<section>
					<code code="55109-3" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Complications"/>
					<title>Осложнения</title>
					<text>
						<paragraph>${escapeXml(params.complications || "Не отмечены")}</paragraph>
					</text>
				</section>
			</component>
			<!-- Сопутствующие заболевания (043) -->
			<component>
				<section>
					<code code="11348-0" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="History of Past illness"/>
					<title>Сопутствующие заболевания</title>
					<text>
						<paragraph>${escapeXml(params.comorbidities || "Не отмечены")}</paragraph>
					</text>
				</section>
			</component>
			<!-- DEFECT #57: инструментальный лоток 043 (sterilization barcode) -->
			${params.instrumentTrayBarcode && params.instrumentTrayBarcode.trim()
				? `<component>
				<section>
					<code code="46264-8" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Medical device identifier"/>
					<title>Инструментальный лоток</title>
					<text>
						<paragraph>Штрихкод: ${escapeXml(params.instrumentTrayBarcode.trim())}</paragraph>
					</text>
				</section>
			</component>`
				: ""}
		</structuredBody>
	</component>
</ClinicalDocument>`;
}

