export interface SurfacePreset {
	readonly label: string;
	readonly surfs: readonly string[];
	readonly title: string;
}

export const SURFACE_PRESETS: readonly SurfacePreset[] = [
	{ label: "O", surfs: ["O"], title: "Окклюзионная (жевательная)" },
	{ label: "MO", surfs: ["M", "O"], title: "Медиально-окклюзионная полость" },
	{ label: "OD", surfs: ["O", "D"], title: "Окклюзионно-дистальная полость" },
	{ label: "MOD", surfs: ["M", "O", "D"], title: "Медиально-окклюзионно-дистальная (МОД)" },
	{ label: "V", surfs: ["V"], title: "Вестибулярная (щечная/губная)" },
	{ label: "C", surfs: ["C"], title: "Пришеечная область (V класс)" },
] as const;

export function canonicalKey(surf: string): string {
	const upper = surf.toUpperCase();
	if (upper === "B") return "V";
	if (upper === "P") return "L";
	if (upper === "CERVICAL") return "C";
	return upper;
}
