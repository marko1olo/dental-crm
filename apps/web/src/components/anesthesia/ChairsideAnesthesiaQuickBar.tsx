/**
 * @dental/web/components/anesthesia/ChairsideAnesthesiaQuickBar.tsx
 * DENTE Chairside Anesthesia QuickBar SSOT (Mandates 8b 200-250 lines, 8e, 8n, 8y, 8am, 8ze)
 * 1-click presets, 1 primary CTA #0d9488, 0 dead-ends, soft negative stock writeoff.
 */

import { CheckCircle2, Share2, ShieldAlert, SlidersHorizontal } from "lucide-react";
import React, { useId, useState } from "react";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import {
	type AnestheticDrugId,
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
import {
	AnesthesiaDosageStepper,
	AnesthesiaDrugSelector,
	AnesthesiaMobileDrawer,
	AnesthesiaSomaticWarning,
} from "./quickBar";

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
	const initialCardio = Boolean(
		props.hasCardiovascularRisk ||
		props.hasHypertension ||
		props.hasCardiacArrhythmia ||
		props.hasIschemicHeartDisease ||
		props.hasMyocardialInfarctionHistory ||
		props.takesBetaBlockers,
	);
	const hasAllergy = Boolean(
		props.hasLidocaineAllergy ||
		props.hasArticaineAllergy ||
		props.hasSulfiteAllergy ||
		props.hasBronchialAsthma ||
		props.hasPenicillinAllergy ||
		props.hasLatexAllergy,
	);

	// 1-клик селектор соматического профиля (Мандат 8e, 8y)
	const [isCardioRisk, setIsCardioRisk] = useState<boolean>(initialCardio);
	const defaultDrug: AnestheticDrugId = hasAllergy || initialCardio ? "mepivacaine_plain" : "articaine_1_100k";
	const [selectedDrugId, setSelectedDrugId] = useState<AnestheticDrugId | "none">(defaultDrug);
	const [techniqueId, setTechniqueId] = useState<InjectionTechniqueId>("infiltration");
	const [carpulesCount, setCarpulesCount] = useState<number>(1.0);
	const [isAspirationNegative, setIsAspirationNegative] = useState<boolean>(true);
	const [lastAppliedText, setLastAppliedText] = useState<string | null>(null);
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
	const memoBtnId = useId();

	const isPediatric =
		(typeof props.patientAgeYears === "number" && props.patientAgeYears < 18) ||
		(typeof props.patientWeightKg === "number" && props.patientWeightKg > 0 && props.patientWeightKg < 40);
	const weight = resolveClinicalDefaultWeightKg(props.patientWeightKg, props.patientAgeYears, isPediatric);
	const effDrug: AnestheticDrugId = selectedDrugId === "none" ? "articaine_1_100k" : selectedDrugId;

	const safety = calculateAnesthesiaSafety({
		drugId: effDrug,
		carpulesCount,
		patientWeightKg: weight,
		patientAgeYears: props.patientAgeYears ?? 35,
		hasCardiovascularRisk: isCardioRisk,
		hasSulfiteAllergy: Boolean(props.hasSulfiteAllergy),
		hasBronchialAsthma: Boolean(props.hasBronchialAsthma),
		isPregnantOrLactating: Boolean(props.isPregnantOrLactating),
		techniqueId,
		targetToothNumberFdi: props.targetToothNumberFdi,
		aspirationNegativeConfirmed: isAspirationNegative,
	});

	const isOverdoseWarning =
		selectedDrugId !== "none" &&
		(safety.isOverdose || safety.isEpinephrineOverdose || carpulesCount > safety.maxSafeCarpulesCount);

	const triggerToast = (msg: string) => {
		setToastMessage(msg);
		setTimeout(() => setToastMessage(null), 3000);
	};

	const toggleSomaticStatus = (cardio: boolean) => {
		setIsCardioRisk(cardio);
		if (cardio && selectedDrugId === "articaine_1_100k") {
			setSelectedDrugId("mepivacaine_plain");
		}
	};

	const applyAnesthesiaAction = (
		drugId: AnestheticDrugId | "none",
		count: number,
		tech: InjectionTechniqueId = techniqueId,
	) => {
		setSelectedDrugId(drugId);
		setCarpulesCount(count);
		setTechniqueId(tech);

		const activeEff: AnestheticDrugId = drugId === "none" ? "articaine_1_100k" : drugId;
		const res = calculateAnesthesiaSafety({
			drugId: activeEff,
			carpulesCount: count,
			patientWeightKg: weight,
			patientAgeYears: props.patientAgeYears ?? 35,
			hasCardiovascularRisk: isCardioRisk,
			hasSulfiteAllergy: Boolean(props.hasSulfiteAllergy),
			hasBronchialAsthma: Boolean(props.hasBronchialAsthma),
			isPregnantOrLactating: Boolean(props.isPregnantOrLactating),
			techniqueId: tech,
			targetToothNumberFdi: props.targetToothNumberFdi,
			aspirationNegativeConfirmed: isAspirationNegative,
		});

		const techNameRu = tech.includes("mandibular") ? "проводниковая" : "инфильтрационная";
		const latin =
			drugId === "mepivacaine_plain"
				? "Sol. Mepivacaini 3% (sine Epinephrino)"
				: drugId === "articaine_1_200k"
					? "Sol. Articaini 4% cum Epinephrini 1:200 000"
					: "Sol. Articaini 4% cum Epinephrini 1:100 000";
		const vol = `${(count * 1.7).toFixed(1)} мл`;
		const toothPart = props.targetToothNumberFdi ? ` в области зуба ${props.targetToothNumberFdi}` : "";
		const carpSuffix = count === 1 ? "1 карпула" : `${count} карп.`;
		const diary =
			drugId === "none"
				? "Анестезия не проводилась. Процедура выполнена без анестезии по согласию пациента."
				: `Проведена ${techNameRu} анестезия${toothPart} ${latin} — ${vol} (${carpSuffix}). ${isAspirationNegative ? "Аспирационная проба отрицательная. " : ""}Осложнений нет.`;

		setLastAppliedText(
			drugId === "none"
				? "Без анестезии"
				: `${drugId === "mepivacaine_plain" ? "Мепивакаин 3%" : drugId === "articaine_1_200k" ? "Артикаин 1:200к" : "Артикаин 1:100к"} — ${count} карп.`,
		);
		props.onApplyAnesthesia?.(diary, res);

		if (drugId !== "none" && count > 0) {
			props.onDisposalCarpules?.(count, activeEff);
			postQuickCarpuleWriteoff({ visitId: props.visitId, patientId: props.patientId, count, drugId: activeEff });
			persistAnesthesiaLog({
				patientId: props.patientId,
				visitId: props.visitId,
				drugId: activeEff,
				techniqueId: tech,
				carpulesCount: count,
				patientWeightKg: weight,
				patientAgeYears: props.patientAgeYears ?? 35,
				isCardioRisk,
				targetToothNumberFdi: props.targetToothNumberFdi,
				diaryEntry: diary,
			});
		}
		triggerToast(
			drugId === "none" ? "Отметка «Без анестезии» внесена в карту" : `Анестезия (${count} карп.) внесена в дневник приёма`,
		);
	};

	const copyMemo = async () => {
		const name =
			selectedDrugId === "mepivacaine_plain"
				? "Мепивакаин 3% (Скандонест)"
				: selectedDrugId === "articaine_1_200k"
					? "Артикаин 1:200к (Ультракаин Д-С)"
					: "Артикаин 1:100к (Ультракаин Форте)";
		const memo = formatAnesthesiaPatientMemo({
			clinicName: "Стоматологическая клиника DENTE",
			clinicPhone: "+7 (495) 123-45-67",
			patientName: "Пациент",
			doctorName: "Лечащий врач",
			drugTradeName: name,
			carpulesCount,
			targetArea: props.targetToothNumberFdi ? `зуб ${props.targetToothNumberFdi}` : "область вмешательства",
		});
		try {
			await navigator.clipboard.writeText(memo);
			triggerToast("Памятка скопирована в буфер");
		} catch {
			triggerToast("Памятка сформирована");
		}
	};

	const openEmergency = () => {
		if (props.onOpenEmergencyProtocol) props.onOpenEmergencyProtocol();
		else useUiSurfaceStore.getState().openPrimaryModal("emergency_rescue");
	};

	return (
		<div className="anesthesia-quick-bar" data-testid="anesthesia-quick-bar">
			{/* Верхняя строка контекста и пассивных предупреждений */}
			<div className="flex items-center justify-between gap-2 flex-wrap min-w-0" data-testid="anesthesia-top-header-row">
				<AnesthesiaSomaticWarning
					weight={weight}
					targetToothNumberFdi={props.targetToothNumberFdi}
					isCardioRisk={isCardioRisk}
					onToggleCardioRisk={toggleSomaticStatus}
					hasLidocaineAllergy={props.hasLidocaineAllergy}
					hasArticaineAllergy={props.hasArticaineAllergy}
					hasSulfiteAllergy={props.hasSulfiteAllergy}
					hasBronchialAsthma={props.hasBronchialAsthma}
					isOverdoseWarning={isOverdoseWarning}
					maxSafeCarpulesCount={safety.maxSafeCarpulesCount}
				/>

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
				<AnesthesiaDrugSelector
					techniqueId={techniqueId}
					onSelectTechnique={setTechniqueId}
					selectedDrugId={selectedDrugId}
					carpulesCount={carpulesCount}
					onApplyPreset={applyAnesthesiaAction}
				/>

				<div className="flex items-center gap-1.5 flex-wrap min-w-0 ml-auto" data-testid="anesthesia-stepper-cta-group">
					<AnesthesiaDosageStepper
						carpulesCount={carpulesCount}
						onSelectCount={setCarpulesCount}
						onDecrease={() => setCarpulesCount((c) => Math.max(0.5, Math.round((c - 0.5) * 10) / 10))}
						onIncrease={() => setCarpulesCount((c) => Math.min(10.0, Math.round((c + 0.5) * 10) / 10))}
						isAspirationNegative={isAspirationNegative}
						onToggleAspiration={() => setIsAspirationNegative((v) => !v)}
					/>

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
						className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] shrink-0 cursor-pointer transition-colors active:scale-98"
						data-testid="btn-open-anesthesia-mobile-sheet"
						title="Открыть параметры анестезии"
					>
						<SlidersHorizontal size={14} className="text-teal-600 shrink-0" />
						<span>Параметры</span>
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
			<AnesthesiaMobileDrawer
				isOpen={isMobileDrawerOpen}
				onClose={() => setIsMobileDrawerOpen(false)}
				techniqueId={techniqueId}
				onSelectTechnique={setTechniqueId}
				selectedDrugId={selectedDrugId}
				carpulesCount={carpulesCount}
				onSelectCount={setCarpulesCount}
				onDecrease={() => setCarpulesCount((c) => Math.max(0.5, Math.round((c - 0.5) * 10) / 10))}
				onIncrease={() => setCarpulesCount((c) => Math.min(10.0, Math.round((c + 0.5) * 10) / 10))}
				isAspirationNegative={isAspirationNegative}
				onToggleAspiration={() => setIsAspirationNegative((v) => !v)}
				onApplyAnesthesia={applyAnesthesiaAction}
			/>
		</div>
	);
}
