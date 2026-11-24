import React from "react";
import { Clock } from "lucide-react";
import {
	CANONICAL_MANUFACTURING_5_STAGES,
	type CanonicalManufacturing5StageItem,
} from "../../lab/labMath.js";

export interface ZtlManufacturingStageTrackerProps {
	readonly selectedStageId: string;
	readonly onSelectStage: (stage: CanonicalManufacturing5StageItem) => void;
}

export function ZtlManufacturingStageTracker({
	selectedStageId,
	onSelectStage,
}: ZtlManufacturingStageTrackerProps) {
	const currentStageIndex = CANONICAL_MANUFACTURING_5_STAGES.findIndex((s) => s.id === selectedStageId);

	return (
		<div className="mb-2.5 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] min-w-0 overflow-hidden">
			<div className="flex flex-wrap items-center justify-between gap-1 mb-2">
				<div className="flex items-center gap-1.5 min-w-0">
					<Clock size={15} className="text-[var(--primary)] shrink-0" />
					<span className="text-xs font-bold text-[var(--ink)] truncate">
						Этапы изготовления ЗТЛ:
					</span>
				</div>
				<span className="text-[11px] text-[var(--ink-muted)] truncate">
					Слепок/Скан → Каркас → Керамика → Готовая работа → Фиксация
				</span>
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
				{CANONICAL_MANUFACTURING_5_STAGES.map((stg) => {
					const isSelected = selectedStageId === stg.id;
					const isPassed = currentStageIndex >= stg.step - 1;

					return (
						<button
							key={stg.id}
							type="button"
							onClick={() => onSelectStage(stg)}
							className={`min-h-[46px] px-2 py-1.5 rounded-lg text-xs font-bold text-center transition-all cursor-pointer border flex flex-col justify-between items-center min-w-0 overflow-hidden ${
								stg.step === 5 ? "col-span-2 sm:col-span-1" : ""
							} ${
								isSelected
									? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm ring-2 ring-[var(--primary)]/40"
									: isPassed
									? "bg-[var(--primary)]/10 text-[var(--ink)] border-[var(--primary)]/30"
									: "bg-[var(--paper)] text-[var(--ink-muted)] border-[var(--line)] hover:bg-[var(--paper-subtle)]"
							}`}
							data-testid={`chairside-stage-${stg.id}`}
							title={stg.descRu}
						>
							<span className="text-[10px] font-bold opacity-85 truncate min-w-0 w-full">
								Этап {stg.step}
							</span>
							<span className="truncate min-w-0 w-full text-center text-xs font-bold mt-0.5">
								{stg.shortLabelRu}
							</span>
							<span className="text-[10px] opacity-80 mt-0.5 truncate min-w-0 w-full">
								{isSelected ? "Текущий" : isPassed ? "Пройден" : "Ожидание"}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
