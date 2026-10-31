/**
 * SelfCheckinWelcomeCard.tsx
 * (DOMAIN: PORTAL & SELF-CHECKIN KIOSK)
 *
 * Patient Welcome Banner for Kiosk Screen:
 * - Formats patient name respectfully
 * - Displays doctor name & appointment time
 */

import React, { memo } from "react";
import { CheckCircle2 } from "lucide-react";

export interface SelfCheckinWelcomeCardProps {
	readonly patientName: string;
	readonly appointmentTime: string;
	readonly doctorName: string;
}

export const SelfCheckinWelcomeCard: React.FC<SelfCheckinWelcomeCardProps> = memo(({
	patientName,
	appointmentTime,
	doctorName,
}) => {
	const formatPatientDisplayName = (raw: string) => {
		const parts = raw.trim().split(/\s+/);
		if (parts.length === 1) return parts[0];
		if (parts.length === 2) return `${parts[0]} ${parts[1]?.charAt(0)}.`;
		return `${parts[1] || parts[0]} ${parts[0]?.charAt(0)}.${parts[2] ? ` ${parts[2].charAt(0)}.` : ""}`;
	};

	return (
		<div className="selfcheckin-welcome-card">
			<span className="selfcheckin-welcome-icon">
				<CheckCircle2 size={28} className="text-teal-600" />
			</span>
			<div>
				<div
					className="selfcheckin-welcome-name"
					title={patientName ? `Пациент: ${patientName}` : undefined}
					data-patient-name={patientName}
				>
					{patientName ? (
						<>
							<span>Здравствуйте, </span>
							<strong className="text-teal-700 dark:text-teal-300">
								{formatPatientDisplayName(patientName)}
							</strong>
							<span>!</span>
						</>
					) : (
						"Добро пожаловать в клинику!"
					)}
				</div>
				<div className="selfcheckin-welcome-sub">
					{appointmentTime && doctorName ? (
						<>
							Ваш прием: <strong>{appointmentTime}</strong> у <strong>{doctorName}</strong>.
						</>
					) : appointmentTime ? (
						<>Ваш прием: <strong>{appointmentTime}</strong>.</>
					) : doctorName ? (
						<>Прием у врача: <strong>{doctorName}</strong>.</>
					) : (
						"Выберите цель визита на сенсорном терминале самообслуживания."
					)}
				</div>
			</div>
		</div>
	);
});

SelfCheckinWelcomeCard.displayName = "SelfCheckinWelcomeCard";
