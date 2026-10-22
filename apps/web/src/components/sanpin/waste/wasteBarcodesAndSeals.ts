import type { MedicalWasteClassId } from "./medicalWastePresets.js";

export function generateWasteSealNumber(
	wasteClass: MedicalWasteClassId,
	counter = 1,
	year: number = new Date().getFullYear(),
): string {
	const letter =
		wasteClass === "class_A" ? "А"
		: wasteClass === "class_B" ? "Б"
		: wasteClass === "class_V" ? "В"
		: "Г";
	const padded = counter.toString().padStart(5, "0");
	return `ПЛ-${letter}-${year}-${padded}`;
}

export function generateWasteBarcode(
	wasteClass: MedicalWasteClassId,
	departmentCode = "TER",
	dateStr: string = new Date().toISOString().slice(0, 10),
	uniqueSeq?: number | undefined,
): string {
	const classPart =
		wasteClass === "class_A" ? "CLASS_A"
		: wasteClass === "class_B" ? "CLASS_B"
		: wasteClass === "class_V" ? "CLASS_V"
		: "CLASS_G";
	const cleanDept = departmentCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "CAB1";
	const datePart = dateStr.replace(/[^0-9]/g, "").slice(0, 8);
	const seq = uniqueSeq ?? 1;
	return `WASTE-${classPart}-${cleanDept}-${datePart}-${seq}`;
}

export function parseWasteBarcode(barcode: string): {
	isValid: boolean;
	wasteClass?: MedicalWasteClassId | undefined;
	departmentCode?: string | undefined;
	dateStr?: string | undefined;
	sequenceId?: string | undefined;
} {
	const trimmed = barcode.trim();
	const match = trimmed.match(/^WASTE-(CLASS_A|CLASS_B|CLASS_V|CLASS_G)-([A-Z0-9]{2,6})-(\d{8})-(\d+)$/);
	if (!match) return { isValid: false };

	const classPart = match[1];
	const dept = match[2];
	const rawDate = match[3];
	const seq = match[4];

	let wasteClass: MedicalWasteClassId = "class_B";
	if (classPart === "CLASS_A") wasteClass = "class_A";
	else if (classPart === "CLASS_V") wasteClass = "class_V";
	else if (classPart === "CLASS_G") wasteClass = "class_G";

	const formattedDate = rawDate
		? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
		: undefined;

	return { isValid: true, wasteClass, departmentCode: dept, dateStr: formattedDate, sequenceId: seq };
}
