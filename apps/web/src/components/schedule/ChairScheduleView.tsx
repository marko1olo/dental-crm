import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import {
	Plus,
	Users,
	Settings2,
	SlidersHorizontal,
	Sun,
	Moon,
	Building2,
	Calendar,
	X,
	XCircle,
	UserCheck,
	Clock,
	Armchair,
} from "lucide-react";
import {
	ScheduleGrid,
	type ScheduleGridProps,
	type ChairDoctorShiftAssignment,
	DEFAULT_SOLO_CHAIR,
	formatDoctorShortName,
} from "./ScheduleGrid";
import {
	DEFAULT_CLINIC_CHAIRS,
	type ScheduleChair,
} from "./ScheduleFilterStrip";
import {
	QuickAddChairModal,
	type QuickAddChairData,
} from "./QuickAddChairModal";
import type { QuickBookingSlotInfo } from "./QuickBookingDrawer";
import { countLabel } from "../../lib/russianPlural";
import { showToast } from "../GlobalToast";

export interface ChairScheduleViewProps {
	dashboard: Dashboard;
	dateKey: string;
	appointments: Appointment[];
	onSlotClick: (slot: QuickBookingSlotInfo) => void;
	onAppointmentClick: (appointment: Appointment) => void;
	patientName?: (
		patients: Dashboard["patients"],
		patientId: string | null,
	) => string;
	formatTime?: (iso: string) => string;
	toDateTimeLocalValue?: (iso: string, timezone?: string | null) => string;
	appointmentLabels?: Record<Appointment["status"], string>;
	selectedChairId?: string | null;
	selectedDoctorId?: string | null;
	chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
	onAssignChairDoctor?:
		| ((
				chairId: string,
				assignment: ChairDoctorShiftAssignment | null,
		  ) => void)
		| undefined;
	onAddChair?: (chairData: QuickAddChairData) => Promise<void> | void;
	onOpenRosterModal?: () => void;
	onSelectChair?: ((chairId: string | null) => void) | undefined;
}

const defaultAppointmentLabels: Record<Appointment["status"], string> = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	arrived: "Прибыл",
	in_treatment: "В кресле",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
};

/**
 * ChairScheduleView — Dedicated dental chair schedule view with StomX & IDENT parity.
 * Features:
 * - Direct chair columns with doctor duty shift badges (morning 08:00–14:00, evening 14:00–20:00, full day)
 * - 1-click slot booking with auto-populated duty doctor
 * - Quick chair addition and on-the-fly chair editing
 * - Mandate 8n: Solo doctor / 1-chair mode with zero friction
 * - Mandate 8e: 0 disabled buttons without guidance
 */
export const ChairScheduleView: React.FC<ChairScheduleViewProps> = ({
	dashboard,
	dateKey,
	appointments,
	onSlotClick,
	onAppointmentClick,
	patientName,
	formatTime,
	toDateTimeLocalValue,
	appointmentLabels,
	selectedChairId,
	selectedDoctorId,
	chairDoctorAssignments,
	onAssignChairDoctor,
	onAddChair,
	onOpenRosterModal,
	onSelectChair,
}) => {
	const [isAddChairOpen, setIsAddChairOpen] = useState(false);
	const [editingChair, setEditingChair] = useState<QuickAddChairData | null>(null);
	const [internalSelectedChairId, setInternalSelectedChairId] = useState<string | null>(
		selectedChairId ?? null,
	);
	const [activeShiftChairId, setActiveShiftChairId] = useState<string | null>(null);
	const [popoverSelectedDocId, setPopoverSelectedDocId] = useState<Record<string, string>>({});
	const popoverRef = useRef<HTMLDivElement | null>(null);

	React.useEffect(() => {
		if (selectedChairId !== undefined) {
			setInternalSelectedChairId(selectedChairId);
		}
	}, [selectedChairId]);

	useEffect(() => {
		if (!activeShiftChairId) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
				setActiveShiftChairId(null);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [activeShiftChairId]);

	const effectiveSelectedChairId =
		selectedChairId !== undefined ? selectedChairId : internalSelectedChairId;

	const handleToggleChairFilter = useCallback(
		(chairId: string) => {
			const nextSelected = effectiveSelectedChairId === chairId ? null : chairId;
			setInternalSelectedChairId(nextSelected);
			if (onSelectChair) {
				onSelectChair(nextSelected);
			}
		},
		[effectiveSelectedChairId, onSelectChair],
	);

	const chairs = dashboard?.clinicSettings?.chairs ?? [];
	const isSoloDoctor = chairs.length <= 1;

	const doctors = useMemo(() => {
		return (dashboard?.clinicSettings?.staff ?? []).filter(
			(s) => s.active && (s.role === "doctor" || s.role === "owner"),
		);
	}, [dashboard?.clinicSettings?.staff]);

	const resolvedPatientName = useMemo(() => {
		return (
			patientName ||
			((_pts: Dashboard["patients"], id: string | null) => id || "Пациент")
		);
	}, [patientName]);

	const resolvedFormatTime = useMemo(() => {
		return formatTime || ((iso: string) => (iso ? iso.slice(11, 16) : ""));
	}, [formatTime]);

	const resolvedToDateTimeLocalValue = useMemo(() => {
		return (
			toDateTimeLocalValue ||
			((iso: string) => (iso ? iso.slice(0, 16) : ""))
		);
	}, [toDateTimeLocalValue]);

	const resolvedAppointmentLabels = useMemo(() => {
		return appointmentLabels || defaultAppointmentLabels;
	}, [appointmentLabels]);

	const handleOpenAddChair = useCallback(() => {
		setEditingChair(null);
		setIsAddChairOpen(true);
	}, []);

	const handleEditChair = useCallback((chair: QuickAddChairData) => {
		setEditingChair(chair);
		setIsAddChairOpen(true);
	}, []);

	const handleSaveChair = useCallback(
		async (data: QuickAddChairData) => {
			if (onAddChair) {
				await onAddChair(data);
			}
			setIsAddChairOpen(false);
			setEditingChair(null);
		},
		[onAddChair],
	);

	const handleAssignShift = useCallback(
		(chair: ScheduleChair, preset: "morning" | "evening" | "full" | "2x2") => {
			const targetDocId =
				popoverSelectedDocId[chair.id] ||
				chairDoctorAssignments?.[chair.id]?.doctorId ||
				(chair as any).defaultDoctorId ||
				doctors[0]?.id;
			const targetDoc = doctors.find((d) => d.id === targetDocId) || doctors[0];

			if (!targetDoc) {
				showToast("Нет доступных врачей: добавьте врача в настройках клиники", "warning");
				setActiveShiftChairId(null);
				return;
			}

			let shiftPreset: "morning" | "evening" | "full" | "two_shifts" = "morning";
			let shiftLabel = "Утро 08-14";
			let shiftHours = "08:00–14:00";
			let startHour = 8;
			let endHour = 14;

			if (preset === "evening") {
				shiftPreset = "evening";
				shiftLabel = "Вечер 14-20";
				shiftHours = "14:00–20:00";
				startHour = 14;
				endHour = 20;
			} else if (preset === "full") {
				shiftPreset = "full";
				shiftLabel = "Весь день";
				shiftHours = "08:00–20:00";
				startHour = 8;
				endHour = 20;
			} else if (preset === "2x2") {
				shiftPreset = "two_shifts";
				shiftLabel = "2 через 2";
				shiftHours = "08:00–20:00";
				startHour = 8;
				endHour = 20;
			}

			const assignment: ChairDoctorShiftAssignment = {
				chairId: chair.id,
				chairName: chair.name,
				doctorId: targetDoc.id,
				doctorName: targetDoc.fullName,
				doctorSpecialty: (targetDoc as any).specialty ? String((targetDoc as any).specialty) : undefined,
				shiftPreset,
				shiftLabel,
				shiftHours,
				startHour,
				endHour,
			};

			if (onAssignChairDoctor) {
				onAssignChairDoctor(chair.id, assignment);
			}

			showToast(
				`Врач назначен на смену: ${formatDoctorShortName(targetDoc.fullName)} • ${shiftLabel} • ${chair.name}`,
				"success",
			);

			setActiveShiftChairId(null);
		},
		[chairDoctorAssignments, doctors, onAssignChairDoctor, popoverSelectedDocId],
	);

	const handleUnassignShift = useCallback(
		(chair: ScheduleChair) => {
			if (onAssignChairDoctor) {
				onAssignChairDoctor(chair.id, null);
			}
			showToast(`Врач снят со смены: кресло «${chair.name}» освобождено`, "info");
			setActiveShiftChairId(null);
		},
		[onAssignChairDoctor],
	);

	return (
		<div className="flex flex-col h-full w-full bg-[var(--paper)]">
			{/* Unified Compact Toolbar Row: 32–36px (Hick's Law & Mandate 8d) */}
			<div
				className="flex items-center justify-between px-3 h-9 min-h-[36px] max-h-[36px] border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-2 select-none"
				data-testid="chair-schedule-palette-strip"
				role="toolbar"
				aria-label="Панель стоматологических установок и смен врачей"
			>
				{/* Left: Установки Counter */}
				<div className="flex items-center gap-1.5 shrink-0">
					<span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] hidden xl:inline">
						Установки:
					</span>
					<span
						className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--teal)]/10 text-[var(--teal-dark)] border border-[var(--teal)]/20 shrink-0"
						data-testid="chair-view-count-badge"
					>
						{countLabel(chairs.length || 1, "кресло", "кресла", "кресел")}
					</span>
					{isSoloDoctor && (
						<span className="text-[10px] text-[var(--muted)] hidden 2xl:inline">
							(Соло: авто-привязка)
						</span>
					)}
				</div>

				{/* Center: Scrollable Chair Palette Chips with Accent Bars (StomX Parity, Feature 190) */}
				<div className="flex items-center gap-1.5 overflow-x-auto flex-1 py-0.5 touch-pan-x">
					{chairs.map((chair) => {
						const chairColor = (chair as { color?: string }).color || "#0d9488";
						const isSelected = effectiveSelectedChairId === chair.id;
						const assignedDocName =
							chairDoctorAssignments?.[chair.id]?.doctorName ||
							((chair as any).defaultDoctorId
								? dashboard?.clinicSettings?.staff?.find(
										(s) => s.id === (chair as any).defaultDoctorId,
								  )?.fullName
								: null);
						const assignedShiftLabel =
							chairDoctorAssignments?.[chair.id]?.shiftLabel ||
							chairDoctorAssignments?.[chair.id]?.shiftHours ||
							null;

						return (
							<div
								key={chair.id}
								onClick={() => handleToggleChairFilter(chair.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleToggleChairFilter(chair.id);
									}
								}}
								tabIndex={0}
								className={`relative px-2 py-1 rounded-lg border text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 shrink-0 shadow-2xs transition-all cursor-pointer select-none text-left h-7 ${
									isSelected
										? "border-[var(--teal)] ring-1 ring-[var(--teal)] bg-[var(--teal-soft)] shadow-sm"
										: "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)]/60"
								}`}
								data-testid={`chair-view-badge-${chair.id}`}
								role="button"
								aria-pressed={isSelected}
								title={`Кресло «${chair.name}» (${(chair as any).roomNumber || (chair as any).room || "Кабинет"})${
									assignedDocName ? ` • Врач: ${assignedDocName}` : ""
								}${assignedShiftLabel ? ` [${assignedShiftLabel}]` : ""}. Клик: ${
									isSelected ? "снять фильтр" : "фильтр по этому креслу"
								}`}
							>
								{/* Accent Color Strip */}
								<div
									className="h-1 w-full absolute top-0 left-0 right-0 rounded-t-lg"
									style={{ backgroundColor: chairColor }}
									data-testid={`chair-view-accent-strip-${chair.id}`}
								/>
								<span
									className={`w-2 h-2 rounded-full shrink-0 transition-transform ${
										isSelected ? "scale-125" : ""
									}`}
									style={{ backgroundColor: chairColor }}
									aria-hidden="true"
								/>
								<span className="font-bold text-xs truncate">{chair.name}</span>
								{assignedDocName && (
									<span className="text-[10px] text-[var(--muted)] font-normal whitespace-nowrap hidden md:inline">
										({assignedDocName}
										{assignedShiftLabel ? ` • ${assignedShiftLabel}` : ""})
									</span>
								)}
								{chair.active === false && (
									<span className="text-[9px] text-[var(--muted)] font-normal">
										(архив)
									</span>
								)}
								{isSelected && (
									<span
										className="px-1 py-0.2 rounded text-[8px] font-extrabold bg-[var(--teal)] text-white uppercase tracking-wider"
										data-testid={`chair-view-badge-selected-${chair.id}`}
									>
										Выбрано
									</span>
								)}

								{/* 1-Click Doctor & Shift Binding Trigger (StomX Parity) */}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setActiveShiftChairId((prev) => (prev === chair.id ? null : chair.id));
									}}
									className="p-1 rounded text-[var(--muted)] hover:text-[var(--teal)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
									title="Назначить врача и смену в 1 клик (StomX / IDENT)"
									data-testid={`chair-view-assign-doctor-${chair.id}`}
									aria-label={`Назначить врача на кресло ${chair.name}`}
								>
									<UserCheck
										size={12}
										className={assignedDocName ? "text-[var(--teal)]" : ""}
									/>
								</button>

								{/* Settings Button */}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										handleEditChair(chair as any);
									}}
									className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
									title={`Настройки кресла «${chair.name}» (смена врача / кабинета)`}
									data-testid={`chair-view-settings-${chair.id}`}
									aria-label={`Настройки кресла ${chair.name}`}
								>
									<Settings2 size={12} />
								</button>

								{/* 1-Click Shift Popover */}
								{activeShiftChairId === chair.id && (
									<div
										ref={popoverRef}
										className="absolute top-full mt-1.5 left-0 z-50 w-72 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl text-[var(--ink)] flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100 cursor-default"
										data-testid={`chair-view-shift-popover-${chair.id}`}
										onClick={(e) => e.stopPropagation()}
									>
										<div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
											<div className="flex items-center gap-1.5 font-bold text-xs">
												<UserCheck size={14} className="text-[var(--teal)]" />
												<span>Врач на кресле «{chair.name}»</span>
											</div>
											<button
												type="button"
												onClick={() => setActiveShiftChairId(null)}
												className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
											>
												<X size={12} />
											</button>
										</div>

										{/* Doctor select list */}
										<div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
											<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
												Выберите врача:
											</span>
											{doctors.map((doc) => {
												const currentDocId =
													popoverSelectedDocId[chair.id] ||
													chairDoctorAssignments?.[chair.id]?.doctorId ||
													(chair as any).defaultDoctorId ||
													doctors[0]?.id;
												const isDocSelected = currentDocId === doc.id;
												return (
													<button
														key={doc.id}
														type="button"
														onClick={() =>
															setPopoverSelectedDocId((prev) => ({
																...prev,
																[chair.id]: doc.id,
															}))
														}
														className={`px-2 py-1 rounded-lg text-xs font-medium text-left flex items-center justify-between transition-colors ${
															isDocSelected
																? "bg-[var(--teal-soft)] text-[var(--teal-dark)] font-bold border border-[var(--teal)]/30"
																: "hover:bg-[var(--paper-soft)] text-[var(--ink)]"
														}`}
														data-testid={`chair-view-doc-option-${chair.id}-${doc.id}`}
													>
														<span className="truncate">{doc.fullName}</span>
														{(doc as any).specialty && (
															<span className="text-[10px] text-[var(--muted)] truncate ml-1 font-normal">
																{String((doc as any).specialty)}
															</span>
														)}
													</button>
												);
											})}
										</div>

										{/* Shift Presets */}
										<div className="flex flex-col gap-1 border-t border-[var(--line)] pt-2">
											<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
												Смена в 1 клик:
											</span>
											<div className="grid grid-cols-2 gap-1.5">
												<button
													type="button"
													onClick={() => handleAssignShift(chair, "morning")}
													className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
													data-testid={`chair-view-shift-morning-${chair.id}`}
												>
													<Sun size={12} className="text-amber-500 shrink-0" />
													<span>Утро 08-14</span>
												</button>
												<button
													type="button"
													onClick={() => handleAssignShift(chair, "evening")}
													className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
													data-testid={`chair-view-shift-evening-${chair.id}`}
												>
													<Moon size={12} className="text-indigo-400 shrink-0" />
													<span>Вечер 14-20</span>
												</button>
												<button
													type="button"
													onClick={() => handleAssignShift(chair, "full")}
													className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
													data-testid={`chair-view-shift-full-${chair.id}`}
												>
													<Clock size={12} className="text-[var(--teal)] shrink-0" />
													<span>Весь день</span>
												</button>
												<button
													type="button"
													onClick={() => handleAssignShift(chair, "2x2")}
													className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
													data-testid={`chair-view-shift-2x2-${chair.id}`}
												>
													<Calendar size={12} className="text-emerald-500 shrink-0" />
													<span>2 через 2</span>
												</button>
											</div>
										</div>

										{/* Unassign action */}
										{chairDoctorAssignments?.[chair.id] && (
											<button
												type="button"
												onClick={() => handleUnassignShift(chair)}
												className="mt-1 px-2 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center gap-1 transition-colors cursor-pointer"
												data-testid={`chair-view-unassign-${chair.id}`}
											>
												<XCircle size={12} />
												<span>Снять врача</span>
											</button>
										)}
									</div>
								)}
							</div>
						);
					})}

					{/* Inline Add Chair Strip Button */}
					<button
						type="button"
						onClick={handleOpenAddChair}
						className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal)]/5 text-[11px] font-medium text-[var(--muted)] hover:text-[var(--teal-dark)] transition-colors shrink-0 cursor-pointer h-7"
						title="Добавить стоматологическую установку"
						data-testid="chair-view-add-chair-strip-btn"
					>
						<Plus size={11} />
						<span>Кресло</span>
					</button>
				</div>

				{/* Right: Actions (Roster & Add Chair) */}
				<div className="flex items-center gap-1.5 shrink-0">
					{onOpenRosterModal && (
						<button
							type="button"
							onClick={onOpenRosterModal}
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[11px] font-semibold text-[var(--ink)] transition-colors cursor-pointer h-7"
							title="График работы врачей по сменам и креслам (StomX / IDENT)"
							data-testid="btn-open-chair-roster"
						>
							<Users size={12} className="text-[var(--teal)]" />
							<span className="hidden sm:inline">График смен</span>
						</button>
					)}

					<button
						type="button"
						onClick={handleOpenAddChair}
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white text-[11px] font-semibold shadow-xs transition-colors cursor-pointer h-7"
						title="Добавить стоматологическую установку"
						data-testid="btn-add-chair-header"
					>
						<Plus size={12} />
						<span className="hidden sm:inline">+ Кресло</span>
					</button>
				</div>
			</div>

			{/* Main Grid */}
			<div className="flex-1 overflow-hidden">
				<ScheduleGrid
					dashboard={dashboard}
					dateKey={dateKey}
					appointments={appointments}
					onSlotClick={onSlotClick}
					onAppointmentClick={onAppointmentClick}
					patientName={resolvedPatientName}
					formatTime={resolvedFormatTime}
					toDateTimeLocalValue={resolvedToDateTimeLocalValue}
					appointmentLabels={resolvedAppointmentLabels}
					selectedChairId={effectiveSelectedChairId}
					selectedDoctorId={selectedDoctorId}
					chairDoctorAssignments={chairDoctorAssignments}
					onAssignChairDoctor={onAssignChairDoctor}
					onOpenAddChair={handleOpenAddChair}
					onAddChair={onAddChair}
					onEditChair={handleEditChair}
				/>
			</div>

			{/* Quick Add / Edit Chair Modal */}
			<QuickAddChairModal
				isOpen={isAddChairOpen}
				onClose={() => {
					setIsAddChairOpen(false);
					setEditingChair(null);
				}}
				onAddChair={handleSaveChair}
				initialData={editingChair}
				onUpdateChair={handleSaveChair}
				existingChairsCount={chairs.length}
				branches={(dashboard?.clinicSettings as any)?.branches ?? []}
				doctors={(dashboard?.clinicSettings?.staff ?? []).filter(
					(s) => s.active && (s.role === "doctor" || s.role === "owner"),
				)}
			/>
		</div>
	);
};

export default ChairScheduleView;
