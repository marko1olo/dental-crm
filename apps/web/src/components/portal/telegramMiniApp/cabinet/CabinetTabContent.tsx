import React from "react";
import { CabinetTeethTab } from "./CabinetTeethTab";
import { CabinetAppointmentsTab } from "./CabinetAppointmentsTab";
import { CabinetImagingTab } from "./CabinetImagingTab";
import { CabinetTaxTab } from "./CabinetTaxTab";
import { CabinetFinanceTab } from "./CabinetFinanceTab";
import { TelegramMiniAppBooking } from "../TelegramMiniAppBooking";
import type { useTelegramPortalCabinet } from "./useTelegramPortalCabinet";

interface CabinetTabContentProps {
	c: ReturnType<typeof useTelegramPortalCabinet>;
}

export const CabinetTabContent: React.FC<CabinetTabContentProps> = ({ c }) => {
	switch (c.activeTab) {
		case "teeth":
			return (
				<CabinetTeethTab
					toothComplaints={c.toothComplaints}
					onSaveToothComplaint={c.handleSaveToothComplaint}
					onRemoveToothComplaint={c.handleRemoveToothComplaint}
					onProceedToBooking={() => c.setActiveTab("booking")}
				/>
			);
		case "appointments":
			return (
				<CabinetAppointmentsTab
					appointments={c.appointments}
					appointmentFilter={c.appointmentFilter}
					onChangeAppointmentFilter={c.setAppointmentFilter}
					onConfirmAppointment={c.handleConfirmAppointment}
					onBookNew={() => { c.setActiveTab("booking"); c.triggerHaptic("medium"); }}
					onTriggerHaptic={c.triggerHaptic}
				/>
			);
		case "booking":
			return (
				<main className="tg-tab-content">
					<TelegramMiniAppBooking
						organizationId={c.organizationId}
						patientId={c.patientId}
						attachedComplaints={c.toothComplaints}
						onBackToTeeth={() => c.setActiveTab("teeth")}
						onBookingComplete={(_id, appt) => {
							if (appt) c.handleAddBookedAppointment(appt);
							c.setActiveTab("appointments");
							c.triggerHaptic("medium");
						}}
					/>
				</main>
			);
		case "imaging":
			return (
				<CabinetImagingTab
					imagingList={c.imagingList}
					selectedScanId={c.selectedScanId}
					onSelectScanId={c.setSelectedScanId}
					zoomLevel={c.zoomLevel}
					onZoomChange={c.setZoomLevel}
					isInverted={c.isInverted}
					onToggleInvert={() => c.setIsInverted((v) => !v)}
					showDoctorNotes={c.showDoctorNotes}
					onToggleDoctorNotes={() => c.setShowDoctorNotes((v) => !v)}
					onShare={c.handleShareReferral}
					onTriggerHaptic={c.triggerHaptic}
				/>
			);
		case "tax":
			return (
				<CabinetTaxTab
					taxYear={c.taxYear}
					totalYearExpense={c.totalYearExpense}
					calculatedDeduction={c.calculatedDeduction}
					onOpenTaxSheet={() => { c.setIsTaxSheetOpen(true); c.triggerHaptic("medium"); }}
				/>
			);
		case "finance":
			return (
				<CabinetFinanceTab
					bonusBalance={c.bonusBalance}
					depositBalance={c.depositBalance}
					isDemo={c.isDemo}
					onShareReferral={c.handleShareReferral}
				/>
			);
		default:
			return null;
	}
};
