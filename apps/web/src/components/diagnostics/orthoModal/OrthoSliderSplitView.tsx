/**
 * OrthoSliderSplitView.tsx — Тонкий фасад над каноническим BeforeAfterSplitSlider (SSOT).
 * Мандат 8aq: Ликвидация дубликатов слайдера сравнения До/После.
 */

import React from "react";
import { BeforeAfterSplitSlider } from "../../photography/BeforeAfterSplitSlider";

export interface OrthoSliderSplitViewProps {
	beforeImageUrl: string | null;
	currentImageUrl: string | null;
	sliderPosition: number;
	setSliderPosition: (pos: number) => void;
}

export const OrthoSliderSplitView: React.FC<OrthoSliderSplitViewProps> = ({
	beforeImageUrl,
	currentImageUrl,
	sliderPosition,
	setSliderPosition,
}) => {
	return (
		<div className="w-full rounded-2xl overflow-hidden">
			<BeforeAfterSplitSlider
				beforeImageUrl={beforeImageUrl}
				afterImageUrl={currentImageUrl}
				beforeLabel="ДО"
				afterLabel="ПОСЛЕ / СЕЙЧАС"
				compact={true}
				sliderPosition={sliderPosition}
				setSliderPosition={setSliderPosition}
				showControls={false}
			/>
		</div>
	);
};

export default OrthoSliderSplitView;
