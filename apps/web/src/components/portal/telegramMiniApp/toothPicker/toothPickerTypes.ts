import type React from "react";
import { Activity, AlertCircle, Crown, Sparkles, Zap } from "lucide-react";

export type ToothComplaintType =
	| "acute_throbbing"
	| "fracture_filling"
	| "food_impaction_caries"
	| "temperature_sensitivity"
	| "crown_implant";

export interface ToothComplaint {
	readonly toothNumber: number;
	readonly complaintType: ToothComplaintType;
	readonly symptomLabel: string;
	readonly painLevel: number;
	readonly notes?: string | undefined;
	readonly cito: boolean;
}

export interface TelegramInteractiveToothPickerProps {
	readonly selectedComplaints: readonly ToothComplaint[];
	readonly onSaveComplaint: (complaint: ToothComplaint) => void;
	readonly onRemoveComplaint: (toothNumber: number) => void;
	readonly onProceedToBooking?: () => void;
}

export const TOOTH_COMPLAINT_CATALOG: Array<{
	id: ToothComplaintType;
	label: string;
	shortLabel: string;
	description: string;
	cito: boolean;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	colorClass: string;
	badgeClass: string;
}> = [
	{
		id: "acute_throbbing",
		label: "Острая пульсирующая боль",
		shortLabel: "Острая боль",
		description: "Пульсирует, усиливается ночью, невозможно накусить",
		cito: true,
		icon: Zap,
		colorClass: "text-red-400 bg-red-950/40 border-red-500/40",
		badgeClass: "tg-tooth-badge-acute",
	},
	{
		id: "fracture_filling",
		label: "Скол зуба / выпала пломба",
		shortLabel: "Скол / пломба",
		description: "Острый край травмирует язык, откололась стенка",
		cito: false,
		icon: Sparkles,
		colorClass: "text-amber-400 bg-amber-950/40 border-amber-500/40",
		badgeClass: "tg-tooth-badge-fracture",
	},
	{
		id: "food_impaction_caries",
		label: "Застревает пища / кариес",
		shortLabel: "Кариес / пища",
		description: "Потемнение эмали, неприятный запах, застревают волокна",
		cito: false,
		icon: AlertCircle,
		colorClass: "text-orange-400 bg-orange-950/40 border-orange-500/40",
		badgeClass: "tg-tooth-badge-caries",
	},
	{
		id: "temperature_sensitivity",
		label: "Реагирует на холодное / горячее",
		shortLabel: "Чувствительность",
		description: "Резкая кратковременная боль от холодного или сладкого",
		cito: false,
		icon: Activity,
		colorClass: "text-cyan-400 bg-cyan-950/40 border-cyan-500/40",
		badgeClass: "tg-tooth-badge-temp",
	},
	{
		id: "crown_implant",
		label: "Хочу коронку / имплант",
		shortLabel: "Коронка / имплант",
		description: "Зуб разрушен более чем на 50% либо уже отсутствует",
		cito: false,
		icon: Crown,
		colorClass: "text-purple-400 bg-purple-950/40 border-purple-500/40",
		badgeClass: "tg-tooth-badge-crown",
	},
];

export const ADULT_Q1 = [18, 17, 16, 15, 14, 13, 12, 11];
export const ADULT_Q2 = [21, 22, 23, 24, 25, 26, 27, 28];
export const ADULT_Q4 = [48, 47, 46, 45, 44, 43, 42, 41];
export const ADULT_Q3 = [31, 32, 33, 34, 35, 36, 37, 38];

export const PEDIATRIC_Q5 = [55, 54, 53, 52, 51];
export const PEDIATRIC_Q6 = [61, 62, 63, 64, 65];
export const PEDIATRIC_Q8 = [85, 84, 83, 82, 81];
export const PEDIATRIC_Q7 = [71, 72, 73, 74, 75];

export function getToothAnatomicalTitle(toothNum: number): {
	name: string;
	group: "incisor" | "canine" | "premolar" | "molar";
	archName: string;
} {
	const isPediatric = toothNum >= 51 && toothNum <= 85;
	const isUpper = (toothNum >= 11 && toothNum <= 28) || (toothNum >= 51 && toothNum <= 65);
	const arch = isUpper ? "Верхняя челюсть" : "Нижняя челюсть";

	const lastDigit = toothNum % 10;
	if (lastDigit === 1) return { name: `${isPediatric ? "Молочный ц" : "Ц"}ентральный резец`, group: "incisor", archName: arch };
	if (lastDigit === 2) return { name: `${isPediatric ? "Молочный б" : "Б"}оковой резец`, group: "incisor", archName: arch };
	if (lastDigit === 3) return { name: `${isPediatric ? "Молочный к" : "К"}лык`, group: "canine", archName: arch };
	if (lastDigit === 4) return { name: isPediatric ? "Первый молочный моляр" : "Первый премоляр", group: isPediatric ? "molar" : "premolar", archName: arch };
	if (lastDigit === 5) return { name: isPediatric ? "Второй молочный моляр" : "Второй премоляр", group: isPediatric ? "molar" : "premolar", archName: arch };
	if (lastDigit === 6) return { name: "Первый моляр («шестёрка»)", group: "molar", archName: arch };
	if (lastDigit === 7) return { name: "Второй моляр («семёрка»)", group: "molar", archName: arch };
	if (lastDigit === 8) return { name: "Третий моляр («зуб мудрости»)", group: "molar", archName: arch };

	return { name: `Зуб #${toothNum}`, group: "incisor", archName: arch };
}
