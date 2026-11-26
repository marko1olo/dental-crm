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
	const patientName = props.patientName || "Пациент";
	const patientId = props.patientId || "00000000-0000-0000-0000-000000000001";
	const clinicName = props.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»";
	const clinicInn = props.clinicInn || "";
	const clinicKpp = props.clinicKpp || "770101001";
	const contractNumber = props.contractNumber || "Д-2026/01";
	const doctorName = props.doctorName || "Врач стоматолог";

	const state = useOneCExportModalState({
		isOpen: props.isOpen,
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

	if (!props.isOpen) return null;

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
					itemsCount={state.effectiveItems.length}
					onClose={props.onClose}
				/>

				<div className="flex-[1_1_auto] min-h-0 overflow-y-auto [overscroll-behavior:contain] p-3 sm:p-6 pb-6 space-y-3 sm:space-y-4">
					{props.items.length === 0 && (
						<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-wrap items-center justify-between gap-2 text-xs">
							<div className="flex flex-wrap items-center gap-2">
								<span className="font-medium text-[var(--ink)]">Период 1С CommerceML:</span>
								<input
									type="date"
									value={state.startDateIso}
									onChange={(e) => state.setStartDateIso(e.target.value)}
									aria-label="Дата начала периода 1С"
									className="h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
								/>
								<span className="text-[var(--ink-muted)]">—</span>
								<input
									type="date"
									value={state.endDateIso}
									onChange={(e) => state.setEndDateIso(e.target.value)}
									aria-label="Дата окончания периода 1С"
									className="h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
								/>
							</div>
							<div className="flex items-center gap-2">
								{state.serverSha256 && (
									<span className="text-[11px] font-mono text-[var(--ink-muted)]" title={state.serverSha256}>
										SHA-256: {state.serverSha256.slice(0, 10)}...
									</span>
								)}
								<button
									type="button"
									onClick={() => void state.loadServerCommerceMl(state.startDateIso, state.endDateIso)}
									className="h-8 px-2.5 rounded-md text-xs font-medium bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer shrink-0"
									data-testid="btn-load-server-1c-commerceml"
								>
									{state.serverExportLoading ? "Загрузка..." : "Обновить из БД"}
								</button>
							</div>
							{state.serverExportError && (
								<div className="w-full text-[var(--danger)]">{state.serverExportError}</div>
							)}
						</div>
					)}

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
							items={state.effectiveItems}
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
