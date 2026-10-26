import type { ImagingStudy } from "./types";

export interface ResolvedPreviewEndpoint {
	endpoint: string;
	isStatic: boolean;
}

export function resolveStudyPreviewEndpoint(
	selectedImagingStudy: ImagingStudy,
	rawPreviewUrl?: string | null,
): ResolvedPreviewEndpoint {
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

	const isStatic =
		!previewEndpoint.startsWith("/api/") ||
		previewEndpoint.startsWith("/radiology/") ||
		previewEndpoint.startsWith("/models/") ||
		previewEndpoint.startsWith("/photos/") ||
		/\.(jpg|jpeg|png|svg|webp)(\?.*)?$/i.test(previewEndpoint);

	return { endpoint: previewEndpoint, isStatic };
}
