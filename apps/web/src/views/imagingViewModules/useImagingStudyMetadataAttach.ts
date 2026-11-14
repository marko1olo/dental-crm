/**
 * DENTE CRM — Attach Tooth and Visit Metadata to Imaging Study
 * Mandate 8b (<= 120 lines).
 */

import { useCallback } from "react";
import { showToast } from "../../components/GlobalToast";
import type { ImagingStudy } from "./imagingViewTypes";

export function useImagingStudyMetadataAttach(
	selectedImagingStudy: ImagingStudy | null,
	auth: { denteClinicalMutationHeaders?: (headers?: Record<string, string>) => Record<string, string> } | null | undefined,
	props: { onStudyUpdated?: (study: unknown) => void; [key: string]: unknown },
	appLogic: { loadDashboard?: () => Promise<unknown> | void; [key: string]: unknown } | null | undefined,
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
		} catch (err: unknown) {
			console.warn("[useImagingStudyMetadataAttach] Error attaching tooth:", err);
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
		} catch (err: unknown) {
			console.warn("[useImagingStudyMetadataAttach] Error attaching visit:", err);
			showToast("Не удалось обновить привязку к визиту", "error");
		}
	}, [selectedImagingStudy?.id, auth, props, appLogic]);

	return { handleAttachTooth, handleAttachVisit };
}
