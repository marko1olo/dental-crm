/**
 * Line classification and clinic profile extraction rules for smart imports.
 */
import type {
  SmartImportLineClassification,
  SmartImportMode,
  SmartImportClinicProfileSuggestion,
  UpdateClinicProfileInput
} from "@dental/shared";
import {
  patientKeywordPattern,
  imagePathPattern,
  imagingKeywordPattern,
  legacySourceKeywordPattern,
  legacySourceSupplementalKeywordPattern,
  legacyMisTextPattern,
  legacyDatabasePathPattern,
  imagingSourceFolderPattern,
  clinicKeywordPattern,
  headerOnlyPattern,
  imagingVendorPattern,
  imagingVendorSupplementalPattern
} from "./smartImportsConstants.js";

export function clampConfidence(value: number) {
	return Math.max(0, Math.min(0.99, Number(value.toFixed(2))));
}

export function hasPhone(value: string) {
	return /(?:\+7|7|8)?[\s(.-]*\d{3}[\s). -]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/.test(
		value,
	);
}

export function extractPhone(value: string) {
	const match = value.match(
		/(?:\+7|7|8)?[\s(.-]*\d{3}[\s). -]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/,
	);
	if (!match) return null;
	const digits = match[0].replace(/\D/g, "");
	if (digits.length === 10) return `+7${digits}`;
	if (digits.length === 11 && digits.startsWith("8"))
		return `+7${digits.slice(1)}`;
	if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
	return match[0].trim();
}

export function hasDate(value: string) {
	return /\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/.test(value);
}

export function hasLikelyName(value: string) {
	const words = value
		.split(/[;,\t| ]+/)
		.filter((part) => /^[A-Za-zА-Яа-яЁё-]{2,}$/.test(part));
	return words.length >= 2;
}

export function hasPatientIdentityCue(value: string) {
	return /пациент|patient|клиент|client|фио|full\s*name|дата рождения|д\.р\.|dob|birth/i.test(
		value,
	);
}

export function hasRequisites(value: string) {
	return /\b(?:\d{10}|\d{12}|\d{13}|\d{15})\b/.test(value);
}

export type ClassificationCategory =
	| "imagingScore"
	| "patientScore"
	| "clinicScore"
	| "legacySourceScore";

export interface ClassificationContext {
	hasImagingPathForScoring: boolean;
	hasImagingKeyword: boolean;
	hasClinicLicenseKeyword: boolean;
	hasClinicLegalEntity: boolean;
	hasLegacyDatabasePath: boolean;
	hasLegacySourceKeyword: boolean;
	hasLegacyMisName: boolean;
	hasSmartPreviewSourceRef: boolean;
	hasImagingSourceFolder: boolean;
	hasImagingVendor: boolean;
}

export interface ClassificationRule {
	category: ClassificationCategory;
	score: number;
	reason: string;
	condition: (text: string, ctx: ClassificationContext) => boolean;
}

export const classificationRules: ClassificationRule[] = [
	{
		category: "imagingScore",
		score: 0.48,
		reason: "найден путь к файлу снимка",
		condition: (_, ctx) => ctx.hasImagingPathForScoring,
	},
	{
		category: "imagingScore",
		score: 0.34,
		reason: "найдены RVG/ОПТГ/КТ признаки",
		condition: (_, ctx) => ctx.hasImagingKeyword,
	},
	{
		category: "imagingScore",
		score: 0.1,
		reason: "найден FDI номер зуба",
		condition: (text, ctx) =>
			(ctx.hasImagingPathForScoring || ctx.hasImagingKeyword) &&
			/\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/.test(text),
	},
	{
		category: "patientScore",
		score: 0.34,
		reason: "найден телефон",
		condition: (text) => hasPhone(text),
	},
	{
		category: "patientScore",
		score: 0.18,
		reason: "найдена дата",
		condition: (text) => hasDate(text),
	},
	{
		category: "patientScore",
		score: 0.24,
		reason: "найдено похожее ФИО",
		condition: (text) => hasLikelyName(text),
	},
	{
		category: "patientScore",
		score: 0.12,
		reason: "найдены поля пациента",
		condition: (text) => patientKeywordPattern.test(text),
	},
	{
		category: "clinicScore",
		score: 0.38,
		reason: "найдены поля клиники",
		condition: (text) => clinicKeywordPattern.test(text),
	},
	{
		category: "clinicScore",
		score: 0.16,
		reason: "найден адрес клиники",
		condition: (text) => /адрес|address|местонахождение/i.test(text),
	},
	{
		category: "clinicScore",
		score: 0.5,
		reason: "найдена лицензия клиники",
		condition: (_, ctx) => ctx.hasClinicLicenseKeyword,
	},
	{
		category: "clinicScore",
		score: 0.3,
		reason: "найдена строка юрлица с реквизитами",
		condition: (text, ctx) => ctx.hasClinicLegalEntity && hasRequisites(text),
	},
	{
		category: "clinicScore",
		score: 0.08,
		reason: "строка похожа на название клиники",
		condition: (text) =>
			/клиник|стоматолог|dental|dent|clinic/i.test(text) && hasLikelyName(text),
	},
	{
		category: "clinicScore",
		score: 0.24,
		reason: "найдены ИНН/КПП/ОГРН или лицензионные цифры",
		condition: (text) => hasRequisites(text),
	},
	{
		category: "clinicScore",
		score: 0.28,
		reason: "найдены публичные контакты клиники",
		condition: (text) => /@/.test(text) || /https?:\/\/|www\./i.test(text),
	},
	{
		category: "legacySourceScore",
		score: 0.46,
		reason: "найден путь к старой базе, архиву или табличной выгрузке",
		condition: (_, ctx) => ctx.hasLegacyDatabasePath,
	},
	{
		category: "legacySourceScore",
		score: 0.32,
		reason: "найдены признаки старой МИС, базы, архива снимков или выгрузки",
		condition: (_, ctx) => ctx.hasLegacySourceKeyword,
	},
	{
		category: "legacySourceScore",
		score: 0.24,
		reason: "найдено название старой стоматологической МИС",
		condition: (_, ctx) => ctx.hasLegacyMisName,
	},
	{
		category: "legacySourceScore",
		score: 0.46,
		reason: "найден источник из автоплана предпросмотра",
		condition: (_, ctx) => ctx.hasSmartPreviewSourceRef,
	},
	{
		category: "legacySourceScore",
		score: 0.48,
		reason: "найден источник архива снимков или папка КТ",
		condition: (_, ctx) => ctx.hasImagingSourceFolder,
	},
	{
		category: "legacySourceScore",
		score: 0.18,
		reason: "найдена старая программа снимков",
		condition: (_, ctx) => ctx.hasImagingVendor,
	},
	{
		category: "legacySourceScore",
		score: 0.18,
		reason:
			"старая программа снимков указана как папка или выгрузка, а не одиночный снимок",
		condition: (_, ctx) => ctx.hasImagingSourceFolder && ctx.hasImagingVendor,
	},
	{
		category: "legacySourceScore",
		score: 0.44,
		reason: "найден источник архива снимков без конкретного файла снимка",
		condition: (text) =>
			/pacs|orthanc|dcm4chee|dicomweb|qido|wado|пакс/i.test(text) &&
			!/\.(?:dcm|dicom|ima)\b/i.test(text),
	},
	{
		category: "legacySourceScore",
		score: 0.2,
		reason: "найден формат старой базы или резервной копии",
		condition: (text) =>
			/\.fdb|\.gdb|\.fbk|\.ib\b|\.ibk\b|\.gbk\b|\.mdb|\.accdb|\.sqlite|\.sqlite3|\.dbf|\.dbt|\.fpt|\.cdx|\.idx|\.ntx|\.ndx|\.mdx|\.bak|\.sql|\.dump|foxpro|clipper|paradox/i.test(
				text,
			),
	},
	{
		category: "legacySourceScore",
		score: 0.12,
		reason: "строка похожа на экспорт таблиц старой системы",
		condition: (text) =>
			/\.csv|\.tsv|\.xls|\.xlsx|\.xlsm|\.xlsb|выгруз|экспорт/i.test(text) &&
			/(пациент|patient|клиент|visit|визит|payment|оплат|услуг|service)/i.test(
				text,
			),
	},
];

export function classifyLine(
	line: string,
	lineNumber: number,
	mode: SmartImportMode,
): SmartImportLineClassification {
	const text = line.trim();
	if (!text) {
		return {
			lineNumber,
			kind: "ignored",
			confidence: 0.99,
			reason: "Пустая строка",
			text: line,
		};
	}

	const normalized = text.toLowerCase();
	if (headerOnlyPattern.test(normalized)) {
		return {
			lineNumber,
			kind: "ignored",
			confidence: 0.96,
			reason: "Строка похожа на заголовок",
			text,
		};
	}

	let imagingScore = 0;
	let patientScore = 0;
	let clinicScore = 0;
	let legacySourceScore = 0;
	const reasons: string[] = [];

	const hasImagePath = imagePathPattern.test(text);
	const hasImagingKeyword = imagingKeywordPattern.test(text);
	const hasLegacyMisName = legacyMisTextPattern.test(text);
	const hasLegacySourceKeyword =
		legacySourceKeywordPattern.test(text) ||
		legacySourceSupplementalKeywordPattern.test(text) ||
		hasLegacyMisName;
	const hasLegacyDatabasePath = legacyDatabasePathPattern.test(text);
	const hasImagingSourceFolder = imagingSourceFolderPattern.test(text);
	const hasImagingVendor =
		imagingVendorPattern.test(text) ||
		imagingVendorSupplementalPattern.test(text);
	const hasSmartPreviewSourceRef =
		/\b(?:browser-local|smart-preview|workstation-profile|workstation-signal|migration-source):[a-f0-9]{8,12}\b/i.test(
			text,
		);
	const hasClinicLegalEntity = /\b(?:ООО|ОАО|ПАО|АО|ИП)\b/i.test(text);
	const hasClinicLicenseKeyword = /лиценз|license/i.test(text);
	const hasImagingPathForScoring =
		hasImagePath &&
		!(
			hasClinicLicenseKeyword &&
			!/\.(?:dcm|dicom|ima|dc3|acr|jpg|jpeg|png|tif|tiff|bmp|webp)\b/i.test(
				text,
			)
		);

	const ctx: ClassificationContext = {
		hasImagingPathForScoring,
		hasImagingKeyword,
		hasClinicLicenseKeyword,
		hasClinicLegalEntity,
		hasLegacyDatabasePath,
		hasLegacySourceKeyword,
		hasLegacyMisName,
		hasSmartPreviewSourceRef,
		hasImagingSourceFolder,
		hasImagingVendor,
	};

	for (const rule of classificationRules) {
		if (rule.condition(text, ctx)) {
			if (rule.category === "imagingScore") imagingScore += rule.score;
			else if (rule.category === "patientScore") patientScore += rule.score;
			else if (rule.category === "clinicScore") clinicScore += rule.score;
			else if (rule.category === "legacySourceScore")
				legacySourceScore += rule.score;

			reasons.push(rule.reason);
		}
	}

	if (mode === "patients") {
		return {
			lineNumber,
			kind: "patient",
			confidence: clampConfidence(Math.max(patientScore, 0.65)),
			reason: "Режим: только пациенты",
			text,
		};
	}
	if (mode === "imaging") {
		return {
			lineNumber,
			kind: "imaging",
			confidence: clampConfidence(Math.max(imagingScore, 0.65)),
			reason: "Режим: только снимки",
			text,
		};
	}

	if (
		clinicScore >= 0.42 &&
		clinicScore >= imagingScore &&
		clinicScore >= patientScore * 0.9 &&
		!(legacySourceScore >= 0.42 && legacySourceScore > clinicScore)
	) {
		return {
			lineNumber,
			kind: "clinic",
			confidence: clampConfidence(clinicScore),
			reason:
				reasons.join(", ") ||
				"Похоже на реквизиты или публичный профиль клиники",
			text,
		};
	}

	if (
		legacySourceScore >= 0.42 &&
		(hasSmartPreviewSourceRef ||
			(legacySourceScore >= imagingScore * 0.85 &&
				legacySourceScore >= patientScore))
	) {
		return {
			lineNumber,
			kind: "legacy_source",
			confidence: clampConfidence(legacySourceScore),
			reason:
				reasons.join(", ") ||
				"Похоже на старую базу, экспорт или источник миграции",
			text,
		};
	}

	if (imagingScore >= 0.45 && imagingScore >= patientScore) {
		return {
			lineNumber,
			kind: "imaging",
			confidence: clampConfidence(imagingScore),
			reason: reasons.join(", ") || "Похоже на строку снимка",
			text,
		};
	}
	if (patientScore >= 0.42) {
		return {
			lineNumber,
			kind: "patient",
			confidence: clampConfidence(patientScore),
			reason: reasons.join(", ") || "Похоже на строку пациента",
			text,
		};
	}

	return {
		lineNumber,
		kind: "ignored",
		confidence: 0.55,
		reason: "Недостаточно признаков пациента или снимка",
		text,
	};
}

export function cleanExtractedValue(value: string) {
	return value
		.replace(/^[\s:=#№"«»]+/, "")
		.replace(/["«»]+$/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

export function stripClinicFieldTail(value: string) {
	return cleanExtractedValue(
		value.replace(
			/(?:^|[\s;|,])(?:инн|inn|кпп|kpp|огрн|ogrn|адрес|address|местонахождение|тел(?:ефон)?|phone|mobile|email|e-mail|почта|сайт|website|www\.|https?:\/\/|лиценз[^\s:=-]*|license|пациент|patient|клиент|client|фио|full\s*name|дата рождения|д\.р\.|dob|birth)(?=$|[\s:;|,=№#.-]).*$/i,
			"",
		),
	);
}

export function firstMatch(value: string, pattern: RegExp) {
	const match = value.match(pattern);
	return cleanExtractedValue(match?.[1] ?? "");
}

export function digitsOnly(value: string | null) {
	return value?.replace(/\D/g, "") ?? "";
}

export function firstValidDigits(
	value: string,
	pattern: RegExp,
	allowedLengths: number[],
) {
	const match = firstMatch(value, pattern);
	const digits = digitsOnly(match);
	return allowedLengths.includes(digits.length) ? digits : null;
}

export function extractEmail(value: string) {
	return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
}

export function extractWebsite(value: string) {
	const direct = value.match(/https?:\/\/[^\s,;]+/i)?.[0];
	if (direct) return direct.replace(/[.)\]]+$/g, "");
	const domain = value.match(/\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/i)?.[0];
	return domain ? `https://${domain.replace(/[.)\]]+$/g, "")}` : null;
}

export function extractClinicName(value: string) {
	const legal = value.match(
		/(?:^|[\s;|,])((?:ООО|ОАО|ПАО|АО)\s+["«]?[A-Za-zА-Яа-яЁё0-9 ._-]+["»]?|ИП\s+[A-Za-zА-Яа-яЁё -]+)/i,
	)?.[1];
	if (legal) return stripClinicFieldTail(legal);
	if (!/клиник|стоматолог|dental|dent|clinic/i.test(value)) return null;
	const withoutLabels = value
		.replace(/(?:название|клиника|clinic name|name)\s*[:=-]/i, " ")
		.replace(
			/(?:инн|inn|кпп|kpp|огрн|ogrn|адрес|address|тел|phone|email|сайт|website).*/i,
			" ",
		);
	const cleaned = cleanExtractedValue(withoutLabels);
	return cleaned.length >= 3 && cleaned.length <= 240 ? cleaned : null;
}

export function extractAddress(value: string) {
	const raw = firstMatch(
		value,
		/(?:адрес|address|местонахождение)\s*[:=-]?\s*(.{5,500})/i,
	);
	if (!raw) return null;
	return (
		cleanExtractedValue(
			raw.replace(
				/(?:^|[\s;|,])(?:инн|inn|кпп|kpp|огрн|ogrn|тел(?:ефон)?|phone|mobile|email|e-mail|почта|сайт|website|пациент|patient|клиент|client|фио|full\s*name|дата рождения|dob|birth)(?=$|[\s:;|,=№#.-]).*$/i,
				"",
			),
		) || null
	);
}

export function extractMedicalLicenseNumber(value: string) {
	return (
		firstMatch(
			value,
			/(?:лиценз[^\s:=-]*|license)\s*(?:№|#|n|no)?\s*[:=-]?\s*([A-Za-zА-Яа-яЁё0-9/.-]{3,80})/i,
		) || null
	);
}

export function extractDateLike(value: string) {
	return value.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/)?.[0] ?? null;
}

export function addClinicField<K extends keyof UpdateClinicProfileInput>(
	fields: UpdateClinicProfileInput,
	warnings: string[],
	key: K,
	value: UpdateClinicProfileInput[K] | null | undefined,
	lineNumber: number,
) {
	if (value === null || typeof value === "undefined") return;
	const normalized =
		typeof value === "string" ? cleanExtractedValue(value) : value;
	if (typeof normalized === "string" && !normalized) return;
	const current = fields[key];
	if (
		typeof current !== "undefined" &&
		current !== null &&
		current !== normalized
	) {
		warnings.push(
			`Строка ${lineNumber}: найдено еще одно значение для ${String(key)}; оставлено первое.`,
		);
		return;
	}
	fields[key] = normalized as UpdateClinicProfileInput[K];
}

export function buildClinicProfileSuggestion(
	lines: SmartImportLineClassification[],
): SmartImportClinicProfileSuggestion | null {
	const fields: UpdateClinicProfileInput = {};
	const warnings: string[] = [];
	const bankLines: string[] = [];

	lines.forEach((line) => {
		const text = line.text;
		const lineHasPatientIdentity = hasPatientIdentityCue(text);
		const inn = firstValidDigits(
			text,
			/(?:инн|inn)\D*(\d[\d\s-]{8,14}\d)/i,
			[10, 12],
		);
		const kpp = firstValidDigits(
			text,
			/(?:кпп|kpp)\D*(\d[\d\s-]{7,11}\d)/i,
			[9],
		);
		const ogrn = firstValidDigits(
			text,
			/(?:огрн|ogrn)\D*(\d[\d\s-]{11,17}\d)/i,
			[13, 15],
		);
		const email = lineHasPatientIdentity ? null : extractEmail(text);
		const website = lineHasPatientIdentity ? null : extractWebsite(text);
		const phone =
			!lineHasPatientIdentity &&
			/тел|phone|mobile|\+7|(?:^|\s)8[\s(.-]*\d{3}/i.test(text)
				? extractPhone(text)
				: null;
		const address = extractAddress(text);
		const licenseNumber = extractMedicalLicenseNumber(text);
		const licenseDate = /лиценз|license/i.test(text)
			? extractDateLike(text)
			: null;
		const clinicName = extractClinicName(text);

		addClinicField(fields, warnings, "inn", inn, line.lineNumber);
		addClinicField(fields, warnings, "kpp", kpp, line.lineNumber);
		addClinicField(fields, warnings, "ogrn", ogrn, line.lineNumber);
		addClinicField(fields, warnings, "email", email, line.lineNumber);
		addClinicField(fields, warnings, "website", website, line.lineNumber);
		addClinicField(fields, warnings, "phone", phone, line.lineNumber);
		addClinicField(fields, warnings, "address", address, line.lineNumber);
		addClinicField(
			fields,
			warnings,
			"medicalLicenseNumber",
			licenseNumber,
			line.lineNumber,
		);
		addClinicField(
			fields,
			warnings,
			"medicalLicenseIssuedAt",
			licenseDate,
			line.lineNumber,
		);
		if (clinicName) {
			const key = /^(?:ООО|ОАО|ПАО|АО|ИП)(?:\s|$)/i.test(clinicName)
				? "legalName"
				: "clinicName";
			addClinicField(fields, warnings, key, clinicName, line.lineNumber);
		}
		if (/банк|бик|р\/с|расчетн|корр/i.test(text)) {
			bankLines.push(cleanExtractedValue(text));
		}
		if (/кем выдан|выдан[ао]?|issuer/i.test(text)) {
			const issuer = text
				.replace(/.*(?:кем выдан[ао]?|выдан[ао]?|issuer)\s*[:=-]?\s*/i, "")
				.replace(/^\d{1,2}[./-]\d{1,2}[./-]\d{4}\s*/i, "");
			addClinicField(
				fields,
				warnings,
				"medicalLicenseIssuer",
				issuer,
				line.lineNumber,
			);
		}
	});

	if (bankLines.length) {
		addClinicField(
			fields,
			warnings,
			"bankDetails",
			bankLines.slice(0, 6).join("\n"),
			lines[0]?.lineNumber ?? 1,
		);
	}

	const fieldCount = Object.keys(fields).length;
	if (!fieldCount) return null;
	return {
		fields,
		confidence: clampConfidence(
			0.36 + fieldCount * 0.08 + Math.min(lines.length, 6) * 0.03,
		),
		sourceLineNumbers: lines.map((line) => line.lineNumber),
		warnings,
	};
}

