import { type ToothStatus } from "../../store/patientStore";

export const TOOTH_NUMBERS = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46,
	45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

export const UPPER_TEETH = TOOTH_NUMBERS.slice(0, 16);
export const LOWER_TEETH = TOOTH_NUMBERS.slice(16, 32);

export const STATUS_COLORS: Record<ToothStatus, string> = {
	Healthy: "#ffffff",
	Caries: "#dc2626",
	Filling: "#0ea5e9",
	Missing: "#94a3b8",
	Implant: "#0f766e",
	Crown: "#f59e0b",
};

export const STATUS_GLOW: Record<ToothStatus, string> = {
	Healthy: "rgba(148,163,184,0.4)",
	Caries: "rgba(220,38,38,0.5)",
	Filling: "rgba(14,165,233,0.5)",
	Missing: "rgba(148,163,184,0.3)",
	Implant: "rgba(15,118,110,0.5)",
	Crown: "rgba(245,158,11,0.5)",
};

export const STATUS_OPTIONS: ToothStatus[] = [
	"Healthy",
	"Caries",
	"Filling",
	"Missing",
	"Implant",
	"Crown",
];

export const RADIAL_MENU_COLORS: Record<
	ToothStatus,
	{ bg: string; text: string; border: string }
> = {
	Healthy: {
		bg: "rgba(16, 185, 129, 0.15)",
		text: "#10b981",
		border: "rgba(16, 185, 129, 0.3)",
	},
	Caries: {
		bg: "rgba(239, 68, 68, 0.15)",
		text: "#ef4444",
		border: "rgba(239, 68, 68, 0.3)",
	},
	Filling: {
		bg: "rgba(14, 165, 233, 0.15)",
		text: "#0ea5e9",
		border: "rgba(14, 165, 233, 0.3)",
	},
	Missing: {
		bg: "rgba(100, 116, 139, 0.2)",
		text: "#64748b",
		border: "rgba(100, 116, 139, 0.3)",
	},
	Implant: {
		bg: "rgba(234, 179, 8, 0.15)",
		text: "#fbbf24",
		border: "rgba(234, 179, 8, 0.3)",
	},
	Crown: {
		bg: "rgba(59, 130, 246, 0.15)",
		text: "#60a5fa",
		border: "rgba(59, 130, 246, 0.3)",
	},
};
