import type { ParsedImplantBarcode } from "./implantPresetTypes";

export function parseImplantBarcode(barcode: string): ParsedImplantBarcode {
	const raw = barcode.trim();
	if (!raw) return { rawBarcode: "" };

	let article: string | undefined;
	let lot: string | undefined;
	let serial: string | undefined;
	let expirationDate: string | undefined;

	const gtinMatch = raw.match(/\(01\)(\d{14})/i) || raw.match(/01(\d{14})/);
	const lotMatch = raw.match(/\(10\)([a-zA-Z0-9\-]+)/i) || raw.match(/10([a-zA-Z0-9\-]+?)(?:17|21|$)/);
	const expMatch = raw.match(/\(17\)(\d{6})/i) || raw.match(/17(\d{6})/);
	const snMatch = raw.match(/\(21\)([a-zA-Z0-9\-]+)/i) || raw.match(/21([a-zA-Z0-9\-]+)/);
	const refMatch = raw.match(/\(240\)([a-zA-Z0-9\-]+)/i) || raw.match(/REF[:\s]*([a-zA-Z0-9\-]+)/i);

	if (refMatch && refMatch[1]) {
		article = refMatch[1];
	} else if (gtinMatch && gtinMatch[1]) {
		article = `REF-${gtinMatch[1].slice(-6)}`;
	}

	if (lotMatch) lot = lotMatch[1];
	if (snMatch) serial = snMatch[1];
	if (expMatch && expMatch[1]?.length === 6) {
		const yy = expMatch[1].slice(0, 2);
		const mm = expMatch[1].slice(2, 4);
		const dd = expMatch[1].slice(4, 6);
		expirationDate = `20${yy}-${mm}-${dd}`;
	}

	if (!article && !lot && !serial) {
		const parts = raw.split(/\s*[\/|;]\s*/);
		if (parts.length >= 2) {
			article = parts[0]?.trim();
			lot = parts[1]?.trim();
			if (parts.length >= 3) serial = parts[2]?.trim();
		}
	}

	return { rawBarcode: raw, article, lot, serial, expirationDate };
}

export function parseStockDimensions(name: string): {
	brand?: string;
	diameterMm?: number;
	lengthMm?: number;
} {
	const result: { brand?: string; diameterMm?: number; lengthMm?: number } = {};

	if (/osstem/i.test(name)) result.brand = "Osstem";
	else if (/dentium/i.test(name)) result.brand = "Dentium";
	else if (/straumann/i.test(name)) result.brand = "Straumann";
	else if (/nobel/i.test(name)) result.brand = "Nobel Biocare";
	else if (/ankylos/i.test(name)) result.brand = "Ankylos";
	else if (/astra/i.test(name)) result.brand = "Astra Tech";
	else if (/megagen/i.test(name)) result.brand = "MegaGen";
	else if (/neodent/i.test(name)) result.brand = "Neodent";

	const sizeMatch = name.match(/Ø\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
	if (sizeMatch && sizeMatch[1] && sizeMatch[2]) {
		result.diameterMm = parseFloat(sizeMatch[1]);
		result.lengthMm = parseFloat(sizeMatch[2]);
	}
	return result;
}
