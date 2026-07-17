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

	// ── Clinical Context Modal state ─────────────────────────────
	const [selectedToothForMenu, setSelectedToothForMenu] = React.useState<{
		code: string;
		state: string;
	} | null>(null);
	const [materialCategory, setMaterialCategory] = React.useState<
		"filling" | "crown" | "implant" | null
	>(null);

	const THERAPY_MATERIALS = React.useMemo(() => {
		const services =
			dashboard?.serviceCatalog?.filter((s) => s.category === "therapy") || [];
		if (services.length > 0)
			return services.map((s) => ({ id: s.id, label: s.title }));
		return [
			{ id: "Estelite", label: "Estelite Asteria (Tokuyama, JP)" },
			{ id: "Filtek", label: "3M Filtek Supreme (US)" },
			{ id: "SDR", label: "SDR Bulk-fill (Dentsply, DE)" },
		];
	}, [dashboard?.serviceCatalog]);

	const ORTHO_MATERIALS = React.useMemo(() => {
		const services =
			dashboard?.serviceCatalog?.filter((s) => s.category === "prosthetics") ||
			[];
		if (services.length > 0)
			return services.map((s) => ({ id: s.id, label: s.title }));
		return [
			{ id: "Zirconia", label: "Диоксид циркония" },
			{ id: "E-max", label: "Прессованная керамика E-max" },
			{ id: "PFM", label: "Металлокерамика (CoCr)" },
		];
	}, [dashboard?.serviceCatalog]);

	const IMPLANT_SYSTEMS = React.useMemo(() => {
		const services =
			dashboard?.serviceCatalog?.filter(
				(s) =>
					s.category === "surgery" && s.title.toLowerCase().includes("имплант"),
			) || [];
		if (services.length > 0)
			return services.map((s) => ({ id: s.id, label: s.title }));
		return [
			{ id: "Straumann", label: "Straumann SLActive (CH)" },
			{ id: "Osstem", label: "Osstem TSIII (KR)" },
			{ id: "Nobel", label: "Nobel Biocare Active (SE)" },
		];
	}, [dashboard?.serviceCatalog]);

	const appendToEMKField = (fieldKey: string, text: string) => {
		const currentVal = (visitNoteForm as any)[fieldKey] || "";
		if (!currentVal.includes(text)) {
			const sep = currentVal ? "\n" : "";
			updateVisitNoteField(fieldKey, currentVal + sep + text);
		}
	};

	const closeClinicalModal = () => {
		setSelectedToothForMenu(null);
		setMaterialCategory(null);
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
		closeClinicalModal();
	};

	const handleApplyMaterial = (materialLabel: string, textTemplate: string) => {
		if (!selectedToothForMenu) return;
		setToothState(selectedToothForMenu.code, "planned" as any);
		appendToEMKField(
			"treatmentPlan",
			`Зуб ${selectedToothForMenu.code}: ${textTemplate} — ${materialLabel}`,
		);
		closeClinicalModal();
	};

	// ─────────────────────────────────────────────────────────────

	const emkTabs = [
		{ id: "all", label: "Все поля" },
		{ id: "complaint", label: "Жалобы" },
		{ id: "anamnesis", label: "Анамнез" },
		{ id: "objectiveStatus", label: "Объективно" },
		{ id: "diagnosis", label: "Диагноз" },
		{ id: "treatmentPlan", label: "Лечение" },
	];

	const visibleFields =
		activeEmkTab === "all"
			? visitNoteFieldDefinitions
			: visitNoteFieldDefinitions.filter((f) => f.key === activeEmkTab);

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
					/>

					<section
						className="visit-note-panel"
						aria-label="Черновик электронной медицинской карты"
					>
						<div className="visit-note-head">
							<div>
								<p className="eyebrow">ЭМК после диктовки</p>
								<h3>
									{draft
										? "Проверьте черновик"
										: isVisitNoteDirty
											? "Проверьте правки"
											: "Структура приема"}
								</h3>
							</div>
							<span className={draft || isVisitNoteDirty ? "ready" : ""}>
								{visitNoteStatusLabel}
							</span>
						</div>
						{visitFlowResult && <VisitFlowProgress result={visitFlowResult} />}

						{/* Красивые вкладки (EMK Tabs) для уменьшения перегруженности */}
						<div className="emk-tabs-container" role="tablist">
							{emkTabs.map((tab) => {
								const isFilled =
									tab.id !== "all" &&
									String(visitNoteForm[tab.id] ?? "").trim().length > 0;
								return (
									<button
										key={tab.id}
										type="button"
										role="tab"
										aria-selected={activeEmkTab === tab.id}
										className={`emk-tab-button ${activeEmkTab === tab.id ? "active" : ""}`}
										onClick={() => setActiveEmkTab(tab.id)}
									>
										{tab.label}
										{isFilled && (
											<span className="emk-tab-dot" title="Заполнено" />
										)}
									</button>
								);
							})}
						</div>

						<div
							className={`visit-fields ${activeEmkTab !== "all" ? "single-tab-mode" : ""}`}
						>
							{visibleFields.map((field) => {
								const QUICK_CHIPS: Record<string, string[]> = {
									complaint: [
										"Жалоб нет",
										"Ноющие боли",
										"Острая боль",
										"Боль при накусывании",
										"Реакция на холод/горячее",
										"Застревание пищи",
										"Эстетический дефект",
										"Проф. осмотр",
									],
									anamnesis: [
										"Ранее лечен по поводу неосложненного кариеса",
										"Травма зуба",
										"Хрон. заболевания отрицает",
										"Аллергоанамнез не отягощен",
										"Аллергия на лидокаин",
									],
									objectiveStatus: [
										"Зондирование безболезненно",
										"Перкуссия безболезненна",
										"Слизистая оболочка бледно-розового цвета",
										"Глубокая кариозная полость",
										"Сообщается с полостью зуба",
									],
									diagnosis: [
										"K02.1 Кариес дентина",
										"K04.0 Острый пульпит",
										"K04.5 Хронический апикальный периодонтит",
										"K05.0 Острый гингивит",
										"K08.1 Потеря зубов",
									],
									treatmentPlan: [
										"Анестезия аппликационная",
										"Анестезия инфильтрационная",
										"Коффердам",
										"Мех/Мед обработка",
										"Реставрация композитом светового отверждения",
										"Шлифовка, полировка",
										"Удаление зуба",
									],
								};
								const chips = QUICK_CHIPS[field.key] || [];
								return (
									<div
										key={field.key}
										className="emk-field-container"
										style={{
											display: "flex",
											flexDirection: "column",
											gap: "0.4rem",
										}}
									>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "center",
												width: "100%",
											}}
										>
											<strong style={{ fontSize: "0.85rem", color: "#475569" }}>
												{field.label}
											</strong>
											<SmartMicrophoneButton
												context="visit"
												sterileMode={false}
												onResult={(text) => {
													const curr = visitNoteForm[field.key] || "";
													const sep =
														curr.length > 0 && !curr.endsWith(" ") ? " " : "";
													updateVisitNoteField(field.key, curr + sep + text);
												}}
												style={{ padding: "2px" }}
											/>
										</div>
										{chips.length > 0 && (
											<div
												style={{
													display: "flex",
													flexWrap: "wrap",
													gap: "0.3rem",
												}}
											>
												{chips.map((chip) => (
													<button
														key={chip}
														type="button"
														onClick={() => {
															const curr = visitNoteForm[field.key] || "";
															const sep =
																curr.length > 0 && !curr.endsWith(" ")
																	? ", "
																	: "";
															updateVisitNoteField(
																field.key,
																curr + sep + chip,
															);
														}}
														className="quick-chip"
													>
														+ {chip}
													</button>
												))}
											</div>
										)}
										<textarea
											value={visitNoteForm[field.key]}
											onChange={(event) =>
												updateVisitNoteField(field.key, event.target.value)
											}
											style={{
												minHeight: "80px",
												borderRadius: "8px",
												padding: "0.6rem",
												border: "1px solid var(--slate-300)",
												resize: "vertical",
												width: "100%",
												outline: "none",
											}}
											onFocus={(e) =>
												(e.target.style.borderColor = "var(--brand-400)")
											}
											onBlur={(e) =>
												(e.target.style.borderColor = "var(--slate-300)")
											}
										/>
									</div>
								);
							})}
							<CompletedServicesChecklist />
						</div>

						{draft?.quality ? (
							<div
								className={`visit-draft-quality quality-${draft.quality.level}`}
							>
								<div>
									<strong>
										{visitDraftQualityLabels[draft.quality.level]}
									</strong>
									<span>
										{Math.round(draft.quality.confidence * 100)}% ·{" "}
										{specialtyLabels[draft.quality.specialty]}
									</span>
								</div>
								<p>{draft.quality.nextAction}</p>
								<div className="visit-draft-signal-row">
									{draft.quality.detectedToothCodes
										.slice(0, 6)
										.map((toothCode) => (
											<span key={`tooth-${toothCode}`}>FDI {toothCode}</span>
										))}
									{draft.quality.signals.slice(0, 7).map((signal) => (
										<span key={signal}>{visitDraftSignalLabel(signal)}</span>
									))}
									{draft.quality.missingCriticalFields
										.slice(0, 5)
										.map((field) => (
											<small key={field}>
												проверить: {visitDraftMissingFieldLabel(field)}
											</small>
										))}
								</div>
							</div>
						) : null}

						<div className="ai-draft">
							<ShieldCheck aria-hidden="true" />
							<p>
								{draft
									? draft.warnings.join(" ")
									: isVisitNoteDirty
										? "Правки будут сохранены в ЭМК. Подпись приема остается отдельным действием."
										: pendingVisitSaveCount
											? "Локальное сохранение есть. Серверная синхронизация ожидает подключения или повторной попытки."
											: lastVisitSaveReceipt
												? visitSaveReceiptText(lastVisitSaveReceipt)
												: dashboard.activeVisit?.doctorSummary}
							</p>
							{pendingVisitSaveCount ? (
								<button
									className="secondary-button"
									type="button"
									onClick={() => void flushPendingVisitSaves({ silent: false })}
									disabled={isPendingVisitSyncing}
								>
									{isPendingVisitSyncing ? "Синхронизирую" : "Синхронизировать"}
								</button>
							) : null}
							{draft || isVisitNoteDirty ? (
								<button
									className="primary-button"
									type="button"
									onClick={acceptDraftToVisit}
									disabled={!visitNoteReadyToAccept || isDraftAccepting}
									aria-describedby={
										!visitNoteReadyToAccept ? "visit-note-missing" : undefined
									}
								>
									<Check aria-hidden="true" /> {visitNoteActionLabel}
								</button>
							) : null}
							{(draft || isVisitNoteDirty) && !visitNoteReadyToAccept ? (
								<div
									className="visit-note-missing"
									id="visit-note-missing"
									role="status"
									aria-live="polite"
									style={{
										marginTop: "1rem",
										background: "var(--amber-50)",
										padding: "1rem",
										borderRadius: "8px",
										border: "1px solid var(--amber-200)",
									}}
								>
									<strong
										style={{
											display: "block",
											marginBottom: "0.5rem",
											color: "var(--amber-900)",
										}}
									>
										Чтобы сохранить запись приема, осталось:
									</strong>
									<ul
										style={{
											margin: 0,
											paddingLeft: "1.5rem",
											color: "var(--amber-800)",
										}}
									>
										{visitNoteAcceptMissingSteps.map((step) => (
											<li key={step}>{step}</li>
										))}
									</ul>
								</div>
							) : null}
						</div>
					</section>
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

				<GnathologyForm
					visitId={dashboard?.activeVisit?.id ?? null}
					patientId={activePatient?.id ?? null}
				/>

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

			{selectedToothForMenu &&
				(() => {
					const { code } = selectedToothForMenu;
					const state = (toothStateByCode as any)[code] ?? "idle";
					const geom = getToothPath(Number(code));
					const cfg = getToothConfig(Number(code));

					// state → fill/stroke colors (same as tooth map)
					const FILL: Record<string, string> = {
						idle: "#fff",
						planned: "#e0f2fe",
						treatment: "#fee2e2",
						watch: "#fef3c7",
						done: "#dcfce7",
						missing: "#f1f5f9",
					};
					const STROKE: Record<string, string> = {
						idle: "#94a3b8",
						planned: "#0284c7",
						treatment: "#dc2626",
						watch: "#d97706",
						done: "#166534",
						missing: "#cbd5e1",
					};
					const ROOT_FILL: Record<string, string> = {
						idle: "#f8fafc",
						planned: "#f0f9ff",
						treatment: "#fff5f5",
						watch: "#fffbeb",
						done: "#f0fdf4",
						missing: "#f1f5f9",
					};
					const ROOT_STROKE: Record<string, string> = {
						idle: "#cbd5e1",
						planned: "#38bdf8",
						treatment: "#f87171",
						watch: "#fbbf24",
						done: "#4ade80",
						missing: "#cbd5e1",
					};

					const isLower = Number(code) >= 30;

					const toothSvg = (
						<svg
							width={cfg.width}
							height={cfg.height}
							viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
							fill="none"
							style={{ transform: isLower ? "scaleY(-1)" : "none" }}
						>
							{state === "missing" ? (
								<g>
									<path
										d={geom.root}
										fill="#f1f5f9"
										stroke="#cbd5e1"
										strokeWidth="1.2"
										opacity="0.15"
									/>
									<path
										d={geom.crown}
										fill="#f1f5f9"
										stroke="#cbd5e1"
										strokeWidth="1.2"
										opacity="0.15"
									/>
									<path
										d="M20 20L80 130M80 20L20 130"
										stroke="#ef4444"
										strokeWidth="5"
										strokeLinecap="round"
										opacity="0.7"
									/>
								</g>
							) : (
								<g>
									<path
										d={geom.root}
										fill={ROOT_FILL[state] ?? "#f8fafc"}
										stroke={ROOT_STROKE[state] ?? "#cbd5e1"}
										strokeWidth="1.5"
										strokeLinejoin="round"
									/>
									{geom.canals &&
										(state === "treatment" || state === "done") && (
											<path
												d={geom.canals}
												fill="none"
												stroke={state === "done" ? "#ec4899" : "#dc2626"}
												strokeWidth="2.5"
												strokeLinecap="round"
												opacity="0.85"
											/>
										)}
									<path
										d={geom.crown}
										fill={FILL[state] ?? "#fff"}
										stroke={STROKE[state] ?? "#94a3b8"}
										strokeWidth="2.2"
										strokeLinejoin="round"
									/>
									{geom.fissures && (
										<path
											d={geom.fissures}
											fill="none"
											stroke="rgba(0,0,0,0.15)"
											strokeWidth="0.8"
										/>
									)}
								</g>
							)}
						</svg>
					);

					return createPortal(
						<>
							<div className="_ccm-overlay" onClick={closeClinicalModal} />
							<div
								className="_ccm-content"
								role="dialog"
								aria-modal="true"
								aria-label={`Зуб ${code}`}
							>
								{/* ── LEFT: Diagnosis ── */}
								<div className="_ccm-panel">
									<h4 className="_ccm-h">🩺 Диагностика</h4>

									{visitWarnings && visitWarnings.length > 0 && (
										<div className="_ccm-warn">
											<strong>⚠️ Риски:</strong>{" "}
											{visitWarnings.map((w: any) => w.title).join(" · ")}
										</div>
									)}

									<div className="_ccm-label">Состояние</div>

									<button
										type="button"
										className={`_ccm-btn${state === "idle" ? " active" : ""}`}
										data-color="green"
										style={
											{
												"--ab": "#f0fdf4",
												"--af": "#166534",
												"--abr": "#bbf7d0",
											} as any
										}
										onClick={() => handleSelectDiagnosis("idle")}
									>
										Здоров / Норма <span>🟢</span>
									</button>

									<button
										type="button"
										className={`_ccm-btn${state === "done" ? " active" : ""}`}
										data-color="green"
										style={
											{
												"--ab": "#f0fdf4",
												"--af": "#166534",
												"--abr": "#bbf7d0",
											} as any
										}
										onClick={() =>
											handleSelectDiagnosis(
												"done",
												"зуб санирован / здоров",
												"diagnosis",
											)
										}
									>
										Санирован / Готово <span>✅</span>
									</button>

									<button
										type="button"
										className={`_ccm-btn${state === "missing" ? " active" : ""}`}
										data-color="slate"
										onClick={() =>
											handleSelectDiagnosis(
												"missing",
												"зуб отсутствует",
												"diagnosis",
											)
										}
									>
										Отсутствует / Удалён <span>❌</span>
									</button>

									<div className="_ccm-label">Патологии</div>

									<button
										type="button"
										className={`_ccm-btn${state === "watch" ? " active" : ""}`}
										data-color="amber"
										style={
											{
												"--ab": "#fffbeb",
												"--af": "#78350f",
												"--abr": "#fde68a",
											} as any
										}
										onClick={() =>
											handleSelectDiagnosis(
												"watch",
												"K02.1 Кариес дентина",
												"diagnosis",
											)
										}
									>
										Кариес дентина (K02.1) <span>⚠️</span>
									</button>

									<button
										type="button"
										className="_ccm-btn"
										data-color="red"
										onClick={() =>
											handleSelectDiagnosis(
												"treatment",
												"K04.0 Острый пульпит",
												"diagnosis",
											)
										}
									>
										Острый пульпит (K04.0) <span>🔥</span>
									</button>

									<button
										type="button"
										className="_ccm-btn"
										data-color="rose"
										onClick={() =>
											handleSelectDiagnosis(
												"treatment",
												"K04.5 Хронический апикальный периодонтит / киста",
												"diagnosis",
											)
										}
									>
										Периодонтит / Киста (K04.5) <span>🔴</span>
									</button>

									<button
										type="button"
										className="_ccm-btn"
										data-color="amber"
										onClick={() =>
											handleSelectDiagnosis(
												"watch",
												"K03.1 Клиновидный дефект",
												"diagnosis",
											)
										}
									>
										Клиновидный дефект (K03.1) <span>🦷</span>
									</button>
								</div>

								{/* ── CENTER: Tooth preview ── */}
								<div className="_ccm-center">
									<div className="_ccm-code-badge">FDI {code}</div>
									<div className="_ccm-tooth-stage" aria-hidden="true">
										{toothSvg}
									</div>
									<button
										type="button"
										className="_ccm-close-btn"
										onClick={closeClinicalModal}
									>
										Закрыть
									</button>
								</div>

								{/* ── RIGHT: Treatment ── */}
								<div className="_ccm-panel">
									<h4 className="_ccm-h">🛠️ Лечение (Зуб {code})</h4>

									{materialCategory ? (
										<div
											style={{
												display: "flex",
												flexDirection: "column",
												gap: ".45rem",
												animation: "_ccm-fade .15s ease-out",
											}}
										>
											<div className="_ccm-label">
												{materialCategory === "filling"
													? "Материал реставрации:"
													: materialCategory === "crown"
														? "Материал коронки:"
														: "Система имплантации:"}
											</div>
											{(materialCategory === "filling"
												? THERAPY_MATERIALS
												: materialCategory === "crown"
													? ORTHO_MATERIALS
													: IMPLANT_SYSTEMS
											).map((mat) => (
												<button
													key={mat.id}
													type="button"
													className="_ccm-btn"
													data-color="blue"
													onClick={() =>
														handleApplyMaterial(
															mat.label,
															materialCategory === "filling"
																? "реставрация композитом"
																: materialCategory === "crown"
																	? "протезирование коронкой"
																	: "установка имплантата",
														)
													}
												>
													{mat.label} <span>✨</span>
												</button>
											))}
											<button
												type="button"
												className="_ccm-btn"
												style={{
													borderStyle: "dashed",
													justifyContent: "center",
													marginTop: ".25rem",
												}}
												onClick={() => setMaterialCategory(null)}
											>
												← Назад
											</button>
										</div>
									) : (
										<>
											<div className="_ccm-label">Терапия</div>
											<button
												type="button"
												className="_ccm-btn"
												data-color="blue"
												onClick={() => setMaterialCategory("filling")}
											>
												Пломба / Реставрация <span>🖊️</span>
											</button>
											<button
												type="button"
												className="_ccm-btn"
												data-color="pink"
												onClick={() =>
													handleSelectDiagnosis(
														"treatment",
														"депульпирование, обтурация каналов",
														"treatmentPlan",
													)
												}
											>
												Лечение каналов (Эндо) <span>🌀</span>
											</button>
											<button
												type="button"
												className="_ccm-btn"
												data-color="amber"
												onClick={() =>
													handleSelectDiagnosis(
														"watch",
														"наблюдение, реминерализация",
														"treatmentPlan",
													)
												}
											>
												Наблюдение / Реминерализация <span>👁️</span>
											</button>

											<div className="_ccm-label">Ортопедия</div>
											<button
												type="button"
												className="_ccm-btn"
												data-color="cyan"
												onClick={() => setMaterialCategory("crown")}
											>
												Коронка на зуб <span>👑</span>
											</button>
											<button
												type="button"
												className="_ccm-btn"
												data-color="violet"
												onClick={() =>
													handleApplyMaterial("E-max (Kerr / Ivoclar)", "винир")
												}
											>
												Винир <span>✨</span>
											</button>

											<div className="_ccm-label">Хирургия</div>
											<button
												type="button"
												className="_ccm-btn"
												data-color="red"
												onClick={() =>
													handleSelectDiagnosis(
														"treatment",
														"удаление зуба: анестезия, синдесмотомия, экстракция, ревизия лунки",
														"treatmentPlan",
													)
												}
											>
												Удаление зуба <span>❌</span>
											</button>
											<button
												type="button"
												className="_ccm-btn"
												data-color="violet"
												onClick={() => {
													if (
														visitWarnings &&
														visitWarnings.some((w: any) =>
															/бисфосф|bisph/i.test(w.title + w.detail),
														)
													) {
														showToast(
															`⚠️ ПРЕДУПРЕЖДЕНИЕ: У пациента обнаружены бисфосфонаты в анамнезе. Имплантация противопоказана — риск остеонекроза. Проконсультируйтесь с хирургом-ортопедом.`,
															"error",
														);
														return;
													}
													setMaterialCategory("implant");
												}}
											>
												Имплантация <span>🔩</span>
											</button>
										</>
									)}
								</div>
							</div>
						</>,
						document.body,
					);
				})()}

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
