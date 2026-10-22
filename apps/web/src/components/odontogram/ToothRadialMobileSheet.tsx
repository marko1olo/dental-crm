import { isPrimaryTooth } from "@dental/shared";
import type React from "react";
import { useState } from "react";
import type { ToothRadialMobileSheetProps } from "./radialMenu/radialMenuTypes";
import { ToothRadialFooterActions } from "./radialMenu/ToothRadialFooterActions";
import { ToothRadialHeader } from "./radialMenu/ToothRadialHeader";
import { ToothRadialPrimaryGrid } from "./radialMenu/ToothRadialPrimaryGrid";
import { ToothRadialResorptionBar } from "./radialMenu/ToothRadialResorptionBar";
import { ToothRadialSecondaryAccordion } from "./radialMenu/ToothRadialSecondaryAccordion";
import { ToothRadialSurfaceBar } from "./radialMenu/ToothRadialSurfaceBar";

export type { ToothRadialMobileSheetProps };

export const ToothRadialMobileSheet: React.FC<ToothRadialMobileSheetProps> = ({
	menuRef,
	dragOffsetY,
	isDraggingSheet,
	handleSheetTouchStart,
	handleSheetTouchMove,
	handleSheetTouchEnd,
	toothNumber,
	currentState,
	items,
	selectedSurfaces,
	surfaces,
	setSelectedSurfaces,
	onSelectSurfaces,
	handleSelectStateWithHaptic,
	onSelectState,
	iropz,
	onOpenTherapy,
	onAddToInvoice,
	onOpenEndo,
	toothScanThumbnail,
	onOpenRvg,
	onClose,
}) => {
	const isPrimary = isPrimaryTooth(toothNumber);
	const [isSecondaryOpen, setIsSecondaryOpen] = useState(false);

	const core6Ids = ["healthy", "caries", "filled", "pulpitis", "crown", "missing"];
	const primaryItems = items.filter((it) => core6Ids.includes(it.id));
	const secondaryItems = items.filter((it) => !core6Ids.includes(it.id));

	return (
		<div
			ref={menuRef}
			onTouchStart={handleSheetTouchStart}
			onTouchMove={handleSheetTouchMove}
			onTouchEnd={handleSheetTouchEnd}
			style={{
				transform: dragOffsetY > 0 ? `translateY(${dragOffsetY}px)` : undefined,
				transition: isDraggingSheet ? "none" : "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
				touchAction: "pan-y",
				paddingBottom: "max(1.25rem, calc(1rem + env(safe-area-inset-bottom, 0px)))",
			}}
			className="radial-mobile-sheet w-full max-w-xl mx-auto bg-[var(--paper)] border-t border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col gap-3 max-h-[88vh] overflow-y-auto animate-slideUp select-none text-[var(--ink)]"
			role="dialog"
			aria-label={`Клиническое меню зуба ${toothNumber}`}
			onClick={(e) => e.stopPropagation()}
		>
			<div
				className="w-9 h-[5px] rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))] mx-auto mb-1 cursor-grab active:cursor-grabbing hover:opacity-100 transition-opacity"
				title="Потяните вниз для закрытия"
			/>
			<ToothRadialHeader toothNumber={toothNumber} currentState={currentState} onClose={onClose} isMobile={true} />
			<ToothRadialSurfaceBar
				isPrimary={isPrimary}
				selectedSurfaces={selectedSurfaces}
				setSelectedSurfaces={setSelectedSurfaces}
				onSelectSurfaces={onSelectSurfaces}
				isMobile={true}
			/>
			<ToothRadialPrimaryGrid
				primaryItems={primaryItems}
				currentState={currentState}
				selectedSurfaces={selectedSurfaces}
				surfaces={surfaces}
				onSelectWithHaptic={handleSelectStateWithHaptic}
				isMobile={true}
			/>
			<ToothRadialSecondaryAccordion
				secondaryItems={secondaryItems}
				currentState={currentState}
				selectedSurfaces={selectedSurfaces}
				surfaces={surfaces}
				onSelectWithHaptic={handleSelectStateWithHaptic}
				isOpen={isSecondaryOpen}
				setIsOpen={setIsSecondaryOpen}
				isMobile={true}
			/>
			<ToothRadialResorptionBar isPrimary={isPrimary} iropz={iropz} currentState={currentState} onSelectState={onSelectState} onClose={onClose} />
			<ToothRadialFooterActions
				toothScanThumbnail={toothScanThumbnail}
				onOpenRvg={onOpenRvg}
				onOpenTherapy={onOpenTherapy}
				onAddToInvoice={onAddToInvoice}
				onOpenEndo={onOpenEndo}
				onClose={onClose}
			/>
		</div>
	);
};
