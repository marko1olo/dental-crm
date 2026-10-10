/**
 * DENTE Dental CRM — Doctor-to-Chair Modal State Hook (Layer 3)
 *
 * Centralizes modal state, synchronization effects, and callback actions.
 */

import { useState, useEffect, useCallback } from "react";
import type { DentalSpecialty } from "@dental/shared";
import {
	CHAIR_SHIFT_PRESETS,
	type ChairDoctorShiftAssignment,
	type ChairDoctorSubShift,
	type ChairShiftPresetId,
	DEFAULT_SOLO_CHAIR,
	formatDoctorShortName,
} from "../chairRosterMath";
import {
	QUICK_DOCTOR_SPECIALTIES,
	type QuickAddDoctorData,
} from "../QuickAddDoctorModal";
import { showToast } from "../../GlobalToast";
import type {
	DoctorChairScheduleModalProps,
	DoctorChairScheduleState,
	RangeRotationPreset,
	ScheduleModalTab,
} from "./types";

export function useDoctorChairScheduleModalState(
	props: DoctorChairScheduleModalProps,
): DoctorChairScheduleState {
	const {
		isOpen,
		onClose,
		chair,
		chairs = [],
		doctors = [],
		dateKey,
		currentAssignment,
		onAssign,
		onAssignDateRange,
		onAddDoctor,
	} = props;

	const activeChair = chair || chairs[0] || DEFAULT_SOLO_CHAIR;
	const [activeTab, setActiveTab] = useState<ScheduleModalTab>("day");

	// Day mode states
	const [selectedShiftPreset, setSelectedShiftPreset] = useState<ChairShiftPresetId>(() => {
		if (currentAssignment?.shiftPreset === "two_shifts") return "two_shifts";
		if (currentAssignment?.shiftPreset === "morning_9") return "morning_9";
		if (currentAssignment?.shiftPreset === "evening") return "evening";
		if (currentAssignment?.shiftPreset === "evening_15") return "evening_15";
		if (currentAssignment?.shiftPreset === "full") return "full";
		return "morning";
	});

	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => {
		return currentAssignment?.doctorId || doctors[0]?.id || "";
	});

	const [selectedEveningDoctorId, setSelectedEveningDoctorId] = useState<string>(() => {
		if (currentAssignment?.subShifts?.[1]) {
			return currentAssignment.subShifts[1].doctorId;
		}
		return doctors[1]?.id || doctors[0]?.id || "";
	});

	// Date Range mode states
	const [rangeStartDate, setRangeStartDate] = useState<string>(dateKey);
	const [rangeEndDate, setRangeEndDate] = useState<string>(() => {
		if (!dateKey) return "";
		const parts = dateKey.split("-").map(Number);
		const d = new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!));
		d.setUTCDate(d.getUTCDate() + 6);
		return d.toISOString().slice(0, 10);
	});
	const [rangeRotationPreset, setRangeRotationPreset] =
		useState<RangeRotationPreset>("full");

	// Inline Quick Doctor Form
	const [isInlineDoctorFormOpen, setIsInlineDoctorFormOpen] = useState(false);
	const [newDocName, setNewDocName] = useState("");
	const [newDocSpecialty, setNewDocSpecialty] = useState<DentalSpecialty>("therapist");
	const [newDocColor, setNewDocColor] = useState<string>("#0d9488");

	// Synchronize when assignment or doctors change
	useEffect(() => {
		if (currentAssignment) {
			setSelectedDoctorId(currentAssignment.doctorId || doctors[0]?.id || "");
			if (currentAssignment.subShifts && currentAssignment.subShifts.length > 1) {
				setSelectedShiftPreset("two_shifts");
				setSelectedEveningDoctorId(currentAssignment.subShifts[1]?.doctorId || doctors[0]?.id || "");
			} else {
				setSelectedShiftPreset(
					(currentAssignment.shiftPreset as ChairShiftPresetId) || "morning",
				);
			}
		} else {
			setSelectedDoctorId(doctors[0]?.id || "");
			setSelectedEveningDoctorId(doctors[1]?.id || doctors[0]?.id || "");
			setSelectedShiftPreset("morning");
		}
	}, [currentAssignment, doctors]);

	// Synchronize date key
	useEffect(() => {
		if (dateKey) {
			setRangeStartDate(dateKey);
			const parts = dateKey.split("-").map(Number);
			const d = new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!));
			d.setUTCDate(d.getUTCDate() + 6);
			setRangeEndDate(d.toISOString().slice(0, 10));
		}
	}, [dateKey]);

	// Escape key handler
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (isInlineDoctorFormOpen) {
					setIsInlineDoctorFormOpen(false);
					e.stopPropagation();
				} else if (isOpen) {
					onClose();
				}
			}
		};
		if (isOpen) {
			window.addEventListener("keydown", handleKeyDown);
		}
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, isInlineDoctorFormOpen, onClose]);

	// 1-Click Fast Solo Doctor Anchor (Mandate 8n)
	const handleSoloDoctorQuickAnchor = useCallback(() => {
		const soloDoc = doctors[0];
		if (!soloDoc) {
			showToast("В клинике пока нет добавленных врачей", "warning");
			return;
		}
		const docName = formatDoctorShortName(soloDoc.fullName || soloDoc.name || "Врач");
		const assignment: ChairDoctorShiftAssignment = {
			chairId: activeChair.id,
			chairName: activeChair.name,
			doctorId: soloDoc.id,
			doctorName: docName,
			doctorSpecialty: soloDoc.role,
			shiftPreset: "full",
			shiftLabel: "Весь день",
			shiftHours: "08:00–20:00",
			startHour: 8,
			endHour: 20,
		};
		onAssign(activeChair.id, assignment);
		showToast(`Кресло «${activeChair.name}» закреплено за соло-врачом (${docName})`, "success");
		onClose();
	}, [doctors, activeChair, onAssign, onClose]);

	// Confirm day assignment
	const handleConfirmDayAssignment = useCallback(() => {
		const targetDoc = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];
		if (!targetDoc) {
			showToast("Выберите врача для назначения на кресло", "warning");
			return;
		}

		const docName = formatDoctorShortName(targetDoc.fullName || targetDoc.name || "Врач");
		const presetObj = CHAIR_SHIFT_PRESETS.find((p) => p.id === selectedShiftPreset);

		if (selectedShiftPreset === "two_shifts") {
			const targetEveDoc = doctors.find((d) => d.id === selectedEveningDoctorId) || doctors[0];
			const eveDocName = formatDoctorShortName(targetEveDoc?.fullName || targetEveDoc?.name || "Врач");

			const mornSub: ChairDoctorSubShift = {
				doctorId: targetDoc.id,
				doctorName: docName,
				doctorSpecialty: targetDoc.role,
				startHour: 8,
				endHour: 14,
				shiftHours: "08:00–14:00",
			};
			const eveSub: ChairDoctorSubShift = {
				doctorId: targetEveDoc?.id || targetDoc.id,
				doctorName: eveDocName,
				doctorSpecialty: targetEveDoc?.role,
				startHour: 14,
				endHour: 20,
				shiftHours: "14:00–20:00",
			};

			const assignment: ChairDoctorShiftAssignment = {
				chairId: activeChair.id,
				chairName: activeChair.name,
				doctorId: targetDoc.id,
				doctorName: `${docName} / ${eveDocName}`,
				shiftPreset: "two_shifts",
				shiftLabel: "2 смены (Утро + Вечер)",
				shiftHours: "08:00–20:00",
				startHour: 8,
				endHour: 20,
				subShifts: [mornSub, eveSub],
			};

			onAssign(activeChair.id, assignment);
			showToast(`Кресло «${activeChair.name}»: назначены 2 смены (${docName} + ${eveDocName})`, "success");
		} else {
			const assignment: ChairDoctorShiftAssignment = {
				chairId: activeChair.id,
				chairName: activeChair.name,
				doctorId: targetDoc.id,
				doctorName: docName,
				doctorSpecialty: targetDoc.role,
				shiftPreset: selectedShiftPreset,
				shiftLabel: presetObj?.label || "Смена",
				shiftHours: presetObj?.hours || "08:00–14:00",
				startHour: presetObj?.startHour ?? 8,
				endHour: presetObj?.endHour ?? 14,
			};

			onAssign(activeChair.id, assignment);
			showToast(`Врач ${docName} назначен на кресло «${activeChair.name}» (${presetObj?.hours})`, "success");
		}

		onClose();
	}, [
		doctors,
		selectedDoctorId,
		selectedEveningDoctorId,
		selectedShiftPreset,
		activeChair,
		onAssign,
		onClose,
	]);

	// Confirm date range assignment
	const handleConfirmDateRange = useCallback(() => {
		const targetDoc = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];
		if (!targetDoc) {
			showToast("Выберите врача для назначения", "warning");
			return;
		}
		if (onAssignDateRange) {
			onAssignDateRange({
				chairId: activeChair.id,
				doctorId: targetDoc.id,
				shiftPreset: rangeRotationPreset,
				startDate: rangeStartDate,
				endDate: rangeEndDate,
			});
		} else {
			handleConfirmDayAssignment();
		}
		showToast(
			`График назначен: ${formatDoctorShortName(targetDoc.fullName)} (${rangeStartDate} — ${rangeEndDate})`,
			"success",
		);
		onClose();
	}, [
		doctors,
		selectedDoctorId,
		rangeRotationPreset,
		rangeStartDate,
		rangeEndDate,
		activeChair,
		onAssignDateRange,
		handleConfirmDayAssignment,
		onClose,
	]);

	// Unassign doctor
	const handleUnassign = useCallback(() => {
		onAssign(activeChair.id, null);
		showToast(`Назначение врача с кресла «${activeChair.name}» снято`, "info");
		onClose();
	}, [activeChair, onAssign, onClose]);

	// Inline add doctor submit
	const handleInlineDoctorSubmit = async () => {
		const finalName = newDocName.trim() || `Врач ${doctors.length + 1}`;
		const shortName = formatDoctorShortName(finalName);
		const newId =
			typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
				? crypto.randomUUID()
				: `doc-${doctors.length + 1}`;

		const specialtyObj =
			QUICK_DOCTOR_SPECIALTIES.find((s) => s.id === newDocSpecialty) ||
			QUICK_DOCTOR_SPECIALTIES[0]!;

		const newDoctorData: QuickAddDoctorData = {
			id: newId,
			fullName: finalName,
			name: finalName,
			shortName,
			specialty: newDocSpecialty,
			specialtyLabel: specialtyObj.label,
			phone: null,
			preferredChairId: activeChair.id,
			color: newDocColor,
			role: "doctor",
			active: true,
		};

		if (onAddDoctor) {
			await onAddDoctor(newDoctorData);
		}

		setSelectedDoctorId(newId);
		setNewDocName("");
		setIsInlineDoctorFormOpen(false);
		showToast(`Врач ${shortName} добавлен и выбран`, "success");
	};

	const hasActiveAssignment = Boolean(currentAssignment && currentAssignment.doctorId);

	return {
		activeChair,
		activeTab,
		setActiveTab,
		selectedShiftPreset,
		setSelectedShiftPreset,
		selectedDoctorId,
		setSelectedDoctorId,
		selectedEveningDoctorId,
		setSelectedEveningDoctorId,
		rangeStartDate,
		setRangeStartDate,
		rangeEndDate,
		setRangeEndDate,
		rangeRotationPreset,
		setRangeRotationPreset,
		isInlineDoctorFormOpen,
		setIsInlineDoctorFormOpen,
		newDocName,
		setNewDocName,
		newDocSpecialty,
		setNewDocSpecialty,
		newDocColor,
		setNewDocColor,
		handleSoloDoctorQuickAnchor,
		handleConfirmDayAssignment,
		handleConfirmDateRange,
		handleUnassign,
		handleInlineDoctorSubmit,
		hasActiveAssignment,
	};
}
