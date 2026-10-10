/**
 * @file TelephonyDialpad.tsx
 * @description Layer 4: Presentation subcomponent for touch numeric dialpad.
 * Strict ergonomic minimum: touch target >= 44x44px, non-blocking call button.
 */

import { Delete, PhoneCall } from "lucide-react";
import React from "react";
import type { TelephonyDialpadProps } from "./types";

export function TelephonyDialpad({
	dialNumber,
	onDialNumberChange,
	onDialDigit,
	onDialBackspace,
	onStartOutgoingCall,
	dialInputRef,
}: TelephonyDialpadProps) {
	const keypadKeys = [
		{ d: "1", sub: "" },
		{ d: "2", sub: "АБВГ" },
		{ d: "3", sub: "ДЕЖЗ" },
		{ d: "4", sub: "ИЙКЛ" },
		{ d: "5", sub: "МНОП" },
		{ d: "6", sub: "РСТУ" },
		{ d: "7", sub: "ФХЦЧ" },
		{ d: "8", sub: "ШЩЪЫ" },
		{ d: "9", sub: "ЬЭЮЯ" },
		{ d: "*", sub: "" },
		{ d: "0", sub: "+" },
		{ d: "#", sub: "" },
	];

	return (
		<div className="space-y-3" data-testid="telephony-dialpad-view">
			{/* Number Display Input */}
			<div className="dnt-dialpad-input-box">
				<input
					ref={dialInputRef}
					type="text"
					value={dialNumber}
					onChange={(e) => onDialNumberChange(e.target.value)}
					placeholder="+7 (___) ___-__-__"
					className="dnt-dialpad-input"
					aria-label="Номер телефона для набора"
				/>
				{dialNumber && (
					<button
						type="button"
						onClick={onDialBackspace}
						className="dnt-btn-icon"
						aria-label="Стереть цифру"
						title="Стереть последнюю цифру"
					>
						<Delete size={16} />
					</button>
				)}
			</div>

			{/* Numeric Keypad (48px min touch target per key) */}
			<div className="dnt-dialpad-grid">
				{keypadKeys.map((k) => (
					<button
						key={k.d}
						type="button"
						onClick={() => onDialDigit(k.d)}
						className="dnt-dialpad-key"
						aria-label={`Цифра ${k.d}`}
					>
						<span className="dnt-dialpad-key-digit">{k.d}</span>
						{k.sub && <span className="dnt-dialpad-key-sub">{k.sub}</span>}
					</button>
				))}
			</div>

			{/* Outgoing Call Button >= 48x48px (Strictly never disabled per Mandate 8e) */}
			<button
				type="button"
				onClick={onStartOutgoingCall}
				className="dnt-cta-primary w-full dnt-dialpad-call-btn"
				aria-label="Совершить исходящий вызов"
				data-testid="btn-start-outgoing-call"
			>
				<PhoneCall size={16} />
				<span>Позвонить</span>
			</button>
		</div>
	);
}
