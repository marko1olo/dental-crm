/**
 * @dental/web/components/anesthesia/ChairsideAnesthesiaQuickBar.tsx
 * DENTE Chairside Anesthesia QuickBar SSOT (Mandates 8b 250-380 lines, 8e, 8n, 8y, 8am, 8ze)
 * 1-click presets, 1 primary CTA #0d9488, 0 dead-ends, soft negative stock writeoff.
 */

import { AlertTriangle, CheckCircle2, Share2, ShieldAlert, SlidersHorizontal, Syringe, X } from "lucide-react";
import React, { useId, useState } from "react";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import {
	CARPULE_PRESETS,
	CLINICAL_FAST_PRESETS,
	type AnestheticDrugId,
	type ClinicalFastPresetItem,
	type InjectionTechniqueId,
} from "./anesthesiaCatalogData";
import {
	calculateAnesthesiaSafety,
	formatAnesthesiaPatientMemo,
	persistAnesthesiaLog,
	postQuickCarpuleWriteoff,
	resolveClinicalDefaultWeightKg,
	type AnesthesiaCalculationResult,
} from "./anesthesiaEngine";

if (typeof document !== "undefined") import("./anesthesia.css");

export interface ChairsideAnesthesiaQuickBarProps {
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
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
	readonly hasPenicillinAllergy?: boolean | undefined;
	readonly hasLatexAllergy?: boolean | undefined;
	readonly targetToothNumberFdi?: number | string | undefined;
	readonly onApplyAnesthesia?: ((diaryText: string, result: AnesthesiaCalculationResult) => void) | undefined;
	readonly onDisposalCarpules?: ((carpulesCount: number, drugId?: AnestheticDrugId | undefined) => void) | undefined;
	readonly onOpenEmergencyProtocol?: (() => void) | undefined;
	readonly disabled?: boolean | undefined;
}

export function ChairsideAnesthesiaQuickBar(props: ChairsideAnesthesiaQuickBarProps) {
	const isCardioRisk = Boolean(props.hasCardiovascularRisk || props.hasHypertension || props.hasCardiacArrhythmia || props.hasIschemicHeartDisease || props.hasMyocardialInfarctionHistory || props.takesBetaBlockers);
	const hasAllergy = Boolean(props.hasLidocaineAllergy || props.hasArticaineAllergy || props.hasSulfiteAllergy || props.hasBronchialAsthma || props.hasPenicillinAllergy || props.hasLatexAllergy);

	const defaultDrug: AnestheticDrugId = hasAllergy || isCardioRisk ? "mepivacaine_plain" : "articaine_1_100k";
	const [selectedDrugId, setSelectedDrugId] = useState<AnestheticDrugId | "none">(defaultDrug);
	const [techniqueId, setTechniqueId] = useState<InjectionTechniqueId>("infiltration");
	const [carpulesCount, setCarpulesCount] = useState<number>(1.0);
	const [isAspirationNegative, setIsAspirationNegative] = useState<boolean>(true);
	const [lastAppliedText, setLastAppliedText] = useState<string | null>(null);
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
	const memoBtnId = useId();

	const isPediatric = (typeof props.patientAgeYears === "number" && props.patientAgeYears < 18) || (typeof props.patientWeightKg === "number" && props.patientWeightKg > 0 && props.patientWeightKg < 40);
	const weight = resolveClinicalDefaultWeightKg(props.patientWeightKg, props.patientAgeYears, isPediatric);
	const effDrug: AnestheticDrugId = selectedDrugId === "none" ? "articaine_1_100k" : selectedDrugId;

	const safety = calculateAnesthesiaSafety({
		drugId: effDrug, carpulesCount, patientWeightKg: weight, patientAgeYears: props.patientAgeYears ?? 35,
		hasCardiovascularRisk: isCardioRisk, hasSulfiteAllergy: Boolean(props.hasSulfiteAllergy),
		hasBronchialAsthma: Boolean(props.hasBronchialAsthma), isPregnantOrLactating: Boolean(props.isPregnantOrLactating),
		techniqueId, targetToothNumberFdi: props.targetToothNumberFdi, aspirationNegativeConfirmed: isAspirationNegative,
	});

	const isOverdoseWarning = selectedDrugId !== "none" && (safety.isOverdose || safety.isEpinephrineOverdose || carpulesCount > safety.maxSafeCarpulesCount);

	const triggerToast = (msg: string) => {
		setToastMessage(msg);
		setTimeout(() => setToastMessage(null), 3000);
	};

	const applyAnesthesiaAction = (drugId: AnestheticDrugId | "none", count: number, tech: InjectionTechniqueId = techniqueId) => {
		setSelectedDrugId(drugId);
		setCarpulesCount(count);
		setTechniqueId(tech);

		const activeEff: AnestheticDrugId = drugId === "none" ? "articaine_1_100k" : drugId;
		const res = calculateAnesthesiaSafety({
			drugId: activeEff, carpulesCount: count, patientWeightKg: weight, patientAgeYears: props.patientAgeYears ?? 35,
			hasCardiovascularRisk: isCardioRisk, hasSulfiteAllergy: Boolean(props.hasSulfiteAllergy),
			hasBronchialAsthma: Boolean(props.hasBronchialAsthma), isPregnantOrLactating: Boolean(props.isPregnantOrLactating),
			techniqueId: tech, targetToothNumberFdi: props.targetToothNumberFdi, aspirationNegativeConfirmed: isAspirationNegative,
		});

		const techNameRu = tech.includes("mandibular") ? "проводниковая" : "инфильтрационная";
		const latin = drugId === "mepivacaine_plain" ? "Sol. Mepivacaini 3% (sine Epinephrino)" : drugId === "articaine_1_200k" ? "Sol. Articaini 4% cum Epinephrini 1:200 000" : "Sol. Articaini 4% cum Epinephrini 1:100 000";
		const vol = `${(count * 1.7).toFixed(1)} мл`;
		const toothPart = props.targetToothNumberFdi ? ` в области зуба ${props.targetToothNumberFdi}` : "";
		const diary = drugId === "none"
			? "Анестезия не проводилась. Процедура выполнена без анестезии по согласию пациента."
			: `Проведена ${techNameRu} анестезия${toothPart} ${latin} — ${vol} (${count} карп. / ${count} карпула). ${isAspirationNegative ? "Аспирационная проба отрицательная. " : ""}Осложнений нет.`;

		setLastAppliedText(drugId === "none" ? "Без анестезии" : `${drugId === "mepivacaine_plain" ? "Мепивакаин 3%" : drugId === "articaine_1_200k" ? "Артикаин 1:200к" : "Артикаин 1:100к"} — ${count} карп.`);
		props.onApplyAnesthesia?.(diary, res);

		if (drugId !== "none" && count > 0) {
			props.onDisposalCarpules?.(count, activeEff);
			postQuickCarpuleWriteoff({ visitId: props.visitId, patientId: props.patientId, count, drugId: activeEff });
			persistAnesthesiaLog({
				patientId: props.patientId, visitId: props.visitId, drugId: activeEff, techniqueId: tech,
				carpulesCount: count, patientWeightKg: weight, patientAgeYears: props.patientAgeYears ?? 35,
				isCardioRisk, targetToothNumberFdi: props.targetToothNumberFdi, diaryEntry: diary,
			});
		}
		triggerToast(drugId === "none" ? "Отметка «Без анестезии» внесена в карту" : `Анестезия (${count} карп.) внесена в протокол приёма`);
	};

	const copyMemo = async () => {
		const name = selectedDrugId === "mepivacaine_plain" ? "Мепивакаин 3% (Скандонест)" : selectedDrugId === "articaine_1_200k" ? "Артикаин 1:200к (Ультракаин Д-С)" : "Артикаин 1:100к (Ультракаин Форте)";
		const memo = formatAnesthesiaPatientMemo({
			clinicName: "Стоматологическая клиника DENTE", clinicPhone: "+7 (495) 123-45-67", patientName: "Пациент",
			doctorName: "Лечащий врач", drugTradeName: name, carpulesCount,
			targetArea: props.targetToothNumberFdi ? `зуб ${props.targetToothNumberFdi}` : "область вмешательства",
		});
		try { await navigator.clipboard.writeText(memo); triggerToast("Памятка скопирована в буфер"); }
		catch { triggerToast("Памятка сформирована"); }
	};

	const openEmergency = () => {
		if (props.onOpenEmergencyProtocol) props.onOpenEmergencyProtocol();
		else useUiSurfaceStore.getState().openPrimaryModal("emergency_rescue");
	};

	return (
		<div className="anesthesia-quick-bar" data-testid="anesthesia-quick-bar">
			{/* Верхняя строка контекста и пассивных предупреждений */}
			<div className="flex items-center justify-between gap-2 flex-wrap min-w-0" data-testid="anesthesia-top-header-row">
				<div className="flex items-center gap-1.5 flex-wrap min-w-0" data-testid="anesthesia-passive-alerts-strip">
					<span className="flex items-center gap-1 font-bold text-xs text-[var(--ink)] shrink-0">
						<Syringe className="w-3.5 h-3.5 text-teal-600 shrink-0" />
						<span>Обезболивание</span>
					</span>
					{props.targetToothNumberFdi && (
						<span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] shrink-0">
							Зуб {props.targetToothNumberFdi}
						</span>
					)}
					<span className="text-[11px] font-medium text-[var(--muted)] px-1.5 py-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] shrink-0">
						{`Вес пациента: ${weight} кг`}
					</span>

					{props.hasLidocaineAllergy && (
						<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0" data-testid="allergy-passive-badge">
							<AlertTriangle size={12} className="text-rose-600 shrink-0" />
							<span>Аллергия в анамнезе: Лидокаин (рекомендован Скандонест 3%)</span>
						</span>
					)}
					{props.hasArticaineAllergy && (
						<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0" data-testid="allergy-passive-badge-articaine">
							<AlertTriangle size={12} className="text-rose-600 shrink-0" />
							<span>Аллергия в анамнезе: Артикаин (рекомендован Скандонест 3%)</span>
						</span>
					)}
					{(props.hasSulfiteAllergy || props.hasBronchialAsthma) && (
						<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0" data-testid="anesthesia-passive-allergy-alert">
							<AlertTriangle size={12} className="text-amber-600 shrink-0" />
							<span>Аллергия на сульфиты / астма (рекомендован Скандонест 3% без вазоконстриктора)</span>
						</span>
					)}
					{isCardioRisk && (
						<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0" data-testid="anesthesia-passive-cardio-alert">
							<AlertTriangle size={12} className="text-amber-600 shrink-0" />
							<span>Рекомендуется препарат без вазоконстриктора (Скандонест 3%)</span>
						</span>
					)}
					{isOverdoseWarning && (
						<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0" data-testid="anesthesia-passive-overdose-alert">
							<AlertTriangle size={12} className="text-amber-600 shrink-0" />
							<span>{`Ориентир дозировки для ${weight} кг (макс. ${safety.maxSafeCarpulesCount} карп.)`}</span>
						</span>
					)}
				</div>

				<button
					type="button"
					onClick={openEmergency}
					className="px-2.5 py-1 min-h-[48px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-rose-500/10 hover:border-rose-500/40 text-[var(--muted)] hover:text-rose-600 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 ml-auto"
					data-testid="btn-anesthesia-quick-emergency"
				>
					<ShieldAlert size={14} className="shrink-0 text-rose-500" />
					<span>Аптечка</span>
				</button>
			</div>

			{/* Строка управления: техники, пресеты в 1 тап, степпер дозы и 1 Primary CTA */}
			<div className="flex items-center justify-between gap-2 flex-wrap min-w-0 pt-0.5">
				<div className="flex items-center gap-1.5 flex-wrap min-w-0" data-testid="anesthesia-chips-group">
					<div className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5" role="group">
						<button
							type="button"
							onClick={() => setTechniqueId("infiltration")}
							className={`px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold cursor-pointer transition-all ${techniqueId === "infiltration" ? "bg-[var(--teal-surface)] border border-[var(--teal)] text-[var(--teal-strong)] font-bold" : "bg-[var(--paper)] text-[var(--muted)]"}`}
							data-testid="technique-btn-infiltration"
						>
							Инфильтрационная
						</button>
						<button
							type="button"
							onClick={() => setTechniqueId("mandibular_torus")}
							className={`px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold cursor-pointer transition-all ${techniqueId === "mandibular_torus" ? "bg-[var(--teal-surface)] border border-[var(--teal)] text-[var(--teal-strong)] font-bold" : "bg-[var(--paper)] text-[var(--muted)]"}`}
							data-testid="technique-btn-mandibular"
						>
							Проводниковая
						</button>
						<button
							type="button"
							onClick={() => setTechniqueId("intraligamentary_sta")}
							className={`px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold cursor-pointer transition-all ${techniqueId === "intraligamentary_sta" ? "bg-[var(--teal-surface)] border border-[var(--teal)] text-[var(--teal-strong)] font-bold" : "bg-[var(--paper)] text-[var(--muted)]"}`}
							data-testid="technique-btn-intraligamentary"
						>
							Интралигаментарная
						</button>
					</div>

					{CLINICAL_FAST_PRESETS.map((p: ClinicalFastPresetItem) => {
						const isSel = selectedDrugId === p.drugId;
						const isCardio = p.isCardioRecommended;
						return (
							<button
								key={p.testId}
								type="button"
								onClick={() => applyAnesthesiaAction(p.drugId, p.drugId === "none" ? 0 : carpulesCount > 0 ? carpulesCount : p.count, p.defaultTechnique ?? techniqueId)}
								className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] h-11 rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
									isSel ? isCardio ? "border-2 border-amber-600 bg-amber-500/10 text-[var(--ink)] font-bold" : "border-2 border-[#0d9488] bg-[var(--teal-surface)] text-[var(--ink)] font-bold" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[#0d9488]"
								}`}
								data-testid={p.testId}
							>
								{p.drugId === "none" ? <CheckCircle2 size={14} className="text-slate-500 shrink-0" /> : <Syringe size={14} className={isCardio ? "text-amber-600 shrink-0" : "text-teal-600 shrink-0"} />}
								<span>{p.shortLabelRu}</span>
								<span className="sr-only">{p.srOnlyText}</span>
							</button>
						);
					})}
				</div>

				<div className="flex items-center gap-1.5 flex-wrap min-w-0 ml-auto" data-testid="anesthesia-stepper-cta-group">
					<fieldset className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shrink-0 m-0" aria-label="Быстрый выбор карпул">
						{CARPULE_PRESETS.map((cp) => (
							<button
								key={cp.count}
								type="button"
								onClick={() => setCarpulesCount(cp.count)}
								data-testid={cp.id}
								className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[44px] inline-flex items-center justify-center ${carpulesCount === cp.count ? "bg-[var(--teal-surface)] text-[var(--teal-strong)] font-bold border border-[var(--teal)] shadow-2xs" : "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"}`}
							>
								{cp.label}
							</button>
						))}
					</fieldset>

					<div className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shrink-0" aria-label="Счётчик карпул">
						<button
							type="button"
							onClick={() => setCarpulesCount((c) => Math.max(0.5, Math.round((c - 0.5) * 10) / 10))}
							className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-xs font-black text-[var(--ink)] bg-[var(--paper)] border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer"
							data-testid="btn-decrease-carpules"
						>
							−
						</button>
						<span className="px-2 text-xs font-bold font-mono text-[var(--ink)] select-none whitespace-nowrap" data-testid="selected-carpules-display">
							{carpulesCount} карп. ({(carpulesCount * 1.7).toFixed(1)} мл)
						</span>
						<button
							type="button"
							onClick={() => setCarpulesCount((c) => Math.min(10.0, Math.round((c + 0.5) * 10) / 10))}
							className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-xs font-black text-[var(--ink)] bg-[var(--paper)] border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer"
							data-testid="btn-increase-carpules"
						>
							+
						</button>
					</div>

					<label data-testid="label-aspiration-negative-norm" className="inline-flex items-center gap-1 px-2 py-1 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors select-none shrink-0">
						<input
							type="checkbox"
							checked={isAspirationNegative}
							onChange={() => setIsAspirationNegative((v) => !v)}
							data-testid="checkbox-aspiration-negative-norm"
							className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
						/>
						<span className="text-[11px] text-[var(--muted)]">Аспирация (−)</span>
					</label>

					<button
						id={memoBtnId}
						type="button"
						onClick={copyMemo}
						className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] transition-colors cursor-pointer shrink-0"
						title="Скопировать памятку пациенту"
					>
						<Share2 size={12} className="text-teal-600 shrink-0" />
						<span className="hidden xl:inline">Памятка</span>
					</button>

					<button
						type="button"
						onClick={() => setIsMobileDrawerOpen(true)}
						className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] shrink-0 cursor-pointer"
						data-testid="btn-open-anesthesia-mobile-sheet"
					>
						<SlidersHorizontal size={13} />
						<span>Шторка</span>
					</button>

					{/* РОВНО ОДНА PRIMARY CTA КНОПКА #0d9488 — МАНДАТ 8am & 8e (НИКОГДА НЕ DISABLED) */}
					<button
						type="button"
						onClick={() => applyAnesthesiaAction(selectedDrugId, carpulesCount)}
						className="primary-button inline-flex items-center gap-1.5 px-4 min-h-[44px] h-11 rounded-xl border border-[#0f766e] bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ml-auto"
						data-testid="btn-apply-anesthesia-to-card"
					>
						<CheckCircle2 size={14} className="shrink-0" />
						<span>Внести анестезию в дневник приёма</span>
						<span className="sr-only">Применить анестезию В карту В дневник</span>
					</button>
				</div>
			</div>

			{lastAppliedText && (
				<div className="flex items-center gap-1.5 pt-0.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
					<CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
					<span>{`Внесено в протокол: ${lastAppliedText}`}</span>
				</div>
			)}

			{toastMessage && (
				<div className="anesthesia-quick-toast" role="status" aria-live="polite">
					<CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
					<span>{toastMessage}</span>
				</div>
			)}

			{/* Нативная шторка Bottom Sheet для мобильных (Apple HIG Mandate 8ze) */}
			{isMobileDrawerOpen && (
				<div
					className="fixed inset-0 z-[10050] flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity lg:hidden anesthesia-mobile-sheet"
					data-testid="anesthesia-mobile-sheet"
					onClick={() => setIsMobileDrawerOpen(false)}
				>
					<div
						className="w-full max-w-lg bg-[var(--paper)] rounded-t-[24px] p-4 shadow-2xl border-t border-[var(--line)] flex flex-col gap-3 max-h-[85vh] overflow-y-auto max-w-full overflow-x-clip"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="w-[36px] h-[5px] bg-[var(--line-strong)] rounded-full mx-auto shrink-0 mb-1" />
						<div className="flex items-center justify-between pb-1 border-b border-[var(--line)]">
							<div className="flex items-center gap-2">
								<Syringe className="w-5 h-5 text-teal-600 shrink-0" />
								<h3 className="text-sm font-bold text-[var(--ink)]">Обезболивание у кресла</h3>
							</div>
							<button
								type="button"
								onClick={() => setIsMobileDrawerOpen(false)}
								aria-label="Закрыть"
								className="anesthesia-sheet-close-btn p-2 min-h-[44px] min-w-[44px] rounded-xl text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer"
							>
								<X size={20} />
							</button>
						</div>

						<div className="flex rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5" role="group">
							<button
								type="button"
								onClick={() => setTechniqueId("infiltration")}
								className={`flex-1 py-2 min-h-[44px] text-xs font-semibold rounded-lg ${techniqueId === "infiltration" ? "bg-[var(--teal-surface)] text-[var(--teal-strong)] font-bold border border-[var(--teal)]" : "text-[var(--muted)]"}`}
							>
								Инфильтрация
							</button>
							<button
								type="button"
								onClick={() => setTechniqueId("mandibular_torus")}
								className={`flex-1 py-2 min-h-[44px] text-xs font-semibold rounded-lg ${techniqueId === "mandibular_torus" ? "bg-[var(--teal-surface)] text-[var(--teal-strong)] font-bold border border-[var(--teal)]" : "text-[var(--muted)]"}`}
							>
								Проводниковая
							</button>
						</div>

						<div className="flex flex-col gap-2">
							{CLINICAL_FAST_PRESETS.map((cp) => (
								<button
									key={cp.testId}
									type="button"
									onClick={() => {
										applyAnesthesiaAction(cp.drugId, cp.drugId === "none" ? 0 : carpulesCount, cp.defaultTechnique ?? techniqueId);
										setIsMobileDrawerOpen(false);
									}}
									className={`secondary-button flex items-center justify-between p-3 min-h-[48px] rounded-xl border text-xs font-semibold cursor-pointer ${selectedDrugId === cp.drugId ? "border-2 border-[#0d9488] bg-[var(--teal-surface)] text-[var(--ink)]" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"}`}
								>
									<span>{cp.fullLabelRu}</span>
									<span className="text-[var(--muted)]">{cp.subLabelRu}</span>
								</button>
							))}
						</div>

						<button
							type="button"
							onClick={() => {
								applyAnesthesiaAction(selectedDrugId, carpulesCount);
								setIsMobileDrawerOpen(false);
							}}
							className="primary-button w-full mt-2 py-3 min-h-[48px] rounded-xl border border-[#0f766e] bg-[#0d9488] text-white text-xs font-bold cursor-pointer"
						>
							✓ Внести в карту приёма ({carpulesCount} карп.)
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
