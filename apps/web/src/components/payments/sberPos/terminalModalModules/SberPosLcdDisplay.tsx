import {
	getPilotNtCommandCode,
	type SberPosOperationType,
} from "@dental/shared";
import { CheckCircle2, CreditCard, Loader2, QrCode, Wifi, XCircle } from "lucide-react";
import type React from "react";

export interface SberPosLcdDisplayProps {
	readonly activeModelName: string;
	readonly terminalId: string;
	readonly isConfigured: boolean;
	readonly timerSeconds?: number | undefined;
	readonly status: string;
	readonly statusMessage: string;
	readonly totalBillKop: number;
	readonly operation: SberPosOperationType;
	readonly pilotCommandText: string;
}

export const SberPosLcdDisplay: React.FC<SberPosLcdDisplayProps> = ({
	activeModelName,
	terminalId,
	isConfigured,
	status,
	statusMessage,
	totalBillKop,
	operation,
	pilotCommandText,
}) => {
	const isSuccess = status === "success";
	const isFailed = ["card_declined", "pin_timeout", "communication_error", "user_cancelled"].includes(status);
	const isProcessing = ["connecting", "card_wait", "processing_card", "authorizing", "pin_entry"].includes(status);

	return (
		<div
			className="p-5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] min-h-[220px] flex flex-col justify-between shadow-xs transition-all"
			data-testid="sber-pos-status-panel"
		>
			<div className="flex items-center justify-between text-xs border-b border-[var(--line,#e2e8f0)] pb-2.5 text-[var(--muted,#64748b)]">
				<div className="flex items-center gap-2 font-medium">
					<span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
					<span className="font-semibold text-[var(--ink,#0f172a)]">
						{activeModelName ? activeModelName.split(" ")[0] : "Банковский POS-терминал"}
					</span>
					<span>• TID: {isConfigured ? terminalId : "Не настроен"}</span>
				</div>
				<div className="flex items-center gap-1.5 text-xs text-[var(--muted,#64748b)]">
					<Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
					<span>Связь активна</span>
				</div>
			</div>

			<div className="my-auto py-4 text-center flex flex-col items-center justify-center gap-2">
				<span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
					Сумма операции на терминале
				</span>
				<div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-[var(--ink,#0f172a)] leading-tight">
					{((totalBillKop || 0) / 100).toLocaleString("ru-RU", {
						minimumFractionDigits: 2,
					})}{" "}
					₽
				</div>

				<div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold max-w-md">
					{isSuccess ? (
						<div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
							<CheckCircle2 className="w-4 h-4 text-emerald-600" />
							<span>Оплата успешно авторизована банком!</span>
						</div>
					) : isFailed ? (
						<div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-medium">
							<XCircle className="w-4 h-4 text-rose-600 shrink-0" />
							<span>{statusMessage || "Операция отклонена банком"}</span>
						</div>
					) : status === "qr_displayed" ? (
						<div className="flex flex-col items-center gap-2">
							<div className="w-24 h-24 bg-[var(--paper,#ffffff)] p-1.5 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center shadow-sm">
								<QrCode className="w-full h-full text-[var(--ink,#0f172a)]" />
							</div>
							<span className="text-xs font-bold text-[var(--teal,#0d9488)]">
								Сканируйте QR-код через СБП
							</span>
						</div>
					) : isProcessing ? (
						<div className="flex items-center gap-2 text-[var(--ink,#0f172a)] font-medium">
							<Loader2 className="w-4 h-4 text-[var(--teal,#0d9488)] animate-spin" />
							<span>{statusMessage || "Отправка команды на физический терминал..."}</span>
						</div>
					) : (
						<div className="flex items-center gap-1.5 text-[var(--muted,#64748b)]">
							<CreditCard className="w-4 h-4" />
							<span>{statusMessage || "Готов к отправке суммы"}</span>
						</div>
					)}
				</div>
			</div>

			<div className="text-[11px] text-[var(--muted,#64748b)] font-mono pt-2 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between">
				<span>Драйвер эквайринга: Pilot-NT (CMD {getPilotNtCommandCode(operation)})</span>
				<span className="truncate max-w-[240px] text-[var(--ink,#0f172a)] font-medium">
					{pilotCommandText}
				</span>
			</div>
		</div>
	);
};
