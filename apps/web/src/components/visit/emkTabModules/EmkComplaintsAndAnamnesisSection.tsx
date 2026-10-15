/**
 * apps/web/src/components/visit/emkTabModules/EmkComplaintsAndAnamnesisSection.tsx
 *
 * Блок жалоб и соматического анамнеза ЭМК с быстрыми пресетами из @dental/shared
 * и кнопкой «Норма» в 1 клик (Мандат 8e: Автономия врача).
 */

import React from "react";
import {
	CANONICAL_FORM043_SOMATIC_NORM,
	isSomaticTextPhysiologicalNorm,
	type SomaticQuickChip,
} from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { EmkComplaintsSection } from "../emk/EmkComplaintsSection";
import type { EmkComplaintsAndAnamnesisSectionProps } from "./emkTabTypes";
import {
	DEFAULT_HEALTHY_COMPLAINT_TEXT,
	buildEmkHealthyComplaintsAndAnamnesisPreset,
	applySomaticQuickChipToAnamnesis,
} from "./emkComplaintsHelpers";
import { EmkSomaticStatusBar } from "./EmkSomaticStatusBar";

export {
	DEFAULT_HEALTHY_COMPLAINT_TEXT,
	buildEmkHealthyComplaintsAndAnamnesisPreset,
	applySomaticQuickChipToAnamnesis,
};

export function EmkComplaintsAndAnamnesisSection(props: EmkComplaintsAndAnamnesisSectionProps) {
	const { isLocked, onApplyHealthyNorm } = props;
	const visitNoteForm: Record<string, any> = props.visitNoteForm ?? {};
	const updateVisitNoteField: (field: string, value: any) => void = props.updateVisitNoteField ?? (() => {});
	const currentAnamnesis = String(visitNoteForm?.anamnesis || "");
	const isNormActive = currentAnamnesis.trim().length > 0 && isSomaticTextPhysiologicalNorm(currentAnamnesis);

	const handleOneClickNorm = () => {
		const norm = buildEmkHealthyComplaintsAndAnamnesisPreset();
		if (!String(visitNoteForm?.complaint || "").trim()) {
			updateVisitNoteField("complaint", norm.complaint);
		}
		updateVisitNoteField("anamnesis", norm.anamnesis);
		onApplyHealthyNorm?.();
		showToast(`Заполнена соматическая норма (${CANONICAL_FORM043_SOMATIC_NORM.allergologicalHistory})`, "success", 2200);
	};

	const handleToggleSomaticChip = (chip: SomaticQuickChip) => {
		const nextAnamnesis = applySomaticQuickChipToAnamnesis(currentAnamnesis, chip);
		updateVisitNoteField("anamnesis", nextAnamnesis);
	};

	return (
		<div className="space-y-2.5 w-full min-w-0" data-testid="emk-complaints-and-anamnesis-module">
			<EmkSomaticStatusBar
				isNormActive={isNormActive}
				handleOneClickNorm={handleOneClickNorm}
				currentAnamnesis={currentAnamnesis}
				handleToggleSomaticChip={handleToggleSomaticChip}
			/>

			<EmkComplaintsSection
				visitNoteForm={visitNoteForm}
				updateVisitNoteField={updateVisitNoteField}
				isLocked={isLocked}
			/>
		</div>
	);
}
