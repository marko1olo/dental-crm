import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/**
 * Временное хранилище залитых выгрузок.
 *
 * ЗАЧЕМ ФАЙЛ, А НЕ ПАМЯТЬ
 * Прежний маршрут принимал источник строкой base64 в теле JSON. У этого две
 * беды на реальных объёмах. Кодирование base64 раздувает данные на треть, и
 * выгрузка на 300 МБ приезжает как 400 МБ JSON, который Fastify обязан целиком
 * собрать в памяти, распарсить как JSON (ещё одна копия) и затем раскодировать
 * в Buffer (третья копия). Гигабайт оперативной памяти на файл в триста
 * мегабайт — и это до начала обработки.
 *
 * Здесь тело запроса потоком льётся на диск: расход памяти равен размеру чанка
 * и не зависит от размера файла. Отпечаток sha256 считается на том же проходе,
 * без второго чтения.
 *
 * ПОЧЕМУ ФАЙЛ ЖИВЁТ ПОСЛЕ ЗАПРОСА
 * Фазы разделены: залил — сопоставил — выполнил. Между ними оператор смотрит
 * карту соответствия и правит её. Требовать заливки файла заново на каждой фазе
 * значит гонять сотни мегабайт по три раза.
 */

/** Корень хранилища. Настраивается, потому что в контейнере /tmp может быть мал. */
function uploadRoot(): string {
	const configured = process.env.DENTAL_MIGRATION_UPLOAD_DIR?.trim();
	if (configured) return configured;
	// По умолчанию — рядом с данными приложения, а не в системном /tmp: файл
	// должен переживать перезапуск процесса, иначе возобновление невозможно.
	return path.join(process.cwd(), ".data", "migration-uploads");
}

/**
 * Предел размера залитого файла. 512 МБ выбрано по смыслу: выгрузка пациентов,
 * приёмов и платежей крупной сети за двадцать лет в DBF не доходит до этого
 * порога, а всё сверх обычно означает, что оператор прислал архив со снимками —
 * их переносят другим путём.
 */
export const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;

export interface StoredUpload {
	/** Абсолютный путь к файлу на диске. */
	filePath: string;
	/** Имя файла, как его назвал оператор, приведённое к безопасному виду. */
	fileName: string;
	byteSize: number;
	/** sha256 содержимого — узнаёт повторно залитый файл. */
	fingerprint: string;
}

/**
 * Приводит имя файла к безопасному: убирает пути, оставляет имя и расширение.
 *
 * Без этого имя вида «../../etc/passwd» или «C:\Windows\system32\x.dbf» из
 * заголовка запроса попало бы в путь на диске. Имя приходит от клиента и
 * доверять ему нельзя.
 */
export function safeUploadFileName(rawName: string | undefined): string {
	const base = (rawName ?? "").split(/[\\/]/).pop()?.trim() ?? "";
	const cleaned = base
		// biome-ignore lint/complexity/useRegexLiterals: control character range
		.replace(new RegExp("[\\x00-\\x1F]", "g"), "")
		.replace(/[<>:"|?*]/g, "_")
		.slice(0, 180);
	return cleaned || "upload.bin";
}

export class UploadTooLargeError extends Error {
	readonly limitBytes: number;

	constructor(limitBytes: number) {
		super(
			`Файл превышает предел ${Math.floor(limitBytes / (1024 * 1024))} МБ. Разделите выгрузку на части либо перенесите снимки отдельным путём.`,
		);
		this.name = "UploadTooLargeError";
		this.limitBytes = limitBytes;
	}
}

/**
 * Льёт поток в файл, считая размер и отпечаток на том же проходе.
 *
 * Предел проверяется по мере поступления байт, а не после: смысл предела в том,
 * чтобы не записать на диск полтерабайта, поэтому узнавать о превышении надо
 * до конца записи.
 */
export async function storeUploadStream(
	source: Readable,
	rawFileName: string | undefined,
	maxBytes = MAX_UPLOAD_BYTES,
): Promise<StoredUpload> {
	const root = uploadRoot();
	await mkdir(root, { recursive: true });

	const fileName = safeUploadFileName(rawFileName);
	// Уникальный префикс: два оператора могут одновременно залить «patients.dbf».
	const filePath = path.join(root, `${randomUUID()}__${fileName}`);

	const hash = createHash("sha256");
	let byteSize = 0;
	let aborted: Error | null = null;

	const target = createWriteStream(filePath);

	try {
		await pipeline(
			source,
			async function* (chunks: AsyncIterable<Buffer | string>) {
				for await (const chunk of chunks) {
					const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
					byteSize += buffer.byteLength;
					if (byteSize > maxBytes) {
						aborted = new UploadTooLargeError(maxBytes);
						// Прерываем конвейер: остаток тела запроса на диск не попадёт.
						throw aborted;
					}
					hash.update(buffer);
					yield buffer;
				}
			},
			target,
		);
	} catch (error) {
		// Недописанный файл удаляем: мусор в хранилище никому не нужен.
		await rm(filePath, { force: true }).catch(() => undefined);
		throw aborted ?? error;
	}

	if (byteSize === 0) {
		await rm(filePath, { force: true }).catch(() => undefined);
		throw new Error("Файл пуст: в теле запроса не пришло ни одного байта.");
	}

	return { filePath, fileName, byteSize, fingerprint: hash.digest("hex") };
}

/**
 * Кладёт уже собранный в памяти буфер. Нужно для источников, приходящих не
 * файлом: вставка из буфера обмена, текст выгрузки, вызовы из тестов.
 */
export async function storeUploadBuffer(
	content: Buffer,
	rawFileName: string | undefined,
): Promise<StoredUpload> {
	const root = uploadRoot();
	await mkdir(root, { recursive: true });
	const fileName = safeUploadFileName(rawFileName);
	const filePath = path.join(root, `${randomUUID()}__${fileName}`);
	await pipeline(Readable.from(content), createWriteStream(filePath));
	return {
		filePath,
		fileName,
		byteSize: content.byteLength,
		fingerprint: createHash("sha256").update(content).digest("hex"),
	};
}

/** Проверяет, что файл прогона всё ещё на месте. */
export async function uploadExists(
	filePath: string | null | undefined,
): Promise<boolean> {
	if (!filePath) return false;
	try {
		const info = await stat(filePath);
		return info.isFile();
	} catch {
		return false;
	}
}

export async function uploadSize(filePath: string): Promise<number> {
	const info = await stat(filePath);
	return info.size;
}

/** Читает файл целиком. Только для форматов, которые иначе не разобрать. */
export async function readUploadFully(filePath: string): Promise<Buffer> {
	const chunks: Buffer[] = [];
	await pipeline(
		createReadStream(filePath),
		async (source: AsyncIterable<Buffer>) => {
			for await (const chunk of source) chunks.push(chunk);
		},
	);
	return Buffer.concat(chunks);
}

/** Читает первые N байт — для определения формата и выборки на портрет колонок. */
export async function readUploadHead(
	filePath: string,
	bytes: number,
): Promise<Buffer> {
	const chunks: Buffer[] = [];
	let collected = 0;
	const stream = createReadStream(filePath, {
		start: 0,
		end: Math.max(0, bytes - 1),
	});
	for await (const chunk of stream) {
		const buffer = chunk as Buffer;
		chunks.push(buffer);
		collected += buffer.byteLength;
		if (collected >= bytes) break;
	}
	return Buffer.concat(chunks).subarray(0, bytes);
}

export async function deleteUpload(
	filePath: string | null | undefined,
): Promise<void> {
	if (!filePath) return;
	await rm(filePath, { force: true }).catch(() => undefined);
}

/**
 * Убирает файлы старше срока хранения.
 *
 * ЗАЧЕМ ЭТО ОБЯЗАТЕЛЬНО
 * Залитая выгрузка — это персональные данные пациентов в открытом виде на диске
 * сервера. Хранить их бессрочно «на случай если понадобится» нельзя: чем дольше
 * файл лежит, тем больше шансов, что он уедет в резервную копию, в образ
 * контейнера или в чужие руки. Через сутки после переноса файл не нужен —
 * исходные строки сохранены в стейджинге, а он под теми же правами, что
 * медицинские данные.
 */
export async function cleanupExpiredUploads(
	maxAgeMs = 24 * 60 * 60 * 1000,
): Promise<number> {
	const root = uploadRoot();
	let removed = 0;
	let entries: string[];
	try {
		entries = await readdir(root);
	} catch {
		// Каталога нет — значит и убирать нечего.
		return 0;
	}

	const cutoff = Date.now() - maxAgeMs;
	for (const entry of entries) {
		const filePath = path.join(root, entry);
		try {
			const info = await stat(filePath);
			if (!info.isFile()) continue;
			if (info.mtimeMs < cutoff) {
				await rm(filePath, { force: true });
				removed += 1;
			}
		} catch {
			// Файл исчез между readdir и stat — это не ошибка.
		}
	}
	return removed;
}

export { uploadRoot };
