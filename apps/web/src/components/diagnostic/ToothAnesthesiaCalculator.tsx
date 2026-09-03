import React, { useState, useMemo } from "react";
import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Heart,
	Info,
	ShieldAlert,
	ShieldCheck,
	SlidersHorizontal,
	Syringe,
} from "lucide-react";
import {
	type AnestheticDrugId,
	DENTAL_ANESTHETICS,
	type InjectionTechniqueId,
	INJECTION_TECHNIQUES,
} from "../anesthesia/anesthesiaCatalog";
import {
	calculateAnesthesiaSafety,
	resolveClinicalDefaultWeightKg,
	type AnesthesiaCalculationResult,
	type AsaPhysicalStatus,
} from "../anesthesia/anesthesiaEngine";
import { showToast } from "../GlobalToast";

export interface ToothAnesthesiaCalculatorProps {
	toothNumber: number;
	initialWeightKg?: number | undefined;
	initialAgeYears?: number | undefined;
	hasCardioRisk?: boolean | undefined;
	hasSulfiteAllergy?: boolean | undefined;
	hasAsthma?: boolean | undefined;
	isPregnant?: boolean | undefined;
	onApplyAnesthesia?: ((diaryText: string, result: AnesthesiaCalculationResult) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
}

export const WEIGHT_PRESETS: readonly number[] = [15, 25, 45, 60, 70, 85, 100];

export const ToothAnesthesiaCalculator: React.FC<ToothAnesthesiaCalculatorProps> = ({
	toothNumber,
	initialWeightKg,
	initialAgeYears = 35,
	hasCardioRisk = false,
	hasSulfiteAllergy = false,
	hasAsthma = false,
	isPregnant = false,
	onApplyAnesthesia,
	onInsertToProtocol,
}) => {
	const defaultWeight = resolveClinicalDefaultWeightKg(
		initialWeightKg,
		initialAgeYears,
		(initialAgeYears || 35) < 18,
	);
	const [patientWeightKg, setPatientWeightKg] = useState<number>(defaultWeight);
	const [patientAgeYears, setPatientAgeYears] = useState<number>(initialAgeYears || 35);
	const [selectedDrugId, setSelectedDrugId] = useState<AnestheticDrugId>(
		hasCardioRisk || hasSulfiteAllergy ? "mepivacaine_plain" : "articaine_1_200k",
	);
	const [carpulesCount, setCarpulesCount] = useState<number>(1.0);
	const [techniqueId, setTechniqueId] = useState<InjectionTechniqueId>(
		toothNumber > 30 && toothNumber % 10 >= 4 ? "mandibular_torus" : "infiltration",
	);
	const [asaStatus, setAsaStatus] = useState<AsaPhysicalStatus>(
		hasCardioRisk ? "asa_3" : "asa_1",
	);

	const calculationResult: AnesthesiaCalculationResult = useMemo(() => {
		const effectiveWeight = resolveClinicalDefaultWeightKg(
			patientWeightKg,
			patientAgeYears,
			patientAgeYears < 18,
		);
		return calculateAnesthesiaSafety({
			drugId: selectedDrugId,
			carpulesCount,
			patientWeightKg: effectiveWeight,
			patientAgeYears,
			asaStatus,
			hasCardiovascularRisk: hasCardioRisk,
			hasSulfiteAllergy,
			hasBronchialAsthma: hasAsthma,
			isPregnantOrLactating: isPregnant,
			techniqueId,
			needleType: "g30_short_21mm",
			targetToothNumberFdi: toothNumber,
			aspirationNegativeConfirmed: true,
		});
	}, [
		selectedDrugId,
		carpulesCount,
		patientWeightKg,
		patientAgeYears,
		asaStatus,
		hasCardioRisk,
		hasSulfiteAllergy,
		hasAsthma,
		isPregnant,
		techniqueId,
		toothNumber,
	]);

	const selectedDrug = DENTAL_ANESTHETICS[selectedDrugId];
	const maxSafeCarpules = calculationResult.maxSafeCarpulesCount;
	const isPediatric = patientAgeYears < 14;

	const handleApply = () => {
		if (calculationResult.contraindicationsTriggered.length > 0) {
			showToast(
				calculationResult.contraindicationsTriggered[0] || "Противопоказано при данном соматическом статусе!",
				"error",
			);
			return;
		}

		if (calculationResult.isOverdose && carpulesCount > 2.0) {
			showToast(
				`Превышена безопасная доза анестетика (${calculationResult.injectedActiveMg} мг > ${calculationResult.maxSafeActiveMg} мг)!`,
				"error",
			);
			return;
		}

		if (onApplyAnesthesia) {
			onApplyAnesthesia(calculationResult.diaryEntryRu, calculationResult);
		}
		if (onInsertToProtocol) {
			onInsertToProtocol(calculationResult.diaryEntryRu);
		}
		showToast(
			`Анестезия ${selectedDrug.tradeNamesRu[0] || selectedDrug.activeSubstanceRu} (${(carpulesCount * 1.7).toFixed(1)} мл) внесена в протокол зуба #${toothNumber}!`,
			"success",
		);
	};

	return (
		<div className="dente-warm-tool-card" data-testid="tooth-anesthesia-calculator">
			<div className="dente-warm-tool-header">
				<div className="dente-warm-tool-title-group">
					<Syringe size={18} color="var(--brand-primary, var(--teal))" />
					<h3 className="dente-warm-tool-title">
						Экспресс-калькулятор местной анестезии (МДД по весу)
					</h3>
				</div>
				<span
					className={`dente-warm-tag ${calculationResult.isOverdose ? "error" : "ok"}`}
				>
					{calculationResult.isOverdose ? "ПРЕВЫШЕНИЕ ДОЗЫ" : "БЕЗОПАСНО"}
				</span>
			</div>

			{/* Risk Alerts */}
			{(hasCardioRisk || hasSulfiteAllergy || hasAsthma || isPregnant) && (
				<div className="dente-somatic-alert-strip">
					<ShieldAlert size={16} color="var(--warn-fg, #ea580c)" />
					<div className="dente-somatic-alert-text">
						{hasCardioRisk && <span>• Риск ССЗ: рекомендован Скандонест (без адреналина). </span>}
						{hasSulfiteAllergy && <span>• Аллергия на сульфиты: эпинефрин запрещен. </span>}
						{hasAsthma && <span>• Бронхиальная астма: контроль бронхоспазма. </span>}
						{isPregnant && <span>• Беременность: только Артикаин 1:200 000. </span>}
					</div>
				</div>
			)}

			{/* Weight & Age Controls */}
			<div className="dente-anesthesia-params-grid">
				<div>
					<label className="dente-field-label">
						{`Вес пациента: `}<strong>{`${patientWeightKg} кг`}</strong> {isPediatric && <span style={{ color: "var(--warn-fg, #d97706)" }}>(ребенок)</span>}
					</label>
					<div className="dente-presets-chips-row">
						{WEIGHT_PRESETS.map((w) => (
							<button
								key={w}
								type="button"
								onClick={() => setPatientWeightKg(w)}
								className={`dente-weight-chip ${patientWeightKg === w ? "active" : ""}`}
							>
								{`${w} кг`}
							</button>
						))}
					</div>
					<input
						type="range"
						min="10"
						max="130"
						value={patientWeightKg}
						onChange={(e) => setPatientWeightKg(Number(e.target.value))}
						className="dente-range-slider"
					/>
				</div>

				<div>
					<label className="dente-field-label">
						{`Возраст: `}<strong>{`${patientAgeYears} лет`}</strong>
					</label>
					<input
						type="number"
						min="2"
						max="100"
						value={patientAgeYears}
						onChange={(e) => setPatientAgeYears(Number(e.target.value))}
						className="dente-number-input"
					/>
				</div>
			</div>

			{/* Drug Selector */}
			<div className="dente-drug-selection-box">
				<label className="dente-field-label">Выбор анестетика:</label>
				<div className="dente-drugs-grid">
					{Object.entries(DENTAL_ANESTHETICS).map(([key, drug]) => {
						const isSelected = selectedDrugId === key;
						const isRisky = (hasCardioRisk || hasSulfiteAllergy) && drug.vasoconstrictorRatio !== "none";
						return (
							<button
								key={key}
								type="button"
								onClick={() => setSelectedDrugId(key as AnestheticDrugId)}
								className={`dente-drug-card ${isSelected ? "selected" : ""} ${isRisky ? "risky" : ""}`}
								data-testid={`drug-btn-${key}`}
							>
								<div className="dente-drug-card-head">
									<span className="drug-name">{drug.tradeNamesRu[0]}</span>
									<span className="drug-conc">{drug.activeConcentrationPercent}%</span>
								</div>
								<div className="dente-drug-card-sub">
									{drug.vasoconstrictorRatio === "none" ? "Без вазоконстриктора" : drug.vasoconstrictorRatio}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Dosage & Carpules Stepper */}
			<div className="dente-dosage-stepper-box">
				<div className="dente-dosage-info-row">
					<div>
						<label className="dente-field-label">Количество карпул (по 1.7 мл):</label>
						<div className="dente-carpules-stepper">
							{[0.5, 1.0, 1.5, 2.0, 3.0].map((c) => (
								<button
									key={c}
									type="button"
									onClick={() => setCarpulesCount(c)}
									className={`dente-carpule-chip ${carpulesCount === c ? "active" : ""}`}
								>
									{`${c} карп. (${(c * 1.7).toFixed(1)} мл)`}
								</button>
							))}
							<input
								type="number"
								step="0.5"
								min="0.5"
								max="10"
								value={carpulesCount}
								onChange={(e) => setCarpulesCount(Number(e.target.value))}
								className="dente-carpule-input"
							/>
						</div>
					</div>

					<div className="dente-safety-gauge-card">
						<div className="dente-gauge-title">{`МДД по весу (${patientWeightKg} кг)`}</div>
						<div className="dente-gauge-value">
							<strong>{`${(carpulesCount * 1.7).toFixed(1)} мл`}</strong>{` / макс. ${(maxSafeCarpules * 1.7).toFixed(1)} мл`}
						</div>
						<div className="dente-gauge-bar-track">
							<div
								className={`dente-gauge-bar-fill ${calculationResult.isOverdose ? "overdose" : ""}`}
								style={{ width: `${Math.min(100, (carpulesCount / Math.max(1, maxSafeCarpules)) * 100)}%` }}
							/>
						</div>
						<div className="dente-gauge-sub">
							Введено активного вещества: {calculationResult.injectedActiveMg} мг (лимит {calculationResult.maxSafeActiveMg} мг)
						</div>
					</div>
				</div>
			</div>

			{/* Injection Technique */}
			<div className="dente-technique-row">
				<label className="dente-field-label">Методика обезболивания:</label>
				<select
					value={techniqueId}
					onChange={(e) => setTechniqueId(e.target.value as InjectionTechniqueId)}
					className="dente-select-full"
				>
					{Object.entries(INJECTION_TECHNIQUES).map(([id, t]) => (
						<option key={id} value={id}>
							{t.nameRu}
						</option>
					))}
				</select>
			</div>

			{/* Apply Button */}
			<div className="dente-anesthesia-footer">
				<button
					type="button"
					onClick={handleApply}
					disabled={false}
					className="dente-primary-action-btn cursor-pointer"
				>
					<Syringe size={16} />
					<span>Зафиксировать анестезию в протоколе приема 043/у</span>
				</button>
			</div>
		</div>
	);
};

export default ToothAnesthesiaCalculator;
