import React from "react";

/**
 * Clinical Tooth Icon (Molar crown and roots).
 * Designed for DENTE Dental CRM schedule cards and treatment plans.
 * Styled consistently with Lucide 24x24 vector icon standards.
 */
export function DentalToothIcon({
	size = 12,
	className = "",
}: {
	size?: number;
	className?: string;
}) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden="true"
			data-testid="dental-tooth-icon"
		>
			<path d="M7 3C4.5 3 3 5 3 8c0 4 2 8 3 13 0 .5.5 1 1 1h1c.6 0 1-.5 1-1 0-3 1-5 3-5s3 2 3 5c0 .5.4 1 1 1h1c.5 0 1-.5 1-1 1-5 3-9 3-13 0-3-1.5-5-4-5-2 0-3 1.5-5 1.5S9 3 7 3z" />
		</svg>
	);
}
