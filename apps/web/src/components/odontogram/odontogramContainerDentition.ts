export const ADULT_Q1 = [18, 17, 16, 15, 14, 13, 12, 11] as const;
export const ADULT_Q2 = [21, 22, 23, 24, 25, 26, 27, 28] as const;
export const ADULT_Q3 = [31, 32, 33, 34, 35, 36, 37, 38] as const;
export const ADULT_Q4 = [48, 47, 46, 45, 44, 43, 42, 41] as const;
export const ADULT_FRONT = [
	13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33,
] as const;

export const PEDIATRIC_Q5 = [55, 54, 53, 52, 51] as const;
export const PEDIATRIC_Q6 = [61, 62, 63, 64, 65] as const;
export const PEDIATRIC_Q7 = [71, 72, 73, 74, 75] as const;
export const PEDIATRIC_Q8 = [85, 84, 83, 82, 81] as const;
export const PEDIATRIC_FRONT = [
	53, 52, 51, 61, 62, 63, 83, 82, 81, 71, 72, 73,
] as const;

export function resolveEffectiveDentition(
	dentitionMode?: "adult" | "pediatric" | "mixed" | undefined,
	pediatricMode?: boolean | undefined,
	mixedDentition?: boolean | undefined,
) {
	const isPediatricEffective =
		dentitionMode === "pediatric" ||
		(dentitionMode === undefined && Boolean(pediatricMode));
	const isMixedEffective =
		dentitionMode === "mixed" ||
		(dentitionMode === undefined && Boolean(mixedDentition));
	const effectiveDentition: "adult" | "pediatric" | "mixed" =
		dentitionMode ??
		(isMixedEffective ? "mixed" : isPediatricEffective ? "pediatric" : "adult");
	return { isPediatricEffective, isMixedEffective, effectiveDentition };
}
