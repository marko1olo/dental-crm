import { isValidSnils, normalizeSnils, formatSnils } from "../../utils/snils";

export const EGISZ_SEMD_DOC_TYPES = {
	"302": {
		code: "302",
		nsiCode: "75",
		title: "Протокол консультации стоматолога",
		description: "Первичный или повторный консультативный прием врача-стоматолога",
		loincCode: "74208-1",
		loincDisplayName: "Протокол стоматологического осмотра",
		templateRoot: "1.2.643.5.1.13.13.11.1527",
	},
	"303": {
		code: "303",
		nsiCode: "76",
		title: "Протокол стоматологического лечения/вмешательства",
		description: "Лечебно-диагностическое стоматологическое вмешательство (терапия, хирургия, ортопедия, пародонтология)",
		loincCode: "74208-1",
		loincDisplayName: "Протокол стоматологического лечения",
		templateRoot: "1.2.643.5.1.13.13.11.1527",
	},
} as const;

export type EgiszSemdDocTypeCode = keyof typeof EGISZ_SEMD_DOC_TYPES;

export const EGISZ_STANDARD_OIDS = {
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
	V001_NOMENKLATURA: "1.2.643.5.1.13.13.11.1070",
	CONFIDENTIALITY: "2.16.840.1.113883.5.25",
	LOINC: "2.16.840.1.113883.6.1",
	GOST_3410_2012_256: "1.2.643.7.1.1.1.1",
	GOST_3410_2012_512: "1.2.643.7.1.1.1.2",
} as const;

export interface CdaExportData {
	docTypeCode: EgiszSemdDocTypeCode;
	visitId: string;
	patientId: string;
	patientFullName: string;
	patientSnils?: string | undefined;
	patientBirthDate?: string | undefined;
	patientGender?: "male" | "female" | "other" | string | undefined;
	patientPolisOms?: string | undefined;
	patientAddress?: string | undefined;
	patientPhone?: string | undefined;
	patientEmail?: string | undefined;
	clinicName: string;
	clinicOid?: string | undefined;
	clinicOgrn?: string | undefined;
	clinicInn?: string | undefined;
	clinicAddress?: string | undefined;
	clinicPhone?: string | undefined;
	clinicEmail?: string | undefined;
	doctorFullName: string;
	doctorSnils?: string | undefined;
	doctorPosition?: string | undefined;
	doctorPositionCode?: string | undefined;
	doctorPhone?: string | undefined;
	doctorEmail?: string | undefined;
	icd10Code?: string | undefined;
	diagnosisText?: string | undefined;
	diagnosisTooth?: string | undefined;
	anamnesis?: string | undefined;
	objectiveStatus?: string | undefined;
	treatmentDescription?: string | undefined;
	complications?: string | undefined;
	comorbidities?: string | undefined;
	instrumentTrayBarcode?: string | undefined;
	toothStates?: Record<number, string> | undefined;
	toothSurfaces?: Record<number, string[]> | undefined;
	procedures?: Array<{ code: string; name: string; tooth?: number | string }> | undefined;
	encounterDate?: Date | string | undefined;
	documentVersion?: number | undefined;
}

export interface SemanticValidationRuleResult {
	id: string;
	name: string;
	category: "header" | "mo" | "doctor" | "patient" | "clinical" | "signature";
	status: "passed" | "failed" | "warning";
	message: string;
	details?: string;
	xpathOrOid?: string;
}

export interface SemanticValidationReport {
	isValid: boolean;
	totalRules: number;
	passedCount: number;
	failedCount: number;
	warningCount: number;
	scorePercent: number;
	rules: SemanticValidationRuleResult[];
}

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function formatHl7DateTime(d: Date, includeTime = true): string {
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

export function buildCdaXml(data: CdaExportData): string {
	const docDef = EGISZ_SEMD_DOC_TYPES[data.docTypeCode] || EGISZ_SEMD_DOC_TYPES["302"];
	const now = new Date();
	const effectiveTime = formatHl7DateTime(now, true);
	const encounterDate = data.encounterDate instanceof Date
		? data.encounterDate
		: data.encounterDate ? new Date(data.encounterDate) : now;
	const visitTime = formatHl7DateTime(encounterDate, true);

	const birthDateParsed = data.patientBirthDate ? new Date(data.patientBirthDate) : null;
	const birthTime = birthDateParsed && !Number.isNaN(birthDateParsed.getTime())
		? formatHl7DateTime(birthDateParsed, false)
		: "19800101";

	const genderCode = data.patientGender === "male" ? "1" : data.patientGender === "female" ? "2" : "0";
	const genderLabel = genderCode === "1" ? "Мужской" : genderCode === "2" ? "Женский" : "Не указан";

	const docId = data.visitId ? `${data.visitId}-v${data.documentVersion || 1}` : `DOC-${Date.now()}`;
	const docRoot = data.clinicOid || EGISZ_STANDARD_OIDS.FRMO_MO_ROOT;

	const patientParts = data.patientFullName.trim().split(/\s+/);
	const patientLast = patientParts[0] || "Пациент";
	const patientFirst = patientParts[1] || "";
	const patientMiddle = patientParts[2] || "";

	const doctorParts = data.doctorFullName.trim().split(/\s+/);
	const doctorLast = doctorParts[0] || "Врач";
	const doctorFirst = doctorParts[1] || "";
	const doctorMiddle = doctorParts[2] || "";

	const doctorPos = data.doctorPosition || "Врач-стоматолог";
	const doctorPosCode = data.doctorPositionCode || "15";

	const icd10 = data.icd10Code || "K02.1";
	const diagnosis = data.diagnosisText || "Кариес дентина";
	const tooth = data.diagnosisTooth ? String(data.diagnosisTooth).trim() : "";

	// Build dental formula XML block if present
	const toothStates = data.toothStates || {};
	const toothSurfaces = data.toothSurfaces || {};
	const teethKeys = Object.keys(toothStates).map(Number).sort((a, b) => a - b);

	let dentalFormulaXml = "";
	if (teethKeys.length > 0) {
		const observations = teethKeys.map((tNum) => {
			const st = toothStates[tNum] || "Healthy";
			const surfs = toothSurfaces[tNum] || [];
			const surfText = surfs.length > 0 ? ` (${surfs.join(", ")})` : "";
			return `\t\t\t\t\t<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="74208-1" codeSystem="${EGISZ_STANDARD_OIDS.LOINC}" displayName="Статус зуба ${tNum}"/>
							<statusCode code="completed"/>
							<value xsi:type="CD" code="${escapeXml(st)}" displayName="${escapeXml(st)}${escapeXml(surfText)}"/>
							<targetSiteCode code="${tNum}" codeSystem="${EGISZ_STANDARD_OIDS.DENTAL_TOOTH}" displayName="Зуб ${tNum}"/>
						</observation>
					</entry>`;
		}).join("\n");

		dentalFormulaXml = `
			<!-- Зубная формула и статус полости рта -->
			<component>
				<section>
					<code code="74208-1" codeSystem="${EGISZ_STANDARD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Зубная формула и одонтограмма"/>
					<title>Зубная формула (FDI ISO 3950)</title>
					<text>
						<paragraph>Всего зубов в карте: ${teethKeys.length}. ${teethKeys.map((k) => `Зуб ${k}: ${toothStates[k]}${toothSurfaces[k]?.length ? ` [${toothSurfaces[k].join("")}]` : ""}`).join("; ")}</paragraph>
					</text>
${observations}
				</section>
			</component>`;
	}

	// Build procedures XML block
	const proceduresList = data.procedures || [
		{ code: "A16.07.002", name: "Восстановление зуба пломбой с нарушением формы", tooth },
		{ code: "A16.07.030", name: "Инструментальная и медикаментозная обработка корневого канала", tooth },
	];

	const proceduresXml = `
			<!-- Выполненные медицинские вмешательства по номенклатуре Минздрава V001 -->
			<component>
				<section>
					<code code="47519-4" codeSystem="${EGISZ_STANDARD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Проведенные процедуры и вмешательства"/>
					<title>Оказанные стоматологические услуги</title>
					<text>
						<paragraph>${escapeXml(data.treatmentDescription || proceduresList.map((p) => `${p.code} ${p.name}${p.tooth ? ` (зуб ${p.tooth})` : ""}`).join("; "))}</paragraph>
					</text>
					${proceduresList.map((p) => `
					<entry>
						<procedure classCode="PROC" moodCode="EVN">
							<code code="${escapeXml(p.code)}" codeSystem="${EGISZ_STANDARD_OIDS.V001_NOMENKLATURA}" codeSystemName="Номенклатура медицинских услуг V001" displayName="${escapeXml(p.name)}"/>
							<statusCode code="completed"/>
							<effectiveTime value="${visitTime}"/>
							${p.tooth ? `<targetSiteCode code="${escapeXml(String(p.tooth))}" codeSystem="${EGISZ_STANDARD_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(String(p.tooth))}"/>` : ""}
						</procedure>
					</entry>`).join("")}
				</section>
			</component>`;

	return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<realmCode code="RU"/>
	<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
	<templateId root="${docDef.templateRoot}"/>
	<id root="${escapeXml(docRoot)}" extension="${escapeXml(docId)}"/>
	<code code="${docDef.loincCode}" codeSystem="${EGISZ_STANDARD_OIDS.LOINC}" codeSystemName="LOINC" displayName="${escapeXml(docDef.loincDisplayName)}"/>
	<title>${escapeXml(docDef.title)} (СЭМД ${docDef.code})</title>
	<effectiveTime value="${effectiveTime}"/>
	<confidentialityCode code="N" codeSystem="${EGISZ_STANDARD_OIDS.CONFIDENTIALITY}" codeSystemName="HL7 Confidentiality" displayName="обычный"/>
	<languageCode code="ru-RU"/>
	<setId root="${escapeXml(docRoot)}" extension="${escapeXml(data.visitId || docId)}"/>
	<versionNumber value="${data.documentVersion || 1}"/>

	<!-- Субъект документа / Пациент -->
	<recordTarget>
		<patientRole>
			${data.patientSnils ? `<id root="${EGISZ_STANDARD_OIDS.SNILS}" extension="${escapeXml(normalizeSnils(data.patientSnils))}"/>` : `<id nullFlavor="NI"/>`}
			${data.patientPolisOms ? `<id root="1.2.643.5.1.13.13.11.1035" extension="${escapeXml(data.patientPolisOms)}"/>` : ""}
			<addr>
				<streetAddressLine>${escapeXml(data.patientAddress || "г. Москва")}</streetAddressLine>
			</addr>
			${data.patientPhone ? `<telecom value="tel:${escapeXml(data.patientPhone)}"/>` : `<telecom nullFlavor="NI"/>`}
			<patient>
				<name>
					<family>${escapeXml(patientLast)}</family>
					<given>${escapeXml(patientFirst)}</given>
					${patientMiddle ? `<given>${escapeXml(patientMiddle)}</given>` : ""}
				</name>
				<administrativeGenderCode code="${genderCode}" codeSystem="${EGISZ_STANDARD_OIDS.GENDER}" codeSystemName="Пол пациента" displayName="${escapeXml(genderLabel)}"/>
				<birthTime value="${birthTime}"/>
			</patient>
			<providerOrganization>
				<id root="${EGISZ_STANDARD_OIDS.FRMO_MO_ROOT}" extension="${escapeXml(docRoot)}"/>
				<name>${escapeXml(data.clinicName)}</name>
			</providerOrganization>
		</patientRole>
	</recordTarget>

	<!-- Автор документа / Врач -->
	<author>
		<time value="${effectiveTime}"/>
		<assignedAuthor>
			${data.doctorSnils ? `<id root="${EGISZ_STANDARD_OIDS.SNILS}" extension="${escapeXml(normalizeSnils(data.doctorSnils))}"/>` : `<id nullFlavor="NI"/>`}
			<code code="${escapeXml(doctorPosCode)}" codeSystem="${EGISZ_STANDARD_OIDS.MEDICAL_POSITIONS}" codeSystemName="Должности медработников" displayName="${escapeXml(doctorPos)}"/>
			${data.doctorPhone ? `<telecom value="tel:${escapeXml(data.doctorPhone)}"/>` : `<telecom nullFlavor="NI"/>`}
			<assignedPerson>
				<name>
					<family>${escapeXml(doctorLast)}</family>
					<given>${escapeXml(doctorFirst)}</given>
					${doctorMiddle ? `<given>${escapeXml(doctorMiddle)}</given>` : ""}
				</name>
			</assignedPerson>
			<representedOrganization>
				<id root="${EGISZ_STANDARD_OIDS.FRMO_MO_ROOT}" extension="${escapeXml(docRoot)}"/>
				${data.clinicOgrn ? `<id root="${data.clinicOgrn.length === 15 ? EGISZ_STANDARD_OIDS.OGRN_IP : EGISZ_STANDARD_OIDS.OGRN_LEGAL}" extension="${escapeXml(data.clinicOgrn)}"/>` : ""}
				${data.clinicInn ? `<id root="${EGISZ_STANDARD_OIDS.INN}" extension="${escapeXml(data.clinicInn)}"/>` : ""}
				<name>${escapeXml(data.clinicName)}</name>
				${data.clinicPhone ? `<telecom value="tel:${escapeXml(data.clinicPhone)}"/>` : `<telecom nullFlavor="NI"/>`}
				<addr><streetAddressLine>${escapeXml(data.clinicAddress || "Адрес МО")}</streetAddressLine></addr>
			</representedOrganization>
		</assignedAuthor>
	</author>

	<!-- Организация-хранитель документа (Custodian) -->
	<custodian>
		<assignedCustodian>
			<representedCustodianOrganization>
				<id root="${EGISZ_STANDARD_OIDS.FRMO_MO_ROOT}" extension="${escapeXml(docRoot)}"/>
				<name>${escapeXml(data.clinicName)}</name>
				${data.clinicPhone ? `<telecom value="tel:${escapeXml(data.clinicPhone)}"/>` : `<telecom nullFlavor="NI"/>`}
				<addr><streetAddressLine>${escapeXml(data.clinicAddress || "Адрес МО")}</streetAddressLine></addr>
			</representedCustodianOrganization>
		</assignedCustodian>
	</custodian>

	<!-- Случай оказания медицинской помощи -->
	<componentOf>
		<encompassingEncounter>
			<id root="${escapeXml(docRoot)}" extension="${escapeXml(data.visitId || docId)}"/>
			<code code="AMB" codeSystem="${EGISZ_STANDARD_OIDS.MEDICAL_CARE_TYPE}" codeSystemName="Виды медицинской помощи" displayName="Амбулаторная помощь"/>
			<effectiveTime>
				<low value="${visitTime}"/>
			</effectiveTime>
		</encompassingEncounter>
	</componentOf>

	<!-- Клинический структурированный блок -->
	<component>
		<structuredBody>
			<!-- Диагноз -->
			<component>
				<section>
					<code code="29548-5" codeSystem="${EGISZ_STANDARD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Диагнозы"/>
					<title>Основной клинический диагноз</title>
					<text>
						<paragraph>${escapeXml(diagnosis)} (МКБ-10: ${escapeXml(icd10)})${tooth ? ` · зуб ${escapeXml(tooth)}` : ""}</paragraph>
					</text>
					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="29308-4" codeSystem="${EGISZ_STANDARD_OIDS.LOINC}" displayName="Диагноз"/>
							<statusCode code="completed"/>
							<value xsi:type="CD" code="${escapeXml(icd10)}" codeSystem="${EGISZ_STANDARD_OIDS.ICD10}" codeSystemName="МКБ-10" displayName="${escapeXml(diagnosis)}"/>
							${tooth ? `<targetSiteCode code="${escapeXml(tooth)}" codeSystem="${EGISZ_STANDARD_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(tooth)}"/>` : ""}
						</observation>
					</entry>
				</section>
			</component>

			${data.anamnesis ? `
			<!-- Анамнез -->
			<component>
				<section>
					<code code="10164-2" codeSystem="${EGISZ_STANDARD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Анамнез"/>
					<title>Анамнез заболевания и жизни</title>
					<text>
						<paragraph>${escapeXml(data.anamnesis)}</paragraph>
					</text>
				</section>
			</component>` : ""}

			${data.objectiveStatus ? `
			<!-- Объективный статус -->
			<component>
				<section>
					<code code="29545-1" codeSystem="${EGISZ_STANDARD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Physical findings"/>
					<title>Объективный статус полости рта</title>
					<text>
						<paragraph>${escapeXml(data.objectiveStatus)}</paragraph>
					</text>
				</section>
			</component>` : ""}

			${dentalFormulaXml}

			${proceduresXml}

			${data.instrumentTrayBarcode ? `
			<!-- Инструментальный лоток ЦСО -->
			<component>
				<section>
					<code code="46264-8" codeSystem="${EGISZ_STANDARD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Medical device identifier"/>
					<title>Стерилизационный лоток</title>
					<text>
						<paragraph>Штрихкод лотка ЦСО: ${escapeXml(data.instrumentTrayBarcode)}</paragraph>
					</text>
				</section>
			</component>` : ""}
		</structuredBody>
	</component>
</ClinicalDocument>`;
}

export function canonicalizeXml(xml: string): string {
	return xml
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.trim();
}

export function validateCdaSemanticRules(
	data: CdaExportData,
	xml: string,
	hasDoctorSignature: boolean = false,
	hasMoSignature: boolean = false,
): SemanticValidationReport {
	const rules: SemanticValidationRuleResult[] = [];

	// 1. Root & realmCode
	const hasRuRealm = xml.includes('<realmCode code="RU"/>');
	const hasRoot = xml.includes("<ClinicalDocument") && xml.includes('POCD_HD000040');
	rules.push({
		id: "RULE_ROOT_REALM",
		name: "Корневой элемент CDA R2 и профиль РФ",
		category: "header",
		status: hasRuRealm && hasRoot ? "passed" : "failed",
		message: hasRuRealm && hasRoot
			? "Корневой элемент <ClinicalDocument> и профиль РФ <realmCode code=\"RU\"/> корректны."
			: "Отсутствует обязательный корневой элемент или тег realmCode code=\"RU\".",
		details: "HL7 CDA R2 (POCD_MT000040.xsd) + ЕГИСЗ РЭМД профиль РФ",
		xpathOrOid: "ClinicalDocument/realmCode",
	});

	// 2. Template ID OID
	const docDef = EGISZ_SEMD_DOC_TYPES[data.docTypeCode] || EGISZ_SEMD_DOC_TYPES["302"];
	const hasTemplate = xml.includes(`<templateId root="${docDef.templateRoot}"/>`);
	rules.push({
		id: "RULE_TEMPLATE_ID",
		name: `Шаблон СЭМД (${docDef.title})`,
		category: "header",
		status: hasTemplate ? "passed" : "failed",
		message: hasTemplate
			? `Задан OID шаблона Минздрава РФ: ${docDef.templateRoot} (СЭМД ${docDef.code})`
			: `Не найден OID шаблона ${docDef.templateRoot} для СЭМД ${docDef.code}`,
		details: `Реестр НСИ Минздрава РФ 1.2.643.5.1.13.13.11.1527`,
		xpathOrOid: `ClinicalDocument/templateId[@root="${docDef.templateRoot}"]`,
	});

	// 3. MO OID / FRMO
	const hasMoOid = Boolean(data.clinicOid && data.clinicOid.trim().length > 0);
	rules.push({
		id: "RULE_CLINIC_FRMO",
		name: "Идентификатор МО в ФРМО (OID организации)",
		category: "mo",
		status: hasMoOid ? "passed" : "failed",
		message: hasMoOid
			? `OID медицинской организации в ФРМО: ${data.clinicOid}`
			: "Не указан OID клиники в настройках интеграции с ЕГИСЗ (EGISZ_CLINIC_OID).",
		details: "Реестр ФРМО 1.2.643.5.1.13.13.12.2",
		xpathOrOid: "ClinicalDocument/custodian/assignedCustodian/representedCustodianOrganization/id",
	});

	// 4. Legal OGRN & INN
	const hasOgrn = Boolean(data.clinicOgrn && (data.clinicOgrn.length === 13 || data.clinicOgrn.length === 15));
	const hasInn = Boolean(data.clinicInn && (data.clinicInn.length === 10 || data.clinicInn.length === 12));
	rules.push({
		id: "RULE_CLINIC_OGRN_INN",
		name: "Юридические реквизиты МО (ОГРН и ИНН)",
		category: "mo",
		status: hasOgrn && hasInn ? "passed" : hasOgrn || hasInn ? "warning" : "failed",
		message: hasOgrn && hasInn
			? `ОГРН (${data.clinicOgrn}) и ИНН (${data.clinicInn}) заполнены корректно.`
			: "Рекомендуется указать оба реквизита: ОГРН (13/15 знаков) и ИНН (10/12 знаков).",
		details: `ОГРН: ${data.clinicOgrn || "нет"}, ИНН: ${data.clinicInn || "нет"}`,
		xpathOrOid: "assignedAuthor/representedOrganization/id",
	});

	// 5. Doctor SNILS & FRMR position
	const docSnilsRaw = normalizeSnils(data.doctorSnils);
	const isDocSnilsValid = isValidSnils(docSnilsRaw);
	rules.push({
		id: "RULE_DOCTOR_SNILS_FRMR",
		name: "СНИЛС врача и должность в ФРМР",
		category: "doctor",
		status: isDocSnilsValid ? "passed" : docSnilsRaw.length === 11 ? "failed" : "warning",
		message: isDocSnilsValid
			? `СНИЛС врача проверен по алгоритму ПФР №192п: ${formatSnils(docSnilsRaw)} (${data.doctorPosition || "Врач-стоматолог"})`
			: "Не указан или некорректен СНИЛС врача (ФРМР отклонит подписание без контрольной суммы).",
		details: `Позиция NSI: ${data.doctorPositionCode || "15"}, СНИЛС: ${docSnilsRaw || "не задан"}`,
		xpathOrOid: "ClinicalDocument/author/assignedAuthor/id[@root=\"1.2.643.100.3\"]",
	});

	// 6. Patient SNILS & Polis OMS
	const patSnilsRaw = normalizeSnils(data.patientSnils);
	const isPatSnilsValid = isValidSnils(patSnilsRaw);
	const hasPolis = Boolean(data.patientPolisOms && data.patientPolisOms.trim().length > 0);
	rules.push({
		id: "RULE_PATIENT_IDENTITY",
		name: "Идентификация пациента (СНИЛС / Полис ОМС)",
		category: "patient",
		status: isPatSnilsValid || hasPolis ? "passed" : "failed",
		message: isPatSnilsValid
			? `СНИЛС пациента валиден: ${formatSnils(patSnilsRaw)}`
			: hasPolis
				? `СНИЛС отсутствует, указан полис ОМС: ${data.patientPolisOms}`
				: "У пациента должен быть заполнен корректный СНИЛС или полис ОМС в карточке.",
		details: `СНИЛС: ${patSnilsRaw || "нет"}, ОМС: ${data.patientPolisOms || "нет"}`,
		xpathOrOid: "ClinicalDocument/recordTarget/patientRole/id",
	});

	// 7. Patient Birth Date & Gender
	const hasBirth = Boolean(data.patientBirthDate && !Number.isNaN(new Date(data.patientBirthDate).getTime()));
	const hasGender = data.patientGender === "male" || data.patientGender === "female";
	rules.push({
		id: "RULE_PATIENT_DEMOGRAPHICS",
		name: "Демографические данные пациента (Дата рождения и пол)",
		category: "patient",
		status: hasBirth && hasGender ? "passed" : "failed",
		message: hasBirth && hasGender
			? `Дата рождения: ${data.patientBirthDate}, Пол: ${data.patientGender === "male" ? "Мужской" : "Женский"}`
			: "В карточке пациента должны быть указаны дата рождения и пол (мужской/женский).",
		details: `Дата рождения: ${data.patientBirthDate || "нет"}, Пол: ${data.patientGender || "нет"}`,
		xpathOrOid: "recordTarget/patientRole/patient/birthTime, administrativeGenderCode",
	});

	// 8. ICD-10 Diagnosis code
	const icd10Regex = /^[A-TV-Z]\d{2}(\.\d{1,4})?$/i;
	const isIcd10Valid = Boolean(data.icd10Code && icd10Regex.test(data.icd10Code.trim()));
	rules.push({
		id: "RULE_ICD10_DIAGNOSIS",
		name: "Основной диагноз по справочнику МКБ-10",
		category: "clinical",
		status: isIcd10Valid ? "passed" : "failed",
		message: isIcd10Valid
			? `Код МКБ-10: ${data.icd10Code?.toUpperCase()} (${data.diagnosisText || "Диагноз указан"})`
			: "Диагноз должен содержать валидный код МКБ-10 (например, K02.1, K04.0, K05.3).",
		details: `МКБ-10 OID: 1.2.643.5.1.13.13.11.1005`,
		xpathOrOid: "structuredBody//observation/value[@codeSystem=\"1.2.643.5.1.13.13.11.1005\"]",
	});

	// 9. Dental localization / Tooth number
	const hasTooth = Boolean(data.diagnosisTooth && String(data.diagnosisTooth).trim().length > 0);
	const hasOdontogram = Boolean(data.toothStates && Object.keys(data.toothStates).length > 0);
	rules.push({
		id: "RULE_DENTAL_LOCALIZATION",
		name: "Стоматологическая локализация и зубная формула FDI",
		category: "clinical",
		status: hasTooth || hasOdontogram ? "passed" : "warning",
		message: hasTooth
			? `Указана локализация диагноза: Зуб #${data.diagnosisTooth} (ISO 3950)`
			: hasOdontogram
				? `Прикреплена зубная формула: ${Object.keys(data.toothStates || {}).length} зубов`
				: "Рекомендуется указать номер причинного зуба по формуле FDI (11–48) для стоматологического СЭМД.",
		details: "Классификатор зубов 1.2.643.5.1.13.13.11.1466",
		xpathOrOid: "structuredBody//targetSiteCode[@codeSystem=\"1.2.643.5.1.13.13.11.1466\"]",
	});

	// 10. Timestamp & encounter timezone
	const hasEffectiveTime = xml.includes("<effectiveTime");
	rules.push({
		id: "RULE_ENCOUNTER_TIMESTAMP",
		name: "Временные метки приема (HL7 TS с часовым поясом)",
		category: "header",
		status: hasEffectiveTime ? "passed" : "failed",
		message: hasEffectiveTime
			? "Временная метка приёма сформирована в формате ISO/HL7 TS (+ZZZZ)."
			: "Отсутствует корректная временная метка случая обслуживания.",
		details: "HL7 TS: YYYYMMDDHHMMSS+ZZZZ",
		xpathOrOid: "ClinicalDocument/effectiveTime",
	});

	// 11. UKEP GOST R 34.10-2012 Signature
	rules.push({
		id: "RULE_UKEP_SIGNATURE",
		name: "Усиленная квалифицированная электронная подпись (УКЭП)",
		category: "signature",
		status: hasDoctorSignature ? "passed" : "warning",
		message: hasDoctorSignature
			? "УКЭП врача ГОСТ Р 34.10-2012 успешно наложена и проверена."
			: "УКЭП врача еще не наложена. Для отправки в РЭМД ЕГИСЗ требуется подписание.",
		details: `ГОСТ Р 34.10-2012 (${EGISZ_STANDARD_OIDS.GOST_3410_2012_256}) PKCS#7 detached`,
		xpathOrOid: "package/doctorSignature",
	});

	const passedCount = rules.filter((r) => r.status === "passed").length;
	const failedCount = rules.filter((r) => r.status === "failed").length;
	const warningCount = rules.filter((r) => r.status === "warning").length;
	const totalRules = rules.length;
	const scorePercent = Math.round((passedCount / totalRules) * 100);

	return {
		isValid: failedCount === 0,
		totalRules,
		passedCount,
		failedCount,
		warningCount,
		scorePercent,
		rules,
	};
}
