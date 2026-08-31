import {
	AlertTriangle,
	Bold,
	Calendar,
	Check,
	CheckSquare,
	ChevronDown,
	Clock,
	Copy,
	Download,
	Eraser,
	FileCheck,
	FileCode,
	FileText,
	Hash,
	Italic,
	List,
	Pill,
	PlusCircle,
	Printer,
	QrCode,
	Receipt,
	ScanLine,
	Search,
	ShieldCheck,
	Sparkles,
	Tag,
	Trash2,
	X,
	Zap,
} from "lucide-react";
import React from "react";
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
import { showToast } from "../GlobalToast";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";
import { CompletedServicesChecklist } from "./CompletedServicesChecklist";
import { EgiszMultipleDiagnosesWidget } from "./EgiszMultipleDiagnosesWidget";
import { EgiszCdaExportModal } from "../egisz/EgiszCdaExportModal";
import { AppointmentModal } from "../schedule/AppointmentModal";
import type { Appointment } from "@dental/shared";
import { PrescriptionModal } from "./PrescriptionModal";
import { PatientBillingModal } from "../finance/PatientBillingModal";
import { InformedConsentModal } from "../consents/InformedConsentModal";
import { VisitFlowProgress } from "./VisitFlowProgress";
import { EmkVoicePilot } from "./EmkVoicePilot";
import {
	ClinicalQuickPresetsBar,
	type ClinicalQuickPreset,
} from "./ClinicalQuickPresetsBar";
import {
	VisitSoapTemplatesModal,
} from "./VisitSoapTemplatesModal";
import type {
	ClinicalSoapPreset,
} from "./clinicalSoapPresets";
import {
	CARPULE_ANESTHESIA_PRESETS,
	evaluateAnesthesiaRisk,
	calculateAnesthesiaCarpulesSafety,
	POST_OP_PATIENT_MEMOS,
	type PostOpMemoId,
	formatEndoProtocolQuickSnippet,
	generateEndoWorkingLengthTable,
	ENDO_SEALER_OPTIONS,
	ENDO_OBTURATION_METHOD_OPTIONS,
} from "../../lib/clinicalProtocols043";
import { PatientMemoPrintModal } from "./PatientMemoPrintModal";
import { AnesthesiaProtocolModal } from "../anesthesia/AnesthesiaProtocolModal";
import { AnesthesiaAspirationJournalModal } from "./anesthesia/AnesthesiaAspirationJournalModal";
import {
	EndoCanalLogModal,
	getDefaultCanalsForTooth,
	type EndoCanalData,
} from "../odontogram/EndoCanalLogModal";
import {
	completeClinicalVisitAndAssembleEstimate,
	type ClinicalVisitCompletionResult,
} from "./clinicalVisitWorkflow";
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

/**
 * Дописывает текст к содержимому поля ЭМК так, как это сделал бы врач руками.
 *
 * БЫЛО: разделитель выбирался по `!curr.endsWith(" ")`. Из-за этого текст,
 * заканчивающийся пробелом (а диктовка почти всегда так и заканчивается),
 * склеивался без запятой — «Жалоб нет Острая боль», — а текст, заканчивающийся
 * запятой, получал вторую: «Острая боль, , Коффердам». Смотрим на последний
 * ЗНАЧИМЫЙ символ, а не на пробел.
 */
function appendClinicalText(
	current: string,
	addition: string,
	separator: string,
): string {
	const base = current.replace(/\s+$/, "");
	if (!base) return addition;
	if (/[,;.:-]$/.test(base)) return `${base} ${addition}`;
	return `${base}${separator}${addition}`;
}

interface DebouncedEmkTextareaProps {
	fieldKey: string;
	label: string;
	value: string;
	onCommit: (fieldKey: string, value: string) => void;
	textareaRef?: (el: HTMLTextAreaElement | null) => void;
	className?: string;
	placeholder?: string;
}

function DebouncedEmkTextarea({
	fieldKey,
	label,
	value,
	onCommit,
	textareaRef,
	className,
	placeholder,
}: DebouncedEmkTextareaProps) {
	const [localValue, setLocalValue] = React.useState(value);
	const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastCommittedValueRef = React.useRef(value);
	const localValueRef = React.useRef(localValue);
	localValueRef.current = localValue;
	const onCommitRef = React.useRef(onCommit);
	onCommitRef.current = onCommit;

	// Sync local value when external value changes (e.g. from templates, voice dictation, chips)
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
		}, 300);
	};

	const handleBlur = () => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}
		if (localValue !== lastCommittedValueRef.current) {
			lastCommittedValueRef.current = localValue;
			onCommitRef.current(fieldKey, localValue);
		}
	};

	React.useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
			if (localValueRef.current !== lastCommittedValueRef.current) {
				lastCommittedValueRef.current = localValueRef.current;
				onCommitRef.current(fieldKey, localValueRef.current);
			}
		};
	}, [fieldKey]);

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
	// `|| {}` убран: useAppLogicContext() либо отдаёт контекст, либо бросает
	// исключение (contexts/AppLogicContext.tsx) — пустой объект он больше не
	// выдумывает, и вторая ветка была недостижима.
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const appLogic = useAppLogicContext() as any;
	const {
		visitNoteForm = {},
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

	/*
	 * БЫЛО: activeEmkTab и setActiveEmkTab брались из useAppLogicContext, а таких
	 * полей в контексте нет вообще (проверено: во всём useAppLogic.tsx этих имён
	 * не существует). Последствия на экране «Прием», вкладка «ЭМК и Диктовка» —
	 * та, что открыта по умолчанию:
	 *   • activeEmkTab === undefined, поэтому сравнение с "all" ложно, а
	 *     фильтр `f.key === undefined` не пропускал НИ ОДНОГО поля: панель
	 *     «ЭМК после диктовки» показывала шапку, полоску вкладок и ничего
	 *     больше. Ни жалоб, ни анамнеза, ни диагноза — записывать приём было
	 *     физически некуда;
	 *   • setActiveEmkTab === undefined, поэтому все шесть кнопок вкладок были
	 *     кнопками-пустышками: клик молча падал с TypeError в консоль.
	 * Состояние вкладки — локальное дело этой панели, в общий контекст его
	 * выносить незачем: держим его здесь.
	 */
	const [activeEmkTab, setActiveEmkTab] = React.useState<string>("all");
	const [isSoapTemplatesModalOpen, setIsSoapTemplatesModalOpen] = React.useState<boolean>(false);
	const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = React.useState<boolean>(false);
	const [selectedPrescriptionDrugIds, setSelectedPrescriptionDrugIds] = React.useState<string[]>([
		"amoxiclav_875_125",
		"nimesulide_100",
	]);
	const [isInformedConsentModalOpen, setIsInformedConsentModalOpen] = React.useState<boolean>(false);
	const [isConfirmSwitchModalOpen, setIsConfirmSwitchModalOpen] = React.useState<boolean>(false);
	const [isPatientMemoModalOpen, setIsPatientMemoModalOpen] = React.useState<boolean>(false);
	const [selectedMemoIdForPrint, setSelectedMemoIdForPrint] = React.useState<PostOpMemoId>("surgery_extraction");
	const [isAnesthesiaProtocolModalOpen, setIsAnesthesiaProtocolModalOpen] = React.useState<boolean>(false);
	const [isAnesthesiaAspirationModalOpen, setIsAnesthesiaAspirationModalOpen] = React.useState<boolean>(false);
	const [selectedAnesDrugKey, setSelectedAnesDrugKey] = React.useState<string>("ultracain_ds_forte");
	const [selectedCarpulesCount, setSelectedCarpulesCount] = React.useState<number>(1.0);
	const [patientWeightKg, setPatientWeightKg] = React.useState<number>(
		Number((activePatient as any)?.weightKg) > 0 ? Number((activePatient as any).weightKg) : 70,
	);

	// Эндодонтический протокол (Таблица каналов, апекслокатор, MAF, силеры)
	const [isEndoModalOpen, setIsEndoModalOpen] = React.useState<boolean>(false);
	const [selectedEndoCanalKey, setSelectedEndoCanalKey] = React.useState<string>("MB1");
	const [endoWorkingLengthMm, setEndoWorkingLengthMm] = React.useState<number>(21.5);
	const [endoMasterFile, setEndoMasterFile] = React.useState<string>("#25");
	const [endoTaper, setEndoTaper] = React.useState<string>(".06");
	const [endoSealer, setEndoSealer] = React.useState<string>("AH Plus");
	const [endoObturation, setEndoObturation] = React.useState<string>("Латеральная компакция");
	const [endoRefPoint, setEndoRefPoint] = React.useState<string>("Щечный бугор");
	// Завершение клинического приёма и автоматический расчет сметы/чека
	const [completionResult, setCompletionResult] = React.useState<ClinicalVisitCompletionResult | null>(null);
	const [isCompletingVisit, setIsCompletingVisit] = React.useState<boolean>(false);
	const [isSbpQrModalOpen, setIsSbpQrModalOpen] = React.useState<boolean>(false);
	const [isNextVisitModalOpen, setIsNextVisitModalOpen] = React.useState<boolean>(false);
	const [nextVisitAppointment, setNextVisitAppointment] = React.useState<Appointment | null>(null);
	const [activeSelectedTooth, setActiveSelectedTooth] = React.useState<number | null>(null);
	const textareaRefs = React.useRef<Record<string, HTMLTextAreaElement | null>>({});

	const applyTextFormatting = React.useCallback(
		(
			fieldKey: string,
			formatType:
				| "bold"
				| "italic"
				| "bullet"
				| "check"
				| "tooth"
				| "time"
				| "clear"
				| "copy",
		) => {
			const el = textareaRefs.current[fieldKey];
			const currentValue = String(visitNoteForm?.[fieldKey] ?? "");

			if (formatType === "copy") {
				if (!currentValue.trim()) {
					showToast("Поле пустое", "warning", 2000);
					return;
				}
				navigator.clipboard?.writeText(currentValue);
				showToast("Текст поля скопирован в буфер", "success", 2000);
				return;
			}

			if (formatType === "clear") {
				if (!currentValue) return;
				updateVisitNoteField?.(fieldKey, "");
				showToast("Поле очищено", "info", 2000);
				return;
			}

			if (!el) {
				let newText = currentValue;
				if (formatType === "bold")
					newText = currentValue ? `**${currentValue}**` : "**Текст**";
				else if (formatType === "italic")
					newText = currentValue ? `*${currentValue}*` : "*Текст*";
				else if (formatType === "bullet")
					newText = currentValue ? `${currentValue}\n• ` : "• ";
				else if (formatType === "check")
					newText = currentValue ? `${currentValue}\n[✓] ` : "[✓] ";
				else if (formatType === "tooth") {
					const toothNum = activeSelectedTooth || 16;
					newText = currentValue
						? `${currentValue} [Зуб ${toothNum}]`
						: `[Зуб ${toothNum}]`;
				} else if (formatType === "time") {
					const timeStr = new Date().toLocaleTimeString("ru-RU", {
						hour: "2-digit",
						minute: "2-digit",
					});
					newText = currentValue ? `${currentValue} [${timeStr}]` : `[${timeStr}]`;
				}
				updateVisitNoteField?.(fieldKey, newText);
				return;
			}

			const start = el.selectionStart ?? currentValue.length;
			const end = el.selectionEnd ?? currentValue.length;
			const selectedText = currentValue.substring(start, end);
			let replacement = "";
			let cursorOffset = 0;

			switch (formatType) {
				case "bold":
					replacement = selectedText ? `**${selectedText}**` : "**Текст**";
					cursorOffset = selectedText ? replacement.length : 2;
					break;
				case "italic":
					replacement = selectedText ? `*${selectedText}*` : "*Текст*";
					cursorOffset = selectedText ? replacement.length : 1;
					break;
				case "bullet":
					replacement = selectedText
						? `\n• ${selectedText}`
						: start === 0 || currentValue[start - 1] === "\n"
							? "• "
							: "\n• ";
					cursorOffset = replacement.length;
					break;
				case "check":
					replacement = selectedText
						? `\n[✓] ${selectedText}`
						: start === 0 || currentValue[start - 1] === "\n"
							? "[✓] "
							: "\n[✓] ";
					cursorOffset = replacement.length;
					break;
				case "tooth": {
					const toothNum = activeSelectedTooth || 16;
					replacement = `[Зуб ${toothNum}] `;
					cursorOffset = replacement.length;
					break;
				}
				case "time": {
					const timeStr = `[${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}] `;
					replacement = timeStr;
					cursorOffset = replacement.length;
					break;
				}
			}

			const newText =
				currentValue.substring(0, start) +
				replacement +
				currentValue.substring(end);
			updateVisitNoteField?.(fieldKey, newText);

			setTimeout(() => {
				el.focus();
				const newCursorPos = start + cursorOffset;
				el.setSelectionRange(newCursorPos, newCursorPos);
			}, 0);
		},
		[visitNoteForm, updateVisitNoteField, activeSelectedTooth],
	);

	const handleOpenNextVisitBooking = React.useCallback((daysAhead = 5) => {
		const staffList = Array.isArray(dashboard?.clinicSettings?.staff) ? dashboard.clinicSettings.staff : [];
		const chairsList = Array.isArray(dashboard?.clinicSettings?.chairs) ? dashboard.clinicSettings.chairs : [];
		const activeDoc = staffList.find((s: any) => s.active && (s.role === "doctor" || s.role === "owner")) || appLogic?.activeDoctor;
		const activeChair = chairsList.find((c: any) => c.active) || chairsList[0];
		const patientId = realVisitFieldId(activePatient?.id || dashboard?.activeVisit?.patientId) || "";

		const d = new Date();
		d.setDate(d.getDate() + daysAhead);
		d.setHours(10, 0, 0, 0);
		const startsAt = d.toISOString();
		const dEnd = new Date(d.getTime() + 45 * 60 * 1000);
		const endsAt = dEnd.toISOString();

		const diagText = visitNoteForm?.diagnosis ? ` (${visitNoteForm.diagnosis})` : "";
		const draftAppt: Appointment = {
			id: `new-stage-${Date.now()}`,
			organizationId: dashboard?.activeVisit?.organizationId || "org-1",
			patientId,
			doctorUserId: dashboard?.activeVisit?.doctorUserId || activeDoc?.id || "",
			assistantUserId: null,
			chairId: dashboard?.activeVisit?.chairId || activeChair?.id || "",
			startsAt,
			endsAt,
			status: "planned",
			reason: `Следующий этап лечения${diagText}`,
			comment: `Назначено в 1 клик из ЭМК визита от ${new Date().toLocaleDateString("ru-RU")}`,
		};
		setNextVisitAppointment(draftAppt);
		setIsNextVisitModalOpen(true);
	}, [dashboard, appLogic, activePatient, visitNoteForm]);

	const handleCompleteVisitAndGenerateReceipt = React.useCallback(async () => {
		setIsCompletingVisit(true);
		try {
			if (flushPendingVisitSaves) {
				await flushPendingVisitSaves();
			}
			const result = completeClinicalVisitAndAssembleEstimate({
				visitId: String((appLogic as any)?.activeVisitId || (dashboard as any)?.activeVisitId || `VIS-${Date.now()}`),
				patientId: String(activePatient?.id || "pat-1"),
				patientName: String(activePatient?.fullName || "Пациент"),
				patientPhone: String(activePatient?.phone || ""),
				doctorName: String(appLogic?.activeDoctor?.fullName || appLogic?.auth?.currentUser?.name || "Лечащий врач"),
				doctorSpecialty: String(appLogic?.activeDoctor?.specialties?.[0] || "Стоматолог-терапевт"),
				clinicName: String(dashboard?.clinicSettings?.profile?.brandName || "Стоматологическая клиника «DENTE»"),
				diary: {
					anamnesis: visitNoteForm?.anamnesis || "",
					statusLocalis: visitNoteForm?.objectiveStatus || "",
					diagnosisIcd10: typeof visitNoteForm?.diagnosis === "string" ? visitNoteForm.diagnosis.match(/[A-Z]\d{2}(?:\.\d+)?/i)?.[0] || "K02.1" : "K02.1",
					diagnosisTooth: typeof visitNoteForm?.diagnosis === "string" ? visitNoteForm.diagnosis.match(/\b\d{2}\b/)?.[0] || "" : "",
					treatmentDescription: visitNoteForm?.treatmentPlan || "",
				},
				completedPlanItems: (appLogic as any)?.activeTreatmentPlanItems || [],
			});
			setCompletionResult(result);
			showToast(`🏁 Приём завершён! ${result.statusBannerText}`, "success", 4500);
		} catch {
			showToast("Ошибка при формировании сметы и чека", "error", 4000);
		} finally {
			setIsCompletingVisit(false);
		}
	}, [flushPendingVisitSaves, appLogic, dashboard, activePatient, visitNoteForm]);

	const handleApplyVoiceSoapNotes = React.useCallback(
		(notes: Record<string, string>) => {
			if (!updateVisitNoteField) return;
			if (notes.subjective) {
				const curr = visitNoteForm.complaint || "";
				updateVisitNoteField("complaint", appendClinicalText(curr, notes.subjective, "; "));
			}
			if (notes.objective) {
				const curr = visitNoteForm.objectiveStatus || "";
				updateVisitNoteField("objectiveStatus", appendClinicalText(curr, notes.objective, "; "));
			}
			if (notes.assessment) {
				const curr = visitNoteForm.diagnosis || "";
				updateVisitNoteField("diagnosis", appendClinicalText(curr, notes.assessment, "; "));
			}
			if (notes.plan) {
				const curr = visitNoteForm.treatmentPlan || "";
				updateVisitNoteField("treatmentPlan", appendClinicalText(curr, notes.plan, "\n\n"));
			}
			if (notes.recommendations) {
				const curr = visitNoteForm.recommendations || "";
				updateVisitNoteField("recommendations", appendClinicalText(curr, notes.recommendations, "\n"));
			}
		},
		[updateVisitNoteField, visitNoteForm],
	);

	const handleApplyVoiceToothState = React.useCallback(
		(toothNumber: number, state: any, surfaces?: string[]) => {
			setActiveSelectedTooth(toothNumber);
			if ((appLogic as any)?.updateOdontogramTooth) {
				(appLogic as any).updateOdontogramTooth(toothNumber, state, surfaces);
			}
		},
		[appLogic],
	);

	const handleApplyVoiceAnesthesia = React.useCallback((anes: any) => {
		if (anes?.drugKey) {
			setSelectedAnesDrugKey(anes.drugKey);
		}
		if (anes?.cartridgeCount) {
			setSelectedCarpulesCount(anes.cartridgeCount);
		}
	}, []);

	const handleApplyVoiceProcedures = React.useCallback(
		(procs: any[]) => {
			if (!updateVisitNoteField || !Array.isArray(procs) || procs.length === 0) return;
			const lines = procs.map(
				(p) => `• [${p.code804n}] ${p.name}${p.toothNumber ? ` (зуб ${p.toothNumber})` : ""}`,
			);
			const currPlan = visitNoteForm.treatmentPlan || "";
			const newPlan = currPlan
				? `${currPlan}\n\nВыполненные манипуляции (804н):\n${lines.join("\n")}`
				: `Выполненные манипуляции (804н):\n${lines.join("\n")}`;
			updateVisitNoteField("treatmentPlan", newPlan);
		},
		[updateVisitNoteField, visitNoteForm.treatmentPlan],
	);

	React.useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (isVisitNoteDirty) {
				e.preventDefault();
				e.returnValue = "";
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [isVisitNoteDirty]);

	const copyAllVisitNoteText = React.useCallback(() => {
		const fields = [
			visitNoteForm?.complaint ? `Жалобы: ${visitNoteForm.complaint}` : "",
			visitNoteForm?.anamnesis ? `Анамнез: ${visitNoteForm.anamnesis}` : "",
			visitNoteForm?.objectiveStatus ? `Объективно: ${visitNoteForm.objectiveStatus}` : "",
			visitNoteForm?.diagnosis ? `Диагноз: ${visitNoteForm.diagnosis}` : "",
			visitNoteForm?.treatmentPlan ? `Лечение: ${visitNoteForm.treatmentPlan}` : "",
		].filter(Boolean).join("\n\n");
		try {
			navigator.clipboard?.writeText(fields);
			showToast("Текст формы 043/у скопирован в буфер обмена", "success", 4000);
		} catch {
			showToast("Не удалось скопировать в буфер обмена", "warning", 4000);
		}
	}, [visitNoteForm]);

	const noteForm = visitNoteForm;
	const anesthesiaRisk = React.useMemo(() => {
		return evaluateAnesthesiaRisk(
			visitNoteForm?.anamnesis || "",
			visitNoteForm?.treatmentPlan || "",
			(activePatient as any)?.allergies || (activePatient as any)?.medicalAlerts || [],
		);
	}, [visitNoteForm?.anamnesis, visitNoteForm?.treatmentPlan, activePatient]);

	const liveAnesCalc = React.useMemo(() => {
		return calculateAnesthesiaCarpulesSafety({
			drugKey: selectedAnesDrugKey,
			carpulesCount: selectedCarpulesCount,
			patientWeightKg,
			somaticProfile: {
				hasCardiovascularRisk: anesthesiaRisk.hasHypertensionRisk,
				hasSulfiteAllergy: Array.isArray((activePatient as any)?.allergies)
					? (activePatient as any).allergies.some((a: string) => /сульфит|метабисульфит/i.test(a))
					: false,
				hasBronchialAsthma: Array.isArray((activePatient as any)?.medicalAlerts)
					? (activePatient as any).medicalAlerts.some((a: string) => /астм/i.test(a))
					: false,
				isPregnantOrLactating: Array.isArray((activePatient as any)?.medicalAlerts)
					? (activePatient as any).medicalAlerts.some((a: string) => /беременн|лактац|гв/i.test(a))
					: false,
			},
		});
	}, [
		selectedAnesDrugKey,
		selectedCarpulesCount,
		patientWeightKg,
		anesthesiaRisk.hasHypertensionRisk,
		activePatient,
	]);

	const handleApplyClinicalSoapPreset = React.useCallback(
		(
			preset: ClinicalSoapPreset,
			chosenTooth?: number | null,
			mode: "clean_replace" | "smart_append" = "clean_replace",
		) => {
			if (!updateVisitNoteField) return;
			const targetTooth =
				chosenTooth ||
				activeSelectedTooth ||
				(typeof visitNoteForm?.diagnosis === "string"
					? visitNoteForm.diagnosis.match(
							/\b([1-4][1-8]|5[1-5]|6[1-5]|7[1-5]|8[1-5])\b/,
						)?.[0]
					: null) ||
				preset.defaultTooth ||
				16;
			const toothSuffix =
				preset.category !== "hygiene" && targetTooth ? ` (Зуб ${targetTooth})` : "";
			const toothPrefix =
				preset.category !== "hygiene" && targetTooth ? `Зуб ${targetTooth}: ` : "";

			const cleanComplaint = preset.complaint || preset.anamnesis;
			const cleanAnamnesis = preset.anamnesis;
			const formattedStatus = `${toothPrefix}${preset.statusLocalis}`;
			const formattedDiagnosis = preset.icd10Label
				? `${preset.icd10} ${preset.icd10Label}${toothSuffix}`
				: `${preset.icd10} ${preset.title}${toothSuffix}`;

			let chosenAnesDrug = preset.anesthetic?.drugKey || "ultracain_ds_forte";
			let anesText = "";

			const hasCardioOrHypertension =
				anesthesiaRisk.hasHypertensionRisk ||
				(activePatient as any)?.medicalAlerts?.some((a: string) =>
					/гипертон|давлен|сердц|ссз|аритми/i.test(a),
				);
			const hasSulfiteRisk =
				Array.isArray((activePatient as any)?.allergies) &&
				(activePatient as any).allergies.some((a: string) =>
					/сульфит|метабисульфит/i.test(a),
				);

			if (preset.category !== "hygiene") {
				if (hasCardioOrHypertension || hasSulfiteRisk) {
					chosenAnesDrug = "scandonest_3";
					setSelectedAnesDrugKey("scandonest_3");
					setSelectedCarpulesCount(1.0);
					anesText =
						"Инфильтрационная/проводниковая анестезия: Sol. Scandonest 3% (Мепивакаин 3% без вазоконстриктора) — 1.7 мл (по кардио-соматическому профилю пациента).";
					showToast(
						"⚠️ Выбран Скандонест 3% (без адреналина) по соматическому профилю пациента",
						"warning",
						4000,
					);
				} else {
					setSelectedAnesDrugKey(chosenAnesDrug);
					setSelectedCarpulesCount(preset.anesthetic?.carpulesCount || 1.0);
					anesText =
						chosenAnesDrug === "ultracain_ds"
							? "Инфильтрационная/проводниковая анестезия: Sol. Ultracaini D-S 1:200 000 — 1.7 мл."
							: "Инфильтрационная/проводниковая анестезия: Sol. Ultracaini D-S Forte 1:100 000 — 1.7 мл.";
				}
			}

			let billLine = "";
			if (preset.service804n) {
				billLine = `Выполнено: [Код 804н ${preset.service804n.code804n}] ${preset.service804n.title}${toothSuffix} — ${preset.service804n.basePriceRub.toLocaleString("ru-RU")} ₽`;
			}

			const materialsList = preset.materialsToDeduct ?? [];
			const materialsSummary =
				materialsList.length > 0
					? materialsList.map((m) => `${m.name} (${m.quantity} ${m.unit})`).join("; ")
					: "";
			const materialsLine = materialsSummary
				? `Списание со склада (Норма 804н): ${materialsSummary}`
				: "";

			const fullPlanText = [anesText, preset.treatmentDescription, billLine, materialsLine]
				.filter(Boolean)
				.join("\n\n");

			if (mode === "clean_replace") {
				updateVisitNoteField("complaint", cleanComplaint);
				updateVisitNoteField("anamnesis", cleanAnamnesis);
				updateVisitNoteField("objectiveStatus", formattedStatus);
				updateVisitNoteField("diagnosis", formattedDiagnosis);
				updateVisitNoteField("treatmentPlan", fullPlanText);
			} else {
				updateVisitNoteField(
					"complaint",
					appendClinicalText(visitNoteForm?.complaint || "", cleanComplaint, "; "),
				);
				updateVisitNoteField(
					"anamnesis",
					appendClinicalText(visitNoteForm?.anamnesis || "", cleanAnamnesis, "; "),
				);
				updateVisitNoteField(
					"objectiveStatus",
					appendClinicalText(visitNoteForm?.objectiveStatus || "", formattedStatus, "\n"),
				);
				updateVisitNoteField(
					"diagnosis",
					appendClinicalText(visitNoteForm?.diagnosis || "", formattedDiagnosis, ", "),
				);
				updateVisitNoteField(
					"treatmentPlan",
					appendClinicalText(visitNoteForm?.treatmentPlan || "", fullPlanText, "\n\n"),
				);
			}

			if (preset.recommendations) {
				updateVisitNoteField(
					"recommendations",
					mode === "clean_replace"
						? preset.recommendations
						: appendClinicalText(
								visitNoteForm?.recommendations || "",
								preset.recommendations,
								"\n",
							),
				);
			}

			// Синхронизация с Одонтограммой и Дневником 043/у
			if (preset.toothState && targetTooth) {
				const toothNum = Number(targetTooth);
				try {
					window.dispatchEvent(
						new CustomEvent("clinical-finding-detected", {
							detail: {
								toothNumber: toothNum,
								finding: preset.toothState,
							},
						}),
					);
					window.dispatchEvent(
						new CustomEvent("dente-odontogram-update", {
							detail: {
								patientId: realVisitFieldId(activePatient?.id),
								states: [{ toothNumber: toothNum, state: preset.toothState }],
							},
						}),
					);
					window.dispatchEvent(
						new CustomEvent("dente-apply-soap-protocol", {
							detail: {
								finding: { toothNumber: toothNum, state: preset.toothState },
								soap: {
									anamnesis: cleanAnamnesis,
									statusLocalis: formattedStatus,
									diagnosisIcd10: preset.icd10,
									diagnosisTooth: String(toothNum),
									treatmentDescription: fullPlanText,
								},
								mode,
							},
						}),
					);
					const patId = realVisitFieldId(activePatient?.id);
					if (patId) {
						fetch(`/api/patients/${patId}/tooth-states/batch`, {
							method: "POST",
							headers: denteAdminSecretRequestHeaders({
								"Content-Type": "application/json",
							}),
							body: JSON.stringify({
								toothNumbers: [toothNum],
								state: preset.toothState,
							}),
						}).catch(() => {});
					}
				} catch {
					// safe event dispatch
				}
			}
		},
		[
			updateVisitNoteField,
			activeSelectedTooth,
			visitNoteForm,
			anesthesiaRisk.hasHypertensionRisk,
			activePatient,
		],
	);
	/*
	 * БЫЛО: appLogic.visitDraft. Черновик лежит в контексте под именем `draft`
	 * (useAppLogic.tsx возвращает именно его), а `visitDraft` не существует.
	 * Из-за опечатки панель никогда не признавала, что черновик собран: шапка
	 * говорила «Структура приема» вместо «Проверьте черновик», блок качества
	 * разбора не показывался, а предупреждения нейро-черновика («проверьте
	 * диагноз», «зуб не указан») не доходили до врача вовсе.
	 */
	const draft = appLogic.draft ?? null;
	/*
	 * БЫЛО: visitFlowResult из контекста, которого там нет — useAppLogic даже не
	 * забирает это поле из useVisitLogic. Панель «Ассистент обработки приема» не
	 * показывалась НИ РАЗУ, хотя сборка нейро-черновика её результат заполняет.
	 * Читаем прямо из хранилища визита — это и есть источник, куда пишет
	 * buildDraft.
	 */
	const visitFlowResult = useVisitStore((state) => state.visitFlowResult);
	const setVisitFlowResult = useVisitStore((state) => state.setVisitFlowResult);

	/*
	 * РАЗБОР ПРЕДЫДУЩЕГО ПАЦИЕНТА БОЛЬШЕ НЕ ВИСИТ НА ЭКРАНЕ ТЕКУЩЕГО.
	 *
	 * visitFlowResult лежит в общем хранилище визита и записывается один раз —
	 * после удачного ответа /api/ai/visit-flow. Обнулять его не умеет НИКТО:
	 * сохранение записи приёма делает setDraft(null) и этого поля не касается,
	 * смена пациента и смена приёма его тоже не трогают. Врач разбирал приём
	 * пациента А, начинал приём пациента Б — и под шапкой ЭМК оставалась панель
	 * «Ассистент обработки приема» с диагнозом ДЛЯ ПАЦИЕНТА, рекомендациями после
	 * процедуры и предложенными документами пациента А. У кресла это читается как
	 * разбор текущего человека.
	 *
	 * Сам ответ сервера пациента не называет (visitFlowResultSchema — четыре шага
	 * и общий статус), поэтому владельца запоминаем на клиенте, вне компонента:
	 * вкладка «ЭМК и Диктовка» размонтируется при уходе на «Зубную формулу», и
	 * привязка в useRef исчезла бы вместе с ней.
	 */
	const visitOwnerKey = visitFlowOwnerKey(
		activePatient?.id,
		dashboard?.activeVisit?.id,
	);
	const visitFlowResultIsOfAnotherVisit = visitFlowResultIsForeign(
		visitFlowResult,
		visitOwnerKey,
	);

	React.useEffect(() => {
		if (!visitFlowResult) return;
		if (visitFlowResultIsOfAnotherVisit) {
			// Чужой разбор убираем из хранилища, иначе он вернётся на экран при
			// следующем переключении вкладок приёма.
			forgetVisitFlowResultOwner();
			setVisitFlowResult(null);
			return;
		}
		rememberVisitFlowResultOwner(visitFlowResult, visitOwnerKey);
	}, [
		visitFlowResult,
		visitOwnerKey,
		visitFlowResultIsOfAnotherVisit,
		setVisitFlowResult,
	]);

	const [isExportingCda, setIsExportingCda] = React.useState(false);
	const [isEgiszModalOpen, setIsEgiszModalOpen] = React.useState(false);
	const [isBillingActModalOpen, setIsBillingActModalOpen] = React.useState(false);
	const [trayBarcode, setTrayBarcode] = React.useState("");
	const [linkedBarcode, setLinkedBarcode] = React.useState<string | null>(null);
	const [isLinkingTray, setIsLinkingTray] = React.useState(false);
	const [isPriceSearchModalOpen, setIsPriceSearchModalOpen] = React.useState(false);
	const [priceSearchQuery, setPriceSearchQuery] = React.useState("");
	const [selectedPriceCategory, setSelectedPriceCategory] = React.useState<string>("all");

	const DEFAULT_PRICE_SERVICES = React.useMemo(
		() => [
			{ id: "srv-caries-comp", title: "Лечение кариеса с нанокомпозитной реставрацией", shortLabel: "Пломба / Кариес", basePriceRub: 4500, category: "therapy" },
			{ id: "srv-pulp-endo", title: "Эндодонтическое лечение пульпита (обработка + обтурация)", shortLabel: "Эндодонтия / Пульпит", basePriceRub: 8500, category: "therapy" },
			{ id: "srv-anes-art", title: "Анестезия инфильтрационная / проводниковая (Артикаин 4%)", shortLabel: "Анестезия Артикаин", basePriceRub: 800, category: "anesthesia" },
			{ id: "srv-anes-mep", title: "Анестезия безадреналиновая (Мепивакаин 3%)", shortLabel: "Анестезия без адреналина", basePriceRub: 900, category: "anesthesia" },
			{ id: "srv-xray-visi", title: "Прицельная внутриротовая радиовизиография", shortLabel: "Прицельный снимок", basePriceRub: 600, category: "diagnostics" },
			{ id: "srv-xray-optg", title: "Ортопантомография (ОПТГ цифровой снимок)", shortLabel: "Панорамный снимок (ОПТГ)", basePriceRub: 1500, category: "diagnostics" },
			{ id: "srv-crown-zirc", title: "Коронка из диоксида циркония (Prettau)", shortLabel: "Коронка цирконий", basePriceRub: 22000, category: "orthopedics" },
			{ id: "srv-crown-emax", title: "Керамическая коронка E.max CAD", shortLabel: "Коронка E.max", basePriceRub: 24000, category: "orthopedics" },
			{ id: "srv-surg-extr", title: "Удаление зуба простое с анестезией", shortLabel: "Удаление зуба", basePriceRub: 2500, category: "surgery" },
			{ id: "srv-surg-extr-c", title: "Удаление ретенированного зуба мудрости (сложное)", shortLabel: "Сложное удаление (8-ка)", basePriceRub: 7500, category: "surgery" },
			{ id: "srv-hygiene-prof", title: "Комплексная гигиена (УЗ + Air-Flow + Фторирование)", shortLabel: "Комплексная чистка", basePriceRub: 5000, category: "hygiene" },
		],
		[],
	);

	const allPriceServices = React.useMemo(() => {
		const catalog = Array.isArray(dashboard?.serviceCatalog)
			? (dashboard?.serviceCatalog as Array<{ id?: string; title?: string; active?: boolean; basePriceRub?: number; category?: string }>)
			: [];
		const activeCatalog = catalog
			.filter((s) => s.active !== false && Boolean(s.title) && typeof s.basePriceRub === "number")
			.map((s) => ({
				id: s.id || s.title!,
				title: s.title!,
				shortLabel: s.title!,
				basePriceRub: s.basePriceRub!,
				category: s.category || "therapy",
			}));
		if (activeCatalog.length > 0) return activeCatalog;
		return DEFAULT_PRICE_SERVICES;
	}, [dashboard?.serviceCatalog, DEFAULT_PRICE_SERVICES]);

	const filteredPriceServices = React.useMemo(() => {
		const q = priceSearchQuery.trim().toLowerCase();
		return allPriceServices.filter((srv) => {
			const matchesCat = selectedPriceCategory === "all" || srv.category === selectedPriceCategory;
			if (!matchesCat) return false;
			if (!q) return true;
			return (
				srv.title.toLowerCase().includes(q) ||
				srv.shortLabel.toLowerCase().includes(q) ||
				srv.basePriceRub.toString().includes(q)
			);
		});
	}, [allPriceServices, priceSearchQuery, selectedPriceCategory]);

	const handleAddServiceToPlan = React.useCallback(
		(service: { title: string; basePriceRub: number }) => {
			if (!updateVisitNoteField) return;
			const currPlan = visitNoteForm.treatmentPlan || "";
			const serviceLine = `Выполнено: ${service.title} — ${service.basePriceRub.toLocaleString("ru-RU")} ₽`;
			const newPlan = currPlan ? `${currPlan}\n\n${serviceLine}` : serviceLine;
			updateVisitNoteField("treatmentPlan", newPlan);
			showToast(
				`Услуга «${service.title}» (${service.basePriceRub.toLocaleString("ru-RU")} ₽) добавлена в протокол и счет`,
				"success",
				4000,
			);
		},
		[updateVisitNoteField, visitNoteForm.treatmentPlan],
	);

	const handleDownloadCdaXml = async () => {
		const visitId = realVisitFieldId(dashboard?.activeVisit?.id);
		if (!visitId) {
			showToast(
				"Сначала выберите или откройте активный визит для экспорта CDA R2",
				"warning",
			);
			return;
		}
		if (isExportingCda) return;
		setIsExportingCda(true);
		try {
			const headers = appLogic.auth?.denteClinicalReadHeaders?.() ?? {};
			const res = await fetch(`/api/egisz/visits/${visitId}/cda`, { headers });
			if (!res.ok) {
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				const errJson = await res.json().catch((err: any) => {
					logger.error(err);
					showToast(
						actionFailureToast(
							"Ошибка чтения ответа",
							(err as { status?: number })?.status ?? null,
						),
						"error",
					);
					return null;
				});
				showToast(
					`Ошибка экспорта CDA R2: ${errJson?.message || errJson?.error || res.statusText}`,
					"error",
				);
				return;
			}
			const xmlText = await res.text();
			const blob = new Blob([xmlText], { type: "application/xml" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `cda_visit_${visitId.slice(0, 8)}.xml`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			showToast("Документ CDA R2 (XML) успешно скачан", "success");
		} catch (err) {
			logger.error("[EMK] Ошибка скачивания CDA R2:", err);
			showToast(
				actionFailureToast(
					"Ошибка скачивания CDA R2",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
		} finally {
			setIsExportingCda(false);
		}
	};

	const handleLinkSterilizationTray = async (e: React.FormEvent) => {
		e.preventDefault();
		const visitId = realVisitFieldId(dashboard?.activeVisit?.id);
		if (!visitId) {
			showToast(
				"Сначала выберите или откройте активный визит для привязки лотка",
				"warning",
			);
			return;
		}
		if (!trayBarcode.trim()) {
			showToast("Укажите штрихкод простерилизованного лотка", "warning");
			return;
		}
		if (isLinkingTray) return;
		setIsLinkingTray(true);
		try {
			/*
			 * POST /api/sterilization/link — klinicheskaya mutaciya visit_diaries.
			 * BYLO: denteClinicalReadHeaders (read-secret). Pri requireClinicalMutation
			 * na API read-secret ne prohodit mutation gate → 403 u zakazchika.
			 * STALO: denteClinicalMutationHeaders, kak diary draft/lock.
			 */
			const headers = appLogic.auth?.denteClinicalMutationHeaders?.({
				"Content-Type": "application/json",
			}) ?? { "Content-Type": "application/json" };
			const res = await fetch("/api/sterilization/link", {
				method: "POST",
				headers,
				body: JSON.stringify({ visitId, barcode: trayBarcode.trim() }),
			});
			if (!res.ok) {
				const errData = (await res.json().catch((err: unknown) => {
					logger.error(err);
					showToast(
						actionFailureToast(
							"Ошибка чтения ответа",
							(err as { status?: number })?.status ?? null,
						),
						"error",
					);
					return null;
				})) as { message?: string; error?: string } | null;
				showToast(
					errData?.message ||
						errData?.error ||
						"Лоток не прошёл стерилизацию или не найден в журнале",
					"error",
				);
				return;
			}
			setLinkedBarcode(trayBarcode.trim());
			setTrayBarcode("");
			showToast(
				`Лоток ${trayBarcode.trim()} успешно привязан к дневнику приема`,
				"success",
			);
		} catch (err) {
			logger.error("[EMK] Ошибка привязки лотка стерилизации:", err);
			showToast(
				actionFailureToast(
					"Ошибка привязки лотка стерилизации",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
		} finally {
			setIsLinkingTray(false);
		}
	};

	const emkTabs = [
		{ id: "all", label: "Все поля" },
		{ id: "complaint", label: "Жалобы" },
		{ id: "anamnesis", label: "Анамнез" },
		{ id: "objectiveStatus", label: "Объективно" },
		{ id: "diagnosis", label: "Диагноз" },
		{ id: "treatmentPlan", label: "Лечение" },
	];

	const allFields = Array.isArray(visitNoteFieldDefinitions)
		? visitNoteFieldDefinitions
		: [];
	const visibleFields =
		activeEmkTab === "all"
			? allFields
			: // biome-ignore lint/suspicious/noExplicitAny: automated suppression
				allFields.filter((f: any) => f.key === activeEmkTab);
	/*
	 * Поля приходят из контекста. Если их нет (карта приёма ещё не загрузилась
	 * или загрузка не удалась), врач должен видеть причину, а не молча пустое
	 * место: пустой экран и отказ сервера выглядят одинаково, и врач начинает
	 * искать, куда пропала запись.
	 */
	const fieldsUnavailable = allFields.length === 0;

	/*
	 * БЫЛО: под щитом печаталось `(draft.warnings ?? []).join(" ")`. Когда разбор
	 * возвращает черновик без предупреждений, это пустая строка: врач видел
	 * иконку и пустое место рядом — панель молчала о том, собран ли черновик и
	 * что делать дальше. Ровно этот же дефект уже правили у последней ветки
	 * (пустой doctorSummary), а у первой он остался.
	 */
	const draftWarningsText = (draft?.warnings ?? [])
		.filter(
			(warning: unknown): warning is string =>
				typeof warning === "string" && warning.trim().length > 0,
		)
		.join(" ");
	const draftNoteText =
		draftWarningsText ||
		"Нейро-черновик собран, замечаний к нему нет. Проверьте поля выше и сохраните запись приёма.";

	/*
	 * Сколько записей ждут отправки — счётное слово склоняется общим countLabel,
	 * иначе выходит «1 записей». Раньше строка не называла ни числа, ни того, что
	 * записи уже целы: врач читал «серверная синхронизация ожидает» и не понимал,
	 * потеряна работа или нет.
	 */
	const pendingSavesText = `Ждут отправки на сервер клиники: ${countLabel(Number(pendingVisitSaveCount) || 0, "запись приёма", "записи приёма", "записей приёма")}. Всё сохранено на этом компьютере, ничего не потеряно — как только связь появится, отправка пойдёт сама. Ждать не обязательно: нажмите «Отправить сейчас».`;

	/*
	 * РАСПИСКА О СОХРАНЕНИИ — ТОЛЬКО ОТ ЭТОГО ПРИЁМА.
	 *
	 * БЫЛО: печаталась последняя расписка, какая была в хранилище. А она пишется
	 * один раз (после удачного /draft/accept) и не обнуляется ничем. Врач
	 * сохранял приём пациента А, открывал ПУСТУЮ запись пациента Б — и читал
	 * «Сервер подтвердил сохранение 14:32, версия карты 3». Пустая запись
	 * отчитывалась как сохранённая, чужим временем и чужой версией карты, а
	 * настоящая подсказка «Запись приёма пока пустая. Продиктуйте или впишите
	 * жалобы…» до врача не доходила: она стоит последней в той же цепочке.
	 *
	 * Расписка несёт visitId — сверяем с открытым приёмом. Чужую не показываем и
	 * не выбрасываем: вернётся врач к тому приёму — расписка снова на месте.
	 */
	const saveReceiptOfThisVisit = visitSaveReceiptBelongsToVisit(
		lastVisitSaveReceipt,
		dashboard?.activeVisit?.id,
	)
		? lastVisitSaveReceipt
		: null;

	/*
	 * НЕЗАПИСАННЫЙ ТЕКСТ ПРЕДЫДУЩЕГО ПРИЁМА БОЛЬШЕ НЕ УХОДИТ В ЧУЖУЮ КАРТУ.
	 *
	 * Форма записи приёма лежит в общем хранилище визита и при смене приёма НЕ
	 * перечитывается: во всём дереве нет ни одного места, где visitNoteForm
	 * заново собиралась бы из нового dashboard.activeVisit. Врач набрал жалобы,
	 * осмотр и диагноз пациента А, не сохранил, открылся приём пациента Б — поля
	 * остались с текстом А, признак «есть правки» стал истинным, панель показала
	 * «Проверьте правки» и кнопку «Сохранить». Одно нажатие писало жалобы и
	 * диагноз пациента А в медицинскую карту пациента Б.
	 *
	 * Признак «есть правки» сам по себе не отличает это от честной правки
	 * текущего приёма, поэтому память о том, к какому приёму относится текст,
	 * держится в visitIdentity.ts — вне компонента, потому что вкладка
	 * размонтируется при уходе на «Зубную формулу».
	 */
	const openVisitId = realVisitFieldId(dashboard?.activeVisit?.id);
	const noteTextOfAnotherVisit = peekNoteFormForeignVisit(
		openVisitId,
		Boolean(isVisitNoteDirty),
	);

	React.useEffect(() => {
		commitNoteFormVisit(openVisitId, Boolean(isVisitNoteDirty));
	}, [openVisitId, isVisitNoteDirty]);

	const setVisitNoteForm = useVisitStore((state) => state.setVisitNoteForm);
	const showRecordOfOpenVisit = () => {
		setVisitNoteForm(visitNoteFormFromVisit(dashboard?.activeVisit ?? null));
	};

	return (
		<section
			data-testid="visit-emk-tab"
			className="visit-note-panel bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] rounded-xl p-4 pb-32 sm:pb-8"
			aria-label="Черновик электронной медицинской карты"
		>
			<div className="visit-note-head flex items-center justify-between gap-3 flex-wrap">
				<div>
					<p
						className="eyebrow text-[var(--ink-2,var(--muted,#cbd5e1))] dark:text-slate-200"
						style={{ color: "var(--ink-2, var(--muted, #cbd5e1))" }}
						data-testid="emk-section-eyebrow"
					>
						ЭМК после диктовки
					</p>
					<h3
						className="text-slate-900 dark:text-slate-100 text-base font-extrabold"
						style={{ color: "var(--ink, #f8fafc)" }}
						data-testid="emk-section-title"
					>
						{draft
							? "Проверьте черновик"
							: isVisitNoteDirty
								? "Проверьте правки"
								: "Структура приема"}
					</h3>
				</div>
				<div className="flex items-center gap-2.5 flex-wrap">
					<button
						type="button"
						onClick={() => handleOpenNextVisitBooking(5)}
						className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-98"
						data-testid="btn-schedule-next-stage"
						title="Записать пациента на следующий этап лечения через 5-7 дней"
					>
						<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/></svg>
						<span>Записать на след. этап (+5 дней)</span>
					</button>
					<button
						type="button"
						onClick={handleCompleteVisitAndGenerateReceipt}
						disabled={isCompletingVisit}
						className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-98"
						data-testid="btn-complete-visit-checkout"
						title="1-клик сохранение дневника Формы 043/у, автоматическая сборка сметы и передача чека на кассу"
					>
						<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
						<span>{isCompletingVisit ? "Завершение приёма…" : "Завершить приём и сформировать чек"}</span>
					</button>
					<span
						className={`visit-note-status-badge text-xs font-bold px-2.5 py-1 rounded-full border transition-all ${
							draft || isVisitNoteDirty
								? "ready bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
								: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 dark:bg-emerald-950/40"
						}`}
					>
						{visitNoteStatusLabel}
					</span>
				</div>
			</div>

			{/* Плашка статуса после завершения приёма: Смета сформирована • Чек передан на кассу */}
			{completionResult && (
				<div
					data-testid="visit-completion-banner"
					className="my-3 p-4 rounded-2xl bg-[var(--ok-bg)] border-2 border-[var(--ok-fg)]/50 flex items-center justify-between gap-4 flex-wrap shadow-sm animate-in fade-in slide-in-from-top-2"
				>
					<div className="flex items-center gap-3">
						<div className="w-11 h-11 rounded-xl bg-[var(--ok-fg)] text-white flex items-center justify-center font-black text-xl shrink-0 shadow-xs">
							<Check size={20} className="stroke-[3]" />
						</div>
						<div>
							<div className="text-xs font-bold text-[var(--ok-fg)] uppercase tracking-wider flex items-center gap-1.5">
								<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
								<span>Приём завершён • Дневник 043/у зафиксирован</span>
							</div>
							<div className="text-sm sm:text-base font-extrabold text-[var(--ink)]">
								{completionResult.statusBannerText}
							</div>
							<div className="text-xs text-[var(--muted)] flex items-center gap-2">
								<span>Позиций в смете: {completionResult.items.length}</span>
								<span>•</span>
								<span>{completionResult.receiptNumber}</span>
							</div>
						</div>
					</div>
					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={() => handleOpenNextVisitBooking(5)}
							className="min-h-[44px] px-4 py-2 text-xs sm:text-sm font-extrabold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-all cursor-pointer inline-flex items-center gap-2 active:scale-98"
							data-testid="btn-completion-schedule-next-visit"
							title="Записать на повторный приём через 5-7 дней"
						>
							<Calendar size={16} />
							<span>След. приём (+5 дней)</span>
						</button>
						<button
							type="button"
							onClick={() => setIsSbpQrModalOpen(true)}
							className="min-h-[44px] px-4 py-2 text-xs sm:text-sm font-extrabold rounded-xl bg-[var(--ok-fg)] hover:opacity-90 text-white shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
							data-testid="btn-pay-sbp-qr"
						>
							<QrCode size={16} />
							<span>Оплата СБП (QR-код)</span>
						</button>
						<button
							type="button"
							onClick={() => setIsBillingActModalOpen(true)}
							className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--ink)] cursor-pointer inline-flex items-center gap-1.5"
							data-testid="btn-print-estimate-receipt"
						>
							<Printer size={14} />
							<span>Смета и Акт (А4)</span>
						</button>
					</div>
				</div>
			)}
			{noteTextOfAnotherVisit ? (
				<div
					role="alert"
					aria-live="assertive"
					id="visit-note-foreign-text"
					data-testid="visit-note-foreign-text"
					className="mt-3 mb-3 p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-sm text-rose-900 dark:text-rose-200"
				>
					<strong className="block mb-1">
						В полях остался текст предыдущего приёма
					</strong>
					<p className="m-0">
						Открыт другой приём
						{activePatient?.fullName ? ` — ${activePatient.fullName}` : ""}, а в
						полях лежит незаписанный текст прошлого приёма. Сохранять его отсюда
						нельзя: жалобы и диагноз уйдут в карту не того человека, а снять
						такую запись можно только ревизией. Что нужно перенести — скопируйте
						из полей себе, а затем нажмите кнопку ниже: поля покажут запись
						открытого приёма.
					</p>
					<div className="mt-3 flex items-center gap-2 flex-wrap">
						<button
							type="button"
							className="px-3.5 py-2 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
							onClick={copyAllVisitNoteText}
						>
							<Copy size={14} />
							<span>Скопировать в буфер</span>
						</button>
						<button
							type="button"
							className="px-3.5 py-2 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer"
							onClick={() => setIsConfirmSwitchModalOpen(true)}
						>
							<Trash2 size={14} />
							<span>Показать запись открытого приёма</span>
						</button>
					</div>
				</div>
			) : null}
			{visitFlowResult && !visitFlowResultIsOfAnotherVisit ? (
				<VisitFlowProgress result={visitFlowResult} />
			) : null}

			{/* Умный голосовой AI-Пилот ЭМК (0 кликов на приёме) */}
			<EmkVoicePilot
				onApplyToothState={handleApplyVoiceToothState}
				onApplySoapNotes={handleApplyVoiceSoapNotes}
				onApplyAnesthesia={handleApplyVoiceAnesthesia}
				onApplyProcedures={handleApplyVoiceProcedures}
				activeSelectedTooth={activeSelectedTooth}
				className="my-2"
			/>

			{/* Быстрые клинические протоколы SOAP + МКБ-10 (Tier 2 Warm Context Accordion) */}
			<details className="group rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-2.5 text-xs my-2">
				<summary className="flex items-center justify-between cursor-pointer font-bold text-xs select-none list-none text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
					<div className="flex items-center gap-2 min-w-0 pr-2">
						<Sparkles className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
						<span className="truncate">Экспресс-протоколы SOAP и шаблоны СтАР (1 клик)</span>
					</div>
					<span className="text-[10px] font-normal text-[var(--muted)] group-open:hidden shrink-0 ml-auto whitespace-nowrap">Развернуть &darr;</span>
				</summary>
				<div className="pt-2">
					<ClinicalQuickPresetsBar
						activeTooth={activeSelectedTooth}
						onSelectActiveTooth={(tooth) => setActiveSelectedTooth(tooth)}
						onSelectPreset={(preset, chosenTooth) => handleApplyClinicalSoapPreset(preset, chosenTooth, "clean_replace")}
						isLocked={Boolean(dashboard?.activeVisit?.status === "signed")}
						onOpenPriceSearch={() => setIsPriceSearchModalOpen(true)}
						onOpenTemplatesModal={() => setIsSoapTemplatesModalOpen(true)}
					/>
				</div>
			</details>

			{/* Компактные 32px вкладки (EMK Tabs) */}
			<div className="emk-tabs-container flex items-center gap-1.5 overflow-x-auto flex-nowrap scrollbar-none my-2 pb-1 border-b border-[var(--line)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
				{emkTabs.map((tab) => {
					const isFilled =
						tab.id !== "all" &&
						String(noteForm[tab.id] ?? "").trim().length > 0;
					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={activeEmkTab === tab.id}
							className={`emk-tab-button h-8 !min-h-[32px] px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap ${
								activeEmkTab === tab.id
									? "active bg-[var(--teal-fill,var(--teal))] text-white border-[var(--teal-fill,var(--teal))] shadow-xs"
									: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] hover:border-[var(--teal)]"
							}`}
							onClick={() => setActiveEmkTab(tab.id)}
						>
							<span>{tab.label}</span>
							{isFilled && <span className="emk-tab-dot" title="Заполнено" />}
						</button>
					);
				})}
			</div>

			<div
				className={`visit-fields ${activeEmkTab !== "all" ? "single-tab-mode" : ""} pb-36 pr-0 sm:pb-32 sm:pr-72 lg:pr-80`}
			>
				{fieldsUnavailable ? (
					<div
						className="p-4 rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper-soft)] text-sm text-[var(--ink)]"
						role="status"
						aria-live="polite"
					>
						<strong className="block mb-1 text-[var(--ink)]">
							Поля приёма пока не открылись
						</strong>
						Карта приёма ещё загружается. Если через несколько секунд поля не
						появились — обновите страницу; набранный текст сохраняется на этом
						компьютере и не потеряется.
					</div>
				) : null}
				{visibleFields.map((field) => {
					const QUICK_CHIPS: Record<string, string[]> = {
						complaint: [
							"Острая боль",
							"Ноющие боли",
							"Реакция на холод/горячее",
							"Боль при накусывании",
							"Кариес",
							"Пульпит",
							"Периодонтит",
							"Пломба (скол)",
							"Коронка",
							"Удален (подвижность)",
							"Здоров (профосмотр)",
							"Застревание пищи",
							"Кровоточивость десен",
							"Жалоб нет",
						],
						anamnesis: [
							"Зуб ранее лечен",
							"Ранее лечен по поводу неосложненного кариеса",
							"Ранее проводилось эндодонтическое лечение",
							"Травма зуба",
							"Хрон. соматические заболевания отрицает",
							"Аллергоанамнез не отягощен",
							"Аллергию на анестетики отрицает",
							"Гигиена полости рта регулярная",
						],
						objectiveStatus: [
							"Зуб ранее лечен",
							"Глубокая кариозная полость",
							"Зондирование болезненно по дну",
							"Зондирование безболезненно",
							"Перкуссия безболезненна",
							"Перкуссия болезненна",
							"Пародонтальные карманы > 4 мм (K05.3)",
							"BOP+ (кровоточивость при зондировании)",
							"Рабочая длина (WL) определена апекслокатором",
							"Слизистая бледно-розовая, без воспаления",
							"Сообщается с полостью зуба, пульпа кровоточит",
							"Зондирование устьев каналов безболезненно",
							"ЭОД 6–8 мкА (норма)",
							"ЭОД 35–45 мкА (пульпит)",
							"ЭОД > 100 мкА (периодонтит)",
						],
						diagnosis: [
							"Кариес дентина K02.1",
							"Пульпит необратимый K04.0",
							"Хронический апикальный периодонтит K04.5",
							"Хронический генерализованный пародонтит K05.3",
							"Частичная вторичная адентия K08.1",
							"Острый гингивит K05.0",
							"Ортопедическое лечение (коронка) Z51.8",
							"Стоматологический осмотр (здоров) Z01.2",
						],
						treatmentPlan: [
							"Инфильтрационная/проводниковая анестезия (Артикаин 4% с эпинефрином 1:100 000 / 1:200 000, 1.7 мл)",
							"Анестезия инфильтрационная (Артикаин 4% 1.7 мл)",
							"Анестезия проводниковая",
							"Изоляция коффердамом",
							"Препарирование, некрэктомия",
							"Адгезивный протокол + Светоотверждаемый композит",
							"Витальная экстирпация + NiTi обработка каналов",
							"Таблица рабочей длины каналов (WL/MAF)",
							"Ирригация NaOCl 3% + ЭДТА 17% + УЗ-активация",
							"Обтурация гуттаперчей с эпоксидным силером",
							"Лечебная паста Calcept Ca(OH)2",
							"Закрытый кюретаж + SRP кюретами Грейси",
							"Шлифовка, полировка (диски, паста)",
							"Гарантия на реставрацию (12–24 мес)",
							"Удаление зуба + кюретаж + гемостаз + шов",
							"УЗ-скейлинг + Air-Flow + Clinpro White Varnish",
						],
					};
					const chips = QUICK_CHIPS[field.key] || [];

					const handleChipClick = (chip: string) => {
						if (!updateVisitNoteField) return;
						const curr = visitNoteForm[field.key] || "";
						const textToAppend =
							chip === "Гарантия на реставрацию (12–24 мес)"
								? "Гарантийные обязательства: Гарантийный срок на световую композитную реставрацию — 24 месяца (срок службы: 36 месяцев) при условии соблюдения гигиены полости рта и регулярных профосмотрах не реже 1 раза в 6 месяцев."
								: chip;
						updateVisitNoteField(
							field.key,
							appendClinicalText(curr, textToAppend, field.key === "treatmentPlan" || field.key === "objectiveStatus" ? "\n" : ", "),
						);

						// Auto-match ICD-10 when clicking complaint chips if diagnosis is empty or default
						if (field.key === "complaint") {
							const currDiag = (visitNoteForm.diagnosis || "").trim();
							if (!currDiag || currDiag === "K02.1" || currDiag.length < 4) {
								const COMPLAINT_ICD10_MAP: Record<string, string> = {
									"Острая боль": "K04.0 Пульпит необратимый",
									"Пульпит": "K04.0 Пульпит необратимый",
									"Ноющие боли": "K04.5 Хронический апикальный периодонтит",
									"Боль при накусывании": "K04.5 Хронический апикальный периодонтит",
									"Периодонтит": "K04.5 Хронический апикальный периодонтит",
									"Реакция на холод/горячее": "K02.1 Кариес дентина",
									"Кариес": "K02.1 Кариес дентина",
									"Застревание пищи": "K02.1 Кариес дентина",
									"Пломба (скол)": "K02.1 Кариес дентина / Дефект пломбы",
									"Коронка": "Z51.8 Ортопедическое лечение (коронка)",
									"Удален (подвижность)": "K08.1 Частичная вторичная адентия",
									"Кровоточивость десен": "K05.3 Хронический генерализованный пародонтит",
									"Здоров (профосмотр)": "Z01.2 Стоматологическое обследование и гигиена",
									"Жалоб нет": "Z01.2 Стоматологическое обследование и гигиена",
								};
								if (COMPLAINT_ICD10_MAP[chip]) {
									updateVisitNoteField("diagnosis", COMPLAINT_ICD10_MAP[chip]);
								}
							}
						}
					};

					const FIELD_META: Record<string, { dotColor: string; badge: string; badgeClass: string }> = {
						complaint: {
							dotColor: "bg-amber-500",
							badge: "S · Жалобы",
							badgeClass: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30",
						},
						anamnesis: {
							dotColor: "bg-blue-500",
							badge: "Анамнез",
							badgeClass: "bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/30",
						},
						objectiveStatus: {
							dotColor: "bg-purple-500",
							badge: "O · Status Localis",
							badgeClass: "bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/30",
						},
						diagnosis: {
							dotColor: "bg-rose-500",
							badge: "A · МКБ-10",
							badgeClass: "bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30",
						},
						treatmentPlan: {
							dotColor: "bg-[var(--teal,var(--brand-primary))]",
							badge: "P · Протокол лечения",
							badgeClass: "bg-[var(--teal-surface)] text-[var(--teal)] border-[var(--teal-soft)]",
						},
					};
					const meta = FIELD_META[field.key] || {
						dotColor: "bg-[var(--teal,var(--brand-primary))]",
						badge: field.label,
						badgeClass: "bg-[var(--teal-surface)] text-[var(--teal)] border-[var(--teal-soft)]",
					};

					return (
						<div
							key={field.key}
							className="emk-field-container flex flex-col gap-3 p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs transition-all min-w-0"
						>
							<div className="flex items-center justify-between gap-2 w-full flex-wrap">
								<div className="flex items-center gap-2.5 min-w-0">
									<span className={`w-3 h-3 rounded-full shrink-0 ${meta.dotColor}`} />
									<strong className="text-base sm:text-lg font-extrabold text-[var(--ink)] tracking-tight">
										{field.label}
									</strong>
									<span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${meta.badgeClass}`}>
										{meta.badge}
									</span>
								</div>
								<SmartMicrophoneButton
									context="visit"
									sterileMode={false}
									onResult={(text) => {
										if (!updateVisitNoteField) return;
										const curr = visitNoteForm[field.key] || "";
										updateVisitNoteField(
											field.key,
											appendClinicalText(curr, text, " "),
										);
									}}
									style={{ padding: "4px" }}
								/>
							</div>
							{/* Компактный 32px тулбар форматирования текста медицинского протокола */}
							<div
								className="flex items-center justify-between gap-1 h-8 px-2 py-0.5 rounded-t-lg border border-b border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--muted)]"
								role="toolbar"
								aria-label={`Форматирование текста: ${field.label}`}
							>
								<div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
									<button
										type="button"
										onClick={() => applyTextFormatting(field.key, "bold")}
										className="h-6 px-1.5 rounded hover:bg-[var(--paper-strong)] hover:text-[var(--ink)] text-xs font-black inline-flex items-center justify-center transition-colors cursor-pointer"
										title="Полужирный (**текст**)"
										aria-label="Полужирный"
									>
										<Bold size={12} className="stroke-[3]" />
									</button>
									<button
										type="button"
										onClick={() => applyTextFormatting(field.key, "italic")}
										className="h-6 px-1.5 rounded hover:bg-[var(--paper-strong)] hover:text-[var(--ink)] text-xs font-bold inline-flex items-center justify-center transition-colors cursor-pointer"
										title="Курсив (*текст*)"
										aria-label="Курсив"
									>
										<Italic size={12} />
									</button>
									<button
										type="button"
										onClick={() => applyTextFormatting(field.key, "bullet")}
										className="h-6 px-1.5 rounded hover:bg-[var(--paper-strong)] hover:text-[var(--ink)] text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
										title="Маркированный список (• )"
										aria-label="Список"
									>
										<List size={12} />
										<span className="text-[10px]">Список</span>
									</button>
									<button
										type="button"
										onClick={() => applyTextFormatting(field.key, "check")}
										className="h-6 px-1.5 rounded hover:bg-[var(--paper-strong)] hover:text-[var(--ink)] text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
										title="Отметка выполнения ([✓] )"
										aria-label="Выполнено"
									>
										<CheckSquare size={12} />
										<span className="text-[10px]">Выполнено</span>
									</button>
									<button
										type="button"
										onClick={() => applyTextFormatting(field.key, "tooth")}
										className="h-6 px-1.5 rounded hover:bg-[var(--paper-strong)] hover:text-[var(--ink)] text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors cursor-pointer text-[var(--teal,var(--brand-primary))]"
										title="Вставить ссылку на зуб"
										aria-label="Зуб"
									>
										<Hash size={12} />
										<span className="text-[10px] font-bold">Зуб {activeSelectedTooth ? `#${activeSelectedTooth}` : ""}</span>
									</button>
									<button
										type="button"
										onClick={() => applyTextFormatting(field.key, "time")}
										className="h-6 px-1.5 rounded hover:bg-[var(--paper-strong)] hover:text-[var(--ink)] text-xs font-medium inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
										title="Вставить текущее время"
										aria-label="Время"
									>
										<Clock size={12} />
									</button>
								</div>
								<div className="flex items-center gap-1 shrink-0">
									<button
										type="button"
										onClick={() => applyTextFormatting(field.key, "copy")}
										className="h-6 px-1.5 rounded hover:bg-[var(--paper-strong)] hover:text-[var(--ink)] text-xs inline-flex items-center justify-center transition-colors cursor-pointer"
										title="Копировать текст поля"
										aria-label="Копировать"
									>
										<Copy size={12} />
									</button>
									<button
										type="button"
										onClick={() => applyTextFormatting(field.key, "clear")}
										className="h-6 px-1.5 rounded hover:bg-rose-500/15 hover:text-rose-600 text-xs inline-flex items-center justify-center transition-colors cursor-pointer"
										title="Очистить поле"
										aria-label="Очистить"
									>
										<Eraser size={12} />
									</button>
								</div>
							</div>
							<DebouncedEmkTextarea
								fieldKey={field.key}
								label={field.label}
								value={visitNoteForm[field.key] ?? ""}
								placeholder={`Введите ${field.label.toLowerCase()} или выберите кнопки быстрого набора...`}
								onCommit={(key, val) => updateVisitNoteField?.(key, val)}
								textareaRef={(el) => {
									textareaRefs.current[field.key] = el;
								}}
								className="min-h-[110px] rounded-b-lg rounded-t-none p-3 border border-t-0 border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] dark:text-slate-100 placeholder:text-[var(--muted)] resize-y w-full outline-none focus:border-[var(--teal,var(--brand-primary))] focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]/25 font-sans text-sm leading-relaxed"
							/>

							{/* Горизонтальный скролл быстрых чипов 32px под textarea */}
							{chips.length > 0 && (
								<div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5 min-w-0 max-w-full shrink-0">
									{chips.map((chip) => (
										<button
											key={chip}
											type="button"
											onClick={() => handleChipClick(chip)}
											className="quick-chip h-8 !min-h-[32px] px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] dark:text-slate-100 hover:bg-[var(--paper-strong)] hover:border-[var(--teal,var(--brand-primary))]/50 hover:text-[var(--teal,var(--brand-primary))] active:scale-95 transition-all cursor-pointer touch-manipulation whitespace-nowrap shadow-2xs inline-flex items-center gap-1.5 shrink-0"
										>
											<span className="text-[var(--teal,var(--brand-primary))] font-extrabold">+</span>
											<span>{chip}</span>
										</button>
									))}
								</div>
							)}

							{field.key === "treatmentPlan" && (
								<div className="flex flex-col gap-2.5 mt-1">
									{/* Аккордеон: Местная карпульная анестезия & Расчет МДД по весу */}
									<details className="group rounded-xl border border-[var(--teal,var(--line))]/30 bg-[var(--teal-surface)] overflow-hidden">
										<summary className="flex items-center justify-between p-3 cursor-pointer font-bold text-xs sm:text-sm select-none list-none text-[var(--ink)] hover:bg-[var(--teal-soft)]/40 transition-colors">
											<div className="flex items-center gap-2">
												<span className="w-6 h-6 rounded-md bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)] flex items-center justify-center text-xs">
													<Sparkles className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
												</span>
												<span>Местная карпульная анестезия & Расчет МДД по весу ({liveAnesCalc.drugName}, {selectedCarpulesCount} карп.)</span>
											</div>
											<ChevronDown size={16} className="text-[var(--muted)] transition-transform duration-200 group-open:rotate-180" />
										</summary>
										<div className="p-4 pt-1 flex flex-col gap-3 border-t border-[var(--teal,var(--line))]/20">
											<div className="flex items-center justify-between gap-2 flex-wrap border-b border-[var(--teal,var(--line))]/20 pb-2.5">
												<div>
													<span className="text-xs font-extrabold text-[var(--ink)] block">
														Стандарты СтАР и Минздрава РФ • Контроль токсической дозы
													</span>
												</div>
												<div className="flex items-center gap-2 flex-wrap">
													<button
														type="button"
														onClick={() => setIsAnesthesiaProtocolModalOpen(true)}
														className="text-xs font-bold px-3 py-1.5 rounded-lg border border-[var(--teal,var(--line))]/30 bg-[var(--paper)] text-[var(--teal,var(--brand-primary))] hover:bg-[var(--teal-soft,var(--paper-soft))] transition-colors inline-flex items-center gap-1.5 cursor-pointer touch-manipulation"
														data-testid="btn-open-anesthesia-protocol-modal"
													>
														<Sparkles className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
														<span>Расширенный калькулятор СтАР</span>
													</button>
													<button
														type="button"
														onClick={() => setIsAnesthesiaAspirationModalOpen(true)}
														className="text-xs font-bold px-3 py-1.5 rounded-lg border border-[var(--teal,var(--line))]/30 bg-[var(--paper)] text-[var(--teal,var(--brand-primary))] hover:bg-[var(--teal-soft,var(--paper-soft))] transition-colors inline-flex items-center gap-1.5 cursor-pointer touch-manipulation"
														data-testid="btn-open-anesthesia-aspiration-modal"
													>
														<ShieldCheck className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
														<span>Журнал аспирационных проб</span>
													</button>
												</div>
											</div>

											{/* Выбор препарата анестетика */}
											<div className="space-y-1.5">
												<label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] block">
													1. Выберите анестетик (карпулы):
												</label>
												<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
													<button
														type="button"
														onClick={() => setSelectedAnesDrugKey("ultracain_ds_forte")}
														className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer touch-manipulation min-h-[44px] flex items-start justify-between gap-2 ${
															selectedAnesDrugKey === "ultracain_ds_forte"
																? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--ink)] ring-1 ring-[var(--teal)] shadow-2xs"
																: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))]/40"
														}`}
														data-testid="btn-anes-ultracain-ds-forte"
													>
														<div className="min-w-0">
															<div className="text-xs font-extrabold truncate">
																Ультракаин Д-С Форте
															</div>
															<div className="text-[11px] opacity-80">
																1:100 000 · 1.7 мл (68 мг)
															</div>
														</div>
														<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 shrink-0">
															1:100k
														</span>
													</button>

													<button
														type="button"
														onClick={() => setSelectedAnesDrugKey("ultracain_ds")}
														className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer touch-manipulation min-h-[44px] flex items-start justify-between gap-2 ${
															selectedAnesDrugKey === "ultracain_ds"
																? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--ink)] ring-1 ring-[var(--teal)] shadow-2xs"
																: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))]/40"
														}`}
														data-testid="btn-anes-ultracain-ds"
													>
														<div className="min-w-0">
															<div className="text-xs font-extrabold truncate">
																Ультракаин Д-С
															</div>
															<div className="text-[11px] opacity-80">
																1:200 000 · 1.7 мл (68 мг)
															</div>
														</div>
														<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)] shrink-0">
															1:200k
														</span>
													</button>

													<button
														type="button"
														onClick={() => setSelectedAnesDrugKey("scandonest_3")}
														className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer touch-manipulation min-h-[44px] flex items-start justify-between gap-2 ${
															selectedAnesDrugKey === "scandonest_3"
																? "bg-[var(--ok-bg)] border-[var(--ok-fg)] text-[var(--ink)] ring-1 ring-[var(--ok-fg)]/40 shadow-2xs"
																: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--ok-fg)]/40"
														}`}
														data-testid="btn-anes-scandonest-3"
													>
														<div className="min-w-0">
															<div className="text-xs font-extrabold truncate text-[var(--ok-fg)]">
																Скандонест 3%
															</div>
															<div className="text-[11px] opacity-80">
																Без адреналина · 1.7 мл
															</div>
														</div>
														<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--ok-bg)] text-[var(--ok-fg)] border border-[var(--ok-fg)]/30 shrink-0">
															Группа риска
														</span>
													</button>
												</div>
											</div>

											{/* Дозировка в карпулах и масса тела */}
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
												{/* Выбор числа карпул */}
												<div className="space-y-1.5">
													<label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] block">
														2. Количество карпул: <strong>{selectedCarpulesCount} шт.</strong> ({liveAnesCalc.volumeMl} мл)
													</label>
													<div className="flex flex-wrap gap-1.5">
														{[0.5, 1.0, 1.5, 2.0, 3.0].map((cCount) => (
															<button
																key={cCount}
																type="button"
																onClick={() => setSelectedCarpulesCount(cCount)}
																className={`px-3 py-1 rounded-lg text-xs font-extrabold border transition-all cursor-pointer touch-manipulation min-h-[32px] h-8 ${
																	selectedCarpulesCount === cCount
																		? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal)] shadow-2xs"
																		: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
																}`}
																data-testid={`btn-carpules-${cCount}`}
															>
																{cCount} карп.
															</button>
														))}
													</div>
												</div>

												{/* Масса тела пациента */}
												<div className="space-y-1.5">
													<label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] flex items-center justify-between">
														<span>3. Масса тела пациента:</span>
														<strong className="text-[var(--teal,var(--brand-primary))]">{patientWeightKg} кг</strong>
													</label>
													<div className="flex items-center gap-2">
														<input
															type="range"
															min={15}
															max={140}
															step={1}
															value={patientWeightKg}
															onChange={(e) => setPatientWeightKg(parseInt(e.target.value) || 70)}
															className="w-full accent-[var(--teal,var(--brand-primary))] cursor-pointer"
															data-testid="input-patient-weight-slider"
														/>
														<input
															type="number"
															min={10}
															max={250}
															value={patientWeightKg}
															onChange={(e) => setPatientWeightKg(parseInt(e.target.value) || 70)}
															className="w-16 min-h-[32px] h-8 px-2 py-1 text-xs font-bold text-center rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
															data-testid="input-patient-weight-num"
														/>
													</div>
												</div>
											</div>

											{/* Индикатор безопасности дозировки и кнопка внесения */}
											<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex items-center justify-between gap-3 flex-wrap">
												<div className="space-y-0.5 min-w-0 flex-1">
													<div className="flex items-center gap-2">
														<span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
															liveAnesCalc.safetyLevel === "safe"
																? "bg-[var(--ok-fg)]"
																: liveAnesCalc.safetyLevel === "caution"
																	? "bg-lime-500"
																	: liveAnesCalc.safetyLevel === "warning"
																		? "bg-amber-500"
																		: "bg-rose-500"
														}`} />
														<span className="text-xs font-bold text-[var(--ink)] truncate">
															МДД для {patientWeightKg} кг: макс. <strong>{liveAnesCalc.maxSafeCarpules} карп.</strong> ({liveAnesCalc.maxSafeDoseMg} мг)
														</span>
														<span className="text-[11px] font-semibold text-[var(--muted)]">
															• {liveAnesCalc.safetyPercentage}% от лимита
														</span>
													</div>
													<div className="text-[11px] text-[var(--muted)] truncate">
														Препарат: {liveAnesCalc.drugName} • Введено: {liveAnesCalc.volumeMl} мл ({liveAnesCalc.activeDoseMg} мг)
														{liveAnesCalc.epinephrineMg > 0 ? ` • Адреналин: ${liveAnesCalc.epinephrineMg.toFixed(3)} мг` : " • Без адреналина"}
													</div>
												</div>

												<button
													type="button"
													onClick={() => {
														if (!updateVisitNoteField) return;
														const curr = visitNoteForm.treatmentPlan || "";
														updateVisitNoteField(
															"treatmentPlan",
															appendClinicalText(curr, liveAnesCalc.formattedTreatmentSnippet, "\n\n"),
														);
														showToast(`Анестезия (${liveAnesCalc.drugName}, ${selectedCarpulesCount} карп.) внесена в лечение`, "success", 3000);
													}}
													className="min-h-[38px] px-4 py-1.5 text-xs sm:text-sm font-extrabold rounded-xl bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] shadow-2xs active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 touch-manipulation"
													data-testid="btn-apply-anesthesia-to-plan"
												>
													<span>💉</span>
													<span>+ Внести в протокол</span>
												</button>
											</div>

											{/* Предупреждение о кардиоваскулярном риске */}
											{anesthesiaRisk.isWarningTriggered && (
												<div
													className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 flex items-start justify-between gap-2.5 text-xs text-amber-950 dark:text-amber-200"
													role="alert"
												>
													<div className="flex items-start gap-2">
														<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
														<div className="space-y-1">
															<strong className="font-extrabold block text-amber-950 dark:text-amber-100">
																Внимание: Группа кардиоваскулярного риска (Гипертония / ССЗ)
															</strong>
															<p className="m-0 leading-relaxed font-medium">
																{anesthesiaRisk.warningMessage}
															</p>
														</div>
													</div>
													<button
														type="button"
														onClick={() => setSelectedAnesDrugKey("scandonest_3")}
														className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100 hover:bg-amber-300 shrink-0 cursor-pointer"
													>
														Выбрать Скандонест 3%
													</button>
												</div>
											)}
										</div>
									</details>

									{/* Аккордеон: ЭНДОДОНТИЯ: Таблица учета корневых каналов, апекслокатор, мастер-файлы и силеры */}
									<details className="group rounded-xl border border-[var(--teal,var(--line))]/30 bg-[var(--teal-surface)] overflow-hidden">
										<summary className="flex items-center justify-between p-3 cursor-pointer font-bold text-xs sm:text-sm select-none list-none text-[var(--ink)] hover:bg-[var(--teal-soft)]/40 transition-colors">
											<div className="flex items-center gap-2">
												<span className="w-6 h-6 rounded-md bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)] flex items-center justify-center text-xs">⚡</span>
												<span>Эндодонтия: Учет каналов, апекслокация, мастер-файлы и силеры ({selectedEndoCanalKey}, {endoWorkingLengthMm} мм)</span>
											</div>
											<ChevronDown size={16} className="text-[var(--muted)] transition-transform duration-200 group-open:rotate-180" />
										</summary>
										<div className="p-3.5 pt-1 flex flex-col gap-3 border-t border-[var(--teal,var(--line))]/20">
											<div className="flex items-center justify-between gap-2 flex-wrap">
												<span className="text-xs text-[var(--muted)]">
													Форма 043/у • Протокол инструментации и пломбирования каналов
												</span>
												<button
													type="button"
													onClick={() => setIsEndoModalOpen(true)}
													className="min-h-[32px] h-8 px-3 py-1 text-xs font-extrabold rounded-lg bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-[0.98]"
													data-testid="btn-open-full-endo-modal"
												>
													<FileText size={14} />
													<span>📋 Интерактивный журнал каналов</span>
												</button>
											</div>

											{/* 1. Выбор анатомического корневого канала */}
											<div className="space-y-1.5">
												<label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] block">
													1. Анатомический корневой канал:
												</label>
												<div className="flex flex-wrap gap-1.5">
													{[
														{ key: "MB1", name: "МБ-1 (MB1)", ref: "Щечный бугор", defWl: 21.5, defMaf: "#25", defTaper: ".06" },
														{ key: "MB2", name: "МБ-2 (MB2)", ref: "Щечный бугор", defWl: 20.0, defMaf: "#20", defTaper: ".04" },
														{ key: "DB", name: "ДБ (DB)", ref: "Дистально-щечный бугор", defWl: 20.5, defMaf: "#25", defTaper: ".06" },
														{ key: "P", name: "Нёбный (P)", ref: "Нёбный бугор", defWl: 22.0, defMaf: "#30", defTaper: ".06" },
														{ key: "D", name: "Дистальный (D)", ref: "Дистальный бугор", defWl: 22.0, defMaf: "#30", defTaper: ".06" },
														{ key: "MB", name: "Медиально-щечный (MB)", ref: "Щечный бугор", defWl: 21.5, defMaf: "#25", defTaper: ".06" },
														{ key: "ML", name: "Медиально-язычный (ML)", ref: "Медиально-язычный бугор", defWl: 21.0, defMaf: "#25", defTaper: ".06" },
													].map((c) => (
														<button
															key={c.key}
															type="button"
															onClick={() => {
																setSelectedEndoCanalKey(c.key);
																setEndoRefPoint(c.ref);
																setEndoWorkingLengthMm(c.defWl);
																setEndoMasterFile(c.defMaf);
																setEndoTaper(c.defTaper);
															}}
															className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border transition-all cursor-pointer touch-manipulation min-h-[32px] h-8 ${
																selectedEndoCanalKey === c.key
																	? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal)] shadow-2xs"
																	: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
															}`}
															data-testid={`btn-endo-canal-${c.key}`}
														>
															{c.name}
														</button>
													))}
												</div>
											</div>

											{/* 2. Рабочая длина по апекслокатору (WL) и мастер-файл (MAF) */}
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
												{/* Рабочая длина */}
												<div className="space-y-1.5">
													<label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] flex items-center justify-between">
														<span>2. Длина по апекслокатору (WL):</span>
														<strong className="text-[var(--teal,var(--brand-primary))] font-mono text-xs">{endoWorkingLengthMm} мм (Apex 0.0)</strong>
													</label>
													<div className="flex items-center gap-2">
														<input
															type="range"
															min={15}
															max={28}
															step={0.5}
															value={endoWorkingLengthMm}
															onChange={(e) => setEndoWorkingLengthMm(parseFloat(e.target.value) || 21.5)}
															className="w-full accent-[var(--teal,var(--brand-primary))] cursor-pointer"
															data-testid="input-endo-wl-slider"
														/>
														<input
															type="number"
															min={15}
															max={28}
															step={0.5}
															value={endoWorkingLengthMm}
															onChange={(e) => setEndoWorkingLengthMm(parseFloat(e.target.value) || 21.5)}
															className="w-16 min-h-[32px] h-8 px-2 py-1 text-xs font-bold text-center rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
															data-testid="input-endo-wl-num"
														/>
													</div>
													<div className="flex flex-wrap gap-1">
														{[19.0, 20.0, 21.0, 21.5, 22.0, 23.0, 24.0].map((len) => (
															<button
																key={len}
																type="button"
																onClick={() => setEndoWorkingLengthMm(len)}
																className={`px-2 py-0.5 rounded text-[11px] font-semibold border cursor-pointer ${
																	endoWorkingLengthMm === len
																		? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal,var(--brand-primary))]"
																		: "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
																}`}
															>
																{len}
															</button>
														))}
													</div>
												</div>

												{/* Мастер-апикальный файл и конусность */}
												<div className="space-y-1.5">
													<label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] block">
														3. Мастер-файл (MAF) и конусность:
													</label>
													<div className="flex flex-wrap gap-1.5">
														{[
															{ maf: "#20", taper: ".04" },
															{ maf: "#25", taper: ".04" },
															{ maf: "#25", taper: ".06" },
															{ maf: "#30", taper: ".04" },
															{ maf: "#30", taper: ".06" },
															{ maf: "#35", taper: ".06" },
															{ maf: "#40", taper: ".06" },
														].map((opt) => {
															const isSel = endoMasterFile === opt.maf && endoTaper === opt.taper;
															return (
																<button
																	key={`${opt.maf}-${opt.taper}`}
																	type="button"
																	onClick={() => {
																		setEndoMasterFile(opt.maf);
																		setEndoTaper(opt.taper);
																	}}
																	className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer touch-manipulation min-h-[32px] h-8 ${
																		isSel
																			? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal)] shadow-2xs"
																			: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
																	}`}
																	data-testid={`btn-maf-${opt.maf.replace('#','')}-${opt.taper.replace('.','')}`}
																>
																	{opt.maf}/{opt.taper}
																</button>
															);
														})}
													</div>
												</div>
											</div>

											{/* 4. Силеры и метод обтурации */}
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
												{/* Силер */}
												<div className="space-y-1.5">
													<label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] block">
														4. Эндодонтический силер:
													</label>
													<div className="flex flex-wrap gap-1.5">
														{[
															{ key: "AH Plus", label: "AH Plus (эпоксидный)" },
															{ key: "BioRoot RCS", label: "BioRoot RCS (биокерамика)" },
															{ key: "TotalFill BC", label: "TotalFill BC Sealer" },
															{ key: "Каласепт", label: "Каласепт (Ca(OH)2)" },
														].map((s) => (
															<button
																key={s.key}
																type="button"
																onClick={() => setEndoSealer(s.key)}
																className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer touch-manipulation min-h-[32px] h-8 ${
																	endoSealer === s.key
																		? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal)] shadow-2xs"
																		: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
																}`}
																data-testid={`btn-sealer-${s.key.replace(/\s+/g, '')}`}
															>
																{s.label}
															</button>
														))}
													</div>
												</div>

												{/* Метод обтурации */}
												<div className="space-y-1.5">
													<label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] block">
														5. Метод обтурации:
													</label>
													<div className="flex flex-wrap gap-1.5">
														{[
															{ key: "Латеральная компакция", label: "Латеральная компакция" },
															{ key: "Вертикальная конденсация", label: "Вертикальная конденсация" },
															{ key: "Моноштифт + Биокерамика", label: "Моноштифт (BioRoot)" },
															{ key: "Непрерывная волна", label: "Непрерывная волна" },
														].map((m) => (
															<button
																key={m.key}
																type="button"
																onClick={() => setEndoObturation(m.key)}
																className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer touch-manipulation min-h-[32px] h-8 ${
																	endoObturation === m.key
																		? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal)] shadow-2xs"
																		: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
																}`}
																data-testid={`btn-obturation-${m.key.slice(0, 5)}`}
															>
																{m.label}
															</button>
														))}
													</div>
												</div>
											</div>

											{/* Кнопка 1-клик внесения в протокол */}
											<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex items-center justify-between gap-3 flex-wrap">
												<div className="text-xs text-[var(--muted)]">
													Канал <strong>{selectedEndoCanalKey}</strong> ({endoRefPoint}): WL = <strong>{endoWorkingLengthMm} мм</strong>, MAF = <strong>{endoMasterFile}/{endoTaper}</strong>, Обтурация: <strong>{endoObturation} + {endoSealer}</strong>
												</div>
												<button
													type="button"
													onClick={() => {
														if (!updateVisitNoteField) return;
														const curr = visitNoteForm.treatmentPlan || "";
														const targetTooth = activeSelectedTooth || (typeof visitNoteForm?.diagnosis === "string" ? visitNoteForm.diagnosis.match(/\b([1-4][1-8]|5[1-5]|6[1-5]|7[1-5]|8[1-5])\b/)?.[0] : null) || 16;
														const endoText = formatEndoProtocolQuickSnippet({
															toothNumber: targetTooth,
															canals: [
																{
																	canalName: selectedEndoCanalKey,
																	referencePoint: endoRefPoint,
																	workingLengthMm: endoWorkingLengthMm,
																	masterApicalFile: endoMasterFile,
																	taper: endoTaper,
																	obturationTechnique: endoObturation,
																	sealer: endoSealer,
																},
															],
															sealer: endoSealer,
															obturationTechnique: endoObturation,
														});
														updateVisitNoteField("treatmentPlan", appendClinicalText(curr, endoText, "\n\n"));
														showToast(`Эндо-протокол (Канал ${selectedEndoCanalKey}, ${endoWorkingLengthMm} мм) внесен в карту`, "success", 3000);
													}}
													className="min-h-[38px] px-4 py-1.5 text-xs sm:text-sm font-extrabold rounded-xl bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] shadow-2xs active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 touch-manipulation"
													data-testid="btn-apply-endo-to-plan"
												>
													<span>⚡</span>
													<span>+ Внести эндо-протокол в 043/у</span>
												</button>
											</div>
										</div>
									</details>

									{/* Аккордеон: 1-клик быстрый подбор услуг из прайса клиники */}
									<details className="group rounded-xl border border-indigo-500/25 bg-indigo-500/5 dark:bg-indigo-950/20 overflow-hidden">
										<summary className="flex items-center justify-between p-3 cursor-pointer font-bold text-xs sm:text-sm select-none list-none text-[var(--ink)] hover:bg-indigo-500/10 transition-colors">
											<div className="flex items-center gap-2">
												<Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
												<span>Подбор услуг из прайса клиники (1 клик в протокол и счет)</span>
											</div>
											<ChevronDown size={16} className="text-[var(--muted)] transition-transform duration-200 group-open:rotate-180" />
										</summary>
										<div className="p-3.5 pt-1 flex flex-col gap-2.5 border-t border-indigo-500/20">
											<div className="flex items-center justify-between gap-2 flex-wrap">
												<span className="text-xs text-[var(--muted)]">
													Быстрое добавление услуг прайса в Форму 043/у:
												</span>
												<button
													type="button"
													onClick={() => setIsPriceSearchModalOpen(true)}
													className="min-h-[32px] h-8 px-3.5 py-1 text-xs font-extrabold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-[0.98]"
													data-testid="btn-open-price-search-treatment-plan"
												>
													<Search size={14} />
													<span>+ Каталог прайса</span>
												</button>
											</div>
											<div className="flex flex-wrap gap-1.5">
												{allPriceServices.slice(0, 6).map((srv) => (
													<button
														key={srv.id}
														type="button"
														onClick={() => handleAddServiceToPlan(srv)}
														className="h-8 !min-h-[32px] px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-indigo-500 hover:bg-[var(--paper-strong)] active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs touch-manipulation shrink-0"
														title={`Добавить «${srv.title}» (${srv.basePriceRub.toLocaleString('ru-RU')} ₽) в протокол`}
														data-testid={`fast-price-chip-${srv.id}`}
													>
														<span className="text-indigo-600 dark:text-indigo-400 font-extrabold">+</span>
														<span>{srv.shortLabel}</span>
														<span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--ok-bg)] text-[var(--ok-fg)] font-black">
															{srv.basePriceRub.toLocaleString("ru-RU")} ₽
														</span>
													</button>
												))}
											</div>
										</div>
									</details>
								</div>
							)}
						</div>
					);
				})}
				<CompletedServicesChecklist />
			</div>

			{draft?.quality ? (
				<div className={`visit-draft-quality quality-${draft.quality.level}`}>
					<div>
						<strong>
							{visitDraftQualityLabels?.[draft.quality.level] ||
								draft.quality.level}
						</strong>
						<span>
							{Math.round(draft.quality.confidence * 100)}% ·{" "}
							{specialtyLabels?.[draft.quality.specialty] ||
								draft.quality.specialty}
						</span>
					</div>
					<p>{draft.quality.nextAction}</p>
					<div className="visit-draft-signal-row">
						{/* Было «FDI 36»: в записи приёма понятнее «зуб 36». */}
						{(draft.quality.detectedToothCodes ?? [])
							.slice(0, 6)
							.map((toothCode) => (
								<span key={`tooth-${toothCode}`}>зуб {toothCode}</span>
							))}
						{(draft.quality.signals ?? []).slice(0, 7).map((signal) => (
							<span key={signal}>{visitDraftSignalLabel(signal)}</span>
						))}
						{(draft.quality.missingCriticalFields ?? [])
							.slice(0, 5)
							.map((field) => (
								<small key={field}>
									проверить: {visitDraftMissingFieldLabel(field)}
								</small>
							))}
					</div>
				</div>
			) : null}

			<div className="ai-draft mt-4 p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-3">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)] shrink-0">
						<ShieldCheck aria-hidden="true" size={20} />
					</div>
					<p className="m-0 text-xs sm:text-sm font-medium text-[var(--ink)] leading-relaxed">
						{noteTextOfAnotherVisit
							? "Сохранение заперто: в полях текст другого приёма. Разберите предупреждение выше."
							: draft
								? draftNoteText
								: isVisitNoteDirty
									? "Правки внесены. Нажмите «Сохранить запись приёма» для фиксации в ЭМК."
									: pendingVisitSaveCount
										? pendingSavesText
										: saveReceiptOfThisVisit
											? visitSaveReceiptText(saveReceiptOfThisVisit)
											: dashboard?.activeVisit?.doctorSummary ||
												"Запись приёма пока пустая. Выберите экспресс-шаблон выше или впишите жалобы — кнопка сохранения станет активна."}
					</p>
				</div>

				<div className="flex items-center gap-3 flex-wrap">
					{pendingVisitSaveCount ? (
						<button
							className="secondary-button min-h-[48px] px-5 py-2.5 text-sm font-bold rounded-xl"
							type="button"
							onClick={() => void flushPendingVisitSaves({ silent: false })}
							disabled={isPendingVisitSyncing}
						>
							{isPendingVisitSyncing ? "Отправляю…" : "Отправить сейчас"}
						</button>
					) : null}

					{draft || isVisitNoteDirty ? (
						<button
							className="primary-button min-h-[50px] px-6 py-3 text-sm sm:text-base font-extrabold rounded-xl bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
							type="button"
							onClick={() => {
								if (!visitNoteReadyToAccept) {
									const missingItems: string[] = [];
									if (!visitNoteForm?.diagnosis || visitNoteForm.diagnosis.length < 4) {
										missingItems.push("Не выбран диагноз зуба (укажите МКБ-10, напр. K02.1 / K04.0)");
									}
									if (!visitNoteForm?.treatmentPlan) {
										missingItems.push("Укажите протокол лечения и тип анестетика");
									}
									if (!visitNoteForm?.complaint && !visitNoteForm?.anamnesis) {
										missingItems.push("Заполните жалобы или анамнез пациента");
									}
									const hint = missingItems.length > 0
										? `Осталось заполнить: ${missingItems.join("; ")}. Нажмите на кнопки-подсказки ниже.`
										: "Заполните обязательные поля формы 043/у перед сохранением.";
									showToast(hint, "warning", 6000);
									return;
								}
								acceptDraftToVisit();
							}}
							disabled={
								!visitNoteReadyToAccept ||
								isDraftAccepting ||
								Boolean(noteTextOfAnotherVisit)
							}
							aria-describedby={
								noteTextOfAnotherVisit
									? "visit-note-foreign-text"
									: !visitNoteReadyToAccept
										? "visit-note-missing"
										: undefined
							}
						>
							<Check aria-hidden="true" size={20} className="stroke-[3]" />
							<span>{visitNoteActionLabel}</span>
						</button>
					) : null}
				</div>

				{(draft || isVisitNoteDirty) && !visitNoteReadyToAccept ? (
					<div
						className="visit-note-missing mt-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/60"
						id="visit-note-missing"
						role="status"
						aria-live="polite"
					>
						<div className="flex items-center gap-2 mb-2">
							<span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-xs">!</span>
							<strong className="text-amber-950 dark:text-amber-200 text-xs sm:text-sm font-bold">
								Чтобы сохранить запись приема, осталось заполнить:
							</strong>
						</div>
						<ul className="m-0 pl-5 text-xs sm:text-sm text-amber-900 dark:text-amber-300 space-y-1.5 font-medium">
							{(visitNoteAcceptMissingSteps ?? []).map((step) => (
								<li key={step} className="flex items-center justify-between gap-2 flex-wrap">
									<span>• {step}</span>
								</li>
							))}
						</ul>

						{/* 1-Click Nurse/Doctor Quick Fill Assistants */}
						<div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900/60 flex flex-wrap gap-2">
							<span className="text-xs font-bold text-amber-950 dark:text-amber-200 w-full mb-0.5">
								Быстрые подсказки в 1 клик для медсестры и врача:
							</span>
							{(!visitNoteForm?.diagnosis || visitNoteForm.diagnosis.length < 4) && (
								<>
									<button
										type="button"
										onClick={() => updateVisitNoteField?.("diagnosis", "K02.1 Кариес дентина")}
										className="min-h-[44px] px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 active:scale-95 transition-all cursor-pointer"
									>
										+ K02.1 Кариес
									</button>
									<button
										type="button"
										onClick={() => updateVisitNoteField?.("diagnosis", "K04.0 Пульпит необратимый")}
										className="min-h-[44px] px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 active:scale-95 transition-all cursor-pointer"
									>
										+ K04.0 Пульпит
									</button>
									<button
										type="button"
										onClick={() => updateVisitNoteField?.("diagnosis", "Z01.2 Стоматологическое обследование (здоров)")}
										className="min-h-[44px] px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 active:scale-95 transition-all cursor-pointer"
									>
										+ Z01.2 Осмотр (здоров)
									</button>
								</>
							)}
							{!visitNoteForm?.treatmentPlan && (
								<>
									<button
										type="button"
										onClick={() => updateVisitNoteField?.("treatmentPlan", "Инфильтрационная анестезия (Артикаин 4% 1.7 мл). Препарирование, адгезивный протокол, послойная реставрация светоотверждаемым композитом, шлифовка, полировка.")}
										className="min-h-[44px] px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 active:scale-95 transition-all cursor-pointer"
									>
										+ Анестезия + Пломба
									</button>
									<button
										type="button"
										onClick={() => updateVisitNoteField?.("treatmentPlan", "Инфильтрационная/проводниковая анестезия (Артикаин 4% с эпинефрином 1:100 000, 1.7 мл). Коффердам. Экстирпация пульпы, NiTi обработка каналов, ирригация NaOCl 3%, Calcept, временная пломба.")}
										className="min-h-[44px] px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 active:scale-95 transition-all cursor-pointer"
									>
										+ Анестезия + Эндодонтия
									</button>
								</>
							)}
							{(!visitNoteForm?.complaint && !visitNoteForm?.anamnesis) && (
								<button
									type="button"
									onClick={() => {
										updateVisitNoteField?.("complaint", "Жалоб на момент осмотра не предъявляет (плановый профосмотр).");
										updateVisitNoteField?.("anamnesis", "Хронические соматические заболевания отрицает. Аллергоанамнез не отягощен.");
									}}
									className="min-h-[44px] px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 active:scale-95 transition-all cursor-pointer"
								>
									+ Жалоб нет (Профосмотр)
								</button>
							)}
						</div>
					</div>
				) : null}
			</div>

			{/* ── ЕГИСЗ CDA R2 и Инструменты Стерилизации ── */}
			<div
				className="visit-compliance-panel mt-6 p-4.5 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)]"
				data-testid="visit-compliance-panel"
			>
				<div className="flex items-center justify-between gap-4 flex-wrap mb-4">
					<div>
						<h4 className="m-0 text-sm font-extrabold text-[var(--ink)] flex items-center gap-2">
							<FileCode className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
							Минздрав РФ & ЕГИСЗ РЭМД (CDA R2) & Рецепты 107-1/у
						</h4>
						<p className="m-0 text-xs text-[var(--muted)]">
							Официальный экспорт медицинского документа CDA R2 XML и выписка рецептурных бланков
						</p>
					</div>
					<div className="flex items-center gap-2 flex-wrap">
						<button
							className="secondary-button flex items-center gap-2 text-xs sm:text-sm font-bold py-2.5 px-4 min-h-[48px] rounded-xl touch-manipulation cursor-pointer text-[var(--teal,var(--brand-primary))] border-[var(--teal,var(--line))]/30 hover:bg-[var(--teal-soft,var(--paper-soft))]"
							type="button"
							onClick={() => setIsSoapTemplatesModalOpen(true)}
							data-testid="btn-open-soap-templates-modal"
							title="Шаблоны протоколов Формы 043/у по МКБ-10 с услугами 804н и списанием со склада"
						>
							<Sparkles className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
							Шаблоны 043/у (МКБ-10 + 804н + Склад)
						</button>
						<button
							className="secondary-button flex items-center gap-2 text-xs sm:text-sm font-bold py-2.5 px-4 min-h-[48px] rounded-xl touch-manipulation cursor-pointer"
							type="button"
							onClick={() => window.print()}
							data-testid="btn-print-visit-note-043"
							title="Печать медицинской карты стоматологического пациента (Форма 043/у) на чистом листе А4"
						>
							<Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
							Печать 043/у
						</button>
						<button
							className="secondary-button flex items-center gap-2 text-xs sm:text-sm font-bold py-2.5 px-4 min-h-[48px] rounded-xl touch-manipulation cursor-pointer text-[var(--ok-fg)] border-[var(--ok-fg)]/30 hover:bg-[var(--ok-bg)]"
							type="button"
							onClick={() => setIsInformedConsentModalOpen(true)}
							data-testid="btn-print-informed-consent-1051n"
							title="Официальный бланк информированного добровольного согласия (ИДС) по Приказу Минздрава РФ № 1051н"
						>
							<ShieldCheck className="w-4 h-4 text-[var(--ok-fg)]" />
							Печать ИДС (Приказ № 1051н)
						</button>
						<button
							className="secondary-button flex items-center gap-2 text-xs sm:text-sm font-bold py-2.5 px-4 min-h-[48px] rounded-xl touch-manipulation cursor-pointer"
							type="button"
							onClick={() => setIsPrescriptionModalOpen(true)}
							data-testid="btn-open-prescription-modal"
						>
							<Pill className="w-4 h-4 text-rose-500" />
							Рецепт (Форма 107-1/у)
						</button>
						<button
							className="secondary-button flex items-center gap-2 text-xs sm:text-sm font-bold py-2.5 px-4 min-h-[48px] rounded-xl touch-manipulation cursor-pointer text-[var(--teal,var(--brand-primary))] border-[var(--teal,var(--line))]/30 hover:bg-[var(--teal-soft,var(--paper-soft))]"
							type="button"
							onClick={() => {
								setSelectedMemoIdForPrint("surgery_extraction");
								setIsPatientMemoModalOpen(true);
							}}
							data-testid="btn-open-patient-memo-modal"
							title="Послеоперационные памятки пациенту (Удаление, Анестезия, Эндодонтия) с 1-клик печатью А4/А5"
						>
							<FileText className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
							Памятка пациенту (А4/А5)
						</button>
						<button
							className="secondary-button flex items-center gap-2 text-xs sm:text-sm font-bold py-2.5 px-4 min-h-[48px] rounded-xl touch-manipulation cursor-pointer text-[var(--teal,var(--brand-primary))] border-[var(--teal,var(--line))]/30 hover:bg-[var(--teal-soft,var(--paper-soft))]"
							type="button"
							onClick={() => setIsBillingActModalOpen(true)}
							data-testid="btn-open-billing-act-modal"
							title="Акт выполненных работ и гарантийный талон (А4) по Приказу Минздрава № 804н и Закону РФ № 2300-1"
						>
							<FileCheck className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
							Акт и гарантийный талон (А4)
						</button>
						<button
							className="primary-button flex items-center gap-2 text-xs sm:text-sm font-bold py-2.5 px-4 min-h-[48px] bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] rounded-xl shadow-xs touch-manipulation cursor-pointer"
							type="button"
							onClick={() => setIsEgiszModalOpen(true)}
							data-testid="btn-open-egisz-cda-modal"
						>
							<ShieldCheck className="w-4 h-4" />
							СЭМД ЕГИСЗ (Валидатор & Экспорт)
						</button>
						<button
							className="secondary-button flex items-center gap-2 text-xs sm:text-sm font-bold py-2.5 px-4 min-h-[48px] rounded-xl touch-manipulation cursor-pointer"
							type="button"
							onClick={handleDownloadCdaXml}
							disabled={isExportingCda}
							data-testid="btn-download-cda-xml"
						>
							<Download className="w-4 h-4" />
							{isExportingCda ? "Формирование XML…" : "Скачать CDA R2 (XML)"}
						</button>
					</div>
				</div>

				{/* 1-клик быстрые кнопки печати послеоперационных памяток */}
				<div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-[var(--line)]/70 mb-2">
					<span className="text-xs font-extrabold text-[var(--muted)] flex items-center gap-1">
						<Printer className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
						1-клик печать памятки пациенту:
					</span>
					<button
						type="button"
						onClick={() => {
							setSelectedMemoIdForPrint("surgery_extraction");
							setIsPatientMemoModalOpen(true);
						}}
						className="min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal,var(--brand-primary))] hover:bg-[var(--paper-strong)] text-[var(--ink)] cursor-pointer inline-flex items-center gap-1.5 touch-manipulation shadow-2xs"
						data-testid="btn-quick-memo-surgery"
					>
						<FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
						<span>Памятка: Удаление / Хирургия</span>
					</button>
					<button
						type="button"
						onClick={() => {
							setSelectedMemoIdForPrint("anesthesia_caries");
							setIsPatientMemoModalOpen(true);
						}}
						className="min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal,var(--brand-primary))] hover:bg-[var(--paper-strong)] text-[var(--ink)] cursor-pointer inline-flex items-center gap-1.5 touch-manipulation shadow-2xs"
						data-testid="btn-quick-memo-caries"
					>
						<ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
						<span>Памятка: Анестезия / Кариес</span>
					</button>
					<button
						type="button"
						onClick={() => {
							setSelectedMemoIdForPrint("endodontics");
							setIsPatientMemoModalOpen(true);
						}}
						className="min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal,var(--brand-primary))] hover:bg-[var(--paper-strong)] text-[var(--ink)] cursor-pointer inline-flex items-center gap-1.5 touch-manipulation shadow-2xs"
						data-testid="btn-quick-memo-endo"
					>
						<Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
						<span>Памятка: Эндодонтия / Каналы</span>
					</button>
				</div>

				{/* 1-клик быстрые кнопки выписки рецептов (Форма № 107-1/у) */}
				<div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-[var(--line)]/70 mb-2">
					<span className="text-xs font-extrabold text-[var(--muted)] flex items-center gap-1">
						<Pill className="w-3.5 h-3.5 text-rose-500" />
						1-клик выписка рецепта (Форма 107-1/у):
					</span>
					<button
						type="button"
						onClick={() => {
							setSelectedPrescriptionDrugIds(["amoxiclav_875_125", "nimesulide_100"]);
							setIsPrescriptionModalOpen(true);
						}}
						className="min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:border-rose-500 hover:bg-[var(--paper-strong)] text-[var(--ink)] cursor-pointer inline-flex items-center gap-1.5 touch-manipulation shadow-2xs"
						data-testid="btn-quick-rx-amoxi-nimesil"
					>
						<Pill className="w-3.5 h-3.5 text-rose-500 shrink-0" />
						<span>Амоксиклав 1000 мг + Нимесил</span>
					</button>
					<button
						type="button"
						onClick={() => {
							setSelectedPrescriptionDrugIds(["nimesulide_100"]);
							setIsPrescriptionModalOpen(true);
						}}
						className="min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:border-rose-500 hover:bg-[var(--paper-strong)] text-[var(--ink)] cursor-pointer inline-flex items-center gap-1.5 touch-manipulation shadow-2xs"
						data-testid="btn-quick-rx-nimesil"
					>
						<Pill className="w-3.5 h-3.5 text-rose-500 shrink-0" />
						<span>Нимесил 100 мг (НПВП)</span>
					</button>
					<button
						type="button"
						onClick={() => {
							setSelectedPrescriptionDrugIds(["chlorhexidine_005"]);
							setIsPrescriptionModalOpen(true);
						}}
						className="min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:border-rose-500 hover:bg-[var(--paper-strong)] text-[var(--ink)] cursor-pointer inline-flex items-center gap-1.5 touch-manipulation shadow-2xs"
						data-testid="btn-quick-rx-chlorhexidine"
					>
						<Sparkles className="w-3.5 h-3.5 text-teal-500 shrink-0" />
						<span>Хлоргексидин 0.05%</span>
					</button>
				</div>

				{/* Модальное окно послеоперационных памяток пациенту */}
				<PatientMemoPrintModal
					isOpen={isPatientMemoModalOpen}
					onClose={() => setIsPatientMemoModalOpen(false)}
					initialMemoId={selectedMemoIdForPrint}
					patient={activePatient}
					doctorName={appLogic?.activeDoctor?.fullName || appLogic?.auth?.currentUser?.name || "Врач-стоматолог"}
					doctorSpecialty={appLogic?.activeDoctor?.specialties?.[0] || "Стоматолог-терапевт"}
					clinicName={dashboard?.clinicSettings?.profile?.brandName || "Стоматологическая клиника «DENTE»"}
					toothNumber={typeof visitNoteForm?.diagnosis === "string" ? visitNoteForm.diagnosis.match(/\b\d{2}\b/)?.[0] : undefined}
					onApplyToSoap={(memoText) => {
						if (!updateVisitNoteField) return;
						const curr = visitNoteForm.treatmentPlan || "";
						updateVisitNoteField("treatmentPlan", appendClinicalText(curr, memoText, "\n\n"));
					}}
				/>

				{/* Модальное окно расширенного протокола анестезии СтАР */}
				<AnesthesiaProtocolModal
					isOpen={isAnesthesiaProtocolModalOpen}
					onClose={() => setIsAnesthesiaProtocolModalOpen(false)}
					initialToothNumber={typeof visitNoteForm?.diagnosis === "string" ? visitNoteForm.diagnosis.match(/\b\d{2}\b/)?.[0] || 46 : 46}
					initialPatientWeightKg={patientWeightKg}
					initialHasCardioRisk={anesthesiaRisk.hasHypertensionRisk}
					onApplyToDiary={(diaryText) => {
						if (!updateVisitNoteField) return;
						const curr = visitNoteForm.treatmentPlan || "";
						updateVisitNoteField("treatmentPlan", appendClinicalText(curr, diaryText, "\n\n"));
						showToast("Протокол анестезии СтАР внесён в карту 043/у", "success", 3500);
					}}
				/>

				{/* Модальное окно журнала аспирационных проб */}
				<AnesthesiaAspirationJournalModal
					isOpen={isAnesthesiaAspirationModalOpen}
					onClose={() => setIsAnesthesiaAspirationModalOpen(false)}
					initialPatientFullName={activePatient?.fullName || "Пациент"}
					initialMedCardNumber={`043/у-${activePatient?.id?.slice(0, 8) || "2026"}`}
					initialPatientAgeYears={35}
					initialPatientWeightKg={patientWeightKg}
					initialToothNumber={typeof visitNoteForm?.diagnosis === "string" ? visitNoteForm.diagnosis.match(/\b\d{2}\b/)?.[0] || 46 : 46}
					onApplyToDiary={(diaryText) => {
						if (!updateVisitNoteField) return;
						const curr = visitNoteForm.treatmentPlan || "";
						updateVisitNoteField("treatmentPlan", appendClinicalText(curr, diaryText, "\n\n"));
						showToast("Протокол аспирационной пробы внесён в карту 043/у", "success", 3500);
					}}
				/>

				{/* Модальное окно эндодонтического протокола корневых каналов */}
				<EndoCanalLogModal
					isOpen={isEndoModalOpen}
					onClose={() => setIsEndoModalOpen(false)}
					toothNumber={Number(typeof visitNoteForm?.diagnosis === "string" ? visitNoteForm.diagnosis.match(/\b\d{2}\b/)?.[0] || 46 : 46)}
					onInsertToProtocol={(protocolText) => {
						if (!updateVisitNoteField) return;
						const curr = visitNoteForm.treatmentPlan || "";
						updateVisitNoteField("treatmentPlan", appendClinicalText(curr, protocolText, "\n\n"));
						showToast("Эндодонтический протокол внесен в карту 043/у", "success", 3500);
					}}
				/>

				{/* Модальное окно рецептурного бланка 107-1/у */}
				<PrescriptionModal
					isOpen={isPrescriptionModalOpen}
					onClose={() => setIsPrescriptionModalOpen(false)}
					patient={activePatient}
					initialSelectedDrugIds={selectedPrescriptionDrugIds}
					medicalLicenseNumber="ЛО41-01137-77/00368421"
					diary={{
						anamnesis: visitNoteForm?.anamnesis || "",
						statusLocalis: visitNoteForm?.objectiveStatus || "",
						diagnosisIcd10:
							(typeof visitNoteForm?.diagnosis === "string"
								? visitNoteForm.diagnosis.match(/[A-Z]\d{2}(?:\.\d+)?/i)?.[0]
								: undefined) || "K02.1",
						diagnosisTooth: "",
						treatmentDescription: visitNoteForm?.treatmentPlan || "",
						complications: "",
						comorbidities: "",
					}}
					doctorName={appLogic?.auth?.currentUser?.name || "Лечащий врач стоматолог"}
					doctorSpecialty="Стоматолог-терапевт"
					clinicName={dashboard?.clinicSettings?.profile?.brandName || "Клиника ДЕНТЕ"}
				/>

				{/* Модальное окно Акта выполненных работ и гарантийного талона (А4) */}
				<PatientBillingModal
					isOpen={isBillingActModalOpen}
					onClose={() => setIsBillingActModalOpen(false)}
					patient={activePatient}
					doctor={{
						fullName: appLogic?.activeDoctor?.fullName || appLogic?.auth?.currentUser?.name || "Лечащий врач стоматолог",
						specialty: appLogic?.activeDoctor?.specialties?.[0] || "Стоматолог-терапевт",
					}}
					clinicLegalName={dashboard?.clinicSettings?.profile?.brandName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
					clinicLicenseNumber="ЛО41-01137-77/00368421"
				/>

				{/* Модальное окно Информированного добровольного согласия (Приказ № 1051н) */}
				<InformedConsentModal
					isOpen={isInformedConsentModalOpen}
					onClose={() => setIsInformedConsentModalOpen(false)}
					initialTemplateKey="CONSENT_THERAPY"
					patient={activePatient}
					doctorName={appLogic?.activeDoctor?.fullName || appLogic?.auth?.currentUser?.name || "Врач-стоматолог"}
					doctorSpecialty={appLogic?.activeDoctor?.specialties?.[0] || "Стоматолог-терапевт"}
					clinicName={dashboard?.clinicSettings?.profile?.brandName || "Стоматологическая клиника «DENTE»"}
					clinicLegalName="ООО «ДЕНТЕ МЕДИКАЛ ГРУПП»"
					licenseNumber="№ ЛО41-01137-77/00368421 от 14.02.2023 г. выдана Департаментом здравоохранения города Москвы"
					diagnosisIcd={typeof visitNoteForm?.diagnosis === "string" ? visitNoteForm.diagnosis : undefined}
					toothNumbers=""
				/>

				{/* Модальное окно валидатора и экспорта СЭМД ЕГИСЗ */}
				<EgiszCdaExportModal
					isOpen={isEgiszModalOpen}
					onClose={() => setIsEgiszModalOpen(false)}
					visitId={realVisitFieldId(dashboard?.activeVisit?.id) || "00000000-0000-0000-0000-000000000000"}
					patientId={activePatient?.id || ""}
					patientName={activePatient?.fullName}
					patientSnils={activePatient?.administrativeProfile?.snils}
					patientBirthDate={activePatient?.birthDate}
					patientGender={activePatient?.administrativeProfile?.gender || (activePatient?.gender as any)}
					patientPolisOms={activePatient?.administrativeProfile?.omsPolis}
					doctorName={appLogic?.activeDoctor?.fullName || appLogic?.auth?.currentUser?.name || "Врач-стоматолог"}
					doctorSnils={appLogic?.activeDoctor?.snils || appLogic?.activeDoctor?.uiPreferences?.snils || appLogic?.auth?.currentUser?.snils}
					doctorPosition={appLogic?.activeDoctor?.specialties?.[0] || "Врач-стоматолог"}
					diagnosisText={noteForm?.diagnosis || dashboard?.activeVisit?.diagnosis}
					icd10Code={noteForm?.diagnosis?.match(/[A-Z]\d{2}(\.\d{1,4})?/i)?.[0] || dashboard?.activeVisit?.diagnosis?.match(/[A-Z]\d{2}(\.\d{1,4})?/i)?.[0]}
					anamnesis={noteForm?.anamnesis || noteForm?.complaint}
					objectiveStatus={noteForm?.objectiveStatus}
					treatmentDescription={noteForm?.treatmentPlan}
					{...(linkedBarcode || trayBarcode ? { instrumentTrayBarcode: linkedBarcode || trayBarcode } : {})}
				/>

				<div className="mb-4">
					<EgiszMultipleDiagnosesWidget />
				</div>

				<hr className="my-4 border-t border-[var(--line)]" />

				<form
					onSubmit={handleLinkSterilizationTray}
					className="flex flex-col gap-2.5"
				>
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<label
							htmlFor="visit-tray-barcode-input"
							className="text-xs sm:text-sm font-bold text-[var(--ink)] flex items-center gap-1.5"
						>
							<ScanLine className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
							Привязка простерилизованного лотка (СанПиН)
						</label>
						{linkedBarcode ? (
							<span className="text-xs font-bold text-[var(--ok-fg)] bg-[var(--ok-bg)] px-2.5 py-1 rounded-lg border border-[var(--ok-fg)]/30 flex items-center gap-1">
								<span>✓</span>
								<span>Лоток {linkedBarcode} привязан</span>
							</span>
						) : null}
					</div>

					<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
						<input
							id="visit-tray-barcode-input"
							type="text"
							className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 min-h-[48px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] font-mono"
							placeholder="Отсканируйте или введите штрихкод лотка (напр. TRAY-2026-001)"
							value={trayBarcode}
							onChange={(e) => setTrayBarcode(e.target.value)}
							disabled={isLinkingTray}
							data-testid="input-tray-barcode"
						/>
						<button
							className="secondary-button text-xs sm:text-sm font-bold py-2.5 px-4 min-h-[48px] rounded-xl inline-flex items-center justify-center touch-manipulation shrink-0 cursor-pointer"
							type="submit"
							disabled={isLinkingTray || !trayBarcode.trim()}
							data-testid="btn-link-tray-barcode"
						>
							{isLinkingTray ? "Проверка…" : "Привязать лоток"}
						</button>
					</div>
				</form>
			</div>

			{/* Confirmation Modal when switching patient with unsaved Form 043/u changes */}
			{isConfirmSwitchModalOpen && (
				<div
					className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
					role="dialog"
					aria-modal="true"
					aria-labelledby="confirm-switch-modal-title"
				>
					<div className="bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
						<div className="flex items-start gap-3">
							<div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25">
								<AlertTriangle size={22} />
							</div>
							<div className="space-y-1">
								<h3 id="confirm-switch-modal-title" className="text-base font-extrabold text-[var(--ink)] m-0">
									Несохраненные клинические данные в форме 043/у
								</h3>
								<p className="text-xs text-[var(--muted)] m-0 leading-relaxed">
									В полях дневника остался незаписанный текст предыдущего приёма. При переключении на текущего пациента несохраненные данные будут сброшены.
								</p>
							</div>
						</div>

						<div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 font-medium">
							💡 Рекомендуется скопировать текст в буфер обмена перед подтверждением, чтобы не потерять внесенные записи.
						</div>

						<div className="flex flex-col gap-2.5 pt-3 border-t border-[var(--line)]">
							<button
								type="button"
								onClick={copyAllVisitNoteText}
								className="w-full px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--ink)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
							>
								<Copy size={16} />
								<span>Скопировать текст в буфер обмена</span>
							</button>

							<div className="flex flex-col sm:flex-row items-stretch gap-2.5 w-full">
								<button
									type="button"
									onClick={() => setIsConfirmSwitchModalOpen(false)}
									className="flex-1 min-h-[52px] px-6 py-3 rounded-2xl text-base font-black bg-[var(--ok-fg)] hover:opacity-90 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99]"
									data-testid="btn-cancel-discard"
								>
									<X size={20} />
									<span>❌ Отмена (Оставить всё как есть)</span>
								</button>
								<button
									type="button"
									onClick={() => {
										showRecordOfOpenVisit();
										setIsConfirmSwitchModalOpen(false);
										showToast("Запись открытого приёма загружена", "info", 4000);
									}}
									className="flex-1 min-h-[52px] px-6 py-3 rounded-2xl text-base font-black bg-rose-600 hover:bg-rose-500 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99]"
									data-testid="btn-confirm-discard-and-switch"
								>
									<Trash2 size={20} />
									<span>🗑️ Да, удалить данные</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
			{/* Quick Service Price Search Modal */}
			{isPriceSearchModalOpen && (
				<div
					className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
					role="dialog"
					aria-modal="true"
					aria-labelledby="price-search-modal-title"
				>
					<div className="bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
						{/* Modal Header */}
						<div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/25">
									<PlusCircle size={22} />
								</div>
								<div>
									<h3 id="price-search-modal-title" className="text-base font-extrabold text-[var(--ink)] m-0">
										Добавить услугу из прайса в протокол и счет
									</h3>
									<p className="text-xs text-[var(--muted)] m-0 leading-relaxed">
										Быстрый поиск по названию или коду процедуры с автоматической подстановкой стоимости
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setIsPriceSearchModalOpen(false)}
								className="w-10 h-10 rounded-xl hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors flex items-center justify-center cursor-pointer"
								aria-label="Закрыть окно поиска прайса"
							>
								<X size={20} />
							</button>
						</div>

						{/* Search Input Bar */}
						<div className="relative">
							<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)] pointer-events-none" />
							<input
								type="text"
								value={priceSearchQuery}
								onChange={(e) => setPriceSearchQuery(e.target.value)}
								placeholder="Поиск по прайсу: кариес, анестезия, снимок, коронка, удаление..."
								className="w-full pl-11 pr-10 py-3 min-h-[48px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--muted)] text-sm sm:text-base font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
								autoFocus
								data-testid="input-price-search"
							/>
							{priceSearchQuery && (
								<button
									type="button"
									onClick={() => setPriceSearchQuery("")}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--ink)] px-2 py-1 rounded-md cursor-pointer"
								>
									Очистить
								</button>
							)}
						</div>

						{/* Category Filter Chips */}
						<div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-nowrap scrollbar-thin">
							{[
								{ id: "all", label: "Все услуги" },
								{ id: "therapy", label: "Терапия / Кариес" },
								{ id: "anesthesia", label: "Анестезия" },
								{ id: "diagnostics", label: "Рентген / Снимки" },
								{ id: "orthopedics", label: "Ортопедия" },
								{ id: "surgery", label: "Хирургия" },
								{ id: "hygiene", label: "Гигиена" },
							].map((cat) => (
								<button
									key={cat.id}
									type="button"
									onClick={() => setSelectedPriceCategory(cat.id)}
									className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
										selectedPriceCategory === cat.id
											? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
											: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
									}`}
								>
									{cat.label}
								</button>
							))}
						</div>

						{/* Filtered Services List */}
						<div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[360px] pr-1">
							{filteredPriceServices.length === 0 ? (
								<div className="text-center py-8 text-xs sm:text-sm text-[var(--muted)]">
									Услуг по запросу «{priceSearchQuery}» не найдено
								</div>
							) : (
								filteredPriceServices.map((srv) => (
									<div
										key={srv.id}
										className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:border-indigo-500/50 transition-all flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
									>
										<div className="space-y-1 min-w-0 flex-1">
											<div className="text-sm sm:text-base font-bold text-[var(--ink)] leading-snug">
												{srv.title}
											</div>
											<div className="flex items-center gap-2 text-xs text-[var(--muted)]">
												<span className="px-2 py-0.5 rounded-md bg-[var(--paper)] border border-[var(--line)] font-semibold">
													{srv.category}
												</span>
											</div>
										</div>

										<div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
											<span className="text-sm sm:text-base font-mono font-black text-[var(--ok-fg)]">
												{srv.basePriceRub.toLocaleString("ru-RU")} ₽
											</span>
											<button
												type="button"
												onClick={() => {
													handleAddServiceToPlan(srv);
													setIsPriceSearchModalOpen(false);
												}}
												className="min-h-[48px] px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 touch-manipulation"
												data-testid={`btn-select-price-service-${srv.id}`}
											>
												<PlusCircle size={16} />
												<span>Добавить</span>
											</button>
										</div>
									</div>
								))
							)}
						</div>

						{/* Modal Footer */}
						<div className="pt-3 border-t border-[var(--line)] flex justify-end">
							<button
								type="button"
								onClick={() => setIsPriceSearchModalOpen(false)}
								className="min-h-[48px] px-6 py-2.5 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--ink)] transition-colors cursor-pointer"
							>
								Закрыть
							</button>
						</div>
					</div>
				</div>
			)}

			{/* SBP QR-Code Fast In-Office Payment Modal */}
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
								<span>⚡</span>
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

						<div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-inner w-56 h-56 mx-auto">
							<svg viewBox="0 0 100 100" className="w-48 h-48">
								<rect width="100" height="100" fill="white" />
								{/* Corner Markers */}
								<rect x="5" y="5" width="25" height="25" fill="#0f172a" />
								<rect x="8" y="8" width="19" height="19" fill="white" />
								<rect x="11" y="11" width="13" height="13" fill="#0f172a" />
								<rect x="70" y="5" width="25" height="25" fill="#0f172a" />
								<rect x="73" y="8" width="19" height="19" fill="white" />
								<rect x="76" y="11" width="13" height="13" fill="#0f172a" />
								<rect x="5" y="70" width="25" height="25" fill="#0f172a" />
								<rect x="8" y="73" width="19" height="19" fill="white" />
								<rect x="11" y="76" width="13" height="13" fill="#0f172a" />
								{/* Central SBP icon badge */}
								<circle cx="50" cy="50" r="14" fill="#059669" />
								<text x="50" y="54" fontSize="9" fontWeight="900" fill="white" textAnchor="middle">СБП</text>
							</svg>
						</div>

						<div className="space-y-1">
							<div className="text-xs text-[var(--muted)]">Сумма к оплате:</div>
							<div className="text-2xl font-black text-[var(--ok-fg)] font-mono">
								{completionResult.totalNetRub.toLocaleString("ru-RU")} ₽
							</div>
							<div className="text-[11px] text-[var(--muted)]">
								{completionResult.receiptNumber} • {completionResult.patientName}
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
								<span>✓</span>
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

			{/* Форма 043/у Каталог Клинических Протоколов со списанием и услугами 804н */}
			<VisitSoapTemplatesModal
				isOpen={isSoapTemplatesModalOpen}
				onClose={() => setIsSoapTemplatesModalOpen(false)}
				onApplyPreset={handleApplyClinicalSoapPreset}
				activeTooth={activeSelectedTooth}
				isLocked={Boolean(dashboard?.activeVisit?.status === "signed")}
			/>

			{/* ── ПЕЧАТНАЯ ВЕРСИЯ КАРТЫ 043/У И ДНЕВНИКА ПРИЁМА ДЛЯ А4 ── */}
			<div id="visit-emk-print-a4" className="hidden print:block font-sans text-slate-900 bg-white p-6">
				{/* Шапка клиники */}
				<div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-start justify-between gap-4">
					<div>
						<div className="text-base font-black text-slate-900 uppercase tracking-tight">
							Стоматологическая клиника «DENTE»
						</div>
						<div className="text-xs font-semibold text-slate-700">
							ООО «ДЕНТЕ МЕДИКАЛ ГРУПП» • Лицензия № ЛО41-01137-77/00368421 от 14.02.2023 г.
						</div>
						<div className="text-[11px] text-slate-500">
							119048, г. Москва, ул. Стоматологическая, д. 24, корп. 1 • Тел: +7 (495) 777-88-99 • dente-clinic.ru
						</div>
						<h1 className="text-lg font-black tracking-tight text-slate-950 uppercase mt-2">
							МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (Форма № 043/у)
						</h1>
						<p className="text-xs font-semibold text-slate-600">
							Дневник приёма и протокол лечения • Утверждена Приказом Минздрава России от 15.12.2014 № 834н
						</p>
					</div>
					<div className="text-right text-xs shrink-0">
						<div className="font-bold text-slate-900">
							№ Карты: {activePatient?.cardNumber || activePatient?.medicalCardNumber || activePatient?.id?.slice(0, 8) || "СТ-2026-0843"}
						</div>
						<div className="text-slate-600">
							Дата приёма: {dashboard?.activeVisit?.date || new Date().toLocaleDateString("ru-RU")}
						</div>
						<div className="text-slate-600">
							Время: {dashboard?.activeVisit?.time || new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
						</div>
					</div>
				</div>

				{/* Таблица паспортных данных */}
				<table className="w-full border-collapse text-left text-xs border border-slate-300 mb-4" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
					<tbody>
						<tr className="border-b border-slate-300">
							<td className="py-1.5 px-2 font-bold bg-slate-100 border-r border-slate-300 w-1/4">Пациент (ФИО):</td>
							<td className="py-1.5 px-2 font-bold text-slate-950 border-r border-slate-300 w-1/4">{activePatient?.fullName || "—"}</td>
							<td className="py-1.5 px-2 font-bold bg-slate-100 border-r border-slate-300 w-1/4">Дата рождения / Возраст:</td>
							<td className="py-1.5 px-2 border-slate-300 w-1/4">
								{activePatient?.birthDate || "—"}{" "}
								{activePatient?.gender ? `(${activePatient.gender === "female" ? "Жен." : "Муж."})` : ""}
							</td>
						</tr>
						<tr className="border-b border-slate-300">
							<td className="py-1.5 px-2 font-bold bg-slate-100 border-r border-slate-300">СНИЛС:</td>
							<td className="py-1.5 px-2 border-r border-slate-300">{activePatient?.administrativeProfile?.snils || activePatient?.snils || "—"}</td>
							<td className="py-1.5 px-2 font-bold bg-slate-100 border-r border-slate-300">Полис ОМС / ДМС:</td>
							<td className="py-1.5 px-2 border-slate-300">{activePatient?.administrativeProfile?.omsPolis || activePatient?.omsPolis || "—"}</td>
						</tr>
						<tr className="border-b border-slate-300">
							<td className="py-1.5 px-2 font-bold bg-slate-100 border-r border-slate-300">Контактный телефон:</td>
							<td className="py-1.5 px-2 border-r border-slate-300">{activePatient?.phone || "—"}</td>
							<td className="py-1.5 px-2 font-bold bg-slate-100 border-r border-slate-300">Лечащий врач:</td>
							<td className="py-1.5 px-2 font-bold text-slate-900 border-slate-300">
								{appLogic?.activeDoctor?.fullName || appLogic?.auth?.currentUser?.name || "Врач-стоматолог"}
							</td>
						</tr>
					</tbody>
				</table>

				{/* Структурированная таблица протокола SOAP */}
				<div className="space-y-3" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
					{/* S - Subjective */}
					<div className="border border-slate-300 rounded-md overflow-hidden" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
						<div className="bg-slate-100 px-3 py-1.5 font-bold text-xs uppercase tracking-wide border-b border-slate-300 text-blue-900 flex items-center gap-1.5">
							<span>S · Жалобы и анамнез заболевания (Subjective)</span>
						</div>
						<div className="p-2.5 text-xs text-slate-900 space-y-1.5">
							<div>
								<strong>Жалобы:</strong> {visitNoteForm?.complaint || "Жалоб на момент осмотра активно не предъявляет (плановый осмотр)."}
							</div>
							{visitNoteForm?.anamnesis && (
								<div>
									<strong>Анамнез заболевания и жизни (Anamnesis morbi & vitae):</strong> {visitNoteForm.anamnesis}
								</div>
							)}
						</div>
					</div>

					{/* O - Objective */}
					<div className="border border-slate-300 rounded-md overflow-hidden" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
						<div className="bg-slate-100 px-3 py-1.5 font-bold text-xs uppercase tracking-wide border-b border-slate-300 text-purple-900 flex items-center gap-1.5">
							<span>O · Объективный статус полости рта (Status Localis, Objective)</span>
						</div>
						<div className="p-2.5 text-xs text-slate-900 whitespace-pre-wrap">
							{visitNoteForm?.objectiveStatus || "Слизистая оболочка полости рта физиологической окраски, влажная. Регионарные лимфатические узлы не увеличены, безболезненны при пальпации. Прикус ортогнатический."}
						</div>
					</div>

					{/* A - Assessment */}
					<div className="border border-slate-300 rounded-md overflow-hidden" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
						<div className="bg-slate-100 px-3 py-1.5 font-bold text-xs uppercase tracking-wide border-b border-slate-300 text-amber-900 flex items-center gap-1.5">
							<span>A · Клинический диагноз по МКБ-10 (Assessment)</span>
						</div>
						<div className="p-2.5 text-xs text-slate-900 font-bold">
							{visitNoteForm?.diagnosis || "Z01.2 Стоматологическое обследование"}
						</div>
					</div>

					{/* P - Plan & Treatment */}
					<div className="border border-slate-300 rounded-md overflow-hidden" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
						<div className="bg-slate-100 px-3 py-1.5 font-bold text-xs uppercase tracking-wide border-b border-slate-300 text-slate-900 flex items-center gap-1.5">
							<span>P · Протокол оказанной медицинской помощи, лечение и назначения (Plan)</span>
						</div>
						<div className="p-2.5 text-xs text-slate-900 whitespace-pre-wrap">
							{visitNoteForm?.treatmentPlan || "Проведен осмотр полости рта, консультация, составлен предварительный план терапевтического лечения. Даны рекомендации по гигиене."}
						</div>
					</div>
				</div>

				{/* Блок подписи врача и печати */}
				<div className="mt-8 pt-4 border-t-2 border-slate-300 flex items-end justify-between text-xs text-slate-800" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
					<div className="space-y-1">
						<div>
							Врач-стоматолог: _________________________ /{" "}
							<strong>{appLogic?.activeDoctor?.fullName || appLogic?.auth?.currentUser?.name || "_________________________"}</strong>
						</div>
						<div className="text-[10px] text-slate-500">(подпись и личная печать врача)</div>
					</div>

					{/* Круглая печать («М.П. Клиники») */}
					<div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-400 flex flex-col items-center justify-center text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
						<span>М.П.</span>
						<span className="text-[8px] font-normal">Клиники</span>
					</div>

					<div className="space-y-1 text-right">
						<div>
							Пациент: _________________________ /{" "}
							<strong>{activePatient?.fullName || "_________________________"}</strong>
						</div>
						<div className="text-[10px] text-slate-500">(с диагнозом и объемом оказанной помощи ознакомлен)</div>
					</div>
				</div>
			</div>
		</section>
	);
}
