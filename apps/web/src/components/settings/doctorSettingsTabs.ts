import type React from "react";
import {
	Activity,
	Bot,
	FileText,
	HardDrive,
	Layers,
	Stethoscope,
	User,
} from "lucide-react";

export type DoctorSubTab =
	| "profile"
	| "preferences"
	| "protocols"
	| "rules"
	| "procedure-boms"
	| "ai"
	| "hardware";

export interface DoctorTabDefinition {
	readonly id: DoctorSubTab;
	readonly label: string;
	readonly description: string;
	readonly icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const DOCTOR_TABS: readonly DoctorTabDefinition[] = [
	{
		id: "profile",
		label: "Мой профиль",
		description: "ФИО, специализация, цвет в сетке, ЭЦП",
		icon: User,
	},
	{
		id: "preferences",
		label: "Клинические пресеты",
		description: "Длительность, анестетики, рецепты 107-1/у, материалы",
		icon: Stethoscope,
	},
	{
		id: "protocols",
		label: "Протоколы 043/у",
		description: "Шаблоны лечения, SOAP-дневники, автозаполнение",
		icon: FileText,
	},
	{
		id: "rules",
		label: "Клинические правила",
		description: "Алерты безопасности, онкоскрининг, риски",
		icon: Activity,
	},
	{
		id: "procedure-boms",
		label: "Техкарты 804н",
		description: "Нормы списания карпул, анестетиков и композитов",
		icon: Layers,
	},
	{
		id: "ai",
		label: "ИИ-ассистент",
		description: "Диктовка карты голосом, расшифровка рентгена",
		icon: Bot,
	},
	{
		id: "hardware",
		label: "Оборудование",
		description: "Визиограф, датчик, КТ и сетевые папки",
		icon: HardDrive,
	},
];
