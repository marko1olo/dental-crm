function formatDigits(num: number, digits: number): string {
	return String(num).padStart(digits, "0");
}

function formatDateCompact(d: Date): string {
	const year = d.getFullYear();
	const month = formatDigits(d.getMonth() + 1, 2);
	const day = formatDigits(d.getDate(), 2);
	return `${year}${month}${day}`;
}

export function generateSanpinBarcode(
	autoclaveId: string,
	cycleNumber: number,
	dateInput: Date | string,
	packIndex: number | string,
): string {
	const cleanAutoclave = autoclaveId.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10) || "AUTO1";
	const cycleStr = formatDigits(cycleNumber, 3);
	const dateObj = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
	const dateStr = formatDateCompact(dateObj);
	const packStr = typeof packIndex === "number" ? formatDigits(packIndex, 3) : String(packIndex);

	return `SANPIN-${cleanAutoclave}-${cycleStr}-${dateStr}-${packStr}`;
}

export interface ParsedSanpinBarcode {
	isValid: boolean;
	barcode: string;
	autoclaveId: string;
	cycleNumber: number;
	dateString: string;
	packId: string;
	error?: string;
}

export function parseSanpinBarcode(barcodeString: string): ParsedSanpinBarcode {
	const clean = (barcodeString || "").trim();
	const parts = clean.split("-");

	if (parts.length < 5 || parts[0] !== "SANPIN") {
		return {
			isValid: false,
			barcode: clean,
			autoclaveId: "",
			cycleNumber: 0,
			dateString: "",
			packId: "",
			error: "Неверный формат штрихкода СанПиН (ожидается SANPIN-DEVICE-CYCLE-DATE-PACK)",
		};
	}

	const autoclaveId = parts[1] ?? "";
	const cycleNumber = parseInt(parts[2] ?? "0", 10);
	const dateString = parts[3] ?? "";
	const packId = parts.slice(4).join("-");

	if (isNaN(cycleNumber) || cycleNumber <= 0) {
		return {
			isValid: false,
			barcode: clean,
			autoclaveId,
			cycleNumber: 0,
			dateString,
			packId,
			error: "Некорректный номер цикла стерилизатора",
		};
	}

	if (dateString.length !== 8) {
		return {
			isValid: false,
			barcode: clean,
			autoclaveId,
			cycleNumber,
			dateString,
			packId,
			error: "Некорректный формат даты (ожидается ГГГГММДД)",
		};
	}

	return {
		isValid: true,
		barcode: clean,
		autoclaveId,
		cycleNumber,
		dateString,
		packId,
	};
}
