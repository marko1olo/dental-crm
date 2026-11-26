import { streamXmlTagElements } from "../../migration/parsers/streamingXmlRowScanner.js";
import { type ExtractedDocument, maxExtractedTextChars, type ZipEntry } from "./types.js";
import {
	decodeText,
	iterateZipEntries,
	normalizeText,
	readLimitedStreamToBuffer,
	stripXmlTags,
	xmlDecode,
	zipText,
} from "./zipReader.js";

export function stripHtml(value: string): string {
	return normalizeText(
		xmlDecode(
			value
				.replace(/<script[\s\S]*?<\/script>/gi, " ")
				.replace(/<style[\s\S]*?<\/style>/gi, " ")
				.replace(/<\/(?:p|div|tr|li|h[1-6])>/gi, "\n")
				.replace(/<\/t[dh]>/gi, "\t")
				.replace(/<br\s*\/?>/gi, "\n")
				.replace(/<[^>]+>/g, " "),
		).replace(/[ \t]{2,}/g, " "),
	);
}

export function stripRtf(value: string): string {
	return normalizeText(
		value
			.replace(/\\par[d]?/g, "\n")
			.replace(/\\tab/g, "\t")
			.replace(/\\'[0-9a-f]{2}/gi, " ")
			.replace(/[{}]/g, " ")
			.replace(/\\[a-z]+\d* ?/gi, " ")
			.replace(/[ \t]{2,}/g, " "),
	);
}

export function extractRunTexts(xml: string): string {
	const texts: string[] = [];
	for (const match of xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)) {
		texts.push(xmlDecode(match[1] ?? ""));
	}
	return texts.join("");
}

export function extractOpenXmlTablesAndText(xml: string): {
	text: string;
	tableCount: number;
} {
	let tableCount = 0;
	const processed = xml.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/g, (tblXml) => {
		tableCount += 1;
		const rows: string[] = [];
		const rowMatches = tblXml.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g);
		for (const rMatch of rowMatches) {
			const rowXml = rMatch[0] ?? "";
			const cells: string[] = [];
			const cellMatches = rowXml.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g);
			for (const cMatch of cellMatches) {
				const cellXml = cMatch[0] ?? "";
				const cellText = extractRunTexts(cellXml)
					.replace(/[\t\r\n]+/g, " ")
					.trim();
				cells.push(cellText);
			}
			if (cells.some(Boolean)) {
				rows.push(cells.join("\t"));
			}
		}
		return `\n\n${rows.join("\n")}\n\n`;
	});

	return {
		text: stripXmlTags(processed),
		tableCount,
	};
}

export async function extractDocx(
	source: Buffer | string,
): Promise<ExtractedDocument> {
	try {
		let tableCount = 0;
		let mainText = "";
		const headerFooterEntries: ZipEntry[] = [];

		const { warnings } = await iterateZipEntries(source, async (entry) => {
			if (/(?:^|\/)word\/document\.xml$/.test(entry.name)) {
				const buf = await readLimitedStreamToBuffer(await entry.openStream());
				const xml = decodeText(buf);
				const extracted = extractOpenXmlTablesAndText(xml);
				mainText = extracted.text;
				tableCount = extracted.tableCount;
			} else if (/(?:^|\/)word\/(?:header\d*|footer\d*)\.xml$/.test(entry.name)) {
				const buf = await readLimitedStreamToBuffer(await entry.openStream());
				headerFooterEntries.push({ name: entry.name, data: buf });
			}
		});

		const otherParts = zipText(
			headerFooterEntries,
			/(?:^|\/)word\/(?:header\d*|footer\d*)\.xml$/,
		);
		const allText = [mainText, ...otherParts].filter(Boolean).join("\n\n");

		return {
			text: allText,
			tableCount,
			warnings,
			parserNotes: [
				"DOCX разобран потоковым извлечением текста и таблиц из OpenXML ZIP.",
			],
		};
	} catch (err: unknown) {
		return {
			text: "",
			tableCount: 0,
			warnings: [`docx_extract_failed:${(err as Error).message}`],
			parserNotes: ["Ошибка чтения содержимого DOCX."],
		};
	}
}

export function sharedStrings(entries: ZipEntry[]): string[] {
	const entry = entries.find((candidate) =>
		/(?:^|\/)xl\/sharedStrings\.xml$/.test(candidate.name),
	);
	if (!entry) return [];
	const xml = decodeText(entry.data);
	return Array.from(xml.matchAll(/<si\b[\s\S]*?<\/si>/g)).map((match) =>
		stripXmlTags(match[0] ?? ""),
	);
}

export function extractCellValue(cellXml: string, shared: string[]): string {
	const type = cellXml.match(/\bt="([^"]+)"/)?.[1] ?? "";
	const inline = cellXml.match(/<is\b[\s\S]*?<\/is>/)?.[0];
	if (inline) return stripXmlTags(inline);
	const rawValue = cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
	if (type === "s") {
		const index = Number(rawValue);
		return Number.isInteger(index) ? (shared[index] ?? "") : "";
	}
	return xmlDecode(rawValue);
}

/**
 * Потоковый экстрактор XLSX на базе yauzl + streamXmlTagElements (`<si>`, `<row>`).
 * Не буферизует весь `sheet*.xml` в строку V8 и прерывается при достижении `maxExtractedTextChars`.
 */
export async function extractXlsx(
	source: Buffer | string,
): Promise<ExtractedDocument> {
	try {
		const shared: string[] = [];
		const sheetEntryNames: string[] = [];

		// Проход 1: читаем только sharedStrings.xml и собираем имена листов
		const pass1 = await iterateZipEntries(
			source,
			async (entry) => {
				if (/(?:^|\/)xl\/sharedStrings\.xml$/.test(entry.name)) {
					const stream = await entry.openStream(64 * 1024 * 1024);
					for await (const siEl of streamXmlTagElements(stream, "si")) {
						shared.push(stripXmlTags(siEl.innerXml));
					}
				} else if (/(?:^|\/)xl\/worksheets\/sheet\d+\.xml$/.test(entry.name)) {
					sheetEntryNames.push(entry.name);
				}
			},
			{ maxEntryBytes: 64 * 1024 * 1024, maxTotalBytes: 256 * 1024 * 1024 },
		);

		sheetEntryNames.sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
		const targetSet = new Set(sheetEntryNames);
		const sheetLinesMap = new Map<string, string[]>();
		let totalChars = 0;

		// Проход 2: потоково сканируем `<row>...</row>` без загрузки XML листа целиком
		const pass2 = await iterateZipEntries(
			source,
			async (entry) => {
				if (!targetSet.has(entry.name)) return;
				if (totalChars >= maxExtractedTextChars) return "stop";

				const stream = await entry.openStream(512 * 1024 * 1024);
				const lines: string[] = [];
				for await (const rowEl of streamXmlTagElements(stream, "row")) {
					const rowText = Array.from(rowEl.innerXml.matchAll(/<c\b[\s\S]*?<\/c>/g))
						.map((cellMatch) => extractCellValue(cellMatch[0] ?? "", shared))
						.join("\t")
						.replace(/\t+$/g, "");
					if (rowText) {
						lines.push(rowText);
						totalChars += rowText.length + 1;
						if (totalChars >= maxExtractedTextChars) {
							stream.destroy();
							break;
						}
					}
				}
				sheetLinesMap.set(entry.name, lines);
			},
			{ maxEntryBytes: 512 * 1024 * 1024, maxTotalBytes: 1024 * 1024 * 1024 },
		);

		const sheetTexts = sheetEntryNames
			.map((name) => (sheetLinesMap.get(name) ?? []).join("\n"))
			.filter(Boolean);

		return {
			text: sheetTexts.join("\n\n"),
			tableCount: sheetEntryNames.length,
			warnings: Array.from(new Set([...pass1.warnings, ...pass2.warnings])),
			parserNotes: [
				"XLSX разобран потоковым извлечением таблиц из OpenXML ZIP; формулы не вычисляются.",
			],
		};
	} catch (err: unknown) {
		return {
			text: "",
			tableCount: 0,
			warnings: [`xlsx_extract_failed:${(err as Error).message}`],
			parserNotes: ["Ошибка чтения содержимого XLSX."],
		};
	}
}

export async function extractPptx(
	source: Buffer | string,
): Promise<ExtractedDocument> {
	try {
		const slideEntries: ZipEntry[] = [];
		const { warnings } = await iterateZipEntries(source, async (entry) => {
			if (/(?:^|\/)ppt\/slides\/slide\d+\.xml$/.test(entry.name)) {
				const data = await readLimitedStreamToBuffer(await entry.openStream());
				slideEntries.push({ name: entry.name, data });
			}
		});
		slideEntries.sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
		const parts = zipText(slideEntries, /(?:^|\/)ppt\/slides\/slide\d+\.xml$/);
		return {
			text: parts.join("\n\n"),
			tableCount: 0,
			warnings,
			parserNotes: ["PPTX разобран потоковым извлечением текста слайдов."],
		};
	} catch (err: unknown) {
		return {
			text: "",
			tableCount: 0,
			warnings: [`pptx_extract_failed:${(err as Error).message}`],
			parserNotes: ["Ошибка чтения содержимого PPTX."],
		};
	}
}

export async function extractOpenDocument(
	source: Buffer | string,
	kind: "odt" | "ods" | "odp",
): Promise<ExtractedDocument> {
	try {
		let tableCount = 0;
		const chunks: string[] = [];
		let totalChars = 0;

		const { warnings } = await iterateZipEntries(source, async (entry) => {
			if (!/(?:^|\/)content\.xml$/.test(entry.name)) return;
			const stream = await entry.openStream(64 * 1024 * 1024);
			for await (const tableEl of streamXmlTagElements(stream, "table:table")) {
				tableCount += 1;
				const text = stripXmlTags(tableEl.innerXml);
				if (text) {
					chunks.push(text);
					totalChars += text.length;
					if (totalChars >= maxExtractedTextChars) {
						stream.destroy();
						break;
					}
				}
			}
			// Если таблиц не было (например текстовый ODT без таблиц) — читаем абзацы
			if (tableCount === 0) {
				return "stop";
			}
		});

		if (tableCount === 0 && chunks.length === 0) {
			await iterateZipEntries(source, async (entry) => {
				if (!/(?:^|\/)content\.xml$/.test(entry.name)) return;
				const buf = await readLimitedStreamToBuffer(await entry.openStream());
				const text = stripXmlTags(decodeText(buf));
				if (text) chunks.push(text);
				return "stop";
			});
		}

		return {
			text: chunks.join("\n\n"),
			tableCount,
			warnings,
			parserNotes: [
				`${kind.toUpperCase()} разобран потоковым извлечением текста из OpenDocument ZIP.`,
			],
		};
	} catch (err: unknown) {
		return {
			text: "",
			tableCount: 0,
			warnings: [`opendoc_extract_failed:${(err as Error).message}`],
			parserNotes: [`Ошибка чтения содержимого ${kind.toUpperCase()}.`],
		};
	}
}
