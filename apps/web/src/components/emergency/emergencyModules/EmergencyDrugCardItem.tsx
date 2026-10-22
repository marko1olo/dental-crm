/**
 * Emergency Drug Card Item (Layer 4)
 * Single medication card for emergency dosage grid.
 */

import React from 'react';

interface EmergencyDrugCardItemProps {
	name: string;
	priorityBadge: string;
	priorityClass?: string;
	isPrimary?: boolean;
	doseVal: string;
	doseSub?: string;
	route: string;
	note: string;
}

export function EmergencyDrugCardItem({
	name,
	priorityBadge,
	priorityClass = 'second-line',
	isPrimary = false,
	doseVal,
	doseSub,
	route,
	note,
}: EmergencyDrugCardItemProps) {
	return (
		<div className={`emergency-drug-card ${isPrimary ? 'primary' : ''}`}>
			<div className="emergency-drug-card-header">
				<div className="emergency-drug-name">
					<span>{name}</span>
				</div>
				<span className={`emergency-drug-priority-badge ${priorityClass}`}>
					{priorityBadge}
				</span>
			</div>
			<div className="emergency-drug-dose-highlight">
				<span className="emergency-drug-dose-val">{doseVal}</span>
				{doseSub && <span className="emergency-drug-dose-sub">{doseSub}</span>}
			</div>
			<div className="emergency-drug-route">
				<span>{route}</span>
			</div>
			<div className="emergency-drug-note">{note}</div>
		</div>
	);
}
