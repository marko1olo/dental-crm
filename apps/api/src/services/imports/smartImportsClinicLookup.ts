/**
 * Public registry and DaData clinic lookup helpers for smart imports.
 */
import type {
  ClinicPublicLookupRequest,
  ClinicPublicLookupResponse,
  ClinicPublicLookupSuggestion,
  SmartImportPublicLookupTarget,
  SmartImportClinicProfileSuggestion,
  UpdateClinicProfileInput
} from "@dental/shared";
import {
  clinicKeywordPattern,
  patientKeywordPattern
} from "./smartImportsConstants.js";
import { cleanExtractedValue } from "./smartImportsClassification.js";
import { clinicPublicLookupResponseSchema } from "@dental/shared";
import { firstValidDigits } from "./smartImportsClassification.js";

export function encoded(value: string) {
	return encodeURIComponent(value.trim());
}

export function publicLookupSafeQuery(value: string) {
	const trimmed = value.trim();
	const digits = trimmed.replace(/\D/g, "");
	if (
		/^[\d\s-]+$/.test(trimmed) &&
		/^(?:\d{10}|\d{12}|\d{13}|\d{15})$/.test(digits)
	) {
		return digits;
	}
	return value
		.replace(
			/(?:^|[\s;|,])(?:пациент|patient|клиент|client|фио|full\s*name|дата рождения|д\.р\.|dob|birth)(?=$|[\s:;|,=№#.-]).*$/i,
			" ",
		)
		.replace(
			/(?:^|[\s;|,])(?:инн|inn|кпп|kpp|огрн|ogrn)(?=$|[\s:;|,=№#.-])\s*\d[\d\s-]{7,17}\d/gi,
			" ",
		)
		.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ")
		.replace(
			/(?:\+7|7|8)?[\s(.-]*\d{3}[\s). -]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/g,
			" ",
		)
		.replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/g, " ")
		.replace(
			/(?:[A-Za-zА-Яа-яЁё]:[\\/][^\s;|,]+|\\\\[^\s;|,]+|\/[^\s;|,]+|\b[^\s;|,]+\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp|fdb|gdb|mdb|accdb|db|sqlite|sqlite3|dbf|dbt|fpt|cdx|idx|ntx|ndx|mdx|bak|sql|dump|backup|zip|7z|rar)\b)/gi,
			" ",
		)
		.replace(
			/(?:^|[^\p{L}\p{N}])(?:studyinstanceuid|seriesinstanceuid|sopinstanceuid|dicomdir|dicomweb|pacs|orthanc|dcm4chee|qido|qido-rs|wado|wado-rs|rvg|opg|cbct|xray|x-ray|кт|ккт|клкт|оптг|трг|рентген[а-яё]*|сним(?:ок|ки|к[а-яё]*)|исследовани[а-яё]*|серия|study|series)(?=$|[^\p{L}\p{N}])(?:[^\s;|,]*)?/giu,
			" ",
		)
		.replace(/[;|\t]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 180)
		.trim();
}

export function publicLookupDigits(
	value: string | null | undefined,
	allowedLengths: number[],
) {
	const digits = value?.replace(/\D/g, "") ?? "";
	return allowedLengths.includes(digits.length) ? digits : "";
}

export function publicLookupLabeledDigits(
	values: Array<string | null | undefined>,
	labelPattern: RegExp,
	allowedLengths: number[],
) {
	for (const value of values) {
		if (!value) continue;
		const digits = firstValidDigits(value, labelPattern, allowedLengths);
		if (digits) return digits;
	}
	return "";
}

export function buildClinicSuggestionFromFields(
	fields: UpdateClinicProfileInput,
): SmartImportClinicProfileSuggestion | null {
	const cleanFields = Object.fromEntries(
		Object.entries(fields).filter(
			([, value]) =>
				typeof value !== "undefined" && value !== null && String(value).trim(),
		),
	) as UpdateClinicProfileInput;
	if (!Object.keys(cleanFields).length) return null;
	return {
		fields: cleanFields,
		confidence: 0.82,
		sourceLineNumbers: [1],
		warnings: [],
	};
}

export function buildManualClinicPublicLookupSuggestion(
	fields: UpdateClinicProfileInput,
): ClinicPublicLookupSuggestion | null {
	const suggestion = buildClinicSuggestionFromFields(fields);
	if (!suggestion) return null;
	return {
		source: "manual_public_targets",
		confidence: Math.min(0.74, suggestion.confidence),
		fields: suggestion.fields,
		warnings: [
			"Это очищенные реквизиты из введенных данных клиники. Перед сохранением сверить с ФНС, лицензией или документами клиники.",
			...suggestion.warnings,
		].slice(0, 4),
	};
}

export function uniqueClinicPublicLookupSuggestions(
	suggestions: ClinicPublicLookupSuggestion[],
) {
	const seen = new Set<string>();
	const result: ClinicPublicLookupSuggestion[] = [];
	for (const suggestion of suggestions) {
		let key = "";
		const keys = Object.keys(suggestion.fields).sort();
		for (let i = 0; i < keys.length; i++) {
			const k = keys[i] as keyof typeof suggestion.fields;
			const v = suggestion.fields[k];
			if (v !== undefined) {
				key += `${JSON.stringify(k)}:${JSON.stringify(v)}|`;
			}
		}
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(suggestion);
	}
	return result.slice(0, 5);
}

export function addPublicLookupTarget(
	targets: SmartImportPublicLookupTarget[],
	target: SmartImportPublicLookupTarget,
) {
	const query = publicLookupSafeQuery(target.query);
	if (query.length < 3) return;
	const url = target.url.replace(encoded(target.query), encoded(query));
	if (
		targets.some(
			(existing) =>
				existing.kind === target.kind &&
				existing.title === target.title &&
				existing.url === url,
		)
	)
		return;
	targets.push({ ...target, query, url });
}

export function buildPublicLookupTargets(
	clinicSuggestion: SmartImportClinicProfileSuggestion | null,
	clinicRawText: string,
): SmartImportPublicLookupTarget[] {
	const fields = clinicSuggestion?.fields ?? {};
	const clinicQuery = publicLookupSafeQuery(
		[fields.legalName, fields.clinicName, fields.address]
			.filter(Boolean)
			.join(" "),
	);
	const rawClinicLines = clinicRawText
		.split(/\r?\n/)
		.map((line) => publicLookupSafeQuery(line));
	const fallbackQuery = clinicRawText
		? (rawClinicLines.find(
				(line) =>
					line.length >= 3 &&
					clinicKeywordPattern.test(line) &&
					!patientKeywordPattern.test(line),
			) ??
			rawClinicLines.find(
				(line) => line.length >= 3 && clinicKeywordPattern.test(line),
			))
		: "";
	const query = clinicQuery || fallbackQuery || "";
	const registryQuery = fields.inn?.trim() || fields.ogrn?.trim() || "";
	const licenseQuery =
		fields.medicalLicenseNumber?.trim() || registryQuery || query;
	const targets: SmartImportPublicLookupTarget[] = [];

	if (query) {
		addPublicLookupTarget(targets, {
			kind: "maps",
			title: "Google Maps: адрес, телефон, сайт",
			query,
			url: `https://www.google.com/maps/search/?api=1&query=${encoded(query)}`,
			privacy:
				"Искать только публичные данные клиники; не добавлять ФИО, телефоны или снимки пациентов.",
			nextAction:
				"Сверить адрес, телефон и сайт, затем внести в профиль клиники.",
		});
		addPublicLookupTarget(targets, {
			kind: "maps",
			title: "Яндекс.Карты: карточка клиники",
			query,
			url: `https://yandex.ru/maps/?text=${encoded(query)}`,
			privacy:
				"Только название и адрес клиники; пациентские данные и снимки не вставлять.",
			nextAction:
				"Проверить карточку, часы, телефон, сайт и совпадение адреса.",
		});
		addPublicLookupTarget(targets, {
			kind: "maps",
			title: "2ГИС: карточка и филиалы",
			query,
			url: `https://2gis.ru/search/${encoded(query)}`,
			privacy:
				"Искать организацию по публичным реквизитам клиники; без выгрузок пациентов.",
			nextAction:
				"Проверить филиалы, адреса, телефоны и сайт по карточке 2ГИС.",
		});
		addPublicLookupTarget(targets, {
			kind: "website_search",
			title: "Google: официальный сайт клиники",
			query,
			url: `https://www.google.com/search?q=${encoded(query)}`,
			privacy:
				"Только публичный поиск по клинике; медицинские данные не отправлять.",
			nextAction: "Найти официальный сайт и контакты для заполнения шаблонов.",
		});
		addPublicLookupTarget(targets, {
			kind: "website_search",
			title: "Яндекс: официальный сайт клиники",
			query,
			url: `https://yandex.ru/search/?text=${encoded(query)}`,
			privacy:
				"Только публичный поиск по клинике; не добавлять пациентов, диагнозы, снимки или старые файлы.",
			nextAction:
				"Сверить сайт, бренд, телефон и адрес с карточками на картах.",
		});
	}
	if (registryQuery) {
		addPublicLookupTarget(targets, {
			kind: "company_registry",
			title: "ФНС ЕГРЮЛ/ЕГРИП: юрлицо по ИНН или ОГРН",
			query: registryQuery,
			url: "https://egrul.nalog.ru/index.html",
			privacy: "Проверять только ИНН/ОГРН/юрлицо; без пациентских выгрузок.",
			nextAction:
				"Вставить ИНН или ОГРН в официальный поиск ФНС и сверить наименование, ОГРН, КПП и юридический адрес.",
		});
		addPublicLookupTarget(targets, {
			kind: "company_registry",
			title: "Rusprofile: быстрый дубль по ИНН или ОГРН",
			query: registryQuery,
			url: `https://www.rusprofile.ru/search?query=${encoded(registryQuery)}`,
			privacy: "Проверять только ИНН/ОГРН/юрлицо; без пациентских выгрузок.",
			nextAction: "Сверить наименование, ОГРН, КПП и юридический адрес.",
		});
	}
	if (licenseQuery) {
		addPublicLookupTarget(targets, {
			kind: "medical_license_registry",
			title: "Росздравнадзор: лицензия на меддеятельность",
			query: licenseQuery,
			url: "https://roszdravnadzor.gov.ru/services/licenses",
			privacy:
				"Искать только лицензию, ИНН, ОГРН или наименование клиники; персональные данные пациентов запрещены.",
			nextAction:
				"Открыть расширенный поиск, вставить ИНН/номер лицензии и сверить адреса мест осуществления деятельности.",
		});
	}
	return targets;
}

export function dadataToken() {
	return (
		process.env.DENTAL_DADATA_API_KEY?.trim() ||
		process.env.DADATA_API_KEY?.trim() ||
		""
	);
}

export type DadataObject = Record<string, unknown>;

export function dadataObject(value: unknown): DadataObject | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as DadataObject)
		: null;
}

export function dadataString(source: DadataObject | null, key: string): string {
	const value = source?.[key];
	return typeof value === "string" ? value : "";
}

export function dadataNestedObject(
	source: DadataObject | null,
	key: string,
): DadataObject | null {
	return dadataObject(source?.[key]);
}

export function mapDadataPartySuggestion(
	item: unknown,
): ClinicPublicLookupSuggestion | null {
	const suggestion = dadataObject(item);
	const data = dadataNestedObject(suggestion, "data");
	const name = dadataNestedObject(data, "name");
	const addressData = dadataNestedObject(data, "address");
	const fields: UpdateClinicProfileInput = {};
	const inn = publicLookupDigits(dadataString(data, "inn"), [10, 12]);
	const kpp = publicLookupDigits(dadataString(data, "kpp"), [9]);
	const ogrn = publicLookupDigits(dadataString(data, "ogrn"), [13, 15]);
	if (inn) fields.inn = inn;
	if (kpp) fields.kpp = kpp;
	if (ogrn) fields.ogrn = ogrn;
	const legalName =
		dadataString(name, "short_with_opf") ||
		dadataString(name, "full_with_opf") ||
		dadataString(suggestion, "value");
	if (legalName.trim()) fields.legalName = cleanExtractedValue(legalName);
	const address =
		dadataString(addressData, "unrestricted_value") ||
		dadataString(addressData, "value");
	if (address.trim()) fields.address = cleanExtractedValue(address);
	if (!Object.keys(fields).length) return null;
	return {
		source: "dadata",
		confidence: 0.86,
		fields,
		warnings: [
			"Провайдер возвращает публичные реквизиты организации; перед записью сверить с ФНС/документами клиники.",
		],
	};
}

export async function fetchDadataClinicSuggestions(
	input: ClinicPublicLookupRequest,
	safeQuery: string,
): Promise<{
	status: "not_configured" | "ready" | "error" | "skipped_no_safe_query";
	suggestions: ClinicPublicLookupSuggestion[];
	warnings: string[];
}> {
	const token = dadataToken();
	if (!safeQuery)
		return {
			status: "skipped_no_safe_query",
			suggestions: [],
			warnings: ["Нет безопасного запроса по клинике."],
		};
	if (!token) {
		return {
			status: "not_configured",
			suggestions: [],
			warnings: [
				"Ключ сервиса реквизитов для серверного поиска не настроен; доступны безопасные публичные ссылки для ручной сверки.",
			],
		};
	}

	const exactQuery =
		publicLookupDigits(input.inn, [10, 12]) ||
		publicLookupDigits(input.ogrn, [13, 15]) ||
		publicLookupDigits(safeQuery, [10, 12, 13, 15]);
	const endpoint = exactQuery
		? "https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party"
		: "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party";
	const body = exactQuery
		? { query: exactQuery }
		: { query: safeQuery, count: 5 };
	try {
		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Token ${token}`,
			},
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(4500),
		});
		if (!response.ok) {
			return {
				status: "error",
				suggestions: [],
				warnings: [
					`Сервис реквизитов вернул ответ ${response.status}; реквизиты не подставлены автоматически.`,
				],
			};
		}
		const payload = (await response.json()) as unknown;
		const rawSuggestions = dadataObject(payload)?.suggestions;
		const suggestions = (Array.isArray(rawSuggestions) ? rawSuggestions : [])
			.map(mapDadataPartySuggestion)
			.filter((suggestion): suggestion is ClinicPublicLookupSuggestion =>
				Boolean(suggestion),
			)
			.slice(0, 5);
		return {
			status: "ready",
			suggestions,
			warnings: suggestions.length
				? []
				: ["Сервис реквизитов не вернул организаций по безопасному запросу."],
		};
	} catch (err) {
		console.error("[Dente] context:", err);
		return {
			status: "error",
			suggestions: [],
			warnings: [
				"Поиск реквизитов временно недоступен; используйте подготовленные публичные ссылки для ручной сверки.",
			],
		};
	}
}

export async function buildClinicPublicLookup(input: ClinicPublicLookupRequest) {
	const rawLookupValues = [
		input.inn,
		input.kpp,
		input.ogrn,
		input.legalName,
		input.clinicName,
		input.address,
		input.medicalLicenseNumber,
	];
	const fields: UpdateClinicProfileInput = {
		inn:
			publicLookupDigits(input.inn, [10, 12]) ||
			publicLookupLabeledDigits(
				rawLookupValues,
				/(?:инн|inn)\D*(\d[\d\s-]{8,14}\d)/i,
				[10, 12],
			) ||
			undefined,
		kpp:
			publicLookupDigits(input.kpp, [9]) ||
			publicLookupLabeledDigits(
				rawLookupValues,
				/(?:кпп|kpp)\D*(\d[\d\s-]{7,11}\d)/i,
				[9],
			) ||
			undefined,
		ogrn:
			publicLookupDigits(input.ogrn, [13, 15]) ||
			publicLookupLabeledDigits(
				rawLookupValues,
				/(?:огрн|ogrn)\D*(\d[\d\s-]{11,17}\d)/i,
				[13, 15],
			) ||
			undefined,
		clinicName: publicLookupSafeQuery(input.clinicName ?? "") || undefined,
		legalName: publicLookupSafeQuery(input.legalName ?? "") || undefined,
		address: publicLookupSafeQuery(input.address ?? "") || undefined,
		medicalLicenseNumber:
			publicLookupSafeQuery(input.medicalLicenseNumber ?? "") || undefined,
	};
	const suggestion = buildClinicSuggestionFromFields(fields);
	const publicLookupTargets = buildPublicLookupTargets(
		suggestion,
		[
			fields.legalName,
			fields.clinicName,
			fields.address,
			fields.inn,
			fields.ogrn,
			fields.kpp,
		]
			.filter(Boolean)
			.join("\n"),
	);
	const safeQuery =
		fields.inn ||
		fields.ogrn ||
		fields.kpp ||
		publicLookupSafeQuery(
			[fields.legalName, fields.clinicName, fields.address]
				.filter(Boolean)
				.join(" "),
		);
	const providerResult = await fetchDadataClinicSuggestions(input, safeQuery);
	const manualSuggestion = buildManualClinicPublicLookupSuggestion(fields);
	const suggestions = uniqueClinicPublicLookupSuggestions(
		[...providerResult.suggestions, manualSuggestion].filter(
			Boolean,
		) as ClinicPublicLookupSuggestion[],
	);
	return clinicPublicLookupResponseSchema.parse({
		version: "dental-crm-clinic-public-lookup-v1",
		generatedAt: new Date().toISOString(),
		providerStatus: providerResult.status,
		provider: "server_requisites_lookup_when_configured",
		safeQuery,
		suggestions,
		publicLookupTargets,
		warnings: [
			...providerResult.warnings,
			"Запрос публичного профиля клиники принимает только ИНН/ОГРН/КПП/название/адрес/лицензию. Пациентов, телефоны пациентов и снимки сюда не отправлять.",
		],
		nextAction: suggestions.length
			? "Сверить найденные реквизиты с ФНС/документами и перенести в профиль клиники."
			: "Открыть публичные ссылки или настроить ключ сервиса реквизитов в серверных настройках для автоподстановки.",
	});
}

