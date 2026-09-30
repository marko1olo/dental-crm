import React from "react";
import { Syringe } from "lucide-react";
import { AnesthesiaQuickBar } from "../../anesthesia/AnesthesiaQuickBar";
import type { AnestheticDrugId } from "../../anesthesia/anesthesiaCatalog";
import type { DiaryState } from "../../useVisitDiaryLogic";

export interface VisitDiaryAnesthesiaBarProps {
	readonly fieldsDisabled: boolean;
	readonly activePatient?: any;
	readonly diary: DiaryState;
	readonly doctorName: string;
	readonly isLocked: boolean;
	readonly isRevising: boolean;
	readonly beginRevise: () => void;
	readonly applyAnesthesiaPreset: (preset: string) => void;
	readonly onDisposalCarpules: (count: number, drugId: AnestheticDrugId) => void;
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
}: VisitDiaryAnesthesiaBarProps) {
	if (fieldsDisabled) return null;

	const ensureRevisingIfLocked = () => {
		if (isLocked && !isRevising) {
			beginRevise();
		}
	};

	return (
		<details
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
				<AnesthesiaQuickBar
					patientWeightKg={
						typeof (activePatient as any)?.weightKg === "number" &&
						(activePatient as any).weightKg > 0
							? (activePatient as any).weightKg
							: typeof (activePatient as any)?.administrativeProfile?.weightKg ===
										"number" &&
								  (activePatient as any).administrativeProfile.weightKg > 0
								? (activePatient as any).administrativeProfile.weightKg
								: 70
					}
					targetToothNumberFdi={diary.diagnosisTooth || 16}
					hasCardiovascularRisk={
						Boolean(
							(activePatient as any)?.clinicalSafetyProfile
								?.hasCardiovascularDisease,
						) ||
						Boolean(
							(activePatient as any)?.clinicalSafetyProfile
								?.hasPacemakerExs,
						) ||
						Boolean(
							(activePatient as any)?.clinicalSafetyProfile
								?.hasHypertension,
						) ||
						diary.comorbidities?.toLowerCase().includes("сердц") ||
						diary.comorbidities?.toLowerCase().includes("давлен") ||
						diary.comorbidities?.toLowerCase().includes("ибс") ||
						diary.comorbidities?.toLowerCase().includes("гипертон")
					}
					hasSulfiteAllergy={
						Boolean(
							(activePatient as any)?.clinicalSafetyProfile
								?.hasSulfiteAllergy,
						) ||
						diary.comorbidities?.toLowerCase().includes("сульфит") ||
						diary.comorbidities?.toLowerCase().includes("аллерги")
					}
					hasBronchialAsthma={
						Boolean(
							(activePatient as any)?.clinicalSafetyProfile
								?.hasBronchialAsthma,
						) ||
						diary.comorbidities?.toLowerCase().includes("астм") ||
						diary.comorbidities?.toLowerCase().includes("бронх")
					}
					isPregnantOrLactating={
						((activePatient as any)?.clinicalSafetyProfile
							?.pregnancyTrimester &&
							(activePatient as any).clinicalSafetyProfile
								.pregnancyTrimester !== "none") ||
						diary.comorbidities?.toLowerCase().includes("беремен") ||
						diary.comorbidities?.toLowerCase().includes("лактац")
					}
					disabled={fieldsDisabled}
					onApplyAnesthesia={(text) => {
						ensureRevisingIfLocked();
						applyAnesthesiaPreset(text);
					}}
					onDisposalCarpules={(count, drugId) => {
						onDisposalCarpules(count, drugId);
					}}
				/>
			</div>
		</details>
	);
}
