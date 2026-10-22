import { useState } from "react";
import {
	createDefault5ChamberPoints,
	createForm257Record,
	evaluateCycleParameters,
	type ChamberPointEvaluation,
	type Form257Record,
} from "../autoclaveLogEngine.js";
import {
	STATUTORY_CHEMICAL_INDICATORS,
	STATUTORY_STERILIZATION_REGIMES,
	STATUTORY_STERILIZERS_CATALOG,
	type PackagingTypeId,
	type SterilizationRegimeId,
} from "../autoclaveLogPresets.js";
import { computeExpressStandardCycleValues, resolveAutoclaveCycleFallbacks } from "./newCycleDefaults";

export function useNewCycleState(
	onSaveRecord: (record: Form257Record) => void,
	defaultOperatorName = "Сотрудник клиники",
	defaultHeadNurseName = "Старшая медицинская сестра",
	latestCycleNumber = 1,
) {
	const [selectedSterilizerId, setSelectedSterilizerId] = useState<string>(
		STATUTORY_STERILIZERS_CATALOG[0]?.id ?? "autoclave-melag-vacuklav-23b",
	);
	const [selectedRegimeId, setSelectedRegimeId] = useState<SterilizationRegimeId>("steam_134_5min");
	const [cycleDate, setCycleDate] = useState<string>(new Date().toISOString().split("T")[0] ?? "2026-08-22");
	const [cycleNumber, setCycleNumber] = useState<number>(latestCycleNumber);
	const [itemsDescription, setItemsDescription] = useState<string>(
		"Наконечники турбинные и угловые, смотровые лотки (зеркала, зонды, пинцеты), хирургический инструмент",
	);
	const [packsCount, setPacksCount] = useState<number>(14);
	const [bixNumber, setBixNumber] = useState<string>("Бикс № 1 (КСКФ-3)");
	const [packagingType, setPackagingType] = useState<PackagingTypeId>("kraft_pouch_sealed");
	const [selectedIndicatorId, setSelectedIndicatorId] = useState<string>("intetest_v_134_5");
	const [operatorFullName, setOperatorFullName] = useState<string>(defaultOperatorName);
	const [headNurseFullName, setHeadNurseFullName] = useState<string>(defaultHeadNurseName);
	const [isHeadNurseVerified, setIsHeadNurseVerified] = useState<boolean>(true);
	const [notes, setNotes] = useState<string>("");

	const currentRegime = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === selectedRegimeId) ?? STATUTORY_STERILIZATION_REGIMES[0];
	const [actualTemp, setActualTemp] = useState<number>(currentRegime?.targetTemperatureCelsius ?? 134);
	const [actualPressure, setActualPressure] = useState<number>(currentRegime?.targetPressureBar ?? 2.1);
	const [actualTime, setActualTime] = useState<number>(currentRegime?.exposureTimeMinutes ?? 5);

	const [chamberPoints, setChamberPoints] = useState<ChamberPointEvaluation[]>(() =>
		createDefault5ChamberPoints(selectedIndicatorId, true),
	);

	const handleSelectRegime = (regimeId: SterilizationRegimeId) => {
		setSelectedRegimeId(regimeId);
		const reg = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === regimeId);
		if (reg) {
			setActualTemp(reg.targetTemperatureCelsius);
			setActualPressure(reg.targetPressureBar);
			setActualTime(reg.exposureTimeMinutes);
		}
	};

	const togglePointStatus = (pointIndex: 1 | 2 | 3 | 4 | 5) => {
		setChamberPoints((prev) =>
			prev.map((pt) => {
				if (pt.pointIndex === pointIndex) {
					const nextStatus = pt.status === "passed" ? "failed" : "passed";
					const indicator = STATUTORY_CHEMICAL_INDICATORS.find((ind) => ind.id === pt.indicatorId) ?? STATUTORY_CHEMICAL_INDICATORS[0];
					return {
						...pt, status: nextStatus,
						actualColorRu: nextStatus === "passed" ? (indicator?.passedColorRu ?? "Темно-коричневый") : (indicator?.failedColorRu ?? "Неполный переход"),
					};
				}
				return pt;
			}),
		);
	};

	const setAllPointsStatus = (passed: boolean) => {
		setChamberPoints(createDefault5ChamberPoints(selectedIndicatorId, passed));
	};

	const compliance = evaluateCycleParameters(selectedRegimeId, {
		actualTemperatureCelsius: actualTemp, actualPressureBar: actualPressure, actualExposureMinutes: actualTime,
	});

	const areAllPointsPassed = chamberPoints.every((pt) => pt.status === "passed");

	const handleExpressStandardCycle = () => {
		const filled = computeExpressStandardCycleValues({
			currentPacksCount: packsCount, currentBixNumber: bixNumber, currentOperatorName: operatorFullName, defaultOperatorName, selectedIndicatorId,
		});
		setSelectedRegimeId(filled.selectedRegimeId);
		setActualTemp(filled.actualTemp); setActualPressure(filled.actualPressure); setActualTime(filled.actualTime);
		setItemsDescription(filled.itemsDescription); setPacksCount(filled.packsCount); setBixNumber(filled.bixNumber);
		setPackagingType(filled.packagingType); setOperatorFullName(filled.operatorFullName); setChamberPoints([...filled.chamberPoints]);
	};

	const handleExpressDelicateCycle = () => {
		setSelectedRegimeId("steam_121_20min"); setActualTemp(121); setActualPressure(1.15); setActualTime(20);
		setItemsDescription("Термолабильные полимеры, резина, силикон, слепочные ложки");
		setPacksCount(packsCount > 0 ? packsCount : 8); setPackagingType("kraft_pouch_sealed");
		setChamberPoints(createDefault5ChamberPoints(selectedIndicatorId, true));
	};

	const handleExpressFastCycle = () => {
		setSelectedRegimeId("steam_134_quick"); setActualTemp(134); setActualPressure(2.1); setActualTime(3.5);
		setItemsDescription("Стоматологические наконечники турбинные и угловые (быстрый цикл)");
		setPacksCount(packsCount > 0 ? packsCount : 6); setPackagingType("kraft_pouch_sealed");
		setChamberPoints(createDefault5ChamberPoints(selectedIndicatorId, true));
	};

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		const { operatorStaffFullName, itemsDescriptionRu, packsCount: resolvedPacksCount } = resolveAutoclaveCycleFallbacks({
			operatorFullName, defaultOperatorName, itemsDescription, packsCount,
		});
		const newRecord = createForm257Record({
			date: cycleDate, cycleNumber, sterilizerId: selectedSterilizerId, regimeId: selectedRegimeId,
			sensors: { actualTemperatureCelsius: actualTemp, actualPressureBar: actualPressure, actualExposureMinutes: actualTime },
			itemsDescriptionRu, packsCount: resolvedPacksCount, bixNumber: bixNumber.trim() || undefined,
			packagingType, chamberPoints, operatorStaffFullName,
			headNurseSignatureFullName: isHeadNurseVerified ? headNurseFullName.trim() : undefined,
			isHeadNurseVerified, notes: notes.trim() || undefined,
		});
		onSaveRecord(newRecord);
		setCycleNumber((prev) => prev + 1);
	};

	return {
		selectedSterilizerId, setSelectedSterilizerId, selectedRegimeId, handleSelectRegime,
		cycleDate, setCycleDate, cycleNumber, setCycleNumber, itemsDescription, setItemsDescription,
		packsCount, setPacksCount, bixNumber, setBixNumber, packagingType, setPackagingType,
		selectedIndicatorId, setSelectedIndicatorId, operatorFullName, setOperatorFullName,
		headNurseFullName, setHeadNurseFullName, isHeadNurseVerified, setIsHeadNurseVerified,
		notes, setNotes, actualTemp, setActualTemp, actualPressure, setActualPressure,
		actualTime, setActualTime, chamberPoints, togglePointStatus, setAllPointsStatus,
		compliance, areAllPointsPassed, handleExpressStandardCycle, handleExpressDelicateCycle,
		handleExpressFastCycle, handleSave,
	};
}
