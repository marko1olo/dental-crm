import type { Dashboard } from "@dental/shared";
import React from "react";
import { MobileShiftCockpit } from "../components/shift";

export interface ShiftMobileCockpitWrapProps {
	dashboard?: Dashboard;
	todayIso: string;
	isShiftOpen: boolean;
	onToggleShift: () => void;
	activeDoctorFullName: string;
	// biome-ignore lint/suspicious/noExplicitAny: room
	cabinetName: string;
	// biome-ignore lint/suspicious/noExplicitAny: shift stats
	shiftStats: any;
	mobileAppointments: readonly any[];
	onSelectAppointment?: ((appId: string) => void) | undefined;
	onOpenPatientEmk?: ((patientId: string) => void) | undefined;
	onOpenCashCheckout?: ((patientId: string) => void) | undefined;
	modalsNode: React.ReactNode;
	userRole?: string | undefined;
}

export const ShiftMobileCockpitWrap: React.FC<ShiftMobileCockpitWrapProps> = ({
	dashboard,
	todayIso,
	isShiftOpen,
	onToggleShift,
	activeDoctorFullName,
	cabinetName,
	shiftStats,
	mobileAppointments,
	onSelectAppointment,
	onOpenPatientEmk,
	onOpenCashCheckout,
	modalsNode,
	userRole,
}) => {
	return (
		<div
			className="mobile-shift-cockpit-view-wrapper"
			style={{
				width: "100%",
				maxWidth: "100vw",
				overflowX: "clip",
				paddingBottom: "calc(88px + env(safe-area-inset-bottom, 16px))",
				boxSizing: "border-box",
			}}
			data-testid="shift-view-mobile"
		>
			<MobileShiftCockpit
				isShiftOpen={isShiftOpen}
				onToggleShift={onToggleShift}
				shiftNumber={(dashboard as any)?.shiftNumber ?? 104}
				doctorName={activeDoctorFullName}
				doctorSpecialty={(dashboard as any)?.activeDoctor?.specialty || "Стоматолог-терапевт"}
				cabinetName={cabinetName}
				shiftOpenedAtIso={(dashboard as any)?.shiftOpenedAt || `${todayIso}T08:30:00.000Z`}
				totalAppointmentsCount={shiftStats.totalAppointments}
				completedCount={shiftStats.completedCount}
				inChairCount={shiftStats.inProgressCount}
				totalRevenueRub={shiftStats.totalRevenueRub}
				cashInDrawerRub={Math.round(shiftStats.totalRevenueRub * 0.45)}
				cardSumRub={Math.round(shiftStats.totalRevenueRub * 0.35)}
				sbpSumRub={Math.round(shiftStats.totalRevenueRub * 0.2)}
				doctorCommissionPct={shiftStats.doctorCommissionPct}
				estimatedDoctorPayoutRub={shiftStats.estimatedDoctorPayoutRub}
				appointments={mobileAppointments}
				onSelectAppointment={onSelectAppointment}
				onOpenPatientEmk={onOpenPatientEmk}
				onOpenCashCheckout={onOpenCashCheckout}
				userRole={userRole}
			/>
			{modalsNode}
		</div>
	);
};
