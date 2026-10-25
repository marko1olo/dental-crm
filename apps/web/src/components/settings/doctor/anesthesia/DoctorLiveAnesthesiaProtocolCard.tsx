import { Copy, Sparkles } from "lucide-react";
import React from "react";

interface DoctorLiveAnesthesiaProtocolCardProps {
	liveAnesthesiaNote: string;
	onCopy: () => void;
}

export function DoctorLiveAnesthesiaProtocolCard({
	liveAnesthesiaNote,
	onCopy,
}: DoctorLiveAnesthesiaProtocolCardProps) {
	return (
		<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-teal-500/30 space-y-2">
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Sparkles size={14} className="text-teal-600" />
					<span>
						Фрагмент протокола анестезии для медицинской карты (готовый текст)
					</span>
				</span>
				<button
					type="button"
					onClick={onCopy}
					className="text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
					title="Скопировать готовый текст для медицинской карты"
				>
					<Copy size={13} />
					<span>Копировать в карту</span>
				</button>
			</div>
			<p className="text-xs text-[var(--ink)] m-0 leading-relaxed font-mono p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] select-all">
				{liveAnesthesiaNote}
			</p>
		</div>
	);
}
