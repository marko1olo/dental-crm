import { useEffect, useState } from "react";
import { generateUuidV7, type CuratorFunnelStage, type CuratorPatientQueueItem } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { denteClinicalMutationHeaders, denteClinicalReadHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import { normalizeToCuratorFunnelStage } from "../../treatment-plans/curatorStageMapping";

export function useCuratorDashboardData(dashboardContextQueue: CuratorPatientQueueItem[]) {
	const [queueItems, setQueueItems] = useState<CuratorPatientQueueItem[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const loadCuratorsData = async () => {
		setIsLoading(true);
		try {
			const res = await fetch("/api/analytics/curators", {
				headers: denteClinicalReadHeaders(),
			});
			if (res.ok) {
				const json = await res.json();
				const payload = json?.data ?? json;
				if (Array.isArray(payload?.queue) && payload.queue.length > 0) {
					setQueueItems(
						(payload.queue as CuratorPatientQueueItem[]).map((item) => ({
							...item,
							funnelStage: normalizeToCuratorFunnelStage(item.funnelStage),
						})),
					);
					return;
				}
			} else {
				clientLogger.warn(
					"Failed to fetch curator queue",
					{ status: res.status },
					{ module: "useCuratorDashboardData" },
				);
			}
		} catch (err) {
			clientLogger.warn(
				"Failed to fetch server queue, falling back to local context",
				err,
				{ module: "useCuratorDashboardData" },
			);
		} finally {
			setIsLoading(false);
		}
		setQueueItems(dashboardContextQueue);
	};

	useEffect(() => {
		loadCuratorsData();
	}, [dashboardContextQueue]);

	const advanceStage = async (patientId: string, treatmentPlanId: string, nextStage: CuratorFunnelStage) => {
		try {
			const res = await fetch("/api/analytics/curators/stage", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
					...denteClinicalMutationHeaders(),
				},
				body: JSON.stringify({ patientId, treatmentPlanId, stage: nextStage }),
			});
			if (!res.ok) {
				const fallbackRes = await fetch(`/api/patients/${encodeURIComponent(patientId)}/administrative-profile`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
						...denteClinicalMutationHeaders(),
					},
					body: JSON.stringify({ curatorFunnelStage: nextStage, treatmentPlanId }),
				});
				if (!fallbackRes.ok) {
					throw new Error(`Server returned status ${fallbackRes.status}`);
				}
			}
		} catch (err) {
			clientLogger.error("Failed to persist curator stage", err, { module: "useCuratorDashboardData" });
			showToast("Не удалось сохранить этап на сервере", "warning");
			return;
		}

		setQueueItems((prev) =>
			prev.map((q) => (q.treatmentPlanId === treatmentPlanId ? { ...q, funnelStage: nextStage } : q)),
		);
	};

	return { queueItems, setQueueItems, isLoading, advanceStage, refresh: loadCuratorsData };
}
