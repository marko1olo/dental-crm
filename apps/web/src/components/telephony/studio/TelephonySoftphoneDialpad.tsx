/**
 * apps/web/src/components/telephony/studio/TelephonySoftphoneDialpad.tsx
 *
 * DENTE Dental CRM — Telephony Studio Softphone Touch Dialpad.
 * Mandates: Apple Phone HIG (Touch Targets >= 48px), Natural Thumb Zone, Safe Web Audio.
 */

import React, { useCallback } from "react";
import { Delete } from "lucide-react";
import {
	DIALPAD_KEYS,
	formatPhoneRu,
	playSafeWebAudioTone,
} from "../telephonyCatalogData";

export interface TelephonySoftphoneDialpadProps {
	dialedNumber: string;
	onDigitClick: (digit: string) => void;
	onBackspace: () => void;
}

export const TelephonySoftphoneDialpad: React.FC<TelephonySoftphoneDialpadProps> = ({
	dialedNumber,
	onDigitClick,
	onBackspace,
}) => {
	const handlePress = useCallback(
		(digit: string) => {
			playSafeWebAudioTone(600, 100);
			onDigitClick(digit);
		},
		[onDigitClick],
	);

	return (
		<div className="bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl p-3 sm:p-4 shadow-xs">
			<div className="flex items-center justify-between mb-3 px-1">
				<span className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
					Быстрый набор
				</span>
				<div className="flex items-center gap-2">
					<input
						type="text"
						readOnly
						value={dialedNumber ? formatPhoneRu(dialedNumber) : ""}
						placeholder="Номер абонента..."
						data-testid="telephony-dialed-display"
						className="text-right font-mono text-sm sm:text-base font-semibold bg-transparent text-[var(--ink)] outline-hidden w-44"
					/>
					{dialedNumber && (
						<button
							type="button"
							onClick={onBackspace}
							aria-label="Стереть"
							className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
						>
							<Delete className="w-4 h-4" />
						</button>
					)}
				</div>
			</div>

			{/* Dialpad Grid: 3x4 (Apple Phone layout) */}
			<div className="dnt-telephony-dialpad-grid">
				{DIALPAD_KEYS.map((k) => (
					<button
						key={k.digit}
						type="button"
						onClick={() => handlePress(k.digit)}
						data-testid={`dialpad-key-${k.digit}`}
						className="dnt-telephony-dialpad-btn"
					>
						<span className="dnt-telephony-dialpad-digit">{k.digit}</span>
						{k.sub && (
							<span className="dnt-telephony-dialpad-sub">{k.sub}</span>
						)}
					</button>
				))}
			</div>
		</div>
	);
};

export default TelephonySoftphoneDialpad;
