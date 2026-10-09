/**
 * DENTE POCKET CLINIC — Полноценный карманный кабинет пациента в Telegram WebApp
 * (DOMAIN: TELEGRAM MINI APPS & PATIENT RETENTION HUB)
 *
 * Канонический тонкий фасад (Thin Master Facade <= 150 строк).
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
				bonusBalance={c.bonusBalance}
				familyMembers={c.familyMembers}
				activeFamilyMemberId={c.activeFamilyMemberId}
				onSelectFamilyMember={(id) => {
					c.setActiveFamilyMemberId(id);
					c.triggerHaptic("light");
				}}
				onOpenFinance={() => {
					c.setActiveTab("finance");
					c.triggerHaptic("light");
				}}
			/>

			{c.activeTab === "teeth" && (
				<CabinetTeethTab
					toothComplaints={c.toothComplaints}
					onSaveToothComplaint={c.handleSaveToothComplaint}
					onRemoveToothComplaint={c.handleRemoveToothComplaint}
					onProceedToBooking={() => c.setActiveTab("appointments")}
				/>
			)}

			{c.activeTab === "appointments" && (
				<CabinetAppointmentsTab
					appointments={c.appointments}
					appointmentFilter={c.appointmentFilter}
					onChangeAppointmentFilter={c.setAppointmentFilter}
					onConfirmAppointment={c.handleConfirmAppointment}
					onBookNew={() => {
						c.setActiveTab("teeth");
						c.triggerHaptic("medium");
					}}
					onTriggerHaptic={c.triggerHaptic}
				/>
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
				isOpen={c.isTaxSheetOpen}
				onClose={() => c.setIsTaxSheetOpen(false)}
				taxYear={c.taxYear}
				onChangeTaxYear={c.setTaxYear}
				payerType={c.payerType}
				onChangePayerType={c.setPayerType}
				payerFullName={c.payerFullName}
				onChangePayerFullName={c.setPayerFullName}
				payerInn={c.payerInn}
				onChangePayerInn={c.setPayerInn}
				payerPassport={c.payerPassport}
				onChangePayerPassport={c.setPayerPassport}
				serviceCode={c.serviceCode}
				onChangeServiceCode={c.setServiceCode}
				isTaxCertGenerated={c.isTaxCertGenerated}
				onGenerateCert={() => c.setIsTaxCertGenerated(true)}
				onResetCert={() => c.setIsTaxCertGenerated(false)}
				calculatedDeduction={c.calculatedDeduction}
				totalYearExpense={c.totalYearExpense}
				taxCopiedNotice={c.taxCopiedNotice}
				onDownloadTaxCert={c.handleDownloadTaxCert}
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
