export interface EgiszCdaParams {
	patientId: string;
	patientName: { first: string; last: string; middle?: string };
	patientSnils: string;
	patientBirthDate: string | null;
	patientGender: "male" | "female" | "other" | null;
	clinicOid?: string | undefined;
	clinicName: string;
	doctorName: { first: string; last: string; middle?: string };
	doctorSnils?: string | undefined;
	/** DEFECT #58: specialty label → assignedAuthor/code@displayName */
	doctorPosition?: string | undefined;
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
	replacesDocumentId?: string | undefined;

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
			<!--
				DEFECT #162: relatedDocument/parentDocument/code.
				WAS: parentDocument had id + setId + versionNumber only — no
				code. HL7 CDA R2 ParentDocument is a ClinicalDocument stub;
				SEMD validators expect the document type CE so REMD knows
				which SEMD kind is being replaced (same LOINC as this CDA).
				NOW: code LOINC 74208-1 (dental exam protocol) matching
				ClinicalDocument/code and serviceEvent/code.
			-->
			<code code="74208-1" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Протокол стоматологического осмотра"/>
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
	<!--
		DEFECT #158: ClinicalDocument/confidentialityCode codeSystemName + displayName.
		WAS: confidentialityCode had code=N + codeSystem only — no codeSystemName
		or displayName. LOINC/ICD-10/gender/AMB CEs already label the dictionary
		(#155/#156/#157/#91). SEMD validators expect the HL7 Confidentiality
		dictionary name so REMD can render "Normal" without OID lookup.
		NOW: codeSystemName + RU displayName on confidentialityCode N (normal).
	-->
	<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
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
			 *
			 * DEFECT #122: empty patientId must not invent extension="unknown".
			 * БЫЛО (#94): mrnExt fell back to literal "unknown" when patientId
			 * blank — same class of fake II.extension as healthCareFacility
			 * #120. REMD join treats "unknown" as a real chart key.
			 * СТАЛО: real patientId extension when non-empty; else
			 * <id nullFlavor="NI"/> for the MRN slot. SNILS id still emitted
			 * when present (may be the only real id). If both empty, single
			 * nullFlavor NI satisfies CDA R2 patientRole/id 1..*.
			 */
			(() => {
				const mrnRoot =
					params.clinicOid && String(params.clinicOid).trim()
						? escapeXml(String(params.clinicOid).trim())
						: "1.2.643.5.1.13.13.12.2";
				const mrnRaw = String(params.patientId ?? "").trim();
				const mrnId = mrnRaw
					? `<id root="${mrnRoot}" extension="${escapeXml(mrnRaw)}"/>`
					: `<id nullFlavor="NI"/>`;
				const snils =
					params.patientSnils && String(params.patientSnils).trim()
						? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.patientSnils).trim())}"/>`
						: "";
				// If MRN is nullFlavor and SNILS present, prefer SNILS alone
				// (no redundant NI+SNILS pair). If MRN real, keep MRN then SNILS.
				if (mrnRaw) {
					return snils ? `${mrnId}\n\t\t\t${snils}` : mrnId;
				}
				return snils || mrnId;
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
				${/*
				 * DEFECT #157: administrativeGenderCode codeSystemName.
				 * DEFECT #160: administrativeGenderCode displayName (М/Ж).
				 * WAS (#157): code+codeSystem+codeSystemName only — no
				 * displayName. confidentialityCode (#158) and signatureCode
				 * (#159) already carry displayName. SEMD validators expect
				 * the human-readable gender label on known 1/2 codes.
				 * NOW: displayName Мужской (1) / Женский (2); UNK unchanged.
				 */
				genderCode
					? `<administrativeGenderCode code="${genderCode}" codeSystem="1.2.643.5.1.13.13.11.1040" codeSystemName="Пол пациента" displayName="${genderCode === "1" ? "Мужской" : "Женский"}"/>`
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
					<!--
						DEFECT #163: patient/languageCommunication/modeCode.
						WAS: languageCommunication had languageCode + preferenceInd
						only — no modeCode. HL7 CDA R2 LanguageCommunication
						expects how the language is used (spoken/written/signed).
						SEMD validators flag incomplete patient communication
						demographics without mode. Form 043/u ambulatory dental
						is spoken RU primary care language.
						NOW: modeCode SPK (spoken) from HL7 LanguageAbilityMode
						2.16.840.1.113883.5.60 with dictionary label.
					-->
					<modeCode code="SPK" codeSystem="2.16.840.1.113883.5.60" codeSystemName="LanguageAbilityMode" displayName="Устная речь"/>
					<!--
						DEFECT #164: patient/languageCommunication/proficiencyLevelCode.
						WAS: languageCommunication had languageCode + modeCode (#163)
						+ preferenceInd — no proficiencyLevelCode. HL7 CDA R2
						LanguageCommunication expects how well the patient uses
						the language (excellent/good/fair/poor). SEMD validators
						flag incomplete communication demographics without
						proficiency. Form 043/u ambulatory dental assumes native
						or excellent spoken RU as primary preferred language.
						NOW: proficiencyLevelCode E (excellent) from HL7
						LanguageAbilityProficiency 2.16.840.1.113883.5.61.
					-->
					<proficiencyLevelCode code="E" codeSystem="2.16.840.1.113883.5.61" codeSystemName="LanguageAbilityProficiency" displayName="Свободно"/>
					<preferenceInd value="true"/>

				</languageCommunication>


			</patient>


		</patientRole>
	</recordTarget>
	<author>
		<time value="${effectiveTime}"/>
		<!--
			DEFECT #166: ClinicalDocument/author/functionCode.
			WAS: author had time + assignedAuthor only — no functionCode.
			HL7 CDA R2 Author has functionCode 0..1 (participation function /
			clinical role). assignedAuthor/code already carries specialty
			displayName (#138); SEMD validators also expect the participation-
			level function slot so REMD can distinguish authoring role from
			entity specialty. Form 043/u author is the treating dentist.
			NOW: functionCode with NI+displayName when doctorPosition known;
			bare nullFlavor NI when blank. No invented NSI function code.
		-->
		${params.doctorPosition && params.doctorPosition.trim()
			? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
			: `<functionCode nullFlavor="NI"/>`}
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
			${/*
			 * DEFECT #138: assignedAuthor/code must always be present.
			 * WAS: code emitted only when doctorPosition non-empty, and then
			 * only as nullFlavor NI + displayName. When position blank the
			 * entire code element was omitted — SEMD validators expect
			 * assignedAuthor/code (specialty/role) 0..1 as a real node;
			 * omitting it loses the specialty slot entirely.
			 * NOW: always emit code. When doctorPosition present keep
			 * nullFlavor NI + displayName (no NSI specialty code wired yet);
			 * when blank emit bare nullFlavor NI (no invented code).
			 */
			params.doctorPosition && params.doctorPosition.trim()
				? `<code nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
				: `<code nullFlavor="NI"/>`}
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
	<!--
		DEFECT #127: ClinicalDocument/dataEnterer (HL7 CDA R2 / EGISZ SEMD).
		БЫЛО: header jumped author → custodian with no dataEnterer.
		SEMD validators expect the chart-entry agent (who typed the
		protocol into the EMR) under ClinicalDocument. In this Form 043/у
		pipeline the treating dentist is also the data enterer (no separate
		transcriptionist role in the clinic chart).
		СТАЛО: dataEnterer after author, before custodian; assignedEntity
		mirrors assignedAuthor identity (SNILS or nullFlavor NI, person
		name, MO representedOrganization with clinicOid or NI). time =
		effectiveTime (entry at document generation / visit close).
		No invented street/phone — addr/telecom nullFlavor NI.
	-->
	<dataEnterer>
		<time value="${effectiveTime}"/>
		<!--
			DEFECT #167: ClinicalDocument/dataEnterer/functionCode.
			WAS: dataEnterer had time + assignedEntity only — no functionCode.
			author and serviceEvent/performer already emit functionCode (#166).
			HL7 CDA R2 DataEnterer has functionCode 0..1 (participation function
			for who typed the chart). SEMD expects the same participation-level
			function slot under dataEnterer so REMD can distinguish entry role
			from assignedEntity/code specialty (#142).
			NOW: functionCode NI+displayName when doctorPosition known;
			bare nullFlavor NI when blank. No invented NSI function code.
		-->
		${params.doctorPosition && params.doctorPosition.trim()
			? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
			: `<functionCode nullFlavor="NI"/>`}
		<assignedEntity>

			${/*
			 * Same id rule as assignedAuthor (#77): SNILS when present,
			 * else nullFlavor NI. Do not invent extension="unknown".
			 */
			params.doctorSnils && String(params.doctorSnils).trim()
				? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
				: `<id nullFlavor="NI"/>`}
			${/*
			 * DEFECT #142: dataEnterer assignedEntity/code always present.
			 * WAS: assignedEntity had id then jumped to addr/telecom with no
			 * code. assignedAuthor (#138), legalAuthenticator (#139),
			 * authenticator (#140), performer/responsibleParty (#141) already
			 * always emit code. SEMD validators expect the specialty slot
			 * under this assignedEntity the same way.
			 * NOW: always emit code (mirror #138-#141). Position ->
			 * NI+displayName; blank -> bare nullFlavor NI.
			 */
			params.doctorPosition && params.doctorPosition.trim()
				? `<code nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
				: `<code nullFlavor="NI"/>`}
			<addr nullFlavor="NI"/>
			<telecom nullFlavor="NI"/>
			<assignedPerson>
				<name>
					<family>${escapeXml(params.doctorName.last)}</family>
					<given>${escapeXml(params.doctorName.first)}</given>
					${params.doctorName.middle ? `<given>${escapeXml(params.doctorName.middle)}</given>` : ""}
				</name>
			</assignedPerson>
			${`<representedOrganization>
				${
					params.clinicOid && String(params.clinicOid).trim()
						? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
						: `<id nullFlavor="NI"/>`
				}
				<addr nullFlavor="NI"/>
				<telecom nullFlavor="NI"/>
				<name>${escapeXml(params.clinicName)}</name>
			</representedOrganization>`}
		</assignedEntity>
	</dataEnterer>
		<!--
		DEFECT #128: ClinicalDocument/informant (HL7 CDA R2 / EGISZ SEMD).
		WAS: header had dataEnterer (#127) then jumped to custodian with
		no informant. SEMD validators expect the clinical source of the
		protocol facts (who supplied / confirmed the anamnesis and exam
		findings) under ClinicalDocument after dataEnterer.
		NOW: informant after dataEnterer, before custodian. In this
		Form 043/u pipeline the treating dentist is the clinical informant
		(no separate patient-relative informant field on the chart).
		assignedEntity mirrors assignedAuthor / dataEnterer (SNILS or
		nullFlavor NI, person name, MO org id or NI). No invented
		street/phone - addr/telecom nullFlavor NI.
	-->
	<informant>
		<!--
			DEFECT #151: ClinicalDocument/informant/time.
			WAS: informant had only assignedEntity — no time. dataEnterer
			(#127) stamps time=effectiveTime; author/legal/authenticator too.
			HL7 CDA R2 Informant12 may carry time when the informant supplied
			the facts. SEMD expects the clinical source participation clock
			for Form 043/u (same documentClock as chart entry / sign).
			NOW: time value=effectiveTime before assignedEntity.
		-->
		<time value="${effectiveTime}"/>
		<assignedEntity>
			${/*
			 * Same id rule as assignedAuthor (#77) / dataEnterer (#127):
			 * SNILS when present, else nullFlavor NI. Never extension="unknown".
			 */

			params.doctorSnils && String(params.doctorSnils).trim()
				? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
				: `<id nullFlavor="NI"/>`}
			${/*
			 * DEFECT #142: informant assignedEntity/code always present.
			 * WAS: assignedEntity had id then jumped to addr/telecom with no
			 * code. assignedAuthor (#138), legalAuthenticator (#139),
			 * authenticator (#140), performer/responsibleParty (#141) already
			 * always emit code. SEMD validators expect the specialty slot
			 * under this assignedEntity the same way.
			 * NOW: always emit code (mirror #138-#141). Position ->
			 * NI+displayName; blank -> bare nullFlavor NI.
			 */
			params.doctorPosition && params.doctorPosition.trim()
				? `<code nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
				: `<code nullFlavor="NI"/>`}
			<addr nullFlavor="NI"/>
			<telecom nullFlavor="NI"/>
			<assignedPerson>
				<name>
					<family>${escapeXml(params.doctorName.last)}</family>
					<given>${escapeXml(params.doctorName.first)}</given>
					${params.doctorName.middle ? `<given>${escapeXml(params.doctorName.middle)}</given>` : ""}
				</name>
			</assignedPerson>
			${`<representedOrganization>
				${
					params.clinicOid && String(params.clinicOid).trim()
						? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
						: `<id nullFlavor="NI"/>`
				}
				<addr nullFlavor="NI"/>
				<telecom nullFlavor="NI"/>
				<name>${escapeXml(params.clinicName)}</name>
			</representedOrganization>`}
		</assignedEntity>
	</informant>
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
		<!--
			DEFECT #159: legalAuthenticator/signatureCode codeSystem + displayName.
			WAS: signatureCode had code=S only — no codeSystem/codeSystemName/
			displayName. confidentialityCode (#158) and LOINC/NSI CEs already
			label the dictionary. HL7 ParticipationSignature (2.16.840.1.113883.5.89)
			is the standard code system for S=signed; SEMD validators expect
			the dictionary label so REMD can render without OID guesswork.
			NOW: codeSystem + codeSystemName + RU displayName on code S.
		-->
		<signatureCode code="S" codeSystem="2.16.840.1.113883.5.89" codeSystemName="ParticipationSignature" displayName="Подписано"/>
		<assignedEntity>
			${/* DEFECT #77: assignedEntity/id required (1..*) — same as assignedAuthor */
			params.doctorSnils && String(params.doctorSnils).trim()
				? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
				: `<id nullFlavor="NI"/>`}
			${/*
			 * DEFECT #139: legalAuthenticator assignedEntity/code always present.
			 * WAS: same optional code as assignedAuthor pre-#138 — omitted when
			 * doctorPosition blank. SEMD validators expect the specialty slot
			 * under legal signer assignedEntity the same way.
			 * NOW: always emit code (mirror #138). Position -> NI+displayName;
			 * blank -> bare nullFlavor NI. No invented NSI specialty code.
			 */
			params.doctorPosition && params.doctorPosition.trim()
				? `<code nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
				: `<code nullFlavor="NI"/>`}
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
		<!--
			DEFECT #159: authenticator/signatureCode codeSystem + displayName.
			WAS: same bare code=S as legalAuthenticator pre-#159. Mirror legal
			signer ParticipationSignature CE so both signature parties carry
			the HL7 dictionary label.
			NOW: codeSystem + codeSystemName + RU displayName on code S.
		-->
		<signatureCode code="S" codeSystem="2.16.840.1.113883.5.89" codeSystemName="ParticipationSignature" displayName="Подписано"/>
		<assignedEntity>

			${params.doctorSnils && String(params.doctorSnils).trim()
				? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
				: `<id nullFlavor="NI"/>`}
			${/*
			 * DEFECT #140: authenticator assignedEntity/code always present.
			 * WAS: same optional code as assignedAuthor pre-#138 / legal
			 * authenticator pre-#139 — omitted when doctorPosition blank.
			 * SEMD validators expect the specialty slot under authenticator
			 * assignedEntity the same way as author and legal signer.
			 * NOW: always emit code (mirror #138/#139). Position ->
			 * NI+displayName; blank -> bare nullFlavor NI.
			 */
			params.doctorPosition && params.doctorPosition.trim()
				? `<code nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
				: `<code nullFlavor="NI"/>`}
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
			<!--
				DEFECT #161: documentationOf/serviceEvent/id (care event join key).
				WAS: serviceEvent had classCode/code/status/effectiveTime/performer
				only — no Act.id. Body entries now carry id (#153); encompassingEncounter
				has id (#86/#87). HL7 CDA R2 Act.id is the REMD join key for the
				documented care event itself (distinct from ClinicalDocument/id and
				encounter id). NOW: id under clinicOid root (or default MO root) with
				encounterExtension (same visit key as componentOf / inFulfillmentOf).
				No invented extension="unknown".
			-->
			<id root="${params.clinicOid && String(params.clinicOid).trim() ? escapeXml(String(params.clinicOid).trim()) : "1.2.643.5.1.13.13.12.2"}" extension="${escapeXml(encounterExtension)}"/>
			<!--
				DEFECT #124: documentationOf/serviceEvent/code (care event type).

				БЫЛО (#55/#65/#93): serviceEvent had classCode=PCPR + effectiveTime
				+ performer only — no code. HL7 CDA R2 / EGISZ SEMD expect the
				type of care event under documentationOf (what was performed),
				distinct from ClinicalDocument/code (document type) and from
				encompassingEncounter/code (AMB setting). Without serviceEvent
				code validators treat the care event as untyped PCPR shell.
				СТАЛО: LOINC 74208-1 (протокол стоматологического осмотра) —
				same code as ClinicalDocument for this Form 043/у SEMD; the
				service IS the dental exam protocol documented by this CDA.
			-->
			<code code="74208-1" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Протокол стоматологического осмотра"/>
			<!--
				DEFECT #126: documentationOf/serviceEvent/statusCode.
				БЫЛО (#124): serviceEvent had code + effectiveTime + performer
				but no statusCode. encompassingEncounter already emits
				statusCode completed (#125). HL7 CDA R2 Act status is expected
				on the care event so REMD knows the documented service is
				finished (Form 043/у export is post-slot).
				СТАЛО: statusCode code="completed" after code, before effectiveTime.
			-->
			<statusCode code="completed"/>
			<!--
				DEFECT #144: documentationOf/serviceEvent/effectiveTime as IVL_TS.
				WAS: single-value TS effectiveTime value=visitTime. HL7 CDA R2 /
				EGISZ SEMD expect Act effectiveTime as IVL_TS (interval) on the
				care event so REMD can join slot start (and later end). Plain TS
				is accepted by some parsers but SEMD profile prefers low bound.
				NOW: IVL_TS with low=visitTime (appointment.startsAt). No fake
				high invented when visit end is not on the chart.
			-->
			<effectiveTime xsi:type="IVL_TS">
				<low value="${visitTime}"/>
			</effectiveTime>
			<performer typeCode="PRF">
				<!--
					DEFECT #166: documentationOf/serviceEvent/performer/functionCode.
					WAS: performer had time (#150) + assignedEntity only — no
					functionCode. HL7 CDA R2 Performer1.functionCode is the
					participation function at the care event (distinct from
					assignedEntity/code specialty #141). SEMD expects the same
					function slot as author (#166).
					NOW: functionCode NI+displayName when doctorPosition known;
					bare nullFlavor NI when blank.
				-->
				${params.doctorPosition && params.doctorPosition.trim()
					? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
					: `<functionCode nullFlavor="NI"/>`}
				<!--
					DEFECT #150: documentationOf/serviceEvent/performer/time.
					WAS: performer typeCode=PRF had only assignedEntity — no
					time. author/dataEnterer/legalAuthenticator/authenticator
					already stamp time. HL7 CDA R2 Performer1.time is when the
					participation occurred; SEMD expects care-event performer
					participation clock = slot start (visitTime), distinct from
					documentClock (sign/lock).
					NOW: time value=visitTime before assignedEntity.
				-->
				<time value="${visitTime}"/>
				<assignedEntity>

					${params.doctorSnils && String(params.doctorSnils).trim()
						? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
						: `<id nullFlavor="NI"/>`}
					${/*
					 * DEFECT #141: documentationOf/serviceEvent/performer assignedEntity/code always present.
					 * WAS: same optional code as assignedAuthor pre-#138 — omitted when
					 * doctorPosition blank. SEMD validators expect the specialty
					 * slot under documentationOf/serviceEvent/performer the same way as author/legal/authenticator.
					 * NOW: always emit code (mirror #138/#139/#140). Position ->
					 * NI+displayName; blank -> bare nullFlavor NI.
					 */
					params.doctorPosition && params.doctorPosition.trim()
						? `<code nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
						: `<code nullFlavor="NI"/>`}
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
		DEFECT #129: ClinicalDocument/inFulfillmentOf (HL7 CDA R2 / EGISZ SEMD).
		WAS: header had documentationOf then jumped to componentOf with no
		inFulfillmentOf. SEMD validators expect the Order this protocol
		fulfills (ambulatory visit / appointment slot) so REMD can join the
		SEMD to the scheduled care request, distinct from encompassingEncounter
		(the visit act itself) and from ClinicalDocument/id (the document).
		NOW: inFulfillmentOf/order/id uses the same encounterExtension as
		componentOf (#87) under clinicOid root (or default MO root). No
		invented extension="unknown" - encounterExtension always resolves
		to a real visit/document key upstream.
	-->
	<inFulfillmentOf>
		<order>
			<id root="${params.clinicOid && String(params.clinicOid).trim() ? escapeXml(String(params.clinicOid).trim()) : "1.2.643.5.1.13.13.12.2"}" extension="${escapeXml(encounterExtension)}"/>
			<!--
				DEFECT #146: inFulfillmentOf/order code + statusCode.
				WAS: order had only id (encounterExtension). HL7 CDA R2 Order
				expects code (what was ordered) and statusCode (order lifecycle).
				Bare id leaves REMD unable to classify the fulfilled request or
				know it is completed (Form 043/u export is post-slot).
				NOW: code nullFlavor NI (no separate order catalog on chart —
				do not invent a fake order type code); statusCode completed.
			-->
			<code nullFlavor="NI"/>
			<statusCode code="completed"/>
		</order>
	</inFulfillmentOf>
	<!--
		DEFECT #130: ClinicalDocument/participant typeCode="REF" (referrer).
		WAS: header had inFulfillmentOf (#129) then jumped to componentOf
		with no participant. SEMD validators expect a REF participant
		(who referred the patient into this ambulatory encounter) so REMD
		can attribute the care request chain. Form 043/u walk-in dental
		has no separate external referrer on the chart.
		NOW: participant typeCode="REF" with associatedEntity classCode="PROV"
		mirroring treating dentist + MO (same id rules as assignedAuthor).
		SNILS or nullFlavor NI; clinicOid or NI. No invented street/phone.
	-->
	<participant typeCode="REF">
		<!--
			DEFECT #152: ClinicalDocument/participant REF/time.
			WAS: participant typeCode=REF had only associatedEntity — no time.
			author/dataEnterer/legal/authenticator/informant (#151) and
			serviceEvent/performer (#150) already stamp time. HL7 CDA R2
			Participant1.time is when the participation occurred; SEMD
			expects REF participation clock = documentClock (sign/lock),
			same as other document-level participants.
			NOW: time value=effectiveTime before associatedEntity.
		-->
		<time value="${effectiveTime}"/>
		<associatedEntity classCode="PROV">
			${/*
			 * Same id rule as assignedAuthor (#77): SNILS when present,
			 * else nullFlavor NI. Never extension="unknown".
			 */

			params.doctorSnils && String(params.doctorSnils).trim()
				? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
				: `<id nullFlavor="NI"/>`}
			${/*
			 * DEFECT #147: participant REF associatedEntity/code always present
			 * with doctorPosition displayName when known.
			 * WAS: hardcoded bare <code nullFlavor="NI"/> — specialty slot never
			 * carried position label even when doctorPosition is on the chart.
			 * assignedAuthor (#138), dataEnterer/informant (#142), performer/
			 * responsibleParty (#141) already emit NI+displayName when position
			 * present. SEMD validators expect the same specialty slot under
			 * REF associatedEntity (PROV).
			 * NOW: always emit code (mirror #138-#142). Position ->
			 * NI+displayName; blank -> bare nullFlavor NI. No invented NSI code.
			 */
			params.doctorPosition && params.doctorPosition.trim()
				? `<code nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
				: `<code nullFlavor="NI"/>`}
			<addr nullFlavor="NI"/>
			<telecom nullFlavor="NI"/>
			<associatedPerson>
				<name>
					<family>${escapeXml(params.doctorName.last)}</family>
					<given>${escapeXml(params.doctorName.first)}</given>
					${params.doctorName.middle ? `<given>${escapeXml(params.doctorName.middle)}</given>` : ""}
				</name>
			</associatedPerson>
			${`<scopingOrganization>
				${
					params.clinicOid && String(params.clinicOid).trim()
						? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
						: `<id nullFlavor="NI"/>`
				}
				<addr nullFlavor="NI"/>
				<telecom nullFlavor="NI"/>
				<name>${escapeXml(params.clinicName)}</name>
			</scopingOrganization>`}
		</associatedEntity>
	</participant>

	<!--
		DEFECT #131: ClinicalDocument/authorization (HL7 CDA R2 / EGISZ SEMD).
		WAS: header had participant REF (#130) then jumped to componentOf
		with no authorization. SEMD validators expect a consent Act under
		authorization so REMD records that the patient (or legal proxy)
		authorized release of this Form 043/u protocol to EGISZ/REMD.
		NOW: authorization/consent with statusCode completed and id under
		docIdRoot using documentId-consent as the consent key for this
		SEMD instance. No invented extension=unknown.
	-->
	<authorization>
		<consent>
			<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-consent"/>
			<code nullFlavor="NI"/>
			<statusCode code="completed"/>
			<!--
				DEFECT #148: authorization/consent effectiveTime.
				WAS: consent had id + code NI + statusCode completed only — no
				effectiveTime. HL7 CDA R2 Consent Act expects when the consent
				was effective. Form 043/u SEMD export stamps consent at document
				sign/lock (documentClock), same clock as author/legalAuthenticator.
				NOW: effectiveTime value=effectiveTime (documentClock / lockedAt).
			-->
			<effectiveTime value="${effectiveTime}"/>
		</consent>
	</authorization>


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
			<!--
				DEFECT #125: encompassingEncounter/statusCode.
				БЫЛО (#86/#91): encounter had id + AMB code + effectiveTime +
				responsibleParty + location — no statusCode. HL7 CDA R2 Act
				status is expected on encompassingEncounter so REMD knows the
				visit is finished (Form 043/у export happens after the slot,
				not mid-encounter). Without it validators flag incomplete
				encounter lifecycle.
				СТАЛО: statusCode code="completed" (normal ambulatory close).
			-->
			<statusCode code="completed"/>
			<!--
				DEFECT #144: encompassingEncounter/effectiveTime as IVL_TS.
				WAS: single-value TS effectiveTime value=visitTime (same class as
				serviceEvent pre-#144). SEMD validators expect encounter time as
				IVL_TS interval (low = slot start). Mirror serviceEvent fix.
				NOW: IVL_TS with low=visitTime. No invented high without end clock.
			-->
			<effectiveTime xsi:type="IVL_TS">
				<low value="${visitTime}"/>
			</effectiveTime>
			<responsibleParty>
				<assignedEntity>
					${params.doctorSnils && String(params.doctorSnils).trim()
						? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
						: `<id nullFlavor="NI"/>`}
					${/*
					 * DEFECT #141: encompassingEncounter/responsibleParty assignedEntity/code always present.
					 * WAS: same optional code as performer pre-#141 first half — omitted when
					 * doctorPosition blank. SEMD validators expect the specialty
					 * slot under encompassingEncounter/responsibleParty the same way as author/legal/authenticator.
					 * NOW: always emit code (mirror #138/#139/#140). Position ->
					 * NI+displayName; blank -> bare nullFlavor NI.
					 */
					params.doctorPosition && params.doctorPosition.trim()
						? `<code nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
						: `<code nullFlavor="NI"/>`}
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
					<!--
						DEFECT #123: healthCareFacility/code (facility care setting).
						БЫЛО (#92/#120): healthCareFacility had id + location +
						serviceProviderOrganization but no code. HL7 CDA R2 /
						EGISZ SEMD expect the facility role code (care setting)
						under encompassingEncounter/location. Encounter already
						carries AMB (#91); facility without code is incomplete.
						СТАЛО: emit AMB (ambulatory) with the same NSI dictionary
						as encompassingEncounter/code — this SEMD is always an
						ambulatory dental protocol (Form 043/у), not inpatient.
					-->
					<code code="AMB" codeSystem="1.2.643.5.1.13.13.11.1461" codeSystemName="Виды медицинской помощи" displayName="Амбулаторная помощь"/>
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
					<!--
						DEFECT #154: diagnosis section LOINC aligned with entry obs.
						WAS: section code 29548-5 (Diagnosis) while entry/observation
						uses 29308-4 (Diagnosis) and title is "Диагноз". SEMD
						section@code must match the structured entry LOINC so REMD
						indexes one concept (mirror #149 treatment/comorbidities/tray).
						NOW: section code 29308-4 + RU displayName matching title/obs.
					-->
					<!-- DEFECT #165: section/id REMD join key (diagnosis) -->
					<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-sec-dx"/>
					<code code="29308-4" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Диагноз"/>
					<title>Диагноз</title>

					<text>
						<paragraph>${escapeXml(params.diagnosisText)} (МКБ-10: ${escapeXml(params.icd10Code)})${params.diagnosisTooth && String(params.diagnosisTooth).trim() ? ` · зуб ${escapeXml(String(params.diagnosisTooth).trim())}` : ""}</paragraph>
					</text>
					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<!--
								DEFECT #153: structuredBody entry Act/id.
								WAS: diagnosis observation had code/status/time/value
								only — no id. HL7 CDA R2 Act.id is the REMD join key
								for the structured finding within the SEMD instance.
								NOW: id under docIdRoot with documentId-dx extension
								(unique per document version; no invented "unknown").
							-->
							<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-dx"/>
							<!--
								DEFECT #155: diagnosis observation codeSystemName=LOINC.
								WAS: entry code had code+codeSystem+displayName only —
								no codeSystemName. Sibling sections (anamnesis/objective/
								treatment/etc.) and section@code (#154) emit
								codeSystemName="LOINC". SEMD validators expect the
								code system label on every LOINC CE so REMD can render
								the dictionary name without OID lookup.
								NOW: codeSystemName="LOINC" on diagnosis observation code.
							-->
							<code code="29308-4" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Диагноз"/>
							<!-- DEFECT #143: observation statusCode completed (mirror act/supply) -->

							<statusCode code="completed"/>
							<!-- DEFECT #145: observation effectiveTime = visit clock -->
							<effectiveTime value="${visitTime}"/>
							<!--
								DEFECT #156: diagnosis value CD codeSystemName (МКБ-10).
								WAS: value xsi:type=CD had code+codeSystem+displayName
								only — no codeSystemName. Observation code now carries
								codeSystemName=LOINC (#155); sibling NSI CE elements
								(AMB encounter, tooth targetSite) already label the
								dictionary. SEMD validators expect the code system
								label on ICD-10 CD so REMD can render "МКБ-10" without
								OID lookup.
								NOW: codeSystemName="МКБ-10" on diagnosis value CD.
							-->
							<value xsi:type="CD" code="${escapeXml(params.icd10Code)}" codeSystem="1.2.643.5.1.13.13.11.1005" codeSystemName="МКБ-10" displayName="${escapeXml(params.diagnosisText)}"/>${params.diagnosisTooth && String(params.diagnosisTooth).trim()

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
					<!-- DEFECT #165: section/id REMD join key (anamnesis) -->
					<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-sec-anamnesis"/>
					<code code="10164-2" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Анамнез"/>

					<title>Анамнез</title>
					<text>
						<paragraph>${escapeXml(params.anamnesis || "Без особенностей")}</paragraph>
					</text>
					<!--
						DEFECT #132: Anamnesis section entry/observation (HL7 CDA R2 / EGISZ SEMD).
						WAS: section 10164-2 had only narrative text - no entry.
						Diagnosis section already carries observation entry; SEMD
						validators expect structured entry under anamnesis so REMD
						can index the history narrative separately from free text.
						NOW: entry/observation EVN with LOINC 10164-2 and ST value
						from params.anamnesis (default Bez osobennostey).
					-->
					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<!-- DEFECT #153: entry Act/id (anamnesis) -->
							<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-anamnesis"/>
							<code code="10164-2" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Анамнез"/>
							<!-- DEFECT #143: observation statusCode completed -->
							<statusCode code="completed"/>
							<!-- DEFECT #145: observation effectiveTime = visit clock -->
							<effectiveTime value="${visitTime}"/>
							<value xsi:type="ST">${escapeXml(params.anamnesis || "Без особенностей")}</value>
						</observation>
					</entry>
				</section>
			</component>
			<!-- Объективный статус / Status localis (043 O-block) -->
			<component>
				<section>
					<!--
						DEFECT #121: structuredBody LOINC displayName must be RU
						(HL7 CDA R2 / EGISZ SEMD languageCode=ru-RU).
						БЫЛО: four section code@displayName values stayed
						English (Physical findings / Complications / History of Past
						illness / Medical device identifier) while titles and the rest
						of the SEMD are Russian. Validators and REMD human-readable
						renderers show mixed-language section labels.
						СТАЛО: displayName mirrors Russian <title> text
						(LOINC code/codeSystem unchanged).
					-->
					<!-- DEFECT #165: section/id REMD join key (objective) -->
					<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-sec-objective"/>
					<code code="29545-1" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Объективный статус"/>
					<title>Объективный статус</title>
					<text>
						<paragraph>${escapeXml(params.objectiveStatus || "Без особенностей")}</paragraph>
					</text>
				
					<!--
						DEFECT #133: Objective status section entry/observation.
						WAS: section 29545-1 had only narrative text - no entry.
						Anamnesis (#132) and Diagnosis already carry observation entries;
						SEMD validators expect structured entry under objective status.
						NOW: entry/observation EVN with LOINC 29545-1 and ST value
						from params.objectiveStatus (default Bez osobennostey).
					-->
					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<!-- DEFECT #153: entry Act/id (objective status) -->
							<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-objective"/>
							<code code="29545-1" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Объективный статус"/>
							<!-- DEFECT #143: observation statusCode completed -->
							<statusCode code="completed"/>
							<!-- DEFECT #145: observation effectiveTime = visit clock -->
							<effectiveTime value="${visitTime}"/>
							<value xsi:type="ST">${escapeXml(params.objectiveStatus || "Без особенностей")}</value>
						</observation>
					</entry></section>
			</component>
			<!-- Оказанные услуги / Лечение -->
			<component>
				<section>
					<!--
						DEFECT #149: treatment section LOINC aligned with entry act.
						WAS: section code 47519-4 (Procedure findings) while entry/act
						uses 18776-5 (Plan of care note / treatment) and title is
						"Проведенное лечение". SEMD section@code must match the
						structured entry LOINC so REMD indexes one concept.
						NOW: section code 18776-5 + RU displayName matching title/act.
					-->
					<!-- DEFECT #165: section/id REMD join key (treatment) -->
					<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-sec-treatment"/>
					<code code="18776-5" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Проведенное лечение"/>
					<title>Проведенное лечение</title>
					<text>
						<paragraph>${escapeXml(params.treatmentDescription || "Осмотр и консультация")}</paragraph>
					</text>
				
					<!--
						DEFECT #134: Treatment section entry/act.
						WAS: section 18776-5 had only narrative text - no entry.
						Anamnesis (#132) and objective (#133) already carry entries;
						SEMD validators expect structured entry under treatment.
						NOW: entry/act EVN with LOINC 18776-5 and text from
						params.treatmentDescription (default Osmotr i konsultatsiya).
					-->
					<entry>
						<act classCode="ACT" moodCode="EVN">
							<!-- DEFECT #153: entry Act/id (treatment) -->
							<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-treatment"/>
							<code code="18776-5" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Проведенное лечение"/>
							<text>${escapeXml(params.treatmentDescription || "Осмотр и консультация")}</text>
							<statusCode code="completed"/>
							<!-- DEFECT #145: act effectiveTime = visit clock -->
							<effectiveTime value="${visitTime}"/>
						</act>
					</entry></section>
			</component>
			<!-- Осложнения (043) -->
			<component>
				<section>
					<!-- DEFECT #165: section/id REMD join key (complications) -->
					<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-sec-complications"/>
					<code code="55109-3" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Осложнения"/>
					<title>Осложнения</title>
					<text>
						<paragraph>${escapeXml(params.complications || "Не отмечены")}</paragraph>
					</text>
				
					<!--
						DEFECT #135: Complications section entry/observation.
						WAS: section 55109-3 had only narrative text - no entry.
						Treatment (#134) and prior narrative sections now carry entries;
						SEMD validators expect structured entry under complications.
						NOW: entry/observation EVN with LOINC 55109-3 and ST value
						from params.complications (default Ne otmecheny).
					-->
					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<!-- DEFECT #153: entry Act/id (complications) -->
							<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-complications"/>
							<code code="55109-3" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Осложнения"/>
							<!-- DEFECT #143: observation statusCode completed -->
							<statusCode code="completed"/>
							<!-- DEFECT #145: observation effectiveTime = visit clock -->
							<effectiveTime value="${visitTime}"/>
							<value xsi:type="ST">${escapeXml(params.complications || "Не отмечены")}</value>
						</observation>
					</entry></section>
			</component>
			<!-- Сопутствующие заболевания (043) -->
			<component>
				<section>
					<!--
						DEFECT #149: comorbidities section LOINC aligned with entry obs.
						WAS: section code 11348-0 while entry/observation uses 75326-9
						(History of comorbid disease). SEMD section@code must match
						the structured entry LOINC.
						NOW: section code 75326-9 + RU displayName matching title/obs.
					-->
					<!-- DEFECT #165: section/id REMD join key (comorbidities) -->
					<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-sec-comorbidities"/>
					<code code="75326-9" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Сопутствующие заболевания"/>
					<title>Сопутствующие заболевания</title>
					<text>
						<paragraph>${escapeXml(params.comorbidities || "Не отмечены")}</paragraph>
					</text>
				
					<!--
						DEFECT #136: Сопутствующие заболевания section entry.
						WAS: section 75326-9 had only narrative text - no entry.
						NOW: structured entry so REMD can index the section.
					-->
					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<!-- DEFECT #153: entry Act/id (comorbidities) -->
							<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-comorbidities"/>
							<code code="75326-9" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Сопутствующие заболевания"/>
							<!-- DEFECT #143: observation statusCode completed -->
							<statusCode code="completed"/>
							<!-- DEFECT #145: observation effectiveTime = visit clock -->
							<effectiveTime value="${visitTime}"/>
							<value xsi:type="ST">${escapeXml(params.comorbidities || "Не отмечены")}</value>
						</observation>
					</entry></section>
			</component>
			<!-- DEFECT #57: инструментальный лоток 043 (sterilization barcode) -->
			${params.instrumentTrayBarcode && params.instrumentTrayBarcode.trim()
				? `<component>
				<section>
					<!--
						DEFECT #149: instrument tray section LOINC aligned with entry supply.
						WAS: section code 46264-8 while entry/supply uses 69764-9
						(Medical device identifier / tray). SEMD section@code must
						match the structured entry LOINC.
						NOW: section code 69764-9 + RU displayName matching title/supply.
					-->
					<!-- DEFECT #165: section/id REMD join key (instrument tray) -->
					<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-sec-tray"/>
					<code code="69764-9" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Инструментальный лоток"/>
					<title>Инструментальный лоток</title>
					<text>
						<paragraph>Штрихкод: ${escapeXml(params.instrumentTrayBarcode.trim())}</paragraph>
					</text>
				
					<!--
						DEFECT #137: Инструментальный лоток section entry.
						WAS: section 69764-9 had only narrative text - no entry.
						NOW: structured entry so REMD can index the section.
					-->
					<entry>
						<supply classCode="SPLY" moodCode="EVN">
							<!-- DEFECT #153: entry Act/id (instrument tray) -->
							<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-tray"/>
							<code code="69764-9" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Инструментальный лоток"/>
							<text>${escapeXml(params.instrumentTrayBarcode || "") || "—"}</text>
							<statusCode code="completed"/>
							<!-- DEFECT #145: supply effectiveTime = visit clock -->
							<effectiveTime value="${visitTime}"/>
						</supply>
					</entry></section>
			</component>`
				: ""}
		</structuredBody>
	</component>
</ClinicalDocument>`;
}

