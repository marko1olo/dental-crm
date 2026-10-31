/**
 * SelfCheckinPhoneAuthSection.tsx
 * (DOMAIN: PORTAL & SELF-CHECKIN KIOSK)
 *
 * Facade Section for Kiosk Phone Check-in & Mode Selection:
 * - 3 high-contrast kiosk mode tiles (scheduled, first_time, emergency)
 * - Sweet Spot architecture (140-190 lines) matching Mandate 8b
 * - 1-Touch Kiosk Express check-in with physiological norm (Mandate 8e)
 * - Tactile keypad and high-contrast PIN display
 */

import React, { memo, useState } from "react";
import { SelfCheckinEmergencyCard } from "./SelfCheckinEmergencyCard";
import { SelfCheckinExpressCard } from "./SelfCheckinExpressCard";
import { type KioskSelectionMode, SelfCheckinKioskModeTiles } from "./SelfCheckinKioskModeTiles";
import { SelfCheckinOptionalDocs } from "./SelfCheckinOptionalDocs";
import { SelfCheckinWelcomeCard } from "./SelfCheckinWelcomeCard";

export type { KioskSelectionMode } from "./SelfCheckinKioskModeTiles";

export interface SelfCheckinPhoneAuthSectionProps {
	readonly patientName: string;
	readonly appointmentTime: string;
	readonly doctorName: string;
	readonly phoneDigits: string;
	readonly setPhoneDigits: (digits: string) => void;
	readonly showOptionalDocs: boolean;
	readonly setShowOptionalDocs: (show: boolean) => void;
	readonly authError: string | null;
	readonly setAuthError: (err: string | null) => void;
	readonly isSubmitting: boolean;
	readonly onApplyPhysiologicalNorm: () => void;
	readonly onOneTouchCheckin: () => void;
	readonly onEmergencyCheckin?: (() => void) | undefined;
	readonly onGoToConsents: () => void;
	readonly onGoToSomatic: () => void;
}

export const SelfCheckinPhoneAuthSection: React.FC<SelfCheckinPhoneAuthSectionProps> = memo(({
	patientName,
	appointmentTime,
	doctorName,
	phoneDigits,
	setPhoneDigits,
	showOptionalDocs,
	setShowOptionalDocs,
	authError,
	setAuthError,
	isSubmitting,
	onApplyPhysiologicalNorm,
	onOneTouchCheckin,
	onEmergencyCheckin,
	onGoToConsents,
	onGoToSomatic,
}) => {
	const [activeMode, setActiveMode] = useState<KioskSelectionMode>("scheduled");

	const handleDigitPress = (digit: string) => {
		if (phoneDigits.length < 4) {
			setPhoneDigits(phoneDigits + digit);
			setAuthError(null);
		}
	};

	const handleBackspace = () => {
		setPhoneDigits(phoneDigits.slice(0, -1));
		setAuthError(null);
	};

	const handleClear = () => {
		setPhoneDigits("");
		setAuthError(null);
	};

	return (
		<div className="selfcheckin-step-box">
			{/* Reception Welcome Banner */}
			<SelfCheckinWelcomeCard
				patientName={patientName}
				appointmentTime={appointmentTime}
				doctorName={doctorName}
			/>

			{/* 3 High-Contrast Kiosk Mode Selection Tiles */}
			<SelfCheckinKioskModeTiles
				activeMode={activeMode}
				onSelectMode={(mode) => {
					setActiveMode(mode);
					setAuthError(null);
				}}
			/>

			{/* Mode-specific content */}
			{activeMode === "emergency" ? (
				<SelfCheckinEmergencyCard
					onEmergencyCheckin={onEmergencyCheckin}
					onApplyPhysiologicalNorm={onApplyPhysiologicalNorm}
					onOneTouchCheckin={onOneTouchCheckin}
				/>
			) : (
				<SelfCheckinExpressCard
					patientName={patientName}
					phoneDigits={phoneDigits}
					setPhoneDigits={setPhoneDigits}
					setAuthError={setAuthError}
					isSubmitting={isSubmitting}
					activeMode={activeMode}
					onApplyPhysiologicalNorm={onApplyPhysiologicalNorm}
					onOneTouchCheckin={onOneTouchCheckin}
					onDigitPress={handleDigitPress}
					onBackspace={handleBackspace}
					onClear={handleClear}
				/>
			)}

			{/* Optional Docs & Somatic Profile Section */}
			<SelfCheckinOptionalDocs
				showOptionalDocs={showOptionalDocs}
				setShowOptionalDocs={setShowOptionalDocs}
				onGoToConsents={onGoToConsents}
				onGoToSomatic={onGoToSomatic}
				onApplyPhysiologicalNorm={onApplyPhysiologicalNorm}
			/>

			{/* Error Alert */}
			{authError && (
				<div className="selfcheckin-error-alert" style={{ marginTop: "10px" }}>{authError}</div>
			)}
		</div>
	);
});

SelfCheckinPhoneAuthSection.displayName = "SelfCheckinPhoneAuthSection";
