import type {
	CbctInterpolationMethod,
	DoctorCbctDefaultSettings,
} from "../../radiology/cbctLutMath";

export interface DoctorCbctCardProps {
	readonly onOpenTuner?: () => void;
}

export interface CbctPresetQuickItem {
	readonly title: string;
	readonly subtitle: string;
	readonly colorClass: string;
	readonly ww: number;
	readonly wl: number;
	readonly gamma: number;
	readonly air: number;
}

export const CBCT_QUICK_TISSUE_PRESETS: readonly CbctPresetQuickItem[] = [
	{
		title: "Канон DENTE",
		subtitle: "4025 / 525 HU",
		colorClass: "text-teal-400",
		ww: 4025,
		wl: 525,
		gamma: 1.5,
		air: -500,
	},
	{
		title: "Костная ткань",
		subtitle: "2500 / 600 HU",
		colorClass: "text-amber-400",
		ww: 2500,
		wl: 600,
		gamma: 1.2,
		air: -400,
	},
	{
		title: "Зубы и эмаль",
		subtitle: "4400 / 1200 HU",
		colorClass: "text-cyan-400",
		ww: 4400,
		wl: 1200,
		gamma: 1.4,
		air: -600,
	},
	{
		title: "Мягкий обзор",
		subtitle: "3200 / 500 HU",
		colorClass: "text-indigo-400",
		ww: 3200,
		wl: 500,
		gamma: 1.1,
		air: -100,
	},
];
