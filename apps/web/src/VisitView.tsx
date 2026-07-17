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
import { VisitDiagnosticsTab } from "./components/visit/VisitDiagnosticsTab";
import { VisitDictation } from "./components/visit/VisitDictation";
import { VisitFlowProgress } from "./components/visit/VisitFlowProgress";
import { VisitHeader } from "./components/visit/VisitHeader";
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
import { VisitEmkTab } from "./components/visit/VisitEmkTab";
import { VisitToothContextMenu } from "./components/visit/VisitToothContextMenu";

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
	} = useAppLogicContext();

	const [activeVisitTab, setActiveVisitTab] = useState<
		"diary" | "odontogram" | "diagnostics" | "conclusion"
	>("diary");
	const [activeEmkTab, setActiveEmkTab] = useState("all");
	const [showHints, setShowHints] = useState(false);
	const [showSmartPreview, setShowSmartPreview] = useState(false);
	const [smartParsedData, setSmartParsedData] = useState<any>(null);
	const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
	const [isSigned, setIsSigned] = useState(false);

	// ZTL (Зуботехническая Лаборатория) Form State
	const [ztlLab, setZtlLab] = useState("");
	const [ztlWorkType, setZtlWorkType] = useState("");
	const [ztlTeeth, setZtlTeeth] = useState("");
	const [ztlImpression, setZtlImpression] = useState("");
	const [ztlColor, setZtlColor] = useState("");
	const [ztlComment, setZtlComment] = useState("");

	useEffect(() => {
		return () => {
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

	const handleApplyMaterial = (materialLabel: string, textTemplate: string) => {
		if (!selectedToothForMenu) return;
		setToothState(selectedToothForMenu.code, "planned" as any);
		appendToEMKField(
			"treatmentPlan",
			`Зуб ${selectedToothForMenu.code}: ${textTemplate} — ${materialLabel}`,
		);
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

				<div
					className="visit-tabs-navigation"
					style={{
						display: "flex",
						gap: "8px",
						borderBottom: "1px solid var(--glass-border)",
						marginBottom: "24px",
						padding: "0 24px",
						position: "relative",
					}}
				>
					{[
						{ id: "diary", label: "Осмотр" },
						{ id: "odontogram", label: "Зубная формула и Дневник" },
						{ id: "diagnostics", label: "Снимки и Анализы" },
						{ id: "conclusion", label: "Заключение" },
					].map((tab) => (
						<button
							key={tab.id}
							type="button"
							className={`nav-item ${activeVisitTab === tab.id ? "active" : ""}`}
							onClick={() => setActiveVisitTab(tab.id as any)}
							style={{
								padding: "12px 20px",
								background: "transparent",
								border: "none",
								cursor: "pointer",
								fontWeight: activeVisitTab === tab.id ? 700 : 500,
								color:
									activeVisitTab === tab.id
										? "var(--text-primary)"
										: "var(--text-secondary)",
								position: "relative",
								transition: "color 0.2s",
							}}
						>
							{tab.label}
							{activeVisitTab === tab.id && (
								<motion.div
									layoutId="visit-tab-indicator"
									style={{
										position: "absolute",
										bottom: -1,
										left: 0,
										right: 0,
										height: 3,
										background: "var(--teal)",
										borderRadius: "3px 3px 0 0",
										boxShadow: "0 0 10px rgba(13, 148, 136, 0.5)",
									}}
								/>
							)}
						</button>
					))}
				</div>

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

				<details
					className="protocol-library"
					aria-label="Шаблоны приема по специальности"
				>
					<summary className="protocol-summary">
						<div>
							<h3>Шаблон приема</h3>
							<p>
								{selectedProtocolTemplate?.title ??
									"Выберите специальность и шаблон"}
							</p>
						</div>
						<span>
							{selectedProtocolTemplate
								? specialtyLabels[selectedProtocolTemplate.specialty]
								: dashboard.protocolTemplates.length}
						</span>
					</summary>
					<div className="protocol-head">
						<div>
							<h3>Шаблон приема</h3>
							<p>
								Выбор специальности меняет протокол, снимки, документы и
								предупреждения.
							</p>
						</div>
						<span>{dashboard.protocolTemplates.length}</span>
					</div>
					<div className="specialty-strip">
						{specialtiesWithTemplates.map((specialty) => (
							<button
								className={selectedSpecialty === specialty ? "active" : ""}
								key={specialty}
								type="button"
								aria-pressed={selectedSpecialty === specialty}
								onClick={() => {
									setSelectedSpecialty(specialty);
									setSelectedProtocolId(null);
								}}
							>
								{specialtyLabels[specialty]}
							</button>
						))}
					</div>
					{selectedProtocolTemplate ? (
						<article className="protocol-card">
							<div>
								<strong>{selectedProtocolTemplate.title}</strong>
								<p>
									{selectedProtocolTemplate.defaultDurationMinutes} мин · снимки{" "}
									{selectedProtocolTemplate.suggestedImaging
										.map((kind) => imagingKindLabels[kind])
										.join(", ")}
								</p>
							</div>
							<div className="protocol-template-list">
								{specialtyProtocolTemplates.map((template) => (
									<button
										className={
											selectedProtocolTemplate.id === template.id
												? "active"
												: ""
										}
										key={template.id}
										type="button"
										aria-pressed={selectedProtocolTemplate.id === template.id}
										onClick={() => setSelectedProtocolId(template.id)}
									>
										{template.visitReason}
									</button>
								))}
							</div>
							<ul>
								{selectedProtocolTemplate.safetyWarnings.map((warning) => (
									<li key={warning}>{warning}</li>
								))}
							</ul>
							<button
								className="secondary-button"
								type="button"
								onClick={() => applyProtocolTemplate(selectedProtocolTemplate)}
							>
								<ClipboardCheck aria-hidden="true" /> Заполнить диктовку
							</button>
						</article>
					) : null}
				</details>

				{workspaceFlags.hasClinicalRules && (
					<details className="clinical-rules-toggle">
						<summary>
							📋 Клинические рекомендации
							{activeVisitClinicalRuleEvaluations?.length
								? ` (${activeVisitClinicalRuleEvaluations.length})`
								: ""}
						</summary>
						<div style={{ marginTop: "1rem" }}>
							<ClinicalRulePanel
								actionLabels={clinicalRuleActionLabels}
								context="visit"
								// evaluations={activeVisitClinicalRuleEvaluations}
								evaluations={
									dashboard?.clinicSettings?.profile?.mode === "solo_doctor"
										? activeVisitClinicalRuleEvaluations.filter(
												(e: any) => e.ownerRole !== "assistant",
											)
										: activeVisitClinicalRuleEvaluations
								}
								serviceTitle={serviceTitle}
								severityLabels={clinicalRuleSeverityLabels}
								staffRoleLabels={staffRoleLabels}
								summary={activeVisitClinicalRuleSummary}
							/>
						</div>
					</details>
				)}

				{activePatient?.id && workspaceFlags.hasDentalLab && (
					<LabOrdersPanel patientId={activePatient.id} />
				)}

				{workspaceFlags.hasGnathology && (
					<GnathologyForm
						visitId={dashboard?.activeVisit?.id ?? null}
						patientId={activePatient?.id ?? null}
					/>
				)}

				{visitCloseChecklist ? (
					<div
						className="close-checklist"
						aria-label="Предупреждения перед закрытием приема"
					>
						<div className="close-checklist-head">
							<div>
								<h3>Закрытие приема</h3>
								<p>
									{primaryVisitWarning?.actionLabel ??
										visitCloseChecklist.nextAction}
								</p>
							</div>
							<span className={visitCloseChecklist.readyToSign ? "ready" : ""}>
								{visitCloseChecklist.readyToSign
									? "готово"
									: `${visitCloseChecklist.score}%`}
							</span>
						</div>
						{visitCloseChecklist.items
							.filter((task: any) =>
								dashboard?.clinicSettings?.profile?.mode === "solo_doctor"
									? task.ownerRole !== "assistant"
									: true,
							)
							.map((task: any) => (
								<button
									className={`close-task ${task.ready ? "done" : ""} ${task.blocking && !task.ready ? "blocking" : ""}`}
									key={task.id}
									type="button"
									onClick={() => {
										const section = task.section.replace("#", "");
										if (
											[
												"diary",
												"odontogram",
												"diagnostics",
												"conclusion",
											].includes(section)
										) {
											setActiveVisitTab(section as any);
										} else if (
											section === "dictation" ||
											section === "emk" ||
											section === "smart-preview"
										) {
											setActiveVisitTab("diary");
										}
										setTimeout(() => {
											const el = document.getElementById(section);
											if (el)
												el.scrollIntoView({
													behavior: "smooth",
													block: "start",
												});
										}, 50);
									}}
								>
									<CheckCircle2 aria-hidden="true" />
									<div>
										<strong>{task.title}</strong>
										<p>{task.detail}</p>
										<small>
											{staffRoleLabels[task.ownerRole]} · {task.actionLabel}
										</small>
									</div>
								</button>
							))}
					</div>
				) : null}
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
		</>
	);
}
