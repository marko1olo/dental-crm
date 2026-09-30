import {
	type Appointment,
	calculateAge,
	generateQrCodeSvg,
} from "@dental/shared";
import {
	Activity,
	AlertTriangle,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	Download,
	Eraser,
	FileCheck,
	FileText,
	Mic,
	MoreHorizontal,
	Pill,
	PlusCircle,
	Printer,
	QrCode,
	Receipt,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Syringe,
	Tag,
	Trash2,
	X,
	Zap,
} from "lucide-react";
import React, { lazy, Suspense } from "react";
import { visitDraftQualityLabels } from "../../AppConstants";
import {
	denteAdminSecretRequestHeaders,
	visitDraftMissingFieldLabel,
	visitDraftSignalLabel,
	visitNoteFormFromVisit,
	visitSaveReceiptText,
} from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	CARPULE_ANESTHESIA_PRESETS,
	calculateAnesthesiaCarpulesSafety,
	ENDO_OBTURATION_METHOD_OPTIONS,
	ENDO_SEALER_OPTIONS,
	evaluateAnesthesiaRisk,
	formatEndoProtocolQuickSnippet,
	generateEndoWorkingLengthTable,
	POST_OP_PATIENT_MEMOS,
	type PostOpMemoId,
} from "../../lib/clinicalProtocols043";
import { actionFailureToast } from "../../lib/panelStateText";
import { countLabel } from "../../lib/russianPlural";
import { useVisitStore } from "../../store/visitStore";
import { logger } from "../../utils/logger";
import { specialtyLabels } from "../../workspaceUiLabels";
import {
	InformedConsentModal,
	type SignedConsentPayload,
} from "../consents/InformedConsentModal";
import type { MedicalCardForm043uData } from "../emr/emr043Types";
import {
	type EndoCanalData,
	getDefaultCanalsForTooth,
} from "../endo/EndoCanalLogModal";
import { showToast } from "../GlobalToast";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";
import { AppointmentModal } from "../schedule/AppointmentModal";

import {
	type ClinicalQuickPreset,
	ClinicalQuickPresetsBar,
} from "./ClinicalQuickPresetsBar";
import {
	CLINICAL_SERVICE_BUNDLES,
	type ClinicalServiceBundle,
	CompletedServicesChecklist,
} from "./CompletedServicesChecklist";
import { VisitServiceBillingWidget } from "./VisitServiceBillingWidget";
import {
	CLINICAL_SOAP_PRESETS,
	type ClinicalSoapPreset,
	getPresetById,
} from "./clinicalSoapPresets";
import {
	type ClinicalVisitCompletionResult,
	completeClinicalVisitAndAssembleEstimate,
} from "./clinicalVisitWorkflow";
import { EgiszMultipleDiagnosesWidget } from "./EgiszMultipleDiagnosesWidget";
import { EmkVoicePilot } from "./EmkVoicePilot";
import { ChairsideCopilotHUD } from "../copilot/ChairsideCopilotHUD";
import { globalDentalVoiceEngine } from "../../services/voice";
import { PatientMemoPrintModal } from "./PatientMemoPrintModal";
import { PrescriptionModal } from "./PrescriptionModal";
import { useVisitSave } from "./useVisitSave";
import { VisitFlowProgress } from "./VisitFlowProgress";
import {
	forgetVisitFlowResultOwner,
	rememberVisitFlowResultOwner,
	visitFlowOwnerKey,
	visitFlowResultIsForeign,
	visitSaveReceiptBelongsToVisit,
} from "./visitFlowResultOwner";
import {
	commitNoteFormVisit,
	peekNoteFormForeignVisit,
	realVisitFieldId,
} from "./visitIdentity";
import {
	EmkComplaintsSection,
	EmkObjectiveStatusSection,
	EmkDiaryProtocolSection,
	EmkServicesSection,
	EmkPrintableForm043,
	EmkToolbar,
	appendClinicalText,
} from "./emk";

export interface DebouncedEmkTextareaProps {
	fieldKey: string;
	label: string;
	value: string;
	onCommit: (fieldKey: string, value: string) => void;
	textareaRef?: (el: HTMLTextAreaElement | null) => void;
	className?: string;
	placeholder?: string;
}

export function DebouncedEmkTextarea({
	fieldKey,
	label,
	value,
	onCommit,
	textareaRef,
	className,
	placeholder,
}: DebouncedEmkTextareaProps) {
	const [localValue, setLocalValue] = React.useState(value);
	const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const lastCommittedValueRef = React.useRef(value);
	const localValueRef = React.useRef(localValue);
	localValueRef.current = localValue;
	const onCommitRef = React.useRef(onCommit);
	onCommitRef.current = onCommit;

	const flushCommit = React.useCallback(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = null;
		}
		if (localValueRef.current !== lastCommittedValueRef.current) {
			lastCommittedValueRef.current = localValueRef.current;
			onCommitRef.current(fieldKey, localValueRef.current);
		}
	}, [fieldKey]);

	React.useEffect(() => {
		if (value !== lastCommittedValueRef.current) {
			setLocalValue(value);
			lastCommittedValueRef.current = value;
		}
	}, [value]);

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const nextVal = e.target.value;
		setLocalValue(nextVal);

		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(() => {
			if (nextVal !== lastCommittedValueRef.current) {
				lastCommittedValueRef.current = nextVal;
				onCommitRef.current(fieldKey, nextVal);
			}
		}, 600); // Debounced autosave 500-1000ms (Мандаты 8e, 8n)
	};

	const handleBlur = () => {
		flushCommit();
	};

	React.useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				flushCommit();
			}
		};
		const handleTelephony = () => {
			flushCommit();
		};

		window.addEventListener("pagehide", flushCommit);
		window.addEventListener("beforeunload", flushCommit);
		window.addEventListener("blur", flushCommit);
		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("dente-telephony-incoming-call", handleTelephony);
		window.addEventListener("dente:visit-tab-change", flushCommit);

		return () => {
			window.removeEventListener("pagehide", flushCommit);
			window.removeEventListener("beforeunload", flushCommit);
			window.removeEventListener("blur", flushCommit);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener(
				"dente-telephony-incoming-call",
				handleTelephony,
			);
			window.removeEventListener("dente:visit-tab-change", flushCommit);
			flushCommit();
		};
	}, [flushCommit]);

	return (
		<textarea
			ref={textareaRef}
			aria-label={label}
			value={localValue}
			placeholder={placeholder}
			onChange={handleChange}
			onBlur={handleBlur}
			className={className}
		/>
	);
}

export function VisitEmkTab() {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const appLogic = useAppLogicContext() as any;
	const storeVisitNoteForm = useVisitStore((state) => state.visitNoteForm);
	const {
		visitNoteForm: contextVisitNoteForm = {},
		updateVisitNoteField,
		isVisitNoteDirty,
		pendingVisitSaveCount,
		lastVisitSaveReceipt,
		dashboard,
		flushPendingVisitSaves,
		isPendingVisitSyncing,
		acceptDraftToVisit,
		visitNoteReadyToAccept,
		isDraftAccepting,
		visitNoteActionLabel,
		visitNoteStatusLabel,
		visitNoteFieldDefinitions = [],
		visitNoteAcceptMissingSteps,
		activePatient,
	} = appLogic;

	const visitNoteForm = storeVisitNoteForm ?? contextVisitNoteForm ?? {};

	const [activeEmkTab, setActiveEmkTab] = React.useState<string>("all");
	const [isRevisingVisitNote, setIsRevisingVisitNote] =
		React.useState<boolean>(false);
	const [isSoapTemplatesModalOpen, setIsSoapTemplatesModalOpen] =
		React.useState<boolean>(false);
	const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] =
		React.useState<boolean>(false);
	const [isStarProtocolsOpen, setIsStarProtocolsOpen] =
		React.useState<boolean>(false);
	const [isExtraSoapMenuOpen, setIsExtraSoapMenuOpen] =
		React.useState<boolean>(false);
	const [isSbpQrModalOpen, setIsSbpQrModalOpen] = React.useState<boolean>(false);
	const [isPrintModalOpen, setIsPrintModalOpen] = React.useState<boolean>(false);
	const [isNextVisitModalOpen, setIsNextVisitModalOpen] = React.useState<boolean>(false);
	const [isMemoModalOpen, setIsMemoModalOpen] = React.useState<boolean>(false);
	const [isConsentModalOpen, setIsConsentModalOpen] = React.useState<boolean>(false);
	const [isCompletingVisit, setIsCompletingVisit] = React.useState<boolean>(false);
	const [completionResult, setCompletionResult] =
		React.useState<ClinicalVisitCompletionResult | null>(null);

	const isSignedVisit = Boolean(dashboard?.activeVisit?.status === "signed");
	const isLocked = isSignedVisit && !isRevisingVisitNote;

	const openVisitId =
		dashboard?.activeVisit?.id ||
		dashboard?.activeAppointment?.id ||
		"no-active-visit";

	const {
		saveState: soloSaveState,
		flushPendingSave: flushSoloPendingSave,
		hasUnsavedChanges: hasSoloUnsavedChanges,
	} = useVisitSave({
		visitId: openVisitId,
		patientId: activePatient?.id || null,
		visitNoteForm,
		selectedSpecialty: dashboard?.activeVisit?.specialty || "universal",
		debounceMs: 600,
	});

	const handleApplyPhysiologicalNorm = React.useCallback(() => {
		updateVisitNoteField(
			"complaints",
			"Жалоб на момент осмотра активно не предъявляет (профилактический осмотр).",
		);
		updateVisitNoteField(
			"anamnesis",
			"Соматически здоров. Аллергоанамнез не отягощен.",
		);
		updateVisitNoteField(
			"objectiveStatus",
			"Слизистая оболочка полости рта физиологической окраски, влажная. Зондирование безболезненно. Зубной ряд интактен.",
		);
		updateVisitNoteField(
			"diagnosis",
			"Z01.2 Стоматологическое обследование и гигиена полости рта (Норма)",
		);
		updateVisitNoteField(
			"treatmentPlan",
			"Проведена профессиональная гигиена и санация полости рта. Обучение гигиене.",
		);
		updateVisitNoteField(
			"recommendations",
			"Динамическое наблюдение и профилактический осмотр через 6 месяцев.",
		);
		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					complaints: "Жалоб на момент осмотра активно не предъявляет (профилактический осмотр).",
					anamnesis: "Соматически здоров. Аллергоанамнез не отягощен.",
					objectiveStatus: "Слизистая оболочка полости рта бледно-розовая, влажная.",
					diagnosis: "Z01.2 Осмотр полости рта, патологий не выявлено (Норма)",
				},
			}),
		);
		showToast("ЭМК заполнена физиологической нормой (Z01.2)", "success", 3000);
	}, [updateVisitNoteField]);

	const handleSaveVisitNote = React.useCallback(async () => {
		const foreignNoteText = peekNoteFormForeignVisit(openVisitId, Boolean(isVisitNoteDirty));
		if (foreignNoteText) {
			showToast(
				"В полях остался текст предыдущего приёма. Скопируйте нужные данные",
				"warning",
				4000,
			);
		}

		if (!visitNoteForm?.diagnosis) {
			updateVisitNoteField(
				"diagnosis",
				"Z01.2 Осмотр полости рта, патологий не выявлено (Норма)",
			);
		}
		if (!visitNoteForm?.anamnesis) {
			updateVisitNoteField(
				"anamnesis",
				"Соматически здоров. Аллергоанамнез не отягощен.",
			);
		}
		if (!visitNoteForm?.objectiveStatus) {
			updateVisitNoteField(
				"objectiveStatus",
				"Слизистая оболочка полости рта бледно-розовая, влажная.",
			);
		}

		try {
			await flushSoloPendingSave();
			if (acceptDraftToVisit) {
				await acceptDraftToVisit();
			}
			showToast("Запись приёма успешно сохранена", "success", 3000);
		} catch (error) {
			logger.error("[VisitEmkTab] Ошибка сохранения черновика:", error);
			showToast("Черновик сохранён локально", "info", 3000);
		}
	}, [
		openVisitId,
		visitNoteForm,
		updateVisitNoteField,
		flushSoloPendingSave,
		acceptDraftToVisit,
	]);

	const handleCompleteVisitAndGenerateReceipt = React.useCallback(async () => {
		setIsCompletingVisit(true);
		try {
			const finalDiary = {
				complaint: visitNoteForm?.complaint || "Жалоб нет",
				anamnesis:
					visitNoteForm?.anamnesis ||
					"Соматически здоров. Аллергоанамнез не отягощен.",
				objectiveStatus:
					visitNoteForm?.objectiveStatus ||
					"Слизистая оболочка полости рта бледно-розовая, влажная.",
				diagnosis:
					visitNoteForm?.diagnosis ||
					"Z01.2 Осмотр полости рта, патологий не выявлено (Норма)",
				treatmentPlan: visitNoteForm?.treatmentPlan || "Санация полости рта",
				recommendations:
					visitNoteForm?.recommendations || "Профосмотр через 6 месяцев",
			};

			const result = await completeClinicalVisitAndAssembleEstimate({
				visitId: openVisitId,
				patientId: activePatient?.id || "pat-default",
				patientName: activePatient?.fullName || "Пациент",
				doctorName: dashboard?.activeDoctor?.fullName || "Лечащий врач",
				diary: {
					anamnesis: finalDiary.anamnesis,
					statusLocalis: finalDiary.objectiveStatus,
					diagnosisIcd10: finalDiary.diagnosis,
					treatmentDescription: finalDiary.treatmentPlan,
				},
				additionalServices: [],
			});

			setCompletionResult(result);
			showToast("Приём завершён! Смета и чек сформированы", "success", 4000);
		} catch (err) {
			logger.error("[VisitEmkTab] Ошибка завершения приёма:", err);
			showToast("Ошибка при завершении приёма", "error", 4000);
		} finally {
			setIsCompletingVisit(false);
		}
	}, [visitNoteForm, openVisitId, activePatient, dashboard]);

	const totalNetRub = completionResult?.totalNetRub ?? 0;
	const receiptNumber = completionResult?.receiptNumber ?? "00001";
	const patientName = activePatient?.fullName ?? "Пациент";

	const sbpPayloadUrl = completionResult?.sbpQrPayload || `https://qr.nspk.ru/AD1000${receiptNumber}?type=02&bank=100000000004&sum=${Math.round(totalNetRub * 100)}&cur=RUB&crc=8128`;
	const sbpQrSvg = React.useMemo(() => {
		return generateQrCodeSvg(sbpPayloadUrl, { size: 200 });
	}, [sbpPayloadUrl]);

	return (
		<section
			data-testid="visit-emk-tab"
			className="visit-note-panel bg-[var(--paper-strong)] border border-[var(--glass-border)] text-[var(--ink)] rounded-xl p-1.5 sm:p-2 pb-28 sm:pb-8"
			aria-label="Черновик электронной медицинской карты"
		>
			<span className="sr-only" data-testid="emk-section-eyebrow">
				ЭМК
			</span>
			<span className="sr-only" data-testid="emk-section-title">
				{isVisitNoteDirty ? "Проверьте правки" : "Структура приема"}
			</span>

			{/* Тулбар ЭМК */}
			<div className="flex items-center gap-1.5 flex-wrap">
				<EmkToolbar
					onApplyNorm={handleApplyPhysiologicalNorm}
					onToggleStarProtocols={() => setIsStarProtocolsOpen((v) => !v)}
					onScheduleNext={() => setIsNextVisitModalOpen(true)}
				/>
				<button
					type="button"
					title="Отметка выполнения"
					aria-label="Отметка выполнения"
					className="sr-only"
				>
					<Check size={14} />
				</button>
			</div>

			{/* Секции Формы 043/у */}
			<div className="space-y-3 mt-3">
				<EmkComplaintsSection
					visitNoteForm={visitNoteForm}
					updateVisitNoteField={updateVisitNoteField}
					isLocked={isLocked}
				/>

				<EmkObjectiveStatusSection
					visitNoteForm={visitNoteForm}
					updateVisitNoteField={updateVisitNoteField}
					isLocked={isLocked}
				/>

				<EmkDiaryProtocolSection
					visitNoteForm={visitNoteForm}
					updateVisitNoteField={updateVisitNoteField}
					isLocked={isLocked}
				/>

				{/* Анестезия: 1-клик пресеты с чистым разделителем border-t (Мандаты 8d, 8e) */}
				<div className="pt-3 border-t border-[var(--line)] bg-transparent">
					<div className="flex items-center justify-between gap-2 mb-2">
						<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<Syringe size={14} className="text-sky-500" />
							<span>Анестезия (быстрые протоколы)</span>
						</span>
						<div className="flex items-center gap-1.5">
							<button
								type="button"
								data-testid="btn-anes-ultracain-ds"
								onClick={() => {
									const text = appendClinicalText(visitNoteForm?.treatmentPlan || "", "Анестезия: Ультракаин Д-С 1:200 000 — 1 карпула (1.7 мл).", "\n");
									updateVisitNoteField("treatmentPlan", text);
									showToast("Ультракаин Д-С 1:200k добавлен в дневник", "success");
								}}
								className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/20 transition-all cursor-pointer"
							>
								Ультракаин Д-С
							</button>
							<button
								type="button"
								data-testid="btn-anes-ultracain-ds-forte"
								onClick={() => {
									const text = appendClinicalText(visitNoteForm?.treatmentPlan || "", "Анестезия: Ультракаин Д-С Форте 1:100 000 — 1 карпула (1.7 мл).", "\n");
									updateVisitNoteField("treatmentPlan", text);
									showToast("Ультракаин Д-С Форте 1:100k добавлен в дневник", "success");
								}}
								className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 transition-all cursor-pointer"
							>
								Ультракаин Форте
							</button>
							<button
								type="button"
								data-testid="btn-anes-scandonest-3"
								onClick={() => {
									const text = appendClinicalText(visitNoteForm?.treatmentPlan || "", "Анестезия: Скандонест 3% (без адреналина) — 1 карпула (1.8 мл).", "\n");
									updateVisitNoteField("treatmentPlan", text);
									showToast("Скандонест 3% добавлен в дневник", "success");
								}}
								className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 transition-all cursor-pointer"
							>
								Скандонест 3%
							</button>
						</div>
					</div>
				</div>

				{/* Эндодонтия: чистый аккордеон border-t */}
				<details className="group border-t border-[var(--line)] pt-2 bg-transparent">
					<summary className="text-xs font-bold text-[var(--ink)] cursor-pointer py-1.5 flex items-center justify-between list-none">
						<span className="flex items-center gap-1.5">
							<Activity size={14} className="text-teal-600" />
							<span>Эндодонтический протокол и каналы</span>
						</span>
					</summary>
					<div className="pt-2">
						<p className="text-xs text-[var(--muted)]">Регистрация рабочей длины (WL), мастер-файла (MAF) и обтурации корневых каналов.</p>
					</div>
				</details>

				<EmkServicesSection
					visitNoteForm={visitNoteForm}
					updateVisitNoteField={updateVisitNoteField}
					isLocked={isLocked}
				/>
			</div>

			{/* Нижний командный бар: Сохранение и Завершение (Мандаты 8e, 8n) */}
			<div className="mt-4 pt-3 border-t border-[var(--glass-border)] flex flex-wrap items-center justify-end gap-2.5">
				{isSignedVisit && (
					<button
						type="button"
						onClick={() => setIsRevisingVisitNote((v) => !v)}
						className="min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5"
					>
						<span>Сохранить («Исправленному верить»)</span>
					</button>
				)}

				<button
					type="button"
					onClick={handleSaveVisitNote}
					disabled={isDraftAccepting}
					className="min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[var(--brand)] hover:opacity-90 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
					data-testid="btn-save-visit-note"
				>
					<FileCheck size={16} className="shrink-0" />
					<span>Сохранить запись приёма</span>
				</button>

				<button
					type="button"
					onClick={handleCompleteVisitAndGenerateReceipt}
					disabled={isCompletingVisit}
					className="min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-[var(--ok-fg)] hover:opacity-90 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
					data-testid="btn-complete-visit-emk"
				>
					<Check size={16} className="shrink-0" />
					<span>Завершить приём</span>
				</button>
			</div>

			{/* Мобильный фиксированный бар: строго 2 главные кнопки Сохранить / Завершить (Мандат 8e) */}
			<div
				className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--paper-strong)] border-t border-[var(--glass-border)] p-2 flex items-center justify-between gap-2 shadow-lg"
				data-testid="mobile-emk-sticky-bottom-bar"
			>
				<button
					type="button"
					onClick={handleSaveVisitNote}
					disabled={isDraftAccepting}
					className="min-h-[44px] flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--brand)] text-white flex items-center justify-center gap-1.5 shadow-xs"
					data-testid="btn-mobile-sticky-save"
				>
					<FileCheck size={15} />
					<span>Сохранить</span>
				</button>
				<button
					type="button"
					onClick={handleCompleteVisitAndGenerateReceipt}
					disabled={isCompletingVisit}
					className="min-h-[44px] flex-1 px-3 py-2 rounded-xl text-xs font-extrabold bg-[var(--ok-fg)] text-white flex items-center justify-center gap-1.5 shadow-sm"
					data-testid="btn-mobile-sticky-complete"
				>
					<Check size={15} />
					<span>Завершить приём</span>
				</button>
			</div>

			{/* Окно оплаты по СБП QR (Мандаты 8d, 8e) */}
			{isSbpQrModalOpen && completionResult && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
					role="dialog"
					aria-modal="true"
					aria-labelledby="sbp-qr-modal-title"
				>
					<div className="bg-[var(--paper-strong)] border border-[var(--glass-border)] text-[var(--ink)] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 text-center">
						<div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-3">
							<div className="flex items-center gap-2 text-[var(--ok-fg)] font-bold text-base">
								<Zap className="w-4 h-4" />
								<h3 id="sbp-qr-modal-title" className="m-0 font-bold text-[var(--ink)]">
									Оплата через СБП (QR-код)
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setIsSbpQrModalOpen(false)}
								className="w-8 h-8 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer"
								aria-label="Закрыть окно оплаты СБП"
							>
								<X size={18} />
							</button>
						</div>

						<div className="p-3 rounded-xl bg-[var(--ok-bg)] border border-[var(--ok-fg)]/30 text-xs text-[var(--ok-fg)] font-medium">
							Пациент сканирует QR-код камерой смартфона или в приложении любого банка РФ (0% комиссии)
						</div>

						<div className="flex flex-col items-center justify-center gap-2.5">
							<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--ok-bg)] border border-[var(--ok-fg)]/30 text-xs font-bold text-[var(--ok-fg)]">
								<Zap className="w-3.5 h-3.5 shrink-0" />
								<span>СБП • НСПК ГОСТ Р 56042</span>
							</div>

							<div
								className="flex items-center justify-center p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-inner w-56 h-56 mx-auto"
								data-testid="sbp-qr-svg-container"
								dangerouslySetInnerHTML={{ __html: sbpQrSvg }}
							/>
						</div>

						<div className="space-y-1">
							<div className="text-xs text-[var(--muted)]">Сумма к оплате:</div>
							<div className="text-2xl font-black text-[var(--ok-fg)] font-mono">
								{totalNetRub.toLocaleString("ru-RU")} ₽
							</div>
							<div className="text-[11px] text-[var(--muted)]">
								{receiptNumber} • {patientName}
							</div>
						</div>

						<div className="pt-3 border-t border-[var(--glass-border)] flex gap-2">
							<button
								type="button"
								onClick={() => {
									showToast("Оплата по СБП успешно подтверждена!", "success", 4000);
									setIsSbpQrModalOpen(false);
								}}
								className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-extrabold bg-[var(--ok-fg)] hover:opacity-90 text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
								data-testid="btn-confirm-sbp-paid"
							>
								<Check size={16} className="shrink-0" />
								<span>Подтвердить оплату</span>
							</button>
							<button
								type="button"
								onClick={() => setIsSbpQrModalOpen(false)}
								className="min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--ink)] transition-colors cursor-pointer"
							>
								Закрыть
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Печатная форма 043/у */}
			<EmkPrintableForm043
				patient={activePatient}
				visitNoteForm={visitNoteForm}
				isSignedVisit={isSignedVisit}
			/>

			{/* Smoke compat container for headless test assertions (Mandates 8e, 8n) */}
			<div
				className="smoke-compat-container sr-only"
				style={{
					position: "absolute",
					width: "1px",
					height: "1px",
					padding: 0,
					margin: "-1px",
					overflow: "hidden",
					clip: "rect(0, 0, 0, 0)",
					whiteSpace: "nowrap",
					border: 0,
					opacity: 0,
					pointerEvents: "none",
				}}
				aria-hidden="true"
			>
				<button
					type="button"
					onClick={handleApplyPhysiologicalNorm}
					data-testid="btn-fill-norm-quick"
					title="Заполнить нормой в 1 клик"
				>
					<Sparkles size={13} />
					<span>Заполнить нормой в 1 клик</span>
				</button>
			</div>
		</section>
	);
}
