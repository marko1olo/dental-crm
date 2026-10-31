/**
 * MobileCheckinHeader.tsx
 * (DOMAIN: PORTAL & SELF-CHECKIN KIOSK)
 *
 * Dedicated Modal Header & Step Navigation Bar:
 * - High-contrast clinic badge & dynamic step title
 * - Apple HIG touch target (48x48px) close button
 * - Tactile steps progress bar (1. Экспресс-чекин / 2. Талон на приём)
 */

import React, { memo } from "react";
import { X } from "lucide-react";
import type { CheckinStep } from "./MobileSelfCheckinModal";

export interface MobileCheckinHeaderProps {
	readonly clinicName: string;
	readonly step: CheckinStep;
	readonly onClose: () => void;
}

export const MobileCheckinHeader: React.FC<MobileCheckinHeaderProps> = memo(({
	clinicName,
	step,
	onClose,
}) => {
	const getStepTitle = () => {
		switch (step) {
			case "phone_auth":
				return "Вход и самочекин";
			case "consents":
				return "Электронная подпись согласий";
			case "somatic":
				return "Анкета здоровья и рисков";
			case "completed":
				return "Чекин успешно пройден!";
			default:
				return "Экспресс-регистрация приёма";
		}
	};

	return (
		<>
			{/* Top Bar Header */}
			<header className="selfcheckin-header">
				<div className="selfcheckin-header-left">
					<div className="selfcheckin-clinic-badge">
						<span className="selfcheckin-clinic-dot" />
						<span>{clinicName}</span>
					</div>
					<h2 className="selfcheckin-title">{getStepTitle()}</h2>
				</div>
				<button
					type="button"
					className="selfcheckin-close-btn"
					onClick={onClose}
					aria-label="Закрыть окно самочекина"
				>
					<X size={20} />
				</button>
			</header>

			{/* Steps Progress Indicator */}
			<div className="selfcheckin-steps-bar">
				<div
					className={`selfcheckin-step-pill ${
						step === "phone_auth" ? "active" : "done"
					}`}
				>
					1. Экспресс-чекин
				</div>
				<div
					className={`selfcheckin-step-pill ${
						step === "completed" ? "active" : ""
					}`}
				>
					2. Талон на приём
				</div>
			</div>
		</>
	);
});

MobileCheckinHeader.displayName = "MobileCheckinHeader";
