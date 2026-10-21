import type React from "react";

export interface QuickActionsJawsProps {
	readonly onSelectJaw: (target: "JU" | "JL" | "C") => void;
}

export const QuickActionsJaws: React.FC<QuickActionsJawsProps> = ({
	onSelectJaw,
}) => {
	const closeAndSelect = (e: React.MouseEvent, target: "JU" | "JL" | "C") => {
		const details = e.currentTarget.closest("details");
		if (details) details.open = false;
		onSelectJaw(target);
	};

	return (
		<div>
			<div className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-1 mb-1 select-none">
				Челюсти и прикус
			</div>
			<div className="flex items-center gap-1.5">
				<button
					type="button"
					onClick={(e) => closeAndSelect(e, "JU")}
					className="flex-1 h-7 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer select-none text-center"
					title="Верхняя челюсть (JU / Maxilla)"
					data-testid="view-toolbar-jaw-ju-btn"
				>
					В/Ч
				</button>
				<button
					type="button"
					onClick={(e) => closeAndSelect(e, "JL")}
					className="flex-1 h-7 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer select-none text-center"
					title="Нижняя челюсть (JL / Mandibula)"
					data-testid="view-toolbar-jaw-jl-btn"
				>
					Н/Ч
				</button>
				<button
					type="button"
					onClick={(e) => closeAndSelect(e, "C")}
					className="flex-1 h-7 rounded-lg text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all cursor-pointer select-none text-center"
					title="Прикус / Окклюзия (C)"
					data-testid="view-toolbar-jaw-c-btn"
				>
					Прикус
				</button>
			</div>
		</div>
	);
};
