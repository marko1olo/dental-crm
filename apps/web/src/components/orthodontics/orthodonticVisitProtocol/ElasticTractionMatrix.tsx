import React from "react";
import { Zap } from "lucide-react";
import type { ElasticTractionMatrixProps } from "./types";
import { ELASTIC_SCHEMES, ELASTIC_SIZES } from "./elasticTractionConstants";

export { ELASTIC_SCHEMES, ELASTIC_SIZES };

export const ElasticTractionMatrix: React.FC<ElasticTractionMatrixProps> = ({
	elasticScheme, setElasticScheme, elasticSize, setElasticSize, onElasticSizeInteraction,
}) => {
	const currentLabel = ELASTIC_SCHEMES.find((e) => e.id === elasticScheme)?.label;
	const quickChips = [
		{ id: "none", label: "Без тяг" },
		{ id: "class_ii", label: "II класс" },
		{ id: "class_iii", label: "III класс" },
		{ id: "vertical_box", label: "Коробчатые" },
		{ id: "cross", label: "Перекрест." },
		{ id: "asymmetric", label: "Асимметр." },
	];

	return (
		<div data-testid="ortho-elastic-traction-matrix" className="bg-[var(--paper-soft)] p-3 rounded-xl border border-[var(--line)] flex flex-col gap-2.5">
			<div className="flex items-center justify-between">
				<span className="text-xs font-black uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<Zap size={14} className="text-[var(--primary)]" />
					Межчелюстные эластики (тяга)
				</span>
				<span className="text-[11.5px] font-bold text-[var(--primary)]">{currentLabel}</span>
			</div>

			<div className="grid grid-cols-3 sm:grid-cols-6 gap-1" data-testid="quick-elastics-chips">
				{quickChips.map((chip) => {
					const isSelected = elasticScheme === chip.id;
					return (
						<button
							key={chip.id}
							type="button"
							onClick={() => setElasticScheme(chip.id)}
							data-testid={`quick-elastic-${chip.id}-btn`}
							className={`h-7 px-1.5 rounded-lg text-[11.5px] font-bold border transition-all cursor-pointer truncate ${
								isSelected
									? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							{chip.label}
						</button>
					);
				})}
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
				<div>
					<label htmlFor="elastic-scheme-select" className="block text-[12px] font-bold text-[var(--muted)] mb-1">
						Схема фиксации
					</label>
					<select
						id="elastic-scheme-select"
						aria-label="Схема эластиков"
						value={elasticScheme}
						onChange={(e) => setElasticScheme(e.target.value)}
						className="w-full min-h-[36px] h-9 px-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl text-[12.5px] font-medium text-[var(--ink)] outline-none focus:border-[var(--primary)]"
					>
						{ELASTIC_SCHEMES.map((e) => (
							<option key={e.id} value={e.id}>{e.label}</option>
						))}
					</select>
				</div>

				<div>
					<label htmlFor="elastic-size-select" className="block text-[12px] font-bold text-[var(--muted)] mb-1">
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
							onElasticSizeInteraction?.();
							setElasticSize(e.target.value);
						}}
						className="w-full min-h-[36px] h-9 px-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl text-[12.5px] font-medium text-[var(--ink)] outline-none focus:border-[var(--primary)]"
					>
						{ELASTIC_SIZES.map((s) => (
							<option key={s.id} value={s.id}>{s.label} ({s.strength})</option>
						))}
					</select>
				</div>
			</div>
		</div>
	);
};
