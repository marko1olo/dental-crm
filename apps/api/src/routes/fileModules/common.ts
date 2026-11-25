import path from "node:path";

export const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

export type MultipartFilePayload = {
	filename: string;
	mimetype: string;
	file: NodeJS.ReadableStream;
	fields?: Record<string, { value?: string }>;
};

export function sanitizeUploadFilename(rawName: string): string {
	const base = path.basename(rawName || "file");
	const cleaned = base
		.replace(/\.\.+/g, "_")
		.replace(/[^a-zA-Z0-9._-]/g, "_")
		.replace(/^\.+/, "");
	return cleaned.length > 0 ? cleaned.slice(0, 180) : "file.bin";
}

export function resolveSafeUploadPath(storagePath: string): string | null {
	if (!storagePath || storagePath.includes("\0")) return null;
	const uploadsRoot = path.resolve(UPLOADS_DIR);
	const resolved = path.resolve(uploadsRoot, storagePath);
	if (!resolved.startsWith(uploadsRoot + path.sep)) {
		return null;
	}
	return resolved;
}

export function validateUploadMagicBytes(
	header: Buffer,
	declaredMime: string,
): boolean {
	if (header.length === 0) return false;

	// Блокируем исполняемые бинарники и активный HTML/SVG/JS контент
	if (
		(header.length >= 2 && header[0] === 0x4d && header[1] === 0x5a) || // MZ (PE/EXE)
		(header.length >= 4 &&
			header[0] === 0x7f &&
			header[1] === 0x45 &&
			header[2] === 0x4c &&
			header[3] === 0x46) || // ELF
		(header.length >= 2 && header[0] === 0x23 && header[1] === 0x21) // #!
	) {
		return false;
	}

	const headAscii = header.subarray(0, 64).toString("utf8").trimStart().toLowerCase();
	if (
		headAscii.startsWith("<svg") ||
		headAscii.startsWith("<!doctype html") ||
		headAscii.startsWith("<html") ||
		headAscii.startsWith("<script")
	) {
		return false;
	}

	const mime = (declaredMime || "").toLowerCase().split(";")[0]?.trim() || "";
	const isJpeg =
		header.length >= 3 &&
		header[0] === 0xff &&
		header[1] === 0xd8 &&
		header[2] === 0xff;
	const isPng =
		header.length >= 8 &&
		header[0] === 0x89 &&
		header[1] === 0x50 &&
		header[2] === 0x4e &&
		header[3] === 0x47 &&
		header[4] === 0x0d &&
		header[5] === 0x0a &&
		header[6] === 0x1a &&
		header[7] === 0x0a;
	const isWebp =
		header.length >= 12 &&
		header.subarray(0, 4).toString("ascii") === "RIFF" &&
		header.subarray(8, 12).toString("ascii") === "WEBP";
	const isGif =
		header.length >= 6 &&
		(header.subarray(0, 6).toString("ascii") === "GIF87a" ||
			header.subarray(0, 6).toString("ascii") === "GIF89a");
	const isBmp = header.length >= 2 && header.subarray(0, 2).toString("ascii") === "BM";
	const isTiff =
		header.length >= 4 &&
		((header[0] === 0x49 && header[1] === 0x49 && header[2] === 0x2a && header[3] === 0x00) ||
			(header[0] === 0x4d && header[1] === 0x4d && header[2] === 0x00 && header[3] === 0x2a));
	const isHeic =
		header.length >= 12 &&
		header.subarray(4, 8).toString("ascii") === "ftyp" &&
		["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heif"].includes(
			header.subarray(8, 12).toString("ascii").toLowerCase(),
		);
	const isPdf = header.length >= 5 && header.subarray(0, 5).toString("ascii") === "%PDF-";
	const isDicom =
		header.length >= 132 && header.subarray(128, 132).toString("ascii") === "DICM";

	if (mime === "image/jpeg" || mime === "image/jpg") return isJpeg;
	if (mime === "image/png") return isPng;
	if (mime === "image/webp") return isWebp;
	if (mime === "image/gif") return isGif;
	if (mime === "image/bmp") return isBmp;
	if (mime === "image/tiff") return isTiff;
	if (mime === "image/heic" || mime === "image/heif") return isHeic;
	if (mime === "application/pdf") return isPdf;
	if (mime === "application/dicom") return isDicom;
	if (mime.startsWith("image/")) {
		return isJpeg || isPng || isWebp || isGif || isBmp || isTiff || isHeic;
	}

	return (
		isJpeg ||
		isPng ||
		isWebp ||
		isGif ||
		isBmp ||
		isTiff ||
		isHeic ||
		isPdf ||
		isDicom
	);
}

declare module "fastify" {
	interface FastifyRequest {
		file?: () => Promise<MultipartFilePayload | undefined>;
	}
}
