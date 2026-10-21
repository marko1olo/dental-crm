import React from "react";
import { GOST_TOOTH_STATES } from "./classicGostTypes";

export const ClassicGostLegend: React.FC = () => {
	return (
		<div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-[var(--odontogram-border-subtle)] text-xs font-semibold">
			<span className="font-semibold text-[var(--odontogram-ink-muted)] mr-1">
				Обозначения:
			</span>
			{Object.entries(GOST_TOOTH_STATES).map(([stateKey, meta]) => (
				<span
					key={stateKey}
					className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)]"
				>
					<strong className={`font-black ${meta.colorClass}`}>
						{meta.abbr}
					</strong>
					<span className="text-[var(--odontogram-ink)] font-medium">
						{meta.nameRu}
					</span>
				</span>
			))}
		</div>
	);
};
