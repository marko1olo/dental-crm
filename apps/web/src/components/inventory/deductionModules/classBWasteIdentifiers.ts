let _classBWasteActCounter = 1;

/**
 * Deterministic generator for statutory Class B waste act numbers, seal numbers, and barcodes.
 */
export function generateDeterministicWasteActIdentifiers(
	actDateIso: string,
	customSeq?: number,
): {
	readonly actNumber: string;
	readonly sealNumber: string;
	readonly barcode: string;
} {
	const raw = actDateIso ? new Date(actDateIso) : new Date();
	const year = Number.isNaN(raw.getFullYear()) ? new Date().getFullYear() : raw.getFullYear();
	const month = String(Number.isNaN(raw.getMonth()) ? new Date().getMonth() + 1 : raw.getMonth() + 1).padStart(2, "0");
	const day = String(Number.isNaN(raw.getDate()) ? new Date().getDate() : raw.getDate()).padStart(2, "0");
	const seq = customSeq ?? _classBWasteActCounter++;
	const seqPadded = String(seq).padStart(4, "0");

	return {
		actNumber: `АКТ-ОТХОД-Б-${year}${month}${day}-${seqPadded}`,
		sealNumber: `ПЛ-Б-${year}-${seqPadded}`,
		barcode: `WASTE-CLASS_B-DENT-${year}${month}${day}-${seqPadded}`,
	};
}
