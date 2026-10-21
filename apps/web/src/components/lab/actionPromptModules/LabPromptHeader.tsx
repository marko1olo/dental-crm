import React from "react";
import { X } from "lucide-react";

export function LabPromptHeader({
	title,
	icon,
	isDanger,
	onClose,
}: {
	readonly title: string;
	readonly icon?: React.ReactNode;
	readonly isDanger?: boolean;
	readonly onClose: () => void;
}) {
	return (
		<div
			className={`flex items-center justify-between px-4 py-3 border-b border-[var(--line,#cbd5e1)] ${isDanger ? "bg-rose-500/10" : "bg-[var(--paper-soft,#f8fafc)]"}`}
		>
			<div className="flex items-center gap-2.5 min-w-0">
				{icon && (
					<div
						className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${isDanger ? "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400" : "bg-teal-500/10 border-teal-500/25 text-teal-600 dark:text-teal-400"}`}
					>
						{icon}
					</div>
				)}
				<h3
					id="lab-prompt-modal-title"
					className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] m-0 truncate"
				>
					{title}
				</h3>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="min-h-[32px] min-w-[32px] rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] flex items-center justify-center transition-colors cursor-pointer"
				aria-label="Закрыть"
			>
				<X className="w-4 h-4" />
			</button>
		</div>
	);
}
