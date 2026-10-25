import type React from "react";
import { Award, ShieldCheck, Smile, Sparkles } from "lucide-react";
import { ToothDeciduous } from "../../icons/DentalIcons";
import type { FranklRating } from "../../odontogram/pediatricDentitionEngine";

export interface PediatricVisitAdaptationTabProps {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly initialFranklRating?: FranklRating | undefined;
	readonly onFranklChange?: ((rating: FranklRating) => void) | undefined;
	readonly onApplyNorm?: ((normText?: string) => void) | undefined;
	readonly onCompleteAdaptation?: ((summaryText: string) => void) | undefined;
	readonly className?: string | undefined;
}

export interface AdaptationStageItem {
	readonly id: string;
	readonly stepNumber: number;
	readonly titleRu: string;
	readonly shortLabelRu: string;
	readonly descriptionRu: string;
	readonly icon: React.ComponentType<{ className?: string }>;
}

export const ADAPTATION_STAGES: readonly AdaptationStageItem[] = [
	{
		id: "intro_game",
		stepNumber: 1,
		titleRu: "Знакомство и игра",
		shortLabelRu: "1. Знакомство",
		descriptionRu: "Катание на волшебном кресле, зеркальце «солнечный зайчик», установление доверия",
		icon: Smile,
	},
	{
		id: "breeze_water",
		stepNumber: 2,
		titleRu: "«Ветерок» и водичка",
		shortLabelRu: "2. Ветерок",
		descriptionRu: "Демонстрация пустера на ручке ребенка («ветерок»), слюноотсос «слоник»",
		icon: Sparkles,
	},
	{
		id: "count_teeth",
		stepNumber: 3,
		titleRu: "Считаем зубки",
		shortLabelRu: "3. Осмотр",
		descriptionRu: "Осмотр молочных зубчиков зеркалом, подсчет и похвала за красивую улыбку",
		icon: ToothDeciduous,
	},
	{
		id: "gentle_brush",
		stepNumber: 4,
		titleRu: "Мягкая полировка",
		shortLabelRu: "4. Чистка",
		descriptionRu: "Циркулярная щеточка со сладкой пастой, нанесение защитного геля",
		icon: ShieldCheck,
	},
	{
		id: "award_hero",
		stepNumber: 5,
		titleRu: "Награда и грамота",
		shortLabelRu: "5. Грамота",
		descriptionRu: "Торжественное вручение грамоты за смелость и подарка маленькому герою",
		icon: Award,
	},
];
