import type React from "react";
import type { EndoCanalData } from "@dental/shared";
import {
	applyAnatomicalWorkingLengths,
	applyCaOh2EndoProtocol,
	applyExpressApicalEndoProtocol,
	applyObturationPermanentProtocol,
	applyPeriodontitisDestructiveProtocol,
	applyPrimaryEndoProtocol,
	applyPulpitisObturationProtocol,
	applyPulpitisProtocol,
	applyRetreatmentEndoProtocol,
	applyStandardEndoProtocol,
	type EndoStageStamp,
} from "../endoCanalConstants";
import { showToast } from "../../GlobalToast";

interface UseEndoPresetsProps {
	readonly activeTooth: number;
	readonly canals: EndoCanalData[];
	readonly setCanals: React.Dispatch<React.SetStateAction<EndoCanalData[]>>;
	readonly setIrrigation: React.Dispatch<React.SetStateAction<string>>;
	readonly setRotarySystem: React.Dispatch<React.SetStateAction<string>>;
	readonly setRadiologyControl: React.Dispatch<React.SetStateAction<string>>;
	readonly setStageStamp: React.Dispatch<React.SetStateAction<EndoStageStamp>>;
}

export function useEndoPresets({
	activeTooth,
	canals,
	setCanals,
	setIrrigation,
	setRotarySystem,
	setRadiologyControl,
	setStageStamp,
}: UseEndoPresetsProps) {
	const applyPreset = (preset: { canals: EndoCanalData[]; irrigation: string; rotarySystem: string; radiologyControl: string }, stamp: EndoStageStamp, toastMsg: string, toastType: "success" | "info" = "success") => {
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp(stamp);
		showToast(toastMsg, toastType);
	};

	const handleApplyExpressApicalPreset = () => {
		applyPreset(applyExpressApicalEndoProtocol(canals, activeTooth), "COMPLETED", "Обтурация канала (гуттаперча + силер): Каналы пройдены и обтурированы до апекса");
	};

	const handleApplyCaOh2Protocol = () => {
		applyPreset(applyCaOh2EndoProtocol(canals, activeTooth), "TEMP_CAOH2", "Протокол эндодонтического лечения: Временная повязка Ca(OH)2 (Каласепт)", "info");
	};

	const handleApplyPulpitisPreset = () => {
		applyPreset(applyPulpitisProtocol(canals, activeTooth), "COMPLETED", "Протокол эндодонтического лечения: Эндодонтия пульпита в 1 визит (ProTaper F2 + AH Plus)");
	};

	const handleApplyPrimaryEndoPreset = () => {
		applyPreset(applyPrimaryEndoProtocol(canals, activeTooth), "TEMP_CAOH2", "Протокол эндодонтического лечения: Первичное эндо (ProTaper Gold + Metapex)");
	};

	const handleApplyRetreatmentPreset = () => {
		applyPreset(applyRetreatmentEndoProtocol(canals, activeTooth), "TEMP_CAOH2", "Протокол эндодонтического лечения: Повторное эндо (D-RaCe + ревизия)", "info");
	};

	const handleApplyObturationPreset = () => {
		applyPreset(applyObturationPermanentProtocol(canals, activeTooth), "COMPLETED", "Обтурация канала (гуттаперча + силер): Постоянная обтурация (GuttaCore / AH Plus)");
	};

	const handleApplyPulpitisObturationPreset = () => {
		applyPreset(applyPulpitisObturationProtocol(canals, activeTooth), "COMPLETED", "Применен протокол: Пульпит 2-е посещение (AH Plus)");
	};

	const handleApplyPeriodontitisDestructivePreset = () => {
		applyPreset(applyPeriodontitisDestructiveProtocol(canals, activeTooth), "TEMP_CAOH2", "Применен протокол: Периодонтит деструктивный (Metapex 14 дн)", "info");
	};

	const handleApplyStandardProtocol = () => {
		applyPreset(applyStandardEndoProtocol(canals, activeTooth), "COMPLETED", "Применен стандартный протокол обтурации (ProTaper + AH Plus)");
	};

	const handleApplyAnatomicalLengths = () => {
		const updated = applyAnatomicalWorkingLengths(canals, activeTooth);
		setCanals(updated);
		showToast(`Анатомическая длина каналов автозаполнена для зуба #${activeTooth}`, "info");
	};

	return {
		handleApplyExpressApicalPreset,
		handleApplyCaOh2Protocol,
		handleApplyPulpitisPreset,
		handleApplyPrimaryEndoPreset,
		handleApplyRetreatmentPreset,
		handleApplyObturationPreset,
		handleApplyPulpitisObturationPreset,
		handleApplyPeriodontitisDestructivePreset,
		handleApplyStandardProtocol,
		handleApplyAnatomicalLengths,
	};
}
