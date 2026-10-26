/**
 * Tooth Complaint Clinical Symptoms Catalog
 * (DOMAIN: TELEGRAM MINI APP - LAYER 1 PRESETS)
 */

import type React from "react";
import { Activity, AlertCircle, Crown, Sparkles, Zap } from "lucide-react";
import type { ToothComplaintType } from "./toothPickerTypes.js";

export interface ToothComplaintCatalogItem {
	id: ToothComplaintType;
	label: string;
	shortLabel: string;
	description: string;
	cito: boolean;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	colorClass: string;
	badgeClass: string;
}

export const TOOTH_COMPLAINT_CATALOG: ToothComplaintCatalogItem[] = [
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
