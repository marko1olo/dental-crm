import {
	getPilotNtCommandCode,
	type SberPosOperationType,
} from "@dental/shared";
import { QrCode, Radio, Smile, Wifi } from "lucide-react";
import type React from "react";

export interface SberPosLcdDisplayProps {
	readonly activeModelName: string;
	readonly terminalId: string;
	readonly isConfigured: boolean;
	readonly timerSeconds: number;
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
	timerSeconds,
	status,
	statusMessage,
	totalBillKop,
	operation,
	pilotCommandText,
}) => {
	return (
		<div
			className="sber-pos-lcd-screen p-5 min-h-[220px] flex flex-col justify-between"
			data-testid="sber-pos-status-panel"
		>
			<div className="flex items-center justify-between text-xs border-b border-[var(--line,#e2e8f0)] pb-2.5 text-[var(--muted,#64748b)]">
				<div className="flex items-center gap-1.5 font-semibold">
					<Radio className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
					<span className="font-bold uppercase tracking-wider text-[var(--ink,#0f172a)]">
						{activeModelName ? activeModelName.split(" ")[0] : "SBER-POS"}
					</span>
					<span>• TID {isConfigured ? terminalId : "НЕ НАСТРОЕН"}</span>
				</div>
				<div className="flex items-center gap-2">
					<span>
						Таймаут:{" "}
						<strong className="text-[var(--ink,#0f172a)]">
							{timerSeconds}с
						</strong>
					</span>
					<Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
				</div>
			</div>

			<div className="my-auto py-4 text-center flex flex-col items-center justify-center gap-2">
				{status === "qr_displayed" ? (
					<div className="flex flex-col items-center gap-2">
						<div className="w-28 h-28 bg-[var(--paper,#ffffff)] p-2 rounded-xl border-2 border-emerald-500 flex items-center justify-center shadow-lg">
							<QrCode className="w-full h-full text-[var(--ink,#0f172a)]" />
						</div>
						<span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
							ПЛАТИ QR / СБЕРБАНК ОНЛАЙН
						</span>
					</div>
				) : status === "biometry_scan" ? (
					<div className="flex flex-col items-center gap-2">
						<div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center sber-facepay-active-ring">
							<Smile className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
						</div>
						<span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
							3D FacePay: Ожидание сканирования лица...
						</span>
					</div>
				) : (
					<p className="text-sm sm:text-base font-bold tracking-wide text-[var(--ink,#0f172a)] leading-snug max-w-md">
						{statusMessage}
					</p>
				)}
				<p className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
					СУММА:{" "}
					{((totalBillKop || 1960000) / 100).toLocaleString("ru-RU", {
						minimumFractionDigits: 2,
					})}{" "}
					₽
				</p>
			</div>

			<div className="text-[10px] text-[var(--muted,#64748b)] font-mono pt-2 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between">
				<span>Pilot-NT: CMD {getPilotNtCommandCode(operation)}</span>
				<span className="truncate max-w-[200px] text-[var(--ink,#0f172a)] font-medium">
					{pilotCommandText}
				</span>
			</div>
		</div>
	);
};
