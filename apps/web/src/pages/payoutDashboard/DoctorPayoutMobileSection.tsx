/**
 * DoctorPayoutMobileSection.tsx — Мобильный вид экрана выплат врачам (Apple HIG).
 * Mandate 8b: строго <= 120 строк на файл.
 */

import React from "react";
import { DoctorPayoutMobileWallet } from "../../components/finance/DoctorPayoutMobileWallet";
import { DoctorPayrollModal } from "../../components/finance/payroll/DoctorPayrollModal";
import { DoctorSelectionNotice } from "./DoctorSelectionNotice.js";
import { doctorServicesForPayrollModal, mapRoleToSpecialtyId } from "./payoutHelpers.js";
import type { DoctorPayoutReport, DoctorPayoutRow } from "./types.js";

export interface DoctorPayoutMobileSectionProps {
	readonly state: { kind: string; message?: string; action?: string };
	readonly month: string;
	readonly monthLabel: string;
	readonly report: DoctorPayoutReport | null;
	readonly canEditRates: boolean;
	readonly onMonthChange: (month: string) => void;
	readonly onRefresh: () => void;
	readonly payrollModalDoctor: DoctorPayoutRow | null;
	readonly setPayrollModalDoctor: (doc: DoctorPayoutRow | null) => void;
	readonly showNotice: boolean;
	readonly onCloseNotice: () => void;
}

export const DoctorPayoutMobileSection: React.FC<DoctorPayoutMobileSectionProps> = ({
	state,
	month,
	monthLabel,
	report,
	canEditRates,
	onMonthChange,
	onRefresh,
	payrollModalDoctor,
	setPayrollModalDoctor,
	showNotice,
	onCloseNotice,
}) => {
	if (state.kind === "needs_staff_login") {
		return (
			<div className="doctor-wallet-container">
				<h3 className="doctor-wallet-title">Выплаты врачам</h3>
				<p className="ops-notice" role="status">
					Выплаты не показаны: нет входа сотрудника. {state.message} Войдите в рабочий кабинет клиники и подтвердите себя PIN-кодом — после этого расчёт откроется.
				</p>
			</div>
		);
	}
	if (state.kind === "failed") {
		return (
			<div className="doctor-wallet-container">
				<h3 className="doctor-wallet-title">Выплаты врачам</h3>
				<p className="ops-notice ops-notice--error" role="alert">
					Расчёт выплат за {monthLabel} не выполнен. {state.message} {state.action}
				</p>
			</div>
		);
	}
	return (
		<>
			{showNotice && <DoctorSelectionNotice onClose={onCloseNotice} />}
			<DoctorPayoutMobileWallet
				report={report}
				month={month}
				onMonthChange={onMonthChange}
				onRefresh={onRefresh}
				onOpenPayrollModal={(doc) => {
					onCloseNotice();
					setPayrollModalDoctor(doc);
				}}
				canEditRates={canEditRates}
				isLoading={state.kind === "loading"}
			/>
			{payrollModalDoctor && (
				<DoctorPayrollModal
					isOpen={Boolean(payrollModalDoctor)}
					onClose={() => setPayrollModalDoctor(null)}
					initialDoctorId={payrollModalDoctor.doctorUserId}
					initialServices={doctorServicesForPayrollModal(payrollModalDoctor)}
					initialBasePercentage={payrollModalDoctor.commissionPct ?? undefined}
					initialPeriodStart={report?.period ? report.period.from.slice(0, 10) : undefined}
					initialPeriodEnd={report?.period ? report.period.to.slice(0, 10) : undefined}
					doctorsList={[{
						id: payrollModalDoctor.doctorUserId,
						name: payrollModalDoctor.doctorName,
						specialtyId: mapRoleToSpecialtyId(payrollModalDoctor.role),
					}]}
				/>
			)}
		</>
	);
};
