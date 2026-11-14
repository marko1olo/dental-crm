import React from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import { DoctorPayrollStudioModal } from "../components/payroll/DoctorPayrollStudioModal";
import { DoctorShiftCloseModal } from "../components/shift";
import type { DoctorShiftCashSummary, DoctorShiftStats } from "../components/shift";
import { QueueBoardModal } from "./QueueBoardModal";
import type { ShiftCloseSummary } from "./shiftViewTypes";

export interface ShiftViewModalsProps {
	dashboard?: Dashboard;
	todayIso: string;
	activeDoctorFullName: string;
	shiftStats: DoctorShiftStats;
	cashSummary?: DoctorShiftCashSummary | undefined;
	shiftDoctorsList: readonly { readonly id: string; readonly name?: string; readonly fullName?: string; readonly specialty?: string }[];
	shiftActiveDoctorId?: string | undefined;
	shiftCompletedServices: readonly unknown[];
	isPayrollModalOpen: boolean;
	onClosePayrollModal: () => void;
	isTimesheetT13ModalOpen?: boolean;
	onCloseTimesheetT13Modal?: () => void;
	isShiftCloseModalOpen: boolean;
	onCloseShiftCloseModal: () => void;
	onConfirmCloseShift: (summary?: ShiftCloseSummary) => void;
	isQueueBoardModalOpen: boolean;
	onCloseQueueBoardModal: () => void;
	todayAppointments: readonly (Partial<Appointment> & Record<string, unknown>)[];
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
			<DoctorPayrollStudioModal
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
