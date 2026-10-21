import type { SberPosOperationType } from "@dental/shared";
import { AlertCircle, CreditCard, QrCode, RotateCcw } from "lucide-react";
import type React from "react";

export interface SberPosAlternativePaymentOptionsProps {
	readonly onStartOperation: (op: SberPosOperationType) => void;
	readonly onSelectAlternativeMethod?:
		| ((method: "sbp" | "cash" | "deposit") => void)
		| undefined;
	readonly onClose: () => void;
}

export const SberPosAlternativePaymentOptions: React.FC<
	SberPosAlternativePaymentOptionsProps
> = ({ onStartOperation, onSelectAlternativeMethod, onClose }) => {
	return (
		<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-amber-500/30 space-y-2.5">
			<div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
				<AlertCircle size={16} className="text-amber-600 shrink-0" />
				<span>
					Таймаут или отказ терминала Сбербанк. Выберите альтернативную оплату:
				</span>
			</div>
			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={() => onStartOperation("sberpay_qr")}
					className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--teal-soft,#f0fdfa)] border border-[var(--teal,#0d9488)]/30 text-[var(--teal,#0d9488)] font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-colors"
				>
					<QrCode size={16} />
					<span>SberPay / СБП QR</span>
				</button>
				{onSelectAlternativeMethod && (
					<>
						<button
							type="button"
							onClick={() => {
								onSelectAlternativeMethod("cash");
								onClose();
							}}
							className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-emerald-500/20 transition-colors"
						>
							<CreditCard size={16} />
							<span>Наличные в кассу</span>
						</button>
						<button
							type="button"
							onClick={() => {
								onSelectAlternativeMethod("deposit");
								onClose();
							}}
							className="min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-amber-500/20 transition-colors"
						>
							<RotateCcw size={16} />
							<span>Семейный баланс / депозит</span>
						</button>
					</>
				)}
			</div>
		</div>
	);
};
