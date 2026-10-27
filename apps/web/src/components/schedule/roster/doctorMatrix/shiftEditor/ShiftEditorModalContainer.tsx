/**
 * DENTE Dental CRM — Shift Editor Modal Container (Layer 2)
 * Pure Composed Container (Mandates 8b, 8d, 8e, 8k, 8n)
 */

import React from "react";
import type { ShiftEditorModalProps } from "./shiftEditorTypes";
import { useShiftEditorLogic } from "./useShiftEditorLogic";
import { ShiftEditorHeader } from "./ShiftEditorHeader";
import { ShiftStaffSelector } from "./ShiftStaffSelector";
import { ShiftPresetQuickButtons } from "./ShiftPresetQuickButtons";
import { ShiftCustomTimeInterval } from "./ShiftCustomTimeInterval";
import { ShiftEditorActionButtons } from "./ShiftEditorActionButtons";
import "./shiftEditor.css";

export const ShiftEditorModalContainer: React.FC<ShiftEditorModalProps> = React.memo(
	function ShiftEditorModalContainer(props) {
		const {
			activePopover,
			weekDays,
			staffList,
			shifts,
			flatChairsList,
			onClosePopover,
			onApplyPreset,
			onApplyWeeklyTemplate,
			selectedDocId,
			setSelectedDocId,
			selectedChairKey,
			setSelectedChairKey,
			onOpenEdit,
			onOpenCreateInCell,
		} = props;

		const {
			popoverRef,
			popoverDayInfo,
			startTime,
			setStartTime,
			endTime,
			setEndTime,
			selectedAssistantId,
			setSelectedAssistantId,
			handleFullEdit,
			handleSaveShift,
		} = useShiftEditorLogic({
			activePopover,
			weekDays,
			shifts,
			selectedDocId,
			selectedChairKey,
			onClosePopover,
			onApplyPreset,
			onOpenEdit,
			onOpenCreateInCell,
		});

		if (!activePopover) return null;

		return (
			<div
				ref={popoverRef}
				className="roster-cell-popover-anchored shift-editor-modal-container"
				data-testid="roster-cell-popover"
				style={{ position: "absolute" }}
			>
				<ShiftEditorHeader
					popoverDayInfo={popoverDayInfo}
					dateIso={activePopover.dateIso}
					onClose={onClosePopover}
				/>

				<ShiftStaffSelector
					staffList={staffList}
					flatChairsList={flatChairsList}
					selectedDocId={selectedDocId}
					onSelectDocId={setSelectedDocId}
					selectedChairKey={selectedChairKey}
					onSelectChairKey={setSelectedChairKey}
					selectedAssistantId={selectedAssistantId}
					onSelectAssistantId={setSelectedAssistantId}
				/>

				<ShiftPresetQuickButtons
					onApplyPreset={onApplyPreset}
					onApplyWeeklyTemplate={onApplyWeeklyTemplate}
				/>

				<ShiftCustomTimeInterval
					startTime={startTime}
					endTime={endTime}
					onChangeStartTime={setStartTime}
					onChangeEndTime={setEndTime}
				/>

				<ShiftEditorActionButtons
					onSaveShift={handleSaveShift}
					onFullEdit={handleFullEdit}
					onClose={onClosePopover}
					onClearShift={() => onApplyPreset("clear")}
				/>
			</div>
		);
	},
);
