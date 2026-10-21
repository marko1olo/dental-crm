import type React from "react";
import { getToothFolkAndAnatomicalNameRu } from "../../lib/clinicalProtocols";
import { MobileBottomSheet } from "../mobile/MobileBottomSheet";
import { ToothActionSecondaryButtons } from "./ToothActionSecondaryButtons";
import { ToothActionStatusGrid } from "./ToothActionStatusGrid";
import { ToothActionSurfacesAccordion } from "./ToothActionSurfacesAccordion";
import type { ToothActionMenuPortalProps } from "./toothActionMenuTypes";

export const ToothActionMobileSheet: React.FC<ToothActionMenuPortalProps> = ({
	menuConfig,
	onClose,
	selectedTeeth,
	activeSurfaces,
	setActiveSurfaces,
	onApplyToothState,
	onOpenContextDrawer,
	onOpenHistory,
	onOpenEndo,
	onOneClickLabOrder,
	teethData,
}) => {
	if (!menuConfig) return null;

	const title =
		selectedTeeth.length > 1
			? `Выбрано: ${selectedTeeth.length} зубов`
			: `Зуб #${menuConfig.toothNumber}`;
	const subtitle =
		selectedTeeth.length === 1
			? getToothFolkAndAnatomicalNameRu(menuConfig.toothNumber)
			: undefined;

	return (
		<MobileBottomSheet
			isOpen={true}
			onClose={onClose}
			title={title}
			subtitle={subtitle}
			testId="mobile-tooth-action-bottom-sheet"
		>
			<div className="space-y-3 pb-6">
				<div className="grid grid-cols-2 gap-2">
					<ToothActionStatusGrid onApplyToothState={onApplyToothState} />
				</div>
				<ToothActionSurfacesAccordion
					activeSurfaces={activeSurfaces}
					setActiveSurfaces={setActiveSurfaces}
				/>
				<div className="flex flex-col gap-2 pt-1">
					<ToothActionSecondaryButtons
						toothNumber={menuConfig.toothNumber}
						selectedTeeth={selectedTeeth}
						activeSurfaces={activeSurfaces}
						teethData={teethData}
						onClose={onClose}
						onOpenContextDrawer={onOpenContextDrawer}
						onOpenHistory={onOpenHistory}
						onOpenEndo={onOpenEndo}
						onOneClickLabOrder={onOneClickLabOrder}
					/>
				</div>
			</div>
		</MobileBottomSheet>
	);
};
