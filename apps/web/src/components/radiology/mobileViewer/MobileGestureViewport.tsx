import type React from "react";
import { MobileAiAnalyzingModal } from "./MobileAiAnalyzingModal.js";
import { MobileRulerBanner, MobileRulerSvg } from "./MobileRulerOverlay.js";
import { MobileRvgPlaceholder } from "./MobileRvgPlaceholder.js";
import type { MobileGestureViewportProps } from "./types.js";
import { useMobileGestureEvents } from "./useMobileGestureEvents.js";

export * from "./MobileRvgPlaceholder.js";

export const MobileGestureViewport: React.FC<MobileGestureViewportProps> = (
	props,
) => {
	const {
		selectedImagingStudy,
		effectivePreviewUrl,
		previewLoadError,
		selectedStudyHasFile,
		zoom,
		rotationDeg,
		computedFilter,
		computedTransform,
		isRulerActive,
		rulerStart,
		rulerCurrent,
		savedRulerDistanceMm,
		isAnalyzingAI,
		viewportRef,
		touchStartRef,
		setSavedRulerDistanceMm,
		setRulerStart,
		setRulerCurrent,
		onPickFiles,
	} = props;

	const { handleTouchStart, handleTouchMove, handleTouchEnd } =
		useMobileGestureEvents(props);

	return (
		<main
			ref={viewportRef}
			className="mobile-radiology-viewport"
			data-testid="mobile-radiology-viewport"
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			onTouchEnd={handleTouchEnd}
		>
			<div
				className="mobile-radiology-scale-badge"
				data-testid="mobile-scale-hud"
			>
				{zoom.toFixed(1)}x {rotationDeg !== 0 ? `· ${rotationDeg}°` : ""}
			</div>

			<MobileRulerBanner
				isRulerActive={isRulerActive}
				savedRulerDistanceMm={savedRulerDistanceMm}
				setSavedRulerDistanceMm={setSavedRulerDistanceMm}
				setRulerStart={setRulerStart}
				setRulerCurrent={setRulerCurrent}
				rulerStart={rulerStart}
				rulerCurrent={rulerCurrent}
			/>

			<div
				className="mobile-radiology-canvas-wrap"
				style={{
					transform: computedTransform,
					transition:
						touchStartRef.current.dist > 0
							? "none"
							: "transform 0.15s ease-out",
				}}
			>
				{effectivePreviewUrl && !previewLoadError ? (
					<img
						src={effectivePreviewUrl}
						alt={selectedImagingStudy?.title || "Рентген-снимок"}
						className="mobile-radiology-img"
						style={{ filter: computedFilter }}
						data-testid="mobile-active-xray-image"
					/>
				) : (
					<MobileRvgPlaceholder
						study={selectedImagingStudy}
						hasFile={selectedStudyHasFile}
						onPickFiles={onPickFiles}
					/>
				)}

				<MobileRulerSvg
					isRulerActive={isRulerActive}
					rulerStart={rulerStart}
					rulerCurrent={rulerCurrent}
				/>
			</div>

			<MobileAiAnalyzingModal isAnalyzingAI={isAnalyzingAI} />
		</main>
	);
};
