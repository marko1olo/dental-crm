/**
 * DENTE Dental CRM — Canal Obturation Materials Data
 * Compliant with Mandate 8b (<= 120 lines).
 */

import type { CanalObturationMaterial } from "../anatomicalGeometriesTypes";

export const CANAL_OBTURATIONS: Record<
	CanalObturationMaterial,
	{
		readonly nameRu: string;
		readonly strokeColor: string;
		readonly coreColor: string;
		readonly shaderId?: string;
		readonly shaderAliasId?: string;
		readonly glowId?: string;
		readonly apicalSealColor?: string;
	}
> = {
	gutta_percha: {
		nameRu: "Гуттаперча + эпоксидный силер (AH Plus)",
		shaderId: "gutta-percha-gradient",
		shaderAliasId: "dente-shader-gutta-percha",
		strokeColor: "#f43f5e",
		coreColor: "#fecdd3",
		glowId: "dente-glow-coral",
		apicalSealColor: "#be123c",
	},
	bioceramic: {
		nameRu: "Биокерамический силер (BioRoot RCS / TotalFill)",
		strokeColor: "#0d9488",
		coreColor: "#ccfbf1",
		glowId: "dente-glow-teal",
	},
	calcium_hydroxide: {
		nameRu: "Временная гидроокись кальция Ca(OH)2",
		strokeColor: "#eab308",
		coreColor: "#fef9c3",
	},
	fiber_post: {
		nameRu: "Стекловолоконный штифт (Fiber Post)",
		shaderId: "fiber-post-gradient",
		shaderAliasId: "dente-shader-fiber-post",
		strokeColor: "#6366f1",
		coreColor: "#e0e7ff",
		glowId: "dente-glow-indigo",
	},
	cast_core_post: {
		nameRu: "Литой культевой металлический штифт (Cast Core)",
		shaderId: "cast-core-post-gradient",
		shaderAliasId: "dente-shader-cast-core",
		strokeColor: "#334155",
		coreColor: "#cbd5e1",
		glowId: "dente-metallic-specular",
	},
	titanium_post: {
		nameRu: "Титановый анкерный штифт",
		shaderId: "cast-core-post-gradient",
		shaderAliasId: "dente-shader-cast-core",
		strokeColor: "#475569",
		coreColor: "#cbd5e1",
	},
	unfilled: {
		nameRu: "Инструментированный незаполненный канал",
		strokeColor: "#94a3b8",
		coreColor: "transparent",
	},
};
