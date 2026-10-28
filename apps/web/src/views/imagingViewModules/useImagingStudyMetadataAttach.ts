/**
 * DENTE CRM — Attach Tooth and Visit Metadata to Imaging Study
 * Mandate 8b (<= 120 lines).
 */

import { useCallback } from "react";
import { showToast } from "../../components/GlobalToast";

export function useImagingStudyMetadataAttach(
	selectedImagingStudy: any,
	auth: any,
	props: any,
	appLogic: any,
) {
	const handleAttachTooth = useCallback(async (toothCode: string) => {
		if (!selectedImagingStudy?.id) return;
		props.onStudyUpdated?.({ ...selectedImagingStudy, toothCode: toothCode || null });
		try {
			const headers = auth?.denteClinicalMutationHeaders
				? auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" })
				: { "Content-Type": "application/json" };
			const res = await fetch(`/api/imaging/studies/${selectedImagingStudy.id}`, {
				method: "PATCH",
				headers,
				body: JSON.stringify({ toothCode: toothCode || null }),
			});
			if (res.ok) {
				const updated = await res.json();
				props.onStudyUpdated?.(updated);
				if (appLogic?.loadDashboard) void appLogic.loadDashboard();
				showToast(toothCode ? `Снимок привязан к зубу ${toothCode}` : "Привязка к зубу снята", "success");
			}
		} catch {
			showToast("Не удалось обновить привязку к зубу", "error");
		}
	}, [selectedImagingStudy, auth, props, appLogic]);

	const handleAttachVisit = useCallback(async (visitId: string) => {
		if (!selectedImagingStudy?.id) return;
		try {
			const headers = auth?.denteClinicalMutationHeaders
				? auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" })
				: { "Content-Type": "application/json" };
			const res = await fetch(`/api/imaging/studies/${selectedImagingStudy.id}`, {
				method: "PATCH",
				headers,
				body: JSON.stringify({ visitId: visitId || null }),
			});
			if (res.ok) {
				const updated = await res.json();
				props.onStudyUpdated?.(updated);
				if (appLogic?.loadDashboard) void appLogic.loadDashboard();
				showToast("Снимок привязан к текущему приёму", "success");
			}
		} catch {
			showToast("Не удалось обновить привязку к визиту", "error");
		}
	}, [selectedImagingStudy?.id, auth, props, appLogic]);

	return { handleAttachTooth, handleAttachVisit };
}
