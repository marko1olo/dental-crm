import type { DoctorCompletedServiceItem, DoctorPayrollResult } from "@dental/shared/payroll";

export interface PayrollDoctorOption {
	readonly id: string;
	readonly name: string;
	readonly specialtyId: string;
}

export interface DoctorPayrollTabProps {
	readonly clinicName?: string | undefined;
	readonly doctorsList?: readonly PayrollDoctorOption[] | undefined;
	readonly services?: readonly DoctorCompletedServiceItem[] | undefined;
	readonly onOpenPayrollModal?: () => void;
}

export interface PayrollTabState {
	readonly selectedDoctorId: string;
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly calculationResult: DoctorPayrollResult;
}
