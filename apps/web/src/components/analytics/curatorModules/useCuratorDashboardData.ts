import { useEffect, useState } from "react";
import type { CuratorFunnelStage, CuratorPatientQueueItem } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";

export function useCuratorDashboardData(dashboardContextQueue: CuratorPatientQueueItem[]) {
	const [queueItems, setQueueItems] = useState<CuratorPatientQueueItem[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const loadCuratorsData = async () => {
		setIsLoading(true);
		try {
			const res = await fetch("/api/analytics/curators", {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const json = await res.json();
				if (Array.isArray(json?.data?.queue) && json.data.queue.length > 0) {
					setQueueItems(json.data.queue);
					return;
				}
			}
		} catch {
			// Fallback to local dashboard context
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
				headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
				body: JSON.stringify({ patientId, stage: nextStage }),
			});
			if (!res.ok) {
				await fetch(`/api/patients/${encodeURIComponent(patientId)}/administrative-profile`, {
					method: "PUT",
					headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
					body: JSON.stringify({ curatorFunnelStage: nextStage }),
				});
			}
		} catch (err) {
			console.error("Failed to persist curator stage:", err);
			showToast("Не удалось сохранить этап на сервере", "warning");
		}

		setQueueItems((prev) =>
			prev.map((q) => (q.treatmentPlanId === treatmentPlanId ? { ...q, funnelStage: nextStage } : q)),
		);
	};

	return { queueItems, setQueueItems, isLoading, advanceStage, refresh: loadCuratorsData };
}
