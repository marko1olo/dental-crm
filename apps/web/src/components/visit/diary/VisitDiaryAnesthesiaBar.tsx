import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { AnesthesiaQuickBar } from "../../anesthesia/AnesthesiaQuickBar";
import type { AnestheticDrugId } from "../../anesthesia/anesthesiaCatalog";
import type { DiaryState } from "../../useVisitDiaryLogic";
import { extractPatientAnesthesiaProfile } from "./visitDiaryAnesthesiaSafety";

export interface VisitDiaryAnesthesiaBarProps {
	readonly fieldsDisabled: boolean;
	readonly activePatient?: unknown;
	readonly diary: DiaryState;
	readonly doctorName: string;
	readonly isLocked: boolean;
	readonly isRevising: boolean;
	readonly beginRevise: () => void;
	readonly applyAnesthesiaPreset: (preset: string) => void;
	readonly onDisposalCarpules: (
		count: number,
		drugId: AnestheticDrugId | string,
	) => void;
	readonly onOpenEmergencyProtocol?: () => void;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
}

export function VisitDiaryAnesthesiaBar({
	fieldsDisabled,
	activePatient,
	diary,
	doctorName: _doctorName,
	isLocked,
	isRevising,
	beginRevise,
	applyAnesthesiaPreset,
	onDisposalCarpules,
	onOpenEmergencyProtocol,
	patientId,
	visitId,
}: VisitDiaryAnesthesiaBarProps) {
	if (fieldsDisabled) return null;

	const ensureRevisingIfLocked = () => {
		if (isLocked && !isRevising) beginRevise();
	};

	const safety = extractPatientAnesthesiaProfile(activePatient, diary);

	return (
		<div
			className="mb-3"
			data-testid="anesthesia-quick-logger-bar"
		>
			<AnesthesiaQuickBar
				patientWeightKg={safety.patientWeightKg}
				targetToothNumberFdi={diary.diagnosisTooth || 16}
				hasCardiovascularRisk={safety.hasCardiovascularRisk}
				hasSulfiteAllergy={safety.hasSulfiteAllergy}
				hasBronchialAsthma={safety.hasBronchialAsthma}
				isPregnantOrLactating={safety.isPregnantOrLactating}
				hasLidocaineAllergy={safety.hasLidocaineAllergy}
				hasArticaineAllergy={safety.hasArticaineAllergy}
				disabled={fieldsDisabled}
				patientId={patientId}
				visitId={visitId}
				onApplyAnesthesia={(text) => {
					ensureRevisingIfLocked();
					applyAnesthesiaPreset(text);
				}}
				onDisposalCarpules={(count, drugId) => {
					onDisposalCarpules(count, drugId || "articaine_1_100k");
				}}
				onOpenEmergencyProtocol={
					onOpenEmergencyProtocol ||
					(() => {
						useUiSurfaceStore.getState().openPrimaryModal("emergency_rescue");
					})
				}
			/>
		</div>
	);
}
