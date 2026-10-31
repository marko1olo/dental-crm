/**
 * @dental/web/components/orthodontics/OrthoProtocolPreviewSection.tsx
 * Предпросмотр протокола приёма без советского канцелярита (Мандат 8x).
 */

import React from "react";

export interface OrthoProtocolPreviewSectionProps {
	readonly soapText?: string;
}

export const OrthoProtocolPreviewSection: React.FC<OrthoProtocolPreviewSectionProps> = ({
	soapText = "",
}) => {
	return (
		<div className="flex flex-col gap-2 p-3 bg-[var(--paper)] rounded-xl border border-[var(--line)]">
			<span className="text-xs font-semibold text-[var(--ink)]">Дневник приёма</span>
			<pre className="text-xs font-mono text-[var(--ink-muted)] whitespace-pre-wrap">{soapText}</pre>
		</div>
	);
};

export default OrthoProtocolPreviewSection;
