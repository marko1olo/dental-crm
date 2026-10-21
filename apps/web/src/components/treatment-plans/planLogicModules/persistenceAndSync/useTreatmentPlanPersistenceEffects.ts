import { useEffect } from "react";
import { loadPersistedCustomPlanItems } from "../../ctImplantIntegrationBridge.js";
import { fetchPatientTreatmentPlans } from "../../treatmentPlanNetworkSync.js";
import { mergeIncomingPlanItem, mergePersistedPlanItems } from "../../treatmentPlanStageMutations.js";
import type { PlanPersistenceEffectsParams, TreatmentPlanItem } from "../types.js";

export function useTreatmentPlanPersistenceEffects({
	patientId,
	catalog,
	initialPlanId,
	autoStages,
	setCurrentPlanId,
	setPlanStatus,
	setCustomStages,
}: PlanPersistenceEffectsParams): void {
	useEffect(() => {
		if (!patientId) return;
		let isCancelled = false;

		async function loadPatientPlans() {
			const loaded = await fetchPatientTreatmentPlans(patientId, catalog, initialPlanId);
			if (isCancelled || !loaded) return;
			setCurrentPlanId(loaded.planId);
			setPlanStatus(loaded.status);
			if (loaded.rebuiltStages) {
				setCustomStages(loaded.rebuiltStages);
			}
		}

		loadPatientPlans();
		const handleReload = () => { loadPatientPlans(); };
		window.addEventListener("dente-treatment-plans-reload", handleReload);
		return () => {
			isCancelled = true;
			window.removeEventListener("dente-treatment-plans-reload", handleReload);
		};
	}, [patientId, catalog, initialPlanId, setCurrentPlanId, setPlanStatus, setCustomStages]);

	useEffect(() => {
		const handleAddItem = (e: Event) => {
			const customEvent = e as CustomEvent<{
				item: TreatmentPlanItem;
				toothNumber?: number;
				patientId?: string;
			}>;
			if (!customEvent.detail?.item) return;
			const newItem = customEvent.detail.item;
			setCustomStages((prevStages) => mergeIncomingPlanItem(prevStages ?? autoStages, newItem));
		};
		window.addEventListener("dente-add-treatment-plan-item", handleAddItem);
		return () => window.removeEventListener("dente-add-treatment-plan-item", handleAddItem);
	}, [autoStages, setCustomStages]);

	useEffect(() => {
		if (!patientId) return;
		const persistedItems = loadPersistedCustomPlanItems(patientId);
		if (persistedItems.length === 0) return;
		setCustomStages((prevStages) => {
			const { updatedStages, changed } = mergePersistedPlanItems(prevStages ?? autoStages, persistedItems);
			return changed ? updatedStages : prevStages;
		});
	}, [patientId, autoStages, setCustomStages]);
}
