import type React from "react";
import {
	CheckCircle2,
	KeyRound,
	Moon,
	RefreshCw,
	Shield,
	ShieldCheck,
	X,
	Zap,
} from "lucide-react";
import type { DoctorShiftActionsProps } from "./types";

export const DoctorShiftActions: React.FC<DoctorShiftActionsProps> = ({
	signedEmrCount,
	onOpenCloseModal,
	signingSession,
	onCloseSmsDrawer,
	enteredSmsCode,
	onChangeSmsCode,
	smsCountdown,
	isSubmittingCode,
	onConfirmSmsSigning,
	onSessionPepSigning,
}) => {
	return (
		<>
			{/* Bottom Safe Area Summary */}
			<div className="doctor-pwa-bottom-bar">
				<div className="flex items-center gap-1 text-[var(--muted)]">
					<Shield size={13} className="text-[var(--teal)]" />
					<span>Изоляция смены активна</span>
				</div>
				<div className="flex items-center gap-2 font-bold text-[var(--ink)]">
					<span>Карты: {signedEmrCount} подписано</span>
				</div>
				<button
					type="button"
					onClick={onOpenCloseModal}
					className="min-h-[44px] px-3.5 py-2 rounded-xl font-bold text-xs bg-[var(--rose-fill,#e11d48)] hover:bg-[var(--rose,#f43f5e)] text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer ml-auto border border-rose-600/30"
					data-testid="doctor-pwa-close-shift-btn"
					aria-label="Закрыть смену врача"
				>
					<Moon size={14} />
					<span>Закрыть смену</span>
				</button>
			</div>

			{/* SMS Code Verification Drawer */}
			{signingSession && (
				<div
					className="doctor-sms-modal-overlay"
					data-testid="doctor-sms-signing-drawer"
				>
					<div className="doctor-sms-modal-content">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 font-bold text-sm text-[var(--ink)]">
								<KeyRound className="text-[var(--teal)] w-5 h-5" />
								<span>ПЭП СМС-Подтверждение</span>
							</div>
							<button
								type="button"
								onClick={onCloseSmsDrawer}
								className="min-h-[44px] min-w-[44px] p-2 rounded-full bg-[var(--paper,#121826)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center border border-[var(--line,#334155)] cursor-pointer"
								aria-label="Закрыть СМС-подтверждение"
							>
								<X size={15} />
							</button>
						</div>

						<p className="text-xs text-[var(--muted)] leading-relaxed">
							Код подтверждения отправлен на номер <strong>{signingSession.maskedPhone}</strong> для заверения {signingSession.appointmentIds.length} медицинских карт.
						</p>

						{/* 6-Digit PIN Input */}
						<div>
							<input
								type="text"
								inputMode="numeric"
								maxLength={6}
								placeholder="••••••"
								value={enteredSmsCode}
								onChange={(e) => onChangeSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
								className="doctor-sms-code-input"
								data-testid="sms-code-input"
								autoFocus
							/>
							<div className="mt-2 text-center text-[11px] text-[var(--muted)]">
								<span>
									Истекает через: <strong className="text-[var(--gold)]">{Math.floor(smsCountdown / 60)}:{(smsCountdown % 60).toString().padStart(2, "0")}</strong>
								</span>
							</div>
						</div>

						{/* Statutory basis badge */}
						<div className="p-2.5 rounded-xl bg-[var(--paper,#121826)] border border-[var(--line,#334155)] text-[10px] text-[var(--muted)] flex items-center gap-2">
							<ShieldCheck size={14} className="text-[var(--emerald)] shrink-0" />
							<span>ПЭП в соответствии с 63-ФЗ ст. 9 и Приказом 947н</span>
						</div>

						{/* Confirm Button */}
						<button
							type="button"
							onClick={onConfirmSmsSigning}
							disabled={isSubmittingCode}
							className="w-full min-h-[48px] rounded-xl text-sm font-extrabold bg-[var(--teal-fill,#0d9488)] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
							data-testid="confirm-sms-code-btn"
						>
							{isSubmittingCode ? (
								<>
									<RefreshCw className="animate-spin w-4 h-4" />
									<span>Подписание в ЕГИСЗ...</span>
								</>
							) : (
								<>
									<CheckCircle2 size={16} />
									<span>Заверить {signingSession.appointmentIds.length} карт ПЭП</span>
								</>
							)}
						</button>

						{/* 1-Click Session PEP Fallback if SMS is delayed (Mandate 8e, 63-ФЗ ст. 9) */}
						<button
							type="button"
							onClick={() => onSessionPepSigning(signingSession.appointmentIds)}
							className="w-full min-h-[44px] rounded-xl text-xs font-bold bg-[var(--paper-soft,#1e293b)] hover:bg-[var(--line,#334155)] text-[var(--teal,#14b8a6)] border border-[var(--teal,#14b8a6)]/40 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
							data-testid="sms-delay-fallback-pep-btn"
							title="Подписать сессионной ПЭП без ожидания СМС"
						>
							<Zap size={14} />
							<span>Подписать ПЭП (без ожидания СМС)</span>
						</button>
					</div>
				</div>
			)}
		</>
	);
};
