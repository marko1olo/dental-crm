import React from "react";
import { showToast } from "../../../../GlobalToast";
import { VisitToolbarSomaticNorm } from "./VisitToolbarSomaticNorm";
import { VisitToolbarDocumentPrinting } from "./VisitToolbarDocumentPrinting";
import { VisitToolbarQuickActions } from "./VisitToolbarQuickActions";
import { VisitToolbarFinishAndSave } from "./VisitToolbarFinishAndSave";
import { VisitToolbarMoreMenu } from "./VisitToolbarMoreMenu";
import { VisitFloatingBottomBar } from "./VisitFloatingBottomBar";
import type { VisitActionButtonsToolbarProps } from "../types";

export function VisitActionButtonsLayout(props: VisitActionButtonsToolbarProps) {
	const handlePrintClinicalDiaryFast =
		props.handlePrintClinicalDiaryFast ??
		props.handlePrintForm043uFast ??
		(() => {
			showToast("Печать медицинской карты приёма", "info");
		});

	return (
		<>
			<VisitToolbarSomaticNorm
				handleApplySomaticNormQuick={props.handleApplySomaticNormQuick}
			/>

			<VisitToolbarDocumentPrinting
				handlePrintClinicalDiaryFast={handlePrintClinicalDiaryFast}
				handlePrintCompletedActFast={props.handlePrintCompletedActFast}
				handlePrintEstimateFast={props.handlePrintEstimateFast}
			/>

			<VisitToolbarQuickActions
				onOpenLabOrderModal={props.onOpenLabOrderModal}
				setIsEmergencyModalOpen={props.setIsEmergencyModalOpen}
				shiftDayQueue={props.shiftDayQueue}
				isQueueLobbyDropdownOpen={props.isQueueLobbyDropdownOpen}
				setIsQueueLobbyDropdownOpen={props.setIsQueueLobbyDropdownOpen}
				queueLobbyDropdownRef={props.queueLobbyDropdownRef}
			/>

			<VisitToolbarFinishAndSave
				flushPendingVisitSaves={props.flushPendingVisitSaves}
				handleFinishVisitAction={props.handleFinishVisitAction}
			/>

			<VisitToolbarMoreMenu
				{...props}
				handlePrintClinicalDiaryFast={handlePrintClinicalDiaryFast}
			/>

			<VisitFloatingBottomBar
				flushPendingVisitSaves={props.flushPendingVisitSaves}
				handleFinishVisitAction={props.handleFinishVisitAction}
				handleApplySomaticNormQuick={props.handleApplySomaticNormQuick}
			/>
		</>
	);
}
