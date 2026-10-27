/**
 * apps/web/src/components/visit/anamnesisTab/useAnamnesisState.ts
 *
 * Layer 3: Оркестратор реактивного состояния анамнеза (Мандаты 8e, 8k, 8x).
 * Автосохранение, 1-клик норма, синхронизация с электронной медкартой приёма.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import type { VisitAnamnesisTabProps } from "./types";
import { getAnamnesisStorageKey, loadAnamnesisDraft } from "./anamnesisDraftStorage";
import { extractPatientSafetyDefaults } from "./anamnesisDefaults";
import { useAnamnesisAllergies } from "./useAnamnesisAllergies";
import { useAnamnesisRisks } from "./useAnamnesisRisks";
import { useAnamnesisAutosave } from "./useAnamnesisAutosave";
import { useAnamnesisActions } from "./useAnamnesisActions";

export function useAnamnesisState(props: VisitAnamnesisTabProps) {
	const { onAppendAnamnesis, onAppendComorbidities } = props;
	const appLogic = useAppLogicContext();
	// biome-ignore lint/suspicious/noExplicitAny: patient identifier
	const activePat = (appLogic as any)?.activePatient;
	const storageKey = getAnamnesisStorageKey(activePat?.id);

	const allergies = useAnamnesisAllergies({});
	const risks = useAnamnesisRisks([]);
	const [selectedHistory, setSelectedHistory] = useState<string[]>([]);
	const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
	const [customNotes, setCustomNotes] = useState("");
	const loadedKeyRef = useRef<string | null>(null);

	useEffect(() => {
		if (loadedKeyRef.current === storageKey) return;
		loadedKeyRef.current = storageKey;
		const draft = loadAnamnesisDraft(storageKey);
		if (draft) {
			allergies.setSelectedAllergies(draft.selectedAllergies);
			risks.setSelectedRisks(draft.selectedRisks);
			risks.setAnticoagulantName(draft.anticoagulantName);
			risks.setBisphosphonateName(draft.bisphosphonateName);
			risks.setPregnancyTrimester(draft.pregnancyTrimester);
			setSelectedHistory(draft.selectedHistory);
			setSelectedComplaints(draft.selectedComplaints);
			setCustomNotes(draft.customNotes);
			return;
		}
		const def = extractPatientSafetyDefaults(activePat);
		if (Object.keys(def.allergies).length > 0) allergies.setSelectedAllergies(def.allergies);
		if (def.risks.length > 0) risks.setSelectedRisks(def.risks);
		if (def.pregnancyTrimester) risks.setPregnancyTrimester(def.pregnancyTrimester);
	}, [storageKey, activePat]);

	const currentPayload = useMemo(() => ({
		selectedAllergies: allergies.selectedAllergies,
		selectedRisks: risks.selectedRisks,
		anticoagulantName: risks.anticoagulantName,
		bisphosphonateName: risks.bisphosphonateName,
		pregnancyTrimester: risks.pregnancyTrimester,
		selectedHistory,
		selectedComplaints,
		customNotes,
	}), [allergies.selectedAllergies, risks.selectedRisks, risks.anticoagulantName, risks.bisphosphonateName, risks.pregnancyTrimester, selectedHistory, selectedComplaints, customNotes]);

	const { syncWithPatient } = useAnamnesisAutosave(storageKey, currentPayload, appLogic);

	const toggleHistory = useCallback((lbl: string) => {
		setSelectedHistory((prev) => (prev.includes(lbl) ? prev.filter((x) => x !== lbl) : [...prev, lbl]));
	}, []);

	const toggleComplaint = useCallback((itm: string) => {
		setSelectedComplaints((prev) => (prev.includes(itm) ? prev.filter((x) => x !== itm) : [...prev, itm]));
	}, []);

	const { handleApplyPhysiologicalNorm, applyToDiary } = useAnamnesisActions({
		allergies,
		risks,
		selectedComplaints,
		setSelectedComplaints,
		selectedHistory,
		setSelectedHistory,
		customNotes,
		setCustomNotes,
		syncWithPatient,
		currentPayload,
		appLogic,
		onAppendAnamnesis,
		onAppendComorbidities,
	});

	return {
		activePat,
		selectedAllergies: allergies.selectedAllergies,
		selectedRisks: risks.selectedRisks,
		anticoagulantName: risks.anticoagulantName,
		setAnticoagulantName: risks.setAnticoagulantName,
		bisphosphonateName: risks.bisphosphonateName,
		setBisphosphonateName: risks.setBisphosphonateName,
		pregnancyTrimester: risks.pregnancyTrimester,
		setPregnancyTrimester: risks.setPregnancyTrimester,
		selectedHistory,
		selectedComplaints,
		customNotes,
		setCustomNotes,
		toggleAllergen: allergies.toggleAllergen,
		setAllergyReaction: allergies.setAllergyReaction,
		toggleRisk: risks.toggleRisk,
		toggleHistory,
		toggleComplaint,
		handleApplyPhysiologicalNorm,
		applyToDiary,
		hasCriticalAllergies: allergies.hasCriticalAllergies,
		hasCriticalStopRisks: risks.hasCriticalStopRisks,
		totalCriticalAlerts: allergies.hasCriticalAllergies || risks.hasCriticalStopRisks,
		selectedAllergyCount: allergies.selectedAllergyCount,
	};
}
