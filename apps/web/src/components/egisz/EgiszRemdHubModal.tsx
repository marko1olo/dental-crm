/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD & FNS TAX DEDUCTION (КНД 1151156) HUB MODAL HUD — DENTE CRM
 * Statutory Medical & Financial Document Hub for Russian Ministry of Health & FNS
 * Compliant with HL7 CDA R2, Order 804n, Order ED-7-11/755@, and Federal Law 63-FZ
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	Archive,
	CheckCircle2,
	Clock,
	Code2,
	FileText,
	Key,
	Printer,
	Receipt,
	Send,
	Shield,
	ShieldCheck,
	X,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	type EgiszDentalCdaPayload,
	type FnsTaxCertificatePayload,
	generateEgiszXmlFilename,
	generateFnsTaxXmlFilename,
	validateXmlStructure,
} from "./egiszRemdEngine";
import {
	SAMPLE_REMD_JOURNAL_RECORDS,
	type RemdDocumentRecord,
	type RemdDocumentStatus,
} from "./egiszJournalData";
import {
	EgiszClinicalTab,
	EgiszFnsTaxTab,
	EgiszJournalTab,
	EgiszPreflightTab,
	EgiszSigningTab,
	EgiszXmlPreviewTab,
} from "./tabs";
import { useEgiszRemdState } from "./useEgiszRemdState";
import { useCryptoProSigning } from "./useCryptoProSigning";
import {
	buildDeferredRemdRecord,
	exportBatchDocumentsZip,
	exportSingleDocumentZip,
	fetchOutboxRecordsFromBackend,
	submitCdaPackageToRemd,
	submitFnsTaxToGateway,
} from "./egiszPackageSender";
import "./egiszRemd.css";

export type EgiszHubActiveDocType = "cda_semd" | "fns_tax";
export type EgiszHubModalTab = "clinical" | "tax_deduction" | "preflight" | "signature" | "xml_preview" | "journal" | "xml" | "signing";

export interface EgiszRemdHubModalProps {
	isOpen?: boolean | undefined;
	onClose: () => void;
	initialDocType?: EgiszHubActiveDocType | undefined;
	initialPayload?: Partial<EgiszDentalCdaPayload> | undefined;
	initialXmlPayload?: any | undefined;
	initialFnsPayload?: Partial<FnsTaxCertificatePayload> | undefined;
	initialTab?: EgiszHubModalTab | undefined;
	initialJournalFilter?: RemdDocumentStatus | "all" | undefined;
	initialJournalSelectedId?: string | undefined;
	onSentSuccess?: ((result: { type: string; documentId: string; timestamp: string }) => void) | undefined;
	onSignJournalDocument?: ((record: RemdDocumentRecord) => void) | undefined;
	onExportJournalZip?: ((record: RemdDocumentRecord) => void) | undefined;
}

export const EgiszRemdHubModal: React.FC<EgiszRemdHubModalProps> = ({
	isOpen = true,
	onClose,
	initialDocType = "cda_semd",
	initialPayload,
	initialXmlPayload,
	initialFnsPayload,
	initialTab,
	initialJournalFilter,
	initialJournalSelectedId,
	onSentSuccess,
	onSignJournalDocument,
	onExportJournalZip,
}) => {
	const [activeDocType, setActiveDocType] = useState<EgiszHubActiveDocType>(initialDocType);
	const normalizedInitialTab = useMemo<EgiszHubModalTab>(() => {
		if (initialTab === "xml") return "xml_preview";
		if (initialTab === "signing") return "signature";
		return initialTab || (initialDocType === "fns_tax" ? "tax_deduction" : "clinical");
	}, [initialTab, initialDocType]);
	const [activeTab, setActiveTab] = useState<EgiszHubModalTab>(normalizedInitialTab);

	const [isSending, setIsSending] = useState<boolean>(false);
	const [signaturePreviewMode, setSignaturePreviewMode] = useState<"print" | "xml">("print");

	// Collapsible Sections in XML Preview
	const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
		header: false,
		frmo: false,
		doctor: false,
		patient: false,
		diagnosis: false,
		dentalFormula: false,
		procedures: false,
	});
	const toggleSection = (key: string) => {
		setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	// Journal State
	const [records, setRecords] = useState<RemdDocumentRecord[]>(SAMPLE_REMD_JOURNAL_RECORDS);
	const [journalFilter, setJournalFilter] = useState<RemdDocumentStatus | "all">(
		initialJournalFilter || "all",
	);
	const [selectedJournalId, setSelectedJournalId] = useState<string>(() => {
		if (initialJournalSelectedId) return initialJournalSelectedId;
		if (initialJournalFilter && initialJournalFilter !== "all") {
			const match = SAMPLE_REMD_JOURNAL_RECORDS.find((r) => r.status === initialJournalFilter);
			if (match) return match.id;
		}
		return SAMPLE_REMD_JOURNAL_RECORDS[0]?.id || "";
	});

	// Domain & Payload State Hook
	const state = useEgiszRemdState({
		initialPayload,
		initialXmlPayload,
		initialFnsPayload,
		activeDocType,
	});

	// Crypto & Signing Hook
	const crypto = useCryptoProSigning({
		initialDoctorSig: initialPayload?.doctorSignature,
		initialMoSig: initialPayload?.clinicSignature || initialPayload?.moSignature,
		generatedXml: state.generatedXml,
		doctor: state.doctor,
		clinic: state.clinic,
	});

	// Escape key listener for accessibility
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	// 1-Click ZIP Export for single document
	const handleSingleZipExport = (record: RemdDocumentRecord) => {
		const payload = record.cdaPayload || state.semdPayload;
		const filenamePrefix = generateEgiszXmlFilename(payload).replace(".xml", "");
		exportSingleDocumentZip({
			filenamePrefix,
			generatedXml: state.generatedXml,
			doctorSigBase64: record.doctorSignature?.signatureBase64,
			moSigBase64: record.clinicSignature?.signatureBase64 || record.moSignature?.signatureBase64,
			registrationInfo: record.registrationInfo,
		});
	};

	// Mandate 8k: 1-Click ZIP Export for currently active document
	const handleExportCurrentPackageZip = () => {
		const filenamePrefix = (activeDocType === "cda_semd"
			? generateEgiszXmlFilename(state.semdPayload)
			: generateFnsTaxXmlFilename(state.fnsPayload)
		).replace(".xml", "");

		exportSingleDocumentZip({
			filenamePrefix,
			generatedXml: state.generatedXml,
			doctorSigBase64: crypto.doctorSig?.signatureBase64,
			moSigBase64: crypto.moSig?.signatureBase64,
		});
	};

	// Mandate 8e: Doctor & Clinic Autonomy — deferred queue for async UKEP signing & EGISZ REMD sending
	const handleQueueDeferred = useCallback(() => {
		const deferredRecord = buildDeferredRemdRecord({
			docType: activeDocType,
			semdDocCode: state.semdDocCode,
			patient: state.patient,
			doctor: state.doctor,
			clinic: state.clinic,
			semdPayload: state.semdPayload,
			taxPatientName: state.taxPatientName,
			taxPatientSnils: state.taxPatientSnils,
		});
		setRecords((prev) => [deferredRecord, ...prev]);
		showToast(
			"Документ помещен в очередь «Отложенная отправка ЕГИСЗ» (будет подписан и отправлен асинхронно). Прием и расчет пациента не заблокированы!",
			"success",
		);
		if (onSentSuccess) {
			onSentSuccess({
				type: activeDocType,
				documentId: deferredRecord.id,
				timestamp: new Date().toISOString(),
			});
		}
	}, [activeDocType, state.semdDocCode, state.patient, state.doctor, state.clinic, state.semdPayload, state.taxPatientName, state.taxPatientSnils, onSentSuccess]);

	// Mandate 8k: 1-Click CDA XML validation
	const handleValidateCdaXml = useCallback(() => {
		const report = state.activePreflight;
		const struct = validateXmlStructure(state.generatedXml);
		showToast(
			`Валидация CDA XML: ${report.passedCount}/${report.totalChecks} проверок пройдено (${report.scorePercent}%), тегов: ${struct.tagCount}`,
			report.isValid ? "success" : "warning",
		);
	}, [state.activePreflight, state.generatedXml]);

	// Refresh outbox documents from backend route /api/clinical/egisz/outbox
	const handleRefreshOutbox = useCallback(async () => {
		const outboxDocs = await fetchOutboxRecordsFromBackend(state.clinic);
		if (outboxDocs && outboxDocs.length > 0) {
			setRecords(outboxDocs);
			showToast("Журнал РЭМД синхронизирован с сервером", "success");
		} else {
			showToast("Журнал РЭМД обновлен", "info");
		}
	}, [state.clinic]);

	// Send to REMD / FNS handler
	const handleSendToRegistry = async () => {
		if (isSending) return;

		// Mandate 8e: Doctor autonomy. Lack of immediate signature routes to deferred queue
		if (!crypto.doctorSig && activeDocType === "cda_semd") {
			handleQueueDeferred();
			showToast("УКЭП не наложена. Документ отправлен в очередь «Отложенная отправка ЕГИСЗ» для пакетного подписания!", "info");
			return;
		}

		setIsSending(true);
		try {
			if (activeDocType === "cda_semd") {
				const txId = await submitCdaPackageToRemd({
					semdPayload: state.semdPayload,
					generatedXml: state.generatedXml,
					doctorSig: crypto.doctorSig,
					moSig: crypto.moSig,
				});
				showToast(`СЭМД ф. 043/у успешно передан в РЭМД ЕГИСЗ (Рег. №: ${txId})`, "success");
				if (onSentSuccess) {
					onSentSuccess({
						type: activeDocType,
						documentId: txId,
						timestamp: new Date().toISOString(),
					});
				}
			} else {
				const txId = await submitFnsTaxToGateway({
					patientId: state.fnsPayload.taxpayer?.inn || "taxpayer",
					visitId: state.fnsPayload.documentNumber || `FNS-${Date.now()}`,
				});
				showToast(`Справка ФНС КНД 1151156 успешно передана в шлюз (ID: ${txId})`, "success");
				if (onSentSuccess) {
					onSentSuccess({
						type: activeDocType,
						documentId: txId,
						timestamp: new Date().toISOString(),
					});
				}
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			handleQueueDeferred();
			showToast(`Шлюз ЕГИСЗ временно недоступен (${msg}). Документ помещен в очередь «Отложенная отправка ЕГИСЗ».`, "warning");
		} finally {
			setIsSending(false);
		}
	};

	// Copy XML to clipboard
	const handleCopyXml = () => {
		navigator.clipboard.writeText(state.generatedXml);
		showToast("Канонический XML скопирован в буфер обмена", "success");
	};

	// Download XML file
	const handleDownloadXml = () => {
		const filename =
			activeDocType === "cda_semd"
				? generateEgiszXmlFilename(state.semdPayload)
				: generateFnsTaxXmlFilename(state.fnsPayload);
		const blob = new Blob([state.generatedXml], { type: "application/xml;charset=utf-8" });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		window.URL.revokeObjectURL(url);
		showToast(`Файл "${filename}" сохранен`, "success");
	};

	// Print form handler
	const handlePrint = () => {
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(state.printableHtml);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		}
	};

	if (!isOpen) return null;

	const modalContent = (
		<div className="egisz-modal-backdrop" role="dialog" aria-modal="true">
			<div className="egisz-modal-container">
				{/* HEADER */}
				<header className="egisz-modal-header">
					<div className="egisz-header-titles" style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
						<div className="egisz-header-icon" style={{ flexShrink: 0 }}>
							<ShieldCheck size={24} />
						</div>
						<div style={{ minWidth: 0 }}>
							<div className="egisz-main-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
								СЭМД ЕГИСЗ CDA R2 &bull; РЭМД Минздрава & ФНС КНД 1151156 — Хаб электронных медицинских документов
								<span className="egisz-moh-badge egisz-badge-teal" style={{ marginLeft: "0.5rem", fontSize: "0.75rem", padding: "0.15rem 0.45rem", borderRadius: "4px", fontWeight: 700 }}>Минздрав РФ</span>
							</div>
							<div className="egisz-sub-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
								Федеральный реестр медицинских документов (63-ФЗ, 947н) &bull; СЭМД ЕГИСЗ CDA R2 &bull; Налоговый вычет (Приказ ЕД-7-11/755@)
							</div>
						</div>
					</div>

					{/* Document Mode Switcher per Hick's Law: 1 compact row 32-36px */}
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
						<div className="egisz-doc-filter-toolbar" role="toolbar" aria-label="Фильтр видов СЭМД">
							<button
								type="button"
								data-testid="doc-type-btn-302"
								className={`egisz-doc-filter-btn ${activeDocType === "cda_semd" && state.semdDocCode === "302" ? "active" : ""}`}
								onClick={() => {
									setActiveDocType("cda_semd");
									state.setSemdDocCode("302");
									setActiveTab("xml_preview");
								}}
							>
								302 &bull; Консультация
							</button>
							<button
								type="button"
								data-testid="doc-type-btn-303"
								className={`egisz-doc-filter-btn ${activeDocType === "cda_semd" && state.semdDocCode === "303" ? "active" : ""}`}
								onClick={() => {
									setActiveDocType("cda_semd");
									state.setSemdDocCode("303");
									setActiveTab("xml_preview");
								}}
							>
								303 &bull; Вмешательство
							</button>
							<button
								type="button"
								className={`egisz-doc-filter-btn ${activeDocType === "cda_semd" && state.semdDocCode === "105" ? "active" : ""}`}
								onClick={() => {
									setActiveDocType("cda_semd");
									state.setSemdDocCode("105");
									setActiveTab("clinical");
								}}
							>
								105 &bull; 043/у
							</button>
							<button
								type="button"
								className={`egisz-doc-filter-btn ${activeDocType === "fns_tax" ? "active" : ""}`}
								onClick={() => {
									setActiveDocType("fns_tax");
									setActiveTab("tax_deduction");
								}}
							>
								Справка ФНС (КНД 1151156)
							</button>
						</div>

						<button
							type="button"
							className="egisz-close-btn egisz-close-icon-btn"
							onClick={onClose}
							aria-label="Закрыть модальное окно"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* TABS NAVIGATION */}
				<nav className="egisz-tabs-nav">
					{activeDocType === "cda_semd" ? (
						<button
							type="button"
							className={`egisz-tab-btn ${activeTab === "clinical" ? "active" : ""}`}
							onClick={() => setActiveTab("clinical")}
						>
							<FileText size={16} />
							Стоматологический протокол (043/у)
						</button>
					) : (
						<button
							type="button"
							className={`egisz-tab-btn ${activeTab === "tax_deduction" ? "active" : ""}`}
							onClick={() => setActiveTab("tax_deduction")}
						>
							<Receipt size={16} />
							Налоговый вычет (КНД 1151156)
						</button>
					)}

					<button
						type="button"
						className={`egisz-tab-btn ${activeTab === "preflight" ? "active" : ""}`}
						onClick={() => setActiveTab("preflight")}
					>
						<Shield size={16} />
						Preflight & Валидация
						<span className="egisz-tab-badge">
							{state.activePreflight.scorePercent}%
						</span>
					</button>

					<button
						type="button"
						className={`egisz-tab-btn ${activeTab === "signature" ? "active" : ""}`}
						onClick={() => setActiveTab("signature")}
					>
						<Key size={16} />
						Подписание УКЭП
						{crypto.doctorSig ? (
							<span className="egisz-tab-badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--success, #10b981)" }}>
								Подписан
							</span>
						) : (
							<span className="egisz-tab-badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--warning, #d97706)" }}>
								Не подписан
							</span>
						)}
					</button>

					<button
						type="button"
						className={`egisz-tab-btn ${activeTab === "xml_preview" ? "active" : ""}`}
						onClick={() => setActiveTab("xml_preview")}
					>
						<Code2 size={16} />
						XML & Экспорт
					</button>

					<button
						type="button"
						className={`egisz-tab-btn ${activeTab === "journal" ? "active" : ""}`}
						onClick={() => setActiveTab("journal")}
					>
						<Archive size={16} />
						Журнал документов РЭМД
					</button>
				</nav>

				{/* TAB BODY CONTENTS */}
				<div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
					{/* TAB 1: DENTAL CLINICAL SEMD */}
					{activeTab === "clinical" && activeDocType === "cda_semd" && (
						<EgiszClinicalTab
							semdDocCode={state.semdDocCode}
							onSemdDocCodeChange={state.setSemdDocCode}
							patient={state.patient}
							onPatientChange={state.setPatient}
							doctor={state.doctor}
							onDoctorChange={state.setDoctor}
							complaints={state.complaints}
							onComplaintsChange={state.setComplaints}
							anamnesisMorbi={state.anamnesisMorbi}
							onAnamnesisMorbiChange={state.setAnamnesisMorbi}
							selectedTooth={state.selectedTooth}
							onSelectTooth={state.setSelectedTooth}
							toothStates={state.toothStates}
							onUpdateToothStatus={state.handleUpdateToothStatus}
							diagnoses={state.diagnoses}
							onAddDiagnosis={state.handleAddDiagnosis}
							onRemoveDiagnosis={state.handleRemoveDiagnosis}
							procedures={state.procedures}
							onAddProcedure={state.handleAddProcedure}
							onRemoveProcedure={state.handleRemoveProcedure}
						/>
					)}

					{/* TAB 2: FNS TAX DEDUCTION CERTIFICATE */}
					{activeTab === "tax_deduction" && activeDocType === "fns_tax" && (
						<EgiszFnsTaxTab
							taxDocNumber={state.taxDocNumber}
							onTaxDocNumberChange={state.setTaxDocNumber}
							taxYear={state.taxYear}
							onTaxYearChange={state.setTaxYear}
							taxSignerName={state.taxSignerName}
							onTaxSignerNameChange={state.setTaxSignerName}
							taxpayerName={state.taxpayerName}
							onTaxpayerNameChange={state.setTaxpayerName}
							taxpayerInn={state.taxpayerInn}
							onTaxpayerInnChange={state.setTaxpayerInn}
							taxpayerSnils={state.taxpayerSnils}
							onTaxpayerSnilsChange={state.setTaxpayerSnils}
							taxPatientName={state.taxPatientName}
							onTaxPatientNameChange={state.setTaxPatientName}
							taxRelCode={state.taxRelCode}
							onTaxRelCodeChange={state.setTaxRelCode}
							taxPatientSnils={state.taxPatientSnils}
							onTaxPatientSnilsChange={state.setTaxPatientSnils}
							taxPayments={state.taxPayments}
							onAddTaxPayment={state.handleAddTaxPayment}
							onRemoveTaxPayment={state.handleRemoveTaxPayment}
							onUpdateTaxPaymentDate={(idx, date) =>
								state.setTaxPayments((prev) => prev.map((p, i) => (i === idx ? { ...p, date } : p)))
							}
							onUpdateTaxPaymentServiceCode={(idx, code) =>
								state.setTaxPayments((prev) => prev.map((p, i) => (i === idx ? { ...p, serviceCode: code } : p)))
							}
							onUpdateTaxPaymentDescription={(idx, desc) =>
								state.setTaxPayments((prev) => prev.map((p, i) => (i === idx ? { ...p, serviceDescription: desc } : p)))
							}
							onUpdateTaxPaymentAmount={state.handleUpdateTaxPaymentAmount}
						/>
					)}

					{/* TAB 3: PREFLIGHT VALIDATION */}
					{activeTab === "preflight" && (
						<EgiszPreflightTab preflightReport={state.activePreflight} />
					)}

					{/* TAB 4: ELECTRONIC SIGNATURE & CRYPTOPRO */}
					{activeTab === "signature" && (
						<EgiszSigningTab
							signaturePreviewMode={signaturePreviewMode}
							onSignaturePreviewModeChange={setSignaturePreviewMode}
							selectedCert={crypto.selectedCert}
							onSelectCert={crypto.setSelectedCert}
							availableCerts={crypto.availableCerts}
							isSigning={crypto.isSigning}
							isSending={isSending}
							isCheckingCerts={crypto.isCheckingCerts}
							doctorSig={crypto.doctorSig || null}
							moSig={crypto.moSig || null}
							onSignDocument={crypto.handleSignDocument}
							onSignMoDocument={crypto.handleSignMoDocument}
							onSendToRegistry={handleSendToRegistry}
							onQueueDeferred={handleQueueDeferred}
							onUploadDetachedSig={crypto.handleUploadDetachedSig}
							onUploadDetachedMoSig={crypto.handleUploadDetachedMoSig}
							onRefreshCerts={crypto.refreshCerts}
							onPrint={handlePrint}
							onDownloadXml={handleDownloadXml}
							onValidateCdaXml={handleValidateCdaXml}
							doctor={state.doctor}
							clinic={state.clinic}
							generatedXml={state.generatedXml}
							form043uHtml={state.printableHtml}
						/>
					)}

					{/* TAB 5: XML PREVIEW & STRUCTURE VALIDATOR */}
					{activeTab === "xml_preview" && (
						<EgiszXmlPreviewTab
							generatedXml={state.generatedXml}
							xmlValidation={state.xmlValidation}
							onValidateCdaXml={handleValidateCdaXml}
							onDownloadXml={handleDownloadXml}
							onExportCurrentPackageZip={handleExportCurrentPackageZip}
							onSendToRegistry={handleSendToRegistry}
							onCopyXml={handleCopyXml}
							isSending={isSending}
							collapsedSections={collapsedSections}
							onToggleSection={toggleSection}
							semdDocCode={state.semdDocCode}
							clinic={state.clinic}
							doctor={state.doctor}
							patient={state.patient}
							semdPayload={state.semdPayload}
							diagnoses={state.diagnoses}
							procedures={state.procedures}
						/>
					)}

					{/* TAB 6: REMD DOCUMENTS JOURNAL */}
					{activeTab === "journal" && (
						<EgiszJournalTab
							records={records}
							journalFilter={journalFilter}
							onJournalFilterChange={setJournalFilter}
							selectedJournalId={selectedJournalId}
							onSelectJournalId={setSelectedJournalId}
							onBatchZipExport={() => exportBatchDocumentsZip(records)}
							onSingleZipExport={handleSingleZipExport}
							onSignJournalDocument={onSignJournalDocument}
							onExportJournalZip={onExportJournalZip}
							onSwitchToSignatureTab={() => setActiveTab("signature")}
							onRefreshOutbox={handleRefreshOutbox}
						/>
					)}
				</div>

				{/* FOOTER */}
				<footer
					style={{
						padding: "0.875rem 1.25rem",
						background: "var(--paper-strong)",
						borderTop: "1px solid var(--line)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						flexWrap: "wrap",
						gap: "0.5rem",
					}}
				>
					<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
						<button
							type="button"
							onClick={handlePrint}
							className="egisz-btn sm"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.4rem",
								padding: "0.45rem 0.9rem",
								fontSize: "0.8125rem",
								fontWeight: 600,
								borderRadius: "6px",
								border: "1px solid var(--line)",
								background: "var(--paper)",
								color: "var(--ink)",
								cursor: "pointer",
							}}
						>
							<Printer size={16} />
							Печать бланка
						</button>
						<button
							type="button"
							onClick={handleValidateCdaXml}
							className="egisz-btn sm"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.35rem",
								padding: "0.45rem 0.9rem",
								fontSize: "0.8125rem",
								fontWeight: 600,
								borderRadius: "6px",
								border: "1px solid var(--line)",
								background: "var(--paper)",
								color: "var(--teal, #0d9488)",
								cursor: "pointer",
							}}
						>
							<CheckCircle2 size={16} />
							1-Клик Валидация
						</button>
					</div>

					<div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
						<button
							type="button"
							onClick={handleQueueDeferred}
							className="egisz-btn sm"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.4rem",
								padding: "0.45rem 0.9rem",
								fontSize: "0.8125rem",
								fontWeight: 600,
								borderRadius: "6px",
								border: "1px solid var(--line)",
								background: "var(--paper)",
								color: "var(--ink)",
								cursor: "pointer",
							}}
						>
							<Clock size={15} />
							Отложить отправку
						</button>
						<button
							type="button"
							onClick={onClose}
							className="egisz-btn sm"
							style={{
								padding: "0.45rem 1rem",
								fontSize: "0.8125rem",
								fontWeight: 600,
								borderRadius: "6px",
								border: "1px solid var(--line)",
								background: "transparent",
								color: "var(--ink)",
								cursor: "pointer",
							}}
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={handleSendToRegistry}
							className="egisz-btn egisz-btn-primary sm"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.5rem",
								padding: "0.45rem 1.25rem",
								fontSize: "0.8125rem",
								fontWeight: 700,
								borderRadius: "6px",
								background: "var(--primary, #0ea5e9)",
								color: "var(--paper, #ffffff)",
								border: "none",
								cursor: isSending ? "wait" : "pointer",
							}}
						>
							<Send size={16} />
							{isSending ? "Отправка в РЭМД..." : activeDocType === "cda_semd" ? "Отправить в РЭМД ЕГИСЗ" : "Сформировать и отправить в ФНС"}
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};

export default EgiszRemdHubModal;
