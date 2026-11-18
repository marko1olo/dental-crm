import React from "react";
import { appendClinicalText, type EmkSectionProps } from "./EmkTypes";
import { ChairsideEndoQuickBar } from "../../endo/ChairsideEndoQuickBar";

export interface EmkEndoSectionProps extends EmkSectionProps {
	onOpenEndoModal?: () => void;
}

/**
 * EmkEndoSection — Chairside Endo QuickBar integration in the Visit EMK Canvas.
 * Realizes Mandates 8e, 8n, and First Principles for dental clinics (1-3 chairs):
 * 1-click apex locator WL chips, MAF chips, obturation type, and instant SOAP diary insertion.
 */
export function EmkEndoSection({
	visitNoteForm,
	updateVisitNoteField,
	isLocked = false,
	activeTooth,
	onOpenEndoModal,
}: EmkEndoSectionProps) {
	const targetToothNum = React.useMemo(() => {
		const parsed = Number(activeTooth);
		return Number.isNaN(parsed) || parsed <= 0 ? 16 : parsed;
	}, [activeTooth]);

	const handleInsertToDiary = (soapText: string) => {
		if (!updateVisitNoteField) return;
		const curr = String(visitNoteForm?.treatmentPlan || "");
		updateVisitNoteField("treatmentPlan", appendClinicalText(curr, soapText, "\n\n"));
	};

	return (
		<div className="w-full min-w-0 my-2" data-testid="emk-endo-section">
			<ChairsideEndoQuickBar
				activeTooth={targetToothNum}
				toothState={
					typeof visitNoteForm?.diagnosis === "string"
						? visitNoteForm.diagnosis
						: typeof visitNoteForm?.complaint === "string"
							? "Пульпит / Лечение каналов"
							: undefined
				}
				patientId={typeof visitNoteForm?.patientId === "string" ? visitNoteForm.patientId : undefined}
				visitId={
					typeof visitNoteForm?.visitId === "string"
						? visitNoteForm.visitId
						: typeof visitNoteForm?.id === "string"
							? visitNoteForm.id
							: undefined
				}
				isLocked={isLocked}
				onInsertToDiary={handleInsertToDiary}
				onOpenFullModal={onOpenEndoModal}
			/>
		</div>
	);
}
