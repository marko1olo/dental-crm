import { useState, useEffect } from "react";
import type { EndoCanalData, EndoToothClinicalData } from "../../endo/EndoCanalLogModal";
import {
	REFERENCE_POINT_OPTIONS,
	MAF_ISO_OPTIONS,
	TAPER_OPTIONS,
	OBTURATION_TECHNIQUE_OPTIONS,
} from "../../endo/EndoCanalLogModal";
import type { ToothData } from "../../odontogram/ToothChart";
import { showToast } from "../../GlobalToast";
import { buildEndoUpdatePayload, getDefaultCanalsForTooth } from "./endoPresetActions";
import { useToothEndoPresets } from "./useToothEndoPresets";

export function useToothEndoCanalsState(
	toothNumber: number,
	toothData: ToothData | undefined,
	onUpdateTooth?: (updates: Partial<ToothData>) => void,
	onInsertToProtocol?: (text: string) => void,
) {
	const [canals, setCanals] = useState<EndoCanalData[]>(() => {
		const clinical = toothData?.clinicalData as EndoToothClinicalData | undefined;
		return (clinical?.canals && clinical.canals.length > 0) ? clinical.canals : getDefaultCanalsForTooth(toothNumber);
	});
	const [endoRotarySystem, setEndoRotarySystem] = useState<string>("ProTaper Gold");
	const [endoIrrigation, setEndoIrrigation] = useState<string>("NaOCl 3.0% + EDTA 17%");
	const [endoRadiologyControl, setEndoRadiologyControl] = useState<string>("RVG контроль апекслокатором");

	useEffect(() => {
		const clinical = toothData?.clinicalData as EndoToothClinicalData | undefined;
		setCanals((clinical?.canals && clinical.canals.length > 0) ? clinical.canals : getDefaultCanalsForTooth(toothNumber));
		if (clinical?.rotarySystem) setEndoRotarySystem(clinical.rotarySystem);
		if (clinical?.irrigation) setEndoIrrigation(clinical.irrigation);
		if (clinical?.radiologyControl) setEndoRadiologyControl(clinical.radiologyControl);
	}, [toothNumber, toothData?.clinicalData]);

	const handleCanalChange = (id: string, field: keyof EndoCanalData, value: string | number) => {
		setCanals((prev) => {
			const next = prev.map((c) => (c.id === id ? { ...c, [field]: value } : c));
			onUpdateTooth?.(buildEndoUpdatePayload(toothData, next, endoRotarySystem, endoIrrigation, endoRadiologyControl));
			return next;
		});
	};

	const handleAddCanal = () => {
		const newCanal: EndoCanalData = {
			id: `canal-${Date.now()}`,
			canalName: `Canal ${canals.length + 1}`,
			referencePoint: REFERENCE_POINT_OPTIONS[0],
			workingLengthMm: 21.0,
			masterApicalFile: MAF_ISO_OPTIONS[2],
			taper: TAPER_OPTIONS[2],
			obturationTechnique: OBTURATION_TECHNIQUE_OPTIONS[0],
		};
		setCanals((prev) => {
			const next = [...prev, newCanal];
			onUpdateTooth?.(buildEndoUpdatePayload(toothData, next, endoRotarySystem, endoIrrigation, endoRadiologyControl));
			return next;
		});
	};

	const handleRemoveCanal = (id: string) => {
		if (canals.length <= 1) {
			showToast("Должен оставаться хотя бы 1 корневой канал", "warning");
			return;
		}
		setCanals((prev) => {
			const next = prev.filter((c) => c.id !== id);
			onUpdateTooth?.(buildEndoUpdatePayload(toothData, next, endoRotarySystem, endoIrrigation, endoRadiologyControl));
			return next;
		});
	};

	const handleResetCanals = () => {
		const defCanals = getDefaultCanalsForTooth(toothNumber);
		setCanals(defCanals);
		onUpdateTooth?.(buildEndoUpdatePayload(toothData, defCanals, endoRotarySystem, endoIrrigation, endoRadiologyControl));
		showToast(`Каналы сброшены к стандарту зуба #${toothNumber}`, "info");
	};

	const presets = useToothEndoPresets(
		toothNumber, toothData, canals, endoRotarySystem, endoIrrigation, endoRadiologyControl,
		setCanals, setEndoRotarySystem, setEndoIrrigation, setEndoRadiologyControl,
		onUpdateTooth, onInsertToProtocol,
	);

	return {
		canals,
		handleCanalChange,
		handleAddCanal,
		handleRemoveCanal,
		handleResetCanals,
		...presets,
	};
}
