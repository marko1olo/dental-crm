import React from "react";
import { Sparkles } from "lucide-react";
import { RADIOLOGY_STANDARD_PROTOCOLS, type RadiologyProtocolPreset } from "../radiologyProtocols.js";

export interface RadiologyProtocolsBarProps {
	onInsertProtocol: (preset: RadiologyProtocolPreset) => void;
}

export function RadiologyProtocolsBar({ onInsertProtocol }: RadiologyProtocolsBarProps) {
	return (
		<div className="flex items-center justify-between gap-3 px-5 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)]/60 text-xs">
			<div className="flex items-center gap-2">
				<Sparkles className="w-4 h-4 text-[var(--teal)] shrink-0" />
				<span className="font-bold text-[var(--muted)]">Протокол в карту:</span>
				<div className="dente-filter-chips overflow-x-auto">
					{RADIOLOGY_STANDARD_PROTOCOLS.map((proto) => (
						<button
							key={proto.id}
							type="button"
							onClick={() => onInsertProtocol(proto)}
							className="dente-filter-chip"
							data-testid={`btn-protocol-${proto.id}`}
							title={proto.text}
						>
							{proto.shortLabel}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
