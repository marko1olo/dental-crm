import { type PatientTagCode, PATIENT_TAGS_MAP } from "./tagDefinitions.js";

export interface AppleHigTagBadgeStyle {
	readonly colorHex: string;
	readonly bgHex: string;
	readonly borderHex: string;
	readonly darkBgHex: string;
	readonly darkColorHex: string;
	readonly darkBorderHex: string;
}

const DEFAULT_STYLE: AppleHigTagBadgeStyle = {
	colorHex: "#475569",
	bgHex: "rgba(71, 85, 105, 0.08)",
	borderHex: "rgba(71, 85, 105, 0.2)",
	darkColorHex: "#94a3b8",
	darkBgHex: "rgba(148, 163, 184, 0.15)",
	darkBorderHex: "rgba(148, 163, 184, 0.3)",
};

const TAG_STYLE_REGISTRY: Partial<Record<PatientTagCode, AppleHigTagBadgeStyle>> = {
	allergy: {
		colorHex: "#dc2626",
		bgHex: "rgba(239, 68, 68, 0.12)",
		borderHex: "rgba(239, 68, 68, 0.25)",
		darkColorHex: "#fca5a5",
		darkBgHex: "rgba(239, 68, 68, 0.2)",
		darkBorderHex: "rgba(239, 68, 68, 0.4)",
	},
	acute_pain: {
		colorHex: "#ea580c",
		bgHex: "rgba(249, 115, 22, 0.12)",
		borderHex: "rgba(249, 115, 22, 0.25)",
		darkColorHex: "#fdba74",
		darkBgHex: "rgba(249, 115, 22, 0.2)",
		darkBorderHex: "rgba(249, 115, 22, 0.4)",
	},
	pregnancy: {
		colorHex: "#db2777",
		bgHex: "rgba(236, 72, 153, 0.12)",
		borderHex: "rgba(236, 72, 153, 0.25)",
		darkColorHex: "#f9a8d4",
		darkBgHex: "rgba(236, 72, 153, 0.2)",
		darkBorderHex: "rgba(236, 72, 153, 0.4)",
	},
	vip: {
		colorHex: "#d97706",
		bgHex: "rgba(245, 158, 11, 0.12)",
		borderHex: "rgba(245, 158, 11, 0.25)",
		darkColorHex: "#fcd34d",
		darkBgHex: "rgba(245, 158, 11, 0.2)",
		darkBorderHex: "rgba(245, 158, 11, 0.4)",
	},
	dms: {
		colorHex: "#0284c7",
		bgHex: "rgba(14, 165, 233, 0.12)",
		borderHex: "rgba(14, 165, 233, 0.25)",
		darkColorHex: "#7dd3fc",
		darkBgHex: "rgba(14, 165, 233, 0.2)",
		darkBorderHex: "rgba(14, 165, 233, 0.4)",
	},
	debtor: {
		colorHex: "#b91c1c",
		bgHex: "rgba(220, 38, 38, 0.12)",
		borderHex: "rgba(220, 38, 38, 0.25)",
		darkColorHex: "#fca5a5",
		darkBgHex: "rgba(220, 38, 38, 0.2)",
		darkBorderHex: "rgba(220, 38, 38, 0.4)",
	},
	family_head: {
		colorHex: "#4f46e5",
		bgHex: "rgba(99, 102, 241, 0.12)",
		borderHex: "rgba(99, 102, 241, 0.25)",
		darkColorHex: "#a5b4fc",
		darkBgHex: "rgba(99, 102, 241, 0.2)",
		darkBorderHex: "rgba(99, 102, 241, 0.4)",
	},
};

export function getTagBadgeStyle(code: PatientTagCode | string, isDark = false): {
	color: string;
	backgroundColor: string;
	borderColor: string;
} {
	const custom = TAG_STYLE_REGISTRY[code as PatientTagCode];
	const meta = PATIENT_TAGS_MAP[code as PatientTagCode];

	if (custom) {
		return {
			color: isDark ? custom.darkColorHex : custom.colorHex,
			backgroundColor: isDark ? custom.darkBgHex : custom.bgHex,
			borderColor: isDark ? custom.darkBorderHex : custom.borderHex,
		};
	}

	if (meta) {
		return {
			color: meta.colorHex,
			backgroundColor: meta.bgHex,
			borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
		};
	}

	return {
		color: isDark ? DEFAULT_STYLE.darkColorHex : DEFAULT_STYLE.colorHex,
		backgroundColor: isDark ? DEFAULT_STYLE.darkBgHex : DEFAULT_STYLE.bgHex,
		borderColor: isDark ? DEFAULT_STYLE.darkBorderHex : DEFAULT_STYLE.borderHex,
	};
}
