import type { EndoCanalData } from "../../endo/EndoCanalLogModal";
import type { ToothData } from "../../odontogram/ToothChart";
import { showToast } from "../../GlobalToast";
import {
	createRevisionCanals,
	buildEndoUpdatePayload,
	applyPulpitisProtocol,
	applyPeriodontitisTempProtocol,
	applyObturationPermanentProtocol,
	applyAnatomicalWorkingLengths,
	generateEndoProtocol043,
} from "./endoPresetActions";

export function useToothEndoPresets(
	toothNumber: number,
	toothData: ToothData | undefined,
	canals: EndoCanalData[],
	endoRotarySystem: string,
	endoIrrigation: string,
	endoRadiologyControl: string,
	setCanals: React.Dispatch<React.SetStateAction<EndoCanalData[]>>,
	setEndoRotarySystem: (s: string) => void,
	setEndoIrrigation: (s: string) => void,
	setEndoRadiologyControl: (s: string) => void,
	onUpdateTooth?: (updates: Partial<ToothData>) => void,
	onInsertToProtocol?: (text: string) => void,
) {
	const handleApplyPulpitis = () => {
		const p = applyPulpitisProtocol(canals, toothNumber);
		setCanals(p.canals); setEndoRotarySystem(p.rotarySystem); setEndoIrrigation(p.irrigation); setEndoRadiologyControl(p.radiologyControl);
		const state = toothData?.state === "Healthy" || toothData?.state === "Caries" ? "Pulpitis" : (toothData?.state ?? "Pulpitis");
		onUpdateTooth?.(buildEndoUpdatePayload(toothData, p.canals, p.rotarySystem, p.irrigation, p.radiologyControl, { state, canalObturation: "gutta_percha" }));
		showToast(`Зуб #${toothNumber}: Протокол эндодонтического лечения (Пульпит: ProTaper F2 + AH Plus)`, "success", 3000);
	};

	const handleApplyPeriodontitis = () => {
		const p = applyPeriodontitisTempProtocol(canals, toothNumber);
		setCanals(p.canals); setEndoRotarySystem(p.rotarySystem); setEndoIrrigation(p.irrigation); setEndoRadiologyControl(p.radiologyControl);
		onUpdateTooth?.(buildEndoUpdatePayload(toothData, p.canals, p.rotarySystem, p.irrigation, p.radiologyControl, { state: "Periodontitis", canalObturation: "calcium_hydroxide" }));
		showToast(`Зуб #${toothNumber}: Протокол эндодонтического лечения (Периодонтит: Каласепт Ca(OH)2)`, "info", 3000);
	};

	const handleApplyObturation = () => {
		const p = applyObturationPermanentProtocol(canals, toothNumber);
		setCanals(p.canals); setEndoRotarySystem(p.rotarySystem); setEndoIrrigation(p.irrigation); setEndoRadiologyControl(p.radiologyControl);
		const state = toothData?.state === "Periodontitis" ? "Periodontitis" : "Filled";
		onUpdateTooth?.(buildEndoUpdatePayload(toothData, p.canals, p.rotarySystem, p.irrigation, p.radiologyControl, { state, canalObturation: "gutta_percha" }));
		showToast(`Зуб #${toothNumber}: Обтурация канала (гуттаперча + силер) до апекса`, "success", 3000);
	};

	const handleApplyAnatomical = () => {
		const updated = applyAnatomicalWorkingLengths(canals, toothNumber);
		setCanals(updated);
		onUpdateTooth?.(buildEndoUpdatePayload(toothData, updated, endoRotarySystem, endoIrrigation, endoRadiologyControl));
		showToast(`Анатомическая длина каналов автозаполнена для зуба #${toothNumber}`, "info", 3000);
	};

	const handleApplyRevision = () => {
		const rev = createRevisionCanals(canals, toothNumber);
		setCanals(rev.canals); setEndoRotarySystem(rev.rotarySystem); setEndoIrrigation(rev.irrigation); setEndoRadiologyControl(rev.radiologyControl);
		onUpdateTooth?.(buildEndoUpdatePayload(toothData, rev.canals, rev.rotarySystem, rev.irrigation, rev.radiologyControl, { state: "Periodontitis", canalObturation: "calcium_hydroxide" }));
		showToast(`Зуб #${toothNumber}: Протокол эндодонтического лечения (Ревизия и распломбировка)`, "warning", 3000);
	};

	const handleInsertProtocol = () => {
		const text = generateEndoProtocol043({ toothNumber, canals, rotarySystem: endoRotarySystem, irrigation: endoIrrigation, radiologyControl: endoRadiologyControl });
		if (onInsertToProtocol) {
			onInsertToProtocol(text);
			showToast(`Протокол эндодонтии зуба #${toothNumber} сохранен в карте!`, "success");
		} else {
			try { navigator.clipboard.writeText(text); showToast("Протокол эндо скопирован в буфер", "success"); } catch { showToast("Не удалось скопировать", "error"); }
		}
	};

	return {
		handleApplyPulpitis,
		handleApplyPeriodontitis,
		handleApplyObturation,
		handleApplyAnatomical,
		handleApplyRevision,
		handleInsertProtocol,
	};
}
