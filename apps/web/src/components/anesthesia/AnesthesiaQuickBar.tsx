import type React from "react";
import { useState, useMemo } from "react";
import {
	Syringe,
	AlertTriangle,
	Heart,
	Sparkles,
	Plus,
	CheckCircle2,
	ShieldAlert,
	Activity,
} from "lucide-react";
import {
	type AnestheticDrugId,
	DENTAL_ANESTHETICS,
	type InjectionTechniqueId,
	INJECTION_TECHNIQUES,
} from "./anesthesiaCatalog";
import {
	calculateAnesthesiaSafety,
	type AnesthesiaCalculationResult,
	type AsaPhysicalStatus,
} from "./anesthesiaEngine";

export interface AnesthesiaQuickBarProps {
	patientWeightKg?: number | undefined;
	patientAgeYears?: number | undefined;
	hasCardiovascularRisk?: boolean | undefined;
	hasSulfiteAllergy?: boolean | undefined;
	hasBronchialAsthma?: boolean | undefined;
	isPregnantOrLactating?: boolean | undefined;
	targetToothNumberFdi?: number | string | undefined;
	onApplyAnesthesia: (diaryText: string, result: AnesthesiaCalculationResult) => void;
	disabled?: boolean | undefined;
}

export const WEIGHT_QUICK_PRESETS: readonly number[] = [15, 30, 50, 70, 85, 100];

export const PRIMARY_ANESTHETIC_DRUGS: readonly {
	id: AnestheticDrugId;
	labelRu: string;
	subLabelRu: string;
	activeSubstanceRu: string;
	vasoRatio: string;
	isAdrenalineFree: boolean;
	isCardioRecommended: boolean;
}[] = [
	{
		id: "articaine_1_200k",
		labelRu: "Ультракаин Д-С (1:200 000)",
		subLabelRu: "Артикаин 4% • Щадящий адреналин • МДД 7 мг/кг",
		activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:200 000",
		vasoRatio: "1:200 000",
		isAdrenalineFree: false,
		isCardioRecommended: false,
	},
	{
		id: "articaine_1_100k",
		labelRu: "Ультракаин Форте (1:100 000)",
		subLabelRu: "Артикаин 4% • Глубокая анестезия • МДД 7 мг/кг",
		activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:100 000",
		vasoRatio: "1:100 000",
		isAdrenalineFree: false,
		isCardioRecommended: false,
	},
	{
		id: "mepivacaine_plain",
		labelRu: "Скандонест 3% (Без адреналина)",
		subLabelRu: "Мепивакаин 3% • Кардио-защита • Без сульфитов • МДД 4.4 мг/кг",
		activeSubstanceRu: "Мепивакаин 3% (чистый)",
		vasoRatio: "Без адреналина",
		isAdrenalineFree: true,
		isCardioRecommended: true,
	},
];

export function AnesthesiaQuickBar({
	patientWeightKg: initialWeightKg = 70,
	patientAgeYears = 35,
	hasCardiovascularRisk = false,
	hasSulfiteAllergy = false,
	hasBronchialAsthma = false,
	isPregnantOrLactating = false,
	targetToothNumberFdi,
	onApplyAnesthesia,
	disabled = false,
}: AnesthesiaQuickBarProps) {
	const [patientWeightKg, setPatientWeightKg] = useState<number>(
		initialWeightKg > 0 ? initialWeightKg : 70,
	);
	const [selectedDrugId, setSelectedDrugId] = useState<AnestheticDrugId>(() => {
		if (hasSulfiteAllergy || hasBronchialAsthma) return "mepivacaine_plain";
		if (hasCardiovascularRisk) return "mepivacaine_plain";
		return "articaine_1_200k";
	});
	const [techniqueId, setTechniqueId] = useState<InjectionTechniqueId>("infiltration");
	const [activeToastMessage, setActiveToastMessage] = useState<string | null>(null);
	const [safetyWarning, setSafetyWarning] = useState<{ title: string; text: string } | null>(null);

	const asaStatus: AsaPhysicalStatus = hasCardiovascularRisk ? "asa_3" : "asa_1";

	// Live calculation for 1 carpule (1.7 ml)
	const singleCarpuleResult = useMemo(() => {
		return calculateAnesthesiaSafety({
			drugId: selectedDrugId,
			carpulesCount: 1.0,
			patientWeightKg,
			patientAgeYears,
			asaStatus,
			hasCardiovascularRisk,
			hasSulfiteAllergy,
			hasBronchialAsthma,
			isPregnantOrLactating,
			techniqueId,
			needleType: "g30_short_21mm",
			targetToothNumberFdi,
			aspirationNegativeConfirmed: true,
		});
	}, [
		selectedDrugId,
		patientWeightKg,
		patientAgeYears,
		asaStatus,
		hasCardiovascularRisk,
		hasSulfiteAllergy,
		hasBronchialAsthma,
		isPregnantOrLactating,
		techniqueId,
		targetToothNumberFdi,
	]);

	const selectedDrugInfo = DENTAL_ANESTHETICS[selectedDrugId] ?? DENTAL_ANESTHETICS.articaine_1_200k;
	const maxSafeCarpules = singleCarpuleResult.maxSafeCarpulesCount;

	const handleApplyCarpules = (carpulesCount: number) => {
		if (disabled) return;

		const result = calculateAnesthesiaSafety({
			drugId: selectedDrugId,
			carpulesCount,
			patientWeightKg,
			patientAgeYears,
			asaStatus,
			hasCardiovascularRisk,
			hasSulfiteAllergy,
			hasBronchialAsthma,
			isPregnantOrLactating,
			techniqueId,
			needleType: "g30_short_21mm",
			targetToothNumberFdi,
			aspirationNegativeConfirmed: true,
		});

		// Check critical contraindications
		if (result.contraindicationsTriggered.length > 0 || result.isOverdose || result.isEpinephrineOverdose) {
			setSafetyWarning({
				title: "Соматический риск / Превышение МДД",
				text: result.contraindicationsTriggered[0] || result.warnings[0] || "Обнаружен риск при введении препарата",
			});
			return;
		}

		onApplyAnesthesia(result.diaryEntryRu, result);
		setActiveToastMessage(
			`Зафиксировано: ${selectedDrugInfo.tradeNamesRu[0]} ${(carpulesCount * 1.7).toFixed(1)} мл (${carpulesCount} карп.) в протокол 043/у`,
		);
		setTimeout(() => setActiveToastMessage(null), 3500);
	};

	return (
		<div className="anesthesia-quick-bar" data-testid="anesthesia-quick-bar">
			{/* ── Top Bar: Title & Somatic Tags & Weight & Configure ── */}
			<div className="anesthesia-quick-bar-header">
				<div className="anesthesia-quick-bar-title">
					<Syringe size={16} className="anesthesia-icon-accent shrink-0" />
					<span className="font-bold text-xs sm:text-sm">Анестезия (МДД по массе тела {patientWeightKg} кг):</span>
					{hasCardiovascularRisk && (
						<span className="anesthesia-cardio-tag" title="Кардиоваскулярный риск: лимит адреналина 0.04 мг">
							<Heart size={12} className="text-amber-500" />
							<span>ССЗ: Скандонест / лимит 0.04 мг</span>
						</span>
					)}
					{(hasSulfiteAllergy || hasBronchialAsthma) && (
						<span className="anesthesia-allergy-tag" title="Аллергия на сульфиты / астма: запрещены растворы с адреналином (E223)">
							<AlertTriangle size={12} className="text-red-500" />
							<span>Без сульфитов (E223)</span>
						</span>
					)}
				</div>

				<div className="flex items-center gap-2">
					<span className="text-[11px] text-[var(--muted)]">1-клик выбор дозировки</span>
				</div>
			</div>

			{/* ── Drug Selection Chips (3 Primary Drugs) ── */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
				{PRIMARY_ANESTHETIC_DRUGS.map((drug) => {
					const isSelected = selectedDrugId === drug.id;
					const isCardioSuggested = hasCardiovascularRisk && drug.isAdrenalineFree;
					const isSulfiteRisky = (hasSulfiteAllergy || hasBronchialAsthma) && !drug.isAdrenalineFree;

					return (
						<button
							key={drug.id}
							type="button"
							disabled={disabled}
							onClick={() => {
								setSelectedDrugId(drug.id);
								setSafetyWarning(null);
							}}
							className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
								isSelected
									? "bg-[var(--teal-surface)] border-[var(--teal)] shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--teal)]"
							} ${isSulfiteRisky ? "opacity-60 border-red-300 dark:border-red-900" : ""}`}
						>
							<div className="flex items-center justify-between w-full gap-1">
								<span className="font-bold text-xs sm:text-sm text-[var(--ink)] truncate">
									{drug.labelRu}
								</span>
								{isCardioSuggested && (
									<span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shrink-0">
										ССЗ выбор
									</span>
								)}
								{isSulfiteRisky && (
									<span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-500/20 text-red-700 dark:text-red-300 shrink-0">
										Сульфиты!
									</span>
								)}
							</div>
							<span className="text-[11px] text-[var(--muted)] mt-0.5 line-clamp-1">
								{drug.subLabelRu}
							</span>
						</button>
					);
				})}
			</div>

			{/* ── 1-Click Dose Selection Row & MRD Gauge ── */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-[var(--line)]/50">
				{/* 1-Click Action Buttons */}
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1 shrink-0">
						<Plus size={13} className="text-[var(--teal)]" />
						Ввести дозу (1 клик):
					</span>

					<button
						type="button"
						disabled={disabled}
						onClick={() => handleApplyCarpules(1.0)}
						className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-[var(--paper)] hover:bg-[var(--teal-surface)] border border-[var(--line)] hover:border-[var(--teal)] text-xs sm:text-sm font-bold text-[var(--ink)] transition-all shadow-xs touch-manipulation cursor-pointer active:scale-98"
						title="Ввести 1 карпулу (1.7 мл) в протокол дневника"
						data-testid="anesthesia-dose-1carp"
					>
						<Plus size={14} className="text-[var(--teal)] shrink-0" />
						<span>1 карпула (1.7 мл)</span>
					</button>

					<button
						type="button"
						disabled={disabled || maxSafeCarpules < 2.0}
						onClick={() => handleApplyCarpules(2.0)}
						className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-[var(--paper)] hover:bg-[var(--teal-surface)] border border-[var(--line)] hover:border-[var(--teal)] text-xs sm:text-sm font-bold text-[var(--ink)] transition-all shadow-xs touch-manipulation cursor-pointer active:scale-98"
						title="Ввести 2 карпулы (3.4 мл) — для проводниковых анестезий"
						data-testid="anesthesia-dose-2carp"
					>
						<Plus size={14} className="text-[var(--teal)] shrink-0" />
						<span>2 карпулы (3.4 мл)</span>
					</button>

					<button
						type="button"
						disabled={disabled}
						onClick={() => handleApplyCarpules(0.5)}
						className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-[var(--paper)] hover:bg-[var(--teal-surface)] border border-[var(--line)] hover:border-[var(--teal)] text-xs sm:text-sm font-bold text-[var(--ink)] transition-all shadow-xs touch-manipulation cursor-pointer active:scale-98"
						title="Ввести 0.5 карпулы (0.85 мл) — для интралигаментарной или нёбной анестезии"
						data-testid="anesthesia-dose-halfcarp"
					>
						<Plus size={14} className="text-[var(--teal)] shrink-0" />
						<span>½ карп. (0.85 мл)</span>
					</button>
				</div>

				{/* Maximum Safe Carpules Badge */}
				<div className="flex items-center gap-2 text-xs text-[var(--muted)] font-medium shrink-0">
					<Activity size={14} className="text-[var(--teal)]" />
					<span>
						МДД для {patientWeightKg} кг:{" "}
						<strong className="text-[var(--ink)] font-bold">
							до {maxSafeCarpules} карп. ({(maxSafeCarpules * 1.7).toFixed(1)} мл)
						</strong>
					</span>
				</div>
			</div>

			{/* Feedback Toast */}
			{activeToastMessage && (
				<div className="anesthesia-quick-toast" role="status">
					<CheckCircle2 size={16} />
					<span>{activeToastMessage}</span>
				</div>
			)}

			{/* Safety Alert Stopper */}
			{safetyWarning && (
				<div className="anesthesia-safety-stopper-alert">
					<div className="stopper-alert-content">
						<ShieldAlert size={20} className="stopper-icon shrink-0" />
						<div>
							<div className="stopper-title">{safetyWarning.title}</div>
							<div className="stopper-text">{safetyWarning.text}</div>
						</div>
					</div>
					<div className="stopper-actions">
						<button
							type="button"
							className="stopper-btn-switch"
							onClick={() => {
								setSafetyWarning(null);
								setSelectedDrugId("mepivacaine_plain");
								handleApplyCarpules(1.0);
							}}
						>
							Ввести Скандонест 3% (безопасно)
						</button>
						<button
							type="button"
							className="stopper-btn-dismiss"
							onClick={() => setSafetyWarning(null)}
						>
							Закрыть
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

