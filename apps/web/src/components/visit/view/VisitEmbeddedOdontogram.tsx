import React from "react";
import { OdontogramModule } from "../../odontogram/OdontogramModule";

export type DentitionMode = "adult" | "mixed" | "pediatric";

export interface VisitEmbeddedOdontogramProps {
	activeQuadrant?: number | null;
	setActiveQuadrant?: (q: number | null) => void;
	activeStamp?: string;
	setActiveStamp?: (stamp: string) => void;
	activeStampRef?: React.MutableRefObject<string>;
	toothRows?: string[][];
	toothStateByCode?: Record<string, string>;
	draft?: { quality?: { detectedToothCodes?: string[] } } | null;
	handleToothClick?: (code: string, state: string) => void;
	dentitionMode?: DentitionMode;
	onDentitionModeChange?: (mode: DentitionMode) => void;
	onToggleToothDentition?: (code: string) => void;
	patientId?: string;
}

export interface PathologyStampItem {
	id: string;
	label: string;
	color: string;
	dotColor: string;
	description: string;
}

export const PATHOLOGY_STAMPS: readonly PathologyStampItem[] = [
	{
		id: "idle",
		label: "Осмотр",
		color: "var(--ink)",
		dotColor: "#94a3b8",
		description: "Клиническая карточка зуба и статус обследования",
	},
	{
		id: "caries",
		label: "Кариес",
		color: "#ea580c",
		dotColor: "#ea580c",
		description: "Кариес дентина (K02.1)",
	},
	{
		id: "pulpitis",
		label: "Пульпит",
		color: "#ef4444",
		dotColor: "#ef4444",
		description: "Пульпит зуба (K04.0)",
	},
	{
		id: "treatment",
		label: "Периодонтит",
		color: "#dc2626",
		dotColor: "#dc2626",
		description: "Периодонтит и эндодонтическое лечение (K04.5)",
	},
	{
		id: "done",
		label: "Пломба",
		color: "#0d9488",
		dotColor: "#10b981",
		description: "Пломбирование зуба композитом (A16.07.002)",
	},
	{
		id: "crown",
		label: "Коронка",
		color: "#ca8a04",
		dotColor: "#ca8a04",
		description: "Искусственная коронка (A16.07.004)",
	},
	{
		id: "missing",
		label: "Удален",
		color: "#64748b",
		dotColor: "#ef4444",
		description: "Отсутствующий зуб (удален ранее, K08.1)",
	},
	{
		id: "watch",
		label: "Наблюдение",
		color: "#d97706",
		dotColor: "#d97706",
		description: "Клиническое наблюдение (сомнительный прогноз)",
	},
] as const;

/**
 * VisitEmbeddedOdontogram — канонический фасад-делегат на OdontogramModule (SSOT).
 * Гарантирует идентичный анатомический рендер корней/коронок и полную синхронизацию
 * с вкладкой Зубная формула (Мандат 8c, 8e).
 */
export function VisitEmbeddedOdontogram({
	patientId,
	dentitionMode = "adult",
}: VisitEmbeddedOdontogramProps) {
	const effectivePatientId = patientId || "default-patient";
	return (
		<div
			data-testid="visit-embedded-odontogram-facade"
			data-tour="odontogram-formula"
			className="w-full"
		>
			<OdontogramModule
				patientId={effectivePatientId}
				pediatricMode={dentitionMode !== "adult"}
				dentitionMode={dentitionMode}
			/>
		</div>
	);
}
