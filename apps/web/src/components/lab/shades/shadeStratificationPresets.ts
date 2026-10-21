export interface StratificationZones {
	cervical: string;
	body: string;
	incisal: string;
}

export function getStratificationPreset(
	primaryShade: string,
	mode: "natural" | "monochrome" | "youth_translucent" = "natural",
): StratificationZones {
	const shade = (primaryShade || "A2").trim();
	if (mode === "monochrome") {
		return { cervical: shade, body: shade, incisal: shade };
	}
	if (mode === "youth_translucent") {
		return {
			cervical: shade,
			body: shade,
			incisal: shade === "A1" || shade === "B1" ? "0M1" : "A1",
		};
	}
	const naturalMap: Record<string, { cervical: string; incisal: string }> = {
		A1: { cervical: "A2", incisal: "0M2" },
		A2: { cervical: "A3", incisal: "A1" },
		A3: { cervical: "A3.5", incisal: "A2" },
		"A3.5": { cervical: "A4", incisal: "A3" },
		A4: { cervical: "A4", incisal: "A3.5" },
		B1: { cervical: "B2", incisal: "0M2" },
		B2: { cervical: "B3", incisal: "B1" },
		B3: { cervical: "B4", incisal: "B2" },
		B4: { cervical: "B4", incisal: "B3" },
		C1: { cervical: "C2", incisal: "C1" },
		C2: { cervical: "C3", incisal: "C1" },
		C3: { cervical: "C4", incisal: "C2" },
		C4: { cervical: "C4", incisal: "C3" },
		D2: { cervical: "D3", incisal: "D2" },
		D3: { cervical: "D4", incisal: "D2" },
		D4: { cervical: "D4", incisal: "D3" },
		"0M1": { cervical: "0M2", incisal: "0M1" },
		"0M2": { cervical: "0M3", incisal: "0M1" },
		"0M3": { cervical: "1M1", incisal: "0M2" },
		"1M1": { cervical: "1M2", incisal: "0M1" },
		"2M2": { cervical: "2M3", incisal: "2M1" },
		"3M2": { cervical: "3M3", incisal: "3M1" },
	};
	const matched = naturalMap[shade];
	if (matched) {
		return { cervical: matched.cervical, body: shade, incisal: matched.incisal };
	}
	return { cervical: shade, body: shade, incisal: shade };
}
