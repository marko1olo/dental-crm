import type React from "react";
import { CheckCircle2, ShieldCheck, X } from "lucide-react";

export interface SignaturePadProps {
	onSign: (signatureBase64: string) => void;
	onCancel: () => void;
}

const DEFAULT_PAPER_STAMP =
	"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='60'><rect width='100%' height='100%' fill='%23f0fdf4' stroke='%2316a34a' rx='6'/><text x='120' y='25' text-anchor='middle' font-family='sans-serif' font-size='11' font-weight='bold' fill='%2315803d'>ПОДПИСАНО НА БУМАГЕ</text><text x='120' y='45' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%23166534'>Подтверждено</text></svg>";

/**
 * @deprecated Legacy canvas drawing eradicated per Mandates 8e, 8k, 8n (CRM != Reality Simulator).
 * Provided as backwards-compatible 1-click paper confirmation stub. Zero canvas drawing required.
 */
export function SignaturePad({ onSign, onCancel }: SignaturePadProps) {
	return (
		<div className="p-4 space-y-3 bg-[var(--paper,#18181b)] rounded-xl border border-[var(--line,#27272a)] text-center">
			<div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
				<ShieldCheck size={20} />
				<span className="text-sm font-semibold">Подтверждение на бумажном носителе</span>
			</div>
			<p className="text-xs text-slate-600 dark:text-slate-300">
				Графический ввод росчерка на экране упразднён. Подтвердите подписание на бумаге в 1 клик (ст. 84 323-ФЗ).
			</p>
			<div className="flex flex-col sm:flex-row gap-2 pt-1">
				<button
					type="button"
					onClick={() => onSign(DEFAULT_PAPER_STAMP)}
					className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer shadow-sm"
				>
					<CheckCircle2 size={16} />
					<span>Подтвердить подпись (1 клик)</span>
				</button>
				<button
					type="button"
					onClick={onCancel}
					className="flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
				>
					<X size={16} />
					<span>Отмена</span>
				</button>
			</div>
		</div>
	);
}
