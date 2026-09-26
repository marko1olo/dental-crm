/**
 * Legacy source detection and migration plan synthesis.
 */
import type {
  SmartImportLineClassification,
  SmartImportLegacySource,
  SmartImportMigrationPlan,
  SmartImportClinicProfileSuggestion,
  SmartImportPublicLookupTarget
} from "@dental/shared";
import {
  migrationWorkstationProfiles,
  legacyDatabasePathPattern,
  imagingVendorPattern,
  imagingVendorSupplementalPattern,
  legacyMisTextPattern
} from "./smartImportsConstants.js";
import { clampConfidence } from "./smartImportsClassification.js";
import { migrationFingerprint } from "./smartImportsRoots.js";

export function extractLegacySourceRef(value: string) {
	return (
		value.match(/\bbrowser-local:[a-f0-9]{8,12}\b/i)?.[0] ??
		value.match(/\bsmart-preview:[a-f0-9]{8,12}\b/i)?.[0] ??
		value.match(/\bworkstation-profile:[a-f0-9]{8,12}\b/i)?.[0] ??
		value.match(/\bworkstation-signal:[a-f0-9]{8,12}\b/i)?.[0] ??
		value.match(/\bmigration-source:[a-f0-9]{8,12}\b/i)?.[0] ??
		value.match(legacyDatabasePathPattern)?.[0]?.trim() ??
		value.match(/https?:\/\/[^\s,;|]+/i)?.[0] ??
		value
			.match(
				/(?:[A-Za-zА-Яа-яЁё]:[\\/][^;|\n]+|\\\\[^;|\n]+|\/[^;|\n]+)(?:[\\/]DICOMDIR\b)?/i,
			)?.[0]
			?.trim() ??
		value.match(/\bDICOMDIR\b/i)?.[0] ??
		null
	);
}

export function detectLegacySourceKind(
	value: string,
	sourceRef: string | null,
): SmartImportLegacySource["kind"] {
	const text = `${value} ${sourceRef ?? ""}`.toLowerCase();
	if (/старая серверная база программы/.test(text)) return "firebird_database";
	if (/старая настольная база/.test(text)) return "access_database";
	if (/локальная база программы/.test(text)) return "sqlite_database";
	if (/резервная копия старой базы/.test(text)) return "sql_dump";
	if (
		/pacs|orthanc|dcm4chee|dicomweb|qido|wado|ae\s*title|dicom\s*server|пакс/.test(
			text,
		)
	)
		return "pacs_dicom";
	if (
		/\bdicomdir\b|dicom\s*(?:folder|папк|каталог)|(?:folder|папк|каталог|root|share|шара|archive|архив|export|выгруз).*(?:dicom|cbct|кт|ккт)/.test(
			text,
		)
	) {
		return "dicom_folder";
	}
	if (
		imagingVendorPattern.test(text) ||
		imagingVendorSupplementalPattern.test(text)
	) {
		return "vendor_imaging_system";
	}
	if (
		/(?:rvg|opg|оптг|рентген|снимк|xray|x-ray|photo|фото).*(?:folder|папк|каталог|archive|архив|export|выгруз|root|share|шара)|(?:folder|папк|каталог|archive|архив|export|выгруз|root|share|шара).*(?:rvg|opg|оптг|рентген|снимк|xray|x-ray|photo|фото)/.test(
			text,
		)
	) {
		return "xray_image_archive";
	}
	if (/\\\\|smb|network\s+share|сетев(?:ая|ой)\s+папк/.test(text))
		return "network_share";
	if (
		/\.fdb\b|\.gdb\b|\.fbk\b|\.ib\b|\.ibk\b|\.gbk\b|firebird|interbase/.test(
			text,
		)
	)
		return "firebird_database";
	if (/\.mdb\b|\.accdb\b|access\b/.test(text)) return "access_database";
	if (
		/\.dbf\b|\.dbt\b|\.fpt\b|\.cdx\b|\.idx\b|\.ntx\b|\.ndx\b|\.mdx\b|dbase|foxpro|visual\s*foxpro|clipper|paradox/.test(
			text,
		)
	)
		return "mis_database";
	if (/\.sqlite\b|\.sqlite3\b|sqlite|(?:^|[\\/])[^\\/]+\.(?:db)\b/.test(text))
		return "sqlite_database";
	if (
		/\.sql\b|\.dump\b|\.bak\b|\.dt\b|\.mdf\b|\.ldf\b|\.sdf\b|postgres|postgresql|mysql|mssql|sql\s*server/.test(
			text,
		)
	)
		return "sql_dump";
	if (/\.xlsx\b|\.xlsm\b|\.xlsb\b|\.xls\b|\.ods\b|excel|таблиц/.test(text))
		return "spreadsheet_export";
	if (/\.csv\b|\.tsv\b|\.json\b|\.xml\b/.test(text)) return "csv_export";
	if (/\.zip\b|\.7z\b|\.rar\b|\.tar\b|\.gz\b|архив/.test(text))
		return "archive_export";
	if (/open\s*dental|opendental|dentrix|eaglesoft|patterson/i.test(text)) {
		return "mis_database";
	}
	if (legacyMisTextPattern.test(text)) {
		return "mis_database";
	}
	return "unknown_legacy_source";
}

export const legacySourceTitles: Record<SmartImportLegacySource["kind"], string> = {
	mis_database: "Старая МИС или CRM",
	firebird_database: "Старая серверная база программы",
	access_database: "Старая настольная база",
	sqlite_database: "Локальная база программы",
	sql_dump: "Резервная копия старой базы",
	spreadsheet_export: "Табличная выгрузка",
	csv_export: "табличная выгрузка",
	archive_export: "Архив выгрузки",
	pacs_dicom: "Архив снимков клиники",
	dicom_folder: "Папка КЛКТ/снимков",
	xray_image_archive: "Архив RVG/ОПТГ/фото",
	vendor_imaging_system: "Программа снимков",
	network_share: "Сетевая папка обмена",
	unknown_legacy_source: "Неопознанный источник старой системы",
};

export function legacySourceEvidence(value: string, sourceRef: string | null) {
	const evidence = new Set<string>();
	if (sourceRef) evidence.add(`sourceRef=${sourceRef}`);
	if (
		/\.fdb|\.gdb|\.fbk|\.ib\b|\.ibk\b|\.gbk\b|firebird|interbase/i.test(value)
	)
		evidence.add("Firebird/InterBase");
	if (/\.mdb|\.accdb|access/i.test(value)) evidence.add("Access");
	if (
		/\.dbf|\.dbt|\.fpt|\.cdx|\.idx|\.ntx|\.ndx|\.mdx|dbase|foxpro|visual\s*foxpro|clipper|paradox/i.test(
			value,
		)
	)
		evidence.add("DBF/FoxPro/Clipper");
	if (/\.sqlite|\.sqlite3|sqlite|\.db\b/i.test(value))
		evidence.add("SQLite/DB файл");
	if (/\.1cd|\.dt|1c|1с/i.test(value)) evidence.add("1C база/выгрузка");
	if (
		/\.sql|\.dump|\.bak|\.mdf|\.ldf|\.sdf|postgres|mysql|mssql|sql server/i.test(
			value,
		)
	)
		evidence.add("SQL резервная копия");
	if (
		/\.csv|\.tsv|\.xls|\.xlsx|\.xlsm|\.xlsb|\.ods|\.xml|\.json|excel/i.test(
			value,
		)
	)
		evidence.add("табличная выгрузка");
	if (/\.zip|\.7z|\.rar|\.tar|\.gz|архив/i.test(value)) evidence.add("архив");
	if (/pacs|orthanc|dcm4chee|dicomweb|qido|wado|пакс/i.test(value))
		evidence.add("архив снимков");
	if (/\bDICOMDIR\b|dicom\s*(?:folder|папк|каталог)|cbct|кт|ккт/i.test(value))
		evidence.add("КЛКТ/КТ папка");
	if (/rvg|opg|оптг|рентген|xray|x-ray|снимк|фото/i.test(value))
		evidence.add("архив рентгена/фото");
	if (
		imagingVendorPattern.test(value) ||
		imagingVendorSupplementalPattern.test(value)
	)
		evidence.add("программа снимков");
	if (/open\s*dental|opendental|dentrix|eaglesoft|patterson/i.test(value))
		evidence.add("старая стоматологическая программа");
	if (legacyMisTextPattern.test(value)) evidence.add("старая МИС");
	if (/\\\\|smb|network share|сетев/i.test(value))
		evidence.add("сетевая папка");
	return Array.from(evidence);
}

export function safeLegacySourceAlias(
	kind: SmartImportLegacySource["kind"],
	sourceRef: string | null,
) {
	if (!sourceRef) return null;
	if (
		/^(?:browser-local|workstation-profile|workstation-signal|migration-source):[a-f0-9]{8,12}$/i.test(
			sourceRef,
		)
	)
		return sourceRef;
	return `${legacySourceTitles[kind]} #${migrationFingerprint(sourceRef).toUpperCase()}`;
}

export function safeLegacySourceEvidence(source: SmartImportLegacySource) {
	const alias =
		source.safeSourceAlias ??
		(source.sourceRef
			? safeLegacySourceAlias(source.kind, source.sourceRef)
			: null);
	return source.evidence.map((item) => {
		if (/^sourceRef=/i.test(item))
			return alias ? `sourceRef=${alias}` : "sourceRef=redacted";
		return item;
	});
}

export function smartImportReportSourceText(line: SmartImportLineClassification) {
	if (line.kind !== "legacy_source") return line.text;
	return "сырой путь или название старого источника скрыты; используйте строку-псевдоним источника для передачи";
}

export function legacySourcePlaybook(
	kind: SmartImportLegacySource["kind"],
): Pick<
	SmartImportLegacySource,
	| "requiredArtifacts"
	| "recommendedRoute"
	| "automationLevel"
	| "privacy"
	| "nextAction"
> {
	const privacy =
		"Работать локально или через модуль только для чтения; не отправлять базу пациентов, снимки и телефоны в карты, поиск или публичные сервисы.";
	if (kind === "csv_export" || kind === "spreadsheet_export") {
		return {
			requiredArtifacts: [
				"Файл с пациентами: ФИО, телефон, дата рождения, комментарий",
				"Отдельные таблицы визитов/оплат/услуг, если есть",
				"Кодировка файла и разделитель колонок",
			],
			recommendedRoute:
				"Загрузить или вставить через разбор документов, затем открыть предпросмотр импорта.",
			automationLevel: "ready_for_preview",
			privacy,
			nextAction:
				"Вставить первые строки выгрузки или загрузить файл; готовые строки можно записывать после предпросмотра.",
		};
	}
	if (kind === "pacs_dicom") {
		return {
			requiredArtifacts: [
				"Папка исследования или адрес архива снимков",
				"Права только на чтение",
				"Идентификаторы пациента/исследования для сопоставления",
			],
			recommendedRoute:
				"Использовать проверку папки снимков или подключение архива снимков; сначала список серии, тяжелые данные не копировать в CRM без выбора серии.",
			automationLevel: "needs_local_bridge",
			privacy,
			nextAction:
				"Проверить адрес или папку, получить список серий и привязать только подтвержденные исследования.",
		};
	}
	if (kind === "dicom_folder") {
		return {
			requiredArtifacts: [
				"Корневая папка исследования/экспорта КТ",
				"Доступ к папке только для чтения, без перемещения оригиналов",
				"Лимит сканирования и список поддерживаемых расширений",
			],
			recommendedRoute:
				"Запустить проверку папки снимков: сначала список серии, внутренние коды исследования/серии, тип снимка, даты и подсказки пациента; тяжелые данные не грузить до выбора серии.",
			automationLevel: "needs_local_bridge",
			privacy,
			nextAction:
				"Подключить папку как источник только для чтения и построить список исследований для сверки.",
		};
	}
	if (kind === "vendor_imaging_system") {
		return {
			requiredArtifacts: [
				"Название и версия программы снимков",
				"Штатная выгрузка снимков или папка хранения",
				"Если есть: табличный список пациентов и исследований",
				"Пароль/учетка только на чтение, если экспорт требует входа",
			],
			recommendedRoute:
				"Сначала использовать штатную выгрузку снимков или табличный список; прямой разбор внутренней базы программы снимков только через локальный модуль и предпросмотр.",
			automationLevel: "needs_local_bridge",
			privacy,
			nextAction:
				"Выбрать самый быстрый доступный экспорт: папка КЛКТ/ОПТГ, табличный список для сопоставления пациентов, затем предпросмотр импорта.",
		};
	}
	if (kind === "xray_image_archive") {
		return {
			requiredArtifacts: [
				"Папка или архив RVG/ОПТГ/TRG/фото",
				"Правило именования файлов или соседняя таблица связи пациент-файл",
				"Доступ только для чтения; оригиналы не переименовывать",
			],
			recommendedRoute:
				"Построить список снимков по путям, датам, типам снимков и подсказкам пациента; запись делать только после предпросмотра и ручного сопоставления.",
			automationLevel: "needs_local_bridge",
			privacy,
			nextAction:
				"Сканировать папку в список, показать неподтвержденные совпадения отдельно и не копировать тяжелые файлы до выбора.",
		};
	}
	if (kind === "archive_export") {
		return {
			requiredArtifacts: [
				"Оригинальный архив без распаковки поверх рабочей базы",
				"Пароль от архива, если есть",
				"Описание, что внутри: пациенты, оплаты, снимки, документы",
			],
			recommendedRoute:
				"Открывать архив как источник для чернового разбора: сначала список файлов и извлеченный текст, затем маршруты пациентов, снимков и документов.",
			automationLevel: "needs_file_upload",
			privacy,
			nextAction:
				"Загрузить архив в разбор документов или распаковать в отдельную папку только для чтения.",
		};
	}
	if (kind === "network_share") {
		return {
			requiredArtifacts: [
				"UNC/SMB путь к папке обмена",
				"Пользователь с правами только на чтение",
				"Лимит сканирования и список подпапок, которые нельзя трогать",
			],
			recommendedRoute:
				"Подключить локальный модуль только для чтения и построить список; не копировать все подряд.",
			automationLevel: "needs_local_bridge",
			privacy,
			nextAction:
				"Дать путь к папке и запустить ограниченное сканирование; CRM должна показать список до записи.",
		};
	}
	if (
		kind === "firebird_database" ||
		kind === "access_database" ||
		kind === "sqlite_database" ||
		kind === "sql_dump" ||
		kind === "mis_database"
	) {
		return {
			requiredArtifacts: [
				"Копия базы или резервная копия, снятая при выключенной старой программе",
				"Версия старой МИС и пароль/пользователь только на чтение, если нужен",
				"Словарь таблиц или хотя бы скрин списка пациентов/визитов",
				"Контрольная выгрузка 10 пациентов для сверки после импорта",
			],
			recommendedRoute:
				"Сначала локальный черновой разбор: извлечь пациентов, контакты, визиты, оплаты и ссылки на снимки в табличный список, затем прогнать предпросмотр импорта.",
			automationLevel: "needs_local_bridge",
			privacy,
			nextAction:
				"Не подключаться к живой базе старой МИС. Снять копию, разобрать ее локально и сверить первые 10 карт.",
		};
	}
	return {
		requiredArtifacts: [
			"Название старой программы или формат файла",
			"Пример 5-10 строк без лишних персональных данных, если можно",
			"Путь к файлу/папке или безопасная копия",
		],
		recommendedRoute:
			"Сначала ручная идентификация источника, затем выбор маршрута разбора.",
		automationLevel: "manual_review",
		privacy,
		nextAction:
			"Уточнить формат: база, таблица, архив, архив снимков или папка снимков.",
	};
}

export function buildLegacySources(
	lines: SmartImportLineClassification[],
): SmartImportLegacySource[] {
	const sources = new Map<string, SmartImportLegacySource>();
	for (const line of lines) {
		const sourceRef = extractLegacySourceRef(line.text);
		const kind = detectLegacySourceKind(line.text, sourceRef);
		const playbook = legacySourcePlaybook(kind);
		const evidence = legacySourceEvidence(line.text, sourceRef);
		const safeSourceAlias = safeLegacySourceAlias(kind, sourceRef);
		const confidence = clampConfidence(
			line.confidence + Math.min(0.18, evidence.length * 0.03),
		);
		const key = `${kind}:${sourceRef ?? line.text.toLowerCase().slice(0, 80)}`;
		const current = sources.get(key);
		if (current) {
			sources.set(key, {
				...current,
				confidence: Math.max(current.confidence, confidence),
				evidence: Array.from(new Set([...current.evidence, ...evidence])),
			});
			continue;
		}
		sources.set(key, {
			kind,
			title: legacySourceTitles[kind],
			confidence,
			sourceRef,
			safeSourceAlias,
			evidence,
			...playbook,
		});
	}
	return Array.from(sources.values()).sort(
		(left, right) => right.confidence - left.confidence,
	);
}

export function buildMigrationPlan(input: {
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
				? `Найдено полей: ${Object.keys(input.clinicSuggestion.fields).length}, уверенность ${Math.round(input.clinicSuggestion.confidence * 100)}%.`
				: "Автоматически реквизиты не найдены.",
			nextAction: input.clinicSuggestion
				? "Сверить подсказку с документами/картами и перенести в профиль."
				: "Добавить название, ИНН, адрес или ссылку на карты.",
		},
		{
			id: "legacy_sources",
			title: "Источники старой базы и файлов",
			status: input.legacySources.length
				? input.legacySources.some(
						(source) => source.automationLevel === "ready_for_preview",
					)
					? "ready"
					: "review"
				: "manual",
			detail: input.legacySources.length
				? `Найдено источников: ${input.legacySources.length}. ${input.legacySources
						.map((source) => legacySourceTitles[source.kind])
						.join(", ")}.`
				: "Пути к старым базам, таблицам, архивам снимков или сетевым папкам не найдены.",
			nextAction: input.legacySources.length
				? "Подготовить указанные артефакты и запускать только черновой разбор только для чтения."
				: "Указать, откуда мигрировать: файл базы, таблица, архив, архив снимков или папка снимков.",
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
				? `Пациентских строк: ${input.patientRows}, готово к записи: ${input.patientReadyRows}.`
				: "Строки пациентов не распознаны.",
			nextAction: input.patientReadyRows
				? "Записать только готовые строки, предупреждения исправить отдельно."
				: "Вставить таблицу, выгрузку из старой программы или OCR списка пациентов.",
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
				? `Строк снимков: ${input.imagingRows}, готово к привязке: ${input.imagingReadyRows}.`
				: "Снимки не распознаны в этом входе.",
			nextAction: input.imagingReadyRows
				? "Привязать готовые строки; тяжелые КЛКТ оставить только как метаданные до выбора папки."
				: "Добавить список, папку или выгрузку снимков.",
		},
		{
			id: "public_lookup",
			title: "Сетевой добор из карт/реестров",
			status: input.publicLookupTargets.length ? "manual" : "blocked",
			detail: input.publicLookupTargets.length
				? `Подготовлено безопасных публичных запросов: ${input.publicLookupTargets.length}.`
				: "Нет названия/ИНН/адреса, по чему можно безопасно искать.",
			nextAction: input.publicLookupTargets.length
				? "Открыть ссылки и вручную подтвердить факты перед записью."
				: "Указать публичную информацию клиники, не пациентов.",
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
			"Публичный поиск должен использовать только название, ИНН, адрес и сайт клиники.",
			"ФИО, телефоны, даты рождения и снимки не отправляются в карты/поисковики.",
			"Старые базы и архивы разбираются только как черновой источник только для чтения; автоматическая запись разрешена только после предпросмотра.",
		],
		nextAction:
			input.clinicSuggestion ||
			input.patientReadyRows ||
			input.imagingReadyRows ||
			input.legacySources.length
				? "Проверить подсказки, затем записывать только готовые строки."
				: "Добавить экспорт старой МИС, список файлов или реквизиты клиники.",
	};
}

