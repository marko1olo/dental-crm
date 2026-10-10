import React from "react";
import { Zap } from "lucide-react";
import type {
	ElasticTractionMatrixProps,
	ElasticSchemeOption,
	ElasticSizeOption,
} from "./types";

export const ELASTIC_SCHEMES: ElasticSchemeOption[] = [
	{ id: "none", label: "Без эластиков", desc: "Межчелюстная тяга не назначена" },
	{ id: "class_ii", label: "II класс (дистализирующая)", desc: "Клык ВЧ — 6 зуб НЧ" },
	{ id: "class_iii", label: "III класс (мезиализирующая)", desc: "6 зуб ВЧ — клык НЧ" },
	{ id: "vertical_box", label: "Вертикальные (коробчатые)", desc: "Устранение открытого прикуса" },
	{ id: "cross", label: "Перекрестные (Cross-bite)", desc: "Устранение перекрестной окклюзии" },
	{ id: "asymmetric", label: "Асимметричные", desc: "Коррекция косметического центра" },
];

export const ELASTIC_SIZES: ElasticSizeOption[] = [
	{ id: "fox_3_16", label: "3/16\" 3.5 oz (Лиса)", strength: "Light" },
	{ id: "rabbit_3_16", label: "3/16\" 4.5 oz (Кролик)", strength: "Medium" },
	{ id: "kangaroo_1_4", label: "1/4\" 4.5 oz (Кенгуру)", strength: "Medium" },
	{ id: "buffalo_1_4", label: "1/4\" 6.0 oz (Буйвол)", strength: "Heavy" },
	{ id: "bear_5_16", label: "5/16\" 6.0 oz (Медведь)", strength: "Heavy" },
	{ id: "monkey_3_8", label: "3/8\" 4.5 oz (Обезьяна)", strength: "Medium" },
];

export const ElasticTractionMatrix: React.FC<ElasticTractionMatrixProps> = ({
	elasticScheme,
	setElasticScheme,
	elasticSize,
	setElasticSize,
	onElasticSizeInteraction,
}) => {
	return (
		<div
			data-testid="ortho-elastic-traction-matrix"
			className="bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-2.5"
		>
			<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
				<Zap size={14} className="text-purple-500" />
				Межчелюстные эластики (тяга)
			</span>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
				<div>
					<label htmlFor="elastic-scheme-select" className="block text-[12px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400 mb-1">
						Схема фиксации
					</label>
					<select
						id="elastic-scheme-select"
						aria-label="Схема эластиков"
						value={elasticScheme}
						onChange={(e) => setElasticScheme(e.target.value)}
						className="w-full h-8 px-2.5 bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 rounded-lg text-[12.5px] font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none"
					>
						{ELASTIC_SCHEMES.map((e) => (
							<option key={e.id} value={e.id}>
								{e.label}
							</option>
						))}
					</select>
				</div>

				<div>
					<label htmlFor="elastic-size-select" className="block text-[12px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400 mb-1">
						Размер и сила (калибр)
					</label>
					<select
						id="elastic-size-select"
						aria-label="Размер эластиков"
						disabled={false}
						value={elasticSize}
						onClick={onElasticSizeInteraction}
						onFocus={onElasticSizeInteraction}
						onChange={(e) => {
							if (onElasticSizeInteraction) onElasticSizeInteraction();
							setElasticSize(e.target.value);
						}}
						className="w-full h-8 px-2.5 bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 rounded-lg text-[12.5px] font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none"
					>
						{ELASTIC_SIZES.map((s) => (
							<option key={s.id} value={s.id}>
								{s.label} ({s.strength})
							</option>
						))}
					</select>
				</div>
			</div>
		</div>
	);
};
