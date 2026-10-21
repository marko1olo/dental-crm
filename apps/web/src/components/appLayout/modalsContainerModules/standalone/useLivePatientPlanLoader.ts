import { useEffect, useState } from "react";
import { DEFAULT_SAMPLE_TEETH } from "../../../treatment-plans/presenterModules/state/presenterStateConstants";
import {
	fetchPipelineFirstPlan,
	fetchTargetPatientPlan,
} from "./livePatientPlanFetcher";
import type { LivePatientPlanInfo } from "./presenterLauncherTypes";

export interface UseLivePatientPlanLoaderParams {
	readonly isOpen: boolean;
	readonly isDemo: boolean;
	readonly patientId?: string | undefined;
	readonly planId?: string | undefined;
}

const DEMO_PLAN_INFO: LivePatientPlanInfo = {
	patientName: "Смирнова Анна Сергеевна",
	patientId: "pat-demo-showcase-01",
	patientPhone: "+7 (999) 345-67-89",
	patientBirthDate: "1988-04-12",
	doctorFullName: "Д-р Соколов Алексей Владимирович",
	doctorSpecialty: "Врач-стоматолог терапевт, ортопед",
	planId: "plan-demo-showcase-01",
	planCreatedAtIso: "2026-04-12T10:00:00.000Z",
	teeth: DEFAULT_SAMPLE_TEETH,
};

export function useLivePatientPlanLoader({
	isOpen,
	isDemo,
	patientId: propPatientId,
	planId: propPlanId,
}: UseLivePatientPlanLoaderParams) {
	const [patientPlan, setPatientPlan] = useState<LivePatientPlanInfo | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [isEmptyState, setIsEmptyState] = useState<boolean>(false);

	useEffect(() => {
		if (!isOpen) return;
		let isMounted = true;

		async function resolveData() {
			setIsLoading(true);
			setIsEmptyState(false);

			if (isDemo) {
				if (isMounted) {
					setPatientPlan({
						...DEMO_PLAN_INFO,
						planCreatedAtIso: new Date().toISOString(),
					});
					setIsLoading(false);
				}
				return;
			}

			const search = new URLSearchParams(window.location.search);
			const targetPatientId = propPatientId || search.get("patientId");
			const targetPlanId = propPlanId || search.get("planId");

			if (targetPatientId && targetPlanId) {
				const plan = await fetchTargetPatientPlan(
					targetPatientId,
					targetPlanId,
				);
				if (plan && isMounted) {
					setPatientPlan(plan);
					setIsLoading(false);
					return;
				}
			}

			const pipelinePlan = await fetchPipelineFirstPlan();
			if (pipelinePlan && isMounted) {
				setPatientPlan(pipelinePlan);
				setIsLoading(false);
				return;
			}

			if (isMounted) {
				setPatientPlan(null);
				setIsEmptyState(true);
				setIsLoading(false);
			}
		}

		void resolveData();
		return () => {
			isMounted = false;
		};
	}, [isOpen, isDemo, propPatientId, propPlanId]);

	return { patientPlan, isLoading, isEmptyState };
}
