import React from "react";
import type { DoctorShiftCashSummary } from "./DoctorShiftCloseModal";
import { printEncashmentStatement } from "./shiftPrintStatements";
import { DoctorShiftCashHeader } from "./cashSection/DoctorShiftCashHeader";
import { DoctorShiftCashChannelsGrid } from "./cashSection/DoctorShiftCashChannelsGrid";
import { DoctorShiftEncashmentControls } from "./cashSection/DoctorShiftEncashmentControls";
import { DoctorShiftEarningsCard } from "./cashSection/DoctorShiftEarningsCard";

export interface DoctorShiftCashSectionProps {
	readonly cashSummary?: DoctorShiftCashSummary | undefined;
	readonly totalRevenueRub: number;
	readonly doctorCommissionPct: number;
	readonly estimatedDoctorPayoutRub: number;
	readonly doctorFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly onPrintStatement?: (() => void) | undefined;
	readonly className?: string | undefined;
	readonly userRole?: string | undefined;
	readonly completedPatientsCount?: number | undefined;
	readonly totalAppointmentsCount?: number | undefined;
}

export const DoctorShiftCashSection: React.FC<DoctorShiftCashSectionProps> = ({
	cashSummary,
	totalRevenueRub,
	doctorCommissionPct,
	estimatedDoctorPayoutRub,
	doctorFullName = "Лечащий врач",
	clinicName = "ООО «Денте Стоматология»",
	onPrintStatement,
	className = "",
	userRole = "doctor",
	completedPatientsCount = 0,
	totalAppointmentsCount = 0,
}) => {
	const isStaffManager =
		userRole === "administrator" ||
		userRole === "cashier" ||
		userRole === "owner" ||
		userRole === "manager";

	// Clinical Doctor Perspective: strictly personal earnings and work output.
	// ZERO safe encashments, ZERO cash drawer change floats (Role Separation Principle).
	if (!isStaffManager) {
		return (
			<DoctorShiftEarningsCard
				totalRevenueRub={totalRevenueRub}
				doctorCommissionPct={doctorCommissionPct}
				estimatedDoctorPayoutRub={estimatedDoctorPayoutRub}
				doctorFullName={doctorFullName}
				completedPatientsCount={completedPatientsCount}
				totalAppointmentsCount={totalAppointmentsCount}
				onPrintStatement={onPrintStatement}
				className={className}
			/>
		);
	}

	// Administrator / Owner Perspective: Clinic cashier operations and safe encashment.
	const cashRub = cashSummary?.cashRub ?? 0;
	const cardRub = cashSummary?.cardRub ?? 0;
	const sbpRub = cashSummary?.sbpRub ?? 0;
	const depositRub = cashSummary?.depositRub ?? 0;
	const effectiveTotalRub =
		cashSummary?.totalRevenueRub ??
		((cashRub + cardRub + sbpRub + depositRub) > 0
			? (cashRub + cardRub + sbpRub + depositRub)
			: totalRevenueRub);

	const handleDefaultPrint = () => {
		if (onPrintStatement) {
			onPrintStatement();
			return;
		}

		printEncashmentStatement({
			doctorFullName,
			clinicName: clinicName || "Стоматологическая клиника",
			encashmentAmount: cashRub,
			effectiveTotalRub,
			cashRub,
			cardRub,
			sbpRub,
			depositRub,
			doctorCommissionPct,
			estimatedDoctorPayoutRub,
		});
	};

	return (
		<section
			className={`doctor-shift-cash-section ${className}`.trim()}
			aria-label="Касса смены и инкассация"
			style={{
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: "12px",
				padding: "16px",
				boxShadow: "var(--shadow-1)",
				display: "flex",
				flexDirection: "column",
				gap: "14px",
			}}
			data-testid="doctor-shift-cash-section"
		>
			<DoctorShiftCashHeader onPrintStatement={handleDefaultPrint} />
			<DoctorShiftCashChannelsGrid
				cashRub={cashRub}
				cardRub={cardRub}
				sbpRub={sbpRub}
				depositRub={depositRub}
			/>
			<DoctorShiftEncashmentControls
				cashRub={cashRub}
				effectiveTotalRub={effectiveTotalRub}
			/>
		</section>
	);
};
