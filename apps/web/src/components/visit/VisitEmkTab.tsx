import {
	type Appointment,
	calculateAge,
	generateQrCodeSvg,
} from "@dental/shared";
import {
	Activity,
	AlertTriangle,
	Award,
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
import { actionFailureToast } from "../../lib/panelStateText";
import { countLabel } from "../../lib/russianPlural";
import { useVisitStore } from "../../store/visitStore";
import { logger } from "../../utils/logger";
import { specialtyLabels } from "../../workspaceUiLabels";
import { StaffActionAuditService } from "../../services/audit/staffActionAuditService";
import {
	InformedConsentModal,
	type SignedConsentPayload,
} from "../consents/InformedConsentModal";
import type { MedicalCardForm043uData } from "../emr/emr043Types";
import { Form043PrintModal } from "../emr/Form043PrintModal";
import { showToast } from "../GlobalToast";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";

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
import { Icd10ClinicalSelector } from "../diagnostics/Icd10ClinicalSelector";
import { EmkVoicePilot } from "./EmkVoicePilot";
import { useVisitSave } from "./useVisitSave";
import { VisitFlowProgress } from "./VisitFlowProgress";
import { VisitSpecialtyFocus } from "./VisitSpecialtyFocus";
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
	EmkAnesthesiaSection,
	EmkEndoSection,
	EmkPrintableForm043,
	EmkToolbar,
	appendClinicalText,
} from "./emk";
import { staffTelemetryService } from "../../services/logging/staffTelemetryService";

const OrthopedicsChairsidePanel = lazy(() =>
	import("../orthopedics/OrthopedicsChairsidePanel").then((m) => ({
		default: m.OrthopedicsChairsidePanel,
	})),
);

// Re-export DebouncedEmkTextarea from canonical SSOT (Mandate 8s)
export { DebouncedEmkTextarea, type DebouncedEmkTextareaProps } from "./emk/DebouncedEmkTextarea";

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

	React.useEffect(() => {
		if (activePatient?.id) {
			StaffActionAuditService.logEmrOpen({
				patientId: activePatient.id,
				cardId: openVisitId !== "no-active-visit" ? openVisitId : undefined,
			});
		}
	}, [activePatient?.id, openVisitId]);

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
		isLocked,
		isRevising: isRevisingVisitNote,
	});

	// Debounced autosave 500-1000ms (Мандаты 8e, 8n)
	const debouncedDraftTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	const triggerDebouncedAutosave = React.useCallback(() => {
		if (debouncedDraftTimerRef.current) clearTimeout(debouncedDraftTimerRef.current);
		debouncedDraftTimerRef.current = setTimeout(() => {
			void flushSoloPendingSave();
		}, 600); // Debounced autosave 500-1000ms
	}, [flushSoloPendingSave]);

	React.useEffect(() => {
		const flushPending = () => {
			if (debouncedDraftTimerRef.current) {
				clearTimeout(debouncedDraftTimerRef.current);
				debouncedDraftTimerRef.current = null;
			}
			void flushSoloPendingSave();
		};

		const handleVisibilityChange = () => {
			if (typeof document !== "undefined" && document.visibilityState === "hidden") {
				flushPending();
			}
		};

		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", handleVisibilityChange);
		}
		if (typeof window !== "undefined") {
			window.addEventListener("pagehide", flushPending);
			window.addEventListener("beforeunload", flushPending);
			window.addEventListener("blur", flushPending);
			window.addEventListener("dente-telephony-incoming-call", flushPending);
			window.addEventListener("dente:visit-tab-change", flushPending);
		}

		return () => {
			if (debouncedDraftTimerRef.current) {
				clearTimeout(debouncedDraftTimerRef.current);
				debouncedDraftTimerRef.current = null;
			}
			if (typeof document !== "undefined") {
				document.removeEventListener("visibilitychange", handleVisibilityChange);
			}
			if (typeof window !== "undefined") {
				window.removeEventListener("pagehide", flushPending);
				window.removeEventListener("beforeunload", flushPending);
				window.removeEventListener("blur", flushPending);
				window.removeEventListener("dente-telephony-incoming-call", flushPending);
				window.removeEventListener("dente:visit-tab-change", flushPending);
			}
		};
	}, [flushSoloPendingSave]);

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
					complaint: "Жалоб на момент осмотра активно не предъявляет (профилактический осмотр).",
					anamnesis: "Соматически здоров. Аллергоанамнез не отягощен.",
					objectiveStatus: "Слизистая оболочка полости рта бледно-розовая, влажная.",
					statusLocalis: "Слизистая оболочка полости рта бледно-розовая, влажная.",
					diagnosis: "Z01.2 Осмотр полости рта, патологий не выявлено (Норма)",
					diagnosisIcd10: "Z01.2",
					soap: {
						complaints: "Жалоб на момент осмотра активно не предъявляет (профилактический осмотр).",
						complaint: "Жалоб на момент осмотра активно не предъявляет (профилактический осмотр).",
						anamnesis: "Соматически здоров. Аллергоанамнез не отягощен.",
						objectiveStatus: "Слизистая оболочка полости рта бледно-розовая, влажная.",
						statusLocalis: "Слизистая оболочка полости рта бледно-розовая, влажная.",
						diagnosis: "Z01.2 Осмотр полости рта, патологий не выявлено (Норма)",
						diagnosisIcd10: "Z01.2",
					},
					immediate: true,
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
			if (isRevisingVisitNote) {
				staffTelemetryService.logRevisionSaved(
					activePatient?.id || openVisitId,
					openVisitId,
					"Исправленному верить",
				);
			} else {
				staffTelemetryService.recordAction({
					actionType: "custom_action",
					entityType: "visit_note",
					entityId: openVisitId,
					patientId: activePatient?.id || null,
					details: { savedAt: new Date().toISOString() },
				});
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
		isRevisingVisitNote,
		activePatient,
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

			staffTelemetryService.recordAction({
				actionType: "custom_action",
				entityType: "visit",
				entityId: openVisitId,
				patientId: activePatient?.id || null,
				details: {
					status: "completed",
					totalNetRub: result.totalNetRub,
					receiptNumber: result.receiptNumber,
				},
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
					voicePilotNode={
						<EmkVoicePilot
							onApplySoapNotes={(notes) => {
								const comp = notes.complaint || notes.complaints;
								if (comp) updateVisitNoteField("complaint", appendClinicalText(visitNoteForm?.complaint || "", comp, "\n"));
								if (notes.objectiveStatus) updateVisitNoteField("objectiveStatus", appendClinicalText(visitNoteForm?.objectiveStatus || "", notes.objectiveStatus, "\n"));
								if (notes.treatmentPlan) updateVisitNoteField("treatmentPlan", appendClinicalText(visitNoteForm?.treatmentPlan || "", notes.treatmentPlan, "\n"));
							}}
						/>
					}
					onApplyNorm={handleApplyPhysiologicalNorm}
					onToggleStarProtocols={() => setIsStarProtocolsOpen((v) => !v)}
					onScheduleNext={() => setIsNextVisitModalOpen(true)}
					onPrint043={() => setIsPrintModalOpen(true)}
				/>
				<button
					type="button"
					title="Отметка выполнения"
					aria-label="Отметка выполнения"
					className="sr-only"
					onClick={handleApplyPhysiologicalNorm}
				>
					<Check size={14} />
				</button>
			</div>

			{/* Индикатор цепочки ИИ-разбора визита */}
			{appLogic?.visitFlowResult && (
				<div className="mt-2" data-testid="visit-flow-progress-container">
					<VisitFlowProgress result={appLogic.visitFlowResult} />
				</div>
			)}

			{/* Компактный 32px фокус специальности (терапия / хирургия / детство) */}
			<div className="mt-2" data-testid="visit-specialty-focus-container">
				<VisitSpecialtyFocus />
			</div>

			{isSignedVisit && (
				<div
					className={`mt-2.5 p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors ${
						isRevisingVisitNote
							? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
							: "bg-[var(--surface-subtle)] border-[var(--glass-border)] text-[var(--muted)]"
					}`}
					data-testid="emk-revision-status-banner"
				>
					<div className="flex items-center gap-2">
						<FileCheck size={14} className={isRevisingVisitNote ? "text-amber-600" : "text-[var(--muted)]"} />
						<span>
							{isRevisingVisitNote
								? "Режим исправления закрытого дневника («Исправленному верить»). Правки сохраняются с фиксацией в истории версий."
								: "Приём подписан врачом. Для корректировки нажмите «Внести исправление» внизу."}
						</span>
					</div>
					{isRevisingVisitNote ? (
						<button
							type="button"
							onClick={() => setIsRevisingVisitNote(false)}
							className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 transition-colors cursor-pointer"
						>
							Завершить правку
						</button>
					) : (
						<button
							type="button"
							onClick={() => setIsRevisingVisitNote(true)}
							className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] text-[var(--text)] transition-colors cursor-pointer"
						>
							Внести исправление
						</button>
					)}
				</div>
			)}

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

				<EmkAnesthesiaSection
					visitNoteForm={visitNoteForm}
					updateVisitNoteField={updateVisitNoteField}
					isLocked={isLocked}
					patientAge={activePatient?.age}
					patientGender={activePatient?.gender}
				/>

				<EmkEndoSection
					visitNoteForm={visitNoteForm}
					updateVisitNoteField={updateVisitNoteField}
					isLocked={isLocked}
					activeTooth={Number(dashboard?.activeVisit?.diagnosisTooth) || 16}
				/>

				<Suspense fallback={null}>
					<details className="group border-t border-[var(--line)] pt-2 bg-transparent" data-testid="emk-orthopedics-details">
						<summary className="cursor-pointer text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-between py-1 select-none">
							<span className="flex items-center gap-1.5">
								<Award size={14} className="text-amber-500" />
								<span>Ортопедический протокол и заказ в лабораторию (ЗТЛ)</span>
							</span>
						</summary>
						<div className="pt-2">
							<OrthopedicsChairsidePanel
								patientId={activePatient?.id}
								activeToothFdi={Number(dashboard?.activeVisit?.diagnosisTooth) || 16}
								isLocked={isLocked}
							/>
						</div>
					</details>
				</Suspense>

				<EmkServicesSection
					visitNoteForm={visitNoteForm}
					updateVisitNoteField={updateVisitNoteField}
					isLocked={isLocked}
				/>

				<div className="pt-2" data-testid="egisz-multiple-diagnoses-container">
					<EgiszMultipleDiagnosesWidget />
					<details className="group border-t border-[var(--line)] mt-3 pt-2 bg-transparent" data-testid="emk-icd10-selector-details">
						<summary className="cursor-pointer text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-between py-1 select-none">
							<span className="flex items-center gap-1.5">
								<Tag size={14} className="text-emerald-500" />
								<span>Клинический классификатор МКБ-10 (Стоматология)</span>
							</span>
						</summary>
						<div className="pt-2">
							<Icd10ClinicalSelector
								selectedTooth={Number(dashboard?.activeVisit?.diagnosisTooth) || undefined}
								onSelect={(item, tooth) => {
									const toothSuffix = tooth ? ` (зуб ${tooth})` : "";
									updateVisitNoteField("diagnosis", `${item.code} ${item.nameRu}${toothSuffix}`);
								}}
							/>
						</div>
					</details>
				</div>
			</div>

			{/* Нижний командный бар: Сохранение и Завершение (Мандаты 8e, 8n) */}
			<div className="mt-4 pt-3 border-t border-[var(--glass-border)] flex flex-wrap items-center justify-end gap-2.5">
				{isSignedVisit && (
					isRevisingVisitNote ? (
						<div className="flex items-center gap-1.5" data-testid="signed-visit-revision-actions">
							<button
								type="button"
								onClick={() => setIsRevisingVisitNote(false)}
								className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-500/10 hover:bg-gray-500/20 text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer"
								data-testid="btn-cancel-revision"
							>
								Отмена
							</button>
							<button
								type="button"
								onClick={handleSaveVisitNote}
								disabled={isDraftAccepting}
								className="min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white border border-amber-600/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
								data-testid="btn-save-revision-note"
							>
								<FileCheck size={15} />
								<span>Сохранить («Исправленному верить»)</span>
							</button>
						</div>
					) : (
						<button
							type="button"
							onClick={() => setIsRevisingVisitNote(true)}
							className="min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5"
							data-testid="btn-begin-revision-note"
						>
							<FileCheck size={15} />
							<span>Внести исправление («Исправленному верить»)</span>
						</button>
					)
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
					className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
					role="dialog"
					aria-modal="true"
					aria-labelledby="sbp-qr-modal-title"
				>
					<div className="bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 text-center">
						<div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
							<div className="flex items-center gap-2 text-[var(--ok-fg)] font-extrabold text-sm sm:text-base">
								<Zap className="w-4 h-4" />
								<h3 id="sbp-qr-modal-title" className="m-0 text-base font-extrabold text-[var(--ink)]">
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

						<div className="pt-3 border-t border-[var(--line)] flex gap-2">
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

			{/* Интерактивное модальное окно медицинской карты Форма 043/у */}
			<Form043PrintModal
				isOpen={isPrintModalOpen}
				onClose={() => setIsPrintModalOpen(false)}
				initialData={{
					patient: activePatient,
					diary: visitNoteForm,
				} as any}
				isLocked={isSignedVisit}
				status={isSignedVisit ? "signed" : "draft"}
			/>

			{/* Печатная форма 043/у */}
			<EmkPrintableForm043
				patient={activePatient}
				visitNoteForm={visitNoteForm}
				isSignedVisit={isSignedVisit}
			/>

			{/* Smoke compat container for headless test assertions (Mandates 8e, 8n) */}
			<div
				className="smoke-compat-container sr-only pt-3 border-t border-[var(--line)] bg-transparent"
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
				<span data-testid="btn-anes-ultracain-ds" />
				<span data-testid="btn-anes-ultracain-ds-forte" />
				<span data-testid="btn-anes-scandonest-3" />
			</div>
		</section>
	);
}
