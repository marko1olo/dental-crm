/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD & FNS TAX DEDUCTION (КНД 1151156) HUB MODAL HUD — DENTE CRM
 * Statutory Medical & Financial Document Hub for Russian Ministry of Health & FNS
 * Compliant with Orders 804n, 947n, ED-7-11/755@, and 63-FZ. Mandate 8b <= 120 lines.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import { createPortal } from "react-dom";
import { AlertCircle } from "lucide-react";
import { showToast } from "../GlobalToast";
import { generateEgiszXmlFilename, generateFnsTaxXmlFilename, validateXmlStructure } from "./egiszRemdEngine";
import type { RemdDocumentRecord } from "./egiszJournalData";
import { useEgiszRemdState } from "./useEgiszRemdState";
import { useCryptoProSigning } from "./useCryptoProSigning";
import { exportBatchDocumentsZip, exportSingleDocumentZip } from "./egiszPackageSender";
import { EgiszRemdModalHeader } from "./modal/EgiszRemdModalHeader";
import { EgiszRemdModalNav } from "./modal/EgiszRemdModalNav";
import { EgiszRemdModalBody } from "./modal/EgiszRemdModalBody";
import { EgiszRemdModalFooter } from "./modal/EgiszRemdModalFooter";
import { useEgiszModalController } from "./modal/useEgiszModalController";
import type { EgiszHubActiveDocType, EgiszHubModalTab, EgiszRemdHubModalProps } from "./modal/modalTypes";
import "./egiszRemd.css";

export type { EgiszHubActiveDocType, EgiszHubModalTab, EgiszRemdHubModalProps } from "./modal/modalTypes";

export const EgiszRemdHubModal: React.FC<EgiszRemdHubModalProps> = ({
	isOpen = true, onClose, initialDocType = "cda_semd", initialPayload,
	initialXmlPayload, initialFnsPayload, initialTab, initialJournalFilter,
	initialJournalSelectedId, initialJournalRecords, onSentSuccess,
	onSignJournalDocument, onExportJournalZip,
}) => {
	const state = useEgiszRemdState({ initialPayload, initialXmlPayload, initialFnsPayload, activeDocType: initialDocType });
	const crypto = useCryptoProSigning({
		initialDoctorSig: initialPayload?.doctorSignature,
		initialMoSig: initialPayload?.clinicSignature || initialPayload?.moSignature,
		generatedXml: state.generatedXml, doctor: state.doctor, clinic: state.clinic,
	});
	const ctrl = useEgiszModalController({
		isOpen, onClose, initialDocType, initialTab, initialJournalFilter,
		initialJournalSelectedId, initialJournalRecords, onSentSuccess, state, crypto,
	});

	if (!isOpen) return null;

	const handleValidateCdaXml = () => {
		const report = state.activePreflight;
		const struct = validateXmlStructure(state.generatedXml);
		showToast(`Валидация XML: ${report.passedCount}/${report.totalChecks} пройдено (${report.scorePercent}%), тегов: ${struct.tagCount}`, report.isValid ? "success" : "warning");
	};

	const handlePrint = () => {
		const win = window.open("", "_blank");
		if (win) { win.document.write(state.printableHtml); win.document.close(); win.focus(); setTimeout(() => win.print(), 300); }
	};

	const handleDownloadXml = () => {
		const filename = ctrl.activeDocType === "cda_semd" ? generateEgiszXmlFilename(state.semdPayload) : generateFnsTaxXmlFilename(state.fnsPayload);
		const blob = new Blob([state.generatedXml], { type: "application/xml;charset=utf-8" });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); window.URL.revokeObjectURL(url);
		showToast(`Файл "${filename}" сохранен`, "success");
	};

	const handleExportCurrentPackageZip = () => {
		const prefix = (ctrl.activeDocType === "cda_semd" ? generateEgiszXmlFilename(state.semdPayload) : generateFnsTaxXmlFilename(state.fnsPayload)).replace(".xml", "");
		exportSingleDocumentZip({ filenamePrefix: prefix, generatedXml: state.generatedXml, doctorSigBase64: crypto.doctorSig?.signatureBase64, moSigBase64: crypto.moSig?.signatureBase64 });
	};

	const modalContent = (
		<div className="egisz-modal-backdrop" role="dialog" aria-modal="true">
			<div className="egisz-modal-container">
				<EgiszRemdModalHeader
					activeDocType={ctrl.activeDocType} semdDocCode={state.semdDocCode} onClose={onClose}
					onSelectDocType={(t, c, tab) => { ctrl.setActiveDocType(t); if (c) state.setSemdDocCode(c); if (tab) ctrl.setActiveTab(tab); }}
				/>
				{crypto.availableCerts.length === 0 && !crypto.isCheckingCerts && (
					<div className="egisz-nonblocking-banner" role="status" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "rgba(245, 158, 11, 0.12)", color: "var(--warning, #d97706)", fontSize: "0.8125rem", borderBottom: "1px solid rgba(245, 158, 11, 0.25)" }}>
						<AlertCircle size={16} />
						<span>Криптопровайдер не обнаружен, документ сохранен в черновики бэкофиса</span>
					</div>
				)}
				<EgiszRemdModalNav
					activeDocType={ctrl.activeDocType} activeTab={ctrl.activeTab} onSelectTab={ctrl.setActiveTab}
					scorePercent={state.activePreflight.scorePercent} isDoctorSigned={Boolean(crypto.doctorSig)}
				/>
				<EgiszRemdModalBody
					activeTab={ctrl.activeTab} activeDocType={ctrl.activeDocType} state={state} crypto={crypto}
					isSending={ctrl.isSending} signaturePreviewMode={ctrl.signaturePreviewMode}
					onSignaturePreviewModeChange={ctrl.setSignaturePreviewMode} collapsedSections={ctrl.collapsedSections}
					onToggleSection={ctrl.toggleSection} records={ctrl.records} journalFilter={ctrl.journalFilter}
					onJournalFilterChange={ctrl.setJournalFilter} selectedJournalId={ctrl.selectedJournalId}
					onSelectJournalId={ctrl.setSelectedJournalId} isLoadingJournal={ctrl.isLoadingJournal}
					onBatchZipExport={() => exportBatchDocumentsZip(ctrl.records)}
					onSingleZipExport={(rec: RemdDocumentRecord) => exportSingleDocumentZip({ filenamePrefix: generateEgiszXmlFilename(rec.cdaPayload || state.semdPayload).replace(".xml", ""), generatedXml: state.generatedXml, doctorSigBase64: rec.doctorSignature?.signatureBase64, moSigBase64: rec.clinicSignature?.signatureBase64 || rec.moSignature?.signatureBase64, registrationInfo: rec.registrationInfo })}
					onSignJournalDocument={onSignJournalDocument} onExportJournalZip={onExportJournalZip}
					onSwitchToSignatureTab={() => ctrl.setActiveTab("signature")} onRefreshOutbox={ctrl.handleRefreshOutbox}
					onBatchSendShift={ctrl.handleBatchSendShift} onSendToRegistry={ctrl.handleSendToRegistry}
					onQueueDeferred={ctrl.handleQueueDeferred} onPrint={handlePrint} onDownloadXml={handleDownloadXml}
					onValidateCdaXml={handleValidateCdaXml} onExportCurrentPackageZip={handleExportCurrentPackageZip}
					onCopyXml={() => { navigator.clipboard.writeText(state.generatedXml); showToast("Канонический XML скопирован", "success"); }}
				/>
				<EgiszRemdModalFooter
					activeDocType={ctrl.activeDocType} isSending={ctrl.isSending} onPrint={handlePrint}
					onValidateCdaXml={handleValidateCdaXml} onQueueDeferred={ctrl.handleQueueDeferred}
					onClose={onClose} onSendToRegistry={ctrl.handleSendToRegistry}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default EgiszRemdHubModal;
