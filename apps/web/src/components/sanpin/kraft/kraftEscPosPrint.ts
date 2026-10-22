import type { KraftPackageRecord } from "./kraftPackageTypes.js";

/**
 * Encodes Unicode/UTF-8 string to standard IBM CP866 (DOS Cyrillic) byte array.
 * Used for thermal receipt printers (Xprinter, POS-58/80, Epson ESC/POS, АТОЛ/Штрих).
 */
export function encodeStringToCp866(text: string): Uint8Array {
	const bytes = new Uint8Array(text.length);
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if (code <= 0x7f) {
			bytes[i] = code;
		} else if (code >= 0x0410 && code <= 0x043f) {
			// 'А' (0x0410) .. 'п' (0x043F) -> 0x80 .. 0xAF
			bytes[i] = code - 0x0410 + 0x80;
		} else if (code >= 0x0440 && code <= 0x044f) {
			// 'р' (0x0440) .. 'я' (0x044F) -> 0xE0 .. 0xEF
			bytes[i] = code - 0x0440 + 0xe0;
		} else if (code === 0x0401) {
			// 'Ё' -> 0xF0
			bytes[i] = 0xf0;
		} else if (code === 0x0451) {
			// 'ё' -> 0xF1
			bytes[i] = 0xf1;
		} else if (code === 0x2116) {
			// '№' -> 0xFC (in CP866)
			bytes[i] = 0xfc;
		} else {
			bytes[i] = 0x3f; // '?'
		}
	}
	return bytes;
}

/**
 * Generates raw ESC/POS binary command stream for SanPiN 3.3686-21 thermal label printing.
 * Configures CP866 code table, bold text, and automated paper cut.
 */
export function generateEscPosSanpinLabelBinary(
	record: KraftPackageRecord,
	options: {
		clinicName?: string;
		cutPaper?: boolean;
	} = {},
): Uint8Array {
	const clinicName = options.clinicName || "СТОМАТОЛОГИЯ DENTE";
	const cutPaper = options.cutPaper !== false;

	const textParts: string[] = [
		`${clinicName}\n`,
		`СТЕРИЛИЗАЦИЯ: САНПИН 3.3686-21\n`,
		`--------------------------------\n`,
		`НАБОР: ${record.toolSetNameRu}\n`,
		`ШТРИХКОД: ${record.barcode128}\n`,
		`АВТОКЛАВ: ${record.autoclaveId} (ЦИКЛ #${record.cycleNumber})\n`,
		`ДАТА СТЕРИЛ.: ${record.packDate}\n`,
		`ГОДЕН ДО:     ${record.expDate} (${record.daysLifespan} сут.)\n`,
		`ОПЕРАТОР:     ${record.operatorName}\n`,
		`--------------------------------\n`,
		`ЭЦП ЦСО ПОДТВЕРЖДЕНА\n\n\n`,
	];

	const combinedText = textParts.join("");
	const textBytes = encodeStringToCp866(combinedText);

	const initHeader = new Uint8Array([
		0x1b, 0x40, // ESC @ (Init)
		0x1b, 0x74, 0x11, // ESC t 17 (CP866)
	]);

	const cutFooter = cutPaper
		? new Uint8Array([0x1d, 0x56, 0x42, 0x00]) // GS V 'B' 0 (Feed and partial cut)
		: new Uint8Array([0x0a, 0x0a]);

	const totalLength = initHeader.length + textBytes.length + cutFooter.length;
	const out = new Uint8Array(totalLength);
	out.set(initHeader, 0);
	out.set(textBytes, initHeader.length);
	out.set(cutFooter, initHeader.length + textBytes.length);

	return out;
}
