import { useState, useEffect, useMemo } from "react";
import type { ToothData, ToothState } from "../../odontogram/ToothChart";
import { getToothAnatomicalNameRu, getToothFolkAndAnatomicalNameRu } from "../../../lib/clinicalProtocols";
import { showToast } from "../../GlobalToast";
import { SoundFeedbackService } from "../../../services/audio/SoundFeedbackService";
import {
	getSuggestedRecallForToothState,
	type WarmAccordionSection,
	type ToothContextDrawerProps,
} from "./toothDrawerTypes";

export function useToothDrawerState({
	isOpen,
	onClose,
	toothNumber,
	toothData,
	patient,
	onUpdateTooth,
	onUpdateToothStatus,
	onSetRecall,
	initialSection,
}: ToothContextDrawerProps) {
	const isPediatricTooth = (toothNumber >= 51 && toothNumber <= 85) || (patient?.ageYears !== undefined && patient.ageYears < 14);
	const [currentState, setCurrentState] = useState<ToothState>(toothData?.state ?? "Healthy");

	useEffect(() => {
		if (toothData?.state) setCurrentState(toothData.state);
	}, [toothData?.state]);

	useEffect(() => {
		const handleOdontogramEvent = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (!detail) return;
			const states = detail.states || [detail];
			const match = states.find((s: any) => Number(s.toothNumber) === toothNumber);
			if (match && match.state) {
				setCurrentState(match.state);
				onUpdateTooth?.(toothNumber, { state: match.state });
				onUpdateToothStatus?.(toothNumber, match.state);
			}
		};
		window.addEventListener("dente-odontogram-update", handleOdontogramEvent);
		return () => window.removeEventListener("dente-odontogram-update", handleOdontogramEvent);
	}, [toothNumber, onUpdateTooth, onUpdateToothStatus]);

	const suggestedRecall = useMemo(() => getSuggestedRecallForToothState(currentState), [currentState]);

	const handleTriggerRecall = () => {
		if (onSetRecall) {
			onSetRecall(toothNumber, suggestedRecall.cycle, suggestedRecall.months);
		} else if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-open-recall-modal", {
					detail: { toothNumber, cycleType: suggestedRecall.cycle, monthsOffset: suggestedRecall.months },
				}),
			);
		}
		showToast(`Назначен вызов по зубу #${toothNumber}: ${suggestedRecall.label}`, "success", 3000);
		SoundFeedbackService.getInstance().playActionSuccess();
	};

	const handleQuickStateSelect = (newState: ToothState) => {
		setCurrentState(newState);
		onUpdateTooth?.(toothNumber, { state: newState });
		onUpdateToothStatus?.(toothNumber, newState);
	};

	const [activeSection, setActiveSection] = useState<WarmAccordionSection>(initialSection ?? "surfaces_endo");

	useEffect(() => {
		if (isPediatricTooth) setActiveSection("surfaces_endo");
	}, [isPediatricTooth, toothNumber]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const anatomicalName = useMemo(() => getToothAnatomicalNameRu(toothNumber), [toothNumber]);
	const folkAndAnatomical = useMemo(() => getToothFolkAndAnatomicalNameRu(toothNumber), [toothNumber]);

	const toggleSection = (section: WarmAccordionSection) => {
		setActiveSection((prev) => (prev === section ? ("" as WarmAccordionSection) : section));
	};

	return {
		isPediatricTooth,
		currentState,
		suggestedRecall,
		handleTriggerRecall,
		handleQuickStateSelect,
		activeSection,
		setActiveSection,
		toggleSection,
		anatomicalName,
		folkAndAnatomical,
	};
}
