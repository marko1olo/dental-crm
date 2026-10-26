/**
 * DENTE POCKET CLINIC — Кабинет пациента в Telegram WebApp (Фасад <= 120 строк).
 */
import React, { memo } from "react";
import "./telegramMiniApp.css";
import {
	CabinetBottomNav,
	CabinetHeader,
	CabinetTaxSheet,
	type PatientAppointment,
	type PatientImagingScan,
	type TelegramCabinetTab,
	type TelegramPatientPortalCabinetProps,
	useTelegramPortalCabinet,
} from "./cabinet";
import { CabinetTabContent } from "./cabinet/CabinetTabContent";

export type { PatientAppointment, PatientImagingScan, TelegramCabinetTab, TelegramPatientPortalCabinetProps };

export const TelegramPatientPortalCabinet: React.FC<TelegramPatientPortalCabinetProps> = memo((props) => {
	const c = useTelegramPortalCabinet(props);

	return (
		<div className="tg-app-container tg-cabinet-root">
			<CabinetHeader
				bonusBalance={c.bonusBalance}
				familyMembers={c.familyMembers}
				activeFamilyMemberId={c.activeFamilyMemberId}
				onSelectFamilyMember={(id) => { c.setActiveFamilyMemberId(id); c.triggerHaptic("light"); }}
				onOpenFinance={() => { c.setActiveTab("finance"); c.triggerHaptic("light"); }}
			/>

			<CabinetTabContent c={c} />

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
				onSelectTab={(t) => { c.setActiveTab(t); c.triggerHaptic("light"); }}
				toothComplaintsCount={c.toothComplaints?.length ?? 0}
			/>
		</div>
	);
});

TelegramPatientPortalCabinet.displayName = "TelegramPatientPortalCabinet";
