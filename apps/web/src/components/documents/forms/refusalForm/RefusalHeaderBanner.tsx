import React from "react";
import { ShieldCheck, Printer, FileText, Tablet, Copy } from "lucide-react";

interface RefusalHeaderBannerProps {
	onPrintRefusal: () => void;
	onPrintBlankRefusal: () => void;
	onOpenTablet: () => void;
	onCopySummary: () => void;
}

export const RefusalHeaderBanner: React.FC<RefusalHeaderBannerProps> = ({
	onPrintRefusal,
	onPrintBlankRefusal,
	onOpenTablet,
	onCopySummary,
}) => (
	<>
		<div>
			<h3>Отказ от вмешательства</h3>
			<p>
				Что предложено, почему нужно, какие риски объяснены и когда срочно обращаться.
			</p>
		</div>

		<div className="flex flex-wrap items-center justify-between gap-3 my-3 p-3 bg-[var(--surface-subtle,#f1f5f9)] border border-[var(--border,#cbd5e1)] rounded-lg">
			<div className="flex items-center gap-2">
				<ShieldCheck size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
				<div>
					<div className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider">
						Бланк отказа от медицинского вмешательства (ИДС)
					</div>
					<div className="text-xs text-[var(--muted,#64748b)]">
						Официальный бланк отказа от вмешательства • Защита врача и клиники
					</div>
				</div>
			</div>
			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					className="secondary-button inline-flex items-center gap-1.5"
					onClick={onPrintRefusal}
					title="Быстрая печать официального бланка Отказа А4"
				>
					<Printer size={13} />
					<span>Печать А4 (Отказ)</span>
				</button>
				<button
					type="button"
					className="secondary-button inline-flex items-center gap-1.5"
					onClick={onPrintBlankRefusal}
					title="Печать чистого бланка для заполнения шариковой ручкой"
				>
					<FileText size={13} />
					<span>Чистый бланк</span>
				</button>
				<button
					type="button"
					className="secondary-button inline-flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-medium"
					onClick={onOpenTablet}
					title="Открыть в планшете для подписания стилусом / пальцем"
				>
					<Tablet size={13} />
					<span>Планшет / стилус</span>
				</button>
				<button
					type="button"
					className="secondary-button inline-flex items-center gap-1.5"
					onClick={onCopySummary}
					title="Копировать выжимку для медкарты или передачи пациенту"
				>
					<Copy size={13} />
					<span>Выжимка</span>
				</button>
			</div>
		</div>
	</>
);
