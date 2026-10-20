/**
 * apps/web/src/components/settings/InsuranceContractsPanel.tsx
 *
 * Договоры ДМС клиники: страховые компании и процент покрытия по категориям
 * услуг. Вкладка «Настройки → Страховые», покрытие применяется в сравнительном
 * конструкторе смет.
 *
 * Decomposed under Mandates 8b (<= 500 lines) & 8d (zero cartoon emojis) into
 * modular components in `./insuranceModules/`.
 */

import { ShieldCheck } from "lucide-react";
import type React from "react";
import { panelStateText } from "../../lib/panelStateText";
import { PanelLoadFailure } from "../PanelLoadFailure";
import { InsuranceContractModal } from "./insurance/InsuranceContractModal";
import { InsuranceContractList } from "./insuranceModules/InsuranceContractList";
import { InsuranceContractsHeader } from "./insuranceModules/InsuranceContractsHeader";
import { InsuranceDmsTariffTable } from "./insuranceModules/InsuranceDmsTariffTable";
import { InsuranceGuaranteeLettersList } from "./insuranceModules/InsuranceGuaranteeLettersList";
import { useInsuranceContractsController } from "./insuranceModules/useInsuranceContractsController";
import { INSURANCE_CONTRACTS_PANEL_SUBJECT } from "./insuranceContractsPanelData";
import { SettingsModuleDisabled } from "./SettingsModuleDisabled";
import { INSURANCE_CONTRACTS_GATE } from "./settingsModuleGate";

export const InsuranceContractsPanel: React.FC = () => {
	const {
		insuranceEnabled,
		contracts,
		guaranteeLetters,
		loadState,
		fetchContracts,
		handleExportRegistry,
		showModal,
		setShowModal,
		openAddModal,
		openEditModal,
		editingContract,
		formData,
		setFormData,
		isSaving,
		handleSave,
		handleDeactivate,
	} = useInsuranceContractsController();

	if (!insuranceEnabled) {
		return <SettingsModuleDisabled gate={INSURANCE_CONTRACTS_GATE} />;
	}

	return (
		<div
			className="py-1"
			style={{ color: "var(--ink)" }}
			data-testid="insurance-contracts-panel"
		>
			{/* Header with XML/CSV Registry Export and Add Contract */}
			<InsuranceContractsHeader
				onExportRegistry={(format) => void handleExportRegistry(format)}
				onOpenAddModal={openAddModal}
			/>

			{/* Three states: Failed, Loading, or Ready (Empty / List) */}
			{loadState.phase === "failed" ? (
				<PanelLoadFailure
					subject={INSURANCE_CONTRACTS_PANEL_SUBJECT}
					status={loadState.status}
					onRetry={() => void fetchContracts()}
				/>
			) : loadState.phase === "loading" ? (
				<div
					className="p-12 text-center"
					style={{ color: "var(--muted)" }}
					role="status"
					aria-live="polite"
				>
					{
						panelStateText(INSURANCE_CONTRACTS_PANEL_SUBJECT, {
							phase: "loading",
						}).title
					}
				</div>
			) : contracts.length === 0 ? (
				<div
					className="rounded-2xl p-12 text-center border"
					style={{
						borderColor: "var(--line)",
						background: "var(--paper-soft)",
						color: "var(--muted)",
					}}
				>
					<ShieldCheck
						size={40}
						strokeWidth={1}
						className="opacity-40 mb-3 mx-auto"
					/>
					<p
						className="m-0 text-base font-semibold"
						style={{ color: "var(--ink)" }}
					>
						{INSURANCE_CONTRACTS_PANEL_SUBJECT.emptyTitle}
					</p>
					<p className="mt-1.5 mb-0 text-xs" style={{ color: "var(--muted)" }}>
						{INSURANCE_CONTRACTS_PANEL_SUBJECT.emptyHint}
					</p>
				</div>
			) : (
				<div className="flex flex-col gap-3">
					{/* Grouped list of insurance contracts */}
					<InsuranceContractList
						contracts={contracts}
						guaranteeLetters={guaranteeLetters}
						onEditContract={openEditModal}
						onDeactivateContract={(c) => void handleDeactivate(c)}
					/>

					{/* 804n statutory nomenclature category coverage & multipliers */}
					<InsuranceDmsTariffTable contracts={contracts} />

					{/* Active Guarantee Letters attached to patients */}
					<InsuranceGuaranteeLettersList letters={guaranteeLetters} />
				</div>
			)}

			{/* Add/Edit Modal */}
			<InsuranceContractModal
				isOpen={showModal}
				isSaving={isSaving}
				editingContract={editingContract}
				formData={formData}
				setFormData={setFormData}
				onClose={() => setShowModal(false)}
				onSave={handleSave}
			/>
		</div>
	);
};
