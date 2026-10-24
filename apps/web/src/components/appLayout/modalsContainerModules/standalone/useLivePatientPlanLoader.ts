import { useEffect, useState } from "react";
import {
	fetchPipelineFirstPlan,
	fetchTargetPatientPlan,
} from "./livePatientPlanFetcher";
import type { LivePatientPlanInfo } from "./presenterLauncherTypes";

export interface UseLivePatientPlanLoaderParams {
	readonly isOpen: boolean;
	readonly patientId?: string | undefined;
	readonly planId?: string | undefined;
}

export function useLivePatientPlanLoader({
	isOpen,
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

			/* Демо-режим идёт тем же честным контуром через БД/API: демо-база
			 * засеяна реальными записями, поэтому вымышленный «пациент витрины»
			 * (бывший DEMO_PLAN_INFO с захардкоженной «Смирновой») не нужен —
			 * если в базе нет ни целевого плана, ни воронки, показываем честное
			 * пустое состояние, а не подставное лицо. */

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
	}, [isOpen, propPatientId, propPlanId]);

	return { patientPlan, isLoading, isEmptyState };
}
