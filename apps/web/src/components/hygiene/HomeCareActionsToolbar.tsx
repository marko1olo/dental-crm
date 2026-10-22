/**
 * HomeCareActionsToolbar.tsx — Верхняя панель пресетов и быстрых действий карты домашнего ухода.
 * (Layer 4 UI View).
 */

import React from "react";
import {
	Check,
	Clipboard,
	FileText,
	MessageCircle,
	Printer,
	Sparkles,
} from "lucide-react";

export interface HomeCareActionsToolbarProps {
	readonly activePreset: "standard" | "ortho" | "perio";
	readonly copyStatus: boolean;
	readonly insertStatus: boolean;
	readonly readOnly?: boolean | undefined;
	readonly onSelectPreset: (preset: "standard" | "ortho" | "perio") => void;
	readonly onCopy: () => void;
	readonly onInsertTo043: () => void;
	readonly onWhatsApp: () => void;
	readonly onPrint: () => void;
}

export const HomeCareActionsToolbar: React.FC<HomeCareActionsToolbarProps> = ({
	activePreset,
	copyStatus,
	insertStatus,
	readOnly = false,
	onSelectPreset,
	onCopy,
	onInsertTo043,
	onWhatsApp,
	onPrint,
}) => {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--line-subtle)]">
			<div className="flex items-center gap-1.5 flex-wrap">
				<span className="text-[11px] font-semibold text-[var(--muted)]">
					Пресеты:
				</span>
				<button
					type="button"
					onClick={() => onSelectPreset("standard")}
					className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
						activePreset === "standard"
							? "bg-teal-600 text-white shadow-2xs"
							: "bg-[var(--surface-muted)] text-[var(--ink)] hover:bg-[var(--surface-hover)] border border-[var(--line)]"
					}`}
				>
					Стандарт (профилактика)
				</button>
				<button
					type="button"
					onClick={() => onSelectPreset("ortho")}
					className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
						activePreset === "ortho"
							? "bg-teal-600 text-white shadow-2xs"
							: "bg-[var(--surface-muted)] text-[var(--ink)] hover:bg-[var(--surface-hover)] border border-[var(--line)]"
					}`}
				>
					Брекеты / Скученность
				</button>
				<button
					type="button"
					onClick={() => onSelectPreset("perio")}
					className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
						activePreset === "perio"
							? "bg-teal-600 text-white shadow-2xs"
							: "bg-[var(--surface-muted)] text-[var(--ink)] hover:bg-[var(--surface-hover)] border border-[var(--line)]"
					}`}
				>
					Пародонтит / Кровоточивость
				</button>
			</div>

			<div className="flex items-center gap-1.5 ml-auto">
				{!readOnly && (
					<button
						type="button"
						data-testid="hygiene-homecare-insert-btn"
						onClick={onInsertTo043}
						className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--ink)] border border-[var(--line)] flex items-center gap-1.5"
						title="Вставить рекомендации в назначения дневника"
					>
						{insertStatus ? (
							<Check className="w-3.5 h-3.5 text-emerald-500" />
						) : (
							<FileText className="w-3.5 h-3.5 text-blue-500" />
						)}
						<span>В карту 043/у</span>
					</button>
				)}

				<button
					type="button"
					data-testid="hygiene-homecare-copy-btn"
					onClick={onCopy}
					className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--ink)] border border-[var(--line)] flex items-center gap-1.5"
					title="Скопировать текст памятки"
				>
					{copyStatus ? (
						<Check className="w-3.5 h-3.5 text-emerald-500" />
					) : (
						<Clipboard className="w-3.5 h-3.5 text-[var(--muted)]" />
					)}
					<span>Копировать</span>
				</button>

				<button
					type="button"
					data-testid="hygiene-homecare-whatsapp-btn"
					onClick={onWhatsApp}
					className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5"
					title="Отправить памятку пациенту в WhatsApp"
				>
					<MessageCircle className="w-3.5 h-3.5" />
					<span className="hidden sm:inline">WhatsApp</span>
				</button>

				<button
					type="button"
					data-testid="hygiene-homecare-print-btn"
					onClick={onPrint}
					className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-[var(--ink)] border border-[var(--line)] flex items-center gap-1.5"
					title="Распечатать памятку на принтере"
				>
					<Printer className="w-3.5 h-3.5 text-[var(--muted)]" />
					<span className="hidden sm:inline">Печать</span>
				</button>
			</div>
		</div>
	);
};
