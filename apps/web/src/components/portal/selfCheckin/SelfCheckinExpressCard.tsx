/**
 * SelfCheckinExpressCard.tsx
 * (DOMAIN: PORTAL & SELF-CHECKIN KIOSK)
 *
 * Express check-in card with:
 * - 1-Touch physiological norm check-in button
 * - 4-digit PIN display and tactile numeric keypad
 * - Primary confirmation CTA & QR-code bypass button
 */

import React, { memo } from "react";
import { CheckCircle2, Ticket } from "lucide-react";
import type { KioskSelectionMode } from "./SelfCheckinKioskModeTiles";
import { SelfCheckinNumericKeypad } from "./SelfCheckinNumericKeypad";
import { SelfCheckinPhoneInput } from "./SelfCheckinPhoneInput";

export interface SelfCheckinExpressCardProps {
	readonly patientName: string;
	readonly setPatientName?: ((name: string) => void) | undefined;
	readonly phoneDigits: string;
	readonly setPhoneDigits: (digits: string) => void;
	readonly setAuthError: (err: string | null) => void;
	readonly isSubmitting: boolean;
	readonly activeMode: KioskSelectionMode;
	readonly onApplyPhysiologicalNorm: () => void;
	readonly onOneTouchCheckin: () => void;
	readonly onDigitPress: (digit: string) => void;
	readonly onBackspace: () => void;
	readonly onClear: () => void;
}

export const SelfCheckinExpressCard: React.FC<SelfCheckinExpressCardProps> = memo(({
	patientName,
	setPatientName,
	phoneDigits,
	setPhoneDigits,
	setAuthError,
	isSubmitting,
	activeMode,
	onApplyPhysiologicalNorm,
	onOneTouchCheckin,
	onDigitPress,
	onBackspace,
	onClear,
}) => {
	const handleExpressNormClick = () => {
		if (activeMode !== "first_time" && !patientName && phoneDigits.length < 4) {
			setAuthError("Пожалуйста, введите 4 последние цифры номера мобильного телефона на клавиатуре ниже.");
			return;
		}
		if (activeMode === "first_time" && phoneDigits.length < 4) {
			setAuthError("Пожалуйста, введите номер телефона для первичной регистрации талона.");
			return;
		}
		onApplyPhysiologicalNorm();
		onOneTouchCheckin();
	};

	const handleConfirmArrival = () => {
		if (phoneDigits.length < 4) {
			setAuthError(
				activeMode === "first_time"
					? "Пожалуйста, введите номер телефона для регистрации первичного визита."
					: "Пожалуйста, введите 4 последние цифры номера мобильного телефона.",
			);
			return;
		}
		onOneTouchCheckin();
	};

	return (
		<div
			style={{
				padding: "12px 14px",
				borderRadius: "16px",
				border: "1px solid var(--line)",
				backgroundColor: "var(--paper-soft, var(--paper))",
				marginBottom: "10px",
			}}
		>
			{/* 1-Touch Express Norm Button */}
			<button
				type="button"
				className="selfcheckin-btn-kiosk-express"
				style={{
					width: "100%",
					padding: "14px 16px",
					minHeight: "54px",
					fontSize: "15px",
					fontWeight: 700,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: "12px",
					borderRadius: "12px",
					border: "1.5px solid var(--teal)",
					backgroundColor: "var(--teal-soft, rgba(13, 148, 136, 0.1))",
					color: "var(--teal)",
					cursor: "pointer",
					marginBottom: "10px",
				}}
				onClick={handleExpressNormClick}
				data-testid="kiosk-express-norm-btn"
				title="Мгновенный самочекин: соматическая норма + получение талона очереди"
			>
				<CheckCircle2 size={24} style={{ flexShrink: 0 }} />
				<div style={{ textAlign: "left" }}>
					<span style={{ display: "block", fontWeight: 800, fontSize: "15px" }}>
						✓ Чувствую себя хорошо / Соматическая норма
					</span>
					<span style={{ display: "block", fontSize: "12px", opacity: 0.85, fontWeight: 500 }}>
						Экспресс-чекин и получение талона очереди
					</span>
				</div>
			</button>

			{/* First-time patient name input */}
			{activeMode === "first_time" && (
				<div style={{ marginBottom: "12px" }}>
					<label
						htmlFor="kiosk-first-time-fullname"
						style={{
							display: "block",
							fontSize: "12px",
							fontWeight: 700,
							color: "var(--muted)",
							textTransform: "uppercase",
							letterSpacing: "0.08em",
							marginBottom: "6px",
							textAlign: "center",
						}}
					>
						Ваше ФИО (для оформления первичного талона)
					</label>
					<input
						id="kiosk-first-time-fullname"
						type="text"
						value={patientName}
						onChange={(e) => {
							setPatientName?.(e.target.value);
							setAuthError(null);
						}}
						placeholder="Фамилия Имя Отчество"
						data-testid="kiosk-first-time-name-input"
						style={{
							width: "100%",
							height: "44px",
							borderRadius: "12px",
							border: "1px solid var(--line)",
							backgroundColor: "var(--paper-card, var(--paper))",
							padding: "0 14px",
							fontSize: "15px",
							color: "var(--ink)",
							textAlign: "center",
							fontWeight: 600,
							outline: "none",
						}}
					/>
				</div>
			)}

			{/* 4-Digit Display Input Component */}
			<SelfCheckinPhoneInput
				phoneDigits={phoneDigits}
				onChange={(val) => {
					setPhoneDigits(val);
					setAuthError(null);
				}}
				mode="four_digits"
				titleLabel={activeMode === "first_time" ? "Номер телефона для оформления" : "Введите 4 последние цифры номера телефона"}
			/>

			{/* Reusable Tactile Keypad */}
			<SelfCheckinNumericKeypad
				onDigitPress={onDigitPress}
				onBackspace={onBackspace}
				onClear={onClear}
			/>

			{/* Primary Confirmation CTA Button */}
			<button
				type="button"
				className="selfcheckin-btn-primary"
				style={{
					width: "100%",
					minHeight: "52px",
					fontSize: "15px",
					fontWeight: 800,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: "10px",
					borderRadius: "12px",
					backgroundColor: "var(--teal)",
					color: "var(--on-teal, var(--paper))",
					border: "none",
					cursor: "pointer",
				}}
				onClick={handleConfirmArrival}
				title={
					isSubmitting
						? "Регистрация прибытия в клинику..."
						: phoneDigits.length < 4
							? "Введите 4 последние цифры номера телефона для подтверждения прибытия"
							: "Подтвердить прибытие в клинику и получить талон"
				}
				data-testid="one-touch-checkin-btn"
			>
				<CheckCircle2 size={20} />
				<span>
					{isSubmitting ? "Регистрация прибытия..." : "Я в клинике — Получить талон"}
				</span>
			</button>

			{/* QR-code check-in button */}
			<button
				type="button"
				style={{
					width: "100%",
					padding: "10px",
					marginTop: "8px",
					fontSize: "13px",
					fontWeight: 600,
					color: "var(--teal)",
					backgroundColor: "transparent",
					border: "none",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: "6px",
					cursor: "pointer",
				}}
				onClick={onOneTouchCheckin}
				title="Быстрый чекин по персональному QR-коду"
				data-testid="qr-checkin-btn"
			>
				<Ticket size={16} />
				<span>Быстрый чекин по QR-коду из приглашения</span>
			</button>
		</div>
	);
});

SelfCheckinExpressCard.displayName = "SelfCheckinExpressCard";
