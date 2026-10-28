import { isPrimaryTooth } from "@dental/shared";
import type React from "react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { triggerHaptic } from "../../native/mobileBridge";
import { usePatientStore } from "../../store/patientStore";
import type { ToothState } from "./ToothChart";
import { ToothRadialMobileSheet } from "./ToothRadialMobileSheet";
import { buildPrimaryRadialItems, buildSecondaryRadialItems } from "./radialMenu/radialMenuPresets";
import type { RadialMenuItem, ToothRadialMenuProps } from "./radialMenu/radialMenuTypes";
import { ToothRadialFooterActions } from "./radialMenu/ToothRadialFooterActions";
import { ToothRadialHeader } from "./radialMenu/ToothRadialHeader";
import { ToothRadialPrimaryGrid } from "./radialMenu/ToothRadialPrimaryGrid";
import { ToothRadialResorptionBar } from "./radialMenu/ToothRadialResorptionBar";
import { ToothRadialSecondaryAccordion } from "./radialMenu/ToothRadialSecondaryAccordion";
import { ToothRadialSurfaceBar } from "./radialMenu/ToothRadialSurfaceBar";
import { useRadialKeyboardAndGestures } from "./radialMenu/useRadialKeyboardAndGestures";
import { useToothScanThumbnail } from "./radialMenu/useToothScanThumbnail";

export type { RadialMenuItem, ToothRadialMenuProps };

export const ToothRadialMenu: React.FC<ToothRadialMenuProps> = ({
	toothNumber, anchorRect, currentState = "Healthy", iropz, surfaces,
	onSelectState, onSelectSurfaces, onOpenEndo, onOpenTherapy, onAddToInvoice, onClose,
}) => {
	const isTouchOrMobile = typeof window !== "undefined" && (window.innerWidth <= 768 || (window.innerWidth <= 1024 && ("ontouchstart" in window || (Boolean(navigator.maxTouchPoints) && navigator.maxTouchPoints > 0))));
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const [isMoreStatusesOpen, setIsMoreStatusesOpen] = useState(false);
	const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>(() => (surfaces ? [...surfaces] : []));
	const isPrimary = isPrimaryTooth(toothNumber);

	const primaryItems = useMemo(() => buildPrimaryRadialItems(isPrimary), [isPrimary]);
	const secondaryItems = useMemo(() => buildSecondaryRadialItems(), []);
	const allItems = useMemo(() => [...primaryItems, ...secondaryItems], [primaryItems, secondaryItems]);

	const { toothScanThumbnail, handleOpenRvg } = useToothScanThumbnail(toothNumber, selectedPatientId);
	const handleSelectStateWithHaptic = (state: ToothState, surfs?: readonly string[], subType?: string) => {
		triggerHaptic("success");
		onSelectState(state, surfs, subType);
		onClose();
	};

	const gestures = useRadialKeyboardAndGestures(onClose, allItems, selectedSurfaces, surfaces, handleSelectStateWithHaptic);
	const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
	const vh = typeof window !== "undefined" ? window.innerHeight : 900;
	const clampedX = Math.max(216, Math.min(vw - 216, anchorRect.x + anchorRect.width / 2));
	const clampedY = Math.max(236, Math.min(vh - 236, anchorRect.y + anchorRect.height / 2));

	const content = (
		<div
			className={`radial-tooth-menu-overlay fixed inset-0 z-[9999] pointer-events-auto animate-fadeIn ${isTouchOrMobile ? "flex flex-col justify-end p-0 sm:p-4" : ""}`}
			style={{ backgroundColor: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(3px)" }}
			data-testid="tooth-radial-menu-overlay"
			onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
		>
			{isTouchOrMobile ? (
				<ToothRadialMobileSheet
					menuRef={gestures.menuRef} dragOffsetY={gestures.dragOffsetY} isDraggingSheet={gestures.isDraggingSheet}
					handleSheetTouchStart={gestures.handleSheetTouchStart} handleSheetTouchMove={gestures.handleSheetTouchMove} handleSheetTouchEnd={gestures.handleSheetTouchEnd}
					toothNumber={toothNumber} currentState={currentState} items={allItems}
					selectedSurfaces={selectedSurfaces} surfaces={surfaces} setSelectedSurfaces={setSelectedSurfaces}
					onSelectSurfaces={onSelectSurfaces} toggleSurface={(s) => setSelectedSurfaces((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])}
					handleSelectStateWithHaptic={handleSelectStateWithHaptic} onSelectState={onSelectState} iropz={iropz}
					onOpenTherapy={onOpenTherapy} onAddToInvoice={onAddToInvoice} onOpenEndo={onOpenEndo}
					toothScanThumbnail={toothScanThumbnail} onOpenRvg={() => handleOpenRvg(onClose)} onClose={onClose}
				/>
			) : (
				<div
					ref={gestures.menuRef}
					className="tooth-desktop-popover absolute select-none flex flex-col rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl p-3.5 gap-2.5 text-[var(--ink)]"
					style={{ left: `${clampedX}px`, top: `${clampedY}px`, width: "400px", maxHeight: "440px", transform: "translate(-50%, -50%)", boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px var(--line)" }}
					role="dialog" aria-label={`Клиническое меню зуба ${toothNumber}`} onClick={(e) => e.stopPropagation()}
				>
					<ToothRadialHeader toothNumber={toothNumber} currentState={currentState} onClose={onClose} />
					<ToothRadialSurfaceBar isPrimary={isPrimary} selectedSurfaces={selectedSurfaces} setSelectedSurfaces={setSelectedSurfaces} onSelectSurfaces={onSelectSurfaces} />
					<ToothRadialPrimaryGrid primaryItems={primaryItems} currentState={currentState} selectedSurfaces={selectedSurfaces} surfaces={surfaces} onSelectWithHaptic={handleSelectStateWithHaptic} />
					<ToothRadialSecondaryAccordion secondaryItems={secondaryItems} currentState={currentState} selectedSurfaces={selectedSurfaces} surfaces={surfaces} onSelectWithHaptic={handleSelectStateWithHaptic} isOpen={isMoreStatusesOpen} setIsOpen={setIsMoreStatusesOpen} />
					<ToothRadialResorptionBar isPrimary={isPrimary} iropz={iropz} currentState={currentState} onSelectState={onSelectState} onClose={onClose} />
					<ToothRadialFooterActions toothNumber={toothNumber} toothScanThumbnail={toothScanThumbnail} onOpenRvg={() => handleOpenRvg(onClose)} onOpenTherapy={onOpenTherapy} onAddToInvoice={onAddToInvoice} onOpenEndo={onOpenEndo} onClose={onClose} />
				</div>
			)}
		</div>
	);

	return typeof document !== "undefined" ? createPortal(content, document.body) : content;
};

export { ToothRadialMenu as RadialToothMenu, ToothRadialMenu as ToothClinicalPopover };
