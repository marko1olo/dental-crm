import type { SberPosOperationType } from "@dental/shared";
import {
	Ban,
	CreditCard,
	FileText,
	QrCode,
	RotateCcw,
	Smile,
} from "lucide-react";
import type React from "react";

export interface SberPosTerminalOperationsBarProps {
	readonly operation: SberPosOperationType;
	readonly status: string;
	readonly onStartOperation: (op: SberPosOperationType) => void;
	readonly originalRrnInput: string;
	readonly setOriginalRrnInput: (val: string) => void;
	readonly originalAuthInput: string;
	readonly setOriginalAuthInput: (val: string) => void;
}

export const SberPosTerminalOperationsBar: React.FC<
	SberPosTerminalOperationsBarProps
> = ({
	operation,
	status,
	onStartOperation,
	originalRrnInput,
	setOriginalRrnInput,
	originalAuthInput,
	setOriginalAuthInput,
}) => (
	<div className="space-y-3">
		<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
			<button
				type="button"
				onClick={() => onStartOperation("sale")}
				className={`min-h-[48px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer ${operation === "sale" ? "border-emerald-600 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-sm" : "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-emerald-400"}`}
			>
				<CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
				<span className="text-xs">Оплата картой</span>
			</button>
			<button
				type="button"
				onClick={() => onStartOperation("sberpay_qr")}
				className={`min-h-[48px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer ${operation === "sberpay_qr" ? "border-[var(--ok-fg,#059669)] bg-[var(--ok-bg,#f0fdf4)] text-[var(--ok-fg,#059669)] shadow-sm" : "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--ok-fg,#059669)]"}`}
			>
				<QrCode className="w-4 h-4 text-[var(--teal,#0d9488)]" />
				<span className="text-xs">SberPay QR</span>
			</button>
			<button
				type="button"
				onClick={() => onStartOperation("biometry_facepay")}
				className={`min-h-[48px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer ${operation === "biometry_facepay" ? "border-[var(--ok-fg,#059669)] bg-[var(--ok-bg,#f0fdf4)] text-[var(--ok-fg,#059669)] shadow-sm" : "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--ok-fg,#059669)]"}`}
			>
				<Smile className="w-4 h-4 text-[var(--brand-primary,#0d9488)]" />
				<span className="text-xs">FacePay Улыбкой</span>
			</button>
			<button
				type="button"
				onClick={() => onStartOperation("refund")}
				className={`min-h-[48px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer ${operation === "refund" ? "border-[var(--warn-fg,#d97706)] bg-[var(--warn-bg,#fef3c7)] text-[var(--warn-fg,#d97706)] shadow-sm" : "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--warn-fg,#d97706)]"}`}
			>
				<RotateCcw className="w-4 h-4 text-[var(--warn-fg,#d97706)]" />
				<span className="text-xs">Возврат</span>
			</button>
			<button
				type="button"
				onClick={() => onStartOperation("void")}
				className={`min-h-[48px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer ${operation === "void" ? "border-[var(--bad-fg,#dc2626)] bg-[var(--bad-bg,#fee2e2)] text-[var(--bad-fg,#dc2626)] shadow-sm" : "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--bad-fg,#dc2626)]"}`}
			>
				<Ban className="w-4 h-4 text-[var(--bad-fg,#dc2626)]" />
				<span className="text-xs">Отмена</span>
			</button>
			<button
				type="button"
				onClick={() => onStartOperation("settlement")}
				className={`min-h-[48px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer ${operation === "settlement" ? "border-[var(--brand-primary,#0d9488)] bg-[var(--brand-primary-soft,#f0fdfa)] text-[var(--brand-primary,#0d9488)] shadow-sm" : "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--brand-primary,#0d9488)]"}`}
			>
				<FileText className="w-4 h-4 text-[var(--brand-primary,#0d9488)]" />
				<span className="text-xs">Сверка итогов (Z)</span>
			</button>
		</div>

		{(operation === "refund" || operation === "void") && status === "ready" && (
			<div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row gap-3 items-center text-xs">
				<span className="font-bold text-amber-800 dark:text-amber-200 shrink-0">
					Данные чека для возврата:
				</span>
				<div className="flex gap-2 w-full">
					<input
						type="text"
						value={originalRrnInput}
						onChange={(e) => setOriginalRrnInput(e.target.value)}
						placeholder="RRN (12 цифр)"
						className="flex-1 h-9 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] px-2.5 font-mono text-xs"
					/>
					<input
						type="text"
						value={originalAuthInput}
						onChange={(e) => setOriginalAuthInput(e.target.value)}
						placeholder="Код авториз. (6 знаков)"
						className="w-36 h-9 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] px-2.5 font-mono text-xs"
					/>
				</div>
			</div>
		)}
	</div>
);
