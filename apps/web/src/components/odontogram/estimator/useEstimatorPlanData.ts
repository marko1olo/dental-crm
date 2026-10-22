import type { ServiceCatalogItem } from "@dental/shared";
import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { actionFailureToast } from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast.js";
import {
	type PlanItem,
	type PlanPriceCatalogItem,
	planItemFromServer,
	reconcileAutoSuggestions,
} from "../treatmentEstimatorPricing";
import {
	jsonObjectOrNull,
	type PlanLoadState,
	type SavedTreatmentPlan,
} from "../treatmentEstimatorTypes";
import type { ToothData } from "../ToothChart";

export function useEstimatorPlanData(
	patientId: string,
	currentTeeth: readonly ToothData[],
	serviceCatalog: readonly unknown[] | undefined,
) {
	const [items, setItems] = useState<PlanItem[]>([]);
	const [planId, setPlanId] = useState<string | null>(null);
	const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
	const [planLoad, setPlanLoad] = useState<PlanLoadState>({ phase: "loading" });
	const [reloadToken, setReloadToken] = useState(0);
	const [dismissedSuggestions, setDismissedSuggestions] = useState<ReadonlySet<string>>(() => new Set<string>());

	useEffect(() => {
		const handleReload = () => setReloadToken((t) => t + 1);
		window.addEventListener("dente-treatment-plans-reload", handleReload);
		return () => window.removeEventListener("dente-treatment-plans-reload", handleReload);
	}, []);

	useEffect(() => {
		let active = true;
		setPlanId(null);
		setItems([]);
		setSignatureUrl(null);
		setPlanLoad({ phase: "loading" });
		setDismissedSuggestions(new Set<string>());

		const loadPlan = async () => {
			let status: number | null = null;
			try {
				const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "http://localhost:5173";
				const response = await fetch(`${origin}/api/patients/${encodeURIComponent(patientId)}/treatment-plans`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				status = response.status;
				const rawBody = await response.text();
				if (!response.ok) {
					logger.error(`[treatment plan load] ${status} ${rawBody.slice(0, 300)}`);
					if (active) setPlanLoad({ phase: "failed", status });
					return;
				}
				const payload = jsonObjectOrNull(rawBody);
				if (!payload || !Array.isArray(payload.plans)) {
					logger.error(`[treatment plan load] ${status}: в ответе нет списка планов`);
					if (active) setPlanLoad({ phase: "failed", status });
					return;
				}
				if (!active) return;
				const latestPlan = payload.plans[0] as SavedTreatmentPlan | undefined;
				setPlanLoad({ phase: "ready" });
				if (!latestPlan) return;
				setPlanId(latestPlan.id);
				setItems(Array.isArray(latestPlan.items) ? latestPlan.items.map(planItemFromServer).filter((i): i is PlanItem => i !== null) : []);
				setSignatureUrl(latestPlan.patientSignature ?? null);
			} catch (error) {
				showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
				logger.error("[treatment plan load] запрос не выполнен", error);
				if (active) setPlanLoad({ phase: "failed", status });
			}
		};

		void loadPlan();
		return () => {
			active = false;
		};
	}, [patientId, reloadToken]);

	useEffect(() => {
		if (!Array.isArray(serviceCatalog)) return;
		setItems((prev) => {
			const { items: nextItems, changed } = reconcileAutoSuggestions(
				prev,
				currentTeeth,
				serviceCatalog as unknown as readonly PlanPriceCatalogItem[],
				dismissedSuggestions,
			);
			return changed ? nextItems : prev;
		});
	}, [currentTeeth, serviceCatalog, dismissedSuggestions]);

	return {
		items,
		setItems,
		planId,
		setPlanId,
		signatureUrl,
		setSignatureUrl,
		planLoad,
		reloadToken,
		setReloadToken,
		dismissedSuggestions,
		setDismissedSuggestions,
	};
}
