/**
 * useDicomPreviewLifecycle (Layer 3)
 *
 * Manages Blob URL lifecycle and caching for DICOM / clinical imaging studies
 * to prevent memory leaks and ensure rapid thumbnail render.
 */

import { useEffect, useRef, useState } from "react";
import type { Dashboard } from "@dental/shared";
import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import { fetchWithHandling } from "../../../utils/networkUtils";
import type { DicomAuthContext } from "./types";

export function useDicomPreviewLifecycle(
	imagingPreviewWorkset: Dashboard["imagingStudies"],
	auth: DicomAuthContext,
) {
	const [imagingPreviewObjectUrls, setImagingPreviewObjectUrls] = useState<
		Record<string, string>
	>({});

	const authRef = useRef(auth);
	useEffect(() => {
		authRef.current = auth;
	}, [auth]);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		if (!imagingPreviewWorkset.length) {
			setImagingPreviewObjectUrls((current) => {
				if (Object.keys(current).length === 0) return current;
				authRef.current.revokeObjectUrlMap(current);
				return {};
			});
			return undefined;
		}

		let cancelled = false;
		const abortController = new AbortController();
		const createdUrls: string[] = [];

		void Promise.all(
			imagingPreviewWorkset.map(
				async (study): Promise<[string, string] | null> => {
					if (!study.previewUrl.startsWith("/api/")) {
						return [study.id, study.previewUrl];
					}
					const response = await fetchWithHandling(study.previewUrl, {
						cache: "no-store",
						headers: authRef.current.denteClinicalReadHeaders(),
						signal: abortController.signal,
					});
					if (!response.ok) return null;
					const blobUrl = URL.createObjectURL(await response.blob());
					if (cancelled) {
						authRef.current.revokeObjectUrlIfNeeded(blobUrl);
						return null;
					}
					createdUrls.push(blobUrl);
					return [study.id, blobUrl];
				},
			),
		)
			.then((entries) => {
				if (cancelled) {
					createdUrls.forEach(authRef.current.revokeObjectUrlIfNeeded);
					return;
				}
				const next = Object.fromEntries(
					entries.filter((entry): entry is [string, string] => Boolean(entry)),
				);
				const nextUrls = new Set(Object.values(next));
				setImagingPreviewObjectUrls((current) => {
					Object.values(current).forEach((url) => {
						if (!nextUrls.has(url)) {
							authRef.current.revokeObjectUrlIfNeeded(url);
						}
					});
					return next;
				});
			})
			.catch((err) => {
				createdUrls.forEach(authRef.current.revokeObjectUrlIfNeeded);
				if (!cancelled) {
					showToast(
						actionFailureToast(
							"Предпросмотр снимка",
							(err as { status?: number })?.status ?? null,
						),
						"error",
					);
					setImagingPreviewObjectUrls((current) => {
						authRef.current.revokeObjectUrlMap(current);
						return {};
					});
				}
			});

		return () => {
			cancelled = true;
			abortController.abort();
			createdUrls.forEach(authRef.current.revokeObjectUrlIfNeeded);
		};
	}, [imagingPreviewWorkset]);

	return {
		imagingPreviewObjectUrls,
		setImagingPreviewObjectUrls,
	};
}
