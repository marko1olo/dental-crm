import type { ExtractedDocument, ZipEntry } from "./types.js";
import {
	decodeText,
	normalizeText,
	readZipEntries,
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
	// Заменяем таблицы на структурированные строки с разделителем \t и переносом \n
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
		return "\n\n" + rows.join("\n") + "\n\n";
	});

	return {
		text: stripXmlTags(processed),
		tableCount,
	};
}

export function extractDocx(buffer: Buffer): ExtractedDocument {
	try {
		const zip = readZipEntries(buffer);
		const docEntry = zip.entries.find((entry) =>
			/(?:^|\/)word\/document\.xml$/.test(entry.name),
		);
		let tableCount = 0;
		let mainText = "";

		if (docEntry) {
			const xml = decodeText(docEntry.data);
			const extracted = extractOpenXmlTablesAndText(xml);
			mainText = extracted.text;
			tableCount = extracted.tableCount;
		}

		const otherParts = zipText(
			zip.entries,
			/(?:^|\/)word\/(?:header\d*|footer\d*)\.xml$/,
		);

		const allText = [mainText, ...otherParts].filter(Boolean).join("\n\n");
		return {
			text: allText,
			tableCount,
			warnings: zip.warnings,
			parserNotes: [
				"DOCX разобран встроенным извлечением текста и таблиц из OpenXML ZIP.",
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

export function extractXlsx(buffer: Buffer): ExtractedDocument {
	try {
		const zip = readZipEntries(buffer);
		const shared = sharedStrings(zip.entries);
		const sheetTexts: string[] = [];
		const sheets = zip.entries.filter((entry) =>
			/(?:^|\/)xl\/worksheets\/sheet\d+\.xml$/.test(entry.name),
		);

		for (const sheet of sheets) {
			const xml = decodeText(sheet.data);
			const rows = Array.from(xml.matchAll(/<row\b[\s\S]*?<\/row>/g)).map(
				(rowMatch) => {
					const rowXml = rowMatch[0] ?? "";
					return Array.from(rowXml.matchAll(/<c\b[\s\S]*?<\/c>/g))
						.map((cellMatch) => extractCellValue(cellMatch[0] ?? "", shared))
						.join("\t")
						.replace(/\t+$/g, "");
				},
			);
			sheetTexts.push(rows.filter(Boolean).join("\n"));
		}

		return {
			text: sheetTexts.filter(Boolean).join("\n\n"),
			tableCount: sheets.length,
			warnings: zip.warnings,
			parserNotes: [
				"XLSX разобран встроенным извлечением таблиц из OpenXML ZIP; формулы не вычисляются.",
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

export function extractPptx(buffer: Buffer): ExtractedDocument {
	try {
		const zip = readZipEntries(buffer);
		const parts = zipText(zip.entries, /(?:^|\/)ppt\/slides\/slide\d+\.xml$/);
		return {
			text: parts.join("\n\n"),
			tableCount: 0,
			warnings: zip.warnings,
			parserNotes: ["PPTX разобран встроенным извлечением текста слайдов."],
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

export function extractOpenDocument(
	buffer: Buffer,
	kind: "odt" | "ods" | "odp",
): ExtractedDocument {
	try {
		const zip = readZipEntries(buffer);
		const content = zip.entries.find((entry) =>
			/(?:^|\/)content\.xml$/.test(entry.name),
		);
		const text = content ? stripXmlTags(decodeText(content.data)) : "";
		const tableCount = content
			? (decodeText(content.data).match(/<table:table\b/g) ?? []).length
			: 0;
		return {
			text,
			tableCount,
			warnings: zip.warnings,
			parserNotes: [
				`${kind.toUpperCase()} разобран встроенным извлечением текста из OpenDocument ZIP.`,
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
