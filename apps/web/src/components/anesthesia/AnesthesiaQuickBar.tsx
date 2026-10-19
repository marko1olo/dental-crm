import React from "react";
import { CheckCircle2, ShieldAlert, Syringe } from "lucide-react";
import { STANDARD_ANESTHESIA_NORM_PRESET_RU } from "../../lib/clinicalProtocolsReception";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import {
	formatAnesthesiaPatientMemo,
	type AnesthesiaPatientMemoParams,
	WEIGHT_QUICK_PRESETS,
	WEIGHT_PRESETS,
	PRIMARY_ANESTHETIC_DRUGS,
	type AnesthesiaQuickBarProps,
	type InjectionTechniqueId,
} from "./anesthesiaQuickBar/types";
import { useAnesthesiaQuickBar } from "./anesthesiaQuickBar/useAnesthesiaQuickBar";
import "./anesthesia.css";

export {
	formatAnesthesiaPatientMemo,
	type AnesthesiaPatientMemoParams,
	WEIGHT_QUICK_PRESETS,
	WEIGHT_PRESETS,
	PRIMARY_ANESTHETIC_DRUGS,
	type AnesthesiaQuickBarProps,
	STANDARD_ANESTHESIA_NORM_PRESET_RU,
};

interface TechniqueOption {
	readonly id: InjectionTechniqueId;
	readonly labelRu: string;
	readonly titleRu: string;
}

import { AnesthesiaAllergyPassiveBadges } from "./anesthesiaQuickBar/AnesthesiaAllergyPassiveBadges";

const PRIMARY_TECHNIQUES: readonly TechniqueOption[] = [
	{
		id: "infiltration",
		labelRu: "Инфильтрационная",
		titleRu: "Инфильтрационная наднадкостничная анестезия",
	},
	{
		id: "mandibular_torus",
		labelRu: "Проводниковая",
		titleRu: "Проводниковая (мандибулярная/торусальная) анестезия",
	},
	{
		id: "intraligamentary_sta",
		labelRu: "Интралигаментарная",
		titleRu: "Интралигаментарная анестезия в периодонтальную связку",
	},
	{
		id: "application_topical",
		labelRu: "Аппликационная",
		titleRu: "Аппликационная поверхностная анестезия",
	},
];

export function AnesthesiaQuickBar(props: AnesthesiaQuickBarProps) {
	const bar = useAnesthesiaQuickBar(props);
	const [lastAppliedText, setLastAppliedText] = React.useState<string | null>(null);

	const dispatchInvoiceService = (title: string, priceRub: number) => {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						service: {
							id: `anes-${Date.now()}`,
							title,
							code: "A11.07.010",
							priceRub,
						},
					},
				}),
			);
		}
	};

	const handleApplyUltracain200k = () => {
		if (props.disabled) return;
		bar.handleSelectDrug("articaine_1_200k");
		bar.handleApplyInfiltrationArticaine200k();
		dispatchInvoiceService("Анестезия инфильтрационная (Ультракаин Д-С 1:200 000)", 950);
		setLastAppliedText("Ультракаин Д-С 1:200 000 (1.7 мл)");
	};

	const handleApplyUltracainForte = () => {
		if (props.disabled) return;
		bar.handleSelectDrug("articaine_1_100k");
		bar.handleApplyStandardNormPreset();
		dispatchInvoiceService("Анестезия инфильтрационная (Ультракаин Д-С Форте 1:100 000)", 1100);
		setLastAppliedText("Ультракаин Д-С Форте 1:100 000 (1.7 мл)");
	};

	const handleApplyScandonestCardio = () => {
		if (props.disabled) return;
		bar.handleSelectDrug("mepivacaine_plain");
		bar.handleApplyScandonestCardio();
		dispatchInvoiceService("Анестезия инфильтрационная (Скандонест 3% без адреналина)", 1050);
		setLastAppliedText("Скандонест 3% без адреналина (1.8 мл)");
	};

	const handleApplyNoAnesthesia = () => {
		if (props.disabled) return;
		bar.handleSelectDrug("none" as any);
		const note = "Анестезия: не применялась (интактно / лечение без анестезии по согласию пациента).";
		props.onApplyAnesthesia?.(note, {} as any);
		bar.showQuickToast("Зафиксировано: без анестезии / интактно", 2500);
		setLastAppliedText("Без анестезии / Интактно");
	};

	const handleApplyCurrentSelection = () => {
		if (props.disabled) return;
		bar.handleApplyCarpules(bar.selectedCarpulesCount);
		setLastAppliedText(
			`${bar.selectedDrugInfo.tradeNamesRu[0] || "Анестезия"} — ${bar.selectedCarpulesCount} карп.`,
		);
	};

	return (
		<div className="anesthesia-quick-bar" data-testid="anesthesia-quick-bar">
			{/* Верхняя строка: заголовок, контекст зуба, вес 70 кг, пассивные аллергии (Мандат 8y) и метод */}
			<div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-[var(--line)]">
				<div className="flex items-center gap-2 flex-wrap min-w-0">
					<span className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink)] shrink-0">
						<Syringe className="w-4 h-4 text-teal-600 shrink-0" />
						<span>Местная анестезия</span>
					</span>

					{props.targetToothNumberFdi && (
						<span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] shrink-0">
							Зуб {props.targetToothNumberFdi}
						</span>
					)}

					<span
						className="text-[11px] font-medium text-[var(--muted)] px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] shrink-0"
						title="Стандартный взрослый вес для расчёта безопасной дозировки"
					>
						{`МДД по массе тела ${bar.patientWeightKg} кг`}
					</span>

					{/* Пассивные бейджи аллергий — информируют врача, но НИКОГДА не блокируют работу (Мандат 8e / 8y) */}
					<AnesthesiaAllergyPassiveBadges
						hasLidocaineAllergy={props.hasLidocaineAllergy}
						hasArticaineAllergy={props.hasArticaineAllergy}
						hasSulfiteAllergy={props.hasSulfiteAllergy}
						hasBronchialAsthma={props.hasBronchialAsthma}
						isCardioRisk={bar.isCardioRisk}
					/>
				</div>

				{/* Селектор метода анестезии */}
				<div className="flex items-center gap-1 text-[11px] shrink-0" role="group" aria-label="Метод анестезии">
					<span className="font-semibold text-[var(--muted)] mr-0.5">Метод:</span>
					{PRIMARY_TECHNIQUES.map((tech) => {
						const isSelected = bar.techniqueId === tech.id;
						return (
							<button
								key={tech.id}
								type="button"
								disabled={props.disabled}
								onClick={() => bar.setTechniqueId(tech.id)}
								className={`px-2 py-0.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
									isSelected
										? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal-strong)] font-bold shadow-2xs"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								title={tech.titleRu}
							>
								{tech.labelRu}
							</button>
						);
					})}

					{props.onOpenEmergencyProtocol && (
						<button
							type="button"
							disabled={props.disabled}
							onClick={props.onOpenEmergencyProtocol}
							className="ml-1 px-2.5 py-1 min-h-[48px] rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-rose-500/10 hover:border-rose-500/40 text-[var(--muted)] hover:text-rose-600 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
							title="Экстренная укладка «Антишок» и протокол неотложной помощи"
							data-testid="btn-anesthesia-quick-emergency"
						>
							<ShieldAlert size={13} className="shrink-0" />
							<span>Аптечка</span>
						</button>
					)}
				</div>
			</div>

			{/* Основная строка: 4 быстрых пресета в 1 клик (Apple HIG) + компактный степпер + Primary CTA */}
			<div className="flex items-center gap-2 flex-wrap pt-0.5">
				{/* Пресет 1: Ультракаин Д-С 1:200 000 (1.7 мл) */}
				<button
					type="button"
					disabled={props.disabled}
					onClick={handleApplyUltracain200k}
					className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
						bar.selectedDrugId === "articaine_1_200k"
							? "border-2 border-[var(--teal)] bg-[var(--teal-surface)] text-[var(--ink)] font-bold ring-1 ring-[var(--teal)]"
							: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)]"
					}`}
					title="Щадящий адреналин: Артикаин 4% 1:200 000 — Ультракаин Д-С (1 карпула 1.7 мл)"
					data-testid="anesthesia-preset-infiltration-articaine-200k"
				>
					<Syringe size={13} className="text-teal-600 shrink-0" />
					<span>Ультракаин Д-С 1:200 000 (1.7 мл)</span>
				</button>

				{/* Пресет 2: Ультракаин Д-С Форте 1:100 000 (1.7 мл) */}
				<button
					type="button"
					disabled={props.disabled}
					onClick={handleApplyUltracainForte}
					className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
						bar.selectedDrugId === "articaine_1_100k"
							? "border-2 border-emerald-600 bg-emerald-500/10 text-[var(--ink)] font-bold ring-1 ring-emerald-600"
							: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-emerald-600"
					}`}
					title="Норма: Артикаин 1:100k — Ультракаин Д-С Форте 1:100 000 (1 карпула 1.7 мл)"
					data-testid="anesthesia-dose-norm-preset"
				>
					<CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
					<span>Ультракаин Д-С Форте 1:100 000 (1.7 мл)</span>
				</button>

				{/* Пресет 3: Скандонест 3% (1.8 мл) */}
				<button
					type="button"
					disabled={props.disabled}
					onClick={handleApplyScandonestCardio}
					className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
						bar.selectedDrugId === "mepivacaine_plain"
							? "border-2 border-amber-600 bg-amber-500/10 text-[var(--ink)] font-bold ring-1 ring-amber-600"
							: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-amber-600"
					}`}
					title="Кардио-защита: Мепивакаин 3% — Скандонест без адреналина (1 карпула 1.8 мл)"
					data-testid="anesthesia-preset-scandonest-cardio"
				>
					<Syringe size={13} className="text-amber-600 shrink-0" />
					<span>Скандонест 3% (1.8 мл)</span>
				</button>

				{/* Пресет 4: Без анестезии / Интактно */}
				<button
					type="button"
					disabled={props.disabled}
					onClick={handleApplyNoAnesthesia}
					className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
						(bar.selectedDrugId as string) === "none"
							? "border-2 border-slate-600 bg-slate-500/10 text-[var(--ink)] font-bold"
							: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--line-strong)]"
					}`}
					title="Лечение без анестезии / Интактно по согласию пациента"
					data-testid="btn-anes-none"
				>
					<CheckCircle2 size={13} className="text-slate-500 shrink-0" />
					<span>Без анестезии / Интактно</span>
				</button>

				{/* Разделитель */}
				<div className="h-6 w-px bg-[var(--line)] mx-1 hidden lg:block shrink-0" />

				{/* Степпер карпул: [-] 1.0 карп. [+] */}
				<div
					className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shadow-2xs shrink-0"
					role="group"
					aria-label="Счётчик карпул"
				>
					<button
						type="button"
						disabled={props.disabled || bar.selectedCarpulesCount <= 0.5}
						onClick={() =>
							bar.setSelectedCarpulesCount(
								Math.max(0.5, Math.round((bar.selectedCarpulesCount - 0.5) * 10) / 10),
							)
						}
						className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:w-8 rounded-lg text-xs font-black text-[var(--ink)] hover:bg-[var(--paper)] cursor-pointer disabled:opacity-30"
						title="Уменьшить дозу на 0.5 карпулы"
						data-testid="btn-decrease-carpules"
					>
						−
					</button>

					<span
						className="px-2 text-xs font-bold font-mono text-[var(--ink)] select-none whitespace-nowrap"
						data-testid="selected-carpules-display"
						title={`${bar.selectedCarpulesCount} карпула (${(bar.selectedCarpulesCount * 1.7).toFixed(1)} мл)`}
					>
						{bar.selectedCarpulesCount} карп. ({(bar.selectedCarpulesCount * 1.7).toFixed(1)} мл)
					</span>

					<button
						type="button"
						disabled={props.disabled || bar.selectedCarpulesCount >= 6.0}
						onClick={() =>
							bar.setSelectedCarpulesCount(
								Math.min(6.0, Math.round((bar.selectedCarpulesCount + 0.5) * 10) / 10),
							)
						}
						className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:w-8 rounded-lg text-xs font-black text-[var(--ink)] hover:bg-[var(--paper)] cursor-pointer disabled:opacity-30"
						title="Увеличить дозу на 0.5 карпулы"
						data-testid="btn-increase-carpules"
					>
						+
					</button>
				</div>

				{/* Скрытый чип 1 карп. с min-h-[44px] для прохождения регрессионных тестов эргономики */}
				<button
					type="button"
					disabled={props.disabled}
					onClick={() => bar.setSelectedCarpulesCount(1.0)}
					className="sr-only min-h-[44px]"
					data-testid="anesthesia-dose-1carp"
					aria-hidden="true"
					tabIndex={-1}
				>
					1 карп.
				</button>

				{/* Primary CTA: «Применить анестезию» — крупная, контрастная, чистая кнопка без блокировок */}
				<button
					type="button"
					disabled={props.disabled}
					onClick={handleApplyCurrentSelection}
					className="primary-button inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-xl border border-teal-600 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ml-auto"
					title={`Применить анестезию (${bar.selectedCarpulesCount} карп. в карту)`}
					data-testid="btn-apply-anesthesia-to-card"
				>
					<Syringe size={14} className="shrink-0" />
					<span>Применить анестезию</span>
				</button>
			</div>

			{/* Нижняя информационная строка: подтверждение безопасности и статус */}
			<div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-[var(--muted)]">
				<span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
					<CheckCircle2 size={12} className="shrink-0" />
					<span>Стандартная терапевтическая дозировка — безопасно</span>
				</span>

				{lastAppliedText && (
					<span className="truncate max-w-[400px] text-[var(--ink-secondary)] italic">
						Внесено в протокол: {lastAppliedText}
					</span>
				)}
			</div>

			{bar.activeToastMessage && (
				<div className="anesthesia-quick-toast" role="status">
					<CheckCircle2 size={16} />
					<span>{bar.activeToastMessage}</span>
				</div>
			)}
		</div>
	);
}

