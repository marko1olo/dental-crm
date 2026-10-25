/**
 * apps/web/src/components/settings/clinic/TaxationAndFiscalizationCard.tsx
 *
 * Facade <= 120 lines.
 */

import type React from "react";
import { FiscalAgentSettings } from "./taxationModules/FiscalAgentSettings";
import { KktConnectionCard } from "./taxationModules/KktConnectionCard";
import type { TaxationSystem } from "./taxationModules/TaxationCardTypes";
import { TaxSystemSelector } from "./taxationModules/TaxSystemSelector";
import { TaxationCardHeader } from "./taxationModules/TaxationCardHeader";
import { useClinicFiscalSettings } from "./taxationModules/useClinicFiscalSettings";

export type { TaxationSystem };

export const TaxationAndFiscalizationCard: React.FC = () => {
	const {
		activeTaxation,
		setActiveTaxation,
		ofdProvider,
		setOfdProvider,
		ffdVersion,
		setFfdVersion,
		autoSendReceipt,
		setAutoSendReceipt,
		allowAutonomousBuffer,
		setAllowAutonomousBuffer,
		cashBoxName,
		setCashBoxName,
		kkmModel,
		setKkmModel,
		kkmSerialNumber,
		setKkmSerialNumber,
		branchId,
		setBranchId,
		kkmActive,
		setKkmActive,
		agentSign,
		setAgentSign,
		isLoading,
		isSaving,
		saveStatus,
		setSaveStatus,
		saveTaxation,
	} = useClinicFiscalSettings();

	const markDirty = () => setSaveStatus("idle");

	return (
		<article
			style={{ padding: "20px" }}
			className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 space-y-4 shadow-xs"
			data-testid="taxation-and-fiscalization-card"
		>
			{/* Кассовый чек ({ffdVersion}) */}
			<TaxationCardHeader
				ffdVersion={ffdVersion}
				kkmModel={kkmModel}
				saveStatus={saveStatus}
				isLoading={isLoading}
				isSaving={isSaving}
				onSave={saveTaxation}
			/>

			<TaxSystemSelector
				activeTaxation={activeTaxation}
				onSelectTaxation={(sys) => {
					setActiveTaxation(sys);
					markDirty();
				}}
			/>

			<KktConnectionCard
				kkmActive={kkmActive}
				kkmModel={kkmModel}
				kkmSerialNumber={kkmSerialNumber}
				branchId={branchId}
				cashBoxName={cashBoxName}
				onToggleKkmActive={(v) => { setKkmActive(v); markDirty(); }}
				onChangeKkmModel={(v) => { setKkmModel(v); markDirty(); }}
				onChangeSerialNumber={(v) => { setKkmSerialNumber(v); markDirty(); }}
				onChangeBranch={(v) => { setBranchId(v); markDirty(); }}
				onChangeCashBoxName={(v) => { setCashBoxName(v); markDirty(); }}
			/>

			<FiscalAgentSettings
				ofdProvider={ofdProvider}
				ffdVersion={ffdVersion}
				autoSendReceipt={autoSendReceipt}
				allowAutonomousBuffer={allowAutonomousBuffer}
				agentSign={agentSign}
				onChangeOfdProvider={(v) => { setOfdProvider(v); markDirty(); }}
				onChangeFfdVersion={(v) => { setFfdVersion(v); markDirty(); }}
				onToggleAutoSendReceipt={(v) => { setAutoSendReceipt(v); markDirty(); }}
				onToggleAutonomousBuffer={(v) => { setAllowAutonomousBuffer(v); markDirty(); }}
				onChangeAgentSign={(v) => { setAgentSign(v); markDirty(); }}
			/>
		</article>
	);
};
