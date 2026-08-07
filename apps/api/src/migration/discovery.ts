import type { Dirent, Stats } from "node:fs";
import { open, readdir, stat } from "node:fs/promises";
import path from "node:path";
import {
	looksLikeDicom,
	mayBeDicomFileName,
	readDicomMetadata,
} from "./formats/dicom.js";
import {
	type FormatSignature,
	identifyFormat,
	type SourceFormatId,
} from "./formats/signatures.js";
import { inspectSqlite } from "./formats/sqlite.js";

/**
 * Поиск баз старых систем на диске.
 *
 * ЧТО БЫЛО
 * routes/smartImports.ts содержит около шести тысяч строк поиска, который
 * перечисляет каталоги, присваивает им «оценку вероятности» и выдаёт оператору
 * набор советов: проверить готовность, собрать «bridge kit», пройти чек-лист.
 * Ни один файл при этом не открывается. То есть поиск сообщает, что «в
 * C:\IDENT\DATA вероятно есть база», не проверив, есть ли она там.
 *
 * ЧТО ЗДЕСЬ
 * Каждый файл-кандидат открывается и опознаётся по содержимому. Результат —
 * не вероятность, а факт: это Firebird ODS 12, читать не умеем, вот что делать;
 * это DBF FoxPro на 41 320 записей, читаем, вот колонки; это SQLite с таблицами
 * patients и visits, читаем, вот сколько строк.
 *
 * БЕЗОПАСНОСТЬ ОБХОДА
 * Обход ограничен по глубине, числу файлов и времени, и не выходит за пределы
 * заданных корней. Каталоги операционной системы пропускаются: искать базу
 * клиники в C:\Windows незачем, а обойти её целиком — это часы и риск упереться
 * в файлы, которые нельзя читать.
 */

/** Пределы обхода. Подобраны так, чтобы поиск занимал секунды, а не минуты. */
const MAX_DEPTH = 6;
const MAX_FILES_SCANNED = 20_000;
const MAX_CANDIDATES = 400;
const SCAN_TIME_BUDGET_MS = 45_000;

/** Байт, читаемых от каждого файла для опознания. */
const PROBE_BYTES = 4096;

/** Файл меньше этого размера базой быть не может. */
const MIN_CANDIDATE_BYTES = 64;

/**
 * Каталоги, в которые заходить бессмысленно.
 *
 * Это не оптимизация, а условие работоспособности: без отсечения обход
 * C:\Windows и node_modules занимает минуты и упирается в тысячи файлов,
 * которые к клинике отношения не имеют.
 */
const SKIP_DIRECTORY_NAMES = new Set([
	"windows",
	"winnt",
	"$recycle.bin",
	"system volume information",
	"recovery",
	"perflogs",
	"node_modules",
	".git",
	".svn",
	"appdata\\locallow",
	"msocache",
	"programdata\\package cache",
	"temp",
	"tmp",
	"cache",
	"cache2",
	"logs",
]);

/** Расширения, которые заведомо не база и не выгрузка. */
const SKIP_EXTENSIONS = new Set([
	"exe",
	"dll",
	"sys",
	"msi",
	"cab",
	"ocx",
	"drv",
	"cpl",
	"scr",
	"png",
	"jpg",
	"jpeg",
	"gif",
	"bmp",
	"ico",
	"svg",
	"webp",
	"mp3",
	"mp4",
	"avi",
	"mov",
	"wav",
	"mkv",
	"ttf",
	"otf",
	"woff",
	"woff2",
	"lnk",
	"url",
	"ini",
	"log",
	"tmp",
	"bak~",
	"chm",
	"hlp",
]);

/**
 * Признаки каталога с данными стоматологической системы.
 *
 * Используются только для сортировки результатов: находка подтверждается
 * чтением файла, а не именем папки. Но показать оператору сначала C:\IDENT\DATA,
 * а потом C:\Users\Public\Downloads — правильно.
 */
const CLINIC_DIRECTORY_HINTS = [
	"ident",
	"dental",
	"стомат",
	"stomat",
	"dentalpro",
	"infodent",
	"инфодент",
	"клиник",
	"clinic",
	"медицин",
	"medic",
	"1cv8",
	"1с",
	"base",
	"базы",
	"data",
	"backup",
	"выгрузк",
	"экспорт",
	"export",
	"пациент",
	"patient",
];

export interface DiscoveredSource {
	/** Полный путь к файлу. */
	filePath: string;
	fileName: string;
	directory: string;
	byteSize: number;
	modifiedAt: string;
	format: FormatSignature;
	/**
	 * Что удалось узнать, открыв файл: таблицы SQLite, число записей DBF,
	 * пациент из снимка. Пусто для форматов, которые не читаются.
	 */
	details: string[];
	/** Оценка для сортировки: выше — вероятнее, что это искомая база. */
	relevance: number;
}

export interface DiscoveryResult {
	roots: string[];
	sources: DiscoveredSource[];
	/** Каталоги со снимками: их переносят иначе, не построчно. */
	imagingFolders: Array<{
		directory: string;
		fileCount: number;
		sample: string[];
	}>;
	filesScanned: number;
	directoriesScanned: number;
	elapsedMs: number;
	truncated: boolean;
	warnings: string[];
}

function shouldSkipDirectory(name: string): boolean {
	const lower = name.toLowerCase();
	if (lower.startsWith(".")) return true;
	return SKIP_DIRECTORY_NAMES.has(lower);
}

function extensionOf(fileName: string): string {
	const parts = fileName.split(".");
	return parts.length > 1 ? parts[parts.length - 1]!.toLowerCase() : "";
}

/** Оценка для сортировки находок. */
function relevanceOf(source: {
	format: FormatSignature;
	directory: string;
	byteSize: number;
	fileName: string;
}): number {
	let score = 0;

	// Читаемый формат полезнее нечитаемого, но нечитаемый всё равно важно показать.
	score += source.format.readable ? 60 : 25;
	score += source.format.confidence * 20;

	const directoryLower = source.directory.toLowerCase();
	if (CLINIC_DIRECTORY_HINTS.some((hint) => directoryLower.includes(hint)))
		score += 30;

	const nameLower = source.fileName.toLowerCase();
	if (/(pacient|patient|пациент|klient|client|kart|карт)/i.test(nameLower))
		score += 40;
	if (/(visit|priem|приём|прием|lech|лечен)/i.test(nameLower)) score += 25;
	if (/(oplat|payment|плат|kassa|касса|schet|счет)/i.test(nameLower))
		score += 25;

	// Крупный файл вероятнее содержит базу, чем пустая заготовка.
	score += Math.min(25, Math.log10(source.byteSize + 1) * 4);

	return Math.round(score);
}

/** Открывает начало файла для опознания. */
async function probeHead(filePath: string, bytes: number): Promise<Buffer> {
	const handle = await open(filePath, "r");
	try {
		const size = (await handle.stat()).size;
		const buffer = Buffer.alloc(Math.min(bytes, size));
		if (buffer.length === 0) return buffer;
		await handle.read(buffer, 0, buffer.length, 0);
		return buffer;
	} finally {
		await handle.close();
	}
}

/**
 * Дочитывает подробности для форматов, которые движок умеет открывать.
 *
 * Это то, ради чего поиск и затевался: оператор должен увидеть не «вероятно
 * база», а «таблица PACIENT, 41 320 записей, кодировка cp866».
 */
async function collectDetails(
	filePath: string,
	format: FormatSignature,
	head: Buffer,
): Promise<string[]> {
	const details: string[] = [];

	try {
		if (format.id === "sqlite") {
			const inspection = inspectSqlite(filePath);
			const meaningful = inspection.tables.filter(
				(table) => !table.system && table.rowCount > 0,
			);
			if (meaningful.length === 0) {
				details.push("В базе нет непустых пользовательских таблиц.");
			} else {
				details.push(`Таблиц с данными: ${meaningful.length}.`);
				for (const table of meaningful.slice(0, 6)) {
					details.push(
						`  ${table.name}: ${table.rowCount} строк, колонок ${table.columns.length}`,
					);
				}
				if (meaningful.length > 6)
					details.push(`  …и ещё ${meaningful.length - 6}`);
			}
			details.push(...inspection.warnings);
			return details;
		}

		if (format.id === "dbf" && head.length > 32) {
			const records = head.readUInt32LE(4);
			const headerLength = head.readUInt16LE(8);
			const fieldCount = Math.max(0, Math.floor((headerLength - 33) / 32));
			const languageDriver = head[29]!;
			const codepage =
				languageDriver === 0x65
					? "cp866"
					: languageDriver === 0xc9
						? "cp1251"
						: languageDriver === 0x03
							? "cp1252"
							: null;
			details.push(`Записей: ${records}, полей: ${fieldCount}.`);
			details.push(
				codepage
					? `Кодировка из заголовка: ${codepage}.`
					: "Кодовая страница в заголовке не указана.",
			);
			return details;
		}

		if (format.id === "dicom") {
			const metadata = await readDicomMetadata(filePath);
			details.push(
				`Пациент: ${metadata.patientName ?? "не указан"}${metadata.patientId ? ` (ид. ${metadata.patientId})` : ""}`,
			);
			details.push(
				`Модальность: ${metadata.modality ?? "не указана"}, дата: ${metadata.studyDate ?? "не указана"}`,
			);
			if (metadata.manufacturer)
				details.push(`Аппарат: ${metadata.manufacturer}`);
			return details;
		}
	} catch (error) {
		details.push(
			`Файл опознан, но не открылся: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	return details;
}

export interface DiscoveryOptions {
	/** Корни обхода. Пусто — берутся доступные диски и домашний каталог. */
	roots?: string[];
	maxDepth?: number;
	timeBudgetMs?: number;
}

/**
 * Корни поиска по умолчанию.
 *
 * Домашний каталог и корни дисков, но НЕ весь диск целиком с первого уровня:
 * старые системы ставятся в корень (C:\IDENT) или в Program Files, и именно
 * туда стоит смотреть в первую очередь.
 */
async function defaultRoots(): Promise<string[]> {
	const roots: string[] = [];
	const home = process.env.USERPROFILE ?? process.env.HOME;
	if (home) roots.push(home);

	if (process.platform === "win32") {
		for (const letter of "CDEFGH") {
			const drive = `${letter}:\\`;
			try {
				const info = await stat(drive);
				if (info.isDirectory()) roots.push(drive);
			} catch {
				// Диска нет.
			}
		}
	} else {
		for (const candidate of ["/srv", "/opt", "/var/lib", "/media", "/mnt"]) {
			try {
				const info = await stat(candidate);
				if (info.isDirectory()) roots.push(candidate);
			} catch {
				// Каталога нет.
			}
		}
	}

	return roots;
}

/**
 * Обходит диск и возвращает опознанные источники.
 *
 * Обход в ширину: находки в корне C:\IDENT важнее, чем на седьмом уровне
 * вложенности в чьих-то загрузках, и при исчерпании бюджета лучше иметь первые,
 * а не вторые.
 */
export async function discoverLocalSources(
	options: DiscoveryOptions = {},
): Promise<DiscoveryResult> {
	const started = Date.now();
	const warnings: string[] = [];
	const roots = options.roots?.length ? options.roots : await defaultRoots();
	const maxDepth = options.maxDepth ?? MAX_DEPTH;
	const timeBudget = options.timeBudgetMs ?? SCAN_TIME_BUDGET_MS;

	const sources: DiscoveredSource[] = [];
	const imagingByDirectory = new Map<
		string,
		{ count: number; sample: string[] }
	>();

	let filesScanned = 0;
	let directoriesScanned = 0;
	let truncated = false;

	const queue: Array<{ directory: string; depth: number }> = roots.map(
		(directory) => ({ directory, depth: 0 }),
	);
	const visited = new Set<string>();

	while (queue.length > 0) {
		if (Date.now() - started > timeBudget) {
			truncated = true;
			warnings.push(
				`Поиск остановлен по времени (${Math.round(timeBudget / 1000)} с). Показано найденное на этот момент.`,
			);
			break;
		}
		if (filesScanned >= MAX_FILES_SCANNED || sources.length >= MAX_CANDIDATES) {
			truncated = true;
			warnings.push(
				"Поиск остановлен по числу файлов. Сузьте область поиска, указав каталог старой системы.",
			);
			break;
		}

		const item = queue.shift()!;
		const normalized = path.resolve(item.directory).toLowerCase();
		if (visited.has(normalized)) continue;
		visited.add(normalized);

		let entries: Dirent[];
		try {
			entries = await readdir(item.directory, { withFileTypes: true });
			directoriesScanned += 1;
		} catch {
			// Нет доступа либо каталог исчез — обычное дело при обходе диска.
			continue;
		}

		for (const entry of entries) {
			const fullPath = path.join(item.directory, entry.name);

			if (entry.isDirectory()) {
				if (item.depth >= maxDepth) continue;
				if (shouldSkipDirectory(entry.name)) continue;
				queue.push({ directory: fullPath, depth: item.depth + 1 });
				continue;
			}

			if (!entry.isFile()) continue;
			filesScanned += 1;
			if (filesScanned >= MAX_FILES_SCANNED) break;

			const extension = extensionOf(entry.name);
			if (SKIP_EXTENSIONS.has(extension)) continue;

			let info: Stats;
			try {
				info = await stat(fullPath);
			} catch {
				continue;
			}
			if (info.size < MIN_CANDIDATE_BYTES) continue;

			/**
			 * Снимки собираются по каталогам, а не поштучно: в папке КТ лежат тысячи
			 * файлов одного исследования, и показывать их списком бессмысленно.
			 */
			if (mayBeDicomFileName(entry.name)) {
				const group = imagingByDirectory.get(item.directory);
				if (group) {
					group.count += 1;
					if (group.sample.length < 3) group.sample.push(entry.name);
					continue;
				}
				// Первый файл каталога проверяем по содержимому, остальные — по имени.
				try {
					const head = await probeHead(fullPath, 200);
					if (looksLikeDicom(head)) {
						imagingByDirectory.set(item.directory, {
							count: 1,
							sample: [entry.name],
						});
						continue;
					}
				} catch {
					continue;
				}
			}

			let head: Buffer;
			try {
				head = await probeHead(fullPath, PROBE_BYTES);
			} catch {
				continue;
			}

			const format = identifyFormat(head, entry.name);
			// Неопознанное не показываем: список из тысячи «формат не опознан»
			// бесполезен и прячет настоящие находки.
			if (format.id === "unknown") continue;
			// Мелочь вроде отдельных JSON и XML из настроек тоже отсеиваем.
			if ((format.id === "json" || format.id === "xml") && info.size < 4096)
				continue;

			const details = await collectDetails(fullPath, format, head);

			sources.push({
				filePath: fullPath,
				fileName: entry.name,
				directory: item.directory,
				byteSize: info.size,
				modifiedAt: info.mtime.toISOString(),
				format,
				details,
				relevance: relevanceOf({
					format,
					directory: item.directory,
					byteSize: info.size,
					fileName: entry.name,
				}),
			});
		}
	}

	sources.sort((left, right) => right.relevance - left.relevance);

	const imagingFolders = [...imagingByDirectory.entries()]
		.map(([directory, group]) => ({
			directory,
			fileCount: group.count,
			sample: group.sample,
		}))
		.sort((left, right) => right.fileCount - left.fileCount);

	if (sources.length === 0 && imagingFolders.length === 0) {
		warnings.push(
			"Баз старых систем не найдено. Укажите каталог программы вручную — обычно это C:\\<название системы> либо папка, на которую ссылается ярлык на рабочем столе.",
		);
	}

	return {
		roots,
		sources,
		imagingFolders,
		filesScanned,
		directoriesScanned,
		elapsedMs: Date.now() - started,
		truncated,
		warnings,
	};
}

/** Сводка по найденному: сколько читается сразу, сколько требует выгрузки. */
export function summarizeDiscovery(result: DiscoveryResult): {
	readable: number;
	needsExport: number;
	byFormat: Array<{
		format: SourceFormatId;
		title: string;
		count: number;
		readable: boolean;
	}>;
} {
	const byFormat = new Map<
		SourceFormatId,
		{ title: string; count: number; readable: boolean }
	>();
	for (const source of result.sources) {
		const existing = byFormat.get(source.format.id);
		if (existing) existing.count += 1;
		else
			byFormat.set(source.format.id, {
				title: source.format.title,
				count: 1,
				readable: source.format.readable,
			});
	}

	return {
		readable: result.sources.filter((source) => source.format.readable).length,
		needsExport: result.sources.filter((source) => !source.format.readable)
			.length,
		byFormat: [...byFormat.entries()]
			.map(([format, value]) => ({ format, ...value }))
			.sort((left, right) => right.count - left.count),
	};
}
