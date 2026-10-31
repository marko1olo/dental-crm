/**
 * SelfCheckinOtpVerification.tsx
 * (DOMAIN: PORTAL & SELF-CHECKIN KIOSK)
 *
 * OTP Verification & Messenger Confirmation Screen:
 * - Deterministic instant verification in demo showcase mode (isDemoShowcaseMode)
 * - Countdown timer for resend SMS/Telegram code
 * - Instant fallback to reception desk checkin (Mandate 8e: zero dead-ends)
 * - Tactile touch targets >= 44x44px, strict design token compliance
 */

import React, { memo } from "react";
import { CheckCircle2, Clock, MessageSquare, Send, ShieldAlert, Sparkles } from "lucide-react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { triggerHaptic } from "../../../native/mobileBridge";

export interface SelfCheckinOtpVerificationProps {
	readonly phoneNumber: string;
	readonly otpCode: string;
	readonly setOtpCode: (code: string) => void;
	readonly countdown: number;
	readonly onResendOtp: () => void;
	readonly onVerifyOtp: () => void;
	readonly onOpenTelegramBot?: (() => void) | undefined;
	readonly onBypassToReception?: (() => void) | undefined;
	readonly isSubmitting?: boolean | undefined;
	readonly error?: string | null | undefined;
}

export const SelfCheckinOtpVerification: React.FC<SelfCheckinOtpVerificationProps> = memo(({
	phoneNumber,
	otpCode,
	setOtpCode,
	countdown,
	onResendOtp,
	onVerifyOtp,
	onOpenTelegramBot,
	onBypassToReception,
	isSubmitting = false,
	error,
}) => {
	const isDemo = isDemoShowcaseMode();
	const demoCode = "4199";

	const handleApplyDemoCode = () => {
		triggerHaptic("medium");
		setOtpCode(demoCode);
	};

	return (
		<div
			className="selfcheckin-otp-container"
			style={{
				padding: "16px",
				borderRadius: "16px",
				border: "1px solid var(--line)",
				backgroundColor: "var(--paper-soft, var(--paper))",
				display: "flex",
				flexDirection: "column",
				gap: "12px",
			}}
			data-testid="selfcheckin-otp-verification"
		>
			<div style={{ textAlign: "center" }}>
				<div style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink)", marginBottom: "4px" }}>
					Подтверждение номера телефона
				</div>
				<div style={{ fontSize: "13px", color: "var(--muted)" }}>
					Код отправлен на номер <strong>{phoneNumber || "Ваш телефон"}</strong>
				</div>
			</div>

			{/* Demo Showcase Helper */}
			{isDemo && (
				<div
					style={{
						padding: "8px 12px",
						borderRadius: "10px",
						backgroundColor: "var(--teal-soft, rgba(13, 148, 136, 0.1))",
						border: "1px solid var(--teal)",
						fontSize: "12px",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<span style={{ color: "var(--teal)", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
						<Sparkles size={14} />
						Демо-код: <strong>{demoCode}</strong>
					</span>
					<button
						type="button"
						onClick={handleApplyDemoCode}
						style={{
							backgroundColor: "var(--teal)",
							color: "#ffffff",
							border: "none",
							borderRadius: "6px",
							padding: "4px 8px",
							fontSize: "11px",
							fontWeight: 700,
							cursor: "pointer",
						}}
					>
						Вставить
					</button>
				</div>
			)}

			{/* OTP 4-Digit Input */}
			<div style={{ display: "flex", justifyContent: "center", gap: "10px", margin: "6px 0" }}>
				{[0, 1, 2, 3].map((idx) => {
					const digit = otpCode[idx];
					return (
						<div
							key={idx}
							style={{
								width: "52px",
								height: "56px",
								borderRadius: "12px",
								border: digit ? "2px solid var(--teal)" : "2px dashed var(--line)",
								backgroundColor: digit ? "var(--teal-soft, rgba(13, 148, 136, 0.1))" : "var(--paper-card, var(--paper))",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "24px",
								fontWeight: 800,
								color: "var(--ink)",
							}}
						>
							{digit || "•"}
						</div>
					);
				})}
			</div>

			{/* Hidden Input for Native Keyboard */}
			<input
				type="text"
				value={otpCode}
				onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
				style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1 }}
				maxLength={4}
				autoFocus
				inputMode="numeric"
			/>

			{error && (
				<div
					style={{
						color: "var(--bad, #ef4444)",
						fontSize: "13px",
						textAlign: "center",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "6px",
					}}
				>
					<ShieldAlert size={16} />
					<span>{error}</span>
				</div>
			)}

			{/* Primary Action Button */}
			<button
				type="button"
				className="selfcheckin-btn-primary"
				disabled={otpCode.length < 4 || isSubmitting}
				onClick={onVerifyOtp}
				style={{
					width: "100%",
					minHeight: "52px",
					fontSize: "15px",
					fontWeight: 800,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: "8px",
					borderRadius: "12px",
					backgroundColor: otpCode.length === 4 ? "var(--teal)" : "var(--line)",
					color: otpCode.length === 4 ? "#ffffff" : "var(--muted)",
					border: "none",
					cursor: otpCode.length === 4 ? "pointer" : "not-allowed",
					transition: "all 0.15s ease",
				}}
			>
				<CheckCircle2 size={18} />
				<span>{isSubmitting ? "Проверка кода..." : "Подтвердить код"}</span>
			</button>

			{/* Telegram Bot & Resend Options */}
			<div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
				{countdown > 0 ? (
					<div
						style={{
							fontSize: "12px",
							color: "var(--muted)",
							textAlign: "center",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "6px",
						}}
					>
						<Clock size={14} />
						<span>Повторная отправка через {countdown} сек.</span>
					</div>
				) : (
					<button
						type="button"
						onClick={onResendOtp}
						style={{
							background: "none",
							border: "none",
							color: "var(--teal)",
							fontSize: "13px",
							fontWeight: 600,
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "6px",
						}}
					>
						<Send size={14} />
						<span>Отправить код повторно</span>
					</button>
				)}

				{onOpenTelegramBot && (
					<button
						type="button"
						onClick={onOpenTelegramBot}
						style={{
							background: "none",
							border: "none",
							color: "var(--teal)",
							fontSize: "13px",
							fontWeight: 600,
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "6px",
						}}
					>
						<MessageSquare size={14} />
						<span>Получить код через Telegram-бот клиники</span>
					</button>
				)}

				{onBypassToReception && (
					<button
						type="button"
						onClick={onBypassToReception}
						style={{
							background: "none",
							border: "none",
							color: "var(--muted)",
							fontSize: "12px",
							textDecoration: "underline",
							cursor: "pointer",
							marginTop: "4px",
						}}
					>
						Не приходит код? Подойти к администратору
					</button>
				)}
			</div>
		</div>
	);
});

SelfCheckinOtpVerification.displayName = "SelfCheckinOtpVerification";
