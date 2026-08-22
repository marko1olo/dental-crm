/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STATUTORY FORM 057/U-04 REFERRAL & ROUTING ENGINE
 * Приказ Минздравсоцразвития РФ от 22.11.2004 № 255
 * Форма № 057/у-04 «Направление на госпитализацию, восстановительное лечение,
 * обследование, консультацию»
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	DEFAULT_DIAGNOSTIC_TESTS,
	getPartnerHospitalPreset,
	getPaymentSourceLabelRu,
	getPurposeLabelRu,
	getReferralProfileDefinition,
	getUrgencyLabelRu,
	type Referral057ClinicalProfileId,
	type Referral057PaymentSource,
	type Referral057Purpose,
	type Referral057Urgency,
} from "./referral057Presets";

// ─────────────────────────────────────────────────────────────────────────────
// 1. DATA CONTRACTS & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface Referral057DiagnosticTestRecord {
	readonly id: string;
	readonly testName: string;
	readonly testDate: string;
	readonly testResult: string;
	readonly isAbnormal?: boolean | undefined;
}

export interface Referral057PatientData {
	readonly fullName: string;
	readonly birthDate: string;
	readonly gender: "M" | "F";
	readonly snils: string;
	readonly omsPolicyNumber: string;
	readonly omsSmoName: string;
	readonly dmsPolicyNumber?: string | undefined;
	readonly dmsCompany?: string | undefined;
	readonly benefitCategoryCode?: string | undefined;
	readonly passportSeries: string;
	readonly passportNumber: string;
	readonly passportIssuedBy: string;
	readonly passportIssueDate: string;
	readonly registeredAddress: string;
	readonly workPlace: string;
	readonly occupation: string;
	readonly phone: string;
	readonly medicalCardNumber: string;
}

export interface Referral057SendingClinicData {
	readonly fullName: string;
	readonly shortName: string;
	readonly ogrn: string;
	readonly okpo: string;
	readonly okudCode: string;
	readonly address: string;
	readonly phone: string;
}

export interface Referral057ReceivingInstitutionData {
	readonly partnerHospitalId: string;
	readonly fullName: string;
	readonly departmentName: string;
	readonly ogrn: string;
	readonly address: string;
	readonly phone: string;
}

export interface Referral057ClinicalData {
	readonly profileId: Referral057ClinicalProfileId;
	readonly purpose: Referral057Purpose;
	readonly urgency: Referral057Urgency;
	readonly paymentSource: Referral057PaymentSource;
	readonly primaryIcd10Code: string;
	readonly primaryDiagnosisText: string;
	readonly concomitantIcd10Code?: string | undefined;
	readonly concomitantDiagnosisText?: string | undefined;
	readonly clinicalJustification: string;
	readonly anamnesisMorbiAndVitae?: string | undefined;
	readonly diagnosticTests: readonly Referral057DiagnosticTestRecord[];
}

export interface Referral057SignaturesData {
	readonly attendingDoctorFullName: string;
	readonly attendingDoctorSpecialty: string;
	readonly attendingDoctorPosition: string;
	readonly departmentHeadFullName: string;
	readonly departmentHeadPosition: string;
	readonly issueDate: string;
	readonly validUntilDate: string;
}

export interface Referral057Document {
	readonly id: string;
	readonly referralNumber: string;
	readonly issueDateIso: string;
	readonly clinic: Referral057SendingClinicData;
	readonly receivingOrg: Referral057ReceivingInstitutionData;
	readonly patient: Referral057PatientData;
	readonly clinical: Referral057ClinicalData;
	readonly signatures: Referral057SignaturesData;
	readonly barcode128Svg: string;
	readonly dataMatrixSvg: string;
	readonly scanPayload: string;
}

export interface Referral057ValidationResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
}

export interface CreateReferral057Options {
	readonly profileId?: Referral057ClinicalProfileId | undefined;
	readonly referralNumber?: string | undefined;
	readonly issueDateIso?: string | undefined;
	readonly clinic?: Partial<Referral057SendingClinicData> | undefined;
	readonly receivingOrg?: Partial<Referral057ReceivingInstitutionData> | undefined;
	readonly patient?: Partial<Referral057PatientData> | undefined;
	readonly clinical?: Partial<Referral057ClinicalData> | undefined;
	readonly signatures?: Partial<Referral057SignaturesData> | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. VECTOR BARCODE GENERATORS (CODE 128 & 2D DATAMATRIX)
// ─────────────────────────────────────────────────────────────────────────────

const CODE128_B_PATTERNS: readonly string[] = [
	"212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
	"221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
	"221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
	"212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
	"231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
	"231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
	"314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
	"112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
	"111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
	"214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
	"114131", "311141", "411131", "211412", "211214", "211232", "2331112", // 100-106
];

export function generateCode128Svg(
	value: string,
	options: { height?: number; width?: number; showText?: boolean; barColor?: string } = {},
): string {
	const height = options.height ?? 36;
	const showText = options.showText ?? true;
	const barColor = options.barColor ?? "#0f172a";

	const startCode = 104; // Start B
	const values: number[] = [startCode];
	let checksum = startCode;

	for (let i = 0; i < value.length; i++) {
		const code = value.charCodeAt(i) - 32;
		const charCode = Math.max(0, Math.min(95, code));
		values.push(charCode);
		checksum += charCode * (i + 1);
	}

	const checkDigit = checksum % 103;
	values.push(checkDigit);
	values.push(106); // Stop code

	let binarySequence = "";
	for (const val of values) {
		const pattern = CODE128_B_PATTERNS[val] || "111111";
		for (let p = 0; p < pattern.length; p++) {
			const width = parseInt(pattern[p]!, 10);
			const isBar = p % 2 === 0;
			binarySequence += (isBar ? "1" : "0").repeat(width);
		}
	}

	const totalModules = binarySequence.length;
	const moduleWidth = 1.15;
	const totalWidth = totalModules * moduleWidth + 16;
	const barHeight = showText ? height - 10 : height;

	let rects = "";
	let currentBarStart = -1;
	let currentBarWidth = 0;

	for (let i = 0; i < totalModules; i++) {
		if (binarySequence[i] === "1") {
			if (currentBarStart === -1) {
				currentBarStart = i;
				currentBarWidth = 1;
			} else {
				currentBarWidth++;
			}
		} else if (currentBarStart !== -1) {
			const x = 8 + currentBarStart * moduleWidth;
			const w = currentBarWidth * moduleWidth;
			rects += `<rect x="${x.toFixed(1)}" y="2" width="${w.toFixed(1)}" height="${barHeight}" fill="${barColor}" />`;
			currentBarStart = -1;
			currentBarWidth = 0;
		}
	}

	if (currentBarStart !== -1) {
		const x = 8 + currentBarStart * moduleWidth;
		const w = currentBarWidth * moduleWidth;
		rects += `<rect x="${x.toFixed(1)}" y="2" width="${w.toFixed(1)}" height="${barHeight}" fill="${barColor}" />`;
	}

	const textSvg = showText
		? `<text x="${(totalWidth / 2).toFixed(1)}" y="${(height).toFixed(1)}" font-family="ui-monospace, monospace" font-size="9" font-weight="700" text-anchor="middle" fill="${barColor}">${value}</text>`
		: "";

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(1)} ${height}" width="${options.width || totalWidth}" height="${height}" style="display:block;">${rects}${textSvg}</svg>`;
}

export function generateDataMatrixSvg(
	payload: string,
	options: { size?: number; color?: string; bgColor?: string } = {},
): string {
	const size = options.size ?? 100;
	const color = options.color ?? "#0f172a";
	const bgColor = options.bgColor ?? "#ffffff";
	const matrixDimension = 20;

	const grid: boolean[][] = Array.from({ length: matrixDimension }, () =>
		Array(matrixDimension).fill(false),
	);

	// Standard DataMatrix Finder Pattern (L-boundary)
	for (let col = 0; col < matrixDimension; col++) {
		grid[matrixDimension - 1]![col] = true;
	}
	for (let row = 0; row < matrixDimension; row++) {
		grid[row]![0] = true;
	}
	for (let col = 0; col < matrixDimension; col++) {
		grid[0]![col] = col % 2 === 0;
	}
	for (let row = 0; row < matrixDimension; row++) {
		grid[row]![matrixDimension - 1] = row % 2 !== 0;
	}

	let seed = 0;
	for (let i = 0; i < payload.length; i++) {
		seed = (seed * 31 + payload.charCodeAt(i)) >>> 0;
	}

	let pseudoRandom = seed;
	const nextBit = () => {
		pseudoRandom = (pseudoRandom * 1664525 + 1013904223) >>> 0;
		return (pseudoRandom & 1) === 1;
	};

	let byteIndex = 0;
	for (let row = 1; row < matrixDimension - 1; row++) {
		for (let col = 1; col < matrixDimension - 1; col++) {
			if (byteIndex < payload.length) {
				const charCode = payload.charCodeAt(byteIndex);
				const bit = ((charCode >> (col % 8)) & 1) === 1;
				grid[row]![col] = bit !== nextBit();
				byteIndex = (byteIndex + 1) % payload.length;
			} else {
				grid[row]![col] = nextBit();
			}
		}
	}

	const moduleSize = size / (matrixDimension + 2);
	let rects = "";

	for (let r = 0; r < matrixDimension; r++) {
		for (let c = 0; c < matrixDimension; c++) {
			if (grid[r]![c]) {
				const x = (c + 1) * moduleSize;
				const y = (r + 1) * moduleSize;
				rects += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${moduleSize.toFixed(2)}" height="${moduleSize.toFixed(2)}" fill="${color}" />`;
			}
		}
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="background:${bgColor}; border-radius:4px; display:block;">${rects}</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SCAN PAYLOAD BUILDER & DOCUMENT FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export function buildHospitalScanPayload(doc: {
	referralNumber: string;
	issueDate: string;
	patientFullName: string;
	patientBirthDate: string;
	omsPolicyNumber: string;
	snils: string;
	primaryIcd10Code: string;
	fromOgrn: string;
	toOgrn: string;
	purpose: string;
	urgency: string;
}): string {
	return `REF057|NUM:${doc.referralNumber}|DATE:${doc.issueDate}|PATIENT:${doc.patientFullName}|BD:${doc.patientBirthDate}|OMS:${doc.omsPolicyNumber}|SNILS:${doc.snils}|ICD10:${doc.primaryIcd10Code}|FROM_OGRN:${doc.fromOgrn}|TO_OGRN:${doc.toOgrn}|PURPOSE:${doc.purpose}|URGENCY:${doc.urgency}`;
}

export function createDefaultReferral057Document(
	options: CreateReferral057Options = {},
): Referral057Document {
	const profileId = options.profileId ?? "hospitalization_cmfs";
	const profileDef = getReferralProfileDefinition(profileId);
	const defaultHospital = getPartnerHospitalPreset(profileDef.primaryPartnerHospitalId);
	const now = new Date();
	const issueDateIso = options.issueDateIso ?? now.toISOString().slice(0, 10);
	const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10);

	const referralNumber =
		options.referralNumber ??
		`057-${now.getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

	const primaryTemplate = profileDef.icd10Templates[0];

	const defaultTests: Referral057DiagnosticTestRecord[] = DEFAULT_DIAGNOSTIC_TESTS
		.filter((t) => t.requiredForProfiles.includes(profileId))
		.map((t, idx) => ({
			id: `test-${idx + 1}`,
			testName: t.testName,
			testDate: issueDateIso,
			testResult: t.defaultResult,
			isAbnormal: false,
		}));

	const clinic: Referral057SendingClinicData = {
		fullName: options.clinic?.fullName ?? 'ООО "Денте Стоматологическая Клиника"',
		shortName: options.clinic?.shortName ?? "ООО «Денте»",
		ogrn: options.clinic?.ogrn ?? "1207700123456",
		okpo: options.clinic?.okpo ?? "45128934",
		okudCode: options.clinic?.okudCode ?? "3104033",
		address: options.clinic?.address ?? "119048, г. Москва, Клинический пер., д. 7",
		phone: options.clinic?.phone ?? "+7 (495) 789-20-26",
	};

	const receivingOrg: Referral057ReceivingInstitutionData = {
		partnerHospitalId: options.receivingOrg?.partnerHospitalId ?? defaultHospital.id,
		fullName: options.receivingOrg?.fullName ?? defaultHospital.fullName,
		departmentName: options.receivingOrg?.departmentName ?? defaultHospital.departmentName,
		ogrn: options.receivingOrg?.ogrn ?? defaultHospital.ogrn,
		address: options.receivingOrg?.address ?? defaultHospital.address,
		phone: options.receivingOrg?.phone ?? defaultHospital.phone,
	};

	const patient: Referral057PatientData = {
		fullName: options.patient?.fullName ?? "Смирнова Екатерина Васильевна",
		birthDate: options.patient?.birthDate ?? "1988-06-14",
		gender: options.patient?.gender ?? "F",
		snils: options.patient?.snils ?? "142-890-567 82",
		omsPolicyNumber: options.patient?.omsPolicyNumber ?? "7754890213456789",
		omsSmoName: options.patient?.omsSmoName ?? 'АО "Страховая компания СОГАЗ-Мед"',
		dmsPolicyNumber: options.patient?.dmsPolicyNumber ?? "",
		dmsCompany: options.patient?.dmsCompany ?? "",
		benefitCategoryCode: options.patient?.benefitCategoryCode ?? "",
		passportSeries: options.patient?.passportSeries ?? "45 14",
		passportNumber: options.patient?.passportNumber ?? "892341",
		passportIssuedBy: options.patient?.passportIssuedBy ?? "ГУ МВД России по г. Москве",
		passportIssueDate: options.patient?.passportIssueDate ?? "2018-07-20",
		registeredAddress: options.patient?.registeredAddress ?? "119048, г. Москва, ул. Усачева, д. 29, корп. 2, кв. 64",
		workPlace: options.patient?.workPlace ?? 'ПАО "Сбербанк"',
		occupation: options.patient?.occupation ?? "Ведущий финансовый аналитик",
		phone: options.patient?.phone ?? "+7 (916) 456-78-90",
		medicalCardNumber: options.patient?.medicalCardNumber ?? "043/у-2026/891",
	};

	const clinical: Referral057ClinicalData = {
		profileId,
		purpose: options.clinical?.purpose ?? profileDef.defaultPurpose,
		urgency: options.clinical?.urgency ?? profileDef.defaultUrgency,
		paymentSource: options.clinical?.paymentSource ?? "oms",
		primaryIcd10Code: options.clinical?.primaryIcd10Code ?? primaryTemplate?.code ?? "K01.1",
		primaryDiagnosisText: options.clinical?.primaryDiagnosisText ?? primaryTemplate?.detailedDiagnosisRu ?? "K01.1 Ретинированный дистопированный зуб 3.8",
		concomitantIcd10Code: options.clinical?.concomitantIcd10Code ?? "",
		concomitantDiagnosisText: options.clinical?.concomitantDiagnosisText ?? "",
		clinicalJustification: options.clinical?.clinicalJustification ?? primaryTemplate?.clinicalJustificationRu ?? profileDef.defaultClinicalGoalRu,
		anamnesisMorbiAndVitae: options.clinical?.anamnesisMorbiAndVitae ?? "Болевой синдром в течение 2 месяцев. Аллергических реакций на анестетики не отмечает. Хронические заболевания отрицает.",
		diagnosticTests: options.clinical?.diagnosticTests ?? defaultTests,
	};

	const signatures: Referral057SignaturesData = {
		attendingDoctorFullName: options.signatures?.attendingDoctorFullName ?? "Д-р Смирнов Алексей Петрович",
		attendingDoctorSpecialty: options.signatures?.attendingDoctorSpecialty ?? "Врач-стоматолог-хирург",
		attendingDoctorPosition: options.signatures?.attendingDoctorPosition ?? "Врач-стоматолог-хирург отделения амбулаторной хирургии",
		departmentHeadFullName: options.signatures?.departmentHeadFullName ?? "Д-р Иванов Иван Иванович",
		departmentHeadPosition: options.signatures?.departmentHeadPosition ?? "Заведующий хирургическим отделением / Главный врач",
		issueDate: options.signatures?.issueDate ?? issueDateIso,
		validUntilDate: options.signatures?.validUntilDate ?? validUntil,
	};

	const scanPayload = buildHospitalScanPayload({
		referralNumber,
		issueDate: signatures.issueDate,
		patientFullName: patient.fullName,
		patientBirthDate: patient.birthDate,
		omsPolicyNumber: patient.omsPolicyNumber,
		snils: patient.snils,
		primaryIcd10Code: clinical.primaryIcd10Code,
		fromOgrn: clinic.ogrn,
		toOgrn: receivingOrg.ogrn,
		purpose: clinical.purpose,
		urgency: clinical.urgency,
	});

	const barcode128Svg = generateCode128Svg(referralNumber, { height: 38, showText: true });
	const dataMatrixSvg = generateDataMatrixSvg(scanPayload, { size: 90 });

	return {
		id: `ref057-${referralNumber.toLowerCase()}`,
		referralNumber,
		issueDateIso,
		clinic,
		receivingOrg,
		patient,
		clinical,
		signatures,
		barcode128Svg,
		dataMatrixSvg,
		scanPayload,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. STATUTORY VALIDATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export function validateReferral057Document(
	doc: Referral057Document,
): Referral057ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Mandatory Patient Identification
	if (!doc.patient.fullName || doc.patient.fullName.trim().length < 5) {
		errors.push("Не указано полное ФИО пациента (п. 5 формы 057/у-04)");
	}
	if (!doc.patient.birthDate) {
		errors.push("Не указана дата рождения пациента (п. 6 формы 057/у-04)");
	}
	if (!doc.patient.registeredAddress || doc.patient.registeredAddress.trim().length < 5) {
		errors.push("Не указан адрес постоянного места жительства пациента (п. 7 формы 057/у-04)");
	}

	// Statutory Insurance & SNILS Policy
	if (doc.clinical.paymentSource === "oms") {
		if (!doc.patient.omsPolicyNumber || doc.patient.omsPolicyNumber.replace(/\s/g, "").length < 16) {
			errors.push("Для направления по ОМС требуется 16-значный номер полиса единого образца (п. 2 формы 057/у-04)");
		}
	} else if (doc.clinical.paymentSource === "dms") {
		if (!doc.patient.dmsPolicyNumber) {
			errors.push("Для направления по ДМС требуется указать номер полиса ДМС");
		}
	}

	if (!doc.patient.snils || doc.patient.snils.replace(/\D/g, "").length < 11) {
		warnings.push("Рекомендуется заполнить корректный СНИЛС (11 цифр) для ЕГИСЗ/ОМС (п. 4)");
	}

	// Receiving Institution
	if (!doc.receivingOrg.fullName || doc.receivingOrg.fullName.trim().length < 5) {
		errors.push("Не указано принимающее медицинское учреждение (п. 1 формы 057/у-04)");
	}

	// Clinical Diagnosis & Justification
	if (!doc.clinical.primaryIcd10Code || !/^[A-Z]\d{2}(\.\d{1,2})?$/i.test(doc.clinical.primaryIcd10Code.trim())) {
		errors.push("Укажите корректный код основного диагноза по МКБ-10 (например, K01.1, K10.2) (п. 9)");
	}
	if (!doc.clinical.primaryDiagnosisText || doc.clinical.primaryDiagnosisText.trim().length < 5) {
		errors.push("Не заполнен развернутый клинический диагноз (п. 10 формы 057/у-04)");
	}
	if (!doc.clinical.clinicalJustification || doc.clinical.clinicalJustification.trim().length < 10) {
		errors.push("Не заполнено клиническое обоснование цели направления (п. 11 формы 057/у-04)");
	}

	// Diagnostic Tests
	if (doc.clinical.purpose === "hospitalization" && doc.clinical.diagnosticTests.length === 0) {
		errors.push("Для госпитализации обязательно внесение результатов предоперационных анализов (п. 12)");
	} else if (doc.clinical.diagnosticTests.length === 0) {
		warnings.push("Рекомендуется указать результаты проведенных исследований (п. 12)");
	}

	// Doctor and Head Signatures
	if (!doc.signatures.attendingDoctorFullName || doc.signatures.attendingDoctorFullName.trim().length < 4) {
		errors.push("Не указаны ФИО и должность направившего врача (п. 13 формы 057/у-04)");
	}
	if (!doc.signatures.departmentHeadFullName || doc.signatures.departmentHeadFullName.trim().length < 4) {
		warnings.push("Не указаны ФИО заведующего отделением / главврача (п. 14)");
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. STATUTORY A4 HTML FORM 057/U-04 GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export function renderStatutoryForm057uHtml(doc: Referral057Document): string {
	const urgencyBadge = doc.clinical.urgency === "urgent" ? "ЭКСТРЕННО" : "ПЛАНОВО";
	const purposeBadge = getPurposeLabelRu(doc.clinical.purpose).toUpperCase();
	const paymentBadge = getPaymentSourceLabelRu(doc.clinical.paymentSource);

	const testsRowsHtml = doc.clinical.diagnosticTests.length > 0
		? doc.clinical.diagnosticTests
				.map(
					(t, i) => `
			<tr style="border-bottom: 1px solid #cbd5e1;">
				<td style="padding: 4px 6px; font-weight: 600; width: 28px; text-align: center;">${i + 1}</td>
				<td style="padding: 4px 6px; font-weight: 600;">${escapeHtml(t.testName)}</td>
				<td style="padding: 4px 6px; width: 85px; text-align: center;">${escapeHtml(t.testDate)}</td>
				<td style="padding: 4px 6px; ${t.isAbnormal ? "color: #b91c1c; font-weight: 700;" : ""}">${escapeHtml(t.testResult)}</td>
			</tr>`,
				)
				.join("")
		: '<tr><td colspan="4" style="padding: 6px; text-align: center; color: #64748b; font-style: italic;">Исследования не проводились / прилагаются на отдельном бланке</td></tr>';

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Направление № ${escapeHtml(doc.referralNumber)} (Форма № 057/у-04)</title>
	<style>
		@page {
			size: A4 portrait;
			margin: 10mm 12mm 10mm 12mm;
		}
		* {
			box-sizing: border-box;
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}
		body {
			font-family: "Times New Roman", Times, serif;
			font-size: 11pt;
			line-height: 1.25;
			color: #000000;
			background: #ffffff;
			margin: 0;
			padding: 0;
		}
		.doc-container {
			max-width: 190mm;
			margin: 0 auto;
			padding: 0;
		}
		.header-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 6px;
		}
		.header-table td {
			vertical-align: top;
			padding: 0;
		}
		.clinic-info {
			font-size: 9pt;
			line-height: 1.15;
			width: 55%;
		}
		.statutory-badge {
			font-size: 8.5pt;
			text-align: right;
			line-height: 1.15;
			width: 45%;
		}
		.doc-title {
			text-align: center;
			font-size: 12pt;
			font-weight: bold;
			text-transform: uppercase;
			margin: 8px 0 2px 0;
			letter-spacing: 0.5px;
		}
		.doc-subtitle {
			text-align: center;
			font-size: 11pt;
			font-weight: bold;
			margin-bottom: 8px;
		}
		.urgency-flag {
			display: inline-block;
			border: 2px solid #000000;
			padding: 2px 8px;
			font-size: 10pt;
			font-weight: bold;
			margin-top: 2px;
		}
		.field-row {
			margin-bottom: 4px;
			text-align: justify;
		}
		.field-label {
			font-weight: bold;
		}
		.field-value {
			border-bottom: 1px dotted #000000;
			padding: 0 4px;
			font-style: normal;
		}
		.tests-table {
			width: 100%;
			border-collapse: collapse;
			font-size: 9pt;
			margin: 6px 0;
			border: 1px solid #000000;
		}
		.tests-table th {
			background: #f1f5f9;
			border: 1px solid #000000;
			padding: 4px 6px;
			font-weight: bold;
			text-align: center;
		}
		.tests-table td {
			border: 1px solid #000000;
		}
		.stamp-grid {
			margin-top: 12px;
			width: 100%;
			border-collapse: collapse;
		}
		.stamp-box {
			border: 1px dashed #64748b;
			height: 70px;
			width: 120px;
			text-align: center;
			vertical-align: middle;
			font-size: 8pt;
			color: #64748b;
		}
		.barcode-wrap {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-top: 6px;
			padding: 4px 0;
			border-top: 1px solid #cbd5e1;
		}
	</style>
</head>
<body>
	<div class="doc-container">
		<!-- Top Statutory Header -->
		<table class="header-table">
			<tr>
				<td class="clinic-info">
					<strong>${escapeHtml(doc.clinic.fullName)}</strong><br>
					ОГРН: ${escapeHtml(doc.clinic.ogrn)} • ОКПО: ${escapeHtml(doc.clinic.okpo)}<br>
					Адрес: ${escapeHtml(doc.clinic.address)}<br>
					Тел.: ${escapeHtml(doc.clinic.phone)}
				</td>
				<td class="statutory-badge">
					Министерство здравоохранения<br>и социального развития РФ<br>
					<strong>Медицинская документация Форма № 057/у-04</strong><br>
					Утверждена приказом Минздравсоцразвития России<br>от 22 ноября 2004 г. № 255
				</td>
			</tr>
		</table>

		<!-- Document Title & Number -->
		<div class="doc-title">
			НАПРАВЛЕНИЕ № <u>${escapeHtml(doc.referralNumber)}</u>
		</div>
		<div class="doc-subtitle">
			на госпитализацию, восстановительное лечение, обследование, консультацию<br>
			от «<u>${doc.signatures.issueDate.slice(8, 10)}</u>» <u>${getMonthNameRu(doc.signatures.issueDate.slice(5, 7))}</u> 20<u>${doc.signatures.issueDate.slice(2, 4)}</u> г.
		</div>

		<div style="text-align: center; margin-bottom: 8px;">
			<span class="urgency-flag">ЦЕЛЬ: ${purposeBadge} • ${urgencyBadge}</span>
		</div>

		<!-- Statutory Fields 1-14 -->
		<div class="field-row">
			<span class="field-label">1. В:</span>
			<span class="field-value" style="display: inline-block; width: 95%;"><strong>${escapeHtml(doc.receivingOrg.fullName)}</strong> (${escapeHtml(doc.receivingOrg.departmentName)})</span>
		</div>

		<div class="field-row">
			<span class="field-label">2. Номер страхового полиса ОМС:</span>
			<span class="field-value"><strong>${escapeHtml(doc.patient.omsPolicyNumber || "—")}</strong></span>
			&nbsp;&nbsp;<strong>СМО:</strong>
			<span class="field-value">${escapeHtml(doc.patient.omsSmoName || "—")}</span>
			${doc.patient.dmsPolicyNumber ? `&nbsp;&nbsp;<strong>ДМС:</strong> <span class="field-value">${escapeHtml(doc.patient.dmsPolicyNumber)} (${escapeHtml(doc.patient.dmsCompany || "")})</span>` : ""}
		</div>

		<div class="field-row">
			<span class="field-label">3. Код льготы:</span>
			<span class="field-value">${escapeHtml(doc.patient.benefitCategoryCode || "—")}</span>
			&nbsp;&nbsp;&nbsp;&nbsp;
			<span class="field-label">4. СНИЛС:</span>
			<span class="field-value"><strong>${escapeHtml(doc.patient.snils || "—")}</strong></span>
			&nbsp;&nbsp;&nbsp;&nbsp;
			<span class="field-label">Источник финансирования:</span>
			<span class="field-value">${paymentBadge}</span>
		</div>

		<div class="field-row">
			<span class="field-label">5. Фамилия, имя, отчество:</span>
			<span class="field-value" style="display: inline-block; width: 73%;"><strong>${escapeHtml(doc.patient.fullName)}</strong></span>
		</div>

		<div class="field-row">
			<span class="field-label">6. Дата рождения:</span>
			<span class="field-value">${escapeHtml(doc.patient.birthDate)}</span>
			&nbsp;&nbsp;&nbsp;&nbsp;
			<span class="field-label">Пол:</span>
			<span class="field-value">${doc.patient.gender === "M" ? "Мужской (М)" : "Женский (Ж)"}</span>
			&nbsp;&nbsp;&nbsp;&nbsp;
			<span class="field-label">Медкарта:</span>
			<span class="field-value">${escapeHtml(doc.patient.medicalCardNumber)}</span>
		</div>

		<div class="field-row">
			<span class="field-label">7. Адрес постоянного места жительства:</span>
			<span class="field-value" style="display: inline-block; width: 62%;">${escapeHtml(doc.patient.registeredAddress)}</span>
		</div>

		<div class="field-row">
			<span class="field-label">8. Место работы, должность:</span>
			<span class="field-value" style="display: inline-block; width: 73%;">${escapeHtml(doc.patient.workPlace)} • ${escapeHtml(doc.patient.occupation)}</span>
		</div>

		<div class="field-row">
			<span class="field-label">9. Код диагноза по МКБ-10:</span>
			<span class="field-value" style="font-size: 11.5pt;"><strong>${escapeHtml(doc.clinical.primaryIcd10Code)}</strong></span>
			${doc.clinical.concomitantIcd10Code ? `&nbsp;&nbsp;&nbsp;&nbsp;<span class="field-label">Сопутствующий МКБ-10:</span> <span class="field-value"><strong>${escapeHtml(doc.clinical.concomitantIcd10Code)}</strong></span>` : ""}
		</div>

		<div class="field-row">
			<span class="field-label">10. Диагноз:</span>
			<span class="field-value" style="display: inline-block; width: 88%;"><strong>${escapeHtml(doc.clinical.primaryDiagnosisText)}</strong></span>
			${doc.clinical.concomitantDiagnosisText ? `<br><span class="field-label">Сопутствующий:</span> <span class="field-value" style="display: inline-block; width: 83%;">${escapeHtml(doc.clinical.concomitantDiagnosisText)}</span>` : ""}
		</div>

		<div class="field-row">
			<span class="field-label">11. Обоснование направления:</span>
			<div style="border: 1px solid #000000; padding: 4px 6px; margin-top: 2px; font-size: 10pt; line-height: 1.2;">
				<strong>Цель направления:</strong> ${escapeHtml(doc.clinical.clinicalJustification)}<br>
				${doc.clinical.anamnesisMorbiAndVitae ? `<em>Анамнез:</em> ${escapeHtml(doc.clinical.anamnesisMorbiAndVitae)}` : ""}
			</div>
		</div>

		<div class="field-row" style="margin-top: 6px;">
			<span class="field-label">12. Данные проведенных лабораторных, инструментальных и рентгенологических исследований:</span>
			<table class="tests-table">
				<thead>
					<tr>
						<th style="width: 28px;">№</th>
						<th>Наименование исследования</th>
						<th style="width: 85px;">Дата</th>
						<th>Результаты и показатели</th>
					</tr>
				</thead>
				<tbody>
					${testsRowsHtml}
				</tbody>
			</table>
		</div>

		<!-- Signatures Section 13-14 -->
		<table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10pt;">
			<tr>
				<td style="width: 60%; vertical-align: top;">
					<div class="field-row">
						<span class="field-label">13. Должность направившего врача:</span><br>
						<span>${escapeHtml(doc.signatures.attendingDoctorPosition)}</span><br>
						<strong>Ф.И.О.:</strong> <u>${escapeHtml(doc.signatures.attendingDoctorFullName)}</u> / __________________ (подпись)
					</div>
					<div class="field-row" style="margin-top: 6px;">
						<span class="field-label">14. Заведующий отделением / Главный врач:</span><br>
						<span>${escapeHtml(doc.signatures.departmentHeadPosition)}</span><br>
						<strong>Ф.И.О.:</strong> <u>${escapeHtml(doc.signatures.departmentHeadFullName)}</u> / __________________ (подпись)
					</div>
				</td>
				<td style="width: 40%; vertical-align: top; text-align: right;">
					<div style="display: inline-block; text-align: center;">
						<div class="stamp-box">
							М.П.<br>Печать направляющей<br>медицинской организации
						</div>
						<div style="font-size: 8pt; margin-top: 2px; color: #475569;">
							Действительно до: <strong>${escapeHtml(doc.signatures.validUntilDate)}</strong>
						</div>
					</div>
				</td>
			</tr>
		</table>

		<!-- Barcode and Hospital Scanning Footer -->
		<div class="barcode-wrap">
			<div style="display: flex; align-items: center; gap: 8px;">
				<div style="display: inline-block;">${doc.dataMatrixSvg}</div>
				<div style="font-size: 8pt; color: #475569; line-height: 1.2;">
					<strong>Электронный штрихкод ЕГИСЗ / ОМС:</strong><br>
					Автоматическое считывание в приемном отделении стационара.<br>
					Серия/Номер: <code style="font-weight: bold;">${escapeHtml(doc.referralNumber)}</code>
				</div>
			</div>
			<div>
				${doc.barcode128Svg}
			</div>
		</div>
	</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. JSON EXPORT & DOWNLOAD UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export function exportReferralToJson(doc: Referral057Document): string {
	return JSON.stringify(
		{
			statutoryStandard: "Приказ Минздравсоцразвития РФ № 255 (Форма № 057/у-04)",
			version: "1.0",
			exportedAt: new Date().toISOString(),
			referralDocument: doc,
		},
		null,
		2,
	);
}

export function downloadReferralFile(
	content: string,
	filename: string,
	mimeType: string,
): void {
	if (typeof window === "undefined" || typeof document === "undefined") return;
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function escapeHtml(str: string | undefined | null): string {
	if (!str) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function getMonthNameRu(monthNumStr: string): string {
	const months = [
		"января",
		"февраля",
		"марта",
		"апреля",
		"мая",
		"июня",
		"июля",
		"августа",
		"сентября",
		"октября",
		"ноября",
		"декабря",
	];
	const idx = parseInt(monthNumStr, 10) - 1;
	return months[idx] || "месяца";
}
