import React, { useState, useCallback } from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import { Plus, Users, Settings2, SlidersHorizontal } from "lucide-react";
import {
	ScheduleGrid,
	type ScheduleGridProps,
	type ChairDoctorShiftAssignment,
	DEFAULT_SOLO_CHAIR,
} from "./ScheduleGrid";
import {
	QuickAddChairModal,
	type QuickAddChairData,
} from "./QuickAddChairModal";
import type { QuickBookingSlotInfo } from "./QuickBookingDrawer";
import { countLabel } from "../../lib/russianPlural";

export interface ChairScheduleViewProps {
	dashboard: Dashboard;
	dateKey: string;
	appointments: Appointment[];
	onSlotClick: (slot: QuickBookingSlotInfo) => void;
	onAppointmentClick: (appointment: Appointment) => void;
	patientName: (
		patients: Dashboard["patients"],
		patientId: string | null,
	) => string;
	formatTime: (iso: string) => string;
	toDateTimeLocalValue: (iso: string, timezone?: string | null) => string;
	appointmentLabels: Record<Appointment["status"], string>;
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

	React.useEffect(() => {
		if (selectedChairId !== undefined) {
			setInternalSelectedChairId(selectedChairId);
		}
	}, [selectedChairId]);

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

	return (
		<div className="flex flex-col h-full w-full bg-[var(--paper)]">
			{/* Chair View Action Bar */}
			<div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-3">
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
						Стоматологические установки:
					</span>
					<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--teal)]/10 text-[var(--teal-dark)] border border-[var(--teal)]/20">
						{countLabel(chairs.length || 1, "кресло", "кресла", "кресел")}
					</span>
					{isSoloDoctor && (
						<span className="text-xs text-[var(--muted)] hidden sm:inline">
							(Режим соло-врача: автоматическая привязка)
						</span>
					)}
				</div>

				<div className="flex items-center gap-2">
					{onOpenRosterModal && (
						<button
							type="button"
							onClick={onOpenRosterModal}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] transition-colors cursor-pointer"
							title="График работы врачей по сменам и креслам (StomX / IDENT)"
							data-testid="btn-open-chair-roster"
						>
							<Users size={14} className="text-[var(--teal)]" />
							<span>График смен</span>
						</button>
					)}

					<button
						type="button"
						onClick={handleOpenAddChair}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
						title="Добавить или настроить стоматологическую установку"
						data-testid="btn-add-chair-header"
					>
						<Plus size={14} />
						<span>+ Кресло</span>
					</button>
				</div>
			</div>

			{/* Chair Palettes Strip with top accent bars for quick multi-chair orientation (StomX Parity, Feature 190) */}
			{chairs.length > 0 && (
				<div
					className="flex items-center gap-2 overflow-x-auto px-4 py-1.5 border-b border-[var(--line)] bg-[var(--paper)] shrink-0 touch-pan-x"
					data-testid="chair-schedule-palette-strip"
					role="toolbar"
					aria-label="Список кресел с цветовой дифференциацией"
				>
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
								className={`relative px-3 py-1.5 rounded-xl border text-xs font-bold text-[var(--ink)] flex items-center gap-2 shrink-0 border-t-4 shadow-2xs transition-all overflow-hidden cursor-pointer select-none text-left ${
									isSelected
										? "border-[var(--teal)] ring-2 ring-[var(--teal)]/40 bg-[var(--teal-soft)] shadow-sm"
										: "border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal)]/60"
								}`}
								style={{ borderTopColor: chairColor }}
								data-testid={`chair-view-badge-${chair.id}`}
								role="button"
								aria-pressed={isSelected}
								title={`Кресло «${chair.name}» (${(chair as any).roomNumber || (chair as any).room || "Кабинет"})${
									assignedDocName ? ` • Врач: ${assignedDocName}` : ""
								}. Клик: ${isSelected ? "снять фильтр" : "фильтр по этому креслу"}`}
							>
								<div
									className="h-1.5 w-full absolute top-0 left-0 right-0"
									style={{ backgroundColor: chairColor }}
									data-testid={`chair-view-accent-strip-${chair.id}`}
								/>
								<span
									className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-xs transition-transform ${
										isSelected ? "scale-125" : ""
									}`}
									style={{ backgroundColor: chairColor }}
									aria-hidden="true"
								/>
								<div className="min-w-0 flex items-center gap-1.5">
									<span className="truncate max-w-[140px] font-bold">{chair.name}</span>
									{assignedDocName && (
										<span className="text-[10px] text-[var(--muted)] font-normal truncate max-w-[100px] hidden md:inline">
											({assignedDocName})
										</span>
									)}
								</div>
								{chair.active === false && (
									<span className="text-[10px] text-[var(--muted)] font-normal">
										(архив)
									</span>
								)}
								{isSelected && (
									<span
										className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[var(--teal)] text-white uppercase tracking-wider"
										data-testid={`chair-view-badge-selected-${chair.id}`}
									>
										Выбрано
									</span>
								)}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										handleEditChair(chair as any);
									}}
									className="ml-1 p-1 rounded-md text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
									title={`Настройки кресла «${chair.name}» (смена врача / кабинета)`}
									data-testid={`chair-view-settings-${chair.id}`}
									aria-label={`Настройки кресла ${chair.name}`}
								>
									<Settings2 size={12} />
								</button>
							</div>
						);
					})}
				</div>
			)}

			{/* Main Grid */}
			<div className="flex-1 overflow-hidden">
				<ScheduleGrid
					dashboard={dashboard}
					dateKey={dateKey}
					appointments={appointments}
					onSlotClick={onSlotClick}
					onAppointmentClick={onAppointmentClick}
					patientName={patientName}
					formatTime={formatTime}
					toDateTimeLocalValue={toDateTimeLocalValue}
					appointmentLabels={appointmentLabels}
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
