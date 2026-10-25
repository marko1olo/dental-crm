import { useCallback, useMemo } from "react";
import { showToast } from "../../../GlobalToast";
import { useVisitStore } from "../../../../store/visitStore";
import { ALIGNER_ATTACHMENT_PRESETS } from "../../OrthoBracketProtocolSection";
import { calculateOrthodonticServices, getRuDateString, type OrthodonticService } from "../../orthoProtocolTypes";
import { syncIssueAlignerSet } from "./orthoBackendSync";

export interface UseOrthoAppliancesParams {
	patientId?: string | undefined; patientName: string; clinicName: string; clinicPhone: string; doctorName: string;
	selectedTooth?: number | null | undefined; torquePreset: string; activeAttachmentPreset: string | null; isSplitArchAligners: boolean;
	alignerStep: number; alignerTotal: number; alignerStepUpper: number; alignerTotalUpper: number; alignerStepLower: number;
	alignerTotalLower: number; alignerDaysPerStep: number; setBracketSystem: (sys: string) => void; setBracketSlot: (slot: any) => void;
	setTorquePreset: (torque: string) => void; setStageFilter: (stage: "all" | "leveling" | "working" | "finishing" | "aligners" | "retention") => void;
	setActiveAttachmentPreset: (preset: string | null) => void; setActivePreset: (preset: null) => void; setTargetArch: (arch: "upper" | "lower" | "both") => void;
	setSelectedTeeth: (teeth: number[]) => void; setNotes: (notes: string) => void; setAlignerSetIssued: (info: { count: number; days: number }) => void;
	setAlignerStep: React.Dispatch<React.SetStateAction<number>>; onIssueAlignerSet?: ((count: number, days: number) => void) | undefined;
	onAddToInvoice?: ((services: OrthodonticService[]) => void) | undefined;
}

export function useOrthoAppliancesActions(params: UseOrthoAppliancesParams) {
	const {
		patientId, patientName, clinicName, clinicPhone, doctorName, selectedTooth,
		torquePreset, activeAttachmentPreset, isSplitArchAligners,
		alignerStep, alignerTotal, alignerStepUpper, alignerTotalUpper, alignerStepLower, alignerTotalLower, alignerDaysPerStep,
		setBracketSystem, setBracketSlot, setTorquePreset, setStageFilter,
		setActiveAttachmentPreset, setActivePreset, setTargetArch, setSelectedTeeth,
		setNotes, setAlignerSetIssued, setAlignerStep, onIssueAlignerSet, onAddToInvoice,
	} = params;

	const nextAlignerDateStr = useMemo(() => {
		const d = new Date();
		d.setDate(d.getDate() + alignerDaysPerStep);
		return getRuDateString(d);
	}, [alignerDaysPerStep]);

	const alignerProgressPercent = useMemo(() => {
		if (alignerTotal <= 0) return 0;
		return Math.min(100, Math.round((alignerStep / alignerTotal) * 100));
	}, [alignerStep, alignerTotal]);

	const handleSelectBracketSystem = useCallback((newSystem: string) => {
		setBracketSystem(newSystem);
		if (newSystem === "damon_q2" || newSystem === "damon_clear") {
			setBracketSlot("0.022");
			if (torquePreset !== "damon_high" && torquePreset !== "damon_low" && torquePreset !== "damon_std") setTorquePreset("damon_std");
		} else if (newSystem === "mini_diamond") setTorquePreset("roth");
		else if (newSystem === "empower") {
			setTorquePreset("mbt");
			setBracketSlot("0.022");
		} else if (newSystem === "aligners") {
			setStageFilter("aligners");
			if (!activeAttachmentPreset) setActiveAttachmentPreset("standard");
		}
	}, [torquePreset, activeAttachmentPreset, setBracketSystem, setBracketSlot, setTorquePreset, setStageFilter, setActiveAttachmentPreset]);

	const handleSelectAttachmentPreset = useCallback((presetId: string) => {
		const preset = ALIGNER_ATTACHMENT_PRESETS.find((p) => p.id === presetId);
		if (!preset) return;
		setActiveAttachmentPreset(presetId);
		setActivePreset(null);
		setBracketSystem("aligners");
		setTargetArch("both");
		if (preset.teeth && preset.teeth.length > 0) setSelectedTeeth([...preset.teeth]);
		setNotes(preset.description);
		showToast(`${preset.shortLabel} выбран`, "info");
	}, [setActiveAttachmentPreset, setActivePreset, setBracketSystem, setTargetArch, setSelectedTeeth, setNotes]);

	const handleIssueAlignerSetFromWidget = useCallback((count: number, days: number) => {
		setAlignerSetIssued({ count, days });
		setAlignerStep((prev) => Math.min(alignerTotal, prev + count));
		onIssueAlignerSet?.(count, days);
		if (patientId) syncIssueAlignerSet(patientId, count, days, alignerTotal);
		showToast(`Сдан сет элайнеров (${count} каппы на ${days} дн., режим 22 ч/сутки)`, "success");
	}, [alignerTotal, onIssueAlignerSet, patientId, setAlignerSetIssued, setAlignerStep]);

	const handleSendAlignerReminder = useCallback(() => {
		const nextStepStr = isSplitArchAligners ? `ВЧ №${Math.min(alignerTotalUpper, alignerStepUpper + 1)} / НЧ №${Math.min(alignerTotalLower, alignerStepLower + 1)}` : `№${Math.min(alignerTotal, alignerStep + 1)} из ${alignerTotal}`;
		const reminderText = `Здравствуйте, ${patientName}! Напоминание из клиники «${clinicName}»: смена элайнера на каппу ${nextStepStr} запланирована на ${nextAlignerDateStr}. Ношение 22 ч/сутки. Вопросы${clinicPhone ? `: ${clinicPhone}` : ""}. Врач: ${doctorName}.`;
		try {
			if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) navigator.clipboard.writeText(reminderText).catch(() => {});
			showToast(`Напоминание о смене каппы (${nextAlignerDateStr}) скопировано`, "success", 4000);
		} catch { showToast("Напоминание скопировано", "success"); }
	}, [isSplitArchAligners, alignerTotalUpper, alignerStepUpper, alignerTotalLower, alignerStepLower, alignerTotal, alignerStep, patientName, clinicName, nextAlignerDateStr, clinicPhone, doctorName]);

	const handleApplyAttachmentsProtocol = useCallback(() => {
		const currentPreset = ALIGNER_ATTACHMENT_PRESETS.find((p) => p.id === activeAttachmentPreset) || ALIGNER_ATTACHMENT_PRESETS[0];
		const textToAppend = currentPreset?.description || "Композитные аттачменты элайнеров зафиксированы.";
		const alignerServices = calculateOrthodonticServices({ bracketSystem: "aligners", activeAttachmentPreset: activeAttachmentPreset || "standard", isAttachmentsOnly: true, selectedTooth: selectedTooth ?? undefined });
		try {
			const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
			if (setVisitNoteForm) {
				setVisitNoteForm((prev) => ({
					...prev,
					objectiveStatus: prev.objectiveStatus ? `${prev.objectiveStatus}\n\n${textToAppend}` : textToAppend,
					treatmentPlan: prev.treatmentPlan ? `${prev.treatmentPlan}\n\n[Ортодонтия] Элайнеры: ${currentPreset?.shortLabel}` : `[Ортодонтия] Элайнеры: ${currentPreset?.shortLabel}.`,
				}));
			}
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", { detail: { protocolText: `[Аттачменты]\n${textToAppend}`, title: "Аттачменты элайнеров" } }));
				window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", { detail: { services: alignerServices, toothNumber: selectedTooth ?? undefined, stageKind: "stage_ortho" } }));
			}
			onAddToInvoice?.(alignerServices);
			if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(textToAppend).catch(() => {});
			showToast(`Аттачменты внесены в карту, начислено ${alignerServices.length} услуг`, "success");
		} catch { showToast("Протокол скопирован в буфер", "info"); }
	}, [activeAttachmentPreset, selectedTooth, onAddToInvoice]);

	return { nextAlignerDateStr, alignerProgressPercent, handleSelectBracketSystem, handleSelectAttachmentPreset, handleIssueAlignerSetFromWidget, handleSendAlignerReminder, handleApplyAttachmentsProtocol };
}
