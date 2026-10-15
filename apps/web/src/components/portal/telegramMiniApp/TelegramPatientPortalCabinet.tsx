/**
 * DENTE POCKET CLINIC — Кабинет пациента в Telegram WebApp (Фасад <= 135 строк).
 */
import React, { memo } from "react";
import "./telegramMiniApp.css";
import {
	CabinetAppointmentsTab,
	CabinetBottomNav,
	CabinetFinanceTab,
	CabinetHeader,
	CabinetImagingTab,
	CabinetTaxSheet,
	CabinetTaxTab,
	CabinetTeethTab,
	type PatientAppointment,
	type PatientImagingScan,
	type TelegramCabinetTab,
	type TelegramPatientPortalCabinetProps,
	useTelegramPortalCabinet,
} from "./cabinet";
import { TelegramMiniAppBooking } from "./TelegramMiniAppBooking";

export type {
	PatientAppointment,
	PatientImagingScan,
	TelegramCabinetTab,
	TelegramPatientPortalCabinetProps,
};

export const TelegramPatientPortalCabinet: React.FC<TelegramPatientPortalCabinetProps> = memo((props) => {
	const c = useTelegramPortalCabinet(props);

	return (
		<div className="tg-app-container tg-cabinet-root">
			<CabinetHeader
				bonusBalance={c.bonusBalance} familyMembers={c.familyMembers}
				activeFamilyMemberId={c.activeFamilyMemberId}
				onSelectFamilyMember={(id) => { c.setActiveFamilyMemberId(id); c.triggerHaptic("light"); }}
				onOpenFinance={() => { c.setActiveTab("finance"); c.triggerHaptic("light"); }}
			/>

			{c.activeTab === "teeth" && (
				<CabinetTeethTab
					toothComplaints={c.toothComplaints}
					onSaveToothComplaint={c.handleSaveToothComplaint}
					onRemoveToothComplaint={c.handleRemoveToothComplaint}
					onProceedToBooking={() => c.setActiveTab("booking")}
				/>
			)}

			{c.activeTab === "appointments" && (
				<CabinetAppointmentsTab
					appointments={c.appointments} appointmentFilter={c.appointmentFilter}
					onChangeAppointmentFilter={c.setAppointmentFilter}
					onConfirmAppointment={c.handleConfirmAppointment}
					onBookNew={() => { c.setActiveTab("booking"); c.triggerHaptic("medium"); }}
					onTriggerHaptic={c.triggerHaptic}
				/>
			)}

			{c.activeTab === "booking" && (
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
			)}

			{c.activeTab === "imaging" && (
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
			)}

			{c.activeTab === "tax" && (
				<CabinetTaxTab
					taxYear={c.taxYear}
					totalYearExpense={c.totalYearExpense}
					calculatedDeduction={c.calculatedDeduction}
					onOpenTaxSheet={() => {
						c.setIsTaxSheetOpen(true);
						c.triggerHaptic("medium");
					}}
				/>
			)}

			{c.activeTab === "finance" && (
				<CabinetFinanceTab
					bonusBalance={c.bonusBalance}
					depositBalance={c.depositBalance}
					isDemo={c.isDemo}
					onShareReferral={c.handleShareReferral}
				/>
			)}

			<CabinetTaxSheet
				isOpen={c.isTaxSheetOpen} onClose={() => c.setIsTaxSheetOpen(false)}
				taxYear={c.taxYear} onChangeTaxYear={c.setTaxYear}
				payerType={c.payerType} onChangePayerType={c.setPayerType}
				payerFullName={c.payerFullName} onChangePayerFullName={c.setPayerFullName}
				payerInn={c.payerInn} onChangePayerInn={c.setPayerInn}
				payerPassport={c.payerPassport} onChangePayerPassport={c.setPayerPassport}
				serviceCode={c.serviceCode} onChangeServiceCode={c.setServiceCode}
				isTaxCertGenerated={c.isTaxCertGenerated}
				onGenerateCert={() => c.setIsTaxCertGenerated(true)}
				onResetCert={() => c.setIsTaxCertGenerated(false)}
				calculatedDeduction={c.calculatedDeduction} totalYearExpense={c.totalYearExpense}
				taxCopiedNotice={c.taxCopiedNotice} onDownloadTaxCert={c.handleDownloadTaxCert}
				onTriggerHaptic={c.triggerHaptic}
			/>

			<CabinetBottomNav
				activeTab={c.activeTab}
				onSelectTab={c.setActiveTab}
				toothComplaintsCount={c.toothComplaints.length}
				onTriggerHaptic={c.triggerHaptic}
			/>
		</div>
	);
});

TelegramPatientPortalCabinet.displayName = "TelegramPatientPortalCabinet";
