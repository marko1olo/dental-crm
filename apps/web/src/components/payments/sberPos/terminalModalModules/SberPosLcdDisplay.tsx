import type { SberPosOperationType } from "@dental/shared";
import { CheckCircle2, CreditCard, Loader2, QrCode, ShieldCheck, XCircle } from "lucide-react";
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
	readonly pilotCommandText?: string | undefined;
}

/**
 * Статус эквайрингового терминала без архаичных псевдо-ЖК экранчиков (Мандаты 8e, 8k, 8x).
 * Чистый прозрачный UI: сумма, статус ожидания карты и результат авторизации банком.
 */
export const SberPosLcdDisplay: React.FC<SberPosLcdDisplayProps> = ({
	terminalId,
	isConfigured,
	status,
	statusMessage,
	totalBillKop,
}) => {
	const isSuccess = status === "success";
	const isFailed = [
		"card_declined",
		"pin_timeout",
		"communication_error",
		"user_cancelled",
	].includes(status);
	const isProcessing = [
		"connecting",
		"card_wait",
		"processing_card",
		"authorizing",
		"pin_entry",
	].includes(status);

	const amountRubFormatted = ((totalBillKop || 0) / 100).toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
	});

	return (
		<div
			className="p-5 rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] min-h-[200px] flex flex-col justify-between shadow-xs transition-all"
			data-testid="sber-pos-status-panel"
		>
			{/* Верхняя строка статуса подключения */}
			<div className="flex items-center justify-between text-xs border-b border-[var(--line,#e2e8f0)] pb-3 text-[var(--muted,#64748b)]">
				<div className="flex items-center gap-2 font-medium">
					<span
						className={`w-2.5 h-2.5 rounded-full shrink-0 ${
							isConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
						}`}
					/>
					<span className="font-semibold text-[var(--ink,#0f172a)]">
						Банковский POS-терминал
					</span>
					<span>• TID: {isConfigured ? terminalId : "Не настроен"}</span>
				</div>
				<div className="flex items-center gap-1.5 text-xs text-[var(--muted,#64748b)]">
					<ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
					<span>{isConfigured ? "Готов к оплате" : "Требуется настройка"}</span>
				</div>
			</div>

			{/* Центральная информационная зона: Сумма + Статус */}
			<div className="my-auto py-5 text-center flex flex-col items-center justify-center gap-2">
				<span className="text-xs font-semibold text-[var(--muted,#64748b)] uppercase tracking-wider">
					Сумма к оплате на терминале
				</span>
				<div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-[var(--ink,#0f172a)] leading-tight">
					{amountRubFormatted} ₽
				</div>

				<div className="mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold max-w-lg transition-all">
					{isSuccess ? (
						<div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
							<CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
							<span>Оплата успешно авторизована банком!</span>
						</div>
					) : isFailed ? (
						<div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-semibold bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/30">
							<XCircle className="w-5 h-5 text-rose-600 shrink-0" />
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
						<div className="flex items-center gap-2 text-[var(--ink,#0f172a)] font-medium bg-[var(--paper-soft,#f8fafc)] px-3 py-1.5 rounded-xl border border-[var(--line,#e2e8f0)]">
							<Loader2 className="w-4 h-4 text-[var(--teal,#0d9488)] animate-spin shrink-0" />
							<span>{statusMessage || "Ожидание прикладывания карты к терминалу..."}</span>
						</div>
					) : (
						<div className="flex items-center gap-2 text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f8fafc)] px-3 py-1.5 rounded-xl border border-[var(--line,#e2e8f0)]">
							<CreditCard className="w-4 h-4 shrink-0 text-[var(--teal,#0d9488)]" />
							<span>{statusMessage || "Ожидание карты на терминале..."}</span>
						</div>
					)}
				</div>
			</div>

			{/* Нижняя строчка подсказки оператору */}
			<div className="text-[11px] text-[var(--muted,#64748b)] pt-2.5 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between">
				<span>Приложите карту, смартфон или вставьте чип в терминал</span>
				<span className="text-[var(--ink,#0f172a)] font-medium">Безналичный расчет</span>
			</div>
		</div>
	);
};
