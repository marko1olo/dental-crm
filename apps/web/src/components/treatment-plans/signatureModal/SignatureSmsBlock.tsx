import React from "react";
import { Phone, RefreshCw, Smartphone } from "lucide-react";

export interface SignatureSmsBlockProps {
	readonly phone: string;
	readonly setPhone: (val: string) => void;
	readonly smsCode: string;
	readonly setSmsCode: (val: string) => void;
	readonly smsSent: boolean;
	readonly countdown: number;
	readonly isRequestingSms: boolean;
	readonly onRequestSmsCode: () => void;
}

export const SignatureSmsBlock: React.FC<SignatureSmsBlockProps> = ({
	phone,
	setPhone,
	smsCode,
	setSmsCode,
	smsSent,
	countdown,
	isRequestingSms,
	onRequestSmsCode,
}) => {
	return (
		<div className="p-4 rounded-2xl bg-teal-500/5 dark:bg-teal-950/20 border border-teal-500/20 space-y-3">
			<div className="flex items-center gap-2 text-xs font-extrabold text-[var(--ink)]">
				<Smartphone size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
				<span>Простая электронная подпись (ПЭП) по СМС</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div>
					<label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
						Номер телефона пациента:
					</label>
					<div className="relative">
						<Phone size={14} className="absolute left-3 top-3 text-[var(--muted)]" />
						<input
							type="tel"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							className="w-full h-10 pl-8 pr-3 rounded-xl text-xs font-mono bg-[var(--paper-strong,var(--paper))] border border-[var(--border)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
							placeholder="+7 (999) 000-00-00"
						/>
					</div>
				</div>

				<div>
					<label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
						Действие:
					</label>
					<button
						type="button"
						onClick={() => {
							if (countdown > 0 || isRequestingSms) return;
							onRequestSmsCode();
						}}
						aria-busy={isRequestingSms}
						className={`w-full h-10 px-4 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs ${
							countdown > 0 || isRequestingSms ? "opacity-75" : ""
						}`}
						data-testid="request-sms-btn"
					>
						{countdown > 0 ? (
							<>
								<RefreshCw size={13} className="animate-spin" />
								<span>Повторить ({countdown}с)</span>
							</>
						) : (
							<span>Отправить СМС-код</span>
						)}
					</button>
				</div>
			</div>

			{smsSent && (
				<div className="pt-2 border-t border-teal-500/20 space-y-2">
					<label className="block text-[11px] font-semibold text-[var(--muted)]">
						Введите 6-значный проверочный код из СМС:
					</label>
					<div className="flex items-center gap-3">
						<input
							type="text"
							maxLength={6}
							value={smsCode}
							onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
							placeholder="123456"
							className="w-40 h-11 text-center font-mono text-base font-black tracking-widest rounded-xl bg-[var(--paper-strong,var(--paper))] border border-[var(--teal,var(--border))] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
							data-testid="sms-code-input"
						/>
						<span className="text-xs text-[var(--muted)] leading-tight">
							Код отправлен на номер пациента. Для тестовых стендов код: <strong className="text-teal-600 dark:text-teal-400 font-mono">123456</strong>
						</span>
					</div>
				</div>
			)}
		</div>
	);
};
