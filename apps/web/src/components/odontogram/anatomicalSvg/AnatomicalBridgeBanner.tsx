/**
 * DENTE Dental CRM — Anatomical Bridge Spans Banner
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import { Sparkles } from "lucide-react";
import type { BridgeSpanInfo } from "../anatomicalToothGeometries";

export interface AnatomicalBridgeBannerProps {
	allBridgeSpans: readonly BridgeSpanInfo[];
}

export const AnatomicalBridgeBanner: React.FC<AnatomicalBridgeBannerProps> = ({ allBridgeSpans }) => {
	if (allBridgeSpans.length === 0) return null;

	return (
		<div
			className="odontogram-bridge-spans-banner flex flex-wrap items-center gap-2 px-3 py-1.5 my-2 rounded-xl bg-blue-500/10 dark:bg-blue-950/40 border border-blue-500/30 text-xs text-blue-900 dark:text-blue-200"
			data-testid="bridge-spans-banner"
		>
			<Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
			<span className="font-bold">Мостовидные протезы ({allBridgeSpans.length}):</span>
			{allBridgeSpans.map((span) => (
				<span
					key={span.id}
					className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-800 dark:text-blue-300 font-mono text-[11px] font-bold"
				>
					<span>{span.startTooth} (опора)</span>
					<span className="text-blue-500 font-normal">━━</span>
					<span className="text-blue-600 dark:text-blue-400 font-black">{span.pontics.join(", ")} (тело)</span>
					<span className="text-blue-500 font-normal">━━</span>
					<span>{span.endTooth} (опора)</span>
					<span className="text-[10px] text-blue-600/70 dark:text-blue-400/70 uppercase font-sans">• {span.material}</span>
				</span>
			))}
		</div>
	);
};
