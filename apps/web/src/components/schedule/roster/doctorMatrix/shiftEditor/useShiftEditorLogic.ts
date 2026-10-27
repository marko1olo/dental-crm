/**
 * DENTE Dental CRM — Shift Editor Logic Hook
 * Click-outside, Escape, selections, shift resolution
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { ShiftEditorModalProps } from "./shiftEditorTypes";

export function useShiftEditorLogic({
	activePopover,
	weekDays,
	shifts,
	selectedDocId,
	selectedChairKey,
	onClosePopover,
	onApplyPreset,
	onOpenEdit,
	onOpenCreateInCell,
}: Pick<
	ShiftEditorModalProps,
	| "activePopover"
	| "weekDays"
	| "shifts"
	| "selectedDocId"
	| "selectedChairKey"
	| "onClosePopover"
	| "onApplyPreset"
	| "onOpenEdit"
	| "onOpenCreateInCell"
>) {
	const popoverRef = useRef<HTMLDivElement>(null);

	const [startTime, setStartTime] = useState("08:00");
	const [endTime, setEndTime] = useState("14:00");
	const [selectedAssistantId, setSelectedAssistantId] = useState("");

	const popoverDayInfo = useMemo(() => {
		if (!activePopover) return null;
		return weekDays?.find((d) => d.dateIso === activePopover.dateIso) ?? null;
	}, [activePopover, weekDays]);

	useEffect(() => {
		if (!activePopover) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
				onClosePopover();
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClosePopover();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [activePopover, onClosePopover]);

	const handleFullEdit = () => {
		if (!activePopover) return;
		const parts = selectedChairKey ? selectedChairKey.split("::") : [];
		const cabId = parts[0] || activePopover.cabinetId;
		const chId = parts[1] || activePopover.chairId;
		const existing = shifts.find(
			(s) =>
				s.dateIso === activePopover.dateIso &&
				s.chairId === chId &&
				s.status !== "cancelled" &&
				(!selectedDocId || s.doctorId === selectedDocId),
		);
		if (existing) {
			onOpenEdit(existing);
		} else {
			onOpenCreateInCell(activePopover.dateIso, cabId, chId);
		}
		onClosePopover();
	};

	const handleSaveShift = () => {
		// Mandate 8e: 1-click fast save without blocking
		onApplyPreset("morning");
	};

	return {
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
	};
}
