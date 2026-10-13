import { useEffect, useState } from "react";
import { imagingStudyHasFile } from "./types";
import type { ImagingStudy } from "./types";

export interface UseImagingPreviewBlobOptions {
	selectedImagingStudy?: ImagingStudy | null;
	imagingPreviewSource?: (study: any) => string | undefined;
	auth?: any;
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
			: (selectedImagingStudy as any).previewUrl;
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

		let previewEndpoint =
			typeof rawPreviewUrl === "string" && rawPreviewUrl.trim().length > 0
				? rawPreviewUrl
				: `/api/imaging/studies/${selectedImagingStudy.id}/preview.svg`;

		if (previewEndpoint.endsWith("/preview.svg")) {
			const kind = String((selectedImagingStudy as any).kind || "").toLowerCase();
			const tooth = String((selectedImagingStudy as any).toothCode || "").trim();
			if (kind === "opg" || kind === "panoramic") {
				previewEndpoint = "/models/sample_opg_temur.png";
			} else if (kind === "ceph") {
				previewEndpoint = "/radiology/sample_trg_cephalogram.jpg";
			} else if (kind === "photo") {
				previewEndpoint = "/photos/vita_a2_clinical_guide.jpg";
			} else if (tooth === "36") {
				previewEndpoint = "/radiology/sample_rvg_tooth36_periapical.jpg";
			} else if (tooth === "26") {
				previewEndpoint = "/radiology/sample_rvg_pathology.jpg";
			} else {
				previewEndpoint = "/radiology/sample_rvg_tooth16.jpg";
			}
		}

		const headers: Record<string, string> =
			auth && typeof auth.denteClinicalReadHeaders === "function"
				? auth.denteClinicalReadHeaders()
				: {};

		setIsPreviewLoading(true);
		setPreviewLoadError(false);

		fetch(previewEndpoint, {
			method: "GET",
			headers,
		})
			.then(async (res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.blob();
			})
			.then((blob) => {
				if (isCancelled) return;
				const url = URL.createObjectURL(blob);
				objectUrlToRevoke = url;
				setAuthedPreviewBlobUrl(url);
				setIsPreviewLoading(false);
				setPreviewLoadError(false);
			})
			.catch(() => {
				if (isCancelled) return;
				setAuthedPreviewBlobUrl(null);
				setIsPreviewLoading(false);
				setPreviewLoadError(true);
			});

		return () => {
			isCancelled = true;
			if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
		};
	}, [selectedImagingStudy?.id, (selectedImagingStudy as any)?.storagePath, auth, imagingPreviewSource]);

	return {
		effectivePreviewUrl: authedPreviewBlobUrl,
		isPreviewLoading,
		previewLoadError,
	};
}
