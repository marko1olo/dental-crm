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
	return rawSrc;
}
