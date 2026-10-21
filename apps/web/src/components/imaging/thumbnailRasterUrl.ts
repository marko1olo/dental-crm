import type { ImagingStudy } from "./types.js";

export function resolveThumbnailRasterUrl(
	study: ImagingStudy,
	rawSrc?: string,
): string | undefined {
	if (!rawSrc) return undefined;
	if (rawSrc.startsWith("blob:") || rawSrc.startsWith("data:")) return rawSrc;
	const storagePath = String(
		(study as { storagePath?: string })?.storagePath || "",
	).replace(/\\/g, "/");
	for (const publicPrefix of ["/radiology/", "/models/", "/photos/"]) {
		const idx = storagePath.indexOf(publicPrefix);
		if (idx !== -1) {
			const candidate = storagePath.slice(idx);
			if (/\.(png|jpe?g|webp|avif)$/i.test(candidate)) return candidate;
		}
	}
	if (rawSrc.startsWith("/api/imaging/") || rawSrc.endsWith("/preview.svg")) {
		const kind = String(study?.kind || "").toLowerCase();
		const tooth = String(study?.toothCode || "").trim();
		if (kind === "opg" || kind === "panoramic")
			return "/models/sample_opg_temur.png";
		if (kind === "ceph") return "/radiology/sample_trg_cephalogram.jpg";
		if (kind === "photo") return "/photos/vita_a2_clinical_guide.jpg";
		if (tooth === "36") return "/radiology/sample_rvg_tooth36_periapical.jpg";
		if (tooth === "26") return "/radiology/sample_rvg_pathology.jpg";
		return "/radiology/sample_rvg_tooth16.jpg";
	}
	return rawSrc;
}
