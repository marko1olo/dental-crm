import type React from "react";
import { CheckCircle2, FileCheck, Lock, RefreshCw, Smartphone, X } from "lucide-react";
import type { PatientStatutoryConsent } from "../patientCabinetEngine";

export interface ConsentSigningSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly consent: PatientStatutoryConsent | null;
	readonly phone: string;
	readonly patientName: string;
	readonly consentSignMode: "sms_otp" | "cabinet_pep";
	readonly onSetConsentSignMode: (mode: "sms_otp" | "cabinet_pep") => void;
	readonly otpDigits: string[];
	readonly onOtpDigitChange: (index: number, val: string) => void;
	readonly otpError: string | null;
	readonly otpCountdown: number;
	readonly onResendOtp: () => void;
	readonly onConfirmOtp: () => void;
	readonly onSignCabinetPep: () => void;
}

export const ConsentSigningSheet: React.FC<ConsentSigningSheetProps> = ({
	isOpen,
	onClose,
	consent,
	phone,
	patientName,
	consentSignMode,
	onSetConsentSignMode,
	otpDigits,
	onOtpDigitChange,
	otpError,
	otpCountdown,
	onResendOtp,
	onConfirmOtp,
	onSignCabinetPep,
}) => {
	if (!isOpen || !consent) return null;

	return (
		<div
			className="pc-sheet-overlay"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label="Подписание ИДС"
		>
			<div
				className="pc-sheet-window"
				onClick={(e) => e.stopPropagation()}
				data-testid="sms-otp-signing-dialog"
			>
				{/* Top Drag Handle */}
				<div className="pc-sheet-handle-bar">
					<div className="pc-sheet-handle" />
				</div>

				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<Smartphone size={22} style={{ color: "var(--pc-primary)" }} />
						<strong style={{ fontSize: "1.0625rem" }}>Подписание ИДС (63-ФЗ)</strong>
					</div>
					<button
						type="button"
						className="pc-close-btn"
						onClick={onClose}
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				<div>
					<strong style={{ fontSize: "0.9375rem" }}>{consent.titleRu}</strong>
					<p style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)", margin: "4px 0 0 0" }}>
						{consent.summaryTextRu}
					</p>
				</div>

				{/* Mode Switcher */}
				<div style={{ display: "flex", gap: "8px", background: "var(--pc-surface)", padding: "4px", borderRadius: "8px" }}>
					<button
						type="button"
						className={`pc-btn-secondary ${consentSignMode === "sms_otp" ? "active" : ""}`}
						style={{ flex: 1, minHeight: "44px", fontWeight: consentSignMode === "sms_otp" ? 700 : 500 }}
						onClick={() => onSetConsentSignMode("sms_otp")}
					>
						<Smartphone size={14} />
						<span>SMS-код (63-ФЗ)</span>
					</button>
					<button
						type="button"
						className={`pc-btn-secondary ${consentSignMode === "cabinet_pep" ? "active" : ""}`}
						style={{ flex: 1, minHeight: "44px", fontWeight: consentSignMode === "cabinet_pep" ? 700 : 500 }}
						onClick={() => onSetConsentSignMode("cabinet_pep")}
					>
						<FileCheck size={14} />
						<span>Подтверждение в ЛК (63-ФЗ)</span>
					</button>
				</div>

				{consentSignMode === "sms_otp" ? (
					<>
						<div style={{ background: "var(--pc-surface)", padding: "12px", borderRadius: "var(--pc-radius-sm)", fontSize: "0.8125rem" }}>
							Мы отправили одноразовый 6-значный SMS-код на ваш номер <strong>{phone}</strong>:
						</div>

						{/* 6-Digit PIN Inputs */}
						<div className="pc-otp-container">
							{otpDigits.map((digit, idx) => (
								<input
									key={idx}
									id={`pc-otp-${idx}`}
									type="text"
									inputMode="numeric"
									maxLength={1}
									value={digit}
									onChange={(e) => onOtpDigitChange(idx, e.target.value)}
									className="pc-otp-digit"
									aria-label={`Цифра ${idx + 1} SMS кода`}
									autoFocus={idx === 0}
								/>
							))}
						</div>

						{otpError && (
							<div style={{ color: "var(--pc-danger)", fontSize: "0.8125rem", textAlign: "center", fontWeight: 700 }}>
								{otpError}
							</div>
						)}

						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<button
								type="button"
								className="pc-btn-secondary"
								onClick={onResendOtp}
								disabled={otpCountdown > 0}
								style={{ minHeight: "44px" }}
							>
								<RefreshCw size={14} className={otpCountdown > 0 ? "animate-spin" : ""} />
								<span>
									{otpCountdown > 0 ? `Повтор через ${otpCountdown} сек.` : "Отправить код повторно"}
								</span>
							</button>
						</div>

						<div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
							<button
								type="button"
								className="pc-btn-primary"
								style={{ flex: 1, minHeight: "44px" }}
								onClick={onConfirmOtp}
								data-testid="verify-otp-btn"
							>
								<Lock size={16} />
								<span>Подписать документ (63-ФЗ ПЭП)</span>
							</button>
						</div>
					</>
				) : (
					<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
						<div style={{ background: "var(--pc-surface)", padding: "12px", borderRadius: "var(--pc-radius-sm)", fontSize: "0.8125rem", display: "flex", flexDirection: "column", gap: "6px" }}>
							<div style={{ fontWeight: 700, color: "var(--pc-text-main)" }}>
								Подтверждение через личный кабинет (63-ФЗ ПЭП / ст. 20 323-ФЗ)
							</div>
							<div style={{ color: "var(--pc-text-muted)" }}>
								Пациент: <strong>{patientName}</strong> ({phone})
							</div>
							<div style={{ fontSize: "0.75rem", color: "var(--pc-text-muted)" }}>
								Подтверждая согласие в авторизованном личном кабинете, вы принимаете условия плана лечения и подписываете ИДС простой электронной подписью.
							</div>
						</div>
						<button
							type="button"
							className="pc-btn-primary"
							onClick={onSignCabinetPep}
							style={{ minHeight: "44px" }}
							data-testid="confirm-touch-signature-btn"
						>
							<CheckCircle2 size={16} />
							<span>Подтвердить согласие в личном кабинете (63-ФЗ ПЭП)</span>
						</button>
					</div>
				)}
			</div>
		</div>
	);
};
