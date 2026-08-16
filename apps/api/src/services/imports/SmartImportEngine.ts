/**
 * Smart Import Engine — главный сервис оркестрации умного импорта и миграции DENTE.
 *
 * Выполняет:
 * 1. Автоопределение формата входных данных (D4W XML, IDENT JSON, Infodent CSV, свободный текст/таблицы).
 * 2. Делегирование специализированным парсерам:
 *    - InfodentCsvParser (Инфодент / Инфоклиника / Denta Office)
 *    - Dental4WindowsXmlParser (D4W)
 *    - IdentJsonParser (IDENT / StomX)
 * 3. Маппинг и нормализацию сущностей в каноническую модель DENTE (пациенты, визиты, счета, прайс-лист).
 * 4. Извлечение реквизитов клиники и формирование безопасных публичных запросов (DaData, ФНС, реестры).
 * 5. Классификацию строк и генерацию плана миграции (SmartImportMigrationPlan).
 * 6. Формирование отчетов выгрузки (CSV / Safe Handoff CSV).
 * 7. Оркестрацию фиксации (commit) пациентов и снимков в базу с multi-tenancy изоляцией (orgId).
 */

import { createHash } from "node:crypto";
import {
	type ClinicPublicLookupRequest,
	type ClinicPublicLookupResponse,
	type ClinicPublicLookupSuggestion,
	type SmartImportClinicProfileSuggestion,
	type SmartImportCommitResponse,
	type SmartImportLegacySource,
	type SmartImportLineClassification,
	type SmartImportMigrationPlan,
	type SmartImportMode,
	type SmartImportPreviewResponse,
	type SmartImportPublicLookupTarget,
	type SmartImportRequest,
	type UpdateClinicProfileInput,
	smartImportCommitResponseSchema,
	smartImportPreviewResponseSchema,
} from "@dental/shared";
import { commitImagingImport, parseImagingManifest } from "../../routes/imaging.js";
import {
	buildPatientImportPreview,
	commitPatientImport,
} from "../../routes/imports.js";
import {
	Dental4WindowsXmlParser,
	type D4WAppointmentRecord,
	type D4WInvoiceRecord,
	type D4WPatientRecord,
	type D4WPriceItem,
} from "./Dental4WindowsXmlParser.js";
import {
	type IdentInvoiceRecord,
	IdentJsonParser,
	type IdentPatientRecord,
	type IdentPriceItem,
	type IdentVisitRecord,
} from "./IdentJsonParser.js";
import {
	type InfodentPatientRecord,
	type InfodentPaymentRecord,
	type InfodentPriceItem,
	type InfodentVisitRecord,
	InfodentCsvParser,
} from "./InfodentCsvParser.js";

// ==================== Канонические модели импорта ====================

export interface CanonicalImportPatient {
	externalId: string;
	fullName: string;
	lastName: string;
	firstName: string;
	middleName: string;
	birthDate: string | null;
	phone: string | null;
	secondaryPhone: string | null;
	email: string | null;
	gender: "male" | "female" | "unknown";
	address: string | null;
	notes: string | null;
	balanceKopecks: number | null;
	balanceRub: number | null;
	sourceSystem: "infodent" | "dental4windows" | "ident" | "generic";
	sourceRow: number;
}

export interface CanonicalImportVisit {
	externalId: string;
	patientRef: string;
	doctorRef: string | null;
	doctorName: string | null;
	startsAt: string | null;
	endsAt: string | null;
	durationMinutes: number | null;
	status: "scheduled" | "completed" | "cancelled" | "no_show";
	reason: string | null;
	diagnosis: string | null;
	treatment: string | null;
	notes: string | null;
	sourceSystem: "infodent" | "dental4windows" | "ident" | "generic";
}

export interface CanonicalImportInvoiceItem {
	code: string | null;
	name: string;
	quantity: number;
	priceKopecks: number;
	sumKopecks: number;
}

export interface CanonicalImportInvoice {
	externalId: string;
	patientRef: string;
	date: string;
	amountKopecks: number;
	amountRub: number;
	paidKopecks: number;
	paidRub: number;
	paymentMethod: "cash" | "card" | "sbp" | "transfer" | "insurance" | "other";
	items: CanonicalImportInvoiceItem[];
	sourceSystem: "infodent" | "dental4windows" | "ident" | "generic";
}

export interface CanonicalImportPriceItem {
	code: string;
	name: string;
	priceKopecks: number;
	priceRub: number;
	category: string | null;
	unit: string | null;
	isActive: boolean;
	sourceSystem: "infodent" | "dental4windows" | "ident" | "generic";
}

export interface SmartImportDetectedPayload {
	format: "d4w_xml" | "ident_json" | "infodent_csv" | "generic_text";
	patients: CanonicalImportPatient[];
	visits: CanonicalImportVisit[];
	invoices: CanonicalImportInvoice[];
	priceList: CanonicalImportPriceItem[];
	rawPatientCsv: string;
	rawImagingManifest: string;
	warnings: string[];
}

// ==================== Регулярные выражения и классификаторы ====================

const emptyPatientText = "ФИО;Телефон;Дата рождения;Комментарий";

const imagePathPattern =
	/(?:[A-Za-zА-Яа-яЁё]:[\\/][^\s;|,]+|\\\\[^\s;|,]+|\/[^\s;|,]+|\b[^\s;|,]+\.(?:dcm|dicom|ima|dc3|acr|jpg|jpeg|png|tif|tiff|bmp|webp|stl|obj|ply|glb|gltf|3mf)\b)/i;
const imagingKeywordPattern =
	/rvg|rv[sx]|прицел|прицельн|opg|оптг|ортопан|панорам|trg|трг|ceph|цеф|телерентг|cbct|кт|ккт|dicom|dicomweb|pacs|orthanc|dcm4chee|twain|wia|sensor|ezsensor|carestream|vatech|sidexis|romexis|ondemand|invivo|digora|soredex|trophy|visiodent|durr|dürr|orangedental|myray|newtom|dexis|kavo|gendex|acteon|sopro|sopix|pspix|x[-\s]?mind|3shape|medit|exocad|blue\s*sky|снимок|рентген|томограф/i;
const patientKeywordPattern =
	/фио|пациент|клиент|телефон|номер|дата рождения|д\.р\.|др|birth|patient|phone|mobile/i;
const clinicKeywordPattern =
	/клиник|стоматолог|dental|dent|clinic|инн|inn|кпп|kpp|огрн|ogrn|лиценз|license|адрес|address|сайт|website|www\.|https?:\/\/|email|e-mail|почта|банк|бик|р\/с|расчетн|корр/i;
const legacySourceKeywordPattern =
	/стар(?:ая|ой)?\s+(?:баз|мис|crm)|legacy|migration|миграц|перенос|выгруз|экспорт|backup|dump|restore|sql|sqlite|firebird|interbase|access|mdb|accdb|dbf|dbase|foxpro|clipper|paradox|1c|1с|\.1cd|\.dt|mdf|sdf|fbk|ibk|gbk|мис|инфоклиника|infodent|инфодент|дента\s*офис|denta\s*office|cliniccards|dental4windows|dental\s*pro|dental\s*soft|dentasoft|dental\s*cloud|clinic\s*365|clinic365|ident|stomx|i[-\s]?stom|ай\s*стом|q[-\s]?stoma|кью\s*стома|бит\.?\s*стоматолог|bit\.?\s*stomatolog|mac\s*dent|stom\s*box|medangel|медангел|medialog|медиалог|arnica|арника|пакс|pacs|orthanc|dcm4chee|dicomweb|qido|wado|ae\s*title|сетев(?:ая|ой)\s+папк|network\s+share|smb|\\\\/i;
const legacySourceSupplementalKeywordPattern =
	/open\s*dent(?:al)?|opendental|opendent|open\s*dent\s*images|atoz|dentrix|eaglesoft|patterson|softdent|practice\s*works|curve\s*dental|denticon|tab32|dolphin\s*(?:imaging|management)|morita|i[-\s]?dixel|idixel|veraview|new\s*tom|newtom|\bnnt\b|myray|cefla|owandy|quick\s*vision|quickvision/i;
const legacyMisTextPattern =
	/1c|1с|\.1cd\b|мис|инфоклиника|infoclinica|infodent|инфодент|дента\s*офис|denta\s*office|clinic\s*cards|cliniccards|dental\s*4\s*windows|d4w|dental4windows|dental\s*pro|dentpro|dental\s*soft|dentasoft|dental\s*cloud|clinic\s*365|clinic365|medangel|медангел|medialog|медиалог|arnica|арника|sycret\s*dent|secret\s*dent|адента|adenta|dent\s*crm\s*24|dentcrm24|dent\.crm24|клиентикс|clientix|klientix|2v.*(?:стоматолог|dental)|future\s*it\s*dent|futureitdent|32\s*top|32top|medods|медодс|dental\s*tap|dentaltap|(?:^|[\\/])ident(?:[\\/]|$)|\bident\b|stomx|stom\s*x|стомx|стомикс|i[-\s]?stom|ай\s*стом|q[-\s]?stoma|кью\s*стома|бит\.?\s*стоматолог|bit\.?\s*stomatolog|1c.*стоматолог|1с.*стоматолог|mac\s*dent|macdent|stom\s*box|stombox|open\s*dent(?:al)?|opendental|opendent|open\s*dent\s*images|atoz|dentrix|eaglesoft|patterson|softdent|practice\s*works|curve\s*dental|denticon|tab32|dolphin\s*(?:imaging|management)|legacy|старая\s+баз/i;
const legacyDatabasePathPattern =
	/(?:[A-Za-zА-Яа-яЁё]:[\\/][^;|\n]+?|\\\\[^;|\n]+?|\/[^;|\n]+?)\.(?:fdb|gdb|fbk|ib|ibk|gbk|mdb|accdb|db|sqlite|sqlite3|dbf|dbt|fpt|cdx|idx|ntx|ndx|mdx|1cd|dt|mdf|ldf|sdf|bak|sql|dump|backup|csv|tsv|xls|xlsx|xlsm|xlsb|ods|xml|json|zip|7z|rar|tar|gz)\b|\b[^\s;|,]+\.(?:fdb|gdb|fbk|ib|ibk|gbk|mdb|accdb|db|sqlite|sqlite3|dbf|dbt|fpt|cdx|idx|ntx|ndx|mdx|1cd|dt|mdf|ldf|sdf|bak|sql|dump|backup|csv|tsv|xls|xlsx|xlsm|xlsb|ods|xml|json|zip|7z|rar|tar|gz)\b/i;
const imagingSourceFolderPattern =
	/\bDICOMDIR\b|(?:sidexis|romexis|dtx|ondemand|invivo|ezdent|cliniview|clini\s*view|dbswin|vistasoft|carestream|vatech|planmeca|morita|galileos|kavo|dexis|gendex|orthophos|digora|soredex|trophy|visiodent|durr|dürr|orangedental|myray|newtom|quickvision|acteon|sopro|sopix|pspix|x[-\s]?mind|weasis|ohif|radiant|dicom|cbct|кт|ккт|rvg|opg|оптг|рентген|снимк|томограф)\b.*(?:folder|папк|каталог|archive|архив|export|выгруз|root|share|шара|источник|source|backup|old|стар)|(?:folder|папк|каталог|archive|архив|export|выгруз|root|share|шара|источник|source|backup|old|стар)\b.*(?:sidexis|romexis|dtx|ondemand|invivo|ezdent|cliniview|clini\s*view|dbswin|vistasoft|carestream|vatech|planmeca|morita|galileos|kavo|dexis|gendex|orthophos|digora|soredex|trophy|visiodent|durr|dürr|orangedental|myray|newtom|quickvision|acteon|sopro|sopix|pspix|x[-\s]?mind|dicom|cbct|кт|ккт|rvg|opg|оптг|рентген|снимк|томограф)|\\\\[^;|\n]*(?:dicom|cbct|rvg|opg|xray|x-ray|кт|ккт|рентген|снимк)[^;|\n]*/i;
const imagingVendorPattern =
	/sidexis|romexis|dtx|ondemand|invivo|ezdent|cliniview|clini\s*view|dbswin|vistasoft|carestream|vatech|planmeca|morita|galileos|kavo|dexis|gendex|orthophos|digora|soredex|trophy|visiodent|durr|dürr|orangedental|myray|newtom|quickvision|acteon|sopro|sopix|pspix|x[-\s]?mind|suni|schick|apixia|medit|3shape|exocad|blue\s*sky/i;
const headerOnlyPattern =
	/^(?:фио|пациент|patient|phone|телефон|тип|файл|путь|source|источник|дата|зуб|модальность|modality|studyinstanceuid|seriesinstanceuid|sopinstanceuid|instance|series|study|birth|dob|комментарий|notes)(?:[;,\t| ]+(?:фио|пациент|patient|phone|телефон|тип|файл|путь|source|источник|дата|зуб|модальность|modality|studyinstanceuid|seriesinstanceuid|sopinstanceuid|instance|series|study|birth|dob|комментарий|notes))*$/i;
const imagingVendorSupplementalPattern =
	/i[-\s]?dixel|idixel|veraview|new\s*tom|\bnnt\b|cefla|owandy|quick\s*vision/i;

export class SmartImportEngine {
	/**
	 * Автоматическое определение формата и первичный разбор в канонические сущности
	 */
	public static detectAndParse(
		rawText: string,
		sourceName: string,
	): SmartImportDetectedPayload {
		const trimmed = rawText.trim();
		const warnings: string[] = [];

		// 1. Проверка на Dental4Windows XML
		if (Dental4WindowsXmlParser.isD4wXml(trimmed)) {
			const d4wResult = Dental4WindowsXmlParser.parse(trimmed);
			const patients = d4wResult.patients.map((p, idx) =>
				SmartImportEngine.mapD4wPatient(p, idx + 1),
			);
			const visits = d4wResult.appointments.map((a) =>
				SmartImportEngine.mapD4wAppointment(a),
			);
			const invoices = d4wResult.invoices.map((i) =>
				SmartImportEngine.mapD4wInvoice(i),
			);
			const priceList = d4wResult.priceList.map((pr) =>
				SmartImportEngine.mapD4wPriceItem(pr),
			);
			const rawPatientCsv =
				Dental4WindowsXmlParser.toDentePatientCsv(d4wResult.patients);

			return {
				format: "d4w_xml",
				patients,
				visits,
				invoices,
				priceList,
				rawPatientCsv,
				rawImagingManifest: "",
				warnings: d4wResult.warnings,
			};
		}

		// 2. Проверка на IDENT JSON
		if (IdentJsonParser.isIdentJson(trimmed)) {
			const identResult = IdentJsonParser.parse(trimmed);
			const patients = identResult.patients.map((p, idx) =>
				SmartImportEngine.mapIdentPatient(p, idx + 1),
			);
			const visits = identResult.visits.map((v) =>
				SmartImportEngine.mapIdentVisit(v),
			);
			const invoices = identResult.invoices.map((inv) =>
				SmartImportEngine.mapIdentInvoice(inv),
			);
			const priceList = identResult.priceList.map((pr) =>
				SmartImportEngine.mapIdentPriceItem(pr),
			);
			const rawPatientCsv =
				IdentJsonParser.toDentePatientCsv(identResult.patients);

			return {
				format: "ident_json",
				patients,
				visits,
				invoices,
				priceList,
				rawPatientCsv,
				rawImagingManifest: "",
				warnings: identResult.warnings,
			};
		}

		// 3. Проверка на Infodent CSV (заголовки nkart, drojd, fam_io, summa, priem и т.д.)
		const delimiter = InfodentCsvParser.detectDelimiter(trimmed);
		const firstLines = trimmed.split(/\r?\n/).slice(0, 5);
		const hasInfodentHeaders = firstLines.some((l) =>
			/nkart|nomkart|idpac|fam_io|drojd|datarojd|kodvrach|vidopl|artikul/i.test(
				l,
			),
		);

		if (hasInfodentHeaders) {
			const infoResult = InfodentCsvParser.parse(trimmed, { delimiter });
			const patients = infoResult.patients.map((p, idx) =>
				SmartImportEngine.mapInfodentPatient(p, idx + 1),
			);
			const visits = infoResult.visits.map((v) =>
				SmartImportEngine.mapInfodentVisit(v),
			);
			const invoices = infoResult.payments.map((pm) =>
				SmartImportEngine.mapInfodentPayment(pm),
			);
			const priceList = infoResult.priceList.map((pr) =>
				SmartImportEngine.mapInfodentPriceItem(pr),
			);
			const rawPatientCsv =
				InfodentCsvParser.toDentePatientCsv(infoResult.patients);

			return {
				format: "infodent_csv",
				patients,
				visits,
				invoices,
				priceList,
				rawPatientCsv,
				rawImagingManifest: "",
				warnings: infoResult.warnings,
			};
		}

		// 4. Универсальный текстовый / смешанный ввод
		return {
			format: "generic_text",
			patients: [],
			visits: [],
			invoices: [],
			priceList: [],
			rawPatientCsv: trimmed,
			rawImagingManifest: "",
			warnings,
		};
	}

	/**
	 * Построение полного предпросмотра умного импорта (SmartImportPreviewResponse)
	 */
	public static async buildPreview(
		orgId: string,
		input: SmartImportRequest,
	): Promise<SmartImportPreviewResponse> {
		const lines = input.rawText.split(/\r?\n/);
		const classifications = lines.map((line, index) =>
			SmartImportEngine.classifyLine(line, index + 1, input.mode),
		);

		// Проверяем, может ли вход быть специализированным форматом
		const detected = SmartImportEngine.detectAndParse(
			input.rawText,
			input.sourceName,
		);

		let patientRawText: string;
		let imagingRawText: string;
		let clinicRawText: string;
		let legacySourceRawText: string;

		if (detected.format !== "generic_text" && detected.rawPatientCsv) {
			patientRawText = detected.rawPatientCsv;
			imagingRawText = detected.rawImagingManifest;
			clinicRawText = "";
			legacySourceRawText = "";
		} else {
			const patientLines = classifications
				.filter((line) => line.kind === "patient")
				.map((line) => line.text);
			const imagingLines = classifications
				.filter((line) => line.kind === "imaging")
				.map((line) => line.text);
			const clinicLines = classifications.filter(
				(line) => line.kind === "clinic",
			);
			const legacySourceLines = classifications.filter(
				(line) => line.kind === "legacy_source",
			);

			patientRawText = patientLines.join("\n");
			imagingRawText = imagingLines.join("\n");
			clinicRawText = clinicLines.map((line) => line.text).join("\n");
			legacySourceRawText = legacySourceLines
				.map((line) => line.text)
				.join("\n");
		}

		const clinicLines = classifications.filter(
			(line) => line.kind === "clinic",
		);
		const legacySourceLines = classifications.filter(
			(line) => line.kind === "legacy_source",
		);

		const clinicSuggestion =
			SmartImportEngine.buildClinicProfileSuggestion(clinicLines);
		const publicLookupTargets =
			SmartImportEngine.buildPublicLookupTargets(
				clinicSuggestion,
				clinicRawText,
			);
		const legacySources =
			SmartImportEngine.buildLegacySources(legacySourceLines);

		const patientPreview = await buildPatientImportPreview(orgId, {
			sourceName: `${input.sourceName}:patients`,
			sourceKind: "mis_export",
			rawText: patientRawText || emptyPatientText,
		});

		const imagingPreview = await parseImagingManifest(orgId, {
			sourceName: `${input.sourceName}:imaging`,
			sourceKind: "folder_watch",
			rawText: imagingRawText,
		});

		const migrationPlan = SmartImportEngine.buildMigrationPlan({
			patientRows: patientPreview.totalRows,
			patientReadyRows: patientPreview.readyRows,
			imagingRows: imagingPreview.totalRows,
			imagingReadyRows: imagingPreview.readyRows,
			clinicSuggestion,
			publicLookupTargets,
			legacySources,
		});

		const parserNotes = [
			"Умный парсер разделяет смешанную выгрузку на строки пациентов и строки снимков до любой записи.",
			"Факты профиля клиники предлагаются отдельно и не записываются автоматом.",
			"Старая база, архив снимков, архив, сетевая папка и таблицы сначала становятся черновыми кандидатами.",
			"Публичные ссылки используют только название, адрес и ИНН клиники; пациентские данные не уходят в карты или поиск.",
			"Порядок записи: сначала пациенты, затем снимки, чтобы снимки из той же выгрузки могли привязаться к созданным картам.",
			"Предупреждения и заблокированные строки остаются вне базы, пока пользователь не исправит сопоставление или исходные данные.",
		];

		if (detected.format === "d4w_xml") {
			parserNotes.unshift(
				`Распознан XML-экспорт Dental4Windows: извлечено ${detected.patients.length} пациентов, ${detected.visits.length} визитов, ${detected.invoices.length} счетов.`,
			);
		} else if (detected.format === "ident_json") {
			parserNotes.unshift(
				`Распознан JSON-экспорт IDENT: извлечено ${detected.patients.length} пациентов, ${detected.visits.length} приемов, ${detected.invoices.length} оплат.`,
			);
		} else if (detected.format === "infodent_csv") {
			parserNotes.unshift(
				`Распознан CSV-экспорт Инфодент/Инфоклиника: извлечено ${detected.patients.length} пациентов, ${detected.visits.length} визитов, ${detected.invoices.length} оплат.`,
			);
		}

		return smartImportPreviewResponseSchema.parse({
			sourceName: input.sourceName,
			totalLines: classifications.filter((line) => line.text.trim()).length,
			patientRawText,
			imagingRawText,
			clinicRawText,
			legacySourceRawText,
			patientPreview,
			imagingPreview,
			clinicSuggestion,
			publicLookupTargets,
			legacySources,
			migrationPlan,
			lineClassifications: classifications.filter((line) =>
				line.text.trim(),
			),
			parserNotes,
		});
	}

	/**
	 * Фиксация (commit) импорта пациентов и снимков
	 */
	public static async commit(
		orgId: string,
		input: SmartImportRequest,
	): Promise<SmartImportCommitResponse> {
		const preview = await SmartImportEngine.buildPreview(orgId, input);

		const patientCommit =
			preview.patientPreview.totalRows > 0
				? await commitPatientImport(orgId, {
						sourceName: `${input.sourceName}:patients`,
						sourceKind: "mis_export",
						rawText: preview.patientRawText,
					})
				: null;

		const imagingCommit =
			preview.imagingPreview.totalRows > 0
				? await commitImagingImport(orgId, {
						sourceName: `${input.sourceName}:imaging`,
						sourceKind: "folder_watch",
						rawText: preview.imagingRawText,
					})
				: null;

		return smartImportCommitResponseSchema.parse({
			preview,
			patientCommit,
			imagingCommit,
		});
	}

	// ==================== Классификация строк ====================

	public static classifyLine(
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

		if (hasImagingPathForScoring) {
			imagingScore += 0.48;
			reasons.push("найден путь к файлу снимка");
		}
		if (hasImagingKeyword) {
			imagingScore += 0.34;
			reasons.push("найдены RVG/ОПТГ/КТ признаки");
		}
		if (
			(hasImagingPathForScoring || hasImagingKeyword) &&
			/\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/.test(text)
		) {
			imagingScore += 0.1;
			reasons.push("найден FDI номер зуба");
		}

		if (
			/(?:\+7|7|8)?[\s(.-]*\d{3}[\s). -]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/.test(
				text,
			)
		) {
			patientScore += 0.34;
			reasons.push("найден телефон");
		}
		if (/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/.test(text)) {
			patientScore += 0.18;
			reasons.push("найдена дата");
		}
		if (
			text
				.split(/[;,\t| ]+/)
				.filter((part) => /^[A-Za-zА-Яа-яЁё-]{2,}$/.test(part))
				.length >= 2
		) {
			patientScore += 0.24;
			reasons.push("найдено похожее ФИО");
		}
		if (patientKeywordPattern.test(text)) {
			patientScore += 0.12;
			reasons.push("найдены поля пациента");
		}

		if (clinicKeywordPattern.test(text)) {
			clinicScore += 0.38;
			reasons.push("найдены поля клиники");
		}
		if (/адрес|address|местонахождение/i.test(text)) {
			clinicScore += 0.16;
			reasons.push("найден адрес клиники");
		}
		if (hasClinicLicenseKeyword) {
			clinicScore += 0.5;
			reasons.push("найдена лицензия клиники");
		}
		if (
			hasClinicLegalEntity &&
			/\b(?:\d{10}|\d{12}|\d{13}|\d{15})\b/.test(text)
		) {
			clinicScore += 0.3;
			reasons.push("найдена строка юрлица с реквизитами");
		}
		if (
			/@/.test(text) ||
			/https?:\/\/|www\./i.test(text)
		) {
			clinicScore += 0.28;
			reasons.push("найдены контакты клиники");
		}

		if (hasLegacyDatabasePath) {
			legacySourceScore += 0.46;
			reasons.push("найден путь к старой базе");
		}
		if (hasLegacySourceKeyword) {
			legacySourceScore += 0.32;
			reasons.push("найдены признаки старой МИС");
		}
		if (hasSmartPreviewSourceRef) {
			legacySourceScore += 0.46;
			reasons.push("найден источник автоплана");
		}
		if (hasImagingSourceFolder) {
			legacySourceScore += 0.48;
			reasons.push("найдена папка архива снимков");
		}

		if (mode === "patients") {
			return {
				lineNumber,
				kind: "patient",
				confidence: SmartImportEngine.clampConfidence(
					Math.max(patientScore, 0.65),
				),
				reason: "Режим: только пациенты",
				text,
			};
		}
		if (mode === "imaging") {
			return {
				lineNumber,
				kind: "imaging",
				confidence: SmartImportEngine.clampConfidence(
					Math.max(imagingScore, 0.65),
				),
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
				confidence: SmartImportEngine.clampConfidence(clinicScore),
				reason: reasons.join(", ") || "Похоже на реквизиты клиники",
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
				confidence: SmartImportEngine.clampConfidence(legacySourceScore),
				reason: reasons.join(", ") || "Похоже на старую базу или экспорт",
				text,
			};
		}

		if (imagingScore >= 0.45 && imagingScore >= patientScore) {
			return {
				lineNumber,
				kind: "imaging",
				confidence: SmartImportEngine.clampConfidence(imagingScore),
				reason: reasons.join(", ") || "Похоже на строку снимка",
				text,
			};
		}
		if (patientScore >= 0.42) {
			return {
				lineNumber,
				kind: "patient",
				confidence: SmartImportEngine.clampConfidence(patientScore),
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

	// ==================== Реквизиты и профиль клиники ====================

	public static buildClinicProfileSuggestion(
		lines: SmartImportLineClassification[],
	): SmartImportClinicProfileSuggestion | null {
		const fields: UpdateClinicProfileInput = {};
		const warnings: string[] = [];
		const bankLines: string[] = [];

		lines.forEach((line) => {
			const text = line.text;
			const hasPatient =
				/пациент|patient|клиент|фио|д\.р\.|dob|birth/i.test(text);

			const inn = SmartImportEngine.firstValidDigits(
				text,
				/(?:инн|inn)\D*(\d[\d\s-]{8,14}\d)/i,
				[10, 12],
			);
			const kpp = SmartImportEngine.firstValidDigits(
				text,
				/(?:кпп|kpp)\D*(\d[\d\s-]{7,11}\d)/i,
				[9],
			);
			const ogrn = SmartImportEngine.firstValidDigits(
				text,
				/(?:огрн|ogrn)\D*(\d[\d\s-]{11,17}\d)/i,
				[13, 15],
			);
			const email = hasPatient
				? null
				: text.match(
						/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
					)?.[0] ?? null;
			const website = hasPatient
				? null
				: SmartImportEngine.extractWebsite(text);
			const phone =
				!hasPatient &&
				/тел|phone|mobile|\+7|(?:^|\s)8[\s(.-]*\d{3}/i.test(text)
					? SmartImportEngine.extractPhone(text)
					: null;
			const address = SmartImportEngine.extractAddress(text);
			const licenseNumber =
				SmartImportEngine.extractMedicalLicenseNumber(text);
			const licenseDate = /лиценз|license/i.test(text)
				? text.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/)?.[0] ?? null
				: null;
			const clinicName = SmartImportEngine.extractClinicName(text);

			SmartImportEngine.addClinicField(
				fields,
				warnings,
				"inn",
				inn,
				line.lineNumber,
			);
			SmartImportEngine.addClinicField(
				fields,
				warnings,
				"kpp",
				kpp,
				line.lineNumber,
			);
			SmartImportEngine.addClinicField(
				fields,
				warnings,
				"ogrn",
				ogrn,
				line.lineNumber,
			);
			SmartImportEngine.addClinicField(
				fields,
				warnings,
				"email",
				email,
				line.lineNumber,
			);
			SmartImportEngine.addClinicField(
				fields,
				warnings,
				"website",
				website,
				line.lineNumber,
			);
			SmartImportEngine.addClinicField(
				fields,
				warnings,
				"phone",
				phone,
				line.lineNumber,
			);
			SmartImportEngine.addClinicField(
				fields,
				warnings,
				"address",
				address,
				line.lineNumber,
			);
			SmartImportEngine.addClinicField(
				fields,
				warnings,
				"medicalLicenseNumber",
				licenseNumber,
				line.lineNumber,
			);
			SmartImportEngine.addClinicField(
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
				SmartImportEngine.addClinicField(
					fields,
					warnings,
					key,
					clinicName,
					line.lineNumber,
				);
			}
			if (/банк|бик|р\/с|расчетн|корр/i.test(text)) {
				bankLines.push(SmartImportEngine.cleanExtractedValue(text));
			}
		});

		if (bankLines.length) {
			SmartImportEngine.addClinicField(
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
			confidence: SmartImportEngine.clampConfidence(
				0.36 + fieldCount * 0.08 + Math.min(lines.length, 6) * 0.03,
			),
			sourceLineNumbers: lines.map((line) => line.lineNumber),
			warnings,
		};
	}

	public static buildPublicLookupTargets(
		suggestion: SmartImportClinicProfileSuggestion | null,
		clinicRawText: string,
	): SmartImportPublicLookupTarget[] {
		const targets: SmartImportPublicLookupTarget[] = [];
		const fields = suggestion?.fields;
		if (!fields) return targets;

		if (fields.inn) {
			targets.push({
				kind: "company_registry",
				title: "Проверка в реестре ФНС / ЕГРЮЛ",
				query: fields.inn,
				url: `https://egrul.nalog.ru/index.html?query=${encodeURIComponent(fields.inn)}`,
				privacy: "ИНН не содержит персональных данных пациентов.",
				nextAction: "Сверить реквизиты клиники с выпиской ЕГРЮЛ.",
			});
		}

		if (fields.medicalLicenseNumber) {
			targets.push({
				kind: "medical_license_registry",
				title: "Проверка медицинской лицензии в Росздравнадзоре",
				query: fields.medicalLicenseNumber,
				url: `https://roszdravnadzor.gov.ru/services/licenses?q=${encodeURIComponent(fields.medicalLicenseNumber)}`,
				privacy: "Номер лицензии безопасен для публичной сверки.",
				nextAction: "Проверить статус действия медицинской лицензии.",
			});
		}

		const address = fields.address || fields.clinicName;
		if (address) {
			targets.push({
				kind: "maps",
				title: "Поиск клиники на Яндекс Картах",
				query: address,
				url: `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`,
				privacy: "Поиск использует только публичный адрес и название клиники.",
				nextAction: "Подтвердить координаты и точный адрес клиники.",
			});
		}

		return targets;
	}

	public static buildLegacySources(
		lines: SmartImportLineClassification[],
	): SmartImportLegacySource[] {
		const sources = new Map<string, SmartImportLegacySource>();

		for (const line of lines) {
			const sourceRef =
				line.text.match(/\bbrowser-local:[a-f0-9]{8,12}\b/i)?.[0] ??
				line.text.match(legacyDatabasePathPattern)?.[0]?.trim() ??
				null;

			const kind: SmartImportLegacySource["kind"] =
				/\.fdb|\.gdb|\.fbk/i.test(line.text)
					? "firebird_database"
					: /\.mdb|\.accdb/i.test(line.text)
						? "access_database"
						: /\.sqlite|\.sqlite3|\.db\b/i.test(line.text)
							? "sqlite_database"
							: /\.sql|\.dump|\.bak/i.test(line.text)
								? "sql_dump"
								: /\.xlsx|\.xls/i.test(line.text)
									? "spreadsheet_export"
									: /\.csv|\.tsv/i.test(line.text)
										? "csv_export"
										: /pacs|dicomweb/i.test(line.text)
											? "pacs_dicom"
											: /dicom|cbct|кт/i.test(line.text)
												? "dicom_folder"
												: /rvg|opg|оптг|рентген/i.test(line.text)
													? "xray_image_archive"
													: "mis_database";

			const confidence = SmartImportEngine.clampConfidence(line.confidence);
			const key = `${kind}:${sourceRef ?? line.text.slice(0, 60)}`;

			if (!sources.has(key)) {
				sources.set(key, {
					kind,
					title: `Источник ${kind}`,
					confidence,
					sourceRef,
					safeSourceAlias: sourceRef
						? `Источник #${createHash("sha256").update(sourceRef).digest("hex").slice(0, 8).toUpperCase()}`
						: null,
					evidence: [line.reason],
					requiredArtifacts: [
						"Штатная выгрузка пациентов/визитов или резервная копия базы",
					],
					recommendedRoute:
						"Локальный разбор только для чтения; запись только после предпросмотра.",
					automationLevel:
						kind === "csv_export" || kind === "spreadsheet_export"
							? "ready_for_preview"
							: "needs_local_bridge",
					privacy:
						"Работать локально; не передавать персональные данные в публичные сервисы.",
					nextAction:
						"Запустить предпросмотр структуры данных перед записью.",
				});
			}
		}

		return Array.from(sources.values());
	}

	public static buildMigrationPlan(input: {
		patientRows: number;
		patientReadyRows: number;
		imagingRows: number;
		imagingReadyRows: number;
		clinicSuggestion: SmartImportClinicProfileSuggestion | null;
		publicLookupTargets: SmartImportPublicLookupTarget[];
		legacySources: SmartImportLegacySource[];
	}): SmartImportMigrationPlan {
		const steps: SmartImportMigrationPlan["steps"] = [
			{
				id: "clinic_profile",
				title: "Реквизиты и публичный профиль клиники",
				status: input.clinicSuggestion ? "review" : "manual",
				detail: input.clinicSuggestion
					? `Найдено полей: ${Object.keys(input.clinicSuggestion.fields).length}.`
					: "Автоматически реквизиты не найдены.",
				nextAction: input.clinicSuggestion
					? "Сверить реквизиты клиники с уставными документами."
					: "Добавить название, ИНН или адрес клиники вручную.",
			},
			{
				id: "legacy_sources",
				title: "Источники старой базы и файлов",
				status: input.legacySources.length ? "ready" : "manual",
				detail: input.legacySources.length
					? `Найдено источников: ${input.legacySources.length}.`
					: "Источники старых баз не обнаружены.",
				nextAction: input.legacySources.length
					? "Проверить артефакты источников."
					: "Указать путь к выгрузке или архиву старой МИС.",
			},
			{
				id: "legacy_patients",
				title: "Старая база пациентов",
				status: input.patientRows
					? input.patientReadyRows
						? "ready"
						: "review"
					: "manual",
				detail: input.patientRows
					? `Пациентов: ${input.patientRows}, готово к записи: ${input.patientReadyRows}.`
					: "Строки пациентов не распознаны.",
				nextAction: input.patientReadyRows
					? "Зафиксировать готовые карты пациентов."
					: "Вставить список пациентов из старой программы.",
			},
			{
				id: "legacy_imaging",
				title: "КТ, RVG, ОПТГ и фото",
				status: input.imagingRows
					? input.imagingReadyRows
						? "ready"
						: "review"
					: "manual",
				detail: input.imagingRows
					? `Снимков: ${input.imagingRows}, готово к привязке: ${input.imagingReadyRows}.`
					: "Снимки не обнаружены в этой выгрузке.",
				nextAction: input.imagingReadyRows
					? "Привязать распознанные снимки к картам пациентов."
					: "Добавить манифест или папку со снимками.",
			},
			{
				id: "public_lookup",
				title: "Сетевой добор из карт/реестров",
				status: input.publicLookupTargets.length ? "manual" : "blocked",
				detail: input.publicLookupTargets.length
					? `Подготовлено публичных ссылок: ${input.publicLookupTargets.length}.`
					: "Недостаточно реквизитов для поиска.",
				nextAction: input.publicLookupTargets.length
					? "Подтвердить данные клиники через внешние реестры."
					: "Указать ИНН или адрес клиники.",
			},
		];

		return {
			coverage: {
				patients: input.patientRows > 0,
				imaging: input.imagingRows > 0,
				clinicProfile: Boolean(input.clinicSuggestion),
				publicLookup: input.publicLookupTargets.length > 0,
				legacySources: input.legacySources.length > 0,
			},
			steps,
			privacyWarnings: [
				"Публичный поиск использует только название, ИНН и адрес клиники.",
				"Персональные данные пациентов (ФИО, телефоны, снимки) изолированы и никогда не передаются во внешние реестры.",
				"Импорт выполняется строго в рамках указанной организации (multi-tenancy guard).",
			],
			nextAction:
				input.patientReadyRows || input.imagingReadyRows
					? "Проверить предпросмотр и запустить фиксацию импорта."
					: "Добавить файл выгрузки или список пациентов.",
		};
	}

	// ==================== CSV Генераторы отчетов ====================

	public static buildReportCsv(preview: SmartImportPreviewResponse): string {
		const rows: Array<Array<string | number | null | undefined>> = [
			["Категория", "Номер строки", "Статус", "Уверенность", "Содержимое"],
		];

		preview.lineClassifications.forEach((l) => {
			rows.push([l.kind, l.lineNumber, l.reason, l.confidence, l.text]);
		});

		return rows
			.map((row) =>
				row
					.map((cell) => {
						const val = String(cell ?? "").replace(/"/g, '""');
						return `"${val}"`;
					})
					.join(";"),
			)
			.join("\n");
	}

	public static buildSafeHandoffReportCsv(
		preview: SmartImportPreviewResponse,
	): string {
		const rows: Array<Array<string | number | null | undefined>> = [
			[
				"Категория",
				"Номер строки",
				"Уверенность",
				"Безопасный псевдоним / Сущность",
				"Статус готовности",
			],
		];

		preview.lineClassifications.forEach((l) => {
			const safeContent =
				l.kind === "patient"
					? "Персональные данные скрыты"
					: l.kind === "legacy_source"
						? "Путь к старой базе скрыт"
						: l.text;

			rows.push([
				l.kind,
				l.lineNumber,
				l.confidence,
				safeContent,
				l.reason,
			]);
		});

		return rows
			.map((row) =>
				row
					.map((cell) => {
						const val = String(cell ?? "").replace(/"/g, '""');
						return `"${val}"`;
					})
					.join(";"),
			)
			.join("\n");
	}

	// ==================== Мапперы сущностей ====================

	private static mapD4wPatient(
		p: D4WPatientRecord,
		row: number,
	): CanonicalImportPatient {
		return {
			externalId: p.externalId,
			fullName: p.fullName,
			lastName: p.lastName,
			firstName: p.firstName,
			middleName: p.middleName,
			birthDate: p.birthDate,
			phone: p.phone,
			secondaryPhone: p.secondaryPhone,
			email: p.email,
			gender: p.gender,
			address: p.address,
			notes: p.notes,
			balanceKopecks: p.balanceKopecks,
			balanceRub: p.balanceRub,
			sourceSystem: "dental4windows",
			sourceRow: row,
		};
	}

	private static mapD4wAppointment(
		a: D4WAppointmentRecord,
	): CanonicalImportVisit {
		return {
			externalId: a.externalId,
			patientRef: a.patientRef,
			doctorRef: a.providerRef,
			doctorName: a.doctorName,
			startsAt: a.startsAt,
			endsAt: a.endsAt,
			durationMinutes: a.durationMinutes,
			status: a.status,
			reason: a.description,
			diagnosis: null,
			treatment: null,
			notes: a.notes,
			sourceSystem: "dental4windows",
		};
	}

	private static mapD4wInvoice(i: D4WInvoiceRecord): CanonicalImportInvoice {
		return {
			externalId: i.externalId,
			patientRef: i.patientRef,
			date: i.date,
			amountKopecks: i.totalKopecks,
			amountRub: i.totalRub,
			paidKopecks: i.paidKopecks,
			paidRub: i.paidRub,
			paymentMethod: i.paymentMethod,
			items: i.items.map((item) => ({
				code: item.itemCode,
				name: item.description,
				quantity: item.quantity,
				priceKopecks: item.feeKopecks,
				sumKopecks: item.feeKopecks * item.quantity,
			})),
			sourceSystem: "dental4windows",
		};
	}

	private static mapD4wPriceItem(
		pr: D4WPriceItem,
	): CanonicalImportPriceItem {
		return {
			code: pr.itemCode,
			name: pr.description,
			priceKopecks: pr.feeKopecks,
			priceRub: pr.feeRub,
			category: pr.category,
			unit: "усл.",
			isActive: pr.isActive,
			sourceSystem: "dental4windows",
		};
	}

	private static mapIdentPatient(
		p: IdentPatientRecord,
		row: number,
	): CanonicalImportPatient {
		return {
			externalId: p.id,
			fullName: p.fullName,
			lastName: p.lastName,
			firstName: p.firstName,
			middleName: p.middleName,
			birthDate: p.birthDate,
			phone: p.phone,
			secondaryPhone: p.secondaryPhone,
			email: p.email,
			gender: p.gender,
			address: p.address,
			notes: p.notes || p.comment,
			balanceKopecks: p.balanceKopecks,
			balanceRub: p.balanceRub,
			sourceSystem: "ident",
			sourceRow: row,
		};
	}

	private static mapIdentVisit(v: IdentVisitRecord): CanonicalImportVisit {
		return {
			externalId: v.id,
			patientRef: v.patientId,
			doctorRef: v.doctorId,
			doctorName: v.doctorName,
			startsAt: v.startDateTime,
			endsAt: v.endDateTime,
			durationMinutes: v.durationMinutes,
			status: v.status,
			reason: v.complaint,
			diagnosis: v.diagnosis,
			treatment: v.treatment,
			notes: v.notes || v.comment,
			sourceSystem: "ident",
		};
	}

	private static mapIdentInvoice(
		inv: IdentInvoiceRecord,
	): CanonicalImportInvoice {
		return {
			externalId: inv.id,
			patientRef: inv.patientId,
			date: inv.date,
			amountKopecks: inv.amountKopecks,
			amountRub: inv.amountRub,
			paidKopecks: inv.paidKopecks,
			paidRub: inv.paidRub,
			paymentMethod: inv.method === "deposit" ? "other" : inv.method,
			items: inv.services.map((s) => ({
				code: s.code,
				name: s.title,
				quantity: s.quantity,
				priceKopecks: s.priceKopecks,
				sumKopecks: s.totalKopecks,
			})),
			sourceSystem: "ident",
		};
	}

	private static mapIdentPriceItem(
		pr: IdentPriceItem,
	): CanonicalImportPriceItem {
		return {
			code: pr.code || pr.id,
			name: pr.title,
			priceKopecks: pr.priceKopecks,
			priceRub: pr.priceRub,
			category: pr.category,
			unit: pr.unit,
			isActive: pr.isActive,
			sourceSystem: "ident",
		};
	}

	private static mapInfodentPatient(
		p: InfodentPatientRecord,
		row: number,
	): CanonicalImportPatient {
		return {
			externalId: p.externalId,
			fullName: p.fullName,
			lastName: p.lastName,
			firstName: p.firstName,
			middleName: p.middleName,
			birthDate: p.birthDate,
			phone: p.phone,
			secondaryPhone: p.secondaryPhone,
			email: p.email,
			gender: p.gender,
			address: p.address,
			notes: p.notes,
			balanceKopecks: p.balanceKopecks,
			balanceRub: p.balanceRub,
			sourceSystem: "infodent",
			sourceRow: row,
		};
	}

	private static mapInfodentVisit(
		v: InfodentVisitRecord,
	): CanonicalImportVisit {
		return {
			externalId: v.externalId,
			patientRef: v.patientRef,
			doctorRef: v.doctorRef,
			doctorName: v.doctorName,
			startsAt: v.startsAt,
			endsAt: v.endsAt,
			durationMinutes: v.durationMinutes,
			status: v.status,
			reason: v.reason,
			diagnosis: v.diagnosis,
			treatment: v.treatment,
			notes: v.notes,
			sourceSystem: "infodent",
		};
	}

	private static mapInfodentPayment(
		pm: InfodentPaymentRecord,
	): CanonicalImportInvoice {
		return {
			externalId: pm.externalId,
			patientRef: pm.patientRef,
			date: pm.paidAt,
			amountKopecks: pm.amountKopecks,
			amountRub: pm.amountRub,
			paidKopecks: pm.amountKopecks,
			paidRub: pm.amountRub,
			paymentMethod: pm.method,
			items: pm.items.map((i) => ({
				code: i.code,
				name: i.name,
				quantity: i.quantity,
				priceKopecks: i.priceKopecks,
				sumKopecks: i.sumKopecks,
			})),
			sourceSystem: "infodent",
		};
	}

	private static mapInfodentPriceItem(
		pr: InfodentPriceItem,
	): CanonicalImportPriceItem {
		return {
			code: pr.code,
			name: pr.name,
			priceKopecks: pr.priceKopecks,
			priceRub: pr.priceRub,
			category: pr.category,
			unit: pr.unit,
			isActive: true,
			sourceSystem: "infodent",
		};
	}

	// ==================== Вспомогательные утилиты ====================

	public static clampConfidence(value: number): number {
		return Math.max(0, Math.min(0.99, Number(value.toFixed(2))));
	}

	private static cleanExtractedValue(value: string): string {
		return value
			.replace(/^[\s:=#№"«»]+/, "")
			.replace(/["«»]+$/g, "")
			.replace(/\s+/g, " ")
			.trim();
	}

	private static extractPhone(value: string): string | null {
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

	private static extractWebsite(value: string): string | null {
		const direct = value.match(/https?:\/\/[^\s,;]+/i)?.[0];
		if (direct) return direct.replace(/[.)\]]+$/g, "");
		const domain = value.match(
			/\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/i,
		)?.[0];
		return domain ? `https://${domain.replace(/[.)\]]+$/g, "")}` : null;
	}

	private static extractClinicName(value: string): string | null {
		const legal = value.match(
			/(?:^|[\s;|,])((?:ООО|ОАО|ПАО|АО)\s+["«]?[A-Za-zА-Яа-яЁё0-9 ._-]+["»]?|ИП\s+[A-Za-zА-Яа-яЁё -]+)/i,
		)?.[1];
		if (legal) return SmartImportEngine.cleanExtractedValue(legal);
		if (!/клиник|стоматолог|dental|dent|clinic/i.test(value)) return null;
		const withoutLabels = value
			.replace(/(?:название|клиника|clinic name|name)\s*[:=-]/i, " ")
			.replace(
				/(?:инн|inn|кпп|kpp|огрн|ogrn|адрес|address|тел|phone|email|сайт|website).*/i,
				" ",
			);
		const cleaned = SmartImportEngine.cleanExtractedValue(withoutLabels);
		return cleaned.length >= 3 && cleaned.length <= 240 ? cleaned : null;
	}

	private static extractAddress(value: string): string | null {
		const match = value.match(
			/(?:адрес|address|местонахождение)\s*[:=-]?\s*(.{5,500})/i,
		);
		if (!match?.[1]) return null;
		const cleaned = SmartImportEngine.cleanExtractedValue(
			match[1].replace(
				/(?:^|[\s;|,])(?:инн|inn|кпп|kpp|огрн|ogrn|тел|phone|email|сайт|website).*/i,
				"",
			),
		);
		return cleaned || null;
	}

	private static extractMedicalLicenseNumber(value: string): string | null {
		const match = value.match(
			/(?:лиценз[^\s:=-]*|license)\s*(?:№|#|n|no)?\s*[:=-]?\s*([A-Za-zА-Яа-яЁё0-9/.-]{3,80})/i,
		);
		return match?.[1] ? SmartImportEngine.cleanExtractedValue(match[1]) : null;
	}

	private static firstValidDigits(
		value: string,
		pattern: RegExp,
		allowedLengths: number[],
	): string | null {
		const match = value.match(pattern);
		if (!match?.[1]) return null;
		const digits = match[1].replace(/\D/g, "");
		return allowedLengths.includes(digits.length) ? digits : null;
	}

	private static addClinicField<K extends keyof UpdateClinicProfileInput>(
		fields: UpdateClinicProfileInput,
		warnings: string[],
		key: K,
		value: UpdateClinicProfileInput[K] | null | undefined,
		lineNumber: number,
	) {
		if (value === null || typeof value === "undefined") return;
		const normalized =
			typeof value === "string"
				? SmartImportEngine.cleanExtractedValue(value)
				: value;
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
}
