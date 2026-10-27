import React from "react";
import {
	Activity,
	Blocks,
	CheckCircle2,
	FlaskConical,
	ShieldPlus,
	Stethoscope,
	XCircle,
} from "lucide-react";
import type { FeatureToggleDef } from "./featureToggleTypes";

export const CLINICAL_FEATURE_TOGGLES: readonly FeatureToggleDef[] = [
	{
		key: "hasClinicalRules",
		label: "Клинические протоколы и правила",
		description: "Клинические стандарты лечения и рекомендации СтАР без лишней бюрократии.",
		icon: <Activity size={20} />,
		color: "hsl(348 83% 47%)",
	},
	{
		key: "aiEnableTreatmentPlan",
		label: "AI: План лечения",
		description: "Формирование предложений комплексного плана лечения на основе осмотра.",
		icon: <Blocks size={20} />,
		color: "hsl(280 80% 65%)",
	},
	{
		key: "aiEnableRecommendations",
		label: "AI: Памятки и рекомендации",
		description: "Клинические рекомендации после терапевтического или хирургического приёма.",
		icon: <Blocks size={20} />,
		color: "hsl(280 80% 65%)",
	},
	{
		key: "aiEnableDocuments",
		label: "AI: Подбор согласий и бланков",
		description: "Автоподбор бланков информированных согласий под выбранную процедуру.",
		icon: <Blocks size={20} />,
		color: "hsl(280 80% 65%)",
	},
	{
		key: "hasDentalLab",
		label: "Зуботехническая лаборатория (ЗТЛ)",
		description: "Наряды в лабораторию, контроль этапов коронок, протезов и расцветки.",
		icon: <FlaskConical size={20} />,
		color: "hsl(160 70% 50%)",
	},
	{
		key: "hasOrthodontics",
		label: "Ортодонтия",
		description: "Специализированная карта приёма для брекет-систем и элайнеров.",
		icon: <ShieldPlus size={20} />,
		color: "hsl(200 80% 50%)",
	},
	{
		key: "hasGnathology",
		label: "Гнатология и ВНЧС",
		description: "Диагностические протоколы окклюзии и височно-нижнечелюстного сустава.",
		icon: <Stethoscope size={20} />,
		color: "hsl(180 80% 40%)",
	},
	{
		key: "hasPediatricMode",
		label: "Детский приём",
		description: "Детская зубная формула молочного прикуса (51–85) и адаптационные протоколы.",
		icon: <CheckCircle2 size={20} />,
		color: "hsl(320 70% 60%)",
	},
	{
		key: "hasTasks",
		label: "Поручения по пациентам",
		description: "Быстрые задачи и напоминания врачу и ассистенту прямо в карточке.",
		icon: <CheckCircle2 size={20} />,
		color: "hsl(100 70% 45%)",
	},
	{
		key: "hasReclamations",
		label: "Рекламации и гарантии",
		description: "Учёт гарантийных случаев, рекламаций и повторных обращений.",
		icon: <XCircle size={20} />,
		color: "hsl(350 80% 60%)",
	},
	{
		key: "hasCsoScanner",
		label: "Стерилизация и ЦСО",
		description: "Учёт стерилизационных лотков и контроль журналов автоклавирования.",
		icon: <CheckCircle2 size={20} />,
		color: "hsl(210 80% 50%)",
	},
];
