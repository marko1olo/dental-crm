import {
	roundToKopecks,
	parseRubAmount,
	parseCompletedServiceLine,
	type ParsedCompletedLine,
} from "../completedServicesPlan";
import type { ProcedureCategory, ClinicalEstimateItem } from "./clinicalWorkflowTypes";

export function extractFromOrderServices(
	rawOrderServices: readonly any[] | undefined,
	toothNumber?: number | undefined,
): ClinicalEstimateItem[] | null {
	if (!Array.isArray(rawOrderServices) || rawOrderServices.length === 0) return null;

	const protocolItems: ClinicalEstimateItem[] = [];
	for (const s of rawOrderServices) {
		const qty = Number(s.defaultQuantity ?? s.quantity) > 0 ? Number(s.defaultQuantity ?? s.quantity) : 1;
		const priceRub = Number(
			s.priceRub ??
			s.unitPriceRub ??
			s.price ??
			(typeof s.priceKopecks === "number" ? s.priceKopecks / 100 : 0)
		);
		const itemTooth = s.toothNumber ? (parseInt(String(s.toothNumber), 10) || s.toothNumber) : toothNumber;
		let category: ProcedureCategory = "therapy";
		const code = String(s.code || s.code804n || "");
		if (code.startsWith("A11") || code.startsWith("A25")) category = "anesthesia";
		else if (code.startsWith("A06")) category = "diagnostics";
		else if (code.startsWith("A16.07.030") || code.startsWith("A16.07.082")) category = "endodontics";
		else if (code.startsWith("A16.07.001") || code.startsWith("A16.07.097")) category = "surgery";
		else if (code.startsWith("A16.07.050") || code.startsWith("A16.07.051")) category = "hygiene";
		else if (code.startsWith("A16.07.004") || code.startsWith("A16.07.006")) category = "orthopedics";
		else if (code === "A16.07.002.009") category = "isolation";

		protocolItems.push({
			id: s.id || `est-protocol-${code}-${protocolItems.length + 1}`,
			code,
			name: s.nameRu || s.name || s.title || "Медицинская услуга",
			quantity: qty,
			priceRub,
			totalRub: roundToKopecks(priceRub * qty),
			category,
			toothNumber: itemTooth,
		});
	}
	return protocolItems.length > 0 ? protocolItems : null;
}

export function extractFromTreatmentLines(
	treatmentRaw: string | undefined,
	toothNumber?: number | undefined,
): ClinicalEstimateItem[] | null {
	if (!treatmentRaw) return null;
	const rawLines = treatmentRaw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

	const completedLines = rawLines
		.map((l) => parseCompletedServiceLine(l))
		.filter((p): p is ParsedCompletedLine => p !== null && p.priceRub !== null && p.priceRub > 0);

	if (completedLines.length > 0) {
		return completedLines.map((cl, idx) => {
			const itemTooth = cl.toothCode ? (parseInt(cl.toothCode, 10) || cl.toothCode) : toothNumber;
			let category: ProcedureCategory = "therapy";
			const code = cl.code804n || "";
			if (code.startsWith("A11") || code.startsWith("A25")) category = "anesthesia";
			else if (code.startsWith("A06")) category = "diagnostics";
			else if (code.startsWith("A16.07.030")) category = "endodontics";
			else if (code.startsWith("A16.07.001")) category = "surgery";
			else if (code.startsWith("A16.07.050") || code.startsWith("A16.07.051")) category = "hygiene";

			return {
				id: `est-parsed-${code || idx + 1}-${idx + 1}`,
				code,
				name: cl.title,
				quantity: cl.quantity,
				priceRub: cl.priceRub!,
				totalRub: roundToKopecks(cl.priceRub! * cl.quantity),
				category,
				toothNumber: itemTooth,
			};
		});
	}

	const bulletLines: ClinicalEstimateItem[] = [];
	for (const line of rawLines) {
		const bulletMatch = line.match(/^•\s*([A-Za-z0-9.]+)\s+(.+?)(?:\s*\(x(\d+)\))?\s*[—–-]\s*([0-9\s  ,.]+)\s*₽?$/i);
		if (bulletMatch && bulletMatch[1] && bulletMatch[2] && bulletMatch[4]) {
			const code: string = bulletMatch[1];
			const name: string = bulletMatch[2].trim();
			const qty = bulletMatch[3] ? parseInt(bulletMatch[3], 10) : 1;
			const price = parseRubAmount(bulletMatch[4]);
			if (price !== null && price > 0) {
				let category: ProcedureCategory = "therapy";
				if (code.startsWith("A11") || code.startsWith("A25")) category = "anesthesia";
				else if (code.startsWith("A06")) category = "diagnostics";
				else if (code.startsWith("A16.07.030")) category = "endodontics";
				else if (code.startsWith("A16.07.001")) category = "surgery";
				else if (code.startsWith("A16.07.050") || code.startsWith("A16.07.051")) category = "hygiene";

				bulletLines.push({
					id: `est-bullet-${code}-${bulletLines.length + 1}`,
					code,
					name,
					quantity: qty,
					priceRub: price,
					totalRub: roundToKopecks(price * qty),
					category,
					toothNumber,
				});
			}
		}
	}
	return bulletLines.length > 0 ? bulletLines : null;
}
