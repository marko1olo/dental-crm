import { useState, useEffect, useMemo } from "react";
import { isPrimaryTooth, calculateAge } from "@dental/shared";
import type { ToothData, ToothState } from "../../odontogram/ToothChart";
import { getToothAnatomicalNameRu, getToothFolkAndAnatomicalNameRu } from "../../../lib/clinicalProtocols";
import { showToast } from "../../GlobalToast";
import { SoundFeedbackService } from "../../../services/audio/SoundFeedbackService";
import {
	getSuggestedRecallForToothState,
	type WarmAccordionSection,
	type ToothContextDrawerProps,
} from "./toothDrawerTypes";

interface OdontogramEventDetailItem {
	readonly toothNumber?: number | string | undefined;
	readonly state?: ToothState | undefined;
}

interface OdontogramEventDetail {
	readonly states?: readonly OdontogramEventDetailItem[] | undefined;
	readonly toothNumber?: number | string | undefined;
	readonly state?: ToothState | undefined;
}

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
	const calculatedAge = patient?.birthDate ? calculateAge(patient.birthDate) : undefined;
	const isPediatricTooth = isPrimaryTooth(toothNumber) || (patient?.ageYears !== undefined && patient.ageYears < 14) || (calculatedAge !== undefined && calculatedAge < 14);
	const [currentState, setCurrentState] = useState<ToothState>(toothData?.state ?? "Healthy");

	useEffect(() => {
		if (toothData?.state) setCurrentState(toothData.state);
	}, [toothData?.state]);

	useEffect(() => {
		const handleOdontogramEvent = (e: Event) => {
			if (!(e instanceof CustomEvent)) return;
			const detail = e.detail as OdontogramEventDetail | undefined;
			if (!detail) return;
			const states: readonly OdontogramEventDetailItem[] = detail.states ?? [detail];
			const match = states.find((s) => Number(s.toothNumber) === toothNumber);
			if (match?.state) {
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

	const [activeSection, setActiveSection] = useState<WarmAccordionSection>(initialSection ?? (isPediatricTooth ? "pediatric" : "surfaces_endo"));

	useEffect(() => {
		if (isPediatricTooth && !initialSection) setActiveSection("pediatric");
	}, [isPediatricTooth, toothNumber, initialSection]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const anatomicalName = useMemo(() => getToothAnatomicalNameRu(toothNumber), [toothNumber]);
	const folkAndAnatomical = useMemo(() => getToothFolkAndAnatomicalNameRu(toothNumber), [toothNumber]);

	const toggleSection = (section: WarmAccordionSection) => {
		setActiveSection((prev) => (prev === section ? null : section));
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
