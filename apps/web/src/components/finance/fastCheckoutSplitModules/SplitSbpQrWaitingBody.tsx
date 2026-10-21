import type { SbpDynamicQrResult } from "@dental/shared";
import { Check, QrCode, RefreshCw } from "lucide-react";
import type React from "react";

export interface SplitSbpQrWaitingBodyProps {
	readonly sbpQrData: {
		readonly payload: SbpDynamicQrResult;
		readonly svg: string;
	} | null;
	readonly effectiveSbpAmountRub: number;
	readonly sbpCheckMessage: string | null;
	readonly isCheckingSbp: boolean;
	readonly onCheckSbpStatus: (manual?: boolean) => void;
	readonly onConfirmSbpManual: () => void;
}

export const SplitSbpQrWaitingBody: React.FC<SplitSbpQrWaitingBodyProps> = ({
	sbpQrData,
	effectiveSbpAmountRub,
	sbpCheckMessage,
	isCheckingSbp,
	onCheckSbpStatus,
	onConfirmSbpManual,
}) => {
	return (
		<>
			<div
				className="w-40 h-40 rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] p-2 shadow-md flex items-center justify-center border border-teal-500/30 overflow-hidden"
				data-testid="sbp-dynamic-qr-svg"
			>
				{sbpQrData ? (
					<div
						className="w-full h-full flex items-center justify-center"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: Trusted internal SVG QR code
						dangerouslySetInnerHTML={{ __html: sbpQrData.svg }}
					/>
				) : (
					<QrCode className="w-full h-full text-teal-600 dark:text-teal-400" />
				)}
			</div>
			<div className="text-xs text-[var(--ink)] space-y-1">
				<p className="font-bold m-0 text-[var(--ink)]">
					Отсканируйте камерой телефона или в приложении любого банка
				</p>
				<p className="text-[var(--muted)] m-0 font-mono text-[11px]">
					Сумма СБП:{" "}
					{effectiveSbpAmountRub.toLocaleString("ru-RU", {
						minimumFractionDigits: 2,
					})}{" "}
					₽ • Без комиссии для пациента
				</p>
				{sbpCheckMessage && (
					<p className="text-[11px] text-teal-700 dark:text-teal-300 font-medium m-0">
						{sbpCheckMessage}
					</p>
				)}
			</div>

			<div className="flex items-center gap-2 flex-wrap justify-center pt-1">
				<button
					type="button"
					onClick={() => onCheckSbpStatus(true)}
					disabled={isCheckingSbp}
					className="h-8 px-3 rounded-lg text-xs font-bold bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-50"
					data-testid="btn-check-sbp-status"
					title="Опросить банковский шлюз СБП"
				>
					<RefreshCw
						size={13}
						className={isCheckingSbp ? "animate-spin" : ""}
					/>
					<span>{isCheckingSbp ? "Проверка..." : "Проверить оплату"}</span>
				</button>
				<button
					type="button"
					onClick={onConfirmSbpManual}
					disabled={isCheckingSbp}
					className="h-8 px-3 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-50"
					data-testid="btn-manual-confirm-sbp"
					title="Подтвердить зачисление средств по выписке/СМС банка"
				>
					<Check size={13} />
					<span>Деньги поступили на счет клиники (ручное подтверждение)</span>
				</button>
			</div>
		</>
	);
};
