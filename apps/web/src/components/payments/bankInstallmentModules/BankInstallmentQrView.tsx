import { Check, Copy, QrCode, Send } from "lucide-react";
import type React from "react";
import { TreatmentPlanQrCode } from "../../treatment-plans/qr/TreatmentPlanQrCode";
import type { BankInstallmentProviderConfig } from "../bankInstallmentEngine";

export interface BankInstallmentQrViewProps {
	readonly qrPayload: string;
	readonly activeProviderConfig: BankInstallmentProviderConfig;
	readonly isCopied: boolean;
	readonly isSmsSent: boolean;
	readonly onCopyLink: () => void;
	readonly onSendSms: () => void;
}

export const BankInstallmentQrView: React.FC<BankInstallmentQrViewProps> = ({
	qrPayload,
	activeProviderConfig,
	isCopied,
	isSmsSent,
	onCopyLink,
	onSendSms,
}) => {
	return (
		<div
			className="qr-display-box space-y-3"
			data-testid="bank-installment-qr-box"
		>
			<div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
				<QrCode size={15} className="text-[var(--teal,var(--brand-primary))]" />
				<span>Сканируйте камерой телефона</span>
			</div>

			<div className="p-2 rounded-xl bg-white border border-slate-200 shadow-inner">
				<TreatmentPlanQrCode
					value={qrPayload}
					size={170}
					title="QR-код для оформления банковской рассрочки"
				/>
			</div>

			<p className="text-[11px] text-center text-[var(--muted,#64748b)] max-w-xs leading-snug">
				Пациент открывает приложение {activeProviderConfig.name} и подтверждает
				рассрочку без документов.
			</p>

			{/* Actions: Copy & SMS */}
			<div className="flex items-center gap-2 w-full pt-1">
				<button
					type="button"
					onClick={onCopyLink}
					className="min-h-[44px] flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--paper-soft,#f8fafc)] hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] transition cursor-pointer"
					data-testid="copy-installment-link-btn"
				>
					{isCopied ? (
						<Check size={14} className="text-emerald-500" />
					) : (
						<Copy size={14} />
					)}
					<span>{isCopied ? "Скопировано" : "Копировать"}</span>
				</button>

				<button
					type="button"
					onClick={onSendSms}
					className="min-h-[44px] flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--paper-soft,#f8fafc)] hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] transition cursor-pointer"
					data-testid="send-installment-sms-btn"
				>
					{isSmsSent ? (
						<Check size={14} className="text-emerald-500" />
					) : (
						<Send size={14} />
					)}
					<span>{isSmsSent ? "Отправлено" : "СМС на телефон"}</span>
				</button>
			</div>
		</div>
	);
};
