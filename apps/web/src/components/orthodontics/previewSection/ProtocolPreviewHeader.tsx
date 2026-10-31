/**
 * @dental/web/components/orthodontics/previewSection/ProtocolPreviewHeader.tsx
 * Заголовок предпросмотра дневника приёма (Мандат 8x).
 */

import React from "react";

export const ProtocolPreviewHeader: React.FC = () => {
	return (
		<div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
			<span className="text-xs font-bold text-[var(--ink)]">Дневник приёма</span>
		</div>
	);
};

export default ProtocolPreviewHeader;
