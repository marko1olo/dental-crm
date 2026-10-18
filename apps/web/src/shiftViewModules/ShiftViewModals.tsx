import React from "react";
import type { Dashboard } from "@dental/shared";
import { DoctorPayrollModal } from "../components/finance/payroll/DoctorPayrollModal";
import { TimesheetT13Modal } from "../components/payroll/TimesheetT13Modal";
import { DoctorShiftCloseModal } from "../components/shift";
import { QueueBoardModal } from "./QueueBoardModal";

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
}) => (
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
		<QueueBoardModal
			isOpen={isQueueBoardModalOpen}
			onClose={onCloseQueueBoardModal}
			todayAppointments={todayAppointments}
			onUpdateAppointmentStatus={onUpdateAppointmentStatus}
			onSelectAppointment={onSelectAppointment}
		/>
	</>
);
