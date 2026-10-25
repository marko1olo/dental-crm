/**
 * PayoutModalWrapper.tsx — Обертка модального окна расчета сдельной ведомости врача.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import React from "react";
import { DoctorPayrollModal } from "../../components/finance/payroll/DoctorPayrollModal.js";
import { doctorServicesForPayrollModal, mapRoleToSpecialtyId } from "./payoutHelpers.js";
import type { DoctorPayoutReport, DoctorPayoutRow } from "./types.js";

export interface PayoutModalWrapperProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName: string;
	readonly doctor: DoctorPayoutRow | null;
	readonly report: DoctorPayoutReport | null;
	readonly allReportDoctors: readonly { id: string; name: string; specialtyId: string }[];
}

export const PayoutModalWrapper: React.FC<PayoutModalWrapperProps> = ({
	isOpen,
	onClose,
	clinicName,
	doctor,
	report,
	allReportDoctors,
}) => {
	if (!isOpen) return null;

	const doctorsList = allReportDoctors.length > 0
		? allReportDoctors
		: (doctor ? [{
				id: doctor.doctorUserId,
				name: doctor.doctorName,
				specialtyId: mapRoleToSpecialtyId(doctor.role),
		  }] : []);

	return (
		<DoctorPayrollModal
			isOpen={isOpen}
			onClose={onClose}
			clinicName={clinicName}
			initialDoctorId={doctor?.doctorUserId}
			initialServices={doctor ? doctorServicesForPayrollModal(doctor) : undefined}
			initialBasePercentage={doctor?.commissionPct ?? undefined}
			initialPeriodStart={report?.period ? report.period.from.slice(0, 10) : undefined}
			initialPeriodEnd={report?.period ? report.period.to.slice(0, 10) : undefined}
			doctorsList={doctorsList}
		/>
	);
};
