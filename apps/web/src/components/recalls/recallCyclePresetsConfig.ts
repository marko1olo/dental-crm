import { Clock, ShieldCheck, Sparkles, Users } from "lucide-react";
import type React from "react";
import type { RecallCycleType } from "./patientRecallEngine";

export interface RecallCyclePresetItem {
	readonly id: RecallCycleType | "all";
	readonly testId: string;
	readonly title: string;
	readonly labelFull: string;
	readonly labelShort: string;
	readonly icon?: React.ComponentType<{ size?: number }> | undefined;
	readonly getCountKey: (counts?: Partial<Record<RecallCycleType | "all", number>>) => number | undefined;
}

export const RECALL_CYCLE_PRESETS: readonly RecallCyclePresetItem[] = [
	{
		id: "all",
		testId: "preset-all-urgent",
		title: "Все пациенты, подошедшие к сроку",
		labelFull: "Все (срочные)",
		labelShort: "Все (срочные)",
		getCountKey: (c) => c?.all,
	},
	{
		id: "standard_prophylaxis",
		testId: "preset-hygiene-6m",
		title: "1-Click: Пациенты на плановую профгигиену 6 мес.",
		labelFull: "1-Click: Профгигиена (6 мес.)",
		labelShort: "Профгигиена (6м)",
		icon: ShieldCheck,
		getCountKey: (c) => c?.standard_prophylaxis,
	},
	{
		id: "implant_monitoring",
		testId: "preset-implants-1y",
		title: "1-Click: Пациенты с имплантами на годовой рентген-контроль",
		labelFull: "1-Click: Импланты (1 год)",
		labelShort: "Импланты (1г)",
		icon: Sparkles,
		getCountKey: (c) => c?.implant_monitoring,
	},
	{
		id: "orthodontic_braces",
		testId: "preset-ortho-1m",
		title: "1-Click: Пациенты на плановую активацию брекетов (1 мес.)",
		labelFull: "1-Click: Орто-активация (1 мес.)",
		labelShort: "Орто-активация (1м)",
		icon: Clock,
		getCountKey: (c) => c?.orthodontic_braces,
	},
	{
		id: "pediatric_fluoridation",
		testId: "preset-pediatric-3m",
		title: "1-Click: Детский профилактический осмотр (3-4 мес.)",
		labelFull: "1-Click: Детский осмотр (3-4 мес.)",
		labelShort: "Детский осмотр (3м)",
		icon: Users,
		getCountKey: (c) => c?.pediatric_fluoridation,
	},
];
