import { Syringe } from "lucide-react";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { AnesthesiaQuickBar } from "../../anesthesia/AnesthesiaQuickBar";
import type { AnestheticDrugId } from "../../anesthesia/anesthesiaCatalog";
import type { DiaryState } from "../../useVisitDiaryLogic";
import {
	extractPatientAnesthesiaProfile,
	getPassiveAnesthesiaAlert,
} from "./visitDiaryAnesthesiaSafety";

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
	const passiveAlert = getPassiveAnesthesiaAlert(safety);

	return (
		<details
			open
			className="group rounded-2xl border border-[var(--glass-border)] bg-[var(--paper-soft)] p-3.5 text-xs mb-2 shadow-xs"
			data-testid="anesthesia-quick-logger-bar"
		>
			<summary className="cursor-pointer font-bold text-xs text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-between select-none list-none">
				<span className="flex items-center gap-1.5">
					<Syringe className="w-4 h-4 text-blue-500 shrink-0" />
					<span>Местная анестезия (быстрый выбор препарата и дозы)</span>
				</span>
				<span className="text-[10px] font-normal text-[var(--muted)] group-open:hidden">
					Развернуть &darr;
				</span>
			</summary>
			<div className="pt-2.5">
				{passiveAlert && (
					<div
						data-testid="anesthesia-passive-allergy-alert"
						className="mb-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5 font-medium"
					>
						<span>⚠️</span>
						<span>{passiveAlert}</span>
					</div>
				)}
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
		</details>
	);
}
