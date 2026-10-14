import type { Dashboard } from "@dental/shared";
import { Monitor, X } from "lucide-react";
import React from "react";
import { DoctorPayrollModal } from "../components/finance/payroll/DoctorPayrollModal";
import { TimesheetT13Modal } from "../components/payroll/TimesheetT13Modal";
import { TodayQueueBoard } from "../components/schedule/TodayQueueBoard";
import { DoctorShiftCloseModal } from "../components/shift";

export interface ShiftViewModalsProps {
	dashboard?: Dashboard;
	todayIso: string;
	activeDoctorFullName: string;
	// biome-ignore lint/suspicious/noExplicitAny: shift stats
	shiftStats: any;
	cashSummary?: any;
	shiftDoctorsList: readonly any[];
	shiftActiveDoctorId?: string | undefined;
	shiftCompletedServices: readonly any[];
	isPayrollModalOpen: boolean;
	onClosePayrollModal: () => void;
	isTimesheetT13ModalOpen: boolean;
	onCloseTimesheetT13Modal: () => void;
	isShiftCloseModalOpen: boolean;
	onCloseShiftCloseModal: () => void;
	onConfirmCloseShift: () => void;
	isQueueBoardModalOpen: boolean;
	onCloseQueueBoardModal: () => void;
	todayAppointments: readonly any[];
	onUpdateAppointmentStatus?: ((appointmentId: string, newStatus: string) => void) | undefined;
	onSelectAppointment?: ((appId: string) => void) | undefined;
}

export const ShiftViewModals: React.FC<ShiftViewModalsProps> = ({
	dashboard,
	todayIso,
	activeDoctorFullName,
	shiftStats,
	cashSummary,
	shiftDoctorsList,
	shiftActiveDoctorId,
	shiftCompletedServices,
	isPayrollModalOpen,
	onClosePayrollModal,
	isTimesheetT13ModalOpen,
	onCloseTimesheetT13Modal,
	isShiftCloseModalOpen,
	onCloseShiftCloseModal,
	onConfirmCloseShift,
	isQueueBoardModalOpen,
	onCloseQueueBoardModal,
	todayAppointments,
	onUpdateAppointmentStatus,
	onSelectAppointment,
}) => {
	return (
		<>
			{isPayrollModalOpen && (
				<DoctorPayrollModal
					isOpen={isPayrollModalOpen}
					onClose={onClosePayrollModal}
					clinicName={dashboard?.clinicName}
					doctorsList={shiftDoctorsList}
					initialDoctorId={shiftActiveDoctorId}
					initialServices={shiftCompletedServices}
					initialPeriodStart={todayIso}
					initialPeriodEnd={todayIso}
					initialBasePercentage={30}
					useClinicalCategoryRates={true}
				/>
			)}
			{isTimesheetT13ModalOpen && (
				<TimesheetT13Modal
					isOpen={isTimesheetT13ModalOpen}
					onClose={onCloseTimesheetT13Modal}
					clinicName={dashboard?.clinicName}
				/>
			)}
			{isShiftCloseModalOpen && (
				<DoctorShiftCloseModal
					isOpen={isShiftCloseModalOpen}
					onClose={onCloseShiftCloseModal}
					onConfirmClose={onConfirmCloseShift}
					doctorFullName={activeDoctorFullName}
					shiftStats={shiftStats}
					cashSummary={cashSummary}
					clinicName={dashboard?.clinicName ?? ""}
				/>
			)}

			{isQueueBoardModalOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
					role="dialog"
					aria-modal="true"
					data-testid="today-queue-board-modal"
				>
					<div className="bg-[var(--paper-strong)] border border-[var(--glass-border)] text-[var(--ink)] w-full max-w-5xl max-h-[92vh] rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-3 overflow-hidden">
						<div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-2.5">
							<h3 className="m-0 font-bold text-sm sm:text-base text-[var(--ink)] flex items-center gap-2">
								<Monitor size={18} className="text-teal-600" />
								<span>Оперативная доска смены & ТВ-табло холла</span>
							</h3>
							<button
								type="button"
								onClick={onCloseQueueBoardModal}
								className="w-8 h-8 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer"
								aria-label="Закрыть доску очереди"
								data-testid="btn-close-queue-board-modal"
							>
								<X size={18} />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto">
							<TodayQueueBoard
								appointments={todayAppointments as any}
								onStatusChange={(appointmentId, newStatus) => {
									onUpdateAppointmentStatus?.(appointmentId, newStatus);
								}}
								onOpenAppointment={(appId) => {
									onCloseQueueBoardModal();
									onSelectAppointment?.(appId);
								}}
							/>
						</div>
					</div>
				</div>
			)}
		</>
	);
};
