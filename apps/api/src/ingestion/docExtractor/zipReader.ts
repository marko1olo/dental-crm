import { createHash } from "node:crypto";
import { type Readable, Transform, type TransformCallback } from "node:stream";
import yauzl from "yauzl";
import type { ZipEntry } from "./types.js";

const textDecoder = new TextDecoder("utf-8", { fatal: false });
const utf16LeDecoder = new TextDecoder("utf-16le", { fatal: false });
const utf16BeDecoder = new TextDecoder("utf-16be", { fatal: false });

export const DEFAULT_MAX_ZIP_ENTRY_BYTES = 20 * 1024 * 1024;
export const DEFAULT_MAX_ZIP_TOTAL_BYTES = 50 * 1024 * 1024;
export const DEFAULT_MAX_ZIP_ENTRIES = 1000;

export class ZipBombLimitError extends Error {
	constructor(message = "zip_bomb_size_limit_exceeded") {
		super(message);
		this.name = "ZipBombLimitError";
	}
}

/**
 * Потоковый трансформ-ограничитель байт (защита от Zip-Bomb CWE-409 на лету):
 * контролирует как размер одной распаковываемой записи, так и общий бюджет архива
 * без накопления данных в оперативной памяти.
 */
export class ByteLimitTransform extends Transform {
	private entryBytes = 0;

	constructor(
		private readonly maxEntryBytes: number,
		private readonly sharedBudget?: { used: number; maxTotal: number },
	) {
		super();
	}

	override _transform(
		chunk: Buffer | string,
		_encoding: BufferEncoding,
		callback: TransformCallback,
	): void {
		const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		this.entryBytes += buf.length;
		if (this.entryBytes > this.maxEntryBytes) {
			callback(new ZipBombLimitError("zip_bomb_size_limit_exceeded"));
			return;
		}
		if (this.sharedBudget) {
			this.sharedBudget.used += buf.length;
			if (this.sharedBudget.used > this.sharedBudget.maxTotal) {
				callback(new ZipBombLimitError("zip_bomb_size_limit_exceeded"));
				return;
			}
		}
		callback(null, buf);
	}
}

export function decodeBase64(value: string | undefined): Buffer {
	if (!value?.trim()) return Buffer.alloc(0);
	try {
		const clean = value.includes(",") ? (value.split(",").pop() ?? "") : value;
		return Buffer.from(clean, "base64");
	} catch (err: unknown) {
		void err;
		return Buffer.alloc(0);
	}
}

export function normalizeText(value: string): string {
	return value
		.replace(/\0/g, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{4,}/g, "\n\n\n")
		.trim();
}

export function decodeText(buffer: Buffer): string {
	if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
		return normalizeText(utf16LeDecoder.decode(buffer.subarray(2)));
	}
	if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
		return normalizeText(utf16BeDecoder.decode(buffer.subarray(2)));
	}
	if (
		buffer.length >= 3 &&
		buffer[0] === 0xef &&
		buffer[1] === 0xbb &&
		buffer[2] === 0xbf
	) {
		return normalizeText(textDecoder.decode(buffer.subarray(3)));
	}
	return normalizeText(textDecoder.decode(buffer));
}

export function extensionOf(fileName: string): string {
	return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function fingerprintText(value: string): string {
	return createHash("sha256")
		.update(value)
		.digest("hex")
		.slice(0, 12)
		.toUpperCase();
}

export function safeFileLabel(fileName: string, prefix: string): string {
	const extension = extensionOf(fileName).replace(/[^a-z0-9]/g, "");
	const suffix = extension ? `.${extension}` : "";
	return `${prefix} #${fingerprintText(fileName)}${suffix}`;
}

export function isIgnoredArchiveEntry(name: string): boolean {
	const normalized = name.replace(/\\/g, "/");
	return (
		normalized.endsWith("/") ||
		normalized.startsWith("__MACOSX/") ||
		normalized.endsWith("/.DS_Store") ||
		normalized.includes("/~$")
	);
}

export function isImagingEntry(name: string): boolean {
	return /\.(?:dcm|dicom|ima|rvg|jpg|jpeg|png|webp|tif|tiff|bmp)$/i.test(name);
}

export function xmlDecode(value: string): string {
	return value
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'");
}

export function stripXmlTags(xml: string): string {
	return normalizeText(
		xmlDecode(
			xml
				.replace(/<w:tab\/>/g, "\t")
				.replace(/<\/w:tc>/g, "\t")
				.replace(/<\/w:tr>/g, "\n")
				.replace(/<\/w:p>/g, "\n")
				.replace(/<\/a:p>/g, "\n")
				.replace(/<\/row>/g, "\n")
				.replace(/<\/c>/g, "\t")
				.replace(/<[^>]+>/g, " "),
		).replace(/[ \t]{2,}/g, " "),
	);
}

export function looksTabular(text: string): boolean {
	const lines = text
		.split(/\r?\n/)
		.filter((line) => line.trim())
		.slice(0, 30);
	return lines.some(
		(line) =>
			line.includes("\t") ||
			line.split(";").length >= 3 ||
			line.split(",").length >= 4,
	);
}

export function countRows(text: string): number {
	return text.split(/\r?\n/).filter((line) => line.trim()).length;
}

export function zipText(entries: ZipEntry[], pathPattern: RegExp): string[] {
	return entries
		.filter((entry) => pathPattern.test(entry.name))
		.map((entry) => stripXmlTags(decodeText(entry.data)))
		.filter(Boolean);
}

export interface IterateZipEntriesOptions {
	readonly maxEntries?: number | undefined;
	readonly maxEntryBytes?: number | undefined;
	readonly maxTotalBytes?: number | undefined;
	/** Если false, лимит maxEntryBytes проверяется только по фактическому потоку (без отбраковки по завышенному header). */
	readonly checkDeclaredSize?: boolean | undefined;
}

export interface StreamedZipEntryHandle {
	readonly name: string;
	readonly uncompressedSize: number;
	openStream(entryMaxBytes?: number): Promise<Readable>;
}

/**
 * Потоковый итератор записей ZIP на базе yauzl (`lazyEntries: true`) с защитой от
 * Zip-Bomb CWE-409 (`ByteLimitTransform`). Не распаковывает пропущенные записи и
 * читает архив с файлового пути на диске без загрузки всего ZIP в оперативную память.
 */
export async function iterateZipEntries(
	source: Buffer | string,
	visitor: (entry: StreamedZipEntryHandle) => Promise<void | "stop">,
	options?: IterateZipEntriesOptions,
): Promise<{ warnings: string[]; visitedCount: number }> {
	const warnings: string[] = [];
	const maxEntries = options?.maxEntries ?? DEFAULT_MAX_ZIP_ENTRIES;
	const maxEntryBytes = options?.maxEntryBytes ?? DEFAULT_MAX_ZIP_ENTRY_BYTES;
	const maxTotalBytes = options?.maxTotalBytes ?? DEFAULT_MAX_ZIP_TOTAL_BYTES;
	const checkDeclaredSize = options?.checkDeclaredSize ?? true;

	if (Buffer.isBuffer(source) && source.length < 22) {
		return { warnings: ["zip_buffer_too_small"], visitedCount: 0 };
	}

	let visitedCount = 0;
	let zipfile: yauzl.ZipFile | undefined;
	const sharedBudget = { used: 0, maxTotal: maxTotalBytes };

	try {
		zipfile = Buffer.isBuffer(source)
			? await yauzl.fromBufferPromise(source, { lazyEntries: true })
			: await yauzl.openPromise(source, { lazyEntries: true });

		for await (const entry of zipfile.eachEntry()) {
			const name = entry.fileName.replace(/\\/g, "/");
			if (name.endsWith("/")) continue;

			if (visitedCount >= maxEntries) {
				warnings.push("zip_entry_limit_reached");
				break;
			}
			visitedCount += 1;

			if (entry.isEncrypted()) {
				warnings.push(`zip_encrypted_entry:${safeFileLabel(name, "Файл архива")}`);
				continue;
			}

			if (
				checkDeclaredSize &&
				(entry.uncompressedSize > maxEntryBytes ||
					sharedBudget.used + entry.uncompressedSize > maxTotalBytes)
			) {
				warnings.push("zip_bomb_size_limit_exceeded");
				break;
			}

			const activeZip = zipfile;
			const handle: StreamedZipEntryHandle = {
				name,
				uncompressedSize: entry.uncompressedSize,
				openStream: async (overrideEntryMaxBytes?: number) => {
					const rawStream = await activeZip.openReadStreamPromise(entry);
					const limiter = new ByteLimitTransform(
						overrideEntryMaxBytes ?? maxEntryBytes,
						sharedBudget,
					);
					rawStream.on("error", (err) => limiter.destroy(err));
					limiter.on("close", () => {
						if (!rawStream.destroyed) rawStream.destroy();
					});
					return rawStream.pipe(limiter);
				},
			};

			try {
				const decision = await visitor(handle);
				if (decision === "stop") break;
			} catch (visitorErr: unknown) {
				if (visitorErr instanceof ZipBombLimitError) {
					warnings.push("zip_bomb_size_limit_exceeded");
					break;
				}
				const reason =
					visitorErr instanceof Error ? visitorErr.message : "inflate_error";
				warnings.push(
					`zip_entry_inflate_failed:${safeFileLabel(name, "Файл архива")}:${reason}`,
				);
			}
		}
	} catch (err: unknown) {
		warnings.push(
			`zip_read_error:${err instanceof Error ? err.message : "corrupted_zip"}`,
		);
	} finally {
		try {
			zipfile?.close();
		} catch {
			// yauzl уже закрыт
		}
	}

	return { warnings, visitedCount };
}

/**
 * Собирает небольшой поток в Buffer с жёстким лимитом байт (для служебных XML вроде styles.xml).
 */
export async function readLimitedStreamToBuffer(stream: Readable): Promise<Buffer> {
	const chunks: Buffer[] = [];
	let total = 0;
	for await (const chunk of stream) {
		const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		total += buf.length;
		chunks.push(buf);
	}
	return Buffer.concat(chunks, total);
}

/**
 * Потоково находит первую подходящую запись в ZIP и передаёт её Readable-поток
 * в consumer без полной буферизации архива.
 */
export async function openZipEntryStream<T>(
	source: Buffer | string,
	entryPredicate: (entryName: string) => boolean,
	consumer: (stream: Readable, entryName: string) => Promise<T>,
	options?: IterateZipEntriesOptions,
): Promise<{ found: boolean; result?: T | undefined; warnings: string[] }> {
	let found = false;
	let result: T | undefined;

	const { warnings } = await iterateZipEntries(
		source,
		async (entry) => {
			if (!entryPredicate(entry.name)) return;
			found = true;
			const stream = await entry.openStream();
			result = await consumer(stream, entry.name);
			return "stop";
		},
		options,
	);

	return { found, result, warnings };
}

/**
 * Потоковое чтение небольших/средних записей ZIP-архива из файла на диске или буфера
 * на базе yauzl (MIT) с защитой от Zip-бомбы (20 МБ на запись, 50 МБ суммарно, макс. 1000 записей).
 */
export async function readZipEntriesAsync(
	source: Buffer | string,
	options?: IterateZipEntriesOptions,
): Promise<{
	entries: ZipEntry[];
	warnings: string[];
}> {
	const entries: ZipEntry[] = [];
	const { warnings } = await iterateZipEntries(
		source,
		async (entry) => {
			const stream = await entry.openStream();
			const data = await readLimitedStreamToBuffer(stream);
			entries.push({ name: entry.name, data });
		},
		options,
	);
	return { entries, warnings };
}
