function sanitizeCode(code?: string): string {
	if (!code) return "AK01";
	const cyrillicMap = {
		А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ж: "ZH", З: "Z", И: "I", К: "K",
		Л: "L", М: "M", Н: "N", О: "O", П: "P", Р: "R", С: "S", Т: "T", У: "U", Ф: "F",
		Х: "H", Ц: "TS", Ч: "CH", Ш: "SH", Щ: "SCH", Ы: "Y", Э: "E", Ю: "YU", Я: "YA",
	};
	const transliterated = code
		.toUpperCase()
		.split("")
		.map((ch) => cyrillicMap[ch as keyof typeof cyrillicMap] ?? ch)
		.join("");
	return transliterated.replace(/[^A-Za-z0-9]/g, "") || "AK01";
}

export function generateKraftBarcode(params: {
	batchNumber: string;
	serialNumber: number;
	expDateIsoOrFormatted: string;
	sterilizerCode?: string;
}): string {
	const cleanBatch = params.batchNumber.replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "B01";
	const serialStr = String(params.serialNumber).padStart(3, "0");
	const datePart = params.expDateIsoOrFormatted.replace(/[^0-9]/g, "").slice(0, 8);
	const stCode = sanitizeCode(params.sterilizerCode);
	return `DNT-${stCode}-${cleanBatch}-S${serialStr}-${datePart}`;
}

export function parseKraftBarcode(barcode: string): {
	readonly isValid: boolean;
	readonly sterilizerCode: string | null;
	readonly batchNumber: string | null;
	readonly serialNumber: number | null;
	readonly expDateFormatted: string | null;
} {
	const clean = barcode.trim().toUpperCase();
	const match = clean.match(/^DNT-([A-Z0-9]+)-([A-Z0-9]+)-S(\d+)-(\d{4})(\d{2})(\d{2})$/);
	if (!match) {
		return {
			isValid: false,
			sterilizerCode: null,
			batchNumber: null,
			serialNumber: null,
			expDateFormatted: null,
		};
	}

	const sterilizerCode = match[1] ?? null;
	const batchNumber = match[2] ?? null;
	const serialStr = match[3] ?? "0";
	const y = match[4] ?? "";
	const m = match[5] ?? "";
	const d = match[6] ?? "";

	return {
		isValid: true,
		sterilizerCode,
		batchNumber,
		serialNumber: parseInt(serialStr, 10),
		expDateFormatted: y && m && d ? `${y}-${m}-${d}` : null,
	};
}

export function generateDigitalStampHash(params: {
	date: string;
	cycleNumber: number;
	operatorFullName: string;
	secretSalt?: string;
}): string {
	const str = `${params.date}_CYC${params.cycleNumber}_${params.operatorFullName}_${params.secretSalt ?? "SANPIN_CSO_SIG_2026"}`;
	let hash = 0x811c9dc5;
	for (let i = 0; i < str.length; i++) {
		hash ^= str.charCodeAt(i);
		hash = (hash * 0x01000193) >>> 0;
	}
	const hex = hash.toString(16).padStart(8, "0").toUpperCase();
	return `ЭЦП-ЦСО-${hex}-${params.date.replace(/-/g, "")}`;
}
