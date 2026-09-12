import React from "react";
import { Sparkles, Layers, ScanFace, Check, Plus } from "lucide-react";

export type GlobalTreatmentScope = "global_mouth" | "global_arch";

export interface GlobalTreatmentItem {
	id: string;
	scope: GlobalTreatmentScope;
	arch?: "upper" | "lower";
	clinicalType: string;
	title: string;
	status: "existing" | "planned";
	price?: number;
}

export interface GlobalTreatmentsStripProps {
	treatments?: GlobalTreatmentItem[];
	highlightedIds?: string[];
	onTreatmentHover?: (treatmentId: string | null) => void;
	onArchHover?: (arch: "upper" | "lower" | null) => void;
	onTreatmentClick?: (treatment: GlobalTreatmentItem) => void;
	onQuickAdd?: (treatment: Omit<GlobalTreatmentItem, "id">) => void;
	readOnly?: boolean;
}

export const DEFAULT_GLOBAL_PRESETS: readonly Omit<GlobalTreatmentItem, "id">[] = [
	{
		scope: "global_mouth",
		clinicalType: "hygiene_airflow",
		title: "Профгигиена Air-Flow (Вся полость рта)",
		status: "planned",
	},
	{
		scope: "global_arch",
		arch: "upper",
		clinicalType: "aligners_upper",
		title: "Элайнеры / Сплинт (Верхняя челюсть)",
		status: "planned",
	},
	{
		scope: "global_arch",
		arch: "lower",
		clinicalType: "aligners_lower",
		title: "Элайнеры / Сплинт (Нижняя челюсть)",
		status: "planned",
	},
	{
		scope: "global_mouth",
		clinicalType: "whitening_office",
		title: "Клиническое отбеливание",
		status: "planned",
	},
];

export const GlobalTreatmentsStrip: React.FC<GlobalTreatmentsStripProps> = ({
	treatments = [],
	highlightedIds = [],
	onTreatmentHover,
	onArchHover,
	onTreatmentClick,
	onQuickAdd,
	readOnly = false,
}) => {
	const globals = treatments.filter(
		(t) => t.scope === "global_mouth" || t.scope === "global_arch",
	);

	const handleMouseEnter = (tr: GlobalTreatmentItem) => {
		onTreatmentHover?.(tr.id);
		if (tr.scope === "global_arch" && tr.arch) {
			onArchHover?.(tr.arch);
		}
	};

	const handleMouseLeave = () => {
		onTreatmentHover?.(null);
		onArchHover?.(null);
	};

	const getIcon = (tr: GlobalTreatmentItem) => {
		if (tr.scope === "global_arch") {
			return <Layers className="w-3.5 h-3.5 text-sky-500 shrink-0" />;
		}
		return <ScanFace className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
	};

	return (
		<div
			className="global-treatments-strip flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 text-xs text-slate-700 dark:text-slate-300 transition-colors"
			role="region"
			aria-label="Общие процедуры на всю дугу и полость рта"
		>
			<div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none mr-1">
				<Sparkles className="w-3.5 h-3.5 text-amber-500" />
				<span>Общие процедуры:</span>
			</div>

			{globals.length === 0 ? (
				<span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
					Нет общих назначений
				</span>
			) : (
				globals.map((tr) => {
					const isHigh = highlightedIds.includes(tr.id);
					const isPlanned = tr.status === "planned";
					return (
						<button
							key={tr.id}
							type="button"
							onClick={() => onTreatmentClick?.(tr)}
							onMouseEnter={() => handleMouseEnter(tr)}
							onMouseLeave={handleMouseLeave}
							className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 cursor-pointer ${
								isHigh
									? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200 ring-2 ring-blue-400/40 shadow-sm"
									: isPlanned
										? "border-amber-300 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:border-blue-400 hover:bg-blue-50/50"
										: "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs"
							}`}
							style={
								isPlanned
									? {
											backgroundImage:
												"repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245, 158, 11, 0.08) 4px, rgba(245, 158, 11, 0.08) 8px)",
										}
									: undefined
							}
						>
							{getIcon(tr)}
							<span>{tr.title}</span>
							{tr.arch && (
								<span className="text-[10px] uppercase tracking-wider px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
									{tr.arch === "upper" ? "в/ч" : "н/ч"}
								</span>
							)}
							{tr.status === "existing" && (
								<Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 ml-0.5" />
							)}
						</button>
					);
				})
			)}

			{!readOnly && onQuickAdd && (
				<div className="flex items-center gap-1 ml-auto">
					<button
						type="button"
						onClick={() => onQuickAdd(DEFAULT_GLOBAL_PRESETS[0]!)}
						className="inline-flex items-center gap-1 px-2 py-0.8 text-[11px] font-medium rounded border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
						title="Добавить профгигиену Air-Flow на всю полость рта"
					>
						<Plus className="w-3 h-3" />
						<span>+ Air-Flow</span>
					</button>
					<button
						type="button"
						onClick={() => onQuickAdd(DEFAULT_GLOBAL_PRESETS[1]!)}
						className="inline-flex items-center gap-1 px-2 py-0.8 text-[11px] font-medium rounded border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
						title="Добавить элайнеры на верхнюю челюсть"
					>
						<Plus className="w-3 h-3" />
						<span>+ В/Ч</span>
					</button>
					<button
						type="button"
						onClick={() => onQuickAdd(DEFAULT_GLOBAL_PRESETS[2]!)}
						className="inline-flex items-center gap-1 px-2 py-0.8 text-[11px] font-medium rounded border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
						title="Добавить элайнеры на нижнюю челюсть"
					>
						<Plus className="w-3 h-3" />
						<span>+ Н/Ч</span>
					</button>
				</div>
			)}
		</div>
	);
};
