/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD CDA R2 XML BUILDER & FNS TAX DEDUCTION (КНД 1151156) ENGINE
 * Russian Ministry of Health (ЕГИСЗ РЭМД / 043/у) & Federal Tax Service (ФНС)
 * Compliant with HL7 CDA R2, Order 804n, Order ED-7-11/755@, and Federal Law 63-FZ
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	DENTAL_TOOTH_STATUS_DICTIONARY,
	EGISZ_DENTAL_SEMD_TYPES,
	EGISZ_REMD_OIDS,
	type EgiszDentalSemdCode,
	FRMR_DOCTOR_POSITIONS,
	validateOidFormat,
	validateRussianInn,
	validateRussianOgrn,
	validateRussianSnils,
} from "./remdXml/egiszRemdPresets";

/**
 * Escapes characters for safe inclusion in XML elements and attributes.
 */
export function escapeXml(value: string | number | undefined | null): string {
	if (value === undefined || value === null) return "";
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * Formats date/time to HL7 CDA R2 TS format:
 * - Date only (birthTime): YYYYMMDD
 * - Date with Time & Timezone offset (effectiveTime): YYYYMMDDHHMMSS+ZZZZ
 */
export function formatHl7DateTime(
	dateInput: Date | string | number | undefined,
	includeTime = true
): string {
	const d =
		dateInput instanceof Date
			? dateInput
			: dateInput
			? new Date(dateInput)
			: new Date();
	const validDate = Number.isNaN(d.getTime()) ? new Date() : d;

	const pad = (n: number) => n.toString().padStart(2, "0");
	const yyyy = validDate.getFullYear().toString();
	const MM = pad(validDate.getMonth() + 1);
	const dd = pad(validDate.getDate());
	if (!includeTime) return `${yyyy}${MM}${dd}`;

	const HH = pad(validDate.getHours());
	const mm = pad(validDate.getMinutes());
	const ss = pad(validDate.getSeconds());

	const offsetMinutes = -validDate.getTimezoneOffset();
	const sign = offsetMinutes >= 0 ? "+" : "-";
	const absOffset = Math.abs(offsetMinutes);
	const offsetHours = pad(Math.floor(absOffset / 60));
	const offsetMins = pad(absOffset % 60);
	const tzStr = `${sign}${offsetHours}${offsetMins}`;

	return `${yyyy}${MM}${dd}${HH}${mm}${ss}${tzStr}`;
}

/**
 * Formats date into Russian readable DD.MM.YYYY format.
 */
export function formatRuDate(dateInput: Date | string | undefined): string {
	if (!dateInput) return "";
	const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
	if (Number.isNaN(d.getTime())) return String(dateInput);
	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/**
 * Converts integer kopecks to rubles formatted string "12500.00".
 */
export function formatKopecksToRubles(kopecks: number): string {
	const safeKopecks = Math.max(0, Math.round(Number(kopecks) || 0));
	const rubles = Math.floor(safeKopecks / 100);
	const kops = safeKopecks % 100;
	return `${rubles}.${kops.toString().padStart(2, "0")}`;
}

/**
 * Parses rubles string or number ("12500.50" or 12500.5) to integer kopecks (1250050).
 */
export function parseRublesToKopecks(rublesInput: string | number): number {
	if (typeof rublesInput === "number") {
		return Math.round(rublesInput * 100);
	}
	const clean = String(rublesInput || "").trim().replace(",", ".");
	const parsed = Number.parseFloat(clean);
	if (Number.isNaN(parsed) || parsed < 0) return 0;
	return Math.round(parsed * 100);
}

/**
 * Canonicalizes XML string to deterministic UTF-8 C14N subset before hashing & signing.
 */
export function canonicalizeCdaXml(xml: string): string {
	if (!xml || typeof xml !== "string") return "";
	return xml
		.replace(/^\uFEFF/, "") // Strip BOM
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.trim();
}

/* ═══════════════════════════════════════════════════════════════════════════
 * INTERFACES & SCHEMAS
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface EgiszClinicInfo {
	clinicName: string;
	clinicOid: string;
	clinicOgrn: string;
	clinicInn: string;
	clinicKpp?: string | undefined;
	clinicAddress: string;
	clinicPhone: string;
	clinicEmail?: string | undefined;
	chiefDoctorName?: string | undefined;
	chiefDoctorSnils?: string | undefined;
}

export interface EgiszDoctorInfo {
	doctorFullName: string;
	doctorSnils: string;
	doctorPosition: string;
	doctorPositionCode: string;
	doctorPhone?: string | undefined;
	doctorEmail?: string | undefined;
}

export interface EgiszPatientInfo {
	patientId: string;
	cardNumber: string;
	patientFullName: string;
	patientSnils?: string | undefined;
	patientBirthDate: string;
	patientGender: "male" | "female" | "other" | string;
	patientPolisOms?: string | undefined;
	patientPassport?: string | undefined;
	patientAddress?: string | undefined;
	patientPhone?: string | undefined;
	patientEmail?: string | undefined;
}

export interface EgiszProcedureItem {
	code: string;
	name: string;
	tooth?: number | string | undefined;
	surfaces?: string[] | undefined;
	quantity?: number | undefined;
	completedAt?: string | Date | undefined;
}

export interface EgiszDiagnosisItem {
	icd10Code: string;
	icd10Name: string;
	isPrimary: boolean;
	tooth?: number | string | undefined;
	surfaces?: string[] | undefined;
	clinicalDescription?: string | undefined;
}

export interface GostSignatureInfo {
	signatureBase64: string;
	certificateSerialNumber: string;
	certificateSubject: string;
	certificateIssuer?: string | undefined;
	validFrom?: string | undefined;
	validTo?: string | undefined;
	signedAt: string;
	algorithmOid: string;
	digestAlgorithmOid: string;
	signatureValueHex?: string | undefined;
}

export interface EgiszDentalCdaPayload {
	docTypeCode: EgiszDentalSemdCode | "105" | "302" | "303" | "108" | "101" | "104" | "130";
	documentUuid?: string | undefined;
	documentVersion?: number | undefined;
	encounterDate?: string | Date | undefined;
	clinic: EgiszClinicInfo;
	doctor: EgiszDoctorInfo;
	patient: EgiszPatientInfo;
	complaints: string;
	anamnesisMorbi?: string | undefined;
	anamnesisVitae?: string | undefined;
	toothStates: Record<number, string>;
	toothSurfaces?: Record<number, string[]> | undefined;
	diagnoses: EgiszDiagnosisItem[];
	procedures: EgiszProcedureItem[];
	treatmentProtocolDescription?: string | undefined;
	recommendations: string;
	nextVisitDate?: string | Date | undefined;
	chiefDoctorSignature?: boolean | undefined;
	doctorSignature?: GostSignatureInfo | undefined;
	moSignature?: GostSignatureInfo | undefined;
}

/**
 * FNS Tax Deduction Certificate (КНД 1151156 / Приказ ФНС № ЕД-7-11/755@) Payload
 */
export interface FnsTaxPaymentItem {
	id?: string | undefined;
	date: string | Date;
	serviceCode: "1" | "2"; // 1 - Обычные медицинские услуги, 2 - Дорогостоящее лечение
	serviceDescription?: string | undefined;
	amountKopecks: number; // Целочисленные копейки
}

export interface FnsTaxCertificatePayload {
	documentNumber: string;
	documentDate: string | Date;
	taxYear: number;
	clinic: {
		name: string;
		inn: string;
		kpp?: string | undefined;
		ogrn: string;
		phone?: string | undefined;
		email?: string | undefined;
	};
	taxpayer: {
		fullName: string;
		inn?: string | undefined;
		snils?: string | undefined;
		birthDate?: string | undefined;
		docTypeCode?: string | undefined; // 21 - Паспорт РФ
		docSeriesNumber?: string | undefined;
	};
	patient: {
		fullName: string;
		snils?: string | undefined;
		birthDate?: string | undefined;
		/**
		 * Степень родства по Приказу ЕД-7-11/755@:
		 * 1 - Сам налогоплательщик
		 * 2 - Супруг (супруга)
		 * 3 - Родитель
		 * 4 - Ребенок (включая усыновленного/подопечного до 18/24 лет)
		 */
		relationshipCode: "1" | "2" | "3" | "4";
		relationshipName?: string | undefined;
	};
	payments: FnsTaxPaymentItem[];
	signer: {
		fullName: string;
		position: string;
		snils?: string | undefined;
	};
	doctorSignature?: GostSignatureInfo | undefined;
	moSignature?: GostSignatureInfo | undefined;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 1. DENTAL CDA R2 XML GENERATOR (СЭМД 105 / 302 / 303 / 043/У)
 * ═══════════════════════════════════════════════════════════════════════════ */

export function generateEgiszDentalCdaXml(payload: EgiszDentalCdaPayload): string {
	const docDef =
		EGISZ_DENTAL_SEMD_TYPES[payload.docTypeCode as EgiszDentalSemdCode] || {
			code: "105",
			nsiCode: "105",
			title: "Протокол консультации врача-стоматолога (ф. 043/у)",
			shortTitle: "Протокол консультации 105",
			description: "Первичный или повторный консультативный прием врача-стоматолога",
			loincCode: "74208-1",
			loincDisplayName: "Протокол стоматологического осмотра",
			templateRoot: "1.2.643.5.1.13.13.11.1527",
		};

	const now = new Date();
	const effectiveTime = formatHl7DateTime(now, true);
	const encounterDate = payload.encounterDate
		? new Date(payload.encounterDate)
		: now;
	const visitTime = formatHl7DateTime(encounterDate, true);
	const birthTime = formatHl7DateTime(payload.patient.patientBirthDate, false);

	const genderCode =
		payload.patient.patientGender === "male"
			? "1"
			: payload.patient.patientGender === "female"
			? "2"
			: "0";
	const genderLabel =
		genderCode === "1"
			? "Мужской"
			: genderCode === "2"
			? "Женский"
			: "Не указан";

	const docUuid =
		payload.documentUuid ||
		`DOC-043-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
	const clinicOid = payload.clinic.clinicOid || EGISZ_REMD_OIDS.FRMO_MO_ROOT;

	// Split Patient FIO
	const patParts = (payload.patient.patientFullName || "Пациент").trim().split(/\s+/);
	const patFamily = patParts[0] || "Пациент";
	const patGiven = patParts[1] || "";
	const patPatronymic = patParts[2] || "";

	// Split Doctor FIO
	const docParts = (payload.doctor.doctorFullName || "Врач").trim().split(/\s+/);
	const docFamily = docParts[0] || "Врач";
	const docGiven = docParts[1] || "";
	const docPatronymic = docParts[2] || "";

	const cleanDocSnils = payload.doctor.doctorSnils ? payload.doctor.doctorSnils.replace(/\D/g, "") : "";
	const cleanPatSnils = payload.patient.patientSnils ? payload.patient.patientSnils.replace(/\D/g, "") : "";

	// 1. Complaints
	const complaintsText = payload.complaints || "Жалобы отсутствуют (профилактический осмотр)";
	const complaintsSection = `
			<!-- Секция 1: Жалобы пациента (LOINC 10154-3) -->
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_COMPLAINTS}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Жалобы"/>
					<title>Жалобы пациента</title>
					<text>
						<paragraph>${escapeXml(complaintsText)}</paragraph>
					</text>
				</section>
			</component>`;

	// 2. Anamnesis
	const anamnesisMorbi = payload.anamnesisMorbi || "Развитие настоящего заболевания без особенностей.";
	const anamnesisVitae = payload.anamnesisVitae || "Аллергологический анамнез не отягощен, сопутствующие заболевания отрицает.";
	const anamnesisSection = `
			<!-- Секция 2: Анамнез заболевания и жизни (LOINC 10164-2) -->
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_ANAMNESIS}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Анамнез"/>
					<title>Анамнез заболевания и жизни</title>
					<text>
						<paragraph><strong>Анамнез заболевания:</strong> ${escapeXml(anamnesisMorbi)}</paragraph>
						<paragraph><strong>Анамнез жизни и соматический статус:</strong> ${escapeXml(anamnesisVitae)}</paragraph>
					</text>
				</section>
			</component>`;

	// 3. Tooth Formula / Odontogram (FDI ISO 3950)
	const toothStates = payload.toothStates || {};
	const toothSurfaces = payload.toothSurfaces || {};
	const sortedTeeth = Object.keys(toothStates)
		.map(Number)
		.filter((n) => !Number.isNaN(n))
		.sort((a, b) => a - b);

	let toothObservationsXml = "";
	let toothFormulaSummary = "";

	if (sortedTeeth.length > 0) {
		toothFormulaSummary = sortedTeeth
			.map((tNum) => {
				const rawStatus = toothStates[tNum] || "Healthy";
				const stObj = DENTAL_TOOTH_STATUS_DICTIONARY[rawStatus] || {
					labelRu: rawStatus,
					shortSymbol: "?",
					egiszCode: "0",
				};
				const surfs = toothSurfaces[tNum] || [];
				const surfsStr = surfs.length > 0 ? ` [${surfs.join("")}]` : "";
				return `Зуб ${tNum}: ${stObj.labelRu}${surfsStr}`;
			})
			.join("; ");

		toothObservationsXml = sortedTeeth
			.map((tNum) => {
				const rawStatus = toothStates[tNum] || "Healthy";
				const stObj = DENTAL_TOOTH_STATUS_DICTIONARY[rawStatus] || {
					labelRu: rawStatus,
					shortSymbol: "?",
					egiszCode: "0",
				};
				const surfs = toothSurfaces[tNum] || [];
				const surfsAttr = surfs.length > 0 ? ` surfaces="${surfs.join(",")}"` : "";

				return `\t\t\t\t\t<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="${EGISZ_REMD_OIDS.LOINC_DENTAL_ODONTOGRAM}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" displayName="Статус зуба ${tNum}"/>
							<statusCode code="completed"/>
							<value xsi:type="CD" code="${escapeXml(stObj.egiszCode)}" codeSystem="${EGISZ_REMD_OIDS.DENTAL_TOOTH}" displayName="${escapeXml(stObj.labelRu)}"${surfsAttr}/>
							<targetSiteCode code="${tNum}" codeSystem="${EGISZ_REMD_OIDS.DENTAL_TOOTH}" displayName="Зуб ${tNum}"/>
						</observation>
					</entry>`;
			})
			.join("\n");
	} else {
		toothFormulaSummary = "Зубная формула: интактный зубной ряд, видимых патологических изменений не выявлено.";
	}

	const dentalFormulaSection = `
			<!-- Секция 3: Зубная формула и статус полости рта (LOINC 74208-1 / FDI ISO 3950) -->
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_DENTAL_ODONTOGRAM}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Зубная формула и одонтограмма"/>
					<title>Зубная формула (FDI ISO 3950 / Форма 043/у)</title>
					<text>
						<paragraph>${escapeXml(toothFormulaSummary)}</paragraph>
					</text>
${toothObservationsXml}
				</section>
			</component>`;

	// 4. Diagnoses (ICD-10)
	const diagnosesList =
		payload.diagnoses && payload.diagnoses.length > 0
			? payload.diagnoses
			: [{ icd10Code: "Z01.2", icd10Name: "Стоматологическое обследование", isPrimary: true }];

	const diagnosesEntriesXml = diagnosesList
		.map((diag) => {
			return `\t\t\t\t\t<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="282291009" codeSystem="2.16.840.1.113883.6.96" displayName="${diag.isPrimary ? "Основной клинический диагноз" : "Сопутствующий диагноз"}"/>
							<statusCode code="completed"/>
							<value xsi:type="CD" code="${escapeXml(diag.icd10Code)}" codeSystem="${EGISZ_REMD_OIDS.ICD10}" codeSystemName="МКБ-10" displayName="${escapeXml(diag.icd10Name)}"/>
							${diag.tooth ? `<targetSiteCode code="${escapeXml(String(diag.tooth))}" codeSystem="${EGISZ_REMD_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(String(diag.tooth))}"/>` : ""}
						</observation>
					</entry>`;
		})
		.join("\n");

	const diagnosesSection = `
			<!-- Секция 4: Клинические диагнозы по МКБ-10 (LOINC 29548-5) -->
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_DIAGNOSIS_SECTION}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Диагнозы"/>
					<title>Клинический диагноз</title>
					<text>
						<list>
							${diagnosesList.map((d) => `<item>${d.isPrimary ? "<strong>[Основной]</strong> " : "[Сопутствующий] "}${escapeXml(d.icd10Code)} — ${escapeXml(d.icd10Name)}${d.tooth ? ` (зуб ${escapeXml(String(d.tooth))})` : ""}</item>`).join("\n\t\t\t\t\t\t\t")}
						</list>
					</text>
${diagnosesEntriesXml}
				</section>
			</component>`;

	// 5. Medical Services / Procedures (804n)
	const proceduresList =
		payload.procedures && payload.procedures.length > 0
			? payload.procedures
			: [
					{
						code: "B01.065.001",
						name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
					},
			  ];

	const proceduresEntriesXml = proceduresList
		.map((proc) => {
			return `\t\t\t\t\t<entry>
						<procedure classCode="PROC" moodCode="EVN">
							<code code="${escapeXml(proc.code)}" codeSystem="${EGISZ_REMD_OIDS.NOMENKLATURA_804N}" codeSystemName="Номенклатура медицинских услуг 804н" displayName="${escapeXml(proc.name)}"/>
							<statusCode code="completed"/>
							<effectiveTime value="${visitTime}"/>
							${proc.tooth ? `<targetSiteCode code="${escapeXml(String(proc.tooth))}" codeSystem="${EGISZ_REMD_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(String(proc.tooth))}"/>` : ""}
						</procedure>
					</entry>`;
		})
		.join("\n");

	const proceduresSection = `
			<!-- Секция 5: Оказанные медицинские услуги по Номенклатуре 804н (LOINC 47519-4) -->
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_SERVICES_RENDERED}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Проведенные процедуры и вмешательства"/>
					<title>Протокол стоматологического вмешательства и оказанные услуги</title>
					<text>
						${payload.treatmentProtocolDescription ? `<paragraph><strong>Описание вмешательства:</strong> ${escapeXml(payload.treatmentProtocolDescription)}</paragraph>` : ""}
						<list>
							${proceduresList.map((p) => `<item>${escapeXml(p.code)} — ${escapeXml(p.name)}${p.tooth ? ` (зуб ${escapeXml(String(p.tooth))})` : ""}</item>`).join("\n\t\t\t\t\t\t\t")}
						</list>
					</text>
${proceduresEntriesXml}
				</section>
			</component>`;

	// 6. Recommendations
	const recommendationsText = payload.recommendations || "Соблюдение индивидуальной гигиены полости рта, контрольный осмотр через 6 месяцев.";
	const nextVisitStr = payload.nextVisitDate ? ` Дата назначенного приема: ${formatRuDate(payload.nextVisitDate)}.` : "";
	const recommendationsSection = `
			<!-- Секция 6: Назначения и рекомендации (LOINC 18776-5) -->
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_RECOMMENDATIONS}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Рекомендации"/>
					<title>Рекомендации и план дальнейшего ведения</title>
					<text>
						<paragraph>${escapeXml(recommendationsText)}${escapeXml(nextVisitStr)}</paragraph>
					</text>
				</section>
			</component>`;

	// Full CDA R2 Document Assembly
	const rawXml = `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:identity="urn:hl7-ru:identity" xmlns:address="urn:hl7-ru:address" xmlns:fias="urn:hl7-ru:fias">
	<realmCode code="RU"/>
	<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
	<templateId root="${docDef.templateRoot}"/>
	<id root="${escapeXml(clinicOid)}.100.1.1" extension="${escapeXml(docUuid)}"/>
	<code code="${docDef.nsiCode}" codeSystem="${EGISZ_REMD_OIDS.NSI_SEMD_DOC_TYPES}" codeSystemName="Виды СЭМД ЕГИСЗ" displayName="${escapeXml(docDef.title)}"/>
	<title>${escapeXml(docDef.title)} (Форма 043/у)</title>
	<effectiveTime value="${effectiveTime}"/>
	<confidentialityCode code="N" codeSystem="${EGISZ_REMD_OIDS.CONFIDENTIALITY}" codeSystemName="HL7 Confidentiality" displayName="Обычный доступ"/>
	<languageCode code="ru-RU"/>
	<setId root="${escapeXml(clinicOid)}.100.1.2" extension="${escapeXml(payload.patient.cardNumber || docUuid)}"/>
	<versionNumber value="${payload.documentVersion || 1}"/>

	<!-- Субъект документа / Пациент -->
	<recordTarget>
		<patientRole>
			${cleanPatSnils ? `<id root="${EGISZ_REMD_OIDS.SNILS}" extension="${escapeXml(cleanPatSnils)}"/>` : ""}
			<id root="${escapeXml(clinicOid)}.100.2" extension="${escapeXml(payload.patient.cardNumber || payload.patient.patientId)}"/>
			${payload.patient.patientPolisOms ? `<id root="${EGISZ_REMD_OIDS.POLIS_OMS}" extension="${escapeXml(payload.patient.patientPolisOms.replace(/\s+/g, ""))}"/>` : ""}
			${payload.patient.patientPassport ? `<id root="${EGISZ_REMD_OIDS.IDENTITY_DOC_TYPE}" extension="${escapeXml(payload.patient.patientPassport)}"/>` : ""}
			<addr>
				<streetAddressLine>${escapeXml(payload.patient.patientAddress || payload.clinic.clinicAddress)}</streetAddressLine>
			</addr>
			${payload.patient.patientPhone ? `<telecom value="tel:${escapeXml(payload.patient.patientPhone.replace(/[^\d+]/g, ""))}" use="MC"/>` : ""}
			${payload.patient.patientEmail ? `<telecom value="mailto:${escapeXml(payload.patient.patientEmail)}" use="WP"/>` : ""}
			<patient>
				<name>
					<family>${escapeXml(patFamily)}</family>
					<given>${escapeXml(patGiven)}</given>
					${patPatronymic ? `<identity:Patronymic>${escapeXml(patPatronymic)}</identity:Patronymic>` : ""}
				</name>
				<administrativeGenderCode code="${genderCode}" codeSystem="${EGISZ_REMD_OIDS.GENDER}" codeSystemName="Пол" displayName="${escapeXml(genderLabel)}"/>
				<birthTime value="${birthTime}"/>
			</patient>
		</patientRole>
	</recordTarget>

	<!-- Автор документа / Лечащий врач -->
	<author>
		<time value="${visitTime}"/>
		<assignedAuthor>
			<id root="${EGISZ_REMD_OIDS.SNILS}" extension="${escapeXml(cleanDocSnils)}"/>
			<code code="${escapeXml(payload.doctor.doctorPositionCode || "71")}" codeSystem="${EGISZ_REMD_OIDS.MEDICAL_POSITIONS}" codeSystemName="Должности медработников" displayName="${escapeXml(payload.doctor.doctorPosition || "Врач-стоматолог-терапевт")}"/>
			${payload.doctor.doctorPhone ? `<telecom value="tel:${escapeXml(payload.doctor.doctorPhone.replace(/[^\d+]/g, ""))}" use="WP"/>` : ""}
			<assignedPerson>
				<name>
					<family>${escapeXml(docFamily)}</family>
					<given>${escapeXml(docGiven)}</given>
					${docPatronymic ? `<identity:Patronymic>${escapeXml(docPatronymic)}</identity:Patronymic>` : ""}
				</name>
			</assignedPerson>
			<representedOrganization>
				<id root="${EGISZ_REMD_OIDS.FRMO_MO_ROOT}" extension="${escapeXml(clinicOid)}"/>
				<id root="${EGISZ_REMD_OIDS.OGRN_LEGAL}" extension="${escapeXml((payload.clinic.clinicOgrn || "").replace(/\D/g, ""))}"/>
				<id root="${EGISZ_REMD_OIDS.INN}" extension="${escapeXml((payload.clinic.clinicInn || "").replace(/\D/g, ""))}"/>
				<name>${escapeXml(payload.clinic.clinicName)}</name>
				<telecom value="tel:${escapeXml((payload.clinic.clinicPhone || "").replace(/[^\d+]/g, ""))}" use="WP"/>
				<addr>
					<streetAddressLine>${escapeXml(payload.clinic.clinicAddress)}</streetAddressLine>
				</addr>
			</representedOrganization>
		</assignedAuthor>
	</author>

	<!-- Хранитель медицинской документации / Медицинская организация (МО) -->
	<custodian>
		<assignedCustodian>
			<representedCustodianOrganization>
				<id root="${EGISZ_REMD_OIDS.FRMO_MO_ROOT}" extension="${escapeXml(clinicOid)}"/>
				<id root="${EGISZ_REMD_OIDS.OGRN_LEGAL}" extension="${escapeXml((payload.clinic.clinicOgrn || "").replace(/\D/g, ""))}"/>
				<name>${escapeXml(payload.clinic.clinicName)}</name>
				<telecom value="tel:${escapeXml((payload.clinic.clinicPhone || "").replace(/[^\d+]/g, ""))}" use="WP"/>
				<addr>
					<streetAddressLine>${escapeXml(payload.clinic.clinicAddress)}</streetAddressLine>
				</addr>
			</representedCustodianOrganization>
		</assignedCustodian>
	</custodian>

	<!-- Лицо, имеющее право подписи от имени МО / Главный врач -->
	<legalAuthenticator>
		<time value="${effectiveTime}"/>
		<signatureCode code="S"/>
		<assignedEntity>
			<id root="${EGISZ_REMD_OIDS.SNILS}" extension="${escapeXml((payload.clinic.chiefDoctorSnils || payload.doctor.doctorSnils || "").replace(/\D/g, ""))}"/>
			<code code="15" codeSystem="${EGISZ_REMD_OIDS.MEDICAL_POSITIONS}" displayName="Главный врач"/>
			<assignedPerson>
				<name>
					<family>${escapeXml(payload.clinic.chiefDoctorName ? payload.clinic.chiefDoctorName.split(" ")[0] : docFamily)}</family>
					<given>${escapeXml(payload.clinic.chiefDoctorName ? payload.clinic.chiefDoctorName.split(" ")[1] || "" : docGiven)}</given>
					<identity:Patronymic>${escapeXml(payload.clinic.chiefDoctorName ? payload.clinic.chiefDoctorName.split(" ")[2] || "" : docPatronymic)}</identity:Patronymic>
				</name>
			</assignedPerson>
			<representedOrganization>
				<id root="${EGISZ_REMD_OIDS.FRMO_MO_ROOT}" extension="${escapeXml(clinicOid)}"/>
				<name>${escapeXml(payload.clinic.clinicName)}</name>
			</representedOrganization>
		</assignedEntity>
	</legalAuthenticator>

	<!-- Амбулаторный прием / Случай оказания помощи -->
	<componentOf>
		<encompassingEncounter>
			<id root="${escapeXml(clinicOid)}.100.1.3" extension="${escapeXml(payload.patient.cardNumber || docUuid)}"/>
			<code code="1" codeSystem="${EGISZ_REMD_OIDS.MEDICAL_CARE_TYPE}" displayName="Первичная медико-санитарная помощь"/>
			<effectiveTime>
				<low value="${visitTime}"/>
				<high value="${effectiveTime}"/>
			</effectiveTime>
		</encompassingEncounter>
	</componentOf>

	<!-- ТЕЛО ДОКУМЕНТА (Клинические секции ф. 043/у) -->
	<component>
		<structuredBody>${complaintsSection}${anamnesisSection}${dentalFormulaSection}${diagnosesSection}${proceduresSection}${recommendationsSection}
		</structuredBody>
	</component>
</ClinicalDocument>`;

	return canonicalizeCdaXml(rawXml);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 2. FNS TAX DEDUCTION CERTIFICATE XML BUILDER (КНД 1151156 / ЕД-7-11/755@)
 * ═══════════════════════════════════════════════════════════════════════════ */

export function generateFnsTaxCertificateXml(payload: FnsTaxCertificatePayload): string {
	const docDate = payload.documentDate instanceof Date ? payload.documentDate : new Date(payload.documentDate);
	const validDocDate = Number.isNaN(docDate.getTime()) ? new Date() : docDate;
	const formattedDocDate = formatRuDate(validDocDate);
	const fileGuid = `UT_SPROPLMED_${(payload.clinic.inn || "0000000000").trim()}_${validDocDate.getFullYear()}${(validDocDate.getMonth() + 1).toString().padStart(2, "0")}${validDocDate.getDate().toString().padStart(2, "0")}_${Date.now()}`;

	// Payments calculation (in exact kopecks)
	const payments = payload.payments || [];
	const totalKopecks = payments.reduce((sum, p) => sum + Math.max(0, Math.round(p.amountKopecks || 0)), 0);
	const code1Kopecks = payments
		.filter((p) => p.serviceCode === "1")
		.reduce((sum, p) => sum + Math.max(0, Math.round(p.amountKopecks || 0)), 0);
	const code2Kopecks = payments
		.filter((p) => p.serviceCode === "2")
		.reduce((sum, p) => sum + Math.max(0, Math.round(p.amountKopecks || 0)), 0);

	const totalRublesStr = formatKopecksToRubles(totalKopecks);
	const code1RublesStr = formatKopecksToRubles(code1Kopecks);
	const code2RublesStr = formatKopecksToRubles(code2Kopecks);

	// Split Taxpayer FIO
	const tpParts = (payload.taxpayer.fullName || "").trim().split(/\s+/);
	const tpFamily = tpParts[0] || "Налогоплательщик";
	const tpGiven = tpParts[1] || "";
	const tpPatronymic = tpParts[2] || "";

	// Split Patient FIO
	const patParts = (payload.patient.fullName || "").trim().split(/\s+/);
	const patFamily = patParts[0] || "Пациент";
	const patGiven = patParts[1] || "";
	const patPatronymic = patParts[2] || "";

	// Split Signer FIO
	const sigParts = (payload.signer.fullName || "").trim().split(/\s+/);
	const sigFamily = sigParts[0] || "Руководитель";
	const sigGiven = sigParts[1] || "";
	const sigPatronymic = sigParts[2] || "";

	const cleanClinicInn = (payload.clinic.inn || "").replace(/\D/g, "");
	const cleanClinicKpp = (payload.clinic.kpp || "").replace(/\D/g, "");
	const cleanClinicOgrn = (payload.clinic.ogrn || "").replace(/\D/g, "");

	const cleanTpInn = (payload.taxpayer.inn || "").replace(/\D/g, "");
	const cleanTpSnils = (payload.taxpayer.snils || "").replace(/\D/g, "");
	const cleanPatSnils = (payload.patient.snils || "").replace(/\D/g, "");
	const cleanSigSnils = (payload.signer.snils || "").replace(/\D/g, "");

	const paymentsXml = payments
		.map((p, idx) => {
			const payDate = p.date instanceof Date ? p.date : new Date(p.date);
			const payDateStr = formatRuDate(payDate);
			const rubStr = formatKopecksToRubles(p.amountKopecks);
			return `\t\t\t<СведОпл НомСтроки="${idx + 1}" КодУслуги="${p.serviceCode}" ДатаОпл="${payDateStr}" Сумма="${rubStr}"${p.serviceDescription ? ` НаимУслуги="${escapeXml(p.serviceDescription)}"` : ""}/>`;
		})
		.join("\n");

	const rawXml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- 
	Справка об оплате медицинских услуг для представления в налоговый орган
	Форма по КНД 1151156 (Приказ ФНС России от 08.11.2023 № ЕД-7-11/755@)
	Формат версии 5.01
-->
<Файл ИдФайл="${escapeXml(fileGuid)}" ВерсФорм="5.01" ВерсПрог="DenteCRM-EGISZ 1.0">
	<СвУчДок>
		<СвОрг НаимОрг="${escapeXml(payload.clinic.name)}" ИННЮЛ="${escapeXml(cleanClinicInn)}"${cleanClinicKpp ? ` КПП="${escapeXml(cleanClinicKpp)}"` : ""} ОГРН="${escapeXml(cleanClinicOgrn)}"${payload.clinic.phone ? ` Тел="${escapeXml(payload.clinic.phone)}"` : ""}${payload.clinic.email ? ` E-mail="${escapeXml(payload.clinic.email)}"` : ""}/>
	</СвУчДок>
	<Документ КНД="1151156" ДатаДок="${formattedDocDate}" НомДок="${escapeXml(payload.documentNumber || "1")}" НалогПериод="${payload.taxYear}">
		<!-- Сведения о налогоплательщике -->
		<СвФЛ${cleanTpInn ? ` ИННФЛ="${escapeXml(cleanTpInn)}"` : ""}${cleanTpSnils ? ` СНИЛС="${escapeXml(cleanTpSnils)}"` : ""}${payload.taxpayer.birthDate ? ` ДатаРожд="${formatRuDate(payload.taxpayer.birthDate)}"` : ""}>
			<ФИО Фамилия="${escapeXml(tpFamily)}" Имя="${escapeXml(tpGiven)}"${tpPatronymic ? ` Отчество="${escapeXml(tpPatronymic)}"` : ""}/>
			${payload.taxpayer.docSeriesNumber ? `<УдЛичнФЛ КодВидДок="${escapeXml(payload.taxpayer.docTypeCode || "21")}" СерНомДок="${escapeXml(payload.taxpayer.docSeriesNumber)}"/>` : ""}
		</СвФЛ>
		<!-- Сведения о пациенте и степени родства -->
		<Пациент РодствоКод="${payload.patient.relationshipCode}"${cleanPatSnils ? ` СНИЛС="${escapeXml(cleanPatSnils)}"` : ""}${payload.patient.birthDate ? ` ДатаРожд="${formatRuDate(payload.patient.birthDate)}"` : ""}>
			<ФИО Фамилия="${escapeXml(patFamily)}" Имя="${escapeXml(patGiven)}"${patPatronymic ? ` Отчество="${escapeXml(patPatronymic)}"` : ""}/>
		</Пациент>
		<!-- Сведения о произведенных оплатах (Код 1 - стандарт, Код 2 - дорогостоящее) -->
		<ОплатаУслуг СуммаКод1="${code1RublesStr}" СуммаКод2="${code2RublesStr}" ИтогоСумма="${totalRublesStr}">
${paymentsXml}
		</ОплатаУслуг>
		<!-- Подписант справки -->
		<Подписант ПрПодп="1"${cleanSigSnils ? ` СНИЛС="${escapeXml(cleanSigSnils)}"` : ""}>
			<ФИО Фамилия="${escapeXml(sigFamily)}" Имя="${escapeXml(sigGiven)}"${sigPatronymic ? ` Отчество="${escapeXml(sigPatronymic)}"` : ""}/>
			<Должность>${escapeXml(payload.signer.position || "Руководитель медицинской организации")}</Должность>
		</Подписант>
	</Документ>
</Файл>`;

	return canonicalizeCdaXml(rawXml);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 3. XML STRUCTURE & COMPLIANCE VALIDATORS
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface XmlStructureValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	tagCount: number;
	docTypeDetected?: "cda_r2" | "fns_knd_1151156" | "unknown";
}

/**
 * Validates XML structure, well-formedness, tag balancing, and statutory requirements.
 */
export function validateXmlStructure(xml: string): XmlStructureValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!xml || typeof xml !== "string" || xml.trim().length === 0) {
		return { isValid: false, errors: ["XML документ пуст"], warnings: [], tagCount: 0 };
	}

	const cleanXml = xml.trim();

	// 1. Basic XML Declaration Check
	if (!cleanXml.startsWith("<?xml")) {
		warnings.push("Отсутствует стандартный XML-пролог <?xml version=\"1.0\" encoding=\"UTF-8\"?>");
	}

	// 2. Tag Matching & Well-Formedness Check
	const tagRegex = /<\/?([a-zA-Z0-9_:-]+)(?:\s+[^>]*?)?(\/?)>/g;
	const tagStack: string[] = [];
	let match: RegExpExecArray | null = null;
	let tagCount = 0;

	// Strip comments, CDATA, and processing instructions before tag stack check
	const strippedXml = cleanXml
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
		.replace(/<\?[\s\S]*?\?>/g, "");

	while (true) {
		match = tagRegex.exec(strippedXml);
		if (match === null) break;
		tagCount++;
		const fullTag = match[0];
		const tagName = match[1] || "";
		const isSelfClosing = match[2] || "";
		const isClosingTag = fullTag.startsWith("</");

		if (isSelfClosing === "/" || fullTag.endsWith("/>")) {
			// Self-closing tag (e.g. <id ... />)
			continue;
		}

		if (isClosingTag) {
			if (tagStack.length === 0) {
				errors.push(`Неожиданный закрывающий тег </${tagName}> без открывающего`);
				break;
			}
			const lastTag = tagStack.pop();
			if (lastTag !== tagName) {
				errors.push(`Нарушена вложенность тегов: ожидался закрывающий </${lastTag ?? "unknown"}>, получен </${tagName}>`);
				break;
			}
		} else if (tagName) {
			tagStack.push(tagName);
		}
	}

	if (tagStack.length > 0) {
		errors.push(`Обнаружены незакрытые XML-теги: ${tagStack.join(", ")}`);
	}

	// 3. Document Type & Required Sections Inspection
	let docTypeDetected: "cda_r2" | "fns_knd_1151156" | "unknown" = "unknown";

	if (cleanXml.includes("<ClinicalDocument") && cleanXml.includes("urn:hl7-org:v3")) {
		docTypeDetected = "cda_r2";
		// Check required CDA R2 components
		if (!cleanXml.includes("<realmCode")) warnings.push("В CDA XML отсутствует тег <realmCode code=\"RU\"/>");
		if (!cleanXml.includes("<typeId")) errors.push("В CDA XML отсутствует обязательный заголовок <typeId>");
		if (!cleanXml.includes("<templateId")) errors.push("В CDA XML отсутствует идентификатор шаблона СЭМД <templateId>");
		if (!cleanXml.includes("<recordTarget")) errors.push("В CDA XML отсутствуют сведения о пациенте <recordTarget>");
		if (!cleanXml.includes("<author")) errors.push("В CDA XML отсутствуют сведения об авторе (враче) <author>");
		if (!cleanXml.includes("<custodian")) errors.push("В CDA XML отсутствуют сведения об организации <custodian>");
		if (!cleanXml.includes("<structuredBody")) errors.push("В CDA XML отсутствует тело документа <structuredBody>");
	} else if (cleanXml.includes("<Файл") && cleanXml.includes('КНД="1151156"')) {
		docTypeDetected = "fns_knd_1151156";
		// Check required FNS components
		if (!cleanXml.includes("<СвОрг") && !cleanXml.includes("<СвУчДок")) {
			errors.push("В XML справки ФНС отсутствуют сведения о медицинской организации <СвОрг>");
		}
		if (!cleanXml.includes("<СвФЛ")) errors.push("В XML справки ФНС отсутствуют сведения о налогоплательщике <СвФЛ>");
		if (!cleanXml.includes("<Пациент")) errors.push("В XML справки ФНС отсутствуют сведения о пациенте <Пациент>");
		if (!cleanXml.includes("<ОплатаУслуг")) errors.push("В XML справки ФНС отсутствует раздел <ОплатаУслуг>");
		if (!cleanXml.includes("<Подписант")) errors.push("В XML справки ФНС отсутствуют сведения о подписанте <Подписант>");
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
		tagCount,
		docTypeDetected,
	};
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 4. CRYPTO PACKAGING & GOST SIGNATURE STAMPS (63-ФЗ / ГОСТ Р 7.0.97-2016)
 * ═══════════════════════════════════════════════════════════════════════════ */

export function generateGostXmlSignatureBlock(sig: GostSignatureInfo, documentRef = ""): string {
	return `
<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
	<ds:SignedInfo>
		<ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
		<ds:SignatureMethod Algorithm="urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34102012-256"/>
		<ds:Reference URI="${escapeXml(documentRef)}">
			<ds:Transforms>
				<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
				<ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
			</ds:Transforms>
			<ds:DigestMethod Algorithm="urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34112012-256"/>
			<ds:DigestValue>${escapeXml(sig.signatureBase64 ? sig.signatureBase64.slice(0, 44) : "")}</ds:DigestValue>
		</ds:Reference>
	</ds:SignedInfo>
	<ds:SignatureValue>${escapeXml(sig.signatureBase64)}</ds:SignatureValue>
	<ds:KeyInfo>
		<ds:X509Data>
			<ds:X509SubjectName>${escapeXml(sig.certificateSubject)}</ds:X509SubjectName>
			<ds:X509IssuerSerial>
				<ds:X509IssuerName>${escapeXml(sig.certificateIssuer || "Головной УЦ Минцифры России")}</ds:X509IssuerName>
				<ds:X509SerialNumber>${escapeXml(sig.certificateSerialNumber)}</ds:X509SerialNumber>
			</ds:X509IssuerSerial>
		</ds:X509Data>
	</ds:KeyInfo>
</ds:Signature>`.trim();
}

/**
 * Generates an official GOST R 7.0.97-2016 (Section 5.23) electronic signature visual stamp (HTML).
 */
export function generateGostSignatureStampHtml(params: {
	signerName: string;
	certificateNumber: string;
	validFrom: string;
	validTo: string;
	orgName?: string | undefined;
	signedAt?: string | undefined;
}): string {
	const validFromStr = formatRuDate(params.validFrom);
	const validToStr = formatRuDate(params.validTo);

	return `
<div class="gost-signature-stamp" style="border: 2px solid #0056b3; border-radius: 6px; padding: 8px 12px; color: #0056b3; font-family: 'Times New Roman', serif; font-size: 11px; line-height: 1.25; max-width: 320px; box-sizing: border-box; background: rgba(0, 86, 179, 0.02);">
	<div style="font-weight: bold; text-align: center; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; border-bottom: 1px solid #0056b3; padding-bottom: 4px; margin-bottom: 4px;">
		ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ
	</div>
	<div style="display: flex; gap: 6px; margin-bottom: 2px;">
		<span style="font-weight: bold; min-width: 75px;">Сертификат:</span>
		<span style="font-family: monospace; word-break: break-all;">${escapeXml(params.certificateNumber)}</span>
	</div>
	<div style="display: flex; gap: 6px; margin-bottom: 2px;">
		<span style="font-weight: bold; min-width: 75px;">Владелец:</span>
		<span>${escapeXml(params.signerName)}</span>
	</div>
	${params.orgName ? `
	<div style="display: flex; gap: 6px; margin-bottom: 2px;">
		<span style="font-weight: bold; min-width: 75px;">Организация:</span>
		<span>${escapeXml(params.orgName)}</span>
	</div>` : ""}
	<div style="display: flex; gap: 6px;">
		<span style="font-weight: bold; min-width: 75px;">Действителен:</span>
		<span>с ${validFromStr} по ${validToStr}</span>
	</div>
</div>`.trim();
}

/**
 * Generates an SVG vector electronic signature stamp for embedding in PDF / print previews.
 */
export function generateGostSignatureStampSvg(params: {
	signerName: string;
	certificateNumber: string;
	validFrom: string;
	validTo: string;
	orgName?: string | undefined;
}): string {
	const validFromStr = formatRuDate(params.validFrom);
	const validToStr = formatRuDate(params.validTo);

	return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="110" viewBox="0 0 320 110">
	<rect x="2" y="2" width="316" height="106" rx="6" ry="6" fill="#f8fafc" stroke="#0056b3" stroke-width="2"/>
	<line x1="10" y1="28" x2="310" y2="28" stroke="#0056b3" stroke-width="1"/>
	<text x="160" y="19" font-family="'Times New Roman', serif" font-size="10" font-weight="bold" fill="#0056b3" text-anchor="middle" letter-spacing="0.5">
		ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ
	</text>
	<text x="12" y="44" font-family="'Times New Roman', serif" font-size="10" font-weight="bold" fill="#0056b3">Сертификат:</text>
	<text x="88" y="44" font-family="monospace" font-size="9" fill="#0f172a">${escapeXml(params.certificateNumber)}</text>
	<text x="12" y="62" font-family="'Times New Roman', serif" font-size="10" font-weight="bold" fill="#0056b3">Владелец:</text>
	<text x="88" y="62" font-family="'Times New Roman', serif" font-size="10" fill="#0f172a">${escapeXml(params.signerName)}</text>
	${params.orgName ? `
	<text x="12" y="78" font-family="'Times New Roman', serif" font-size="9" font-weight="bold" fill="#0056b3">Организация:</text>
	<text x="88" y="78" font-family="'Times New Roman', serif" font-size="9" fill="#0f172a">${escapeXml(params.orgName.slice(0, 32))}</text>` : ""}
	<text x="12" y="96" font-family="'Times New Roman', serif" font-size="10" font-weight="bold" fill="#0056b3">Действителен:</text>
	<text x="88" y="96" font-family="'Times New Roman', serif" font-size="10" fill="#0f172a">с ${validFromStr} по ${validToStr}</text>
</svg>`;
}
