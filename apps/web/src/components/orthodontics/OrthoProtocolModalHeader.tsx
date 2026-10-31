/**
 * @dental/web/components/orthodontics/OrthoProtocolModalHeader.tsx
 * Шапка ортодонтического протокола с чистым доменным языком (Мандат 8x).
 */

import React from "react";

export interface OrthoProtocolModalHeaderProps {
	readonly title?: string;
	readonly patientName?: string;
}

export const OrthoProtocolModalHeader: React.FC<OrthoProtocolModalHeaderProps> = ({
	title = "Дневник приёма",
	patientName,
}) => {
	return (
		<div className="flex items-center justify-between p-3 border-b border-[var(--line)]">
			<h3 className="text-sm font-bold text-[var(--ink)]">{title}</h3>
			{patientName && <span className="text-xs text-[var(--ink-muted)]">{patientName}</span>}
		</div>
	);
};

export default OrthoProtocolModalHeader;
