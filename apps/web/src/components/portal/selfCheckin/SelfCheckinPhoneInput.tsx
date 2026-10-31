/**
 * SelfCheckinPhoneInput.tsx
 * (DOMAIN: PORTAL & SELF-CHECKIN KIOSK)
 *
 * Touchscreen Phone Number Input Display:
 * - High-contrast 4-digit PIN-style box display for kiosk readability
 * - Hidden native input for physical barcode scanners, magnetic cards, and physical keyboards
 * - 0px horizontal overflow, full touch target accessibility
 * - Support for quick clear and paste
 */

import React, { memo } from "react";
import { XCircle } from "lucide-react";

export interface SelfCheckinPhoneInputProps {
	readonly phoneDigits: string;
	readonly onChange: (value: string) => void;
	readonly mode?: "four_digits" | "full_phone" | undefined;
	readonly titleLabel?: string | undefined;
	readonly disabled?: boolean | undefined;
}

export const SelfCheckinPhoneInput: React.FC<SelfCheckinPhoneInputProps> = memo(({
	phoneDigits,
	onChange,
	mode = "four_digits",
	titleLabel,
	disabled = false,
}) => {
	const maxLen = mode === "four_digits" ? 4 : 11;

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const rawDigits = e.target.value.replace(/\D/g, "").slice(0, maxLen);
		onChange(rawDigits);
	};

	const handleClear = () => {
		if (disabled) return;
		onChange("");
	};

	const defaultLabel =
		mode === "four_digits"
			? "Введите 4 последние цифры номера телефона"
			: "Номер телефона для оформления";

	return (
		<div className="selfcheckin-phone-input-container" style={{ width: "100%", marginBottom: "10px" }}>
			<div
				style={{
					textAlign: "center",
					fontSize: "12px",
					fontWeight: 700,
					color: "var(--muted)",
					textTransform: "uppercase",
					letterSpacing: "0.08em",
					marginBottom: "6px",
				}}
			>
				{titleLabel || defaultLabel}
			</div>

			{/* 4-Digit Display Box */}
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					gap: "10px",
					marginBottom: "8px",
					position: "relative",
				}}
				data-testid="kiosk-digits-display"
			>
				{[0, 1, 2, 3].map((idx) => {
					const digit = phoneDigits[idx];
					return (
						<div
							key={idx}
							style={{
								width: "56px",
								height: "58px",
								borderRadius: "12px",
								border: digit ? "2px solid var(--teal)" : "2px dashed var(--line)",
								backgroundColor: digit
									? "var(--teal-soft, rgba(13, 148, 136, 0.1))"
									: "var(--paper-card, var(--paper))",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "26px",
								fontWeight: 800,
								color: "var(--ink)",
								boxShadow: digit ? "0 0 0 2px var(--teal-soft)" : "none",
								transition: "all 0.15s ease",
							}}
						>
							{digit || "•"}
						</div>
					);
				})}

				{/* Quick Clear Button when digits exist */}
				{phoneDigits.length > 0 && !disabled && (
					<button
						type="button"
						onClick={handleClear}
						title="Очистить номер"
						style={{
							position: "absolute",
							right: "8px",
							top: "50%",
							transform: "translateY(-50%)",
							background: "none",
							border: "none",
							padding: "6px",
							color: "var(--muted)",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							touchAction: "manipulation",
						}}
					>
						<XCircle size={18} />
					</button>
				)}
			</div>

			{/* Hidden native input for hardware barcode/magnetic/keyboard input */}
			<input
				type="text"
				value={phoneDigits}
				onChange={handleInputChange}
				disabled={disabled}
				style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1 }}
				data-testid="one-touch-phone-input"
				maxLength={maxLen}
				autoComplete="off"
				inputMode="numeric"
			/>
		</div>
	);
});

SelfCheckinPhoneInput.displayName = "SelfCheckinPhoneInput";
