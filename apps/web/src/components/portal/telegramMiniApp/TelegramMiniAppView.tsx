/**
 * DENTE POCKET CLINIC — Telegram WebApp Mini App (Coordinator Facade <= 120 lines)
 * (DOMAIN: TELEGRAM MINI APPS & PATIENT RETENTION HUB)
 */

import React, { memo } from "react";
import "./telegramMiniApp.css";
import { TelegramInteractiveToothPicker } from "./TelegramInteractiveToothPicker";
import { TelegramMiniAppBooking } from "./TelegramMiniAppBooking";
import { TelegramPatientPortalCabinet, type TelegramCabinetTab } from "./TelegramPatientPortalCabinet";
import { TelegramMiniAppTopHeader } from "./TelegramMiniAppTopHeader";
import { TelegramMiniAppBottomNav } from "./TelegramMiniAppBottomNav";
import { TelegramEmrTab } from "./TelegramEmrTab";
import { useTelegramMiniAppState } from "./useTelegramMiniAppState";

export type TelegramTab = "teeth" | "odontogram" | "booking" | "emr" | "cabinet" | "appointments" | "imaging" | "tax" | "finance";

export interface TelegramMiniAppViewProps {
	readonly organizationId?: string | null | undefined;
	readonly initialTab?: TelegramTab;
	readonly patientId?: string | null | undefined;
}

export const TelegramMiniAppView: React.FC<TelegramMiniAppViewProps> = memo(({
	organizationId: propOrgId,
	initialTab,
	patientId: propPatientId,
}) => {
	const state = useTelegramMiniAppState(initialTab);

	if (["cabinet", "teeth", "appointments", "imaging", "tax", "finance"].includes(state.activeTab)) {
		return (
			<TelegramPatientPortalCabinet
				organizationId={propOrgId}
				patientId={propPatientId}
				initialTab={state.activeTab === "cabinet" ? "appointments" : (state.activeTab as TelegramCabinetTab)}
				initialTaxSheetOpen={state.isTaxSheetRequested}
				onBack={() => state.setActiveTab("odontogram")}
			/>
		);
	}

	return (
		<div className="tg-app-container">
			<TelegramMiniAppTopHeader
				patientName={state.patientName}
				bonusPoints={1500}
				familyMembers={state.familyMembers}
				activeFamilyMemberId={state.activeFamilyMemberId}
				onSelectFamilyMember={(id) => { state.setActiveFamilyMemberId(id); state.triggerHaptic("light"); }}
			/>

			{state.activeTab === "odontogram" && (
				<main className="tg-tab-content">
					<TelegramInteractiveToothPicker
						selectedComplaints={state.toothComplaints}
						onSaveComplaint={(c) => state.setToothComplaints((prev) => [...prev.filter((x) => x.toothNumber !== c.toothNumber), c])}
						onRemoveComplaint={(t) => state.setToothComplaints((prev) => prev.filter((x) => x.toothNumber !== t))}
						onProceedToBooking={() => state.setActiveTab("booking")}
					/>
				</main>
			)}

			{state.activeTab === "booking" && (
				<main className="tg-tab-content">
					<TelegramMiniAppBooking
						organizationId={propOrgId}
						patientId={propPatientId}
						attachedComplaints={state.toothComplaints}
						onBackToTeeth={() => state.setActiveTab("odontogram")}
					/>
				</main>
			)}

			{state.activeTab === "emr" && (
				<TelegramEmrTab
					npsScore={state.npsScore}
					npsSubmitted={state.npsSubmitted}
					onRateNps={(s) => { state.setNpsScore(s); state.setNpsSubmitted(true); state.triggerHaptic("light"); }}
					onShareReferral={() => {
						state.triggerHaptic("medium");
						const link = `https://t.me/DenteClinicBot?start=ref_${propPatientId || "friend"}`;
						const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Дарю 1000 ₽ в DENTE")}`;
						if ((window as any).Telegram?.WebApp?.openTelegramLink) (window as any).Telegram.WebApp.openTelegramLink(url);
						else window.open(url, "_blank");
					}}
				/>
			)}

			<TelegramMiniAppBottomNav
				activeTab={state.activeTab}
				complaintsCount={state.toothComplaints.length}
				onSelectTab={(tab) => { state.setActiveTab(tab); state.triggerHaptic("light"); }}
			/>
		</div>
	);
});

TelegramMiniAppView.displayName = "TelegramMiniAppView";
