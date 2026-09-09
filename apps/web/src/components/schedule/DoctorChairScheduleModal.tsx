/**
 * DENTE Dental CRM — Doctor-to-Chair Schedule Assignment Modal (DoctorChairScheduleModal.tsx)
 *
 * StomX / DentalPRO Parity:
 * - 1-Click shift assignment (Morning 08–14, Morning-9 09–15, Evening 14–20, Evening-15 15–21, Full 08–20, 2 Shifts)
 * - 1-Click multi-day rotation templates (2/2, 5/2, Even/Odd, Full week)
 * - Solo Doctor & Small Clinic Sovereignty (Mandate 8n): 1-click default anchor button
 * - Mandate 8e: Doctor Autonomy (0 disabled buttons, non-blocking flow)
 * - Mandate 8d: Apple HIG & Medical Density (touch targets >= 44x44px, 0 cartoon emojis)
 * - Anti-Matryoshka Sin 6: Modal depth strictly 1 (inline doctor addition without nested dialogs)
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
	Armchair,
	Calendar,
	CalendarRange,
	Check,
	Clock,
	RotateCcw,
	Sparkles,
	Stethoscope,
	Trash2,
	User,
	UserPlus,
	X,
	Zap,
} from "lucide-react";
import {
	CHAIR_SHIFT_PRESETS,
	type ChairDoctorShiftAssignment,
	type ChairDoctorSubShift,
	type ChairShiftPresetId,
	DEFAULT_SOLO_CHAIR,
	formatDoctorShortName,
} from "./chairRosterMath";
import {
	QUICK_DOCTOR_SPECIALTIES,
	DOCTOR_COLOR_PRESETS,
	type QuickAddDoctorData,
} from "./QuickAddDoctorModal";
import type { DentalSpecialty } from "@dental/shared";
import { specialtyLabels } from "../../workspaceUiLabels";
import { showToast } from "../GlobalToast";

export interface DoctorChairScheduleModalProps {
	isOpen: boolean;
	onClose: () => void;
	chair: {
		id: string;
		name: string;
		roomNumber?: string | null | undefined;
		room?: string | null | undefined;
	} | null;
	chairs?: readonly {
		id: string;
		name: string;
		roomNumber?: string | null | undefined;
		room?: string | null | undefined;
	}[] | undefined;
	doctors: Array<{
		id: string;
		fullName: string;
		name?: string | undefined;
		shortName?: string | undefined;
		role?: string | undefined;
		specialties?: string[] | undefined;
		color?: string | undefined;
		preferredChairId?: string | null | undefined;
	}>;
	dateKey: string;
	currentAssignment?: ChairDoctorShiftAssignment | null | undefined;
	onAssign: (
		chairId: string,
		assignment: ChairDoctorShiftAssignment | null,
	) => void;
	onAssignDateRange?: ((params: {
		chairId: string;
		doctorId: string;
		shiftPreset: string;
		startDate: string;
		endDate: string;
	}) => void) | undefined;
	onAddDoctor?: ((doctor: QuickAddDoctorData) => Promise<void> | void) | undefined;
	isSoloDoctor?: boolean | undefined;
}

export const DoctorChairScheduleModal: React.FC<DoctorChairScheduleModalProps> = ({
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
	isSoloDoctor = false,
}) => {
	const activeChair = chair || chairs[0] || DEFAULT_SOLO_CHAIR;
	const [activeTab, setActiveTab] = useState<"day" | "range">("day");

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
	const [rangeRotationPreset, setRangeRotationPreset] = useState<
		"morning" | "evening" | "full" | "two_two" | "five_day"
	>("full");

	// Inline Quick Doctor Form (Anti-Matryoshka Sin 6: inline, zero nested modal)
	const [isInlineDoctorFormOpen, setIsInlineDoctorFormOpen] = useState(false);
	const [newDocName, setNewDocName] = useState("");
	const [newDocSpecialty, setNewDocSpecialty] = useState<DentalSpecialty>("therapist");
	const [newDocColor, setNewDocColor] = useState<string>("#0d9488");

	// Synchronize when assignment or chair changes
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
			// Fallback to day assignment if range callback is omitted
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

	if (!isOpen) return null;

	const hasActiveAssignment = Boolean(currentAssignment && currentAssignment.doctorId);

	return (
		<div
			className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="chair-doctor-modal-title"
			data-testid="chair-doctor-assignment-modal"
		>
			<div
				className="bg-[var(--paper,#ffffff)] border-2 border-[var(--teal,#0d9488)] rounded-3xl p-4 sm:p-6 shadow-2xl max-w-lg w-full space-y-4 animate-in zoom-in-95 duration-150 text-[var(--ink,#0f172a)]"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Modal Header Strip */}
				<div className="flex items-center justify-between gap-3 border-b border-[var(--line,#e2e8f0)] pb-3">
					<div className="flex items-center gap-2.5">
						<div className="w-10 h-10 rounded-2xl bg-[var(--teal-soft,#ccfbf1)] border border-[var(--teal,#0d9488)]/30 flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
							<Armchair size={20} />
						</div>
						<div className="min-w-0">
							<h3
								id="chair-doctor-modal-title"
								className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] truncate leading-tight"
							>
								Закрепление врача за установкой
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)] truncate mt-0.5">
								{activeChair.name} · {dateKey}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
						aria-label="Закрыть окно назначения"
						data-testid="btn-close-chair-doctor-modal"
						style={{ minHeight: "44px", minWidth: "44px" }}
					>
						<X size={18} />
					</button>
				</div>

				{/* Solo Doctor Fast Anchor Card (Mandate 8n) */}
				{isSoloDoctor && doctors.length > 0 && (
					<div
						className="p-3 rounded-2xl bg-[var(--teal-soft,#f0fdfa)] border border-[var(--teal,#0d9488)]/40 flex items-center justify-between gap-3"
						data-testid="solo-doctor-quick-anchor-card"
					>
						<div className="flex items-center gap-2">
							<Zap className="w-5 h-5 text-[var(--teal,#0d9488)] shrink-0" />
							<div>
								<span className="text-xs font-bold text-[var(--ink,#0f172a)] block">
									Соло-врач (1 клик):
								</span>
								<span className="text-[11px] text-[var(--muted,#64748b)]">
									Закрепить {formatDoctorShortName(doctors[0]?.fullName || "Врача")} на весь день
								</span>
							</div>
						</div>
						<button
							type="button"
							onClick={handleSoloDoctorQuickAnchor}
							className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
							data-testid="btn-solo-doctor-quick-anchor"
							style={{ minHeight: "44px" }}
						>
							<Check size={15} />
							<span>Закрепить меня</span>
						</button>
					</div>
				)}

				{/* Mode Tabs: Day vs Date Range (StomX / DentalPRO parity) */}
				<div className="flex p-1 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
					<button
						type="button"
						onClick={() => setActiveTab("day")}
						className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
							activeTab === "day"
								? "bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line,#e2e8f0)]"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						data-testid="tab-schedule-day"
						style={{ minHeight: "44px" }}
					>
						<Clock size={15} />
						<span>На выбранный день</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("range")}
						className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
							activeTab === "range"
								? "bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line,#e2e8f0)]"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						data-testid="tab-schedule-range"
						style={{ minHeight: "44px" }}
					>
						<CalendarRange size={15} />
						<span>На диапазон дат (2/2, 5/2)</span>
					</button>
				</div>

				{/* TAB 1: DAY SHIFT ASSIGNMENT */}
				{activeTab === "day" && (
					<div className="space-y-4">
						{/* Shift Presets Grid */}
						<div>
							<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1.5">
								Режим смены (1 тап):
							</label>
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
								{CHAIR_SHIFT_PRESETS.map((preset) => {
									const isSelected = selectedShiftPreset === preset.id;
									return (
										<button
											key={preset.id}
											type="button"
											onClick={() => setSelectedShiftPreset(preset.id)}
											className={`min-h-[44px] p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
												isSelected
													? "border-[var(--teal,#0d9488)] bg-[var(--teal-dark,#0f766e)] text-white shadow-xs font-bold"
													: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]"
											}`}
											data-testid={`shift-preset-${preset.id}`}
											style={{ minHeight: "44px" }}
										>
											<span className="text-xs font-bold">{preset.label}</span>
											<span
												className={`text-[10px] ${
													isSelected ? "text-white/85" : "text-[var(--muted,#64748b)]"
												}`}
											>
												{preset.hours}
											</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* Doctor Select: Single vs Two Shifts */}
						{selectedShiftPreset === "two_shifts" ? (
							<div className="space-y-3">
								{/* Morning Doctor */}
								<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2">
									<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
										Врач на утренней смене (08:00–14:00)
									</label>
									<select
										value={selectedDoctorId}
										onChange={(e) => setSelectedDoctorId(e.target.value)}
										className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs font-bold outline-hidden focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
										data-testid="select-chair-doctor"
										style={{ minHeight: "44px" }}
									>
										<option value="">-- Выберите врача на утро --</option>
										{doctors.map((d) => (
											<option key={d.id} value={d.id}>
												{d.fullName} {d.role ? `(${d.role})` : ""}
											</option>
										))}
									</select>
									{/* Quick pills */}
									{doctors.length > 1 && (
										<div className="flex flex-wrap gap-1.5" data-testid="doctor-quick-switch-pills">
											{doctors.map((d) => {
												const isSel = selectedDoctorId === d.id;
												const sName = formatDoctorShortName(d.fullName || d.name || "Врач");
												return (
													<button
														key={d.id}
														type="button"
														onClick={() => setSelectedDoctorId(d.id)}
														className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
															isSel
																? "bg-[var(--teal-dark,#0f766e)] text-white border-[var(--teal,#0d9488)] shadow-xs"
																: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:border-[var(--teal,#0d9488)]"
														}`}
														data-testid={`btn-quick-select-doctor-${d.id}`}
														title={d.fullName}
														style={{ minHeight: "44px" }}
													>
														<User size={13} className={isSel ? "text-white" : "text-[var(--teal,#0d9488)]"} />
														<span>{sName}</span>
													</button>
												);
											})}
										</div>
									)}
								</div>

								{/* Evening Doctor */}
								<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2">
									<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
										Врач на вечерней смене (14:00–20:00)
									</label>
									<select
										value={selectedEveningDoctorId}
										onChange={(e) => setSelectedEveningDoctorId(e.target.value)}
										className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs font-bold outline-hidden focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
										data-testid="select-chair-evening-doctor"
										style={{ minHeight: "44px" }}
									>
										<option value="">-- Выберите врача на вечер --</option>
										{doctors.map((d) => (
											<option key={d.id} value={d.id}>
												{d.fullName} {d.role ? `(${d.role})` : ""}
											</option>
										))}
									</select>
									{/* Quick pills */}
									{doctors.length > 1 && (
										<div className="flex flex-wrap gap-1.5" data-testid="evening-doctor-quick-switch-pills">
											{doctors.map((d) => {
												const isSel = selectedEveningDoctorId === d.id;
												const sName = formatDoctorShortName(d.fullName || d.name || "Врач");
												return (
													<button
														key={d.id}
														type="button"
														onClick={() => setSelectedEveningDoctorId(d.id)}
														className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
															isSel
																? "bg-[var(--teal-dark,#0f766e)] text-white border-[var(--teal,#0d9488)] shadow-xs"
																: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:border-[var(--teal,#0d9488)]"
														}`}
														data-testid={`btn-quick-select-evening-doctor-${d.id}`}
														title={d.fullName}
														style={{ minHeight: "44px" }}
													>
														<User size={13} className={isSel ? "text-white" : "text-[var(--teal,#0d9488)]"} />
														<span>{sName}</span>
													</button>
												);
											})}
										</div>
									)}
								</div>
							</div>
						) : (
							<div>
								<div className="flex items-center justify-between mb-1.5">
									<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
										Врач на смене:
									</label>
									<button
										type="button"
										onClick={() => setIsInlineDoctorFormOpen((prev) => !prev)}
										className="min-h-[44px] text-xs font-bold text-[var(--teal,#0d9488)] hover:underline flex items-center gap-1 cursor-pointer"
										style={{ minHeight: "44px" }}
									>
										<UserPlus size={14} />
										<span>{isInlineDoctorFormOpen ? "Скрыть форму" : "+ Новый врач"}</span>
									</button>
								</div>

								{/* Inline Doctor Add Panel (Anti-Matryoshka Sin 6) */}
								{isInlineDoctorFormOpen && (
									<div
										className="p-3 mb-3 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--teal,#0d9488)]/40 space-y-2.5 animate-in fade-in"
										data-testid="inline-quick-add-doctor-form"
									>
										<span className="text-xs font-bold text-[var(--ink,#0f172a)] block">
											Быстрое добавление врача без модалок:
										</span>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
											<input
												type="text"
												placeholder="ФИО врача (например: Смирнов В.А.)"
												value={newDocName}
												onChange={(e) => setNewDocName(e.target.value)}
												className="min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] font-medium outline-hidden focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
												data-testid="inline-doctor-fullname-input"
												style={{ minHeight: "44px" }}
											/>
											<select
												value={newDocSpecialty}
												onChange={(e) => setNewDocSpecialty(e.target.value as DentalSpecialty)}
												className="min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] font-medium outline-hidden focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
												style={{ minHeight: "44px" }}
											>
												{QUICK_DOCTOR_SPECIALTIES.map((sp) => (
													<option key={sp.id} value={sp.id}>
														{sp.label}
													</option>
												))}
											</select>
										</div>
										<button
											type="button"
											onClick={handleInlineDoctorSubmit}
											className="min-h-[44px] px-4 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
											data-testid="inline-doctor-submit-btn"
											style={{ minHeight: "44px" }}
										>
											<Check size={14} />
											<span>Сохранить и выбрать</span>
										</button>
									</div>
								)}

								<select
									value={selectedDoctorId}
									onChange={(e) => setSelectedDoctorId(e.target.value)}
									className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] text-xs font-bold outline-hidden focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
									data-testid="select-chair-doctor"
									style={{ minHeight: "44px" }}
								>
									<option value="">-- Выберите врача --</option>
									{doctors.map((d) => (
										<option key={d.id} value={d.id}>
											{d.fullName} {d.role ? `(${d.role})` : ""}
										</option>
									))}
								</select>

								{/* Quick switch pills */}
								{doctors.length > 1 && (
									<div className="mt-2 space-y-1">
										<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">
											Быстрый выбор врача (1 тап):
										</span>
										<div className="flex flex-wrap gap-1.5" data-testid="doctor-quick-switch-pills">
											{doctors.map((d) => {
												const isSel = selectedDoctorId === d.id;
												const sName = formatDoctorShortName(d.fullName || d.name || "Врач");
												return (
													<button
														key={d.id}
														type="button"
														onClick={() => setSelectedDoctorId(d.id)}
														className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 select-none ${
															isSel
																? "bg-[var(--teal-dark,#0f766e)] text-white border-[var(--teal,#0d9488)] shadow-xs"
																: "bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:border-[var(--teal,#0d9488)] hover:bg-[var(--paper,#ffffff)]"
														}`}
														data-testid={`btn-quick-select-doctor-${d.id}`}
														title={d.fullName}
														style={{ minHeight: "44px" }}
													>
														<User size={13} className={isSel ? "text-white" : "text-[var(--teal,#0d9488)]"} />
														<span>{sName}</span>
													</button>
												);
											})}
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				)}

				{/* TAB 2: DATE RANGE & ROTATION TEMPLATES */}
				{activeTab === "range" && (
					<div className="space-y-3.5">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
							<div>
								<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1">
									С даты:
								</label>
								<input
									type="date"
									value={rangeStartDate}
									onChange={(e) => setRangeStartDate(e.target.value)}
									className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--ink,#0f172a)]"
									style={{ minHeight: "44px" }}
								/>
							</div>
							<div>
								<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1">
									По дату:
								</label>
								<input
									type="date"
									value={rangeEndDate}
									onChange={(e) => setRangeEndDate(e.target.value)}
									className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--ink,#0f172a)]"
									style={{ minHeight: "44px" }}
								/>
							</div>
						</div>

						<div>
							<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1.5">
								Шаблон графика (StomX / DentalPRO):
							</label>
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
								{[
									{ id: "five_day", label: "Пятидневка Пн–Пт", sub: "08:00–20:00" },
									{ id: "two_two", label: "График 2/2", sub: "Чередование" },
									{ id: "full", label: "Каждый день", sub: "Без выходных" },
									{ id: "morning", label: "1 см. 08–14", sub: "Утренний пул" },
									{ id: "evening", label: "2 см. 14–20", sub: "Вечерний пул" },
								].map((tpl) => {
									const isSelected = rangeRotationPreset === tpl.id;
									return (
										<button
											key={tpl.id}
											type="button"
											onClick={() => setRangeRotationPreset(tpl.id as any)}
											className={`min-h-[44px] p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
												isSelected
													? "border-[var(--teal,#0d9488)] bg-[var(--teal-dark,#0f766e)] text-white shadow-xs font-bold"
													: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]"
											}`}
											style={{ minHeight: "44px" }}
										>
											<span className="text-xs font-bold">{tpl.label}</span>
											<span
												className={`text-[10px] ${
													isSelected ? "text-white/85" : "text-[var(--muted,#64748b)]"
												}`}
											>
												{tpl.sub}
											</span>
										</button>
									);
								})}
							</div>
						</div>
					</div>
				)}

				{/* Modal Footer Actions */}
				<div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--line,#e2e8f0)]">
					{hasActiveAssignment ? (
						<button
							type="button"
							onClick={handleUnassign}
							className="min-h-[44px] px-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
							data-testid="btn-unassign-chair-doctor"
							title="Снять назначение врача с кресла (Мандат 8e)"
							style={{ minHeight: "44px" }}
						>
							<Trash2 size={15} />
							<span>Снять назначение</span>
						</button>
					) : (
						<div />
					)}
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] text-xs font-bold transition-colors cursor-pointer"
							style={{ minHeight: "44px" }}
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={activeTab === "day" ? handleConfirmDayAssignment : handleConfirmDateRange}
							className="min-h-[44px] px-5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
							data-testid="btn-confirm-chair-doctor"
							style={{ minHeight: "44px" }}
						>
							<Check size={16} />
							<span>Закрепить за креслом</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DoctorChairScheduleModal;
