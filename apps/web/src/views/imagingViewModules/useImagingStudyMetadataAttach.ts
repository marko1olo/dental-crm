/**
 * DENTE CRM — Attach Tooth and Visit Metadata to Imaging Study
 * Mandate 8b (<= 120 lines).
 */

import { useCallback } from "react";
import { generateUuidV7 } from "@dental/shared";
import { showToast } from "../../components/GlobalToast";
import { clientLogger } from "../../services/logging/clientLogger";
import type { ImagingStudy } from "./imagingViewTypes";

export function useImagingStudyMetadataAttach(
	selectedImagingStudy: ImagingStudy | null,
	auth: { denteClinicalMutationHeaders?: (headers?: Record<string, string>) => Record<string, string> } | null | undefined,
	props: { onStudyUpdated?: ((study: ImagingStudy) => void) | undefined; [key: string]: unknown },
	appLogic: { loadDashboard?: () => Promise<unknown> | void; [key: string]: unknown } | null | undefined,
) {
	const handleAttachTooth = useCallback(async (toothCode: string) => {
		if (!selectedImagingStudy?.id) return;
		props.onStudyUpdated?.({ ...selectedImagingStudy, toothCode: toothCode || null });
		try {
			const idempotencyKey = generateUuidV7();
			const headers = auth?.denteClinicalMutationHeaders
				? auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": idempotencyKey,
					})
				: {
						"Content-Type": "application/json",
						"Idempotency-Key": idempotencyKey,
					};
			const res = await fetch(`/api/imaging/studies/${selectedImagingStudy.id}`, {
				method: "PATCH",
				headers,
				body: JSON.stringify({ toothCode: toothCode || null }),
			});
			if (res.ok) {
				const json = await res.json();
				const payload = (json && typeof json === "object" && "data" in json) ? (json as { data: ImagingStudy }).data : (json as ImagingStudy);
				props.onStudyUpdated?.(payload);
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-tooth-scan-bound", {
							detail: { studyId: selectedImagingStudy.id, toothCode: toothCode || null },
						}),
					);
					window.dispatchEvent(new CustomEvent("dente-xray-updated"));
				}
				if (appLogic?.loadDashboard) void appLogic.loadDashboard();
				showToast(toothCode ? `Снимок привязан к зубу ${toothCode}` : "Привязка к зубу снята", "success");
			} else {
				clientLogger.warn(
					"[useImagingStudyMetadataAttach] Failed to attach tooth",
					{ status: res.status },
					{ module: "useImagingStudyMetadataAttach" },
				);
				showToast("Не удалось обновить привязку к зубу", "error");
			}
		} catch (err: unknown) {
			clientLogger.warn("[useImagingStudyMetadataAttach] Error attaching tooth", err, {
				module: "useImagingStudyMetadataAttach",
			});
			showToast("Не удалось обновить привязку к зубу", "error");
		}
	}, [selectedImagingStudy, auth, props, appLogic]);

	const handleAttachVisit = useCallback(async (visitId: string) => {
		if (!selectedImagingStudy?.id) return;
		try {
			const idempotencyKey = generateUuidV7();
			const headers = auth?.denteClinicalMutationHeaders
				? auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": idempotencyKey,
					})
				: {
						"Content-Type": "application/json",
						"Idempotency-Key": idempotencyKey,
					};
			const res = await fetch(`/api/imaging/studies/${selectedImagingStudy.id}`, {
				method: "PATCH",
				headers,
				body: JSON.stringify({ visitId: visitId || null }),
			});
			if (res.ok) {
				const json = await res.json();
				const payload = (json && typeof json === "object" && "data" in json) ? (json as { data: ImagingStudy }).data : (json as ImagingStudy);
				props.onStudyUpdated?.(payload);
				if (appLogic?.loadDashboard) void appLogic.loadDashboard();
				showToast("Снимок привязан к текущему приёму", "success");
			} else {
				clientLogger.warn(
					"[useImagingStudyMetadataAttach] Failed to attach visit",
					{ status: res.status },
					{ module: "useImagingStudyMetadataAttach" },
				);
				showToast("Не удалось обновить привязку к визиту", "error");
			}
		} catch (err: unknown) {
			clientLogger.warn("[useImagingStudyMetadataAttach] Error attaching visit", err, {
				module: "useImagingStudyMetadataAttach",
			});
			showToast("Не удалось обновить привязку к визиту", "error");
		}
	}, [selectedImagingStudy?.id, auth, props, appLogic]);

	return { handleAttachTooth, handleAttachVisit };
}
