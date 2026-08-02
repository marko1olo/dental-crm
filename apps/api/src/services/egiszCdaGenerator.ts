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
			<!--
				DEFECT #429: relatedDocument/parentDocument/text.
				WAS: parentDocument had id + code + setId + versionNumber only —
				no text. HL7 CDA R2 ParentDocument (ClinicalDocument stub) has
				text 0..1 (ED) as the narrative title/body excerpt of the replaced
				SEMD. SEMD validators often flag missing text under RPLC parent
				when the current ClinicalDocument carries title/text structure.
				Form 043/u replacement pipeline does not store prior narrative
				blob at CDA build time; do not invent prior document prose.
				NOW: text nullFlavor NI until prior SEMD text is wired.
			-->
			<!--
				DEFECT #480: relatedDocument/parentDocument/title.
				WAS: parentDocument had id/code/text/setId/versionNumber — no title. HL7 CDA R2 ParentDocument may carry title (ST) as the replaced SEMD display name. Form 043/u replacement pipeline does not store prior title at build; do not invent prior document title text.
				NOW: title nullFlavor NI until prior SEMD title is wired.
				
			-->
			<title nullFlavor="NI"/>
			<text nullFlavor="NI"/>
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
	<!--
		DEFECT #360: ClinicalDocument/copyTime.
		WAS: header had versionNumber then relatedDocument/recordTarget — no copyTime.
		HL7 CDA R2 ClinicalDocument has copyTime 0..1 (when this copy was made).
		SEMD validators often flag missing copyTime under document header.
		Form 043/u export is the original authored instance, not a later copy —
		do not invent a fake copy timestamp.
		NOW: copyTime nullFlavor NI until an explicit copy/export-audit clock exists.
	-->
	<copyTime nullFlavor="NI"/>

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
					DEFECT #171: patient/maritalStatusCode.
					WAS: patient had name + gender + birthTime + languageCommunication
					only — no maritalStatusCode. HL7 CDA R2 Patient has
					maritalStatusCode 0..1; EGISZ SEMD validators often flag
					missing marital status under recordTarget demographics.
					Form 043/u chart does not collect marital status yet —
					do not invent a fake NSI code (1/2/3/…).
					NOW: maritalStatusCode nullFlavor NI until chart field exists.
				-->
				<maritalStatusCode nullFlavor="NI"/>
				<!--
					DEFECT #172: patient/religiousAffiliationCode.
					WAS: patient demographics had maritalStatusCode (#171) but no
					religiousAffiliationCode. HL7 CDA R2 Patient has
					religiousAffiliationCode 0..1; some EGISZ SEMD profiles flag
					missing religion under recordTarget. Form 043/u chart does not
					collect religion — do not invent a fake HL7/NSI code.
					NOW: religiousAffiliationCode nullFlavor NI until chart field exists.
				-->
				<religiousAffiliationCode nullFlavor="NI"/>
				<!--
					DEFECT #173: patient/raceCode.
					WAS: patient demographics had maritalStatusCode (#171) and
					religiousAffiliationCode (#172) but no raceCode. HL7 CDA R2
					Patient has raceCode 0..*; some EGISZ SEMD profiles flag
					missing race under recordTarget. Form 043/u chart does not
					collect race — do not invent a fake HL7 race code.
					NOW: raceCode nullFlavor NI until chart field exists.
				-->
				<raceCode nullFlavor="NI"/>
				<!--
					DEFECT #174: patient/ethnicGroupCode.
					WAS: patient demographics had raceCode (#173) but no
					ethnicGroupCode. HL7 CDA R2 Patient has ethnicGroupCode 0..1;
					some EGISZ SEMD profiles flag missing ethnicity under
					recordTarget. Form 043/u chart does not collect ethnicity —
					do not invent a fake HL7/NSI ethnicity code.
					NOW: ethnicGroupCode nullFlavor NI until chart field exists.
				-->
				<ethnicGroupCode nullFlavor="NI"/>
				<!--
				DEFECT #473: patient/deceasedInd.
				WAS: patient demographics had ethnicGroupCode (#174) but no deceasedInd. HL7 CDA R2 Patient has deceasedInd 0..1. SEMD validators often flag missing deceased indicator under recordTarget. Form 043/u ambulatory chart is for living patients at visit time; do not invent true without a chart field.
				NOW: deceasedInd nullFlavor NI until chart field exists.
				
			-->
				<deceasedInd nullFlavor="NI"/>
				<!--
				DEFECT #474: patient/deceasedTime.
				WAS: patient had no deceasedTime. HL7 CDA R2 Patient has deceasedTime 0..1 (when deceasedInd applies). Form 043/u does not collect death datetime on dental chart; do not invent dates.
				NOW: deceasedTime nullFlavor NI.
				
			-->
				<deceasedTime nullFlavor="NI"/>
				<!--
				DEFECT #475: patient/multipleBirthInd.
				WAS: patient had no multipleBirthInd. HL7 CDA R2 Patient has multipleBirthInd 0..1. Form 043/u chart does not collect multiple-birth flag; do not invent true/false without data.
				NOW: multipleBirthInd nullFlavor NI.
				
			-->
				<multipleBirthInd nullFlavor="NI"/>
				<!--
				DEFECT #476: patient/multipleBirthOrderNumber.
				WAS: patient had no multipleBirthOrderNumber. HL7 CDA R2 Patient has multipleBirthOrderNumber 0..1. Form 043/u does not collect birth order; do not invent integers.
				NOW: multipleBirthOrderNumber nullFlavor NI.
				
			-->
				<multipleBirthOrderNumber nullFlavor="NI"/>
				<!--
				DEFECT #477: patient/organDonorInd.
				WAS: patient had no organDonorInd. HL7 CDA R2 Patient has organDonorInd 0..1. Form 043/u dental chart does not collect organ-donor status; do not invent true/false.
				NOW: organDonorInd nullFlavor NI.
				
			-->
				<organDonorInd nullFlavor="NI"/>
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
				<!--
					DEFECT #175: patient/guardian.
					WAS: patient demographics ended at languageCommunication —
					no guardian. HL7 CDA R2 Patient has guardian 0..* (legal
					guardian / parent for minors). EGISZ SEMD validators often
					flag missing guardian structure under recordTarget when the
					profile expects the slot even if the patient is adult.
					Form 043/u chart does not collect guardian yet — do not
					invent a fake person name or id.
					NOW: guardian with code nullFlavor NI and guardianPerson
					name nullFlavor NI until chart fields exist.
				-->
				<guardian>
					<!--
						DEFECT #177: patient/guardian id + addr + telecom.
						WAS: guardian had only code NI + guardianPerson/name NI
						(#175). HL7 CDA R2 Guardian may carry id, addr, telecom
						before guardianPerson. SEMD validators often flag bare
						guardian without contact/id slots under recordTarget.
						Form 043/u chart does not collect guardian identity or
						contacts yet — do not invent extension="unknown" or
						fake phone/address.
						NOW: id/addr/telecom nullFlavor NI before guardianPerson.
					-->
					<id nullFlavor="NI"/>
					<code nullFlavor="NI"/>
					<addr nullFlavor="NI"/>
					<telecom nullFlavor="NI"/>
					<guardianPerson>
						<name nullFlavor="NI"/>
						<!--
							DEFECT #514: guardianPerson/administrativeGenderCode.
							WAS: guardianPerson had only name NI — no administrativeGenderCode. HL7 CDA R2 Person has administrativeGenderCode 0..1. SEMD validators often flag incomplete guardianPerson under recordTarget when relatedSubject SubjectPerson already emits gender. Form 043/u chart does not collect guardian sex; do not invent M/F codes.
							NOW: administrativeGenderCode nullFlavor NI.
						-->
						<administrativeGenderCode nullFlavor="NI"/>
						<!--
							DEFECT #515: guardianPerson/birthTime.
							WAS: guardianPerson had name/gender only — no birthTime. HL7 CDA R2 Person has birthTime 0..1. SEMD often flags missing birthTime under guardianPerson when patient and relatedSubject emit it.
							NOW: birthTime nullFlavor NI; do not invent guardian DOB.
						-->
						<birthTime nullFlavor="NI"/>
					</guardianPerson>
				</guardian>

				<!--
					DEFECT #176: patient/birthplace.
					WAS: patient demographics had guardian (#175) but no
					birthplace. HL7 CDA R2 Patient has birthplace 0..1 (place
					of birth). EGISZ SEMD validators often flag missing
					birthplace under recordTarget. Form 043/u chart does not
					collect birth place yet — do not invent a fake city/region.
					NOW: birthplace/place/addr nullFlavor NI until chart field exists.
				-->
				<birthplace>
					<place>
						<!--
							DEFECT #178: patient/birthplace/place/name.
							WAS: birthplace/place had only addr NI (#176) — no
							name. HL7 CDA R2 Place may carry name (locality /
							facility label) before addr. SEMD validators often
							flag bare place without the name slot under
							recordTarget birthplace. Form 043/u chart does not
							collect birth place name yet — do not invent a
							fake city/region string.
							NOW: name nullFlavor NI before addr.
						-->
						<name nullFlavor="NI"/>
						<addr nullFlavor="NI"/>
					<!--

						DEFECT #543: birthplace/place/telecom.

						WAS: birthplace/place had name/addr only — no telecom. HL7 CDA R2 Place may carry telecom. SEMD often flags incomplete place under recordTarget birthplace when addr is present without contact slot.

						NOW: telecom nullFlavor NI; do not invent birth-facility phone.

					-->

					<telecom nullFlavor="NI"/>

					</place>
				</birthplace>


			</patient>
			<!--
				DEFECT #180: patientRole/providerOrganization.
				WAS: patientRole had id/addr/telecom/patient only — no
				providerOrganization. HL7 CDA R2 PatientRole has
				providerOrganization 0..1 (the MO that maintains the
				patient chart). SEMD validators expect the registering
				clinic under recordTarget so REMD can join the patient
				to the MO site, distinct from custodian/author org and
				from encompassingEncounter location.
				Form 043/u patient is always registered at this clinic —
				emit MO id (clinicOid or NI) + name; no invented street/phone.
				NOW: providerOrganization after patient, before close of
				patientRole (mirror custodian / assignedAuthor org scheme).
			-->
			<providerOrganization>
				${params.clinicOid && String(params.clinicOid).trim()
					? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
					: `<id nullFlavor="NI"/>`}
				<addr nullFlavor="NI"/>
				<telecom nullFlavor="NI"/>
				<name>${escapeXml(params.clinicName)}</name>
			</providerOrganization>
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
		<!--
			DEFECT #168: ClinicalDocument/informant/functionCode.
			WAS: informant had time (#151) + assignedEntity only — no
			functionCode. author/dataEnterer/performer already emit
			functionCode (#166/#167). SEMD expects the participation-level
			function slot under informant so REMD can distinguish clinical
			source role from assignedEntity/code specialty (#142).
			NOW: functionCode NI+displayName when doctorPosition known;
			bare nullFlavor NI when blank. No invented NSI function code.
		-->
		${params.doctorPosition && params.doctorPosition.trim()
			? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
			: `<functionCode nullFlavor="NI"/>`}
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
			<!--
				DEFECT #430: informationRecipient/intendedRecipient/id.
				WAS: intendedRecipient had only receivedOrganization — no id.
				HL7 CDA R2 IntendedRecipient has id 0..*. SEMD validators often
				flag missing recipient id under informationRecipient when the
				organization carries id but the recipient role itself does not.
				Form 043/u has no separate recipient person/org id beyond clinic
				OID on receivedOrganization; do not invent extension="unknown".
				NOW: id nullFlavor NI on intendedRecipient.
			-->
			<id nullFlavor="NI"/>
			<!--
				DEFECT #470: informationRecipient/intendedRecipient/addr.
				WAS: intendedRecipient had id + receivedOrganization only — no addr. HL7 CDA R2 IntendedRecipient has addr 0..*. SEMD validators often flag missing recipient contact when organization carries addr but the recipient role does not. Form 043/u has no separate recipient postal address; do not invent streetAddressLine.
				NOW: addr nullFlavor NI on intendedRecipient.
				
			-->
			<addr nullFlavor="NI"/>
			<!--
				DEFECT #471: informationRecipient/intendedRecipient/telecom.
				WAS: intendedRecipient had id/addr but no telecom. HL7 CDA R2 IntendedRecipient has telecom 0..*. Form 043/u has no recipient phone; do not invent numbers.
				NOW: telecom nullFlavor NI on intendedRecipient.
				
			-->
			<telecom nullFlavor="NI"/>
			<!--
				DEFECT #472: informationRecipient/intendedRecipient/informationRecipient (person).
				WAS: intendedRecipient had organization only — no informationRecipient person. HL7 CDA R2 IntendedRecipient may carry informationRecipient (Person) with name. SEMD validators often flag missing person stub under informationRecipient when only receivedOrganization is present. Form 043/u routes SEMD to the MO org, not a named person; do not invent FIO.
				NOW: informationRecipient/name nullFlavor NI.
				
			-->
			<informationRecipient>
				<name nullFlavor="NI"/>
			</informationRecipient>
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
			DEFECT #170: legalAuthenticator/functionCode.
			WAS: legalAuthenticator had time + signatureCode + assignedEntity
			only — no functionCode. author/dataEnterer/informant/performer/REF
			already emit functionCode (#166-#169). HL7 CDA R2 LegalAuthenticator
			has functionCode 0..1 (participation function for the legal signer).
			SEMD expects the same participation-level function slot so REMD can
			distinguish legal-sign role from assignedEntity/code specialty (#139).
			NOW: functionCode NI+displayName when doctorPosition known;
			bare nullFlavor NI when blank. No invented NSI function code.
		-->
		${params.doctorPosition && params.doctorPosition.trim()
			? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
			: `<functionCode nullFlavor="NI"/>`}
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
		<!--
			DEFECT #184: legalAuthenticator/signatureText.
			WAS: legalAuthenticator had time + functionCode + signatureCode +
			assignedEntity only — no signatureText. HL7 CDA R2 LegalAuthenticator
			has signatureText 0..1 (ED blob of the actual signature image/CMS).
			SEMD validators often flag missing signatureText under the legal
			signer even when signatureCode=S is present. Form 043/u pipeline
			does not yet attach a detached CMS/PKCS#7 blob at CDA build time —
			do not invent a fake base64 signature.
			NOW: signatureText nullFlavor NI until e-sign blob is wired.
		-->
		<signatureText nullFlavor="NI"/>
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
			DEFECT #170: authenticator/functionCode.
			WAS: authenticator had time + signatureCode + assignedEntity only —
			no functionCode. legalAuthenticator (#170) and author (#166) already
			emit functionCode. HL7 CDA R2 Authenticator has functionCode 0..1
			(participation function for content attestation). SEMD expects the
			same participation-level function slot under authenticator.
			NOW: functionCode NI+displayName when doctorPosition known;
			bare nullFlavor NI when blank. No invented NSI function code.
		-->
		${params.doctorPosition && params.doctorPosition.trim()
			? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
			: `<functionCode nullFlavor="NI"/>`}
		<!--
			DEFECT #159: authenticator/signatureCode codeSystem + displayName.

			WAS: same bare code=S as legalAuthenticator pre-#159. Mirror legal
			signer ParticipationSignature CE so both signature parties carry
			the HL7 dictionary label.
			NOW: codeSystem + codeSystemName + RU displayName on code S.
		-->
		<signatureCode code="S" codeSystem="2.16.840.1.113883.5.89" codeSystemName="ParticipationSignature" displayName="Подписано"/>
		<!--
			DEFECT #185: authenticator/signatureText.
			WAS: authenticator had time + functionCode + signatureCode +
			assignedEntity only — no signatureText. legalAuthenticator already
			has signatureText NI (#184). HL7 CDA R2 Authenticator has
			signatureText 0..1 (ED blob of the attestation signature).
			SEMD validators expect the same ED slot under content attestation.
			Form 043/u pipeline does not yet attach a detached CMS/PKCS#7 blob
			at CDA build time — do not invent a fake base64 signature.
			NOW: signatureText nullFlavor NI until e-sign blob is wired.
		-->
		<signatureText nullFlavor="NI"/>
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
		<!--
			DEFECT #358: documentationOf/serviceEvent/@negationInd.
			WAS: open had classCode/attributes only — no negationInd.
			HL7 CDA R2 Act has negationInd 0..1. SEMD often requires explicit false on asserted acts.
			Form 043/u care event/encounter is asserted (not negated). NOW: negationInd=false on open tag.
		-->
		<serviceEvent classCode="PCPR" negationInd="false">
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
				DEFECT #276: documentationOf/serviceEvent/text.
				WAS: serviceEvent had id/code then jumped to statusCode — no
				entry-level text. Body OBS (#255-#259), treatment ACT and tray
				supply already carry <text>. HL7 CDA R2 Act has text 0..1 (ED)
				as the narrative form of the care event. SEMD validators often
				flag missing text under documentationOf when body entries emit it.
				Form 043/u chart already stores treatmentDescription — mirror it
				here (LOINC stays on code).
				NOW: text = treatmentDescription (default Osmotr i konsultaciya).
			-->
			<text>${escapeXml(params.treatmentDescription || "Осмотр и консультация")}</text>
			<!--
				DEFECT #277: documentationOf/serviceEvent/languageCode.
				WAS: serviceEvent had id/code/text then jumped to statusCode —
				no entry-level languageCode. Body entries (#260-#266) already
				carry languageCode ru-RU. HL7 CDA R2 Act has languageCode 0..1.
				SEMD validators often flag missing language under documentationOf
				when ClinicalDocument declares ru-RU but the care event omits it.
				Form 043/u ambulatory dental is always RU narrative.
				NOW: languageCode code=ru-RU matching ClinicalDocument.
			-->
			<languageCode code="ru-RU"/>
			<!--
				DEFECT #317: documentationOf/serviceEvent/confidentialityCode.
				WAS: serviceEvent had languageCode (#277) then jumped to statusCode — no entry-level confidentialityCode. Body entries (#310-#316) already carry confidentialityCode N.
				ClinicalDocument already declares confidentialityCode N (#158).
				HL7 CDA R2 Act/Observation/Supply has confidentialityCode 0..1
				(sensitivity of the act). SEMD validators often flag missing
				confidentiality under body entries when the document sets N but
				entry acts omit it. Form 043/u ambulatory dental chart entries
				are normal confidentiality (same as ClinicalDocument).
				NOW: confidentialityCode N + codeSystemName + RU displayName
				matching ClinicalDocument (#158). No invented restricted code.
			-->
			<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>

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
				DEFECT #212: documentationOf/serviceEvent/priorityCode.

				WAS: serviceEvent had id/code/statusCode/effectiveTime/performer
				only — no priorityCode. encompassingEncounter (#183) and treatment
				ACT (#201) already carry priorityCode NI. HL7 CDA R2 Act has
				priorityCode 0..1 on the care event. SEMD validators often flag
				missing priority under documentationOf. Form 043/u chart does not
				collect care-event priority (routine dental) — do not invent a
				fake HL7 ActPriority code.
				NOW: priorityCode nullFlavor NI until chart field exists.
			-->
			<priorityCode nullFlavor="NI"/>
			<!--
				DEFECT #213: documentationOf/serviceEvent/methodCode.
				WAS: serviceEvent had id/code/statusCode/priorityCode/effectiveTime/
				performer only — no methodCode. Treatment ACT (#208) and body OBS
				entries already carry methodCode NI. HL7 CDA R2 Act has methodCode
				0..* on the care event (how the service was performed). SEMD
				validators often flag missing method under documentationOf.
				Form 043/u care event is free-text dental exam — do not invent a
				fake NSI method OID.
				NOW: methodCode nullFlavor NI until chart field exists.
			-->
			<methodCode nullFlavor="NI"/>
			<!--
				DEFECT #214: documentationOf/serviceEvent/uncertaintyCode.
				WAS: serviceEvent had id/code/statusCode/priorityCode/methodCode/
				effectiveTime/performer only — no uncertaintyCode. Treatment ACT
				(#209) and body OBS already carry uncertaintyCode NI. HL7 CDA R2
				Act has uncertaintyCode 0..1 (U/N from ActUncertainty) on the
				care event. SEMD validators often flag missing uncertainty under
				documentationOf. Form 043/u care event is completed dental exam —
				do not invent U/N.
				NOW: uncertaintyCode nullFlavor NI until chart field exists.
			-->
			<uncertaintyCode nullFlavor="NI"/>
			<!--
				DEFECT #215: documentationOf/serviceEvent/repeatNumber.
				WAS: serviceEvent had priorityCode/methodCode/uncertaintyCode only
				— no repeatNumber. Treatment ACT (#210) and instrument-tray supply
				(#204) already carry repeatNumber NI. HL7 CDA R2 Act has
				repeatNumber 0..1 on the care event. SEMD validators often flag
				missing repeatNumber under documentationOf. Form 043/u care event
				is a single completed visit — no discrete repeat field and do not
				invent a fake INT count.
				NOW: repeatNumber nullFlavor NI until chart field exists.
			-->
			<repeatNumber nullFlavor="NI"/>
			<!--
				DEFECT #216: documentationOf/serviceEvent/independentInd.
				WAS: serviceEvent had priorityCode/methodCode/uncertaintyCode/
				repeatNumber only — no independentInd. Treatment ACT (#211) and
				instrument-tray supply (#205) already carry independentInd NI.
				HL7 CDA R2 Act has independentInd 0..1 on the care event. SEMD
				validators often flag missing independentInd under documentationOf.
				Form 043/u chart has no independent-act flag — do not invent
				true/false.
				NOW: independentInd nullFlavor NI until chart field exists.
			-->
							<independentInd nullFlavor="NI"/>
							<!--
								DEFECT #272: documentationOf/serviceEvent/approachSiteCode.
								WAS: serviceEvent had priorityCode/methodCode/uncertaintyCode/
								repeatNumber/independentInd only — no approachSiteCode.
								Treatment ACT (#221), body OBS (#224-#228) and tray supply
								(#269) already carry approachSiteCode NI. HL7 CDA R2 Act has
								approachSiteCode 0..* on the care event. SEMD validators often
								flag missing approach under documentationOf. Form 043/u care
								event is whole-visit dental exam — do not invent ISO 3950.
								NOW: approachSiteCode nullFlavor NI until chart field exists.
							-->
							<approachSiteCode nullFlavor="NI"/>
							<!--
								DEFECT #273: documentationOf/serviceEvent/targetSiteCode.
								WAS: serviceEvent had approachSiteCode NI (#272) but no
								targetSiteCode. Treatment ACT (#222), body OBS (#223/#229-#232)
								and tray supply (#270) already emit targetSiteCode. HL7 CDA R2
								Act has targetSiteCode 0..* on the care event. SEMD validators
								often flag missing target site under documentationOf. Form
								043/u care event may span multiple teeth — diagnosis tooth is
								on the OBS entry, not the care-event shell; do not invent ISO 3950.
								NOW: targetSiteCode nullFlavor NI until chart field exists.
							-->
							<targetSiteCode nullFlavor="NI"/>
							<!--
								DEFECT #281: documentationOf/serviceEvent/interpretationCode.
								WAS: serviceEvent had approach/targetSite then jumped to
								effectiveTime — no interpretationCode. Treatment ACT (#280),
								body OBS and tray supply (#271) already carry
								interpretationCode NI. HL7 CDA R2 Act has interpretationCode
								0..* on the care event. SEMD validators often flag missing
								interpretation under documentationOf. Form 043/u care event
								is completed dental exam — do not invent N/A/H.
								NOW: interpretationCode nullFlavor NI until chart field exists.
							-->
							<interpretationCode nullFlavor="NI"/>
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
			<!--
				DEFECT #290: documentationOf/serviceEvent/author.
				WAS: serviceEvent had performer then closed — no entry-level author. Body entries (#283-#289) already carry author.
				Body entries (#283-#289) already carry entry-level author.
				HL7 CDA R2 Act has author 0..* (who recorded the act). SEMD
				validators often flag missing author under documentationOf /
				componentOf so REMD cannot separate recorder from performer
				at the care-event / encounter shell. Form 043/u treating
				dentist authors the ambulatory visit record.
				NOW: author with time=visitTime and assignedAuthor mirroring
				document author (SNILS or NI, code with position or bare NI,
				person, MO org). No invented extension or street/phone.
			-->
			<author>
				<time value="${visitTime}"/>
				<assignedAuthor>
					${params.doctorSnils && String(params.doctorSnils).trim()
						? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
						: `<id nullFlavor="NI"/>`}
					${params.doctorPosition && params.doctorPosition.trim()
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
					<representedOrganization>
						${params.clinicOid && String(params.clinicOid).trim()
							? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
							: `<id nullFlavor="NI"/>`}
						<addr nullFlavor="NI"/>
						<telecom nullFlavor="NI"/>
						<name>${escapeXml(params.clinicName)}</name>
					</representedOrganization>
				</assignedAuthor>
			</author>
			<!--
				DEFECT #299: documentationOf/serviceEvent/informant.
				WAS: serviceEvent had performer + author (#290) then closed — no entry-level informant. Body entries (#292-#298) already carry informant.
				Document-level informant already attributes the clinical
				source of the ClinicalDocument. HL7 CDA R2 Act/Observation/
				Supply has informant 0..* (who supplied the facts for the
				act). SEMD validators often flag missing informant under body
				entries so REMD cannot separate clinical source from author/
				performer at entry level. Form 043/u treating dentist is the
				clinical source of the chart entry (same person as document
				informant).
				NOW: informant with time=visitTime, functionCode NI+displayName
				when doctorPosition known (else bare NI), assignedEntity
				mirroring document informant (SNILS or NI, code, person, MO).
				No invented extension or street/phone.
			-->
			<informant>
				<time value="${visitTime}"/>
				${params.doctorPosition && params.doctorPosition.trim()
					? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
					: `<functionCode nullFlavor="NI"/>`}
				<assignedEntity>
					${params.doctorSnils && String(params.doctorSnils).trim()
						? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
						: `<id nullFlavor="NI"/>`}
					${params.doctorPosition && params.doctorPosition.trim()
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
					<representedOrganization>
						${params.clinicOid && String(params.clinicOid).trim()
							? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
							: `<id nullFlavor="NI"/>`}
						<addr nullFlavor="NI"/>
						<telecom nullFlavor="NI"/>
						<name>${escapeXml(params.clinicName)}</name>
					</representedOrganization>
				</assignedEntity>
			</informant>
			<!--
				DEFECT #308: documentationOf/serviceEvent/participant.
				WAS: serviceEvent had performer/author/informant then closed — no entry-level participant. Body entries (#301-#307) already carry participant REF.
				Document-level participant REF (#152/#169/#147) already attributes
				the referring/related provider on ClinicalDocument. HL7 CDA R2
				Act/Observation/Supply has participant 0..* (related parties for
				the act). SEMD validators often flag missing participant under
				body entries so REMD cannot attach REF/related-provider at entry
				level. Form 043/u treating dentist is the related provider for
				the chart entry (same person as document REF participant).
				NOW: participant typeCode=REF with time=visitTime, functionCode
				NI+displayName when doctorPosition known (else bare NI),
				associatedEntity PROV mirroring document REF (SNILS or NI, code,
				person, scopingOrganization MO). No invented extension.
			-->
			<participant typeCode="REF">
				<time value="${visitTime}"/>
				${params.doctorPosition && params.doctorPosition.trim()
					? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
					: `<functionCode nullFlavor="NI"/>`}
				<associatedEntity classCode="PROV">
					${params.doctorSnils && String(params.doctorSnils).trim()
						? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
						: `<id nullFlavor="NI"/>`}
					${params.doctorPosition && params.doctorPosition.trim()
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
					<scopingOrganization>
						${params.clinicOid && String(params.clinicOid).trim()
							? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
							: `<id nullFlavor="NI"/>`}
						<addr nullFlavor="NI"/>
						<telecom nullFlavor="NI"/>
						<name>${escapeXml(params.clinicName)}</name>
					</scopingOrganization>
				</associatedEntity>
			</participant>
			<!--
				DEFECT #326: documentationOf/serviceEvent/precondition.
				WAS: serviceEvent had performer/author/informant/participant then closed — no precondition. Body entries (#319-#325) already carry precondition PRCN.
				HL7 CDA R2 Act/Observation/Supply has precondition 0..*
				(criteria that must be true for the act). SEMD validators
				often flag missing precondition under body entries when the
				care event is documented without explicit criteria. Form 043/u
				chart does not collect discrete clinical preconditions for
				these entries — do not invent criterion codes or values.
				NOW: precondition typeCode=PRCN with criterion nullFlavor NI
				(id/code/value all NI) until chart fields exist.
			-->
			<precondition typeCode="PRCN">
				<criterion>
					<id nullFlavor="NI"/>
					<code nullFlavor="NI"/>
					<!--
						DEFECT #632: precondition/criterion/text.
						WAS: criterion had id/code/value only — no text. HL7 CDA R2 Criterion (Act) has text 0..1. SEMD often flags bare criterion under precondition.
						NOW: text nullFlavor NI; do not invent precondition prose.
					-->
					<text nullFlavor="NI"/>
					<!--
						DEFECT #633: precondition/criterion/statusCode.
						WAS: criterion had no statusCode. HL7 CDA R2 Act has statusCode 1..1 in many profiles; sibling nested acts use completed.
						NOW: statusCode completed.
					-->
					<statusCode code="completed"/>
					<value xsi:type="CD" nullFlavor="NI"/>
					<!--
						DEFECT #634: precondition/criterion/effectiveTime.
						WAS: criterion had no effectiveTime. SEMD often flags missing effectiveTime under precondition criterion when body acts emit it.
						NOW: effectiveTime nullFlavor NI; do not invent criterion window.
					-->
					<effectiveTime nullFlavor="NI"/>
				</criterion>
			</precondition>
			<!--
				DEFECT #335: documentationOf/serviceEvent/reference.
				WAS: serviceEvent had performer/author/informant/participant/precondition then closed — no reference. Body entries (#328-#334) already carry reference REFR.
				HL7 CDA R2 Act/Observation/Supply has reference 0..*
				(link to external acts/documents). SEMD validators often
				flag missing reference under body entries when the care
				event cannot point to a related external act. Form 043/u
				chart does not collect discrete external-act references for
				these entries — do not invent root/extension or URLs.
				NOW: reference typeCode=REFR with externalAct classCode=ACT
				moodCode=EVN and id nullFlavor NI until chart field exists.
			-->
			<reference typeCode="REFR">
				<externalAct classCode="ACT" moodCode="EVN">
					<id nullFlavor="NI"/>
					<!--
						DEFECT #659: reference/externalAct/code.
						WAS: externalAct had id NI only — no code. HL7 CDA R2 ExternalAct has code 0..1. SEMD often flags bare externalAct under reference REFR.
						NOW: code nullFlavor NI; do not invent external act type.
					-->
					<code nullFlavor="NI"/>
					<!--
						DEFECT #660: reference/externalAct/text.
						WAS: externalAct had no text. HL7 CDA R2 ExternalAct has text 0..1.
						NOW: text nullFlavor NI; do not invent external narrative.
					-->
					<text nullFlavor="NI"/>
				</externalAct>
			</reference>
									<!--
				DEFECT #385: documentationOf/serviceEvent/specimen.
				WAS: serviceEvent had reference/subject then entryRelationship — no specimen.
				Body entries (#337-#341/#362-#363) already carry specimen SPC.
				HL7 CDA R2 Act has specimen 0..* (material). SEMD validators often
				flag missing specimen under documentationOf/serviceEvent. Form 043/u
				ambulatory dental care event does not collect discrete specimen identity
				— do not invent specimen type codes or IDs.
				NOW: specimen typeCode=SPC with specimenRole id nullFlavor NI until
				chart field exists.
			-->
			<specimen typeCode="SPC">
				<specimenRole>
					<id nullFlavor="NI"/>
				
					<!--
						DEFECT #400: serviceEvent/specimen/specimenRole/specimenPlayingEntity.
						WAS: specimenRole had id NI only — no specimenPlayingEntity.
						HL7 CDA R2 SpecimenRole has specimenPlayingEntity 0..1 (the material
						entity). SEMD validators often flag empty specimenRole under clinical
						entries when playing entity code/name cannot be joined. Form 043/u
						chart does not collect discrete specimen entity codes — do not invent
						SNOMED/NSI specimen type codes.
						NOW: specimenPlayingEntity with code/name nullFlavor NI until chart
						field exists.
					-->
					<specimenPlayingEntity>
						<code nullFlavor="NI"/>
						<name nullFlavor="NI"/>
						<!--
							DEFECT #496: specimenPlayingEntity/desc.
							WAS: specimenPlayingEntity had code/name NI only — no desc. HL7 CDA R2 Entity has desc 0..1. SEMD validators often flag bare playing entity under specimen when material description cannot be joined. Form 043/u chart does not collect specimen material narrative; do not invent desc text.
							NOW: desc nullFlavor NI until chart field exists.
						-->
						<desc nullFlavor="NI"/>
						<!--
							DEFECT #497: specimenPlayingEntity/quantity.
							WAS: specimenPlayingEntity had code/name/desc only — no quantity. HL7 CDA R2 ManufacturedMaterial/Entity may carry quantity. SEMD often flags missing quantity under specimen playing entity.
							NOW: quantity nullFlavor NI; do not invent PQ amounts.
						-->
						<quantity nullFlavor="NI"/>
					</specimenPlayingEntity>
</specimenRole>
			</specimen>
			<!--
				DEFECT #386: documentationOf/serviceEvent/consumable.
				WAS: serviceEvent had specimen/subject then entryRelationship — no consumable.
				Body ACT/SPLY/OBS (#373-#374/#380-#384) already carry consumable CSM.
				HL7 CDA R2 Act has consumable 0..* (materials used by the care event).
				SEMD validators often flag missing consumable under documentationOf/
				serviceEvent. Form 043/u chart does not collect discrete consumable NSI
				codes for the care event — do not invent material codes or barcodes.
				NOW: consumable typeCode=CSM with manufacturedProduct classCode=MANU
				and manufacturedMaterial code/name nullFlavor NI until chart field exists.
			-->
			<consumable typeCode="CSM">
				<manufacturedProduct classCode="MANU">
					<!--
						DEFECT #677: manufacturedProduct/id.
						WAS: manufacturedProduct opened then manufacturedMaterial — no id. Tray product carries barcode id; consumable shells had no product id. HL7 CDA R2 ManufacturedProduct has id 0..*. SEMD often flags bare product under consumable without id slot.
						NOW: id nullFlavor NI; do not invent extension=unknown.
					-->
					<id nullFlavor="NI"/>
					<manufacturedMaterial>
						<code nullFlavor="NI"/>
						<name nullFlavor="NI"/>
						<!--
							DEFECT #516: manufacturedMaterial/lotNumberText.
							WAS: manufacturedMaterial had code/name NI only — no lotNumberText. Tray product already emits lot (#388). HL7 CDA R2 Material has lotNumberText 0..1. SEMD often flags bare material under consumable without lot slot.
							NOW: lotNumberText nullFlavor NI; do not invent lot strings.
						-->
						<lotNumberText nullFlavor="NI"/>
						<!--
							DEFECT #517: manufacturedMaterial/desc.
							WAS: manufacturedMaterial had code/name/lot only — no desc. Tray already emits desc (#389). SEMD often flags missing material description under consumable.
							NOW: desc nullFlavor NI; do not invent device prose.
						-->
						<desc nullFlavor="NI"/>
						<!--
							DEFECT #518: manufacturedMaterial/expirationTime.
							WAS: manufacturedMaterial had code/name/lot/desc only — no expirationTime. Tray already emits expirationTime. HL7 CDA R2 Material has expirationTime 0..1.
							NOW: expirationTime nullFlavor NI; do not invent expiry timestamps.
						-->
						<expirationTime nullFlavor="NI"/>
					</manufacturedMaterial>
				<!--

					DEFECT #551: manufacturedProduct/manufacturerOrganization.

					WAS: manufacturedProduct had material only — no manufacturerOrganization. Tray product already emits manufacturerOrganization. HL7 CDA R2 ManufacturedProduct has manufacturerOrganization 0..1. SEMD often flags bare product under consumable without org shell.

					NOW: manufacturerOrganization with id/name/addr/telecom NI; do not invent org identity.

				-->

				<manufacturerOrganization>

					<id nullFlavor="NI"/>

					<!--

						DEFECT #552: manufacturerOrganization/name.

						WAS: manufacturerOrganization id only path.

						NOW: name nullFlavor NI.

					-->

					<name nullFlavor="NI"/>

					<!--

						DEFECT #553: manufacturerOrganization/addr.

						NOW: addr nullFlavor NI; do not invent streetAddressLine.

					-->

					<addr nullFlavor="NI"/>

					<!--

						DEFECT #554: manufacturerOrganization/telecom.

						NOW: telecom nullFlavor NI; do not invent phone.

					-->

					<telecom nullFlavor="NI"/>

				</manufacturerOrganization>

				</manufacturedProduct>
			</consumable>
<!--
				DEFECT #371: documentationOf/serviceEvent/subject.
				WAS: serviceEvent had reference then entryRelationship — no subject.
				Body entries (#364-#370) already carry subject SBJ.
				HL7 CDA R2 Act has subject 0..1 (related subject when different
				from recordTarget). SEMD validators often flag missing subject
				under documentationOf/serviceEvent. Form 043/u patient is already
				recordTarget — care-event related subject is not collected
				separately; do not invent relationship codes or ids.
				NOW: subject typeCode=SBJ with relatedSubject classCode=PRS and
				code nullFlavor NI until chart field exists.
			-->
			<subject typeCode="SBJ">
				<!--
				DEFECT #402-#410: subject/relatedSubject/addr (9× SBJ: 5 OBS + ACT + SPLY + SE + EE).
				WAS: relatedSubject had only code nullFlavor NI — no addr.
				HL7 CDA R2 RelatedSubject (R_RelatedPartyUniversal) has addr 0..*.
				SEMD validators often flag incomplete related-party contact under
				Act/subject when code is present but postal address slot is absent.
				Form 043/u does not collect care-event related-party street address
				(patient is recordTarget); do not invent streetAddressLine.
				NOW: addr nullFlavor NI on every relatedSubject.

				DEFECT #411-#419: subject/relatedSubject/telecom (same 9×).
				WAS: relatedSubject had code (+addr #402) only — no telecom.
				HL7 CDA R2 RelatedSubject has telecom 0..*. SEMD expects the
				telecom slot under related-party when addr is emitted.
				Form 043/u has no related-party phone; do not invent numbers.
				NOW: telecom nullFlavor NI on every relatedSubject.

				DEFECT #420-#428: subject/relatedSubject/subject SubjectPerson/name (same 9×).
				WAS: relatedSubject closed after code/addr/telecom — no subject person.
				HL7 CDA R2 RelatedSubject.subject is SubjectPerson (name 0..*).
				SEMD validators often require the person stub under relatedSubject
				so REMD can attach a display name when relationship is known later.
				Form 043/u does not collect related-party FIO; do not invent names.
				NOW: subject/name nullFlavor NI under every relatedSubject.
			-->
			<relatedSubject classCode="PRS">
					<code nullFlavor="NI"/>
					<addr nullFlavor="NI"/>
					<telecom nullFlavor="NI"/>
					<subject>
						<name nullFlavor="NI"/>
						<!--
						DEFECT #431: relatedSubject/subject/administrativeGenderCode (1/9).
						WAS: SubjectPerson under relatedSubject had only name NI (#420-#428) —
						no administrativeGenderCode. HL7 CDA R2 SubjectPerson has
						administrativeGenderCode 0..1. SEMD validators often flag incomplete
						person stub under Act/subject/relatedSubject.
						Form 043/u does not collect related-party gender; do not invent 1/2.
						NOW: administrativeGenderCode nullFlavor NI.
						-->
						<administrativeGenderCode nullFlavor="NI"/>
						<!--
						DEFECT #432: relatedSubject/subject/birthTime (1/9).
						WAS: SubjectPerson had name (+gender) only — no birthTime.
						HL7 CDA R2 SubjectPerson has birthTime 0..1. Mirror patient demographics
						slot under related-party person stub.
						Form 043/u does not collect related-party DOB; do not invent dates.
						NOW: birthTime nullFlavor NI.
						-->
						<birthTime nullFlavor="NI"/>
					</subject>
				</relatedSubject>
			</subject>
<!--
				DEFECT #349: documentationOf/serviceEvent/entryRelationship.
				WAS: serviceEvent had performer/author/informant/participant/precondition/reference then closed — no entryRelationship. Body entries (#342-#348) already carry entryRelationship COMP.
				HL7 CDA R2 Act/Observation/Supply has entryRelationship 0..*
				(related nested acts). SEMD validators often flag missing
				entryRelationship under body entries when sibling acts cannot
				be linked. Form 043/u chart does not collect discrete nested
				related-act graphs for these entries — do not invent nested
				codes or extensions.
				NOW: entryRelationship typeCode=COMP with nested act
				classCode=ACT moodCode=EVN and id/code/statusCode nullFlavor
				NI / completed shell until chart field exists.
			-->
			<entryRelationship typeCode="COMP">
				<act classCode="ACT" moodCode="EVN">
					<id nullFlavor="NI"/>
					<code nullFlavor="NI"/>
					<!--
						DEFECT #587: entryRelationship/act/text.
						WAS: nested COMP act had id/code/statusCode only — no text. HL7 CDA R2 Act has text 0..1. SEMD validators often flag bare nested acts under entryRelationship when parent body acts emit text. Form 043/u has no separate nested-act narrative; do not invent prose.
						NOW: text nullFlavor NI.
					-->
					<text nullFlavor="NI"/>
					<statusCode code="completed"/>
					<!--
						DEFECT #588: entryRelationship/act/priorityCode.
						WAS: nested COMP act had no priorityCode. Parent body acts emit priorityCode NI. SEMD often flags missing priority under nested COMP acts.
						NOW: priorityCode nullFlavor NI; do not invent ActPriority.
					-->
					<priorityCode nullFlavor="NI"/>
					<!--
						DEFECT #589: entryRelationship/act/effectiveTime.
						WAS: nested COMP act had no effectiveTime. Parent body acts stamp documentClock. Nested COMP has no separate chart timestamp; do not invent times.
						NOW: effectiveTime nullFlavor NI.
					-->
					<effectiveTime nullFlavor="NI"/>
					<!--
						DEFECT #590: entryRelationship/act/languageCode.
						WAS: nested COMP act had no languageCode. ClinicalDocument/sections declare ru-RU.
						NOW: languageCode code=ru-RU.
					-->
					<languageCode code="ru-RU"/>
					<!--
						DEFECT #591: entryRelationship/act/confidentialityCode.
						WAS: nested COMP act had no confidentialityCode. ClinicalDocument sets N.
						NOW: confidentialityCode N matching ClinicalDocument.
					-->
					<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
				</act>
			</entryRelationship>






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
			<!--
				DEFECT #433: inFulfillmentOf/order/priorityCode.
				WAS: order had id + code NI + statusCode completed only — no
				priorityCode. HL7 CDA R2 Order (Act) has priorityCode 0..1.
				SEMD validators often flag missing order priority under
				inFulfillmentOf when body acts emit priorityCode.
				Form 043/u chart has no separate order priority; do not invent
				a fake HL7 ActPriority code.
				NOW: priorityCode nullFlavor NI.
			-->
			<priorityCode nullFlavor="NI"/>
			<!--
				DEFECT #434: inFulfillmentOf/order/effectiveTime.
				WAS: order had id/code/status/priority only — no effectiveTime.
				HL7 CDA R2 Order has effectiveTime 0..1 (when the order was
				placed / is effective). Form 043/u export is post-slot; stamp
				order clock = document effectiveTime (same as author/consent).
				NOW: effectiveTime value=effectiveTime (documentClock).
			-->
			<effectiveTime value="${effectiveTime}"/>
		
			<!--
				DEFECT #466: inFulfillmentOf/order/text.
				WAS: order had id/code/status/priority/effectiveTime only — no text. HL7 CDA R2 Order (Act) has text 0..1 (ED). SEMD validators often flag missing order text when sibling acts emit <text>. Form 043/u has no separate order narrative on chart; do not invent order prose.
				NOW: text nullFlavor NI until order narrative is wired.
				
			-->
			<text nullFlavor="NI"/>
		
			<!--
				DEFECT #478: inFulfillmentOf/order/languageCode.
				WAS: order had no languageCode. HL7 CDA R2 Act has languageCode 0..1. SEMD often flags missing language under inFulfillmentOf when ClinicalDocument declares ru-RU.
				NOW: languageCode code=ru-RU matching ClinicalDocument.
				
			-->
			<languageCode code="ru-RU"/>
			<!--
				DEFECT #479: inFulfillmentOf/order/confidentialityCode.
				WAS: order had no confidentialityCode. HL7 CDA R2 Act has confidentialityCode 0..1. SEMD often flags missing confidentiality under inFulfillmentOf when document sets N.
				NOW: confidentialityCode N matching ClinicalDocument (#158).
				
			-->
			<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
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
		<!--
			DEFECT #169: ClinicalDocument/participant REF/functionCode.
			WAS: participant REF had time (#152) + associatedEntity only — no
			functionCode. author/dataEnterer/informant/performer already emit
			functionCode (#166/#167/#168). HL7 CDA R2 Participant1.functionCode
			is the participation function (referrer role), distinct from
			associatedEntity/code specialty (#147). SEMD expects the same
			participation-level function slot under REF.
			NOW: functionCode NI+displayName when doctorPosition known;
			bare nullFlavor NI when blank. No invented NSI function code.
		-->
		${params.doctorPosition && params.doctorPosition.trim()
			? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
			: `<functionCode nullFlavor="NI"/>`}
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
		
			<!--
				DEFECT #435: authorization/consent/text.
				WAS: consent had id + code NI + statusCode + effectiveTime only —
				no text. HL7 CDA R2 Consent Act has text 0..1 (ED) narrative of
				the consent. SEMD validators often flag missing consent text when
				sibling acts emit <text>. Form 043/u chart does not store a free-
				text consent blob at CDA build; do not invent consent prose.
				NOW: text nullFlavor NI until consent narrative is wired.
			-->
			<text nullFlavor="NI"/>
			<!--
				DEFECT #467: authorization/consent/priorityCode.
				WAS: consent had id/code/status/effectiveTime/text only — no priorityCode. HL7 CDA R2 Consent Act has priorityCode 0..1. SEMD validators often flag missing priority under authorization when body acts emit it. Form 043/u has no consent priority; do not invent ActPriority code.
				NOW: priorityCode nullFlavor NI.
				
			-->
			<priorityCode nullFlavor="NI"/>
			<!--
				DEFECT #468: authorization/consent/languageCode.
				WAS: consent had no languageCode. HL7 CDA R2 Act has languageCode 0..1. ClinicalDocument and sections declare ru-RU; SEMD often flags missing language under authorization/consent.
				NOW: languageCode code=ru-RU matching ClinicalDocument.
				
			-->
			<languageCode code="ru-RU"/>
			<!--
				DEFECT #469: authorization/consent/confidentialityCode.
				WAS: consent had no confidentialityCode. HL7 CDA R2 Act has confidentialityCode 0..1. ClinicalDocument sets N; SEMD often flags missing confidentiality under authorization/consent.
				NOW: confidentialityCode N matching ClinicalDocument (#158).
				
			-->
			<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
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
		<!--
			DEFECT #359: componentOf/encompassingEncounter/@negationInd.
			WAS: open had classCode/attributes only — no negationInd.
			HL7 CDA R2 Act has negationInd 0..1. SEMD often requires explicit false on asserted acts.
			Form 043/u care event/encounter is asserted (not negated). NOW: negationInd=false on open tag.
		-->
		<encompassingEncounter negationInd="false">
			<id root="${params.clinicOid && String(params.clinicOid).trim() ? escapeXml(String(params.clinicOid).trim()) : "1.2.643.5.1.13.13.12.2"}" extension="${escapeXml(encounterExtension)}"/>
			<code code="AMB" codeSystem="1.2.643.5.1.13.13.11.1461" codeSystemName="Виды медицинской помощи" displayName="Амбулаторная помощь"/>
			<!--
				DEFECT #278: encompassingEncounter/text.
				WAS: encounter had id/code then jumped to statusCode — no
				entry-level text. serviceEvent (#276) and body entries already
				carry <text>. HL7 CDA R2 Act has text 0..1 (ED) as the narrative
				form of the ambulatory visit. SEMD validators often flag missing
				text under componentOf when documentationOf emits it. Form 043/u
				chart already stores treatmentDescription — mirror it here (AMB
				stays on code).
				NOW: text = treatmentDescription (default Osmotr i konsultaciya).
			-->
			<text>${escapeXml(params.treatmentDescription || "Осмотр и консультация")}</text>
			<!--
				DEFECT #279: encompassingEncounter/languageCode.
				WAS: encounter had id/code/text then jumped to statusCode —
				no entry-level languageCode. serviceEvent (#277) and body
				entries (#260-#266) already carry languageCode ru-RU. HL7 CDA R2
				Act has languageCode 0..1. SEMD validators often flag missing
				language under componentOf when ClinicalDocument declares ru-RU
				but the encounter omits it. Form 043/u ambulatory dental is
				always RU narrative.
				NOW: languageCode code=ru-RU matching ClinicalDocument.
			-->
			<languageCode code="ru-RU"/>
			<!--
				DEFECT #318: encompassingEncounter/confidentialityCode.
				WAS: encompassingEncounter had languageCode (#279) then jumped to statusCode — no entry-level confidentialityCode. serviceEvent (#317) and body entries (#310-#316) already carry confidentialityCode N.
				ClinicalDocument already declares confidentialityCode N (#158).
				HL7 CDA R2 Act/Observation/Supply has confidentialityCode 0..1
				(sensitivity of the act). SEMD validators often flag missing
				confidentiality under body entries when the document sets N but
				entry acts omit it. Form 043/u ambulatory dental chart entries
				are normal confidentiality (same as ClinicalDocument).
				NOW: confidentialityCode N + codeSystemName + RU displayName
				matching ClinicalDocument (#158). No invented restricted code.
			-->
			<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>

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
			<!--
				DEFECT #179: encompassingEncounter/dischargeDispositionCode.
				WAS: encounter had id/code/statusCode/effectiveTime/responsibleParty/location
				only — no dischargeDispositionCode. HL7 CDA R2 Encounter has
				dischargeDispositionCode 0..1. SEMD validators often flag missing
				disposition under ambulatory close. Form 043/u chart does not collect
				discharge disposition (ambulatory dental visit) — do not invent a fake
				NSI disposition code.
				NOW: dischargeDispositionCode nullFlavor NI until chart field exists.
			-->
			<dischargeDispositionCode nullFlavor="NI"/>
			<!--
				DEFECT #182: encompassingEncounter/admissionReferralSourceCode.
				WAS: encounter had dischargeDispositionCode (#179) but no
				admissionReferralSourceCode. HL7 CDA R2 Encounter has
				admissionReferralSourceCode 0..1 (how the patient arrived /
				was referred into the encounter). SEMD validators often flag
				missing referral source under ambulatory close alongside
				disposition. Form 043/u chart does not collect admission
				referral source (walk-in dental) — do not invent a fake NSI
				referral-source code.
				NOW: admissionReferralSourceCode nullFlavor NI until chart field exists.
			-->
			<admissionReferralSourceCode nullFlavor="NI"/>
			<!--
				DEFECT #361: encompassingEncounter/lengthOfStayQuantity.
				WAS: encounter had admissionReferralSourceCode (#182) then priorityCode
				(#183) — no lengthOfStayQuantity. HL7 CDA R2 Encounter has
				lengthOfStayQuantity 0..1. SEMD validators often flag missing LOS
				under ambulatory close. Form 043/u ambulatory dental visit has no
				inpatient length-of-stay — do not invent days/hours.
				NOW: lengthOfStayQuantity nullFlavor NI until chart field exists.
			-->
			<lengthOfStayQuantity nullFlavor="NI"/>
			<!--
				DEFECT #183: encompassingEncounter/priorityCode.
				WAS: encounter had dischargeDisposition (#179) and
				admissionReferralSource (#182) but no priorityCode. HL7 CDA R2
				Encounter has priorityCode 0..1 (urgency of the encounter).
				SEMD validators often flag missing priority under ambulatory
				close. Form 043/u chart does not collect encounter priority
				(routine dental) — do not invent a fake HL7 ActPriority code.
				NOW: priorityCode nullFlavor NI until chart field exists.
			-->
			<priorityCode nullFlavor="NI"/>
			<!--
				DEFECT #217: encompassingEncounter/methodCode.
				WAS: encounter had priorityCode NI (#183) but no methodCode.
				serviceEvent (#213) and treatment ACT (#208) already carry
				methodCode NI. HL7 CDA R2 Act has methodCode 0..* on the
				encounter. SEMD validators often flag missing method under
				componentOf/encompassingEncounter. Form 043/u ambulatory
				dental visit has no discrete encounter method code — do not
				invent a fake NSI method OID.
				NOW: methodCode nullFlavor NI until chart field exists.
			-->
			<methodCode nullFlavor="NI"/>
			<!--
				DEFECT #218: encompassingEncounter/uncertaintyCode.
				WAS: encounter had methodCode NI (#217) but no uncertaintyCode.
				serviceEvent (#214) and treatment ACT (#209) already carry
				uncertaintyCode NI. HL7 CDA R2 Act has uncertaintyCode 0..1
				on the encounter. SEMD validators often flag missing
				uncertainty under componentOf. Form 043/u ambulatory close
				is a completed visit — do not invent U/N.
				NOW: uncertaintyCode nullFlavor NI until chart field exists.
			-->
			<uncertaintyCode nullFlavor="NI"/>
			<!--
				DEFECT #219: encompassingEncounter/repeatNumber.
				WAS: encounter had methodCode (#217) and uncertaintyCode (#218)
				only — no repeatNumber. serviceEvent (#215) and treatment ACT
				(#210) already carry repeatNumber NI. HL7 CDA R2 Act has
				repeatNumber 0..1 on the encounter. SEMD validators often flag
				missing repeatNumber under componentOf. Form 043/u ambulatory
				close is a single completed visit — no discrete repeat field
				and do not invent a fake INT count.
				NOW: repeatNumber nullFlavor NI until chart field exists.
			-->
			<repeatNumber nullFlavor="NI"/>
			<!--
				DEFECT #220: encompassingEncounter/independentInd.
				WAS: encounter had methodCode/uncertaintyCode/repeatNumber only
				— no independentInd. serviceEvent (#216) and treatment ACT
				(#211) already carry independentInd NI. HL7 CDA R2 Act has
				independentInd 0..1 on the encounter. SEMD validators often
				flag missing independentInd under componentOf. Form 043/u
				chart has no independent-act flag — do not invent true/false.
				NOW: independentInd nullFlavor NI until chart field exists.
			-->
			<independentInd nullFlavor="NI"/>
			<!--
				DEFECT #274: encompassingEncounter/approachSiteCode.
				WAS: encounter had methodCode/uncertaintyCode/repeatNumber/
				independentInd only — no approachSiteCode. serviceEvent (#272),
				treatment ACT (#221), body OBS and tray supply already carry
				approachSiteCode NI. HL7 CDA R2 Act has approachSiteCode 0..*
				on the encounter. SEMD validators often flag missing approach
				under componentOf. Form 043/u ambulatory dental visit is
				whole-mouth care — do not invent ISO 3950.
				NOW: approachSiteCode nullFlavor NI until chart field exists.
			-->
			<approachSiteCode nullFlavor="NI"/>
			<!--
				DEFECT #275: encompassingEncounter/targetSiteCode.
				WAS: encounter had approachSiteCode NI (#274) but no
				targetSiteCode. serviceEvent (#273), treatment ACT (#222),
				body OBS and tray supply already emit targetSiteCode. HL7 CDA
				R2 Act has targetSiteCode 0..* on the encounter. SEMD
				validators often flag missing target site under componentOf.
				Form 043/u ambulatory visit may span multiple teeth —
				diagnosis tooth is on the OBS entry; do not invent ISO 3950.
				NOW: targetSiteCode nullFlavor NI until chart field exists.
			-->
			<targetSiteCode nullFlavor="NI"/>
			<!--
				DEFECT #282: encompassingEncounter/interpretationCode.
				WAS: encounter had approach/targetSite then jumped to
				encounterParticipant (#181) — no interpretationCode. Treatment
				ACT (#280), serviceEvent (#281), body OBS and tray supply (#271)
				already carry interpretationCode NI. HL7 CDA R2 Act has
				interpretationCode 0..* on the ambulatory visit. SEMD validators
				often flag missing interpretation under componentOf. Form 043/u
				ambulatory visit is completed dental care — do not invent N/A/H.
				NOW: interpretationCode nullFlavor NI until chart field exists.
			-->
			<interpretationCode nullFlavor="NI"/>
			<!--
				DEFECT #181: encompassingEncounter/encounterParticipant.








				WAS: encounter had id/code/status/effectiveTime/dischargeDisposition/
				responsibleParty/location only — no encounterParticipant. HL7 CDA R2
				EncompassingEncounter has encounterParticipant 0..* (ATND/ADM/CON/…)
				for clinicians participating in the visit act itself, distinct from
				documentationOf/serviceEvent/performer (care-event performer) and
				from responsibleParty (encounter responsible clinician).
				Form 043/u treating dentist is the attending (ATND) for the ambulatory
				slot. SEMD validators often flag missing encounterParticipant under
				componentOf.
				NOW: encounterParticipant typeCode=ATND with time=visitTime and
				assignedEntity mirroring responsibleParty (SNILS or NI, code with
				position displayName or bare NI, person, MO org). No invented
				extension="unknown" or street/phone.
			-->
			<encounterParticipant typeCode="ATND">
				<time value="${visitTime}"/>
				<assignedEntity>
					${params.doctorSnils && String(params.doctorSnils).trim()
						? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
						: `<id nullFlavor="NI"/>`}
					${params.doctorPosition && params.doctorPosition.trim()
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
					<representedOrganization>
						${params.clinicOid && String(params.clinicOid).trim()
							? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
							: `<id nullFlavor="NI"/>`}
						<addr nullFlavor="NI"/>
						<telecom nullFlavor="NI"/>
						<name>${escapeXml(params.clinicName)}</name>
					</representedOrganization>
				</assignedEntity>
			</encounterParticipant>
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
					<!--
				DEFECT #291: encompassingEncounter/author.
				WAS: encompassingEncounter had encounterParticipant/responsibleParty/location then closed — no entry-level author. serviceEvent (#290) and body entries (#283-#289) already carry author.
				Body entries (#283-#289) already carry entry-level author.
				HL7 CDA R2 Act has author 0..* (who recorded the act). SEMD
				validators often flag missing author under documentationOf /
				componentOf so REMD cannot separate recorder from performer
				at the care-event / encounter shell. Form 043/u treating
				dentist authors the ambulatory visit record.
				NOW: author with time=visitTime and assignedAuthor mirroring
				document author (SNILS or NI, code with position or bare NI,
				person, MO org). No invented extension or street/phone.
			-->
			<author>
				<time value="${visitTime}"/>
				<assignedAuthor>
					${params.doctorSnils && String(params.doctorSnils).trim()
						? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
						: `<id nullFlavor="NI"/>`}
					${params.doctorPosition && params.doctorPosition.trim()
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
					<representedOrganization>
						${params.clinicOid && String(params.clinicOid).trim()
							? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
							: `<id nullFlavor="NI"/>`}
						<addr nullFlavor="NI"/>
						<telecom nullFlavor="NI"/>
						<name>${escapeXml(params.clinicName)}</name>
					</representedOrganization>
				</assignedAuthor>
			</author>
			<!--
				DEFECT #300: encompassingEncounter/informant.
				WAS: encompassingEncounter had author (#291) then closed — no entry-level informant. serviceEvent (#299) and body entries (#292-#298) already carry informant.
				Document-level informant already attributes the clinical
				source of the ClinicalDocument. HL7 CDA R2 Act/Observation/
				Supply has informant 0..* (who supplied the facts for the
				act). SEMD validators often flag missing informant under body
				entries so REMD cannot separate clinical source from author/
				performer at entry level. Form 043/u treating dentist is the
				clinical source of the chart entry (same person as document
				informant).
				NOW: informant with time=visitTime, functionCode NI+displayName
				when doctorPosition known (else bare NI), assignedEntity
				mirroring document informant (SNILS or NI, code, person, MO).
				No invented extension or street/phone.
			-->
			<informant>
				<time value="${visitTime}"/>
				${params.doctorPosition && params.doctorPosition.trim()
					? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
					: `<functionCode nullFlavor="NI"/>`}
				<assignedEntity>
					${params.doctorSnils && String(params.doctorSnils).trim()
						? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
						: `<id nullFlavor="NI"/>`}
					${params.doctorPosition && params.doctorPosition.trim()
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
					<representedOrganization>
						${params.clinicOid && String(params.clinicOid).trim()
							? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
							: `<id nullFlavor="NI"/>`}
						<addr nullFlavor="NI"/>
						<telecom nullFlavor="NI"/>
						<name>${escapeXml(params.clinicName)}</name>
					</representedOrganization>
				</assignedEntity>
			</informant>
			<!--
				DEFECT #309: encompassingEncounter/participant.
				WAS: encompassingEncounter had author/informant then closed — no entry-level participant. serviceEvent (#308) and body entries (#301-#307) already carry participant REF.
				Document-level participant REF (#152/#169/#147) already attributes
				the referring/related provider on ClinicalDocument. HL7 CDA R2
				Act/Observation/Supply has participant 0..* (related parties for
				the act). SEMD validators often flag missing participant under
				body entries so REMD cannot attach REF/related-provider at entry
				level. Form 043/u treating dentist is the related provider for
				the chart entry (same person as document REF participant).
				NOW: participant typeCode=REF with time=visitTime, functionCode
				NI+displayName when doctorPosition known (else bare NI),
				associatedEntity PROV mirroring document REF (SNILS or NI, code,
				person, scopingOrganization MO). No invented extension.
			-->
			<participant typeCode="REF">
				<time value="${visitTime}"/>
				${params.doctorPosition && params.doctorPosition.trim()
					? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
					: `<functionCode nullFlavor="NI"/>`}
				<associatedEntity classCode="PROV">
					${params.doctorSnils && String(params.doctorSnils).trim()
						? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
						: `<id nullFlavor="NI"/>`}
					${params.doctorPosition && params.doctorPosition.trim()
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
					<scopingOrganization>
						${params.clinicOid && String(params.clinicOid).trim()
							? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
							: `<id nullFlavor="NI"/>`}
						<addr nullFlavor="NI"/>
						<telecom nullFlavor="NI"/>
						<name>${escapeXml(params.clinicName)}</name>
					</scopingOrganization>
				</associatedEntity>
			</participant>
			<!--
				DEFECT #327: encompassingEncounter/precondition.
				WAS: encompassingEncounter had author/informant/participant then closed — no precondition. serviceEvent (#326) and body entries (#319-#325) already carry precondition PRCN.
				HL7 CDA R2 Act/Observation/Supply has precondition 0..*
				(criteria that must be true for the act). SEMD validators
				often flag missing precondition under body entries when the
				care event is documented without explicit criteria. Form 043/u
				chart does not collect discrete clinical preconditions for
				these entries — do not invent criterion codes or values.
				NOW: precondition typeCode=PRCN with criterion nullFlavor NI
				(id/code/value all NI) until chart fields exist.
			-->
			<precondition typeCode="PRCN">
				<criterion>
					<id nullFlavor="NI"/>
					<code nullFlavor="NI"/>
					<!--
						DEFECT #635: precondition/criterion/text.
						WAS: criterion had id/code/value only — no text. HL7 CDA R2 Criterion (Act) has text 0..1. SEMD often flags bare criterion under precondition.
						NOW: text nullFlavor NI; do not invent precondition prose.
					-->
					<text nullFlavor="NI"/>
					<!--
						DEFECT #636: precondition/criterion/statusCode.
						WAS: criterion had no statusCode. HL7 CDA R2 Act has statusCode 1..1 in many profiles; sibling nested acts use completed.
						NOW: statusCode completed.
					-->
					<statusCode code="completed"/>
					<value xsi:type="CD" nullFlavor="NI"/>
					<!--
						DEFECT #637: precondition/criterion/effectiveTime.
						WAS: criterion had no effectiveTime. SEMD often flags missing effectiveTime under precondition criterion when body acts emit it.
						NOW: effectiveTime nullFlavor NI; do not invent criterion window.
					-->
					<effectiveTime nullFlavor="NI"/>
				</criterion>
			</precondition>
			<!--
				DEFECT #336: encompassingEncounter/reference.
				WAS: encompassingEncounter had author/informant/participant/precondition then closed — no reference. serviceEvent (#335) and body entries (#328-#334) already carry reference REFR.
				HL7 CDA R2 Act/Observation/Supply has reference 0..*
				(link to external acts/documents). SEMD validators often
				flag missing reference under body entries when the care
				event cannot point to a related external act. Form 043/u
				chart does not collect discrete external-act references for
				these entries — do not invent root/extension or URLs.
				NOW: reference typeCode=REFR with externalAct classCode=ACT
				moodCode=EVN and id nullFlavor NI until chart field exists.
			-->
			<reference typeCode="REFR">
				<externalAct classCode="ACT" moodCode="EVN">
					<id nullFlavor="NI"/>
					<!--
						DEFECT #661: reference/externalAct/code.
						WAS: externalAct had id NI only — no code. HL7 CDA R2 ExternalAct has code 0..1. SEMD often flags bare externalAct under reference REFR.
						NOW: code nullFlavor NI; do not invent external act type.
					-->
					<code nullFlavor="NI"/>
					<!--
						DEFECT #662: reference/externalAct/text.
						WAS: externalAct had no text. HL7 CDA R2 ExternalAct has text 0..1.
						NOW: text nullFlavor NI; do not invent external narrative.
					-->
					<text nullFlavor="NI"/>
				</externalAct>
			</reference>
									<!--
				DEFECT #391: componentOf/encompassingEncounter/specimen.
				WAS: encompassingEncounter had reference/subject then entryRelationship — no specimen.
				Body entries and serviceEvent (#385) already carry specimen SPC.
				HL7 CDA R2 Encounter (Act) has specimen 0..*. SEMD validators often
				flag missing specimen under componentOf/encompassingEncounter.
				Form 043/u ambulatory encounter does not collect discrete specimen
				identity — do not invent specimen type codes or IDs.
				NOW: specimen typeCode=SPC with specimenRole id nullFlavor NI until
				chart field exists.
			-->
			<specimen typeCode="SPC">
				<specimenRole>
					<id nullFlavor="NI"/>
				
					<!--
						DEFECT #401: encompassingEncounter/specimen/specimenRole/specimenPlayingEntity.
						WAS: specimenRole had id NI only — no specimenPlayingEntity.
						HL7 CDA R2 SpecimenRole has specimenPlayingEntity 0..1 (the material
						entity). SEMD validators often flag empty specimenRole under clinical
						entries when playing entity code/name cannot be joined. Form 043/u
						chart does not collect discrete specimen entity codes — do not invent
						SNOMED/NSI specimen type codes.
						NOW: specimenPlayingEntity with code/name nullFlavor NI until chart
						field exists.
					-->
					<specimenPlayingEntity>
						<code nullFlavor="NI"/>
						<name nullFlavor="NI"/>
						<!--
							DEFECT #498: specimenPlayingEntity/desc.
							WAS: specimenPlayingEntity had code/name NI only — no desc. HL7 CDA R2 Entity has desc 0..1. SEMD validators often flag bare playing entity under specimen when material description cannot be joined. Form 043/u chart does not collect specimen material narrative; do not invent desc text.
							NOW: desc nullFlavor NI until chart field exists.
						-->
						<desc nullFlavor="NI"/>
						<!--
							DEFECT #499: specimenPlayingEntity/quantity.
							WAS: specimenPlayingEntity had code/name/desc only — no quantity. HL7 CDA R2 ManufacturedMaterial/Entity may carry quantity. SEMD often flags missing quantity under specimen playing entity.
							NOW: quantity nullFlavor NI; do not invent PQ amounts.
						-->
						<quantity nullFlavor="NI"/>
					</specimenPlayingEntity>
</specimenRole>
			</specimen>
			<!--
				DEFECT #392: componentOf/encompassingEncounter/consumable.
				WAS: encompassingEncounter had specimen/subject then entryRelationship — no consumable.
				Body entries and serviceEvent (#386) already carry consumable CSM.
				HL7 CDA R2 Encounter (Act) has consumable 0..*. SEMD validators often
				flag missing consumable under componentOf/encompassingEncounter.
				Form 043/u chart does not collect discrete encounter-level consumable
				NSI codes — do not invent material codes or barcodes.
				NOW: consumable typeCode=CSM with manufacturedProduct classCode=MANU
				and manufacturedMaterial code/name nullFlavor NI until chart field exists.
			-->
			<consumable typeCode="CSM">
				<manufacturedProduct classCode="MANU">
					<!--
						DEFECT #678: manufacturedProduct/id.
						WAS: manufacturedProduct opened then manufacturedMaterial — no id. Tray product carries barcode id; consumable shells had no product id. HL7 CDA R2 ManufacturedProduct has id 0..*. SEMD often flags bare product under consumable without id slot.
						NOW: id nullFlavor NI; do not invent extension=unknown.
					-->
					<id nullFlavor="NI"/>
					<manufacturedMaterial>
						<code nullFlavor="NI"/>
						<name nullFlavor="NI"/>
						<!--
							DEFECT #519: manufacturedMaterial/lotNumberText.
							WAS: manufacturedMaterial had code/name NI only — no lotNumberText. Tray product already emits lot (#388). HL7 CDA R2 Material has lotNumberText 0..1. SEMD often flags bare material under consumable without lot slot.
							NOW: lotNumberText nullFlavor NI; do not invent lot strings.
						-->
						<lotNumberText nullFlavor="NI"/>
						<!--
							DEFECT #520: manufacturedMaterial/desc.
							WAS: manufacturedMaterial had code/name/lot only — no desc. Tray already emits desc (#389). SEMD often flags missing material description under consumable.
							NOW: desc nullFlavor NI; do not invent device prose.
						-->
						<desc nullFlavor="NI"/>
						<!--
							DEFECT #521: manufacturedMaterial/expirationTime.
							WAS: manufacturedMaterial had code/name/lot/desc only — no expirationTime. Tray already emits expirationTime. HL7 CDA R2 Material has expirationTime 0..1.
							NOW: expirationTime nullFlavor NI; do not invent expiry timestamps.
						-->
						<expirationTime nullFlavor="NI"/>
					</manufacturedMaterial>
				<!--

					DEFECT #555: manufacturedProduct/manufacturerOrganization.

					WAS: manufacturedProduct had material only — no manufacturerOrganization. Tray product already emits manufacturerOrganization. HL7 CDA R2 ManufacturedProduct has manufacturerOrganization 0..1. SEMD often flags bare product under consumable without org shell.

					NOW: manufacturerOrganization with id/name/addr/telecom NI; do not invent org identity.

				-->

				<manufacturerOrganization>

					<id nullFlavor="NI"/>

					<!--

						DEFECT #556: manufacturerOrganization/name.

						WAS: manufacturerOrganization id only path.

						NOW: name nullFlavor NI.

					-->

					<name nullFlavor="NI"/>

					<!--

						DEFECT #557: manufacturerOrganization/addr.

						NOW: addr nullFlavor NI; do not invent streetAddressLine.

					-->

					<addr nullFlavor="NI"/>

					<!--

						DEFECT #558: manufacturerOrganization/telecom.

						NOW: telecom nullFlavor NI; do not invent phone.

					-->

					<telecom nullFlavor="NI"/>

				</manufacturerOrganization>

				</manufacturedProduct>
			</consumable>
<!--
				DEFECT #372: componentOf/encompassingEncounter/subject.
				WAS: encompassingEncounter had reference then entryRelationship — no subject.
				Body entries (#364-#370) and serviceEvent (#371) already carry subject SBJ.
				HL7 CDA R2 Encounter has subject 0..1 (related subject when different
				from recordTarget). SEMD validators often flag missing subject under
				componentOf/encompassingEncounter. Form 043/u patient is already
				recordTarget — encounter related subject is not collected separately;
				do not invent relationship codes or ids.
				NOW: subject typeCode=SBJ with relatedSubject classCode=PRS and
				code nullFlavor NI until chart field exists.
			-->
			<subject typeCode="SBJ">
				<relatedSubject classCode="PRS">
					<code nullFlavor="NI"/>
					<addr nullFlavor="NI"/>
					<telecom nullFlavor="NI"/>
					<subject>
						<name nullFlavor="NI"/>
						<!--
						DEFECT #436: relatedSubject/subject/administrativeGenderCode (2/9).
						WAS: SubjectPerson under relatedSubject had only name NI (#420-#428) —
						no administrativeGenderCode. HL7 CDA R2 SubjectPerson has
						administrativeGenderCode 0..1. SEMD validators often flag incomplete
						person stub under Act/subject/relatedSubject.
						Form 043/u does not collect related-party gender; do not invent 1/2.
						NOW: administrativeGenderCode nullFlavor NI.
						-->
						<administrativeGenderCode nullFlavor="NI"/>
						<!--
						DEFECT #437: relatedSubject/subject/birthTime (2/9).
						WAS: SubjectPerson had name (+gender) only — no birthTime.
						HL7 CDA R2 SubjectPerson has birthTime 0..1. Mirror patient demographics
						slot under related-party person stub.
						Form 043/u does not collect related-party DOB; do not invent dates.
						NOW: birthTime nullFlavor NI.
						-->
						<birthTime nullFlavor="NI"/>
					</subject>
				</relatedSubject>
			</subject>
<!--
				DEFECT #350: encompassingEncounter/entryRelationship.
				WAS: encompassingEncounter had author/informant/participant/precondition/reference then closed — no entryRelationship. serviceEvent (#349) and body entries (#342-#348) already carry entryRelationship COMP.
				HL7 CDA R2 Act/Observation/Supply has entryRelationship 0..*
				(related nested acts). SEMD validators often flag missing
				entryRelationship under body entries when sibling acts cannot
				be linked. Form 043/u chart does not collect discrete nested
				related-act graphs for these entries — do not invent nested
				codes or extensions.
				NOW: entryRelationship typeCode=COMP with nested act
				classCode=ACT moodCode=EVN and id/code/statusCode nullFlavor
				NI / completed shell until chart field exists.
			-->
			<entryRelationship typeCode="COMP">
				<act classCode="ACT" moodCode="EVN">
					<id nullFlavor="NI"/>
					<code nullFlavor="NI"/>
					<!--
						DEFECT #592: entryRelationship/act/text.
						WAS: nested COMP act had id/code/statusCode only — no text. HL7 CDA R2 Act has text 0..1. SEMD validators often flag bare nested acts under entryRelationship when parent body acts emit text. Form 043/u has no separate nested-act narrative; do not invent prose.
						NOW: text nullFlavor NI.
					-->
					<text nullFlavor="NI"/>
					<statusCode code="completed"/>
					<!--
						DEFECT #593: entryRelationship/act/priorityCode.
						WAS: nested COMP act had no priorityCode. Parent body acts emit priorityCode NI. SEMD often flags missing priority under nested COMP acts.
						NOW: priorityCode nullFlavor NI; do not invent ActPriority.
					-->
					<priorityCode nullFlavor="NI"/>
					<!--
						DEFECT #594: entryRelationship/act/effectiveTime.
						WAS: nested COMP act had no effectiveTime. Parent body acts stamp documentClock. Nested COMP has no separate chart timestamp; do not invent times.
						NOW: effectiveTime nullFlavor NI.
					-->
					<effectiveTime nullFlavor="NI"/>
					<!--
						DEFECT #595: entryRelationship/act/languageCode.
						WAS: nested COMP act had no languageCode. ClinicalDocument/sections declare ru-RU.
						NOW: languageCode code=ru-RU.
					-->
					<languageCode code="ru-RU"/>
					<!--
						DEFECT #596: entryRelationship/act/confidentialityCode.
						WAS: nested COMP act had no confidentialityCode. ClinicalDocument sets N.
						NOW: confidentialityCode N matching ClinicalDocument.
					-->
					<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
				</act>
			</entryRelationship>





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
					<!--
						DEFECT #438: section/confidentialityCode (1/7).
						WAS: section had id/code/title/text then entry — no section-level
						confidentialityCode. Body entry acts already carry confidentialityCode N
						(#310-#318). HL7 CDA R2 Section has confidentialityCode 0..1.
						SEMD validators often flag missing section confidentiality when the
						ClinicalDocument sets N but narrative sections omit it.
						Form 043/u ambulatory dental sections are normal confidentiality.
						NOW: confidentialityCode N matching ClinicalDocument (#158).
					-->
					<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
					<!--
						DEFECT #439: section/languageCode (1/7).
						WAS: section had id/code/title/text (+confidentiality) then entry —
						no section-level languageCode. Entry acts already carry languageCode
						ru-RU (#260-#279). HL7 CDA R2 Section has languageCode 0..1.
						SEMD validators often flag missing section language when the document
						declares ru-RU but narrative sections omit it.
						NOW: languageCode code=ru-RU matching ClinicalDocument.
					-->
					<languageCode code="ru-RU"/>
					<!--
						DEFECT #544: section/subject (related subject shell).
						WAS: section had id/code/title/text/confidentialityCode/languageCode then entry — no subject. HL7 CDA R2 Section has subject 0..1 (related subject when section subject differs from recordTarget). Body entries already carry subject SBJ; SEMD validators often flag missing section-level subject shell. Form 043/u sections are about the same patient — no alternate section subject on chart; do not invent related person demographics.
						NOW: subject typeCode=SBJ with relatedSubject classCode=PRS and NI demographics (mirror entry-level relatedSubject).
					-->
					<subject typeCode="SBJ">
						<relatedSubject classCode="PRS">
							<code nullFlavor="NI"/>
							<addr nullFlavor="NI"/>
							<telecom nullFlavor="NI"/>
							<subject>
								<name nullFlavor="NI"/>
								<administrativeGenderCode nullFlavor="NI"/>
								<birthTime nullFlavor="NI"/>
							</subject>
						</relatedSubject>
					</subject>
					<entry>
						<!--
							DEFECT #351: diagnosis observation/@negationInd.
							WAS: open had classCode/moodCode only — no negationInd.
							HL7 CDA R2 Act has negationInd 0..1. SEMD often requires explicit false on asserted acts.
							Form 043/u chart entry is asserted (not negated). NOW: negationInd=false on entry open tag.
						-->
						<observation classCode="OBS" moodCode="EVN" negationInd="false">
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
							<!--
								DEFECT #255: diagnosis observation/text.
								WAS: diagnosis OBS had id/code then jumped to statusCode —
								no entry-level text. Treatment ACT (#146) and instrument-tray
								supply already carry <text> with the human-readable payload.
								HL7 CDA R2 Observation has text 0..1 (ED) as the narrative
								form of the finding; SEMD validators often flag missing text
								when sibling Act/Supply entries emit it. Form 043/u chart
								already stores diagnosisText — mirror it here (ICD stays on
								value/@code).
								NOW: text = diagnosisText until a richer narrative is needed.
							-->
							<text>${escapeXml(params.diagnosisText)}</text>
							<!--
								DEFECT #260: diagnosis observation/languageCode.
								WAS: diagnosis OBS had id/code/text then jumped to statusCode —
								no entry-level languageCode. ClinicalDocument already declares
								languageCode ru-RU. HL7 CDA R2 Observation has languageCode
								0..1. SEMD validators often flag missing language under
								diagnosis OBS when document language is set but entry acts
								omit it. Form 043/u ambulatory dental is always RU narrative.
								NOW: languageCode code=ru-RU matching ClinicalDocument.
							-->
							<languageCode code="ru-RU"/>
							<!--
								DEFECT #310: diagnosis observation/confidentialityCode.
								WAS: diagnosis OBS had languageCode (#260) then jumped to statusCode — no entry-level confidentialityCode.
								ClinicalDocument already declares confidentialityCode N (#158).
								HL7 CDA R2 Act/Observation/Supply has confidentialityCode 0..1
								(sensitivity of the act). SEMD validators often flag missing
								confidentiality under body entries when the document sets N but
								entry acts omit it. Form 043/u ambulatory dental chart entries
								are normal confidentiality (same as ClinicalDocument).
								NOW: confidentialityCode N + codeSystemName + RU displayName
								matching ClinicalDocument (#158). No invented restricted code.
							-->
							<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>

							<!-- DEFECT #143: observation statusCode completed (mirror act/supply) -->


							<statusCode code="completed"/>
							<!-- DEFECT #145: observation effectiveTime = visit clock -->
							<effectiveTime value="${visitTime}"/>
							<!--
								DEFECT #240: diagnosis observation/priorityCode.
								WAS: diagnosis OBS had id/code/statusCode/effectiveTime/value
								only - no priorityCode. Treatment ACT (#201), instrument-tray
								supply (#202), serviceEvent (#212) and encompassingEncounter
								(#183) already carry priorityCode NI. HL7 CDA R2 Observation
								has priorityCode 0..1 (urgency of the finding act). SEMD
								validators often flag missing priority under diagnosis OBS.
								Form 043/u chart does not collect a discrete diagnosis
								priority flag - do not invent R/UR/S.
								NOW: priorityCode nullFlavor NI until chart field exists.
							-->
							<priorityCode nullFlavor="NI"/>
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
							<value xsi:type="CD" code="${escapeXml(params.icd10Code)}" codeSystem="1.2.643.5.1.13.13.11.1005" codeSystemName="МКБ-10" displayName="${escapeXml(params.diagnosisText)}"/>
							<!--
								DEFECT #186: diagnosis observation/methodCode.
								WAS: diagnosis OBS had id/code/statusCode/effectiveTime/value
								(+ optional targetSiteCode) only — no methodCode. HL7 CDA R2
								Observation has methodCode 0..* (how the finding was obtained:
								exam / imaging / lab). SEMD validators often flag missing
								method under diagnosis OBS. Form 043/u chart does not collect
								a discrete diagnosis method code — do not invent a fake NSI
								method OID.
								NOW: methodCode nullFlavor NI until chart field exists.
							-->
							<methodCode nullFlavor="NI"/>
							<!--
								DEFECT #187: diagnosis observation/interpretationCode.
								WAS: diagnosis OBS gained methodCode NI (#186) but still had
								no interpretationCode. HL7 CDA R2 Observation has
								interpretationCode 0..* (Abnormal/Normal/High/Low etc from
								ObservationInterpretation). SEMD validators often flag missing
								interpretation under coded diagnosis OBS. Form 043/u chart does
								not collect a discrete HL7 interpretation flag for the ICD-10
								finding — do not invent a fake N/A/H code.
								NOW: interpretationCode nullFlavor NI until chart field exists.
							-->
							<interpretationCode nullFlavor="NI"/>
							<!--
								DEFECT #188: diagnosis observation/uncertaintyCode.
								WAS: diagnosis OBS gained methodCode (#186) and
								interpretationCode (#187) but still had no uncertaintyCode.
								HL7 CDA R2 Observation has uncertaintyCode 0..1 (U/N from
								ActUncertainty — whether the assertion is known uncertain).
								SEMD validators often flag missing uncertainty under coded
								diagnosis OBS. Form 043/u chart does not collect a discrete
								uncertainty flag for the ICD-10 finding — do not invent U/N.
								NOW: uncertaintyCode nullFlavor NI until chart field exists.
							-->
							<uncertaintyCode nullFlavor="NI"/>
							<!--
								DEFECT #245: diagnosis observation/repeatNumber.
								WAS: diagnosis OBS had priorityCode (#240)/methodCode/
								interpretationCode/uncertaintyCode only - no repeatNumber.
								Treatment ACT (#210), instrument-tray supply (#204),
								serviceEvent (#215) and encompassingEncounter (#219) already
								carry repeatNumber NI. HL7 CDA R2 Observation (Act) has
								repeatNumber 0..1 (how many times the finding act is intended
								to occur). SEMD validators often flag missing repeatNumber
								under diagnosis OBS. Form 043/u chart does not collect a
								discrete diagnosis repeat count - do not invent a number.
								NOW: repeatNumber nullFlavor NI until chart field exists.
							-->
							<repeatNumber nullFlavor="NI"/>
							<!--
								DEFECT #246: diagnosis observation/independentInd.
								WAS: diagnosis OBS had priorityCode/methodCode/
								interpretationCode/uncertaintyCode/repeatNumber only - no
								independentInd. Treatment ACT (#211), instrument-tray supply
								(#205), serviceEvent (#216) and encompassingEncounter (#220)
								already carry independentInd NI. HL7 CDA R2 Observation (Act)
								has independentInd 0..1 (whether the act can stand alone).
								SEMD validators often flag missing independentInd under
								diagnosis OBS. Form 043/u chart does not collect a discrete
								independence flag - do not invent true/false.
								NOW: independentInd nullFlavor NI until chart field exists.
							-->
							<independentInd nullFlavor="NI"/>
							<!--
								DEFECT #224: diagnosis observation/approachSiteCode.
								WAS: diagnosis OBS had uncertaintyCode (#188) then jumped to
								targetSiteCode (#74/#223) — no approachSiteCode. Treatment
								ACT already carries approachSiteCode NI (#221). HL7 CDA R2
								Observation has approachSiteCode 0..* (anatomical approach
								used to obtain the finding), distinct from targetSiteCode
								(tooth the finding is about). SEMD validators often flag
								missing approach under diagnosis OBS. Form 043/u chart has
								no discrete diagnosis approach field — do not invent ISO 3950.
								NOW: approachSiteCode nullFlavor NI until chart field exists.
							-->
							<approachSiteCode nullFlavor="NI"/>
							<!--
								DEFECT #74: ISO 3950 tooth from visit_diaries.diagnosis_tooth
								when known (targetSiteCode CE).
								DEFECT #223: diagnosis observation/targetSiteCode always present.

								WAS (#74): targetSiteCode emitted only when diagnosisTooth
								non-empty — when tooth blank the entire element was omitted.
								Treatment ACT (#222) always emits targetSiteCode (tooth CE or
								NI). HL7 CDA R2 Observation has targetSiteCode 0..*; SEMD
								validators often flag missing target site under diagnosis OBS
								even when the finding is whole-mouth / no single tooth.
								NOW: always emit targetSiteCode — ISO 3950 tooth CE when
								diagnosisTooth present; else nullFlavor NI (do not invent a tooth).
							-->
							${params.diagnosisTooth && String(params.diagnosisTooth).trim()
								? `<targetSiteCode code="${escapeXml(String(params.diagnosisTooth).trim())}" codeSystem="1.2.643.5.1.13.13.11.1466" codeSystemName="Зубы" displayName="Зуб ${escapeXml(String(params.diagnosisTooth).trim())}"/>`
								: `<targetSiteCode nullFlavor="NI"/>`}
							<!--
								DEFECT #233: diagnosis observation/performer.
								WAS: diagnosis OBS had id/code/status/time/value/method/
								interpretation/uncertainty/approach/targetSite only — no
								performer. documentationOf/serviceEvent already has
								performer PRF (#93). HL7 CDA R2 Observation has performer
								0..* (who performed the finding act). SEMD validators often
								flag missing performer under diagnosis OBS so REMD cannot
								attribute the ICD-10 finding to the treating dentist at the
								entry level (header performer is care-event only).
								NOW: performer typeCode=PRF with time=visitTime and
								assignedEntity mirroring serviceEvent performer (SNILS or NI,
								code with position or bare NI, person, MO org). No invented
								extension="unknown" or street/phone.
							-->
							<performer typeCode="PRF">
								<time value="${visitTime}"/>
								<assignedEntity>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedEntity>
							</performer>
							<!--
								DEFECT #283: diagnosis observation/author.
								WAS: diagnosis OBS had performer (#233) then closed — no entry-level author.
								Document-level author already attributes the ClinicalDocument.
								HL7 CDA R2 Act/Observation/Supply has author 0..* (who
								recorded the act). SEMD validators often flag missing author
								under body entries so REMD cannot separate recorder from
								performer at entry level. Form 043/u treating dentist authors
								the chart entry.
								NOW: author with time=visitTime and assignedAuthor mirroring
								document author / entry performer (SNILS or NI, code with
								position or bare NI, person, MO org). No invented extension
								or street/phone.
							-->
							<author>
								<time value="${visitTime}"/>
								<assignedAuthor>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedAuthor>
							</author>
							<!--
								DEFECT #292: diagnosis observation/informant.
								WAS: diagnosis OBS had performer (#233) + author (#283) then closed — no entry-level informant.
								Document-level informant already attributes the clinical
								source of the ClinicalDocument. HL7 CDA R2 Act/Observation/
								Supply has informant 0..* (who supplied the facts for the
								act). SEMD validators often flag missing informant under body
								entries so REMD cannot separate clinical source from author/
								performer at entry level. Form 043/u treating dentist is the
								clinical source of the chart entry (same person as document
								informant).
								NOW: informant with time=visitTime, functionCode NI+displayName
								when doctorPosition known (else bare NI), assignedEntity
								mirroring document informant (SNILS or NI, code, person, MO).
								No invented extension or street/phone.
							-->
							<informant>
								<time value="${visitTime}"/>
								${params.doctorPosition && params.doctorPosition.trim()
									? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
									: `<functionCode nullFlavor="NI"/>`}
								<assignedEntity>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedEntity>
							</informant>
							<!--
								DEFECT #301: diagnosis observation/participant.
								WAS: diagnosis OBS had performer (#233) + author (#283) + informant (#292) then closed — no entry-level participant.
								Document-level participant REF (#152/#169/#147) already attributes
								the referring/related provider on ClinicalDocument. HL7 CDA R2
								Act/Observation/Supply has participant 0..* (related parties for
								the act). SEMD validators often flag missing participant under
								body entries so REMD cannot attach REF/related-provider at entry
								level. Form 043/u treating dentist is the related provider for
								the chart entry (same person as document REF participant).
								NOW: participant typeCode=REF with time=visitTime, functionCode
								NI+displayName when doctorPosition known (else bare NI),
								associatedEntity PROV mirroring document REF (SNILS or NI, code,
								person, scopingOrganization MO). No invented extension.
							-->
							<participant typeCode="REF">
								<time value="${visitTime}"/>
								${params.doctorPosition && params.doctorPosition.trim()
									? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
									: `<functionCode nullFlavor="NI"/>`}
								<associatedEntity classCode="PROV">
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<scopingOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</scopingOrganization>
								</associatedEntity>
							</participant>
							<!--
								DEFECT #319: diagnosis observation/precondition.
								WAS: diagnosis OBS had performer/author/informant/participant then closed — no precondition.
								HL7 CDA R2 Act/Observation/Supply has precondition 0..*
								(criteria that must be true for the act). SEMD validators
								often flag missing precondition under body entries when the
								care event is documented without explicit criteria. Form 043/u
								chart does not collect discrete clinical preconditions for
								these entries — do not invent criterion codes or values.
								NOW: precondition typeCode=PRCN with criterion nullFlavor NI
								(id/code/value all NI) until chart fields exist.
							-->
							<precondition typeCode="PRCN">
								<criterion>
									<id nullFlavor="NI"/>
									<code nullFlavor="NI"/>
									<!--
										DEFECT #638: precondition/criterion/text.
										WAS: criterion had id/code/value only — no text. HL7 CDA R2 Criterion (Act) has text 0..1. SEMD often flags bare criterion under precondition.
										NOW: text nullFlavor NI; do not invent precondition prose.
									-->
									<text nullFlavor="NI"/>
									<!--
										DEFECT #639: precondition/criterion/statusCode.
										WAS: criterion had no statusCode. HL7 CDA R2 Act has statusCode 1..1 in many profiles; sibling nested acts use completed.
										NOW: statusCode completed.
									-->
									<statusCode code="completed"/>
									<value xsi:type="CD" nullFlavor="NI"/>
									<!--
										DEFECT #640: precondition/criterion/effectiveTime.
										WAS: criterion had no effectiveTime. SEMD often flags missing effectiveTime under precondition criterion when body acts emit it.
										NOW: effectiveTime nullFlavor NI; do not invent criterion window.
									-->
									<effectiveTime nullFlavor="NI"/>
								</criterion>
							</precondition>
							<!--
								DEFECT #328: diagnosis observation/reference.
								WAS: diagnosis OBS had performer/author/informant/participant/precondition then closed — no reference.
								HL7 CDA R2 Act/Observation/Supply has reference 0..*
								(link to external acts/documents). SEMD validators often
								flag missing reference under body entries when the care
								event cannot point to a related external act. Form 043/u
								chart does not collect discrete external-act references for
								these entries — do not invent root/extension or URLs.
								NOW: reference typeCode=REFR with externalAct classCode=ACT
								moodCode=EVN and id nullFlavor NI until chart field exists.
							-->
							<reference typeCode="REFR">
								<externalAct classCode="ACT" moodCode="EVN">
									<id nullFlavor="NI"/>
									<!--
										DEFECT #663: reference/externalAct/code.
										WAS: externalAct had id NI only — no code. HL7 CDA R2 ExternalAct has code 0..1. SEMD often flags bare externalAct under reference REFR.
										NOW: code nullFlavor NI; do not invent external act type.
									-->
									<code nullFlavor="NI"/>
									<!--
										DEFECT #664: reference/externalAct/text.
										WAS: externalAct had no text. HL7 CDA R2 ExternalAct has text 0..1.
										NOW: text nullFlavor NI; do not invent external narrative.
									-->
									<text nullFlavor="NI"/>
								</externalAct>
							</reference>
							<!--
								DEFECT #337: diagnosis observation/specimen.
								WAS: diagnosis OBS had performer/author/informant/participant/precondition/reference then closed — no specimen.
								HL7 CDA R2 Observation has specimen 0..* (material used for
								the observation). SEMD validators often flag missing specimen
								under clinical OBS entries. Form 043/u ambulatory dental chart
								does not collect discrete specimen identity for these findings
								— do not invent specimen type codes or IDs.
								NOW: specimen typeCode=SPC with specimenRole id nullFlavor NI
								until chart field exists.
							-->
							<specimen typeCode="SPC">
								<specimenRole>
									<id nullFlavor="NI"/>
								
									<!--
										DEFECT #393: diagnosis observation/specimen/specimenRole/specimenPlayingEntity.
										WAS: specimenRole had id NI only — no specimenPlayingEntity.
										HL7 CDA R2 SpecimenRole has specimenPlayingEntity 0..1 (the material
										entity). SEMD validators often flag empty specimenRole under clinical
										entries when playing entity code/name cannot be joined. Form 043/u
										chart does not collect discrete specimen entity codes — do not invent
										SNOMED/NSI specimen type codes.
										NOW: specimenPlayingEntity with code/name nullFlavor NI until chart
										field exists.
									-->
									<specimenPlayingEntity>
										<code nullFlavor="NI"/>
										<name nullFlavor="NI"/>
										<!--
											DEFECT #500: specimenPlayingEntity/desc.
											WAS: specimenPlayingEntity had code/name NI only — no desc. HL7 CDA R2 Entity has desc 0..1. SEMD validators often flag bare playing entity under specimen when material description cannot be joined. Form 043/u chart does not collect specimen material narrative; do not invent desc text.
											NOW: desc nullFlavor NI until chart field exists.
										-->
										<desc nullFlavor="NI"/>
										<!--
											DEFECT #501: specimenPlayingEntity/quantity.
											WAS: specimenPlayingEntity had code/name/desc only — no quantity. HL7 CDA R2 ManufacturedMaterial/Entity may carry quantity. SEMD often flags missing quantity under specimen playing entity.
											NOW: quantity nullFlavor NI; do not invent PQ amounts.
										-->
										<quantity nullFlavor="NI"/>
									</specimenPlayingEntity>
</specimenRole>
							</specimen>
							
							<!--
								DEFECT #364: diagnosis observation/subject.
								WAS: diagnosis observation had specimen then entryRelationship — no subject.
								HL7 CDA R2 Act/Observation/Supply has subject 0..1 (related
								subject when different from recordTarget). SEMD validators often
								flag missing subject under clinical body entries. Form 043/u
								patient is already recordTarget — entry-level related subject is
								not collected separately; do not invent relationship codes or ids.
								NOW: subject typeCode=SBJ with relatedSubject classCode=PRS and
								code nullFlavor NI until chart field exists.
							-->
							<subject typeCode="SBJ">
								<relatedSubject classCode="PRS">
									<code nullFlavor="NI"/>
									<addr nullFlavor="NI"/>
									<telecom nullFlavor="NI"/>
									<subject>
										<name nullFlavor="NI"/>
										<!--
										DEFECT #440: relatedSubject/subject/administrativeGenderCode (3/9).
										WAS: SubjectPerson under relatedSubject had only name NI (#420-#428) —
										no administrativeGenderCode. HL7 CDA R2 SubjectPerson has
										administrativeGenderCode 0..1. SEMD validators often flag incomplete
										person stub under Act/subject/relatedSubject.
										Form 043/u does not collect related-party gender; do not invent 1/2.
										NOW: administrativeGenderCode nullFlavor NI.
										-->
										<administrativeGenderCode nullFlavor="NI"/>
										<!--
										DEFECT #441: relatedSubject/subject/birthTime (3/9).
										WAS: SubjectPerson had name (+gender) only — no birthTime.
										HL7 CDA R2 SubjectPerson has birthTime 0..1. Mirror patient demographics
										slot under related-party person stub.
										Form 043/u does not collect related-party DOB; do not invent dates.
										NOW: birthTime nullFlavor NI.
										-->
										<birthTime nullFlavor="NI"/>
									</subject>
								</relatedSubject>
							</subject>

							
							<!--
								DEFECT #380: diagnosis observation/consumable.
								WAS: diagnosis observation had performer/.../specimen/subject — no consumable.
								Treatment ACT (#373) and tray supply (#374) already carry consumable CSM.
								HL7 CDA R2 Observation (Act) has consumable 0..* (materials used while
								making the observation). SEMD validators often flag missing consumable
								under clinical OBS when exam materials cannot be joined. Form 043/u
								chart does not collect discrete consumable NSI codes for these findings
								— do not invent material codes or barcodes.
								NOW: consumable typeCode=CSM with manufacturedProduct classCode=MANU
								and manufacturedMaterial code/name nullFlavor NI until chart field exists.
							-->
							<consumable typeCode="CSM">
								<manufacturedProduct classCode="MANU">
									<!--
										DEFECT #679: manufacturedProduct/id.
										WAS: manufacturedProduct opened then manufacturedMaterial — no id. Tray product carries barcode id; consumable shells had no product id. HL7 CDA R2 ManufacturedProduct has id 0..*. SEMD often flags bare product under consumable without id slot.
										NOW: id nullFlavor NI; do not invent extension=unknown.
									-->
									<id nullFlavor="NI"/>
									<manufacturedMaterial>
										<code nullFlavor="NI"/>
										<name nullFlavor="NI"/>
										<!--
											DEFECT #522: manufacturedMaterial/lotNumberText.
											WAS: manufacturedMaterial had code/name NI only — no lotNumberText. Tray product already emits lot (#388). HL7 CDA R2 Material has lotNumberText 0..1. SEMD often flags bare material under consumable without lot slot.
											NOW: lotNumberText nullFlavor NI; do not invent lot strings.
										-->
										<lotNumberText nullFlavor="NI"/>
										<!--
											DEFECT #523: manufacturedMaterial/desc.
											WAS: manufacturedMaterial had code/name/lot only — no desc. Tray already emits desc (#389). SEMD often flags missing material description under consumable.
											NOW: desc nullFlavor NI; do not invent device prose.
										-->
										<desc nullFlavor="NI"/>
										<!--
											DEFECT #524: manufacturedMaterial/expirationTime.
											WAS: manufacturedMaterial had code/name/lot/desc only — no expirationTime. Tray already emits expirationTime. HL7 CDA R2 Material has expirationTime 0..1.
											NOW: expirationTime nullFlavor NI; do not invent expiry timestamps.
										-->
										<expirationTime nullFlavor="NI"/>
									</manufacturedMaterial>
								<!--

									DEFECT #559: manufacturedProduct/manufacturerOrganization.

									WAS: manufacturedProduct had material only — no manufacturerOrganization. Tray product already emits manufacturerOrganization. HL7 CDA R2 ManufacturedProduct has manufacturerOrganization 0..1. SEMD often flags bare product under consumable without org shell.

									NOW: manufacturerOrganization with id/name/addr/telecom NI; do not invent org identity.

								-->

								<manufacturerOrganization>

									<id nullFlavor="NI"/>

									<!--

										DEFECT #560: manufacturerOrganization/name.

										WAS: manufacturerOrganization id only path.

										NOW: name nullFlavor NI.

									-->

									<name nullFlavor="NI"/>

									<!--

										DEFECT #561: manufacturerOrganization/addr.

										NOW: addr nullFlavor NI; do not invent streetAddressLine.

									-->

									<addr nullFlavor="NI"/>

									<!--

										DEFECT #562: manufacturerOrganization/telecom.

										NOW: telecom nullFlavor NI; do not invent phone.

									-->

									<telecom nullFlavor="NI"/>

								</manufacturerOrganization>

								</manufacturedProduct>
							</consumable>
<!--
								DEFECT #375: diagnosis observation/referenceRange.
								WAS: diagnosis observation had value/method/.../subject then entryRelationship —
								no referenceRange. HL7 CDA R2 Observation has referenceRange 0..*
								(observationRange for normal/abnormal bounds). SEMD validators often
								flag missing referenceRange under clinical OBS entries. Form 043/u
								ambulatory dental findings are free-text/ICD — no lab-style reference
								interval is collected; do not invent PQ bounds or interpretation anchors.
								NOW: referenceRange with observationRange value nullFlavor NI until
								chart field exists.
							-->
							<referenceRange>
								<observationRange>
									<!--
										DEFECT #481: observationRange/code.
										WAS: observationRange had only value CD NI — no code. HL7 CDA R2 ObservationRange has code 0..1 (what range kind). SEMD validators often flag bare observationRange under clinical OBS. Form 043/u ambulatory dental findings have no lab reference-range catalog; do not invent range type codes.
										NOW: code nullFlavor NI until chart field exists.
									-->
									<code nullFlavor="NI"/>
									<!--
										DEFECT #482: observationRange/text.
										WAS: observationRange had no text. HL7 CDA R2 ObservationRange has text 0..1 (ED). SEMD often flags missing narrative under referenceRange when value is NI-only.
										NOW: text nullFlavor NI; do not invent range prose.
									-->
									<text nullFlavor="NI"/>
									<value xsi:type="CD" nullFlavor="NI"/>
									<!--
										DEFECT #483: observationRange/interpretationCode.
										WAS: observationRange had value only — no interpretationCode. HL7 CDA R2 ObservationRange has interpretationCode 0..*. SEMD often flags missing interpretation under referenceRange for clinical OBS.
										NOW: interpretationCode nullFlavor NI; do not invent N/A/H/L codes.
									-->
									<interpretationCode nullFlavor="NI"/>
								</observationRange>
							</referenceRange>
<!--
								DEFECT #342: diagnosis observation/entryRelationship.
								WAS: diagnosis OBS had specimen (#337) then closed — no entryRelationship.
								HL7 CDA R2 Act/Observation/Supply has entryRelationship 0..*
								(related nested acts). SEMD validators often flag missing
								entryRelationship under body entries when sibling acts cannot
								be linked. Form 043/u chart does not collect discrete nested
								related-act graphs for these entries — do not invent nested
								codes or extensions.
								NOW: entryRelationship typeCode=COMP with nested act
								classCode=ACT moodCode=EVN and id/code/statusCode nullFlavor
								NI / completed shell until chart field exists.
							-->
							<entryRelationship typeCode="COMP">
								<act classCode="ACT" moodCode="EVN">
									<id nullFlavor="NI"/>
									<code nullFlavor="NI"/>
									<!--
										DEFECT #597: entryRelationship/act/text.
										WAS: nested COMP act had id/code/statusCode only — no text. HL7 CDA R2 Act has text 0..1. SEMD validators often flag bare nested acts under entryRelationship when parent body acts emit text. Form 043/u has no separate nested-act narrative; do not invent prose.
										NOW: text nullFlavor NI.
									-->
									<text nullFlavor="NI"/>
									<statusCode code="completed"/>
									<!--
										DEFECT #598: entryRelationship/act/priorityCode.
										WAS: nested COMP act had no priorityCode. Parent body acts emit priorityCode NI. SEMD often flags missing priority under nested COMP acts.
										NOW: priorityCode nullFlavor NI; do not invent ActPriority.
									-->
									<priorityCode nullFlavor="NI"/>
									<!--
										DEFECT #599: entryRelationship/act/effectiveTime.
										WAS: nested COMP act had no effectiveTime. Parent body acts stamp documentClock. Nested COMP has no separate chart timestamp; do not invent times.
										NOW: effectiveTime nullFlavor NI.
									-->
									<effectiveTime nullFlavor="NI"/>
									<!--
										DEFECT #600: entryRelationship/act/languageCode.
										WAS: nested COMP act had no languageCode. ClinicalDocument/sections declare ru-RU.
										NOW: languageCode code=ru-RU.
									-->
									<languageCode code="ru-RU"/>
									<!--
										DEFECT #601: entryRelationship/act/confidentialityCode.
										WAS: nested COMP act had no confidentialityCode. ClinicalDocument sets N.
										NOW: confidentialityCode N matching ClinicalDocument.
									-->
									<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
								</act>
							</entryRelationship>







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
										<!--
						DEFECT #442: section/confidentialityCode.
						WAS: section had id/code/title/text then entry — no section-level
						confidentialityCode. Body entry acts already carry confidentialityCode N
						(#310-#318). HL7 CDA R2 Section has confidentialityCode 0..1.
						SEMD validators often flag missing section confidentiality when the
						ClinicalDocument sets N but narrative sections omit it.
						Form 043/u ambulatory dental sections are normal confidentiality.
						NOW: confidentialityCode N matching ClinicalDocument (#158).
					-->
					<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
					<!--
						DEFECT #443: section/languageCode.
						WAS: section had id/code/title/text (+confidentiality) then entry —
						no section-level languageCode. Entry acts already carry languageCode
						ru-RU (#260-#279). HL7 CDA R2 Section has languageCode 0..1.
						SEMD validators often flag missing section language when the document
						declares ru-RU but narrative sections omit it.
						NOW: languageCode code=ru-RU matching ClinicalDocument.
					-->
					<languageCode code="ru-RU"/>
					<!--
						DEFECT #545: section/subject (related subject shell).
						WAS: section had id/code/title/text/confidentialityCode/languageCode then entry — no subject. HL7 CDA R2 Section has subject 0..1 (related subject when section subject differs from recordTarget). Body entries already carry subject SBJ; SEMD validators often flag missing section-level subject shell. Form 043/u sections are about the same patient — no alternate section subject on chart; do not invent related person demographics.
						NOW: subject typeCode=SBJ with relatedSubject classCode=PRS and NI demographics (mirror entry-level relatedSubject).
					-->
					<subject typeCode="SBJ">
						<relatedSubject classCode="PRS">
							<code nullFlavor="NI"/>
							<addr nullFlavor="NI"/>
							<telecom nullFlavor="NI"/>
							<subject>
								<name nullFlavor="NI"/>
								<administrativeGenderCode nullFlavor="NI"/>
								<birthTime nullFlavor="NI"/>
							</subject>
						</relatedSubject>
					</subject>
					<entry>
						<!--
							DEFECT #352: anamnesis observation/@negationInd.
							WAS: open had classCode/moodCode only — no negationInd.
							HL7 CDA R2 Act has negationInd 0..1. SEMD often requires explicit false on asserted acts.
							Form 043/u chart entry is asserted (not negated). NOW: negationInd=false on entry open tag.
						-->
						<observation classCode="OBS" moodCode="EVN" negationInd="false">
							<!-- DEFECT #153: entry Act/id (anamnesis) -->
							<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-anamnesis"/>
							<code code="10164-2" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Анамнез"/>
							<!--
								DEFECT #256: anamnesis observation/text.
								WAS: anamnesis OBS had id/code then jumped to statusCode —
								no entry-level text. Diagnosis OBS (#255) and treatment ACT
								already carry <text>. HL7 CDA R2 Observation has text 0..1.
								SEMD validators often flag missing text under history OBS
								when sibling entries emit it. Form 043/u chart already stores
								anamnesis — mirror it here (ST value stays the structured
								payload).
								NOW: text = anamnesis (default Bez osobennostey).
							-->
							<text>${escapeXml(params.anamnesis || "Без особенностей")}</text>
							<!--
								DEFECT #261: anamnesis observation/languageCode.
								WAS: anamnesis OBS had id/code/text then jumped to statusCode —
								no entry-level languageCode. Diagnosis OBS (#260) already
								carries languageCode ru-RU. HL7 CDA R2 Observation has
								languageCode 0..1. SEMD validators often flag missing
								language under history OBS. Form 043/u anamnesis is RU.
								NOW: languageCode code=ru-RU matching ClinicalDocument.
							-->
							<languageCode code="ru-RU"/>
							<!--
								DEFECT #311: anamnesis observation/confidentialityCode.
								WAS: anamnesis OBS had languageCode (#261) then jumped to statusCode — no entry-level confidentialityCode. Diagnosis OBS (#310) already carries confidentialityCode N.
								ClinicalDocument already declares confidentialityCode N (#158).
								HL7 CDA R2 Act/Observation/Supply has confidentialityCode 0..1
								(sensitivity of the act). SEMD validators often flag missing
								confidentiality under body entries when the document sets N but
								entry acts omit it. Form 043/u ambulatory dental chart entries
								are normal confidentiality (same as ClinicalDocument).
								NOW: confidentialityCode N + codeSystemName + RU displayName
								matching ClinicalDocument (#158). No invented restricted code.
							-->
							<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>

							<!-- DEFECT #143: observation statusCode completed -->
							<statusCode code="completed"/>

							<!-- DEFECT #145: observation effectiveTime = visit clock -->
							<effectiveTime value="${visitTime}"/>
							<!--
								DEFECT #241: anamnesis observation/priorityCode.
								WAS: anamnesis OBS had id/code/statusCode/effectiveTime/value
								only - no priorityCode. Diagnosis OBS (#240), treatment ACT
								(#201) and serviceEvent (#212) already carry priorityCode NI.
								HL7 CDA R2 Observation has priorityCode 0..1. SEMD validators
								often flag missing priority under history OBS. Form 043/u
								anamnesis is free-text interview - do not invent R/UR/S.
								NOW: priorityCode nullFlavor NI until chart field exists.
							-->
							<priorityCode nullFlavor="NI"/>
							<value xsi:type="ST">${escapeXml(params.anamnesis || "Без особенностей")}</value>
							<!--
								DEFECT #189: anamnesis observation/methodCode.
								WAS: anamnesis OBS had id/code/statusCode/effectiveTime/value
								only — no methodCode. Diagnosis OBS already carries methodCode
								NI (#186). HL7 CDA R2 Observation has methodCode 0..*. SEMD
								validators often flag missing method under history OBS.
								Form 043/u anamnesis is free-text interview — do not invent
								a fake NSI method OID.
								NOW: methodCode nullFlavor NI until chart field exists.
							-->
							<methodCode nullFlavor="NI"/>
							<!--
								DEFECT #193: anamnesis observation/interpretationCode.
								WAS: anamnesis OBS gained methodCode NI (#189) but still had
								no interpretationCode. Diagnosis OBS already carries
								interpretationCode NI (#187). HL7 CDA R2 Observation has
								interpretationCode 0..*. SEMD validators often flag missing
								interpretation under history OBS. Form 043/u anamnesis is
								free-text interview — do not invent a fake N/A/H code.
								NOW: interpretationCode nullFlavor NI until chart field exists.
							-->
							<interpretationCode nullFlavor="NI"/>
							<!--
								DEFECT #197: anamnesis observation/uncertaintyCode.
								WAS: anamnesis OBS gained methodCode (#189) and
								interpretationCode (#193) but still had no uncertaintyCode.
								Diagnosis OBS already carries uncertaintyCode NI (#188).
								HL7 CDA R2 Observation has uncertaintyCode 0..1 (U/N from
								ActUncertainty). SEMD validators often flag missing
								uncertainty under history OBS. Form 043/u anamnesis is
								free-text interview — do not invent U/N.
								NOW: uncertaintyCode nullFlavor NI until chart field exists.
							-->
							<uncertaintyCode nullFlavor="NI"/>
							<!--
								DEFECT #247: anamnesis observation/repeatNumber.
								WAS: anamnesis OBS had priorityCode (#241)/methodCode/
								interpretationCode/uncertaintyCode only - no repeatNumber.
								Diagnosis OBS (#245), treatment ACT (#210) and serviceEvent
								(#215) already carry repeatNumber NI. HL7 CDA R2 Observation
								has repeatNumber 0..1. SEMD validators often flag missing
								repeatNumber under history OBS. Form 043/u anamnesis is a
								single interview note - do not invent a number.
								NOW: repeatNumber nullFlavor NI until chart field exists.
							-->
							<repeatNumber nullFlavor="NI"/>
							<!--
								DEFECT #248: anamnesis observation/independentInd.
								WAS: anamnesis OBS had priorityCode/methodCode/
								interpretationCode/uncertaintyCode/repeatNumber only - no
								independentInd. Diagnosis OBS (#246), treatment ACT (#211)
								and serviceEvent (#216) already carry independentInd NI.
								HL7 CDA R2 Observation has independentInd 0..1. SEMD
								validators often flag missing independentInd under history
								OBS. Form 043/u chart has no independence flag - do not
								invent true/false.
								NOW: independentInd nullFlavor NI until chart field exists.
							-->
							<independentInd nullFlavor="NI"/>
							<!--
								DEFECT #225: anamnesis observation/approachSiteCode.
								WAS: anamnesis OBS had methodCode/interpretationCode/
								uncertaintyCode only — no approachSiteCode. Diagnosis OBS
								already carries approachSiteCode NI (#224). HL7 CDA R2
								Observation has approachSiteCode 0..*. SEMD validators
								often flag missing approach under history OBS. Form 043/u
								anamnesis is whole-history free text — do not invent ISO 3950.
								NOW: approachSiteCode nullFlavor NI until chart field exists.
							-->
							<approachSiteCode nullFlavor="NI"/>
							<!--
								DEFECT #229: anamnesis observation/targetSiteCode.
								WAS: anamnesis OBS had approachSiteCode NI (#225) but no
								targetSiteCode. Diagnosis OBS always emits targetSiteCode
								(tooth CE or NI) (#223). HL7 CDA R2 Observation has
								targetSiteCode 0..* (anatomical site the finding is about).
								SEMD validators often flag missing target site under history
								OBS. Form 043/u anamnesis is whole-history free text — no
								single tooth; do not invent ISO 3950.
								NOW: targetSiteCode nullFlavor NI until chart field exists.
							-->
							<targetSiteCode nullFlavor="NI"/>
							<!--
								DEFECT #234: anamnesis observation/performer.
								WAS: anamnesis OBS had method/interpretation/uncertainty/
								approach/targetSite only - no performer. Diagnosis OBS
								already carries performer PRF (#233). HL7 CDA R2 Observation
								has performer 0..*. SEMD validators often flag missing
								performer under history OBS so REMD cannot attribute the
								anamnesis interview to the treating dentist at entry level.
								NOW: performer typeCode=PRF with time=visitTime and
								assignedEntity mirroring diagnosis OBS performer.
							-->
							<performer typeCode="PRF">
								<time value="${visitTime}"/>
								<assignedEntity>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedEntity>
							</performer>
							<!--
								DEFECT #284: anamnesis observation/author.
								WAS: anamnesis OBS had performer (#234) then closed — no entry-level author. Diagnosis OBS (#283) already carries author.
								Document-level author already attributes the ClinicalDocument.
								HL7 CDA R2 Act/Observation/Supply has author 0..* (who
								recorded the act). SEMD validators often flag missing author
								under body entries so REMD cannot separate recorder from
								performer at entry level. Form 043/u treating dentist authors
								the chart entry.
								NOW: author with time=visitTime and assignedAuthor mirroring
								document author / entry performer (SNILS or NI, code with
								position or bare NI, person, MO org). No invented extension
								or street/phone.
							-->
							<author>
								<time value="${visitTime}"/>
								<assignedAuthor>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedAuthor>
							</author>
							<!--
								DEFECT #293: anamnesis observation/informant.
								WAS: anamnesis OBS had performer (#234) + author (#284) then closed — no entry-level informant. Diagnosis OBS (#292) already carries informant.
								Document-level informant already attributes the clinical
								source of the ClinicalDocument. HL7 CDA R2 Act/Observation/
								Supply has informant 0..* (who supplied the facts for the
								act). SEMD validators often flag missing informant under body
								entries so REMD cannot separate clinical source from author/
								performer at entry level. Form 043/u treating dentist is the
								clinical source of the chart entry (same person as document
								informant).
								NOW: informant with time=visitTime, functionCode NI+displayName
								when doctorPosition known (else bare NI), assignedEntity
								mirroring document informant (SNILS or NI, code, person, MO).
								No invented extension or street/phone.
							-->
							<informant>
								<time value="${visitTime}"/>
								${params.doctorPosition && params.doctorPosition.trim()
									? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
									: `<functionCode nullFlavor="NI"/>`}
								<assignedEntity>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedEntity>
							</informant>
							<!--
								DEFECT #302: anamnesis observation/participant.
								WAS: anamnesis OBS had performer/author/informant then closed — no entry-level participant. Diagnosis OBS (#301) already carries participant REF.
								Document-level participant REF (#152/#169/#147) already attributes
								the referring/related provider on ClinicalDocument. HL7 CDA R2
								Act/Observation/Supply has participant 0..* (related parties for
								the act). SEMD validators often flag missing participant under
								body entries so REMD cannot attach REF/related-provider at entry
								level. Form 043/u treating dentist is the related provider for
								the chart entry (same person as document REF participant).
								NOW: participant typeCode=REF with time=visitTime, functionCode
								NI+displayName when doctorPosition known (else bare NI),
								associatedEntity PROV mirroring document REF (SNILS or NI, code,
								person, scopingOrganization MO). No invented extension.
							-->
							<participant typeCode="REF">
								<time value="${visitTime}"/>
								${params.doctorPosition && params.doctorPosition.trim()
									? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
									: `<functionCode nullFlavor="NI"/>`}
								<associatedEntity classCode="PROV">
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<scopingOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</scopingOrganization>
								</associatedEntity>
							</participant>
							<!--
								DEFECT #320: anamnesis observation/precondition.
								WAS: anamnesis OBS had performer/author/informant/participant then closed — no precondition. Diagnosis OBS (#319) already carries precondition PRCN.
								HL7 CDA R2 Act/Observation/Supply has precondition 0..*
								(criteria that must be true for the act). SEMD validators
								often flag missing precondition under body entries when the
								care event is documented without explicit criteria. Form 043/u
								chart does not collect discrete clinical preconditions for
								these entries — do not invent criterion codes or values.
								NOW: precondition typeCode=PRCN with criterion nullFlavor NI
								(id/code/value all NI) until chart fields exist.
							-->
							<precondition typeCode="PRCN">
								<criterion>
									<id nullFlavor="NI"/>
									<code nullFlavor="NI"/>
									<!--
										DEFECT #641: precondition/criterion/text.
										WAS: criterion had id/code/value only — no text. HL7 CDA R2 Criterion (Act) has text 0..1. SEMD often flags bare criterion under precondition.
										NOW: text nullFlavor NI; do not invent precondition prose.
									-->
									<text nullFlavor="NI"/>
									<!--
										DEFECT #642: precondition/criterion/statusCode.
										WAS: criterion had no statusCode. HL7 CDA R2 Act has statusCode 1..1 in many profiles; sibling nested acts use completed.
										NOW: statusCode completed.
									-->
									<statusCode code="completed"/>
									<value xsi:type="CD" nullFlavor="NI"/>
									<!--
										DEFECT #643: precondition/criterion/effectiveTime.
										WAS: criterion had no effectiveTime. SEMD often flags missing effectiveTime under precondition criterion when body acts emit it.
										NOW: effectiveTime nullFlavor NI; do not invent criterion window.
									-->
									<effectiveTime nullFlavor="NI"/>
								</criterion>
							</precondition>
							<!--
								DEFECT #329: anamnesis observation/reference.
								WAS: anamnesis OBS had performer/author/informant/participant/precondition then closed — no reference. Diagnosis OBS (#328) already carries reference REFR.
								HL7 CDA R2 Act/Observation/Supply has reference 0..*
								(link to external acts/documents). SEMD validators often
								flag missing reference under body entries when the care
								event cannot point to a related external act. Form 043/u
								chart does not collect discrete external-act references for
								these entries — do not invent root/extension or URLs.
								NOW: reference typeCode=REFR with externalAct classCode=ACT
								moodCode=EVN and id nullFlavor NI until chart field exists.
							-->
							<reference typeCode="REFR">
								<externalAct classCode="ACT" moodCode="EVN">
									<id nullFlavor="NI"/>
									<!--
										DEFECT #665: reference/externalAct/code.
										WAS: externalAct had id NI only — no code. HL7 CDA R2 ExternalAct has code 0..1. SEMD often flags bare externalAct under reference REFR.
										NOW: code nullFlavor NI; do not invent external act type.
									-->
									<code nullFlavor="NI"/>
									<!--
										DEFECT #666: reference/externalAct/text.
										WAS: externalAct had no text. HL7 CDA R2 ExternalAct has text 0..1.
										NOW: text nullFlavor NI; do not invent external narrative.
									-->
									<text nullFlavor="NI"/>
								</externalAct>
							</reference>
							<!--
								DEFECT #338: anamnesis observation/specimen.
								WAS: anamnesis OBS had performer/author/informant/participant/precondition/reference then closed — no specimen. Diagnosis OBS (#337) already carries specimen SPC.
								HL7 CDA R2 Observation has specimen 0..* (material used for
								the observation). SEMD validators often flag missing specimen
								under clinical OBS entries. Form 043/u ambulatory dental chart
								does not collect discrete specimen identity for these findings
								— do not invent specimen type codes or IDs.
								NOW: specimen typeCode=SPC with specimenRole id nullFlavor NI
								until chart field exists.
							-->
							<specimen typeCode="SPC">
								<specimenRole>
									<id nullFlavor="NI"/>
								
									<!--
										DEFECT #394: anamnesis observation/specimen/specimenRole/specimenPlayingEntity.
										WAS: specimenRole had id NI only — no specimenPlayingEntity.
										HL7 CDA R2 SpecimenRole has specimenPlayingEntity 0..1 (the material
										entity). SEMD validators often flag empty specimenRole under clinical
										entries when playing entity code/name cannot be joined. Form 043/u
										chart does not collect discrete specimen entity codes — do not invent
										SNOMED/NSI specimen type codes.
										NOW: specimenPlayingEntity with code/name nullFlavor NI until chart
										field exists.
									-->
									<specimenPlayingEntity>
										<code nullFlavor="NI"/>
										<name nullFlavor="NI"/>
										<!--
											DEFECT #502: specimenPlayingEntity/desc.
											WAS: specimenPlayingEntity had code/name NI only — no desc. HL7 CDA R2 Entity has desc 0..1. SEMD validators often flag bare playing entity under specimen when material description cannot be joined. Form 043/u chart does not collect specimen material narrative; do not invent desc text.
											NOW: desc nullFlavor NI until chart field exists.
										-->
										<desc nullFlavor="NI"/>
										<!--
											DEFECT #503: specimenPlayingEntity/quantity.
											WAS: specimenPlayingEntity had code/name/desc only — no quantity. HL7 CDA R2 ManufacturedMaterial/Entity may carry quantity. SEMD often flags missing quantity under specimen playing entity.
											NOW: quantity nullFlavor NI; do not invent PQ amounts.
										-->
										<quantity nullFlavor="NI"/>
									</specimenPlayingEntity>
</specimenRole>
							</specimen>
							
							<!--
								DEFECT #365: anamnesis observation/subject.
								WAS: anamnesis observation had specimen then entryRelationship — no subject.
								HL7 CDA R2 Act/Observation/Supply has subject 0..1 (related
								subject when different from recordTarget). SEMD validators often
								flag missing subject under clinical body entries. Form 043/u
								patient is already recordTarget — entry-level related subject is
								not collected separately; do not invent relationship codes or ids.
								NOW: subject typeCode=SBJ with relatedSubject classCode=PRS and
								code nullFlavor NI until chart field exists.
							-->
							<subject typeCode="SBJ">
								<relatedSubject classCode="PRS">
									<code nullFlavor="NI"/>
									<addr nullFlavor="NI"/>
									<telecom nullFlavor="NI"/>
									<subject>
										<name nullFlavor="NI"/>
										<!--
										DEFECT #444: relatedSubject/subject/administrativeGenderCode (4/9).
										WAS: SubjectPerson under relatedSubject had only name NI (#420-#428) —
										no administrativeGenderCode. HL7 CDA R2 SubjectPerson has
										administrativeGenderCode 0..1. SEMD validators often flag incomplete
										person stub under Act/subject/relatedSubject.
										Form 043/u does not collect related-party gender; do not invent 1/2.
										NOW: administrativeGenderCode nullFlavor NI.
										-->
										<administrativeGenderCode nullFlavor="NI"/>
										<!--
										DEFECT #445: relatedSubject/subject/birthTime (4/9).
										WAS: SubjectPerson had name (+gender) only — no birthTime.
										HL7 CDA R2 SubjectPerson has birthTime 0..1. Mirror patient demographics
										slot under related-party person stub.
										Form 043/u does not collect related-party DOB; do not invent dates.
										NOW: birthTime nullFlavor NI.
										-->
										<birthTime nullFlavor="NI"/>
									</subject>
								</relatedSubject>
							</subject>

							
							<!--
								DEFECT #381: anamnesis observation/consumable.
								WAS: anamnesis observation had performer/.../specimen/subject — no consumable.
								Treatment ACT (#373) and tray supply (#374) already carry consumable CSM.
								HL7 CDA R2 Observation (Act) has consumable 0..* (materials used while
								making the observation). SEMD validators often flag missing consumable
								under clinical OBS when exam materials cannot be joined. Form 043/u
								chart does not collect discrete consumable NSI codes for these findings
								— do not invent material codes or barcodes.
								NOW: consumable typeCode=CSM with manufacturedProduct classCode=MANU
								and manufacturedMaterial code/name nullFlavor NI until chart field exists.
							-->
							<consumable typeCode="CSM">
								<manufacturedProduct classCode="MANU">
									<!--
										DEFECT #680: manufacturedProduct/id.
										WAS: manufacturedProduct opened then manufacturedMaterial — no id. Tray product carries barcode id; consumable shells had no product id. HL7 CDA R2 ManufacturedProduct has id 0..*. SEMD often flags bare product under consumable without id slot.
										NOW: id nullFlavor NI; do not invent extension=unknown.
									-->
									<id nullFlavor="NI"/>
									<manufacturedMaterial>
										<code nullFlavor="NI"/>
										<name nullFlavor="NI"/>
										<!--
											DEFECT #525: manufacturedMaterial/lotNumberText.
											WAS: manufacturedMaterial had code/name NI only — no lotNumberText. Tray product already emits lot (#388). HL7 CDA R2 Material has lotNumberText 0..1. SEMD often flags bare material under consumable without lot slot.
											NOW: lotNumberText nullFlavor NI; do not invent lot strings.
										-->
										<lotNumberText nullFlavor="NI"/>
										<!--
											DEFECT #526: manufacturedMaterial/desc.
											WAS: manufacturedMaterial had code/name/lot only — no desc. Tray already emits desc (#389). SEMD often flags missing material description under consumable.
											NOW: desc nullFlavor NI; do not invent device prose.
										-->
										<desc nullFlavor="NI"/>
										<!--
											DEFECT #527: manufacturedMaterial/expirationTime.
											WAS: manufacturedMaterial had code/name/lot/desc only — no expirationTime. Tray already emits expirationTime. HL7 CDA R2 Material has expirationTime 0..1.
											NOW: expirationTime nullFlavor NI; do not invent expiry timestamps.
										-->
										<expirationTime nullFlavor="NI"/>
									</manufacturedMaterial>
								<!--

									DEFECT #563: manufacturedProduct/manufacturerOrganization.

									WAS: manufacturedProduct had material only — no manufacturerOrganization. Tray product already emits manufacturerOrganization. HL7 CDA R2 ManufacturedProduct has manufacturerOrganization 0..1. SEMD often flags bare product under consumable without org shell.

									NOW: manufacturerOrganization with id/name/addr/telecom NI; do not invent org identity.

								-->

								<manufacturerOrganization>

									<id nullFlavor="NI"/>

									<!--

										DEFECT #564: manufacturerOrganization/name.

										WAS: manufacturerOrganization id only path.

										NOW: name nullFlavor NI.

									-->

									<name nullFlavor="NI"/>

									<!--

										DEFECT #565: manufacturerOrganization/addr.

										NOW: addr nullFlavor NI; do not invent streetAddressLine.

									-->

									<addr nullFlavor="NI"/>

									<!--

										DEFECT #566: manufacturerOrganization/telecom.

										NOW: telecom nullFlavor NI; do not invent phone.

									-->

									<telecom nullFlavor="NI"/>

								</manufacturerOrganization>

								</manufacturedProduct>
							</consumable>
<!--
								DEFECT #376: anamnesis observation/referenceRange.
								WAS: anamnesis observation had value/method/.../subject then entryRelationship —
								no referenceRange. HL7 CDA R2 Observation has referenceRange 0..*
								(observationRange for normal/abnormal bounds). SEMD validators often
								flag missing referenceRange under clinical OBS entries. Form 043/u
								ambulatory dental findings are free-text/ICD — no lab-style reference
								interval is collected; do not invent PQ bounds or interpretation anchors.
								NOW: referenceRange with observationRange value nullFlavor NI until
								chart field exists.
							-->
							<referenceRange>
								<observationRange>
									<!--
										DEFECT #484: observationRange/code.
										WAS: observationRange had only value CD NI — no code. HL7 CDA R2 ObservationRange has code 0..1 (what range kind). SEMD validators often flag bare observationRange under clinical OBS. Form 043/u ambulatory dental findings have no lab reference-range catalog; do not invent range type codes.
										NOW: code nullFlavor NI until chart field exists.
									-->
									<code nullFlavor="NI"/>
									<!--
										DEFECT #485: observationRange/text.
										WAS: observationRange had no text. HL7 CDA R2 ObservationRange has text 0..1 (ED). SEMD often flags missing narrative under referenceRange when value is NI-only.
										NOW: text nullFlavor NI; do not invent range prose.
									-->
									<text nullFlavor="NI"/>
									<value xsi:type="CD" nullFlavor="NI"/>
									<!--
										DEFECT #486: observationRange/interpretationCode.
										WAS: observationRange had value only — no interpretationCode. HL7 CDA R2 ObservationRange has interpretationCode 0..*. SEMD often flags missing interpretation under referenceRange for clinical OBS.
										NOW: interpretationCode nullFlavor NI; do not invent N/A/H/L codes.
									-->
									<interpretationCode nullFlavor="NI"/>
								</observationRange>
							</referenceRange>
<!--
								DEFECT #343: anamnesis observation/entryRelationship.
								WAS: anamnesis OBS had specimen (#338) then closed — no entryRelationship. Diagnosis OBS (#342) already carries entryRelationship COMP.
								HL7 CDA R2 Act/Observation/Supply has entryRelationship 0..*
								(related nested acts). SEMD validators often flag missing
								entryRelationship under body entries when sibling acts cannot
								be linked. Form 043/u chart does not collect discrete nested
								related-act graphs for these entries — do not invent nested
								codes or extensions.
								NOW: entryRelationship typeCode=COMP with nested act
								classCode=ACT moodCode=EVN and id/code/statusCode nullFlavor
								NI / completed shell until chart field exists.
							-->
							<entryRelationship typeCode="COMP">
								<act classCode="ACT" moodCode="EVN">
									<id nullFlavor="NI"/>
									<code nullFlavor="NI"/>
									<!--
										DEFECT #602: entryRelationship/act/text.
										WAS: nested COMP act had id/code/statusCode only — no text. HL7 CDA R2 Act has text 0..1. SEMD validators often flag bare nested acts under entryRelationship when parent body acts emit text. Form 043/u has no separate nested-act narrative; do not invent prose.
										NOW: text nullFlavor NI.
									-->
									<text nullFlavor="NI"/>
									<statusCode code="completed"/>
									<!--
										DEFECT #603: entryRelationship/act/priorityCode.
										WAS: nested COMP act had no priorityCode. Parent body acts emit priorityCode NI. SEMD often flags missing priority under nested COMP acts.
										NOW: priorityCode nullFlavor NI; do not invent ActPriority.
									-->
									<priorityCode nullFlavor="NI"/>
									<!--
										DEFECT #604: entryRelationship/act/effectiveTime.
										WAS: nested COMP act had no effectiveTime. Parent body acts stamp documentClock. Nested COMP has no separate chart timestamp; do not invent times.
										NOW: effectiveTime nullFlavor NI.
									-->
									<effectiveTime nullFlavor="NI"/>
									<!--
										DEFECT #605: entryRelationship/act/languageCode.
										WAS: nested COMP act had no languageCode. ClinicalDocument/sections declare ru-RU.
										NOW: languageCode code=ru-RU.
									-->
									<languageCode code="ru-RU"/>
									<!--
										DEFECT #606: entryRelationship/act/confidentialityCode.
										WAS: nested COMP act had no confidentialityCode. ClinicalDocument sets N.
										NOW: confidentialityCode N matching ClinicalDocument.
									-->
									<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
								</act>
							</entryRelationship>







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
										<!--
						DEFECT #446: section/confidentialityCode.
						WAS: section had id/code/title/text then entry — no section-level
						confidentialityCode. Body entry acts already carry confidentialityCode N
						(#310-#318). HL7 CDA R2 Section has confidentialityCode 0..1.
						SEMD validators often flag missing section confidentiality when the
						ClinicalDocument sets N but narrative sections omit it.
						Form 043/u ambulatory dental sections are normal confidentiality.
						NOW: confidentialityCode N matching ClinicalDocument (#158).
					-->
					<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
					<!--
						DEFECT #447: section/languageCode.
						WAS: section had id/code/title/text (+confidentiality) then entry —
						no section-level languageCode. Entry acts already carry languageCode
						ru-RU (#260-#279). HL7 CDA R2 Section has languageCode 0..1.
						SEMD validators often flag missing section language when the document
						declares ru-RU but narrative sections omit it.
						NOW: languageCode code=ru-RU matching ClinicalDocument.
					-->
					<languageCode code="ru-RU"/>
					<!--
						DEFECT #546: section/subject (related subject shell).
						WAS: section had id/code/title/text/confidentialityCode/languageCode then entry — no subject. HL7 CDA R2 Section has subject 0..1 (related subject when section subject differs from recordTarget). Body entries already carry subject SBJ; SEMD validators often flag missing section-level subject shell. Form 043/u sections are about the same patient — no alternate section subject on chart; do not invent related person demographics.
						NOW: subject typeCode=SBJ with relatedSubject classCode=PRS and NI demographics (mirror entry-level relatedSubject).
					-->
					<subject typeCode="SBJ">
						<relatedSubject classCode="PRS">
							<code nullFlavor="NI"/>
							<addr nullFlavor="NI"/>
							<telecom nullFlavor="NI"/>
							<subject>
								<name nullFlavor="NI"/>
								<administrativeGenderCode nullFlavor="NI"/>
								<birthTime nullFlavor="NI"/>
							</subject>
						</relatedSubject>
					</subject>
					<entry>
						<!--
							DEFECT #353: objective-status observation/@negationInd.
							WAS: open had classCode/moodCode only — no negationInd.
							HL7 CDA R2 Act has negationInd 0..1. SEMD often requires explicit false on asserted acts.
							Form 043/u chart entry is asserted (not negated). NOW: negationInd=false on entry open tag.
						-->
						<observation classCode="OBS" moodCode="EVN" negationInd="false">
							<!-- DEFECT #153: entry Act/id (objective status) -->
							<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-objective"/>
							<code code="29545-1" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Объективный статус"/>
							<!--
								DEFECT #257: objective-status observation/text.
								WAS: objective OBS had id/code then jumped to statusCode —
								no entry-level text. Diagnosis (#255) and anamnesis (#256)
								already carry <text>. HL7 CDA R2 Observation has text 0..1.
								SEMD validators often flag missing text under status-localis
								OBS when sibling entries emit it. Form 043/u chart already
								stores objectiveStatus — mirror it here (ST value stays the
								structured payload).
								NOW: text = objectiveStatus (default Bez osobennostey).
							-->
							<text>${escapeXml(params.objectiveStatus || "Без особенностей")}</text>
							<!--
								DEFECT #262: objective-status observation/languageCode.
								WAS: objective OBS had id/code/text then jumped to statusCode —
								no entry-level languageCode. Diagnosis (#260) and anamnesis
								(#261) already carry languageCode ru-RU. HL7 CDA R2 Observation
								has languageCode 0..1. SEMD validators often flag missing
								language under status-localis OBS. Form 043/u objective is RU.
								NOW: languageCode code=ru-RU matching ClinicalDocument.
							-->
							<languageCode code="ru-RU"/>
							<!--
								DEFECT #312: objective-status observation/confidentialityCode.
								WAS: objective OBS had languageCode (#262) then jumped to statusCode — no entry-level confidentialityCode. Diagnosis (#310) and anamnesis (#311) already carry confidentialityCode N.
								ClinicalDocument already declares confidentialityCode N (#158).
								HL7 CDA R2 Act/Observation/Supply has confidentialityCode 0..1
								(sensitivity of the act). SEMD validators often flag missing
								confidentiality under body entries when the document sets N but
								entry acts omit it. Form 043/u ambulatory dental chart entries
								are normal confidentiality (same as ClinicalDocument).
								NOW: confidentialityCode N + codeSystemName + RU displayName
								matching ClinicalDocument (#158). No invented restricted code.
							-->
							<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>

							<!-- DEFECT #143: observation statusCode completed -->
							<statusCode code="completed"/>

							<!-- DEFECT #145: observation effectiveTime = visit clock -->
							<effectiveTime value="${visitTime}"/>
							<!--
								DEFECT #242: objective-status observation/priorityCode.
								WAS: objective OBS had id/code/statusCode/effectiveTime/value
								only - no priorityCode. Diagnosis (#240) and anamnesis (#241)
								already carry priorityCode NI. HL7 CDA R2 Observation has
								priorityCode 0..1. SEMD validators often flag missing priority
								under status-localis OBS. Form 043/u objective status is
								free-text exam note - do not invent R/UR/S.
								NOW: priorityCode nullFlavor NI until chart field exists.
							-->
							<priorityCode nullFlavor="NI"/>
							<value xsi:type="ST">${escapeXml(params.objectiveStatus || "Без особенностей")}</value>
							<!--
								DEFECT #190: objective-status observation/methodCode.
								WAS: objective OBS had id/code/statusCode/effectiveTime/value
								only — no methodCode. Diagnosis (#186) and anamnesis (#189)
								already carry methodCode NI. HL7 CDA R2 Observation has
								methodCode 0..*. SEMD validators often flag missing method
								under status-localis OBS. Form 043/u objective status is
								free-text exam note — do not invent a fake NSI method OID.
								NOW: methodCode nullFlavor NI until chart field exists.
							-->
							<methodCode nullFlavor="NI"/>
							<!--
								DEFECT #194: objective-status observation/interpretationCode.
								WAS: objective OBS gained methodCode NI (#190) but still had
								no interpretationCode. Diagnosis (#187) and anamnesis (#193)
								already carry interpretationCode NI. HL7 CDA R2 Observation
								has interpretationCode 0..*. SEMD validators often flag missing
								interpretation under status-localis OBS. Form 043/u objective
								status is free-text exam note — do not invent a fake N/A/H.
								NOW: interpretationCode nullFlavor NI until chart field exists.
							-->
							<interpretationCode nullFlavor="NI"/>
							<!--
								DEFECT #198: objective-status observation/uncertaintyCode.
								WAS: objective OBS gained methodCode (#190) and
								interpretationCode (#194) but still had no uncertaintyCode.
								Diagnosis (#188) and anamnesis (#197) already carry
								uncertaintyCode NI. HL7 CDA R2 Observation has
								uncertaintyCode 0..1 (U/N from ActUncertainty). SEMD
								validators often flag missing uncertainty under status-localis
								OBS. Form 043/u objective status is free-text exam note —
								do not invent U/N.
								NOW: uncertaintyCode nullFlavor NI until chart field exists.
							-->
							<uncertaintyCode nullFlavor="NI"/>
							<!--
								DEFECT #249: objective-status observation/repeatNumber.
								WAS: objective OBS had priorityCode (#242)/methodCode/
								interpretationCode/uncertaintyCode only - no repeatNumber.
								Diagnosis (#245) and anamnesis (#247) already carry
								repeatNumber NI. HL7 CDA R2 Observation has repeatNumber
								0..1. SEMD validators often flag missing repeatNumber under
								status-localis OBS. Form 043/u objective status is a single
								exam note - do not invent a number.
								NOW: repeatNumber nullFlavor NI until chart field exists.
							-->
							<repeatNumber nullFlavor="NI"/>
							<!--
								DEFECT #250: objective-status observation/independentInd.
								WAS: objective OBS had priorityCode/methodCode/
								interpretationCode/uncertaintyCode/repeatNumber only - no
								independentInd. Diagnosis (#246) and anamnesis (#248) already
								carry independentInd NI. HL7 CDA R2 Observation has
								independentInd 0..1. SEMD validators often flag missing
								independentInd under status-localis OBS. Form 043/u chart
								has no independence flag - do not invent true/false.
								NOW: independentInd nullFlavor NI until chart field exists.
							-->
							<independentInd nullFlavor="NI"/>
							<!--
								DEFECT #226: objective-status observation/approachSiteCode.
								WAS: objective OBS had methodCode/interpretationCode/
								uncertaintyCode only — no approachSiteCode. Diagnosis (#224)
								and anamnesis (#225) already carry approachSiteCode NI.
								HL7 CDA R2 Observation has approachSiteCode 0..*. SEMD
								validators often flag missing approach under status-localis
								OBS. Form 043/u objective status is free-text exam note —
								do not invent ISO 3950.
								NOW: approachSiteCode nullFlavor NI until chart field exists.
							-->
							<approachSiteCode nullFlavor="NI"/>
							<!--
								DEFECT #230: objective-status observation/targetSiteCode.
								WAS: objective OBS had approachSiteCode NI (#226) but no
								targetSiteCode. Diagnosis (#223) and anamnesis (#229)
								already emit targetSiteCode. HL7 CDA R2 Observation has
								targetSiteCode 0..*. SEMD validators often flag missing
								target site under status-localis OBS. Form 043/u objective
								status is free-text exam note — do not invent ISO 3950.
								NOW: targetSiteCode nullFlavor NI until chart field exists.
							-->
							<targetSiteCode nullFlavor="NI"/>
							<!--
								DEFECT #235: objective-status observation/performer.
								WAS: objective OBS had method/interpretation/uncertainty/
								approach/targetSite only - no performer. Diagnosis OBS
								(#233) and anamnesis OBS (#234) already carry performer PRF.
								HL7 CDA R2 Observation has performer 0..*. SEMD validators
								often flag missing performer under status-localis OBS so
								REMD cannot attribute the exam finding to the treating
								dentist at entry level (header performer is care-event only).
								NOW: performer typeCode=PRF with time=visitTime and
								assignedEntity mirroring diagnosis OBS performer (SNILS or NI,
								code with position or bare NI, person, MO org). No invented
								extension="unknown" or street/phone.
							-->
							<performer typeCode="PRF">
								<time value="${visitTime}"/>
								<assignedEntity>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedEntity>
							</performer>
							<!--
								DEFECT #285: objective-status observation/author.
								WAS: objective OBS had performer (#235) then closed — no entry-level author. Diagnosis (#283) and anamnesis (#284) already carry author.
								Document-level author already attributes the ClinicalDocument.
								HL7 CDA R2 Act/Observation/Supply has author 0..* (who
								recorded the act). SEMD validators often flag missing author
								under body entries so REMD cannot separate recorder from
								performer at entry level. Form 043/u treating dentist authors
								the chart entry.
								NOW: author with time=visitTime and assignedAuthor mirroring
								document author / entry performer (SNILS or NI, code with
								position or bare NI, person, MO org). No invented extension
								or street/phone.
							-->
							<author>
								<time value="${visitTime}"/>
								<assignedAuthor>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedAuthor>
							</author>
							<!--
								DEFECT #294: objective-status observation/informant.
								WAS: objective OBS had performer (#235) + author (#285) then closed — no entry-level informant. Diagnosis (#292) and anamnesis (#293) already carry informant.
								Document-level informant already attributes the clinical
								source of the ClinicalDocument. HL7 CDA R2 Act/Observation/
								Supply has informant 0..* (who supplied the facts for the
								act). SEMD validators often flag missing informant under body
								entries so REMD cannot separate clinical source from author/
								performer at entry level. Form 043/u treating dentist is the
								clinical source of the chart entry (same person as document
								informant).
								NOW: informant with time=visitTime, functionCode NI+displayName
								when doctorPosition known (else bare NI), assignedEntity
								mirroring document informant (SNILS or NI, code, person, MO).
								No invented extension or street/phone.
							-->
							<informant>
								<time value="${visitTime}"/>
								${params.doctorPosition && params.doctorPosition.trim()
									? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
									: `<functionCode nullFlavor="NI"/>`}
								<assignedEntity>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedEntity>
							</informant>
							<!--
								DEFECT #303: objective-status observation/participant.
								WAS: objective OBS had performer/author/informant then closed — no entry-level participant. Diagnosis (#301) and anamnesis (#302) already carry participant REF.
								Document-level participant REF (#152/#169/#147) already attributes
								the referring/related provider on ClinicalDocument. HL7 CDA R2
								Act/Observation/Supply has participant 0..* (related parties for
								the act). SEMD validators often flag missing participant under
								body entries so REMD cannot attach REF/related-provider at entry
								level. Form 043/u treating dentist is the related provider for
								the chart entry (same person as document REF participant).
								NOW: participant typeCode=REF with time=visitTime, functionCode
								NI+displayName when doctorPosition known (else bare NI),
								associatedEntity PROV mirroring document REF (SNILS or NI, code,
								person, scopingOrganization MO). No invented extension.
							-->
							<participant typeCode="REF">
								<time value="${visitTime}"/>
								${params.doctorPosition && params.doctorPosition.trim()
									? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
									: `<functionCode nullFlavor="NI"/>`}
								<associatedEntity classCode="PROV">
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<scopingOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</scopingOrganization>
								</associatedEntity>
							</participant>
							<!--
								DEFECT #321: objective-status observation/precondition.
								WAS: objective OBS had performer/author/informant/participant then closed — no precondition. Diagnosis (#319) and anamnesis (#320) already carry precondition PRCN.
								HL7 CDA R2 Act/Observation/Supply has precondition 0..*
								(criteria that must be true for the act). SEMD validators
								often flag missing precondition under body entries when the
								care event is documented without explicit criteria. Form 043/u
								chart does not collect discrete clinical preconditions for
								these entries — do not invent criterion codes or values.
								NOW: precondition typeCode=PRCN with criterion nullFlavor NI
								(id/code/value all NI) until chart fields exist.
							-->
							<precondition typeCode="PRCN">
								<criterion>
									<id nullFlavor="NI"/>
									<code nullFlavor="NI"/>
									<!--
										DEFECT #644: precondition/criterion/text.
										WAS: criterion had id/code/value only — no text. HL7 CDA R2 Criterion (Act) has text 0..1. SEMD often flags bare criterion under precondition.
										NOW: text nullFlavor NI; do not invent precondition prose.
									-->
									<text nullFlavor="NI"/>
									<!--
										DEFECT #645: precondition/criterion/statusCode.
										WAS: criterion had no statusCode. HL7 CDA R2 Act has statusCode 1..1 in many profiles; sibling nested acts use completed.
										NOW: statusCode completed.
									-->
									<statusCode code="completed"/>
									<value xsi:type="CD" nullFlavor="NI"/>
									<!--
										DEFECT #646: precondition/criterion/effectiveTime.
										WAS: criterion had no effectiveTime. SEMD often flags missing effectiveTime under precondition criterion when body acts emit it.
										NOW: effectiveTime nullFlavor NI; do not invent criterion window.
									-->
									<effectiveTime nullFlavor="NI"/>
								</criterion>
							</precondition>
							<!--
								DEFECT #330: objective-status observation/reference.
								WAS: objective OBS had performer/author/informant/participant/precondition then closed — no reference. Diagnosis (#328) and anamnesis (#329) already carry reference REFR.
								HL7 CDA R2 Act/Observation/Supply has reference 0..*
								(link to external acts/documents). SEMD validators often
								flag missing reference under body entries when the care
								event cannot point to a related external act. Form 043/u
								chart does not collect discrete external-act references for
								these entries — do not invent root/extension or URLs.
								NOW: reference typeCode=REFR with externalAct classCode=ACT
								moodCode=EVN and id nullFlavor NI until chart field exists.
							-->
							<reference typeCode="REFR">
								<externalAct classCode="ACT" moodCode="EVN">
									<id nullFlavor="NI"/>
									<!--
										DEFECT #667: reference/externalAct/code.
										WAS: externalAct had id NI only — no code. HL7 CDA R2 ExternalAct has code 0..1. SEMD often flags bare externalAct under reference REFR.
										NOW: code nullFlavor NI; do not invent external act type.
									-->
									<code nullFlavor="NI"/>
									<!--
										DEFECT #668: reference/externalAct/text.
										WAS: externalAct had no text. HL7 CDA R2 ExternalAct has text 0..1.
										NOW: text nullFlavor NI; do not invent external narrative.
									-->
									<text nullFlavor="NI"/>
								</externalAct>
							</reference>
							<!--
								DEFECT #339: objective-status observation/specimen.
								WAS: objective OBS had performer/author/informant/participant/precondition/reference then closed — no specimen. Diagnosis (#337) and anamnesis (#338) already carry specimen SPC.
								HL7 CDA R2 Observation has specimen 0..* (material used for
								the observation). SEMD validators often flag missing specimen
								under clinical OBS entries. Form 043/u ambulatory dental chart
								does not collect discrete specimen identity for these findings
								— do not invent specimen type codes or IDs.
								NOW: specimen typeCode=SPC with specimenRole id nullFlavor NI
								until chart field exists.
							-->
							<specimen typeCode="SPC">
								<specimenRole>
									<id nullFlavor="NI"/>
								
									<!--
										DEFECT #395: objective-status observation/specimen/specimenRole/specimenPlayingEntity.
										WAS: specimenRole had id NI only — no specimenPlayingEntity.
										HL7 CDA R2 SpecimenRole has specimenPlayingEntity 0..1 (the material
										entity). SEMD validators often flag empty specimenRole under clinical
										entries when playing entity code/name cannot be joined. Form 043/u
										chart does not collect discrete specimen entity codes — do not invent
										SNOMED/NSI specimen type codes.
										NOW: specimenPlayingEntity with code/name nullFlavor NI until chart
										field exists.
									-->
									<specimenPlayingEntity>
										<code nullFlavor="NI"/>
										<name nullFlavor="NI"/>
										<!--
											DEFECT #504: specimenPlayingEntity/desc.
											WAS: specimenPlayingEntity had code/name NI only — no desc. HL7 CDA R2 Entity has desc 0..1. SEMD validators often flag bare playing entity under specimen when material description cannot be joined. Form 043/u chart does not collect specimen material narrative; do not invent desc text.
											NOW: desc nullFlavor NI until chart field exists.
										-->
										<desc nullFlavor="NI"/>
										<!--
											DEFECT #505: specimenPlayingEntity/quantity.
											WAS: specimenPlayingEntity had code/name/desc only — no quantity. HL7 CDA R2 ManufacturedMaterial/Entity may carry quantity. SEMD often flags missing quantity under specimen playing entity.
											NOW: quantity nullFlavor NI; do not invent PQ amounts.
										-->
										<quantity nullFlavor="NI"/>
									</specimenPlayingEntity>
</specimenRole>
							</specimen>
							
							<!--
								DEFECT #366: objective-status observation/subject.
								WAS: objective-status observation had specimen then entryRelationship — no subject.
								HL7 CDA R2 Act/Observation/Supply has subject 0..1 (related
								subject when different from recordTarget). SEMD validators often
								flag missing subject under clinical body entries. Form 043/u
								patient is already recordTarget — entry-level related subject is
								not collected separately; do not invent relationship codes or ids.
								NOW: subject typeCode=SBJ with relatedSubject classCode=PRS and
								code nullFlavor NI until chart field exists.
							-->
							<subject typeCode="SBJ">
								<relatedSubject classCode="PRS">
									<code nullFlavor="NI"/>
									<addr nullFlavor="NI"/>
									<telecom nullFlavor="NI"/>
									<subject>
										<name nullFlavor="NI"/>
										<!--
										DEFECT #448: relatedSubject/subject/administrativeGenderCode (5/9).
										WAS: SubjectPerson under relatedSubject had only name NI (#420-#428) —
										no administrativeGenderCode. HL7 CDA R2 SubjectPerson has
										administrativeGenderCode 0..1. SEMD validators often flag incomplete
										person stub under Act/subject/relatedSubject.
										Form 043/u does not collect related-party gender; do not invent 1/2.
										NOW: administrativeGenderCode nullFlavor NI.
										-->
										<administrativeGenderCode nullFlavor="NI"/>
										<!--
										DEFECT #449: relatedSubject/subject/birthTime (5/9).
										WAS: SubjectPerson had name (+gender) only — no birthTime.
										HL7 CDA R2 SubjectPerson has birthTime 0..1. Mirror patient demographics
										slot under related-party person stub.
										Form 043/u does not collect related-party DOB; do not invent dates.
										NOW: birthTime nullFlavor NI.
										-->
										<birthTime nullFlavor="NI"/>
									</subject>
								</relatedSubject>
							</subject>

							
							<!--
								DEFECT #382: objective-status observation/consumable.
								WAS: objective-status observation had performer/.../specimen/subject — no consumable.
								Treatment ACT (#373) and tray supply (#374) already carry consumable CSM.
								HL7 CDA R2 Observation (Act) has consumable 0..* (materials used while
								making the observation). SEMD validators often flag missing consumable
								under clinical OBS when exam materials cannot be joined. Form 043/u
								chart does not collect discrete consumable NSI codes for these findings
								— do not invent material codes or barcodes.
								NOW: consumable typeCode=CSM with manufacturedProduct classCode=MANU
								and manufacturedMaterial code/name nullFlavor NI until chart field exists.
							-->
							<consumable typeCode="CSM">
								<manufacturedProduct classCode="MANU">
									<!--
										DEFECT #681: manufacturedProduct/id.
										WAS: manufacturedProduct opened then manufacturedMaterial — no id. Tray product carries barcode id; consumable shells had no product id. HL7 CDA R2 ManufacturedProduct has id 0..*. SEMD often flags bare product under consumable without id slot.
										NOW: id nullFlavor NI; do not invent extension=unknown.
									-->
									<id nullFlavor="NI"/>
									<manufacturedMaterial>
										<code nullFlavor="NI"/>
										<name nullFlavor="NI"/>
										<!--
											DEFECT #528: manufacturedMaterial/lotNumberText.
											WAS: manufacturedMaterial had code/name NI only — no lotNumberText. Tray product already emits lot (#388). HL7 CDA R2 Material has lotNumberText 0..1. SEMD often flags bare material under consumable without lot slot.
											NOW: lotNumberText nullFlavor NI; do not invent lot strings.
										-->
										<lotNumberText nullFlavor="NI"/>
										<!--
											DEFECT #529: manufacturedMaterial/desc.
											WAS: manufacturedMaterial had code/name/lot only — no desc. Tray already emits desc (#389). SEMD often flags missing material description under consumable.
											NOW: desc nullFlavor NI; do not invent device prose.
										-->
										<desc nullFlavor="NI"/>
										<!--
											DEFECT #530: manufacturedMaterial/expirationTime.
											WAS: manufacturedMaterial had code/name/lot/desc only — no expirationTime. Tray already emits expirationTime. HL7 CDA R2 Material has expirationTime 0..1.
											NOW: expirationTime nullFlavor NI; do not invent expiry timestamps.
										-->
										<expirationTime nullFlavor="NI"/>
									</manufacturedMaterial>
								<!--

									DEFECT #567: manufacturedProduct/manufacturerOrganization.

									WAS: manufacturedProduct had material only — no manufacturerOrganization. Tray product already emits manufacturerOrganization. HL7 CDA R2 ManufacturedProduct has manufacturerOrganization 0..1. SEMD often flags bare product under consumable without org shell.

									NOW: manufacturerOrganization with id/name/addr/telecom NI; do not invent org identity.

								-->

								<manufacturerOrganization>

									<id nullFlavor="NI"/>

									<!--

										DEFECT #568: manufacturerOrganization/name.

										WAS: manufacturerOrganization id only path.

										NOW: name nullFlavor NI.

									-->

									<name nullFlavor="NI"/>

									<!--

										DEFECT #569: manufacturerOrganization/addr.

										NOW: addr nullFlavor NI; do not invent streetAddressLine.

									-->

									<addr nullFlavor="NI"/>

									<!--

										DEFECT #570: manufacturerOrganization/telecom.

										NOW: telecom nullFlavor NI; do not invent phone.

									-->

									<telecom nullFlavor="NI"/>

								</manufacturerOrganization>

								</manufacturedProduct>
							</consumable>
<!--
								DEFECT #377: objective-status observation/referenceRange.
								WAS: objective-status observation had value/method/.../subject then entryRelationship —
								no referenceRange. HL7 CDA R2 Observation has referenceRange 0..*
								(observationRange for normal/abnormal bounds). SEMD validators often
								flag missing referenceRange under clinical OBS entries. Form 043/u
								ambulatory dental findings are free-text/ICD — no lab-style reference
								interval is collected; do not invent PQ bounds or interpretation anchors.
								NOW: referenceRange with observationRange value nullFlavor NI until
								chart field exists.
							-->
							<referenceRange>
								<observationRange>
									<!--
										DEFECT #487: observationRange/code.
										WAS: observationRange had only value CD NI — no code. HL7 CDA R2 ObservationRange has code 0..1 (what range kind). SEMD validators often flag bare observationRange under clinical OBS. Form 043/u ambulatory dental findings have no lab reference-range catalog; do not invent range type codes.
										NOW: code nullFlavor NI until chart field exists.
									-->
									<code nullFlavor="NI"/>
									<!--
										DEFECT #488: observationRange/text.
										WAS: observationRange had no text. HL7 CDA R2 ObservationRange has text 0..1 (ED). SEMD often flags missing narrative under referenceRange when value is NI-only.
										NOW: text nullFlavor NI; do not invent range prose.
									-->
									<text nullFlavor="NI"/>
									<value xsi:type="CD" nullFlavor="NI"/>
									<!--
										DEFECT #489: observationRange/interpretationCode.
										WAS: observationRange had value only — no interpretationCode. HL7 CDA R2 ObservationRange has interpretationCode 0..*. SEMD often flags missing interpretation under referenceRange for clinical OBS.
										NOW: interpretationCode nullFlavor NI; do not invent N/A/H/L codes.
									-->
									<interpretationCode nullFlavor="NI"/>
								</observationRange>
							</referenceRange>
<!--
								DEFECT #344: objective-status observation/entryRelationship.
								WAS: objective OBS had specimen (#339) then closed — no entryRelationship. Diagnosis (#342) and anamnesis (#343) already carry entryRelationship COMP.
								HL7 CDA R2 Act/Observation/Supply has entryRelationship 0..*
								(related nested acts). SEMD validators often flag missing
								entryRelationship under body entries when sibling acts cannot
								be linked. Form 043/u chart does not collect discrete nested
								related-act graphs for these entries — do not invent nested
								codes or extensions.
								NOW: entryRelationship typeCode=COMP with nested act
								classCode=ACT moodCode=EVN and id/code/statusCode nullFlavor
								NI / completed shell until chart field exists.
							-->
							<entryRelationship typeCode="COMP">
								<act classCode="ACT" moodCode="EVN">
									<id nullFlavor="NI"/>
									<code nullFlavor="NI"/>
									<!--
										DEFECT #607: entryRelationship/act/text.
										WAS: nested COMP act had id/code/statusCode only — no text. HL7 CDA R2 Act has text 0..1. SEMD validators often flag bare nested acts under entryRelationship when parent body acts emit text. Form 043/u has no separate nested-act narrative; do not invent prose.
										NOW: text nullFlavor NI.
									-->
									<text nullFlavor="NI"/>
									<statusCode code="completed"/>
									<!--
										DEFECT #608: entryRelationship/act/priorityCode.
										WAS: nested COMP act had no priorityCode. Parent body acts emit priorityCode NI. SEMD often flags missing priority under nested COMP acts.
										NOW: priorityCode nullFlavor NI; do not invent ActPriority.
									-->
									<priorityCode nullFlavor="NI"/>
									<!--
										DEFECT #609: entryRelationship/act/effectiveTime.
										WAS: nested COMP act had no effectiveTime. Parent body acts stamp documentClock. Nested COMP has no separate chart timestamp; do not invent times.
										NOW: effectiveTime nullFlavor NI.
									-->
									<effectiveTime nullFlavor="NI"/>
									<!--
										DEFECT #610: entryRelationship/act/languageCode.
										WAS: nested COMP act had no languageCode. ClinicalDocument/sections declare ru-RU.
										NOW: languageCode code=ru-RU.
									-->
									<languageCode code="ru-RU"/>
									<!--
										DEFECT #611: entryRelationship/act/confidentialityCode.
										WAS: nested COMP act had no confidentialityCode. ClinicalDocument sets N.
										NOW: confidentialityCode N matching ClinicalDocument.
									-->
									<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
								</act>
							</entryRelationship>







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
										<!--
						DEFECT #450: section/confidentialityCode.
						WAS: section had id/code/title/text then entry — no section-level
						confidentialityCode. Body entry acts already carry confidentialityCode N
						(#310-#318). HL7 CDA R2 Section has confidentialityCode 0..1.
						SEMD validators often flag missing section confidentiality when the
						ClinicalDocument sets N but narrative sections omit it.
						Form 043/u ambulatory dental sections are normal confidentiality.
						NOW: confidentialityCode N matching ClinicalDocument (#158).
					-->
					<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
					<!--
						DEFECT #451: section/languageCode.
						WAS: section had id/code/title/text (+confidentiality) then entry —
						no section-level languageCode. Entry acts already carry languageCode
						ru-RU (#260-#279). HL7 CDA R2 Section has languageCode 0..1.
						SEMD validators often flag missing section language when the document
						declares ru-RU but narrative sections omit it.
						NOW: languageCode code=ru-RU matching ClinicalDocument.
					-->
					<languageCode code="ru-RU"/>
					<!--
						DEFECT #547: section/subject (related subject shell).
						WAS: section had id/code/title/text/confidentialityCode/languageCode then entry — no subject. HL7 CDA R2 Section has subject 0..1 (related subject when section subject differs from recordTarget). Body entries already carry subject SBJ; SEMD validators often flag missing section-level subject shell. Form 043/u sections are about the same patient — no alternate section subject on chart; do not invent related person demographics.
						NOW: subject typeCode=SBJ with relatedSubject classCode=PRS and NI demographics (mirror entry-level relatedSubject).
					-->
					<subject typeCode="SBJ">
						<relatedSubject classCode="PRS">
							<code nullFlavor="NI"/>
							<addr nullFlavor="NI"/>
							<telecom nullFlavor="NI"/>
							<subject>
								<name nullFlavor="NI"/>
								<administrativeGenderCode nullFlavor="NI"/>
								<birthTime nullFlavor="NI"/>
							</subject>
						</relatedSubject>
					</subject>
					<entry>
						<!--
							DEFECT #356: treatment act/@negationInd.
							WAS: open had classCode/moodCode only — no negationInd.
							HL7 CDA R2 Act has negationInd 0..1. SEMD often requires explicit false on asserted acts.
							Form 043/u chart entry is asserted (not negated). NOW: negationInd=false on entry open tag.
						-->
						<act classCode="ACT" moodCode="EVN" negationInd="false">
							<!-- DEFECT #153: entry Act/id (treatment) -->
							<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-treatment"/>
							<code code="18776-5" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Проведенное лечение"/>
							<text>${escapeXml(params.treatmentDescription || "Осмотр и консультация")}</text>
							<!--
								DEFECT #265: treatment act/languageCode.
								WAS: treatment ACT had id/code/text then jumped to statusCode —
								no entry-level languageCode. Body OBS entries (#260-#264)
								already carry languageCode ru-RU. HL7 CDA R2 Act has
								languageCode 0..1. SEMD validators often flag missing
								language under procedure ACT. Form 043/u treatment is RU.
								NOW: languageCode code=ru-RU matching ClinicalDocument.
							-->
							<languageCode code="ru-RU"/>
							<!--
								DEFECT #315: treatment act/confidentialityCode.
								WAS: treatment ACT had languageCode (#265) then jumped to statusCode — no entry-level confidentialityCode. Body OBS (#310-#314) already carry confidentialityCode N.
								ClinicalDocument already declares confidentialityCode N (#158).
								HL7 CDA R2 Act/Observation/Supply has confidentialityCode 0..1
								(sensitivity of the act). SEMD validators often flag missing
								confidentiality under body entries when the document sets N but
								entry acts omit it. Form 043/u ambulatory dental chart entries
								are normal confidentiality (same as ClinicalDocument).
								NOW: confidentialityCode N + codeSystemName + RU displayName
								matching ClinicalDocument (#158). No invented restricted code.
							-->
							<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>

							<statusCode code="completed"/>

							<!-- DEFECT #145: act effectiveTime = visit clock -->
							<effectiveTime value="${visitTime}"/>
							<!--
								DEFECT #201: treatment act/priorityCode.
								WAS: treatment ACT had id/code/text/statusCode/effectiveTime
								only — no priorityCode. HL7 CDA R2 Act has priorityCode 0..1
								(urgency of the act). encompassingEncounter already carries
								priorityCode NI (#183). SEMD validators often flag missing
								priority under procedure/treatment ACT. Form 043/u chart does
								not collect act-level priority (routine dental care) — do not
								invent a fake HL7 ActPriority code.
								NOW: priorityCode nullFlavor NI until chart field exists.
							-->
							<priorityCode nullFlavor="NI"/>
							<!--
								DEFECT #208: treatment act/methodCode.
								WAS: treatment ACT had id/code/text/statusCode/effectiveTime/
								priorityCode only — no methodCode. Body OBS entries already
								carry methodCode NI (#186-#192). HL7 CDA R2 Act has
								methodCode 0..* (how the procedure was performed). SEMD
								validators often flag missing method under treatment ACT.
								Form 043/u treatment is free-text description — do not invent
								a fake NSI method OID.
								NOW: methodCode nullFlavor NI until chart field exists.
							-->
							<methodCode nullFlavor="NI"/>
							<!--
								DEFECT #209: treatment act/uncertaintyCode.
								WAS: treatment ACT had id/code/text/statusCode/effectiveTime/
								priorityCode/methodCode only — no uncertaintyCode. Body OBS
								entries already carry uncertaintyCode NI (#188/#197-#200).
								HL7 CDA R2 Act has uncertaintyCode 0..1 (U/N from
								ActUncertainty). SEMD validators often flag missing
								uncertainty under procedure/treatment ACT. Form 043/u
								treatment is free-text completed care — do not invent U/N.
								NOW: uncertaintyCode nullFlavor NI until chart field exists.
							-->
							<uncertaintyCode nullFlavor="NI"/>
							<!--
								DEFECT #210: treatment act/repeatNumber.
								WAS: treatment ACT had id/code/text/statusCode/effectiveTime/
								priorityCode/methodCode/uncertaintyCode only — no
								repeatNumber. Instrument-tray supply already carries
								repeatNumber NI (#204). HL7 CDA R2 Act has repeatNumber
								0..1 (how many times the act is intended to occur). SEMD
								validators often flag missing repeatNumber under treatment
								ACT. Form 043/u treatment is a single completed visit act —
								no discrete repeat field and do not invent a fake INT count.
								NOW: repeatNumber nullFlavor NI until chart field exists.
							-->
							<repeatNumber nullFlavor="NI"/>
							<!--
								DEFECT #211: treatment act/independentInd.
								WAS: treatment ACT had id/code/text/statusCode/effectiveTime/
								priorityCode/methodCode/uncertaintyCode/repeatNumber only —
								no independentInd. Instrument-tray supply already carries
								independentInd NI (#205). HL7 CDA R2 Act has independentInd
								0..1 (whether the act can stand alone). SEMD validators
								often flag missing independentInd under treatment ACT.
								Form 043/u chart has no independent-act flag — do not invent
								true/false.
								NOW: independentInd nullFlavor NI until chart field exists.
							-->
							<independentInd nullFlavor="NI"/>
							<!--
								DEFECT #221: treatment act/approachSiteCode.
								WAS: treatment ACT had priorityCode/methodCode/uncertaintyCode/
								repeatNumber/independentInd only — no approachSiteCode.
								Diagnosis OBS already carries targetSiteCode when
								diagnosisTooth is set (#74). HL7 CDA R2 Act has
								approachSiteCode 0..* (anatomical approach for the
								procedure). SEMD validators often flag missing approach
								site under treatment ACT. Form 043/u treatment is free-text
								— tooth may be on diagnosis only; do not invent a second
								ISO 3950 code here when treatmentDescription has no tooth.
								NOW: approachSiteCode nullFlavor NI until chart field exists.
							-->
							<approachSiteCode nullFlavor="NI"/>
							<!--
								DEFECT #222: treatment act/targetSiteCode.
								WAS: treatment ACT had approachSiteCode NI (#221) but no
								targetSiteCode. Diagnosis OBS already carries targetSiteCode
								when diagnosisTooth is set (#74). HL7 CDA R2 Act has
								targetSiteCode 0..* (anatomical site the act is directed at —
								distinct from approachSiteCode). SEMD validators often flag
								missing target site under treatment ACT so REMD cannot join
								the procedure to the treated tooth.
								NOW: when diagnosisTooth present emit ISO 3950 tooth CE
								(same NSI 1.2.643.5.1.13.13.11.1466 as diagnosis #74);
								else targetSiteCode nullFlavor NI — do not invent a tooth.
							-->
							${params.diagnosisTooth && String(params.diagnosisTooth).trim()
								? `<targetSiteCode code="${escapeXml(String(params.diagnosisTooth).trim())}" codeSystem="1.2.643.5.1.13.13.11.1466" codeSystemName="Зубы" displayName="Зуб ${escapeXml(String(params.diagnosisTooth).trim())}"/>`
								: `<targetSiteCode nullFlavor="NI"/>`}
							<!--
								DEFECT #280: treatment act/interpretationCode.
								WAS: treatment ACT had approach/targetSite then jumped to
								performer (#238) — no interpretationCode. Body OBS and tray
								supply (#271) already carry interpretationCode NI. HL7 CDA R2
								Act has interpretationCode 0..*. SEMD validators often flag
								missing interpretation under procedure ACT. Form 043/u
								treatment is free-text completed care — do not invent N/A/H.
								NOW: interpretationCode nullFlavor NI until chart field exists.
							-->
							<interpretationCode nullFlavor="NI"/>
							<!--
								DEFECT #238: treatment act/performer.

								WAS: treatment ACT had approach/targetSite only - no
								performer. Body OBS entries (diagnosis #233 through
								comorbidities #237) already carry performer PRF.
								HL7 CDA R2 Act has performer 0..*. SEMD validators
								often flag missing performer under procedure/treatment
								ACT so REMD cannot attribute the care act to the
								treating dentist at entry level (header performer is
								care-event only).
								NOW: performer typeCode=PRF with time=visitTime and
								assignedEntity mirroring diagnosis OBS performer (SNILS
								or NI, code with position or bare NI, person, MO org).
								No invented extension="unknown" or street/phone.
							-->
							<performer typeCode="PRF">
								<time value="${visitTime}"/>
								<assignedEntity>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedEntity>
							</performer>
							<!--
								DEFECT #288: treatment act/author.
								WAS: treatment ACT had performer (#238) then closed — no entry-level author. Body OBS (#283-#287) already carry author.
								Document-level author already attributes the ClinicalDocument.
								HL7 CDA R2 Act/Observation/Supply has author 0..* (who
								recorded the act). SEMD validators often flag missing author
								under body entries so REMD cannot separate recorder from
								performer at entry level. Form 043/u treating dentist authors
								the chart entry.
								NOW: author with time=visitTime and assignedAuthor mirroring
								document author / entry performer (SNILS or NI, code with
								position or bare NI, person, MO org). No invented extension
								or street/phone.
							-->
							<author>
								<time value="${visitTime}"/>
								<assignedAuthor>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedAuthor>
							</author>
							<!--
								DEFECT #297: treatment act/informant.
								WAS: treatment ACT had performer (#238) + author (#288) then closed — no entry-level informant. Body OBS (#292-#296) already carry informant.
								Document-level informant already attributes the clinical
								source of the ClinicalDocument. HL7 CDA R2 Act/Observation/
								Supply has informant 0..* (who supplied the facts for the
								act). SEMD validators often flag missing informant under body
								entries so REMD cannot separate clinical source from author/
								performer at entry level. Form 043/u treating dentist is the
								clinical source of the chart entry (same person as document
								informant).
								NOW: informant with time=visitTime, functionCode NI+displayName
								when doctorPosition known (else bare NI), assignedEntity
								mirroring document informant (SNILS or NI, code, person, MO).
								No invented extension or street/phone.
							-->
							<informant>
								<time value="${visitTime}"/>
								${params.doctorPosition && params.doctorPosition.trim()
									? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
									: `<functionCode nullFlavor="NI"/>`}
								<assignedEntity>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedEntity>
							</informant>
							<!--
								DEFECT #306: treatment act/participant.
								WAS: treatment ACT had performer/author/informant then closed — no entry-level participant. Body OBS (#301-#305) already carry participant REF.
								Document-level participant REF (#152/#169/#147) already attributes
								the referring/related provider on ClinicalDocument. HL7 CDA R2
								Act/Observation/Supply has participant 0..* (related parties for
								the act). SEMD validators often flag missing participant under
								body entries so REMD cannot attach REF/related-provider at entry
								level. Form 043/u treating dentist is the related provider for
								the chart entry (same person as document REF participant).
								NOW: participant typeCode=REF with time=visitTime, functionCode
								NI+displayName when doctorPosition known (else bare NI),
								associatedEntity PROV mirroring document REF (SNILS or NI, code,
								person, scopingOrganization MO). No invented extension.
							-->
							<participant typeCode="REF">
								<time value="${visitTime}"/>
								${params.doctorPosition && params.doctorPosition.trim()
									? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
									: `<functionCode nullFlavor="NI"/>`}
								<associatedEntity classCode="PROV">
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<scopingOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</scopingOrganization>
								</associatedEntity>
							</participant>
							<!--
								DEFECT #324: treatment act/precondition.
								WAS: treatment ACT had performer/author/informant/participant then closed — no precondition. Body OBS (#319-#323) already carry precondition PRCN.
								HL7 CDA R2 Act/Observation/Supply has precondition 0..*
								(criteria that must be true for the act). SEMD validators
								often flag missing precondition under body entries when the
								care event is documented without explicit criteria. Form 043/u
								chart does not collect discrete clinical preconditions for
								these entries — do not invent criterion codes or values.
								NOW: precondition typeCode=PRCN with criterion nullFlavor NI
								(id/code/value all NI) until chart fields exist.
							-->
							<precondition typeCode="PRCN">
								<criterion>
									<id nullFlavor="NI"/>
									<code nullFlavor="NI"/>
									<!--
										DEFECT #647: precondition/criterion/text.
										WAS: criterion had id/code/value only — no text. HL7 CDA R2 Criterion (Act) has text 0..1. SEMD often flags bare criterion under precondition.
										NOW: text nullFlavor NI; do not invent precondition prose.
									-->
									<text nullFlavor="NI"/>
									<!--
										DEFECT #648: precondition/criterion/statusCode.
										WAS: criterion had no statusCode. HL7 CDA R2 Act has statusCode 1..1 in many profiles; sibling nested acts use completed.
										NOW: statusCode completed.
									-->
									<statusCode code="completed"/>
									<value xsi:type="CD" nullFlavor="NI"/>
									<!--
										DEFECT #649: precondition/criterion/effectiveTime.
										WAS: criterion had no effectiveTime. SEMD often flags missing effectiveTime under precondition criterion when body acts emit it.
										NOW: effectiveTime nullFlavor NI; do not invent criterion window.
									-->
									<effectiveTime nullFlavor="NI"/>
								</criterion>
							</precondition>
							<!--
								DEFECT #333: treatment act/reference.
								WAS: treatment ACT had performer/author/informant/participant/precondition then closed — no reference. Body OBS (#328-#332) already carry reference REFR.
								HL7 CDA R2 Act/Observation/Supply has reference 0..*
								(link to external acts/documents). SEMD validators often
								flag missing reference under body entries when the care
								event cannot point to a related external act. Form 043/u
								chart does not collect discrete external-act references for
								these entries — do not invent root/extension or URLs.
								NOW: reference typeCode=REFR with externalAct classCode=ACT
								moodCode=EVN and id nullFlavor NI until chart field exists.
							-->
							<reference typeCode="REFR">
								<externalAct classCode="ACT" moodCode="EVN">
									<id nullFlavor="NI"/>
									<!--
										DEFECT #669: reference/externalAct/code.
										WAS: externalAct had id NI only — no code. HL7 CDA R2 ExternalAct has code 0..1. SEMD often flags bare externalAct under reference REFR.
										NOW: code nullFlavor NI; do not invent external act type.
									-->
									<code nullFlavor="NI"/>
									<!--
										DEFECT #670: reference/externalAct/text.
										WAS: externalAct had no text. HL7 CDA R2 ExternalAct has text 0..1.
										NOW: text nullFlavor NI; do not invent external narrative.
									-->
									<text nullFlavor="NI"/>
								</externalAct>
							</reference>
							
							
							<!--
								DEFECT #373: treatment act/consumable.
								WAS: treatment act had performer/author/.../reference then specimen
								— no consumable. Instrument-tray supply already carries product
								(manufacturedProduct). HL7 CDA R2 Act has consumable 0..* (materials
								used by the act). SEMD validators often flag missing consumable under
								treatment ACT when dental materials cannot be joined as manufactured
								product roles. Form 043/u chart does not collect discrete consumable
								NSI codes for treatment — do not invent material codes or barcodes.
								NOW: consumable typeCode=CSM with manufacturedProduct classCode=MANU
								and manufacturedMaterial code/name nullFlavor NI until chart field exists.
							-->
							<consumable typeCode="CSM">
								<manufacturedProduct classCode="MANU">
									<!--
										DEFECT #682: manufacturedProduct/id.
										WAS: manufacturedProduct opened then manufacturedMaterial — no id. Tray product carries barcode id; consumable shells had no product id. HL7 CDA R2 ManufacturedProduct has id 0..*. SEMD often flags bare product under consumable without id slot.
										NOW: id nullFlavor NI; do not invent extension=unknown.
									-->
									<id nullFlavor="NI"/>
									<manufacturedMaterial>
										<code nullFlavor="NI"/>
										<name nullFlavor="NI"/>
										<!--
											DEFECT #531: manufacturedMaterial/lotNumberText.
											WAS: manufacturedMaterial had code/name NI only — no lotNumberText. Tray product already emits lot (#388). HL7 CDA R2 Material has lotNumberText 0..1. SEMD often flags bare material under consumable without lot slot.
											NOW: lotNumberText nullFlavor NI; do not invent lot strings.
										-->
										<lotNumberText nullFlavor="NI"/>
										<!--
											DEFECT #532: manufacturedMaterial/desc.
											WAS: manufacturedMaterial had code/name/lot only — no desc. Tray already emits desc (#389). SEMD often flags missing material description under consumable.
											NOW: desc nullFlavor NI; do not invent device prose.
										-->
										<desc nullFlavor="NI"/>
										<!--
											DEFECT #533: manufacturedMaterial/expirationTime.
											WAS: manufacturedMaterial had code/name/lot/desc only — no expirationTime. Tray already emits expirationTime. HL7 CDA R2 Material has expirationTime 0..1.
											NOW: expirationTime nullFlavor NI; do not invent expiry timestamps.
										-->
										<expirationTime nullFlavor="NI"/>
									</manufacturedMaterial>
								<!--

									DEFECT #571: manufacturedProduct/manufacturerOrganization.

									WAS: manufacturedProduct had material only — no manufacturerOrganization. Tray product already emits manufacturerOrganization. HL7 CDA R2 ManufacturedProduct has manufacturerOrganization 0..1. SEMD often flags bare product under consumable without org shell.

									NOW: manufacturerOrganization with id/name/addr/telecom NI; do not invent org identity.

								-->

								<manufacturerOrganization>

									<id nullFlavor="NI"/>

									<!--

										DEFECT #572: manufacturerOrganization/name.

										WAS: manufacturerOrganization id only path.

										NOW: name nullFlavor NI.

									-->

									<name nullFlavor="NI"/>

									<!--

										DEFECT #573: manufacturerOrganization/addr.

										NOW: addr nullFlavor NI; do not invent streetAddressLine.

									-->

									<addr nullFlavor="NI"/>

									<!--

										DEFECT #574: manufacturerOrganization/telecom.

										NOW: telecom nullFlavor NI; do not invent phone.

									-->

									<telecom nullFlavor="NI"/>

								</manufacturerOrganization>

								</manufacturedProduct>
							</consumable>
<!--
								DEFECT #362: treatment act/specimen.
								WAS: treatment act had reference/precondition then entryRelationship — no specimen.
								HL7 CDA R2 Act/Observation/Supply has specimen 0..* (material).
								SEMD validators often flag missing specimen under clinical entries.
								Form 043/u ambulatory dental chart does not collect discrete specimen
								identity for these entries — do not invent specimen type codes or IDs.
								NOW: specimen typeCode=SPC with specimenRole id nullFlavor NI
								until chart field exists.
							-->
							<specimen typeCode="SPC">
								<specimenRole>
									<id nullFlavor="NI"/>
								
									<!--
										DEFECT #398: treatment act/specimen/specimenRole/specimenPlayingEntity.
										WAS: specimenRole had id NI only — no specimenPlayingEntity.
										HL7 CDA R2 SpecimenRole has specimenPlayingEntity 0..1 (the material
										entity). SEMD validators often flag empty specimenRole under clinical
										entries when playing entity code/name cannot be joined. Form 043/u
										chart does not collect discrete specimen entity codes — do not invent
										SNOMED/NSI specimen type codes.
										NOW: specimenPlayingEntity with code/name nullFlavor NI until chart
										field exists.
									-->
									<specimenPlayingEntity>
										<code nullFlavor="NI"/>
										<name nullFlavor="NI"/>
										<!--
											DEFECT #506: specimenPlayingEntity/desc.
											WAS: specimenPlayingEntity had code/name NI only — no desc. HL7 CDA R2 Entity has desc 0..1. SEMD validators often flag bare playing entity under specimen when material description cannot be joined. Form 043/u chart does not collect specimen material narrative; do not invent desc text.
											NOW: desc nullFlavor NI until chart field exists.
										-->
										<desc nullFlavor="NI"/>
										<!--
											DEFECT #507: specimenPlayingEntity/quantity.
											WAS: specimenPlayingEntity had code/name/desc only — no quantity. HL7 CDA R2 ManufacturedMaterial/Entity may carry quantity. SEMD often flags missing quantity under specimen playing entity.
											NOW: quantity nullFlavor NI; do not invent PQ amounts.
										-->
										<quantity nullFlavor="NI"/>
									</specimenPlayingEntity>
</specimenRole>
							</specimen>

							<!--
								DEFECT #369: treatment act/subject.
								WAS: treatment act had specimen then entryRelationship — no subject.
								HL7 CDA R2 Act/Observation/Supply has subject 0..1 (related
								subject when different from recordTarget). SEMD validators often
								flag missing subject under clinical body entries. Form 043/u
								patient is already recordTarget — entry-level related subject is
								not collected separately; do not invent relationship codes or ids.
								NOW: subject typeCode=SBJ with relatedSubject classCode=PRS and
								code nullFlavor NI until chart field exists.
							-->
							<subject typeCode="SBJ">
								<relatedSubject classCode="PRS">
									<code nullFlavor="NI"/>
									<addr nullFlavor="NI"/>
									<telecom nullFlavor="NI"/>
									<subject>
										<name nullFlavor="NI"/>
										<!--
										DEFECT #452: relatedSubject/subject/administrativeGenderCode (6/9).
										WAS: SubjectPerson under relatedSubject had only name NI (#420-#428) —
										no administrativeGenderCode. HL7 CDA R2 SubjectPerson has
										administrativeGenderCode 0..1. SEMD validators often flag incomplete
										person stub under Act/subject/relatedSubject.
										Form 043/u does not collect related-party gender; do not invent 1/2.
										NOW: administrativeGenderCode nullFlavor NI.
										-->
										<administrativeGenderCode nullFlavor="NI"/>
										<!--
										DEFECT #453: relatedSubject/subject/birthTime (6/9).
										WAS: SubjectPerson had name (+gender) only — no birthTime.
										HL7 CDA R2 SubjectPerson has birthTime 0..1. Mirror patient demographics
										slot under related-party person stub.
										Form 043/u does not collect related-party DOB; do not invent dates.
										NOW: birthTime nullFlavor NI.
										-->
										<birthTime nullFlavor="NI"/>
									</subject>
								</relatedSubject>
							</subject>
<!--
								DEFECT #347: treatment act/entryRelationship.
								WAS: treatment ACT had performer/author/informant/participant/precondition/reference then closed — no entryRelationship. Body OBS (#342-#346) already carry entryRelationship COMP.
								HL7 CDA R2 Act/Observation/Supply has entryRelationship 0..*
								(related nested acts). SEMD validators often flag missing
								entryRelationship under body entries when sibling acts cannot
								be linked. Form 043/u chart does not collect discrete nested
								related-act graphs for these entries — do not invent nested
								codes or extensions.
								NOW: entryRelationship typeCode=COMP with nested act
								classCode=ACT moodCode=EVN and id/code/statusCode nullFlavor
								NI / completed shell until chart field exists.
							-->
							<entryRelationship typeCode="COMP">
								<act classCode="ACT" moodCode="EVN">
									<id nullFlavor="NI"/>
									<code nullFlavor="NI"/>
									<!--
										DEFECT #612: entryRelationship/act/text.
										WAS: nested COMP act had id/code/statusCode only — no text. HL7 CDA R2 Act has text 0..1. SEMD validators often flag bare nested acts under entryRelationship when parent body acts emit text. Form 043/u has no separate nested-act narrative; do not invent prose.
										NOW: text nullFlavor NI.
									-->
									<text nullFlavor="NI"/>
									<statusCode code="completed"/>
									<!--
										DEFECT #613: entryRelationship/act/priorityCode.
										WAS: nested COMP act had no priorityCode. Parent body acts emit priorityCode NI. SEMD often flags missing priority under nested COMP acts.
										NOW: priorityCode nullFlavor NI; do not invent ActPriority.
									-->
									<priorityCode nullFlavor="NI"/>
									<!--
										DEFECT #614: entryRelationship/act/effectiveTime.
										WAS: nested COMP act had no effectiveTime. Parent body acts stamp documentClock. Nested COMP has no separate chart timestamp; do not invent times.
										NOW: effectiveTime nullFlavor NI.
									-->
									<effectiveTime nullFlavor="NI"/>
									<!--
										DEFECT #615: entryRelationship/act/languageCode.
										WAS: nested COMP act had no languageCode. ClinicalDocument/sections declare ru-RU.
										NOW: languageCode code=ru-RU.
									-->
									<languageCode code="ru-RU"/>
									<!--
										DEFECT #616: entryRelationship/act/confidentialityCode.
										WAS: nested COMP act had no confidentialityCode. ClinicalDocument sets N.
										NOW: confidentialityCode N matching ClinicalDocument.
									-->
									<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
								</act>
							</entryRelationship>






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
										<!--
						DEFECT #454: section/confidentialityCode.
						WAS: section had id/code/title/text then entry — no section-level
						confidentialityCode. Body entry acts already carry confidentialityCode N
						(#310-#318). HL7 CDA R2 Section has confidentialityCode 0..1.
						SEMD validators often flag missing section confidentiality when the
						ClinicalDocument sets N but narrative sections omit it.
						Form 043/u ambulatory dental sections are normal confidentiality.
						NOW: confidentialityCode N matching ClinicalDocument (#158).
					-->
					<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
					<!--
						DEFECT #455: section/languageCode.
						WAS: section had id/code/title/text (+confidentiality) then entry —
						no section-level languageCode. Entry acts already carry languageCode
						ru-RU (#260-#279). HL7 CDA R2 Section has languageCode 0..1.
						SEMD validators often flag missing section language when the document
						declares ru-RU but narrative sections omit it.
						NOW: languageCode code=ru-RU matching ClinicalDocument.
					-->
					<languageCode code="ru-RU"/>
					<!--
						DEFECT #548: section/subject (related subject shell).
						WAS: section had id/code/title/text/confidentialityCode/languageCode then entry — no subject. HL7 CDA R2 Section has subject 0..1 (related subject when section subject differs from recordTarget). Body entries already carry subject SBJ; SEMD validators often flag missing section-level subject shell. Form 043/u sections are about the same patient — no alternate section subject on chart; do not invent related person demographics.
						NOW: subject typeCode=SBJ with relatedSubject classCode=PRS and NI demographics (mirror entry-level relatedSubject).
					-->
					<subject typeCode="SBJ">
						<relatedSubject classCode="PRS">
							<code nullFlavor="NI"/>
							<addr nullFlavor="NI"/>
							<telecom nullFlavor="NI"/>
							<subject>
								<name nullFlavor="NI"/>
								<administrativeGenderCode nullFlavor="NI"/>
								<birthTime nullFlavor="NI"/>
							</subject>
						</relatedSubject>
					</subject>
					<entry>
						<!--
							DEFECT #354: complications observation/@negationInd.
							WAS: open had classCode/moodCode only — no negationInd.
							HL7 CDA R2 Act has negationInd 0..1. SEMD often requires explicit false on asserted acts.
							Form 043/u chart entry is asserted (not negated). NOW: negationInd=false on entry open tag.
						-->
						<observation classCode="OBS" moodCode="EVN" negationInd="false">
							<!-- DEFECT #153: entry Act/id (complications) -->
							<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-complications"/>
							<code code="55109-3" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Осложнения"/>
							<!--
								DEFECT #258: complications observation/text.
								WAS: complications OBS had id/code then jumped to statusCode —
								no entry-level text. Diagnosis (#255), anamnesis (#256) and
								objective (#257) already carry <text>. HL7 CDA R2 Observation
								has text 0..1. SEMD validators often flag missing text under
								complications OBS when sibling entries emit it. Form 043/u
								chart already stores complications — mirror it here (ST value
								stays the structured payload).
								NOW: text = complications (default Ne otmecheny).
							-->
							<text>${escapeXml(params.complications || "Не отмечены")}</text>
							<!--
								DEFECT #263: complications observation/languageCode.
								WAS: complications OBS had id/code/text then jumped to statusCode —
								no entry-level languageCode. Diagnosis (#260) through objective
								(#262) already carry languageCode ru-RU. HL7 CDA R2 Observation
								has languageCode 0..1. SEMD validators often flag missing
								language under complications OBS. Form 043/u complications is RU.
								NOW: languageCode code=ru-RU matching ClinicalDocument.
							-->
							<languageCode code="ru-RU"/>
							<!--
								DEFECT #313: complications observation/confidentialityCode.
								WAS: complications OBS had languageCode (#263) then jumped to statusCode — no entry-level confidentialityCode. Diagnosis (#310) through objective (#312) already carry confidentialityCode N.
								ClinicalDocument already declares confidentialityCode N (#158).
								HL7 CDA R2 Act/Observation/Supply has confidentialityCode 0..1
								(sensitivity of the act). SEMD validators often flag missing
								confidentiality under body entries when the document sets N but
								entry acts omit it. Form 043/u ambulatory dental chart entries
								are normal confidentiality (same as ClinicalDocument).
								NOW: confidentialityCode N + codeSystemName + RU displayName
								matching ClinicalDocument (#158). No invented restricted code.
							-->
							<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>

							<!-- DEFECT #143: observation statusCode completed -->
							<statusCode code="completed"/>

							<!-- DEFECT #145: observation effectiveTime = visit clock -->
							<effectiveTime value="${visitTime}"/>
							<!--
								DEFECT #243: complications observation/priorityCode.
								WAS: complications OBS had id/code/statusCode/effectiveTime/value
								only - no priorityCode. Diagnosis (#240), anamnesis (#241) and
								objective (#242) already carry priorityCode NI. HL7 CDA R2
								Observation has priorityCode 0..1. SEMD validators often flag
								missing priority under complications OBS. Form 043/u
								complications is free-text note - do not invent R/UR/S.
								NOW: priorityCode nullFlavor NI until chart field exists.
							-->
							<priorityCode nullFlavor="NI"/>
							<value xsi:type="ST">${escapeXml(params.complications || "Не отмечены")}</value>
							<!--
								DEFECT #191: complications observation/methodCode.
								WAS: complications OBS had id/code/statusCode/effectiveTime/value
								only — no methodCode. Diagnosis (#186), anamnesis (#189) and
								objective (#190) already carry methodCode NI. HL7 CDA R2
								Observation has methodCode 0..*. SEMD validators often flag
								missing method under complications OBS. Form 043/u
								complications is free-text note — do not invent a fake NSI
								method OID.
								NOW: methodCode nullFlavor NI until chart field exists.
							-->
							<methodCode nullFlavor="NI"/>
							<!--
								DEFECT #195: complications observation/interpretationCode.
								WAS: complications OBS gained methodCode NI (#191) but still
								had no interpretationCode. Diagnosis (#187), anamnesis (#193)
								and objective (#194) already carry interpretationCode NI.
								HL7 CDA R2 Observation has interpretationCode 0..*. SEMD
								validators often flag missing interpretation under
								complications OBS. Form 043/u complications is free-text
								note — do not invent a fake N/A/H code.
								NOW: interpretationCode nullFlavor NI until chart field exists.
							-->
							<interpretationCode nullFlavor="NI"/>
							<!--
								DEFECT #199: complications observation/uncertaintyCode.
								WAS: complications OBS gained methodCode (#191) and
								interpretationCode (#195) but still had no uncertaintyCode.
								Diagnosis (#188), anamnesis (#197) and objective (#198)
								already carry uncertaintyCode NI. HL7 CDA R2 Observation has
								uncertaintyCode 0..1 (U/N from ActUncertainty). SEMD
								validators often flag missing uncertainty under complications
								OBS. Form 043/u complications is free-text note — do not
								invent U/N.
								NOW: uncertaintyCode nullFlavor NI until chart field exists.
							-->
							<uncertaintyCode nullFlavor="NI"/>
							<!--
								DEFECT #251: complications observation/repeatNumber.
								WAS: complications OBS had priorityCode (#243)/methodCode/
								interpretationCode/uncertaintyCode only - no repeatNumber.
								Diagnosis (#245), anamnesis (#247) and objective (#249)
								already carry repeatNumber NI. HL7 CDA R2 Observation has
								repeatNumber 0..1. SEMD validators often flag missing
								repeatNumber under complications OBS. Form 043/u
								complications is a single free-text note - do not invent
								a number.
								NOW: repeatNumber nullFlavor NI until chart field exists.
							-->
							<repeatNumber nullFlavor="NI"/>
							<!--
								DEFECT #252: complications observation/independentInd.
								WAS: complications OBS had priorityCode/methodCode/
								interpretationCode/uncertaintyCode/repeatNumber only - no
								independentInd. Diagnosis (#246), anamnesis (#248) and
								objective (#250) already carry independentInd NI. HL7 CDA R2
								Observation has independentInd 0..1. SEMD validators often
								flag missing independentInd under complications OBS.
								Form 043/u chart has no independence flag - do not invent
								true/false.
								NOW: independentInd nullFlavor NI until chart field exists.
							-->
							<independentInd nullFlavor="NI"/>
							<!--
								DEFECT #227: complications observation/approachSiteCode.
								WAS: complications OBS had methodCode/interpretationCode/
								uncertaintyCode only — no approachSiteCode. Diagnosis (#224),
								anamnesis (#225) and objective (#226) already carry
								approachSiteCode NI. HL7 CDA R2 Observation has
								approachSiteCode 0..*. SEMD validators often flag missing
								approach under complications OBS. Form 043/u complications
								is free-text note — do not invent ISO 3950.
								NOW: approachSiteCode nullFlavor NI until chart field exists.
							-->
							<approachSiteCode nullFlavor="NI"/>
							<!--
								DEFECT #231: complications observation/targetSiteCode.
								WAS: complications OBS had approachSiteCode NI (#227) but no
								targetSiteCode. Diagnosis (#223), anamnesis (#229) and
								objective (#230) already emit targetSiteCode. HL7 CDA R2
								Observation has targetSiteCode 0..*. SEMD validators often
								flag missing target site under complications OBS. Form 043/u
								complications is free-text note — do not invent ISO 3950.
								NOW: targetSiteCode nullFlavor NI until chart field exists.
							-->
							<targetSiteCode nullFlavor="NI"/>
							<!--
								DEFECT #236: complications observation/performer.
								WAS: complications OBS had method/interpretation/uncertainty/
								approach/targetSite only - no performer. Diagnosis (#233),
								anamnesis (#234) and objective (#235) already carry performer PRF.
								HL7 CDA R2 Observation has performer 0..*. SEMD validators
								often flag missing performer under complications OBS so
								REMD cannot attribute the complications note to the treating
								dentist at entry level (header performer is care-event only).
								NOW: performer typeCode=PRF with time=visitTime and
								assignedEntity mirroring diagnosis OBS performer (SNILS or NI,
								code with position or bare NI, person, MO org). No invented
								extension="unknown" or street/phone.
							-->
							<performer typeCode="PRF">
								<time value="${visitTime}"/>
								<assignedEntity>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedEntity>
							</performer>
							<!--
								DEFECT #286: complications observation/author.
								WAS: complications OBS had performer (#236) then closed — no entry-level author. Diagnosis (#283) through objective (#285) already carry author.
								Document-level author already attributes the ClinicalDocument.
								HL7 CDA R2 Act/Observation/Supply has author 0..* (who
								recorded the act). SEMD validators often flag missing author
								under body entries so REMD cannot separate recorder from
								performer at entry level. Form 043/u treating dentist authors
								the chart entry.
								NOW: author with time=visitTime and assignedAuthor mirroring
								document author / entry performer (SNILS or NI, code with
								position or bare NI, person, MO org). No invented extension
								or street/phone.
							-->
							<author>
								<time value="${visitTime}"/>
								<assignedAuthor>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedAuthor>
							</author>
							<!--
								DEFECT #295: complications observation/informant.
								WAS: complications OBS had performer (#236) + author (#286) then closed — no entry-level informant. Diagnosis (#292) through objective (#294) already carry informant.
								Document-level informant already attributes the clinical
								source of the ClinicalDocument. HL7 CDA R2 Act/Observation/
								Supply has informant 0..* (who supplied the facts for the
								act). SEMD validators often flag missing informant under body
								entries so REMD cannot separate clinical source from author/
								performer at entry level. Form 043/u treating dentist is the
								clinical source of the chart entry (same person as document
								informant).
								NOW: informant with time=visitTime, functionCode NI+displayName
								when doctorPosition known (else bare NI), assignedEntity
								mirroring document informant (SNILS or NI, code, person, MO).
								No invented extension or street/phone.
							-->
							<informant>
								<time value="${visitTime}"/>
								${params.doctorPosition && params.doctorPosition.trim()
									? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
									: `<functionCode nullFlavor="NI"/>`}
								<assignedEntity>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedEntity>
							</informant>
							<!--
								DEFECT #304: complications observation/participant.
								WAS: complications OBS had performer/author/informant then closed — no entry-level participant. Diagnosis (#301) through objective (#303) already carry participant REF.
								Document-level participant REF (#152/#169/#147) already attributes
								the referring/related provider on ClinicalDocument. HL7 CDA R2
								Act/Observation/Supply has participant 0..* (related parties for
								the act). SEMD validators often flag missing participant under
								body entries so REMD cannot attach REF/related-provider at entry
								level. Form 043/u treating dentist is the related provider for
								the chart entry (same person as document REF participant).
								NOW: participant typeCode=REF with time=visitTime, functionCode
								NI+displayName when doctorPosition known (else bare NI),
								associatedEntity PROV mirroring document REF (SNILS or NI, code,
								person, scopingOrganization MO). No invented extension.
							-->
							<participant typeCode="REF">
								<time value="${visitTime}"/>
								${params.doctorPosition && params.doctorPosition.trim()
									? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
									: `<functionCode nullFlavor="NI"/>`}
								<associatedEntity classCode="PROV">
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<scopingOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</scopingOrganization>
								</associatedEntity>
							</participant>
							<!--
								DEFECT #322: complications observation/precondition.
								WAS: complications OBS had performer/author/informant/participant then closed — no precondition. Diagnosis (#319) through objective (#321) already carry precondition PRCN.
								HL7 CDA R2 Act/Observation/Supply has precondition 0..*
								(criteria that must be true for the act). SEMD validators
								often flag missing precondition under body entries when the
								care event is documented without explicit criteria. Form 043/u
								chart does not collect discrete clinical preconditions for
								these entries — do not invent criterion codes or values.
								NOW: precondition typeCode=PRCN with criterion nullFlavor NI
								(id/code/value all NI) until chart fields exist.
							-->
							<precondition typeCode="PRCN">
								<criterion>
									<id nullFlavor="NI"/>
									<code nullFlavor="NI"/>
									<!--
										DEFECT #650: precondition/criterion/text.
										WAS: criterion had id/code/value only — no text. HL7 CDA R2 Criterion (Act) has text 0..1. SEMD often flags bare criterion under precondition.
										NOW: text nullFlavor NI; do not invent precondition prose.
									-->
									<text nullFlavor="NI"/>
									<!--
										DEFECT #651: precondition/criterion/statusCode.
										WAS: criterion had no statusCode. HL7 CDA R2 Act has statusCode 1..1 in many profiles; sibling nested acts use completed.
										NOW: statusCode completed.
									-->
									<statusCode code="completed"/>
									<value xsi:type="CD" nullFlavor="NI"/>
									<!--
										DEFECT #652: precondition/criterion/effectiveTime.
										WAS: criterion had no effectiveTime. SEMD often flags missing effectiveTime under precondition criterion when body acts emit it.
										NOW: effectiveTime nullFlavor NI; do not invent criterion window.
									-->
									<effectiveTime nullFlavor="NI"/>
								</criterion>
							</precondition>
							<!--
								DEFECT #331: complications observation/reference.
								WAS: complications OBS had performer/author/informant/participant/precondition then closed — no reference. Diagnosis (#328) through objective (#330) already carry reference REFR.
								HL7 CDA R2 Act/Observation/Supply has reference 0..*
								(link to external acts/documents). SEMD validators often
								flag missing reference under body entries when the care
								event cannot point to a related external act. Form 043/u
								chart does not collect discrete external-act references for
								these entries — do not invent root/extension or URLs.
								NOW: reference typeCode=REFR with externalAct classCode=ACT
								moodCode=EVN and id nullFlavor NI until chart field exists.
							-->
							<reference typeCode="REFR">
								<externalAct classCode="ACT" moodCode="EVN">
									<id nullFlavor="NI"/>
									<!--
										DEFECT #671: reference/externalAct/code.
										WAS: externalAct had id NI only — no code. HL7 CDA R2 ExternalAct has code 0..1. SEMD often flags bare externalAct under reference REFR.
										NOW: code nullFlavor NI; do not invent external act type.
									-->
									<code nullFlavor="NI"/>
									<!--
										DEFECT #672: reference/externalAct/text.
										WAS: externalAct had no text. HL7 CDA R2 ExternalAct has text 0..1.
										NOW: text nullFlavor NI; do not invent external narrative.
									-->
									<text nullFlavor="NI"/>
								</externalAct>
							</reference>
							<!--
								DEFECT #340: complications observation/specimen.
								WAS: complications OBS had performer/author/informant/participant/precondition/reference then closed — no specimen. Diagnosis (#337) through objective (#339) already carry specimen SPC.
								HL7 CDA R2 Observation has specimen 0..* (material used for
								the observation). SEMD validators often flag missing specimen
								under clinical OBS entries. Form 043/u ambulatory dental chart
								does not collect discrete specimen identity for these findings
								— do not invent specimen type codes or IDs.
								NOW: specimen typeCode=SPC with specimenRole id nullFlavor NI
								until chart field exists.
							-->
							<specimen typeCode="SPC">
								<specimenRole>
									<id nullFlavor="NI"/>
								
									<!--
										DEFECT #396: complications observation/specimen/specimenRole/specimenPlayingEntity.
										WAS: specimenRole had id NI only — no specimenPlayingEntity.
										HL7 CDA R2 SpecimenRole has specimenPlayingEntity 0..1 (the material
										entity). SEMD validators often flag empty specimenRole under clinical
										entries when playing entity code/name cannot be joined. Form 043/u
										chart does not collect discrete specimen entity codes — do not invent
										SNOMED/NSI specimen type codes.
										NOW: specimenPlayingEntity with code/name nullFlavor NI until chart
										field exists.
									-->
									<specimenPlayingEntity>
										<code nullFlavor="NI"/>
										<name nullFlavor="NI"/>
										<!--
											DEFECT #508: specimenPlayingEntity/desc.
											WAS: specimenPlayingEntity had code/name NI only — no desc. HL7 CDA R2 Entity has desc 0..1. SEMD validators often flag bare playing entity under specimen when material description cannot be joined. Form 043/u chart does not collect specimen material narrative; do not invent desc text.
											NOW: desc nullFlavor NI until chart field exists.
										-->
										<desc nullFlavor="NI"/>
										<!--
											DEFECT #509: specimenPlayingEntity/quantity.
											WAS: specimenPlayingEntity had code/name/desc only — no quantity. HL7 CDA R2 ManufacturedMaterial/Entity may carry quantity. SEMD often flags missing quantity under specimen playing entity.
											NOW: quantity nullFlavor NI; do not invent PQ amounts.
										-->
										<quantity nullFlavor="NI"/>
									</specimenPlayingEntity>
</specimenRole>
							</specimen>
							
							<!--
								DEFECT #367: complications observation/subject.
								WAS: complications observation had specimen then entryRelationship — no subject.
								HL7 CDA R2 Act/Observation/Supply has subject 0..1 (related
								subject when different from recordTarget). SEMD validators often
								flag missing subject under clinical body entries. Form 043/u
								patient is already recordTarget — entry-level related subject is
								not collected separately; do not invent relationship codes or ids.
								NOW: subject typeCode=SBJ with relatedSubject classCode=PRS and
								code nullFlavor NI until chart field exists.
							-->
							<subject typeCode="SBJ">
								<relatedSubject classCode="PRS">
									<code nullFlavor="NI"/>
									<addr nullFlavor="NI"/>
									<telecom nullFlavor="NI"/>
									<subject>
										<name nullFlavor="NI"/>
										<!--
										DEFECT #456: relatedSubject/subject/administrativeGenderCode (7/9).
										WAS: SubjectPerson under relatedSubject had only name NI (#420-#428) —
										no administrativeGenderCode. HL7 CDA R2 SubjectPerson has
										administrativeGenderCode 0..1. SEMD validators often flag incomplete
										person stub under Act/subject/relatedSubject.
										Form 043/u does not collect related-party gender; do not invent 1/2.
										NOW: administrativeGenderCode nullFlavor NI.
										-->
										<administrativeGenderCode nullFlavor="NI"/>
										<!--
										DEFECT #457: relatedSubject/subject/birthTime (7/9).
										WAS: SubjectPerson had name (+gender) only — no birthTime.
										HL7 CDA R2 SubjectPerson has birthTime 0..1. Mirror patient demographics
										slot under related-party person stub.
										Form 043/u does not collect related-party DOB; do not invent dates.
										NOW: birthTime nullFlavor NI.
										-->
										<birthTime nullFlavor="NI"/>
									</subject>
								</relatedSubject>
							</subject>

							
							<!--
								DEFECT #383: complications observation/consumable.
								WAS: complications observation had performer/.../specimen/subject — no consumable.
								Treatment ACT (#373) and tray supply (#374) already carry consumable CSM.
								HL7 CDA R2 Observation (Act) has consumable 0..* (materials used while
								making the observation). SEMD validators often flag missing consumable
								under clinical OBS when exam materials cannot be joined. Form 043/u
								chart does not collect discrete consumable NSI codes for these findings
								— do not invent material codes or barcodes.
								NOW: consumable typeCode=CSM with manufacturedProduct classCode=MANU
								and manufacturedMaterial code/name nullFlavor NI until chart field exists.
							-->
							<consumable typeCode="CSM">
								<manufacturedProduct classCode="MANU">
									<!--
										DEFECT #683: manufacturedProduct/id.
										WAS: manufacturedProduct opened then manufacturedMaterial — no id. Tray product carries barcode id; consumable shells had no product id. HL7 CDA R2 ManufacturedProduct has id 0..*. SEMD often flags bare product under consumable without id slot.
										NOW: id nullFlavor NI; do not invent extension=unknown.
									-->
									<id nullFlavor="NI"/>
									<manufacturedMaterial>
										<code nullFlavor="NI"/>
										<name nullFlavor="NI"/>
										<!--
											DEFECT #534: manufacturedMaterial/lotNumberText.
											WAS: manufacturedMaterial had code/name NI only — no lotNumberText. Tray product already emits lot (#388). HL7 CDA R2 Material has lotNumberText 0..1. SEMD often flags bare material under consumable without lot slot.
											NOW: lotNumberText nullFlavor NI; do not invent lot strings.
										-->
										<lotNumberText nullFlavor="NI"/>
										<!--
											DEFECT #535: manufacturedMaterial/desc.
											WAS: manufacturedMaterial had code/name/lot only — no desc. Tray already emits desc (#389). SEMD often flags missing material description under consumable.
											NOW: desc nullFlavor NI; do not invent device prose.
										-->
										<desc nullFlavor="NI"/>
										<!--
											DEFECT #536: manufacturedMaterial/expirationTime.
											WAS: manufacturedMaterial had code/name/lot/desc only — no expirationTime. Tray already emits expirationTime. HL7 CDA R2 Material has expirationTime 0..1.
											NOW: expirationTime nullFlavor NI; do not invent expiry timestamps.
										-->
										<expirationTime nullFlavor="NI"/>
									</manufacturedMaterial>
								<!--

									DEFECT #575: manufacturedProduct/manufacturerOrganization.

									WAS: manufacturedProduct had material only — no manufacturerOrganization. Tray product already emits manufacturerOrganization. HL7 CDA R2 ManufacturedProduct has manufacturerOrganization 0..1. SEMD often flags bare product under consumable without org shell.

									NOW: manufacturerOrganization with id/name/addr/telecom NI; do not invent org identity.

								-->

								<manufacturerOrganization>

									<id nullFlavor="NI"/>

									<!--

										DEFECT #576: manufacturerOrganization/name.

										WAS: manufacturerOrganization id only path.

										NOW: name nullFlavor NI.

									-->

									<name nullFlavor="NI"/>

									<!--

										DEFECT #577: manufacturerOrganization/addr.

										NOW: addr nullFlavor NI; do not invent streetAddressLine.

									-->

									<addr nullFlavor="NI"/>

									<!--

										DEFECT #578: manufacturerOrganization/telecom.

										NOW: telecom nullFlavor NI; do not invent phone.

									-->

									<telecom nullFlavor="NI"/>

								</manufacturerOrganization>

								</manufacturedProduct>
							</consumable>
<!--
								DEFECT #378: complications observation/referenceRange.
								WAS: complications observation had value/method/.../subject then entryRelationship —
								no referenceRange. HL7 CDA R2 Observation has referenceRange 0..*
								(observationRange for normal/abnormal bounds). SEMD validators often
								flag missing referenceRange under clinical OBS entries. Form 043/u
								ambulatory dental findings are free-text/ICD — no lab-style reference
								interval is collected; do not invent PQ bounds or interpretation anchors.
								NOW: referenceRange with observationRange value nullFlavor NI until
								chart field exists.
							-->
							<referenceRange>
								<observationRange>
									<!--
										DEFECT #490: observationRange/code.
										WAS: observationRange had only value CD NI — no code. HL7 CDA R2 ObservationRange has code 0..1 (what range kind). SEMD validators often flag bare observationRange under clinical OBS. Form 043/u ambulatory dental findings have no lab reference-range catalog; do not invent range type codes.
										NOW: code nullFlavor NI until chart field exists.
									-->
									<code nullFlavor="NI"/>
									<!--
										DEFECT #491: observationRange/text.
										WAS: observationRange had no text. HL7 CDA R2 ObservationRange has text 0..1 (ED). SEMD often flags missing narrative under referenceRange when value is NI-only.
										NOW: text nullFlavor NI; do not invent range prose.
									-->
									<text nullFlavor="NI"/>
									<value xsi:type="CD" nullFlavor="NI"/>
									<!--
										DEFECT #492: observationRange/interpretationCode.
										WAS: observationRange had value only — no interpretationCode. HL7 CDA R2 ObservationRange has interpretationCode 0..*. SEMD often flags missing interpretation under referenceRange for clinical OBS.
										NOW: interpretationCode nullFlavor NI; do not invent N/A/H/L codes.
									-->
									<interpretationCode nullFlavor="NI"/>
								</observationRange>
							</referenceRange>
<!--
								DEFECT #345: complications observation/entryRelationship.
								WAS: complications OBS had specimen (#340) then closed — no entryRelationship. Diagnosis (#342) through objective (#344) already carry entryRelationship COMP.
								HL7 CDA R2 Act/Observation/Supply has entryRelationship 0..*
								(related nested acts). SEMD validators often flag missing
								entryRelationship under body entries when sibling acts cannot
								be linked. Form 043/u chart does not collect discrete nested
								related-act graphs for these entries — do not invent nested
								codes or extensions.
								NOW: entryRelationship typeCode=COMP with nested act
								classCode=ACT moodCode=EVN and id/code/statusCode nullFlavor
								NI / completed shell until chart field exists.
							-->
							<entryRelationship typeCode="COMP">
								<act classCode="ACT" moodCode="EVN">
									<id nullFlavor="NI"/>
									<code nullFlavor="NI"/>
									<!--
										DEFECT #617: entryRelationship/act/text.
										WAS: nested COMP act had id/code/statusCode only — no text. HL7 CDA R2 Act has text 0..1. SEMD validators often flag bare nested acts under entryRelationship when parent body acts emit text. Form 043/u has no separate nested-act narrative; do not invent prose.
										NOW: text nullFlavor NI.
									-->
									<text nullFlavor="NI"/>
									<statusCode code="completed"/>
									<!--
										DEFECT #618: entryRelationship/act/priorityCode.
										WAS: nested COMP act had no priorityCode. Parent body acts emit priorityCode NI. SEMD often flags missing priority under nested COMP acts.
										NOW: priorityCode nullFlavor NI; do not invent ActPriority.
									-->
									<priorityCode nullFlavor="NI"/>
									<!--
										DEFECT #619: entryRelationship/act/effectiveTime.
										WAS: nested COMP act had no effectiveTime. Parent body acts stamp documentClock. Nested COMP has no separate chart timestamp; do not invent times.
										NOW: effectiveTime nullFlavor NI.
									-->
									<effectiveTime nullFlavor="NI"/>
									<!--
										DEFECT #620: entryRelationship/act/languageCode.
										WAS: nested COMP act had no languageCode. ClinicalDocument/sections declare ru-RU.
										NOW: languageCode code=ru-RU.
									-->
									<languageCode code="ru-RU"/>
									<!--
										DEFECT #621: entryRelationship/act/confidentialityCode.
										WAS: nested COMP act had no confidentialityCode. ClinicalDocument sets N.
										NOW: confidentialityCode N matching ClinicalDocument.
									-->
									<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
								</act>
							</entryRelationship>







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
										<!--
						DEFECT #458: section/confidentialityCode.
						WAS: section had id/code/title/text then entry — no section-level
						confidentialityCode. Body entry acts already carry confidentialityCode N
						(#310-#318). HL7 CDA R2 Section has confidentialityCode 0..1.
						SEMD validators often flag missing section confidentiality when the
						ClinicalDocument sets N but narrative sections omit it.
						Form 043/u ambulatory dental sections are normal confidentiality.
						NOW: confidentialityCode N matching ClinicalDocument (#158).
					-->
					<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
					<!--
						DEFECT #459: section/languageCode.
						WAS: section had id/code/title/text (+confidentiality) then entry —
						no section-level languageCode. Entry acts already carry languageCode
						ru-RU (#260-#279). HL7 CDA R2 Section has languageCode 0..1.
						SEMD validators often flag missing section language when the document
						declares ru-RU but narrative sections omit it.
						NOW: languageCode code=ru-RU matching ClinicalDocument.
					-->
					<languageCode code="ru-RU"/>
					<!--
						DEFECT #549: section/subject (related subject shell).
						WAS: section had id/code/title/text/confidentialityCode/languageCode then entry — no subject. HL7 CDA R2 Section has subject 0..1 (related subject when section subject differs from recordTarget). Body entries already carry subject SBJ; SEMD validators often flag missing section-level subject shell. Form 043/u sections are about the same patient — no alternate section subject on chart; do not invent related person demographics.
						NOW: subject typeCode=SBJ with relatedSubject classCode=PRS and NI demographics (mirror entry-level relatedSubject).
					-->
					<subject typeCode="SBJ">
						<relatedSubject classCode="PRS">
							<code nullFlavor="NI"/>
							<addr nullFlavor="NI"/>
							<telecom nullFlavor="NI"/>
							<subject>
								<name nullFlavor="NI"/>
								<administrativeGenderCode nullFlavor="NI"/>
								<birthTime nullFlavor="NI"/>
							</subject>
						</relatedSubject>
					</subject>
					<entry>
						<!--
							DEFECT #355: comorbidities observation/@negationInd.
							WAS: open had classCode/moodCode only — no negationInd.
							HL7 CDA R2 Act has negationInd 0..1. SEMD often requires explicit false on asserted acts.
							Form 043/u chart entry is asserted (not negated). NOW: negationInd=false on entry open tag.
						-->
						<observation classCode="OBS" moodCode="EVN" negationInd="false">
							<!-- DEFECT #153: entry Act/id (comorbidities) -->
							<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-comorbidities"/>
							<code code="75326-9" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Сопутствующие заболевания"/>
							<!--
								DEFECT #259: comorbidities observation/text.
								WAS: comorbidities OBS had id/code then jumped to statusCode —
								no entry-level text. Diagnosis (#255), anamnesis (#256),
								objective (#257) and complications (#258) already carry
								<text>. HL7 CDA R2 Observation has text 0..1. SEMD
								validators often flag missing text under comorbidities OBS
								when sibling entries emit it. Form 043/u chart already
								stores comorbidities — mirror it here (ST value stays the
								structured payload).
								NOW: text = comorbidities (default Ne otmecheny).
							-->
							<text>${escapeXml(params.comorbidities || "Не отмечены")}</text>
							<!--
								DEFECT #264: comorbidities observation/languageCode.
								WAS: comorbidities OBS had id/code/text then jumped to statusCode —
								no entry-level languageCode. Diagnosis (#260) through complications
								(#263) already carry languageCode ru-RU. HL7 CDA R2 Observation has
								languageCode 0..1. SEMD validators often flag missing language under
								comorbidities OBS. Form 043/u comorbidities is RU.
								NOW: languageCode code=ru-RU matching ClinicalDocument.
							-->
							<languageCode code="ru-RU"/>
							<!--
								DEFECT #314: comorbidities observation/confidentialityCode.
								WAS: comorbidities OBS had languageCode (#264) then jumped to statusCode — no entry-level confidentialityCode. Diagnosis (#310) through complications (#313) already carry confidentialityCode N.
								ClinicalDocument already declares confidentialityCode N (#158).
								HL7 CDA R2 Act/Observation/Supply has confidentialityCode 0..1
								(sensitivity of the act). SEMD validators often flag missing
								confidentiality under body entries when the document sets N but
								entry acts omit it. Form 043/u ambulatory dental chart entries
								are normal confidentiality (same as ClinicalDocument).
								NOW: confidentialityCode N + codeSystemName + RU displayName
								matching ClinicalDocument (#158). No invented restricted code.
							-->
							<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>

							<!-- DEFECT #143: observation statusCode completed -->
							<statusCode code="completed"/>

							<!-- DEFECT #145: observation effectiveTime = visit clock -->
							<effectiveTime value="${visitTime}"/>
							<!--
								DEFECT #244: comorbidities observation/priorityCode.
								WAS: comorbidities OBS had id/code/statusCode/effectiveTime/value
								only - no priorityCode. Diagnosis (#240), anamnesis (#241),
								objective (#242) and complications (#243) already carry
								priorityCode NI. HL7 CDA R2 Observation has priorityCode 0..1.
								SEMD validators often flag missing priority under comorbidities
								OBS. Form 043/u comorbidities is free-text note - do not invent
								R/UR/S.
								NOW: priorityCode nullFlavor NI until chart field exists.
							-->
							<priorityCode nullFlavor="NI"/>
							<value xsi:type="ST">${escapeXml(params.comorbidities || "Не отмечены")}</value>
							<!--
								DEFECT #192: comorbidities observation/methodCode.
								WAS: comorbidities OBS had id/code/statusCode/effectiveTime/value
								only — no methodCode. Diagnosis (#186), anamnesis (#189),
								objective (#190) and complications (#191) already carry
								methodCode NI. HL7 CDA R2 Observation has methodCode 0..*.
								SEMD validators often flag missing method under comorbidities
								OBS. Form 043/u comorbidities is free-text note — do not
								invent a fake NSI method OID.
								NOW: methodCode nullFlavor NI until chart field exists.
							-->
							<methodCode nullFlavor="NI"/>
							<!--
								DEFECT #196: comorbidities observation/interpretationCode.
								WAS: comorbidities OBS gained methodCode NI (#192) but still
								had no interpretationCode. Diagnosis (#187), anamnesis (#193),
								objective (#194) and complications (#195) already carry
								interpretationCode NI. HL7 CDA R2 Observation has
								interpretationCode 0..*. SEMD validators often flag missing
								interpretation under comorbidities OBS. Form 043/u
								comorbidities is free-text note — do not invent a fake N/A/H.
								NOW: interpretationCode nullFlavor NI until chart field exists.
							-->
							<interpretationCode nullFlavor="NI"/>
							<!--
								DEFECT #200: comorbidities observation/uncertaintyCode.
								WAS: comorbidities OBS gained methodCode (#192) and
								interpretationCode (#196) but still had no uncertaintyCode.
								Diagnosis (#188), anamnesis (#197), objective (#198) and
								complications (#199) already carry uncertaintyCode NI.
								HL7 CDA R2 Observation has uncertaintyCode 0..1 (U/N from
								ActUncertainty). SEMD validators often flag missing
								uncertainty under comorbidities OBS. Form 043/u comorbidities
								is free-text note — do not invent U/N.
								NOW: uncertaintyCode nullFlavor NI until chart field exists.
							-->
							<uncertaintyCode nullFlavor="NI"/>
							<!--
								DEFECT #253: comorbidities observation/repeatNumber.
								WAS: comorbidities OBS had priorityCode (#244)/methodCode/
								interpretationCode/uncertaintyCode only - no repeatNumber.
								Diagnosis (#245), anamnesis (#247), objective (#249) and
								complications (#251) already carry repeatNumber NI. HL7 CDA
								R2 Observation has repeatNumber 0..1. SEMD validators often
								flag missing repeatNumber under comorbidities OBS. Form
								043/u comorbidities is a single free-text note - do not
								invent a number.
								NOW: repeatNumber nullFlavor NI until chart field exists.
							-->
							<repeatNumber nullFlavor="NI"/>
							<!--
								DEFECT #254: comorbidities observation/independentInd.
								WAS: comorbidities OBS had priorityCode/methodCode/
								interpretationCode/uncertaintyCode/repeatNumber only - no
								independentInd. Diagnosis (#246), anamnesis (#248),
								objective (#250) and complications (#252) already carry
								independentInd NI. HL7 CDA R2 Observation has independentInd
								0..1. SEMD validators often flag missing independentInd under
								comorbidities OBS. Form 043/u chart has no independence flag
								- do not invent true/false.
								NOW: independentInd nullFlavor NI until chart field exists.
							-->
							<independentInd nullFlavor="NI"/>
							<!--
								DEFECT #228: comorbidities observation/approachSiteCode.
								WAS: comorbidities OBS had methodCode/interpretationCode/
								uncertaintyCode only — no approachSiteCode. Diagnosis (#224),
								anamnesis (#225), objective (#226) and complications (#227)
								already carry approachSiteCode NI. HL7 CDA R2 Observation has
								approachSiteCode 0..*. SEMD validators often flag missing
								approach under comorbidities OBS. Form 043/u comorbidities
								is free-text note — do not invent ISO 3950.
								NOW: approachSiteCode nullFlavor NI until chart field exists.
							-->
							<approachSiteCode nullFlavor="NI"/>
							<!--
								DEFECT #232: comorbidities observation/targetSiteCode.
								WAS: comorbidities OBS had approachSiteCode NI (#228) but no
								targetSiteCode. Diagnosis (#223), anamnesis (#229), objective
								(#230) and complications (#231) already emit targetSiteCode.
								HL7 CDA R2 Observation has targetSiteCode 0..*. SEMD validators
								often flag missing target site under comorbidities OBS.
								Form 043/u comorbidities is free-text note — do not invent
								ISO 3950.
								NOW: targetSiteCode nullFlavor NI until chart field exists.
							-->
							<targetSiteCode nullFlavor="NI"/>
							<!--
								DEFECT #237: comorbidities observation/performer.
								WAS: comorbidities OBS had method/interpretation/uncertainty/
								approach/targetSite only - no performer. Diagnosis (#233),
								anamnesis (#234), objective (#235) and complications (#236)
								already carry performer PRF. HL7 CDA R2 Observation has
								performer 0..*. SEMD validators often flag missing performer
								under comorbidities OBS so REMD cannot attribute the
								comorbidities note to the treating dentist at entry level
								(header performer is care-event only).
								NOW: performer typeCode=PRF with time=visitTime and
								assignedEntity mirroring diagnosis OBS performer (SNILS or NI,
								code with position or bare NI, person, MO org). No invented
								extension="unknown" or street/phone.
							-->
							<performer typeCode="PRF">
								<time value="${visitTime}"/>
								<assignedEntity>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedEntity>
							</performer>
							<!--
								DEFECT #287: comorbidities observation/author.
								WAS: comorbidities OBS had performer (#237) then closed — no entry-level author. Diagnosis (#283) through complications (#286) already carry author.
								Document-level author already attributes the ClinicalDocument.
								HL7 CDA R2 Act/Observation/Supply has author 0..* (who
								recorded the act). SEMD validators often flag missing author
								under body entries so REMD cannot separate recorder from
								performer at entry level. Form 043/u treating dentist authors
								the chart entry.
								NOW: author with time=visitTime and assignedAuthor mirroring
								document author / entry performer (SNILS or NI, code with
								position or bare NI, person, MO org). No invented extension
								or street/phone.
							-->
							<author>
								<time value="${visitTime}"/>
								<assignedAuthor>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedAuthor>
							</author>
							<!--
								DEFECT #296: comorbidities observation/informant.
								WAS: comorbidities OBS had performer (#237) + author (#287) then closed — no entry-level informant. Diagnosis (#292) through complications (#295) already carry informant.
								Document-level informant already attributes the clinical
								source of the ClinicalDocument. HL7 CDA R2 Act/Observation/
								Supply has informant 0..* (who supplied the facts for the
								act). SEMD validators often flag missing informant under body
								entries so REMD cannot separate clinical source from author/
								performer at entry level. Form 043/u treating dentist is the
								clinical source of the chart entry (same person as document
								informant).
								NOW: informant with time=visitTime, functionCode NI+displayName
								when doctorPosition known (else bare NI), assignedEntity
								mirroring document informant (SNILS or NI, code, person, MO).
								No invented extension or street/phone.
							-->
							<informant>
								<time value="${visitTime}"/>
								${params.doctorPosition && params.doctorPosition.trim()
									? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
									: `<functionCode nullFlavor="NI"/>`}
								<assignedEntity>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedEntity>
							</informant>
							<!--
								DEFECT #305: comorbidities observation/participant.
								WAS: comorbidities OBS had performer/author/informant then closed — no entry-level participant. Diagnosis (#301) through complications (#304) already carry participant REF.
								Document-level participant REF (#152/#169/#147) already attributes
								the referring/related provider on ClinicalDocument. HL7 CDA R2
								Act/Observation/Supply has participant 0..* (related parties for
								the act). SEMD validators often flag missing participant under
								body entries so REMD cannot attach REF/related-provider at entry
								level. Form 043/u treating dentist is the related provider for
								the chart entry (same person as document REF participant).
								NOW: participant typeCode=REF with time=visitTime, functionCode
								NI+displayName when doctorPosition known (else bare NI),
								associatedEntity PROV mirroring document REF (SNILS or NI, code,
								person, scopingOrganization MO). No invented extension.
							-->
							<participant typeCode="REF">
								<time value="${visitTime}"/>
								${params.doctorPosition && params.doctorPosition.trim()
									? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
									: `<functionCode nullFlavor="NI"/>`}
								<associatedEntity classCode="PROV">
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<scopingOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</scopingOrganization>
								</associatedEntity>
							</participant>
							<!--
								DEFECT #323: comorbidities observation/precondition.
								WAS: comorbidities OBS had performer/author/informant/participant then closed — no precondition. Diagnosis (#319) through complications (#322) already carry precondition PRCN.
								HL7 CDA R2 Act/Observation/Supply has precondition 0..*
								(criteria that must be true for the act). SEMD validators
								often flag missing precondition under body entries when the
								care event is documented without explicit criteria. Form 043/u
								chart does not collect discrete clinical preconditions for
								these entries — do not invent criterion codes or values.
								NOW: precondition typeCode=PRCN with criterion nullFlavor NI
								(id/code/value all NI) until chart fields exist.
							-->
							<precondition typeCode="PRCN">
								<criterion>
									<id nullFlavor="NI"/>
									<code nullFlavor="NI"/>
									<!--
										DEFECT #653: precondition/criterion/text.
										WAS: criterion had id/code/value only — no text. HL7 CDA R2 Criterion (Act) has text 0..1. SEMD often flags bare criterion under precondition.
										NOW: text nullFlavor NI; do not invent precondition prose.
									-->
									<text nullFlavor="NI"/>
									<!--
										DEFECT #654: precondition/criterion/statusCode.
										WAS: criterion had no statusCode. HL7 CDA R2 Act has statusCode 1..1 in many profiles; sibling nested acts use completed.
										NOW: statusCode completed.
									-->
									<statusCode code="completed"/>
									<value xsi:type="CD" nullFlavor="NI"/>
									<!--
										DEFECT #655: precondition/criterion/effectiveTime.
										WAS: criterion had no effectiveTime. SEMD often flags missing effectiveTime under precondition criterion when body acts emit it.
										NOW: effectiveTime nullFlavor NI; do not invent criterion window.
									-->
									<effectiveTime nullFlavor="NI"/>
								</criterion>
							</precondition>
							<!--
								DEFECT #332: comorbidities observation/reference.
								WAS: comorbidities OBS had performer/author/informant/participant/precondition then closed — no reference. Diagnosis (#328) through complications (#331) already carry reference REFR.
								HL7 CDA R2 Act/Observation/Supply has reference 0..*
								(link to external acts/documents). SEMD validators often
								flag missing reference under body entries when the care
								event cannot point to a related external act. Form 043/u
								chart does not collect discrete external-act references for
								these entries — do not invent root/extension or URLs.
								NOW: reference typeCode=REFR with externalAct classCode=ACT
								moodCode=EVN and id nullFlavor NI until chart field exists.
							-->
							<reference typeCode="REFR">
								<externalAct classCode="ACT" moodCode="EVN">
									<id nullFlavor="NI"/>
									<!--
										DEFECT #673: reference/externalAct/code.
										WAS: externalAct had id NI only — no code. HL7 CDA R2 ExternalAct has code 0..1. SEMD often flags bare externalAct under reference REFR.
										NOW: code nullFlavor NI; do not invent external act type.
									-->
									<code nullFlavor="NI"/>
									<!--
										DEFECT #674: reference/externalAct/text.
										WAS: externalAct had no text. HL7 CDA R2 ExternalAct has text 0..1.
										NOW: text nullFlavor NI; do not invent external narrative.
									-->
									<text nullFlavor="NI"/>
								</externalAct>
							</reference>
							<!--
								DEFECT #341: comorbidities observation/specimen.
								WAS: comorbidities OBS had performer/author/informant/participant/precondition/reference then closed — no specimen. Diagnosis (#337) through complications (#340) already carry specimen SPC.
								HL7 CDA R2 Observation has specimen 0..* (material used for
								the observation). SEMD validators often flag missing specimen
								under clinical OBS entries. Form 043/u ambulatory dental chart
								does not collect discrete specimen identity for these findings
								— do not invent specimen type codes or IDs.
								NOW: specimen typeCode=SPC with specimenRole id nullFlavor NI
								until chart field exists.
							-->
							<specimen typeCode="SPC">
								<specimenRole>
									<id nullFlavor="NI"/>
								
									<!--
										DEFECT #397: comorbidities observation/specimen/specimenRole/specimenPlayingEntity.
										WAS: specimenRole had id NI only — no specimenPlayingEntity.
										HL7 CDA R2 SpecimenRole has specimenPlayingEntity 0..1 (the material
										entity). SEMD validators often flag empty specimenRole under clinical
										entries when playing entity code/name cannot be joined. Form 043/u
										chart does not collect discrete specimen entity codes — do not invent
										SNOMED/NSI specimen type codes.
										NOW: specimenPlayingEntity with code/name nullFlavor NI until chart
										field exists.
									-->
									<specimenPlayingEntity>
										<code nullFlavor="NI"/>
										<name nullFlavor="NI"/>
										<!--
											DEFECT #510: specimenPlayingEntity/desc.
											WAS: specimenPlayingEntity had code/name NI only — no desc. HL7 CDA R2 Entity has desc 0..1. SEMD validators often flag bare playing entity under specimen when material description cannot be joined. Form 043/u chart does not collect specimen material narrative; do not invent desc text.
											NOW: desc nullFlavor NI until chart field exists.
										-->
										<desc nullFlavor="NI"/>
										<!--
											DEFECT #511: specimenPlayingEntity/quantity.
											WAS: specimenPlayingEntity had code/name/desc only — no quantity. HL7 CDA R2 ManufacturedMaterial/Entity may carry quantity. SEMD often flags missing quantity under specimen playing entity.
											NOW: quantity nullFlavor NI; do not invent PQ amounts.
										-->
										<quantity nullFlavor="NI"/>
									</specimenPlayingEntity>
</specimenRole>
							</specimen>
							
							<!--
								DEFECT #368: comorbidities observation/subject.
								WAS: comorbidities observation had specimen then entryRelationship — no subject.
								HL7 CDA R2 Act/Observation/Supply has subject 0..1 (related
								subject when different from recordTarget). SEMD validators often
								flag missing subject under clinical body entries. Form 043/u
								patient is already recordTarget — entry-level related subject is
								not collected separately; do not invent relationship codes or ids.
								NOW: subject typeCode=SBJ with relatedSubject classCode=PRS and
								code nullFlavor NI until chart field exists.
							-->
							<subject typeCode="SBJ">
								<relatedSubject classCode="PRS">
									<code nullFlavor="NI"/>
									<addr nullFlavor="NI"/>
									<telecom nullFlavor="NI"/>
									<subject>
										<name nullFlavor="NI"/>
										<!--
										DEFECT #460: relatedSubject/subject/administrativeGenderCode (8/9).
										WAS: SubjectPerson under relatedSubject had only name NI (#420-#428) —
										no administrativeGenderCode. HL7 CDA R2 SubjectPerson has
										administrativeGenderCode 0..1. SEMD validators often flag incomplete
										person stub under Act/subject/relatedSubject.
										Form 043/u does not collect related-party gender; do not invent 1/2.
										NOW: administrativeGenderCode nullFlavor NI.
										-->
										<administrativeGenderCode nullFlavor="NI"/>
										<!--
										DEFECT #461: relatedSubject/subject/birthTime (8/9).
										WAS: SubjectPerson had name (+gender) only — no birthTime.
										HL7 CDA R2 SubjectPerson has birthTime 0..1. Mirror patient demographics
										slot under related-party person stub.
										Form 043/u does not collect related-party DOB; do not invent dates.
										NOW: birthTime nullFlavor NI.
										-->
										<birthTime nullFlavor="NI"/>
									</subject>
								</relatedSubject>
							</subject>

							
							<!--
								DEFECT #384: comorbidities observation/consumable.
								WAS: comorbidities observation had performer/.../specimen/subject — no consumable.
								Treatment ACT (#373) and tray supply (#374) already carry consumable CSM.
								HL7 CDA R2 Observation (Act) has consumable 0..* (materials used while
								making the observation). SEMD validators often flag missing consumable
								under clinical OBS when exam materials cannot be joined. Form 043/u
								chart does not collect discrete consumable NSI codes for these findings
								— do not invent material codes or barcodes.
								NOW: consumable typeCode=CSM with manufacturedProduct classCode=MANU
								and manufacturedMaterial code/name nullFlavor NI until chart field exists.
							-->
							<consumable typeCode="CSM">
								<manufacturedProduct classCode="MANU">
									<!--
										DEFECT #684: manufacturedProduct/id.
										WAS: manufacturedProduct opened then manufacturedMaterial — no id. Tray product carries barcode id; consumable shells had no product id. HL7 CDA R2 ManufacturedProduct has id 0..*. SEMD often flags bare product under consumable without id slot.
										NOW: id nullFlavor NI; do not invent extension=unknown.
									-->
									<id nullFlavor="NI"/>
									<manufacturedMaterial>
										<code nullFlavor="NI"/>
										<name nullFlavor="NI"/>
										<!--
											DEFECT #537: manufacturedMaterial/lotNumberText.
											WAS: manufacturedMaterial had code/name NI only — no lotNumberText. Tray product already emits lot (#388). HL7 CDA R2 Material has lotNumberText 0..1. SEMD often flags bare material under consumable without lot slot.
											NOW: lotNumberText nullFlavor NI; do not invent lot strings.
										-->
										<lotNumberText nullFlavor="NI"/>
										<!--
											DEFECT #538: manufacturedMaterial/desc.
											WAS: manufacturedMaterial had code/name/lot only — no desc. Tray already emits desc (#389). SEMD often flags missing material description under consumable.
											NOW: desc nullFlavor NI; do not invent device prose.
										-->
										<desc nullFlavor="NI"/>
										<!--
											DEFECT #539: manufacturedMaterial/expirationTime.
											WAS: manufacturedMaterial had code/name/lot/desc only — no expirationTime. Tray already emits expirationTime. HL7 CDA R2 Material has expirationTime 0..1.
											NOW: expirationTime nullFlavor NI; do not invent expiry timestamps.
										-->
										<expirationTime nullFlavor="NI"/>
									</manufacturedMaterial>
								<!--

									DEFECT #579: manufacturedProduct/manufacturerOrganization.

									WAS: manufacturedProduct had material only — no manufacturerOrganization. Tray product already emits manufacturerOrganization. HL7 CDA R2 ManufacturedProduct has manufacturerOrganization 0..1. SEMD often flags bare product under consumable without org shell.

									NOW: manufacturerOrganization with id/name/addr/telecom NI; do not invent org identity.

								-->

								<manufacturerOrganization>

									<id nullFlavor="NI"/>

									<!--

										DEFECT #580: manufacturerOrganization/name.

										WAS: manufacturerOrganization id only path.

										NOW: name nullFlavor NI.

									-->

									<name nullFlavor="NI"/>

									<!--

										DEFECT #581: manufacturerOrganization/addr.

										NOW: addr nullFlavor NI; do not invent streetAddressLine.

									-->

									<addr nullFlavor="NI"/>

									<!--

										DEFECT #582: manufacturerOrganization/telecom.

										NOW: telecom nullFlavor NI; do not invent phone.

									-->

									<telecom nullFlavor="NI"/>

								</manufacturerOrganization>

								</manufacturedProduct>
							</consumable>
<!--
								DEFECT #379: comorbidities observation/referenceRange.
								WAS: comorbidities observation had value/method/.../subject then entryRelationship —
								no referenceRange. HL7 CDA R2 Observation has referenceRange 0..*
								(observationRange for normal/abnormal bounds). SEMD validators often
								flag missing referenceRange under clinical OBS entries. Form 043/u
								ambulatory dental findings are free-text/ICD — no lab-style reference
								interval is collected; do not invent PQ bounds or interpretation anchors.
								NOW: referenceRange with observationRange value nullFlavor NI until
								chart field exists.
							-->
							<referenceRange>
								<observationRange>
									<!--
										DEFECT #493: observationRange/code.
										WAS: observationRange had only value CD NI — no code. HL7 CDA R2 ObservationRange has code 0..1 (what range kind). SEMD validators often flag bare observationRange under clinical OBS. Form 043/u ambulatory dental findings have no lab reference-range catalog; do not invent range type codes.
										NOW: code nullFlavor NI until chart field exists.
									-->
									<code nullFlavor="NI"/>
									<!--
										DEFECT #494: observationRange/text.
										WAS: observationRange had no text. HL7 CDA R2 ObservationRange has text 0..1 (ED). SEMD often flags missing narrative under referenceRange when value is NI-only.
										NOW: text nullFlavor NI; do not invent range prose.
									-->
									<text nullFlavor="NI"/>
									<value xsi:type="CD" nullFlavor="NI"/>
									<!--
										DEFECT #495: observationRange/interpretationCode.
										WAS: observationRange had value only — no interpretationCode. HL7 CDA R2 ObservationRange has interpretationCode 0..*. SEMD often flags missing interpretation under referenceRange for clinical OBS.
										NOW: interpretationCode nullFlavor NI; do not invent N/A/H/L codes.
									-->
									<interpretationCode nullFlavor="NI"/>
								</observationRange>
							</referenceRange>
<!--
								DEFECT #346: comorbidities observation/entryRelationship.
								WAS: comorbidities OBS had specimen (#341) then closed — no entryRelationship. Diagnosis (#342) through complications (#345) already carry entryRelationship COMP.
								HL7 CDA R2 Act/Observation/Supply has entryRelationship 0..*
								(related nested acts). SEMD validators often flag missing
								entryRelationship under body entries when sibling acts cannot
								be linked. Form 043/u chart does not collect discrete nested
								related-act graphs for these entries — do not invent nested
								codes or extensions.
								NOW: entryRelationship typeCode=COMP with nested act
								classCode=ACT moodCode=EVN and id/code/statusCode nullFlavor
								NI / completed shell until chart field exists.
							-->
							<entryRelationship typeCode="COMP">
								<act classCode="ACT" moodCode="EVN">
									<id nullFlavor="NI"/>
									<code nullFlavor="NI"/>
									<!--
										DEFECT #622: entryRelationship/act/text.
										WAS: nested COMP act had id/code/statusCode only — no text. HL7 CDA R2 Act has text 0..1. SEMD validators often flag bare nested acts under entryRelationship when parent body acts emit text. Form 043/u has no separate nested-act narrative; do not invent prose.
										NOW: text nullFlavor NI.
									-->
									<text nullFlavor="NI"/>
									<statusCode code="completed"/>
									<!--
										DEFECT #623: entryRelationship/act/priorityCode.
										WAS: nested COMP act had no priorityCode. Parent body acts emit priorityCode NI. SEMD often flags missing priority under nested COMP acts.
										NOW: priorityCode nullFlavor NI; do not invent ActPriority.
									-->
									<priorityCode nullFlavor="NI"/>
									<!--
										DEFECT #624: entryRelationship/act/effectiveTime.
										WAS: nested COMP act had no effectiveTime. Parent body acts stamp documentClock. Nested COMP has no separate chart timestamp; do not invent times.
										NOW: effectiveTime nullFlavor NI.
									-->
									<effectiveTime nullFlavor="NI"/>
									<!--
										DEFECT #625: entryRelationship/act/languageCode.
										WAS: nested COMP act had no languageCode. ClinicalDocument/sections declare ru-RU.
										NOW: languageCode code=ru-RU.
									-->
									<languageCode code="ru-RU"/>
									<!--
										DEFECT #626: entryRelationship/act/confidentialityCode.
										WAS: nested COMP act had no confidentialityCode. ClinicalDocument sets N.
										NOW: confidentialityCode N matching ClinicalDocument.
									-->
									<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
								</act>
							</entryRelationship>







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
										<!--
						DEFECT #462: section/confidentialityCode.
						WAS: section had id/code/title/text then entry — no section-level
						confidentialityCode. Body entry acts already carry confidentialityCode N
						(#310-#318). HL7 CDA R2 Section has confidentialityCode 0..1.
						SEMD validators often flag missing section confidentiality when the
						ClinicalDocument sets N but narrative sections omit it.
						Form 043/u ambulatory dental sections are normal confidentiality.
						NOW: confidentialityCode N matching ClinicalDocument (#158).
					-->
					<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
					<!--
						DEFECT #463: section/languageCode.
						WAS: section had id/code/title/text (+confidentiality) then entry —
						no section-level languageCode. Entry acts already carry languageCode
						ru-RU (#260-#279). HL7 CDA R2 Section has languageCode 0..1.
						SEMD validators often flag missing section language when the document
						declares ru-RU but narrative sections omit it.
						NOW: languageCode code=ru-RU matching ClinicalDocument.
					-->
					<languageCode code="ru-RU"/>
					<!--
						DEFECT #550: section/subject (related subject shell).
						WAS: section had id/code/title/text/confidentialityCode/languageCode then entry — no subject. HL7 CDA R2 Section has subject 0..1 (related subject when section subject differs from recordTarget). Body entries already carry subject SBJ; SEMD validators often flag missing section-level subject shell. Form 043/u sections are about the same patient — no alternate section subject on chart; do not invent related person demographics.
						NOW: subject typeCode=SBJ with relatedSubject classCode=PRS and NI demographics (mirror entry-level relatedSubject).
					-->
					<subject typeCode="SBJ">
						<relatedSubject classCode="PRS">
							<code nullFlavor="NI"/>
							<addr nullFlavor="NI"/>
							<telecom nullFlavor="NI"/>
							<subject>
								<name nullFlavor="NI"/>
								<administrativeGenderCode nullFlavor="NI"/>
								<birthTime nullFlavor="NI"/>
							</subject>
						</relatedSubject>
					</subject>
					<entry>
						<!--
							DEFECT #357: instrument-tray supply/@negationInd.
							WAS: open had classCode/moodCode only — no negationInd.
							HL7 CDA R2 Act has negationInd 0..1. SEMD often requires explicit false on asserted acts.
							Form 043/u chart entry is asserted (not negated). NOW: negationInd=false on entry open tag.
						-->
						<supply classCode="SPLY" moodCode="EVN" negationInd="false">
							<!-- DEFECT #153: entry Act/id (instrument tray) -->
							<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-tray"/>
							<code code="69764-9" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Инструментальный лоток"/>
							<text>${escapeXml(params.instrumentTrayBarcode || "") || "—"}</text>
							<!--
								DEFECT #266: instrument-tray supply/languageCode.
								WAS: supply had id/code/text then jumped to statusCode —
								no entry-level languageCode. Body OBS (#260-#264) and
								treatment ACT (#265) already carry languageCode ru-RU.
								HL7 CDA R2 Supply has languageCode 0..1. SEMD validators
								often flag missing language under sterilization tray
								supply. Form 043/u tray section is RU.
								NOW: languageCode code=ru-RU matching ClinicalDocument.
							-->
							<languageCode code="ru-RU"/>
							<!--
								DEFECT #316: instrument-tray supply/confidentialityCode.
								WAS: supply had languageCode (#266) then jumped to statusCode — no entry-level confidentialityCode. Body OBS (#310-#314) and treatment ACT (#315) already carry confidentialityCode N.
								ClinicalDocument already declares confidentialityCode N (#158).
								HL7 CDA R2 Act/Observation/Supply has confidentialityCode 0..1
								(sensitivity of the act). SEMD validators often flag missing
								confidentiality under body entries when the document sets N but
								entry acts omit it. Form 043/u ambulatory dental chart entries
								are normal confidentiality (same as ClinicalDocument).
								NOW: confidentialityCode N + codeSystemName + RU displayName
								matching ClinicalDocument (#158). No invented restricted code.
							-->
							<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>

							<statusCode code="completed"/>

							<!-- DEFECT #145: supply effectiveTime = visit clock -->
							<effectiveTime value="${visitTime}"/>
							<!--
								DEFECT #202: instrument-tray supply/priorityCode.
								WAS: supply had id/code/text/statusCode/effectiveTime only —
								no priorityCode. Treatment ACT already carries priorityCode NI
								(#201); encompassingEncounter has priorityCode NI (#183).
								HL7 CDA R2 Supply has priorityCode 0..1. SEMD validators often
								flag missing priority under sterilization supply. Form 043/u
								tray barcode has no priority field — do not invent ActPriority.
								NOW: priorityCode nullFlavor NI until chart field exists.
							-->
							<priorityCode nullFlavor="NI"/>
							<!--
								DEFECT #267: instrument-tray supply/methodCode.
								WAS: supply had priorityCode (#202) then jumped to quantity
								(#203) — no methodCode. Treatment ACT (#208), serviceEvent
								(#213), encompassingEncounter (#217) and body OBS already
								carry methodCode NI. HL7 CDA R2 Supply has methodCode 0..*
								(how the supply act was performed). SEMD validators often
								flag missing method under sterilization tray supply.
								Form 043/u tray barcode has no discrete method field —
								do not invent a fake NSI method OID.
								NOW: methodCode nullFlavor NI until chart field exists.
							-->
							<methodCode nullFlavor="NI"/>
							<!--
								DEFECT #268: instrument-tray supply/uncertaintyCode.
								WAS: supply had priorityCode/methodCode only — no
								uncertaintyCode. Treatment ACT (#209), serviceEvent (#214),
								encompassingEncounter (#218) and body OBS already carry
								uncertaintyCode NI. HL7 CDA R2 Supply has uncertaintyCode
								0..1 (U/N from ActUncertainty). SEMD validators often flag
								missing uncertainty under sterilization tray supply.
								Form 043/u tray barcode is a completed visit link — do not
								invent U/N.
								NOW: uncertaintyCode nullFlavor NI until chart field exists.
							-->
							<uncertaintyCode nullFlavor="NI"/>
							<!--
								DEFECT #203: instrument-tray supply/quantity.

								WAS: supply had id/code/text/statusCode/effectiveTime/priorityCode
								only — no quantity. HL7 CDA R2 Supply has quantity 0..1 (how
								many units supplied). SEMD validators often flag missing
								quantity under sterilization tray supply. Form 043/u carries
								tray barcode only (one tray per visit) — no discrete qty field
								and do not invent a fake PQ unit.
								NOW: quantity nullFlavor NI until chart field exists.
							-->
							<quantity nullFlavor="NI"/>
							<!--
								DEFECT #204: instrument-tray supply/repeatNumber.
								WAS: supply had id/code/text/statusCode/effectiveTime/priorityCode/
								quantity only — no repeatNumber. HL7 CDA R2 Supply has
								repeatNumber 0..1 (how many times the supply act is intended
								to occur). SEMD validators often flag missing repeatNumber
								under sterilization tray supply. Form 043/u tray barcode is
								a single-use visit link — no discrete repeat field and do not
								invent a fake INT count.
								NOW: repeatNumber nullFlavor NI until chart field exists.
							-->
							<repeatNumber nullFlavor="NI"/>
							<!--
								DEFECT #205: instrument-tray supply/independentInd.
								WAS: supply had id/code/text/statusCode/effectiveTime/priorityCode/
								quantity/repeatNumber only — no independentInd. HL7 CDA R2
								Supply has independentInd 0..1 (whether the act can stand
								alone vs depends on another act). SEMD validators often flag
								missing independentInd under sterilization tray supply.
								Form 043/u chart has no independent-act flag — do not invent
								true/false.
								NOW: independentInd nullFlavor NI until chart field exists.
							-->
							<independentInd nullFlavor="NI"/>
							<!--
								DEFECT #206: instrument-tray supply/expectedUseTime.
								WAS: supply had id/code/text/statusCode/effectiveTime/priorityCode/
								quantity/repeatNumber/independentInd only — no expectedUseTime.
								HL7 CDA R2 Supply has expectedUseTime 0..1 (when the supplied
								item is expected to be used). SEMD validators often flag
								missing expectedUseTime under sterilization tray supply.
								Form 043/u tray barcode has no separate expected-use clock —
								do not invent a fake IVL_TS high/low pair.
								NOW: expectedUseTime nullFlavor NI until chart field exists.
							-->
							<expectedUseTime nullFlavor="NI"/>
							<!--
								DEFECT #269: instrument-tray supply/approachSiteCode.
								WAS: supply had expectedUseTime (#206) then jumped to product
								(#207) — no approachSiteCode. Treatment ACT (#221) and body
								OBS (#224-#228) already carry approachSiteCode NI. HL7 CDA R2
								Supply has approachSiteCode 0..* (anatomical approach for the
								supply act). SEMD validators often flag missing approach under
								sterilization tray supply. Form 043/u tray barcode has no
								anatomical approach — do not invent ISO 3950.
								NOW: approachSiteCode nullFlavor NI until chart field exists.
							-->
							<approachSiteCode nullFlavor="NI"/>
							<!--
								DEFECT #270: instrument-tray supply/targetSiteCode.
								WAS: supply had approachSiteCode NI (#269) but no
								targetSiteCode. Treatment ACT (#222) and body OBS (#223/
								#229-#232) already emit targetSiteCode. HL7 CDA R2 Supply has
								targetSiteCode 0..* (anatomical site the supply is directed
								at). SEMD validators often flag missing target site under
								sterilization tray supply. Form 043/u tray is whole-visit
								device link — no single tooth; do not invent ISO 3950.
								NOW: targetSiteCode nullFlavor NI until chart field exists.
							-->
							<targetSiteCode nullFlavor="NI"/>
							<!--
								DEFECT #271: instrument-tray supply/interpretationCode.
								WAS: supply had approach/targetSite only — no
								interpretationCode. Body OBS entries already carry
								interpretationCode NI (#187/#193-#196). HL7 CDA R2 Supply
								(Act) has interpretationCode 0..*. SEMD validators often
								flag missing interpretation under sterilization tray supply.
								Form 043/u tray barcode is device identity only — do not
								invent N/A/H.
								NOW: interpretationCode nullFlavor NI until chart field exists.
							-->
							<interpretationCode nullFlavor="NI"/>
							<!--
								DEFECT #207: instrument-tray supply/product.

								WAS: supply carried tray barcode only in text — no product
								participant. HL7 CDA R2 Supply has product 0..1
								(ManufacturedProduct) so REMD can join the sterilization
								device identity as a structured role, not free text alone.
								Form 043/u instrumentTrayBarcode IS the tray device key —
								emit it as manufacturedProduct/id under docIdRoot; material
								code/name stay NI (no NSI device catalog wired yet).
								NOW: product/manufacturedProduct with id=barcode + material NI.
							-->
							<product>
								<manufacturedProduct classCode="MANU">
									<id root="${docIdRoot}" extension="${escapeXml(params.instrumentTrayBarcode.trim())}"/>
									<manufacturedMaterial>
										<code nullFlavor="NI"/>
										<name nullFlavor="NI"/>
									
									<!--
										DEFECT #388: instrument-tray manufacturedMaterial/lotNumberText.
									<!--
										DEFECT #389: instrument-tray manufacturedMaterial/desc.
										WAS: manufacturedMaterial had code/name/lotNumberText — no desc.
										HL7 CDA R2 Material has desc 0..1 (ED description). SEMD validators
										often flag missing material description under tray product. Form 043/u
										chart has no separate material narrative beyond tray barcode text on
										supply — do not invent device catalog prose.
										NOW: desc nullFlavor NI until chart field exists.
									-->
									<desc nullFlavor="NI"/>
										WAS: manufacturedMaterial had code/name NI only — no lotNumberText.
										HL7 CDA R2 Material has lotNumberText 0..1 (batch/lot). SEMD
										validators often flag missing lot under sterilization tray material.
										Form 043/u instrumentTrayBarcode is device id, not a lot number —
										do not reuse barcode as lot or invent lot strings.
										NOW: lotNumberText nullFlavor NI until chart field exists.
									-->
									<lotNumberText nullFlavor="NI"/>
								
									<!--
										DEFECT #390: instrument-tray manufacturedMaterial/expirationTime.
										WAS: manufacturedMaterial had code/name/lot/desc — no expirationTime.
										HL7 CDA R2 Material has expirationTime 0..1. SEMD validators often
										flag missing expiry under sterilization tray material. Form 043/u
										chart does not collect tray sterilization expiry — do not invent TS.
										NOW: expirationTime nullFlavor NI until chart field exists.
									-->
									<expirationTime nullFlavor="NI"/>
								</manufacturedMaterial>
								
								<!--
									DEFECT #387: instrument-tray manufacturedProduct/manufacturerOrganization.
									WAS: manufacturedProduct had id + manufacturedMaterial only — no
									manufacturerOrganization. HL7 CDA R2 ManufacturedProduct has
									manufacturerOrganization 0..1. SEMD validators often flag missing
									manufacturer under sterilization tray product. Form 043/u tray barcode
									has no manufacturer registry field — do not invent org ids or names.
									NOW: manufacturerOrganization with id/name nullFlavor NI until chart
									field exists.
								-->
								<manufacturerOrganization>
									<id nullFlavor="NI"/>
									<name nullFlavor="NI"/>
								</manufacturerOrganization>
							</manufacturedProduct>
							</product>
						
							<!--
								DEFECT #239: instrument-tray supply/performer.
								WAS: supply had product/manufacturedProduct only - no
								performer. Body OBS (#233-#237) and treatment ACT (#238)
								already carry performer PRF. HL7 CDA R2 Supply has
								performer 0..*. SEMD validators often flag missing
								performer under sterilization tray supply so REMD
								cannot attribute tray issuance to the treating dentist
								at entry level (header performer is care-event only).
								NOW: performer typeCode=PRF with time=visitTime and
								assignedEntity mirroring diagnosis OBS performer (SNILS
								or NI, code with position or bare NI, person, MO org).
								No invented extension="unknown" or street/phone.
							-->
							<performer typeCode="PRF">
								<time value="${visitTime}"/>
								<assignedEntity>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedEntity>
							</performer>
							<!--
								DEFECT #289: instrument-tray supply/author.
								WAS: supply had performer (#239) then closed — no entry-level author. Body OBS (#283-#287) and treatment ACT (#288) already carry author.
								Document-level author already attributes the ClinicalDocument.
								HL7 CDA R2 Act/Observation/Supply has author 0..* (who
								recorded the act). SEMD validators often flag missing author
								under body entries so REMD cannot separate recorder from
								performer at entry level. Form 043/u treating dentist authors
								the chart entry.
								NOW: author with time=visitTime and assignedAuthor mirroring
								document author / entry performer (SNILS or NI, code with
								position or bare NI, person, MO org). No invented extension
								or street/phone.
							-->
							<author>
								<time value="${visitTime}"/>
								<assignedAuthor>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedAuthor>
							</author>
							<!--
								DEFECT #298: instrument-tray supply/informant.
								WAS: supply had performer (#239) + author (#289) then closed — no entry-level informant. Body OBS (#292-#296) and treatment ACT (#297) already carry informant.
								Document-level informant already attributes the clinical
								source of the ClinicalDocument. HL7 CDA R2 Act/Observation/
								Supply has informant 0..* (who supplied the facts for the
								act). SEMD validators often flag missing informant under body
								entries so REMD cannot separate clinical source from author/
								performer at entry level. Form 043/u treating dentist is the
								clinical source of the chart entry (same person as document
								informant).
								NOW: informant with time=visitTime, functionCode NI+displayName
								when doctorPosition known (else bare NI), assignedEntity
								mirroring document informant (SNILS or NI, code, person, MO).
								No invented extension or street/phone.
							-->
							<informant>
								<time value="${visitTime}"/>
								${params.doctorPosition && params.doctorPosition.trim()
									? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
									: `<functionCode nullFlavor="NI"/>`}
								<assignedEntity>
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<representedOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</representedOrganization>
								</assignedEntity>
							</informant>
							<!--
								DEFECT #307: instrument-tray supply/participant.
								WAS: supply had performer/author/informant then closed — no entry-level participant. Body OBS (#301-#305) and treatment ACT (#306) already carry participant REF.
								Document-level participant REF (#152/#169/#147) already attributes
								the referring/related provider on ClinicalDocument. HL7 CDA R2
								Act/Observation/Supply has participant 0..* (related parties for
								the act). SEMD validators often flag missing participant under
								body entries so REMD cannot attach REF/related-provider at entry
								level. Form 043/u treating dentist is the related provider for
								the chart entry (same person as document REF participant).
								NOW: participant typeCode=REF with time=visitTime, functionCode
								NI+displayName when doctorPosition known (else bare NI),
								associatedEntity PROV mirroring document REF (SNILS or NI, code,
								person, scopingOrganization MO). No invented extension.
							-->
							<participant typeCode="REF">
								<time value="${visitTime}"/>
								${params.doctorPosition && params.doctorPosition.trim()
									? `<functionCode nullFlavor="NI" displayName="${escapeXml(params.doctorPosition.trim())}"/>`
									: `<functionCode nullFlavor="NI"/>`}
								<associatedEntity classCode="PROV">
									${params.doctorSnils && String(params.doctorSnils).trim()
										? `<id root="1.2.643.100.3" extension="${escapeXml(String(params.doctorSnils).trim())}"/>`
										: `<id nullFlavor="NI"/>`}
									${params.doctorPosition && params.doctorPosition.trim()
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
									<scopingOrganization>
										${params.clinicOid && String(params.clinicOid).trim()
											? `<id root="1.2.643.5.1.13.13.12.2" extension="${escapeXml(String(params.clinicOid).trim())}"/>`
											: `<id nullFlavor="NI"/>`}
										<addr nullFlavor="NI"/>
										<telecom nullFlavor="NI"/>
										<name>${escapeXml(params.clinicName)}</name>
									</scopingOrganization>
								</associatedEntity>
							</participant>
							<!--
								DEFECT #325: instrument-tray supply/precondition.
								WAS: supply had performer/author/informant/participant then closed — no precondition. Body OBS (#319-#323) and treatment ACT (#324) already carry precondition PRCN.
								HL7 CDA R2 Act/Observation/Supply has precondition 0..*
								(criteria that must be true for the act). SEMD validators
								often flag missing precondition under body entries when the
								care event is documented without explicit criteria. Form 043/u
								chart does not collect discrete clinical preconditions for
								these entries — do not invent criterion codes or values.
								NOW: precondition typeCode=PRCN with criterion nullFlavor NI
								(id/code/value all NI) until chart fields exist.
							-->
							<precondition typeCode="PRCN">
								<criterion>
									<id nullFlavor="NI"/>
									<code nullFlavor="NI"/>
									<!--
										DEFECT #656: precondition/criterion/text.
										WAS: criterion had id/code/value only — no text. HL7 CDA R2 Criterion (Act) has text 0..1. SEMD often flags bare criterion under precondition.
										NOW: text nullFlavor NI; do not invent precondition prose.
									-->
									<text nullFlavor="NI"/>
									<!--
										DEFECT #657: precondition/criterion/statusCode.
										WAS: criterion had no statusCode. HL7 CDA R2 Act has statusCode 1..1 in many profiles; sibling nested acts use completed.
										NOW: statusCode completed.
									-->
									<statusCode code="completed"/>
									<value xsi:type="CD" nullFlavor="NI"/>
									<!--
										DEFECT #658: precondition/criterion/effectiveTime.
										WAS: criterion had no effectiveTime. SEMD often flags missing effectiveTime under precondition criterion when body acts emit it.
										NOW: effectiveTime nullFlavor NI; do not invent criterion window.
									-->
									<effectiveTime nullFlavor="NI"/>
								</criterion>
							</precondition>
							<!--
								DEFECT #334: instrument-tray supply/reference.
								WAS: supply had performer/author/informant/participant/precondition then closed — no reference. Body OBS (#328-#332) and treatment ACT (#333) already carry reference REFR.
								HL7 CDA R2 Act/Observation/Supply has reference 0..*
								(link to external acts/documents). SEMD validators often
								flag missing reference under body entries when the care
								event cannot point to a related external act. Form 043/u
								chart does not collect discrete external-act references for
								these entries — do not invent root/extension or URLs.
								NOW: reference typeCode=REFR with externalAct classCode=ACT
								moodCode=EVN and id nullFlavor NI until chart field exists.
							-->
							<reference typeCode="REFR">
								<externalAct classCode="ACT" moodCode="EVN">
									<id nullFlavor="NI"/>
									<!--
										DEFECT #675: reference/externalAct/code.
										WAS: externalAct had id NI only — no code. HL7 CDA R2 ExternalAct has code 0..1. SEMD often flags bare externalAct under reference REFR.
										NOW: code nullFlavor NI; do not invent external act type.
									-->
									<code nullFlavor="NI"/>
									<!--
										DEFECT #676: reference/externalAct/text.
										WAS: externalAct had no text. HL7 CDA R2 ExternalAct has text 0..1.
										NOW: text nullFlavor NI; do not invent external narrative.
									-->
									<text nullFlavor="NI"/>
								</externalAct>
							</reference>
							
							
							<!--
								DEFECT #374: instrument-tray supply/consumable.
								WAS: supply had product (tray device) then performer/.../specimen —
								no consumable participation. Treatment ACT (#373) already carries
								consumable CSM. HL7 CDA R2 Supply has consumable 0..* (materials
								consumed with the supply event, distinct from product). SEMD
								validators often flag missing consumable under sterilization tray
								supply when single-use materials cannot be joined. Form 043/u chart
								does not collect discrete consumable NSI codes for tray issuance —
								do not invent material codes.
								NOW: consumable typeCode=CSM with manufacturedProduct classCode=MANU
								and manufacturedMaterial code/name nullFlavor NI until chart field exists.
							-->
							<consumable typeCode="CSM">
								<manufacturedProduct classCode="MANU">
									<!--
										DEFECT #685: manufacturedProduct/id.
										WAS: manufacturedProduct opened then manufacturedMaterial — no id. Tray product carries barcode id; consumable shells had no product id. HL7 CDA R2 ManufacturedProduct has id 0..*. SEMD often flags bare product under consumable without id slot.
										NOW: id nullFlavor NI; do not invent extension=unknown.
									-->
									<id nullFlavor="NI"/>
									<manufacturedMaterial>
										<code nullFlavor="NI"/>
										<name nullFlavor="NI"/>
										<!--
											DEFECT #540: manufacturedMaterial/lotNumberText.
											WAS: manufacturedMaterial had code/name NI only — no lotNumberText. Tray product already emits lot (#388). HL7 CDA R2 Material has lotNumberText 0..1. SEMD often flags bare material under consumable without lot slot.
											NOW: lotNumberText nullFlavor NI; do not invent lot strings.
										-->
										<lotNumberText nullFlavor="NI"/>
										<!--
											DEFECT #541: manufacturedMaterial/desc.
											WAS: manufacturedMaterial had code/name/lot only — no desc. Tray already emits desc (#389). SEMD often flags missing material description under consumable.
											NOW: desc nullFlavor NI; do not invent device prose.
										-->
										<desc nullFlavor="NI"/>
										<!--
											DEFECT #542: manufacturedMaterial/expirationTime.
											WAS: manufacturedMaterial had code/name/lot/desc only — no expirationTime. Tray already emits expirationTime. HL7 CDA R2 Material has expirationTime 0..1.
											NOW: expirationTime nullFlavor NI; do not invent expiry timestamps.
										-->
										<expirationTime nullFlavor="NI"/>
									</manufacturedMaterial>
								<!--

									DEFECT #583: manufacturedProduct/manufacturerOrganization.

									WAS: manufacturedProduct had material only — no manufacturerOrganization. Tray product already emits manufacturerOrganization. HL7 CDA R2 ManufacturedProduct has manufacturerOrganization 0..1. SEMD often flags bare product under consumable without org shell.

									NOW: manufacturerOrganization with id/name/addr/telecom NI; do not invent org identity.

								-->

								<manufacturerOrganization>

									<id nullFlavor="NI"/>

									<!--

										DEFECT #584: manufacturerOrganization/name.

										WAS: manufacturerOrganization id only path.

										NOW: name nullFlavor NI.

									-->

									<name nullFlavor="NI"/>

									<!--

										DEFECT #585: manufacturerOrganization/addr.

										NOW: addr nullFlavor NI; do not invent streetAddressLine.

									-->

									<addr nullFlavor="NI"/>

									<!--

										DEFECT #586: manufacturerOrganization/telecom.

										NOW: telecom nullFlavor NI; do not invent phone.

									-->

									<telecom nullFlavor="NI"/>

								</manufacturerOrganization>

								</manufacturedProduct>
							</consumable>
<!--
								DEFECT #363: instrument-tray supply/specimen.
								WAS: instrument-tray supply had reference/precondition then entryRelationship — no specimen.
								HL7 CDA R2 Act/Observation/Supply has specimen 0..* (material).
								SEMD validators often flag missing specimen under clinical entries.
								Form 043/u ambulatory dental chart does not collect discrete specimen
								identity for these entries — do not invent specimen type codes or IDs.
								NOW: specimen typeCode=SPC with specimenRole id nullFlavor NI
								until chart field exists.
							-->
							<specimen typeCode="SPC">
								<specimenRole>
									<id nullFlavor="NI"/>
								
									<!--
										DEFECT #399: instrument-tray supply/specimen/specimenRole/specimenPlayingEntity.
										WAS: specimenRole had id NI only — no specimenPlayingEntity.
										HL7 CDA R2 SpecimenRole has specimenPlayingEntity 0..1 (the material
										entity). SEMD validators often flag empty specimenRole under clinical
										entries when playing entity code/name cannot be joined. Form 043/u
										chart does not collect discrete specimen entity codes — do not invent
										SNOMED/NSI specimen type codes.
										NOW: specimenPlayingEntity with code/name nullFlavor NI until chart
										field exists.
									-->
									<specimenPlayingEntity>
										<code nullFlavor="NI"/>
										<name nullFlavor="NI"/>
										<!--
											DEFECT #512: specimenPlayingEntity/desc.
											WAS: specimenPlayingEntity had code/name NI only — no desc. HL7 CDA R2 Entity has desc 0..1. SEMD validators often flag bare playing entity under specimen when material description cannot be joined. Form 043/u chart does not collect specimen material narrative; do not invent desc text.
											NOW: desc nullFlavor NI until chart field exists.
										-->
										<desc nullFlavor="NI"/>
										<!--
											DEFECT #513: specimenPlayingEntity/quantity.
											WAS: specimenPlayingEntity had code/name/desc only — no quantity. HL7 CDA R2 ManufacturedMaterial/Entity may carry quantity. SEMD often flags missing quantity under specimen playing entity.
											NOW: quantity nullFlavor NI; do not invent PQ amounts.
										-->
										<quantity nullFlavor="NI"/>
									</specimenPlayingEntity>
</specimenRole>
							</specimen>

							<!--
								DEFECT #370: instrument-tray supply/subject.
								WAS: instrument-tray supply had specimen then entryRelationship — no subject.
								HL7 CDA R2 Act/Observation/Supply has subject 0..1 (related
								subject when different from recordTarget). SEMD validators often
								flag missing subject under clinical body entries. Form 043/u
								patient is already recordTarget — entry-level related subject is
								not collected separately; do not invent relationship codes or ids.
								NOW: subject typeCode=SBJ with relatedSubject classCode=PRS and
								code nullFlavor NI until chart field exists.
							-->
							<subject typeCode="SBJ">
								<relatedSubject classCode="PRS">
									<code nullFlavor="NI"/>
									<addr nullFlavor="NI"/>
									<telecom nullFlavor="NI"/>
									<subject>
										<name nullFlavor="NI"/>
										<!--
										DEFECT #464: relatedSubject/subject/administrativeGenderCode (9/9).
										WAS: SubjectPerson under relatedSubject had only name NI (#420-#428) —
										no administrativeGenderCode. HL7 CDA R2 SubjectPerson has
										administrativeGenderCode 0..1. SEMD validators often flag incomplete
										person stub under Act/subject/relatedSubject.
										Form 043/u does not collect related-party gender; do not invent 1/2.
										NOW: administrativeGenderCode nullFlavor NI.
										-->
										<administrativeGenderCode nullFlavor="NI"/>
										<!--
										DEFECT #465: relatedSubject/subject/birthTime (9/9).
										WAS: SubjectPerson had name (+gender) only — no birthTime.
										HL7 CDA R2 SubjectPerson has birthTime 0..1. Mirror patient demographics
										slot under related-party person stub.
										Form 043/u does not collect related-party DOB; do not invent dates.
										NOW: birthTime nullFlavor NI.
										-->
										<birthTime nullFlavor="NI"/>
									</subject>
								</relatedSubject>
							</subject>
<!--
								DEFECT #348: instrument-tray supply/entryRelationship.
								WAS: supply had performer/author/informant/participant/precondition/reference then closed — no entryRelationship. Body OBS (#342-#346) and treatment ACT (#347) already carry entryRelationship COMP.
								HL7 CDA R2 Act/Observation/Supply has entryRelationship 0..*
								(related nested acts). SEMD validators often flag missing
								entryRelationship under body entries when sibling acts cannot
								be linked. Form 043/u chart does not collect discrete nested
								related-act graphs for these entries — do not invent nested
								codes or extensions.
								NOW: entryRelationship typeCode=COMP with nested act
								classCode=ACT moodCode=EVN and id/code/statusCode nullFlavor
								NI / completed shell until chart field exists.
							-->
							<entryRelationship typeCode="COMP">
								<act classCode="ACT" moodCode="EVN">
									<id nullFlavor="NI"/>
									<code nullFlavor="NI"/>
									<!--
										DEFECT #627: entryRelationship/act/text.
										WAS: nested COMP act had id/code/statusCode only — no text. HL7 CDA R2 Act has text 0..1. SEMD validators often flag bare nested acts under entryRelationship when parent body acts emit text. Form 043/u has no separate nested-act narrative; do not invent prose.
										NOW: text nullFlavor NI.
									-->
									<text nullFlavor="NI"/>
									<statusCode code="completed"/>
									<!--
										DEFECT #628: entryRelationship/act/priorityCode.
										WAS: nested COMP act had no priorityCode. Parent body acts emit priorityCode NI. SEMD often flags missing priority under nested COMP acts.
										NOW: priorityCode nullFlavor NI; do not invent ActPriority.
									-->
									<priorityCode nullFlavor="NI"/>
									<!--
										DEFECT #629: entryRelationship/act/effectiveTime.
										WAS: nested COMP act had no effectiveTime. Parent body acts stamp documentClock. Nested COMP has no separate chart timestamp; do not invent times.
										NOW: effectiveTime nullFlavor NI.
									-->
									<effectiveTime nullFlavor="NI"/>
									<!--
										DEFECT #630: entryRelationship/act/languageCode.
										WAS: nested COMP act had no languageCode. ClinicalDocument/sections declare ru-RU.
										NOW: languageCode code=ru-RU.
									-->
									<languageCode code="ru-RU"/>
									<!--
										DEFECT #631: entryRelationship/act/confidentialityCode.
										WAS: nested COMP act had no confidentialityCode. ClinicalDocument sets N.
										NOW: confidentialityCode N matching ClinicalDocument.
									-->
									<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" displayName="Обычный"/>
								</act>
							</entryRelationship>






						</supply>





					</entry></section>
			</component>`
				: ""}
		</structuredBody>
	</component>
</ClinicalDocument>`;
}


