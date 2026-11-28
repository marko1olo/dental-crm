import { useEffect, useState } from "react";
import { imagingStudyHasFile } from "./types";
import type { ImagingStudy } from "./types";
import { resolveStudyPreviewEndpoint } from "./studyPreviewResolver";

export interface UseImagingPreviewBlobOptions {
	selectedImagingStudy?: ImagingStudy | null | undefined;
	imagingPreviewSource?: (study: ImagingStudy) => string | undefined;
	auth?: {
		denteClinicalReadHeaders?: () => Record<string, string>;
		[key: string]: unknown;
	} | null | undefined;
}

export function useImagingPreviewBlob({
	selectedImagingStudy,
	imagingPreviewSource,
	auth,
}: UseImagingPreviewBlobOptions) {
	const [authedPreviewBlobUrl, setAuthedPreviewBlobUrl] = useState<string | null>(null);
	const [isPreviewLoading, setIsPreviewLoading] = useState(false);
	const [previewLoadError, setPreviewLoadError] = useState(false);

	useEffect(() => {
		let isCancelled = false;
		let objectUrlToRevoke: string | null = null;

		if (!selectedImagingStudy) {
			setAuthedPreviewBlobUrl(null);
			setIsPreviewLoading(false);
			setPreviewLoadError(false);
			return;
		}

		const rawPreviewUrl = imagingPreviewSource
			? imagingPreviewSource(selectedImagingStudy)
			: typeof selectedImagingStudy.previewUrl === "string"
				? selectedImagingStudy.previewUrl
				: undefined;
		if (
			typeof rawPreviewUrl === "string" &&
			(rawPreviewUrl.startsWith("blob:") || rawPreviewUrl.startsWith("data:"))
		) {
			setAuthedPreviewBlobUrl(rawPreviewUrl);
			setIsPreviewLoading(false);
			setPreviewLoadError(false);
			return;
		}

		if (!imagingStudyHasFile(selectedImagingStudy)) {
			setAuthedPreviewBlobUrl(null);
			setIsPreviewLoading(false);
			setPreviewLoadError(false);
			return;
		}

		const { endpoint, isStatic } = resolveStudyPreviewEndpoint(
			selectedImagingStudy,
			rawPreviewUrl,
		);

		if (isStatic) {
			setAuthedPreviewBlobUrl(endpoint);
			setIsPreviewLoading(false);
			setPreviewLoadError(false);
			return;
		}

		const headers: Record<string, string> =
			auth && typeof auth.denteClinicalReadHeaders === "function"
				? auth.denteClinicalReadHeaders()
				: {};

		setIsPreviewLoading(true);
		setPreviewLoadError(false);

		const abortController = new AbortController();

		fetch(endpoint, {
			method: "GET",
			headers,
			signal: abortController.signal,
		})
			.then(async (res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.blob();
			})
			.then((blob) => {
				if (isCancelled || abortController.signal.aborted) return;
				const url = URL.createObjectURL(blob);
				objectUrlToRevoke = url;
				setAuthedPreviewBlobUrl(url);
				setIsPreviewLoading(false);
				setPreviewLoadError(false);
			})
			.catch((err) => {
				if (
					isCancelled ||
					abortController.signal.aborted ||
					(err instanceof DOMException && err.name === "AbortError")
				) {
					return;
				}
				setAuthedPreviewBlobUrl(null);
				setIsPreviewLoading(false);
				setPreviewLoadError(true);
			});

		return () => {
			isCancelled = true;
			abortController.abort();
			if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
		};
	}, [selectedImagingStudy?.id, selectedImagingStudy?.storagePath, auth, imagingPreviewSource]);

	return {
		effectivePreviewUrl: authedPreviewBlobUrl,
		isPreviewLoading,
		previewLoadError,
	};
}
