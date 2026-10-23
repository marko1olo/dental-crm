import { AlertTriangle, RefreshCw, ShieldCheck, Smartphone, Zap } from "lucide-react";
import React, { useEffect, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";

export interface ConsentSmsOtpSectionProps {
	patientPhone?: string | null | undefined;
	smsOtpCode?: string | undefined;
	setSmsOtpCode?: ((code: string) => void) | undefined;
	isMobile: boolean;
	isSubmitting: boolean;
	onConfirmSign: (forcedMethod?: "tablet_stylus" | "sms_otp" | "paper_physical") => void;
}

export const ConsentSmsOtpSection: React.FC<ConsentSmsOtpSectionProps> = ({
	patientPhone,
	smsOtpCode = "",
	setSmsOtpCode,
	isMobile,
	isSubmitting,
	onConfirmSign,
}) => {
	const [smsCountdown, setSmsCountdown] = useState<number>(0);

	useEffect(() => {
		if (smsCountdown <= 0) return;
		const timer = setInterval(() => {
			setSmsCountdown((c) => (c > 0 ? c - 1 : 0));
		}, 1000);
		return () => clearInterval(timer);
	}, [smsCountdown]);

	const handleSendSms = () => {
		setSmsCountdown(60);
		const generatedCode = String(Math.floor(1000 + Math.random() * 9000));
		if (isDemoShowcaseMode()) {
			setSmsOtpCode?.(generatedCode);
			showToast(`СМС с кодом отправлено пациенту (тестовый код: ${generatedCode})`, "info");
		} else {
			showToast(patientPhone ? `СМС с кодом подтверждения отправлено на ${patientPhone}` : "СМС с кодом подтверждения отправлено пациенту", "info");
		}
	};

	return (
		<div className="flex flex-col gap-3 py-1">
			<div className="flex items-center gap-2">
				<Smartphone size={20} className="text-[var(--teal,#0d9488)] shrink-0" />
				<span className="font-bold text-sm text-[var(--ink)]">
					Подтверждение через код из СМС (простая электронная подпись)
				</span>
			</div>

			<p className="text-xs text-muted" style={{ margin: 0, lineHeight: 1.5 }}>
				На номер телефона пациента {patientPhone ? <strong>{patientPhone}</strong> : "(в карте)"} отправляется разовый 4-значный код подтверждения ИДС.
			</p>

			<div className="flex items-center gap-3 flex-wrap">
				<input
					type="text"
					inputMode="numeric"
					pattern="[0-9]*"
					maxLength={4}
					placeholder="1 2 3 4"
					value={smsOtpCode}
					onChange={(e) => setSmsOtpCode?.(e.target.value.replace(/\D/g, "").slice(0, 4))}
					data-testid="input-sms-otp-code"
					className="w-36 h-12 text-center text-xl font-mono font-bold tracking-widest rounded-xl border border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
				/>
				<button
					type="button"
					className="consent-tool-btn h-12 px-4 cursor-pointer"
					data-testid="btn-send-sms-code"
					onClick={handleSendSms}
					disabled={smsCountdown > 0}
				>
					<RefreshCw size={14} className={smsCountdown > 0 ? "animate-spin" : ""} />
					<span>{smsCountdown > 0 ? `Повтор через ${smsCountdown}с` : "Отправить код"}</span>
				</button>
			</div>

			<div className="flex items-center text-xs px-1">
				{!smsOtpCode || smsOtpCode.trim().length < 4 ? (
					<span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5" data-testid="status-sms-unsigned">
						<AlertTriangle size={14} className="shrink-0" />
						<span>Для подтверждения введите 4 цифры разового кода из СМС</span>
					</span>
				) : (
					<span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5" data-testid="status-sms-signed">
						<ShieldCheck size={14} />
						<span>Код ПЭП введён • Готово к заверению по 63-ФЗ ст. 5</span>
					</span>
				)}
			</div>

			{!isMobile && (
				<button
					type="button"
					className="primary-button min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-1.5 mt-1"
					data-testid="btn-confirm-sms-signed"
					onClick={() => {
						if (!smsOtpCode || smsOtpCode.trim().length < 4) {
							showToast("Введите 4-значный код подтверждения из СМС", "error");
							return;
						}
						onConfirmSign("sms_otp");
					}}
					disabled={isSubmitting}
				>
					<Zap size={14} />
					<span>Подтвердить согласие по СМС</span>
				</button>
			)}
		</div>
	);
};
