import { Check, Edit3, Eye, Sparkles } from "lucide-react";
import type React from "react";
import { playTactileEarcon } from "../../../lib/intercomSound";

export interface SoapMobileActionBarProps {
	readonly isTemplatesOpen: boolean;
	readonly onToggleTemplates: () => void;
	readonly onApplyNorm: () => void;
	readonly activeViewMode: "fields" | "full_text";
	readonly onChangeViewMode: (mode: "fields" | "full_text") => void;
}

export const SoapMobileActionBar: React.FC<SoapMobileActionBarProps> = ({
	onToggleTemplates,
	onApplyNorm,
	activeViewMode,
	onChangeViewMode,
}) => {
	return (
		<div
			className="soap-mobile-action-bar sticky bottom-0 z-30 md:hidden flex items-center justify-between gap-1.5 p-2 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] shadow-lg"
			style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom, 8px))" }}
		>
			<button
				type="button"
				onClick={onToggleTemplates}
				className="flex-1 min-h-[44px] px-3 text-[13px] font-semibold rounded-xl flex items-center justify-center gap-1.5 bg-teal-600 active:bg-teal-700 text-white shadow-xs touch-manipulation cursor-pointer"
				title="Каталог 448 клинических шаблонов"
			>
				<Sparkles className="w-4 h-4 shrink-0" />
				<span className="truncate">Шаблоны (448)</span>
			</button>

			<button
				type="button"
				onClick={() => {
					playTactileEarcon("norm");
					onApplyNorm();
				}}
				className="min-h-[44px] px-3.5 text-[13px] font-semibold rounded-xl flex items-center justify-center gap-1 bg-emerald-500/15 active:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 touch-manipulation cursor-pointer shrink-0"
				title="Соматически здоров / Интактные зубы (Норма)"
			>
				<Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
				<span>Норма</span>
			</button>

			<div className="flex items-center bg-[var(--paper-soft)] border border-[var(--line-subtle)] p-0.5 rounded-xl shrink-0">
				<button
					type="button"
					onClick={() => onChangeViewMode("fields")}
					className={`min-h-[44px] px-2.5 text-[12.5px] font-semibold rounded-lg flex items-center justify-center touch-manipulation cursor-pointer ${
						activeViewMode === "fields"
							? "bg-[var(--paper)] text-[var(--teal,var(--brand-primary))] shadow-2xs"
							: "text-[var(--muted)]"
					}`}
					title="Режим редактирования полей"
				>
					<Edit3 className="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					onClick={() => onChangeViewMode("full_text")}
					className={`min-h-[44px] px-2.5 text-[12.5px] font-semibold rounded-lg flex items-center justify-center touch-manipulation cursor-pointer ${
						activeViewMode === "full_text"
							? "bg-[var(--paper)] text-[var(--teal,var(--brand-primary))] shadow-2xs"
							: "text-[var(--muted)]"
					}`}
					title="Печатный предпросмотр"
				>
					<Eye className="w-3.5 h-3.5" />
				</button>
			</div>
		</div>
	);
};
