import { useEffect, useMemo, useRef, useState } from "react";
import { safeLocalStorageGetJson } from "../../../lib/safeLocalStorage";
import { DEFAULT_CLINIC_CHAIRS } from "./constants";
import type { ScheduleChair, ScheduleFilterStripProps } from "./types";

export function useScheduleFilters({
	todayIso: propsTodayIso,
	scheduleDateFilter,
	setScheduleDateFilter,
	staffMembers = [],
	chairs = [],
	isSoloDoctor = false,
	branches = [],
	scheduleDoctorFilterId = null,
	setScheduleDoctorFilterId,
	scheduleChairFilterId = null,
	setScheduleChairFilterId,
	chairDoctorAssignments,
	currentDoctorId,
	onSelectMyChair,
	onQuickBookRepeatOffset,
	onOpenDoctorFreeSlots,
	onOpenAddChair,
}: ScheduleFilterStripProps) {
	const activeChairs = chairs.filter((chair) => chair?.active);
	const displayChairs: readonly ScheduleChair[] =
		activeChairs.length > 0 ? activeChairs : DEFAULT_CLINIC_CHAIRS;
	const localNow = new Date();
	const localTodayIso = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, "0")}-${String(localNow.getDate()).padStart(2, "0")}`;
	const todayIso = propsTodayIso || localTodayIso;
	const localTomorrow = new Date(localNow.getTime() + 86400000);
	const tomorrowIso = `${localTomorrow.getFullYear()}-${String(localTomorrow.getMonth() + 1).padStart(2, "0")}-${String(localTomorrow.getDate()).padStart(2, "0")}`;
	const currentDateIso = scheduleDateFilter || todayIso;

	// Branch management (Mandates 8n, 8p: if <= 1 branch, selector is strictly hidden)
	const activeBranches = useMemo(() => {
		return (branches || []).filter((b) => b?.active !== false);
	}, [branches]);
	const hasMultipleBranches = activeBranches.length > 1;

	// Doctor & chair concurrency detection for solo-doctor & 1-3 chairs ergonomics (Mandates 8n, 8p)
	const activeDoctors = useMemo(() => {
		return staffMembers.filter(
			(member) =>
				member?.active &&
				(member?.role === "doctor" || member?.role === "owner"),
		);
	}, [staffMembers]);
	const hasMultipleDoctors = activeDoctors.length > 1 && !isSoloDoctor;
	const hasMultipleChairs = displayChairs.length > 1 && !isSoloDoctor;

	// Doctor's on-duty chair detection for 1-click "Моё кресло" filter (StomX / DentalPRO parity, Mandates 8e, 8n)
	const effectiveDoctorIdForMyChair =
		currentDoctorId ||
		scheduleDoctorFilterId ||
		(staffMembers.find(
			(member) =>
				member?.active &&
				(member?.role === "doctor" || member?.role === "owner"),
		)?.id ?? null);

	const myChair = useMemo(() => {
		if (displayChairs.length === 0) return null;

		// 1. If chairDoctorAssignments are provided, look for chair bound to effective doctor
		if (chairDoctorAssignments && effectiveDoctorIdForMyChair) {
			const assignedChairId = Object.keys(chairDoctorAssignments).find(
				(cId) =>
					chairDoctorAssignments[cId]?.doctorId === effectiveDoctorIdForMyChair ||
					chairDoctorAssignments[cId]?.subShifts?.some(
						(s) => s.doctorId === effectiveDoctorIdForMyChair,
					),
			);
			if (assignedChairId) {
				const matching = displayChairs.find((c) => c.id === assignedChairId);
				if (matching) return matching;
			}
		}

		// 2. Fallback to localStorage assignments for this date if present
		if (typeof window !== "undefined" && effectiveDoctorIdForMyChair) {
			const parsed = safeLocalStorageGetJson<Record<string, any> | null>(
				`dente_chair_doctor_assignments_${currentDateIso}`,
				null,
			);
			if (parsed) {
				const assignedChairId = Object.keys(parsed).find(
					(cId) =>
						parsed[cId]?.doctorId === effectiveDoctorIdForMyChair ||
						parsed[cId]?.subShifts?.some(
							// biome-ignore lint/suspicious/noExplicitAny: sub-shift check
							(s: any) => s.doctorId === effectiveDoctorIdForMyChair,
						),
				);
				if (assignedChairId) {
					const matching = displayChairs.find((c) => c.id === assignedChairId);
					if (matching) return matching;
				}
			}
		}

		// 3. Solo doctor or single chair: first chair is always their chair
		if (isSoloDoctor || displayChairs.length === 1) {
			return displayChairs[0] || null;
		}

		// 4. If doctor filter is active, find first chair matching their specialty or default
		if (scheduleDoctorFilterId) {
			const doc = staffMembers.find((m) => m.id === scheduleDoctorFilterId);
			const docTyped = doc as unknown as { specialties?: string[]; specialty?: string } | undefined;
			const docSpecs = docTyped?.specialties || (docTyped?.specialty ? [docTyped.specialty] : []);
			if (docSpecs.length) {
				const specMatch = displayChairs.find(
					(c) => c.specialization && docSpecs.includes(c.specialization),
				);
				if (specMatch) return specMatch;
			}
			return displayChairs[0] || null;
		}

		// 5. If specific current doctor is provided, find first chair matching their specialty or default
		if (currentDoctorId) {
			const doc = staffMembers.find((m) => m.id === currentDoctorId);
			const docTyped = doc as unknown as { specialties?: string[]; specialty?: string } | undefined;
			const docSpecs = docTyped?.specialties || (docTyped?.specialty ? [docTyped.specialty] : []);
			if (docSpecs.length) {
				const specMatch = displayChairs.find(
					(c) => c.specialization && docSpecs.includes(c.specialization),
				);
				if (specMatch) return specMatch;
			}
			return displayChairs[0] || null;
		}

		return null;
	}, [
		displayChairs,
		chairDoctorAssignments,
		effectiveDoctorIdForMyChair,
		currentDateIso,
		isSoloDoctor,
		scheduleDoctorFilterId,
		currentDoctorId,
		staffMembers,
	]);

	const isMyChairActive = Boolean(
		myChair && scheduleChairFilterId === myChair.id,
	);

	const handleSelectMyChair = () => {
		if (onSelectMyChair) {
			onSelectMyChair();
			return;
		}
		if (!myChair) return;

		if (scheduleChairFilterId === myChair.id) {
			// Toggle off back to all chairs
			setScheduleChairFilterId?.(null);
		} else {
			// 1-Click: filter directly to on-duty chair
			setScheduleChairFilterId?.(myChair.id);
			if (effectiveDoctorIdForMyChair && !scheduleDoctorFilterId) {
				setScheduleDoctorFilterId?.(effectiveDoctorIdForMyChair);
			}
		}
	};

	const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
	const [isAddChairModalOpen, setIsAddChairModalOpen] = useState(false);
	const optionsMenuRef = useRef<HTMLDivElement>(null);

	const handleOpenAddChair = () => {
		if (typeof onOpenAddChair === "function") {
			onOpenAddChair();
		} else {
			setIsAddChairModalOpen(true);
		}
	};

	useEffect(() => {
		const handleOutside = (e: MouseEvent) => {
			if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
				setIsOptionsMenuOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsOptionsMenuOpen(false);
			}
		};
		if (isOptionsMenuOpen) {
			document.addEventListener("mousedown", handleOutside);
			document.addEventListener("keydown", handleKeyDown);
		}
		return () => {
			document.removeEventListener("mousedown", handleOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOptionsMenuOpen]);

	// Real selected date formatted as dd.MM.yyyy
	const formattedCurrentDate = (() => {
		const parts = currentDateIso.split("-");
		if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
			return `${parts[2]}.${parts[1]}.${parts[0]}`;
		}
		return currentDateIso;
	})();

	const handleRepeatBookingOffset = (days: 7 | 14 | 30) => {
		if (onQuickBookRepeatOffset) {
			onQuickBookRepeatOffset(days);
		} else {
			const target = new Date(scheduleDateFilter || todayIso);
			target.setDate(target.getDate() + days);
			const targetIso = target.toISOString().slice(0, 10);
			setScheduleDateFilter(targetIso);
			onOpenDoctorFreeSlots?.();
		}
	};

	return {
		todayIso,
		tomorrowIso,
		currentDateIso,
		formattedCurrentDate,
		displayChairs,
		activeBranches,
		hasMultipleBranches,
		activeDoctors,
		hasMultipleDoctors,
		hasMultipleChairs,
		effectiveDoctorIdForMyChair,
		myChair,
		isMyChairActive,
		handleSelectMyChair,
		isOptionsMenuOpen,
		setIsOptionsMenuOpen,
		optionsMenuRef,
		isAddChairModalOpen,
		setIsAddChairModalOpen,
		handleOpenAddChair,
		handleRepeatBookingOffset,
	};
}
