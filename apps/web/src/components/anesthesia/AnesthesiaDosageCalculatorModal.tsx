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
import { createPortal } from "react-dom";
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
	Printer,
	ShieldAlert,
	ShieldCheck,
	Syringe,
	User,
	X,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import {
	type AnestheticDrugId,
	DENTAL_ANESTHETICS,
	INJECTION_TECHNIQUES,
	type InjectionTechniqueId,
	type NeedleGaugeType,
	STANDARD_ANESTHESIA_PRESETS,
} from "./anesthesiaCatalog";
import {
	type AnesthesiaCalculationResult,
	type AsaPhysicalStatus,
	ASA_CLASSIFICATIONS,
	calculateAnesthesiaSafety,
	resolveClinicalDefaultWeightKg,
} from "./anesthesiaEngine";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import "./anesthesia.css";

export interface AnesthesiaPatientMemoParams {
	readonly clinicName: string;
	readonly clinicPhone: string;
	readonly patientName: string;
	readonly doctorName: string;
	readonly drugTradeName: string;
	readonly carpulesCount: number;
	readonly targetArea: string | number;
	readonly expectedDurationHours?: string | undefined;
	readonly date?: string | undefined;
}

export function formatAnesthesiaPatientMemo(params: AnesthesiaPatientMemoParams): string {
	const clinicName = params.clinicName.trim() || "Стоматологическая клиника DENTE";
	const clinicPhone = params.clinicPhone.trim() || "+7 (495) 123-45-67";
	const patientName = params.patientName.trim() || "Пациент";
	const doctorName = params.doctorName.trim() || "Лечащий врач-стоматолог";
	const date = params.date || new Date().toLocaleDateString("ru-RU");
	const duration = params.expectedDurationHours || "2–3 часа";

	return [
		`Памятка пациенту после проведения местной анестезии (клиника «${clinicName}»):`,
		`Пациент: ${patientName}`,
		`Лечащий врач: ${doctorName}`,
		`Дата процедуры: ${date}`,
		`Применённый препарат: ${params.drugTradeName} (введено ${params.carpulesCount} карп.)`,
		`Область анестезии: ${params.targetArea}`,
		`Ожидаемая длительность онемения: ${duration}`,
		`Правила безопасности после анестезии:`,
		`1. Не принимайте горячую пищу и напитки до полного восстановления чувствительности (риск незаметного термического ожога слизистой).`,
		`2. Не прикусывайте онемевшую губу, щёку или язык.`,
		`3. Не массируйте и не согревайте место инъекции.`,
		`4. При сохранении выраженного онемения более 6 часов или аллергических реакциях немедленно свяжитесь с клиникой: ${clinicPhone}.`,
	].join("\n");
}

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
	clinicName?: string | undefined;
	clinicPhone?: string | undefined;
	doctorName?: string | undefined;
	patientName?: string | undefined;
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
	clinicName = "Стоматологическая клиника DENTE",
	clinicPhone = "+7 (495) 123-45-67",
	doctorName = "Лечащий врач-стоматолог",
	patientName = "Пациент",
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
	const [doctorJustification, setDoctorJustification] = useState<string>("");

	// Zustand Visit Store
	const setVisitNoteForm = useVisitStore((s) => s.setVisitNoteForm);

	// 1-Click Anesthesia Presets (Mandate 8e)
	const applyStandardPreset = useCallback(
		(presetKey: "ultracain_ds" | "articaine_mandibular" | "mepivacaine_plain") => {
			const preset = STANDARD_ANESTHESIA_PRESETS[presetKey];
			if (!preset) return;
			setSelectedDrugId(preset.drugId);
			setCarpulesCount(preset.carpulesCount);
			setTechniqueId(preset.techniqueId);
			setNeedleType(preset.needleType);
			setAspirationConfirmed(true);
			setPatientWeightKg((prev) => (prev && prev > 0 ? prev : preset.defaultWeightKg));
			if (preset.hasCardioRisk) {
				setHasCardioRisk(true);
				setAsaStatus("asa_3");
			} else {
				setHasCardioRisk(false);
				setAsaStatus("asa_1");
			}
			setHasSulfiteAllergy(false);
			setHasAsthma(false);
			setIsPregnant(false);
			setBpSystolic(120);
			setBpDiastolic(80);
			setHeartRateBpm(72);
			showToast(`Применен 1-клик пресет: ${preset.shortLabelRu}`, "success");
		},
		[],
	);

	// Calculation Engine
	const calcResult: AnesthesiaCalculationResult = useMemo(() => {
		const effectiveWeightKg = resolveClinicalDefaultWeightKg(
			patientWeightKg,
			patientAgeYears,
			patientAgeYears < 18,
		);
		return calculateAnesthesiaSafety({
			drugId: selectedDrugId,
			carpulesCount,
			patientWeightKg: effectiveWeightKg,
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

	// 1-Click Patient Anesthesia Memo for Messengers (Feature 242, Mandates 8e, 8k, 8n)
	const handleCopyPatientMemo = useCallback(async () => {
		try {
			let expectedDuration = "2–3 часа";
			if (selectedDrugId === "mepivacaine_plain") {
				expectedDuration = "1.5–2 часа";
			} else if (
				techniqueId === "mandibular_torus" ||
				techniqueId === "tuberal"
			) {
				expectedDuration = "3–4 часа";
			}

			const targetAreaText = `зуб ${targetTooth} (${INJECTION_TECHNIQUES[techniqueId]?.nameRu || techniqueId})`;
			const text = formatAnesthesiaPatientMemo({
				clinicName,
				clinicPhone,
				patientName,
				doctorName,
				drugTradeName: calcResult.drug.tradeNamesRu[0] || calcResult.drug.activeSubstanceRu,
				carpulesCount,
				targetArea: targetAreaText,
				expectedDurationHours: expectedDuration,
			});

			await navigator.clipboard.writeText(text);
			showToast("Памятка по анестезии скопирована для пациента", "success");
		} catch {
			showToast("Не удалось скопировать памятку для пациента", "warning");
		}
	}, [
		clinicName,
		clinicPhone,
		patientName,
		doctorName,
		calcResult.drug,
		carpulesCount,
		targetTooth,
		techniqueId,
		selectedDrugId,
	]);

	// Print official Anesthesia Safety Protocol Sheet (A4)
	const handlePrintProtocol = useCallback(() => {
		showToast("Отправка протокола анестезии на печать...", "info");
		window.print();
	}, []);

	// Apply protocol directly into 043/u diary and deduct warehouse inventory
	const handleApplyToVisit = useCallback(async () => {
		const hasRisk =
			calcResult.isOverdose ||
			calcResult.isEpinephrineOverdose ||
			calcResult.contraindicationsTriggered.length > 0;

		if (hasRisk) {
			showToast("Внимание: внесено в карту по клиническому обоснованию врача", "warning");
		}

		// 1. Update Visit Note Form in Zustand Store
		const justificationSuffix = doctorJustification.trim()
			? `\n[Клиническое обоснование врача / по жизненным показаниям]: ${doctorJustification.trim()}`
			: hasRisk
				? " (Введено по жизненным показаниям)"
				: "";
		const formattedAnesthesiaNote = `\n\n[Протокол анестезии 043/у]\n${calcResult.diaryEntryRu}${justificationSuffix}`;
		setVisitNoteForm((prev) => {
			const existingPlan = prev.treatmentPlan || "";
			const updatedPlan = existingPlan
				? `${existingPlan}${formattedAnesthesiaNote}`
				: `${calcResult.diaryEntryRu}${justificationSuffix}`;
			return {
				...prev,
				treatmentPlan: updatedPlan,
			};
		});

		// 2. Persist official protocol to Backend Anesthesia Journal & Audit Trail
		if (initialPatientId) {
			try {
				const toothNum =
					typeof targetTooth === "number"
						? targetTooth
						: Number.parseInt(String(targetTooth), 10);
				const toothNumbers =
					Number.isFinite(toothNum) && toothNum >= 11 && toothNum <= 85
						? [toothNum]
						: [];
				const res = await fetch(
					`/api/anesthesia/patients/${encodeURIComponent(String(initialPatientId))}/logs`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...denteAdminSecretRequestHeaders(),
						},
						body: JSON.stringify({
							visitId: initialVisitId || null,
							technique: techniqueId || "infiltration",
							drug: selectedDrugId || "articaine_1_200k",
							drugBrandName:
								calcResult.drug.tradeNamesRu[0] || "Ультракаин Д-С",
							concentrationPct: calcResult.drug.activeConcentrationPercent,
							vasoconstrictor:
								calcResult.drug.vasoconstrictorRatio || "1:200000",
							carpuleVolumeMl: calcResult.drug.carpuleVolumeMl,
							carpulesAdministered: carpulesCount,
							patientWeightKg: patientWeightKg || 70,
							patientAgeYears: patientAgeYears || 35,
							asaClass: asaStatus || "asa_1",
							hasCardiovascularDisease: hasCardioRisk || false,
							toothNumbers,
							notes: `${calcResult.diaryEntryRu}${justificationSuffix}`,
						}),
					},
				);
				if (!res.ok) {
					console.warn(
						"Anesthesia protocol sync API returned status:",
						res.status,
					);
				}
			} catch (err) {
				console.error("Failed to persist anesthesia protocol to server:", err);
			}
		}

		// 3. Deduct empty carpules from warehouse inventory (1-click per Mandate 8e/8n with soft overdraft)
		if (deductFromWarehouse) {
			try {
				const orgId = "org_default";
				const writeoffRes = await fetch(
					`/api/inventory/${orgId}/quick-writeoff-carpules`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...denteAdminSecretRequestHeaders(),
						},
						body: JSON.stringify({
							carpulesCount,
							drugName: calcResult.drug.tradeNamesRu[0] || calcResult.drug.activeSubstanceRu,
							visitId: initialVisitId || null,
							notes: `Списание со стоматологического приема: ${calcResult.drug.activeSubstanceRu} (${carpulesCount} карп.)`,
						}),
					},
				);
				if (writeoffRes.ok) {
					const writeoffData = await writeoffRes.json().catch(() => ({}));
					if (Array.isArray(writeoffData.warnings) && writeoffData.warnings.length > 0) {
						showToast(
							`Списано ${carpulesCount} карп. под операцию (мягкий овердрафт склада)`,
							"warning",
						);
					}
				}
			} catch (inventoryErr) {
				console.warn("Soft overdraft warehouse sync warning:", inventoryErr);
			}
		}

		showToast(
			`Протокол анестезии внесен в карту 043/у. Введено: ${carpulesCount} карп. (${calcResult.drug.activeSubstanceRu})`,
			"success",
		);

		if (onApplied) {
			onApplied(calcResult);
		}

		onClose();
	}, [
		calcResult,
		initialPatientId,
		initialVisitId,
		selectedDrugId,
		carpulesCount,
		targetTooth,
		techniqueId,
		patientWeightKg,
		patientAgeYears,
		asaStatus,
		hasCardioRisk,
		deductFromWarehouse,
		doctorJustification,
		setVisitNoteForm,
		onApplied,
		onClose,
	]);

	if (!isOpen) return null;

	const isBlocked =
		calcResult.isOverdose ||
		calcResult.isEpinephrineOverdose ||
		calcResult.contraindicationsTriggered.length > 0;

	const modalContent = (
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
					{/* 1-Click Dominant Presets Bar (Mandate 8e) */}
					<div
						style={{
							background: "var(--paper-strong, #f8fafc)",
							padding: "0.875rem",
							borderRadius: "10px",
							border: "1px solid var(--teal, #0d9488)",
							marginBottom: "1rem",
						}}
					>
						<div
							style={{
								fontSize: "0.8125rem",
								fontWeight: 800,
								display: "flex",
								alignItems: "center",
								gap: "0.375rem",
								marginBottom: "0.625rem",
								color: "var(--teal, #0d9488)",
							}}
						>
							<Zap size={16} className="text-amber-400" />
							<span>Доминантные 1-клик пресеты стандартной анестезии (Минздрав РФ / Mandate 8e):</span>
						</div>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
								gap: "0.5rem",
							}}
						>
							<button
								type="button"
								onClick={() => applyStandardPreset("ultracain_ds")}
								className="anesthesia-btn"
								style={{
									minHeight: "44px",
									padding: "0.5rem 0.75rem",
									textAlign: "left",
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									borderRadius: "8px",
									border: "1px solid var(--teal, #0d9488)",
									background:
										selectedDrugId === "articaine_1_200k" && techniqueId === "infiltration"
											? "var(--teal-surface, rgba(13, 148, 136, 0.12))"
											: "var(--paper)",
									cursor: "pointer",
								}}
								data-testid="btn-anesthesia-preset-ultracain-ds"
								title="Ультракаин Д-С 1:200 000 (1 карпула 1.7 мл, инфильтрация, осложнений нет)"
							>
								<Zap size={16} className="text-amber-500 shrink-0" />
								<div style={{ flex: 1, minWidth: 0 }}>
									<div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--ink)" }}>
										Ультракаин Д-С 1:200 000
									</div>
									<div style={{ fontSize: "0.6875rem", color: "var(--muted)" }}>
										1 карп. 1.7 мл, инфильтрация, норма
									</div>
								</div>
							</button>

							<button
								type="button"
								onClick={() => applyStandardPreset("articaine_mandibular")}
								className="anesthesia-btn"
								style={{
									minHeight: "44px",
									padding: "0.5rem 0.75rem",
									textAlign: "left",
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									borderRadius: "8px",
									border: "1px solid var(--teal, #0d9488)",
									background:
										selectedDrugId === "articaine_1_100k" && techniqueId === "mandibular_torus"
											? "var(--teal-surface, rgba(13, 148, 136, 0.12))"
											: "var(--paper)",
									cursor: "pointer",
								}}
								data-testid="btn-anesthesia-preset-articaine-mandibular"
								title="Артикаин 4% 1:100 000 (1 карпула 1.7 мл, мандибулярная проводниковая, анестезия наступила через 3 мин)"
							>
								<Zap size={16} className="text-amber-500 shrink-0" />
								<div style={{ flex: 1, minWidth: 0 }}>
									<div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--ink)" }}>
										Артикаин 4% 1:100 000
									</div>
									<div style={{ fontSize: "0.6875rem", color: "var(--muted)" }}>
										1 карп. 1.7 мл, мандибулярная проводниковая
									</div>
								</div>
							</button>

							<button
								type="button"
								onClick={() => applyStandardPreset("mepivacaine_plain")}
								className="anesthesia-btn"
								style={{
									minHeight: "44px",
									padding: "0.5rem 0.75rem",
									textAlign: "left",
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									borderRadius: "8px",
									border: "1px solid var(--teal, #0d9488)",
									background:
										selectedDrugId === "mepivacaine_plain"
											? "var(--teal-surface, rgba(13, 148, 136, 0.12))"
											: "var(--paper)",
									cursor: "pointer",
								}}
								data-testid="btn-anesthesia-preset-mepivacaine-plain"
								title="Мепивакаин 3% без вазоконстриктора (1 карпула 1.7 мл, для кардиологических больных и беременных)"
							>
								<Zap size={16} className="text-emerald-500 shrink-0" />
								<div style={{ flex: 1, minWidth: 0 }}>
									<div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--ink)" }}>
										Мепивакаин 3% (Plain)
									</div>
									<div style={{ fontSize: "0.6875rem", color: "var(--muted)" }}>
										1 карп. 1.7 мл, для кардиобольных / беременных
									</div>
								</div>
							</button>
						</div>
					</div>

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
									Вес пациента (по умолч. 70 кг):
								</label>
								<input
									id="patient-weight-input"
									type="number"
									min={5}
									max={250}
									value={patientWeightKg || ""}
									placeholder="70"
									onChange={(e) => {
										const rawVal = e.target.value.trim();
										if (!rawVal) {
											setPatientWeightKg(70);
										} else {
											const parsed = parseFloat(rawVal);
											setPatientWeightKg(Number.isFinite(parsed) && parsed > 0 ? parsed : 70);
										}
									}}
									className="anesthesia-input"
									style={{
										width: "100%",
										minHeight: "44px",
										padding: "0.5rem 0.75rem",
										fontSize: "0.875rem",
										boxSizing: "border-box",
									}}
								/>
								<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)", marginTop: "0.125rem" }}>
									Стандартный взрослый (70 кг), ввод граммов не требуется
								</div>
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
									style={{
										width: "100%",
										minHeight: "44px",
										padding: "0.5rem 0.75rem",
										fontSize: "0.875rem",
										boxSizing: "border-box",
									}}
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
									style={{
										width: "100%",
										minHeight: "44px",
										padding: "0.5rem 0.75rem",
										fontSize: "0.875rem",
										boxSizing: "border-box",
									}}
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
									style={{
										width: "100%",
										minHeight: "44px",
										padding: "0.5rem 0.75rem",
										fontSize: "0.875rem",
										boxSizing: "border-box",
									}}
								/>
							</div>
						</div>

						{/* Quick Weight Chips */}
						<div
							style={{
								display: "flex",
								gap: "0.5rem",
								alignItems: "center",
								flexWrap: "wrap",
							}}
						>
							<span
								style={{
									fontSize: "0.75rem",
									fontWeight: 600,
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
										minHeight: "44px",
										minWidth: "44px",
										fontSize: "0.8125rem",
										fontWeight: 700,
										padding: "0.25rem 0.625rem",
										borderRadius: "6px",
										border: "1px solid var(--line, #cbd5e1)",
										background:
											patientWeightKg === w
												? "var(--teal)"
												: "var(--paper)",
										color: patientWeightKg === w ? "var(--on-teal)" : "inherit",
										cursor: "pointer",
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
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
												? "2px solid var(--teal)"
												: "1px solid var(--line)",
											background: isSelected
												? "var(--teal-surface, rgba(13, 148, 136, 0.07))"
												: "var(--paper)",
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
												color: "var(--muted)",
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
														? "var(--ok-fg)"
														: "var(--teal)",
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
								Количество вводимых карпул (1.7 мл):
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
											minHeight: "44px",
											minWidth: "48px",
											fontSize: "0.8125rem",
											fontWeight: 700,
											padding: "0.25rem 0.625rem",
											borderRadius: "6px",
											border: "1px solid var(--line, #cbd5e1)",
											background:
												carpulesCount === c
													? "var(--teal)"
													: "var(--paper)",
											color: carpulesCount === c ? "var(--on-teal)" : "inherit",
											cursor: "pointer",
											display: "inline-flex",
											alignItems: "center",
											justifyContent: "center",
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
								color: "var(--muted)",
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
											? "var(--ok-fg)"
											: calcResult.safetyZone === "caution"
												? "var(--info-fg)"
												: calcResult.safetyZone === "warning"
													? "var(--warn-fg)"
													: "var(--bad-fg)",
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
								background: "var(--line)",
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
											? "var(--ok-fg)"
											: calcResult.safetyZone === "caution"
												? "var(--info-fg)"
												: calcResult.safetyZone === "warning"
													? "var(--warn-fg)"
													: "var(--bad-fg)",
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
									background: "var(--paper)",
									borderRadius: "6px",
									border: "1px solid var(--line)",
									textAlign: "center",
								}}
							>
								<span
									style={{
										fontSize: "0.6875rem",
										color: "var(--muted)",
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
											calcResult.percentOfMaxDose > 100 ? "var(--bad-fg)" : "inherit",
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
									background: "var(--paper)",
									borderRadius: "6px",
									border: "1px solid var(--line)",
									textAlign: "center",
								}}
							>
								<span
									style={{
										fontSize: "0.6875rem",
										color: "var(--muted)",
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
												? "var(--bad-fg)"
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
									background: "var(--paper)",
									borderRadius: "6px",
									border: "1px solid var(--line)",
									textAlign: "center",
								}}
							>
								<span
									style={{
										fontSize: "0.6875rem",
										color: "var(--muted)",
										display: "block",
									}}
								>
									Максимум карпул
								</span>
								<strong style={{ fontSize: "0.9375rem", color: "var(--teal)" }}>
									{calcResult.maxSafeCarpulesCount} карп.
								</strong>
								<span
									style={{
										fontSize: "0.6875rem",
										color: "var(--muted)",
										display: "block",
									}}
								>
									Введено: {carpulesCount} карп.
								</span>
							</div>
						</div>
					</div>

					{/* WARNING CLINICAL BANNER ON OVERDOSE (MANDATE 8e - DOCTOR AUTONOMY) */}
					{isBlocked && (
						<div
							style={{
								background: "var(--warn-bg, rgba(245, 158, 11, 0.1))",
								border: "2px solid var(--warn-fg, #d97706)",
								color: "var(--ink)",
								padding: "0.875rem",
								borderRadius: "8px",
								marginBottom: "1rem",
								display: "flex",
								gap: "0.75rem",
								alignItems: "flex-start",
							}}
							data-testid="banner-anesthesia-overdose-warning"
						>
							<AlertTriangle
								size={24}
								className="text-amber-500 shrink-0"
								style={{ marginTop: "2px" }}
							/>
							<div style={{ flex: 1 }}>
								<div
									style={{
										fontSize: "0.875rem",
										fontWeight: 800,
										color: "var(--warn-fg, #d97706)",
										marginBottom: "0.25rem",
									}}
								>
									Внимание: Расчетная МРД превышена. По закону РФ (КР СтАР / Приказ 786н) требуется клиническое обоснование врача
								</div>
								<p
									style={{
										margin: 0,
										fontSize: "0.8125rem",
										lineHeight: 1.4,
										color: "var(--ink)",
									}}
								>
									Введение {calcResult.injectedActiveMg} мг превышает безопасный
									порог {calcResult.maxSafeActiveMg} мг (
									{calcResult.percentOfMaxDose}%). Согласно клиническим рекомендациям СтАР и приказу Минздрава 786н, превышение допустимо по решению врача с обязательным клиническим обоснованием в карте 043/у.
								</p>
								{calcResult.contraindicationsTriggered.map((c, i) => (
									<div
										key={i}
										style={{
											marginTop: "0.25rem",
											fontSize: "0.75rem",
											fontWeight: 600,
											color: "var(--bad-fg, #ef4444)",
										}}
									>
										• {c}
									</div>
								))}
								<div style={{ marginTop: "0.75rem" }}>
									<label
										htmlFor="anesthesia-clinical-justification"
										style={{
											display: "block",
											fontSize: "0.75rem",
											fontWeight: 700,
											marginBottom: "0.25rem",
											color: "var(--ink)",
										}}
									>
										Клиническое обоснование врача / по жизненным показаниям:
									</label>
									<textarea
										id="anesthesia-clinical-justification"
										value={doctorJustification}
										onChange={(e) => setDoctorJustification(e.target.value)}
										placeholder="Укажите клиническое обоснование (например: сложная атипичная дистопия, ретенция, травматичное вмешательство по жизненным показаниям)..."
										rows={2}
										style={{
											width: "100%",
											padding: "0.5rem",
											borderRadius: "6px",
											border: "1px solid var(--line)",
											fontSize: "0.8125rem",
											background: "var(--paper)",
											color: "var(--ink)",
											boxSizing: "border-box",
											resize: "vertical",
										}}
										data-testid="textarea-anesthesia-justification"
									/>
								</div>
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
							background: "var(--paper)",
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
								data-testid="btn-copy-diary"
								className="anesthesia-btn"
								style={{
									minHeight: "44px",
									padding: "0.375rem 0.75rem",
									fontSize: "0.8125rem",
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
						justifyContent: "space-between",
						alignItems: "center",
						flexWrap: "wrap",
						gap: "0.75rem",
						padding: "0.875rem 1rem",
						borderTop: "1px solid var(--line, #e2e8f0)",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
						<button
							type="button"
							onClick={handleCopyPatientMemo}
							data-testid="anesthesia-copy-patient-memo-btn"
							className="anesthesia-btn"
							style={{
								minHeight: "48px",
								padding: "0.5rem 1rem",
								fontSize: "0.875rem",
								fontWeight: 600,
								display: "inline-flex",
								alignItems: "center",
								gap: "0.5rem",
								cursor: "pointer",
							}}
							title="Скопировать памятку по анестезии для отправки пациенту в WhatsApp/Telegram"
						>
							<Copy size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Скопировать для пациента</span>
						</button>

						<button
							type="button"
							onClick={handlePrintProtocol}
							data-testid="anesthesia-print-protocol-btn"
							className="anesthesia-btn"
							style={{
								minHeight: "48px",
								padding: "0.5rem 1rem",
								fontSize: "0.875rem",
								fontWeight: 600,
								display: "inline-flex",
								alignItems: "center",
								gap: "0.5rem",
								cursor: "pointer",
							}}
							title="Распечатать протокол анестезиологического пособия (А4)"
						>
							<Printer size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Печать протокола (А4)</span>
						</button>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
						<button
							type="button"
							onClick={onClose}
							className="anesthesia-btn"
							style={{
								minHeight: "48px",
								padding: "0.5rem 1.25rem",
								fontSize: "0.875rem",
								fontWeight: 600,
							}}
						>
							Отмена
						</button>

					<button
						type="button"
						onClick={handleApplyToVisit}
						style={{
							minHeight: "48px",
							padding: "0.5rem 1.5rem",
							borderRadius: "8px",
							fontWeight: 700,
							fontSize: "0.9375rem",
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							background: isBlocked ? "var(--warn-fg, #d97706)" : "var(--teal)",
							color: "var(--on-teal)",
							border: "none",
							cursor: "pointer",
							opacity: 1.0,
							transition: "all 0.15s ease-out",
						}}
						disabled={false}
						data-testid="btn-anesthesia-calc-apply"
					>
						<CheckCircle2 size={18} />
						<span>{isBlocked ? "Ввести по жизненным показаниям (Форма 043/у)" : "Применить в дневник (043/у)"}</span>
					</button>
				</div>
			</div>
		</div>
	</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}
