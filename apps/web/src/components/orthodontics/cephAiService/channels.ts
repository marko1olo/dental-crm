import type { LandmarkKey } from "../cephalometricMath";

export const CEPHA29_CHANNEL_MAPPING: Record<number, string> = {
	0: "A", 1: "ANS", 2: "Ar", 3: "B", 4: "Co", 5: "Gn", 6: "Go", 7: "L1a", 8: "L1t",
	9: "LMT", 10: "LPM", 11: "Li", 12: "Ls", 13: "Me", 14: "N", 15: "N_soft", 16: "Or",
	17: "PNS", 18: "Pn", 19: "Po", 20: "Pog", 21: "Pog_soft", 22: "R", 23: "S", 24: "Sn",
	25: "U1a", 26: "U1t", 27: "UMT", 28: "UPM",
};

export const CLINICAL_16_CHANNELS: Record<LandmarkKey, { channel: number; nameRu: string; category: string }> = {
	S: { channel: 23, nameRu: "Sella (Седло)", category: "cranial" },
	N: { channel: 14, nameRu: "Nasion (Назион)", category: "cranial" },
	Or: { channel: 16, nameRu: "Orbitale (Орбитале)", category: "cranial" },
	Po: { channel: 19, nameRu: "Porion (Порион)", category: "cranial" },
	ANS: { channel: 1, nameRu: "ANS (Передняя носовая ость)", category: "maxillary" },
	PNS: { channel: 17, nameRu: "PNS (Задняя носовая ость)", category: "maxillary" },
	A: { channel: 0, nameRu: "Точка A (Субспинале)", category: "maxillary" },
	B: { channel: 3, nameRu: "Точка B (Супраментале)", category: "mandibular" },
	Pog: { channel: 20, nameRu: "Pogonion (Погонион)", category: "mandibular" },
	Gn: { channel: 5, nameRu: "Gnathion (Гнатион)", category: "mandibular" },
	Me: { channel: 13, nameRu: "Menton (Ментон)", category: "mandibular" },
	Go: { channel: 6, nameRu: "Gonion (Гонион)", category: "mandibular" },
	U1t: { channel: 26, nameRu: "U1 Tip (Край верхнего резца)", category: "dental" },
	U1a: { channel: 25, nameRu: "U1 Apex (Корень верхнего резца)", category: "dental" },
	L1t: { channel: 8, nameRu: "L1 Tip (Край нижнего резца)", category: "dental" },
	L1a: { channel: 7, nameRu: "L1 Apex (Корень нижнего резца)", category: "dental" },
};

export const SAMPLE_VALIDATION_COORDINATES_1200_896: Record<LandmarkKey, { x: number; y: number; confidence: number }> = {
	S: { x: 625.2, y: 303.3, confidence: 0.994 },
	N: { x: 956.1, y: 238.1, confidence: 0.936 },
	A: { x: 974.9, y: 508.6, confidence: 0.914 },
	B: { x: 956.5, y: 718.7, confidence: 0.95 },
	Pog: { x: 962.7, y: 779.2, confidence: 0.943 },
	Me: { x: 937.5, y: 812.0, confidence: 1.017 },
	Gn: { x: 956.4, y: 798.1, confidence: 0.945 },
	Go: { x: 606.1, y: 676.6, confidence: 0.929 },
	ANS: { x: 987.4, y: 485.4, confidence: 0.959 },
	PNS: { x: 725.0, y: 508.7, confidence: 0.95 },
	Or: { x: 887.7, y: 377.9, confidence: 0.938 },
	Po: { x: 506.2, y: 415.2, confidence: 0.954 },
	U1t: { x: 993.8, y: 625.4, confidence: 0.93 },
	U1a: { x: 943.7, y: 508.7, confidence: 0.993 },
	L1t: { x: 975.2, y: 620.7, confidence: 0.965 },
	L1a: { x: 931.1, y: 718.7, confidence: 0.961 },
};
