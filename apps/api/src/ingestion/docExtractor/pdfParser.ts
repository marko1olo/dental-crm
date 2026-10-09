import { inflateRawSync, inflateSync } from "node:zlib";
import type { ExtractedDocument } from "./types.js";
import { decodeText, looksTabular, normalizeText } from "./zipReader.js";

const textDecoder = new TextDecoder("utf-8", { fatal: false });
const utf16LeDecoder = new TextDecoder("utf-16le", { fatal: false });
const utf16BeDecoder = new TextDecoder("utf-16be", { fatal: false });

export function decodePdfBytes(bytes: Buffer): string {
	if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
		return utf16BeDecoder.decode(bytes.subarray(2));
	}
	if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
		return utf16LeDecoder.decode(bytes.subarray(2));
	}
	const utf8 = textDecoder.decode(bytes);
	if (/[А-Яа-яЁё]/.test(utf8) && !utf8.includes("\ufffd")) {
		return utf8;
	}
	try {
		const cp1251Decoder = new TextDecoder("windows-1251");
		const decoded = cp1251Decoder.decode(bytes);
		if (/[А-Яа-яЁё]/.test(decoded)) {
			return decoded;
		}
	} catch {
		// ignore
	}
	return utf8;
}

export function unescapePdfString(raw: string): string {
	const withOctal = raw.replace(/\\([0-7]{1,3})/g, (_, oct) => {
		const code = Number.parseInt(oct, 8);
		return String.fromCharCode(code);
	});
	return withOctal
		.replace(/\\n/g, "\n")
		.replace(/\\r/g, "\n")
		.replace(/\\t/g, "\t")
		.replace(/\\([()\\])/g, "$1")
		.trim();
}

export function parsePdfStreamOperators(contentBuffer: Buffer): string {
	const content = decodeText(contentBuffer);
	const lines: string[] = [];
	let currentLine: string[] = [];

	const opPattern =
		/(?:\(((?:\\.|[^\\)])*)\)\s*(?:Tj|'|")|<([0-9A-Fa-f\s]+)>\s*(?:Tj|'|")|\[((?:\\.|[^\]])*)\]\s*TJ|(?:T\*|(?:\d+(?:\.\d+)?\s+){2}(?:Td|TD)))/g;

	for (const match of content.matchAll(opPattern)) {
		if (match[1] !== undefined) {
			const cleaned = unescapePdfString(match[1]);
			if (cleaned) currentLine.push(cleaned);
		} else if (match[2] !== undefined) {
			const hexStr = match[2].replace(/\s/g, "");
			if (hexStr.length >= 2 && hexStr.length % 2 === 0) {
				const decoded = decodePdfBytes(Buffer.from(hexStr, "hex"));
				if (decoded) currentLine.push(decoded);
			}
		} else if (match[3] !== undefined) {
			const arrayContent = match[3];
			const elemPattern = /\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f\s]+)>/g;
			const arrayTexts: string[] = [];
			for (const elem of arrayContent.matchAll(elemPattern)) {
				if (elem[1] !== undefined) {
					const t = unescapePdfString(elem[1]);
					if (t) arrayTexts.push(t);
				} else if (elem[2] !== undefined) {
					const h = elem[2].replace(/\s/g, "");
					if (h.length >= 2 && h.length % 2 === 0) {
						const decoded = decodePdfBytes(Buffer.from(h, "hex"));
						if (decoded) arrayTexts.push(decoded);
					}
				}
			}
			if (arrayTexts.length) {
				currentLine.push(arrayTexts.join(""));
			}
		} else {
			if (currentLine.length) {
				lines.push(currentLine.join(" "));
				currentLine = [];
			}
		}
	}

	if (currentLine.length) {
		lines.push(currentLine.join(" "));
	}

	return normalizeText(lines.join("\n"));
}

export function extractPdfStreams(buffer: Buffer): string[] {
	const extractedChunks: string[] = [];
	let searchPos = 0;
	let streamCount = 0;
	const maxStreams = 25;
	const maxTotalDecompressedBytes = 25 * 1024 * 1024;
	let totalDecompressedBytes = 0;

	const streamMarker = Buffer.from("stream");
	const endstreamMarker = Buffer.from("endstream");

	while (searchPos < buffer.length && streamCount < maxStreams) {
		const streamIndex = buffer.indexOf(streamMarker, searchPos);
		if (streamIndex < 0) break;

		let dataStart = streamIndex + streamMarker.length;
		if (buffer[dataStart] === 0x0d && buffer[dataStart + 1] === 0x0a) {
			dataStart += 2;
		} else if (buffer[dataStart] === 0x0a || buffer[dataStart] === 0x0d) {
			dataStart += 1;
		}

		const endIndex = buffer.indexOf(endstreamMarker, dataStart);
		if (endIndex < 0) break;

		searchPos = endIndex + endstreamMarker.length;
		streamCount += 1;

		let streamData = buffer.subarray(dataStart, endIndex);
		if (
			streamData.length > 0 &&
			(streamData[streamData.length - 1] === 0x0a ||
				streamData[streamData.length - 1] === 0x0d)
		) {
			streamData = streamData.subarray(0, streamData.length - 1);
		}
		if (
			streamData.length > 0 &&
			streamData[streamData.length - 1] === 0x0d
		) {
			streamData = streamData.subarray(0, streamData.length - 1);
		}

		if (streamData.length === 0) continue;

		let decompressed: Buffer | null = null;
		try {
			decompressed = inflateSync(streamData, {
				maxOutputLength: 5 * 1024 * 1024,
			});
		} catch {
			try {
				decompressed = inflateRawSync(streamData, {
					maxOutputLength: 5 * 1024 * 1024,
				});
			} catch {
				// Not a zlib compressed stream
			}
		}

		if (decompressed) {
			totalDecompressedBytes += decompressed.length;
			if (totalDecompressedBytes > maxTotalDecompressedBytes) break;
			const text = parsePdfStreamOperators(decompressed);
			if (text.trim()) {
				extractedChunks.push(text);
			}
		}
	}

	return extractedChunks;
}

export function extractPdfLiteralText(source: string): string[] {
	const output: string[] = [];
	const literalPattern = /\((?:\\.|[^\\)]){2,}\)/g;
	for (const match of source.matchAll(literalPattern)) {
		const raw = (match[0] ?? "").slice(1, -1);
		const text = raw
			.replace(/\\n/g, "\n")
			.replace(/\\r/g, "\n")
			.replace(/\\t/g, "\t")
			.replace(/\\([()\\])/g, "$1")
			.replace(/\\\d{1,3}/g, " ");
		if (/[\p{L}\p{N}]{2,}/u.test(text)) output.push(text);
	}
	return output;
}

export function extractPdfHexText(source: string): string[] {
	const output: string[] = [];
	const hexPattern = /<([0-9A-Fa-f\s]{8,})>/g;
	for (const match of source.matchAll(hexPattern)) {
		const raw = (match[1] ?? "").replace(/\s/g, "");
		if (raw.length % 2 !== 0) continue;
		const bytes = Buffer.from(raw, "hex");
		const text = raw.startsWith("FEFF")
			? normalizeText(utf16BeDecoder.decode(bytes.subarray(2)))
			: normalizeText(textDecoder.decode(bytes));
		if (/[\p{L}\p{N}]{2,}/u.test(text)) output.push(text);
	}
	return output;
}

export function extractPdf(buffer: Buffer): ExtractedDocument {
	try {
		// 1. Декомпрессия FlateDecode потоков контента (95%+ реальных PDF)
		const streamTexts = extractPdfStreams(buffer);

		// 2. Извлечение литералов и шестнадцатеричных блоков из незашифрованного тела
		const latinSource = buffer.toString("latin1");
		const utf8Source = decodeText(buffer);
		const literalText = Array.from(
			new Set([
				...extractPdfLiteralText(utf8Source),
				...extractPdfLiteralText(latinSource),
				...extractPdfHexText(utf8Source),
				...extractPdfHexText(latinSource),
			]),
		);

		// 3. Безопасное сопоставление открытого текста на ограниченном срезе (до 100k символов)
		const sampleSource = utf8Source.slice(0, 100_000);
		const plainText = sampleSource
			.replace(/<[0-9A-Fa-f\s]{8,}>/g, " ")
			.replace(/[^\t\n\r\x20-\x7E\p{L}\p{N}\p{Sc}]+/gu, " ")
			.match(/[\p{L}\p{N}][\p{L}\p{N}\s.,;:+\-()/%\p{Sc}]{8,}/gu);

		const fallbackText =
			literalText.length || streamTexts.length ? [] : (plainText ?? []);
		const combined = [...streamTexts, ...literalText, ...fallbackText];
		const text = normalizeText(combined.join("\n"));
		const warnings = ["pdf_best_effort_no_ocr"];
		if (!text) warnings.push("pdf_text_not_extracted_may_be_scanned");

		const tableCount = looksTabular(text) ? 1 : 0;

		return {
			text,
			tableCount,
			warnings,
			parserNotes: [
				"PDF разобран встроенным извлечением FlateDecode потоков и текстовых операторов; сканы требуют распознавания изображения.",
			],
		};
	} catch (err: unknown) {
		return {
			text: "",
			tableCount: 0,
			warnings: [
				"pdf_best_effort_no_ocr",
				`pdf_parsing_error:${(err as Error).message}`,
			],
			parserNotes: ["Ошибка чтения бинарной структуры PDF."],
		};
	}
}
