/**
 * DENTE Dental CRM — Doctor Shift Roster Matrix Coordinator (Layer 5)
 * Compliance: TK RF Article 350 (33-hour medical workweek), Form T-13, Mandate 8e, Mandate 8d
 */

import React, { useMemo, useState, useEffect } from "react";
import type { DoctorChairRosterTemplateId } from "../doctorShiftRosterPresets";
import type {
	ActivePopoverCell,
	DoctorRosterMatrixProps,
	FlatChairItem,
} from "./types";
import { RosterGridMatrix } from "./RosterGridMatrix";
import { RosterStatsBar } from "./RosterStatsBar";
import { ShiftEditorModal } from "./ShiftEditorModal";

export const DoctorRosterMatrix: React.FC<DoctorRosterMatrixProps> = React.memo(
	function DoctorRosterMatrix({
		activeTab,
		weekDays,
		weekStartDateIso,
		weekEndDateIso,
		selectedYear,
		selectedMonth,
		monthNormObj,
		cabinets,
		staffList,
		shifts,
		conflicts,
		t13Matrix,
		sanitizedAppointments,
		onOpenEdit,
		onOpenCreateInCell,
		onOpenT13Timesheet,
		onOpenInternalT13Modal,
		onExportT13,
		onClose,
		onApplyCellPreset,
		onApplyDoctorChairWeeklyTemplate,
		activePopoverCell,
		onActivePopoverCellChange,
	}) {
		const [internalPopoverCell, setInternalPopoverCell] =
			useState<ActivePopoverCell | null>(null);

		const activePopover =
			activePopoverCell !== undefined
				? activePopoverCell
				: internalPopoverCell;

		const setActivePopover = (cell: ActivePopoverCell | null) => {
			setInternalPopoverCell(cell);
			onActivePopoverCellChange?.(cell);
		};

		// Flat list of all available chairs across cabinets for quick chair selection
		const flatChairsList = useMemo(() => {
			const list: FlatChairItem[] = [];
			for (const cab of cabinets) {
				for (const ch of cab.chairs) {
					list.push({
						cabinetId: cab.id,
						cabinetName: cab.name,
						chairId: ch.id,
						chairName: ch.name,
					});
				}
			}
			return list;
		}, [cabinets]);

		const [selectedDocId, setSelectedDocId] = useState<string>("");
		const [selectedChairKey, setSelectedChairKey] = useState<string>("");

		useEffect(() => {
			if (activePopover) {
				const docInCell =
					activePopover.doctorId ||
					shifts.find(
						(s) =>
							s.dateIso === activePopover.dateIso &&
							s.chairId === activePopover.chairId &&
							s.status !== "cancelled",
					)?.doctorId ||
					staffList.find(
						(s) =>
							s.isDoctor &&
							s.preferredChairId === activePopover.chairId,
					)?.id ||
					staffList.find((s) => s.isDoctor)?.id ||
					staffList[0]?.id ||
					"";
				setSelectedDocId(docInCell);

				const currentChairKey = `${activePopover.cabinetId}::${activePopover.chairId}`;
				setSelectedChairKey(currentChairKey);
			}
		}, [activePopover, shifts, staffList]);

		const handleApplyPresetInPopover = (
			presetType: "morning" | "evening" | "full_day" | "clear",
		) => {
			if (!activePopover) return;
			const parts = selectedChairKey ? selectedChairKey.split("::") : [];
			const cabId = parts[0] || activePopover.cabinetId;
			const chId = parts[1] || activePopover.chairId;
			const docId =
				selectedDocId ||
				activePopover.doctorId ||
				staffList.find((s) => s.isDoctor)?.id;

			if (onApplyCellPreset) {
				onApplyCellPreset(
					activePopover.dateIso,
					cabId,
					chId,
					presetType,
					docId,
				);
			} else {
				if (presetType === "clear") {
					const toCancel = shifts.find(
						(s) =>
							s.dateIso === activePopover.dateIso &&
							s.chairId === chId &&
							(!docId || s.doctorId === docId),
					);
					if (toCancel) onOpenEdit({ ...toCancel, status: "cancelled" });
				} else {
					onOpenCreateInCell(activePopover.dateIso, cabId, chId);
				}
			}
			setActivePopover(null);
		};

		const handleApplyWeeklyTemplateInPopover = (
			templateId: DoctorChairRosterTemplateId,
		) => {
			if (!activePopover) return;
			const parts = selectedChairKey ? selectedChairKey.split("::") : [];
			const cabId = parts[0] || activePopover.cabinetId;
			const chId = parts[1] || activePopover.chairId;
			const docId =
				selectedDocId ||
				activePopover.doctorId ||
				staffList.find((s) => s.isDoctor)?.id;
			if (!docId) return;

			if (onApplyDoctorChairWeeklyTemplate) {
				onApplyDoctorChairWeeklyTemplate(docId, chId, cabId, templateId);
			}
			setActivePopover(null);
		};

		return (
			<div className="roster-main-area" style={{ position: "relative" }}>
				{/* TAB 1: Cabinets View */}
				{activeTab === "cabinets" && (
					<RosterGridMatrix
						weekDays={weekDays}
						weekStartDateIso={weekStartDateIso}
						cabinets={cabinets}
						shifts={shifts}
						conflicts={conflicts}
						onCellClick={setActivePopover}
					/>
				)}

				{/* TABS 2..4: Doctors, T13, Utilization */}
				{activeTab !== "cabinets" && (
					<RosterStatsBar
						activeTab={activeTab}
						weekDays={weekDays}
						weekStartDateIso={weekStartDateIso}
						weekEndDateIso={weekEndDateIso}
						selectedYear={selectedYear}
						monthNormObj={monthNormObj}
						cabinets={cabinets}
						staffList={staffList}
						shifts={shifts}
						t13Matrix={t13Matrix}
						sanitizedAppointments={sanitizedAppointments}
						flatChairsList={flatChairsList}
						onOpenT13Timesheet={onOpenT13Timesheet}
						onOpenInternalT13Modal={onOpenInternalT13Modal}
						onExportT13={onExportT13}
						onClose={onClose}
						onCellClick={setActivePopover}
					/>
				)}

				{/* 1-Click Fast Shift & Chair-Doctor Binding Popover */}
				<ShiftEditorModal
					activePopover={activePopover}
					weekDays={weekDays}
					cabinets={cabinets}
					staffList={staffList}
					shifts={shifts}
					flatChairsList={flatChairsList}
					onClosePopover={() => setActivePopover(null)}
					onApplyPreset={handleApplyPresetInPopover}
					onApplyWeeklyTemplate={handleApplyWeeklyTemplateInPopover}
					selectedDocId={selectedDocId}
					setSelectedDocId={setSelectedDocId}
					selectedChairKey={selectedChairKey}
					setSelectedChairKey={setSelectedChairKey}
					onOpenEdit={onOpenEdit}
					onOpenCreateInCell={onOpenCreateInCell}
				/>
			</div>
		);
	},
);
