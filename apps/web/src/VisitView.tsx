// ShieldCheck убран из импорта вместе с дублирующей панелью ЭМК: он рисовался
// только в её блоке .ai-draft, а тот теперь живёт в components/visit/VisitEmkTab.tsx.
import {
	AlertTriangle,
	Bot,
	Check,
	CheckCircle2,
	ClipboardCheck,
	Mic,
	Sparkles,
} from "lucide-react";
import React, { Suspense, useState } from "react";
import { createPortal } from "react-dom";
import { countLabel } from "./AppHelpers";
import { EmptyState } from "./components/EmptyState";
import { showToast } from "./components/GlobalToast";
import { VisiographAnalyzer } from "./components/imaging/VisiographAnalyzer";
import { PatientAvatar } from "./components/PatientAvatar";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { SpeechChunksInspector } from "./components/visit/SpeechChunksInspector";
import { VisitDiagnosticsTab } from "./components/visit/VisitDiagnosticsTab";
import { VisitEmkTab } from "./components/visit/VisitEmkTab";
import { VisitOdontogramTab } from "./components/visit/VisitOdontogramTab";
import { VisitSpecialtyFocus } from "./components/visit/VisitSpecialtyFocus";
import { VisitTimer } from "./components/visit/VisitTimer";
import { DictationHints } from "./DictationHints";
import { AiOrchestrator } from "./lib/aiOrchestrator";
import { parseVisitDictationLocal } from "./lib/smartVisitParser";
import { SmartParsePreview } from "./SmartParsePreview";
import { useVisitStore } from "./store/visitStore";
import { getToothConfig, getToothPath } from "./utils/toothGeometry";
// Список разделов роли и их названия берём из реестра разделов, а не переписываем
// рядом: разъехавшаяся копия — это ровно тот случай, когда шаг закрытия приёма
// уводит врача на «Смену».
import { getFilteredAppViews, viewLabels } from "./workspaceShell";
import "./styles/VisitView.css";
export interface VisitViewProps {
	AlertTriangle: any;
	Bot: any;
	Check: any;
	CheckCircle2: any;
	ClinicalRulePanel: any;
	ClipboardCheck: any;
	Mic: any;
	Sparkles: any;
	acceptDraftToVisit: any;
	activeAppointment: any;
	activeChair: any;
	activeDoctor: any;
	activeImagingStudies: any;
	activePatient: any;
	activePatientInsight: any;
	activeUsableDocuments: any;
	activeVisitClinicalRuleEvaluations: any;
	polishingField: any;
	polishSingleField: any;
	selectedWorkspaceRole: any;
	activeVisitClinicalRuleSummary: any;
	appendToTranscript: any;
	applyProtocolTemplate: any;
	buildDraft: any;
	buildOfflineDraft: any;
	clearTranscriptWithUndo: any;
	clearedTranscriptSnapshot: any;
	clinicalRuleActionLabels: any;
	clinicalRuleSeverityLabels: any;
	dashboard: any;
	dictationQuickPhrases: any;
	draft: any;
	emptyDictationVoiceActionLabel: any;
	flushPendingSpeechChunks: any;
	flushPendingVisitSaves: any;
	formatTime: any;
	hasVisitTranscriptText: any;
	imagingKindLabels: any;
	isDraftAccepting: any;
	isDraftLoading: any;
	isOnline: any;
	isPendingVisitSyncing: any;
	isServerVoiceRecording: any;
	isTranscriptPolishing: any;
	isVisitDictating: any;
	isVisitNoteDirty: any;
	lastLocalSavedAt: any;
	lastPendingVisitSaveAt: any;
	lastServerDraftSavedAt: any;
	lastVisitSaveReceipt: any;
	localDraftWasRestored: any;
	openVisitWarningAction: any;
	pendingSpeechChunkCount: any;
	pendingSpeechFlushActionLabel: any;
	pendingSpeechFlushActionTitle: any;
	pendingVisitSaveCount: any;
	polishTranscript: any;
	primaryVisitWarning: any;
	scrollToVisitArea: any;
	selectedProtocolTemplate: any;
	selectedSpecialty: any;
	serverDraftSyncState: any;
	serviceTitle: any;
	setClearedTranscriptSnapshot: any;
	setSelectedProtocolId: any;
	setSelectedSpecialty: any;
	setTranscript: any;
	specialtiesWithTemplates: any;
	specialtyLabels: any;
	specialtyProtocolTemplates: any;
	speechGatewayActiveProviderIsLocal: any;
	speechGatewayStatus: any;
	speechRecognitionReady: any;
	speechStatusNote: any;
	speechTranscriptionBusy: any;
	staffRoleLabels: any;
	startServerVoiceRecording: any;
	startVisitDictation: any;
	stopServerVoiceRecording: any;
	toothRows: any;
	toothStateByCode: any;
	transcript: any;
	undoTranscriptClear: any;
	updateVisitNoteField: any;
	visibleVisitSpecialtyFocusOptions: any;
	visitCloseChecklist: any;
	visitDraftBuildMissingSteps: any;
	visitDraftMissingFieldLabel: any;
	visitDraftQualityLabels: any;
	visitDraftReadyToBuild: any;
	visitDraftSignalLabel: any;
	visitDraftUserEditedRef: any;
	visitNoteAcceptMissingSteps: any;
	visitNoteActionLabel: any;
	visitNoteFieldDefinitions: any;
	visitNoteForm: any;
	visitNoteReadyToAccept: any;
	visitNoteStatusLabel: any;
	visitPrimaryAction: any;
	visitSafetyCards: any;
	visitSaveReceiptText: any;
	visitWarnings: any;
	visitWorkflowSteps: any;
	setToothState: (code: string, state: string) => void;
}

import { ClinicalAiPersonalizePanel } from "./ClinicalAiPersonalizePanel";
import { ClinicalTasksPanel } from "./ClinicalTasksPanel";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { VisitNoteDraftPanel } from "./VisitNoteDraftPanel";

export function VisitView(rawProps?: Partial<VisitViewProps>) {
	const logicContext = useAppLogicContext();
	const props = { ...logicContext, ...rawProps } as any;
	const {
		AlertTriangle,
		Bot,
		Check,
		CheckCircle2,
		ClinicalRulePanel,
		ClipboardCheck,
		Mic,
		Sparkles,
		acceptDraftToVisit,
		activeAppointment,
		activeChair,
		activeDoctor,
		activeImagingStudies,
		activePatient: rawActivePatient,
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
	} = props;

	// БЫЛО: если пациент не выбран, подставлялся ПЕРВЫЙ пациент клиники, а если
	// и его нет — вымышленный «Смирнов Алексей Петрович». Врач открывал «Текущий
	// приём», видел в шапке реального, но постороннего пациента, и диктовал приём,
	// считая, что запись идёт этому человеку, — тогда как сохранение уходило
	// в dashboard.activeVisit, то есть совсем другому пациенту.
	// Проверка «if (!activePatient)» ниже из-за этого была недостижима.
	const activePatient = rawActivePatient ?? null;

	const safeVisitPrimaryAction = visitPrimaryAction || {
		label: "Сохранить прием",
		detail: "Готово к сохранению в историю",
		disabled: false,
		kind: "save",
		onClick: () => {},
	};
	const safeVisitWorkflowSteps = Array.isArray(visitWorkflowSteps)
		? visitWorkflowSteps
		: [];
	const safeVisitSafetyCards = Array.isArray(visitSafetyCards)
		? visitSafetyCards
		: [];
	const safeSpecialtyLabels = specialtyLabels || {
		universal: "Универсальный прием",
	};

	const [visitSubViewTab, setVisitSubViewTab] = useState<
		"emk" | "odontogram" | "diagnostics"
	>("emk");
	const [showHints, setShowHints] = useState(false);
	const [showSmartPreview, setShowSmartPreview] = useState(false);
	const [smartParsedData, setSmartParsedData] = useState<any>(null);

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
		"filling" | "crown" | "implant" | "veneer" | null
	>(null);

	/*
    НАЗВАНИЯ МАТЕРИАЛОВ ПОПАДАЮТ В ТЕКСТ ПЛАНА ЛЕЧЕНИЯ, ПОЭТОМУ ОНИ ТОЧНЫЕ.

    Убраны двухбуквенные коды стран — «(Tokuyama, JP)», «(US)», «(CH)», «(KR)»,
    «(SE)». На клиническом экране это чистый шум: страна не нужна ни врачу, ни
    складу, а латиница без перевода мешает медсестре и администратору. Само
    торговое название и производитель оставлены: именно по ним материал ищут на
    складе и в накладной, переводить их нельзя.
    «CoCr» тоже убрано: сплав кобальт-хром на кнопке ничего не уточняет.
  */
	const THERAPY_MATERIALS = [
		{ id: "Estelite", label: "Композит Estelite Asteria (Tokuyama)" },
		{ id: "Filtek", label: "Композит Filtek Supreme (3M)" },
		{ id: "SDR", label: "Текучий композит SDR (Dentsply)" },
	];
	const ORTHO_MATERIALS = [
		{ id: "Zirconia", label: "Диоксид циркония" },
		{ id: "E-max", label: "Прессованная керамика E-max (Ivoclar)" },
		{ id: "PFM", label: "Металлокерамика" },
	];
	const IMPLANT_SYSTEMS = [
		{ id: "Straumann", label: "Имплантат Straumann SLActive" },
		{ id: "Osstem", label: "Имплантат Osstem TSIII" },
		{ id: "Nobel", label: "Имплантат Nobel Biocare Active" },
	];

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

	// Карточка зуба перекрывает весь экран, а закрывалась только кнопкой и щелчком
	// по фону. Escape — привычный выход, и он же самый быстрый, когда руки в
	// перчатках и мышь отложена.
	React.useEffect(() => {
		if (!selectedToothForMenu) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") closeClinicalModal();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [selectedToothForMenu]);

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

	const safeVisitWarnings = Array.isArray(visitWarnings) ? visitWarnings : [];
	const safeImagingStudies = Array.isArray(activeImagingStudies)
		? activeImagingStudies
		: [];
	const safeUsableDocuments = Array.isArray(activeUsableDocuments)
		? activeUsableDocuments
		: [];

	// Сколько зубов сейчас раскрашено. Нужно, чтобы врач видел объём своей
	// пометки: карта живёт только до конца приёма, и молча терять десяток отметок
	// нельзя даже когда они рабочие.
	const markedToothCount = Object.values(
		(toothStateByCode ?? {}) as Record<string, string>,
	).filter((state) => Boolean(state) && state !== "idle").length;

	const handleToothClick = (code: string, currentState: string) => {
		if (activeStampRef.current !== null) {
			setToothState(code, activeStampRef.current);
		} else {
			setSelectedToothForMenu({ code, state: currentState });
		}
	};

	/*
    ПЕРЕХОД ПО ШАГУ ЗАКРЫТИЯ ПРИЁМА НЕ ВЫБРАСЫВАЕТ ВРАЧА ИЗ ПРИЁМА.

    БЫЛО: `window.location.hash = task.section` без разбора. Шаги закрытия
    приходят с сервера и указывают любой раздел из workspaceSectionSchema,
    включая «finance» и «settings», а роль «врач» ни того, ни другого не имеет
    (getFilteredAppViews в workspaceShell.tsx). Сторож маршрута в useAppLogic
    видит недоступный раздел и переводит на «Смену» — то есть врач, нажавший в
    списке закрытия шаг «взять оплату», молча оказывался на другом экране, без
    приёма и без единого слова о причине. Проверяем доступность заранее и
    объясняем, кто этот шаг закрывает.
  */
	const openCloseChecklistSection = (task: any) => {
		const section = typeof task?.section === "string" ? task.section : "";
		if (!section) {
			showToast(
				"У этого шага не указан раздел — открыть его автоматически нельзя.",
				"info",
			);
			return;
		}
		const allowedViews = getFilteredAppViews(selectedWorkspaceRole) as string[];
		if (!allowedViews.includes(section)) {
			const sectionTitle =
				(viewLabels as Record<string, string>)[section] ?? section;
			const ownerTitle =
				(staffRoleLabels && staffRoleLabels[task?.ownerRole]) ||
				"другой сотрудник";
			showToast(
				`Шаг закрывают в разделе «${sectionTitle}», а он открыт другой роли: ${ownerTitle}. Приём остаётся открытым — попросите закрыть шаг с того рабочего места.`,
				"info",
				10000,
			);
			return;
		}
		window.location.hash = section;
	};

	/*
    РАЗБОР ДИКТОВКИ ВОЗВРАЩАЕТ ВРАЧА К ТЕКСТУ, КОТОРЫЙ НАДО ПРОВЕРИТЬ.

    Поля ЭМК живут во вкладке «ЭМК и Диктовка». Кнопки «Разобрать текст» и
    «Собрать нейро-черновик» стоят ниже вкладок и доступны всегда, поэтому их
    можно нажать, стоя на зубной формуле или на снимках. Черновик в этом случае
    заполнялся, а на экране не менялось ничего: врач видел неотличимую от
    отказа тишину и нажимал ещё раз. Печатать заново он не начинал только
    потому, что текст диктовки остаётся на месте.
  */
	React.useEffect(() => {
		if (draft) setVisitSubViewTab("emk");
	}, [draft]);

	/*
    Запоминаем, что зубную формулу уже открывали: ниже вкладка после этого
    только скрывается, но не размонтируется, чтобы не терялся набранный
    дневник приёма. Подробнее — в комментарии у самой вкладки.
  */
	const [odontogramTabWasOpened, setOdontogramTabWasOpened] = useState(false);
	React.useEffect(() => {
		if (visitSubViewTab === "odontogram") setOdontogramTabWasOpened(true);
	}, [visitSubViewTab]);

	/*
    ЗАГРУЗКА И «ПАЦИЕНТ НЕ ВЫБРАН» — РАЗНЫЕ СОСТОЯНИЯ.

    Было: пока dashboard не пришёл, activePatient пуст, и экран уверенно
    заявлял «Пациент не выбран». Администратор с трубкой в руке шёл выбирать
    пациента заново, хотя выбор был сделан и данные ещё летели по сети.
  */
	if (!activePatient && !dashboard) {
		return (
			<div className="panel visit-panel" id="visit" data-testid="visit-view">
				<div className="panel-heading">
					<h2>Текущий прием</h2>
				</div>
				<div
					role="status"
					aria-live="polite"
					style={{
						margin: "24px 0",
						padding: "24px",
						textAlign: "center",
						color: "var(--muted)",
					}}
				>
					<p style={{ margin: 0, fontSize: "1rem" }}>Открываем приём…</p>
					<p style={{ margin: "6px 0 0", fontSize: "0.9rem" }}>
						Загружаем карту пациента и запись смены.
					</p>
				</div>
			</div>
		);
	}

	if (!activePatient) {
		return (
			<div className="panel visit-panel" id="visit" data-testid="visit-view">
				<div className="panel-heading">
					<h2>Текущий прием</h2>
				</div>
				{/*
          Подсказка отправляла в другой раздел, но попасть туда из неё было
          нельзя: человек читал «выберите пациента в разделе Пациенты» и шёл
          искать этот раздел глазами по меню. Пустое состояние, которое
          называет действие и не даёт его сделать, — это тупик, а приём —
          самый частый экран смены.

          Переход сделан обычными якорями на раздел — тем же механизмом, что и
          боковое меню (workspaceShell.tsx:388 рисует <a href={`#${view}`}>).
          Своего способа навигации здесь не заводится: второй механизм разошёлся
          бы с меню при первой правке одного из них.
        */}
				<EmptyState
					icon={<ClipboardCheck size={36} />}
					title="Пациент не выбран"
					description="Выберите пациента или откройте запись на приём — тогда здесь появится карта пациента и диктовка."
					glass={true}
					style={{ margin: "24px 0" }}
					action={
						<div
							style={{
								display: "flex",
								gap: "8px",
								flexWrap: "wrap",
								justifyContent: "center",
							}}
						>
							<a className="primary-button" href="#patients">
								Выбрать пациента
							</a>
							<a className="secondary-button" href="#schedule">
								Открыть записи на сегодня
							</a>
						</div>
					}
				/>
			</div>
		);
	}

	return (
		<>
			<div className="panel visit-panel" id="visit" data-testid="visit-view">
				<div className="panel-heading">
					<h2>Текущий прием</h2>
					<span className="status-pill status-in_treatment">Черновик</span>
				</div>

				<section className="visit-focus-bar" aria-label="Быстрый фокус приема">
					<div className="visit-focus-patient">
						<PatientAvatar fullName={activePatient.fullName} size={44} />
						<div>
							<p className="eyebrow">Пациент сейчас</p>
							<h3>{activePatient.fullName}</h3>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<p style={{ margin: 0 }}>
									{activeAppointment?.reason ?? "прием"} ·{" "}
									{activePatient.phone ?? "телефон не указан"}
								</p>
								<VisitTimer createdAt={dashboard?.activeVisit?.createdAt} />
							</div>
						</div>
					</div>
					<div className="visit-focus-status">
						{/* Было «4 предупр.» — сокращение ради экономии трёх букв. */}
						<span className={safeVisitWarnings.length ? "" : "ready"}>
							{safeVisitWarnings.length
								? countLabel(
										safeVisitWarnings.length,
										"предупреждение",
										"предупреждения",
										"предупреждений",
									)
								: "спокойно"}
						</span>
						<strong>{primaryVisitWarning?.title ?? "Можно вести прием"}</strong>
						{/* Было «1 снимка · 0 документа»: счёт без склонения читается
                    как ошибка программы. */}
						<p>
							{visitCloseChecklist
								? `${visitCloseChecklist.score}% готовности`
								: "статус закрытия не рассчитан"}{" "}
							· предупреждения не останавливают прием ·{" "}
							{countLabel(
								safeImagingStudies.length,
								"снимок",
								"снимка",
								"снимков",
							)}{" "}
							·{" "}
							{countLabel(
								safeUsableDocuments.length,
								"документ",
								"документа",
								"документов",
							)}
						</p>
					</div>
					<div className="visit-focus-actions">
						<button
							className="primary-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
							type="button"
							onClick={() => scrollToVisitArea(".dictation-box")}
						>
							<Mic aria-hidden="true" /> Диктовка
						</button>
						<button
							className="secondary-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
							type="button"
							onClick={openVisitWarningAction}
						>
							<AlertTriangle aria-hidden="true" /> Риски
						</button>
					</div>
				</section>

				<div
					className="visit-sub-nav-tabs"
					role="tablist"
					aria-label="Разделы визита"
					style={{ display: "flex", gap: "8px", margin: "16px 0" }}
				>
					<button
						type="button"
						role="tab"
						aria-selected={visitSubViewTab === "emk"}
						className={`secondary-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors ${visitSubViewTab === "emk" ? "active" : ""}`}
						style={{
							background:
								visitSubViewTab === "emk" ? "var(--teal-dark)" : undefined,
							color: visitSubViewTab === "emk" ? "var(--on-teal)" : undefined,
						}}
						onClick={() => setVisitSubViewTab("emk")}
					>
						📝 ЭМК и Диктовка
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={visitSubViewTab === "odontogram"}
						className={`secondary-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors ${visitSubViewTab === "odontogram" ? "active" : ""}`}
						style={{
							background:
								visitSubViewTab === "odontogram"
									? "var(--teal-dark)"
									: undefined,
							color:
								visitSubViewTab === "odontogram" ? "var(--on-teal)" : undefined,
						}}
						onClick={() => setVisitSubViewTab("odontogram")}
					>
						🦷 Зубная формула и Дневник
					</button>
					<button
						type="button"
						className={`secondary-button ${visitSubViewTab === "diagnostics" ? "active" : ""}`}
						style={{
							background:
								visitSubViewTab === "diagnostics"
									? "var(--teal-dark)"
									: undefined,
							color:
								visitSubViewTab === "diagnostics"
									? "var(--on-teal)"
									: undefined,
						}}
						onClick={() => setVisitSubViewTab("diagnostics")}
					>
						🖼️ Рентгены и Диагностика
					</button>
				</div>

				{visitSubViewTab === "emk" && (
					<div
						style={{
							margin: "16px 0",
							display: "flex",
							flexDirection: "column",
							gap: "16px",
						}}
					>
						<VisitSpecialtyFocus />
						{/*
                  Здесь стоял <VisitDictation /> — вторая диктовка на том же
                  экране, рядом с работающей. Отличить их на глаз нельзя.

                  ПОПРАВКА К ЭТОМУ КОММЕНТАРИЮ (файл компонента удалён вместе с
                  ней). Здесь утверждалось, что сломана была именно копия:
                  подпись действия пустыми кавычками, пустой список «Чтобы
                  собрать черновик, осталось:», отсутствие быстрых фраз —
                  «потому что тех двух имён в контексте нет». На день удаления
                  это уже неверно: и dictationQuickPhrases, и
                  visitDraftBuildMissingSteps стоят в возвращаемом объекте
                  useAppLogic.tsx (:13962 и :14712), а три коммита от 2026-07-29
                  починили в копии настоящие дефекты. Ни один из них не дошёл до
                  человека — экран, который их содержал, не открывался ни одной
                  кнопкой. Это цена недостижимого файла, а не оправдание для него.

                  Причина снятия, которая ПРОВЕРЕНА и остаётся в силе: у копии
                  ноль собственных строк для человека — все её 28 русских строк
                  есть в этом файле, — а класс «dictation-box» у обеих один.
                  Переход «к диктовке» из шапки берёт первое совпадение
                  (useAppLogic.tsx:13764, querySelector), поэтому два таких блока
                  на экране означают, что кнопка врача уводит курсор в чужое поле.

                  Рабочая диктовка — ниже. Выносить её в компонент надо от неё же.
                */}
						<VisitEmkTab />
					</div>
				)}

				{/*
              ВКЛАДКА «ЗУБНАЯ ФОРМУЛА» НЕ РАЗМОНТИРУЕТСЯ, А ПРЯЧЕТСЯ — ИНАЧЕ
              ТЕРЯЕТСЯ НАПИСАННЫЙ ДНЕВНИК ПРИЁМА.

              БЫЛО: `visitSubViewTab === "odontogram" && (...)`. Уход с вкладки
              размонтировал VisitOdontogramTab вместе с дневником приёма
              (VisitDiaryEditor), а его хук useVisitDiaryLogic в cleanup делает
              setDiary(EMPTY_DIARY) и гасит автосохранение. Автосохранение там —
              интервал 30 секунд, финального сохранения при выходе нет. Значит
              врач писал анамнез и status localis, нажимал вкладку «ЭМК» — и
              всё, набранное после последнего тика, исчезало. Хуже того, уйти с
              вкладки можно было не своими руками: эффект выше сам переводит на
              «ЭМК», как только собран черновик, а кнопки диктовки стоят ниже
              вкладок и доступны с любой из них. При возврате дневник заново
              читался с сервера и показывал старую версию — экран выглядел
              исправным, и понять, что текст пропал, было нельзя.

              Теперь вкладка монтируется при первом открытии и дальше только
              скрывается: состояние дневника и его автосохранение продолжают
              жить. Заранее не монтируем — иначе дневник читался бы с сервера у
              каждого приёма, даже если врач в формулу не заходил.
            */}
				{odontogramTabWasOpened && (
					<div
						style={{
							margin: "16px 0",
							display: visitSubViewTab === "odontogram" ? undefined : "none",
						}}
						aria-hidden={visitSubViewTab !== "odontogram"}
					>
						<VisitOdontogramTab
							activePatient={activePatient}
							activeAppointment={activeAppointment}
							dashboard={dashboard}
						/>
					</div>
				)}

				{visitSubViewTab === "diagnostics" && (
					<div style={{ margin: "16px 0" }}>
						<VisitDiagnosticsTab activePatient={activePatient} />
					</div>
				)}

				<details
					className="clinical-rules-toggle"
					style={{
						border: "1px solid var(--line)",
						borderRadius: "12px",
						overflow: "hidden",
						margin: "0.75rem 0",
					}}
				>
					<summary
						style={{
							padding: "0.75rem 1rem",
							background: "var(--paper)",
							fontSize: "0.85rem",
							fontWeight: 700,
							color: "var(--ink)",
							cursor: "pointer",
							outline: "none",
						}}
					>
						🧭 Шаги приема и статус: {safeVisitPrimaryAction.label}
					</summary>
					<div style={{ marginTop: "1rem", padding: "0 1rem 1rem 1rem" }}>
						<section
							className="visit-next-step"
							data-testid="visit-next-step-panel"
							aria-label="Следующий шаг приема"
						>
							<div className="visit-next-step-main">
								<div>
									<p className="eyebrow">Сейчас сделать</p>
									<h3>{safeVisitPrimaryAction.label}</h3>
									<p id="visit-primary-action-detail">
										{safeVisitPrimaryAction.detail}
									</p>
								</div>
								<button
									className="primary-button visit-primary-action"
									type="button"
									onClick={safeVisitPrimaryAction.onClick}
									disabled={safeVisitPrimaryAction.disabled}
									aria-describedby="visit-primary-action-detail"
									data-testid="visit-primary-action"
								>
									{safeVisitPrimaryAction.kind === "dictation" ? (
										<Mic aria-hidden="true" />
									) : null}
									{safeVisitPrimaryAction.kind === "draft" ? (
										<Bot aria-hidden="true" />
									) : null}
									{safeVisitPrimaryAction.kind === "save" ||
									safeVisitPrimaryAction.kind === "close" ? (
										<Check aria-hidden="true" />
									) : null}
									{safeVisitPrimaryAction.kind === "review" ? (
										<AlertTriangle aria-hidden="true" />
									) : null}
									{safeVisitPrimaryAction.label}
								</button>
							</div>
							<div
								className="visit-progress-strip"
								data-testid="visit-progress-strip"
								aria-label="Прогресс приема"
							>
								{safeVisitWorkflowSteps.map((step: any, index: number) => (
									<article
										className={`visit-progress-step step-${step.state}`}
										key={step.key}
									>
										<span>{index + 1}</span>
										<div>
											<strong>{step.label}</strong>
											<p>{step.detail}</p>
										</div>
									</article>
								))}
							</div>
						</section>
					</div>
				</details>

				<details
					className="visit-safety-strip-toggle"
					style={{
						margin: "1rem 0",
						fontSize: "0.85rem",
						color: "var(--muted)",
					}}
				>
					<summary style={{ cursor: "pointer", userSelect: "none" }}>
						Инженерный статус (локальное сохранение, связь с сервером)
					</summary>
					<section
						className="visit-safety-strip"
						aria-label="Сохранность черновика и диктовки"
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: "1rem",
							marginTop: "1rem",
							padding: "1rem",
							background: "var(--paper-soft)",
							borderRadius: "8px",
						}}
					>
						{safeVisitSafetyCards.map((item: any) => (
							<article
								className={`safety-${item.state}`}
								key={item.key}
								style={{ flex: "1 1 200px" }}
							>
								<span
									style={{
										display: "block",
										fontSize: "0.75rem",
										textTransform: "uppercase",
										letterSpacing: "0.05em",
									}}
								>
									{item.label}
								</span>
								<strong style={{ display: "block", margin: "4px 0" }}>
									{item.value}
								</strong>
								<p
									style={{ margin: "0", fontSize: "0.8rem", lineHeight: "1.2" }}
								>
									{item.detail}
								</p>
							</article>
						))}
					</section>
				</details>

				{/*
              ЗДЕСЬ СТОЯЛА ВТОРАЯ ПОЛОСА «ФОКУС ВРАЧА» — ДУБЛЬ ОДИН В ОДИН.
              Тот же заголовок, те же кнопки специальностей, тот же обработчик;
              первая (компонент VisitSpecialtyFocus) рисуется во вкладке «ЭМК и
              Диктовка» на несколько сантиметров выше. Врач видел два одинаковых
              набора переключателей и не мог знать, отличаются ли они.
              Оставлен один — компонентный, потому что именно он принадлежит
              вкладке, которую врач открывает.
            */}

				<div
					className="dictation-box"
					data-recording={isServerVoiceRecording}
					style={{ position: "relative" }}
				>
					{speechTranscriptionBusy && (
						<div className="dictation-overlay-skeleton">
							<div className="skeleton-wave"></div>
							<div className="skeleton-wave"></div>
							<div className="skeleton-wave"></div>
						</div>
					)}
					<div className="dictation-header">
						{/*
                  Инлайновый color: var(--red-500) убран. Имя --red-500 не
                  объявлено ни в одном файле стилей, то есть красить микрофон оно
                  не могло. Красным он всё-таки был — но по другой причине:
                  .recording-icon-pulse задаёт color: var(--bad-fg) !important
                  (styles/dente-redesign.css:586), а объявление с !important
                  сильнее инлайнового. Дальше держим цвет там же, в классе, иначе
                  следующий читатель поверит несуществующей переменной.
                */}
						<Mic
							aria-hidden="true"
							className={isServerVoiceRecording ? "recording-icon-pulse" : ""}
						/>
						<div>
							<h3
								style={{ display: "flex", alignItems: "center", gap: "10px" }}
							>
								Диктовка врача
								{speechTranscriptionBusy && (
									<span className="transcribing-badge-pulse">
										Обработка голоса...
									</span>
								)}
							</h3>
							<p>
								Черновик, требует подтверждения врача.{" "}
								<span style={{ color: "var(--muted)", fontSize: "0.9em" }}>
									{serverDraftSyncState === "saving" ||
									pendingVisitSaveCount > 0
										? "Синхронизация..."
										: !isOnline
											? "Офлайн (сохранено локально)"
											: lastServerDraftSavedAt
												? `Сохранено ${formatTime ? formatTime(lastServerDraftSavedAt) : lastServerDraftSavedAt}`
												: lastLocalSavedAt
													? `Локально сохранено ${formatTime ? formatTime(lastLocalSavedAt) : lastLocalSavedAt}`
													: "Автосохранение включено"}
								</span>
								{speechStatusNote ? (
									<span
										style={{
											display: "inline-block",
											marginLeft: "8px",
											color: "var(--rust)",
											fontSize: "0.9em",
										}}
									>
										{speechStatusNote}
									</span>
								) : null}
							</p>
						</div>
					</div>
					<div
						className="dictation-quick-row"
						aria-label="Быстрые фразы для диктовки"
					>
						{(Array.isArray(dictationQuickPhrases)
							? dictationQuickPhrases
							: []
						).map((phrase: any) => (
							<button
								type="button"
								key={phrase.label}
								onClick={() =>
									appendToTranscript && appendToTranscript(phrase.text)
								}
							>
								{phrase.label}
							</button>
						))}
					</div>
					<div style={{ position: "relative" }}>
						<div style={{ position: "relative", width: "100%" }}>
							<textarea
								aria-label="Текст диктовки"
								value={transcript}
								onFocus={() => setShowHints(true)}
								onBlur={() => setTimeout(() => setShowHints(false), 200)}
								onChange={(event) => {
									visitDraftUserEditedRef.current = true;
									setTranscript(event.target.value);
									if (event.target.value.trim())
										setClearedTranscriptSnapshot(null);
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter" && e.ctrlKey && transcript.trim()) {
										e.preventDefault();
										const orchestratorResult =
											AiOrchestrator.processEmkDictation(transcript);
										const parsed =
											orchestratorResult.source === "local_algorithm"
												? orchestratorResult.data
												: {
														isAiTask: true,
														prompt: orchestratorResult.suggestedPrompt,
													};
										setSmartParsedData(parsed);
										setShowSmartPreview(true);
										setShowHints(false);
									}
								}}
								placeholder={
									typeof window !== "undefined" &&
									(window.innerWidth <= 860 || "ontouchstart" in window)
										? "Диктуйте или введите текст приема..."
										: "Диктуйте... (Нажмите Ctrl+Enter для предпросмотра)"
								}
								style={{
									minHeight: "120px",
									width: "100%",
									resize: "vertical",
								}}
							/>

							<DictationHints
								isVisible={showHints || isServerVoiceRecording}
								type="visit"
							/>
						</div>

						{isServerVoiceRecording && (
							<div
								style={{
									marginTop: "8px",
									padding: "12px",
									background: "var(--paper-soft)",
									color: "var(--muted)",
									borderRadius: "8px",
									border: "1px dashed var(--line)",
									fontStyle: "italic",
									fontSize: "14px",
									display: "flex",
									alignItems: "center",
									gap: "12px",
								}}
							>
								<div
									style={{
										display: "flex",
										gap: "4px",
										height: "16px",
										alignItems: "center",
									}}
								>
									<div
										className="skeleton-wave"
										style={{
											width: "4px",
											height: "10px",
											background: "#ef4444",
											borderRadius: "2px",
											animation: "skeleton-wave 1s ease-in-out infinite",
											animationDelay: "0s",
										}}
									/>
									<div
										className="skeleton-wave"
										style={{
											width: "4px",
											height: "10px",
											background: "#ef4444",
											borderRadius: "2px",
											animation: "skeleton-wave 1s ease-in-out infinite",
											animationDelay: "0.2s",
										}}
									/>
									<div
										className="skeleton-wave"
										style={{
											width: "4px",
											height: "10px",
											background: "#ef4444",
											borderRadius: "2px",
											animation: "skeleton-wave 1s ease-in-out infinite",
											animationDelay: "0.4s",
										}}
									/>
								</div>
								<span>Слушаю вас...</span>
							</div>
						)}
						<SmartParsePreview
							isVisible={showSmartPreview}
							parsedData={smartParsedData}
							rawText={transcript}
							type="visit"
							onApply={(data: any) => {
								if (data) {
									if (data.toothUpdates) {
										data.toothUpdates.forEach((t: any) =>
											setToothState(t.code, t.state),
										);
									}
									if (data.emkUpdates) {
										Object.entries(data.emkUpdates).forEach(([k, v]) => {
											if (v) appendToEMKField(k, v as string);
										});
									}
								}
								setShowSmartPreview(false);
							}}
							onManual={() => setShowSmartPreview(false)}
							onClose={() => setShowSmartPreview(false)}
						/>
					</div>
					<div
						className="dictation-actions"
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: "10px",
							alignItems: "center",
						}}
					>
						<SmartMicrophoneButton
							context="visit"
							onResult={(text) => {
								const current = transcript || "";
								const newText = current ? `${current}\n${text}` : text;
								setTranscript(newText);

								const orchestratorResult =
									AiOrchestrator.processEmkDictation(newText);
								const parsed =
									orchestratorResult.source === "local_algorithm"
										? orchestratorResult.data
										: {
												isAiTask: true,
												prompt: orchestratorResult.suggestedPrompt,
											};
								setSmartParsedData(parsed);
								setShowSmartPreview(true);
								setShowHints(false);
							}}
							style={{
								padding: "12px 16px",
								fontSize: "15px",
								justifyContent: "center",
							}}
						/>

						<button
							className="primary-button"
							type="button"
							style={{ padding: "12px 16px", fontSize: "15px" }}
							onClick={() => {
								const orchestratorResult =
									AiOrchestrator.processEmkDictation(transcript);
								const parsed =
									orchestratorResult.source === "local_algorithm"
										? orchestratorResult.data
										: {
												isAiTask: true,
												prompt: orchestratorResult.suggestedPrompt,
											};
								setSmartParsedData(parsed);
								setShowSmartPreview(true);
								setShowHints(false);
							}}
							disabled={!hasVisitTranscriptText}
							aria-describedby={
								!hasVisitTranscriptText ? "dictation-clear-guidance" : undefined
							}
						>
							<Check
								aria-hidden="true"
								style={{ width: "18px", height: "18px" }}
							/>{" "}
							Разобрать текст
						</button>

						<button
							className="secondary-button"
							type="button"
							style={{ padding: "12px 16px", fontSize: "15px" }}
							onClick={buildDraft}
							disabled={isDraftLoading || !visitDraftReadyToBuild}
							aria-describedby={
								!visitDraftReadyToBuild ? "visit-draft-missing" : undefined
							}
						>
							<Bot
								aria-hidden="true"
								style={{ width: "18px", height: "18px" }}
							/>{" "}
							{isDraftLoading ? "Собираю" : "Собрать нейро-черновик"}
						</button>

						<div style={{ flexGrow: 1 }} />

						<button
							className="secondary-button"
							type="button"
							onClick={clearTranscriptWithUndo}
							disabled={!hasVisitTranscriptText}
							title="Очистить текст"
						>
							Очистить
						</button>
						{clearedTranscriptSnapshot ? (
							<button
								className="secondary-button"
								type="button"
								onClick={undoTranscriptClear}
								title="Вернуть текст"
							>
								Вернуть
							</button>
						) : null}
						<details
							className="advanced-dictation-actions"
							style={{ display: "inline-block" }}
						>
							<summary
								style={{
									cursor: "pointer",
									fontSize: "14px",
									color: "var(--muted)",
									padding: "8px",
								}}
							>
								Дополнительно
							</summary>
							<div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
								{pendingSpeechChunkCount ? (
									<button
										className="secondary-button"
										type="button"
										onClick={() => flushPendingSpeechChunks({ silent: false })}
										title={pendingSpeechFlushActionTitle}
									>
										{pendingSpeechFlushActionLabel}
									</button>
								) : null}
								<button
									className="secondary-button"
									type="button"
									onClick={polishTranscript}
									disabled={!hasVisitTranscriptText || isTranscriptPolishing}
									aria-describedby={
										!hasVisitTranscriptText
											? "dictation-clear-guidance"
											: undefined
									}
									title={
										speechGatewayStatus?.polishPolicy.neuralEnabled
											? `Аккуратная очистка текста: ${speechGatewayStatus.polishPolicy.modelName ?? "модель"}`
											: "Локальная очистка терминов, секций и номеров зубов"
									}
								>
									<Sparkles aria-hidden="true" />{" "}
									{isTranscriptPolishing ? "Чищу" : "Очистить текст"}
								</button>
							</div>
						</details>

						{!hasVisitTranscriptText ? (
							<div
								className="dictation-action-guidance"
								id="dictation-clear-guidance"
								role="status"
								aria-live="polite"
							>
								В диктовке пока нет текста: нажмите «Голос», «
								{emptyDictationVoiceActionLabel}» или впишите текст вручную.
							</div>
						) : null}
						{!visitDraftReadyToBuild ? (
							<div
								className="visit-draft-missing"
								id="visit-draft-missing"
								role="status"
								aria-live="polite"
							>
								<strong>Чтобы собрать черновик, осталось:</strong>
								<ul>
									{(visitDraftBuildMissingSteps || []).map((step: any) => (
										<li key={step}>{step}</li>
									))}
								</ul>
							</div>
						) : null}
					</div>
				</div>

				<SpeechChunksInspector />

				<VisiographAnalyzer />

				<div className="tooth-map" aria-label="Зубная карта">
					{/*
                НЕ УДАЛЯТЬ: это не забытая кнопка, а зацепка для дымовых прогонов.
                scripts/smoke-visit-live-workflow.mjs и
                scripts/smoke-workspace-live-core-actions.mjs находят её как
                `.tooth-map-selected button`, щёлкают программно, затем щёлкают зуб
                24 и проверяют, что штамп сменил класс зуба. Человеку она не видна
                и не нажимается (opacity 0, pointer-events none), поэтому убрана и
                из чтения экранным диктором: иначе он объявлял кнопку
                «Наблюдение», которая для пользователя ничего не делает.
              */}
					<div
						className="tooth-map-selected"
						style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
						aria-hidden="true"
					>
						<button
							type="button"
							tabIndex={-1}
							onClick={() => {
								setActiveStamp("watch");
								activeStampRef.current = "watch";
							}}
						>
							Наблюдение
						</button>
					</div>
					<div className="tooth-map-head">
						<div>
							<h3>Зубная карта приёма</h3>
							{/*
                    БЫЛО: «Нажмите зуб для смены статуса». Из такой подписи врач
                    делает единственный разумный вывод — что отметки сохраняются.
                    Они НЕ сохраняются: setToothState пишет только в состояние
                    страницы (store/visitStore.ts), при переходе к следующему
                    приёму карта чистится resetVisitToothState, а на сервер уходят
                    ровно пять текстовых полей ЭМК. Можно было отметить полтора
                    десятка зубов, обновить страницу и не найти ничего.
                    Что действительно сохраняется: текст, который дописывает
                    карточка зуба (обычный клик), и постоянная формула зуба во
                    вкладке «Зубная формула и Дневник» — у неё свои запросы
                    сохранения. Пишем это прямо, чтобы никто не принимал цветные
                    зубы за запись в карте пациента.
                  */}
							<p>
								Обычный клик по зубу открывает карточку: выбранный диагноз или
								лечение дописывается в поля приёма и сохраняется вместе с
								приёмом. Сам цвет на карте — рабочая пометка на время приёма, в
								карту пациента она не попадает. Постоянная формула зуба — во
								вкладке «Зубная формула и Дневник».
							</p>
						</div>
						<span
							className="tooth-fdi-badge"
							title="Международная нумерация зубов: сверху 11–18 и 21–28, снизу 31–38 и 41–48"
						>
							Нумерация ФДИ
						</span>
					</div>
					<div className="tooth-map-legend">
						<span className="tooth-legend-item legend-planned">В плане</span>
						<span className="tooth-legend-item legend-treatment">Лечение</span>
						<span className="tooth-legend-item legend-watch">Наблюдение</span>
						<span className="tooth-legend-item legend-done">Готово</span>
						<span className="tooth-legend-item legend-missing">Нет зуба</span>
					</div>

					{/* Быстрая раскраска карты: один выбранный цвет ставится кликом по зубу. */}
					<div
						className="tooth-stamp-bar"
						role="toolbar"
						aria-label="Инструменты быстрого штампа"
					>
						<span className="stamp-bar-title">Быстрый штамп:</span>
						<button
							type="button"
							className={`stamp-btn ${activeStamp === null ? "active" : ""}`}
							onClick={() => setActiveStamp(null)}
						>
							🔍 Обычный клик
						</button>
						<button
							type="button"
							className={`stamp-btn stamp-planned ${activeStamp === "planned" ? "active" : ""}`}
							onClick={() => setActiveStamp("planned")}
						>
							📝 В план
						</button>
						<button
							type="button"
							className={`stamp-btn stamp-treatment ${activeStamp === "treatment" ? "active" : ""}`}
							onClick={() => setActiveStamp("treatment")}
						>
							🔴 Лечение
						</button>
						<button
							type="button"
							className={`stamp-btn stamp-watch ${activeStamp === "watch" ? "active" : ""}`}
							onClick={() => setActiveStamp("watch")}
						>
							⚠️ Наблюдение
						</button>
						<button
							type="button"
							className={`stamp-btn stamp-done ${activeStamp === "done" ? "active" : ""}`}
							onClick={() => setActiveStamp("done")}
						>
							🟢 Готово
						</button>
						<button
							type="button"
							className={`stamp-btn stamp-missing ${activeStamp === "missing" ? "active" : ""}`}
							onClick={() => setActiveStamp("missing")}
						>
							❌ Нет зуба
						</button>
					</div>

					{/*
                Пока штамп включён, каждый клик по зубу только красит карту и НЕ
                открывает карточку зуба — то есть не оставляет ни строчки в записи
                приёма. Разница между двумя режимами на глаз не видна, и врач,
                отметивший десяток зубов штампом, был уверен, что записал их.
                Говорим об этом ровно в тот момент, когда штамп включён.
              */}
					<p
						className="tooth-stamp-note"
						role="status"
						aria-live="polite"
						style={{
							margin: "0.35rem 0 0",
							fontSize: "0.8rem",
							color: "var(--muted)",
						}}
					>
						{activeStamp !== null
							? "Штамп включён: клик красит зуб на карте, но ничего не пишет в запись приёма. Чтобы диагноз попал в карту, вернитесь к «Обычный клик» и выберите его в карточке зуба."
							: markedToothCount > 0
								? `Раскрашено зубов: ${markedToothCount}. Цвет держится до конца приёма; в карту пациента идут поля ЭМК.`
								: "Нажмите зуб — откроется карточка с диагнозами и лечением."}
					</p>

					{/* Панель выбора квадранта (Focus Mode) */}
					<div
						className="tooth-quadrant-nav"
						role="navigation"
						aria-label="Фокус на квадрант"
					>
						<button
							type="button"
							className={`quadrant-nav-btn ${activeQuadrant === null ? "active" : ""}`}
							onClick={() => setActiveQuadrant(null)}
						>
							Вся челюсть
						</button>
						{/*
                  БЫЛО: «ВЧ Лево (Q2)», «НЧ Право (Q4)». Сокращения и латинская
                  буква Q на клиническом экране: медсестра и администратор их не
                  читают, а врач и так знает номера секторов. Слова полностью,
                  номер сектора и диапазон зубов — в подсказке при наведении.
                  Сторона указана как у пациента, как принято в нумерации зубов.
                */}
						<button
							type="button"
							className={`quadrant-nav-btn ${activeQuadrant === 2 ? "active" : ""}`}
							onClick={() => setActiveQuadrant(2)}
							title="Второй сектор: зубы 21–28"
						>
							Верх слева
						</button>
						<button
							type="button"
							className={`quadrant-nav-btn ${activeQuadrant === 1 ? "active" : ""}`}
							onClick={() => setActiveQuadrant(1)}
							title="Первый сектор: зубы 11–18"
						>
							Верх справа
						</button>
						<button
							type="button"
							className={`quadrant-nav-btn ${activeQuadrant === 3 ? "active" : ""}`}
							onClick={() => setActiveQuadrant(3)}
							title="Третий сектор: зубы 31–38"
						>
							Низ слева
						</button>
						<button
							type="button"
							className={`quadrant-nav-btn ${activeQuadrant === 4 ? "active" : ""}`}
							onClick={() => setActiveQuadrant(4)}
							title="Четвёртый сектор: зубы 41–48"
						>
							Низ справа
						</button>
					</div>

					{/* Зубная схема с квадрантами */}
					<div
						className={`tooth-arch-wrapper ${activeQuadrant !== null ? "zoom-active" : ""}`}
					>
						{/* Метки половин верхней челюсти. Раньше здесь стояли «Q1» и «Q2». */}
						{activeQuadrant === null && (
							<div className="tooth-quadrant-labels upper-labels">
								<span
									className="quadrant-label"
									title="Первый сектор: зубы 11–18"
								>
									верх справа
								</span>
								<span
									className="quadrant-label"
									title="Второй сектор: зубы 21–28"
								>
									верх слева
								</span>
							</div>
						)}

						{/* Верхняя челюсть */}
						{(activeQuadrant === null ||
							activeQuadrant === 1 ||
							activeQuadrant === 2) && (
							<div className="tooth-jaw upper-jaw">
								{/* Правая половина верхней: Q1 — 18→11 */}
								{(activeQuadrant === null || activeQuadrant === 1) && (
									<div className="tooth-half tooth-row">
										{(toothRows[0] || []).slice(0, 8).map((code) => {
											const state = toothStateByCode[code] ?? "idle";
											const geom = getToothPath(Number(code));
											const cfg = getToothConfig(Number(code));
											const isDetected = (
												draft?.quality?.detectedToothCodes || []
											).includes(code);
											return (
												<button
													key={code}
													type="button"
													className={`tooth tooth-${state}${state !== "idle" ? " selected" : ""}${isDetected ? " tooth-ai-detected" : ""}`}
													onClick={() => handleToothClick(code, state)}
													aria-label={`Зуб ${code}`}
													data-tooth-state={
														state === "idle" ? undefined : state
													}
												>
													<div
														className="tooth-svg-wrap"
														style={{
															filter: isDetected
																? "drop-shadow(0 0 4px #3b82f6)"
																: "none",
														}}
													>
														<svg
															width={cfg.width}
															height={cfg.height}
															viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
															fill="none"
														>
															{state === "missing" ? (
																<g>
																	<path
																		d={geom.root}
																		fill="var(--paper-soft)"
																		stroke="#cbd5e1"
																		strokeWidth="1.2"
																		opacity="0.15"
																	/>
																	<path
																		d={geom.crown}
																		fill="var(--paper-soft)"
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
																		fill={
																			state === "idle"
																				? "var(--paper-soft)"
																				: state === "planned"
																					? "#f0f9ff"
																					: state === "treatment"
																						? "#fff5f5"
																						: state === "watch"
																							? "#fffbeb"
																							: "#f0fdf4"
																		}
																		stroke={
																			state === "idle"
																				? "#cbd5e1"
																				: state === "planned"
																					? "#38bdf8"
																					: state === "treatment"
																						? "#f87171"
																						: state === "watch"
																							? "#fbbf24"
																							: "#4ade80"
																		}
																		strokeWidth="1.5"
																		strokeLinejoin="round"
																	/>
																	{geom.canals &&
																		(state === "treatment" ||
																			state === "done") && (
																			<path
																				d={geom.canals}
																				fill="none"
																				stroke={
																					state === "done"
																						? "#ec4899"
																						: "#dc2626"
																				}
																				strokeWidth="2.5"
																				strokeLinecap="round"
																				opacity="0.85"
																			/>
																		)}
																	<path
																		d={geom.crown}
																		fill={
																			state === "idle"
																				? "#fff"
																				: state === "planned"
																					? "var(--info-bg)"
																					: state === "treatment"
																						? "var(--bad-bg)"
																						: state === "watch"
																							? "var(--warn-bg)"
																							: "var(--ok-bg)"
																		}
																		stroke={
																			state === "idle"
																				? "#94a3b8"
																				: state === "planned"
																					? "#0284c7"
																					: state === "treatment"
																						? "#dc2626"
																						: state === "watch"
																							? "#d97706"
																							: "#166534"
																		}
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
													</div>
													<span className="tooth-code">{code}</span>
												</button>
											);
										})}
									</div>
								)}
								{/* Центральная линия */}
								{activeQuadrant === null && (
									<div className="tooth-center-line" aria-hidden="true" />
								)}
								{/* Левая половина верхней: Q2 — 21→28 */}
								{(activeQuadrant === null || activeQuadrant === 2) && (
									<div className="tooth-half tooth-row">
										{(toothRows[0] || []).slice(8).map((code) => {
											const state = toothStateByCode[code] ?? "idle";
											const geom = getToothPath(Number(code));
											const cfg = getToothConfig(Number(code));
											const isDetected = (
												draft?.quality?.detectedToothCodes || []
											).includes(code);
											return (
												<button
													key={code}
													type="button"
													className={`tooth tooth-${state}${state !== "idle" ? " selected" : ""}${isDetected ? " tooth-ai-detected" : ""}`}
													onClick={() => handleToothClick(code, state)}
													aria-label={`Зуб ${code}`}
													data-tooth-state={
														state === "idle" ? undefined : state
													}
												>
													<div
														className="tooth-svg-wrap"
														style={{
															filter: isDetected
																? "drop-shadow(0 0 4px #3b82f6)"
																: "none",
														}}
													>
														<svg
															width={cfg.width}
															height={cfg.height}
															viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
															fill="none"
														>
															{state === "missing" ? (
																<g>
																	<path
																		d={geom.root}
																		fill="var(--paper-soft)"
																		stroke="#cbd5e1"
																		strokeWidth="1.2"
																		opacity="0.15"
																	/>
																	<path
																		d={geom.crown}
																		fill="var(--paper-soft)"
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
																		fill={
																			state === "idle"
																				? "var(--paper-soft)"
																				: state === "planned"
																					? "#f0f9ff"
																					: state === "treatment"
																						? "#fff5f5"
																						: state === "watch"
																							? "#fffbeb"
																							: "#f0fdf4"
																		}
																		stroke={
																			state === "idle"
																				? "#cbd5e1"
																				: state === "planned"
																					? "#38bdf8"
																					: state === "treatment"
																						? "#f87171"
																						: state === "watch"
																							? "#fbbf24"
																							: "#4ade80"
																		}
																		strokeWidth="1.5"
																		strokeLinejoin="round"
																	/>
																	{geom.canals &&
																		(state === "treatment" ||
																			state === "done") && (
																			<path
																				d={geom.canals}
																				fill="none"
																				stroke={
																					state === "done"
																						? "#ec4899"
																						: "#dc2626"
																				}
																				strokeWidth="2.5"
																				strokeLinecap="round"
																				opacity="0.85"
																			/>
																		)}
																	<path
																		d={geom.crown}
																		fill={
																			state === "idle"
																				? "#fff"
																				: state === "planned"
																					? "var(--info-bg)"
																					: state === "treatment"
																						? "var(--bad-bg)"
																						: state === "watch"
																							? "var(--warn-bg)"
																							: "var(--ok-bg)"
																		}
																		stroke={
																			state === "idle"
																				? "#94a3b8"
																				: state === "planned"
																					? "#0284c7"
																					: state === "treatment"
																						? "#dc2626"
																						: state === "watch"
																							? "#d97706"
																							: "#166534"
																		}
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
													</div>
													<span className="tooth-code">{code}</span>
												</button>
											);
										})}
									</div>
								)}
							</div>
						)}

						{/* Линия окклюзии */}
						{activeQuadrant === null && (
							<div className="tooth-occlusion-line" aria-hidden="true">
								<span>— окклюзия —</span>
							</div>
						)}

						{/* Нижняя челюсть */}
						{(activeQuadrant === null ||
							activeQuadrant === 3 ||
							activeQuadrant === 4) && (
							<div className="tooth-jaw lower-jaw">
								{/* Правая нижняя Q4 — 48→41 */}
								{(activeQuadrant === null || activeQuadrant === 4) && (
									<div className="tooth-half tooth-row">
										{(toothRows[1] || []).slice(0, 8).map((code) => {
											const state = toothStateByCode[code] ?? "idle";
											const geom = getToothPath(Number(code));
											const cfg = getToothConfig(Number(code));
											const isDetected = (
												draft?.quality?.detectedToothCodes || []
											).includes(code);
											return (
												<button
													key={code}
													type="button"
													className={`tooth tooth-${state}${state !== "idle" ? " selected" : ""}${isDetected ? " tooth-ai-detected" : ""} tooth-lower`}
													onClick={() => handleToothClick(code, state)}
													aria-label={`Зуб ${code}`}
													data-tooth-state={
														state === "idle" ? undefined : state
													}
												>
													<span className="tooth-code">{code}</span>
													<div
														className="tooth-svg-wrap"
														style={{
															filter: isDetected
																? "drop-shadow(0 0 4px #3b82f6)"
																: "none",
															transform: "scaleY(-1)",
														}}
													>
														<svg
															width={cfg.width}
															height={cfg.height}
															viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
															fill="none"
														>
															{state === "missing" ? (
																<g>
																	<path
																		d={geom.root}
																		fill="var(--paper-soft)"
																		stroke="#cbd5e1"
																		strokeWidth="1.2"
																		opacity="0.15"
																	/>
																	<path
																		d={geom.crown}
																		fill="var(--paper-soft)"
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
																		fill={
																			state === "idle"
																				? "var(--paper-soft)"
																				: state === "planned"
																					? "#f0f9ff"
																					: state === "treatment"
																						? "#fff5f5"
																						: state === "watch"
																							? "#fffbeb"
																							: "#f0fdf4"
																		}
																		stroke={
																			state === "idle"
																				? "#cbd5e1"
																				: state === "planned"
																					? "#38bdf8"
																					: state === "treatment"
																						? "#f87171"
																						: state === "watch"
																							? "#fbbf24"
																							: "#4ade80"
																		}
																		strokeWidth="1.5"
																		strokeLinejoin="round"
																	/>
																	{geom.canals &&
																		(state === "treatment" ||
																			state === "done") && (
																			<path
																				d={geom.canals}
																				fill="none"
																				stroke={
																					state === "done"
																						? "#ec4899"
																						: "#dc2626"
																				}
																				strokeWidth="2.5"
																				strokeLinecap="round"
																				opacity="0.85"
																			/>
																		)}
																	<path
																		d={geom.crown}
																		fill={
																			state === "idle"
																				? "#fff"
																				: state === "planned"
																					? "var(--info-bg)"
																					: state === "treatment"
																						? "var(--bad-bg)"
																						: state === "watch"
																							? "var(--warn-bg)"
																							: "var(--ok-bg)"
																		}
																		stroke={
																			state === "idle"
																				? "#94a3b8"
																				: state === "planned"
																					? "#0284c7"
																					: state === "treatment"
																						? "#dc2626"
																						: state === "watch"
																							? "#d97706"
																							: "#166534"
																		}
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
													</div>
												</button>
											);
										})}
									</div>
								)}
								{/* Центральная линия нижней */}
								{activeQuadrant === null && (
									<div className="tooth-center-line" aria-hidden="true" />
								)}
								{/* Левая нижняя Q3 — 31→38 */}
								{(activeQuadrant === null || activeQuadrant === 3) && (
									<div className="tooth-half tooth-row">
										{(toothRows[1] || []).slice(8).map((code) => {
											const state = toothStateByCode[code] ?? "idle";
											const geom = getToothPath(Number(code));
											const cfg = getToothConfig(Number(code));
											const isDetected = (
												draft?.quality?.detectedToothCodes || []
											).includes(code);
											return (
												<button
													key={code}
													type="button"
													className={`tooth tooth-${state}${state !== "idle" ? " selected" : ""}${isDetected ? " tooth-ai-detected" : ""} tooth-lower`}
													onClick={() => handleToothClick(code, state)}
													aria-label={`Зуб ${code}`}
													data-tooth-state={
														state === "idle" ? undefined : state
													}
												>
													<span className="tooth-code">{code}</span>
													<div
														className="tooth-svg-wrap"
														style={{
															filter: isDetected
																? "drop-shadow(0 0 4px #3b82f6)"
																: "none",
															transform: "scaleY(-1)",
														}}
													>
														<svg
															width={cfg.width}
															height={cfg.height}
															viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
															fill="none"
														>
															{state === "missing" ? (
																<g>
																	<path
																		d={geom.root}
																		fill="var(--paper-soft)"
																		stroke="#cbd5e1"
																		strokeWidth="1.2"
																		opacity="0.15"
																	/>
																	<path
																		d={geom.crown}
																		fill="var(--paper-soft)"
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
																		fill={
																			state === "idle"
																				? "var(--paper-soft)"
																				: state === "planned"
																					? "#f0f9ff"
																					: state === "treatment"
																						? "#fff5f5"
																						: state === "watch"
																							? "#fffbeb"
																							: "#f0fdf4"
																		}
																		stroke={
																			state === "idle"
																				? "#cbd5e1"
																				: state === "planned"
																					? "#38bdf8"
																					: state === "treatment"
																						? "#f87171"
																						: state === "watch"
																							? "#fbbf24"
																							: "#4ade80"
																		}
																		strokeWidth="1.5"
																		strokeLinejoin="round"
																	/>
																	{geom.canals &&
																		(state === "treatment" ||
																			state === "done") && (
																			<path
																				d={geom.canals}
																				fill="none"
																				stroke={
																					state === "done"
																						? "#ec4899"
																						: "#dc2626"
																				}
																				strokeWidth="2.5"
																				strokeLinecap="round"
																				opacity="0.85"
																			/>
																		)}
																	<path
																		d={geom.crown}
																		fill={
																			state === "idle"
																				? "#fff"
																				: state === "planned"
																					? "var(--info-bg)"
																					: state === "treatment"
																						? "var(--bad-bg)"
																						: state === "watch"
																							? "var(--warn-bg)"
																							: "var(--ok-bg)"
																		}
																		stroke={
																			state === "idle"
																				? "#94a3b8"
																				: state === "planned"
																					? "#0284c7"
																					: state === "treatment"
																						? "#dc2626"
																						: state === "watch"
																							? "#d97706"
																							: "#166534"
																		}
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
													</div>
												</button>
											);
										})}
									</div>
								)}
							</div>
						)}

						{/* Метки половин нижней челюсти. Раньше здесь стояли «Q4» и «Q3». */}
						{activeQuadrant === null && (
							<div className="tooth-quadrant-labels lower-labels">
								<span
									className="quadrant-label"
									title="Четвёртый сектор: зубы 41–48"
								>
									низ справа
								</span>
								<span
									className="quadrant-label"
									title="Третий сектор: зубы 31–38"
								>
									низ слева
								</span>
							</div>
						)}
					</div>
				</div>

				{/*
              ЗДЕСЬ СТОЯЛА ВТОРАЯ ПАНЕЛЬ ЭМК — ПОЛНЫЙ ДУБЛЬ ТОЙ, ЧТО ВО ВКЛАДКЕ.

              На вкладке «ЭМК и Диктовка» (она открыта по умолчанию) рисуется
              components/visit/VisitEmkTab.tsx: та же шапка «ЭМК после
              диктовки», те же шесть вкладок полей, те же пять полей, тот же
              блок качества разбора и та же кнопка сохранения. Здесь, ниже
              зубной карты, стояла её копия. На экране это выглядело так: два
              одинаковых заголовка, две полоски вкладок, ДВЕ кнопки сохранения
              приёма. Полоски вкладок были независимы (одна брала состояние
              отсюда, другая — своё), поэтому «Жалобы», выбранные наверху, не
              меняли нижнюю панель, и наоборот: врач видел два разных набора
              полей одного и того же приёма.

              Оставлена компонентная — она умеет то, чего эта копия не умела:
              микрофон у каждого поля (диктовать прямо в «Жалобы», не сбивая
              общий текст) и отметку выполненных услуг по плану. Кроме того у
              этой копии textarea получала value без запаса `?? ""`: при
              появлении нового поля в справочнике поле стало бы
              неуправляемым, то есть набранный в нём текст не попадал бы в
              состояние и терялся при следующей перерисовке.
            */}

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
								? safeSpecialtyLabels[selectedProtocolTemplate.specialty] ||
									selectedProtocolTemplate.specialty
								: (dashboard?.protocolTemplates?.length ?? 0)}
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
						<span>{dashboard?.protocolTemplates?.length ?? 0}</span>
					</div>
					<div className="specialty-strip">
						{(specialtiesWithTemplates || []).map((specialty: any) => (
							<button
								className={selectedSpecialty === specialty ? "active" : ""}
								key={specialty}
								type="button"
								aria-pressed={selectedSpecialty === specialty}
								onClick={() => {
									if (setSelectedSpecialty) setSelectedSpecialty(specialty);
									if (setSelectedProtocolId) setSelectedProtocolId(null);
								}}
							>
								{safeSpecialtyLabels[specialty] || specialty}
							</button>
						))}
					</div>
					{selectedProtocolTemplate ? (
						<article className="protocol-card">
							<div>
								<strong>{selectedProtocolTemplate.title}</strong>
								<p>
									{selectedProtocolTemplate.defaultDurationMinutes} мин · снимки{" "}
									{(selectedProtocolTemplate.suggestedImaging || [])
										.map(
											(kind: any) =>
												(imagingKindLabels && imagingKindLabels[kind]) || kind,
										)
										.join(", ")}
								</p>
							</div>
							<div className="protocol-template-list">
								{(specialtyProtocolTemplates || []).map((template: any) => (
									<button
										className={
											selectedProtocolTemplate.id === template.id
												? "active"
												: ""
										}
										key={template.id}
										type="button"
										aria-pressed={selectedProtocolTemplate.id === template.id}
										onClick={() =>
											setSelectedProtocolId &&
											setSelectedProtocolId(template.id)
										}
									>
										{template.visitReason}
									</button>
								))}
							</div>
							<ul>
								{(selectedProtocolTemplate.safetyWarnings || []).map(
									(warning: any) => (
										<li key={warning}>{warning}</li>
									),
								)}
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
									? (activeVisitClinicalRuleEvaluations || []).filter(
											(e: any) => e.ownerRole !== "assistant",
										)
									: activeVisitClinicalRuleEvaluations || []
							}
							patientId={
								(typeof activePatient?.id === "string" && activePatient.id) ||
								(typeof dashboard?.activeVisit?.patientId === "string" &&
									dashboard.activeVisit.patientId) ||
								null
							}
							serviceTitle={serviceTitle}
							severityLabels={clinicalRuleSeverityLabels}
							staffRoleLabels={staffRoleLabels}
							summary={activeVisitClinicalRuleSummary}
						/>
					</div>
				</details>

				{/*
              Передача между этапами: backend POST /api/clinical/phase-completions
              и GET /api/clinical/tasks уже писали в clinical_tasks, но на экране
              приёма кнопок не было — следующий врач не видел задачу. Панель
              самодостаточная (как FreedSlotsPanel): сама ходит в API с clinical
              headers из контекста.
            */}
				{activePatient?.id ? (
					<ClinicalTasksPanel
						patientId={activePatient.id}
						assignedDoctorId={
							(typeof activeDoctor?.id === "string" && activeDoctor.id) ||
							(typeof activeDoctor?.userId === "string" &&
								activeDoctor.userId) ||
							null
						}
						treatmentPlanId={
							(typeof activePatient?.activeTreatmentPlanId === "string" &&
								activePatient.activeTreatmentPlanId) ||
							(typeof activeAppointment?.treatmentPlanId === "string" &&
								activeAppointment.treatmentPlanId) ||
							null
						}
					/>
				) : null}

				{/*
              ИИ-персонализация плана и памятки после приёма: backend
              POST /api/ai/treatment-plan-personalize + post-visit-personalize
              уже отдавали русский текст, но zero web callers. Панель сама
              собирает payload из плана пациента и полей заметки.
            */}
				<ClinicalAiPersonalizePanel
					context="visit"
					patientId={
						(typeof activePatient?.id === "string" && activePatient.id) ||
						(typeof dashboard?.activeVisit?.patientId === "string" &&
							dashboard.activeVisit.patientId) ||
						null
					}
					doctorFullName={
						(typeof activeDoctor?.fullName === "string" &&
							activeDoctor.fullName) ||
						(typeof activeDoctor?.name === "string" && activeDoctor.name) ||
						null
					}
					complaint={
						(typeof visitNoteForm?.complaint === "string" &&
							visitNoteForm.complaint) ||
						(typeof draft?.complaint === "string" && draft.complaint) ||
						null
					}
					diagnosis={
						(typeof visitNoteForm?.diagnosis === "string" &&
							visitNoteForm.diagnosis) ||
						(typeof draft?.diagnosis === "string" && draft.diagnosis) ||
						null
					}
					treatmentPlanText={
						(typeof visitNoteForm?.treatmentPlan === "string" &&
							visitNoteForm.treatmentPlan) ||
						(typeof draft?.treatmentPlan === "string" && draft.treatmentPlan) ||
						null
					}
				/>
				{activePatient?.id ? (
					<div className="mt-4" data-testid="visit-note-draft-mount">
						<VisitNoteDraftPanel patientId={activePatient.id} />
					</div>
				) : null}

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
									onClick={() => openCloseChecklistSection(task)}
								>
									<CheckCircle2 aria-hidden="true" />
									<div>
										<strong>{task.title}</strong>
										<p>{task.detail}</p>
										<small>
											{(staffRoleLabels && staffRoleLabels[task.ownerRole]) ||
												"исполнитель не указан"}{" "}
											· {task.actionLabel}
										</small>
									</div>
								</button>
							))}
					</div>
				) : null}
			</div>

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
						planned: "var(--info-bg)",
						treatment: "var(--bad-bg)",
						watch: "var(--warn-bg)",
						done: "var(--ok-bg)",
						missing: "var(--paper-soft)",
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
						idle: "var(--paper-soft)",
						planned: "#f0f9ff",
						treatment: "#fff5f5",
						watch: "#fffbeb",
						done: "#f0fdf4",
						missing: "var(--paper-soft)",
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
										fill="var(--paper-soft)"
										stroke="#cbd5e1"
										strokeWidth="1.2"
										opacity="0.15"
									/>
									<path
										d={geom.crown}
										fill="var(--paper-soft)"
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
										fill={ROOT_FILL[state] ?? "var(--paper-soft)"}
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
									{/* Было «FDI 26» — на карточке зуба у кресла понятнее «Зуб 26». */}
									<div className="_ccm-code-badge">Зуб {code}</div>
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
														: materialCategory === "veneer"
															? "Материал винира:"
															: "Система имплантации:"}
											</div>
											{(materialCategory === "filling"
												? THERAPY_MATERIALS
												: materialCategory === "crown" ||
														materialCategory === "veneer"
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
																	: materialCategory === "veneer"
																		? "винир"
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
											{/*
                          БЫЛО: кнопка молча записывала в план «винир — E-max
                          (Kerr / Ivoclar)», не спросив врача. Мало того что
                          материал выбирался за него: E-max выпускает Ivoclar, а
                          Kerr — другой производитель, то есть в план лечения
                          пациента уходила выдуманная пара названий. Материал
                          винира спрашиваем так же, как материал коронки.
                        */}
											<button
												type="button"
												className="_ccm-btn"
												data-color="violet"
												onClick={() => setMaterialCategory("veneer")}
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
			{/* min(380px, 100%): без него колонка остаётся 380px даже когда
            контейнер уже — на телефоне карточки вылезали за правый край и
            обрезались. Замерено: контейнер 364px, колонка 380px. */}
			{/*
          ЗДЕСЬ ВНИЗУ ЭКРАНА ПРИЁМА СТОЯЛИ СЕМЬ ПУСТЫХ БЛОКОВ. Проверено живыми
          запросами при открытой смене:
            • «Справочники форм осмотра», «Сопутствующие диагнозы ЕГИСЗ»,
              «Расширенные состояния зубов», «Нестоматологические формы осмотра»,
              «Находки Diagnocat» — все пять отвечают пустым списком всегда:
              таблицы существуют, писателя нет ни у одной;
            • «Связи снимков с осмотром» и «Справочники МКБ-10» отвечают 404 —
              маршрутов не существует вовсе.
          Экран приёма — рабочее место врача во время лечения. Семь пустых
          карточек внизу приучают пролистывать эту область не глядя, и однажды
          там окажется что-то важное.

          Что из этого реально работает и где оно есть: зубная формула —
          в одонтограмме выше на этом же экране (маршруты /api/odontogram/*);
          снимки — в разделе изображений; диагнозы ставятся в самой карте
          приёма.
          ДОЛГ, с причиной: интеграции Diagnocat (нет ключей и вызовов API),
          выгрузки ЕГИСЗ по сопутствующим диагнозам (нет писателя) и
          пользовательских форм осмотра (нет ни модели, ни экрана настройки).
          Возвращать эти блоки имеет смысл вместе с работающей начинкой, а не
          раньше.
        */}
		</>
	);
}
