/**
 * apps/web/src/components/billing/sbp/SbpQrUnderplate.tsx
 *
 * Camera underplate with 8px padding and high contrast vector SVG render.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";

interface SbpQrUnderplateProps {
	readonly svg: string;
}

export const SbpQrUnderplate: React.FC<SbpQrUnderplateProps> = ({ svg }) => {
	return (
		<div
			className="relative shrink-0 rounded-xl bg-white p-2 border border-slate-300 dark:border-slate-700 shadow-sm flex items-center justify-center"
			style={{ width: "176px", height: "176px" }}
			data-testid="sbp-qr-camera-underplate"
		>
			<div
				className="w-[160px] h-[160px] flex items-center justify-center overflow-hidden"
				dangerouslySetInnerHTML={{ __html: svg }}
				data-testid="sbp-qr-svg-canvas"
			/>
		</div>
	);
};
