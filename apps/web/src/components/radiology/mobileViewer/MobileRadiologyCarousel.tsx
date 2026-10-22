import React from "react";
import type { ImagingStudy } from "../../imaging/types.js";
import { kindShortMap, regionBadgeMap } from "./mobileRadiologyHelpers.js";

export interface MobileRadiologyCarouselProps {
	activeImagingStudies: ImagingStudy[];
	selectedStudyId?: string | undefined;
	onSelectStudy: (id: string) => void;
	triggerHaptic: () => void;
}

export const MobileRadiologyCarousel: React.FC<
	MobileRadiologyCarouselProps
> = ({
	activeImagingStudies,
	selectedStudyId,
	onSelectStudy,
	triggerHaptic,
}) => {
	if (activeImagingStudies.length === 0) return null;

	return (
		<aside
			className="mobile-radiology-preview-carousel"
			data-testid="mobile-radiology-preview-carousel"
			aria-label="Лента снимков пациента"
		>
			{activeImagingStudies.map((study) => {
				const isSelected = selectedStudyId === study.id;
				const toothLabel = study.toothCode
					? `#${study.toothCode}`
					: study.region
						? (regionBadgeMap[study.region] ?? study.region)
						: (kindShortMap[study.kind] ?? "RVG");
				const thumbCode = study.toothCode
					? `#${study.toothCode}`
					: (kindShortMap[study.kind] ?? "RVG");
				return (
					<button
						key={study.id}
						type="button"
						onClick={() => {
							triggerHaptic();
							onSelectStudy(study.id);
						}}
						className={`mobile-radiology-carousel-item ${isSelected ? "active" : ""}`}
						data-testid={`mobile-carousel-study-${study.id}`}
						aria-label={`Снимок ${study.title || toothLabel}`}
						aria-current={isSelected ? "true" : undefined}
					>
						<div className="mobile-radiology-carousel-thumb">
							<span className="text-[11px] font-bold text-teal-400 font-mono select-none">
								{thumbCode}
							</span>
							{study.previewUrl && (
								<img
									src={study.previewUrl}
									alt=""
									className="absolute inset-0 w-full h-full object-cover"
									onError={(e) => {
										(e.target as HTMLElement).style.display = "none";
									}}
								/>
							)}
							<span className="mobile-radiology-carousel-badge">
								{toothLabel}
							</span>
						</div>
					</button>
				);
			})}
		</aside>
	);
};
