import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Flame, X } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import type {
	ChamberPointState,
	ClinicAutoclaveDevice,
	SterilizationCycleModalProps,
	SterilizerCategory,
} from "./sterilizationCycleTypes";
import {
	INITIAL_5_POINTS,
	STATUTORY_PACKAGING_PRESETS,
	STATUTORY_REGIMES_OPTIONS,
} from "./sterilizationCycleTypes";
import { CycleParametersForm } from "./CycleParametersForm";
import { PouchBarcodeScanner } from "./PouchBarcodeScanner";
import { CycleChemicalIndicatorSelect } from "./CycleChemicalIndicatorSelect";

export function SterilizationCycleModal({
	isOpen,
	onClose,
	onCycleCreated,
	defaultOperatorName = "Медсестра ЦСО",
	clinicDevices = [],
	initialDeviceType = "autoclave_class_b",
}: SterilizationCycleModalProps) {
	const [deviceCategory, setDeviceCategory] = useState<SterilizerCategory>(initialDeviceType);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string>(clinicDevices[0]?.id || "melag_vacuklav_23b");
	const [cycleDate, setCycleDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
	const [cycleTime, setCycleTime] = useState<string>(() => new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }));
	const [cycleNumber, setCycleNumber] = useState<number>(1);
	const [selectedRegimeId, setSelectedRegimeId] = useState<string>("steam_134_5min");
	const [actualTemp, setActualTemp] = useState<number>(134.5);
	const [actualPressure, setActualPressure] = useState<number>(2.12);
	const [actualDuration, setActualDuration] = useState<number>(5.5);

	const [itemsDescription, setItemsDescription] = useState<string>("Базовые смотровые лотки (зеркало, зонд, пинцет), терапевтический набор");
	const [packsCount, setPacksCount] = useState<number>(10);
	const [packagingPresetId, setPackagingPresetId] = useState<string>("kraft_bag_self_seal");
	const [scannedBarcode, setScannedBarcode] = useState<string>("");

	const [chamberPoints, setChamberPoints] = useState<ChamberPointState[]>(INITIAL_5_POINTS);
	const [indicatorExternalPassed, setIndicatorExternalPassed] = useState<boolean>(true);
	const [psoAzopyramNegative, setPsoAzopyramNegative] = useState<boolean>(true);
	const [psoPhenolphthaleinNegative, setPsoPhenolphthaleinNegative] = useState<boolean>(true);
	const [psoSampleSize, setPsoSampleSize] = useState<number>(3);
	const [operatorName, setOperatorName] = useState<string>(defaultOperatorName);
	const [submitting, setSubmitting] = useState<boolean>(false);

	const handleDeviceChange = (devId: string) => {
		setSelectedDeviceId(devId);
		const dev = clinicDevices.find((d) => d.id === devId);
		if (dev?.deviceType === "dry_heat_air") {
			setDeviceCategory("dry_heat_air");
			setSelectedRegimeId("dry_heat_180_60min");
			setActualTemp(180.5); setActualPressure(0.0); setActualDuration(60.0);
		} else {
			setDeviceCategory("autoclave_class_b");
			setSelectedRegimeId("steam_134_5min");
			setActualTemp(134.5); setActualPressure(2.12); setActualDuration(5.5);
		}
	};

	const handleRegimeChange = (regimeId: string) => {
		setSelectedRegimeId(regimeId);
		const reg = STATUTORY_REGIMES_OPTIONS.find((r) => r.id === regimeId);
		if (reg) {
			setActualTemp(reg.targetTemperature);
			setActualPressure(reg.targetPressure);
			setActualDuration(reg.exposureMinutes);
		}
	};

	const selectedRegime = useMemo(
		() => STATUTORY_REGIMES_OPTIONS.find((r) => r.id === selectedRegimeId) || STATUTORY_REGIMES_OPTIONS[0]!,
		[selectedRegimeId],
	);

	const selectedPackaging = useMemo(
		() => STATUTORY_PACKAGING_PRESETS.find((p) => p.id === packagingPresetId) || STATUTORY_PACKAGING_PRESETS[0]!,
		[packagingPresetId],
	);

	const expiryDateStr = useMemo(() => {
		if (selectedPackaging.shelfLifeDays === 0) return "Использование на приеме сразу";
		const d = new Date(cycleDate);
		d.setDate(d.getDate() + selectedPackaging.shelfLifeDays);
		return `${d.toLocaleDateString("ru-RU")} (до ${selectedPackaging.shelfLifeDays} сут.)`;
	}, [cycleDate, selectedPackaging]);

	const areAllChamberPointsPassed = useMemo(() => chamberPoints.every((p) => p.passed), [chamberPoints]);

	const isCycleSterileCompliant = useMemo(() => {
		const tempOk = actualTemp >= selectedRegime.targetTemperature - 0.5;
		const presOk = selectedRegime.targetPressure === 0 || actualPressure >= selectedRegime.targetPressure - 0.1;
		const timeOk = actualDuration >= selectedRegime.exposureMinutes;
		const psoOk = psoAzopyramNegative && psoPhenolphthaleinNegative && psoSampleSize >= 3;
		return tempOk && presOk && timeOk && areAllChamberPointsPassed && indicatorExternalPassed && psoOk;
	}, [actualTemp, actualPressure, actualDuration, selectedRegime, areAllChamberPointsPassed, indicatorExternalPassed, psoAzopyramNegative, psoPhenolphthaleinNegative, psoSampleSize]);

	const toggleChamberPoint = (pointIndex: 1 | 2 | 3 | 4 | 5) => {
		setChamberPoints((prev) => prev.map((p) => (p.pointIndex === pointIndex ? { ...p, passed: !p.passed } : p)));
	};

	const handleFillNormIn1Click = () => {
		setActualTemp(selectedRegime.targetTemperature + 0.5);
		setActualPressure(selectedRegime.targetPressure > 0 ? selectedRegime.targetPressure + 0.05 : 0);
		setActualDuration(selectedRegime.exposureMinutes);
		setChamberPoints((prev) => prev.map((p) => ({ ...p, passed: true })));
		setIndicatorExternalPassed(true);
		setPsoAzopyramNegative(true);
		setPsoPhenolphthaleinNegative(true);
		setPsoSampleSize(Math.max(3, Math.ceil(packsCount * 0.01)));
		showToast("Параметры цикла и пробы очистки установлены на 100% норму", "success");
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (submitting) return;

		try {
			setSubmitting(true);
			const dev = clinicDevices.find((d) => d.id === selectedDeviceId);
			const deviceName = dev?.brandModelRu || (deviceCategory === "dry_heat_air" ? "Сухожар ГП-20 СПУ" : "Автоклав Melag Vacuklav 23 B+");

			const payload = {
				deviceName, autoclaveId: selectedDeviceId, cycleNumber, date: cycleDate, time: cycleTime,
				regimeTitle: selectedRegime.nameRu, regimeId: selectedRegime.id,
				actualTemperature: actualTemp, actualPressure, actualDuration,
				itemsDescription, packsCount, packagingType: selectedPackaging.id,
				packagingNameRu: selectedPackaging.nameRu, shelfLifeDays: selectedPackaging.shelfLifeDays,
				barcode: scannedBarcode || undefined,
				chamberPoints: chamberPoints.map((p) => ({ pointIndex: p.pointIndex, code: p.code, labelRu: p.labelRu, passed: p.passed })),
				indicatorTradeName: selectedRegime.recommendedIndicatorName, indicatorClass: selectedRegime.indicatorClass,
				indicatorType: "class5_integrating", isCyclePassed: isCycleSterileCompliant, passedIndicator: isCycleSterileCompliant,
				operatorName, psoAzopyramNegative, psoPhenolphthaleinNegative, psoSampleSize,
				notes: `Контроль очистки: Азопирам ${psoAzopyramNegative ? "отриц." : "полож."}, Фенолфталеин ${psoPhenolphthaleinNegative ? "отриц." : "полож."} (${psoSampleSize} шт.). Термоиндикаторы: наружные ${indicatorExternalPassed ? "норма" : "брак"}, 5 точек ${areAllChamberPointsPassed ? "норма" : "брак"}. Срок: ${expiryDateStr}.`,
			};

			const res = await fetch("/api/registers/sterilization", {
				method: "POST", headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(payload),
			}).catch(() => null);

			if (res && res.ok) {
				showToast(`Цикл №${cycleNumber} зафиксирован в журнале автоклавирования`, "success");
			} else {
				const errData = res ? await res.json().catch(() => ({})) : {};
				showToast(errData.message || "Ошибка сохранения цикла стерилизации", "error");
			}

			if (onCycleCreated) onCycleCreated();
			onClose();
		} catch (err) {
			console.error("Sterilization cycle save error", err);
			showToast("Ошибка сохранения цикла стерилизации", "error");
		} finally {
			setSubmitting(false);
		}
	};

	if (!isOpen) return null;

	const modalContent = (
		<div className="sanpin-modal-overlay" role="dialog" aria-modal="true" aria-label="Фиксация цикла автоклавирования" onClick={onClose}>
			<div className="sanpin-modal" style={{ maxWidth: "680px", width: "95%" }} onClick={(e) => e.stopPropagation()}>
				<div className="sanpin-mobile-drag-handle" aria-hidden="true" />
				<div className="sanpin-modal-header" style={{ padding: "1.2rem 1.5rem" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
						<Flame size={22} color="#0284c7" />
						<div>
							<h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Зафиксировать цикл автоклава</h3>
							<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
								Пакетный цикл смены • Индикаторы 5 класса • Списание со склада
							</div>
						</div>
					</div>
					<button
						type="button" onClick={onClose} className="icon-button"
						style={{ minWidth: "44px", minHeight: "44px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
						aria-label="Закрыть"
					>
						<X size={20} />
					</button>
				</div>

				<form onSubmit={handleSubmit}>
					<div className="sanpin-modal-body" style={{ padding: "1.25rem 1.5rem", gap: "1rem", maxHeight: "75vh", overflowY: "auto" }}>
						<CycleParametersForm
							cycleDate={cycleDate} onCycleDateChange={setCycleDate}
							cycleTime={cycleTime} onCycleTimeChange={setCycleTime}
							cycleNumber={cycleNumber} onCycleNumberChange={setCycleNumber}
							selectedDeviceId={selectedDeviceId} onDeviceChange={handleDeviceChange}
							clinicDevices={clinicDevices}
							selectedRegimeId={selectedRegimeId} onRegimeChange={handleRegimeChange}
							selectedRegime={selectedRegime}
							actualTemp={actualTemp} onActualTempChange={setActualTemp}
							actualPressure={actualPressure} onActualPressureChange={setActualPressure}
							actualDuration={actualDuration} onActualDurationChange={setActualDuration}
							onFillNormIn1Click={handleFillNormIn1Click}
						/>

						<PouchBarcodeScanner
							itemsDescription={itemsDescription} onItemsDescriptionChange={setItemsDescription}
							packsCount={packsCount} onPacksCountChange={setPacksCount}
							packagingPresetId={packagingPresetId} onPackagingPresetIdChange={setPackagingPresetId}
							selectedPackaging={selectedPackaging} expiryDateStr={expiryDateStr}
							scannedBarcode={scannedBarcode} onScannedBarcodeChange={setScannedBarcode}
							operatorName={operatorName} onOperatorNameChange={setOperatorName}
						/>

						<CycleChemicalIndicatorSelect
							recommendedIndicatorName={selectedRegime.recommendedIndicatorName}
							indicatorExternalPassed={indicatorExternalPassed} onIndicatorExternalPassedChange={setIndicatorExternalPassed}
							chamberPoints={chamberPoints} onToggleChamberPoint={toggleChamberPoint}
							psoAzopyramNegative={psoAzopyramNegative} onPsoAzopyramChange={setPsoAzopyramNegative}
							psoPhenolphthaleinNegative={psoPhenolphthaleinNegative} onPsoPhenolphthaleinChange={setPsoPhenolphthaleinNegative}
							psoSampleSize={psoSampleSize} onPsoSampleSizeChange={setPsoSampleSize}
							isCycleSterileCompliant={isCycleSterileCompliant}
						/>
					</div>

					<div className="sanpin-modal-footer" style={{ padding: "1rem 1.5rem", gap: "0.75rem", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
						<button
							type="button" onClick={onClose} className="secondary-button"
							style={{ minHeight: "36px", padding: "0 1rem", fontSize: "0.85rem" }}
						>
							Отмена
						</button>
						<button
							type="submit" aria-busy={submitting} className="primary-button"
							style={{ minHeight: "36px", padding: "0 1.25rem", fontSize: "0.85rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px" }}
						>
							<Check size={16} />
							<span>{submitting ? "Сохранение..." : "Утвердить цикл стерилизации"}</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);

	if (typeof document === "undefined") return null;
	return createPortal(modalContent, document.body);
}

export default SterilizationCycleModal;
