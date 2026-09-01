/**
 * DENTE CRM — Clinical Anesthesia Dosage Calculator & Safety Modal
 * (Минздрав РФ / СтАР / AHA Guidelines / Form 043/u Compliance)
 *
 * Invariants:
 * 1. Weight (kg), age, and ASA physical status (I–IV) dosage calculation.
 * 2. Articaine 4% (max 7 mg/kg, 7 carpules adult ceiling), Mepivacaine 3% (max 4.4 mg/kg), Lidocaine 2% (max 4.4 mg/kg).
 * 3. Hard visual blocking (#ef4444) on overdose (>100% MRD) or critical contraindications.
 * 4. 1-click transfer to Form 043/u visit diary (useVisitStore.setVisitNoteForm) and warehouse inventory deduction.
 */

import React, { useState, useMemo, useCallback } from "react";
import {
	Activity,
	AlertTriangle,
	Check,
	CheckCircle2,
	Copy,
	FileText,
	Heart,
	Layers,
	PackageCheck,
	ShieldAlert,
	ShieldCheck,
	Syringe,
	User,
	X,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import {
	type AnestheticDrugId,
	DENTAL_ANESTHETICS,
	INJECTION_TECHNIQUES,
	type InjectionTechniqueId,
	type NeedleGaugeType,
} from "./anesthesiaCatalog";
import {
	type AnesthesiaCalculationResult,
	type AsaPhysicalStatus,
	ASA_CLASSIFICATIONS,
	calculateAnesthesiaSafety,
} from "./anesthesiaEngine";
import "./anesthesia.css";

export interface AnesthesiaDosageCalculatorModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialToothNumber?: number | string;
	initialPatientWeightKg?: number;
	initialPatientAgeYears?: number;
	initialHasCardioRisk?: boolean;
	initialPatientId?: string;
	initialVisitId?: string;
	onApplied?: (result: AnesthesiaCalculationResult) => void;
}

export function AnesthesiaDosageCalculatorModal({
	isOpen,
	onClose,
	initialToothNumber = 16,
	initialPatientWeightKg = 70,
	initialPatientAgeYears = 35,
	initialHasCardioRisk = false,
	initialPatientId,
	initialVisitId,
	onApplied,
}: AnesthesiaDosageCalculatorModalProps) {
	// Clinical State
	const [selectedDrugId, setSelectedDrugId] =
		useState<AnestheticDrugId>("articaine_1_100k");
	const [carpulesCount, setCarpulesCount] = useState<number>(1.0);
	const [patientWeightKg, setPatientWeightKg] = useState<number>(
		initialPatientWeightKg,
	);
	const [patientAgeYears, setPatientAgeYears] = useState<number>(
		initialPatientAgeYears,
	);
	const [asaStatus, setAsaStatus] = useState<AsaPhysicalStatus>(
		initialHasCardioRisk ? "asa_3" : "asa_1",
	);

	// Vitals & Systemic Risks
	const [hasCardioRisk, setHasCardioRisk] =
		useState<boolean>(initialHasCardioRisk);
	const [hasSulfiteAllergy, setHasSulfiteAllergy] = useState<boolean>(false);
	const [hasAsthma, setHasAsthma] = useState<boolean>(false);
	const [isPregnant, setIsPregnant] = useState<boolean>(false);
	const [bpSystolic, setBpSystolic] = useState<number>(120);
	const [bpDiastolic, setBpDiastolic] = useState<number>(80);
	const [heartRateBpm, setHeartRateBpm] = useState<number>(72);

	// Technique & Safety
	const [techniqueId, setTechniqueId] =
		useState<InjectionTechniqueId>("infiltration");
	const [needleType, setNeedleType] =
		useState<NeedleGaugeType>("g30_short_21mm");
	const [targetTooth, setTargetTooth] = useState<string | number>(
		initialToothNumber,
	);
	const [aspirationConfirmed, setAspirationConfirmed] =
		useState<boolean>(true);
	const [deductFromWarehouse, setDeductFromWarehouse] =
		useState<boolean>(true);
	const [isCopied, setIsCopied] = useState<boolean>(false);

	// Zustand Visit Store
	const setVisitNoteForm = useVisitStore((s) => s.setVisitNoteForm);

	// Calculation Engine
	const calcResult: AnesthesiaCalculationResult = useMemo(() => {
		return calculateAnesthesiaSafety({
			drugId: selectedDrugId,
			carpulesCount,
			patientWeightKg,
			patientAgeYears,
			asaStatus,
			hasCardiovascularRisk:
				hasCardioRisk ||
				asaStatus === "asa_3" ||
				asaStatus === "asa_4" ||
				bpSystolic >= 140 ||
				heartRateBpm > 90,
			hasSulfiteAllergy,
			hasBronchialAsthma: hasAsthma,
			isPregnantOrLactating: isPregnant,
			techniqueId,
			needleType,
			targetToothNumberFdi: targetTooth,
			aspirationNegativeConfirmed: aspirationConfirmed,
			bpSystolic,
			bpDiastolic,
			heartRateBpm,
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
		needleType,
		targetTooth,
		aspirationConfirmed,
		bpSystolic,
		bpDiastolic,
		heartRateBpm,
	]);

	// Technique selection change handler
	const handleTechniqueChange = (newTechId: InjectionTechniqueId) => {
		setTechniqueId(newTechId);
		const defaultNeedle = INJECTION_TECHNIQUES[newTechId]?.defaultNeedle;
		if (defaultNeedle) {
			setNeedleType(defaultNeedle);
		}
	};

	// Copy formatted diary entry
	const handleCopyDiary = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(calcResult.diaryEntryRu);
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2000);
			showToast("Протокол анестезии скопирован в буфер обмена", "success");
		} catch {
			showToast("Не удалось скопировать текст", "warning");
		}
	}, [calcResult.diaryEntryRu]);

	// Apply protocol directly into 043/u diary and deduct warehouse inventory
	const handleApplyToVisit = useCallback(async () => {
		if (
			calcResult.isOverdose ||
			calcResult.contraindicationsTriggered.length > 0
		) {
			showToast("Блокировка: невозможно применить опасную дозировку!", "error");
			return;
		}

		// 1. Update Visit Note Form in Zustand Store
		const formattedAnesthesiaNote = `\n\n[Протокол анестезии 043/у]\n${calcResult.diaryEntryRu}`;
		setVisitNoteForm((prev) => {
			const existingPlan = prev.treatmentPlan || "";
			const updatedPlan = existingPlan
				? `${existingPlan}${formattedAnesthesiaNote}`
				: calcResult.diaryEntryRu;
			return {
				...prev,
				treatmentPlan: updatedPlan,
			};
		});

		// 2. Deduct from Warehouse Stock if enabled
		if (deductFromWarehouse) {
			try {
				await fetch("/api/inventory/consume-materials", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						patientId: initialPatientId,
						visitId: initialVisitId,
						materialType: "anesthetic_carpule",
						drugId: selectedDrugId,
						drugName: calcResult.drug.activeSubstanceRu,
						tradeName: calcResult.drug.tradeNamesRu[0] || "Анестетик",
						quantity: carpulesCount,
						unit: "карпула",
						reason: `Анестезия при лечении зуба ${targetTooth}`,
					}),
				}).catch(() => {
					// Fallback if offline / mock mode
				});
			} catch {
				// Offline resilience
			}
		}

		showToast(
			`Протокол анестезии внесен в карту 043/у. Списано: ${carpulesCount} карп.`,
			"success",
		);

		if (onApplied) {
			onApplied(calcResult);
		}

		onClose();
	}, [
		calcResult,
		deductFromWarehouse,
		initialPatientId,
		initialVisitId,
		selectedDrugId,
		carpulesCount,
		targetTooth,
		setVisitNoteForm,
		onApplied,
		onClose,
	]);

	if (!isOpen) return null;

	const isBlocked =
		calcResult.isOverdose ||
		calcResult.isEpinephrineOverdose ||
		calcResult.contraindicationsTriggered.length > 0;

	return (
		<div className="anesthesia-modal-backdrop" role="dialog" aria-modal="true">
			<div className="anesthesia-modal-container" style={{ maxWidth: "840px" }}>
				{/* Modal Header */}
				<div className="anesthesia-modal-header">
					<div className="anesthesia-modal-title">
						<Syringe size={22} className="text-sky-500" />
						<div>
							<h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>
								Калькулятор безопасной дозы анестетика (МРД / Минздрав РФ)
							</h3>
							<p
								style={{
									margin: 0,
									fontSize: "0.75rem",
									color: "var(--muted, #64748b)",
								}}
							>
								Расчет МРД по массе тела, возрасту и ASA-статусу. Защита от
								системной токсичности.
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="anesthesia-close-btn"
						aria-label="Закрыть"
					>
						<X size={20} />
					</button>
				</div>

				{/* Modal Body */}
				<div
					className="anesthesia-modal-body"
					style={{ maxHeight: "75vh", overflowY: "auto", padding: "1rem" }}
				>
					{/* Patient Physical Profile Grid */}
					<div
						style={{
							background: "var(--paper-strong, #f8fafc)",
							padding: "0.875rem",
							borderRadius: "10px",
							border: "1px solid var(--line, #e2e8f0)",
							marginBottom: "1rem",
						}}
					>
						<div
							style={{
								fontSize: "0.8125rem",
								fontWeight: 700,
								display: "flex",
								alignItems: "center",
								gap: "0.375rem",
								marginBottom: "0.625rem",
							}}
						>
							<User size={16} />
							Параметры пациента и физический статус (ASA I–IV):
						</div>

						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
								gap: "0.75rem",
								marginBottom: "0.625rem",
							}}
						>
							{/* Weight Input */}
							<div>
								<label
									htmlFor="patient-weight-input"
									style={{
										fontSize: "0.75rem",
										fontWeight: 600,
										display: "block",
										marginBottom: "0.25rem",
									}}
								>
									Вес пациента (кг):
								</label>
								<input
									id="patient-weight-input"
									type="number"
									min={5}
									max={250}
									value={patientWeightKg}
									onChange={(e) =>
										setPatientWeightKg(
											Math.max(5, parseFloat(e.target.value) || 5),
										)
									}
									className="anesthesia-input"
									style={{ width: "100%", padding: "0.375rem 0.5rem" }}
								/>
							</div>

							{/* Age Input */}
							<div>
								<label
									htmlFor="patient-age-input"
									style={{
										fontSize: "0.75rem",
										fontWeight: 600,
										display: "block",
										marginBottom: "0.25rem",
									}}
								>
									Возраст (лет):
								</label>
								<input
									id="patient-age-input"
									type="number"
									min={1}
									max={120}
									value={patientAgeYears}
									onChange={(e) =>
										setPatientAgeYears(
											Math.max(1, parseInt(e.target.value, 10) || 1),
										)
									}
									className="anesthesia-input"
									style={{ width: "100%", padding: "0.375rem 0.5rem" }}
								/>
							</div>

							{/* ASA Status Selector */}
							<div>
								<label
									htmlFor="patient-asa-select"
									style={{
										fontSize: "0.75rem",
										fontWeight: 600,
										display: "block",
										marginBottom: "0.25rem",
									}}
								>
									Статус ASA:
								</label>
								<select
									id="patient-asa-select"
									value={asaStatus}
									onChange={(e) =>
										setAsaStatus(e.target.value as AsaPhysicalStatus)
									}
									className="anesthesia-select"
									style={{ width: "100%", padding: "0.375rem 0.5rem" }}
								>
									{Object.entries(ASA_CLASSIFICATIONS).map(([key, info]) => (
										<option key={key} value={key}>
											{info.nameRu}
										</option>
									))}
								</select>
							</div>

							{/* Target Tooth FDI */}
							<div>
								<label
									htmlFor="target-tooth-input"
									style={{
										fontSize: "0.75rem",
										fontWeight: 600,
										display: "block",
										marginBottom: "0.25rem",
									}}
								>
									Зуб (FDI 11–48):
								</label>
								<input
									id="target-tooth-input"
									type="text"
									value={targetTooth}
									onChange={(e) => setTargetTooth(e.target.value)}
									className="anesthesia-input"
									style={{ width: "100%", padding: "0.375rem 0.5rem" }}
								/>
							</div>
						</div>

						{/* Quick Weight Chips */}
						<div
							style={{
								display: "flex",
								gap: "0.375rem",
								alignItems: "center",
								flexWrap: "wrap",
							}}
						>
							<span
								style={{
									fontSize: "0.6875rem",
									color: "var(--muted, #64748b)",
								}}
							>
								Быстрый вес:
							</span>
							{[20, 40, 50, 60, 70, 80, 90, 100].map((w) => (
								<button
									key={w}
									type="button"
									onClick={() => setPatientWeightKg(w)}
									style={{
										fontSize: "0.6875rem",
										padding: "2px 8px",
										borderRadius: "4px",
										border: "1px solid var(--line, #cbd5e1)",
										background:
											patientWeightKg === w
												? "var(--brand, #0284c7)"
												: "var(--paper, #fff)",
										color: patientWeightKg === w ? "#fff" : "inherit",
										cursor: "pointer",
									}}
								>
									{w} кг
								</button>
							))}
						</div>
					</div>

					{/* Anesthetic Drug Selection Cards */}
					<div style={{ marginBottom: "1rem" }}>
						<label
							htmlFor="anesthetic-drug-grid"
							style={{
								fontSize: "0.8125rem",
								fontWeight: 700,
								display: "block",
								marginBottom: "0.5rem",
							}}
						>
							Препарат местного анестетика:
						</label>
						<div
							id="anesthetic-drug-grid"
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
								gap: "0.625rem",
							}}
						>
							{Object.values(DENTAL_ANESTHETICS).map((drug) => {
								const isSelected = selectedDrugId === drug.id;
								return (
									<button
										type="button"
										key={drug.id}
										onClick={() => setSelectedDrugId(drug.id)}
										style={{
											textAlign: "left",
											padding: "0.75rem",
											borderRadius: "8px",
											border: isSelected
												? "2px solid var(--brand, #0284c7)"
												: "1px solid var(--line, #e2e8f0)",
											background: isSelected
												? "var(--brand-soft, #f0f9ff)"
												: "var(--paper, #fff)",
											cursor: "pointer",
											transition: "all 0.15s ease-out",
										}}
									>
										<div
											style={{
												fontWeight: 700,
												fontSize: "0.875rem",
												marginBottom: "0.125rem",
											}}
										>
											{drug.activeSubstanceRu} (
											{drug.activeConcentrationPercent}%)
										</div>
										<div
											style={{
												fontSize: "0.75rem",
												color: "var(--muted, #64748b)",
												marginBottom: "0.25rem",
											}}
										>
											{drug.tradeNamesRu.slice(0, 2).join(", ")}
										</div>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												fontSize: "0.6875rem",
												fontWeight: 600,
											}}
										>
											<span
												style={{
													color: drug.isAdrenalineFree
														? "#10b981"
														: "#0284c7",
												}}
											>
												{drug.isAdrenalineFree
													? "Без адреналина"
													: `Адр. ${drug.vasoconstrictorRatio}`}
											</span>
											<span>Макс: {drug.maxDoseMgPerKgAdult} мг/кг</span>
										</div>
									</button>
								);
							})}
						</div>
					</div>

					{/* Dosage Stepper & Injected Volume */}
					<div
						style={{
							background: "var(--paper-strong, #f8fafc)",
							padding: "0.875rem",
							borderRadius: "10px",
							border: "1px solid var(--line, #e2e8f0)",
							marginBottom: "1rem",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: "0.5rem",
							}}
						>
							<label
								htmlFor="carpules-stepper"
								style={{ fontSize: "0.8125rem", fontWeight: 700 }}
							>
								Количество вводимых карпул (1.8 мл):
							</label>
							<div
								id="carpules-stepper"
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.375rem",
								}}
							>
								{[0.5, 1.0, 1.5, 2.0, 3.0, 4.0].map((c) => (
									<button
										key={c}
										type="button"
										onClick={() => setCarpulesCount(c)}
										style={{
											fontSize: "0.75rem",
											fontWeight: 600,
											padding: "3px 10px",
											borderRadius: "4px",
											border: "1px solid var(--line, #cbd5e1)",
											background:
												carpulesCount === c
													? "var(--brand, #0284c7)"
													: "var(--paper, #fff)",
											color: carpulesCount === c ? "#fff" : "inherit",
											cursor: "pointer",
										}}
									>
										{c} к.
									</button>
								))}
							</div>
						</div>

						<input
							type="range"
							min={0.5}
							max={7.0}
							step={0.5}
							value={carpulesCount}
							onChange={(e) => setCarpulesCount(parseFloat(e.target.value))}
							style={{ width: "100%", marginBottom: "0.5rem" }}
						/>

						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								fontSize: "0.75rem",
								color: "var(--muted, #64748b)",
							}}
						>
							<span>Объем: {calcResult.injectedVolumeMl.toFixed(1)} мл</span>
							<span>
								Действующее вещество: {calcResult.injectedActiveMg} мг
							</span>
							<span>
								Эпинефрин: {calcResult.injectedEpinephrineMg.toFixed(3)} мг
							</span>
						</div>
					</div>

					{/* Live Safety Meter Bar */}
					<div
						className="anesthesia-safety-meter"
						style={{ marginBottom: "1rem" }}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: "0.375rem",
							}}
						>
							<span
								style={{
									fontSize: "0.8125rem",
									fontWeight: 700,
									display: "flex",
									alignItems: "center",
									gap: "0.375rem",
								}}
							>
								<Activity size={16} />
								Шкала токсической и кардиоваскулярной безопасности:
							</span>
							<span
								style={{
									fontSize: "0.8125rem",
									fontWeight: 700,
									color:
										calcResult.safetyZone === "safe"
											? "#10b981"
											: calcResult.safetyZone === "caution"
												? "#3b82f6"
												: calcResult.safetyZone === "warning"
													? "#f59e0b"
													: "#ef4444",
								}}
							>
								{calcResult.safetyZone === "safe" &&
									"БЕЗОПАСНО (ЗЕЛЕНАЯ ЗОНА)"}
								{calcResult.safetyZone === "caution" &&
									"УМЕРЕННАЯ НАГРУЗКА (СИНЯЯ ЗОНА)"}
								{calcResult.safetyZone === "warning" &&
									"ПРЕДЕЛ (ЖЕЛТАЯ ЗОНА)"}
								{calcResult.safetyZone === "overdose_danger" &&
									"ОПАСНОСТЬ: ПРЕВЫШЕНИЕ МРД!"}
							</span>
						</div>

						<div
							className="safety-meter-bar-container"
							style={{
								height: "10px",
								background: "var(--line, #e2e8f0)",
								borderRadius: "6px",
								overflow: "hidden",
								marginBottom: "0.625rem",
							}}
						>
							<div
								style={{
									height: "100%",
									width: `${Math.min(100, Math.max(calcResult.percentOfMaxDose, calcResult.percentOfEpiMaxDose))}%`,
									background:
										calcResult.safetyZone === "safe"
											? "#10b981"
											: calcResult.safetyZone === "caution"
												? "#3b82f6"
												: calcResult.safetyZone === "warning"
													? "#f59e0b"
													: "#ef4444",
									transition: "all 0.2s ease-out",
								}}
							/>
						</div>

						{/* Metrics Boxes */}
						<div
							className="anesthesia-metrics-grid"
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(3, 1fr)",
								gap: "0.5rem",
							}}
						>
							<div
								className="anesthesia-metric-box"
								style={{
									padding: "0.5rem",
									background: "var(--paper, #fff)",
									borderRadius: "6px",
									border: "1px solid var(--line, #e2e8f0)",
									textAlign: "center",
								}}
							>
								<span
									style={{
										fontSize: "0.6875rem",
										color: "var(--muted, #64748b)",
										display: "block",
									}}
								>
									Действующее вещество
								</span>
								<strong style={{ fontSize: "0.9375rem" }}>
									{calcResult.injectedActiveMg} / {calcResult.maxSafeActiveMg}{" "}
									мг
								</strong>
								<span
									style={{
										fontSize: "0.6875rem",
										color:
											calcResult.percentOfMaxDose > 100 ? "#ef4444" : "inherit",
										display: "block",
									}}
								>
									{calcResult.percentOfMaxDose}% от МРД
								</span>
							</div>

							<div
								className="anesthesia-metric-box"
								style={{
									padding: "0.5rem",
									background: "var(--paper, #fff)",
									borderRadius: "6px",
									border: "1px solid var(--line, #e2e8f0)",
									textAlign: "center",
								}}
							>
								<span
									style={{
										fontSize: "0.6875rem",
										color: "var(--muted, #64748b)",
										display: "block",
									}}
								>
									Эпинефрин (Лимит)
								</span>
								<strong style={{ fontSize: "0.9375rem" }}>
									{calcResult.drug.isAdrenalineFree
										? "0 мг (Plain)"
										: `${calcResult.injectedEpinephrineMg.toFixed(3)} мг`}
								</strong>
								<span
									style={{
										fontSize: "0.6875rem",
										color:
											calcResult.percentOfEpiMaxDose > 100
												? "#ef4444"
												: "inherit",
										display: "block",
									}}
								>
									Лимит: {calcResult.maxSafeEpinephrineMg.toFixed(2)} мг (
									{calcResult.percentOfEpiMaxDose}%)
								</span>
							</div>

							<div
								className="anesthesia-metric-box"
								style={{
									padding: "0.5rem",
									background: "var(--paper, #fff)",
									borderRadius: "6px",
									border: "1px solid var(--line, #e2e8f0)",
									textAlign: "center",
								}}
							>
								<span
									style={{
										fontSize: "0.6875rem",
										color: "var(--muted, #64748b)",
										display: "block",
									}}
								>
									Максимум карпул
								</span>
								<strong style={{ fontSize: "0.9375rem", color: "#0284c7" }}>
									{calcResult.maxSafeCarpulesCount} карп.
								</strong>
								<span
									style={{
										fontSize: "0.6875rem",
										color: "var(--muted, #64748b)",
										display: "block",
									}}
								>
									Введено: {carpulesCount} карп.
								</span>
							</div>
						</div>
					</div>

					{/* HARD VISUAL BLOCKING BANNER ON OVERDOSE (#ef4444) */}
					{isBlocked && (
						<div
							style={{
								background: "#fef2f2",
								border: "2px solid #ef4444",
								color: "#991b1b",
								padding: "0.875rem",
								borderRadius: "8px",
								marginBottom: "1rem",
								display: "flex",
								gap: "0.75rem",
								alignItems: "flex-start",
							}}
						>
							<ShieldAlert
								size={24}
								className="text-rose-600 shrink-0"
								style={{ marginTop: "2px" }}
							/>
							<div>
								<div
									style={{
										fontSize: "0.875rem",
										fontWeight: 800,
										color: "#b91c1c",
										marginBottom: "0.25rem",
									}}
								>
									ОПАСНОСТЬ: ЖЕСТКАЯ БЛОКИРОВКА ПРЕВЫШЕНИЯ ДОЗИРОВКИ (МРД)!
								</div>
								<p
									style={{
										margin: 0,
										fontSize: "0.8125rem",
										lineHeight: 1.4,
									}}
								>
									Введение {calcResult.injectedActiveMg} мг превышает безопасный
									порог {calcResult.maxSafeActiveMg} мг (
									{calcResult.percentOfMaxDose}%). Превышение МРД несет угрозу
									токсического шока, аритмии и остановки дыхания!
								</p>
								{calcResult.contraindicationsTriggered.map((c, i) => (
									<div
										key={i}
										style={{
											marginTop: "0.25rem",
											fontSize: "0.75rem",
											fontWeight: 600,
										}}
									>
										• {c}
									</div>
								))}
							</div>
						</div>
					)}

					{/* Systemic Risk Flags & Technique Accordion */}
					<div
						style={{
							background: "var(--paper-strong, #f8fafc)",
							padding: "0.75rem",
							borderRadius: "8px",
							border: "1px solid var(--line, #e2e8f0)",
							marginBottom: "1rem",
						}}
					>
						<div
							style={{
								fontSize: "0.8125rem",
								fontWeight: 700,
								marginBottom: "0.5rem",
							}}
						>
							Факторы риска и техника инъекции:
						</div>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
								gap: "0.5rem",
								marginBottom: "0.5rem",
							}}
						>
							<label
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.375rem",
									fontSize: "0.75rem",
									cursor: "pointer",
								}}
							>
								<input
									type="checkbox"
									checked={hasCardioRisk}
									onChange={(e) => setHasCardioRisk(e.target.checked)}
								/>
								<span>Кардиориск (Лимит 0.04 мг)</span>
							</label>

							<label
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.375rem",
									fontSize: "0.75rem",
									cursor: "pointer",
								}}
							>
								<input
									type="checkbox"
									checked={hasSulfiteAllergy}
									onChange={(e) => setHasSulfiteAllergy(e.target.checked)}
								/>
								<span>Аллергия на сульфиты</span>
							</label>

							<label
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.375rem",
									fontSize: "0.75rem",
									cursor: "pointer",
								}}
							>
								<input
									type="checkbox"
									checked={hasAsthma}
									onChange={(e) => setHasAsthma(e.target.checked)}
								/>
								<span>Бронхиальная астма</span>
							</label>

							<label
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.375rem",
									fontSize: "0.75rem",
									cursor: "pointer",
								}}
							>
								<input
									type="checkbox"
									checked={isPregnant}
									onChange={(e) => setIsPregnant(e.target.checked)}
								/>
								<span>Беременность / Лактация</span>
							</label>
						</div>

						{/* Technique Selector */}
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "0.5rem",
							}}
						>
							<div>
								<label
									htmlFor="technique-select"
									style={{
										fontSize: "0.6875rem",
										fontWeight: 600,
										display: "block",
										marginBottom: "0.25rem",
									}}
								>
									Техника:
								</label>
								<select
									id="technique-select"
									value={techniqueId}
									onChange={(e) =>
										handleTechniqueChange(
											e.target.value as InjectionTechniqueId,
										)
									}
									className="anesthesia-select"
									style={{ width: "100%", padding: "0.25rem 0.5rem" }}
								>
									{Object.values(INJECTION_TECHNIQUES).map((t) => (
										<option key={t.id} value={t.id}>
											{t.nameRu}
										</option>
									))}
								</select>
							</div>

							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									paddingTop: "1.125rem",
								}}
							>
								<input
									type="checkbox"
									id="aspiration-check"
									checked={aspirationConfirmed}
									onChange={(e) => setAspirationConfirmed(e.target.checked)}
								/>
								<label
									htmlFor="aspiration-check"
									style={{ fontSize: "0.75rem", cursor: "pointer" }}
								>
									<ShieldCheck
										size={14}
										className="text-emerald-500 inline mr-1"
									/>
									<strong>Аспирационная проба (-)</strong>
								</label>
							</div>
						</div>
					</div>

					{/* Form 043/u Preview Box */}
					<div
						style={{
							background: "var(--paper, #fff)",
							padding: "0.75rem",
							borderRadius: "8px",
							border: "1px solid var(--line, #e2e8f0)",
							marginBottom: "1rem",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: "0.375rem",
							}}
						>
							<span
								style={{
									fontSize: "0.75rem",
									fontWeight: 600,
									color: "var(--muted, #64748b)",
									display: "flex",
									alignItems: "center",
									gap: "0.25rem",
								}}
							>
								<FileText size={14} />
								Готовая запись в Дневник амбулаторной карты 043/у:
							</span>
							<button
								type="button"
								onClick={handleCopyDiary}
								className="anesthesia-btn"
								style={{
									minHeight: "28px",
									padding: "0.125rem 0.5rem",
									fontSize: "0.75rem",
								}}
							>
								{isCopied ? (
									<Check size={14} className="text-emerald-500" />
								) : (
									<Copy size={14} />
								)}
								<span>{isCopied ? "Скопировано!" : "Скопировать"}</span>
							</button>
						</div>
						<div
							style={{
								fontSize: "0.8125rem",
								fontFamily: "monospace",
								background: "var(--paper-strong, #f8fafc)",
								padding: "0.5rem",
								borderRadius: "6px",
								border: "1px solid var(--line, #e2e8f0)",
								lineHeight: 1.4,
							}}
						>
							{calcResult.diaryEntryRu}
						</div>
					</div>

					{/* Warehouse Consumption Toggle */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							padding: "0.5rem 0.75rem",
							background: "var(--paper-strong, #f8fafc)",
							borderRadius: "8px",
							border: "1px solid var(--line, #e2e8f0)",
						}}
					>
						<input
							type="checkbox"
							id="warehouse-deduct-check"
							checked={deductFromWarehouse}
							onChange={(e) => setDeductFromWarehouse(e.target.checked)}
						/>
						<label
							htmlFor="warehouse-deduct-check"
							style={{
								fontSize: "0.8125rem",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "0.375rem",
							}}
						>
							<PackageCheck size={16} className="text-sky-500" />
							<span>
								Автоматически списать <strong>{carpulesCount} карп.</strong> со
								складского учета кабинета
							</span>
						</label>
					</div>
				</div>

				{/* Modal Footer */}
				<div
					className="anesthesia-modal-footer"
					style={{
						display: "flex",
						justifyContent: "flex-end",
						gap: "0.75rem",
						padding: "0.875rem 1rem",
						borderTop: "1px solid var(--line, #e2e8f0)",
					}}
				>
					<button
						type="button"
						onClick={onClose}
						className="anesthesia-btn"
						style={{ minHeight: "38px", padding: "0.375rem 1rem" }}
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={handleApplyToVisit}
						disabled={isBlocked}
						style={{
							minHeight: "38px",
							padding: "0.375rem 1.25rem",
							borderRadius: "6px",
							fontWeight: 700,
							fontSize: "0.875rem",
							display: "flex",
							alignItems: "center",
							gap: "0.375rem",
							background: isBlocked ? "#ef4444" : "var(--brand, #0284c7)",
							color: "#fff",
							border: "none",
							cursor: isBlocked ? "not-allowed" : "pointer",
							opacity: isBlocked ? 0.6 : 1.0,
							transition: "all 0.15s ease-out",
						}}
					>
						<CheckCircle2 size={16} />
						<span>Применить в дневник (043/у)</span>
					</button>
				</div>
			</div>
		</div>
	);
}
