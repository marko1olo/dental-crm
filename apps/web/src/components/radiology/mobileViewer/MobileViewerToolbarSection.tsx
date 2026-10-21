import type React from "react";
import { MobileRadiologyFilterToolbar } from "./MobileRadiologyFilterToolbar.js";
import type { useMobileRadiologyController } from "./useMobileRadiologyController.js";

export const MobileViewerToolbarSection: React.FC<{
	c: ReturnType<typeof useMobileRadiologyController>;
}> = ({ c }) => {
	return (
		<MobileRadiologyFilterToolbar
			inverted={c.inverted}
			contrast={c.contrast}
			brightness={c.brightness}
			enhancementClahe={c.enhancementClahe}
			zoom={c.zoom}
			rotationDeg={c.rotationDeg}
			isRulerActive={c.isRulerActive}
			isFilterPopoverOpen={c.isFilterPopoverOpen}
			onToggleInvert={c.handleToggleInvert}
			onCycleContrast={c.handleCycleContrast}
			onToggleRuler={() => {
				c.triggerHaptic();
				c.setIsRulerActive((prev) => !prev);
			}}
			onCycleZoom={c.handleCycleZoom}
			onRotate={() => {
				c.triggerHaptic();
				c.setRotationDeg((prev) => (prev + 90) % 360);
			}}
			onToggleFilterPopover={() => {
				c.triggerHaptic();
				c.setIsFilterPopoverOpen((prev) => !prev);
			}}
			onChangeBrightness={(val) => c.setBrightness(val)}
			onChangeContrast={(val) => c.setContrast(val)}
			onToggleClahe={() => c.setEnhancementClahe((prev) => !prev)}
			onResetFilters={() => {
				c.setBrightness(1.0);
				c.setContrast(1.0);
				c.setEnhancementClahe(false);
			}}
			onCloseFilterPopover={() => c.setIsFilterPopoverOpen(false)}
		/>
	);
};
