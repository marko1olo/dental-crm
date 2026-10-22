/**
 * EgiszRemdModalBody.tsx — Renders active tab panel for EGISZ REMD and FNS Hub Modal.
 * Mandate 8b compliant (<= 120 lines).
 */

import React from "react";
import type { EgiszRemdModalBodyProps } from "./modalBodyTypes";
import {
	EgiszClinicalTab,
	EgiszFnsTaxTab,
	EgiszJournalTab,
	EgiszPreflightTab,
	EgiszSigningTab,
	EgiszXmlPreviewTab,
} from "../tabs";

export const EgiszRemdModalBody: React.FC<EgiszRemdModalBodyProps> = ({
	activeTab, activeDocType, state, crypto, isSending, signaturePreviewMode,
	onSignaturePreviewModeChange, collapsedSections, onToggleSection, records,
	journalFilter, onJournalFilterChange, selectedJournalId, onSelectJournalId,
	isLoadingJournal, onBatchZipExport, onSingleZipExport, onSignJournalDocument,
	onExportJournalZip, onSwitchToSignatureTab, onRefreshOutbox, onBatchSendShift,
	onSendToRegistry, onQueueDeferred, onPrint, onDownloadXml, onValidateCdaXml,
	onExportCurrentPackageZip, onCopyXml,
}) => {
	return (
		<div className="egisz-modal-body" style={{ flex: 1, overflowY: "auto", padding: "1.25rem", minHeight: 0 }}>
			{activeTab === "clinical" && activeDocType === "cda_semd" && (
				<EgiszClinicalTab
					semdDocCode={state.semdDocCode} onSemdDocCodeChange={state.setSemdDocCode}
					patient={state.patient} onPatientChange={state.setPatient}
					doctor={state.doctor} onDoctorChange={state.setDoctor}
					complaints={state.complaints} onComplaintsChange={state.setComplaints}
					anamnesisMorbi={state.anamnesisMorbi} onAnamnesisMorbiChange={state.setAnamnesisMorbi}
					selectedTooth={state.selectedTooth} onSelectTooth={state.setSelectedTooth}
					toothStates={state.toothStates} onUpdateToothStatus={state.handleUpdateToothStatus}
					diagnoses={state.diagnoses} onAddDiagnosis={state.handleAddDiagnosis}
					onRemoveDiagnosis={state.handleRemoveDiagnosis} procedures={state.procedures}
					onAddProcedure={state.handleAddProcedure} onRemoveProcedure={state.handleRemoveProcedure}
				/>
			)}
			{activeTab === "tax_deduction" && activeDocType === "fns_tax" && (
				<EgiszFnsTaxTab
					taxDocNumber={state.taxDocNumber} onTaxDocNumberChange={state.setTaxDocNumber}
					taxYear={state.taxYear} onTaxYearChange={state.setTaxYear}
					taxSignerName={state.taxSignerName} onTaxSignerNameChange={state.setTaxSignerName}
					taxpayerName={state.taxpayerName} onTaxpayerNameChange={state.setTaxpayerName}
					taxpayerInn={state.taxpayerInn} onTaxpayerInnChange={state.setTaxpayerInn}
					taxpayerSnils={state.taxpayerSnils} onTaxpayerSnilsChange={state.setTaxpayerSnils}
					taxPatientName={state.taxPatientName} onTaxPatientNameChange={state.setTaxPatientName}
					taxRelCode={state.taxRelCode} onTaxRelCodeChange={state.setTaxRelCode}
					taxPatientSnils={state.taxPatientSnils} onTaxPatientSnilsChange={state.setTaxPatientSnils}
					taxPayments={state.taxPayments} onAddTaxPayment={state.handleAddTaxPayment}
					onRemoveTaxPayment={state.handleRemoveTaxPayment}
					onUpdateTaxPaymentDate={(idx, date) => state.setTaxPayments((prev) => prev.map((p, i) => (i === idx ? { ...p, date } : p)))}
					onUpdateTaxPaymentServiceCode={(idx, code) => state.setTaxPayments((prev) => prev.map((p, i) => (i === idx ? { ...p, serviceCode: code } : p)))}
					onUpdateTaxPaymentDescription={(idx, desc) => state.setTaxPayments((prev) => prev.map((p, i) => (i === idx ? { ...p, serviceDescription: desc } : p)))}
					onUpdateTaxPaymentAmount={state.handleUpdateTaxPaymentAmount}
				/>
			)}
			{activeTab === "preflight" && <EgiszPreflightTab preflightReport={state.activePreflight} />}
			{activeTab === "signature" && (
				<EgiszSigningTab
					signaturePreviewMode={signaturePreviewMode} onSignaturePreviewModeChange={onSignaturePreviewModeChange}
					selectedCert={crypto.selectedCert} onSelectCert={crypto.setSelectedCert}
					availableCerts={crypto.availableCerts} isSigning={crypto.isSigning} isSending={isSending}
					isCheckingCerts={crypto.isCheckingCerts} doctorSig={crypto.doctorSig || null} moSig={crypto.moSig || null}
					onSignDocument={crypto.handleSignDocument} onSignMoDocument={crypto.handleSignMoDocument}
					onSendToRegistry={onSendToRegistry} onQueueDeferred={onQueueDeferred}
					onUploadDetachedSig={crypto.handleUploadDetachedSig} onUploadDetachedMoSig={crypto.handleUploadDetachedMoSig}
					onRefreshCerts={crypto.refreshCerts} onPrint={onPrint} onDownloadXml={onDownloadXml}
					onValidateCdaXml={onValidateCdaXml} doctor={state.doctor} clinic={state.clinic}
					generatedXml={state.generatedXml} form043uHtml={state.printableHtml}
				/>
			)}
			{activeTab === "xml_preview" && (
				<EgiszXmlPreviewTab
					generatedXml={state.generatedXml} xmlValidation={state.xmlValidation}
					onValidateCdaXml={onValidateCdaXml} onDownloadXml={onDownloadXml}
					onExportCurrentPackageZip={onExportCurrentPackageZip} onSendToRegistry={onSendToRegistry}
					onCopyXml={onCopyXml} isSending={isSending} collapsedSections={collapsedSections}
					onToggleSection={onToggleSection} semdDocCode={state.semdDocCode}
					clinic={state.clinic} doctor={state.doctor} patient={state.patient}
					semdPayload={state.semdPayload} diagnoses={state.diagnoses} procedures={state.procedures}
				/>
			)}
			{activeTab === "journal" && (
				<EgiszJournalTab
					records={records} journalFilter={journalFilter} onJournalFilterChange={onJournalFilterChange}
					selectedJournalId={selectedJournalId} onSelectJournalId={onSelectJournalId}
					onBatchZipExport={onBatchZipExport} onSingleZipExport={onSingleZipExport}
					onSignJournalDocument={onSignJournalDocument} onExportJournalZip={onExportJournalZip}
					onSwitchToSignatureTab={onSwitchToSignatureTab} onRefreshOutbox={onRefreshOutbox}
					onBatchSendShift={onBatchSendShift} isLoading={isLoadingJournal}
				/>
			)}
		</div>
	);
};
