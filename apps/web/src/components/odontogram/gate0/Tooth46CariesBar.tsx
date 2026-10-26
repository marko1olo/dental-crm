import type React from "react";
import type { CariesDepth, CariesType, Tooth46LayerFlags } from "./tooth46Types";

export interface Tooth46CariesBarProps {
	layers: Tooth46LayerFlags;
	toothNumber?: number | undefined;
	onChangeCariesType?: ((type: CariesType) => void) | undefined;
	onChangeCariesDepth?: ((depth: CariesDepth) => void) | undefined;
	className?: string | undefined;
}

const POSTERIOR_LOCS: readonly { type: CariesType; label: string; title: string }[] = [
	{ type: "class1", label: "O", title: "Окклюзионная фиссура (Class I)" },
	{ type: "class2_m", label: "M", title: "Медиальный контакт (Class II M)" },
	{ type: "class2_d", label: "D", title: "Дистальный контакт (Class II D)" },
	{ type: "class2_mo", label: "MO", title: "Медио-окклюзионный бокс (Class II MO)" },
	{ type: "class2_do", label: "DO", title: "Дисто-окклюзионный бокс (Class II DO)" },
	{ type: "class2_mod", label: "MOD", title: "Сквозной разлом / перешеек (Class II MOD)" },
	{ type: "class5", label: "V", title: "Пришеечный / CEJ дефект (Class V)" },
];

const ANTERIOR_LOCS: readonly { type: CariesType; label: string; title: string }[] = [
	{ type: "class3", label: "III", title: "Апроксимальный кариес резца/клыка (Class III)" },
	{ type: "class4", label: "IV", title: "Скол режущего края/угла (Class IV)" },
	{ type: "class5", label: "V", title: "Пришеечный / CEJ дефект (Class V)" },
];

const DEPTH_STAGES: readonly { depth: CariesDepth; label: string; title: string }[] = [
	{ depth: "superficial", label: "Пятно", title: "Superficialis / Начальная деминерализация" },
	{ depth: "media", label: "Средний", title: "Media / Кариозный кратер плащевого дентина" },
	{ depth: "profunda", label: "Глубокий", title: "Profunda / Околопульпарный некроз" },
	{ depth: "destructive", label: "Скол", title: "Destructiva / Разрушение стенки" },
];

/**
 * DENTE Dental CRM — Segmented Caries Quick Picker Bar (Apple HIG Touch Ergonomics).
 * Mandate 8b: Strictly <= 120 lines. Zero emojis, pure CSS tokens.
 */
export const Tooth46CariesBar: React.FC<Tooth46CariesBarProps> = ({
	layers,
	toothNumber,
	onChangeCariesType,
	onChangeCariesDepth,
	className = "",
}) => {
	if (!layers.caries) return null;
	const isAnterior = toothNumber !== undefined && [1, 2, 3].includes(toothNumber % 10);
	const locs = isAnterior ? ANTERIOR_LOCS : POSTERIOR_LOCS;
	const currentType = layers.cariesType || (isAnterior ? "class3" : "class1");
	const currentDepth = layers.cariesDepth || "media";

	return (
		<div
			id="tooth46-caries-quick-bar"
			data-testid="tooth46-caries-quick-bar"
			className={`w-full flex flex-wrap items-center justify-center gap-3 py-2 px-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur-xs text-xs ${className}`}
		>
			{/* Класс / Локализация */}
			<div className="flex items-center gap-2">
				<span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
					Класс:
				</span>
				<div className="inline-flex p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800/80 border border-slate-300/40 dark:border-slate-700/60" role="group" aria-label="Локализация кариеса">
					{locs.map((loc) => {
						const active = currentType === loc.type;
						return (
							<button
								key={loc.type}
								type="button"
								data-caries-class={loc.label}
								onClick={() => onChangeCariesType?.(loc.type)}
								title={loc.title}
								className={`px-2.5 py-1 min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[30px] rounded-md text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer ${
									active
										? "bg-amber-600 text-white shadow-xs dark:bg-amber-500"
										: "bg-transparent text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10"
								}`}
							>
								{loc.label}
							</button>
						);
					})}
				</div>
			</div>

			{/* 4 стадии ВОЗ (Пятно, Средний, Глубокий, Скол) */}
			<div className="flex items-center gap-2">
				<span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
					Глубина:
				</span>
				<div className="inline-flex p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800/80 border border-slate-300/40 dark:border-slate-700/60" role="group" aria-label="Стадия глубины поражения">
					{DEPTH_STAGES.map((st) => {
						const active = currentDepth === st.depth;
						return (
							<button
								key={st.depth}
								type="button"
								data-caries-depth={st.depth}
								onClick={() => onChangeCariesDepth?.(st.depth)}
								title={st.title}
								className={`px-3 py-1 min-h-[44px] sm:min-h-[28px] rounded-md text-xs font-semibold transition-all flex items-center justify-center shrink-0 cursor-pointer ${
									active
										? "bg-teal-600 text-white shadow-xs dark:bg-teal-500"
										: "bg-transparent text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10"
								}`}
							>
								{st.label}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};