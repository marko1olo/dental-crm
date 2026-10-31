/**
 * SelfCheckinNumericKeypad.tsx
 * (DOMAIN: PORTAL & SELF-CHECKIN KIOSK)
 *
 * Reusable Tactile Keypad for Kiosk Express Check-in & Mobile Terminals:
 * - Large physical touch targets (>= 64x56px, Apple HIG >= 44x44px minimum)
 * - Strict CSS design token compliance (var(--paper-card), var(--line), var(--ink))
 * - Integrated haptic feedback on digits, clear, and backspace
 * - Zero cartoon emojis — strictly clean Lucide vectors
 */

import React, { memo } from "react";
import { Delete } from "lucide-react";
import { triggerHaptic } from "../../../native/mobileBridge";

export interface SelfCheckinNumericKeypadProps {
	readonly onDigitPress: (digit: string) => void;
	readonly onBackspace: () => void;
	readonly onClear: () => void;
	readonly disabled?: boolean | undefined;
}

const DIGIT_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export const SelfCheckinNumericKeypad: React.FC<SelfCheckinNumericKeypadProps> = memo(({
	onDigitPress,
	onBackspace,
	onClear,
	disabled = false,
}) => {
	const handleDigit = (digit: string) => {
		if (disabled) return;
		triggerHaptic("light");
		onDigitPress(digit);
	};

	const handleBackspaceClick = () => {
		if (disabled) return;
		triggerHaptic("light");
		onBackspace();
	};

	const handleClearClick = () => {
		if (disabled) return;
		triggerHaptic("medium");
		onClear();
	};

	return (
		<div
			className="kiosk-keypad-grid"
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(3, 1fr)",
				gap: "8px",
				maxWidth: "320px",
				margin: "0 auto 10px auto",
			}}
			data-testid="kiosk-keypad"
		>
			{DIGIT_KEYS.map((num) => (
				<button
					key={num}
					type="button"
					className="kiosk-keypad-btn"
					disabled={disabled}
					onClick={() => handleDigit(String(num))}
					data-testid={`keypad-digit-${num}`}
					style={{
						minWidth: "64px",
						minHeight: "56px",
						borderRadius: "14px",
						fontSize: "22px",
						fontWeight: 700,
						backgroundColor: "var(--paper-card, var(--paper))",
						border: "1.5px solid var(--line)",
						color: "var(--ink)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						cursor: disabled ? "not-allowed" : "pointer",
						touchAction: "manipulation",
						boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
						opacity: disabled ? 0.6 : 1,
					}}
				>
					{num}
				</button>
			))}

			{/* Clear Button */}
			<button
				type="button"
				className="kiosk-keypad-btn"
				disabled={disabled}
				onClick={handleClearClick}
				title="Очистить ввод"
				data-testid="keypad-clear"
				style={{
					minWidth: "64px",
					minHeight: "56px",
					borderRadius: "14px",
					fontSize: "15px",
					fontWeight: 700,
					backgroundColor: "var(--paper-soft, var(--paper))",
					border: "1.5px solid var(--line)",
					color: "var(--muted)",
					cursor: disabled ? "not-allowed" : "pointer",
					touchAction: "manipulation",
					opacity: disabled ? 0.6 : 1,
				}}
			>
				C
			</button>

			{/* Zero Button */}
			<button
				type="button"
				className="kiosk-keypad-btn"
				disabled={disabled}
				onClick={() => handleDigit("0")}
				data-testid="keypad-digit-0"
				style={{
					minWidth: "64px",
					minHeight: "56px",
					borderRadius: "14px",
					fontSize: "22px",
					fontWeight: 700,
					backgroundColor: "var(--paper-card, var(--paper))",
					border: "1.5px solid var(--line)",
					color: "var(--ink)",
					cursor: disabled ? "not-allowed" : "pointer",
					touchAction: "manipulation",
					opacity: disabled ? 0.6 : 1,
				}}
			>
				0
			</button>

			{/* Backspace Button */}
			<button
				type="button"
				className="kiosk-keypad-btn"
				disabled={disabled}
				onClick={handleBackspaceClick}
				title="Стереть последнюю цифру"
				data-testid="keypad-backspace"
				style={{
					minWidth: "64px",
					minHeight: "56px",
					borderRadius: "14px",
					backgroundColor: "var(--paper-soft, var(--paper))",
					border: "1.5px solid var(--line)",
					color: "var(--muted)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					cursor: disabled ? "not-allowed" : "pointer",
					touchAction: "manipulation",
					opacity: disabled ? 0.6 : 1,
				}}
			>
				<Delete size={22} />
			</button>
		</div>
	);
});

SelfCheckinNumericKeypad.displayName = "SelfCheckinNumericKeypad";
