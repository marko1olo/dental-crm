import React from "react";
import { BactericidalFleetCard } from "./bactericidal/BactericidalFleetCard";

export interface BactericidalFleetGridProps {
	readonly equipments: any[];
	readonly onPreShift30Min: (id: string) => void;
	readonly onReplaceLamps: (id: string, brand: string) => void;
	readonly submitting: boolean;
}

export function BactericidalFleetGrid({
	equipments,
	onPreShift30Min,
	onReplaceLamps,
	submitting,
}: BactericidalFleetGridProps) {
	return (
		<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
			{equipments.map((eq) => (
				<BactericidalFleetCard
					key={eq.id}
					eq={eq}
					onPreShift30Min={onPreShift30Min}
					onReplaceLamps={onReplaceLamps}
					submitting={submitting}
				/>
			))}
		</div>
	);
}

export { BactericidalFleetCard } from "./bactericidal/BactericidalFleetCard";
