import React from "react";
import type { OutpatientSpecialty } from "@dental/shared";
import {
	Crown,
	Flame,
	HeartPulse,
	Scissors,
	Stethoscope,
} from "lucide-react";

export const ALL_FDI_ADULT_TEETH: readonly number[] = [
	18, 17, 16, 15, 14, 13, 12, 11,
	21, 22, 23, 24, 25, 26, 27, 28,
	48, 47, 46, 45, 44, 43, 42, 41,
	31, 32, 33, 34, 35, 36, 37, 38,
];

export const SPECIALTY_ICONS: Record<OutpatientSpecialty, React.ReactNode> = {
	therapy: React.createElement(Stethoscope, { className: "w-3.5 h-3.5" }),
	orthopedics: React.createElement(Crown, { className: "w-3.5 h-3.5" }),
	surgery: React.createElement(Scissors, { className: "w-3.5 h-3.5" }),
	implantology: React.createElement(Flame, { className: "w-3.5 h-3.5" }),
	periodontics: React.createElement(HeartPulse, { className: "w-3.5 h-3.5" }),
};

export const SPECIALTY_BADGE_COLORS: Record<OutpatientSpecialty, string> = {
	therapy:
		"bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
	orthopedics:
		"bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
	surgery:
		"bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
	implantology:
		"bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
	periodontics:
		"bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
};
