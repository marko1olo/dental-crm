import type { ImagingStudy } from "./types";

export interface ResolvedPreviewEndpoint {
	endpoint: string;
	isStatic: boolean;
}

export function resolveStudyPreviewEndpoint(
	selectedImagingStudy: ImagingStudy,
	rawPreviewUrl?: string | null,
): ResolvedPreviewEndpoint {
	const previewEndpoint =
		typeof rawPreviewUrl === "string" && rawPreviewUrl.trim().length > 0
			? rawPreviewUrl
			: `/api/imaging/studies/${selectedImagingStudy.id}/preview.svg`;

	if (previewEndpoint.startsWith("/api/")) {
		return { endpoint: previewEndpoint, isStatic: false };
	}

	const isStatic =
		!previewEndpoint.startsWith("/api/") ||
		previewEndpoint.startsWith("/radiology/") ||
		previewEndpoint.startsWith("/models/") ||
		previewEndpoint.startsWith("/photos/") ||
		/\.(jpg|jpeg|png|svg|webp)(\?.*)?$/i.test(previewEndpoint);

	return { endpoint: previewEndpoint, isStatic };
}
