import type { FranklRating } from "@dental/shared";
import type { ToothData } from "../../odontogram/ToothChart";
import type { RootResorptionStage } from "../../odontogram/anatomicalGeometriesTypes";
import {
	RESORPTION_STAGE_DEFINITIONS,
	RESORPTION_STAGES as SHARED_RESORPTION_STAGES,
} from "@dental/shared";

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

export const RESORPTION_STAGES: readonly PediatricResorptionStageOption[] =
	SHARED_RESORPTION_STAGES.map((stage) => {
		const def = RESORPTION_STAGE_DEFINITIONS[stage];
		return {
			id: stage,
			stage,
			percent: stage,
			label: stage === 0 ? "Норма (0%)" : `${stage}%`,
			sub: def.nameRu,
			stageName: def.descriptionRu,
		};
	});

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
