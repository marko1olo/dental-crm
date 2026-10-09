import {
	type DocumentIngestionKind,
	type DocumentIngestionQuality,
	type DocumentIngestionRequest,
	type DocumentIngestionResponse,
	type DocumentIngestionRoute,
	type DocumentIngestionTarget,
	documentIngestionResponseSchema,
} from "@dental/shared";
import {
	extractDocx,
	extractOpenDocument,
	extractPptx,
	extractXlsx,
	stripHtml,
	stripRtf,
} from "./officeParsers.js";
import { extractPdf } from "./pdfParser.js";
import {
	type ExtractedArchiveFile,
	type ExtractedDocument,
	maxExtractedTextChars,
} from "./types.js";
import {
	countRows,
	decodeBase64,
	decodeText,
	extensionOf,
	isIgnoredArchiveEntry,
	isImagingEntry,
	looksTabular,
	normalizeText,
	readZipEntries,
	safeFileLabel,
} from "./zipReader.js";

export function isLegacyDatabaseExtension(ext: string): boolean {
	return [
		"fdb",
		"gdb",
		"mdb",
		"accdb",
		"sqlite",
		"sqlite3",
		"db",
		"dbf",
	].includes(ext);
}

export function isLegacyDumpExtension(ext: string): boolean {
	return ["bak", "dump", "sql", "backup"].includes(ext);
}

export function detectKind(
	fileName: string,
	mimeType: string | null | undefined,
	buffer: Buffer,
	rawText?: string,
): DocumentIngestionKind {
	const ext = extensionOf(fileName);
	if (isLegacyDatabaseExtension(ext)) return "legacy_database";
	if (isLegacyDumpExtension(ext)) return "legacy_dump";
	if (
		buffer.length >= 16 &&
		buffer.subarray(0, 16).toString("latin1") === "SQLite format 3\u0000"
	)
		return "legacy_database";
	if (["txt"].includes(ext)) return "txt";
	if (["csv"].includes(ext)) return "csv";
	if (["tsv"].includes(ext)) return "tsv";
	if (["json"].includes(ext)) return "json";
	if (["xml"].includes(ext)) return "xml";
	if (["html", "htm"].includes(ext)) return "html";
	if (["rtf"].includes(ext)) return "rtf";
	if (
		ext === "pdf" ||
		(buffer.length >= 4 && buffer.subarray(0, 4).toString("latin1") === "%PDF")
	)
		return "pdf";
	if (ext === "docx") return "docx";
	if (ext === "xlsx" || ext === "xlsm") return "xlsx";
	if (ext === "pptx") return "pptx";
	if (ext === "odt") return "odt";
	if (ext === "ods") return "ods";
	if (ext === "odp") return "odp";
	if (
		ext === "zip" ||
		(buffer.length >= 4 &&
			buffer.subarray(0, 4).toString("latin1") === "PK\u0003\u0004")
	)
		return "zip";
	if (
		["jpg", "jpeg", "png", "webp", "tif", "tiff", "bmp"].includes(ext) ||
		mimeType?.startsWith("image/")
	)
		return "image";
	if (mimeType?.includes("spreadsheet")) return "xlsx";
	if (mimeType?.includes("wordprocessingml")) return "docx";
	if (mimeType?.includes("presentationml")) return "pptx";
	if (rawText?.trim()) return "txt";
	return "unknown";
}

export function legacyFileFormatLabel(
	fileName: string,
	kind: DocumentIngestionKind,
): string {
	const ext = extensionOf(fileName);
	if (ext === "fdb" || ext === "gdb") return "база Firebird/InterBase";
	if (ext === "mdb" || ext === "accdb") return "база Access";
	if (ext === "sqlite" || ext === "sqlite3" || ext === "db")
		return "база SQLite";
	if (ext === "dbf") return "таблица DBF/FoxPro";
	if (ext === "sql") return "SQL-дамп";
	if (ext === "bak" || ext === "dump" || ext === "backup")
		return "резервная копия базы";
	return kind === "legacy_database"
		? "старая база"
		: "резервная копия старой базы";
}

export function legacyKindLabel(kind: DocumentIngestionKind): string {
	return kind === "legacy_database"
		? "старая база"
		: "резервная копия старой базы";
}

export function legacyStagingManifest(input: {
	fileName: string;
	kind: DocumentIngestionKind;
	byteSize: number;
}): string {
	const safeLabel = safeFileLabel(input.fileName, "Источник миграции");
	const formatLabel = legacyFileFormatLabel(input.fileName, input.kind);
	return [
		`Источник старой базы: ${formatLabel} ${safeLabel}`,
		`Тип источника: ${legacyKindLabel(input.kind)}`,
		`Размер источника: ${input.byteSize} байт`,
		"Маршрут переноса: локальный модуль только для чтения -> проверочный список таблиц -> предварительный просмотр умного импорта",
		"Что подготовить: отдельную копию или резервную копию, версию старой МИС, учетку только для чтения при необходимости, словарь таблиц, 10 контрольных карт пациентов",
		"Ограничение: файл базы, имена, телефоны, даты рождения и пиксели снимков не отправляются во внешние поисковые сервисы",
	].join("\n");
}

export function extractByKind(
	kind: DocumentIngestionKind,
	buffer: Buffer,
): ExtractedDocument {
	try {
		if (["txt", "csv", "tsv", "json", "xml"].includes(kind)) {
			return {
				text: decodeText(buffer),
				tableCount: looksTabular(decodeText(buffer)) ? 1 : 0,
				warnings: [],
				parserNotes: [`${kind.toUpperCase()} decoded as text.`],
			};
		}
		if (kind === "html") {
			const text = stripHtml(decodeText(buffer));
			return {
				text,
				tableCount: looksTabular(text) ? 1 : 0,
				warnings: [],
				parserNotes: ["HTML tags stripped."],
			};
		}
		if (kind === "rtf") {
			const text = stripRtf(decodeText(buffer));
			return {
				text,
				tableCount: looksTabular(text) ? 1 : 0,
				warnings: [],
				parserNotes: ["RTF controls stripped with built-in parser."],
			};
		}
		if (kind === "pdf") return extractPdf(buffer);
		if (kind === "docx") return extractDocx(buffer);
		if (kind === "xlsx") return extractXlsx(buffer);
		if (kind === "pptx") return extractPptx(buffer);
		if (kind === "odt" || kind === "ods" || kind === "odp")
			return extractOpenDocument(buffer, kind);
		return {
			text: "",
			tableCount: 0,
			warnings: [`unsupported_archive_entry_kind:${kind}`],
			parserNotes: [],
		};
	} catch (err: unknown) {
		return {
			text: "",
			tableCount: 0,
			warnings: [`extract_by_kind_error:${kind}:${(err as Error).message}`],
			parserNotes: [`Ошибка разбора формата ${kind}`],
		};
	}
}

export function extractZipArchive(
	buffer: Buffer,
	archiveName: string,
): ExtractedDocument & { extractedFiles: ExtractedArchiveFile[] } {
	const zip = readZipEntries(buffer);
	const warnings = [...zip.warnings];
	const safeArchiveName = safeFileLabel(archiveName, "Архив");
	const parserNotes = [
		"ZIP-архив разобран только для чтения; текст и таблицы извлечены, бинарные снимки показаны как строки списка файлов.",
		"Имена файлов внутри архива скрыты безопасными метками перед показом предпросмотра.",
	];
	const extractedFiles: ExtractedArchiveFile[] = [];
	const textParts: string[] = [];
	let tableCount = 0;
	let processedEntries = 0;

	for (const entry of zip.entries) {
		if (isIgnoredArchiveEntry(entry.name)) continue;
		processedEntries += 1;
		if (processedEntries > 80) {
			warnings.push("zip_entry_limit_reached");
			break;
		}

		const kind = detectKind(entry.name, null, entry.data);
		const safeEntryName = safeFileLabel(entry.name, "Файл архива");
		if (kind === "zip") {
			warnings.push(`zip_nested_archive_skipped:${safeEntryName}`);
			extractedFiles.push({
				fileName: safeEntryName,
				detectedKind: kind,
				rowCount: 0,
				tableCount: 0,
				textPreview: "",
				warnings: ["nested_archive_skipped"],
			});
			continue;
		}

		if (kind === "image" || isImagingEntry(entry.name)) {
			const manifestLine = `${safeArchiveName}::${safeEntryName}`;
			textParts.push(manifestLine);
			extractedFiles.push({
				fileName: safeEntryName,
				detectedKind: kind === "unknown" ? "image" : kind,
				rowCount: 1,
				tableCount: 0,
				textPreview: manifestLine,
				warnings: ["binary_file_listed_as_manifest_reference"],
			});
			continue;
		}

		const extracted = extractByKind(kind, entry.data);
		const text = normalizeText(extracted.text);
		tableCount += extracted.tableCount || (looksTabular(text) ? 1 : 0);
		warnings.push(
			...extracted.warnings.map((warning) => `${safeEntryName}:${warning}`),
		);
		extractedFiles.push({
			fileName: safeEntryName,
			detectedKind: kind,
			rowCount: countRows(text),
			tableCount: extracted.tableCount || (looksTabular(text) ? 1 : 0),
			textPreview: text.slice(0, 420),
			warnings: extracted.warnings,
		});
		if (text) textParts.push(`--- ${safeEntryName} ---\n${text}`);
	}

	if (!textParts.length && !zip.entries.length)
		warnings.push("zip_no_supported_entries");

	return {
		text: normalizeText(textParts.join("\n\n")),
		tableCount,
		warnings,
		parserNotes,
		extractedFiles,
	};
}

export function hasAnyHint(text: string, hints: string[]): boolean {
	const lower = text.toLowerCase();
	return hints.some((hint) => lower.includes(hint));
}

export function collectSignals(
	kind: DocumentIngestionKind,
	text: string,
	warnings: string[],
): string[] {
	const signals: string[] = [];
	// Защита от зависаний regex (ReDoS): анализ сигналов на репрезентативной выборке
	const sampleText = text.slice(0, 35_000);
	const normalized = sampleText.toLowerCase();

	if (kind === "zip") signals.push("архив");
	if (kind === "image") signals.push("изображение");
	if (kind === "pdf") signals.push("PDF");
	if (kind === "legacy_database") signals.push("старая база");
	if (kind === "legacy_dump") signals.push("резервная копия старой базы");
	if (warnings.includes("pdf_text_not_extracted_may_be_scanned"))
		signals.push("PDF может быть сканом");
	if (looksTabular(sampleText)) signals.push("похоже на таблицу");
	if (/[А-Яа-яЁё]/.test(sampleText)) signals.push("русский текст");

	// Безопасный не-бэктрекинговый паттерн телефона РФ/международного формата
	if (
		/(?:\+?7|8)?[\s(]*\d{3}[)\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/.test(
			sampleText,
		)
	) {
		signals.push("похож на телефон");
	}

	if (/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/.test(sampleText))
		signals.push("похоже на дату");

	const hasDentalServiceSignal =
		/(?:корон|имплант|реставрац|брекет|элайн|гигиен|канал|пломб|винир|абатмент|мембран|костн)/i.test(
			sampleText,
		);
	if (
		/(?:руб|₽|р\.|price|стоимость)/i.test(sampleText) ||
		(hasDentalServiceSignal && /\b\d{3,7}\b/.test(sampleText))
	) {
		signals.push("похоже на цену");
	}
	if (
		/\b(?:rvg|opg|cbct|dicom|dcm|jpg|png)\b|(?:оптг|кт|трг|рентген|сним)/i.test(
			sampleText,
		)
	)
		signals.push("похоже на снимки");
	if (hasDentalServiceSignal) signals.push("похоже на услуги");
	if (/(?:договор|акт|соглас|справк|вычет|паспорт|полис)/i.test(sampleText))
		signals.push("похоже на документ");

	// Профильная стоматологическая Форма 043/у
	const hasForm043Signal =
		/(?:форма\s*(?:№\s*)?043\s*[/уy]|карта\s*стоматологического|зубная\s*формула|прикус|состояние\s*слизистой|зубной\s*ряд|кпу|ohi-s|дневник\s*врача|осмотр\s*полости\s*рта|амбулаторная\s*карта\s*стоматолог|043[-/ ]*у)/i.test(
			sampleText,
		);
	if (hasForm043Signal) {
		signals.push("форма 043/у");
		signals.push("стоматологическая карта");
	}

	if (
		normalized.includes(".xlsx") ||
		normalized.includes(".csv") ||
		normalized.includes(".docx") ||
		normalized.includes(".pdf")
	) {
		signals.push("есть ссылки на файлы");
	}
	if (
		/legacy|migration|старая|мис|backup|dump|firebird|access|sqlite|pacs|dicomweb/i.test(
			sampleText,
		)
	) {
		signals.push("похоже на источник миграции");
	}
	return Array.from(new Set(signals));
}

export function routesFor(
	kind: DocumentIngestionKind,
	text: string,
	target: DocumentIngestionTarget,
): DocumentIngestionRoute[] {
	const hasText = Boolean(text.trim());
	const tabular = looksTabular(text);
	const hasImagingHint = hasAnyHint(text, [
		"rvg",
		"opg",
		"\u043e\u043f\u0442\u0433",
		"\u043a\u0442",
		"cbct",
		"dicom",
		".dcm",
		".jpg",
		".png",
	]);
	const hasPricelistHint =
		/\b\d{4,6}\b/.test(text) ||
		hasAnyHint(text, [
			"\u0440\u0443\u0431",
			"\u20bd",
			"\u043a\u043e\u0440\u043e\u043d",
			"\u0438\u043c\u043f\u043b\u0430\u043d\u0442",
			"\u0440\u0445\u0441\u0442\u0430\u0432\u0440\u0430\u0446",
			"\u0433\u0438\u0433\u0438\u0435\u043d",
			"\u0431\u0440\u0435\u043a\u0435\u0442",
			"\u044d\u043b\u0430\u0439\u043d",
			"zircon",
			"crown",
			"implant",
			"aligner",
		]);
	const hasForm043Hint = hasAnyHint(text, [
		"043",
		"043/у",
		"043-у",
		"зубная формула",
		"карта стоматологического",
		"дневник",
		"прикус",
	]);

	const legacySource = kind === "legacy_database" || kind === "legacy_dump";
	const routes: DocumentIngestionRoute[] = [
		{
			target: "smart_import",
			title: hasForm043Hint
				? "Предпросмотр карты 043/у и импорта"
				: "Предпросмотр умного импорта",
			endpoint: "/api/imports/smart/preview",
			enabled: hasText,
			reason: legacySource
				? "Старая база или резервная копия превращены в проверочный список; запись возможна только после локального разбора только для чтения и предварительного просмотра."
				: hasForm043Hint
					? "Обнаружена стоматологическая карта (Форма 043/у); предпросмотр позволяет нормализовать паспортные данные, зубную формулу и дневник приёма."
					: hasText
						? "Может разделить смешанные строки пациентов и снимков перед записью."
						: "Текст пока не извлечен.",
		},
		{
			target: "patients",
			title: "Предпросмотр импорта пациентов",
			endpoint: "/api/imports/patients/intake",
			enabled: hasText && !legacySource,
			reason: legacySource
				? "Старую базу нельзя напрямую писать как пациентов; сначала нужен локальный разбор только для чтения."
				: hasForm043Hint
					? "Из Формы 043/у можно напрямую извлечь ФИО, дату рождения, телефон, диагноз и соматический статус пациента."
					: tabular
						? "Похоже на таблицу или экспорт."
						: "Свободный текст можно нормализовать в строки пациентов.",
		},
		{
			target: "imaging",
			title: "Предпросмотр списка снимков",
			endpoint: "/api/imaging/imports/preview",
			enabled: hasText && hasImagingHint && !legacySource,
			reason: legacySource
				? "Сначала извлечь пути к снимкам из старой базы в проверочный список; не сканировать бинарную базу как снимки."
				: "Доступно, когда найдены пути к файлам или признаки снимков.",
		},
		{
			target: "pricelist",
			title: "Разбор прайс-листа",
			endpoint: "/api/pricelist/analyze",
			enabled: hasText && hasPricelistHint,
			reason:
				"Доступно, когда найдены цены или названия стоматологических услуг.",
		},
		{
			target: "plain_text",
			title: "Проверка обычного текста",
			endpoint: "",
			enabled: hasText,
			reason: "Безопасно для ручной проверки и переноса.",
		},
	];

	if (kind === "image") {
		routes.forEach((route) => {
			route.enabled = target === "pricelist" && route.target === "pricelist";
			route.reason = route.enabled
				? "Изображение будет сохранено для распознавания прайса."
				: "Для изображения сначала нужно распознавание: используйте фото прайса или поток AI-анализа.";
		});
	}
	if (legacySource) {
		routes.forEach((route) => {
			if (route.target === "smart_import" || route.target === "plain_text")
				return;
			route.enabled = false;
		});
	}
	return routes.sort(
		(left, right) =>
			Number(right.target === target) - Number(left.target === target),
	);
}

export function qualityFor(
	kind: DocumentIngestionKind,
	text: string,
	target: DocumentIngestionTarget,
	routes: DocumentIngestionRoute[],
	warnings: string[],
): DocumentIngestionQuality {
	const signals = collectSignals(kind, text, warnings);
	const enabledRoutes = routes.filter((route) => route.enabled);
	const selectedRoute =
		enabledRoutes.find((route) => route.target === target) ??
		enabledRoutes[0] ??
		routes[0];
	const suggestedTarget = selectedRoute?.enabled
		? selectedRoute.target
		: target;
	const hasText = Boolean(text.trim());

	if (kind === "legacy_database" || kind === "legacy_dump") {
		return {
			extractionQuality: "review",
			confidence: 0.86,
			suggestedTarget: "smart_import",
			signals,
			nextAction:
				"Открыть предварительный просмотр умного импорта по проверочному списку. Реальные таблицы старой базы разбирать только локальным модулем только для чтения, затем сверить 10 контрольных карт.",
		};
	}

	if (signals.includes("форма 043/у")) {
		return {
			extractionQuality: "ready",
			confidence: 0.92,
			suggestedTarget: "smart_import",
			signals,
			nextAction:
				"Обнаружена амбулаторная карта стоматологического больного (Форма 043/у). Откройте предпросмотр для проверки паспортных данных, зубной формулы и дневника посещений перед созданием электронной карты.",
		};
	}

	if (kind === "image" && target === "pricelist") {
		return {
			extractionQuality: "ocr_required",
			confidence: 0.72,
			suggestedTarget: "pricelist",
			signals,
			nextAction:
				"Сохраните сжатое изображение и запустите распознавание прайса; не записывайте данные без проверки структуры.",
		};
	}

	if (
		kind === "image" ||
		warnings.includes("pdf_text_not_extracted_may_be_scanned")
	) {
		return {
			extractionQuality: "ocr_required",
			confidence: 0.64,
			suggestedTarget,
			signals,
			nextAction:
				"Сначала запустите распознавание изображения; локальный извлекатель не может прочитать файл как структурированный текст.",
		};
	}

	if (!hasText) {
		return {
			extractionQuality: "unsupported",
			confidence: 0.2,
			suggestedTarget,
			signals,
			nextAction:
				"Конвертируйте файл или используйте распознавание изображения перед импортом. Из этого результата ничего нельзя записывать.",
		};
	}

	const routeConfidence = selectedRoute?.enabled ? 0.28 : 0;
	const signalConfidence = Math.min(0.42, signals.length * 0.06);
	const volumeConfidence = Math.min(0.2, Math.max(0, text.length - 20) / 900);
	const confidence = Math.max(
		0.35,
		Math.min(
			0.98,
			0.24 + routeConfidence + signalConfidence + volumeConfidence,
		),
	);

	return {
		extractionQuality:
			selectedRoute?.enabled && confidence >= 0.68 ? "ready" : "review",
		confidence: Number(confidence.toFixed(2)),
		suggestedTarget,
		signals,
		nextAction:
			selectedRoute?.enabled && confidence >= 0.68
				? "Откройте предложенный предпросмотр и проверьте строки перед записью."
				: "Проверьте извлеченный текст и выберите маршрут вручную; уверенности недостаточно для автоматического шага.",
	};
}

export function extractDocument(
	input: DocumentIngestionRequest,
): DocumentIngestionResponse {
	const buffer = decodeBase64(input.fileBase64);
	const rawText = input.rawText?.trim() ? normalizeText(input.rawText) : "";
	const kind = detectKind(input.fileName, input.mimeType, buffer, rawText);
	const warnings: string[] = [];
	const parserNotes: string[] = [];
	let extractedFiles: ExtractedArchiveFile[] = [];
	let text = rawText;
	let tableCount = 0;

	try {
		if (!text && buffer.length) {
			if (kind === "zip") {
				const extracted = extractZipArchive(buffer, input.fileName);
				text = extracted.text;
				tableCount = extracted.tableCount;
				extractedFiles = extracted.extractedFiles;
				warnings.push(...extracted.warnings);
				parserNotes.push(...extracted.parserNotes);
			} else if (
				[
					"txt",
					"csv",
					"tsv",
					"json",
					"xml",
					"html",
					"rtf",
					"pdf",
					"docx",
					"xlsx",
					"pptx",
					"odt",
					"ods",
					"odp",
				].includes(kind)
			) {
				const extracted = extractByKind(kind, buffer);
				text = extracted.text;
				tableCount = extracted.tableCount;
				warnings.push(...extracted.warnings);
				parserNotes.push(...extracted.parserNotes);
			} else if (kind === "image") {
				warnings.push("image_requires_ocr_or_vision");
				parserNotes.push(
					"Получено изображение; перед текстовым импортом нужен поток распознавания изображения.",
				);
			} else if (kind === "legacy_database" || kind === "legacy_dump") {
				text = legacyStagingManifest({
					fileName: input.fileName,
					kind,
					byteSize: buffer.length,
				});
				warnings.push("legacy_source_staging_manifest_only");
				parserNotes.push(
					"Получена старая база или резервная копия; бинарное содержимое не расшифровывалось и не возвращалось.",
				);
				parserNotes.push(
					"Используйте локальный модуль только для чтения, чтобы выгрузить пациентов, визиты, платежи и ссылки на снимки в проверяемые списки.",
				);
			} else {
				text = decodeText(buffer);
				warnings.push("unknown_format_decoded_as_text");
			}
		}
	} catch (err: unknown) {
		const msg = (err as Error).message || "corrupted_file";
		warnings.push(`extraction_failed:${msg}`);
		parserNotes.push(
			`Не удалось разобрать внутреннюю структуру файла (${msg}). Попытка аварийного текстового декодирования.`,
		);
		if (!text) {
			try {
				text = decodeText(buffer.subarray(0, 50_000));
			} catch {
				text = "";
			}
		}
	}

	if (text.length > maxExtractedTextChars) {
		text = text.slice(0, maxExtractedTextChars);
		warnings.push("extracted_text_truncated");
	}
	if (!text.trim()) warnings.push("no_text_extracted");
	if (!tableCount && looksTabular(text)) tableCount = 1;
	const uniqueWarnings = Array.from(new Set(warnings));
	const routes = routesFor(kind, text, input.target);

	return documentIngestionResponseSchema.parse({
		fileName: safeFileLabel(input.fileName, "Файл"),
		mimeType: input.mimeType ?? null,
		detectedKind: kind,
		byteSize: buffer.length,
		extractedText: text,
		textPreview: text.slice(0, 1200),
		rowCount: countRows(text),
		tableCount,
		extractedFiles,
		routes,
		quality: qualityFor(kind, text, input.target, routes, uniqueWarnings),
		warnings: uniqueWarnings,
		parserNotes: parserNotes.length
			? parserNotes
			: ["Input text accepted without binary extraction."],
	});
}
