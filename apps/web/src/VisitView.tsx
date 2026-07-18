import { motion } from "framer-motion";
import {
	AlertTriangle,
	Bot,
	Check,
	CheckCircle2,
	ClipboardCheck,
	FlaskConical,
	Lock,
	Mic,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import React, { Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ClinicalRulePanel } from "./ClinicalRulePanel";
import { showToast } from "./components/GlobalToast";
import { PatientJourneyTimeline } from "./components/PatientJourneyTimeline";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { LabOrdersPanel } from "./components/schedule/LabOrdersPanel";
import { CompletedServicesChecklist } from "./components/visit/CompletedServicesChecklist";
import { GnathologyForm } from "./components/visit/GnathologyForm";
import { SignCardDialog } from "./components/visit/SignCardDialog";
import { VisitDictation } from "./components/visit/VisitDictation";
import { VisitEmkTab } from "./components/visit/VisitEmkTab";
import { VisitDiagnosticsTab } from "./components/visit/VisitDiagnosticsTab";
import { VisitFlowProgress } from "./components/visit/VisitFlowProgress";
import { CheckoutDrawer } from "./components/finance/CheckoutDrawer";
import { PaymentCapture } from "./PaymentCapture";
import { formatCurrencyNumeric } from "./utils/inputSanitation";
import { VisitHeader } from "./components/visit/VisitHeader";
import { VisitDocsOverlay } from "./components/visit/VisitDocsOverlay";
import { VisitOdontogramTab } from "./components/visit/VisitOdontogramTab";
import { VisitPrimaryActions } from "./components/visit/VisitPrimaryActions";
import { VisitSafetyStrip } from "./components/visit/VisitSafetyStrip";
import { VisitSpecialtyFocus } from "./components/visit/VisitSpecialtyFocus";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { DictationHints } from "./DictationHints";
import { useVisitLogic } from "./hooks/domains/useVisitLogic";
import { useWorkspaceProfile } from "./hooks/useWorkspaceProfile";
import { AiOrchestrator } from "./lib/aiOrchestrator";
import { parseVisitDictationLocal } from "./lib/smartVisitParser";
import { SmartParsePreview } from "./SmartParsePreview";
import { useVisitStore } from "./store/visitStore";
import { getToothConfig, getToothPath } from "./utils/toothGeometry";
import "./styles/VisitView.css";
import { VisitToothMap } from "./components/visit/VisitToothMap";
import { VisitToothContextMenu } from "./components/visit/VisitToothContextMenu";
import { VisitTabNavigation, VisitTabType } from "./components/visit/VisitTabNavigation";
import { VisitConclusionTab } from "./components/visit/VisitConclusionTab";

export function VisitView() {
	const workspaceFlags = useWorkspaceProfile();
	const {
		acceptDraftToVisit,
		activeAppointment,
		activeChair,
		activeDoctor,
		activeImagingStudies,
		activePatient,
		activePatientInsight,
		activeUsableDocuments,
		activeVisitClinicalRuleEvaluations,
		activeVisitClinicalRuleSummary,
		appendToTranscript,
		applyProtocolTemplate,
		buildDraft,
		buildOfflineDraft,
		clearTranscriptWithUndo,
		clearedTranscriptSnapshot,
		clinicalRuleActionLabels,
		clinicalRuleSeverityLabels,
		dashboard,
		dictationQuickPhrases,
		draft,
		emptyDictationVoiceActionLabel,
		flushPendingSpeechChunks,
		flushPendingVisitSaves,
		formatTime,
		hasVisitTranscriptText,
		imagingKindLabels,
		isDraftAccepting,
		isDraftLoading,
		isOnline,
		isPendingVisitSyncing,
		isServerVoiceRecording,
		isTranscriptPolishing,
		isVisitDictating,
		isVisitNoteDirty,
		lastLocalSavedAt,
		lastPendingVisitSaveAt,
		lastServerDraftSavedAt,
		lastVisitSaveReceipt,
		localDraftWasRestored,
		openVisitWarningAction,
		pendingSpeechChunkCount,
		pendingSpeechFlushActionLabel,

		// Finance variables
		isPaymentSaving,
		createDocument: onCreateDocument,
		recordPayment: onRecordPayment,
		paymentAmount,
		paymentFeedback,
		paymentFiscalCashierName,
		paymentFiscalFd,
		paymentFiscalFn,
		paymentFiscalFpd,
		paymentFiscalReceiptIssuedAt,
		paymentFiscalReceiptNumber,
		paymentFiscalReceiptUrl,
		paymentMethod,
		paymentMethodLabels,
		paymentPatientContextMessage,
		paymentPatientContextReady,
		paymentPayerBirthDate,
		paymentPayerFullName,
		paymentPayerIdentityDocument,
		paymentPayerInn,
		paymentPayerRelationship,
		paymentTaxDeductionCode,
		setPaymentAmount,
		setPaymentFiscalCashierName,
		setPaymentFiscalFd,
		setPaymentFiscalFn,
		setPaymentFiscalFpd,
		setPaymentFiscalReceiptIssuedAt,
		setPaymentFiscalReceiptNumber,
		setPaymentFiscalReceiptUrl,
		setPaymentMethod,
		setPaymentPayerBirthDate,
		setPaymentPayerFullName,
		setPaymentPayerIdentityDocument,
		setPaymentPayerInn,
		setPaymentPayerRelationship,
		setPaymentTaxDeductionCode,
		patientBillingSummary: billingSummary,
		documentPatient,

		pendingSpeechFlushActionTitle,
		pendingVisitSaveCount,
		polishTranscript,
		polishingField,
		polishSingleField,
		primaryVisitWarning,
		scrollToVisitArea,
		selectedProtocolTemplate,
		selectedSpecialty,
		selectedWorkspaceRole,
		serverDraftSyncState,
		serviceTitle,
		setClearedTranscriptSnapshot,
		setSelectedProtocolId,
		setSelectedSpecialty,
		setTranscript,
		specialtiesWithTemplates,
		specialtyLabels,
		specialtyProtocolTemplates,
		speechGatewayActiveProviderIsLocal,
		speechGatewayStatus,
		speechRecognitionReady,
		speechStatusNote,
		speechTranscriptionBusy,
		staffRoleLabels,
		startServerVoiceRecording,
		startVisitDictation,
		stopServerVoiceRecording,
		toothRows,
		toothStateByCode,
		setToothState,
		transcript,
		undoTranscriptClear,
		updateVisitNoteField,
		visibleVisitSpecialtyFocusOptions,
		visitCloseChecklist,
		visitDraftBuildMissingSteps,
		visitDraftMissingFieldLabel,
		visitDraftQualityLabels,
		visitFlowResult,
		visitDraftReadyToBuild,
		visitDraftSignalLabel,
		visitDraftUserEditedRef,
		visitNoteAcceptMissingSteps,
		visitNoteActionLabel,
		visitNoteFieldDefinitions,
		visitNoteForm,
		visitNoteReadyToAccept,
		visitNoteStatusLabel,
		visitPrimaryAction,
		visitSafetyCards,
		visitSaveReceiptText,
		visitWarnings,
		visitWorkflowSteps,
		addTreatmentPlanItem,
		removeTreatmentPlanItem,
		auth,
	} = useAppLogicContext();

	const [activeVisitTab, setActiveVisitTab] = useState<VisitTabType>("diary");
	const [activeEmkTab, setActiveEmkTab] = useState("all");
	const [showHints, setShowHints] = useState(false);
	const [showSmartPreview, setShowSmartPreview] = useState(false);
	const [smartParsedData, setSmartParsedData] = useState<any>(null);
	const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
	const [isSigned, setIsSigned] = useState(false);
	
	const [isPaymentOpen, setIsPaymentOpen] = useState(false);
	const [isDocsOpen, setIsDocsOpen] = useState(false);

	// ZTL (Зуботехническая Лаборатория) Form State
	const [ztlLab, setZtlLab] = useState("");
	const [ztlWorkType, setZtlWorkType] = useState("");
	const [ztlTeeth, setZtlTeeth] = useState("");
	const [ztlImpression, setZtlImpression] = useState("");
	const [ztlColor, setZtlColor] = useState("");
	const [ztlComment, setZtlComment] = useState("");

	useEffect(() => {
		const handleOpenPayment = () => setIsPaymentOpen(true);
		const handleOpenDocs = () => setIsDocsOpen(true);
		window.addEventListener("open-visit-payment", handleOpenPayment);
		window.addEventListener("open-visit-docs", handleOpenDocs);
		return () => {
			window.removeEventListener("open-visit-payment", handleOpenPayment);
			window.removeEventListener("open-visit-docs", handleOpenDocs);
			// Memory Optimization: Flush heavy visit states on unmount
			useVisitStore.getState().reset();
		};
	}, []);

	const visitAiDiagnosesByCode = useVisitStore(
		(state) => state.visitAiDiagnosesByCode,
	);
	const [activeQuadrant, setActiveQuadrant] = React.useState<number | null>(
		null,
	);
	const [activeStamp, setActiveStamp] = React.useState<string | null>(null);
	const activeStampRef = React.useRef<string | null>(null);
	activeStampRef.current = activeStamp;

	
	const [selectedToothForMenu, setSelectedToothForMenu] = React.useState<{
		code: string;
		state: string;
	} | null>(null);

	const appendToEMKField = (fieldKey: string, text: string) => {
		const currentVal = (visitNoteForm as any)[fieldKey] || "";
		if (!currentVal.includes(text)) {
			const sep = currentVal ? "\n" : "";
			updateVisitNoteField(fieldKey, currentVal + sep + text);
		}
	};

	const handleSelectDiagnosis = (
		state: string,
		text?: string,
		fieldKey?: string,
	) => {
		if (!selectedToothForMenu) return;
		setToothState(selectedToothForMenu.code, state as any);
		if (text && fieldKey)
			appendToEMKField(fieldKey, `Зуб ${selectedToothForMenu.code}: ${text}`);
		setSelectedToothForMenu(null);
	};

	const handleApplyMaterial = async (materialLabel: string, textTemplate: string, service?: any) => {
		if (!selectedToothForMenu) return;
		setToothState(selectedToothForMenu.code, "planned" as any);
		appendToEMKField(
			"treatmentPlan",
			`Зуб ${selectedToothForMenu.code}: ${textTemplate} — ${materialLabel}`,
		);
		if (service) {
			const newItem = {
				id: crypto.randomUUID(),
				patientId: activePatient.id,
				visitId: dashboard?.activeVisit?.id || "draft",
				serviceId: service.id,
				snapshotServiceName: service.title,
				toothCode: selectedToothForMenu.code,
				quantity: 1,
				unitPriceRub: service.basePriceRub || 0,
				discountRub: 0,
				status: "planned",
				priceRub: service.basePriceRub || 0,
			};
			addTreatmentPlanItem(newItem);
			
			// Robust save to backend
			try {
				const res = await fetch(`/api/patients/${activePatient.id}/treatment-plans`, {
					method: "POST",
					headers: auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({
						name: `Лечение зуба ${selectedToothForMenu.code}`,
						items: [{
							toothNumber: parseInt(selectedToothForMenu.code, 10),
							priceId: service.id,
							name: service.title,
							price: service.basePriceRub || 0,
							quantity: 1,
							discount: 0
						}]
					})
				});
				if (res.ok) {
					const data = await res.json();
					// The backend returns an array of inserted items, or the plan itself.
					// Let's assume it returns { success: true, planId: ... }
					// For robust synchronization, we can just reload the dashboard.
					void loadDashboard();
				} else {
					throw new Error("Failed to save treatment plan");
				}
			} catch (err) {
				removeTreatmentPlanItem(newItem.id);
				showToast("Не удалось сохранить назначение, повторите", "error");
				console.error("Failed to save treatment plan:", err);
			}
		}
		setSelectedToothForMenu(null);
	};


	// ─────────────────────────────────────────────────────────────

	

	

	const handleToothClick = (code: string, currentState: string) => {
		if (activeStampRef.current !== null) {
			// Quick stamp mode: apply instantly, no popup
			setToothState(code, activeStampRef.current);
		} else {
			// Default mode: open clinical context modal
			setSelectedToothForMenu({ code, state: currentState });
		}
	};

	if (!activePatient) {
		return (
			<>
				<motion.div
					className="panel visit-panel glass-panel"
					id="visit"
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4 }}
				>
					<div className="panel-heading">
						<h2>Текущий прием</h2>
					</div>
					<div
						style={{
							textAlign: "center",
							padding: "64px 24px",
							color: "var(--color-text-muted, #6b7280)",
						}}
					>
						<div style={{ fontSize: "48px", marginBottom: "16px" }}>🦷</div>
						<h3
							style={{
								fontSize: "1.125rem",
								fontWeight: 600,
								color: "var(--color-text, #111827)",
								marginBottom: "8px",
							}}
						>
							Пациент не выбран
						</h3>
						<p style={{ fontSize: "0.875rem" }}>
							Выберите пациента в разделе «Пациенты»
							<br />
							или создайте запись в «Записях», чтобы начать приём.
						</p>
					</div>
				</motion.div>
			</>
		);
	}

	return (
		<>
			<motion.div
				className="panel visit-panel glass-panel"
				id="visit"
				initial={{ opacity: 0, y: 15 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
			>
				<div className="panel-heading">
					<h2>Текущий прием</h2>
					<span className="status-pill status-in_treatment">
						{visitNoteStatusLabel || "Черновик"}
					</span>
				</div>

				<VisitHeader />

				<div
					style={{
						display: activeVisitTab === "conclusion" ? "block" : "none",
					}}
				>
					<VisitPrimaryActions
						isSignDialogOpen={isSignDialogOpen}
						setIsSignDialogOpen={setIsSignDialogOpen}
						isSigned={isSigned}
					/>

					{workspaceFlags.hasEngineeringStatus && <VisitSafetyStrip />}
				</div>

				<VisitTabNavigation activeTab={activeVisitTab} onTabChange={setActiveVisitTab} />

				<div style={{ display: activeVisitTab === "diary" ? "block" : "none" }}>
					<VisitSpecialtyFocus />

					<VisitDictation />

					<VisitToothMap
						activeStamp={activeStamp as any}
						setActiveStamp={setActiveStamp as any}
						activeQuadrant={activeQuadrant}
						setActiveQuadrant={setActiveQuadrant}
						pediatricMode={
							dashboard?.clinicSettings?.profile?.hasPediatricMode ?? false
						}
						onToothClick={handleToothClick}
					/>

					<VisitEmkTab />
				</div>

				<div
					style={{
						display: activeVisitTab === "odontogram" ? "block" : "none",
					}}
				>
					<VisitOdontogramTab />
				</div>
				<div
					style={{
						display: activeVisitTab === "diagnostics" ? "block" : "none",
					}}
				>
					<VisitDiagnosticsTab />
				</div>

				{activeVisitTab === "conclusion" && (
					<VisitConclusionTab
						isSignDialogOpen={isSignDialogOpen}
						setIsSignDialogOpen={setIsSignDialogOpen}
						isSigned={isSigned}
						workspaceFlags={workspaceFlags}
						dashboard={dashboard}
						activePatient={activePatient}
						selectedProtocolTemplate={selectedProtocolTemplate}
						specialtyLabels={specialtyLabels}
						specialtiesWithTemplates={specialtiesWithTemplates}
						selectedSpecialty={selectedSpecialty}
						setSelectedSpecialty={setSelectedSpecialty}
						setSelectedProtocolId={setSelectedProtocolId}
						imagingKindLabels={imagingKindLabels}
						specialtyProtocolTemplates={specialtyProtocolTemplates}
						applyProtocolTemplate={applyProtocolTemplate}
						activeVisitClinicalRuleEvaluations={activeVisitClinicalRuleEvaluations}
						clinicalRuleActionLabels={clinicalRuleActionLabels}
						serviceTitle={serviceTitle}
						clinicalRuleSeverityLabels={clinicalRuleSeverityLabels}
						staffRoleLabels={staffRoleLabels}
						activeVisitClinicalRuleSummary={activeVisitClinicalRuleSummary}
						visitCloseChecklist={visitCloseChecklist}
						primaryVisitWarning={primaryVisitWarning}
						setActiveVisitTab={setActiveVisitTab}
					/>
				)}
			</motion.div>

			{/* ═══════════════════════════════════════════════════════════════
              Clinical Context Modal — открывается по клику на зуб (без штампа)
          ═══════════════════════════════════════════════════════════════ */}

			
			<VisitToothContextMenu
				selectedTooth={selectedToothForMenu}
				onClose={() => setSelectedToothForMenu(null)}
				onSelectDiagnosis={handleSelectDiagnosis}
				onApplyMaterial={handleApplyMaterial}
			/>
			<SignCardDialog
				isOpen={isSignDialogOpen}
				onClose={() => setIsSignDialogOpen(false)}
				visitId={dashboard?.activeVisit?.id || "draft"}
				patientId={activePatient.id}
				diaryContent={
					visitNoteForm.objectiveStatus + "\n" + visitNoteForm.treatmentPlan
				}
				onSigned={(signatureData) => {
					setIsSigned(true);
					showToast("Прием подписан", "success");
				}}
			/>
			<CheckoutDrawer isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)}>
				<PaymentCapture
					remainingDebt={billingSummary?.totalDueRub}
					amount={paymentAmount}
					feedback={paymentFeedback}
					fiscalCashierName={paymentFiscalCashierName}
					fiscalFd={paymentFiscalFd}
					fiscalFn={paymentFiscalFn}
					fiscalFpd={paymentFiscalFpd}
					fiscalReceiptIssuedAt={paymentFiscalReceiptIssuedAt}
					fiscalReceiptNumber={paymentFiscalReceiptNumber}
					fiscalReceiptUrl={paymentFiscalReceiptUrl}
					isSaving={isPaymentSaving}
					method={paymentMethod}
					methodLabels={paymentMethodLabels}
					onAmountChange={(v) => setPaymentAmount(formatCurrencyNumeric(v))}
					onFiscalCashierNameChange={setPaymentFiscalCashierName}
					onFiscalFdChange={setPaymentFiscalFd}
					onFiscalFnChange={setPaymentFiscalFn}
					onFiscalFpdChange={setPaymentFiscalFpd}
					onFiscalReceiptIssuedAtChange={setPaymentFiscalReceiptIssuedAt}
					onFiscalReceiptNumberChange={setPaymentFiscalReceiptNumber}
					onFiscalReceiptUrlChange={setPaymentFiscalReceiptUrl}
					onMethodChange={setPaymentMethod}
					onPayerBirthDateChange={setPaymentPayerBirthDate}
					onPayerFullNameChange={setPaymentPayerFullName}
					onPayerIdentityDocumentChange={setPaymentPayerIdentityDocument}
					onPayerInnChange={setPaymentPayerInn}
					onPayerRelationshipChange={setPaymentPayerRelationship}
					onSubmit={() => {
						onRecordPayment();
						// Delay closing to show success visual feedback inside PaymentCapture
						setTimeout(() => setIsPaymentOpen(false), 800);
					}}
					onTaxDeductionCodeChange={setPaymentTaxDeductionCode}
					patientContextMessage={paymentPatientContextMessage}
					patientContextReady={paymentPatientContextReady}
					patientId={documentPatient?.id}
					patientDefaults={{
						birthDate: documentPatient?.birthDate ?? null,
						fullName: documentPatient?.fullName ?? null,
						identityDocument: documentPatient?.administrativeProfile?.identityDocument ?? null,
						taxpayerInn: documentPatient?.administrativeProfile?.taxpayerInn ?? null,
					}}
					payerBirthDate={paymentPayerBirthDate}
					payerFullName={paymentPayerFullName}
					payerIdentityDocument={paymentPayerIdentityDocument}
					payerInn={paymentPayerInn}
					payerRelationship={paymentPayerRelationship}
					taxDeductionCode={paymentTaxDeductionCode}
				/>
			</CheckoutDrawer>
			{isDocsOpen && onCreateDocument && (
				<VisitDocsOverlay 
					onClose={() => setIsDocsOpen(false)}
					patientName={activePatient.fullName}
					createDocument={onCreateDocument}
				/>
			)}
		</>
	);
}
