/**
 * Billing1CExportModal.tsx — Master Facade for 1C:Enterprise 8.3 / CommerceML 2.09 Export Modal
 * Decomposed into atomic components <= 120 lines (Mandate 8b).
 */
import React from "react";
import type { Billing1CExportModalProps } from "./one-c/types";
import { useOneCExportModalState } from "./one-c/useOneCExportModalState";
import { OneCExportHeader } from "./one-c/OneCExportHeader";
import { OneCRequisitesStrip } from "./one-c/OneCRequisitesStrip";
import { OneCExportItemsTable } from "./one-c/OneCExportItemsTable";
import { OneCExportXmlPreview } from "./one-c/OneCExportXmlPreview";
import { OneCExportRequisitesTab } from "./one-c/OneCExportRequisitesTab";
import { OneCExportFooter } from "./one-c/OneCExportFooter";

export type { Billing1CExportModalProps };

export function Billing1CExportModal(props: Billing1CExportModalProps): React.ReactElement | null {
	if (!props.isOpen) return null;

	const patientName = props.patientName || "Пациент";
	const patientId = props.patientId || "00000000-0000-0000-0000-000000000001";
	const clinicName = props.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»";
	const clinicInn = props.clinicInn || "";
	const clinicKpp = props.clinicKpp || "770101001";
	const contractNumber = props.contractNumber || "Д-2026/01";
	const doctorName = props.doctorName || "Врач стоматолог";

	const state = useOneCExportModalState({
		items: props.items,
		patientId,
		patientName,
		patientPhone: props.patientPhone || "",
		patientAddress: props.patientAddress || "",
		clinicName,
		clinicInn,
		clinicKpp,
		contractNumber,
		contractDate: props.contractDate,
		initialActNumber: props.actNumber,
		initialDoctorName: doctorName,
		initialTotalRub: props.totalRub,
	});

	return (
		<div
			className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in"
			onClick={props.onClose}
			role="dialog"
			aria-modal="true"
			data-testid="billing-1c-export-modal"
		>
			<div
				className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[var(--paper,#ffffff)] rounded-3xl border border-[var(--border,#cbd5e1)] shadow-2xl overflow-hidden animate-in zoom-in-95"
				onClick={(e) => e.stopPropagation()}
			>
				<OneCExportHeader
					patientName={patientName}
					calculatedTotalRub={state.calculatedTotalRub}
					activeSubTab={state.activeSubTab}
					setActiveSubTab={state.setActiveSubTab}
					itemsCount={props.items.length}
					onClose={props.onClose}
				/>

				<div className="flex-[1_1_auto] min-h-0 overflow-y-auto [overscroll-behavior:contain] p-3 sm:p-6 pb-6 space-y-3 sm:space-y-4">
					<OneCRequisitesStrip
						isEditingRequisites={state.isEditingRequisites}
						setIsEditingRequisites={state.setIsEditingRequisites}
						docType={state.docType}
						setDocType={state.setDocType}
						actNumber={state.actNumber}
						setActNumber={state.setActNumber}
						docDate={state.docDate}
						setDocDate={state.setDocDate}
						customDoctorName={state.customDoctorName}
						setCustomDoctorName={state.setCustomDoctorName}
						todayIso={state.todayIso}
					/>

					{state.activeSubTab === "items" && (
						<OneCExportItemsTable
							items={props.items}
							calculatedTotalRub={state.calculatedTotalRub}
						/>
					)}

					{state.activeSubTab === "xml" && (
						<OneCExportXmlPreview
							generatedXml={state.generatedXml}
							isXmlCopied={state.isXmlCopied}
							handleCopyXml={state.handleCopyXml}
						/>
					)}

					{state.activeSubTab === "requisites" && (
						<OneCExportRequisitesTab
							clinicName={clinicName}
							clinicInn={clinicInn}
							clinicKpp={clinicKpp}
							patientName={patientName}
							patientPhone={props.patientPhone || ""}
							patientInn={props.patientInn || ""}
							selectedContract={state.selectedContract}
							setSelectedContract={state.setSelectedContract}
							selectedContractDate={state.selectedContractDate}
							setSelectedContractDate={state.setSelectedContractDate}
						/>
					)}
				</div>

				<OneCExportFooter
					handleCopyAccountantSummary={state.handleCopyAccountantSummary}
					handleCopyXml={state.handleCopyXml}
					handleDownloadXml={state.handleDownloadXml}
					onClose={props.onClose}
				/>
			</div>
		</div>
	);
}
