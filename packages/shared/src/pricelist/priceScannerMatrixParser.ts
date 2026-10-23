export function parseDelimitedTextToMatrix(rawText: string): string[][] {
	if (!rawText || typeof rawText !== "string") return [];

	const clean = rawText
		.replace(/^\uFEFF/, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n");

	const lines = clean.split("\n");
	const matrix: string[][] = [];

	let semicolonCount = 0;
	let tabCount = 0;
	let commaCount = 0;

	for (const line of lines.slice(0, 30)) {
		for (const ch of line) {
			if (ch === ";") semicolonCount++;
			else if (ch === "\t") tabCount++;
			else if (ch === ",") commaCount++;
		}
	}

	let delimiter = ";";
	if (tabCount > semicolonCount && tabCount > commaCount) delimiter = "\t";
	else if (commaCount > semicolonCount && commaCount > tabCount) delimiter = ",";

	for (const line of lines) {
		if (!line.trim()) continue;
		const row: string[] = [];
		let currentCell = "";
		let insideQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const ch = line[i];
			if (ch === '"') {
				if (insideQuotes && line[i + 1] === '"') {
					currentCell += '"';
					i++;
				} else {
					insideQuotes = !insideQuotes;
				}
			} else if (ch === delimiter && !insideQuotes) {
				row.push(currentCell.trim());
				currentCell = "";
			} else {
				currentCell += ch;
			}
		}
		row.push(currentCell.trim());
		if (row.some((c) => c.length > 0)) {
			matrix.push(row);
		}
	}

	return matrix;
}

export function isTabularText(rawText: string): boolean {
	if (!rawText || typeof rawText !== "string") return false;
	const sampleLines = rawText.split("\n").slice(0, 10);
	let semicolonLines = 0;
	let tabLines = 0;

	for (const line of sampleLines) {
		if (line.includes(";")) semicolonLines++;
		if (line.includes("\t")) tabLines++;
	}

	return semicolonLines >= 3 || tabLines >= 3;
}
