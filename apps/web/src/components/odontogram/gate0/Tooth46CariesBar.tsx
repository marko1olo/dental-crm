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

const DEPTH_STAGES: readonly { depth: CariesDepth; marker: string; label: string; title: string; activeCls: string }[] = [
	{ depth: "superficial", marker: "⚪", label: "Пятно", title: "Superficialis / Начальная деминерализация", activeCls: "bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-sm" },
	{ depth: "media", marker: "🟤", label: "Средний", title: "Media / Кариозный кратер плащевого дентина", activeCls: "bg-orange-600 text-white border-orange-500 font-bold shadow-sm" },
	{ depth: "profunda", marker: "⚫", label: "Глубокий", title: "Profunda / Околопульпарный некроз", activeCls: "bg-rose-700 text-white border-rose-600 font-bold shadow-sm" },
	{ depth: "destructive", marker: "💥", label: "Скол", title: "Destructiva / Разрушение стенки", activeCls: "bg-red-950 text-red-100 border-red-800 font-bold shadow-sm" },
];

/**
 * DENTE Dental CRM — Compact Caries Quick Picker Bar (Apple HIG Touch Ergonomics).
 * Mandate 8b: Strictly <= 120 lines. Zero raster filters, pure CSS transitions.
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
			className={`w-full flex flex-col gap-1.5 pt-1.5 pb-1 border-t border-amber-500/20 text-xs ${className}`}
		>
			{/* Ряд 1: Класс / Локализация */}
			<div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none touch-pan-x [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent_100%)] sm:[mask-image:none]">
				<span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 shrink-0 mr-0.5">
					Класс:
				</span>
				<div className="flex items-center gap-1 shrink-0" role="group" aria-label="Локализация кариеса">
					{locs.map((loc) => {
						const active = currentType === loc.type;
						return (
							<button
								key={loc.type}
								type="button"
								data-caries-class={loc.label}
								onClick={() => onChangeCariesType?.(loc.type)}
								title={loc.title}
								className={`px-3 py-1.5 min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[34px] rounded-lg border text-xs font-semibold transition-all flex items-center justify-center shrink-0 active:scale-95 ${
									active
										? "bg-amber-600 text-white border-amber-500 shadow-sm dark:bg-amber-500 dark:border-amber-400"
										: "bg-white text-slate-700 border-slate-200 hover:bg-amber-50 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
								}`}
							>
								{loc.label}
							</button>
						);
					})}
				</div>
			</div>

			{/* Ряд 2: 4 стадии ВОЗ (Пятно, Средний, Глубокий, Скол) */}
			<div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none touch-pan-x [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent_100%)] sm:[mask-image:none]">
				<span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 shrink-0 mr-0.5">
					Стадия:
				</span>
				<div className="flex items-center gap-1 shrink-0" role="group" aria-label="Стадия глубины поражения">
					{DEPTH_STAGES.map((st) => {
						const active = currentDepth === st.depth;
						return (
							<button
								key={st.depth}
								type="button"
								data-caries-depth={st.depth}
								onClick={() => onChangeCariesDepth?.(st.depth)}
								title={st.title}
								className={`px-3 py-1.5 min-h-[44px] sm:min-h-[28px] rounded-lg border text-xs font-medium transition-all flex items-center justify-center shrink-0 active:scale-95 ${
									active
										? st.activeCls
										: "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
								}`}
							>
								<span className="mr-1 text-[11px]">{st.marker}</span>
								<span>{st.label}</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};