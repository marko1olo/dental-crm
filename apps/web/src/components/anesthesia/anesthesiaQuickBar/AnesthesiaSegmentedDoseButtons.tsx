import { CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";

export interface AnesthesiaSegmentedDoseButtonsProps {
	disabled: boolean;
	selectedCarpulesCount?: number | undefined;
	onApplyCarpules: (count: number) => void;
	onChangeSelectedCarpulesCount?: ((count: number) => void) | undefined;
}

const CLINICAL_PRESETS: readonly {
	count: number;
	label: string;
	badge: string;
	testId: string;
	title: string;
	icon: "norm" | "gentle" | "cardio";
}[] = [
	{
		count: 1.0,
		label: "Норма: Артикаин 1:100 000 (1 карп.)",
		badge: "1.7 мл",
		testId: "anesthesia-dose-1carp",
		title: "Норма: Артикаин 1:100 000 (1 карпула 1.7 мл)",
		icon: "norm",
	},
	{
		count: 1.0,
		label: "Щадящий адреналин: Артикаин 1:200 000",
		badge: "1.7 мл",
		testId: "anesthesia-dose-200k",
		title: "Щадящий адреналин: Артикаин 1:200 000 (1 карпула 1.7 мл)",
		icon: "gentle",
	},
	{
		count: 1.0,
		label: "Кардио-защита: Мепивакаин без адреналина",
		badge: "1.7 мл",
		testId: "anesthesia-dose-cardio",
		title: "Кардио-защита: Мепивакаин 3% без адреналина (1 карпула 1.7 мл)",
		icon: "cardio",
	},
	{
		count: 2.0,
		label: "2 карпулы (3.4 мл)",
		badge: "Усиленная",
		testId: "anesthesia-dose-2carp",
		title: "Усиленная анестезия (2 карпулы 3.4 мл)",
		icon: "gentle",
	},
];

export function AnesthesiaSegmentedDoseButtons({
	disabled,
	selectedCarpulesCount = 1.0,
	onApplyCarpules,
	onChangeSelectedCarpulesCount,
}: AnesthesiaSegmentedDoseButtonsProps) {
	return (
		<fieldset
			className="m-0 inline-flex items-center gap-1.5 p-1 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] shadow-2xs flex-wrap"
			aria-label="Клинические экспресс-пресеты анестезии"
		>
			{CLINICAL_PRESETS.map((preset) => {
				const isSelected = selectedCarpulesCount === preset.count;
				return (
					<button
						key={preset.testId}
						type="button"
						disabled={disabled}
						onClick={() => {
							onChangeSelectedCarpulesCount?.(preset.count);
							onApplyCarpules(preset.count);
						}}
						className={`secondary-button px-3 py-1.5 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-98 border touch-manipulation whitespace-nowrap inline-flex items-center gap-1.5 ${
							isSelected
								? "is-selected bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal-strong)] ring-1 ring-[var(--teal)] shadow-2xs"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)]"
						}`}
						title={preset.title}
						data-testid={preset.testId}
					>
						{preset.icon === "norm" && <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />}
						{preset.icon === "gentle" && <Sparkles size={14} className="text-teal-600 shrink-0" />}
						{preset.icon === "cardio" && <ShieldAlert size={14} className="text-amber-600 shrink-0" />}
						<span>{preset.label}</span>
					</button>
				);
			})}
		</fieldset>
	);
}
