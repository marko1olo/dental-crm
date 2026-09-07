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
}) => {
	const [isAddChairOpen, setIsAddChairOpen] = useState(false);
	const [editingChair, setEditingChair] = useState<QuickAddChairData | null>(null);

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
					selectedChairId={selectedChairId}
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
			/>
		</div>
	);
};

export default ChairScheduleView;
