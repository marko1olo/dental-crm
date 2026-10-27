/**
 * apps/web/src/components/visit/anamnesisTab/useAnamnesisActions.ts
 *
 * Действия применения нормы (1-Click) и переноса анамнеза в дневник приёма.
 */

import { useCallback } from "react";
import { showToast } from "../../GlobalToast";
import { PHYSIOLOGICAL_NORM } from "./anamnesisDefaults";
import { formatAnamnesisStrings } from "./useAnamnesisAutosave";
import type { AnamnesisDraftPayload } from "./anamnesisDraftStorage";

interface UseAnamnesisActionsParams {
	allergies: {
		selectedAllergies: Record<string, string>;
		setSelectedAllergies: (v: Record<string, string>) => void;
	};
	risks: {
		selectedRisks: string[];
		setSelectedRisks: (v: string[]) => void;
		anticoagulantName: string;
		setAnticoagulantName: (v: string) => void;
		bisphosphonateName: string;
		setBisphosphonateName: (v: string) => void;
		pregnancyTrimester: string;
	};
	selectedComplaints: string[];
	setSelectedComplaints: (v: string[]) => void;
	selectedHistory: string[];
	setSelectedHistory: (v: string[]) => void;
	customNotes: string;
	setCustomNotes: (v: string) => void;
	syncWithPatient: (payload: AnamnesisDraftPayload) => void;
	currentPayload: AnamnesisDraftPayload;
	// biome-ignore lint/suspicious/noExplicitAny: AppLogic Context
	appLogic: any;
	onAppendAnamnesis?: ((text: string) => void) | undefined;
	onAppendComorbidities?: ((text: string) => void) | undefined;
}

export function useAnamnesisActions(p: UseAnamnesisActionsParams) {
	const handleApplyPhysiologicalNorm = useCallback(() => {
		p.allergies.setSelectedAllergies({});
		p.risks.setSelectedRisks([]);
		p.risks.setAnticoagulantName("");
		p.risks.setBisphosphonateName("");
		p.setSelectedComplaints([...PHYSIOLOGICAL_NORM.complaintsList]);
		p.setSelectedHistory([...PHYSIOLOGICAL_NORM.historyList]);
		p.setCustomNotes(PHYSIOLOGICAL_NORM.notes);

		p.onAppendAnamnesis?.(PHYSIOLOGICAL_NORM.anamnesisText);
		p.onAppendComorbidities?.(PHYSIOLOGICAL_NORM.comorbiditiesText);

		p.syncWithPatient({
			selectedAllergies: {},
			selectedRisks: [],
			anticoagulantName: "",
			bisphosphonateName: "",
			pregnancyTrimester: "trimester_2",
			selectedHistory: [...PHYSIOLOGICAL_NORM.historyList],
			selectedComplaints: [...PHYSIOLOGICAL_NORM.complaintsList],
			customNotes: PHYSIOLOGICAL_NORM.notes,
		});

		const ctx = p.appLogic;
		if (ctx?.updateVisitNoteField) {
			ctx.updateVisitNoteField("complaint", PHYSIOLOGICAL_NORM.complaintsText);
			ctx.updateVisitNoteField("complaints", PHYSIOLOGICAL_NORM.complaintsText);
			ctx.updateVisitNoteField("anamnesis", PHYSIOLOGICAL_NORM.anamnesisText);
			ctx.updateVisitNoteField("objectiveStatus", PHYSIOLOGICAL_NORM.objectiveText);
			ctx.updateVisitNoteField("objectiveInspection", PHYSIOLOGICAL_NORM.objectiveText);
			ctx.updateVisitNoteField("diagnosis", PHYSIOLOGICAL_NORM.diagnosisText);
			ctx.updateVisitNoteField("treatmentPlan", PHYSIOLOGICAL_NORM.treatmentText);
			ctx.updateVisitNoteField("treatment", PHYSIOLOGICAL_NORM.treatmentText);
			ctx.updateVisitNoteField("recommendations", PHYSIOLOGICAL_NORM.recommendationsText);
		}
		showToast("Применена норма: соматически здоров", "success", 3000);
	}, [p]);

	const applyToDiary = useCallback(() => {
		const effComp = p.selectedComplaints.length ? p.selectedComplaints : ["Плановый осмотр (жалоб нет)"];
		const effHist = p.selectedHistory.length ? p.selectedHistory : ["Опыт анестезии положительный"];
		const { fullAnamnesisText, formattedAllergies } = formatAnamnesisStrings({
			allergiesMap: p.allergies.selectedAllergies,
			risksList: p.risks.selectedRisks,
			antiName: p.risks.anticoagulantName,
			bisName: p.risks.bisphosphonateName,
			pregTrim: p.risks.pregnancyTrimester,
			historyList: effHist,
			complaintsList: effComp,
			notesText: p.customNotes,
		});

		if (fullAnamnesisText && p.onAppendAnamnesis) p.onAppendAnamnesis(fullAnamnesisText);
		if (p.risks.selectedRisks.length > 0 && p.onAppendComorbidities) {
			p.onAppendComorbidities(`Факторы: ${p.risks.selectedRisks.join(", ")}; Аллергии: ${formattedAllergies}`);
		} else if (p.onAppendComorbidities) {
			p.onAppendComorbidities("Сопутствующие патологии: отсутствуют (норма).");
		}
		p.syncWithPatient(p.currentPayload);
		showToast("Клинический анамнез перенесён в дневник приёма и ЭМК", "success", 4000);
	}, [p]);

	return { handleApplyPhysiologicalNorm, applyToDiary };
}
