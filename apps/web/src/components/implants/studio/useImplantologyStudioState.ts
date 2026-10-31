/**
 * useImplantologyStudioState.ts — Хук состояния хирургического протокола имплантации (DENTE CRM).
 * Управляет выбором системы имплантата (6 систем РФ), плотностью кости Misch D1–D4,
 * безопасной зоной торка (35–45 Н·см), стабильностью ISQ (65–85) и гарантийным паспортом (Мандаты 8e, 8n, 8am, 8b).
 */

import { useState, useMemo, useCallback } from "react";
import {
	CANONICAL_IMPLANT_SYSTEMS,
	SURGICAL_QUICK_TEMPLATES,
	getMischBoneDensityByToothFdi,
	getRecommendedTorqueZone,
	generateWarrantyPassportRecord,
	buildSoapSurgeryDiaryText,
	type CanonicalImplantSystemId,
	type ImplantStageType,
	type MischBoneDensity,
	type ImplantWarrantyPassportData,
	type ImplantSurgeryQuickTemplate,
} from "../implantologyCatalogData";

export type ImplantStudioTab = "protocol" | "passport" | "diary" | "memo";

export interface UseImplantologyStudioStateProps {
	readonly initialTooth?: number | undefined;
	readonly initialTab?: ImplantStudioTab | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly onSaveProtocol?: ((passport: ImplantWarrantyPassportData, soapDiary: string) => void) | undefined;
	readonly onClose: () => void;
}

export function useImplantologyStudioState({
	initialTooth = 46,
	initialTab = "protocol",
	patientName = "Иванов Иван Иванович",
	patientId = "PAT-01",
	doctorName = "Д-р Воронов А. В.",
	doctorId = "DOC-01",
	onSaveProtocol,
	onClose,
}: UseImplantologyStudioStateProps) {
	const [activeTab, setActiveTab] = useState<ImplantStudioTab>(initialTab);
	const [toothFdi, setToothFdi] = useState<number>(initialTooth || 46);
	const [systemId, setSystemId] = useState<CanonicalImplantSystemId>("osstem");
	const [diameterMm, setDiameterMm] = useState<number>(4.0);
	const [lengthMm, setLengthMm] = useState<number>(10.0);
	const [torqueNcm, setTorqueNcm] = useState<number>(35);
	const [isqValue, setIsqValue] = useState<number>(72);
	const [stage, setStage] = useState<ImplantStageType>("one_stage_healing_abutment");
	const [isGbrPerformed, setIsGbrPerformed] = useState<boolean>(false);
	const [lotNumber, setLotNumber] = useState<string>("");
	const [serialNumber, setSerialNumber] = useState<string>("");

	const activeSystem = CANONICAL_IMPLANT_SYSTEMS[systemId] || CANONICAL_IMPLANT_SYSTEMS.osstem;
	const boneDensity: MischBoneDensity = useMemo(() => getMischBoneDensityByToothFdi(toothFdi), [toothFdi]);
	const torqueZone = useMemo(() => getRecommendedTorqueZone(torqueNcm), [torqueNcm]);

	const handleSystemChange = useCallback((id: CanonicalImplantSystemId) => {
		setSystemId(id);
		const target = CANONICAL_IMPLANT_SYSTEMS[id];
		if (target) {
			if (!target.diametersMm.includes(diameterMm)) setDiameterMm(target.defaultDiameterMm);
			if (!target.lengthsMm.includes(lengthMm)) setLengthMm(target.defaultLengthMm);
		}
	}, [diameterMm, lengthMm]);

	const handleApplyTemplate = useCallback((tmpl: ImplantSurgeryQuickTemplate) => {
		setStage(tmpl.stage);
		setTorqueNcm(tmpl.defaultTorqueNcm);
		setIsqValue(tmpl.defaultIsq);
		setIsGbrPerformed(tmpl.boneGraftRequired);
	}, []);

	const warrantyPassport: ImplantWarrantyPassportData = useMemo(() => {
		return generateWarrantyPassportRecord({
			toothFdi,
			systemId,
			diameterMm,
			lengthMm,
			torqueNcm,
			isq: isqValue,
			stage,
			patientName,
			patientId,
			doctorName,
			doctorId,
			lotNumber: lotNumber.trim() || undefined,
			serialNumber: serialNumber.trim() || undefined,
		});
	}, [
		toothFdi,
		systemId,
		diameterMm,
		lengthMm,
		torqueNcm,
		isqValue,
		stage,
		patientName,
		patientId,
		doctorName,
		doctorId,
		lotNumber,
		serialNumber,
	]);

	const soapDiary = useMemo(() => {
		return buildSoapSurgeryDiaryText({
			toothFdi,
			boneDensity,
			brandName: activeSystem.brandName,
			lineName: activeSystem.lineName,
			diameterMm,
			lengthMm,
			torqueNcm,
			isqValue,
			screwdriverAliasRu: activeSystem.screwdriverAliasRu,
			stage,
			isGbrPerformed,
		});
	}, [
		toothFdi,
		boneDensity,
		activeSystem,
		diameterMm,
		lengthMm,
		torqueNcm,
		isqValue,
		stage,
		isGbrPerformed,
	]);

	const handleCommitProtocol = useCallback(() => {
		if (onSaveProtocol) {
			onSaveProtocol(warrantyPassport, soapDiary);
		}
		onClose();
	}, [onSaveProtocol, warrantyPassport, soapDiary, onClose]);

	return {
		activeTab,
		setActiveTab,
		toothFdi,
		setToothFdi,
		systemId,
		handleSystemChange,
		activeSystem,
		diameterMm,
		setDiameterMm,
		lengthMm,
		setLengthMm,
		torqueNcm,
		setTorqueNcm,
		torqueZone,
		isqValue,
		setIsqValue,
		stage,
		setStage,
		isGbrPerformed,
		setIsGbrPerformed,
		lotNumber,
		setLotNumber,
		serialNumber,
		setSerialNumber,
		boneDensity,
		warrantyPassport,
		soapDiary,
		handleApplyTemplate,
		handleCommitProtocol,
	};
}

export type ImplantologyStudioState = ReturnType<typeof useImplantologyStudioState>;
