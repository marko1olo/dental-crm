import { useState } from "react";
import { resolveThumbnailRasterUrl } from "./thumbnailRasterUrl.js";
import { type ImagingStudy, imagingStudyHasFile } from "./types.js";

export * from "./thumbnailRasterUrl.js";

export interface ImagingStudyThumbnailProps {
	study: ImagingStudy;
	previewSrc?: string | undefined;
}

export function ImagingStudyThumbnail({
	study,
	previewSrc,
}: ImagingStudyThumbnailProps) {
	const [hasError, setHasError] = useState(false);
	const rawSrc = previewSrc || study?.previewUrl;
	const src = resolveThumbnailRasterUrl(study, rawSrc ?? undefined);
	const isDirectBlob =
		rawSrc?.startsWith("blob:") || rawSrc?.startsWith("data:");

	if (hasError || !src || (!isDirectBlob && !imagingStudyHasFile(study))) {
		return (
			<div
				className="w-12 h-12 rounded-lg bg-[var(--paper-soft,#1e293b)] border border-[var(--line,#334155)] flex flex-col items-center justify-center text-[var(--teal,#0d9488)] shrink-0 select-none"
				style={{
					width: "48px",
					height: "48px",
					minWidth: "48px",
					minHeight: "48px",
					aspectRatio: "1 / 1",
				}}
				title={study?.title || "Рентген-снимок"}
			>
				<svg
					role="img"
					aria-label={study?.title || "Рентген-снимок"}
					viewBox="0 0 28 28"
					className="w-6 h-6"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
				>
					<title>{study?.title || "Рентген-снимок"}</title>
					<rect
						x="4"
						y="2"
						width="20"
						height="24"
						rx="4"
						fill="currentColor"
						fillOpacity="0.1"
						stroke="currentColor"
					/>
					<rect
						x="7"
						y="5"
						width="14"
						height="18"
						rx="2"
						stroke="currentColor"
						strokeOpacity="0.4"
						strokeDasharray="1.5 1.5"
					/>
					<circle
						cx="14"
						cy="14"
						r="3"
						stroke="currentColor"
						strokeOpacity="0.7"
					/>
				</svg>
			</div>
		);
	}

	return (
		<img
			src={src}
			alt=""
			loading="lazy"
			decoding="async"
			className="w-12 h-12 object-cover rounded-lg shrink-0 aspect-square border border-[var(--line,#334155)] bg-[var(--paper-soft,#1e293b)]"
			style={{
				width: "48px",
				height: "48px",
				minWidth: "48px",
				minHeight: "48px",
				aspectRatio: "1 / 1",
			}}
			onError={() => setHasError(true)}
		/>
	);
}
