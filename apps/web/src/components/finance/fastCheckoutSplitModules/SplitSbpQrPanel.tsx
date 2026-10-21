import { Check, Zap } from "lucide-react";
import type React from "react";
import {
	SplitSbpQrWaitingBody,
	type SplitSbpQrWaitingBodyProps,
} from "./SplitSbpQrWaitingBody";

export type SplitSbpQrPanelProps = SplitSbpQrWaitingBodyProps & {
	readonly sbpStatus: "awaiting" | "paid" | "failed";
};

export const SplitSbpQrPanel: React.FC<SplitSbpQrPanelProps> = (props) => {
	const { sbpStatus, effectiveSbpAmountRub } = props;

	return (
		<div
			className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/30 flex flex-col items-center justify-center text-center gap-3"
			data-testid="sbp-qr-display-panel"
		>
			<div className="flex items-center justify-between w-full flex-wrap gap-2 px-1">
				<span className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
					<Zap size={14} className="text-teal-600 dark:text-teal-400" />
					<span>Динамический QR-код СБП (НСПК)</span>
				</span>
				<span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-teal-500/15 text-teal-700 dark:text-teal-300 rounded-full border border-teal-500/20 flex items-center gap-1">
					СБП • НСПК ГОСТ Р 56042
				</span>
			</div>

			{sbpStatus === "paid" ? (
				<div className="w-full py-5 px-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 flex flex-col items-center justify-center gap-2 text-emerald-800 dark:text-emerald-200">
					<div className="w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
						<Check size={24} />
					</div>
					<p className="font-extrabold text-sm m-0">
						Оплачено по СБП (Безналичный расчет)
					</p>
					<p className="text-xs font-mono font-bold m-0 text-emerald-700 dark:text-emerald-300">
						Сумма:{" "}
						{effectiveSbpAmountRub.toLocaleString("ru-RU", {
							minimumFractionDigits: 2,
						})}{" "}
						₽
					</p>
					<span className="text-[11px] text-emerald-600 dark:text-emerald-400">
						Транзакция подтверждена • Кассовый чек успешно сформирован
					</span>
				</div>
			) : (
				<SplitSbpQrWaitingBody {...props} />
			)}
		</div>
	);
};
