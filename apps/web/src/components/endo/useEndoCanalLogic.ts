import React, { useEffect, useMemo, useState } from "react";
import type { EndoCanalData, EndoTreatmentBillingEstimateResult } from "@dental/shared";
import {
	type EndoStageStamp,
	getDefaultCanalsForTooth,
	PRIMARY_ENDO_PRESET,
	calculateEndoBillingAndMaterialsEstimate,
	generateEndoProtocol043,
} from "./endoCanalConstants";
import { renderIsoColorBadge } from "./endoCanalHelpers";
import { getToothAnatomicalNameRu } from "../../lib/clinicalProtocols";
import { showToast } from "../GlobalToast";
import type { UseEndoCanalLogicProps, UseEndoCanalLogicReturn } from "./logic/types";
import { useEndoDataSync } from "./logic/useEndoDataSync";
import { useEndoCanalActions } from "./logic/useEndoCanalActions";
import { useEndoPresets } from "./logic/useEndoPresets";
import { useEndoSaveActions } from "./logic/useEndoSaveActions";

export type { UseEndoCanalLogicProps, UseEndoCanalLogicReturn } from "./logic/types";

export function useEndoCanalLogic(props: UseEndoCanalLogicProps): UseEndoCanalLogicReturn {
	const { isOpen, onClose, toothNumber, patientId, initialCanals, initialIrrigation, initialRotarySystem, initialRadiologyControl } = props;
	const [activeTooth, setActiveTooth] = useState<number>(toothNumber);

	useEffect(() => {
		setActiveTooth(toothNumber);
	}, [toothNumber]);

	const [canals, setCanals] = useState<EndoCanalData[]>(() => {
		if (initialCanals && initialCanals.length > 0) return initialCanals.map((c) => ({ ...c }));
		return getDefaultCanalsForTooth(toothNumber);
	});

	const [irrigation, setIrrigation] = useState<string>(initialIrrigation || PRIMARY_ENDO_PRESET.irrigation);
	const [rotarySystem, setRotarySystem] = useState<string>(initialRotarySystem || PRIMARY_ENDO_PRESET.rotarySystem);
	const [radiologyControl, setRadiologyControl] = useState<string>(initialRadiologyControl || PRIMARY_ENDO_PRESET.radiologyControl);
	const [copied, setCopied] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);

	const [stageStamp, setStageStamp] = useState<EndoStageStamp>(() => {
		if (initialIrrigation?.toLowerCase().includes("ca(oh)2") || initialRotarySystem?.toLowerCase().includes("ca(oh)2")) {
			return "TEMP_CAOH2";
		}
		return "COMPLETED";
	});

	const [isPresetsMenuOpen, setIsPresetsMenuOpen] = useState(false);
	const [isFooterMenuOpen, setIsFooterMenuOpen] = useState(false);

	const suggestedCanalNames = useMemo(() => {
		const defaultCanals = getDefaultCanalsForTooth(activeTooth);
		const names = defaultCanals.map((dc) => dc.canalName);
		const extra = activeTooth >= 16 && activeTooth <= 28 ? ["MB1", "MB2", "DB", "P"] : activeTooth >= 36 && activeTooth <= 48 ? ["MB", "ML", "D", "DL"] : ["Main", "B", "L"];
		return Array.from(new Set([...names, ...extra])).slice(0, 5);
	}, [activeTooth]);

	const handleSwitchTooth = (newTooth: number) => {
		setActiveTooth(newTooth);
		setCanals(getDefaultCanalsForTooth(newTooth));
		showToast(`Выбран зуб #${newTooth}. Анатомические каналы автозаполнены`, "info");
	};

	useEndoDataSync({ isOpen, activeTooth, toothNumber, patientId, initialCanals, initialIrrigation, initialRotarySystem, initialRadiologyControl, setCanals, setIrrigation, setRotarySystem, setRadiologyControl, setIsLoadingFromDb, onClose });
	const canalActions = useEndoCanalActions({ activeTooth, stageStamp, canals, setCanals });
	const presets = useEndoPresets({ activeTooth, canals, setCanals, setIrrigation, setRotarySystem, setRadiologyControl, setStageStamp });

	const toothAnatomicalName = getToothAnatomicalNameRu(activeTooth);

	const generatedProtocolText = useMemo(() => {
		const stampedTitle = stageStamp === "DRAFT" ? `${toothAnatomicalName} [ЧЕРНОВИК — КАНАЛЫ В ОБРАБОТКЕ]` : stageStamp === "TEMP_CAOH2" ? `${toothAnatomicalName} [ВРЕМЕННАЯ ОБТУРАЦИЯ Ca(OH)2]` : `${toothAnatomicalName} [ПОЛНАЯ ОБТУРАЦИЯ ДО АПЕКСА]`;
		return generateEndoProtocol043({
			toothNumber: activeTooth,
			toothTitle: stampedTitle,
			canals: canals.map((c) => ({ ...c, workingLengthMm: typeof c.workingLengthMm === "number" && !Number.isNaN(c.workingLengthMm) ? Math.round(c.workingLengthMm * 2) / 2 : c.workingLengthMm })),
			irrigation,
			rotarySystem,
			radiologyControl,
		});
	}, [activeTooth, toothAnatomicalName, canals, irrigation, rotarySystem, radiologyControl, stageStamp]);

	const billingEstimate = useMemo<EndoTreatmentBillingEstimateResult>(() => {
		return calculateEndoBillingAndMaterialsEstimate({ toothNumber: activeTooth, canals, stageStamp, obturationTechnique: canals[0]?.obturationTechnique, sealer: canals[0]?.sealer });
	}, [activeTooth, canals, stageStamp]);

	const saveActions = useEndoSaveActions({
		activeTooth, toothAnatomicalName, canals, stageStamp, irrigation, rotarySystem, radiologyControl,
		patientId, clinicName: props.clinicName, clinicPhone: props.clinicPhone, doctorName: props.doctorName, patientName: props.patientName,
		generatedProtocolText, billingEstimate, onInsertToProtocol: props.onInsertToProtocol, onSaveCanals: props.onSaveCanals, onSave: props.onSave,
		onClose, setIsSaving, setCopied,
	});

	return {
		activeTooth, toothAnatomicalName, canals, irrigation, setIrrigation, rotarySystem, setRotarySystem, radiologyControl, setRadiologyControl,
		copied, isSaving, isLoadingFromDb, stageStamp, setStageStamp, isPresetsMenuOpen, setIsPresetsMenuOpen, isFooterMenuOpen, setIsFooterMenuOpen,
		suggestedCanalNames, generatedProtocolText, handleSwitchTooth, ...canalActions, ...presets, ...saveActions, renderIsoColorBadge, billingEstimate,
	};
}
