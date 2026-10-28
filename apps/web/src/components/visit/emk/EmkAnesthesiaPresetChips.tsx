import { CheckCircle2, ShieldAlert, Star, Syringe } from "lucide-react";
import {
	EMK_ANESTHESIA_PRESETS,
	type EmkAnesthesiaPreset,
} from "./emkAnesthesiaPresets";

export const ANESTHESIA_METHODS = [
	{ id: "infiltration", label: "Инфильтрационная", short: "Инфильтр." },
	{ id: "conduction", label: "Проводниковая", short: "Проводник." },
	{ id: "intraligamentary", label: "Интралигаментарная", short: "Интралигам." },
] as const;

export interface EmkAnesthesiaPresetChipsProps {
	selectedDrugKey: string;
	selectedMethod?: string;
	selectedCarpulesCount?: number;
	favoriteAnes?: string | null;
	onSelectMethod?: (method: string) => void;
	onSelectCarpulesCount?: (count: number) => void;
	onApplyPreset: (preset: EmkAnesthesiaPreset, count?: number) => void;
	onNoAnesthesia: () => void;
	onAntishockEmergency: () => void;
}

export function EmkAnesthesiaPresetChips({
	selectedDrugKey,
	selectedMethod = "infiltration",
	selectedCarpulesCount = 1,
	favoriteAnes,
	onSelectMethod,
	onSelectCarpulesCount,
	onApplyPreset,
	onNoAnesthesia,
	onAntishockEmergency,
}: EmkAnesthesiaPresetChipsProps) {
	return (
		<div className="flex flex-col gap-2 pt-2 border-t border-[var(--line)] bg-transparent min-w-0">
			{/* Способы анестезии и дозировка в 1 клик */}
			<div className="flex items-center gap-3 flex-wrap">
				<div className="flex items-center gap-1.5 shrink-0">
					<span className="text-[11px] font-bold text-[var(--muted)] flex items-center gap-1 shrink-0">
						<Syringe size={13} className="text-[var(--ink-muted)] shrink-0" />
						<span>Способ:</span>
					</span>
					<div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] shrink-0" role="tablist" aria-label="Способ анестезии">
						{ANESTHESIA_METHODS.map((m) => {
							const isSelected = selectedMethod === m.id;
							return (
								<button
									key={m.id}
									type="button"
									role="tab"
									aria-selected={isSelected}
									onClick={() => onSelectMethod?.(m.id)}
									data-testid={`anes-method-${m.id}`}
									className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
										isSelected
											? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line-strong,var(--line))]"
											: "text-[var(--muted)] hover:text-[var(--ink)] border border-transparent"
									}`}
								>
									<span className="hidden sm:inline">{m.label}</span>
									<span className="sm:hidden">{m.short}</span>
								</button>
							);
						})}
					</div>
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					<span className="text-[11px] font-bold text-[var(--muted)] shrink-0">
						Дозировка:
					</span>
					<div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] shrink-0" role="group" aria-label="Дозировка анестетика">
						<button
							type="button"
							onClick={() => onSelectCarpulesCount?.(1)}
							data-testid="btn-emk-dose-1carp"
							className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
								selectedCarpulesCount === 1
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line-strong,var(--line))] font-bold"
									: "text-[var(--muted)] hover:text-[var(--ink)] border border-transparent"
							}`}
							title="1 карпула (1.7 мл) — стандартная доза"
						>
							1 карпула (1.7 мл)
						</button>
						<button
							type="button"
							onClick={() => onSelectCarpulesCount?.(2)}
							data-testid="btn-emk-dose-2carp"
							className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
								selectedCarpulesCount === 2
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line-strong,var(--line))] font-bold"
									: "text-[var(--muted)] hover:text-[var(--ink)] border border-transparent"
							}`}
							title="2 карпулы (3.4 мл) — для проводниковой/длительной анестезии"
						>
							2 карпулы (3.4 мл)
						</button>
					</div>
				</div>
			</div>

			{/* 3 любимых препарата клиники: чистые аккуратные капсулы */}
			<div className="flex items-center gap-1.5 flex-wrap">
				{EMK_ANESTHESIA_PRESETS.map((preset) => {
					const isFav =
						(favoriteAnes === "articaine_100k" && preset.key === "ultracain_ds_forte") ||
						(favoriteAnes === "articaine_200k" && preset.key === "ultracain_ds") ||
						(favoriteAnes === "scandonest_mepivacaine_3" && preset.key === "scandonest_3");
					const isSelected = selectedDrugKey === preset.key;
					return (
						<button
							key={preset.key}
							type="button"
							onClick={() => onApplyPreset(preset, selectedCarpulesCount)}
							data-testid={`btn-anes-${preset.key.replace(/_/g, "-")}`}
							className={`min-h-[34px] h-8.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0 ${
								isSelected || isFav
									? "bg-[var(--paper-soft)] border-[var(--ink-secondary,var(--line-strong))] text-[var(--ink)] font-bold shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong)]"
							}`}
							title={`Внести ${preset.title} (${selectedCarpulesCount} карп.) в протокол и счёт`}
						>
							<Syringe size={13} className="text-[var(--ink-muted)] shrink-0" />
							<span>{preset.title}</span>
							{isFav && <Star size={10} className="fill-[var(--ink-muted)] text-[var(--ink-muted)]" />}
						</button>
					);
				})}
				<button
					type="button"
					onClick={onNoAnesthesia}
					data-testid="btn-anes-none"
					className={`min-h-[34px] h-8.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0 ${
						selectedDrugKey === "none"
							? "bg-[var(--paper-soft)] border-[var(--ink-secondary,var(--line-strong))] text-[var(--ink)] font-bold shadow-xs"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong)]"
					}`}
					title="Лечение без анестезии / Интактно"
				>
					<CheckCircle2 size={13} className="text-[var(--ink-muted)] shrink-0" />
					<span>Без анестезии / Интактно</span>
				</button>
				<button
					type="button"
					onClick={onAntishockEmergency}
					data-testid="btn-anes-antishock-emergency"
					className="min-h-[34px] h-8.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0 ml-auto"
					title="Экстренная аптечка «Антишок»: мгновенное открытие протокола неотложной помощи"
				>
					<ShieldAlert size={13} className="shrink-0" />
					<span>Антишок</span>
				</button>
			</div>
		</div>
	);
}
