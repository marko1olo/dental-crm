/**
 * @dental/web/components/anesthesia/AnesthesiaStudioModal.tsx
 * Canonical Chairside Anesthesia Studio Modal SSOT (Mandates 8b 380-480 lines Sweet Spot, 8e, 8y, 8n, 8am, 8ze)
 * 1-click chairside presets, 4 canonical drugs in Russian practice, Apple HIG touch ergonomics & 1 Primary CTA.
 */

import {
	AlertTriangle,
	Check,
	CheckCircle2,
	Copy,
	FileText,
	Minus,
	Plus,
	Share2,
	ShieldAlert,
	Syringe,
	X,
} from "lucide-react";
import React, { useId, useMemo, useState } from "react";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import {
	CARPULE_PRESETS,
	CLINICAL_FAST_PRESETS,
	DENTAL_ANESTHETICS,
	INJECTION_TECHNIQUES,
	PRIMARY_ANESTHETIC_DRUGS,
	type AnestheticDrugId,
	type ClinicalFastPresetItem,
	type InjectionTechniqueId,
	postEmergencyAntishockWriteoff,
	postQuickCarpuleWriteoff,
} from "./anesthesiaCatalogData";
import {
	calculateAnesthesiaSafety,
	formatAnesthesiaPatientMemo,
	persistAnesthesiaLog,
	resolveClinicalDefaultWeightKg,
	type AnesthesiaCalculationResult,
} from "./anesthesiaEngine";

if (typeof document !== "undefined") import("./anesthesia.css");

export interface AnesthesiaStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly targetToothNumberFdi?: number | string | undefined;
	readonly patientWeightKg?: number | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly hasCardiovascularRisk?: boolean | undefined;
	readonly hasHypertension?: boolean | undefined;
	readonly hasCardiacArrhythmia?: boolean | undefined;
	readonly hasIschemicHeartDisease?: boolean | undefined;
	readonly hasMyocardialInfarctionHistory?: boolean | undefined;
	readonly takesBetaBlockers?: boolean | undefined;
	readonly hasSulfiteAllergy?: boolean | undefined;
	readonly hasBronchialAsthma?: boolean | undefined;
	readonly isPregnantOrLactating?: boolean | undefined;
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly onApplyAnesthesia?: ((diaryText: string, result: AnesthesiaCalculationResult) => void) | undefined;
	readonly onDisposalCarpules?: ((carpulesCount: number, drugId?: AnestheticDrugId | undefined) => void) | undefined;
}

export const AnesthesiaStudioModal: React.FC<AnesthesiaStudioModalProps> = ({
	isOpen,
	onClose,
	patientId,
	visitId,
	patientName = "Пациент",
	doctorName = "Лечащий врач",
	targetToothNumberFdi = 16,
	patientWeightKg,
	patientAgeYears = 35,
	hasCardiovascularRisk,
	hasHypertension,
	hasCardiacArrhythmia,
	hasIschemicHeartDisease,
	hasMyocardialInfarctionHistory,
	takesBetaBlockers,
	hasSulfiteAllergy,
	hasBronchialAsthma,
	isPregnantOrLactating,
	hasLidocaineAllergy,
	hasArticaineAllergy,
	onApplyAnesthesia,
	onDisposalCarpules,
}) => {
	const initialCardio = Boolean(
		hasCardiovascularRisk || hasHypertension || hasCardiacArrhythmia ||
		hasIschemicHeartDisease || hasMyocardialInfarctionHistory || takesBetaBlockers || isPregnantOrLactating,
	);
	const hasAllergy = Boolean(hasLidocaineAllergy || hasArticaineAllergy || hasSulfiteAllergy || hasBronchialAsthma);

	const [isCardioRisk, setIsCardioRisk] = useState<boolean>(initialCardio);
	const defaultDrug: AnestheticDrugId = hasAllergy || initialCardio ? "mepivacaine_plain" : "articaine_1_200k";
	const [selectedDrugId, setSelectedDrugId] = useState<AnestheticDrugId | "none">(defaultDrug);
	const [techniqueId, setTechniqueId] = useState<InjectionTechniqueId>("infiltration");
	const [carpulesCount, setCarpulesCount] = useState<number>(1.0);
	const [isAspirationNegative, setIsAspirationNegative] = useState<boolean>(true);
	const [toastMsg, setToastMsg] = useState<string | null>(null);
	const [copiedMemo, setCopiedMemo] = useState<boolean>(false);
	const titleId = useId();

	const isPediatric = patientAgeYears < 18 || (typeof patientWeightKg === "number" && patientWeightKg > 0 && patientWeightKg < 40);
	const weight = resolveClinicalDefaultWeightKg(patientWeightKg, patientAgeYears, isPediatric);
	const effDrugId: AnestheticDrugId = selectedDrugId === "none" ? "articaine_1_200k" : selectedDrugId;

	const safety = useMemo(() => calculateAnesthesiaSafety({
		drugId: effDrugId, carpulesCount, patientWeightKg: weight, patientAgeYears,
		hasCardiovascularRisk: isCardioRisk, hasSulfiteAllergy: Boolean(hasSulfiteAllergy),
		hasBronchialAsthma: Boolean(hasBronchialAsthma), isPregnantOrLactating: Boolean(isPregnantOrLactating),
		techniqueId, targetToothNumberFdi, aspirationNegativeConfirmed: isAspirationNegative,
	}), [effDrugId, carpulesCount, weight, patientAgeYears, isCardioRisk, hasSulfiteAllergy, hasBronchialAsthma, isPregnantOrLactating, techniqueId, targetToothNumberFdi, isAspirationNegative]);

	if (!isOpen) return null;

	const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 2500); };

	const applyPreset = (preset: ClinicalFastPresetItem) => {
		setSelectedDrugId(preset.drugId);
		setCarpulesCount(preset.count);
		setTechniqueId(preset.defaultTechnique);
		showToast(`Шаблон: ${preset.shortLabelRu}`);
	};

	const handleCommitAnesthesia = () => {
		const techInfo = INJECTION_TECHNIQUES[techniqueId] || INJECTION_TECHNIQUES.infiltration;
		const drugInfo = DENTAL_ANESTHETICS[effDrugId];
		const toothStr = targetToothNumberFdi ? ` в области зуба ${targetToothNumberFdi}` : "";
		const volStr = `${(carpulesCount * 1.7).toFixed(1)} мл`;
		const carpSuffix = carpulesCount === 1 ? "1 карпула" : `${carpulesCount} карп.`;

		const diaryEntry = selectedDrugId === "none"
			? "Анестезия не проводилась. Процедура выполнена без анестезии по согласию пациента."
			: `Проведена ${techInfo.nameRu.toLowerCase()} анестезия${toothStr}: ${drugInfo.activeSubstanceRu} — ${volStr} (${carpSuffix}). ${isAspirationNegative ? "Аспирационная проба отрицательная. " : ""}Осложнений нет.`;

		onApplyAnesthesia?.(diaryEntry, safety);

		if (selectedDrugId !== "none" && carpulesCount > 0) {
			onDisposalCarpules?.(carpulesCount, effDrugId);
			postQuickCarpuleWriteoff({ visitId, patientId, count: carpulesCount, drugId: effDrugId });
			persistAnesthesiaLog({
				patientId, visitId, drugId: effDrugId, techniqueId, carpulesCount,
				patientWeightKg: weight, patientAgeYears, isCardioRisk, targetToothNumberFdi, diaryEntry,
			});
		}
		showToast("✓ Анестезия внесена в дневник приёма");
		setTimeout(onClose, 800);
	};

	const handleCopyMemo = async () => {
		const drugName = DENTAL_ANESTHETICS[effDrugId]?.tradeNamesRu[0] || "Ультракаин Д-С";
		const memo = formatAnesthesiaPatientMemo({
			clinicName: "Стоматологическая клиника DENTE", clinicPhone: "+7 (495) 123-45-67",
			patientName, doctorName, drugTradeName: drugName, carpulesCount,
			targetArea: targetToothNumberFdi ? `зуб ${targetToothNumberFdi}` : "область вмешательства",
		});
		try {
			await navigator.clipboard.writeText(memo);
			setCopiedMemo(true);
			showToast("Памятка скопирована в буфер");
			setTimeout(() => setCopiedMemo(false), 2000);
		} catch { showToast("Памятка сформирована"); }
	};

	const openEmergency = () => {
		postEmergencyAntishockWriteoff(visitId);
		useUiSurfaceStore.getState().openPrimaryModal("emergency_rescue");
	};

	return (
		<div
			className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-x-clip"
			data-testid="anesthesia-studio-modal-backdrop"
			onClick={onClose}
		>
			<div
				className="w-full sm:max-w-3xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-2xl rounded-t-[24px] sm:rounded-2xl flex flex-col max-h-[90vh] sm:max-h-[88vh] overflow-hidden"
				data-testid="anesthesia-studio-modal"
				role="dialog"
				aria-labelledby={titleId}
				onClick={(e) => e.stopPropagation()}
			>
				{/* iOS Tactile Drag Handle for Mobile Viewports (Apple HIG Mandate 8ze) */}
				<div className="flex sm:hidden justify-center pt-2.5 pb-1">
					<div className="w-9 h-1 rounded-full bg-[var(--line)] opacity-80" data-testid="ios-drag-handle" />
				</div>

				{/* Header: Title, Tooth Context, Emergency & Close */}
				<header className="px-4 sm:px-6 py-2.5 sm:py-3 border-b border-[var(--line)] flex items-center justify-between gap-2.5 shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0d9488] text-white flex items-center justify-center shadow-xs shrink-0">
							<Syringe size={18} />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-1.5 flex-wrap">
								<h2 id={titleId} className="text-sm sm:text-base font-bold text-[var(--ink)]">Студия анестезии</h2>
								{targetToothNumberFdi && (
									<span className="px-1.5 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-bold text-teal-700 dark:text-teal-300">
										Зуб {targetToothNumberFdi}
									</span>
								)}
							</div>
							<p className="text-[11px] sm:text-xs text-[var(--muted)]">Протокол обезболивания • 1 клик</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							onClick={openEmergency}
							className="px-2.5 py-1.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-rose-500/10 hover:border-rose-500/40 text-[var(--muted)] hover:text-rose-600 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
							data-testid="btn-anesthesia-quick-emergency"
							title="Укладка Антишок (Приказ 786н)"
						>
							<ShieldAlert size={14} className="text-rose-500 shrink-0" />
							<span className="hidden sm:inline">Аптечка</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							aria-label="Закрыть"
							className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] bg-transparent hover:bg-[var(--paper-soft)] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* Passive Somatic & Allergy Safety Strip (Mandates 8e, 8y — Never disables CTA) */}
				<section className="px-4 sm:px-6 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center justify-between gap-2 flex-wrap text-xs" data-testid="anesthesia-somatic-safety-strip">
					<div className="flex items-center gap-2 flex-wrap min-w-0">
						{hasAllergy || isCardioRisk ? (
							<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-medium" data-testid="badge-allergy-alert">
								<AlertTriangle size={13} className="text-amber-600 shrink-0" />
								<span>⚠️ Аллергостатус / Кардиориск: отягощен (рекомендован Мепивакаин 3%)</span>
							</span>
						) : (
							<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-medium" data-testid="badge-somatic-healthy">
								<CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
								<span>✓ Без соматических стоп-факторов (Вес: {weight} кг)</span>
							</span>
						)}
					</div>
					<button
						type="button"
						onClick={() => setIsCardioRisk((v) => !v)}
						className={`px-2.5 py-1 min-h-[44px] rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
							isCardioRisk ? "border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-200" : "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="btn-toggle-cardio-risk"
					>
						{isCardioRisk ? "Кардиориск: Активен" : "+ Кардио / Беременность"}
					</button>
				</section>

				{/* Scrollable Studio Content Body */}
				<main className="p-3.5 sm:p-5 space-y-2.5 overflow-y-auto min-h-0 flex-1">
					{/* 1. Four 1-Click Clinical Fast Presets */}
					<div className="space-y-1">
						<label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Быстрые шаблоны в 1 клик</label>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="clinical-fast-presets-grid">
							{CLINICAL_FAST_PRESETS.map((preset) => {
								const isSel = selectedDrugId === preset.drugId && (preset.drugId === "none" || carpulesCount === preset.count);
								return (
									<button
										key={preset.id}
										type="button"
										onClick={() => applyPreset(preset)}
										className={`p-2 sm:p-2.5 min-h-[44px] rounded-xl border text-left flex items-start justify-between gap-2 transition-all cursor-pointer ${
											isSel ? "border-[#0d9488] bg-[var(--teal-surface)] shadow-xs" : "border-[var(--line)] bg-[var(--paper)] hover:border-[#0d9488]/60 hover:bg-[var(--paper-soft)]"
										}`}
										data-testid={preset.testId}
									>
										<div className="min-w-0">
											<div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
												<Syringe size={13} className={isSel ? "text-[#0d9488]" : "text-[var(--muted)]"} />
												<span>{preset.fullLabelRu}</span>
											</div>
											<div className="text-[11px] text-[var(--muted)] truncate mt-0.5">{preset.clinicalScopeRu}</div>
										</div>
										<span className="text-[11px] font-semibold text-[var(--muted)] shrink-0">{preset.subLabelRu}</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* 2. Four Canonical Anesthetic Drugs in Russia */}
					<div className="space-y-1">
						<label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Препарат (4 канонических анестетика РФ)</label>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="anesthetic-drugs-grid">
							{PRIMARY_ANESTHETIC_DRUGS.slice(0, 4).map((drug) => {
								const isSel = selectedDrugId === drug.id;
								return (
									<button
										key={drug.id}
										type="button"
										onClick={() => setSelectedDrugId(drug.id)}
										className={`p-2 sm:p-2.5 min-h-[44px] rounded-xl border text-left flex items-start justify-between gap-2 transition-all cursor-pointer ${
											isSel ? "border-[#0d9488] bg-[var(--teal-surface)] shadow-xs font-bold" : "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--line-strong)] hover:bg-[var(--paper-soft)]"
										}`}
										data-testid={`drug-card-${drug.id}`}
									>
										<div className="min-w-0">
											<div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
												<span className={`w-2 h-2 rounded-full ${drug.isAdrenalineFree ? "bg-emerald-500" : "bg-[#0d9488]"}`} />
												<span>{drug.labelRu}</span>
											</div>
											<div className="text-[11px] text-[var(--muted)] truncate mt-0.5">{drug.tradeNames}</div>
										</div>
										<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] shrink-0">
											{drug.vasoRatio}
										</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* 3. Technique & Volume (Carpules) */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
						<div className="space-y-1">
							<label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Способ введения</label>
							<div className="flex flex-col gap-1" role="group" aria-label="Способ введения анестетика">
								{Object.values(INJECTION_TECHNIQUES).slice(0, 4).map((tech) => {
									const isSel = techniqueId === tech.id;
									return (
										<button
											key={tech.id}
											type="button"
											onClick={() => setTechniqueId(tech.id)}
											className={`px-3 py-1.5 min-h-[44px] rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
												isSel ? "border-[#0d9488] bg-[var(--teal-surface)] text-[var(--ink)] font-bold shadow-2xs" : "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
											}`}
											data-testid={`tech-btn-${tech.id}`}
										>
											<span>{tech.nameRu}</span>
											{isSel && <Check size={14} className="text-[#0d9488] shrink-0" />}
										</button>
									);
								})}
							</div>
						</div>

						{/* Dosage & Carpules Stepper */}
						<div className="space-y-1">
							<label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Количество карпул и объём</label>
							<div className="p-2 bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl space-y-1.5">
								<div className="flex items-center gap-1.5 flex-wrap">
									{CARPULE_PRESETS.slice(0, 3).map((cp) => (
										<button
											key={cp.id}
											type="button"
											onClick={() => setCarpulesCount(cp.count)}
											className={`px-2.5 py-1 min-h-[44px] rounded-lg border text-xs font-bold transition-all cursor-pointer ${
												carpulesCount === cp.count ? "border-[#0d9488] bg-[var(--paper)] text-[#0d9488] shadow-2xs" : "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
											data-testid={cp.id}
										>
											{cp.label}
										</button>
									))}
								</div>

								<div className="flex items-center justify-between gap-2 pt-0.5">
									<div className="flex items-center gap-1.5">
										<button
											type="button"
											onClick={() => setCarpulesCount((c) => Math.max(0.5, Math.round((c - 0.5) * 10) / 10))}
											className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer transition-colors active:scale-95"
											aria-label="Уменьшить дозу"
											data-testid="btn-anesthesia-decrease"
										>
											<Minus size={16} />
										</button>
										<div className="px-2 py-1 min-h-[44px] rounded-xl bg-[var(--paper)] border border-[var(--line)] text-center min-w-[65px] flex flex-col justify-center">
											<span className="text-sm font-extrabold text-[var(--ink)]" data-testid="carpule-display-value">{carpulesCount} карп.</span>
											<span className="text-[10px] text-[var(--muted)] font-medium">{(carpulesCount * 1.7).toFixed(1)} мл</span>
										</div>
										<button
											type="button"
											onClick={() => setCarpulesCount((c) => Math.min(6.0, Math.round((c + 0.5) * 10) / 10))}
											className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer transition-colors active:scale-95"
											aria-label="Увеличить дозу"
											data-testid="btn-anesthesia-increase"
										>
											<Plus size={16} />
										</button>
									</div>

									<button
										type="button"
										onClick={() => setIsAspirationNegative((v) => !v)}
										className={`px-2 py-1 min-h-[44px] rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
											isAspirationNegative ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300"
										}`}
										data-testid="btn-toggle-aspiration"
									>
										<Check size={13} className={isAspirationNegative ? "text-emerald-600" : "opacity-40"} />
										<span>{isAspirationNegative ? "Аспирация: Отр." : "Аспирация: Сомн."}</span>
									</button>
								</div>
							</div>
						</div>
					</div>

					{/* 4. Live Diary Preview in Latin / 043-U */}
					<div className="p-2.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] space-y-1">
						<div className="flex items-center justify-between text-xs text-[var(--muted)] font-semibold">
							<span className="flex items-center gap-1">
								<FileText size={13} className="text-teal-600" />
								<span>Запись в дневник приёма (Форма 043/у):</span>
							</span>
							<button
								type="button"
								onClick={handleCopyMemo}
								className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer text-xs"
								title="Скопировать памятку пациенту"
							>
								<Copy size={12} />
								<span>{copiedMemo ? "Скопировано" : "Памятка пациенту"}</span>
							</button>
						</div>
						<p className="text-xs text-[var(--ink)] font-mono leading-relaxed bg-[var(--paper)] p-2 rounded-lg border border-[var(--line)]" data-testid="diary-entry-preview">
							{safety.diaryEntryRu}
						</p>
					</div>
				</main>

				{/* Floating Bottom Bar: ROVNO 1 Primary CTA Button #0d9488 (Mandates 8am, 8e, 8ze) */}
				<footer className="p-3 sm:px-6 sm:py-3 bg-[var(--paper)] border-t border-[var(--line)] flex items-center justify-between gap-2.5 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
					<button
						type="button"
						onClick={handleCopyMemo}
						className="anesthesia-desktop-memo-btn items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] transition-colors cursor-pointer shrink-0"
						data-testid="btn-copy-patient-memo"
					>
						<Share2 size={14} className="text-teal-600 shrink-0" />
						<span>Памятка пациенту</span>
					</button>

					<button
						type="button"
						onClick={handleCopyMemo}
						aria-label="Скопировать памятку пациенту"
						className="anesthesia-mobile-memo-btn p-2.5 min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
					>
						<Share2 size={18} className="text-teal-600" />
					</button>

					<button
						type="button"
						onClick={handleCommitAnesthesia}
						className="primary-button inline-flex items-center justify-center gap-2 px-3 sm:px-6 py-2.5 min-h-[44px] h-12 rounded-xl border border-[#0f766e] bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer active:scale-98 flex-1 sm:flex-initial sm:w-auto sm:ml-auto whitespace-nowrap"
						data-testid="btn-apply-anesthesia-to-card"
					>
						<CheckCircle2 size={16} className="shrink-0" />
						<span>✓ Зафиксировать анестезию</span>
					</button>
				</footer>

				{/* Toast notification */}
				{toastMsg && (
					<div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-slate-900/90 text-white text-xs font-bold shadow-xl flex items-center gap-1.5 z-50 pointer-events-none" role="status">
						<CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
						<span>{toastMsg}</span>
					</div>
				)}
			</div>
		</div>
	);
};

AnesthesiaStudioModal.displayName = "AnesthesiaStudioModal";
