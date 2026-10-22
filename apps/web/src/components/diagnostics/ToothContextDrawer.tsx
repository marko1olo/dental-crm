import React from "react";
import { useToothDrawerState } from "./toothDrawer/useToothDrawerState";
import { ToothDrawerHeader } from "./toothDrawer/ToothDrawerHeader";
import { ToothDrawerStateStrip } from "./toothDrawer/ToothDrawerStateStrip";
import { ToothDrawerQuickTabs } from "./toothDrawer/ToothDrawerQuickTabs";
import { ToothDrawerAccordionsBody } from "./toothDrawer/ToothDrawerAccordionsBody";
import { ToothDrawerFooter } from "./toothDrawer/ToothDrawerFooter";
import type { ToothContextDrawerProps } from "./toothDrawer/toothDrawerTypes";
import "./ToothContextDrawer.css";

export * from "./toothDrawer/toothDrawerTypes";

export const ToothContextDrawer: React.FC<ToothContextDrawerProps> = (props) => {
	const {
		isOpen,
		onClose,
		toothNumber,
		toothData,
		patient,
		doctorName = "Лечащий врач-стоматолог",
		onUpdateTooth,
		onInsertToProtocol,
		onOpenFullRadiology,
		onOpenFamilyBilling,
		onOpenParentMemo,
		onApplyAnesthesia,
		className = "",
	} = props;

	const state = useToothDrawerState(props);

	if (!isOpen) return null;

	return (
		<div className={`dente-tooth-drawer-backdrop ${className}`.trim()} onClick={onClose}>
			<aside
				className="dente-tooth-drawer-container"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-label={`Контекстные инструменты зуба #${toothNumber}`}
				data-testid="tooth-context-drawer"
				data-modal-alias="tooth-card-modal"
			>
				<ToothDrawerHeader
					toothNumber={toothNumber}
					currentState={state.currentState}
					anatomicalName={state.anatomicalName}
					folkAndAnatomical={state.folkAndAnatomical}
					suggestedRecall={state.suggestedRecall}
					onTriggerRecall={state.handleTriggerRecall}
					onClose={onClose}
				/>

				<ToothDrawerStateStrip currentState={state.currentState} onQuickStateSelect={state.handleQuickStateSelect} />

				<ToothDrawerQuickTabs
					activeSection={state.activeSection}
					setActiveSection={state.setActiveSection}
					isPediatricTooth={state.isPediatricTooth}
				/>

				<ToothDrawerAccordionsBody
					toothNumber={toothNumber}
					toothData={toothData}
					patient={patient}
					doctorName={doctorName}
					activeSection={state.activeSection}
					isPediatricTooth={state.isPediatricTooth}
					toggleSection={state.toggleSection}
					onUpdateTooth={onUpdateTooth}
					onInsertToProtocol={onInsertToProtocol}
					onOpenFullRadiology={onOpenFullRadiology}
					onOpenFamilyBilling={onOpenFamilyBilling}
					onOpenParentMemo={onOpenParentMemo}
					onApplyAnesthesia={onApplyAnesthesia}
				/>

				<ToothDrawerFooter toothNumber={toothNumber} toothData={toothData} onClose={onClose} />
			</aside>
		</div>
	);
};

export default ToothContextDrawer;
