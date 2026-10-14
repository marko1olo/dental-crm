import React from "react";
import { Syringe } from "lucide-react";
import { AnesthesiaQuickBar } from "../../anesthesia/AnesthesiaQuickBar";
import type { AnestheticDrugId } from "../../anesthesia/anesthesiaCatalog";
import type { DiaryState } from "../../useVisitDiaryLogic";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";

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
	readonly onOpenEmergencyProtocol?: () => void;
	readonly patientId?: string;
	readonly visitId?: string;
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
		if (isLocked && !isRevising) {
			beginRevise();
		}
	};

	const hasLidocaineAllergy = Boolean(
		(activePatient as any)?.clinicalSafetyProfile?.hasLidocaineAllergy ||
		(activePatient as any)?.administrativeProfile?.hasLidocaineAllergy ||
		(activePatient as any)?.administrativeProfile?.clinicalSafetyProfile?.hasLidocaineAllergy ||
		(typeof (activePatient as any)?.allergies === "string" && (activePatient as any).allergies.toLowerCase().includes("лидокаин")) ||
		(Array.isArray((activePatient as any)?.allergies) && (activePatient as any).allergies.some((a: string) => String(a).toLowerCase().includes("лидокаин"))) ||
		(typeof (activePatient as any)?.notes === "string" && (activePatient as any).notes.toLowerCase().includes("лидокаин")) ||
		(typeof (activePatient as any)?.anamnesis === "string" && (activePatient as any).anamnesis.toLowerCase().includes("лидокаин")) ||
		diary.comorbidities?.toLowerCase().includes("лидокаин"),
	);

	const hasArticaineAllergy = Boolean(
		(activePatient as any)?.clinicalSafetyProfile?.hasArticaineAllergy ||
		(activePatient as any)?.administrativeProfile?.hasArticaineAllergy ||
		(activePatient as any)?.administrativeProfile?.clinicalSafetyProfile?.hasArticaineAllergy ||
		(typeof (activePatient as any)?.allergies === "string" && (activePatient as any).allergies.toLowerCase().includes("артикаин")) ||
		(Array.isArray((activePatient as any)?.allergies) && (activePatient as any).allergies.some((a: string) => String(a).toLowerCase().includes("артикаин"))) ||
		(typeof (activePatient as any)?.notes === "string" && (activePatient as any).notes.toLowerCase().includes("артикаин")) ||
		(typeof (activePatient as any)?.anamnesis === "string" && (activePatient as any).anamnesis.toLowerCase().includes("артикаин")) ||
		diary.comorbidities?.toLowerCase().includes("артикаин"),
	);

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
					hasLidocaineAllergy={hasLidocaineAllergy}
					hasArticaineAllergy={hasArticaineAllergy}
					disabled={fieldsDisabled}
					patientId={patientId}
					visitId={visitId}
					onApplyAnesthesia={(text) => {
						ensureRevisingIfLocked();
						applyAnesthesiaPreset(text);
					}}
					onDisposalCarpules={(count, drugId) => {
						onDisposalCarpules(count, drugId);
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
