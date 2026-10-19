/**
 * apps/web/src/components/visit/emkTabModules/useVisitEmkTabController.ts
 *
 * Контроллер управления состоянием, автосохранением, пресетами нормы и завершением приёма
 * для компонента VisitEmkTab.
 */

import React from "react";
import { showToast } from "../../GlobalToast";
import {
	inferProcedureServiceFromStamp,
	infer804nServiceFromStamp,
} from "../clinicalProcedureCatalogService";
import { useVisitEmkToothSync } from "../useVisitEmkToothSync";
import { useVisitSave } from "../useVisitSave";
import { appendClinicalText } from "../emk";
import { CLINICAL_SOAP_PRESETS } from "../clinicalSoapPresets";
import type { VisitNoteFieldsPatch as VisitNoteFieldPatch } from "../clinicalCatalog/clinicalProtocolsCatalog";
import { useVisitEmkAutosave } from "../emkTab/useVisitEmkAutosave";
import { useVisitCompletionWorkflow } from "../emkTab/useVisitCompletionWorkflow";
import type { VisitEmkTabProps } from "./emkTabTypes";

export function useVisitEmkTabController(props: VisitEmkTabProps) {
	const {
		dashboard,
		activePatient,
		noteTextOfAnotherVisit,
		openVisitId,
		isDraftAccepting,
		onSaveVisitNote,
	} = props;
	const visitNoteForm: Record<string, any> = props.visitNoteForm ?? {};
	const updateVisitNoteField: (field: string, value: any) => void =
		props.updateVisitNoteField ?? (() => {});
	const [activeEmkTab, setActiveEmkTab] = React.useState<string>("all");
	const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);
	const [isStarProtocolsOpen, setIsStarProtocolsOpen] = React.useState(false);
	const [isConsentModalOpen, setIsConsentModalOpen] = React.useState(false);
	const [isSoapTemplatesModalOpen, setIsSoapTemplatesModalOpen] = React.useState(false);
	const [isRevisingVisitNote, setIsRevisingVisitNote] = React.useState(false);
	const [isOdontogramCollapsed, setIsOdontogramCollapsed] = React.useState<boolean>(true);
	const [isSpecialtyCollapsed, setIsSpecialtyCollapsed] = React.useState<boolean>(true);

	const handleScheduleNextVisit = React.useCallback(
		(offsetDays: number, label: string = "через 5 дней") => {
			const targetDate = new Date();
			targetDate.setDate(targetDate.getDate() + offsetDays);
			const dateStr = targetDate.toLocaleDateString("ru-RU", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
			});
			const scheduleLine = `Повторный приём (${label}): ориентировочно ${dateStr}`;
			updateVisitNoteField(
				"recommendations",
				appendClinicalText(visitNoteForm?.recommendations || "", scheduleLine, "\n"),
			);
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-schedule-followup", {
						detail: {
							patientId: activePatient?.id,
							patientName: activePatient?.fullName,
							offsetDays,
							targetDateIso: targetDate.toISOString(),
							label,
						},
					}),
				);
			}
			showToast(`Назначен повторный визит (${label} — ${dateStr})`, "success", 3000);
		},
		[activePatient?.fullName, activePatient?.id, updateVisitNoteField, visitNoteForm?.recommendations],
	);

	const isSignedVisit =
		visitNoteForm?.status === "completed" ||
		visitNoteForm?.status === "signed" ||
		visitNoteForm?.status === "closed";

	const isLocked = false;

	const [selectedInlineTooth, setSelectedInlineTooth] =
		React.useState<number | null>(null);
	const [appliedTeethStamps, setAppliedTeethStamps] = React.useState<
		Record<string, string>
	>({});
	const [formulaSummary, setFormulaSummary] = React.useState<string>("");

	useVisitEmkToothSync({
		patientId: activePatient?.id ?? dashboard?.activeVisit?.patientId ?? null,
		visitNoteForm,
		updateVisitNoteField: (field: string, value: string) =>
			updateVisitNoteField(field, value),
	});

	const handleApplyInlineToothStamp = React.useCallback(
		(toothNum: number, stamp: string) => {
			setSelectedInlineTooth(toothNum);
			setAppliedTeethStamps((prev) => ({
				...prev,
				[String(toothNum)]: stamp,
			}));
			const serviceFromCatalog = inferProcedureServiceFromStamp(stamp, toothNum);
			if (serviceFromCatalog && typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: {
							service: serviceFromCatalog,
							toothNumber: toothNum,
						},
					}),
				);
			}
		},
		[],
	);

	const effectiveActiveTooth =
		selectedInlineTooth ?? dashboard?.activeVisit?.diagnosisTooth ?? 16;

	const {
		saveState: soloAutosaveState,
		lastSavedAt: soloLastSavedAt,
		flushPendingSave: flushSoloPendingSave,
	} = useVisitSave({
		visitId: openVisitId ?? dashboard?.activeVisit?.id ?? null,
		patientId: activePatient?.id ?? dashboard?.activeVisit?.patientId ?? null,
		visitNoteForm: visitNoteForm as any,
		onSaveSuccess: () => {
			if (typeof onSaveVisitNote === "function") {
				void (onSaveVisitNote as () => any)();
			}
		},
		debounceMs: 600,
	});

	const { triggerDebouncedAutosave } = useVisitEmkAutosave({
		flushSoloPendingSave,
	});

	const handleApplyPhysiologicalNorm = React.useCallback(() => {
		if (isSignedVisit && !isRevisingVisitNote) {
			setIsRevisingVisitNote(true);
		}
		const normComplaint =
			"Жалоб на момент осмотра активно не предъявляет (профилактический осмотр).";
		const normAnamnesis =
			"Соматически здоров. Аллергоанамнез не отягощен. Эпидемиологический анамнез спокоен.";
		const normObjective =
			"Конфигурация лица не изменена. Регионарные лимфоузлы не пальпируются. Открывание рта свободное, в полном объеме, ВНЧС без патологии. Слизистая оболочка полости рта физиологической окраски (бледно-розовая), умеренно влажная, без патологических элементов. Прикус ортогнатический. Зубные ряды санированы / интактны.";
		const normDiagnosis =
			"Z01.2 Стоматологическое обследование и гигиена полости рта (Норма)";
		const normPlan =
			"Проведена профессиональная гигиена и профилактика. Обучение гигиене. Контрольный осмотр через 6 месяцев.";
		const normRecs =
			"Чистка зубов 2 раза в день щёткой средней жесткости, использование зубной нити и ирригатора. Плановый профосмотр через 6 месяцев.";

		updateVisitNoteField("complaint", normComplaint);
		updateVisitNoteField("complaints", normComplaint);
		updateVisitNoteField("anamnesis", normAnamnesis);
		updateVisitNoteField("objectiveStatus", normObjective);
		updateVisitNoteField("objectiveInspection", normObjective);
		updateVisitNoteField("objective", normObjective);
		updateVisitNoteField("diagnosis", normDiagnosis);
		updateVisitNoteField("treatmentPlan", normPlan);
		updateVisitNoteField("treatment", normPlan);
		updateVisitNoteField("recommendations", normRecs);

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						complaint: normComplaint,
						complaints: normComplaint,
						anamnesis: normAnamnesis,
						objective: normObjective,
						objectiveStatus: normObjective,
						objectiveInspection: normObjective,
						diagnosis: normDiagnosis,
						treatmentPlan: normPlan,
						treatment: normPlan,
						treatmentDone: normPlan,
						recommendations: normRecs,
					},
				}),
			);
		}

		triggerDebouncedAutosave();
		showToast(
			"Дневник и зубная формула заполнены физиологической нормой в 1 клик. Исправьте только зубы с патологией.",
			"success",
			3000,
		);
	}, [isRevisingVisitNote, isSignedVisit, triggerDebouncedAutosave, updateVisitNoteField]);

	const handleApplySoapPreset = React.useCallback(
		(preset: (typeof CLINICAL_SOAP_PRESETS)[number], targetTooth?: number | string | null) => {
			if (isSignedVisit && !isRevisingVisitNote) {
				setIsRevisingVisitNote(true);
			}
			const toothPrefix = targetTooth ? `Зуб ${targetTooth}: ` : "";
			const statusLocalis = (preset as any).statusLocalis || (preset as any).objectiveStatus || "";
			const diagnosisText = (preset as any).icd10Label || (preset as any).diagnosis || "";
			const treatmentText = (preset as any).treatmentDescription || (preset as any).treatmentPlan || "";
			const recommendationsText = preset.recommendations || "";
			const shortTitle = (preset as any).shortBadge || (preset as any).shortLabel || (preset as any).title || "";

			updateVisitNoteField(
				"complaint",
				appendClinicalText(visitNoteForm?.complaint || "", `${toothPrefix}${preset.complaint || ""}`, "\n"),
			);
			updateVisitNoteField(
				"anamnesis",
				appendClinicalText(visitNoteForm?.anamnesis || "", preset.anamnesis || "", "\n"),
			);
			updateVisitNoteField(
				"objectiveStatus",
				appendClinicalText(visitNoteForm?.objectiveStatus || "", `${toothPrefix}${statusLocalis}`, "\n"),
			);
			updateVisitNoteField(
				"diagnosis",
				targetTooth ? `Зуб ${targetTooth}: ${diagnosisText}` : diagnosisText,
			);
			updateVisitNoteField(
				"treatmentPlan",
				appendClinicalText(visitNoteForm?.treatmentPlan || "", `${toothPrefix}${treatmentText}`, "\n"),
			);
			updateVisitNoteField(
				"recommendations",
				appendClinicalText(visitNoteForm?.recommendations || "", recommendationsText, "\n"),
			);

			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-apply-soap-protocol", {
						detail: {
							complaints: `${toothPrefix}${preset.complaint || ""}`,
							anamnesis: preset.anamnesis || "",
							objective: `${toothPrefix}${statusLocalis}`,
							diagnosis: targetTooth ? `Зуб ${targetTooth}: ${diagnosisText}` : diagnosisText,
							treatmentDone: `${toothPrefix}${treatmentText}`,
							recommendations: recommendationsText,
						},
					}),
				);
			}

			triggerDebouncedAutosave();
			showToast(
				`Протокол «${shortTitle}»${targetTooth ? ` (зуб ${targetTooth})` : ""} внесён в дневник`,
				"success",
				2500,
			);
		},
		[isRevisingVisitNote, isSignedVisit, triggerDebouncedAutosave, updateVisitNoteField, visitNoteForm],
	);

	const handleSaveVisitNote = React.useCallback(async () => {
		if (noteTextOfAnotherVisit) {
			showToast(
				"В полях остался текст предыдущего приёма. Скопируйте нужные данные в текущий визит перед сохранением.",
				"info",
				4000,
			);
		}
		if (!String(visitNoteForm?.complaint || "").trim()) {
			updateVisitNoteField("complaint", "Жалоб на момент осмотра не предъявляет.");
		}
		if (!String(visitNoteForm?.anamnesis || "").trim()) {
			updateVisitNoteField("anamnesis", "Соматически здоров. Аллергоанамнез не отягощен.");
		}
		if (!String(visitNoteForm?.objectiveStatus || "").trim()) {
			updateVisitNoteField(
				"objectiveStatus",
				"Слизистая оболочка полости рта бледно-розовая, влажная. Патологических изменений не выявлено.",
			);
		}
		if (!String(visitNoteForm?.diagnosis || "").trim()) {
			updateVisitNoteField(
				"diagnosis",
				"Z01.2 Осмотр полости рта, патологий не выявлено (Норма)",
			);
		}
		await flushSoloPendingSave();
		if (typeof onSaveVisitNote === "function") {
			await (onSaveVisitNote as () => any)();
		}
		if (isRevisingVisitNote) {
			setIsRevisingVisitNote(false);
		}
		showToast(
			isRevisingVisitNote
				? "Исправление в дневнике приёма сохранено («Исправленному верить»)"
				: "Запись приёма успешно сохранена в ЭМК",
			"success",
			3000,
		);
	}, [
		flushSoloPendingSave,
		isRevisingVisitNote,
		noteTextOfAnotherVisit,
		onSaveVisitNote,
		updateVisitNoteField,
		visitNoteForm,
	]);

	const {
		isCompletingVisit,
		completionResult,
		completionError,
		isSbpQrModalOpen,
		setIsSbpQrModalOpen,
		handleCompleteVisitAndGenerateReceipt,
	} = useVisitCompletionWorkflow({
		openVisitId,
		dashboard,
		activePatient,
		visitNoteForm,
		flushSoloPendingSave,
	});

	const handleApplyCatalogPatch = React.useCallback(
		(patch: VisitNoteFieldPatch) => {
			if (isSignedVisit && !isRevisingVisitNote) {
				setIsRevisingVisitNote(true);
			}
			if (patch.complaint !== undefined) updateVisitNoteField("complaint", patch.complaint);
			if (patch.anamnesis !== undefined) updateVisitNoteField("anamnesis", patch.anamnesis);
			if (patch.objectiveStatus !== undefined) updateVisitNoteField("objectiveStatus", patch.objectiveStatus);
			if (patch.diagnosis !== undefined) updateVisitNoteField("diagnosis", patch.diagnosis);
			if (patch.treatmentPlan !== undefined) updateVisitNoteField("treatmentPlan", patch.treatmentPlan);
			if (patch.recommendations !== undefined) updateVisitNoteField("recommendations", patch.recommendations);
			triggerDebouncedAutosave();
		},
		[isRevisingVisitNote, isSignedVisit, triggerDebouncedAutosave, updateVisitNoteField],
	);

	return {
		activeEmkTab,
		setActiveEmkTab,
		isPrintModalOpen,
		setIsPrintModalOpen,
		isStarProtocolsOpen,
		setIsStarProtocolsOpen,
		isConsentModalOpen,
		setIsConsentModalOpen,
		isSoapTemplatesModalOpen,
		setIsSoapTemplatesModalOpen,
		isRevisingVisitNote,
		setIsRevisingVisitNote,
		isOdontogramCollapsed,
		setIsOdontogramCollapsed,
		isSpecialtyCollapsed,
		setIsSpecialtyCollapsed,
		handleScheduleNextVisit,
		isSignedVisit,
		isLocked,
		selectedInlineTooth,
		setSelectedInlineTooth,
		appliedTeethStamps,
		formulaSummary,
		handleApplyInlineToothStamp,
		effectiveActiveTooth,
		soloAutosaveState,
		soloLastSavedAt,
		handleApplyPhysiologicalNorm,
		handleApplySoapPreset,
		handleSaveVisitNote,
		isCompletingVisit,
		completionResult,
		completionError,
		isSbpQrModalOpen,
		setIsSbpQrModalOpen,
		handleCompleteVisitAndGenerateReceipt,
		handleApplyCatalogPatch,
	};
}
