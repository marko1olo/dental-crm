import type { FranklRating } from "../../odontogram/pediatricDentitionEngine";
import type { ToothData } from "../../odontogram/ToothChart";
import type { RootResorptionStage } from "../../odontogram/anatomicalToothGeometries";

export interface ToothPediatricContextProps {
	toothNumber: number;
	toothData?: ToothData | undefined;
	patientName?: string | undefined;
	patientAgeYears?: number | undefined;
	doctorName?: string | undefined;
	initialFrankl?: FranklRating | undefined;
	onUpdateTooth?: ((updates: Partial<ToothData>) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
	onOpenParentMemo?: (() => void) | undefined;
}

export interface PediatricResorptionStageOption {
	readonly id: RootResorptionStage;
	readonly stage: RootResorptionStage;
	readonly percent: number;
	readonly label: string;
	readonly sub: string;
	readonly stageName: string;
}

export const RESORPTION_STAGES: readonly PediatricResorptionStageOption[] = [
	{
		id: 25,
		stage: 25,
		percent: 25,
		label: "I стадия (25%)",
		sub: "Апикальная резорбция (25% длины корня)",
		stageName: "I стадия — апикальная резорбция",
	},
	{
		id: 50,
		stage: 50,
		percent: 50,
		label: "II стадия (50%)",
		sub: "Средняя резорбция (50% длины корня)",
		stageName: "II стадия — средняя резорбция",
	},
	{
		id: 75,
		stage: 75,
		percent: 75,
		label: "III стадия (75%)",
		sub: "Пришеечная резорбция (сохранена 1/3)",
		stageName: "III стадия — пришеечная резорбция",
	},
	{
		id: 100,
		stage: 100,
		percent: 100,
		label: "IV стадия (100%)",
		sub: "Полная резорбция / эксфолиация (выпадение)",
		stageName: "IV стадия — полная резорбция / эксфолиация",
	},
] as const;

export interface PediatricMemoPrintData {
	readonly patientName?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly franklRating?: FranklRating | undefined;
	readonly toothNumber?: number | undefined;
	readonly resorptionStage?: RootResorptionStage | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
}
