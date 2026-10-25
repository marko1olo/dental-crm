import { Copy, Sparkles } from "lucide-react";
import React from "react";

interface DoctorMaterialsLiveSnippetCardProps {
	liveSoapSnippet: string;
	onCopy: () => void;
}

export function DoctorMaterialsLiveSnippetCard({
	liveSoapSnippet,
	onCopy,
}: DoctorMaterialsLiveSnippetCardProps) {
	return (
		<div className="p-3 rounded-xl bg-[var(--paper)] border border-teal-500/30 space-y-2 mt-2">
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Sparkles size={14} className="text-teal-600" />
					<span>Автоматический фрагмент протокола для медкарты с вашими материалами</span>
				</span>
				<button
					type="button"
					onClick={onCopy}
					className="text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
					title="Скопировать готовый текст для медкарты"
				>
					<Copy size={12} />
					<span>Копировать</span>
				</button>
			</div>
			<p className="text-xs text-[var(--muted)] m-0 leading-relaxed font-mono p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] select-all">
				{liveSoapSnippet}
			</p>
		</div>
	);
}
