import { CreditCard, Sliders, X } from "lucide-react";
import type React from "react";

export interface SberPosTerminalHeaderProps {
	readonly patientName: string;
	readonly orderId?: string | undefined;
	readonly totalBillKop: number;
	readonly isConfigured: boolean;
	readonly isSettingsOpen: boolean;
	readonly onToggleSettings: () => void;
	readonly onClose: () => void;
}

export const SberPosTerminalHeader: React.FC<SberPosTerminalHeaderProps> = ({
	patientName,
	orderId,
	totalBillKop,
	isConfigured,
	isSettingsOpen,
	onToggleSettings,
	onClose,
}) => (
	<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
		<div className="flex items-center gap-3">
			<div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
				<CreditCard className="w-5 h-5" />
			</div>
			<div>
				<div className="flex items-center gap-2">
					<h2 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)]">
						Сбербанк POS Терминал & SberPay
					</h2>
					<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
						Pilot-NT TCP:4000
					</span>
				</div>
				<p className="text-xs text-[var(--muted,#64748b)]">
					{patientName} • Заказ #{orderId} • К оплате:{" "}
					<span className="font-bold text-[var(--ink,#0f172a)]">
						{(totalBillKop / 100).toLocaleString("ru-RU")} ₽
					</span>
					{!isConfigured && (
						<span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
							Не настроен
						</span>
					)}
				</p>
			</div>
		</div>
		<div className="flex items-center gap-2">
			<button
				type="button"
				onClick={onToggleSettings}
				className={`h-9 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-colors ${
					isSettingsOpen
						? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
						: "border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
				}`}
			>
				<Sliders className="w-3.5 h-3.5" />
				<span>Профиль</span>
			</button>
			<button
				type="button"
				onClick={onClose}
				className="w-9 h-9 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors"
			>
				<X className="w-5 h-5" />
			</button>
		</div>
	</div>
);
